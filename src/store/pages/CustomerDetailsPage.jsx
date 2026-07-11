import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCustomerDetails,
  getCustomerOrders,
} from "../../services/customerService";

/* ── design tokens ── */
const C = {
  blue:   "#2563eb", blueLight: "#eff6ff", blueBorder: "#bfdbfe",
  green:  "#16a34a", greenLight: "#f0fdf4", greenBorder: "#bbf7d0",
  purple: "#9333ea", purpleLight: "#fdf4ff", purpleBorder: "#e9d5ff",
  amber:  "#d97706", amberLight: "#fffbeb", amberBorder: "#fde68a",
  cyan:   "#0891b2", cyanLight:  "#ecfeff", cyanBorder:  "#a5f3fc",
  slate:  "#64748b", ink: "#0f172a", muted: "#94a3b8",
  bg: "#f1f5f9", surface: "#fff", border: "#e2e8f0", rowHover: "#f0f9ff",
};

const S = {
  page:        { padding: "28px 30px", background: C.bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  breadcrumb:  { fontSize: "13px", color: C.muted },
  pageTitle:   { fontSize: "24px", fontWeight: "700", color: C.ink, margin: "2px 0 0" },
  pageSub:     { fontSize: "13px", color: C.slate, margin: "3px 0 0" },
  backBtn:     { padding: "9px 18px", borderRadius: "8px", border: "1px solid #e2e8f0", background: C.ink, color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap" },

  /* profile card */
  profileCard: { background: C.surface, borderRadius: "12px", padding: "22px 26px", marginBottom: "22px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" },
  avatar:      { width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", color: "#fff", fontWeight: "800", flexShrink: 0 },
  profileMain: { flex: 1, minWidth: "180px" },
  profileName: { fontSize: "20px", fontWeight: "800", color: C.ink, margin: "0 0 4px" },
  profileMeta: { display: "flex", gap: "18px", flexWrap: "wrap", marginTop: "8px" },
  metaItem:    (accent) => ({ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", color: accent ?? C.slate }),
  profileRight:{ display: "flex", gap: "12px", flexWrap: "wrap", marginLeft: "auto" },
  profileStat: (border) => ({ background: C.bg, borderLeft: `4px solid ${border}`, borderRadius: "8px", padding: "12px 18px", minWidth: "130px" }),
  statLabel:   { fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: C.slate },
  statValue:   (color) => ({ fontSize: "20px", fontWeight: "800", color: color ?? C.ink, margin: "4px 0 0" }),

  /* kpi */
  kpiGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: "16px", marginBottom: "22px" },
  kpiCard:     (border) => ({ background: C.surface, padding: "20px 22px", borderRadius: "12px", borderTop: `4px solid ${border}`, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }),
  kpiLeft:     { display: "flex", flexDirection: "column", gap: "5px" },
  kpiLabel:    { fontSize: "11px", fontWeight: "700", color: C.slate, textTransform: "uppercase", letterSpacing: "0.5px" },
  kpiValue:    { fontSize: "26px", fontWeight: "800", color: C.ink, margin: 0 },
  kpiSub:      { fontSize: "11px", color: C.muted, marginTop: "2px" },
  kpiIcon:     (bg) => ({ width: "44px", height: "44px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }),

  /* insights */
  insightsBox:  { background: C.surface, borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "22px" },
  insightTitle: { fontSize: "15px", fontWeight: "700", color: C.ink, marginBottom: "14px" },
  insightsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: "12px" },
  insCard:      (accent) => ({ background: accent + "10", border: `1px solid ${accent}30`, borderRadius: "10px", padding: "16px 18px" }),
  insLabel:     { fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: C.slate, marginBottom: "6px" },
  insValue:     (accent) => ({ fontSize: "19px", fontWeight: "800", color: accent, margin: 0, wordBreak: "break-word" }),
  insSub:       { fontSize: "11px", color: C.muted, marginTop: "4px" },

  /* toolbar */
  toolbar:     { background: C.surface, borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  searchInput: { padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "13px", color: C.ink, width: "280px", outline: "none" },
  toolBtn:     (bg, color) => ({ padding: "8px 14px", borderRadius: "7px", border: "none", background: bg, color, fontWeight: "600", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }),

  /* table */
  tableBox:    { background: C.surface, borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  tableHead:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" },
  tableTitle:  { fontSize: "15px", fontWeight: "700", color: C.ink },
  tableCount:  { fontSize: "12px", color: C.slate },
  table:       { width: "100%", borderCollapse: "collapse" },
  th:          { padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: C.slate, background: "#f8fafc", borderBottom: `1px solid ${C.border}`, textTransform: "uppercase", letterSpacing: "0.4px" },
  td:          { padding: "12px 14px", fontSize: "13px", color: "#374151", borderBottom: "1px solid #f1f5f9" },
  tdBold:      { padding: "12px 14px", fontSize: "13px", color: C.ink, fontWeight: "700", borderBottom: "1px solid #f1f5f9" },
  emptyTd:     { padding: "48px", textAlign: "center", fontSize: "14px", color: C.muted },

  /* payment badge */
  payBadge:    (method) => {
    const map = { Cash: ["#fef9c3","#92400e","#fde68a"], UPI: ["#eff6ff","#1d4ed8","#bfdbfe"], Card: ["#fdf4ff","#7e22ce","#e9d5ff"], Online: ["#f0fdf4","#166534","#bbf7d0"] };
    const [bg, color, border] = map[method] ?? ["#f8fafc","#475569","#e2e8f0"];
    return { display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", background: bg, color, border: `1px solid ${border}` };
  },

  /* pagination */
  pgBtn:       (disabled) => ({ padding: "7px 14px", borderRadius: "7px", border: `1px solid ${C.border}`, background: disabled ? "#f8fafc" : C.ink, color: disabled ? C.muted : "#fff", cursor: disabled ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: "600" }),
  pgInfo:      { fontSize: "13px", color: C.slate, display: "flex", alignItems: "center" },
};

/* ── helpers ── */
const fmt    = (n)   => `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d)  => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const initial = (name) => (name ?? "?").trim().charAt(0).toUpperCase();

function preferredPayment(orders) {
  if (!orders.length) return "—";
  const freq = {};
  orders.forEach(o => { freq[o.paymentMethod] = (freq[o.paymentMethod] ?? 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

function latestOrderDate(orders) {
  if (!orders.length) return "—";
  return fmtDate(orders.reduce((latest, o) => new Date(o.orderDate) > new Date(latest) ? o.orderDate : latest, orders[0].orderDate));
}

/* ── sub-components ── */
function KpiCard({ label, value, sub, icon, iconBg, border }) {
  return (
    <div style={S.kpiCard(border)}>
      <div style={S.kpiLeft}>
        <span style={S.kpiLabel}>{label}</span>
        <span style={S.kpiValue}>{value}</span>
        {sub && <span style={S.kpiSub}>{sub}</span>}
      </div>
      <div style={S.kpiIcon(iconBg)}>{icon}</div>
    </div>
  );
}

/* ── main ── */
export default function CustomerDetailsPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();

  const [customer,   setCustomer]   = useState(null);
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState("");
  const [hoveredRow, setHoveredRow] = useState(null);
  const [page,       setPage]       = useState(1);
  const PER_PAGE = 10;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cust, ords] = await Promise.all([
        getCustomerDetails(id),
        getCustomerOrders(id),
      ]);
      setCustomer(cust);
      setOrders(Array.isArray(ords) ? ords : []);
    } catch (err) {
      console.error("CustomerDetailsPage load error:", err);
      setError("Failed to load customer details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── loading / error guards ── */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: C.bg }}>
      <p style={{ color: C.slate, fontSize: "15px" }}>Loading Customer Details…</p>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "12px" }}>
      <p style={{ color: "#dc2626" }}>{error}</p>
      <button onClick={loadData} style={{ padding: "9px 20px", borderRadius: "7px", background: C.blue, color: "#fff", border: "none", cursor: "pointer", fontWeight: "600" }}>Retry</button>
    </div>
  );

  /* ── derived values ── */
  const totalPurchase = Number(customer.totalPurchaseAmount ?? 0);
  const totalOrders   = Number(customer.totalOrders ?? 0);
  const avgOrderValue = totalOrders > 0 ? (totalPurchase / totalOrders).toFixed(2) : "0.00";

  const highestOrder  = orders.length ? Math.max(...orders.map(o => Number(o.totalAmount ?? 0))) : 0;
  const prefPayment   = preferredPayment(orders);
  const latestDate    = latestOrderDate(orders);

  /* ── search & pagination ── */
  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (
      String(o.orderId).toLowerCase().includes(q) ||
      (o.paymentMethod ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage     = Math.min(page, totalPages);
  const pageOrders   = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <div style={S.page}>

      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <p style={S.breadcrumb}>Reports / Customer Report / <span style={{ color: C.ink }}>Customer Details</span></p>
          <h1 style={S.pageTitle}>Customer Details</h1>
          <p style={S.pageSub}>Customer profile and purchase analysis</p>
        </div>
        <button style={S.backBtn} onClick={() => navigate("/admin/reports/customers")}>← Back</button>
      </div>

      {/* ── Profile Card ── */}
      <div style={S.profileCard}>
        <div style={S.avatar}>{initial(customer.customerName)}</div>

        <div style={S.profileMain}>
          <p style={S.profileName}>{customer.customerName}</p>
          <div style={S.profileMeta}>
            <span style={S.metaItem()}>📞 {customer.phone ?? "—"}</span>
            <span style={S.metaItem()}>📍 {customer.address ?? "—"}</span>
          </div>
        </div>

        <div style={S.profileRight}>
          <div style={S.profileStat(C.blue)}>
            <p style={S.statLabel}>Total Orders</p>
            <p style={S.statValue(C.blue)}>{customer.totalOrders}</p>
          </div>
          <div style={S.profileStat(C.purple)}>
            <p style={S.statLabel}>Total Purchase</p>
            <p style={S.statValue(C.purple)}>{fmt(customer.totalPurchaseAmount)}</p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={S.kpiGrid}>
        <KpiCard label="Total Orders"        value={totalOrders}             sub="Completed orders"            icon="🛒" iconBg={C.blueLight}   border={C.blue}   />
        <KpiCard label="Total Purchase"      value={fmt(totalPurchase)}      sub="Cumulative spend"            icon="💰" iconBg={C.purpleLight} border={C.purple} />
        <KpiCard label="Avg. Order Value"    value={fmt(avgOrderValue)}      sub="Per order average"           icon="📊" iconBg={C.amberLight}  border={C.amber}  />
        <KpiCard label="Latest Order"        value={latestDate}              sub="Most recent purchase"        icon="📅" iconBg={C.greenLight}  border={C.green}  />
      </div>

      {/* ── Dashboard Insights ── */}
      <div style={S.insightsBox}>
        <p style={S.insightTitle}>🔍 Purchase Insights</p>
        <div style={S.insightsGrid}>

          <div style={S.insCard(C.blue)}>
            <p style={S.insLabel}>Preferred Payment</p>
            <p style={S.insValue(C.blue)}>{prefPayment}</p>
            <p style={S.insSub}>Most used payment method</p>
          </div>

          <div style={S.insCard(C.purple)}>
            <p style={S.insLabel}>Highest Order Value</p>
            <p style={S.insValue(C.purple)}>{fmt(highestOrder)}</p>
            <p style={S.insSub}>Single largest order</p>
          </div>

          <div style={S.insCard(C.green)}>
            <p style={S.insLabel}>Total Order Count</p>
            <p style={S.insValue(C.green)}>{orders.length}</p>
            <p style={S.insSub}>All recorded orders</p>
          </div>

          <div style={S.insCard(C.amber)}>
            <p style={S.insLabel}>Avg. Order Value</p>
            <p style={S.insValue(C.amber)}>{fmt(avgOrderValue)}</p>
            <p style={S.insSub}>Total ÷ orders placed</p>
          </div>

        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={S.toolbar}>
        <input
          type="text"
          placeholder="🔍 Search by Order ID or Payment Method…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={S.searchInput}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button style={S.toolBtn("#fee2e2", "#dc2626")} onClick={() => window.print()}>📄 Export PDF</button>
          <button style={S.toolBtn("#dcfce7", "#16a34a")} onClick={() => alert("Export Excel: wire up your backend endpoint.")}>📊 Export Excel</button>
          <button style={S.toolBtn("#f3f4f6", "#374151")} onClick={() => window.print()}>🖨️ Print</button>
        </div>
      </div>

      {/* ── Order History Table ── */}
      <div style={S.tableBox}>
        <div style={S.tableHead}>
          <span style={S.tableTitle}>Order History</span>
          <span style={S.tableCount}>{filtered.length} order{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["#", "Order ID", "Order Date", "Payment Method", "Order Amount"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} style={S.emptyTd}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "32px" }}>🔍</span>
                      <span style={{ fontWeight: "600", color: C.slate }}>No Records Found</span>
                      <span style={{ fontSize: "12px", color: C.muted }}>Try a different Order ID or Payment Method</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageOrders.map((order, idx) => {
                  const globalIdx = (safePage - 1) * PER_PAGE + idx + 1;
                  const isHovered = hoveredRow === order.orderId;
                  return (
                    <tr
                      key={order.orderId}
                      onMouseEnter={() => setHoveredRow(order.orderId)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{ background: isHovered ? C.rowHover : "transparent", transition: "background 0.15s" }}
                    >
                      <td
  style={{
    ...S.td,
    fontWeight: "600",
    color: C.blue,
    cursor: "pointer",
    textDecoration: "underline",
  }}
  onClick={() => navigate(`/admin/invoice/${order.orderId}`)}
>
  INV-{String(order.orderId).padStart(6, "0")}
</td>
                      <td style={S.td}>{fmtDate(order.orderDate)}</td>
                      <td style={S.td}>
                        <span style={S.payBadge(order.paymentMethod)}>{order.paymentMethod}</span>
                      </td>
                      <td style={S.tdBold}>{fmt(order.totalAmount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "18px", paddingTop: "14px", borderTop: `1px solid ${C.border}`, flexWrap: "wrap", gap: "10px" }}>
            <span style={S.pgInfo}>
              Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length} orders
            </span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                style={S.pgBtn(safePage === 1)}
                disabled={safePage === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >← Previous</button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                .reduce((acc, n, i, arr) => {
                  if (i > 0 && n - arr[i - 1] > 1) acc.push("…");
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "…"
                    ? <span key={`ellipsis-${i}`} style={{ fontSize: "13px", color: C.muted, padding: "0 4px" }}>…</span>
                    : <button
                        key={item}
                        onClick={() => setPage(item)}
                        style={{ ...S.pgBtn(false), background: item === safePage ? C.blue : C.surface, color: item === safePage ? "#fff" : C.ink, border: `1px solid ${item === safePage ? C.blue : C.border}`, minWidth: "34px" }}
                      >{item}</button>
                )
              }

              <button
                style={S.pgBtn(safePage === totalPages)}
                disabled={safePage === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >Next →</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}