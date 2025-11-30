import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";

/* PUBLIC PAGES */
import Home from "./pages/Home";
import IndividualRegistration from "./pages/IndividualRegistration";
import SchoolRegistration from "./pages/SchoolRegistration";
import PaymentPage from "./pages/PaymentPage";
import RegistrationStatus from "./pages/RegistrationStatus";
import Leaderboard from "./pages/Leaderboard";

/* COMMITTEE PAGES */
import CommitteeLogin from "./pages/committee/CommitteeLogin";
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
        <Route path="/leaderboard" element={<Leaderboard />} />

        {/* COMMITTEE ROUTES */}
        <Route path="/committee/login" element={<CommitteeLogin />} />
        <Route path="/committee/verify" element={<Verify />} />
        <Route path="/committee/score" element={<ScoreEntry />} />

        {/* ADMIN ROUTES */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/events" element={<ManageEvents />} />
        <Route path="/admin/categories" element={<ManageCategories />} />
        <Route path="/admin/age-groups" element={<ManageAgeGroups />} />
        <Route path="/admin/templates" element={<ManageTemplates />} />
        <Route path="/admin/participants" element={<ManageParticipants />} />
        <Route path="/admin/users" element={<ManageUsers />} />
        <Route path="/admin/leaderboard" element={<AdminLeaderboard />} />

        <Route path="/pay/:pid" element={<PaymentPage />} />
        <Route path="/payment-success/:pid" element={<PaymentSuccess />} />

      </Routes>

      <Footer />
    </Router>
  );
}

export default App;
