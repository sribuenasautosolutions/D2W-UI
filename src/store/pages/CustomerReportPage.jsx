import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCustomerReport,
  getCustomerList,
} from "../../services/reportService";

/* ── styles ── */
const S = {
  page:         { padding: "28px 30px", background: "#f1f5f9", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif" },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  headerLeft:   { display: "flex", flexDirection: "column", gap: "3px" },
  breadcrumb:   { fontSize: "13px", color: "#94a3b8" },
  pageTitle:    { fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: 0 },
  pageSubtitle: { fontSize: "13px", color: "#64748b", margin: 0 },
  backBtn:      { padding: "9px 18px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600" },

  toolbar:      { background: "#fff", borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  searchInput:  { padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "13px", color: "#0f172a", width: "260px", outline: "none" },
  toolBtn:      (bg, color) => ({ padding: "8px 14px", borderRadius: "7px", border: "none", background: bg, color, fontWeight: "600", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }),

  kpiGrid:      { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px", marginBottom: "24px" },
  kpiCard:      (border) => ({ background: "#fff", padding: "20px 22px", borderRadius: "12px", borderTop: `4px solid ${border}`, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }),
  kpiLeft:      { display: "flex", flexDirection: "column", gap: "6px" },
  kpiLabel:     { fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" },
  kpiValue:     { fontSize: "28px", fontWeight: "800", color: "#0f172a", margin: 0 },
  kpiIcon:      (bg) => ({ width: "44px", height: "44px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }),

  insightsBox:   { background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "24px" },
  insightsTitle: { fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "14px" },
  insightsGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" },
  insightCard:   (accent) => ({ background: accent + "12", border: `1px solid ${accent}30`, borderRadius: "8px", padding: "14px 16px" }),
  insightLabel:  { fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", marginBottom: "4px" },
  insightValue:  (accent) => ({ fontSize: "18px", fontWeight: "800", color: accent, margin: 0 }),
  insightSub:    { fontSize: "11px", color: "#94a3b8", marginTop: "2px" },

  tableBox:     { background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  tableHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" },
  tableTitle:   { fontSize: "15px", fontWeight: "700", color: "#0f172a" },
  tableCount:   { fontSize: "12px", color: "#64748b" },
  table:        { width: "100%", borderCollapse: "collapse" },
  th:           { padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "#64748b", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", letterSpacing: "0.4px" },
  td:           { padding: "12px 14px", fontSize: "13px", color: "#374151", borderBottom: "1px solid #f1f5f9" },
  tdBold:       { padding: "12px 14px", fontSize: "13px", color: "#0f172a", fontWeight: "700", borderBottom: "1px solid #f1f5f9" },
  tdLink:       { padding: "12px 14px", fontSize: "13px", color: "#2563eb", fontWeight: "700", borderBottom: "1px solid #f1f5f9", cursor: "pointer" },
  emptyTd:      { padding: "36px", textAlign: "center", fontSize: "13px", color: "#94a3b8" },
};

/* ── KPI Card ── */
function KpiCard({ label, value, icon, iconBg, border }) {
  return (
    <div style={S.kpiCard(border)}>
      <div style={S.kpiLeft}>
        <span style={S.kpiLabel}>{label}</span>
        <span style={S.kpiValue}>{value}</span>
      </div>
      <div style={S.kpiIcon(iconBg)}>{icon}</div>
    </div>
  );
}

/* ── main ── */
export default function CustomerReportPage() {
  const navigate = useNavigate();

  const [report,    setReport]    = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [hoveredRow, setHoveredRow] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportData, customerData] = await Promise.all([
        getCustomerReport(),
        getCustomerList(),
      ]);
      setReport(reportData);
      setCustomers(Array.isArray(customerData) ? customerData : []);
    } catch (err) {
      console.error("Customer report load failed:", err);
      setError("Failed to load customer report. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* guards */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f1f5f9" }}>
      <p style={{ color: "#64748b", fontSize: "15px" }}>Loading Customer Report…</p>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "12px" }}>
      <p style={{ color: "#dc2626" }}>{error}</p>
      <button onClick={fetchAll} style={{ padding: "9px 20px", borderRadius: "7px", background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600" }}>Retry</button>
    </div>
  );

  /* derived */
  const avgCustomerValue = report.totalCustomers > 0
    ? (report.totalPurchaseAmount / report.totalCustomers).toFixed(2)
    : "0.00";

  /* search: name or phone */
  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.customerName ?? "").toLowerCase().includes(q) ||
      (c.phone        ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={S.page}>

      {/* ── Header ── */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={S.breadcrumb}>Reports / <span style={{ color: "#0f172a" }}>Customer Report</span></span>
          <h1 style={S.pageTitle}>Customer Report</h1>
          <p style={S.pageSubtitle}>Customer purchase history and spending analysis</p>
        </div>
        <button style={S.backBtn} onClick={() => navigate("/admin/reports")}>← Back</button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={S.kpiGrid}>
        <KpiCard label="Total Customers"     value={report.totalCustomers}                                               icon="👥" iconBg="#eff6ff" border="#3b82f6" />
        <KpiCard label="Total Orders"        value={report.totalOrders}                                                  icon="🛒" iconBg="#f0fdf4" border="#16a34a" />
        <KpiCard label="Total Purchase"      value={`₹${(report.totalPurchaseAmount ?? 0).toLocaleString("en-IN")}`}    icon="💰" iconBg="#faf5ff" border="#9333ea" />
        <KpiCard label="Avg. Customer Value" value={`₹${parseFloat(avgCustomerValue).toLocaleString("en-IN")}`}         icon="📊" iconBg="#fffbeb" border="#f59e0b" />
      </div>

      {/* ── Insights ── */}
      <div style={S.insightsBox}>
        <p style={S.insightsTitle}>📊 Dashboard Insights</p>
        <div style={S.insightsGrid}>
          <div style={S.insightCard("#3b82f6")}>
            <p style={S.insightLabel}>Total Customers</p>
            <p style={S.insightValue("#3b82f6")}>{report.totalCustomers}</p>
            <p style={S.insightSub}>Registered customers</p>
          </div>
          <div style={S.insightCard("#16a34a")}>
            <p style={S.insightLabel}>Total Orders</p>
            <p style={S.insightValue("#16a34a")}>{report.totalOrders}</p>
            <p style={S.insightSub}>Across all customers</p>
          </div>
          <div style={S.insightCard("#9333ea")}>
            <p style={S.insightLabel}>Total Purchase</p>
            <p style={S.insightValue("#9333ea")}>₹{(report.totalPurchaseAmount ?? 0).toLocaleString("en-IN")}</p>
            <p style={S.insightSub}>Cumulative spend</p>
          </div>
          <div style={S.insightCard("#f59e0b")}>
            <p style={S.insightLabel}>Avg. Customer Value</p>
            <p style={S.insightValue("#f59e0b")}>₹{parseFloat(avgCustomerValue).toLocaleString("en-IN")}</p>
            <p style={S.insightSub}>Revenue per customer</p>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={S.toolbar}>
        <input
          type="text"
          placeholder="🔍 Search by name or mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={S.searchInput}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button style={S.toolBtn("#fee2e2", "#dc2626")} onClick={() => window.print()}>📄 Export PDF</button>
          <button style={S.toolBtn("#dcfce7", "#16a34a")} onClick={() => alert("Export Excel: wire up your backend endpoint.")}>📊 Export Excel</button>
          <button style={S.toolBtn("#f3f4f6", "#374151")} onClick={() => window.print()}>🖨️ Print</button>
        </div>
      </div>

      {/* ── Customer Table ── */}
      <div style={S.tableBox}>
        <div style={S.tableHeader}>
          <span style={S.tableTitle}>Customer List</span>
          <span style={S.tableCount}>{filteredCustomers.length} customers</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["#", "Customer Name", "Mobile", "Total Orders", "Purchase Amount"].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={S.emptyTd}>No records found.</td>
                </tr>
              ) : (
                filteredCustomers.map((customer, i) => (
                  <tr
                    key={customer.customerId}
                    onMouseEnter={() => setHoveredRow(customer.customerId)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{ background: hoveredRow === customer.customerId ? "#f8fafc" : "transparent", transition: "background 0.15s" }}
                  >
                    <td style={S.td}>{i + 1}</td>
                    <td
                      style={S.tdLink}
                      onClick={() => navigate(`/store/reports/customers/${customer.customerId}`)}
                    >
                      {customer.customerName}
                    </td>
                    <td style={S.td}>{customer.phone}</td>
                    <td style={{ ...S.td, textAlign: "center" }}>{customer.totalOrders}</td>
                    <td style={S.tdBold}>₹{(customer.totalPurchaseAmount ?? 0).toLocaleString("en-IN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
