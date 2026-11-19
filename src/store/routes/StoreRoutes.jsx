import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../../owner/layouts/DashboardLayout";
import ProtectedRoute from "../../auth/ProtectedRoute";

const LeadDetails = lazy(
  () => import("../../owner/components/leads/LeadDetails")
);

const LeadOfferPage = lazy(
  () => import("../../sales/pages/LeadOfferPage")
);

const DashboardHome = lazy(
  () => import("../../owner/pages/DashboardHome")
);

const InventoryPage = lazy(
  () => import("../../owner/pages/InventoryPage")
);
const ProductManagePage = lazy(() => import("../../owner/components/inventory/ProductManagePage"));

const PurchasesPage = lazy(
  () => import("../../owner/pages/PurchasesPage")
);

const UsersPage = lazy(
  () => import("../../owner/pages/UsersPage")
);

const RoleManagementPage = lazy(
  () => import("../../owner/pages/RoleManagementPage")
);

const InvoicePage = lazy(
  () => import("../../pos/pages/InvoicePage")
);

const SalesPage = lazy(
  () => import("../../sales/pages/SalesPage")
);

const NewSalePage = lazy(
  () => import("../../sales/pages/NewSalePage")
);

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

const LeadCreate = lazy(
  () => import("../../owner/components/leads/LeadCreate")
);

const LeadList = lazy(
  () => import("../../owner/components/leads/LeadList")
);

const WhatsAppChats = lazy(() => import("../../owner/components/leads/WhatsAppChats"));

const WhatsAppConnect = lazy(() => import("../../owner/components/leads/WhatsAppConnect"));

const StoreWiseReportPage = lazy(
  () => import("../../store/pages/StoreWiseReportPage")
);

const InventoryReportPage = lazy(
  () => import("../../store/pages/inventoryReportPage")
);

const SalesReportPage = lazy(
  () => import("../../store/pages/SalesReportPage")
);

const LowStockReportPage = lazy(
  () => import("../../store/pages/LowStockReportPage")
);

const CustomerReportPage = lazy(
  () => import("../../store/pages/CustomerReportPage")
);

const CustomerDetailsPage = lazy(
  () => import("../../store/pages/CustomerDetailsPage")
);

function StoreRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route
          path="/sales/proforma/:id/lead"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER", "CASHIER"]} requiredPermissions={["PROFORMA.VIEW", "LEADS.VIEW"]}>
              <DashboardLayout>
                <LeadOfferPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/:id"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["LEADS.VIEW"]}>
              <DashboardLayout>
                <LeadDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["DASHBOARD.VIEW"]}>
              <DashboardLayout>
                <DashboardHome />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["INVENTORY.VIEW"]}>
              <DashboardLayout>
                <InventoryPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory/products/:inventoryId/manage"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["INVENTORY.VIEW"]}>
              <ProductManagePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchases"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["PURCHASE_ORDERS.VIEW", "VENDORS.VIEW"]}>
              <DashboardLayout>
                <PurchasesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER", "CASHIER"]} requiredPermissions={["SALES.VIEW"]}>
              <DashboardLayout>
                <SalesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["LEADS.VIEW"]}>
              <DashboardLayout>
                <Suspense fallback={<div className="ref-kanban-empty-wrap" style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}><strong>Loading leads module...</strong></div>}>
                  <LeadList />
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/chats"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["LEADS.VIEW", "WHATSAPP.VIEW"]}>
              <DashboardLayout>
                <WhatsAppChats />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/whatsapp"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["LEADS.VIEW", "WHATSAPP.VIEW"]}>
              <DashboardLayout>
                <WhatsAppConnect />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/new"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["LEADS.CREATE"]}>
              <DashboardLayout>
                <LeadCreate />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/edit/:orderId"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER", "CASHIER"]} requiredPermissions={["SALES.CREATE", "SALES.VIEW"]}>
              <NewSalePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/new"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER", "CASHIER"]} requiredPermissions={["SALES.CREATE"]}>
              <NewSalePage />
            </ProtectedRoute>
          }
        />
        <Route path="/sales/import-items" element={<SaleBulkUploadPage />} />

        <Route
          path="/sales/proforma"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER", "CASHIER"]} requiredPermissions={["PROFORMA.VIEW"]}>
              <DashboardLayout>
                <ProformaListPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/proforma/new"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER", "CASHIER"]} requiredPermissions={["PROFORMA.CREATE"]}>
              <NewSalePage documentMode="PROFORMA" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/proforma/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER", "CASHIER"]} requiredPermissions={["PROFORMA.CREATE"]}>
              <NewSalePage documentMode="PROFORMA" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/proforma/:id"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER", "CASHIER"]} requiredPermissions={["PROFORMA.VIEW"]}>
              <ProformaViewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/invoice/:orderId"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER", "CASHIER"]} requiredPermissions={["SALES.VIEW"]}>
              <InvoicePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/payment/:orderId"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER", "CASHIER"]} requiredPermissions={["SALES.PAYMENT", "SALES.VIEW"]}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["EMPLOYEES.VIEW"]}>
              <DashboardLayout>
                <UsersPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Reports */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["REPORTS.VIEW"]}>
              <DashboardLayout>
                <StoreWiseReportPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/inventory"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["REPORTS.VIEW", "INVENTORY.VIEW"]}>
              <DashboardLayout>
                <InventoryReportPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/sales"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["REPORTS.VIEW", "SALES.VIEW"]}>
              <DashboardLayout>
                <SalesReportPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/low-stock"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["REPORTS.VIEW", "INVENTORY.VIEW"]}>
              <DashboardLayout>
                <LowStockReportPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/customers"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["REPORTS.VIEW", "CUSTOMERS.VIEW"]}>
              <DashboardLayout>
                <CustomerReportPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/roles"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["ROLES.VIEW", "PERMISSIONS.VIEW"]}>
              <DashboardLayout>
                <RoleManagementPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/customers/:id"
          element={
            <ProtectedRoute allowedRoles={["STORE_OWNER"]} requiredPermissions={["REPORTS.VIEW", "CUSTOMERS.VIEW"]}>
              <DashboardLayout>
                <CustomerDetailsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default StoreRoutes;
