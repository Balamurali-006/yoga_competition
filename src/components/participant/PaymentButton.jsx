import React from "react";
import { useNavigate } from "react-router-dom";

const PaymentButton = ({ amount, participantId }) => {
  const navigate = useNavigate();

  const handlePayment = async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
      const numericAmount = Number(amount) || 2;

      const res = await fetch(`${apiBaseUrl}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount, participantId }),
      });

      const order = await res.json();

      if (!res.ok || !order.id) {
        throw new Error(order.error || "Error creating order");
      }

      // Safeguard: check if order amount matches requested amount
      const expectedPaise = Math.round(numericAmount * 100);
      if (order.amount !== expectedPaise) {
        console.warn(
          `Order amount mismatch: Expected ${expectedPaise} paise (₹${numericAmount}), but server created order for ${order.amount} paise (₹${order.amount / 100}). The backend server needs to be restarted.`
        );
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY,
        amount: order.amount,
        currency: "INR",
        name: "Ekadhma Yoga Association",
        description: `Registration Fee (₹${order.amount / 100})`,
        order_id: order.id,

        handler: async function (response) {
          // For school registrations, include all participant IDs so the
          // server can mark every student as paid in one go.
          const storedIds = sessionStorage.getItem("schoolParticipantIds");
          const allParticipantIds = storedIds ? JSON.parse(storedIds) : null;

          const verificationResponse = await fetch(`${apiBaseUrl}/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              participantId,
              allParticipantIds, // null for individual, array for school
              ...response,
            }),
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
      className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
    >
      Pay ₹{amount}
    </button>
  );
};

export default PaymentButton;
