import { useEffect, useMemo, useState } from "react";
import {
  CalendarX,
  Clock,
  Download,
  Layers,
  ListChecks,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  downloadVendorOrders,
  getVendorOrders,
} from "../../../services/vendorOrderService";

const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const messageOf = (error) =>
  error?.response?.data?.message || "Unable to load vendor orders";

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

const DETAIL_COLS = ["14%", "13%", "12%", "21%", "9%", "11%", "10%", "10%"];
const SUMMARY_COLS = ["16%", "14%", "24%", "10%", "16%", "10%", "10%"];

export default function VendorOrdersSection() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState({ orders: [], summary: [] });
  const [vendor, setVendor] = useState("");
  const [store, setStore] = useState("");
  const [view, setView] = useState("detail");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [user] = useState(readUser);
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getVendorOrders(date));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [date]);

  const vendors = useMemo(
    () => [
      ...new Map(
        (data.orders || []).map((row) => [
          row.vendorId,
          { id: row.vendorId, name: row.vendorName },
        ]),
      ).values(),
    ],
    [data.orders],
  );

  const stores = useMemo(
    () => [
      ...new Map(
        (data.orders || []).map((row) => [
          row.storeId,
          { id: row.storeId, name: row.storeName },
        ]),
      ).values(),
    ],
    [data.orders],
  );

  const filteredOrders = (data.orders || []).filter(
    (row) =>
      (!vendor || String(row.vendorId) === vendor) &&
      (!store || String(row.storeId) === store),
  );

  const filteredSummary = (data.summary || []).filter(
    (row) =>
      (!vendor || String(row.vendorId) === vendor) &&
      (!store || String(row.storeId) === store),
  );

  const pendingQuantity = filteredOrders
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + r.requiredQuantity, 0);

  const exportFile = async () => {
    setLoading(true);
    setError("");
    try {
      await downloadVendorOrders(date, vendor, store);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  };

  const rows = view === "detail" ? filteredOrders : filteredSummary;
  const totalOrders = data.orders?.length || 0;
  const hasRows = rows.length > 0;
  const noDataForDate = totalOrders === 0;
  const emptyMessage = noDataForDate
    ? "No vendor orders recorded for this date."
    : "No rows match the current filters.";
  const emptyHint = noDataForDate
    ? "Choose a different date, or refresh to check for new orders."
    : "Clear the vendor or store filter to see all orders for this date.";
  const EmptyIcon = noDataForDate ? CalendarX : Search;
  const colCount = view === "detail" ? 8 : 7;

  return (
    <section className="flex flex-col gap-4 py-1 text-slate-800">
      {/* Top Header */}
      <header className="flex items-center justify-between gap-6 flex-wrap p-4 px-5 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="flex flex-col items-start gap-1 min-w-0 text-left">
          <span className="text-slate-500 text-[11px] font-bold tracking-wider uppercase leading-none">
            Purchases
          </span>
          <h1 className="m-0 text-slate-900 text-2xl font-bold tracking-tight leading-tight whitespace-nowrap">
            Vendor Orders
          </h1>
        </div>

        <div className="flex items-end justify-end gap-3.5 flex-wrap ml-auto">
          <label className="flex flex-col gap-1.5 text-slate-500 text-[11px] font-bold tracking-wider leading-none">
            <span>Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-[38px] w-[150px] px-3 border border-slate-300 rounded-md bg-white text-slate-900 text-xs font-medium outline-none hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-slate-500 text-[11px] font-bold tracking-wider leading-none">
            <span>Vendor</span>
            <select
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="h-[38px] w-[170px] px-3 border border-slate-300 rounded-md bg-white text-slate-900 text-xs font-medium outline-none hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
            >
              <option value="">All vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>

          {isSuperAdmin && (
            <label className="flex flex-col gap-1.5 text-slate-500 text-[11px] font-bold tracking-wider leading-none">
              <span>Store</span>
              <select
                value={store}
                onChange={(e) => setStore(e.target.value)}
                className="h-[38px] w-[170px] px-3 border border-slate-300 rounded-md bg-white text-slate-900 text-xs font-medium outline-none hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="">All stores</option>
                {stores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            className="h-[38px] w-[38px] inline-flex items-center justify-center border border-slate-300 rounded-md bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 cursor-pointer disabled:opacity-50 transition"
            onClick={load}
            disabled={loading}
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            className="h-[38px] px-4 inline-flex items-center justify-center gap-2 border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50 transition"
            onClick={exportFile}
            disabled={loading}
          >
            <Download size={15} /> Export Daily Excel
          </button>
        </div>
      </header>

      {error && (
        <p className="m-0 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-xs font-medium">
          {error}
        </p>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3.5 p-3.5 px-4 bg-[#f8fbff] border border-[#dbeafe] border-l-[3px] border-l-blue-600 rounded-lg shadow-sm">
          <span className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
            <ListChecks size={17} />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Lead requirements
            </span>
            <span className="text-xl font-extrabold text-slate-900 leading-tight">
              {filteredOrders.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-3.5 px-4 bg-[#f7fdf9] border border-[#bbf7d0] border-l-[3px] border-l-emerald-600 rounded-lg shadow-sm">
          <span className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 flex-shrink-0">
            <Layers size={17} />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Consolidated lines
            </span>
            <span className="text-xl font-extrabold text-slate-900 leading-tight">
              {filteredSummary.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-3.5 px-4 bg-[#fffaf5] border border-[#fed7aa] border-l-[3px] border-l-amber-600 rounded-lg shadow-sm">
          <span className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-amber-100 text-amber-600 flex-shrink-0">
            <Clock size={17} />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pending quantity
            </span>
            <span className="text-xl font-extrabold text-slate-900 leading-tight">
              {pendingQuantity}
            </span>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div
          className="flex items-center gap-2 p-2 px-3 border-b border-slate-200 bg-slate-50/60"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "detail"}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${
              view === "detail"
                ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setView("detail")}
          >
            Lead details
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "summary"}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${
              view === "summary"
                ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setView("summary")}
          >
            Vendor summary
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed text-xs">
            <colgroup>
              {(view === "detail" ? DETAIL_COLS : SUMMARY_COLS).map(
                (width, i) => (
                  <col key={i} style={{ width }} />
                ),
              )}
            </colgroup>
            <thead>
              {view === "detail" ? (
                <tr className="bg-slate-50 border-b border-slate-200 text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Lead</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Store</th>
                  <th className="py-2.5 px-3">Part / Product</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Vendor Qty</th>
                  <th className="py-2.5 px-3">ETA</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              ) : (
                <tr className="bg-slate-50 border-b border-slate-200 text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Store</th>
                  <th className="py-2.5 px-3">Part / Product</th>
                  <th className="py-2.5 px-3 text-right">Total Qty</th>
                  <th className="py-2.5 px-3">Leads</th>
                  <th className="py-2.5 px-3">ETA</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              )}
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="text-center py-10 text-slate-500"
                  >
                    Loading vendor orders…
                  </td>
                </tr>
              ) : hasRows ? (
                view === "detail" ? (
                  filteredOrders.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-2.5 px-3 align-top">
                        <strong className="block font-bold text-slate-900">
                          {row.leadNumber}
                        </strong>
                        <small className="block text-slate-500 text-[10.5px]">
                          {row.customerName}
                        </small>
                      </td>
                      <td className="py-2.5 px-3 align-top text-slate-700">
                        {row.vendorName}
                      </td>
                      <td className="py-2.5 px-3 align-top text-slate-700">
                        {row.storeName}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <strong className="block font-bold text-slate-900">
                          {row.partNumber}
                        </strong>
                        <small className="block text-slate-500 text-[10.5px]">
                          {row.productName} · {row.brandName}
                        </small>
                      </td>
                      <td className="py-2.5 px-3 align-top text-right font-semibold text-slate-900">
                        {row.requiredQuantity}
                      </td>
                      <td className="py-2.5 px-3 align-top text-right text-slate-700">
                        {row.vendorAvailableQuantity}
                      </td>
                      <td className="py-2.5 px-3 align-top text-slate-600">
                        {row.estimatedAvailabilityDate || "—"}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <Status value={row.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredSummary.map((row, index) => (
                    <tr
                      key={`${row.vendorId}-${row.storeId}-${row.partNumber}-${row.status}-${index}`}
                      className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-2.5 px-3 align-top text-slate-700">
                        {row.vendorName}
                      </td>
                      <td className="py-2.5 px-3 align-top text-slate-700">
                        {row.storeName}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <strong className="block font-bold text-slate-900">
                          {row.partNumber}
                        </strong>
                        <small className="block text-slate-500 text-[10.5px]">
                          {row.productName} · {row.brandName}
                        </small>
                      </td>
                      <td className="py-2.5 px-3 align-top text-right font-bold text-slate-900">
                        <strong>{row.totalRequiredQuantity}</strong>
                      </td>
                      <td className="py-2.5 px-3 align-top text-slate-700">
                        {row.leadNumbers.join(", ")}
                      </td>
                      <td className="py-2.5 px-3 align-top text-slate-600">
                        {row.estimatedAvailabilityDate || "—"}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <Status value={row.status} />
                      </td>
                    </tr>
                  ))
                )
              ) : (
                <tr>
                  <td colSpan={colCount} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-slate-500">
                      <span className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <EmptyIcon size={22} />
                      </span>
                      <h3 className="m-0 text-sm font-semibold text-slate-700">
                        {emptyMessage}
                      </h3>
                      <p className="m-0 text-xs text-slate-400">{emptyHint}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Status({ value }) {
  const v = String(value || "").toUpperCase();
  const badgeClass =
    v === "CONFIRMED" || v === "RECEIVED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : v === "CANCELLED"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeClass}`}
    >
      {value}
    </span>
  );
}
