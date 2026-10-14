import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
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
  const emptyMessage =
    totalOrders === 0
      ? "No vendor orders recorded for this date."
      : "No rows match the current filters.";

  return (
    <section className="vendor-orders">
      {/* ===== Header: title left · controls top-right ===== */}
      <header className="vendor-orders__header">
  <div className="vendor-orders__heading">
    <span className="vendor-orders__eyebrow">Purchases</span>
    <h1 className="vendor-orders__title">Vendor Orders</h1>
  </div>

  <div className="vendor-orders__controls">
    <label>
      Date
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
    </label>

    <label>
      Vendor
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
        Store
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

      {/* ===== Metrics: label prominent, value prominent ===== */}
      <div className="vendor-orders__metrics">
        <div className="vendor-orders__metric">
          <span className="vendor-orders__metric-label">Lead requirements</span>
          <span className="vendor-orders__metric-value">
            {filteredOrders.length}
          </span>
        </div>
        <div className="vendor-orders__metric">
          <span className="vendor-orders__metric-label">Consolidated lines</span>
          <span className="vendor-orders__metric-value">
            {filteredSummary.length}
          </span>
        </div>
        <div className="vendor-orders__metric">
          <span className="vendor-orders__metric-label">Pending quantity</span>
          <span className="vendor-orders__metric-value">{pendingQuantity}</span>
        </div>
      </div>

      {/* ===== Tabs: high-contrast segmented control ===== */}
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

      {/* ===== Table ===== */}
      <div className="vendor-orders__table">
        <table>
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
              <tr>
                <td colSpan={view === "detail" ? 8 : 7} className="empty">
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
              <tr>
                <td colSpan={view === "detail" ? 8 : 7} className="empty">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
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