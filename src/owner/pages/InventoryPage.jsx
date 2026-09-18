import { useSearchParams } from "react-router-dom";
import BatchReportSection from "../components/inventory/BatchReportPage";
import BulkUploadSection from "../components/inventory/BulkUploadSection";
import CurrentStockSection from "../components/inventory/CurrentStockSection";
import InventoryAdjustmentSection from "../components/inventory/InventoryAdjustmentSection";
import InventoryTransactionsSection from "../components/inventory/InventoryTransactionSection";
import BarcodeGeneratePage from "../components/inventory/BarcodeGeneratePage";

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
    const [searchParams] = useSearchParams();
    const requestedView = searchParams.get("view") || "stock";
    const activeView = INVENTORY_VIEWS[requestedView] || INVENTORY_VIEWS.stock;
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

            <ActiveComponent />
        </main>
    );
}

export default InventoryPage;
