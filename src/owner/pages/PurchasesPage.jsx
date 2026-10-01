import { useSearchParams } from "react-router-dom";
import D2WStockRequestSection from "../components/purchases/D2WStockRequestSection";
import VendorPurchasesSection from "../components/purchases/VendorPurchasesSection";
import VendorsSection from "../components/purchases/VendorsSection";
import VendorOrdersSection from "../components/purchases/VendorOrdersSection";

const PURCHASE_VIEWS = {
    vendors: {
        title: "Vendors",
        description: "Maintain the suppliers available to each store.",
        Component: VendorsSection,
    },
    bills: {
        title: "Bills",
        description: "Create vendor bills and receive accepted stock when a bill is saved as open.",
        Component: VendorPurchasesSection,
    },
    vendororders: {
        title: "Vendor Orders",
        description: "Track Lead requirements selected for vendor sourcing and export the daily order list.",
        Component: VendorOrdersSection,
    },
    requestd2w: {
        title: "D2W Stock Requests",
        description: "Request stock from a D2W warehouse and follow the request status.",
        Component: D2WStockRequestSection,
    },
};

export default function PurchasesPage() {
    const [searchParams] = useSearchParams();
    const requestedView = searchParams.get("view") || "vendors";
    // Keep old saved links working after renaming Vendor Purchases to Bills.
    const normalizedView = requestedView === "vendorpurchases" ? "bills" : requestedView;
    const activeView = PURCHASE_VIEWS[normalizedView] || PURCHASE_VIEWS.vendors;
    const ActiveComponent = activeView.Component;

    const isBillsView = normalizedView === "bills";

    return (
        <main style={isBillsView ? S.billsMain : undefined}>
            {!isBillsView && <header style={S.header}>
                <div>
                    <span style={S.eyebrow}>Purchases</span>
                    <h1 style={S.title}>{activeView.title}</h1>
                    <p style={S.description}>{activeView.description}</p>
                </div>
            </header>}
            <ActiveComponent />
        </main>
    );
}

const S = {
    billsMain: { minHeight: "calc(100vh - 28px)", margin: "-12px -16px -16px", background: "#FFFFFF" },
    header: { marginBottom: 16, display: "flex", alignItems: "end", justifyContent: "space-between" },
    eyebrow: { display: "block", marginBottom: 3, color: "#D97706", fontSize: 10, fontWeight: 800, letterSpacing: ".9px", textTransform: "uppercase" },
    title: { margin: 0, color: "#0F172A", fontSize: 24, fontWeight: 760, letterSpacing: "-.35px" },
    description: { margin: "4px 0 0", color: "#64748B", fontSize: 13 },
};
