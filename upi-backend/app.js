const cors = require("cors");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const { sendEmail: sendEmailWithBrevo } = require("./email");
const {
  PAYMENT_STATUSES,
  amountToPaise,
  createCheckInToken,
  hashToken,
  isValidUtr,
  normalizeUtr,
  readCheckInToken,
  safeEqual,
} = require("./domain");

const LEVELS = new Set(["district", "state", "south-india", "national"]);
const EVENTS = new Set(["district", "state", "national"]);
const CATEGORIES = new Set(["forward", "backward", "twist", "balance", "standing", "group"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{10}$/;
const UPI_PATTERN = /^[\w.-]+@[\w.-]+$/;

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const configuredFeePaise = (env) => amountToPaise(env.REGISTRATION_FEE);

const timestampToIso = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return value instanceof Date ? value.toISOString() : value;
};

const makeRateLimiter = ({ windowMs, max }) => {
  const requests = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let entry = requests.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      requests.set(key, entry);
    }
    entry.count += 1;
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    if (entry.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    if (requests.size > 10000) {
      for (const [requestKey, item] of requests) {
        if (item.resetAt <= now) requests.delete(requestKey);
      }
    }
    return next();
  };
};

const cleanString = (value, maxLength = 200) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const validateParticipant = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError(400, "Participant details are required.");
  }

  const participant = {
    name: cleanString(input.name, 120),
    dob: cleanString(input.dob, 20),
    age: Number(input.age),
    institution: cleanString(input.institution, 160),
    instructor: cleanString(input.instructor, 120),
    instructorPhone: String(input.instructorPhone || "").replace(/\D/g, ""),
    email: cleanString(input.email, 254).toLowerCase(),
    event: cleanString(input.event, 40).toLowerCase(),
    category: cleanString(input.category, 40).toLowerCase(),
    level: cleanString(input.level, 40).toLowerCase(),
  };

  if (!participant.name || !participant.institution || !participant.instructor ||
    !EMAIL_PATTERN.test(participant.email) || !PHONE_PATTERN.test(participant.instructorPhone) ||
    (participant.dob && !/^\d{4}-\d{2}-\d{2}$/.test(participant.dob)) ||
    (!participant.dob && !input.class) ||
    !Number.isInteger(participant.age) || participant.age < 1 || participant.age > 120 ||
    !EVENTS.has(participant.event) || !CATEGORIES.has(participant.category) ||
    !LEVELS.has(participant.level)) {
    throw new ApiError(400, "Participant details are invalid or incomplete.");
  }

  if (input.gender) participant.gender = cleanString(input.gender, 30);
  if (input.class) participant.class = cleanString(input.class, 40);
  return participant;
};

