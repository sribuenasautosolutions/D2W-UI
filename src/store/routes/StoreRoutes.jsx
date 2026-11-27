import { lazy, Suspense } from "react";
import { Routes, Route, Outlet } from "react-router-dom";
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

function DashboardShell() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div style={{ padding: "24px", color: "#64748b", fontSize: "14px" }}>Loading page…</div>}>
        <Outlet />
      </Suspense>
    </DashboardLayout>
  );
}

function StoreRoutes() {
  return (
    <Routes>
      <Route element={<DashboardShell />}>
        <Route
          path="/sales/proforma/:id/lead"
          element={
            <ProtectedRoute requiredPermissions={["PROFORMA.VIEW", "LEADS.VIEW"]}>
              <LeadOfferPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/:id"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.VIEW"]}>
              <LeadDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredPermissions={["DASHBOARD.VIEW"]}>
              <DashboardHome />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute requiredPermissions={["INVENTORY.VIEW", "INVENTORY.ADJUST", "INVENTORY.TRANSFER", "BARCODES.PRINT"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchases"
          element={
            <ProtectedRoute requiredPermissions={["PURCHASE_ORDERS.VIEW", "PURCHASE_ORDERS.CREATE", "VENDORS.VIEW", "VENDORS.MANAGE"]}>
              <PurchasesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <ProtectedRoute requiredPermissions={["SALES.VIEW"]}>
              <SalesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.VIEW"]}>
              <LeadList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/chats"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.VIEW", "WHATSAPP.VIEW"]}>
              <WhatsAppChats />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/whatsapp"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.VIEW", "WHATSAPP.VIEW"]}>
              <WhatsAppConnect />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/new"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.CREATE"]}>
              <LeadCreate />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/proforma"
          element={
            <ProtectedRoute requiredPermissions={["PROFORMA.VIEW"]}>
              <ProformaListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute requiredPermissions={["EMPLOYEES.VIEW"]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        {/* Reports */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredPermissions={["REPORTS.VIEW"]}>
              <StoreWiseReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/inventory"
          element={
            <ProtectedRoute requiredPermissions={["REPORTS.VIEW", "INVENTORY.VIEW"]}>
              <InventoryReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/sales"
          element={
            <ProtectedRoute requiredPermissions={["REPORTS.VIEW", "SALES.VIEW"]}>
              <SalesReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/low-stock"
          element={
            <ProtectedRoute requiredPermissions={["REPORTS.VIEW", "INVENTORY.VIEW"]}>
              <LowStockReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/customers"
          element={
            <ProtectedRoute requiredPermissions={["REPORTS.VIEW", "CUSTOMERS.VIEW"]}>
              <CustomerReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/roles"
          element={
            <ProtectedRoute requiredPermissions={["ROLES.VIEW", "ROLES.CREATE", "ROLES.UPDATE", "ROLES.ASSIGN", "PERMISSIONS.VIEW"]}>
              <RoleManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/customers/:id"
          element={
            <ProtectedRoute requiredPermissions={["REPORTS.VIEW", "CUSTOMERS.VIEW"]}>
              <CustomerDetailsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/inventory/products/:inventoryId/manage"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <ProtectedRoute requiredPermissions={["INVENTORY.VIEW"]}>
              <ProductManagePage />
            </ProtectedRoute>
          </Suspense>
        }
      />

      <Route
        path="/sales/edit/:orderId"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <ProtectedRoute requiredPermissions={["SALES.CREATE", "SALES.VIEW"]}>
              <NewSalePage />
            </ProtectedRoute>
          </Suspense>
        }
      />

      <Route
        path="/sales/new"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <ProtectedRoute requiredPermissions={["SALES.CREATE"]}>
              <NewSalePage />
            </ProtectedRoute>
          </Suspense>
        }
      />

      <Route
        path="/sales/import-items"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <SaleBulkUploadPage />
          </Suspense>
        }
      />

      <Route
        path="/sales/proforma/new"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <ProtectedRoute requiredPermissions={["PROFORMA.CREATE"]}>
              <NewSalePage documentMode="PROFORMA" />
            </ProtectedRoute>
          </Suspense>
        }
      />

      <Route
        path="/sales/proforma/:id/edit"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <ProtectedRoute requiredPermissions={["PROFORMA.CREATE"]}>
              <NewSalePage documentMode="PROFORMA" />
            </ProtectedRoute>
          </Suspense>
        }
      />

      <Route
        path="/sales/proforma/:id"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <ProtectedRoute requiredPermissions={["PROFORMA.VIEW"]}>
              <ProformaViewPage />
            </ProtectedRoute>
          </Suspense>
        }
      />

      <Route
        path="/sales/invoice/:orderId"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <ProtectedRoute requiredPermissions={["SALES.VIEW"]}>
              <InvoicePage />
            </ProtectedRoute>
          </Suspense>
        }
      />

      <Route
        path="/sales/payment/:orderId"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <ProtectedRoute requiredPermissions={["SALES.PAYMENT", "SALES.VIEW"]}>
              <PaymentPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
    </Routes>
  );
}

export default StoreRoutes;