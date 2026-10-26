import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {getLowStockReport,getLowStockItems} from "../../services/reportService";

function LowStockReportPage() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const storeId = user.storeId;
  const [error, setError] = useState("");

  const [report, setReport] = useState(null);
  const [items, setItems] = useState([]);

  const loadReport = useCallback(async () => {
    setError("");

    try {

      const reportData =
        await getLowStockReport(storeId);

      const itemData =
        await getLowStockItems(storeId);

      setReport(reportData);
      setItems(itemData);

    } catch (error) {

      setError(error.response?.data?.message || "Unable to load low-stock report.");

    }
  }, [storeId]);

  useEffect(() => { loadReport(); }, [loadReport]);

  if (error) return <div role="alert">{error}<button onClick={loadReport}>Retry</button></div>;
  if (!report) {
    return <h2>Loading Low Stock Report...</h2>;
  }

  return (
    <div
      style={{
        padding: "30px",
        background: "#f8fafc",
        minHeight: "100vh"
      }}
    >

      <h1
        style={{
          marginBottom: "25px"
        }}
      >
        Low Stock Report
      </h1>

      {/* SUMMARY CARDS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(250px,1fr))",
          gap: "20px",
          marginBottom: "30px"
        }}
      >

        <div
          style={{
            background: "#f59e0b",
            color: "#fff",
            padding: "25px",
            borderRadius: "12px"
          }}
        >
          <h3>Total Low Stock Items</h3>
          <h1>
            {report.lowStockItems ?? report.totalLowStockItems}
          </h1>
        </div>

        <div
          style={{
            background: "#dc2626",
            color: "#fff",
            padding: "25px",
            borderRadius: "12px"
          }}
        >
          <h3>Critical Items</h3>
          <h1>
            {report.criticalItems}
          </h1>
        </div>

      </div>

      {/* TABLE */}

      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "12px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.08)"
        }}
      >

        <h3
          style={{
            marginBottom: "20px"
          }}
        >
          Low Stock Products
        </h3>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse"
          }}
        >

          <thead>

            <tr
              style={{
                background: "#f1f5f9"
              }}
            >
              <th style={{ padding: "12px" }}>
                Product
              </th>

              <th style={{ padding: "12px" }}>
                Store
              </th>

              <th style={{ padding: "12px" }}>
                Current Stock
              </th>

              <th style={{ padding: "12px" }}>
                Minimum Stock
              </th>

              <th style={{ padding: "12px" }}>
                Status
              </th>
            </tr>

          </thead>

          <tbody>

            {items.length === 0 ? (

              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: "center",
                    padding: "20px"
                  }}
                >
                  No Low Stock Products Found
                </td>
              </tr>

            ) : (

              items.map((item, index) => (

                <tr key={index}>

                  <td style={{ padding: "12px" }}>
                    {item.productName}
                    {storeId && <button onClick={() => navigate(`/store/inventory/products/${item.inventoryId}/manage?storeId=${storeId}&section=adjustment`)}>Adjust stock</button>}
                  </td>

                  <td style={{ padding: "12px" }}>
                    {item.storeName}
                  </td>

                  <td style={{ padding: "12px" }}>
                    {item.currentStock}
                  </td>

                  <td style={{ padding: "12px" }}>
                    {item.minimumStock}
                  </td>

                  <td style={{ padding: "12px" }}>

                    {item.currentStock === 0
                      ? "OUT OF STOCK"
                      : item.currentStock <= 2
                      ? "CRITICAL"
                      : "LOW STOCK"}

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default LowStockReportPage;
