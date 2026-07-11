import {
    Routes,
    Route
}
from "react-router-dom";

import AdminLayout
from "../../layouts/AdminLayout";

import DashboardPage
from "../pages/Admin/DashboardPage";

import VehiclesPage
from "../pages/Admin/VehiclesPage";

import ProductAdminPage
from "../pages/Admin/ProductAdminPage";

import FitmentsPage
from "../../pages/FitmentsPage";

import InventoryPage
from "../pages/Admin/InventoryPage";

function AdminRoutes() {

    return (

        <Routes>

            <Route
                path="/admin"
                element={<AdminLayout />}
            >

                <Route
                    index
                    element={<DashboardPage />}
                />

                <Route
                    path="vehicles"
                    element={<VehiclesPage />}
                />

                <Route
                    path="products"
                    element={<ProductAdminPage />}
                />

                <Route
                    path="fitments"
                    element={<FitmentsPage />}
                />

                <Route
                    path="inventory"
                    element={<InventoryPage />}
                />

            </Route>

        </Routes>
    );
}

export default AdminRoutes;