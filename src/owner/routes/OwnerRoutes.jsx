import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

import DashboardLayout from "../layouts/DashboardLayout";

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

const InvoicePage = lazy(
  () => import("../../pos/pages/InvoicePage")
);

const LeadDetails = lazy(
  () => import("../components/leads/LeadDetails")
);



function OwnerRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>

        <Route path="/sales/proforma/:id/lead" element={<DashboardLayout><LeadOfferPage /></DashboardLayout>} />



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

      <Route path="/sales/proforma" element={<DashboardLayout><ProformaListPage /></DashboardLayout>} />

      <Route path="/sales/proforma/new" element={<NewSalePage documentMode="PROFORMA" />} />

      <Route path="/sales/proforma/:id/edit" element={<NewSalePage documentMode="PROFORMA" />} />

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