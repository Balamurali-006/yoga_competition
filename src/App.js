import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { subscribeToAuth } from "./firebase/auth";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AdminRoute from "./components/common/AdminRoute";

import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import ScrollToTopButton from "./components/common/ScrollToTopButton";

/* PUBLIC PAGES */
import Home from "./pages/Home";
import IndividualRegistration from "./pages/IndividualRegistration";
import SchoolRegistration from "./pages/SchoolRegistration";
import UpiPaymentPage from "./pages/UpiPaymentPage";
import AdminUpiPayments from "./pages/admin/AdminUpiPayments";
import AdminCheckIn from "./pages/admin/AdminCheckIn";
import Validation from "./pages/Validation";

/* COMMITTEE PAGES */
import AdminLogin from "./pages/admin/AdminLogin";
import Verify from "./pages/committee/Verify";
import ScoreEntry from "./pages/committee/ScoreEntry";

/* ADMIN PAGES */
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminResults from "./pages/admin/AdminResults";
import ManageEvents from "./pages/admin/ManageEvents";
import ManageCategories from "./pages/admin/ManageCategories";
import ManageAgeGroups from "./pages/admin/ManageAgeGroups";
import ManageTemplates from "./pages/admin/ManageTemplates";
import ManageParticipants from "./pages/admin/ManageParticipants";
import ManageUsers from "./pages/admin/ManageUsers";
import AdminLeaderboard from "./pages/admin/AdminLeaderboard";


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
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Navbar />

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<IndividualRegistration />} />
        <Route path="/school-registration" element={<SchoolRegistration />} />
        <Route path="/upi-payment/:paymentId" element={<UpiPaymentPage />} />
        <Route path="/pay/:pid" element={<UpiPaymentPage />} />

        {/* VALIDATION MODULE */}
        <Route path="/validation" element={<Validation user={authUser} />} />
        <Route path="/validation/login" element={<Validation user={authUser} />} />

        {/* COMMITTEE ROUTES (Requires login on every visit/tab switch) */}
        <Route path="/committee" element={<Verify />} />
        <Route path="/committee/login" element={<Verify />} />
        <Route path="/committee/verify" element={<Verify />} />
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
        <Route path="/admin/results" element={<AdminRoute user={authUser} loading={authLoading}><AdminResults /></AdminRoute>} />
        <Route path="/admin/upi-payments" element={<AdminRoute user={authUser} loading={authLoading}><AdminUpiPayments /></AdminRoute>} />
        <Route path="/admin/check-in" element={<AdminRoute user={authUser} loading={authLoading}><AdminCheckIn /></AdminRoute>} />

      </Routes>

      <ScrollToTopButton />
      <Footer />
    </Router>
  );
}

export default App;
