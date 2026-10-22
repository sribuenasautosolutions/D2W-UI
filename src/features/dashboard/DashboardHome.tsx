import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  getDashboard,
  getStoreDashboard,
  getStorePerformance,
} from "../../services/dashboardService";

const number = (value) => Number(value || 0).toLocaleString("en-IN");
const money = (value) =>
  `\u20B9 ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const TONE_CLASSES = {
  blue: { icon: "bg-blue-50 text-blue-600", bar: "before:bg-blue-600" },
  green: {
    icon: "bg-emerald-50 text-emerald-600",
    bar: "before:bg-emerald-600",
  },
  violet: { icon: "bg-purple-50 text-purple-600", bar: "before:bg-purple-600" },
  cyan: { icon: "bg-cyan-50 text-cyan-600", bar: "before:bg-cyan-600" },
  orange: { icon: "bg-orange-50 text-orange-600", bar: "before:bg-orange-600" },
  indigo: { icon: "bg-indigo-50 text-indigo-600", bar: "before:bg-indigo-600" },
  red: { icon: "bg-red-50 text-red-600", bar: "before:bg-red-600" },
};

export default function DashboardHome() {
  const isSuperAdmin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"))?.role === "SUPER_ADMIN";
    } catch {
      return false;
    }
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
          setError(
            storeError.response?.data?.message ||
              "Dashboard totals loaded, but store performance is unavailable.",
          );
        }
      } else {
        setStores([]);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  useEffect(() => {
    setPage(0);
  }, [search, type, sort]);
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
        setError(
          requestError.response?.data?.message ||
            "Unable to load the selected store dashboard.",
        );
      })
      .finally(() => setStoreLoading(false));
  }, [selectedStoreId]);

  const filteredStores = useMemo(() => {
    const query = search.trim().toLowerCase();
    return stores
      .filter(
        (store) =>
          (!type || store.storeType === type) &&
          (!query ||
            [store.storeName, store.storeCode, store.storeType].some((value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(query),
            )),
      )
      .slice()
      .sort(
        (left, right) => Number(right[sort] || 0) - Number(left[sort] || 0),
      );
  }, [search, sort, stores, type]);
  const pageCount = Math.max(1, Math.ceil(filteredStores.length / pageSize));
  const visibleStores = filteredStores.slice(
    page * pageSize,
    page * pageSize + pageSize,
  );

  const organizationCards = dashboard
    ? [
        {
          label: "Total revenue",
          value: money(dashboard.totalRevenue),
          icon: IndianRupee,
          tone: "blue",
        },
        {
          label: "Today's earnings",
          value: money(dashboard.todaySales),
          icon: TrendingUp,
          tone: "green",
        },
        {
          label: "Today's completed orders",
          value: number(dashboard.todayOrders),
          icon: CalendarCheck,
          tone: "cyan",
        },
        {
          label: "Active stores",
          value: number(dashboard.totalStores),
          icon: Building2,
          tone: "green",
        },
        {
          label: "Customers",
          value: number(dashboard.totalCustomers),
          icon: Users,
          tone: "cyan",
        },
        {
          label: "Store inventory items",
          value: number(dashboard.inventoryItems),
          icon: Package,
          tone: "violet",
        },
        {
          label: "Stock quantity",
          value: number(dashboard.stockQuantity),
          icon: Boxes,
          tone: "indigo",
        },
        {
          label: "Inventory selling value",
          value: money(dashboard.inventoryValue),
          icon: ShoppingBag,
          tone: "orange",
        },
        {
          label: "Out of stock",
          value: number(dashboard.outOfStockItems),
          icon: AlertTriangle,
          tone: "red",
        },
      ]
    : [];
  const storeCards = storeDashboard
    ? [
        {
          label: "Store revenue",
          value: money(storeDashboard.revenue),
          icon: IndianRupee,
          tone: "blue",
        },
        {
          label: "Today's earnings",
          value: money(storeDashboard.todayEarnings),
          icon: TrendingUp,
          tone: "green",
        },
        {
          label: "Today's completed orders",
          value: number(storeDashboard.todayOrders),
          icon: CalendarCheck,
          tone: "cyan",
        },
        {
          label: "Completed orders",
          value: number(storeDashboard.totalOrders),
          icon: ShoppingBag,
          tone: "green",
        },
        {
          label: "Customers",
          value: number(storeDashboard.totalCustomers),
          icon: Users,
          tone: "cyan",
        },
        {
          label: "Store inventory items",
          value: number(storeDashboard.inventoryItems),
          icon: Package,
          tone: "violet",
        },
        {
          label: "Stock quantity",
          value: number(storeDashboard.stockQuantity),
          icon: Boxes,
          tone: "indigo",
        },
        {
          label: "Inventory selling value",
          value: money(storeDashboard.inventoryValue),
          icon: Building2,
          tone: "orange",
        },
        {
          label: "Low stock",
          value: number(storeDashboard.lowStockItems),
          icon: AlertTriangle,
          tone: "orange",
        },
        {
          label: "Out of stock",
          value: number(storeDashboard.outOfStockItems),
          icon: AlertTriangle,
          tone: "red",
        },
      ]
    : [];
  const cards = selectedStoreId ? storeCards : organizationCards;

  return (
    <section className="grid gap-4 text-slate-900 bg-white">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-[82px] p-4 sm:p-5 border border-slate-200 rounded-lg bg-white shadow-sm">
        <div>
          <span className="text-blue-600 text-[11px] font-bold uppercase tracking-wider">
            {selectedStoreId ? "Store overview" : "Organization overview"}
          </span>
          <h1 className="my-1 text-2xl font-bold text-slate-900">
            {storeDashboard?.storeName || "Dashboard"}
          </h1>
          <p className="m-0 text-slate-500 text-xs">
            {storeDashboard
              ? `${storeDashboard.storeCode || "No store code"} | ${storeDashboard.storeType?.replaceAll("_", " ") || "Store"}`
              : "Live operational totals across the D2W network."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {isSuperAdmin && (
            <select
              aria-label="Dashboard store"
              value={selectedStoreId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
              className="h-[38px] min-w-0 sm:min-w-[260px] border border-slate-300 rounded-md bg-white px-3 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Stores</option>
              {stores.map((store) => (
                <option key={store.storeId} value={store.storeId}>
                  {store.storeName} ({store.storeCode})
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            title="Refresh dashboard"
            onClick={loadDashboard}
            disabled={loading || storeLoading}
            className="h-[38px] px-3 border border-slate-300 rounded-md bg-white text-slate-700 flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer hover:border-blue-600 hover:text-blue-700 disabled:opacity-65 transition-colors"
          >
            <RefreshCw
              size={16}
              className={loading || storeLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="p-3 border border-red-200 rounded bg-red-50 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {loading && !dashboard ? (
        <div className="h-[220px] border border-slate-200 rounded-md bg-white grid place-items-center text-slate-500 text-sm">
          Loading dashboard...
        </div>
      ) : (
        <>
          {storeLoading ? (
            <div className="h-[220px] border border-slate-200 rounded-md bg-white grid place-items-center text-slate-500 text-sm">
              Loading store dashboard...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {cards.map(({ label, value, icon: Icon, tone }) => {
                const toneConfig = TONE_CLASSES[tone] || {
                  icon: "bg-slate-50 text-slate-600",
                  bar: "before:bg-slate-400",
                };
                return (
                  <article
                    key={label}
                    className={`relative min-h-[78px] border border-slate-200 rounded-md bg-white flex items-center gap-3 p-4 shadow-sm overflow-hidden before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-1 ${toneConfig.bar}`}
                  >
                    <div
                      className={`w-[38px] h-[38px] rounded-md grid place-items-center flex-none ${toneConfig.icon}`}
                    >
                      <Icon size={19} />
                    </div>
                    <div className="grid gap-1 min-w-0">
                      <span className="text-[11px] text-slate-500 truncate">
                        {label}
                      </span>
                      <strong className="text-xl font-bold text-slate-900 truncate">
                        {value}
                      </strong>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Restock Attention Banner */}
          <div className="min-h-[76px] border border-amber-200 border-l-4 border-l-orange-500 rounded-md bg-amber-50/60 px-4 py-3 flex items-center justify-between text-orange-700">
            <div className="grid gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                Inventory attention
              </span>
              <strong className="text-sm font-semibold text-orange-950">
                {number(
                  storeDashboard?.outOfStockItems ?? dashboard?.outOfStockItems,
                )}{" "}
                products require restocking
              </strong>
              <p className="m-0 text-xs text-orange-800">
                {storeDashboard
                  ? `Stock alerts for ${storeDashboard.storeName}.`
                  : "Open Inventory to review affected stores and receive stock."}
              </p>
            </div>
            <AlertTriangle
              size={23}
              className="text-orange-500 flex-shrink-0"
            />
          </div>

          {/* Store Performance Section */}
          {isSuperAdmin && (
            <section className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
              <header className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200">
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900 m-0">
                    Store performance
                  </h2>
                  <p className="text-[11px] text-slate-500 m-0">
                    Sales and inventory health by active store.
                  </p>
                </div>
                <span className="text-xs text-slate-600 font-medium">
                  {filteredStores.length} stores
                </span>
              </header>

              {/* Tools Bar */}
              <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,1fr)_190px] gap-2 p-3 bg-slate-50/50 border-b border-slate-200">
                <label className="h-[35px] border border-slate-300 rounded bg-white flex items-center gap-2 px-2.5 text-slate-500 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search store or code"
                    className="w-full border-0 outline-none text-xs text-slate-900 bg-transparent"
                  />
                </label>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="h-[35px] border border-slate-300 rounded bg-white px-2.5 text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">All store types</option>
                  {[
                    ...new Set(
                      stores.map((store) => store.storeType).filter(Boolean),
                    ),
                  ].map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>

                <div className="col-span-full flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mr-1">
                    Sort stores by
                  </span>
                  {[
                    { key: "revenue", label: "Revenue" },
                    { key: "totalOrders", label: "Orders" },
                    { key: "totalStock", label: "Stock" },
                    { key: "inventoryValue", label: "Inventory value" },
                    { key: "outOfStockItems", label: "Out of stock" },
                  ].map((metric) => (
                    <button
                      type="button"
                      key={metric.key}
                      onClick={() => setSort(metric.key)}
                      className={`h-[29px] px-3 border rounded text-[11px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                        sort === metric.key
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                      }`}
                    >
                      {metric.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="h-[34px] px-3 text-left font-bold text-[9px] uppercase tracking-wider text-slate-500">
                        Store
                      </th>
                      <th className="h-[34px] px-3 text-left font-bold text-[9px] uppercase tracking-wider text-slate-500">
                        Type
                      </th>
                      <th className="h-[34px] px-3 text-right font-bold text-[9px] uppercase tracking-wider text-slate-500">
                        Completed Orders
                      </th>
                      <th className="h-[34px] px-3 text-right font-bold text-[9px] uppercase tracking-wider text-slate-500">
                        Revenue
                      </th>
                      <th className="h-[34px] px-3 text-right font-bold text-[9px] uppercase tracking-wider text-slate-500">
                        Selling Value
                      </th>
                      <th className="h-[34px] px-3 text-right font-bold text-[9px] uppercase tracking-wider text-slate-500">
                        Stock Qty
                      </th>
                      <th className="h-[34px] px-3 text-right font-bold text-[9px] uppercase tracking-wider text-slate-500">
                        Low Stock
                      </th>
                      <th className="h-[34px] px-3 text-right font-bold text-[9px] uppercase tracking-wider text-slate-500">
                        Out of Stock
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStores.map((store) => (
                      <tr
                        key={store.storeId}
                        className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-3 py-2 text-left">
                          <strong className="block text-slate-900 font-semibold">
                            {store.storeName}
                          </strong>
                          <small className="text-slate-500 text-[10px]">
                            {store.storeCode || "-"}
                          </small>
                        </td>
                        <td className="px-3 py-2 text-left">
                          <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-bold uppercase">
                            {store.storeType?.replaceAll("_", " ") || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {number(store.totalOrders)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">
                          {money(store.revenue)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {money(store.inventoryValue)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {number(store.totalStock)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${Number(store.lowStockItems) > 0 ? "text-amber-600 font-bold" : "text-slate-600"}`}
                        >
                          {number(store.lowStockItems)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${Number(store.outOfStockItems) > 0 ? "text-red-600 font-bold" : "text-slate-600"}`}
                        >
                          {number(store.outOfStockItems)}
                        </td>
                      </tr>
                    ))}
                    {!visibleStores.length && (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-8 text-slate-500 text-xs"
                        >
                          No stores match these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <footer className="h-11 px-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 bg-white">
                <span>
                  {filteredStores.length
                    ? `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, filteredStores.length)} of ${filteredStores.length}`
                    : "0 stores"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Previous page"
                    disabled={page === 0}
                    onClick={() => setPage((current) => current - 1)}
                    className="w-7 h-7 border border-slate-200 rounded grid place-items-center hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <strong className="text-slate-800 font-semibold">
                    {page + 1} / {pageCount}
                  </strong>
                  <button
                    type="button"
                    title="Next page"
                    disabled={page + 1 >= pageCount}
                    onClick={() => setPage((current) => current + 1)}
                    className="w-7 h-7 border border-slate-200 rounded grid place-items-center hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </footer>
            </section>
          )}
        </>
      )}
    </section>
  );
}
