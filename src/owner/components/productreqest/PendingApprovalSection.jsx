import { useEffect, useState } from "react";
import { getPendingApprovalRequests } from "../../../services/localProductService";
import VehicleStatCard from "../vehicles/VehicleStatCard";
import "./styles/vehicle-management.css";
import "./styles/product-approval.css";

function PendingApprovalSection({

    selectedApproval,
    setSelectedApproval,
    refreshSignal

}) {

    // ===== ORIGINAL STATE — unchanged =====
    const [pendingProducts, setPendingProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // ===== NEW UI-ONLY STATE (no API / business-logic impact) =====
    const [searchTerm, setSearchTerm] = useState("");

    // Loads on mount, and again whenever refreshSignal changes (bumped by
    // the parent after the workflow modal closes on Approve/Merge).
    useEffect(() => {

        loadPendingProducts();

    }, [refreshSignal]);

    useEffect(() => {

        console.log("Selected Approval Changed:", selectedApproval);

    }, [selectedApproval]);

    // ===== ORIGINAL HANDLER — unchanged =====
   const loadPendingProducts = async () => {
    const startTime = performance.now();

    try {
        setLoading(true);

        console.log("Pending approval API started");

        const response = await getPendingApprovalRequests();

        console.log(
            "Pending approval API time:",
            (performance.now() - startTime).toFixed(2),
            "ms"
        );

        console.log("Pending Products:", response);

        setPendingProducts(response);

        requestAnimationFrame(() => {
            console.log(
                "Pending products UI rendered:",
                (performance.now() - startTime).toFixed(2),
                "ms"
            );
        });

    } catch (error) {
        console.error("Error Loading Pending Products:", error);
    } finally {
        setLoading(false);

        console.log(
            "Pending products load finished:",
            (performance.now() - startTime).toFixed(2),
            "ms"
        );
    }
};

    // ===== UI-ONLY HELPERS =====
    const filteredProducts = pendingProducts.filter((product) =>
        (product.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.partNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.brand || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const statusTone = (status) => {
        const normalized = (status || "").toLowerCase();
        if (normalized.includes("approve")) return "green";
        if (normalized.includes("reject")) return "red";
        if (normalized.includes("pending")) return "amber";
        return "gray";
    };

    return (
        <div>

            <div className="vm-stats-row">
                <VehicleStatCard label="Total pending" value={pendingProducts.length} icon="📥" tone="blue" />
            </div>

            <div className="vm-action-bar">
                <div className="vm-search-wrap">
                    <span className="vm-search-icon">🔍</span>
                    <input
                        className="vm-search-input"
                        placeholder="Search pending products…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="vm-action-buttons">
                    <button className="vm-btn vm-btn-secondary" onClick={loadPendingProducts}>
                        ⟳ Refresh
                    </button>
                </div>
            </div>

            <div className="vm-panel">
                {loading ? (
                    <div className="vm-empty">
                        <div className="vm-empty-icon">⏳</div>
                        <div className="vm-empty-title">Loading pending approvals…</div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="vm-empty">
                        <div className="vm-empty-icon">📥</div>
                        <div className="vm-empty-title">No pending products found</div>
                        <div>
                            {pendingProducts.length === 0
                                ? "New submissions will show up here for review."
                                : "Try a different search term."}
                        </div>
                    </div>
                ) : (
                    <div className="vm-table-scroll">
                        <table className="vm-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Part Number</th>
                                    <th>Brand</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr
                                        key={product.approvalRequestId}
                                        className={
                                            selectedApproval?.approvalRequestId === product.approvalRequestId
                                                ? "is-selected"
                                                : ""
                                        }
                                    >
                                        <td className="vm-cell-strong">{product.productName}</td>
                                        <td className="vm-cell-mono">{product.partNumber}</td>
                                        <td>{product.brand}</td>
                                        <td>
                                            <span className={`vm-badge vm-badge-${statusTone(product.status)}`}>
                                                {product.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="vm-btn vm-btn-primary"
                                                onClick={() => {

                                                    console.log("Clicked Product:", product);

                                                    setSelectedApproval(product);

                                                }}
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="vm-table-footer">
                    <span>{filteredProducts.length} of {pendingProducts.length} products</span>
                </div>
            </div>

        </div>
    );

}

export default PendingApprovalSection;
