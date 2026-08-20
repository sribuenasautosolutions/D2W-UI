import { Routes, Route } from "react-router-dom";

import DashboardHome from "../pages/DashboardHome";
import ProductPage from "../pages/ProductPage";
import VehicleManagement from "../components/vehicles/VehicleManagement";
import InventoryPage from "../pages/InventoryPage";
import PurchasesPage from "../pages/PurchasesPage";
import OrdersPage from "../pages/OrdersPage";
import ReportsPage from "../pages/ReportsPage";
import StoresPage from "../pages/StoresPage";
import UsersPage from "../pages/UsersPage";
import ProductApprovalPage from "../pages/ProductApprovalPage";
import SalesPage from "../../sales/pages/SalesPage";
import NewSalePage from "../../sales/pages/NewSalePage";


import InvoicePage from "../../pos/pages/InvoicePage";

import DashboardLayout from "../layouts/DashboardLayout";

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
        path="/orders"
        element={
          <DashboardLayout>
            <OrdersPage />
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
        element={
          <DashboardLayout>
            <NewSalePage />
          </DashboardLayout>
        }
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
