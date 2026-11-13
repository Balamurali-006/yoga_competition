import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";

const PaymentSuccess = () => {
  const { pid } = useParams();  // participant Firestore ID
  const [params] = useSearchParams();
  const paymentId = params.get("payment_id");  // Razorpay payment ID

  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReceipt = async () => {
      if (!paymentId) {
        setLoading(false);
        return;
      }

      try {
        const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
        const response = await fetch(`${apiBaseUrl}/payment-receipt/${encodeURIComponent(pid)}?payment_id=${encodeURIComponent(paymentId)}`);
        const receipt = await response.json();
        if (!response.ok) throw new Error(receipt.error || "Could not retrieve payment receipt.");
        setParticipant(receipt);
      } catch (error) {
        console.error("Payment receipt lookup failed:", error);
      } finally {
        setLoading(false);
      }
    };

    loadReceipt();
  }, [pid, paymentId]);

  // Loading UI
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-50">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-700">Processing your payment...</p>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <h1 className="text-2xl text-red-600 font-bold">
          ❌ Participant Not Found
        </h1>
      </div>
    );
  }

  // SUCCESS UI
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-green-700 mb-3">
          🎉 Payment Successful!
        </h1>

        <p className="text-gray-700 mb-1">Thank you, {participant.name}</p>
        <p className="text-gray-700 mb-3">Your registration is confirmed.</p>

        <div className="bg-green-100 border border-green-300 p-4 rounded-xl mb-4">
          <p className="font-semibold text-green-700">Your Serial Number:</p>
          <h2 className="text-3xl font-extrabold text-green-900 mt-2">
            {participant.serialNumber}
          </h2>
        </div>

        <Link
          to="/"
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 mt-4 inline-block rounded-lg"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;
