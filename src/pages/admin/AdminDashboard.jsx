import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    participants: 0,
    visited: 0,
    evaluated: 0,
    revenue: 0,
    users: 0,
    events: 0,
    categories: 0,
  });
  const [participantsList, setParticipantsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [participantsSnap, usersSnap, eventsSnap, categoriesSnap] = await Promise.all([
          getDocs(collection(db, "participants")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "events")),
          getDocs(collection(db, "categories")),
        ]);

        const participantsData = participantsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setParticipantsList(participantsData);

        const visitedCount = participantsData.filter((p) => p.visited === true).length;
        const evaluatedCount = participantsData.filter((p) => p.score != null).length;
        const paidCount = participantsData.filter(
          (p) => p.paymentStatus === "success" || p.paymentStatus === "VERIFIED"
        ).length;

        setStats({
          participants: participantsData.length,
          visited: visitedCount,
          evaluated: evaluatedCount,
          revenue: paidCount * 2,
          users: usersSnap.size,
          events: eventsSnap.size,
          categories: categoriesSnap.size,
        });
      } catch (error) {
        console.error("Dashboard stats load failed:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  // Export all participants to CSV
  const exportToCSV = () => {
    if (!participantsList || participantsList.length === 0) {
      alert("No participants available to export.");
      return;
    }

    const headers = [
      "Serial Number",
      "Name",
      "Age",
      "Gender",
      "Class",
      "Institution",
      "Instructor",
      "Phone",
      "Email",
      "Event",
      "Category",
      "Level",
      "Payment Status",
      "Visited",
      "Total Score",
      "Prize / Position",
    ];

    const rows = participantsList.map((p) => [
      `"${p.serialNumber || ""}"`,
      `"${p.name || ""}"`,
      p.age || "",
      `"${p.gender || ""}"`,
      `"${p.class || ""}"`,
      `"${p.institution || p.school || ""}"`,
      `"${p.instructor || ""}"`,
      `"${p.instructorPhone || ""}"`,
      `"${p.email || ""}"`,
      `"${p.event || ""}"`,
      `"${p.category || ""}"`,
      `"${p.level || ""}"`,
      `"${p.paymentStatus || ""}"`,
      p.visited ? "YES" : "NO",
      p.score ?? "",
      `"${p.prize || p.position || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ekadhma_yoga_participants_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-purple-100">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🛡️</span>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              Real-time competition operations, attendance overview, and reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/participants"
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-purple-600 text-purple-700 hover:bg-purple-50 font-bold rounded-xl shadow-xs hover:shadow-md transition-all text-sm"
            >
              <span>📤</span>
              <span>Upload School Excel</span>
            </Link>

            <button
              type="button"
              onClick={exportToCSV}
              disabled={loading || participantsList.length === 0}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm disabled:opacity-50"
            >
              <span>📥</span>
              <span>Export Participants CSV</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 bg-white rounded-3xl shadow-xl">
            <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-600 font-medium">Loading live dashboard metrics...</p>
          </div>
        ) : (
          <>
            {/* Live Metrics Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl bg-white p-6 shadow-xl border border-purple-100 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl p-2.5 rounded-2xl bg-purple-50 text-purple-700">🧘</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                    Total
                  </span>
                </div>
                <p className="text-xs uppercase font-bold text-gray-500">Registered</p>
                <h2 className="mt-1 text-4xl font-black text-gray-800">{stats.participants}</h2>
                <p className="mt-2 text-xs text-gray-400">Total registered participants</p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-xl border border-green-100 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl p-2.5 rounded-2xl bg-green-50 text-green-700">🎟️</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    {stats.participants > 0 ? Math.round((stats.visited / stats.participants) * 100) : 0}% Turnout
                  </span>
                </div>
                <p className="text-xs uppercase font-bold text-gray-500">Present / Visited</p>
                <h2 className="mt-1 text-4xl font-black text-green-700">{stats.visited}</h2>
                <p className="mt-2 text-xs text-gray-400">Marked visited by committee</p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-xl border border-blue-100 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl p-2.5 rounded-2xl bg-blue-50 text-blue-700">🏆</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    Scored
                  </span>
                </div>
                <p className="text-xs uppercase font-bold text-gray-500">Evaluated</p>
                <h2 className="mt-1 text-4xl font-black text-blue-700">{stats.evaluated}</h2>
                <p className="mt-2 text-xs text-gray-400">Scores recorded in system</p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-xl border border-orange-100 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl p-2.5 rounded-2xl bg-orange-50 text-orange-700">💰</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                    INR
                  </span>
                </div>
                <p className="text-xs uppercase font-bold text-gray-500">Total Collections</p>
                <h2 className="mt-1 text-4xl font-black text-orange-600">₹{stats.revenue}</h2>
                <p className="mt-2 text-xs text-gray-400">Verified participant fees</p>
              </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span>⚡</span>
                <span>Operational Control Panels</span>
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  to="/admin/results"
                  className="rounded-2xl bg-white p-5 shadow-lg border border-purple-100 transition-all hover:-translate-y-1 hover:shadow-xl group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl group-hover:scale-110 transition-transform">📊</span>
                    <h3 className="font-bold text-purple-700 text-lg">Competition Results</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    View final scores, ranks, and prizes filtered by instructor or category.
                  </p>
                </Link>

                <Link
                  to="/admin/upi-payments"
                  className="rounded-2xl bg-white p-5 shadow-lg border border-purple-100 transition-all hover:-translate-y-1 hover:shadow-xl group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl group-hover:scale-110 transition-transform">💳</span>
                    <h3 className="font-bold text-purple-700 text-lg">UPI Payment Verification</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Review UTR submissions, approve payments, and reconcile transactions.
                  </p>
                </Link>

                <Link
                  to="/admin/participants"
                  className="rounded-2xl bg-white p-5 shadow-lg border border-purple-100 transition-all hover:-translate-y-1 hover:shadow-xl group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl group-hover:scale-110 transition-transform">👥</span>
                    <h3 className="font-bold text-purple-700 text-lg">Manage Participants</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Search, view, and edit all participant records in the database.
                  </p>
                </Link>

                <Link
                  to="/admin/events"
                  className="rounded-2xl bg-white p-5 shadow-lg border border-purple-100 transition-all hover:-translate-y-1 hover:shadow-xl group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🗓️</span>
                    <h3 className="font-bold text-purple-700 text-lg">Manage Events & Levels</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Configure events, age groups, categories, and competition tiers.
                  </p>
                </Link>

                <Link
                  to="/admin/users"
                  className="rounded-2xl bg-white p-5 shadow-lg border border-purple-100 transition-all hover:-translate-y-1 hover:shadow-xl group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🔑</span>
                    <h3 className="font-bold text-purple-700 text-lg">Manage Staff Roles</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Configure administrator and committee member roles in Firestore.
                  </p>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
