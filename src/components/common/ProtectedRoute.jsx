import React from "react";
import { Navigate } from "react-router-dom";
import LoadingSpinner from "./LoadingSpinner";

const ProtectedRoute = ({ user, loading, children }) => {
  if (loading) return <LoadingSpinner />;

  if (!user) return <Navigate to="/committee/login" />;

  return children;
};

export default ProtectedRoute;
