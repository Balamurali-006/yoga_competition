import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

const AdminLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const snapshot = await getDocs(collection(db, "participants"));
        const participants = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((item) => ["paid", "success"].includes(item.paymentStatus) && Number.isFinite(Number(item.score)))
          .map((item) => ({
            id: item.id,
            name: item.name || "Unknown Participant",
            institution: item.institution || "Unknown School",
            score: Number(item.score || 0),
          }))
          .sort((a, b) => b.score - a.score);

        setLeaderboard(participants);
      } catch (error) {
        console.error("Failed to load leaderboard:", error);
        setError("Could not load leaderboard data from Firestore.");
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-purple-700">Admin Leaderboard</h1>
          <p className="text-gray-600 mt-2">Live rankings based on successful participant payments.</p>
        </div>

        {loading ? (
          <div className="text-gray-600">Loading leaderboard...</div>
        ) : (
          <>
          {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
          {!error && leaderboard.length === 0 && <p className="text-gray-600">No scored participants found.</p>}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-purple-600 to-orange-500 text-white">
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Institution</th>
                  <th className="px-4 py-3 text-left">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr key={entry.id} className={index % 2 === 0 ? "bg-white" : "bg-purple-50"}>
                    <td className="px-4 py-3 font-bold text-purple-700">#{index + 1}</td>
                    <td className="px-4 py-3">{entry.name}</td>
                    <td className="px-4 py-3">{entry.institution}</td>
                    <td className="px-4 py-3 font-semibold">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminLeaderboard;
