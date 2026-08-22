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
          allowedRoles={["SUPER_ADMIN","CASHIER"]}>
            <POSRoutes />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
}

export default AppRoutesNew;
