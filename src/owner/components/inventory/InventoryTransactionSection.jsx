import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, FilterX, History, Search } from "lucide-react";
import api from "../../../services/api";
import { getInventoryTransactionsPage } from "../../../services/inventoryTransactionService";

const transactionTypes = ["STOCK_IN", "STOCK_OUT", "SALE", "RETURN", "ADJUSTMENT", "DAMAGED"];

function getUser() {
  try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", timeStyle: "short",
  }).format(new Date(value));
}

export default function InventoryTransactionsSection() {
  const user = getUser();
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(user.storeId ? String(user.storeId) : "");
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [type, setType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [result, setResult] = useState({ content: [], totalElements: 0, totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get("/stores", { params: { page: 0, size: 100, active: true } }).then((response) => {
      const active = Array.isArray(response.data?.content) ? response.data.content : [];
      setStores(active);
    }).catch(() => setError("Unable to load stores"));
  }, [isSuperAdmin]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getInventoryTransactionsPage(storeId, {
        page, size,
        search: appliedSearch || undefined,
        type: type || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setResult(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load inventory transactions");
    } finally {
      setLoading(false);
    }
  }, [storeId, page, size, appliedSearch, type, fromDate, toDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTransactions();
  }, [loadTransactions]);

  const clearFilters = () => {
    setSearchText(""); setAppliedSearch(""); setType(""); setFromDate(""); setToDate(""); setPage(0);
  };

  const pageNumbers = useMemo(() => {
    const total = result.totalPages || 0;
    if (!total) return [];
    const start = Math.max(0, Math.min(page - 2, total - 5));
    return Array.from({ length: Math.min(5, total) }, (_, index) => start + index);
  }, [page, result.totalPages]);

  const firstRecord = result.totalElements ? page * size + 1 : 0;
  const lastRecord = Math.min((page + 1) * size, result.totalElements || 0);

  return (
    <section style={S.page}>
      <div style={S.header}>
        <div style={S.heading}><div style={S.icon}><History size={18} /></div><div><h2 style={S.title}>Inventory Transactions</h2><p style={S.subtitle}>Review stock movement and adjustment history.</p></div></div>
        <div style={S.total}><span>Total records</span><strong>{Number(result.totalElements || 0).toLocaleString("en-IN")}</strong></div>
      </div>

      <div style={S.filters}>
        {isSuperAdmin && <select style={S.select} value={storeId} onChange={(e) => { setStoreId(e.target.value); setPage(0); }}><option value="">All Stores</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.storeName}</option>)}</select>}
        <div style={S.searchWrap}><Search size={15} color="#64748B" /><input style={S.searchInput} value={searchText} onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setAppliedSearch(searchText.trim()); setPage(0); } }} placeholder="Search item, part number or remarks" /><button style={S.searchButton} type="button" onClick={() => { setAppliedSearch(searchText.trim()); setPage(0); }}>Search</button></div>
        <select style={S.select} value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}><option value="">All transaction types</option>{transactionTypes.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
        <label style={S.dateField}><span>From</span><input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => { setFromDate(e.target.value); setPage(0); }} /></label>
        <label style={S.dateField}><span>To</span><input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => { setToDate(e.target.value); setPage(0); }} /></label>
        <button type="button" style={S.clearButton} onClick={clearFilters} title="Clear filters"><FilterX size={16} /> Clear</button>
      </div>

      {error && <div style={S.error}>{error}</div>}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Date & Time</th><th style={S.th}>Product</th><th style={S.th}>Part Number</th><th style={{ ...S.th, textAlign: "right" }}>Quantity</th><th style={S.th}>Transaction</th><th style={S.th}>Remarks</th></tr></thead>
          <tbody>
            {loading ? <tr><td style={S.empty} colSpan="6">Loading transactions...</td></tr> : result.content.length === 0 ? <tr><td style={S.empty} colSpan="6">No transactions match the selected filters.</td></tr> : result.content.map((item) => <tr key={item.id} style={S.row}><td style={S.td}>{formatDate(item.createdAt)}</td><td style={{ ...S.td, fontWeight: 700 }}>{item.itemName || "Unknown product"}</td><td style={{ ...S.td, color: "#475569" }}>{item.partNumber || "—"}</td><td style={{ ...S.td, textAlign: "right", fontWeight: 800 }}>{item.quantity}</td><td style={S.td}><TransactionBadge type={item.transactionType} /></td><td style={{ ...S.td, color: "#475569" }}>{item.remarks || "—"}</td></tr>)}
          </tbody>
        </table>
      </div>

      <div style={S.pagination}>
        <span style={S.range}>{firstRecord}-{lastRecord} of {Number(result.totalElements || 0).toLocaleString("en-IN")}</span>
        <select style={S.pageSize} value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}><option value="10">10 / page</option><option value="20">20 / page</option><option value="50">50 / page</option><option value="100">100 / page</option></select>
        <button style={S.pageButton} disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)} title="Previous page"><ArrowLeft size={15} /></button>
        {pageNumbers.map((number) => <button key={number} style={number === page ? S.activePage : S.pageButton} onClick={() => setPage(number)}>{number + 1}</button>)}
        <button style={S.pageButton} disabled={page + 1 >= result.totalPages || loading} onClick={() => setPage((value) => value + 1)} title="Next page"><ArrowRight size={15} /></button>
      </div>
    </section>
  );
}

