import { useEffect, useState } from "react";
import KpiCard from "../components/KpiCard";
import { getDashboard } from "../../services/dashboardService";

function DashboardHome() {

  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await getDashboard();
      console.log(data);
      setDashboard(data);
    } catch (error) {
      console.error("Dashboard Error:", error);
    }
  };

  if (!dashboard) {
    return (
      <div style={{ padding: "30px" }}>
        Loading Dashboard...
      </div>
    );
  }

  const cards = [
    {
      title: "Total Revenue",
      value: `₹${dashboard.totalRevenue || 0}`,
      color: "#0891b2",
      icon: "💰",
    },
    {
      title: "Products",
      value: dashboard.totalProducts || 0,
      color: "#f59e0b",
      icon: "📦",
    },
    {
      title: "Customers",
      value: dashboard.totalCustomers || 0,
      color: "#8b5cf6",
      icon: "👥",
    },
    {
      title: "Stores",
      value: dashboard.totalStores || 0,
      color: "#14b8a6",
      icon: "🏪",
    },
    {
      title: "Inventory Items",
      value: dashboard.inventoryItems || 0,
      color: "#0ea5e9",
      icon: "📋",
    },
    {
      title: "Stock Quantity",
      value: dashboard.stockQuantity || 0,
      color: "#6366f1",
      icon: "📊",
    },
    {
      title: "Low Stock",
      value: dashboard.lowStockItems || 0,
      color: "#ef4444",
      icon: "⚠️",
    },
    {
      title: "Out Of Stock",
      value: dashboard.outOfStockItems || 0,
      color: "#991b1b",
      icon: "❌",
    },
    {
      title: "Pending Orders",
      value: dashboard.pendingOrders || 0,
      color: "#eab308",
      icon: "⏳",
    },
    {
      title: "Delivered Orders",
      value: dashboard.deliveredOrders || 0,
      color: "#22c55e",
      icon: "🚚",
    },
    {
      title: "Cancelled Orders",
      value: dashboard.cancelledOrders || 0,
      color: "#dc2626",
      icon: "🔴",
    },
    {
      title: "Pending Payments",
      value: `₹${dashboard.pendingPayments || 0}`,
      color: "#f97316",
      icon: "💳",
    },
  ];

  return (
    <div
      style={{
        padding: "30px",
        background: "#f1f5f9",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: "34px",
          fontWeight: "700",
          marginBottom: "25px",
        }}
      >
        Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
          marginBottom: "25px",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg,#16a34a,#22c55e)",
            color: "#fff",
            padding: "30px",
            borderRadius: "18px",
          }}
        >
          <div>💰 Today's Sales</div>

          <div
            style={{
              fontSize: "50px",
              fontWeight: "700",
              marginTop: "10px",
            }}
          >
            ₹{dashboard.todaySales || 0}
          </div>
        </div>

        <div
          style={{
            background:
              "linear-gradient(135deg,#2563eb,#3b82f6)",
            color: "#fff",
            padding: "30px",
            borderRadius: "18px",
          }}
        >
          <div>📦 Today's Orders</div>

          <div
            style={{
              fontSize: "50px",
              fontWeight: "700",
              marginTop: "10px",
            }}
          >
            {dashboard.todayOrders || 0}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(240px,1fr))",
          gap: "18px",
        }}
      >
        {cards.map((card, index) => (
          <KpiCard
            key={index}
            title={card.title}
            value={card.value}
            color={card.color}
            icon={card.icon}
          />
        ))}
      </div>
    </div>
  );
}

export default DashboardHome;