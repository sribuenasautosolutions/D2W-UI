import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import api from "../../../services/api";

const pageSize = 25;
const money = value => value == null ? "—" : Number(value).toLocaleString("en-IN", { style: "currency", currency: "INR" });

export default function VendorStockSearch({ storeId, storeRequired, query, onQueryChange, onSelectVendor }) {
    const [page, setPage] = useState(0);
    const [retry, setRetry] = useState(0);
    const [result, setResult] = useState(null);
    const search = query.trim();
    const disabled = storeRequired && !storeId;
    const requestKey = JSON.stringify([storeId, search, page, retry]);

    useEffect(() => {
        if (!search || disabled) return;
        const controller = new AbortController();
        let active = true;
        const timer = setTimeout(async () => {
            try {
                const { data } = await api.get("/api/vendor-stock-uploads/search", {
                    params: { ...(storeId ? { storeId: Number(storeId) } : {}), query: search, page, size: pageSize },
                    signal: controller.signal,
                });
                if (active) setResult({ key: requestKey, data });
            } catch (error) {
                if (active) setResult({ key: requestKey, error: error.response?.data?.message || "Unable to search vendor stock. Please try again." });
            }
        }, 300);
        return () => { active = false; clearTimeout(timer); controller.abort(); };
    }, [storeId, search, page, disabled, requestKey]);

    const current = result?.key === requestKey ? result : null;
    const rows = current?.data?.content || [];
    const total = current?.data?.totalElements || 0;
    const pages = current?.data?.totalPages || 1;
    const changeQuery = value => { setPage(0); onQueryChange(value); };

    return <section aria-label="Vendor stock search" style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", border: "1px solid #CBD5E1", borderRadius: 8, background: "#fff", color: "#64748B" }}>
            <Search size={17} aria-hidden="true" />
            <input aria-label="Search uploaded vendor stock" className="vendors-search-input" value={query} disabled={disabled} maxLength={200}
                onChange={event => changeQuery(event.target.value)} placeholder="Search vendor stock by part number or part name..." />
            {query && <button type="button" aria-label="Clear stock search" onClick={() => changeQuery("")} style={{ border: 0, background: "transparent", color: "#64748B", cursor: "pointer" }}><X size={16} /></button>}
        </label>
        <small style={{ color: "#64748B" }}>{disabled ? "Select a store to search uploaded stock." : "Search available stock across vendors in this store by part number or part name."}</small>
        {search && !disabled && <div aria-live="polite" aria-busy={!current}>
            {current?.error ? <div role="alert" style={{ padding: 16, color: "#B91C1C", background: "#FEF2F2" }}>
                {current.error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button>
            </div> : <>
                <div style={{ overflowX: "auto", borderRadius: 9, background: "#fff" }}>
                    <table className="vendors-table" aria-label="Matching vendor stock" style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", color: "#334155", fontSize: 12.5 }}>
                        <thead><tr><th>Vendor</th><th>Part Number</th><th>Part Name</th><th>Quantity</th><th>MRP</th><th>Brand</th></tr></thead>
                        <tbody>
                            {rows.map(row => <tr key={`${row.uploadId}-${row.vendorStockItemId}`}>
                                <td><button type="button" onClick={() => onSelectVendor(row)} style={{ border: 0, padding: 0, background: "transparent", color: "#3158D4", fontWeight: 700, cursor: "pointer" }}>{row.vendorName}</button></td>
                                <td><strong>{row.partNumber}</strong></td><td>{row.productName}</td>
                                <td>{Number(row.availableQuantity).toLocaleString("en-IN")}</td><td>{money(row.mrp)}</td><td>{row.brand || "—"}</td>
                            </tr>)}
                            {!current && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center" }}>Searching vendor stock...</td></tr>}
                            {current && !rows.length && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center" }}>No currently available vendor stock matches this part.</td></tr>}
                        </tbody>
                    </table>
                </div>
                {current && total > 0 && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", fontSize: 12 }}>
                    <span>{total} matching stock item{total === 1 ? "" : "s"}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous stock results</button>
                        <span>Page {page + 1} of {pages}</span>
                        <button type="button" disabled={page + 1 >= pages} onClick={() => setPage(value => value + 1)}>Next stock results</button>
                    </div>
                </div>}
            </>}
        </div>}
    </section>;
}
