import { useState } from "react";
import AddStockSection
from "../../owner/components/inventory/AddStockSection";
import CurrentStockSection
from "../../owner/components/inventory/CurrentStockSection";
import InventoryTransactionsSection
from "../components/inventory/InventoryTransactionSection";
import InventoryAdjustmentSection
from "../components/inventory/InventoryAdjustmentSection";
import BulkUploadSection
from "../components/inventory/BulkUploadSection";
import BatchReportSection
from "../../owner/components/inventory/BatchReportPage";



function InventoryPage() {

    const [activeTab,
        setActiveTab] =
            useState("stock");

    return (

        <div>

            <h1>
                Inventory Management
            </h1>

            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "20px",
                    marginBottom: "20px"
                }}
            >

                <button
                    onClick={() =>
                        setActiveTab("stock")
                    }
                >
                    Current Stock
                </button>

                <button
                    onClick={() =>
                        setActiveTab("addstock")
                    }
                >
                    Add Stock
                </button>
                <button
    onClick={() =>
        setActiveTab(
            "transactions"
        )
    }
>
    Transactions
</button>
<button
    onClick={() =>
        setActiveTab("adjustment")
    }
>
    Adjustment
</button>
<button
    onClick={() =>
        setActiveTab(
            "bulkupload"
        )
    }
>
    Bulk Upload
</button>
<button
    onClick={() =>
        setActiveTab("batchreport")
    }
>
    Batch Report
</button>

            </div>
{
    activeTab === "stock" &&
    <CurrentStockSection />
}

{
    activeTab === "addstock" &&
    <AddStockSection />
}

{
    activeTab === "transactions" &&
    <InventoryTransactionsSection />
}
{
    activeTab === "adjustment" &&
    <InventoryAdjustmentSection />
}
{
    activeTab === "bulkupload" &&
    <BulkUploadSection />
}
{
    activeTab === "batchreport" &&
    <BatchReportSection />
}

        </div>
    );
}

export default InventoryPage;