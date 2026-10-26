import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../../owner/layouts/DashboardLayout";

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

const InvoicePage = lazy(
  () => import("../../pos/pages/InvoicePage")
);

const SalesPage = lazy(
  () => import("../../sales/pages/SalesPage")
);

const NewSalePage = lazy(
  () => import("../../sales/pages/NewSalePage")
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

        <Route path="/sales/leads/chats" element={<DashboardLayout><WhatsAppChats /></DashboardLayout>} />

        <Route path="/sales/leads/whatsapp" element={<DashboardLayout><WhatsAppConnect /></DashboardLayout>} />

<Route
          path="/sales/leads/new"
          element={
            <DashboardLayout>
              <LeadCreate />
            </DashboardLayout>
          }
        />

        <Route path="/sales/edit/:orderId" element={<NewSalePage />} />
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
          element={
            <NewSalePage documentMode="PROFORMA" />
          }
        />

        <Route
          path="/sales/proforma/:id/edit"
          element={
            <NewSalePage documentMode="PROFORMA" />
          }
        />

        <Route
          path="/sales/proforma/:id"
          element={<ProformaViewPage />}
        />

        <Route
          path="/sales/invoice/:orderId"
          element={<InvoicePage />}
        />

        <Route
          path="/sales/payment/:orderId"
          element={<PaymentPage />}
        />

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
