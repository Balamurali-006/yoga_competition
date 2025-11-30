import React from "react";
import { useParams } from "react-router-dom";
import PaymentButton from "../components/participant/PaymentButton";

const PaymentPage = () => {
  const { pid } = useParams(); // <-- GET REAL PARTICIPANT ID FROM URL
  const amount = 2; // Registration fee (₹2 for testing)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-purple-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4 text-purple-700">
          Complete Your Payment
        </h2>

        <p className="mb-6 text-gray-600">
          Pay the registration fee to receive your serial number.
        </p>

        {/* USE REAL PARTICIPANT ID */}
        <PaymentButton amount={amount} participantId={pid} />
      </div>
    </div>
  );
};

export default PaymentPage;
