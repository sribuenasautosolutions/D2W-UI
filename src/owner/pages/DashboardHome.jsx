import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, Building2, CalendarCheck, ChevronLeft, ChevronRight, IndianRupee, Package, RefreshCw, Search, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { getDashboard, getStoreDashboard, getStorePerformance } from "../../services/dashboardService";
import "./DashboardHome.css";

const number = (value) => Number(value || 0).toLocaleString("en-IN");
const money = (value) => `\u20B9 ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function DashboardHome() {
  const isSuperAdmin = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user"))?.role === "SUPER_ADMIN"; }
    catch { return false; }
  }, []);
  const [dashboard, setDashboard] = useState(null);
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [storeDashboard, setStoreDashboard] = useState(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("revenue");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const dashboardData = await getDashboard();
      setDashboard(dashboardData);
      if (isSuperAdmin) {
        try {
          const storeData = await getStorePerformance();
          setStores(Array.isArray(storeData) ? storeData : []);
        } catch (storeError) {
          setError(storeError.response?.data?.message || "Dashboard totals loaded, but store performance is unavailable.");
        }
      } else {
        setStores([]);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load dashboard data.");
    } finally { setLoading(false); }
  }, [isSuperAdmin]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { setPage(0); }, [search, type, sort]);
  useEffect(() => {
    if (!selectedStoreId) {
      setStoreDashboard(null);
      return;
    }
    setStoreLoading(true);
    setError("");
    getStoreDashboard(selectedStoreId)
      .then(setStoreDashboard)
      .catch((requestError) => {
        setStoreDashboard(null);
        setError(requestError.response?.data?.message || "Unable to load the selected store dashboard.");
      })
      .finally(() => setStoreLoading(false));
  }, [selectedStoreId]);

  const filteredStores = useMemo(() => {
    const query = search.trim().toLowerCase();
    return stores.filter((store) => (!type || store.storeType === type) && (!query ||
      [store.storeName, store.storeCode, store.storeType].some((value) => String(value ?? "").toLowerCase().includes(query))))
      .slice()
      .sort((left, right) => Number(right[sort] || 0) - Number(left[sort] || 0));
  }, [search, sort, stores, type]);
  const pageCount = Math.max(1, Math.ceil(filteredStores.length / pageSize));
  const visibleStores = filteredStores.slice(page * pageSize, page * pageSize + pageSize);

  const organizationCards = dashboard ? [
    { label: "Total revenue", value: money(dashboard.totalRevenue), icon: IndianRupee, tone: "blue" },
    { label: "Today's earnings", value: money(dashboard.todaySales), icon: TrendingUp, tone: "green" },
    { label: "Today's completed orders", value: number(dashboard.todayOrders), icon: CalendarCheck, tone: "cyan" },
    { label: "Active stores", value: number(dashboard.totalStores), icon: Building2, tone: "green" },
    { label: "Customers", value: number(dashboard.totalCustomers), icon: Users, tone: "cyan" },
    { label: "Store inventory items", value: number(dashboard.inventoryItems), icon: Package, tone: "violet" },
    { label: "Stock quantity", value: number(dashboard.stockQuantity), icon: Boxes, tone: "indigo" },
    { label: "Inventory selling value", value: money(dashboard.inventoryValue), icon: ShoppingBag, tone: "orange" },
    { label: "Out of stock", value: number(dashboard.outOfStockItems), icon: AlertTriangle, tone: "red" },
  ] : [];
  const storeCards = storeDashboard ? [
    { label: "Store revenue", value: money(storeDashboard.revenue), icon: IndianRupee, tone: "blue" },
    { label: "Today's earnings", value: money(storeDashboard.todayEarnings), icon: TrendingUp, tone: "green" },
    { label: "Today's completed orders", value: number(storeDashboard.todayOrders), icon: CalendarCheck, tone: "cyan" },
    { label: "Completed orders", value: number(storeDashboard.totalOrders), icon: ShoppingBag, tone: "green" },
    { label: "Customers", value: number(storeDashboard.totalCustomers), icon: Users, tone: "cyan" },
    { label: "Store inventory items", value: number(storeDashboard.inventoryItems), icon: Package, tone: "violet" },
    { label: "Stock quantity", value: number(storeDashboard.stockQuantity), icon: Boxes, tone: "indigo" },
    { label: "Inventory selling value", value: money(storeDashboard.inventoryValue), icon: Building2, tone: "orange" },
    { label: "Low stock", value: number(storeDashboard.lowStockItems), icon: AlertTriangle, tone: "orange" },
    { label: "Out of stock", value: number(storeDashboard.outOfStockItems), icon: AlertTriangle, tone: "red" },
  ] : [];
  const cards = selectedStoreId ? storeCards : organizationCards;

  return <section className="erp-dashboard">
    <header className="erp-dashboard__header"><div><span>{selectedStoreId ? "Store overview" : "Organization overview"}</span><h1>{storeDashboard?.storeName || "Dashboard"}</h1><p>{storeDashboard ? `${storeDashboard.storeCode || "No store code"} | ${storeDashboard.storeType?.replaceAll("_", " ") || "Store"}` : "Live operational totals across the D2W network."}</p></div><div className="erp-dashboard__actions">{isSuperAdmin && <select aria-label="Dashboard store" value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}><option value="">All Stores</option>{stores.map((store) => <option key={store.storeId} value={store.storeId}>{store.storeName} ({store.storeCode})</option>)}</select>}<button type="button" title="Refresh dashboard" onClick={loadDashboard} disabled={loading || storeLoading}><RefreshCw size={16} className={loading || storeLoading ? "is-spinning" : ""} />Refresh</button></div></header>
    {error && <div className="erp-dashboard__error">{error}</div>}
    {loading && !dashboard ? <div className="erp-dashboard__state">Loading dashboard...</div> : <>
      {storeLoading ? <div className="erp-dashboard__state">Loading store dashboard...</div> : <div className="erp-dashboard__kpis">{cards.map(({ label, value, icon: Icon, tone }) => <article className={`erp-kpi erp-kpi--${tone}`} key={label}><div className="erp-kpi__icon"><Icon size={19} /></div><div><span>{label}</span><strong>{value}</strong></div></article>)}</div>}
      <div className="erp-dashboard__focus"><div><span>Inventory attention</span><strong>{number(storeDashboard?.outOfStockItems ?? dashboard?.outOfStockItems)} products require restocking</strong><p>{storeDashboard ? `Stock alerts for ${storeDashboard.storeName}.` : "Open Inventory to review affected stores and receive stock."}</p></div><AlertTriangle size={23} /></div>
      {isSuperAdmin && <section className="store-performance">
        <header><div><h2>Store performance</h2><p>Sales and inventory health by active store.</p></div><span>{filteredStores.length} stores</span></header>
        <div className="store-performance__tools"><label><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search store or code" /></label><select value={type} onChange={(event) => setType(event.target.value)}><option value="">All store types</option>{[...new Set(stores.map((store) => store.storeType).filter(Boolean))].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><div className="store-performance__rank" aria-label="Sort stores by metric"><span>Sort stores by</span>{[{ key: "revenue", label: "Revenue" }, { key: "totalOrders", label: "Orders" }, { key: "totalStock", label: "Stock" }, { key: "inventoryValue", label: "Inventory value" }, { key: "outOfStockItems", label: "Out of stock" }].map((metric) => <button type="button" key={metric.key} className={sort === metric.key ? "is-active" : ""} onClick={() => setSort(metric.key)}>{metric.label}</button>)}</div></div>
        <div className="store-performance__table-wrap"><table><thead><tr><th>Store</th><th>Type</th><th>Completed Orders</th><th>Revenue</th><th>Selling Value</th><th>Stock Qty</th><th>Low Stock</th><th>Out of Stock</th></tr></thead><tbody>{visibleStores.map((store) => <tr key={store.storeId}><td><strong>{store.storeName}</strong><small>{store.storeCode || "-"}</small></td><td><span className="store-type-badge">{store.storeType?.replaceAll("_", " ") || "-"}</span></td><td>{number(store.totalOrders)}</td><td><strong>{money(store.revenue)}</strong></td><td>{money(store.inventoryValue)}</td><td>{number(store.totalStock)}</td><td className={Number(store.lowStockItems) > 0 ? "is-warning" : ""}>{number(store.lowStockItems)}</td><td className={Number(store.outOfStockItems) > 0 ? "is-danger" : ""}>{number(store.outOfStockItems)}</td></tr>)}{!visibleStores.length && <tr><td colSpan="8" className="store-performance__empty">No stores match these filters.</td></tr>}</tbody></table></div>
        <footer><span>{filteredStores.length ? `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, filteredStores.length)} of ${filteredStores.length}` : "0 stores"}</span><div><button title="Previous page" disabled={page === 0} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={15} /></button><strong>{page + 1} / {pageCount}</strong><button title="Next page" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}><ChevronRight size={15} /></button></div></footer>
      </section>}
    </>}
  </section>;
}
