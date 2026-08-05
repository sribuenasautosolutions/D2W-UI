import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, FileText, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiclient from "../../services/apiclient";
import "./OrdersPage.css";

const readUser = () => {
  try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
};

const formatMoney = (value) => `\u20B9 ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const formatDate = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";

export default function OrdersPage() {
  const navigate = useNavigate();
  const user = useMemo(() => readUser(), []);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(isSuperAdmin ? "" : String(user?.storeId || ""));
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSuperAdmin) return;
    apiclient.get("/stores", { params: { page: 0, size: 100, active: true } })
      .then(({ data }) => setStores(Array.isArray(data?.content) ? data.content : []))
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load stores."));
  }, [isSuperAdmin]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiclient.get(storeId ? `/orders/store/${storeId}` : `/orders`);
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setOrders([]);
      setError(requestError.response?.data?.message || "Unable to load store orders.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const selectedStore = stores.find((store) => String(store.id ?? store.storeId) === storeId);
  const visibleOrders = orders.filter((order) => {
    const query = search.trim().toLowerCase();
    return !query || [order.orderId, order.customerName, order.phone, order.paymentMethod]
      .some((value) => String(value ?? "").toLowerCase().includes(query));
  });

  return <section className="orders-page">
    <header className="orders-heading">
      <div><span>Sales</span><h1>Store Orders</h1><p>Review invoices and payments for one store at a time.</p></div>
      {isSuperAdmin && <label className="orders-store-select"><span>Store</span><select value={storeId} onChange={(event) => setStoreId(event.target.value)}>
        <option value="">All Stores</option>
        {stores.map((store) => <option key={store.id ?? store.storeId} value={store.id ?? store.storeId}>{store.storeName} ({store.storeCode})</option>)}
      </select></label>}
    </header>

    <div className="orders-summary">
      <div><FileText size={18} /><span>Store scope<strong>{selectedStore?.storeName || user?.storeName || "All Stores"}</strong></span></div>
      <div><span>Invoices<strong>{orders.length}</strong></span></div>
      <div><span>Sales value<strong>{formatMoney(orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0))}</strong></span></div>
    </div>

    <div className="orders-panel">
      <div className="orders-tools"><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice, customer or phone" /></label></div>
      {error && <div className="orders-message orders-message--error">{error}</div>}
      {loading ? <div className="orders-message">Loading orders...</div>
          : <div className="orders-table-wrap"><table className="orders-table"><thead><tr>{isSuperAdmin && !storeId && <th>Store</th>}<th>Invoice</th><th>Customer</th><th>Phone</th><th>Items</th><th>Payment</th><th>Amount</th><th>Date</th><th aria-label="Actions" /></tr></thead><tbody>
            {visibleOrders.map((order) => <tr key={order.orderId}>{isSuperAdmin && !storeId && <td><strong>{order.storeName || "-"}</strong><small>{order.storeCode || "-"}</small></td>}<td><strong>INV-{String(order.orderId).padStart(6, "0")}</strong><small>Order #{order.orderId}</small></td><td>{order.customerName || "-"}</td><td>{order.phone || "-"}</td><td>{order.totalItems ?? 0}</td><td><span className="orders-badge">{order.paymentMethod?.replaceAll("_", " ") || "-"}</span></td><td><strong>{formatMoney(order.totalAmount)}</strong></td><td>{formatDate(order.orderDate)}</td><td><button title="View invoice" onClick={() => navigate(`invoice/${order.orderId}`)}><Eye size={16} /></button></td></tr>)}
            {!visibleOrders.length && <tr><td colSpan={isSuperAdmin && !storeId ? 9 : 8} className="orders-no-results">No orders match this store scope.</td></tr>}
          </tbody></table></div>}
    </div>
  </section>;
}
