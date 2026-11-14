import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import PaymentButton from "../components/participant/PaymentButton";

const PaymentPage = () => {
  const { pid } = useParams();
  const [searchParams] = useSearchParams();

  // School registration passes ?schoolTotal=X&schoolCount=N
  const schoolTotal = searchParams.get("schoolTotal");
  const schoolCount = searchParams.get("schoolCount");
  const isSchoolPayment = !!schoolTotal;

  const amount = isSchoolPayment
    ? Number(schoolTotal)
    : Number(process.env.REACT_APP_REGISTRATION_FEE || 2);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-purple-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-orange-500 rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl">💳</span>
        </div>

        <h2 className="text-2xl font-bold mb-2 text-purple-700">
          Complete Your Payment
        </h2>

        {isSchoolPayment ? (
          <p className="mb-2 text-gray-600">
            Paying for <span className="font-semibold text-purple-700">{schoolCount} student{Number(schoolCount) !== 1 ? "s" : ""}</span> · ₹2 per student
          </p>
        ) : (
          <p className="mb-2 text-gray-600">
            Pay the registration fee to receive your serial number.
          </p>
        )}

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">Total Amount</p>
          <p className="text-3xl font-extrabold text-purple-700">₹{amount}</p>
        </div>

        <PaymentButton amount={amount} participantId={pid} />
      </div>
    </div>
  );
};

export default PaymentPage;
