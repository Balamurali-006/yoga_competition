import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeToCollection } from "../../firebase/firestore";
import { getCompleteScoreTotal, getPrizeForScore } from "../../utils/prize";

const getScoreValues = (score, participant) => {
  const savedScores = Array.isArray(score.scores)
    ? score.scores
    : Array.isArray(participant.scores)
      ? participant.scores
      : [score.asana1, score.asana2, score.asana3, score.asana4, score.asana5];
  return Array.from({ length: 5 }, (_, index) => {
    const value = savedScores[index];
    return value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value))
      ? Number(value)
      : null;
  });
};

const AdminResults = () => {
  const [participants, setParticipants] = useState([]);
  const [scores, setScores] = useState({});
  const [selectedInstructor, setSelectedInstructor] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [loadingScores, setLoadingScores] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribeParticipants = subscribeToCollection(
      "participants",
      (items) => {
        setParticipants(items || []);
        setLoadingParticipants(false);
      },
      (loadError) => {
        console.error("Could not load participants for admin results:", loadError);
        setError("Could not load participants. Confirm your admin access and Firestore rules.");
        setLoadingParticipants(false);
      }
    );
    const unsubscribeScores = subscribeToCollection(
      "scores",
      (items) => {
        const scoreMap = {};
        (items || []).forEach((item) => {
          scoreMap[item.id || item.participantId] = item;
        });
        setScores(scoreMap);
        setLoadingScores(false);
      },
      (loadError) => {
        console.error("Could not load saved scores for admin results:", loadError);
        setError("Could not load saved scorecards. Confirm your admin access and Firestore rules.");
        setLoadingScores(false);
      }
    );

    return () => {
      unsubscribeParticipants();
      unsubscribeScores();
    };
  }, []);

  const instructors = useMemo(() => {
    return Array.from(new Set(
      participants
        .map((participant) => (participant.instructor || scores[participant.id]?.instructor || "").trim())
        .filter(Boolean)
    )).sort((left, right) => left.localeCompare(right));
  }, [participants, scores]);

  const institutions = useMemo(() => {
    return Array.from(new Set(
      participants
        .map((participant) => (participant.institution || scores[participant.id]?.institution || "").trim())
        .filter(Boolean)
    )).sort((left, right) => left.localeCompare(right));
  }, [participants, scores]);

  const results = useMemo(() => {
    return participants
      .filter((participant) => {
        const score = scores[participant.id] || {};
        const instructor = (participant.instructor || score.instructor || "").trim().toLowerCase();
        const institution = (participant.institution || score.institution || "").trim().toLowerCase();
        return (!selectedInstructor || instructor === selectedInstructor.toLowerCase()) &&
          (!selectedInstitution || institution === selectedInstitution.toLowerCase());
      })
      .map((participant) => {
        const score = scores[participant.id] || {};
        const scoreValues = getScoreValues(score, participant);
        const total = getCompleteScoreTotal(scoreValues);
        return {
          id: participant.id,
          name: participant.name || score.studentName || "Unnamed participant",
          serialNumber: participant.serialNumber || score.serialNumber || "—",
          instructor: participant.instructor || score.instructor || "—",
          institution: participant.institution || score.institution || "—",
          className: participant.class || score.class || "—",
          scoreValues,
          total,
          prize: total === null ? "" : getPrizeForScore(total),
        };
      })
      .sort((left, right) => {
        if (left.total === null) return right.total === null ? left.name.localeCompare(right.name) : 1;
        if (right.total === null) return -1;
        return right.total - left.total || left.name.localeCompare(right.name);
      });
  }, [participants, scores, selectedInstructor, selectedInstitution]);

  const loading = loadingParticipants || loadingScores;

  return (
    <main className="admin-results-print-area min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-purple-700">Competition Results</h1>
            <p className="mt-1 text-gray-600">Live results from saved Firestore scorecards.</p>
            <p className="admin-results-print-summary">
              Instructor: {selectedInstructor || "All"} · Institution: {selectedInstitution || "All"}
            </p>
          </div>
          <div className="admin-results-no-print flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || results.length === 0}
              className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Print filtered results
            </button>
            <Link to="/admin/dashboard" className="w-fit rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-700">
              Back to Admin Dashboard
            </Link>
          </div>
        </header>

        {error && <p role="alert" className="admin-results-no-print rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <section className="admin-results-no-print rounded-2xl bg-white p-5 shadow-lg">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-700">
              Filter by instructor
              <select
                value={selectedInstructor}
                onChange={(event) => setSelectedInstructor(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
              >
                <option value="">All instructors</option>
                {instructors.map((instructor) => <option key={instructor} value={instructor}>{instructor}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Filter by institution
              <select
                value={selectedInstitution}
                onChange={(event) => setSelectedInstitution(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
              >
                <option value="">All institutions</option>
                {institutions.map((institution) => <option key={institution} value={institution}>{institution}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Showing <strong className="text-purple-700">{results.length}</strong> student(s)
            {selectedInstructor ? ` · Instructor: ${selectedInstructor}` : ""}
            {selectedInstitution ? ` · Institution: ${selectedInstitution}` : ""}.
          </p>
        </section>

        {loading ? (
          <p className="text-gray-600">Loading results...</p>
        ) : results.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-gray-600 shadow">No participants match the selected filters.</div>
        ) : (
          <div className="admin-results-print-table overflow-x-auto rounded-2xl bg-white shadow-lg">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="bg-gradient-to-r from-purple-700 to-orange-500 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-left">Institution</th>
                  <th className="px-3 py-3 text-center">Asana 1</th>
                  <th className="px-3 py-3 text-center">Asana 2</th>
                  <th className="px-3 py-3 text-center">Asana 3</th>
                  <th className="px-3 py-3 text-center">Asana 4</th>
                  <th className="px-3 py-3 text-center">Asana 5</th>
                  <th className="px-4 py-3 text-center">Total / 50</th>
                  <th className="px-4 py-3 text-left">Prize</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={result.id} className={index % 2 === 0 ? "bg-white" : "bg-purple-50"}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{result.name}</p>
                      <p className="text-xs text-gray-500">{result.serialNumber}</p>
                    </td>
                    <td className="px-4 py-3">{result.className}</td>
                    <td className="px-4 py-3">{result.institution}</td>
                    {result.scoreValues.map((value, scoreIndex) => (
                      <td key={scoreIndex} className="px-3 py-3 text-center">{value ?? "—"}</td>
                    ))}
                    <td className="px-4 py-3 text-center font-bold">{result.total ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-purple-700">{result.prize || "Not scored"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`
        .admin-results-print-summary { display: none; }
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          .admin-results-print-area,
          .admin-results-print-area * { visibility: visible !important; }
          .admin-results-print-area {
            position: absolute;
            inset: 0;
            width: 100%;
            min-height: 0;
            padding: 0;
            background: #fff !important;
          }
          .admin-results-no-print { display: none !important; }
          .admin-results-print-summary { display: block; margin-top: 6px; color: #333; font-size: 12px; }
          .admin-results-print-table {
            overflow: visible !important;
            border-radius: 0;
            box-shadow: none;
          }
          .admin-results-print-table table { min-width: 0; font-size: 10px; }
          .admin-results-print-table th,
          .admin-results-print-table td { padding: 5px; }
          .admin-results-print-table thead { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .admin-results-print-table tr { break-inside: avoid; }
        }
      `}</style>
    </main>
  );
};

export default AdminResults;
