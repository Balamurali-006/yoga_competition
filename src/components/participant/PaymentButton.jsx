import React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";

const PaymentButton = ({ amount, participantId }) => {
  const navigate = useNavigate();

  const handlePayment = async () => {
    try {
      const res = await fetch("http://localhost:5000/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, participantId }),
      });

      const order = await res.json();

      if (!order.id) {
        alert("Error creating order");
        return;
      }

      const options = {
        key: "rzp_live_RlR2GdFBuBcNdz", // your test key
        amount: order.amount,
        currency: "INR",
        name: "Ekadhma Yoga Association",
        description: "Registration Fee",
        order_id: order.id,

        handler: async function (response) {
          alert("Payment Successful!");

          const paymentId = response.razorpay_payment_id;

          // 1️⃣ Generate serial number
          const serialNumber =
            "SN-" + Math.random().toString(36).substring(2, 8).toUpperCase();

          // 2️⃣ Update Firestore participant
          await updateDoc(doc(db, "participants", participantId), {
            paymentStatus: "success",
            razorpayPaymentId: paymentId,
            serialNumber: serialNumber,
          });

          // 3️⃣ Redirect to success page
          navigate(`/payment-success/${participantId}`);
        },

        theme: { color: "#8B5CF6" },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function () {
        alert("Payment Failed ❌");
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Payment Error ❌");
    }
  };

  return (
    <button
      onClick={handlePayment}
      className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-lg font-semibold"
    >
      Pay ₹{amount}
    </button>
  );
};

export default PaymentButton;