const isAllowedImage = (buffer, mimeType) => {
  if (mimeType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/webp") {
    return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
};

const createApp = ({
  db,
  admin,
  storage,
  env = process.env,
  sendEmail = sendEmailWithBrevo,
  generatePaymentReference = () => crypto.randomInt(100000, 1000000),
}) => {
  const app = express();
  app.disable("x-powered-by");
  const rawOrigins = String(env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = Array.from(
    new Set(
      rawOrigins.flatMap((orig) => {
        const clean = orig.replace(/\/+$/, "");
        const hostOnly = clean.replace(/^https?:\/\//, "");
        return [clean, `https://${hostOnly}`, `http://${hostOnly}`, hostOnly];
      })
    )
  );

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
  }));
  app.use(express.json({ limit: "5mb" }));
  const screenshotUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024, files: 1 },
    fileFilter(req, file, callback) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.mimetype)) {
        return callback(new ApiError(400, "Screenshot must be a PNG, JPEG, or WebP image."));
      }
      return callback(null, true);
    },
  });

  const windowMs = Math.max(1000, Number(env.RATE_LIMIT_WINDOW_MS) || 900000);
  const maxRequests = Math.max(1, Number(env.RATE_LIMIT_MAX) || 20);
  const publicLimiter = makeRateLimiter({ windowMs, max: maxRequests });
  const submitLimiter = makeRateLimiter({ windowMs, max: Math.min(maxRequests, 8) });
  const verificationLimiter = makeRateLimiter({ windowMs, max: Math.max(5, maxRequests) });
  const emailConfigured = Boolean(env.BREVO_API_KEY && env.EMAIL_FROM);

  const deliverEmail = async ({ to, subject, text }, failureMessage) => {
    if (!emailConfigured) {
      console.warn("Brevo email is not configured (BREVO_API_KEY and EMAIL_FROM). Skipping email delivery.");
      return;
    }

    try {
      await sendEmail({
        from: env.EMAIL_FROM,
        fromName: env.EMAIL_FROM_NAME || "Ekadhma Yoga Association",
        replyTo: env.EMAIL_REPLY_TO || undefined,
        to,
        subject,
        text,
      }, {
        apiKey: env.BREVO_API_KEY,
      });
    } catch (error) {
      console.error("Email notification delivery failed:", error.message);
    }
  };

  const notifyAdminOfSubmission = async (payment, paymentId) => {
    const participants = payment.participantSummary || [];
    const participantDetails = participants
      .map((participant) => `${participant.name || "Participant"} — ${participant.institution || "Institution"} (${participant.email || "no email"})`)
      .join("\n");
    const amountPaise = Number(payment.amountPaise || payment.expectedAmountPaise || 0);

    await deliverEmail({
      to: env.ADMIN_NOTIFICATION_EMAIL || "ekadhmayogaassociation@gmail.com",
      subject: `Payment verification requested: ${payment.paymentReference || paymentId}`,
      text: [
        "A participant submitted UPI payment details for verification.",
        "",
        `Payment reference: ${payment.paymentReference || "N/A"}`,
        `Amount: INR ${(amountPaise / 100).toFixed(2)}`,
        `UTR: ${payment.utr || "N/A"}`,
        `Paid at: ${timestampToIso(payment.paymentDateTime) || "Not provided"}`,
        `UPI app: ${payment.upiApp || "Not provided"}`,
        "",
        "Participants:",
        participantDetails || "Participant details unavailable.",
        "",
        "Review this request in the admin UPI payments dashboard.",
      ].join("\n"),
    }, "Payment details were saved, but the admin notification could not be sent.");
  };

  const requireConfiguredPayments = (req, res, next) => {
    const feePaise = configuredFeePaise(env);
    if (!feePaise || !UPI_PATTERN.test(String(env.UPI_ID || ""))) {
      return res.status(503).json({ error: "UPI payment configuration is incomplete." });
    }
    req.registrationFeePaise = feePaise;
    return next();
  };

  const requireAdmin = async (req, res, next) => {
    const authorization = req.headers.authorization || "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!idToken) return res.status(401).json({ error: "Admin authentication is required." });

    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      const profile = await db.collection("users").doc(decoded.uid).get();
      if (!profile.exists || profile.data().role !== "admin") {
        return res.status(403).json({ error: "Admin access is required." });
      }
      req.adminUser = { uid: decoded.uid, email: decoded.email || null };
      return next();
    } catch (error) {
      return res.status(401).json({ error: "The authentication token is invalid or expired." });
    }
  };

  const requireStaff = async (req, res, next) => {
    const authorization = req.headers.authorization || "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!idToken) return res.status(401).json({ error: "Committee authentication is required." });

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      return res.status(401).json({ error: "The authentication token is invalid or expired." });
    }

    try {
      const profile = await db.collection("users").doc(decoded.uid).get();
      if (!profile.exists || !["admin", "committee"].includes(profile.data().role)) {
        return res.status(403).json({ error: "Committee access is required." });
      }
      req.staffUser = { uid: decoded.uid, email: decoded.email || null };
      return next();
    } catch (error) {
      return next(error);
    }
  };

  const getAccessToken = (req) => {
    const authorization = req.headers.authorization || "";
    return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  };

  const requireRegistrationAccess = async (req, res, next) => {
    const accessToken = getAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: "Registration access token is required." });

    try {
      const paymentRef = db.collection("upiPayments").doc(req.params.paymentId);
      const paymentSnap = await paymentRef.get();
      if (!paymentSnap.exists || !safeEqual(hashToken(accessToken), paymentSnap.data().accessTokenHash)) {
        return res.status(404).json({ error: "Registration was not found or the access token is invalid." });
      }
      req.paymentRef = paymentRef;
      req.paymentData = paymentSnap.data();
      return next();
    } catch (error) {
      return next(error);
    }
  };

  app.get("/health", (req, res) => res.json({ status: "ok", service: "upi-registration-api" }));

  app.get("/api/participants/search", requireStaff, async (req, res, next) => {
    try {
      const query = cleanString(req.query.q, 120).toLowerCase();
      if (!query) return res.json({ participants: [] });

      const snapshot = await db.collection("participants").get();
      const participants = [];
      for (const document of snapshot.docs) {
        if (participants.length >= 20) break;
        const participant = document.data();
        const searchable = [
          participant.name,
          participant.email,
          participant.instructorPhone,
          participant.serialNumber,
          participant.institution,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(query)) continue;

        participants.push({
          id: document.id,
          name: participant.name || null,
          email: participant.email || null,
          institution: participant.institution || null,
          instructorPhone: participant.instructorPhone || null,
          serialNumber: participant.serialNumber || null,
          event: participant.event || null,
          category: participant.category || null,
          level: participant.level || null,
          paymentStatus: participant.paymentStatus || null,
          verificationStatus: participant.verificationStatus || null,
        });
      }
      return res.json({ participants });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/admin/users", requireAdmin, async (req, res, next) => {
    const email = cleanString(req.body?.email, 254).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const name = cleanString(req.body?.name, 120);
    const role = req.body?.role;
    if (!EMAIL_PATTERN.test(email) || password.length < 8 || !["admin", "committee"].includes(role)) {
      return res.status(400).json({
        error: "Enter a valid email, a password of at least 8 characters, and a valid role.",
      });
    }

    let createdUser;
    try {
      createdUser = await admin.auth().createUser({ email, password, displayName: name });
      try {
        await db.collection("users").doc(createdUser.uid).set({
          uid: createdUser.uid,
          email: createdUser.email,
          name,
          role,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        try {
          await admin.auth().deleteUser(createdUser.uid);
        } catch (cleanupError) {
          console.error("Failed to roll back an incomplete user account:", cleanupError);
        }
        throw error;
      }
      return res.status(201).json({ uid: createdUser.uid, email: createdUser.email, name, role });
    } catch (error) {
      if (error.code === "auth/email-already-exists") {
        return res.status(409).json({ error: "An account with this email already exists." });
      }
      return next(error);
    }
  });

  app.get("/api/payment/config", requireConfiguredPayments, (req, res) => {
    res.json({
      upiId: env.UPI_ID,
      payeeName: cleanString(env.UPI_PAYEE_NAME || "Competition Registration", 100),
      qrCodeUrl: env.UPI_QR_CODE_URL || null,
      feePaise: req.registrationFeePaise,
      currency: "INR",
    });
  });

  app.get("/api/leaderboard", async (req, res, next) => {
    try {
      const snapshot = await db.collection("participants")
        .where("paymentStatus", "in", ["VERIFIED", "success"])
        .orderBy("score", "desc")
        .limit(100)
        .get();
      return res.json({
        participants: snapshot.docs.map((document) => {
          const participant = document.data();
          return {
            id: document.id,
            name: participant.name || "Participant",
            institution: participant.institution || "",
            score: Number(participant.score || 0),
          };
        }),
      });
    } catch (error) {
      return next(error);
    }
  });

  const createRegistrations = async (participants, feePaise, groupId, entryType = "individual") => {
    if (!Array.isArray(participants) || participants.length < 1 || participants.length > 100) {
      throw new ApiError(400, "Submit between 1 and 100 participants.");
    }

    const validatedParticipants = participants.map(validateParticipant);
    const paymentGroupId = groupId || db.collection("upiPayments").doc().id;
    const paymentRef = db.collection("upiPayments").doc(paymentGroupId);
    const participantIds = validatedParticipants.map(() => db.collection("participants").doc().id);
    const accessToken = crypto.randomBytes(32).toString("base64url");
    const creationAuditRef = db.collection("paymentAuditLogs").doc();
    const participantSummary = validatedParticipants.map((participant, index) => ({
      registrationId: participantIds[index],
      name: participant.name,
      institution: participant.institution,
      instructor: participant.instructor,
      email: participant.email,
      phone: participant.instructorPhone,
      instructorPhone: participant.instructorPhone,
      event: participant.event,
      category: participant.category,
      level: participant.level,
      gender: participant.gender || "",
      class: participant.class || "",
      dob: participant.dob || "",
      age: participant.age,
    }));
    let paymentReference = null;
    for (let attempt = 0; attempt < 20 && !paymentReference; attempt += 1) {
      const candidate = String(generatePaymentReference());
      if (!/^\d{6}$/.test(candidate)) {
        throw new Error("Payment reference generator must return a six-digit number.");
      }

      const existingPayment = await db.collection("upiPayments")
        .where("paymentReference", "==", candidate)
        .limit(1)
        .get();
      if (!existingPayment.empty) continue;

      const referenceClaimRef = db.collection("paymentReferenceClaims").doc(candidate);
      const reserved = await db.runTransaction(async (transaction) => {
        const claimSnapshot = await transaction.get(referenceClaimRef);
        if (claimSnapshot.exists) return false;

        const now = admin.firestore.FieldValue.serverTimestamp();
        const draftParticipants = validatedParticipants.map((participant, index) => ({
          registrationId: participantIds[index],
          ...participant,
          paymentGroupId,
          paymentReference: candidate,
          paymentStatus: "PENDING",
          registrationStatus: "PENDING",
          serialNumber: null,
          checkedInAt: null,
        }));

        transaction.create(referenceClaimRef, {
          paymentGroupId,
          paymentReference: candidate,
          createdAt: now,
        });
        transaction.create(paymentRef, {
          registrationId: participantIds[0],
          participantIds,
          participantSummary,
          participantDrafts: draftParticipants,
          participantCount: participantIds.length,
          entryType,
          paymentReference: candidate,
          amountPaise: feePaise * participantIds.length,
          expectedAmountPaise: feePaise * participantIds.length,
          currency: "INR",
          paymentMethod: "UPI",
          paymentStatus: "PENDING",
          utr: null,
          paymentDateTime: null,
          upiApp: null,
          paymentScreenshotUrl: null,
          submittedAt: null,
          verifiedAt: null,
          verifiedBy: null,
          rejectionReason: null,
          adminNotes: "",
          accessTokenHash: hashToken(accessToken),
          createdAt: now,
          updatedAt: now,
        });
        transaction.create(creationAuditRef, {
          paymentGroupId,
          paymentReference: candidate,
          action: "PAYMENT_CREATED",
          fromStatus: null,
          toStatus: "PENDING",
          actor: "participant",
          createdAt: now,
        });
        return true;
      });

      if (reserved) paymentReference = candidate;
    }

    if (!paymentReference) {
      throw new ApiError(503, "Could not allocate a unique six-digit payment reference. Please try again.");
    }

    return {
      paymentGroupId,
      paymentReference,
      registrationIds: participantIds,
      registrationId: participantIds[0],
      participantCount: participantIds.length,
      amountPaise: feePaise * participantIds.length,
      accessToken,
      entryType,
    };
  };

  app.post("/api/registrations", publicLimiter, requireConfiguredPayments, async (req, res, next) => {
    try {
      const registration = await createRegistrations(
        [req.body],
        req.registrationFeePaise,
        null,
        "individual"
      );
      return res.status(201).json(registration);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/registrations/batch", publicLimiter, requireConfiguredPayments, async (req, res, next) => {
    try {
      const registration = await createRegistrations(
        req.body.participants,
        req.registrationFeePaise,
        null,
        "school"
      );
      return res.status(201).json(registration);
    } catch (error) {
      return next(error);
    }
  });

  app.post(
    "/api/registrations/:paymentId/payment-submissions",
    submitLimiter,
    requireRegistrationAccess,
    screenshotUpload.single("screenshot"),
    async (req, res, next) => {
      let screenshotFile = null;
      let submissionCommitted = false;
      try {
        const utr = normalizeUtr(req.body.utr);
        const amountPaise = amountToPaise(req.body.amount);
        const paymentDateTime = cleanString(req.body.paymentDateTime, 40);
        const parsedDate = new Date(paymentDateTime);
        const upiApp = cleanString(req.body.upiApp, 80);

        if (!isValidUtr(utr)) throw new ApiError(400, "Enter a valid UTR/reference (8–35 letters, numbers, / or -).");
        if (amountPaise === null) throw new ApiError(400, "Enter a valid payment amount.");
        if (amountPaise !== req.paymentData.expectedAmountPaise) {
          throw new ApiError(400, "The submitted amount does not match the registration fee.");
        }
        if (!paymentDateTime || Number.isNaN(parsedDate.getTime())) {
          throw new ApiError(400, "Enter the date and approximate time of payment.");
        }
        if (req.file && req.paymentData.paymentStatus !== "SUBMITTED") {
          if (!isAllowedImage(req.file.buffer, req.file.mimetype)) {
            throw new ApiError(400, "The uploaded file is not a valid PNG, JPEG, or WebP image.");
          }
          if (!storage) throw new ApiError(503, "Screenshot storage is not configured; submit without a screenshot.");
          const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[req.file.mimetype];
          const objectPath = `upi-payment-screenshots/${req.params.paymentId}/${crypto.randomUUID()}.${extension}`;
          screenshotFile = storage.file(objectPath);
          await screenshotFile.save(req.file.buffer, {
            resumable: false,
            metadata: {
              contentType: req.file.mimetype,
              cacheControl: "private, no-store",
            },
          });
        }

        const claimId = crypto.createHash("sha256").update(utr).digest("hex");
        const claimRef = db.collection("upiUtrClaims").doc(claimId);
        const auditRef = db.collection("paymentAuditLogs").doc();
        const submissionResult = await db.runTransaction(async (transaction) => {
          const paymentSnap = await transaction.get(req.paymentRef);
          const claimSnap = await transaction.get(claimRef);
          if (!paymentSnap.exists) throw new ApiError(404, "Registration payment was not found.");
          const payment = paymentSnap.data();
          if (!safeEqual(payment.accessTokenHash, hashToken(getAccessToken(req)))) {
            throw new ApiError(401, "Registration access token is invalid.");
          }
          if (claimSnap.exists) {
            const claim = claimSnap.data();
            if (claim.paymentGroupId === req.params.paymentId && payment.utr === utr &&
              payment.paymentStatus === "SUBMITTED") {
              return { notificationPending: !payment.adminNotificationSentAt };
            }
            throw new ApiError(409, "This UTR has already been submitted.");
          }
          if (!["PENDING", "REJECTED"].includes(payment.paymentStatus)) {
            throw new ApiError(409, "Payment details cannot be submitted in the current status.");
          }

          transaction.create(claimRef, {
            registrationId: payment.registrationId,
            paymentGroupId: req.params.paymentId,
            normalizedUtr: utr,
            amountPaise,
            claimStatus: "SUBMITTED",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          transaction.update(req.paymentRef, {
            paymentStatus: "SUBMITTED",
            utr,
            amountPaise,
            paymentDateTime: parsedDate.toISOString(),
            upiApp: upiApp || null,
            ...(screenshotFile ? {
              screenshotObjectPath: screenshotFile.name,
              screenshotContentType: req.file.mimetype,
            } : {}),
            submittedAt: admin.firestore.FieldValue.serverTimestamp(),
            adminNotificationSentAt: null,
            rejectionReason: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          transaction.create(auditRef, {
            paymentGroupId: req.params.paymentId,
            action: "PAYMENT_SUBMITTED",
            fromStatus: payment.paymentStatus,
            toStatus: "SUBMITTED",
            actor: "participant",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return { notificationPending: true };
        });
        submissionCommitted = true;

        if (submissionResult.notificationPending) {
          await notifyAdminOfSubmission({
            ...req.paymentData,
            amountPaise,
            utr,
            paymentDateTime: parsedDate.toISOString(),
            upiApp,
          }, req.params.paymentId);
          await req.paymentRef.update({
            adminNotificationSentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return res.status(201).json({ paymentStatus: "SUBMITTED" });
      } catch (error) {
        if (screenshotFile && !submissionCommitted) {
          try {
            await screenshotFile.delete();
          } catch (cleanupError) {
            console.error("Could not remove an unclaimed payment screenshot:", cleanupError.message);
          }
        }
        return next(error);
      }
    }
  );

  app.get(
    "/api/registrations/:paymentId",
    publicLimiter,
    requireRegistrationAccess,
    async (req, res, next) => {
      try {
        const payment = req.paymentData;
        const participantSnapshots = await Promise.all(
          (payment.participantIds || []).map((id) => db.collection("participants").doc(id).get())
        );
        const participants = participantSnapshots.filter((snapshot) => snapshot.exists).map((snapshot) => {
          const participant = snapshot.data();
          return {
            registrationId: snapshot.id,
            name: participant.name,
            institution: participant.institution,
            serialNumber: payment.paymentStatus === "VERIFIED" ? participant.serialNumber : null,
            checkInToken: payment.paymentStatus === "VERIFIED" && participant.serialNumber && env.CHECKIN_TOKEN_SECRET
              ? createCheckInToken(snapshot.id, participant.serialNumber, env.CHECKIN_TOKEN_SECRET)
              : null,
          };
        });

        if (!participants.length && Array.isArray(payment.participantSummary) && payment.participantSummary.length > 0) {
          payment.participantSummary.forEach((participant) => {
            participants.push({
              registrationId: participant.registrationId,
              name: participant.name,
              institution: participant.institution,
              serialNumber: payment.paymentStatus === "VERIFIED" ? participant.serialNumber || null : null,
              checkInToken: payment.paymentStatus === "VERIFIED" && participant.serialNumber && env.CHECKIN_TOKEN_SECRET
                ? createCheckInToken(participant.registrationId, participant.serialNumber, env.CHECKIN_TOKEN_SECRET)
                : null,
            });
          });
        }

        return res.json({
          paymentGroupId: req.params.paymentId,
          paymentReference: payment.paymentReference || null,
          registrationId: payment.registrationId,
          participantCount: payment.participantCount,
          entryType: payment.entryType || (payment.participantCount > 1 ? "school" : "individual"),
          amountPaise: payment.expectedAmountPaise,
          paymentStatus: payment.paymentStatus,
          utr: payment.utr || null,
          paymentDateTime: timestampToIso(payment.paymentDateTime),
          submittedAt: timestampToIso(payment.submittedAt),
          rejectionReason: payment.rejectionReason || null,
          participants,
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get("/api/admin/payments", requireAdmin, async (req, res, next) => {
    try {
      const status = cleanString(req.query.status, 30).toUpperCase();
      const queryText = cleanString(req.query.q, 120).toLowerCase();
      if (status && status !== "ALL" && !PAYMENT_STATUSES.includes(status)) {
        throw new ApiError(400, "Payment status filter is invalid.");
      }

      const snapshot = await db.collection("upiPayments").limit(500).get();
      let payments = snapshot.docs.map((document) => {
        const payment = document.data();
        const drafts = payment.participantDrafts || [];
        const serials = payment.serialNumbers || [];
        const enrichedSummary = (payment.participantSummary || []).map((p, idx) => {
          const draft = drafts[idx] || drafts.find((d) => d.registrationId === p.registrationId) || {};
          const serialObj = serials.find((s) => s.registrationId === p.registrationId);
          return {
            ...draft,
            ...p,
            instructor: p.instructor || draft.instructor || "",
            instructorPhone: p.phone || p.instructorPhone || draft.instructorPhone || "",
            institution: p.institution || draft.institution || "",
            event: p.event || draft.event || "",
            category: p.category || draft.category || "",
            level: p.level || draft.level || "",
            gender: p.gender || draft.gender || "",
            class: p.class || draft.class || "",
            dob: p.dob || draft.dob || "",
            age: p.age ?? draft.age ?? "",
            serialNumber: p.serialNumber || (serialObj ? serialObj.serialNumber : null),
          };
        });
        return {
          id: document.id,
          paymentReference: payment.paymentReference || null,
          registrationId: payment.registrationId,
          participantIds: payment.participantIds || [],
          participantSummary: enrichedSummary,
          participantCount: payment.participantCount || 1,
          amountPaise: payment.amountPaise,
          expectedAmountPaise: payment.expectedAmountPaise,
          paymentStatus: payment.paymentStatus,
          utr: payment.utr || null,
          paymentDateTime: timestampToIso(payment.paymentDateTime),
          submittedAt: timestampToIso(payment.submittedAt),
          rejectionReason: payment.rejectionReason || null,
          upiApp: payment.upiApp || null,
          screenshotAvailable: Boolean(payment.screenshotObjectPath),
          adminNotificationSent: Boolean(payment.adminNotificationSentAt),
          approvalEmailSent: Boolean(payment.approvalEmailSentAt),
          adminNotes: payment.adminNotes || "",
          createdAt: timestampToIso(payment.createdAt),
        };
      });
      if (status && status !== "ALL") payments = payments.filter((payment) => payment.paymentStatus === status);
      if (queryText) {
        payments = payments.filter((payment) => JSON.stringify(payment).toLowerCase().includes(queryText));
      }
      payments.sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
      return res.json({ payments });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/payments/:paymentId/screenshot", requireAdmin, async (req, res, next) => {
    try {
      if (!storage) throw new ApiError(503, "Screenshot storage is not configured.");
      const paymentSnap = await db.collection("upiPayments").doc(req.params.paymentId).get();
      if (!paymentSnap.exists || !paymentSnap.data().screenshotObjectPath) {
        throw new ApiError(404, "No payment screenshot is available.");
      }
      const payment = paymentSnap.data();
      const [contents] = await storage.file(payment.screenshotObjectPath).download();
      res.setHeader("Cache-Control", "no-store");
      res.type(payment.screenshotContentType || "application/octet-stream");
      return res.send(contents);
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/payments/:paymentId/audit", requireAdmin, async (req, res, next) => {
    try {
      const snapshot = await db.collection("paymentAuditLogs")
        .where("paymentGroupId", "==", req.params.paymentId)
        .limit(100)
        .get();
      const entries = snapshot.docs.map((document) => {
        const entry = document.data();
        return {
          id: document.id,
          action: entry.action,
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          actor: entry.actor,
          note: entry.note || null,
          reason: entry.reason || null,
          bankRecordConfirmed: entry.bankRecordConfirmed === true,
          createdAt: timestampToIso(entry.createdAt),
        };
      });
      entries.sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));
      return res.json({ entries });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/admin/payments/:paymentId/retry-submission-notification", requireAdmin, async (req, res, next) => {
    try {
      const paymentRef = db.collection("upiPayments").doc(req.params.paymentId);
      const paymentSnap = await paymentRef.get();
      if (!paymentSnap.exists) throw new ApiError(404, "Payment record was not found.");
      const payment = paymentSnap.data();
      if (payment.paymentStatus !== "SUBMITTED") {
        throw new ApiError(409, "Only submitted payments can receive a verification-request notification.");
      }
      if (payment.adminNotificationSentAt) {
        return res.json({ notificationSent: true, alreadySent: true });
      }

      await notifyAdminOfSubmission(payment, req.params.paymentId);
      await paymentRef.update({
        adminNotificationSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.json({ notificationSent: true, alreadySent: false });
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/api/admin/payments/:paymentId", verificationLimiter, requireAdmin, async (req, res, next) => {
    try {
      const nextStatus = cleanString(req.body.status, 30).toUpperCase();
      const note = cleanString(req.body.adminNotes, 1000);
      const hasNote = Object.prototype.hasOwnProperty.call(req.body, "adminNotes");
      const reason = cleanString(req.body.rejectionReason, 500);
      const bankRecordConfirmed = req.body.bankRecordConfirmed === true;
      if (!PAYMENT_STATUSES.includes(nextStatus)) throw new ApiError(400, "Payment status is invalid.");
      if (nextStatus === "REJECTED" && !reason) {
        throw new ApiError(400, "A rejection reason is required.");
      }

      const paymentRef = db.collection("upiPayments").doc(req.params.paymentId);
      const auditRef = db.collection("paymentAuditLogs").doc();
      const result = await db.runTransaction(async (transaction) => {
        const paymentSnap = await transaction.get(paymentRef);
        if (!paymentSnap.exists) throw new ApiError(404, "Payment record was not found.");
        const payment = paymentSnap.data();

        if (payment.paymentStatus === "VERIFIED" && nextStatus === "VERIFIED") {
          let noteUpdated = false;
          if (hasNote && (payment.adminNotes || "") !== note) {
            const now = admin.firestore.FieldValue.serverTimestamp();
            transaction.update(paymentRef, { adminNotes: note, updatedAt: now });
            transaction.create(auditRef, {
              paymentGroupId: req.params.paymentId,
              action: "INTERNAL_NOTE_UPDATED",
              fromStatus: payment.paymentStatus,
              toStatus: payment.paymentStatus,
              actor: req.adminUser.uid,
              note: note || null,
              createdAt: now,
            });
            noteUpdated = true;
          }
          return {
            paymentStatus: payment.paymentStatus,
            serialNumbers: payment.serialNumbers || [],
            alreadyVerified: true,
            noteUpdated,
            approvalEmailSent: Boolean(payment.approvalEmailSentAt),
          };
        }
        if (payment.paymentStatus === nextStatus && nextStatus !== "VERIFIED") {
          if (!hasNote || (payment.adminNotes || "") === note) {
            return { paymentStatus: payment.paymentStatus, unchanged: true };
          }
          const now = admin.firestore.FieldValue.serverTimestamp();
          transaction.update(paymentRef, { adminNotes: note, updatedAt: now });
          transaction.create(auditRef, {
            paymentGroupId: req.params.paymentId,
            action: "INTERNAL_NOTE_UPDATED",
            fromStatus: payment.paymentStatus,
            toStatus: payment.paymentStatus,
            actor: req.adminUser.uid,
            note: note || null,
            createdAt: now,
          });
          return { paymentStatus: payment.paymentStatus, noteUpdated: true };
        }

        const transitions = {
          PENDING: [],
          SUBMITTED: ["UNDER_REVIEW", "VERIFIED", "REJECTED"],
          UNDER_REVIEW: ["VERIFIED", "REJECTED"],
          VERIFIED: ["REFUND_PENDING"],
          REJECTED: [],
          REFUND_PENDING: ["REFUNDED"],
          REFUNDED: [],
        };
        if (!(transitions[payment.paymentStatus] || []).includes(nextStatus)) {
          throw new ApiError(409, `Cannot change payment from ${payment.paymentStatus} to ${nextStatus}.`);
        }
        if (nextStatus === "VERIFIED" && !bankRecordConfirmed) {
          throw new ApiError(400, "Confirm the matching bank transaction before approval.");
        }
        if (nextStatus === "VERIFIED" &&
          (!payment.utr || payment.amountPaise !== payment.expectedAmountPaise)) {
          throw new ApiError(409, "Payment UTR or amount does not match the expected registration payment.");
        }

        const participantRefs = (payment.participantIds || []).map((id) =>
          db.collection("participants").doc(id)
        );
        const claimRef = payment.utr
          ? db.collection("upiUtrClaims").doc(crypto.createHash("sha256").update(payment.utr).digest("hex"))
          : null;
        const readRefs = [...participantRefs];
        if (claimRef) readRefs.push(claimRef);
        const snapshots = readRefs.length ? await transaction.getAll(...readRefs) : [];
        const participantSnapshots = snapshots.slice(0, participantRefs.length);
        const claimSnapshot = claimRef ? snapshots[snapshots.length - 1] : null;

        if (nextStatus === "VERIFIED" && (!claimSnapshot || !claimSnapshot.exists ||
          claimSnapshot.data().paymentGroupId !== req.params.paymentId)) {
          throw new ApiError(409, "The submitted UTR claim could not be validated.");
        }

        const draftParticipants = Array.isArray(payment.participantDrafts) && payment.participantDrafts.length
          ? payment.participantDrafts
          : (payment.participantSummary || []).map((participant) => ({
            registrationId: participant.registrationId,
            ...participant,
          }));

        let serialNumbers = payment.serialNumbers || [];
        let counterRef = null;
        let finalCounters = null;
        if (nextStatus === "VERIFIED") {
          if (!env.CHECKIN_TOKEN_SECRET) throw new ApiError(503, "Check-in token configuration is missing.");
          const year = new Date().getFullYear();
          counterRef = db.collection("serialCounters").doc(String(year));
          const counterSnap = await transaction.get(counterRef);
          const counterData = counterSnap.exists ? counterSnap.data() : {};
          finalCounters = {
            DT: Number(counterData.DT) || Number(counterData.value) || 0,
            ST: Number(counterData.ST) || 0,
            NT: Number(counterData.NT) || 0,
            SI: Number(counterData.SI) || 0,
          };

          serialNumbers = participantRefs.map((participantRef, index) => {
            const draft = draftParticipants[index] || {};
            const eventVal = String(draft.event || draft.level || "district").toLowerCase();
            let eventCode = "DT";
            if (eventVal.includes("state") || eventVal === "st") {
              eventCode = "ST";
            } else if (eventVal.includes("nat") || eventVal === "nt") {
              eventCode = "NT";
            } else if (eventVal.includes("south") || eventVal === "si") {
              eventCode = "SI";
            }

            finalCounters[eventCode] = (finalCounters[eventCode] || 0) + 1;
            const seqStr = String(finalCounters[eventCode]).padStart(3, "0");
            const serialNumber = `${year}-${eventCode}-${seqStr}`;

            return {
              registrationId: participantRef.id,
              serialNumber,
              participant: draft,
            };
          });
        } else if (participantSnapshots.some((participantSnap) => !participantSnap.exists)) {
          throw new ApiError(409, "A linked participant registration is missing.");
        }

        const now = admin.firestore.FieldValue.serverTimestamp();
        transaction.update(paymentRef, {
          paymentStatus: nextStatus,
          ...(hasNote ? { adminNotes: note } : {}),
          ...(nextStatus === "REJECTED" ? { rejectionReason: reason } : {}),
          ...(nextStatus === "VERIFIED" ? {
            serialNumbers: serialNumbers.map(({ registrationId, serialNumber }) => ({ registrationId, serialNumber })),
            verifiedAt: now,
            verifiedBy: req.adminUser.uid,
            rejectionReason: null,
          } : {}),
          ...(nextStatus === "REFUNDED" ? { refundedAt: now } : {}),
          updatedAt: now,
        });

        if (nextStatus === "VERIFIED") {
          draftParticipants.forEach((draftParticipant, index) => {
            const participantRef = participantRefs[index] || db.collection("participants").doc(draftParticipant.registrationId);
            const serialEntry = serialNumbers[index];
            const participantPayload = {
              ...draftParticipant,
              registrationId: draftParticipant.registrationId || participantRef.id,
              paymentGroupId: req.params.paymentId,
              paymentReference: payment.paymentReference || draftParticipant.paymentReference || null,
              paymentStatus: "VERIFIED",
              registrationStatus: "CONFIRMED",
              serialNumber: serialEntry ? serialEntry.serialNumber : null,
              checkedInAt: null,
              createdAt: now,
            };
            delete participantPayload.participantDrafts;
            transaction.set(participantRef, participantPayload);
          });
        }

        participantSnapshots.forEach((participantSnap, index) => {
          if (!participantSnap.exists) return;
          if (nextStatus === "VERIFIED") {
            const serialEntry = serialNumbers[index];
            transaction.update(participantSnap.ref, {
              paymentStatus: nextStatus,
              registrationStatus: "CONFIRMED",
              ...(serialEntry ? { serialNumber: serialEntry.serialNumber } : {}),
            });
            return;
          }
          const registrationStatus = nextStatus === "REFUNDED" ? "REFUNDED" : participantSnap.data().registrationStatus;
          const serialEntry = nextStatus === "VERIFIED" ? serialNumbers[index] : null;
          transaction.update(participantSnap.ref, {
            paymentStatus: nextStatus,
            registrationStatus,
            ...(serialEntry ? { serialNumber: serialEntry.serialNumber } : {}),
          });
        });
        if (counterRef && finalCounters) transaction.set(counterRef, { ...finalCounters, updatedAt: now }, { merge: true });
        if (claimRef && nextStatus === "VERIFIED") {
          transaction.update(claimRef, { claimStatus: "VERIFIED", verifiedAt: now });
        }
        transaction.create(auditRef, {
          paymentGroupId: req.params.paymentId,
          action: nextStatus === "VERIFIED" ? "PAYMENT_VERIFIED" :
            nextStatus === "REJECTED" ? "PAYMENT_REJECTED" : "STATUS_CHANGED",
          fromStatus: payment.paymentStatus,
          toStatus: nextStatus,
          actor: req.adminUser.uid,
          note: note || null,
          reason: nextStatus === "REJECTED" ? reason : null,
          bankRecordConfirmed: nextStatus === "VERIFIED" && bankRecordConfirmed,
          createdAt: now,
        });

        return { paymentStatus: nextStatus, serialNumbers, alreadyVerified: false, approvalEmailSent: false };
      });

      if (nextStatus === "VERIFIED" && !result.approvalEmailSent) {
        const paymentSnap = await paymentRef.get();
        const payment = paymentSnap.data();
        const serialNumbers = payment.serialNumbers || [];
        const participantSummary = payment.participantSummary || [];
        const summaryById = new Map(participantSummary.map((participant) => [participant.registrationId, participant]));
        const recipients = Array.from(new Set(participantSummary.map((participant) => participant.email)
          .filter((email) => typeof email === "string" && EMAIL_PATTERN.test(email))));

        if (serialNumbers.length === 0 || serialNumbers.some((entry) => !entry.serialNumber)) {
          throw new ApiError(409, "Payment was approved, but its assigned serial numbers are unavailable.");
        }
        if (recipients.length === 0) {
          throw new ApiError(409, "Payment was approved, but no valid registration contact email is available.");
        }

        const serialLines = serialNumbers.map((entry) => {
          const participant = summaryById.get(entry.registrationId) || {};
          return `${participant.name || "Participant"}: ${entry.serialNumber}`;
        }).join("\n");
        await deliverEmail({
          to: recipients,
          subject: `Registration approved: ${payment.paymentReference || req.params.paymentId}`,
          text: [
            "Your payment has been verified and the registration is confirmed.",
            "",
            `Payment reference: ${payment.paymentReference || "N/A"}`,
            "",
            "Participant serial numbers:",
            serialLines || "Serial numbers are not available.",
            "",
            "Please keep these serial numbers for competition check-in.",
          ].join("\n"),
        }, "Payment was approved, but the registration contact email could not be sent.");

        await paymentRef.update({
          approvalEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
          approvalEmailTo: recipients,
        });
        result.approvalEmailSent = true;
      }

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/admin/check-in", verificationLimiter, requireAdmin, async (req, res, next) => {
    try {
      if (!env.CHECKIN_TOKEN_SECRET) throw new ApiError(503, "Check-in token configuration is missing.");
      let registrationId = "";
      let serialNumber = "";
      if (req.body.token) {
        const tokenData = readCheckInToken(req.body.token, env.CHECKIN_TOKEN_SECRET);
        if (!tokenData) throw new ApiError(400, "QR token is invalid.");
        registrationId = tokenData.registrationId;
        serialNumber = tokenData.serialNumber;
      } else if (req.body.serialNumber) {
        serialNumber = cleanString(req.body.serialNumber, 60).toUpperCase();
        const matches = await db.collection("participants")
          .where("serialNumber", "==", serialNumber)
          .limit(2)
          .get();
        if (matches.size !== 1) throw new ApiError(404, "No unique registration matches that serial number.");
        registrationId = matches.docs[0].id;
      } else {
        throw new ApiError(400, "Scan a registration QR code or enter a serial number.");
      }

      const participantRef = db.collection("participants").doc(registrationId);
      const checkInAuditRef = db.collection("checkInAuditLogs").doc();
      const result = await db.runTransaction(async (transaction) => {
        const participantSnap = await transaction.get(participantRef);
        if (!participantSnap.exists) throw new ApiError(404, "Registration was not found.");
        const participant = participantSnap.data();
        if (participant.serialNumber !== serialNumber ||
          participant.paymentStatus !== "VERIFIED" ||
          participant.registrationStatus !== "CONFIRMED") {
          throw new ApiError(403, "This registration is not confirmed as paid.");
        }
        if (participant.checkedInAt) throw new ApiError(409, "Already checked in.");

        transaction.update(participantRef, {
          checkedInAt: admin.firestore.FieldValue.serverTimestamp(),
          checkedInBy: req.adminUser.uid,
        });
        transaction.create(checkInAuditRef, {
          registrationId,
          serialNumber,
          adminUid: req.adminUser.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { registrationId, serialNumber, name: participant.name };
      });
      return res.json({ ...result, checkedIn: true });
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ApiError) return res.status(error.status).json({ error: error.message });
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Screenshot must be 3 MB or smaller." });
    }
    console.error("UPI API request failed:", error);
    return res.status(500).json({ error: "The request could not be completed." });
  });

  return app;
};

module.exports = { ApiError, createApp };
