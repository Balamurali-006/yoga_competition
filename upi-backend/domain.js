const crypto = require("crypto");

const PAYMENT_STATUSES = [
  "PENDING",
  "SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
  "REFUND_PENDING",
  "REFUNDED",
];

const normalizeUtr = (value) => String(value || "").replace(/\s+/g, "").toUpperCase();

const isValidUtr = (value) => /^(?=.*[A-Z0-9])[A-Z0-9/-]{8,35}$/.test(value);

const amountToPaise = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(String(value))) {
    return null;
  }
  return Math.round(amount * 100);
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const createCheckInToken = (registrationId, serialNumber, secret) => {
  const payload = Buffer.from(JSON.stringify({ registrationId, serialNumber, version: 1 }))
    .toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

const readCheckInToken = (token, secret) => {
  if (typeof token !== "string") return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.version !== 1 || typeof data.registrationId !== "string" ||
      typeof data.serialNumber !== "string") {
      return null;
    }
    return data;
  } catch (error) {
    return null;
  }
};

module.exports = {
  PAYMENT_STATUSES,
  amountToPaise,
  createCheckInToken,
  hashToken,
  isValidUtr,
  normalizeUtr,
  readCheckInToken,
  safeEqual,
};
