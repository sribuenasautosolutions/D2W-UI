import { Routes, Route } from "react-router-dom";

import DashboardHome from "../pages/DashboardHome";
import ProductPage from "../pages/ProductPage";
import VehiclesPage from "../pages/VehiclePage";
import InventoryPage from "../pages/InventoryPage";
import OrdersPage from "../pages/OrdersPage";
import ReportsPage from "../pages/ReportsPage";
import StoresPage from "../pages/StoresPage";
import UsersPage from "../pages/UsersPage";

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
        path="/vehicles"
        element={
          <DashboardLayout>
            <VehiclesPage />
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
        path="/orders"
        element={
          <DashboardLayout>
            <OrdersPage />
          </DashboardLayout>
        }
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