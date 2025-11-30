// firebase/razorpay.js
import axios from "axios";

/**
 * Calls Firebase Cloud Function: createRazorpayOrder
 * @param {number} amount - Amount in INR
 */
export const createRazorpayOrder = async (amount) => {
  const res = await axios.post(
    "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/createRazorpayOrder",
    { amount }
  );

  return res.data; // returns { orderId, currency, amount }
};

/**
 * Save payment result in Firestore using another cloud function
 */
export const verifyPayment = async (paymentData) => {
  const res = await axios.post(
    "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/verifyPayment",
    paymentData
  );
  return res.data;
};
