import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

const LeadDetails = lazy(
  () => import("../features/operations/sales/leads/LeadDetails"),
);

const LeadOfferPage = lazy(
  () => import("../features/operations/sales/LeadOfferPage"),
);

const DashboardHome = lazy(() => import("../features/dashboard/DashboardHome"));

const InventoryPage = lazy(
  () => import("../features/operations/inventory/InventoryPage"),
);
const ProductManagePage = lazy(
  () => import("../features/operations/inventory/ProductManagePage"),
);

const PurchasesPage = lazy(
  () => import("../features/operations/purchases/PurchasesPage"),
);

const UsersPage = lazy(
  () => import("../features/organization/users/UsersPage"),
);

const InvoicePage = lazy(
  () => import("../features/operations/sales/pos/InvoicePage"),
);

const SalesPage = lazy(() => import("../features/operations/sales/SalesPage"));

const NewSalePage = lazy(
  () => import("../features/operations/sales/NewSalePage"),
);

const ProformaListPage = lazy(
  () => import("../features/operations/sales/ProformaListPage"),
);

const ProformaViewPage = lazy(
  () => import("../features/operations/sales/ProformaViewPage"),
);

const PaymentPage = lazy(
  () => import("../features/operations/sales/pos/PaymentPageor"),
);

const LeadCreate = lazy(
  () => import("../features/operations/sales/leads/LeadCreate"),
);

const LeadList = lazy(
  () => import("../features/operations/sales/leads/LeadList"),
);

const StoreWiseReportPage = lazy(
  () => import("../features/organization/reports/StoreWiseReportPage"),
);

const InventoryReportPage = lazy(
  () => import("../features/organization/reports/inventoryReportPage"),
);

const SalesReportPage = lazy(
  () => import("../features/organization/reports/SalesReportPage"),
);

const LowStockReportPage = lazy(
  () => import("../features/organization/reports/LowStockReportPage"),
);

const CustomerReportPage = lazy(
  () => import("../features/organization/reports/CustomerReportPage"),
);

const CustomerDetailsPage = lazy(
  () => import("../features/organization/reports/CustomerDetailsPage"),
);

function StoreRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route
          path="/sales/proforma/:id/lead"
          element={
            <DashboardLayout>
              <LeadOfferPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/sales/leads/:id"
          element={
            <DashboardLayout>
              <LeadDetails />
            </DashboardLayout>
          }
        />

        <Route
          path="/dashboard"
          element={
            <DashboardLayout>
              <DashboardHome />
            </DashboardLayout>
          }
        />

        <Route
          path="/inventory"
          element={
            <DashboardLayout>
              <InventoryPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/inventory/products/:inventoryId/manage"
          element={<ProductManagePage />}
        />
        <Route
          path="/purchases"
          element={
            <DashboardLayout>
              <PurchasesPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/sales"
          element={
            <DashboardLayout>
              <SalesPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/sales/leads"
          element={
            <DashboardLayout>
              <LeadList />
            </DashboardLayout>
          }
        />

        <Route
          path="/sales/leads/new"
          element={
            <DashboardLayout>
              <LeadCreate />
            </DashboardLayout>
          }
        />

        <Route path="/sales/new" element={<NewSalePage />} />

        <Route
          path="/sales/proforma"
          element={
            <DashboardLayout>
              <ProformaListPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/sales/proforma/new"
          element={<NewSalePage documentMode="PROFORMA" />}
        />

        <Route
          path="/sales/proforma/:id/edit"
          element={<NewSalePage documentMode="PROFORMA" />}
        />

        <Route path="/sales/proforma/:id" element={<ProformaViewPage />} />

        <Route path="/sales/invoice/:orderId" element={<InvoicePage />} />

        <Route path="/sales/payment/:orderId" element={<PaymentPage />} />

        <Route
          path="/users"
          element={
            <DashboardLayout>
              <UsersPage />
            </DashboardLayout>
          }
        />

        {/* Reports */}

        <Route
          path="/reports"
          element={
            <DashboardLayout>
              <StoreWiseReportPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/reports/inventory"
          element={
            <DashboardLayout>
              <InventoryReportPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/reports/sales"
          element={
            <DashboardLayout>
              <SalesReportPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/reports/low-stock"
          element={
            <DashboardLayout>
              <LowStockReportPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/reports/customers"
          element={
            <DashboardLayout>
              <CustomerReportPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/reports/customers/:id"
          element={
            <DashboardLayout>
              <CustomerDetailsPage />
            </DashboardLayout>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default StoreRoutes;
