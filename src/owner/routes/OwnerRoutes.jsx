
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
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["PROFORMA.VIEW", "LEADS.VIEW"]}>
              <DashboardLayout>
                <LeadOfferPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        path="/sales/new"

        element={<NewSalePage />}

      />
     <Route path="/sales/import-items" element={<SaleBulkUploadPage />} />

      <Route path="/sales/proforma" element={<DashboardLayout><ProformaListPage /></DashboardLayout>} />

      <Route path="/sales/proforma/new" element={<NewSalePage documentMode="PROFORMA" />} />

      <Route path="/sales/proforma/:id/edit" element={<NewSalePage documentMode="PROFORMA" />} />

      <Route path="/sales/proforma/:id" element={<ProformaViewPage />} />

<Route
    path="/sales/leads"
    element={
        <DashboardLayout>
            <Suspense fallback={<div className="ref-kanban-empty-wrap" style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}><strong>Loading leads module...</strong></div>}>
                <LeadList />
            </Suspense>
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
          path="/products"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["CATALOGUE.VIEW"]}>
              <DashboardLayout>
                <ProductPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/product-approval"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["LOCAL_PRODUCTS.APPROVE"]}>
              <DashboardLayout>
                <ProductApprovalPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="inventory/products/:inventoryId/manage"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["INVENTORY.VIEW"]}>
              <ProductManagePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vehicles"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["VEHICLES.VIEW"]}>
              <DashboardLayout>
                <VehicleManagement />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["INVENTORY.VIEW"]}>
              <DashboardLayout>
                <InventoryPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchases"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["PURCHASE_ORDERS.VIEW", "VENDORS.VIEW"]}>
              <DashboardLayout>
                <PurchasesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["SALES.VIEW"]}>
              <DashboardLayout>
                <SalesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/edit/:orderId"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["SALES.CREATE", "SALES.VIEW"]}>
              <NewSalePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/new"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["SALES.CREATE"]}>
              <NewSalePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/import-items"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["SALES.CREATE"]}>
              <SaleBulkUploadPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/proforma"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["PROFORMA.VIEW"]}>
              <DashboardLayout>
                <ProformaListPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/proforma/new"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["PROFORMA.CREATE"]}>
              <NewSalePage documentMode="PROFORMA" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/proforma/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["PROFORMA.CREATE"]}>
              <NewSalePage documentMode="PROFORMA" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/proforma/:id"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["PROFORMA.VIEW"]}>
              <ProformaViewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["LEADS.VIEW"]}>
              <DashboardLayout>
                <LeadList />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/:id"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["LEADS.VIEW"]}>
              <DashboardLayout>
                <LeadDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/chats"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["LEADS.VIEW", "WHATSAPP.VIEW"]}>
              <DashboardLayout>
                <WhatsAppChats />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/whatsapp"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["LEADS.VIEW", "WHATSAPP.VIEW"]}>
              <DashboardLayout>
                <WhatsAppConnect />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/leads/new"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["LEADS.CREATE"]}>
              <DashboardLayout>
                <LeadCreate />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/payment/:orderId"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["SALES.PAYMENT", "SALES.VIEW"]}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/invoice/:orderId"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["SALES.VIEW"]}>
              <InvoicePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["REPORTS.VIEW"]}>
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
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["EMPLOYEES.VIEW"]}>
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
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} requiredPermissions={["ROLES.VIEW", "PERMISSIONS.VIEW"]}>
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
