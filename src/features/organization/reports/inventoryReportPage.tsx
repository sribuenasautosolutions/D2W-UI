import { useEffect, useState, useCallback } from "react";
import { printCleanDocument } from "../../../utils/cleanPrint";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getInventoryReport,
  getInventoryItems,
  getLowStockItems,
  getDeadStockProducts,
  getStorePerformance,
  getProfitReport,
} from "../../../services/inventoryService";

// ── Constants ─────────────────────────────────────────────
const TABS = [
  { key: "inventory", label: "Inventory Items" },
  { key: "lowstock", label: "Low Stock" },
  { key: "deadstock", label: "Dead Stock" },
  { key: "stores", label: "Store Performance" },
  { key: "profit", label: "Profit Analysis" },
];

// ── Main Component ────────────────────────────────────────
export default function InventoryReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get("storeId");

  const [inventoryReport, setInventoryReport] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [deadStockItems, setDeadStockItems] = useState([]);
  const [storePerformance, setStorePerformance] = useState([]);
  const [profitReport, setProfitReport] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("inventory");
  const [search, setSearch] = useState("");
  const [tableData, setTableData] = useState([]);
  const [tableTitle, setTableTitle] = useState("All Inventory Items");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [report, items, lowStock, deadStock, stores, profit] =
        await Promise.all([
          getInventoryReport(storeId || undefined),
          getInventoryItems(storeId || undefined),
          getLowStockItems(storeId || undefined),
          getDeadStockProducts(storeId || undefined),
          getStorePerformance(storeId || undefined),
          getProfitReport(storeId || undefined),
        ]);

      setInventoryReport(report);
      setInventoryItems(Array.isArray(items) ? items : []);
      setLowStockItems(Array.isArray(lowStock) ? lowStock : []);
      setDeadStockItems(Array.isArray(deadStock) ? deadStock : []);
      setStorePerformance(Array.isArray(stores) ? stores : []);
      setProfitReport(profit);
      setTableData(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Inventory report load failed:", err);
      setError("Failed to load inventory report. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Guards ──────────────────────────────────────────────
  if (loading) return <p>Loading Inventory Report…</p>;
  if (error)
    return (
      <div>
        <p>⚠️ {error}</p>
        <button onClick={fetchAll}>Retry</button>
      </div>
    );

  // ── KPI click handlers ───────────────────────────────────
  const showAllItems = () => {
    setTableData(inventoryItems);
    setTableTitle("All Inventory Items");
    setActiveTab("inventory");
  };

  const showLowStock = () => {
    setTableData(inventoryItems.filter((i) => i.quantity <= i.minimumStock));
    setTableTitle("Low Stock Products");
    setActiveTab("inventory");
  };

  const showOutOfStock = () => {
    setTableData(inventoryItems.filter((i) => i.quantity === 0));
    setTableTitle("Out Of Stock Products");
    setActiveTab("inventory");
  };

  // ── Filtered lists ───────────────────────────────────────
  const filteredInventory = tableData.filter((item) =>
    (item.productName ?? "").toLowerCase().includes(search.toLowerCase()),
  );
  const filteredLowStock = lowStockItems.filter((item) =>
    (item.productName ?? "").toLowerCase().includes(search.toLowerCase()),
  );
  const filteredDeadStock = deadStockItems.filter((item) =>
    (item.productName ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const isProfit = (profitReport?.totalProfit ?? 0) >= 0;

  // ── Render ───────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div>
        <span>Reports / Inventory Report</span>
        <h1>Inventory Report</h1>
        <p>Stock quantity and inventory analysis</p>
        <button onClick={() => navigate("/admin/reports")}>← Back</button>
        <button onClick={() => printCleanDocument()}>🖨️ Print</button>
        <button onClick={() => printCleanDocument()}>📄 Export PDF</button>
        <button
          onClick={() => alert("Export Excel: wire up your backend endpoint.")}
        >
          📊 Export Excel
        </button>
      </div>

      <hr />

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <hr />

      {/* KPI Summary */}
      <h2>Summary</h2>
      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Total Products</th>
            <th>Total Stock Qty</th>
            <th>Low Stock Items</th>
            <th>Out Of Stock</th>
            <th>Inventory Value</th>
            <th>Potential Sales Value</th>
            <th>Dead Stock Items</th>
            <th>Total Stores</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <button onClick={showAllItems}>
                {inventoryReport?.totalProducts ?? "—"}
              </button>
            </td>
            <td>{inventoryReport?.totalStockQuantity ?? "—"}</td>
            <td>
              <button onClick={showLowStock}>
                {inventoryReport?.lowStockItems ?? "—"}
              </button>
            </td>
            <td>
              <button onClick={showOutOfStock}>
                {inventoryReport?.outOfStockItems ?? "—"}
              </button>
            </td>
            <td>
              ₹{(inventoryReport?.inventoryValue ?? 0).toLocaleString("en-IN")}
            </td>
            <td>
              ₹
              {(inventoryReport?.potentialSalesValue ?? 0).toLocaleString(
                "en-IN",
              )}
            </td>
            <td>{inventoryReport?.deadStockItems ?? "—"}</td>
            <td>{inventoryReport?.totalStores ?? "—"}</td>
          </tr>
        </tbody>
      </table>

      <hr />

      {/* Profit Summary */}
      <h2>Profit Analysis Summary</h2>
      {!profitReport ? (
        <p>No profit data available.</p>
      ) : (
        <table border={1} cellPadding={8}>
          <thead>
            <tr>
              <th>Total Revenue</th>
              <th>Total Cost</th>
              <th>Net {isProfit ? "Profit" : "Loss"}</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                ₹{(profitReport.totalRevenue ?? 0).toLocaleString("en-IN")}
              </td>
              <td>₹{(profitReport.totalCost ?? 0).toLocaleString("en-IN")}</td>
              <td>
                ₹
                {Math.abs(profitReport.totalProfit ?? 0).toLocaleString(
                  "en-IN",
                )}
              </td>
              <td>{isProfit ? "✅ Profit" : "🔴 Loss"}</td>
            </tr>
          </tbody>
        </table>
      )}

      <hr />

      {/* Tab Navigation */}
      <div>
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}>
            {activeTab === tab.key ? <strong>{tab.label}</strong> : tab.label}
          </button>
        ))}
      </div>

      {/* ── Inventory Items Tab ── */}
      {activeTab === "inventory" && (
        <div>
          <h2>
            {tableTitle} ({filteredInventory.length} records)
          </h2>
          <table border={1} cellPadding={8}>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Store</th>
                <th>Quantity</th>
                <th>Min Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={5}>No records found.</td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr key={item.inventoryId}>
                    <td>{item.productName}</td>
                    <td>{item.storeName}</td>
                    <td>{item.quantity}</td>
                    <td>{item.minimumStock}</td>
                    <td>{item.stockStatus}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Low Stock Tab ── */}
      {activeTab === "lowstock" && (
        <div>
          <h2>Low Stock Products ({filteredLowStock.length} records)</h2>
          <table border={1} cellPadding={8}>
            <thead>
              <tr>
                <th>#</th>
                <th>Product Name</th>
                <th>Store</th>
                <th>Current Stock</th>
                <th>Min Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLowStock.length === 0 ? (
                <tr>
                  <td colSpan={6}>No low stock items. 🎉</td>
                </tr>
              ) : (
                filteredLowStock.map((item, i) => (
                  <tr key={item.inventoryId ?? i}>
                    <td>{i + 1}</td>
                    <td>{item.productName}</td>
                    <td>{item.storeName}</td>
                    <td>{item.quantity}</td>
                    <td>{item.minimumStock}</td>
                    <td>{item.stockStatus ?? "Low Stock"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Dead Stock Tab ── */}
      {activeTab === "deadstock" && (
        <div>
          <h2>Dead Stock Products ({filteredDeadStock.length} records)</h2>
          <table border={1} cellPadding={8}>
            <thead>
              <tr>
                <th>#</th>
                <th>Product Name</th>
                <th>Part Number</th>
                <th>Stock Qty</th>
                <th>Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeadStock.length === 0 ? (
                <tr>
                  <td colSpan={5}>No dead stock items.</td>
                </tr>
              ) : (
                filteredDeadStock.map((item, i) => (
                  <tr key={item.productId ?? i}>
                    <td>{i + 1}</td>
                    <td>{item.productName}</td>
                    <td>{item.partNumber ?? "—"}</td>
                    <td>{item.stockQuantity ?? item.quantity}</td>
                    <td>₹{(item.stockValue ?? 0).toLocaleString("en-IN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Store Performance Tab ── */}
      {activeTab === "stores" && (
        <div>
          <h2>Store Performance ({storePerformance.length} stores)</h2>
          <table border={1} cellPadding={8}>
            <thead>
              <tr>
                <th>#</th>
                <th>Store Name</th>
                <th>Total Orders</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {storePerformance.length === 0 ? (
                <tr>
                  <td colSpan={4}>No store data available.</td>
                </tr>
              ) : (
                storePerformance.map((store, i) => (
                  <tr key={store.storeId ?? i}>
                    <td>{i + 1}</td>
                    <td>{store.storeName}</td>
                    <td>{store.totalOrders}</td>
                    <td>₹{(store.revenue ?? 0).toLocaleString("en-IN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Profit Analysis Tab ── */}
      {activeTab === "profit" && (
        <div>
          <h2>Profit Analysis</h2>
          {!profitReport ? (
            <p>No profit data available.</p>
          ) : (
            <table border={1} cellPadding={8}>
              <thead>
                <tr>
                  <th>Total Revenue</th>
                  <th>Total Cost</th>
                  <th>Net {isProfit ? "Profit" : "Loss"}</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    ₹{(profitReport.totalRevenue ?? 0).toLocaleString("en-IN")}
                  </td>
                  <td>
                    ₹{(profitReport.totalCost ?? 0).toLocaleString("en-IN")}
                  </td>
                  <td>
                    ₹
                    {Math.abs(profitReport.totalProfit ?? 0).toLocaleString(
                      "en-IN",
                    )}
                  </td>
                  <td>{isProfit ? "✅ Profit" : "🔴 Loss"}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
