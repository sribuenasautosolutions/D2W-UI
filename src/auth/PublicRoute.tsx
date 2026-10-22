import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { User } from "../types/auth";

interface PublicRouteProps {
  children: ReactNode;
}

function PublicRoute({ children }: PublicRouteProps) {
  const rawUser = localStorage.getItem("user");
  const user: User | null = rawUser ? JSON.parse(rawUser) : null;

  if (user) {
    if (user.role === "SUPER_ADMIN") {
      return <Navigate to="/owner/dashboard" replace />;
    }

    if (user.role === "STORE_OWNER") {
      return <Navigate to="/store/dashboard" replace />;
    }

    if (user.role === "CASHIER") {
      return <Navigate to="/pos" replace />;
    }
  }

  return <>{children}</>;
}

export default PublicRoute;
