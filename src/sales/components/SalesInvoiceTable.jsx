import { useState } from "react";
import InvoiceHistory from "./InvoiceHistory";
import { Eye, Download, Pencil, History, Trash2 } from "lucide-react";

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
        dateStyle: "medium",
        timeStyle: "short",
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
    const showStoreColumn = isSuperAdmin && !selectedStoreId;

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
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {sales.map((sale) => (
                        <tr key={sale.orderId}>
                            {showStoreColumn && (
                                <td>
                                    <div className="sales-store-cell">
                                        <strong>
                                            {sale.storeName || "-"}
                                        </strong>

                                        <small>
                                            {sale.storeCode || "-"}
                                        </small>
                                    </div>
                                </td>
                            )}

                            <td>
                                <div className="sales-invoice-cell">
                                    <strong>
                                        INV-
                                        {String(sale.orderId).padStart(6, "0")}
                                    </strong>

                                    {sale.orderStatus === "DRAFT" && <span className="sales-payment-badge">Draft</span>}
                                    {sale.edited && <span className="sales-payment-badge">Edited</span>}
                                    <small>
                                        Order #{sale.orderId}
                                    </small>
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
                                <span className="sales-payment-badge">
                                    {formatPaymentMethod(
                                        sale.orderStatus === "DRAFT" ? "DRAFT" : sale.paymentMethod
                                    )}
                                </span>
                            </td>

                            <td>
                                <strong>
                                    {formatMoney(sale.totalAmount)}
                                </strong>
                            </td>

                            <td>
                                {formatDate(sale.orderDate)}
                            </td>

                            <td>
                                <button
                                    type="button"
                                    className="sales-view-button"
                                    title={sale.orderStatus === "DRAFT" ? "Open draft" : "View invoice"}
                                    aria-label="View invoice"
                                    onClick={() =>
                                        sale.orderStatus === "DRAFT" ? onEditInvoice(sale.orderId) : onViewInvoice(sale.orderId)
                                    }
                                >
                                    <Eye size={16} />
                                </button>
                                <button type="button" className="sales-view-button" title="Download invoice" aria-label="Download invoice" disabled={sale.orderStatus === "DRAFT"}
                                    onClick={() => onDownloadInvoice(sale.orderId)}><Download size={16} /></button>
                                <button type="button" className="sales-view-button" title="Edit invoice" aria-label="Edit invoice"
                                    disabled={["CANCELLED", "RETURNED"].includes(sale.orderStatus)}
                                    onClick={() => onEditInvoice(sale.orderId)}><Pencil size={16} /></button>
                                {sale.edited && <button type="button" className="sales-view-button" title="Edit history" aria-label="Edit history" onClick={() => setHistoryOrderId(sale.orderId)}><History size={16} /></button>}
                                {isSuperAdmin && <button type="button" className="sales-view-button" title="Delete invoice" aria-label="Delete invoice" onClick={() => onDeleteInvoice(sale)}><Trash2 size={16} /></button>}
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
