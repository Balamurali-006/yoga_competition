import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { QRCodeSVG } from "qrcode.react";

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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6">
        <style>{`
          @media print {
            nav, footer, .no-print, header {
              display: none !important;
            }
            body {
              background: #fff !important;
            }
            .printable-card {
              box-shadow: none !important;
              border: 1px solid #ccc !important;
              page-break-inside: avoid;
            }
          }
        `}</style>
        <div className="bg-white shadow-2xl rounded-3xl p-6 sm:p-8 max-w-xl w-full text-center border border-green-200 printable-card">
          <div className="text-4xl mb-3">🎉</div>
          <h1 className="text-3xl font-extrabold text-green-700 mb-2">
            Payment & Registration Confirmed!
          </h1>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">
            Ekadhma Yoga Competition 2025 · Group Registration Receipt & Entry Passes
          </p>

          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-1">
            {schoolParticipants.map((p, i) => (
              <div
                key={p.id || i}
                className="flex items-center justify-between bg-gradient-to-r from-green-50 to-purple-50 border border-green-200 rounded-2xl p-4 shadow-sm"
              >
                <div className="text-left">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-green-700 block">
                    Student #{i + 1}
                  </span>
                  <span className="font-bold text-gray-900 text-base block">{p.name}</span>
                  <span className="text-xs text-gray-500 capitalize">{p.level || "district"} Level</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-gray-500 font-semibold block">Serial No.</span>
                    <span className="text-sm sm:text-base font-black text-purple-800 tracking-wider font-mono">
                      {p.serialNumber}
                    </span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-purple-200 shadow-xs">
                    <QRCodeSVG
                      value={JSON.stringify({ id: p.id, sn: p.serialNumber, name: p.name })}
                      size={44}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center no-print">
            <button
              onClick={() => window.print()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3.5 rounded-xl font-bold transition-all border border-gray-300 flex items-center justify-center gap-2"
            >
              <span>🖨️</span>
              <span>Print All Entry Passes</span>
            </button>
            <Link
              to="/"
              className="bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white px-6 py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6">
      <style>{`
        @media print {
          nav, footer, .no-print, header {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
          .printable-card {
            box-shadow: none !important;
            border: 1px solid #444 !important;
          }
        }
      `}</style>
      <div className="bg-white shadow-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full text-center border border-green-200 printable-card">
        <div className="text-4xl mb-2">🎉</div>
        <h1 className="text-2xl sm:text-3xl font-black text-green-700 mb-1">
          Payment Successful!
        </h1>
        <p className="text-gray-500 text-xs uppercase tracking-widest font-bold mb-4">
          Ekadhma Yoga Competition 2025 · Official Entry Pass
        </p>

        {/* Official Pass Badge */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-orange-50 border-2 border-purple-200 rounded-3xl p-5 mb-6 shadow-inner text-center relative overflow-hidden">
          <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-green-300">
            ✓ Confirmed
          </div>

          <div className="inline-block bg-white p-2.5 rounded-2xl border border-purple-200 shadow-md mb-3">
            <QRCodeSVG
              value={JSON.stringify({
                id: participant?.id || pid,
                sn: participant?.serialNumber,
                name: participant?.name,
              })}
              size={120}
              level="M"
            />
          </div>

          <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-0.5">
            Participant Serial Number
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-purple-900 tracking-wider font-mono mb-2">
            {participant?.serialNumber || "—"}
          </h2>

          <div className="border-t border-purple-100 pt-3 text-sm text-gray-700 font-medium space-y-1">
            <p className="font-bold text-base text-gray-900">{participant?.name || "Participant"}</p>
            {participant?.institution && <p className="text-xs text-gray-600">{participant.institution}</p>}
            <p className="text-xs text-purple-700 capitalize">
              {participant?.event || "District"} · {participant?.category || "Standard"} Category
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center no-print">
          <button
            onClick={() => window.print()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3.5 rounded-xl font-bold transition-all border border-gray-300 flex items-center justify-center gap-2"
          >
            <span>🖨️</span>
            <span>Print Admit Pass</span>
          </button>
          <Link
            to="/"
            className="bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white px-6 py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
