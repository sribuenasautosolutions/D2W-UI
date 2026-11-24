import { useState, useEffect } from "react";
import InvoiceHistory from "./InvoiceHistory";
import { Eye, Download, Pencil, History, Trash2, MoreVertical } from "lucide-react";

const formatMoney = (value) => {
    return `₹ ${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

const formatPaymentMethod = (value) => {
    if (!value) return "-";

    return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

export default function SalesInvoiceTable({
    sales,
    isSuperAdmin,
    selectedStoreId,
    onViewInvoice,
    onDownloadInvoice,
    onEditInvoice,
    onDeleteInvoice,
}) {
    const [historyOrderId, setHistoryOrderId] = useState(null);
    const [openActionOrderId, setOpenActionOrderId] = useState(null);
    const showStoreColumn = isSuperAdmin && !selectedStoreId;

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!e.target.closest(".sales-action-cell-wrapper")) {
                setOpenActionOrderId(null);
            }
        };
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, []);

    return (
        <div className="sales-invoice-table-wrapper">
            {historyOrderId && <InvoiceHistory orderId={historyOrderId} onClose={() => setHistoryOrderId(null)} />}
            <table className="sales-invoice-table">
                <thead>
                    <tr>
                        {showStoreColumn && <th>Store</th>}

                        <th>Invoice</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Items</th>
                        <th>Payment</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th style={{ textAlign: "center" }}>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {sales.map((sale, index) => (
                        <tr
                            key={sale.orderId}
                            onClick={() =>
                                sale.orderStatus === "DRAFT" ? onEditInvoice(sale.orderId) : onViewInvoice(sale.orderId)
                            }
                            style={{ cursor: "pointer" }}
                            title={sale.orderStatus === "DRAFT" ? "Click to open draft" : "Click to view invoice"}
                        >
                            {showStoreColumn && (
                                <td>
                                    <div className="sales-store-cell">
                                        <span>
                                            {sale.storeName || "-"}
                                        </span>
                                    </div>
                                </td>
                            )}

                            <td>
                                <div className="sales-invoice-cell">
                                    <span>
                                        {`INV-${String(sale.orderId).padStart(6, "0")}`}
                                    </span>

                                    {sale.orderStatus === "DRAFT" && <span className="sales-payment-badge">Draft</span>}
                                    {sale.edited && <span className="sales-payment-badge">Edited</span>}
                                </div>
                            </td>

                            <td>
                                {sale.customerName || "-"}
                            </td>

                            <td>
                                {sale.phone || "-"}
                            </td>

                            <td>
                                {sale.totalItems ?? 0}
                            </td>

                            <td>
                                <span className="sales-payment-text">
                                    {formatPaymentMethod(
                                        sale.orderStatus === "DRAFT" ? "DRAFT" : sale.paymentMethod
                                    )}
                                </span>
                            </td>

                            <td>
                                <span>
                                    {formatMoney(sale.totalAmount)}
                                </span>
                            </td>

                            <td>
                                {formatDate(sale.orderDate)}
                            </td>

                            <td onClick={(e) => e.stopPropagation()} className="sales-action-cell">
                                <div className="sales-action-cell-wrapper">
                                    <button
                                        type="button"
                                        className="sales-kebab-btn"
                                        title="Actions"
                                        aria-label="Actions"
                                        aria-expanded={openActionOrderId === sale.orderId}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenActionOrderId(openActionOrderId === sale.orderId ? null : sale.orderId);
                                        }}
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    {openActionOrderId === sale.orderId && (
                                        <div
                                            className={`sales-action-menu ${index >= sales.length - 2 && sales.length > 2 ? "sales-action-menu-up" : ""}`}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                type="button"
                                                className="sales-action-menu-item"
                                                onClick={() => {
                                                    setOpenActionOrderId(null);
                                                    sale.orderStatus === "DRAFT" ? onEditInvoice(sale.orderId) : onViewInvoice(sale.orderId);
                                                }}
                                            >
                                                <Eye size={15} />
                                                <span>{sale.orderStatus === "DRAFT" ? "Open draft" : "View invoice"}</span>
                                            </button>

                                            {sale.orderStatus !== "DRAFT" && (
                                                <button
                                                    type="button"
                                                    className="sales-action-menu-item"
                                                    onClick={() => {
                                                        setOpenActionOrderId(null);
                                                        onDownloadInvoice(sale.orderId);
                                                    }}
                                                >
                                                    <Download size={15} />
                                                    <span>Download invoice</span>
                                                </button>
                                            )}

                                            {!["CANCELLED", "RETURNED"].includes(sale.orderStatus) && (
                                                <button
                                                    type="button"
                                                    className="sales-action-menu-item"
                                                    onClick={() => {
                                                        setOpenActionOrderId(null);
                                                        onEditInvoice(sale.orderId);
                                                    }}
                                                >
                                                    <Pencil size={15} />
                                                    <span>Edit invoice</span>
                                                </button>
                                            )}

                                            {sale.edited && (
                                                <button
                                                    type="button"
                                                    className="sales-action-menu-item"
                                                    onClick={() => {
                                                        setOpenActionOrderId(null);
                                                        setHistoryOrderId(sale.orderId);
                                                    }}
                                                >
                                                    <History size={15} />
                                                    <span>Edit history</span>
                                                </button>
                                            )}

                                            {isSuperAdmin && (
                                                <button
                                                    type="button"
                                                    className="sales-action-menu-item danger"
                                                    onClick={() => {
                                                        setOpenActionOrderId(null);
                                                        onDeleteInvoice(sale);
                                                    }}
                                                >
                                                    <Trash2 size={15} />
                                                    <span>Delete invoice</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}

                    {sales.length === 0 && (
                        <tr>
                            <td
                                colSpan={showStoreColumn ? 9 : 8}
                                className="sales-empty-row"
                            >
                                No sales invoices found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
