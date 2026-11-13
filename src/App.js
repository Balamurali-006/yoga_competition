import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { subscribeToAuth } from "./firebase/auth";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AdminRoute from "./components/common/AdminRoute";

import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";

/* PUBLIC PAGES */
import Home from "./pages/Home";
import IndividualRegistration from "./pages/IndividualRegistration";
import SchoolRegistration from "./pages/SchoolRegistration";
import PaymentPage from "./pages/PaymentPage";
import RegistrationStatus from "./pages/RegistrationStatus";

/* COMMITTEE PAGES */
import CommitteeLogin from "./pages/committee/CommitteeLogin";
import AdminLogin from "./pages/admin/AdminLogin";
import Verify from "./pages/committee/Verify";
import ScoreEntry from "./pages/committee/ScoreEntry";

/* ADMIN PAGES */
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageEvents from "./pages/admin/ManageEvents";
import ManageCategories from "./pages/admin/ManageCategories";
import ManageAgeGroups from "./pages/admin/ManageAgeGroups";
import ManageTemplates from "./pages/admin/ManageTemplates";
import ManageParticipants from "./pages/admin/ManageParticipants";
import ManageUsers from "./pages/admin/ManageUsers";
import AdminLeaderboard from "./pages/admin/AdminLeaderboard";
import PaymentSuccess from "./pages/PaymentSuccess";


function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Navbar />

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<IndividualRegistration />} />
        <Route path="/school-registration" element={<SchoolRegistration />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/status" element={<RegistrationStatus />} />

        {/* COMMITTEE ROUTES */}
        <Route path="/committee/login" element={<CommitteeLogin />} />
        <Route path="/committee/verify" element={<ProtectedRoute user={authUser} loading={authLoading}><Verify /></ProtectedRoute>} />
        <Route path="/committee/score" element={<ProtectedRoute user={authUser} loading={authLoading}><ScoreEntry /></ProtectedRoute>} />

        {/* ADMIN ROUTES */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminRoute user={authUser} loading={authLoading}><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/events" element={<AdminRoute user={authUser} loading={authLoading}><ManageEvents /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute user={authUser} loading={authLoading}><ManageCategories /></AdminRoute>} />
        <Route path="/admin/age-groups" element={<AdminRoute user={authUser} loading={authLoading}><ManageAgeGroups /></AdminRoute>} />
        <Route path="/admin/templates" element={<AdminRoute user={authUser} loading={authLoading}><ManageTemplates /></AdminRoute>} />
        <Route path="/admin/participants" element={<AdminRoute user={authUser} loading={authLoading}><ManageParticipants /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute user={authUser} loading={authLoading}><ManageUsers /></AdminRoute>} />
        <Route path="/admin/leaderboard" element={<AdminRoute user={authUser} loading={authLoading}><AdminLeaderboard /></AdminRoute>} />

        <Route path="/pay/:pid" element={<PaymentPage />} />
        <Route path="/payment-success/:pid" element={<PaymentSuccess />} />

      </Routes>

      <Footer />
    </Router>
  );
}

export default App;
