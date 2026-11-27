import { lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthState } from "../../auth/AuthContext";
import VendorsSection from "../components/purchases/VendorsSection";

const purchaseLoaders = {
    bills:        () => import("../components/purchases/VendorPurchasesSection"),
    vendororders: () => import("../components/purchases/VendorOrdersSection"),
    requestd2w:   () => import("../components/purchases/D2WStockRequestSection"),
};

const VendorPurchasesSection = lazy(purchaseLoaders.bills);
const VendorOrdersSection    = lazy(purchaseLoaders.vendororders);
const D2WStockRequestSection = lazy(purchaseLoaders.requestd2w);

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
    const { hasAnyPermission, hasGlobalStoreManagementAuthority } = useAuthState();
    const isOwner = Boolean(hasGlobalStoreManagementAuthority?.());
    const canViewVendors = isOwner || hasAnyPermission?.(["VENDORS.VIEW", "VENDORS.MANAGE"]);
    const canViewOrders = isOwner || hasAnyPermission?.(["PURCHASE_ORDERS.VIEW", "PURCHASE_ORDERS.CREATE"]);

    useEffect(() => {
        const prefetchViews = () => {
            Object.values(purchaseLoaders).forEach((load) => {
                load().catch(() => {});
            });
        };
        if ("requestIdleCallback" in window) {
            const id = window.requestIdleCallback(prefetchViews, { timeout: 1500 });
            return () => window.cancelIdleCallback(id);
        }
        const timer = window.setTimeout(prefetchViews, 800);
        return () => window.clearTimeout(timer);
    }, []);

    const [searchParams] = useSearchParams();
    const requestedView = searchParams.get("view") || "vendors";
    // Keep old saved links working after renaming Vendor Purchases to Bills.
    let normalizedView = requestedView === "vendorpurchases" ? "bills" : requestedView;

    if (normalizedView === "vendors" && !canViewVendors && canViewOrders) {
        normalizedView = "bills";
    } else if (normalizedView !== "vendors" && !canViewOrders && canViewVendors) {
        normalizedView = "vendors";
    }

    const activeView = PURCHASE_VIEWS[normalizedView] || (canViewVendors ? PURCHASE_VIEWS.vendors : PURCHASE_VIEWS.bills);
    const ActiveComponent = activeView.Component;

    const isBillsView = normalizedView === "bills";

    // Vendor Orders renders its own header row (title + filters side by side)
    // so this page does not add the standard eyebrow / title / description block.
    const sectionRendersOwnHeader = normalizedView === "vendororders";

    return (
        <main style={isBillsView ? S.billsMain : undefined}>
            {!isBillsView && !sectionRendersOwnHeader && (
                <header style={S.header}>
                    <div>
                        <span style={S.eyebrow}>Purchases</span>
                        <h1 style={S.title}>{activeView.title}</h1>
                        <p style={S.description}>{activeView.description}</p>
                    </div>
                </header>
            )}
            <Suspense fallback={<div style={{ padding: "24px", color: "#64748b", fontSize: "14px" }}>Loading section…</div>}>
                <ActiveComponent />
            </Suspense>
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