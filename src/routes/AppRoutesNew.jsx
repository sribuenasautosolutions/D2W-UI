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
              requiredPermissions={[
              "EMPLOYEES.VIEW", "STORES.VIEW", "STORES.UPDATE",
              "CATALOGUE.VIEW", "CATALOGUE.CREATE", "CATALOGUE.UPDATE", "LOCAL_PRODUCTS.APPROVE",
              "VEHICLES.VIEW", "VEHICLES.MANAGE",
              "INVENTORY.VIEW", "INVENTORY.ADJUST", "INVENTORY.TRANSFER", "BARCODES.PRINT",
              "PURCHASE_ORDERS.VIEW", "PURCHASE_ORDERS.CREATE", "VENDORS.VIEW", "VENDORS.MANAGE",
              "SALES.VIEW", "SALES.CREATE", "SALES.PAYMENT", "PROFORMA.VIEW", "PROFORMA.CREATE",
              "CUSTOMERS.VIEW", "LEADS.VIEW", "LEADS.CREATE", "WHATSAPP.VIEW",
              "REPORTS.VIEW", "DASHBOARD.VIEW",
              "ROLES.VIEW", "ROLES.CREATE", "ROLES.UPDATE", "PERMISSIONS.VIEW", "PERMISSIONS.MANAGE"
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
            requiredPermissions={[
              "DASHBOARD.VIEW", "CATALOGUE.VIEW",
              "INVENTORY.VIEW", "INVENTORY.ADJUST", "INVENTORY.TRANSFER", "BARCODES.PRINT",
              "PURCHASE_ORDERS.VIEW", "PURCHASE_ORDERS.CREATE", "VENDORS.VIEW",
              "SALES.VIEW", "SALES.CREATE", "SALES.PAYMENT", "PROFORMA.VIEW",
              "CUSTOMERS.VIEW", "LEADS.VIEW", "LEADS.CREATE", "LEADS.PROCUREMENT", "WHATSAPP.VIEW",
              "REPORTS.VIEW", "EMPLOYEES.VIEW",
              "ROLES.VIEW", "ROLES.CREATE", "ROLES.UPDATE", "ROLES.ASSIGN", "PERMISSIONS.VIEW"
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
            requiredPermissions={["SALES.VIEW", "SALES.CREATE", "SALES.PAYMENT"]}
          >
            <POSRoutes />
          </ProtectedRoute>
        }
      />

      <Route path="/salesperson/*" element={
        <ProtectedRoute requiredPermissions={["LEADS.VIEW", "SALES.VIEW"]}><LeadStaffRoutes role="SALESPERSON" /></ProtectedRoute>
      } />
      <Route path="/procurement/*" element={
        <ProtectedRoute requiredPermissions={["LEADS.VIEW", "LEADS.PROCUREMENT"]}><LeadStaffRoutes role="PROCUREMENT" /></ProtectedRoute>
      } />

    </Routes>
    </Suspense>
  );
}

export default AppRoutesNew;
