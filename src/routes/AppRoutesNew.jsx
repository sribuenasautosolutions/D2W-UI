import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import OwnerRoutes from "../owner/routes/OwnerRoutes";
import StoreRoutes from "../store/routes/StoreRoutes";
import POSRoutes from "../pos/routes/POSRoutes";
import PublicRoute from "../auth/PublicRoute";

import ProtectedRoute from "../auth/ProtectedRoute";
import UnauthorizedPage from "../pages/UnauthorizedPage";

function AppRoutesNew() {
  return (
    <Routes>

      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

     <Route
    path="/login"
    element={
        <PublicRoute>
            <LoginPage />
        </PublicRoute>
    }
/>
<Route
    path="/unauthorized"
    element={<UnauthorizedPage />}
/>

      <Route
        path="/owner/*"
        element={
          <ProtectedRoute allowedRoles={["OWNER"]}>
            <OwnerRoutes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/store/*"
        element={
          <ProtectedRoute allowedRoles={["MAINSTORE_MANAGER"]}>
            <StoreRoutes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pos/*"
        element={
          <ProtectedRoute allowedRoles={["Admin"]}>
            <POSRoutes />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
}

export default AppRoutesNew;