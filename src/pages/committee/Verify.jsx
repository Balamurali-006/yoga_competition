import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getIdToken } from "firebase/auth";
import { db, auth } from "../../firebase/firebaseConfig";

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const Verify = () => {
  const [search, setSearch] = useState("");
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const searchParticipant = async () => {
    const queryValue = search.trim();
    if (!queryValue) {
      setParticipant(null);
      setMessage("Enter a participant name, email, phone number, or serial number.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const token = await getIdToken(auth.currentUser);
      const response = await fetch(`${apiBaseUrl}/search-participants?q=${encodeURIComponent(queryValue)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Search request failed");
      }

      const data = await response.json();
      const results = data.participants || [];

      if (results.length === 0) {
        setParticipant(null);
        setMessage("No participant found for that search.");
      } else {
        setParticipant(results[0]);
      }
    } catch (error) {
      console.error("Verification search failed:", error);
      setParticipant(null);
      setMessage("Unable to search participants right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!participant) return;

    try {
      await updateDoc(doc(db, "participants", participant.id), {
        verificationStatus: "verified",
        verifiedAt: new Date().toISOString(),
      });

      setParticipant({ ...participant, verificationStatus: "verified", verifiedAt: new Date().toISOString() });
      setMessage("Participant verified successfully.");
    } catch (error) {
      console.error("Verify participant failed:", error);
      setMessage("Verification failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-purple-700">Verify Participant</h1>
          <p className="text-gray-600 mt-2">Search by participant name, email, phone number, or serial number.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participant..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={searchParticipant}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-60"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
            {message}
          </div>
        )}

        {participant && (
          <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{participant.name}</h2>
                <p className="text-sm text-gray-500">ID: {participant.id}</p>
              </div>
              <button
                type="button"
                onClick={handleVerify}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
              >
                {participant.verificationStatus === "verified" ? "Verified" : "Mark Verified"}
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><span className="font-semibold text-gray-700">Email:</span> {participant.email || "-"}</div>
              <div><span className="font-semibold text-gray-700">Institution:</span> {participant.institution || "-"}</div>
              <div><span className="font-semibold text-gray-700">Phone:</span> {participant.instructorPhone || "-"}</div>
              <div><span className="font-semibold text-gray-700">Serial:</span> {participant.serialNumber || "-"}</div>
              <div><span className="font-semibold text-gray-700">Event:</span> {participant.event || "-"}</div>
              <div><span className="font-semibold text-gray-700">Category:</span> {participant.category || "-"}</div>
              <div><span className="font-semibold text-gray-700">Payment:</span> {participant.paymentStatus || "pending"}</div>
              <div><span className="font-semibold text-gray-700">Verification:</span> {participant.verificationStatus || "pending"}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verify;
