const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

const requireFirebaseUser = async (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!idToken) return res.status(401).json({ error: "Authentication required." });

  try {
    req.firebaseUser = await admin.auth().verifyIdToken(idToken);
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired authentication token." });
  }
};

const requireRole = (role) => async (req, res, next) => {
  if (!db) {
    return res.status(503).json({ error: "Firebase admin is not configured." });
  }

  try {
    const userDoc = await db.collection("users").doc(req.firebaseUser.uid).get();
    if (!userDoc.exists || (role === "admin" && userDoc.data().role !== "admin") ||
      (role === "committee" && !["admin", "committee"].includes(userDoc.data().role))) {
      return res.status(403).json({ error: "Insufficient permissions." });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: "Could not verify account permissions." });
  }
};

// Firebase Admin Initialization
let serviceAccount = null;
let db = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
} catch (err) {
  serviceAccount = null;
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  try {
    serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (err) {
    console.warn("Firebase Admin is not configured. Update FIREBASE_SERVICE_ACCOUNT or add serviceAccountKey.json.");
  }
}

if (admin.apps.length) {
  db = admin.firestore();
}

// Razorpay Instance
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

// API: Create Razorpay Order
app.post("/create-order", async (req, res) => {
  try {
    if (!db || !razorpay) {
      return res.status(503).json({ error: "Payment configuration is not available." });
    }

    const { participantId, amount: requestedAmount } = req.body;
    const baseRegistrationFee = Number(process.env.REGISTRATION_FEE || 2);
    // Allow frontend to pass a pre-calculated amount (e.g. school batch = N × fee).
    // Validate it is a positive finite number, otherwise fall back to the configured fee.
    const registrationAmount =
      Number.isFinite(Number(requestedAmount)) && Number(requestedAmount) > 0
        ? Number(requestedAmount)
        : baseRegistrationFee;

    if (!participantId || registrationAmount <= 0) {
      return res.status(400).json({ error: "A participant ID and valid configured registration fee are required." });
    }

    const participantRef = db.collection("participants").doc(participantId);
    const participant = await participantRef.get();
    if (!participant.exists) {
      return res.status(404).json({ error: "Participant not found." });
    }

    const shortId = participantId.slice(0, 10);
    const options = {
      amount: Math.round(registrationAmount * 100),
      currency: "INR",
      receipt: `rcpt_${shortId}_${Date.now().toString().slice(-6)}`,
    };

    const order = await razorpay.orders.create(options);
    await participantRef.update({ razorpayOrderId: order.id, paymentStatus: "pending" });

    res.status(200).json(order);
  } catch (err) {
    console.error("Order Error:", err);
    res.status(500).json({ error: "Could not create payment order." });
  }
});

// Verify the checkout signature before marking a participant paid.
app.post("/verify-payment", async (req, res) => {
  let verificationStage = "read_request";
  try {
    if (!db) {
      return res.status(503).json({ error: "Firebase admin is not configured." });
    }

    const { participantId, allParticipantIds, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!participantId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment verification fields." });
    }

    verificationStage = "load_participant";
    const participantRef = db.collection("participants").doc(participantId);
    const participantSnap = await participantRef.get();
    if (!participantSnap.exists || participantSnap.data().razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ error: "Payment order does not match the participant." });
    }

    verificationStage = "verify_signature";
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(503).json({ error: "Razorpay is not configured." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedSignature = String(razorpay_signature).trim();
    const receivedBuffer = Buffer.from(receivedSignature, "hex");
    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return res.status(400).json({ error: "Invalid payment signature." });
    }

    verificationStage = "save_payment";

    const year = new Date().getFullYear();

    // Determine which participant IDs to mark as paid.
    // For school registrations, allParticipantIds contains the full list;
    // for individual registrations it is null/undefined.
    const idsToMark =
      Array.isArray(allParticipantIds) && allParticipantIds.length > 0
        ? allParticipantIds
        : [participantId];

    // Mark the primary participant inside a transaction (order-ID check), then
    // mark any additional school participants outside the transaction.
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(participantRef);
      if (!current.exists || current.data().razorpayOrderId !== razorpay_order_id) {
        throw new Error("Participant payment order changed during verification.");
      }
      const data = current.data();
      const levelCode =
        { district: "DT", state: "ST", "south-india": "SI", national: "NT" }[data.level] || "XX";
      transaction.update(participantRef, {
        paymentStatus: "success",
        razorpayPaymentId: razorpay_payment_id,
        serialNumber: `${year}-${levelCode}-${participantId.slice(-8).toUpperCase()}`,
        year,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Mark additional school participants (all except the primary one).
    const extraIds = idsToMark.filter((id) => id !== participantId);
    if (extraIds.length > 0) {
      const batch = db.batch();
      for (const id of extraIds) {
        const ref = db.collection("participants").doc(id);
        const snap = await ref.get();
        if (!snap.exists) continue;
        const data = snap.data();
        const levelCode =
          { district: "DT", state: "ST", "south-india": "SI", national: "NT" }[data.level] || "XX";
        batch.update(ref, {
          paymentStatus: "success",
          razorpayPaymentId: razorpay_payment_id,
          serialNumber: `${year}-${levelCode}-${id.slice(-8).toUpperCase()}`,
          year,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Verification Error:", {
      stage: verificationStage,
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    res.status(500).json({
      error: "Payment verification failed.",
      stage: verificationStage,
      code: err.code || err.name || "UNKNOWN",
    });
  }
});

app.get("/registration-status", async (req, res) => {
  try {
    const phone = String(req.query.phone || "").replace(/\D/g, "");
    if (phone.length < 10) return res.status(400).json({ error: "A valid phone number is required." });
    const matches = await db.collection("participants").where("instructorPhone", "==", phone).limit(10).get();
    res.json({ participants: matches.docs.map((snapshot) => {
      const { name, serialNumber, paymentStatus } = snapshot.data();
      return { name, serialNumber: serialNumber || null, paymentStatus };
    }) });
  } catch (error) {
    console.error("Status lookup failed:", error);
    res.status(500).json({ error: "Could not retrieve registration status." });
  }
});

app.get("/payment-receipt/:participantId", async (req, res) => {
  try {
    const paymentId = String(req.query.payment_id || "");
    if (!paymentId) return res.status(400).json({ error: "Payment ID is required." });

    const participantRef = db.collection("participants").doc(req.params.participantId);
    const participant = await participantRef.get();
    if (!participant.exists) return res.status(404).json({ error: "Registration not found." });

    const data = participant.data();
    const year = new Date().getFullYear();
    const levelCode =
      { district: "DT", state: "ST", "south-india": "SI", national: "NT" }[data.level] || "DT";
    const serialNumber = data.serialNumber || `${year}-${levelCode}-${req.params.participantId.slice(-8).toUpperCase()}`;

    // Ensure serial number and payment status are saved
    if (!data.serialNumber || data.paymentStatus !== "success") {
      await participantRef.update({
        paymentStatus: "success",
        serialNumber,
        razorpayPaymentId: paymentId,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return res.json({
      name: data.name || "Participant",
      serialNumber: serialNumber,
    });
  } catch (error) {
    console.error("Payment receipt lookup failed:", error);
    return res.status(500).json({ error: "Could not retrieve payment receipt." });
  }
});

app.get("/leaderboard", async (req, res) => {
  try {
    const participants = await db.collection("participants")
      .where("paymentStatus", "==", "success")
      .orderBy("score", "desc")
      .limit(100)
      .get();
    res.json({ participants: participants.docs.map((snapshot) => {
      const { name, institution, score } = snapshot.data();
      return { id: snapshot.id, name, institution, score };
    }) });
  } catch (error) {
    console.error("Leaderboard load failed:", error);
    res.status(500).json({ error: "Could not load leaderboard." });
  }
});

app.get("/search-participants", requireFirebaseUser, requireRole("committee"), async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    if (!q) return res.json({ participants: [] });

    const snapshot = await db.collection("participants").get();
    const matches = [];
    for (const docSnap of snapshot.docs) {
      if (matches.length >= 20) break;
      const data = docSnap.data();
      const searchable = [data.name, data.email, data.instructorPhone, data.serialNumber, data.institution]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (searchable.includes(q)) {
        matches.push({
          id: docSnap.id,
          name: data.name || null,
          email: data.email || null,
          institution: data.institution || null,
          instructorPhone: data.instructorPhone || null,
          serialNumber: data.serialNumber || null,
          event: data.event || null,
          category: data.category || null,
          level: data.level || null,
          paymentStatus: data.paymentStatus || null,
          verificationStatus: data.verificationStatus || null,
        });
      }
    }
    res.json({ participants: matches });
  } catch (error) {
    console.error("Participant search failed:", error);
    res.status(500).json({ error: "Could not search participants." });
  }
});

app.post("/admin/users", requireFirebaseUser, requireRole("admin"), async (req, res) => {
  const { email, password, role, name } = req.body;
  const validEmail = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validPassword = typeof password === "string" && password.length >= 8;
  const validRole = ["admin", "committee"].includes(role);
  if (!validEmail || !validPassword || !validRole) {
    return res.status(400).json({ error: "Enter a valid email, a password of at least 8 characters, and a valid role." });
  }

  try {
    const createdUser = await admin.auth().createUser({ email, password, displayName: name || "" });
    await db.collection("users").doc(createdUser.uid).set({
      uid: createdUser.uid,
      email: createdUser.email,
      name: name || "",
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({ uid: createdUser.uid, email: createdUser.email, name: name || "", role });
  } catch (error) {
    console.error("User provisioning failed:", error);
    res.status(400).json({ error: "Could not create user. The email may already be registered." });
  }
});

// Start Server Locally
if (require.main === module) {
  app.listen(5000, () => {
    console.log("Server running on port 5000");
  });
}

module.exports = { app, db, razorpay };
