import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Level → Code mapping
const levelCodeMap = {
  "district": "DT",
  "state": "ST",
  "south-india": "SI",
  "national": "NT",
};

const PaymentSuccess = () => {
  const { pid } = useParams();  // participant Firestore ID
  const [params] = useSearchParams();
  const paymentId = params.get("payment_id");  // Razorpay payment ID

  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generate Serial Number
  const generateSerialNumber = async (level) => {
    const year = new Date().getFullYear();
    const code = levelCodeMap[level] || "XX";

    // Count participants with same year+level
    const q = query(
      collection(db, "participants"),
      where("year", "==", year),
      where("level", "==", level)
    );

    const snap = await getDocs(q);
    const count = (snap.size + 1).toString().padStart(4, "0");

    return `${year}-${code}-${count}`;
  };

  // Handle payment verification + serial number assignment
  const processPayment = async () => {
    try {
      const ref = doc(db, "participants", pid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setLoading(false);
        return alert("Participant not found!");
      }

      const data = snap.data();

      // Generate ID
      const serial = await generateSerialNumber(data.level);

      // Update Firestore
      await updateDoc(ref, {
        serialNumber: serial,
        paymentStatus: "paid",
        paymentId: paymentId || "unknown",
        year: new Date().getFullYear(),
      });

      setParticipant({ ...data, serialNumber: serial });
      setLoading(false);

    } catch (error) {
      console.error("Payment processing error:", error);
      setLoading(false);
      alert("Failed to process payment.");
    }
  };

  useEffect(() => {
    processPayment();
  }, []);

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
