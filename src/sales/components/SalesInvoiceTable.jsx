import { Eye } from "lucide-react";

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
        // timeStyle: "short",
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
}) {
    const showStoreColumn = isSuperAdmin && !selectedStoreId;

    return (
        <div className="sales-invoice-table-wrapper">
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
                                        sale.paymentMethod
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
                                    title="View invoice"
                                    onClick={() =>
                                        onViewInvoice(sale.orderId)
                                    }
                                >
                                    <Eye size={16} />
                                </button>
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