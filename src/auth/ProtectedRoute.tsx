import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { User, UserRole } from "../types/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const rawUser = localStorage.getItem("user");
  const user: User | null = rawUser ? JSON.parse(rawUser) : null;

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role
  if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
