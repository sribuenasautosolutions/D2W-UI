import { Routes, Route } from "react-router-dom";

import DashboardHome from "../pages/DashboardHome";
import ProductPage from "../pages/ProductPage";
import VehicleManagement from "../components/vehicles/VehicleManagement";
import InventoryPage from "../pages/InventoryPage";
import PurchasesPage from "../pages/PurchasesPage";
import ReportsPage from "../pages/ReportsPage";
import StoresPage from "../pages/StoresPage";
import UsersPage from "../pages/UsersPage";
import ProductApprovalPage from "../pages/ProductApprovalPage";
import SalesPage from "../../sales/pages/SalesPage";
import NewSalePage from "../../sales/pages/NewSalePage";
import ProformaListPage from "../../sales/pages/ProformaListPage";
import ProformaViewPage from "../../sales/pages/ProformaViewPage";
import PaymentPage from "../../pos/pages/PaymentPageor";

import LeadCreate from "../components/leads/LeadCreate";
import LeadList from "../components/leads/LeadList";



import InvoicePage from "../../pos/pages/InvoicePage";

import DashboardLayout from "../layouts/DashboardLayout";
import LeadDetails from "../components/leads/LeadDetails";

function OwnerRoutes() {
  return (
    <Routes>

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
  );
}

export default OwnerRoutes;
