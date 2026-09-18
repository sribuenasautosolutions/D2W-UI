import LeadDetails from "../../owner/components/leads/LeadDetails";
import LeadOfferPage from "../../sales/pages/LeadOfferPage";
import { Routes, Route } from "react-router-dom";

import DashboardLayout from "../../owner/layouts/DashboardLayout";

import DashboardHome from "../../owner/pages/DashboardHome";
import InventoryPage from "../../owner/pages/InventoryPage";
import PurchasesPage from "../../owner/pages/PurchasesPage";
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
import SalesPage from "../../sales/pages/SalesPage";
import NewSalePage from "../../sales/pages/NewSalePage";
import ProformaListPage from "../../sales/pages/ProformaListPage";
import ProformaViewPage from "../../sales/pages/ProformaViewPage";
import PaymentPage from "../../pos/pages/PaymentPageor";
import LeadCreate from "../../owner/components/leads/LeadCreate";
import LeadList from "../../owner/components/leads/LeadList";

function StoreRoutes() {

    return (

        <Routes>
<Route path="/sales/proforma/:id/lead" element={<DashboardLayout><LeadOfferPage /></DashboardLayout>} />
<Route path="/sales/leads/:id" element={<DashboardLayout><LeadDetails /></DashboardLayout>} />

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

<Route
    path="/sales/leads/new"
    element={
        <DashboardLayout>
            <LeadCreate />
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
