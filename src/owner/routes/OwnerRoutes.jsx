import { Routes, Route, Outlet } from "react-router-dom";
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

function OwnerRoutes() {
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
          path="/dashboard"
          element={
            <ProtectedRoute requiredPermissions={["DASHBOARD.VIEW", "STORES.UPDATE"]}>
              <DashboardHome />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute requiredPermissions={["CATALOGUE.VIEW", "CATALOGUE.CREATE", "CATALOGUE.UPDATE"]}>
              <ProductPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/product-approval"
          element={
            <ProtectedRoute requiredPermissions={["LOCAL_PRODUCTS.APPROVE"]}>
              <ProductApprovalPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vehicles"
          element={
            <ProtectedRoute requiredPermissions={["VEHICLES.VIEW", "VEHICLES.MANAGE"]}>
              <VehicleManagement />
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
          path="/sales/proforma"
          element={
            <ProtectedRoute requiredPermissions={["PROFORMA.VIEW"]}>
              <ProformaListPage />
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
          path="/sales/leads/:id"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.VIEW"]}>
              <LeadDetails />
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
          path="/reports"
          element={
            <ProtectedRoute requiredPermissions={["REPORTS.VIEW"]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/store-wise"
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
          path="/reports/customers/:id"
          element={
            <ProtectedRoute requiredPermissions={["REPORTS.VIEW", "CUSTOMERS.VIEW"]}>
              <CustomerDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stores"
          element={
            <ProtectedRoute requiredPermissions={["STORES.VIEW"]}>
              <StoresPage />
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

        {/* Role and permission management */}
        <Route
          path="/roles"
          element={
            <ProtectedRoute requiredPermissions={["ROLES.VIEW", "ROLES.CREATE", "ROLES.UPDATE", "PERMISSIONS.VIEW", "PERMISSIONS.MANAGE"]}>
              <RoleManagementPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="inventory/products/:inventoryId/manage"
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
            <ProtectedRoute requiredPermissions={["SALES.CREATE"]}>
              <SaleBulkUploadPage />
            </ProtectedRoute>
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
        path="/sales/payment/:orderId"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <ProtectedRoute requiredPermissions={["SALES.PAYMENT", "SALES.VIEW"]}>
              <PaymentPage />
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
    </Routes>
  );
}

export default OwnerRoutes;