function TransactionBadge({ type }) {
  const colors = type === "STOCK_IN" || type === "RETURN" ? ["#DCFCE7", "#15803D"] : type === "SALE" || type === "STOCK_OUT" ? ["#FEF3C7", "#B45309"] : type === "DAMAGED" ? ["#FEE2E2", "#B91C1C"] : ["#DBEAFE", "#1D4ED8"];
  return <span style={{ ...S.badge, background: colors[0], color: colors[1] }}>{type?.replaceAll("_", " ")}</span>;
}

const S = {
  page: { display: "grid", gap: 12 }, header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }, heading: { display: "flex", alignItems: "center", gap: 10 }, icon: { width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 6, background: "#EFF6FF", color: "#2563EB" }, title: { margin: 0, fontSize: 17, color: "#0F172A" }, subtitle: { margin: "3px 0 0", fontSize: 12, color: "#64748B" }, total: { minWidth: 120, padding: "7px 10px", border: "1px solid #E2E8F0", borderRadius: 6, background: "#FFF", display: "grid", gap: 2, color: "#64748B", fontSize: 10 },
  filters: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: 10, border: "1px solid #E2E8F0", borderRadius: 7, background: "#FFF" }, searchWrap: { flex: "1 1 300px", height: 36, display: "flex", alignItems: "center", gap: 7, paddingLeft: 9, border: "1px solid #CBD5E1", borderRadius: 5, overflow: "hidden" }, searchInput: { flex: 1, minWidth: 0, border: 0, outline: 0, fontSize: 12 }, searchButton: { alignSelf: "stretch", padding: "0 12px", border: 0, borderLeft: "1px solid #DBEAFE", background: "#EFF6FF", color: "#1D4ED8", fontWeight: 700, cursor: "pointer" }, select: { height: 36, minWidth: 150, padding: "0 8px", border: "1px solid #CBD5E1", borderRadius: 5, background: "#FFF", fontSize: 11.5 }, dateField: { height: 36, padding: "0 7px", display: "flex", alignItems: "center", gap: 5, border: "1px solid #CBD5E1", borderRadius: 5, color: "#64748B", fontSize: 10 }, clearButton: { height: 36, padding: "0 10px", display: "flex", alignItems: "center", gap: 6, border: "1px solid #E2E8F0", borderRadius: 5, background: "#F8FAFC", color: "#475569", cursor: "pointer" },
  tableWrap: { minHeight: "calc(100vh - 385px)", overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 7, background: "#FFF" }, table: { width: "100%", minWidth: 850, borderCollapse: "collapse", fontSize: 12 }, th: { position: "sticky", top: 0, zIndex: 1, padding: "10px 12px", borderBottom: "1px solid #CBD5E1", background: "#F8FAFC", color: "#64748B", textAlign: "left", fontSize: 10, textTransform: "uppercase" }, td: { padding: "11px 12px", borderBottom: "1px solid #F1F5F9", color: "#0F172A" }, row: { background: "#FFF" }, empty: { height: 180, textAlign: "center", color: "#64748B" }, badge: { display: "inline-flex", padding: "4px 7px", borderRadius: 4, fontSize: 9.5, fontWeight: 800, whiteSpace: "nowrap" },
  pagination: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }, range: { marginRight: "auto", color: "#64748B", fontSize: 11 }, pageSize: { height: 32, border: "1px solid #CBD5E1", borderRadius: 5, background: "#FFF", fontSize: 11 }, pageButton: { width: 32, height: 32, display: "grid", placeItems: "center", border: "1px solid #CBD5E1", borderRadius: 5, background: "#FFF", color: "#475569", cursor: "pointer" }, activePage: { width: 32, height: 32, display: "grid", placeItems: "center", border: "1px solid #2563EB", borderRadius: 5, background: "#2563EB", color: "#FFF", fontWeight: 800, cursor: "pointer" }, error: { padding: 10, border: "1px solid #FECACA", borderRadius: 5, background: "#FEF2F2", color: "#B91C1C", fontSize: 12 },
};
