import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const LoginPage = lazy(() => import("../pages/LoginPage"));
const OwnerRoutes = lazy(() => import("../owner/routes/OwnerRoutes"));
const StoreRoutes = lazy(() => import("../store/routes/StoreRoutes"));
const POSRoutes = lazy(() => import("../pos/routes/POSRoutes"));
const LeadStaffRoutes = lazy(() => import("../store/routes/LeadStaffRoutes"));
import PublicRoute from "../auth/PublicRoute";

import ProtectedRoute from "../auth/ProtectedRoute";
const UnauthorizedPage = lazy(() => import("../pages/UnauthorizedPage"));

function AppRoutesNew() {
  return (
    <Suspense fallback={<div role="status">Loading page…</div>}>
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
          <ProtectedRoute
            allowedRoles={["SUPER_ADMIN"]}
            requiredPermissions={[
              "EMPLOYEES.VIEW", "STORES.VIEW", "CATALOGUE.VIEW", "VEHICLES.VIEW",
              "INVENTORY.VIEW", "PURCHASE_ORDERS.VIEW", "SALES.VIEW",
              "CUSTOMERS.VIEW", "LEADS.VIEW", "REPORTS.VIEW", "DASHBOARD.VIEW",
              "ROLES.VIEW", "PERMISSIONS.VIEW"
            ]}
          >
            <OwnerRoutes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/store/*"
        element={
          <ProtectedRoute
            allowedRoles={["STORE_OWNER"]}
            requiredPermissions={[
              "INVENTORY.VIEW", "PURCHASE_ORDERS.VIEW", "SALES.VIEW",
              "CUSTOMERS.VIEW", "LEADS.VIEW", "REPORTS.VIEW", "EMPLOYEES.VIEW",
              "ROLES.VIEW", "PERMISSIONS.VIEW"
            ]}
          >
            <StoreRoutes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pos/*"
        element={
          <ProtectedRoute 
            allowedRoles={["SUPER_ADMIN","STORE_OWNER","CASHIER"]}
            requiredPermissions={["SALES.VIEW", "SALES.CREATE", "SALES.PAYMENT"]}
          >
            <POSRoutes />
          </ProtectedRoute>
        }
      />

      <Route path="/salesperson/*" element={
        <ProtectedRoute allowedRoles={["SALESPERSON"]}><LeadStaffRoutes role="SALESPERSON" /></ProtectedRoute>
      } />
      <Route path="/procurement/*" element={
        <ProtectedRoute allowedRoles={["PROCUREMENT"]}><LeadStaffRoutes role="PROCUREMENT" /></ProtectedRoute>
      } />

    </Routes>
    </Suspense>
  );
}

export default AppRoutesNew;
