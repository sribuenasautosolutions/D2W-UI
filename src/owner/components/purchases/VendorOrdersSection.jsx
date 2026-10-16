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
import { downloadVendorOrders, getVendorOrders } from "../../../services/vendorOrderService";
import "./VendorOrdersSection.css";

const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const messageOf = (error) =>
  error?.response?.data?.message || "Unable to load vendor orders";

// Same user-read pattern used across the app (see CurrentStockSection.jsx)
function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

// Explicit column widths (each set sums to 100%)
// detail : Lead · Vendor · Store · Part/Product · Qty · Vendor Qty · ETA · Status
const DETAIL_COLS = ["14%", "13%", "12%", "21%", "9%", "11%", "10%", "10%"];
// summary: Vendor · Store · Part/Product · Total Qty · Leads · ETA · Status
const SUMMARY_COLS = ["16%", "14%", "24%", "10%", "16%", "10%", "10%"];

export default function VendorOrdersSection() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState({ orders: [], summary: [] });
  const [vendor, setVendor] = useState("");
  const [store, setStore] = useState("");
  const [view, setView] = useState("detail");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---- role gate ----
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
        ])
      ).values(),
    ],
    [data.orders]
  );

  const stores = useMemo(
    () => [
      ...new Map(
        (data.orders || []).map((row) => [
          row.storeId,
          { id: row.storeId, name: row.storeName },
        ])
      ).values(),
    ],
    [data.orders]
  );

  const filteredOrders = (data.orders || []).filter(
    (row) =>
      (!vendor || String(row.vendorId) === vendor) &&
      (!store || String(row.storeId) === store)
  );

  const filteredSummary = (data.summary || []).filter(
    (row) =>
      (!vendor || String(row.vendorId) === vendor) &&
      (!store || String(row.storeId) === store)
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
    <section className="vendor-orders">
      {/* ===== Unified top bar: title left · filters + export right ===== */}
      <header className="vendor-orders__header">
        <div className="vendor-orders__heading">
          <span className="vendor-orders__eyebrow">Purchases</span>
          <h1 className="vendor-orders__title">Vendor Orders</h1>
        </div>

        <div className="vendor-orders__controls">
          <label>
            <span>Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label>
            <span>Vendor</span>
            <select value={vendor} onChange={(e) => setVendor(e.target.value)}>
              <option value="">All vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>

          {isSuperAdmin && (
            <label>
              <span>Store</span>
              <select value={store} onChange={(e) => setStore(e.target.value)}>
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
            className="vendor-orders__refresh"
            onClick={load}
            disabled={loading}
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={loading ? "spinning" : ""} />
          </button>

          <button
            type="button"
            className="vendor-orders__export"
            onClick={exportFile}
            disabled={loading}
          >
            <Download size={15} /> Export Daily Excel
          </button>
        </div>
      </header>

      {error && <p className="vendor-orders__error">{error}</p>}

      {/* ===== Compact KPI row ===== */}
      <div className="vendor-orders__metrics">
        <div className="vendor-orders__metric vendor-orders__metric--blue">
          <span className="vendor-orders__metric-icon">
            <ListChecks size={17} />
          </span>
          <div className="vendor-orders__metric-body">
            <span className="vendor-orders__metric-label">Lead requirements</span>
            <span className="vendor-orders__metric-value">
              {filteredOrders.length}
            </span>
          </div>
        </div>
        <div className="vendor-orders__metric vendor-orders__metric--green">
          <span className="vendor-orders__metric-icon">
            <Layers size={17} />
          </span>
          <div className="vendor-orders__metric-body">
            <span className="vendor-orders__metric-label">Consolidated lines</span>
            <span className="vendor-orders__metric-value">
              {filteredSummary.length}
            </span>
          </div>
        </div>
        <div className="vendor-orders__metric vendor-orders__metric--amber">
          <span className="vendor-orders__metric-icon">
            <Clock size={17} />
          </span>
          <div className="vendor-orders__metric-body">
            <span className="vendor-orders__metric-label">Pending quantity</span>
            <span className="vendor-orders__metric-value">{pendingQuantity}</span>
          </div>
        </div>
      </div>

      {/* ===== Table card: tabs on their own sub-bar ===== */}
      <div className="vendor-orders__panel">
        <div className="vendor-orders__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === "detail"}
            className={view === "detail" ? "is-active" : ""}
            onClick={() => setView("detail")}
          >
            Lead details
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "summary"}
            className={view === "summary" ? "is-active" : ""}
            onClick={() => setView("summary")}
          >
            Vendor summary
          </button>
        </div>

        <div className="vendor-orders__table">
          <table>
            <colgroup>
              {(view === "detail" ? DETAIL_COLS : SUMMARY_COLS).map((width, i) => (
                <col key={i} style={{ width }} />
              ))}
            </colgroup>
            <thead>
              {view === "detail" ? (
                <tr>
                  <th>Lead</th>
                  <th>Vendor</th>
                  <th>Store</th>
                  <th>Part / Product</th>
                  <th className="num">Qty</th>
                  <th className="num">Vendor Qty</th>
                  <th>ETA</th>
                  <th>Status</th>
                </tr>
              ) : (
                <tr>
                  <th>Vendor</th>
                  <th>Store</th>
                  <th>Part / Product</th>
                  <th className="num">Total Qty</th>
                  <th>Leads</th>
                  <th>ETA</th>
                  <th>Status</th>
                </tr>
              )}
            </thead>

            <tbody>
              {loading ? (
                <tr className="static-row">
                  <td colSpan={colCount} className="empty">
                    Loading vendor orders…
                  </td>
                </tr>
              ) : hasRows ? (
                view === "detail" ? (
                  filteredOrders.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.leadNumber}</strong>
                        <small>{row.customerName}</small>
                      </td>
                      <td>{row.vendorName}</td>
                      <td>{row.storeName}</td>
                      <td>
                        <strong>{row.partNumber}</strong>
                        <small>
                          {row.productName} · {row.brandName}
                        </small>
                      </td>
                      <td className="num">{row.requiredQuantity}</td>
                      <td className="num">{row.vendorAvailableQuantity}</td>
                      <td>{row.estimatedAvailabilityDate || "—"}</td>
                      <td>
                        <Status value={row.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredSummary.map((row, index) => (
                    <tr
                      key={`${row.vendorId}-${row.storeId}-${row.partNumber}-${row.status}-${index}`}
                    >
                      <td>{row.vendorName}</td>
                      <td>{row.storeName}</td>
                      <td>
                        <strong>{row.partNumber}</strong>
                        <small>
                          {row.productName} · {row.brandName}
                        </small>
                      </td>
                      <td className="num">
                        <strong>{row.totalRequiredQuantity}</strong>
                      </td>
                      <td>{row.leadNumbers.join(", ")}</td>
                      <td>{row.estimatedAvailabilityDate || "—"}</td>
                      <td>
                        <Status value={row.status} />
                      </td>
                    </tr>
                  ))
                )
              ) : (
                <tr className="static-row">
                  <td colSpan={colCount} className="empty">
                    <div className="vendor-orders__empty">
                      <span className="vendor-orders__empty-icon">
                        <EmptyIcon size={22} />
                      </span>
                      <h3>{emptyMessage}</h3>
                      <p>{emptyHint}</p>
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
  return (
    <span className={`vendor-order-status ${value?.toLowerCase()}`}>
      {value}
    </span>
  );
}
