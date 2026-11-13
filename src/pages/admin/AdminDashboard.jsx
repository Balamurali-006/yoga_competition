import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ participants: 0, users: 0, events: 0, categories: 0 });
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

        setStats({
          participants: participantsSnap.size,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-purple-700">Admin Dashboard</h1>
          <p className="text-gray-600">Overview of your competition portal</p>
        </div>

        {loading ? (
          <div className="text-gray-600">Loading dashboard...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Participants", value: stats.participants, color: "from-purple-600 to-purple-500" },
              { label: "Users", value: stats.users, color: "from-orange-500 to-orange-400" },
              { label: "Events", value: stats.events, color: "from-green-500 to-green-400" },
              { label: "Categories", value: stats.categories, color: "from-blue-500 to-blue-400" },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl bg-white p-6 shadow-xl">
                <div className={`mb-3 h-2 w-20 rounded-full bg-gradient-to-r ${item.color}`} />
                <p className="text-sm text-gray-500">{item.label}</p>
                <h2 className="mt-3 text-4xl font-bold text-gray-800">{item.value}</h2>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
