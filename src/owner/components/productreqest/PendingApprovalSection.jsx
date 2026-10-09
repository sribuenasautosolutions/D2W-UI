import { useEffect, useState } from "react";
import { getPendingApprovalRequests } from "../../../services/localProductService";
import "./styles/vehicle-management.css";
import "./styles/product-approval.css";

function PendingApprovalSection({
    selectedApproval,
    setSelectedApproval,
    refreshSignal,
    query = "",
}) {
    const [pendingProducts, setPendingProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPendingProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshSignal]);

    const loadPendingProducts = async () => {
        try {
            setLoading(true);
            const response = await getPendingApprovalRequests();
            setPendingProducts(response);
        } catch (error) {
            console.error("Error loading pending products:", error);
        } finally {
            setLoading(false);
        }
    };

    /* Filter using the parent's navbar search */
    const filteredProducts = pendingProducts.filter((product) => {
        const q = String(query || "").trim().toLowerCase();
        if (!q) return true;
        return (
            (product.productName || "").toLowerCase().includes(q) ||
            (product.partNumber || "").toLowerCase().includes(q) ||
            (product.brand || "").toLowerCase().includes(q)
        );
    });

    const statusTone = (status) => {
        const normalized = (status || "").toLowerCase();
        if (normalized.includes("approve")) return "green";
        if (normalized.includes("reject"))  return "red";
        if (normalized.includes("pending")) return "amber";
        return "gray";
    };

    return (
        <div className="pa-pending">
            {/* KPI — single card */}
            <div className="pa-kpi-grid">
                <div className="pa-kpi-card">
                    <span className="pa-kpi-icon" aria-hidden="true">📥</span>
                    <div className="pa-kpi-content">
                        <span className="pa-kpi-label">Total Pending</span>
                        <strong className="pa-kpi-value">
                            {pendingProducts.length}
                        </strong>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="pa-panel">
                {loading ? (
                    <div className="pa-empty">
                        <div className="pa-empty-icon">⏳</div>
                        <div className="pa-empty-title">
                            Loading pending approvals…
                        </div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="pa-empty">
                        <div className="pa-empty-icon">📥</div>
                        <div className="pa-empty-title">
                            No pending products found
                        </div>
                        <div>
                            {pendingProducts.length === 0
                                ? "New submissions will show up here for review."
                                : "Try a different search term."}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="pa-table-scroll">
                            <table className="pa-table">
                                <colgroup>
                                    <col style={{ width: "30%" }} />
                                    <col style={{ width: "18%" }} />
                                    <col style={{ width: "18%" }} />
                                    <col style={{ width: "18%" }} />
                                    <col style={{ width: "16%" }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th className="pa-th">Product</th>
                                        <th className="pa-th">Part Number</th>
                                        <th className="pa-th">Brand</th>
                                        <th className="pa-th">Status</th>
                                        <th className="pa-th">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product) => (
                                        <tr
                                            key={product.approvalRequestId}
                                            className={
                                                "pa-tr" +
                                                (selectedApproval?.approvalRequestId === product.approvalRequestId
                                                    ? " is-selected"
                                                    : "")
                                            }
                                        >
                                            <td className="pa-td-strong">
                                                {product.productName}
                                            </td>
                                            <td className="pa-td-mono">
                                                {product.partNumber}
                                            </td>
                                            <td className="pa-td">
                                                {product.brand}
                                            </td>
                                            <td className="pa-td">
                                                <span
                                                    className={`pa-badge pa-badge--${statusTone(product.status)}`}
                                                >
                                                    {product.status}
                                                </span>
                                            </td>
                                            <td className="pa-td pa-td-center">
                                                <button
                                                    type="button"
                                                    className="pa-approve-btn"
                                                    onClick={() =>
                                                        setSelectedApproval(product)
                                                    }
                                                >
                                                    Approve
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="pa-table-footer">
                            {filteredProducts.length} of {pendingProducts.length} products
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default PendingApprovalSection;