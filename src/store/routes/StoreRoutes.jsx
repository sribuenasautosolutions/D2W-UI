import { Routes, Route } from "react-router-dom";

import DashboardLayout from "../../owner/layouts/DashboardLayout";

import DashboardHome from "../../owner/pages/DashboardHome";
import InventoryPage from "../../owner/pages/InventoryPage";
import OrdersPage from "../../owner/pages/OrdersPage";

import StoreWiseReportPage from "../pages/StoreWiseReportPage";
import InventoryReportPage from "../pages/inventoryReportPage";
import SalesReportPage from "../pages/SalesReportPage";
import LowStockReportPage from "../pages/LowStockReportPage";
import CustomerReportPage from "../pages/CustomerReportPage";
import CustomerDetailsPage from "../pages/CustomerDetailsPage";

function StoreRoutes() {

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

    );
}

export default StoreRoutes;