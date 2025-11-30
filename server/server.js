const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const admin = require("firebase-admin");

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin Initialization
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Razorpay Instance (use TEST KEYS)
const razorpay = new Razorpay({
  key_id: "rzp_live_RlR2GdFBuBcNdz",
  key_secret: "iP9ypdCN8veAMq4HQx6uR7Ed",
});

// API: Create Razorpay Order
app.post("/create-order", async (req, res) => {
  try {
    const { amount, participantId } = req.body;

const shortId = participantId.slice(0, 10); // keep it short

const options = {
  amount: amount * 100,
  currency: "INR",
  receipt: `rcpt_${shortId}_${Date.now().toString().slice(-6)}`, 
};


    const order = await razorpay.orders.create(options);

    res.status(200).json(order);
  } catch (err) {
  console.error("Order Error:", err);
  res.status(500).json({ error: err.message });
}
});

// API: Verify Payment & Update Firestore
app.post("/verify-payment", async (req, res) => {
  try {
    const { participantId, paymentId } = req.body;

    // Update Firestore
    await db.collection("participants").doc(participantId).update({
      paymentStatus: "success",
      razorpayPaymentId: paymentId,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

// Start Server Locally
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
