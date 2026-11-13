import React from "react";
import { useNavigate } from "react-router-dom";

const PaymentButton = ({ amount, participantId }) => {
  const navigate = useNavigate();

  const handlePayment = async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
      const res = await fetch(`${apiBaseUrl}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, participantId }),
      });

      const order = await res.json();

      if (!res.ok || !order.id) {
        throw new Error(order.error || "Error creating order");
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY,
        amount: order.amount,
        currency: "INR",
        name: "Ekadhma Yoga Association",
        description: "Registration Fee",
        order_id: order.id,

        handler: async function (response) {
          const verificationResponse = await fetch(`${apiBaseUrl}/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participantId, ...response }),
          });
          const verification = await verificationResponse.json();
          if (!verificationResponse.ok || !verification.success) {
            const details = verification.details ? ` ${verification.details}` : "";
            const diagnostic = verification.stage
              ? ` Stage: ${verification.stage}${verification.code ? ` (${verification.code})` : ""}.`
              : "";
            alert(`${verification.error || "Payment verification failed."} (HTTP ${verificationResponse.status}).${diagnostic}${details} Check the backend terminal before retrying payment.`);
            return;
          }
          navigate(`/payment-success/${participantId}?payment_id=${encodeURIComponent(response.razorpay_payment_id)}`);
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
      alert(err.message || "Payment Error");
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
