import React, { useEffect, useState } from "react";

const Leaderboard = () => {
  const [sampleData, setSampleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
        const response = await fetch(`${apiBaseUrl}/leaderboard`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Leaderboard load failed.");

        const ranked = (result.participants || []).map((participant, index) => ({
          id: participant.id,
          rank: index + 1,
          name: participant.name || "Participant",
          score: Number(participant.score || 0),
          school: participant.institution || "",
          avatar: (participant.name || "P").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
        }));
        setSampleData(ranked);
      } catch (loadError) {
        console.error("Leaderboard load failed:", loadError);
        setError("Leaderboard is temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  const getMedalIcon = (rank) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full shadow-lg">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full text-purple-700 font-bold">
        {rank}
      </div>
    );
  };

  const getRowStyle = (rank) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400";
    if (rank === 2) return "bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400";
    if (rank === 3) return "bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400";
    return "bg-white hover:bg-purple-50";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-orange-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-orange-500 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent mb-2">
            Leaderboard
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Top performers of the competition
          </p>
        </div>

        {loading && <p className="mb-6 text-center text-gray-600">Loading leaderboard...</p>}
        {error && <p role="alert" className="mb-6 text-center text-red-700">{error}</p>}
        {!loading && !error && sampleData.length === 0 && (
          <p className="mb-6 rounded-xl bg-white p-6 text-center text-gray-600">No paid participants have scores yet.</p>
        )}

        {/* Top 3 Podium - Mobile & Desktop */}
        {sampleData.length >= 3 && <div className="mb-8 flex justify-center items-end gap-4 px-4">
          {/* 2nd Place */}
          <div className="flex flex-col items-center flex-1 max-w-[140px]">
            <div className="relative mb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg border-4 border-white">
                {sampleData[1].avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                <div className="w-6 h-6 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  2
                </div>
              </div>
            </div>
            <h3 className="font-bold text-gray-800 text-sm text-center">{sampleData[1].name}</h3>
            <p className="text-xs text-gray-600 text-center">{sampleData[1].school}</p>
            <div className="mt-2 bg-gradient-to-br from-gray-300 to-gray-500 text-white px-4 py-2 rounded-lg font-bold shadow-md">
              {sampleData[1].score}
            </div>
            <div className="w-full bg-gradient-to-br from-gray-300 to-gray-500 rounded-t-xl mt-3 h-24 shadow-lg"></div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center flex-1 max-w-[140px]">
            <div className="relative mb-3">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-xl border-4 border-white animate-pulse">
                {sampleData[0].avatar}
              </div>
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
            <h3 className="font-bold text-gray-800 text-sm text-center">{sampleData[0].name}</h3>
            <p className="text-xs text-gray-600 text-center">{sampleData[0].school}</p>
            <div className="mt-2 bg-gradient-to-br from-yellow-400 to-yellow-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
              {sampleData[0].score}
            </div>
            <div className="w-full bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-t-xl mt-3 h-32 shadow-xl"></div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center flex-1 max-w-[140px]">
            <div className="relative mb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg border-4 border-white">
                {sampleData[2].avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  3
                </div>
              </div>
            </div>
            <h3 className="font-bold text-gray-800 text-sm text-center">{sampleData[2].name}</h3>
            <p className="text-xs text-gray-600 text-center">{sampleData[2].school}</p>
            <div className="mt-2 bg-gradient-to-br from-orange-400 to-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-md">
              {sampleData[2].score}
            </div>
            <div className="w-full bg-gradient-to-br from-orange-400 to-orange-600 rounded-t-xl mt-3 h-20 shadow-lg"></div>
          </div>
        </div>}

        {/* Full Leaderboard Table */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-purple-100">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-purple-600 to-orange-500">
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Participant</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">School</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white">Score</th>
                </tr>
              </thead>
              <tbody>
                {sampleData.map((participant, index) => (
                  <tr key={index} className={`${getRowStyle(participant.rank)} transition-all duration-200`}>
                    <td className="px-6 py-4 text-center">
                      {getMedalIcon(participant.rank)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {participant.avatar}
                        </div>
                        <span className="font-semibold text-gray-800">{participant.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{participant.school}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-lg font-bold shadow-md">
                        {participant.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-3">
            {sampleData.map((participant, index) => (
              <div key={index} className={`${getRowStyle(participant.rank)} rounded-2xl p-4 shadow-md transition-all duration-200`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getMedalIcon(participant.rank)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 truncate">{participant.name}</h3>
                      <p className="text-xs text-gray-600 truncate">{participant.school}</p>
                    </div>
                  </div>
                  <div className="ml-3">
                    <span className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-lg font-bold text-sm shadow-md">
                      {participant.score}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 text-center shadow-lg border border-purple-100">
            <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
              {sampleData.length}
            </p>
            <p className="text-xs text-gray-600 mt-1">Total Participants</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-lg border border-purple-100">
            <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
              {sampleData[0]?.score ?? 0}
            </p>
            <p className="text-xs text-gray-600 mt-1">Top Score</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-lg border border-purple-100">
            <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
              {sampleData.length ? Math.round(sampleData.reduce((sum, p) => sum + p.score, 0) / sampleData.length) : 0}
            </p>
            <p className="text-xs text-gray-600 mt-1">Average Score</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;