import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getSalesReport,
  getSalesOrders,
  getTopProducts,
  getTopCategories,
  getTopBrands,
  getTopVehicles,
} from "../../services/reportService";

// ── Helpers ──────────────────────────────────────────────
const fmt     = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function todayStr()       { return new Date().toISOString().slice(0, 10); }
function firstOfMonthStr(){ const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }

function getQuickRange(label) {
  const now  = new Date();
  const fmt0 = (d) => d.toISOString().slice(0, 10);
  switch (label) {
    case "Today":      return { from: fmt0(now), to: fmt0(now) };
    case "Yesterday":  { const d = new Date(now); d.setDate(d.getDate() - 1); return { from: fmt0(d), to: fmt0(d) }; }
    case "This Week":  { const m = new Date(now); m.setDate(now.getDate() - ((now.getDay() + 6) % 7)); return { from: fmt0(m), to: fmt0(now) }; }
    case "This Month": return { from: fmt0(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt0(now) };
    default:           return null;
  }
}

function downloadReport({ salesReport, salesOrders, topProducts, topCategories, topBrands }) {
  const rows = salesOrders.slice(0, 50).map(o =>
    `<tr>
      <td>INV-${String(o.orderId).padStart(4, "0")}</td>
      <td>${fmtDate(o.orderDate)}</td>
      <td>${o.customerName ?? "—"}</td>
      <td>${o.phone ?? "—"}</td>
      <td>${fmt(o.totalAmount)}</td>
      <td>${o.paymentMethod ?? "—"}</td>
    </tr>`
  ).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sales Report</title></head><body>
    <h1>Sales Report</h1>
    <p>Generated: ${new Date().toLocaleDateString("en-IN")}</p>
    <h2>Summary</h2>
    <table border="1" cellpadding="6">
      <tr><th>Total Orders</th><th>Total Revenue</th><th>Avg Order Value</th><th>Customers</th></tr>
      <tr>
        <td>${salesReport?.totalOrders ?? 0}</td>
        <td>${fmt(salesReport?.totalRevenue)}</td>
        <td>${salesReport?.totalOrders > 0 ? fmt(Math.round((salesReport.totalRevenue ?? 0) / salesReport.totalOrders)) : "₹0"}</td>
        <td>${salesReport?.totalCustomers ?? 0}</td>
      </tr>
    </table>
    <h2>Sales Orders (top 50)</h2>
    <table border="1" cellpadding="6">
      <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Mobile</th><th>Amount</th><th>Payment</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='6'>No orders found</td></tr>"}</tbody>
    </table>
    <h2>Top Products</h2>
    <table border="1" cellpadding="6">
      <thead><tr><th>#</th><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
      <tbody>${topProducts.slice(0, 10).map((p, i) => `<tr><td>${i + 1}</td><td>${p.productName}</td><td>${p.quantitySold}</td><td>${fmt(p.revenue)}</td></tr>`).join("") || "<tr><td colspan='4'>No data</td></tr>"}</tbody>
    </table>
    <h2>Top Categories</h2>
    <table border="1" cellpadding="6">
      <thead><tr><th>#</th><th>Category</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
      <tbody>${topCategories.slice(0, 10).map((c, i) => `<tr><td>${i + 1}</td><td>${c.categoryName}</td><td>${c.quantitySold}</td><td>${fmt(c.revenue)}</td></tr>`).join("") || "<tr><td colspan='4'>No data</td></tr>"}</tbody>
    </table>
    <h2>Top Brands</h2>
    <table border="1" cellpadding="6">
      <thead><tr><th>#</th><th>Brand</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
      <tbody>${topBrands.slice(0, 10).map((b, i) => `<tr><td>${i + 1}</td><td>${b.brandName}</td><td>${b.quantitySold}</td><td>${fmt(b.revenue)}</td></tr>`).join("") || "<tr><td colspan='4'>No data</td></tr>"}</tbody>
    </table>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Sales_Report_${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Constants ─────────────────────────────────────────────
const QUICK_RANGES  = ["Today", "Yesterday", "This Week", "This Month"];
const ITEMS_PER_PAGE = 10;
const TABS = [
  { key: "orders",     label: "Sales Orders"   },
  { key: "products",   label: "Top Products"   },
  { key: "categories", label: "Top Categories" },
  { key: "brands",     label: "Top Brands"     },
  { key: "vehicles",   label: "Top Vehicles"   },
];

// ── Main Component ────────────────────────────────────────
export default function SalesReportPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const storeId        = searchParams.get("storeId");

  const [salesReport,   setSalesReport]   = useState({ totalOrders: 0, totalRevenue: 0, totalCustomers: 0 });
  const [salesOrders,   setSalesOrders]   = useState([]);
  const [topProducts,   setTopProducts]   = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [topBrands,     setTopBrands]     = useState([]);
  const [topVehicles,   setTopVehicles]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  const [fromDate,    setFromDate]    = useState(firstOfMonthStr);
  const [toDate,      setToDate]      = useState(todayStr);
  const [activeQuick, setActiveQuick] = useState("This Month");
  const [search,      setSearch]      = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab,   setActiveTab]   = useState("orders");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [report, orders, products, categories, brands, vehicles] = await Promise.all([
        getSalesReport(storeId),
        getSalesOrders(storeId),
        getTopProducts(storeId),
        getTopCategories(storeId),
        getTopBrands(storeId),
        getTopVehicles(storeId),
      ]);
      setSalesReport(report);
      setSalesOrders(orders);
      setTopProducts(products);
      setTopCategories(categories);
      setTopBrands(brands);
      setTopVehicles(vehicles);
    } catch (err) {
      console.error(err);
      setError("Failed to load Sales Report. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Guards ──────────────────────────────────────────────
  if (loading) return <p>Loading Sales Report…</p>;
  if (error)   return (
    <div>
      <p>⚠️ {error}</p>
      <button onClick={fetchAll}>Retry</button>
    </div>
  );

  // ── Derived ─────────────────────────────────────────────
  const avgOrderValue = salesReport.totalOrders > 0
    ? Math.round(salesReport.totalRevenue / salesReport.totalOrders)
    : 0;

  const bestProduct  = topProducts[0]   ?? null;
  const bestBrand    = topBrands[0]     ?? null;
  const bestCategory = topCategories[0] ?? null;
  const bestVehicle  = topVehicles[0]   ?? null;

  // Payment breakdown
  const payMap = {};
  salesOrders.forEach(o => { payMap[o.paymentMethod] = (payMap[o.paymentMethod] ?? 0) + 1; });

  // Recent orders (last 8)
  const recentOrders = [...salesOrders]
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
    .slice(0, 8);

  // Filtered + paginated orders
  const filteredOrders = salesOrders.filter(o => {
    const q    = search.toLowerCase();
    const nm   = (o.customerName ?? "").toLowerCase().includes(q);
    const inv  = `INV-${String(o.orderId).padStart(4, "0")}`.toLowerCase().includes(q);
    const date = o.orderDate?.slice(0, 10) ?? "";
    return (nm || inv)
      && (fromDate ? date >= fromDate : true)
      && (toDate   ? date <= toDate   : true);
  });

  const totalPages      = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedOrders     = filteredOrders.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );
  const pageNums = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const s = Math.max(1, Math.min(safeCurrentPage - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, i) => s + i);
  })();

  // ── Render ───────────────────────────────────────────────
  return (
    <div>

      {/* Header */}
      <div>
        <span>Reports / Sales Report</span>
        <h1>Sales Report</h1>
        <p>Overview of your store performance</p>
        <button onClick={() => navigate(-1)}>← Back</button>
        <button onClick={() => downloadReport({ salesReport, salesOrders, topProducts, topCategories, topBrands })}>
          ⬇ Download Report
        </button>
      </div>

      {/* Toolbar */}
      <div>
        <label>
          From:&nbsp;
          <input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setActiveQuick("Custom"); }}
          />
        </label>
        &nbsp;
        <label>
          To:&nbsp;
          <input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setActiveQuick("Custom"); }}
          />
        </label>
        &nbsp;
        {QUICK_RANGES.map(q => (
          <button
            key={q}
            onClick={() => {
              setActiveQuick(q);
              const r = getQuickRange(q);
              if (r) { setFromDate(r.from); setToDate(r.to); }
            }}
          >
            {activeQuick === q ? <strong>{q}</strong> : q}
          </button>
        ))}
        &nbsp;
        <button onClick={() => setCurrentPage(1)}>Search</button>
        &nbsp;
        <button onClick={() => window.print()}>📄 PDF</button>
        &nbsp;
        <button onClick={() => alert("Export Excel: wire up your backend endpoint.")}>📊 Excel</button>
        &nbsp;
        <button onClick={() => alert("Email Report: wire up your backend endpoint.")}>✉️ Email</button>
        &nbsp;
        <button onClick={() => window.print()}>🖨️ Print</button>
      </div>

      <hr />

      {/* KPI Summary */}
      <h2>Summary</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Total Revenue</th>
            <th>Total Orders</th>
            <th>Avg. Order Value</th>
            <th>Unique Customers</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{fmt(salesReport.totalRevenue)}</td>
            <td>{salesReport.totalOrders}</td>
            <td>{fmt(avgOrderValue)}</td>
            <td>{salesReport.totalCustomers}</td>
          </tr>
        </tbody>
      </table>

      <hr />

      {/* Best Performers */}
      <h2>Top Performers</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr><th>Best Product</th><th>Best Brand</th><th>Best Category</th><th>Best Vehicle</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>{bestProduct  ? `${bestProduct.productName}  (${bestProduct.quantitySold} units · ${fmt(bestProduct.revenue)})`   : "—"}</td>
            <td>{bestBrand    ? `${bestBrand.brandName}       (${bestBrand.quantitySold} units · ${fmt(bestBrand.revenue)})`       : "—"}</td>
            <td>{bestCategory ? `${bestCategory.categoryName} (${bestCategory.quantitySold} units · ${fmt(bestCategory.revenue)})` : "—"}</td>
            <td>{bestVehicle  ? `${bestVehicle.vehicleName}   (${bestVehicle.quantitySold} units · ${fmt(bestVehicle.revenue)})`   : "—"}</td>
          </tr>
        </tbody>
      </table>

      <hr />

      {/* Payment Breakdown */}
      <h2>Payment Methods</h2>
      {Object.keys(payMap).length === 0 ? (
        <p>No payment data available.</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead><tr><th>Method</th><th>Orders</th></tr></thead>
          <tbody>
            {Object.entries(payMap).map(([method, count]) => (
              <tr key={method}><td>{method}</td><td>{count}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <hr />

      {/* Recent Orders */}
      <h2>Recent Orders (last 8)</h2>
      {recentOrders.length === 0 ? (
        <p>No recent orders.</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Amount</th><th>Payment</th></tr>
          </thead>
          <tbody>
            {recentOrders.map(o => (
              <tr key={o.orderId}>
                <td>INV-{String(o.orderId).padStart(4, "0")}</td>
                <td>{fmtDate(o.orderDate)}</td>
                <td>{o.customerName ?? "—"}</td>
                <td>{fmt(o.totalAmount)}</td>
                <td>{o.paymentMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr />

      {/* Tab Navigation */}
      <div>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
          >
            {activeTab === tab.key ? <strong>{tab.label}</strong> : tab.label}
          </button>
        ))}
      </div>

      {/* ── Sales Orders Tab ── */}
      {activeTab === "orders" && (
        <div>
          <h2>Sales Orders ({filteredOrders.length} records)</h2>
          <input
            type="text"
            placeholder="Search invoice or customer…"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>Invoice No</th><th>Date</th><th>Customer</th>
                <th>Mobile</th><th>Amount</th><th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {pagedOrders.length === 0 ? (
                <tr><td colSpan={6}>No orders found. Try adjusting the date range or search.</td></tr>
              ) : pagedOrders.map(order => (
                <tr key={order.orderId}>
                  <td>INV-{String(order.orderId).padStart(4, "0")}</td>
                  <td>{fmtDate(order.orderDate)}</td>
                  <td>{order.customerName}</td>
                  <td>{order.phone}</td>
                  <td>{fmt(order.totalAmount)}</td>
                  <td>{order.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div>
            <span>
              {filteredOrders.length === 0
                ? "No orders"
                : `Showing ${(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredOrders.length)} of ${filteredOrders.length}`}
            </span>
            &nbsp;
            <button disabled={safeCurrentPage === 1}         onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>‹</button>
            {pageNums.map(n => (
              <button key={n} onClick={() => setCurrentPage(n)}>
                {n === safeCurrentPage ? <strong>{n}</strong> : n}
              </button>
            ))}
            <button disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>›</button>
          </div>
        </div>
      )}

      {/* ── Top Products Tab ── */}
      {activeTab === "products" && (
        <div>
          <h2>Top Products ({topProducts.length})</h2>
          <table border="1" cellPadding="8">
            <thead><tr><th>#</th><th>Product Name</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr><td colSpan={4}>No product data available.</td></tr>
              ) : topProducts.map((p, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{p.productName}</td>
                  <td>{p.quantitySold}</td>
                  <td>{fmt(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Top Categories Tab ── */}
      {activeTab === "categories" && (
        <div>
          <h2>Top Categories ({topCategories.length})</h2>
          <table border="1" cellPadding="8">
            <thead><tr><th>#</th><th>Category</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {topCategories.length === 0 ? (
                <tr><td colSpan={4}>No category data available.</td></tr>
              ) : topCategories.map((c, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{c.categoryName}</td>
                  <td>{c.quantitySold}</td>
                  <td>{fmt(c.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Top Brands Tab ── */}
      {activeTab === "brands" && (
        <div>
          <h2>Top Brands ({topBrands.length})</h2>
          <table border="1" cellPadding="8">
            <thead><tr><th>#</th><th>Brand</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {topBrands.length === 0 ? (
                <tr><td colSpan={4}>No brand data available.</td></tr>
              ) : topBrands.map((b, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{b.brandName}</td>
                  <td>{b.quantitySold}</td>
                  <td>{fmt(b.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Top Vehicles Tab ── */}
      {activeTab === "vehicles" && (
        <div>
          <h2>Top Vehicles ({topVehicles.length})</h2>
          <table border="1" cellPadding="8">
            <thead><tr><th>#</th><th>Vehicle</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {topVehicles.length === 0 ? (
                <tr><td colSpan={4}>No vehicle data available.</td></tr>
              ) : topVehicles.map((v, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{v.vehicleName}</td>
                  <td>{v.quantitySold}</td>
                  <td>{fmt(v.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
