import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const getLevelCode = (level) => {
  const codeMap = {
    district: "DT",
    state: "ST",
    "south-india": "SI",
    national: "NT",
  };
  return codeMap[level] || "DT";
};

const PaymentSuccess = () => {
  const { pid } = useParams();
  const [params] = useSearchParams();
  const paymentId = params.get("payment_id") || "CONFIRMED";

  const [participant, setParticipant] = useState(null);
  const [schoolParticipants, setSchoolParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSchool, setIsSchool] = useState(false);

  useEffect(() => {
    const storedIdsRaw = sessionStorage.getItem("schoolParticipantIds");
    const storedDataRaw = sessionStorage.getItem("schoolParticipantsData");

    let storedIds = null;
    let fallbackData = [];

    if (storedIdsRaw) {
      try {
        storedIds = JSON.parse(storedIdsRaw);
      } catch (e) {}
    }
    if (storedDataRaw) {
      try {
        fallbackData = JSON.parse(storedDataRaw);
      } catch (e) {}
    }

    if (storedIds && Array.isArray(storedIds) && storedIds.length > 0) {
      setIsSchool(true);
    }

    const processRegistrations = async () => {
      const year = new Date().getFullYear();

      try {
        if (storedIds && Array.isArray(storedIds) && storedIds.length > 0) {
          // ── SCHOOL REGISTRATION: Process all students in batch ──
          const results = await Promise.all(
            storedIds.map(async (id, idx) => {
              const fallback = fallbackData.find((item) => item.id === id) || fallbackData[idx] || {};
              let studentName = fallback.name || "Student";
              let level = fallback.level || "district";
              let serialNumber = null;

              try {
                // 1. Fetch directly from Firestore
                const docRef = doc(db, "participants", id);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                  const data = snap.data();
                  studentName = data.name || studentName;
                  level = data.level || level;
                  const levelCode = getLevelCode(level);
                  serialNumber = data.serialNumber || `${year}-${levelCode}-${id.slice(-8).toUpperCase()}`;

                  // Ensure serial number and payment status are saved in database
                  if (!data.serialNumber || data.paymentStatus !== "success") {
                    await updateDoc(docRef, {
                      paymentStatus: "success",
                      serialNumber: serialNumber,
                      razorpayPaymentId: paymentId,
                      paidAt: new Date().toISOString(),
                    });
                  }
                } else {
                  // Fallback: generate serial number with fallback level
                  const levelCode = getLevelCode(level);
                  serialNumber = `${year}-${levelCode}-${id.slice(-8).toUpperCase()}`;
                }
              } catch (err) {
                console.warn(`Firestore lookup for ${id} failed, trying backend:`, err);
                // 2. Fallback to server receipt endpoint if direct Firestore failed
                try {
                  const res = await fetch(
                    `${apiBaseUrl}/payment-receipt/${encodeURIComponent(id)}?payment_id=${encodeURIComponent(paymentId)}`
                  );
                  if (res.ok) {
                    const receipt = await res.json();
                    studentName = receipt.name || studentName;
                    serialNumber = receipt.serialNumber || serialNumber;
                  }
                } catch (fetchErr) {
                  console.error(`Backend receipt lookup failed for ${id}:`, fetchErr);
                }

                if (!serialNumber) {
                  const levelCode = getLevelCode(level);
                  serialNumber = `${year}-${levelCode}-${id.slice(-8).toUpperCase()}`;
                }
              }

              return {
                id,
                name: studentName,
                serialNumber: serialNumber || `${year}-DT-${id.slice(-8).toUpperCase()}`,
              };
            })
          );

          setSchoolParticipants(results);
          // Keep sessionStorage safe for reload or print, but clear on component unmount or next action
        } else {
          // ── INDIVIDUAL REGISTRATION ──
          let studentName = "Participant";
          let serialNumber = null;

          try {
            const docRef = doc(db, "participants", pid);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
              const data = snap.data();
              studentName = data.name || studentName;
              const levelCode = getLevelCode(data.level);
              serialNumber = data.serialNumber || `${year}-${levelCode}-${pid.slice(-8).toUpperCase()}`;

              // Ensure serial number and payment status are saved in database
              if (!data.serialNumber || data.paymentStatus !== "success") {
                await updateDoc(docRef, {
                  paymentStatus: "success",
                  serialNumber: serialNumber,
                  razorpayPaymentId: paymentId,
                  paidAt: new Date().toISOString(),
                });
              }

              setParticipant({
                ...data,
                name: studentName,
                serialNumber: serialNumber,
              });
            } else {
              throw new Error("Participant document not found in Firestore.");
            }
          } catch (err) {
            console.warn("Firestore lookup failed, trying backend receipt endpoint:", err);
            // Fallback to backend receipt endpoint
            const res = await fetch(
              `${apiBaseUrl}/payment-receipt/${encodeURIComponent(pid)}?payment_id=${encodeURIComponent(paymentId)}`
            );
            if (res.ok) {
              const receipt = await res.json();
              setParticipant(receipt);
            } else {
              // Construct serial number from participant ID as safety fallback
              setParticipant({
                name: "Participant",
                serialNumber: `${year}-DT-${pid.slice(-8).toUpperCase()}`,
              });
            }
          }
        }
      } catch (globalErr) {
        console.error("Payment processing error in success page:", globalErr);
      } finally {
        setLoading(false);
      }
    };

    processRegistrations();
  }, [pid, paymentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-50">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Generating your official serial numbers...</p>
        </div>
      </div>
    );
  }

  // ── SCHOOL REGISTRATION SUCCESS VIEW ──
  if (isSchool) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white shadow-xl rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center border border-green-100">
          <div className="text-4xl mb-3">🎉</div>
          <h1 className="text-3xl font-extrabold text-green-700 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">
            All registrations are confirmed. Serial numbers have been generated and saved to the database:
          </p>

          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
            {schoolParticipants.map((p, i) => (
              <div
                key={p.id || i}
                className="flex items-center justify-between bg-green-50/80 border border-green-200 rounded-2xl px-4 py-3.5 shadow-sm"
              >
                <div className="text-left">
                  <span className="text-xs text-gray-500 block">Student {i + 1}</span>
                  <span className="font-bold text-gray-900 text-base">{p.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-green-700 font-medium block">Serial No.</span>
                  <span className="text-base sm:text-lg font-extrabold text-green-800 tracking-wide">
                    {p.serialNumber}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.print()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-3 rounded-xl font-semibold transition-all border border-gray-300"
            >
              🖨️ Print Receipt
            </button>
            <Link
              to="/"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── INDIVIDUAL REGISTRATION SUCCESS VIEW ──
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white shadow-xl rounded-3xl p-6 sm:p-8 max-w-md w-full text-center border border-green-100">
        <div className="text-4xl mb-3">🎉</div>
        <h1 className="text-3xl font-extrabold text-green-700 mb-2">
          Payment Successful!
        </h1>

        <p className="text-gray-800 font-medium text-lg mb-1">
          Thank you, {participant?.name || "Participant"}
        </p>
        <p className="text-gray-600 mb-6 text-sm">
          Your registration is confirmed and saved in the system.
        </p>

        <div className="bg-gradient-to-br from-green-50 to-purple-50 border border-green-300 p-5 rounded-2xl mb-6 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-bold text-green-700 mb-1">
            Your Official Serial Number
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-green-900 tracking-wider">
            {participant?.serialNumber || "—"}
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.print()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-3 rounded-xl font-semibold transition-all border border-gray-300"
          >
            🖨️ Print
          </button>
          <Link
            to="/"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
