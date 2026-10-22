import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const LoginPage = lazy(() => import("../pages/LoginPage"));
const OwnerRoutes = lazy(() => import("./OwnerRoutes"));
const StoreRoutes = lazy(() => import("./StoreRoutes"));
const POSRoutes = lazy(() => import("./POSRoutes"));
import PublicRoute from "../auth/PublicRoute";

import ProtectedRoute from "../auth/ProtectedRoute";
const UnauthorizedPage = lazy(() => import("../pages/UnauthorizedPage"));

function AppRoutes() {
  return (
    <Suspense fallback={<div role="status">Loading page…</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route
          path="/owner/*"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <OwnerRoutes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/store/*"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]}>
              <StoreRoutes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pos/*"
          element={
            <ProtectedRoute
              allowedRoles={["SUPER_ADMIN", "STORE_OWNER", "CASHIER"]}
            >
              <POSRoutes />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
