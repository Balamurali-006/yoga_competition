import React, { useState } from "react";
import { collection, getDocs, query, updateDoc, where, doc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

const ScoreEntry = () => {
  const [serialNumber, setSerialNumber] = useState("");
  const [participant, setParticipant] = useState(null);
  const [scores, setScores] = useState(["", "", "", "", ""]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const findParticipant = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setParticipant(null);

    try {
      const participantQuery = query(
        collection(db, "participants"),
        where("serialNumber", "==", serialNumber.trim()),
        where("paymentStatus", "==", "success")
      );
      const snapshot = await getDocs(participantQuery);
      if (snapshot.empty) {
        setMessage("No participant found with that serial number.");
      } else {
        const match = snapshot.docs[0];
        setParticipant({ id: match.id, ...match.data() });
        const existingScores = match.data().scores || [];
        setScores(Array.from({ length: 5 }, (_, index) => existingScores[index] ?? ""));
      }
    } catch (error) {
      console.error("Participant lookup failed:", error);
      setMessage("Could not search participants. Check Firestore access.");
    } finally {
      setLoading(false);
    }
  };

  const saveScores = async (event) => {
    event.preventDefault();
    if (!participant) return;
    const numericScores = scores.map(Number);
    if (scores.some((score) => score === "" || !Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > 10)) {
      setMessage("Enter a score from 0 to 10 for each of the five criteria.");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "participants", participant.id), {
        scores: numericScores,
        score: numericScores.reduce((total, score) => total + score, 0),
        scoredAt: new Date().toISOString(),
      });
      setMessage("Scores saved successfully.");
    } catch (error) {
      console.error("Score save failed:", error);
      setMessage("Could not save scores. Check Firestore permissions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-6">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-xl md:p-8">
        <h1 className="mb-2 text-3xl font-bold text-purple-700">Score Entry</h1>
        <p className="mb-6 text-gray-600">Find a paid participant by serial number, then enter five scores from 0 to 10.</p>
        <form onSubmit={findParticipant} className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} className="flex-1 rounded-xl border border-gray-300 px-4 py-3" placeholder="Participant serial number" required />
          <button disabled={loading} className="rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white disabled:opacity-60">{loading ? "Searching..." : "Find Participant"}</button>
        </form>
        {message && <p role="status" className="mb-4 text-sm text-purple-800">{message}</p>}
        {participant && (
          <form onSubmit={saveScores} className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <h2 className="font-semibold text-gray-900">{participant.name}</h2>
              <p className="text-sm text-gray-600">{participant.institution || ""} · {participant.serialNumber}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {scores.map((score, index) => (
                <label key={index} className="text-sm font-medium text-gray-700">
                  Criterion {index + 1}
                  <input type="number" min="0" max="10" step="0.5" value={score} onChange={(event) => setScores((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" required />
                </label>
              ))}
            </div>
            <button disabled={loading} className="rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 px-5 py-3 font-semibold text-white disabled:opacity-60">Save Scores</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ScoreEntry;
