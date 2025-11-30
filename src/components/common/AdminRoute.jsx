import React from "react";
import { Navigate } from "react-router-dom";
import LoadingSpinner from "./LoadingSpinner";

const AdminRoute = ({ user, loading, children }) => {
  if (loading) return <LoadingSpinner />;

  if (!user || user.role !== "admin") {
    return <Navigate to="/admin/login" />;
  }

  return children;
};

export default AdminRoute;
