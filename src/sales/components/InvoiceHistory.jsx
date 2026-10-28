import { useEffect, useState } from "react";
import { getInvoiceHistory } from "../../services/orderService";
import "./InvoiceHistory.css";

const money = value => Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" });
const parse = value => { try { return JSON.parse(value); } catch { return {}; } };
const fields = [["remainingQuantity", "Quantity"], ["sellingPrice", "Selling price"], ["mrp", "MRP"], ["discountPercentage", "Discount %"], ["gstType", "GST"]];
function Changes({ entry }) {
    const before = parse(entry.beforeState), after = parse(entry.afterState);
    const oldItems = new Map((before.items || []).map(row => [row.orderItemId, row]));
    const newItems = new Map((after.items || []).map(row => [row.orderItemId, row]));
    const changes = [];
    for (const [id, row] of newItems) {
        const old = oldItems.get(id);
        const name = row.itemName || row.partNumber || old?.itemName || ('Item #' + id);
        if (!old) changes.push([name, "Added", "—", row.remainingQuantity + ' × ' + money(row.sellingPrice)]);
        else for (const [key, label] of fields) {
            if (String(old[key] ?? '') !== String(row[key] ?? '')) changes.push([name, label, old[key], row[key]]);
        }
    }
    for (const [id, row] of oldItems) if (!newItems.has(id)) changes.push([row.itemName || row.partNumber || ('Item #' + id), "Removed", row.remainingQuantity, "—"]);
    if (Number(before.billDiscountPercent || 0) !== Number(after.billDiscountPercent || 0)) changes.push(["Invoice", "Bill discount %", before.billDiscountPercent, after.billDiscountPercent]);
    return <><p>Total: {money(before.totalAmount)} → {money(after.totalAmount)}</p>
        {changes.length > 0 ? <table><thead><tr><th>Item</th><th>Change</th><th>Before</th><th>After</th></tr></thead><tbody>
            {changes.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column}>{value ?? "—"}</td>)}</tr>)}
        </tbody></table> : <p>No item or price changes.</p>}</>;
}
export default function InvoiceHistory({ orderId, onClose }) {
    const [entries, setEntries] = useState(null), [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        getInvoiceHistory(orderId).then(rows => { if (active) setEntries(rows); })
            .catch(err => { if (active) setError(err.response?.data?.message || "Unable to load edit history."); });
        return () => { active = false; };
    }, [orderId]);
    useEffect(() => {
        const close = event => { if (event.key === "Escape") onClose(); };
        document.addEventListener("keydown", close);
        return () => document.removeEventListener("keydown", close);
    }, [onClose]);
    return <div className="invoice-history-overlay" onClick={onClose}>
        <section className="invoice-history-dialog" role="dialog" aria-modal="true" aria-labelledby="invoice-history-title" onClick={event => event.stopPropagation()}>
            <header><h2 id="invoice-history-title">Edit history · INV-{String(orderId).padStart(6, "0")}</h2><button autoFocus type="button" onClick={onClose}>Close</button></header>
            {error && <p role="alert">{error}</p>}
            {!entries && !error && <p>Loading history…</p>}
            {entries?.length === 0 && <p>No edits recorded.</p>}
            {entries?.map(entry => <article key={entry.id}>
                <h3>{entry.editedBy}</h3><time>{new Date(entry.editedAt).toLocaleString("en-IN")}</time>
                <p><strong>Reason:</strong> {entry.reason}</p><Changes entry={entry} />
            </article>)}
        </section>
    </div>;
}
