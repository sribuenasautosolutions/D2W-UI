import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

import DashboardLayout from "../layouts/DashboardLayout";

const LeadOfferPage = lazy(
  () => import("../features/operations/sales/LeadOfferPage"),
);

const DashboardHome = lazy(() => import("../features/dashboard/DashboardHome"));

const ProductPage = lazy(
  () => import("../features/catalog/products/ProductPage"),
);

const VehicleManagement = lazy(
  () => import("../features/catalog/vehicles/VehicleManagement"),
);

const InventoryPage = lazy(
  () => import("../features/operations/inventory/InventoryPage"),
);

const PurchasesPage = lazy(
  () => import("../features/operations/purchases/PurchasesPage"),
);

const ReportsPage = lazy(
  () => import("../features/organization/reports/ReportsPage"),
);

const StoresPage = lazy(
  () => import("../features/organization/stores/StoresPage"),
);

const UsersPage = lazy(
  () => import("../features/organization/users/UsersPage"),
);

const ProductApprovalPage = lazy(
  () => import("../features/catalog/products/ProductApprovalPage"),
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

const ProductManagePage = lazy(
  () => import("../features/operations/inventory/ProductManagePage"),
);

const LeadCreate = lazy(
  () => import("../features/operations/sales/leads/LeadCreate"),
);

const LeadList = lazy(
  () => import("../features/operations/sales/leads/LeadList"),
);

const InvoicePage = lazy(
  () => import("../features/operations/sales/pos/InvoicePage"),
);

const LeadDetails = lazy(
  () => import("../features/operations/sales/leads/LeadDetails"),
);

function OwnerRoutes() {
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
          path="/dashboard"

          element={
            <DashboardLayout>
              <DashboardHome />
            </DashboardLayout>
          }
        />

        <Route
          path="/products"

          element={
            <DashboardLayout>
              <ProductPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/product-approval"

          element={
            <DashboardLayout>
              <ProductApprovalPage />
            </DashboardLayout>
          }
        />
        <Route
          path="inventory/products/:inventoryId/manage"
          element={<ProductManagePage />}
        />

        <Route
          path="/vehicles"

          element={
            <DashboardLayout>
              <VehicleManagement />
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
          path="/sales/new"

          element={<NewSalePage />}
        />

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

        <Route
          path="/sales/leads"

          element={
            <DashboardLayout>
              <LeadList />
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
          path="/sales/leads/new"

          element={
            <DashboardLayout>
              <LeadCreate />
            </DashboardLayout>
          }
        />

        <Route
          path="/sales/payment/:orderId"

          element={<PaymentPage />}
        />

        <Route
          path="/sales/invoice/:orderId"

          element={<InvoicePage />}
        />

        <Route
          path="/reports"

          element={
            <DashboardLayout>
              <ReportsPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/stores"

          element={
            <DashboardLayout>
              <StoresPage />
            </DashboardLayout>
          }
        />

        <Route
          path="/users"

          element={
            <DashboardLayout>
              <UsersPage />
            </DashboardLayout>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default OwnerRoutes;
