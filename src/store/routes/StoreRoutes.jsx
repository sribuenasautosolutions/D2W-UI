import { Routes, Route } from "react-router-dom";

import DashboardLayout from "../../owner/layouts/DashboardLayout";

import DashboardHome from "../../owner/pages/DashboardHome";
import InventoryPage from "../../owner/pages/InventoryPage";
import PurchasesPage from "../../owner/pages/PurchasesPage";
import OrdersPage from "../../owner/pages/OrdersPage";
import UsersPage from "../../owner/pages/UsersPage";

// FIX: reuse the existing, fully-built InvoicePage from the POS module.
// CartProvider wraps the whole app in main.jsx, so useCart() inside
// InvoicePage is safe to render here too — no new context needed.
import InvoicePage from "../../pos/pages/InvoicePage";

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
                path="/users"
                element={
                    <DashboardLayout>
                        <UsersPage />
                    </DashboardLayout>
                }
            />

            {/* FIX: was missing entirely — this is what made "/admin/invoice/:id"
                (a dead route) blank out instead of showing the invoice. */}
            <Route
                path="/orders/invoice/:orderId"
                element={
                    <DashboardLayout>
                        <InvoicePage />
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
