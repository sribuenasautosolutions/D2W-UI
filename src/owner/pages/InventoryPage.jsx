import { lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthState } from "../../auth/AuthContext";
import CurrentStockSection from "../components/inventory/CurrentStockSection";

const viewLoaders = {
    bulkstock:    () => import("../components/inventory/BulkUploadSection"),
    transactions: () => import("../components/inventory/InventoryTransactionSection"),
    adjustment:   () => import("../components/inventory/InventoryAdjustmentSection"),
    batchreport:  () => import("../components/inventory/BatchReportPage"),
    barcode:      () => import("../components/inventory/BarcodeGeneratePage"),
};

const BulkUploadSection            = lazy(viewLoaders.bulkstock);
const InventoryTransactionsSection = lazy(viewLoaders.transactions);
const InventoryAdjustmentSection   = lazy(viewLoaders.adjustment);
const BatchReportSection           = lazy(viewLoaders.batchreport);
const BarcodeGeneratePage          = lazy(viewLoaders.barcode);

const INVENTORY_VIEWS = {
    stock: {
        title: "Current Stock",
        description: "Review available inventory for the selected store.",
        Component: CurrentStockSection,
    },
    bulkstock: {
        title: "Opening & Bulk Stock",
        description: "Import opening inventory or perform an approved bulk stock entry.",
        Component: BulkUploadSection,
    },
    transactions: {
        title: "Inventory Transactions",
        description: "Review stock movements and inventory activity.",
        Component: InventoryTransactionsSection,
    },
    adjustment: {
        title: "Inventory Adjustments",
        description: "Record verified stock corrections with a reason.",
        Component: InventoryAdjustmentSection,
    },
    batchreport: {
        title: "Batch Report",
        description: "Inspect batch availability, pricing, and receipt details.",
        Component: BatchReportSection,
    },
    barcode: {
    title: "Barcodes",
    description: "Generate and print barcodes for store inventory.",
    Component: BarcodeGeneratePage,
},
};

function InventoryPage() {
    const { hasPermission, hasGlobalStoreManagementAuthority } = useAuthState();
    const isPlatformAdmin = hasGlobalStoreManagementAuthority?.();
    const canAdjust = isPlatformAdmin || hasPermission?.("INVENTORY.ADJUST");
    const canPrintBarcodes = isPlatformAdmin || hasPermission?.("BARCODES.PRINT");

    useEffect(() => {
        const prefetchViews = () => {
            Object.values(viewLoaders).forEach((load) => {
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
    const requestedView = searchParams.get("view") || "stock";

    let resolvedKey = requestedView;
    if ((requestedView === "adjustment" || requestedView === "bulkstock") && !canAdjust) {
        resolvedKey = "stock";
    } else if (requestedView === "barcode" && !canPrintBarcodes) {
        resolvedKey = "stock";
    }

    const activeView = INVENTORY_VIEWS[resolvedKey] || INVENTORY_VIEWS.stock;
    const ActiveComponent = activeView.Component;

    return (
        <main>
            <header style={{ marginBottom: "20px" }}>
                <h1
                    style={{
                        margin: 0,
                        color: "#0F172A",
                        fontSize: "24px",
                        fontWeight: 750,
                    }}
                >
                    {activeView.title}
                </h1>
                <p
                    style={{
                        margin: "5px 0 0",
                        color: "#64748B",
                        fontSize: "13px",
                    }}
                >
                    {activeView.description}
                </p>
            </header>

            <Suspense fallback={<div style={{ padding: "24px", color: "#64748b", fontSize: "14px" }}>Loading section…</div>}>
                <ActiveComponent />
            </Suspense>
        </main>
    );
}

export default InventoryPage;
