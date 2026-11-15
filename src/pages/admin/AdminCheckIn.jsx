import React, { useCallback, useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { getIdToken } from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig";
import { upiApiRequest } from "../../firebase/upiApi";

const AdminCheckIn = () => {
  const [serialNumber, setSerialNumber] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checkIn = useCallback(async (payload) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again as an administrator.");
      const response = await upiApiRequest("/api/admin/check-in", {
        method: "POST",
        accessToken: await getIdToken(user),
        body: JSON.stringify(payload),
      });
      setResult(response);
      setSerialNumber("");
      setManualToken("");
    } catch (checkInError) {
      setError(checkInError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("upi-checkin-qr-reader", {
      fps: 8,
      qrbox: { width: 240, height: 240 },
      rememberLastUsedCamera: true,
    }, false);
    scanner.render(
      (decodedText) => {
        scanner.clear().catch((clearError) => console.warn("Could not stop QR scanner:", clearError));
        checkIn({ token: decodedText });
      },
      () => {}
    );
    return () => {
      scanner.clear().catch((clearError) => console.warn("Could not stop QR scanner:", clearError));
    };
  }, [checkIn]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-xl md:p-8">
        <h1 className="text-3xl font-bold text-purple-700">Competition Check-in</h1>
        <p className="mt-2 text-gray-600">Scan a verified participant QR code or search by serial number.</p>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {result && <div role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-green-800"><p className="font-bold">Checked in successfully</p><p>{result.name} · {result.serialNumber}</p></div>}
        <section className="mt-6">
          <h2 className="mb-2 font-semibold text-gray-800">Scan QR with camera</h2>
          <div id="upi-checkin-qr-reader" className="max-w-lg overflow-hidden rounded-xl border p-2" />
          <p className="mt-2 text-xs text-gray-500">Camera scanning requires browser permission and HTTPS (or localhost). A USB QR scanner can also enter the QR token below.</p>
        </section>

        <div className="my-7 border-t" />
        <form onSubmit={(event) => { event.preventDefault(); checkIn({ serialNumber }); }} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Manual serial-number lookup
            <div className="mt-1 flex gap-2">
              <input value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} placeholder="COMP-2026-001" className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3" />
              <button disabled={loading || !serialNumber.trim()} className="rounded-xl bg-purple-700 px-4 py-3 font-semibold text-white disabled:opacity-50">Check in</button>
            </div>
          </label>
        </form>

        <form onSubmit={(event) => { event.preventDefault(); checkIn({ token: manualToken.trim() }); }} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            QR token (scanner fallback)
            <textarea value={manualToken} onChange={(event) => setManualToken(event.target.value)} rows="2" className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" />
          </label>
          <button disabled={loading || !manualToken.trim()} className="rounded-xl border border-purple-300 px-4 py-2 font-semibold text-purple-700 disabled:opacity-50">Validate QR token</button>
        </form>
      </div>
    </main>
  );
};

export default AdminCheckIn;
