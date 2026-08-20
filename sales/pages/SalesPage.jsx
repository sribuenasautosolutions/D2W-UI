import { Link } from "react-router-dom";
import { Plus, ReceiptText } from "lucide-react";

function SalesPage() {
    return (
        <div style={{ display: "grid", gap: "16px" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    padding: "18px 20px",
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                }}
            >
                <div>
                    <h1 style={{ margin: 0, fontSize: "22px", color: "#0F172A" }}>
                        Sales
                    </h1>
                    <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: "13px" }}>
                        View sales invoices and create new sales bills.
                    </p>
                </div>

                <Link
                    to="new"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 14px",
                        borderRadius: "7px",
                        background: "#2563EB",
                        color: "#FFFFFF",
                        textDecoration: "none",
                        fontSize: "13px",
                        fontWeight: 700,
                    }}
                >
                    <Plus size={16} />
                    New Sale
                </Link>
            </div>

            <div
                style={{
                    minHeight: "260px",
                    display: "grid",
                    placeItems: "center",
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                }}
            >
                <div style={{ textAlign: "center", color: "#64748B" }}>
                    <ReceiptText size={34} style={{ marginBottom: "10px" }} />
                    <div style={{ color: "#334155", fontWeight: 700, fontSize: "15px" }}>
                        Sales Invoices
                    </div>
                    <div style={{ marginTop: "5px", fontSize: "12px" }}>
                        The existing sales/order data will be connected in the next step.
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SalesPage;
