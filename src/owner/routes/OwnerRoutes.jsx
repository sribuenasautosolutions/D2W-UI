import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "../../auth/ProtectedRoute";

const LeadOfferPage = lazy(() => import("../../sales/pages/LeadOfferPage"));
const DashboardHome = lazy(() => import("../pages/DashboardHome"));
const ProductPage = lazy(() => import("../pages/ProductPage"));

const VehicleManagement = lazy(
  () => import("../components/vehicles/VehicleManagement")
);

const InventoryPage = lazy(() => import("../pages/InventoryPage"));
const PurchasesPage = lazy(() => import("../pages/PurchasesPage"));
const ReportsPage = lazy(() => import("../pages/ReportsPage"));
const StoresPage = lazy(() => import("../pages/StoresPage"));
const UsersPage = lazy(() => import("../pages/UsersPage"));

const ProductApprovalPage = lazy(
  () => import("../pages/ProductApprovalPage")
);

const SalesPage = lazy(() => import("../../sales/pages/SalesPage"));
const NewSalePage = lazy(() => import("../../sales/pages/NewSalePage"));

const SaleBulkUploadPage = lazy(
  () => import("../../sales/pages/SaleBulkUploadPage")
);

const ProformaListPage = lazy(
  () => import("../../sales/pages/ProformaListPage")
);

const ProformaViewPage = lazy(
  () => import("../../sales/pages/ProformaViewPage")
);

const PaymentPage = lazy(
  () => import("../../pos/pages/PaymentPageor")
);

const ProductManagePage = lazy(
  () => import("../components/inventory/ProductManagePage")
);

const LeadCreate = lazy(
  () => import("../components/leads/LeadCreate")
);

const LeadList = lazy(
  () => import("../components/leads/LeadList")
);

const WhatsAppChats = lazy(
  () => import("../components/leads/WhatsAppChats")
);

const WhatsAppConnect = lazy(
  () => import("../components/leads/WhatsAppConnect")
);

const InvoicePage = lazy(
  () => import("../../pos/pages/InvoicePage")
);

const LeadDetails = lazy(
  () => import("../components/leads/LeadDetails")
);

const RoleManagementPage = lazy(
  () => import("../pages/RoleManagementPage")
);

function OwnerRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route
          path="/sales/proforma/:id/lead"
          element={
            <ProtectedRoute requiredPermissions={["PROFORMA.VIEW", "LEADS.VIEW"]}>
              <DashboardLayout>
                <LeadOfferPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredPermissions={["DASHBOARD.VIEW", "STORES.UPDATE"]}>
              <DashboardLayout>
                <DashboardHome />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

          <Route
          path="/products"
          element={
            <ProtectedRoute requiredPermissions={["CATALOGUE.VIEW", "CATALOGUE.CREATE", "CATALOGUE.UPDATE"]}>
              <DashboardLayout>
                <ProductPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/product-approval"
          element={
            <ProtectedRoute requiredPermissions={["LOCAL_PRODUCTS.APPROVE"]}>
              <DashboardLayout>
                <ProductApprovalPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="inventory/products/:inventoryId/manage"
          element={
            <ProtectedRoute requiredPermissions={["INVENTORY.VIEW"]}>
              <ProductManagePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vehicles"
          element={
            <ProtectedRoute requiredPermissions={["VEHICLES.VIEW", "VEHICLES.MANAGE"]}>
              <DashboardLayout>
                <VehicleManagement />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute requiredPermissions={["INVENTORY.VIEW", "INVENTORY.ADJUST", "INVENTORY.TRANSFER", "BARCODES.PRINT"]}>
              <DashboardLayout>
                <InventoryPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchases"
          element={
            <ProtectedRoute requiredPermissions={["PURCHASE_ORDERS.VIEW", "PURCHASE_ORDERS.CREATE", "VENDORS.VIEW", "VENDORS.MANAGE"]}>
              <DashboardLayout>
                <PurchasesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <ProtectedRoute requiredPermissions={["SALES.VIEW"]}>
              <DashboardLayout>
                <SalesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/edit/:orderId"
          element={
            <ProtectedRoute requiredPermissions={["SALES.CREATE", "SALES.VIEW"]}>
              <NewSalePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/new"
          element={
            <ProtectedRoute requiredPermissions={["SALES.CREATE"]}>
              <NewSalePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/import-items"
          element={
            <ProtectedRoute requiredPermissions={["SALES.CREATE"]}>
              <SaleBulkUploadPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/proforma"
          element={
            <ProtectedRoute requiredPermissions={["PROFORMA.VIEW"]}>
              <DashboardLayout>
                <ProformaListPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/proforma/new"
          element={
            <ProtectedRoute requiredPermissions={["PROFORMA.CREATE"]}>
              <NewSalePage documentMode="PROFORMA" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/proforma/:id/edit"
          element={
            <ProtectedRoute requiredPermissions={["PROFORMA.CREATE"]}>
              <NewSalePage documentMode="PROFORMA" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/proforma/:id"
          element={
            <ProtectedRoute requiredPermissions={["PROFORMA.VIEW"]}>
              <ProformaViewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.VIEW"]}>
              <DashboardLayout>
                <Suspense fallback={<div className="ref-kanban-empty-wrap" style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}><strong>Loading leads module...</strong></div>}>
                  <LeadList />
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/:id"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.VIEW"]}>
              <DashboardLayout>
                <LeadDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/chats"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.VIEW", "WHATSAPP.VIEW"]}>
              <DashboardLayout>
                <WhatsAppChats />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/whatsapp"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.VIEW", "WHATSAPP.VIEW"]}>
              <DashboardLayout>
                <WhatsAppConnect />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/new"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.CREATE"]}>
              <DashboardLayout>
                <LeadCreate />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/payment/:orderId"
          element={
            <ProtectedRoute requiredPermissions={["SALES.PAYMENT", "SALES.VIEW"]}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/invoice/:orderId"
          element={
            <ProtectedRoute requiredPermissions={["SALES.VIEW"]}>
              <InvoicePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredPermissions={["REPORTS.VIEW"]}>
              <DashboardLayout>
                <ReportsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/stores"
          element={
            <ProtectedRoute requiredPermissions={["STORES.VIEW"]}>
              <DashboardLayout>
                <StoresPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute requiredPermissions={["EMPLOYEES.VIEW"]}>
              <DashboardLayout>
                <UsersPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Role and permission management */}
        <Route
          path="/roles"
          element={
            <ProtectedRoute requiredPermissions={["ROLES.VIEW", "ROLES.CREATE", "ROLES.UPDATE", "PERMISSIONS.VIEW", "PERMISSIONS.MANAGE"]}>
              <DashboardLayout>
                <RoleManagementPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default OwnerRoutes;