import { useNavigate } from "react-router-dom";

const styles: Record<string, any> = {
  page: {
    padding: "30px",
    background: "#f1f5f9",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "8px",
  },
  breadcrumb: {
    fontSize: "13px",
    color: "#94a3b8",
    marginBottom: "4px",
  },
  pageTitle: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
    marginTop: "28px",
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    padding: "28px 24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  iconWrap: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
    fontSize: "28px",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "8px",
  },
  cardDesc: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "20px",
    lineHeight: "1.5",
  },
  viewBtn: {
    padding: "9px 28px",
    borderRadius: "6px",
    border: "none",
    color: "#fff",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
  },
  footer: {
    textAlign: "center",
    marginTop: "40px",
    color: "#94a3b8",
    fontSize: "13px",
  },
};

function ReportsPage() {
  const navigate = useNavigate();

  const reports = [
    {
      title: "Sales Report",
      icon: "📊",
      iconBg: "#eff6ff",
      description: "View all sales orders, revenue and order details.",
      path: "/admin/reports/sales",
      btnColor: "#2563eb",
    },
    {
      title: "Inventory Report",
      icon: "📦",
      iconBg: "#f0fdf4",
      description:
        "Check stock levels, product availability and inventory details.",
      path: "/admin/reports/inventory",
      btnColor: "#16a34a",
    },
    {
      title: "Low Stock Report",
      icon: "⚠️",
      iconBg: "#fffbeb",
      description: "View products that are low in stock.",
      path: "/admin/reports/low-stock",
      btnColor: "#d97706",
    },
    {
      title: "Store Wise Report",
      icon: "🏪",
      iconBg: "#fff7ed",
      description: "Compare sales and orders across stores.",
      path: "/admin/reports/store-wise",
      btnColor: "#ea580c",
    },
    {
      title: "Customer Report",
      icon: "👥",
      iconBg: "#f5f3ff",
      description: "View customer orders and purchase summary.",
      path: "/admin/reports/customers",
      btnColor: "#7c3aed",
    },
    {
      title: "Payment Report",
      icon: "💳",
      iconBg: "#fdf2f8",
      description: "View payment collection by mode.",
      path: "/admin/reports/payments",
      btnColor: "#db2777",
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>Reports</div>
          <h1 style={styles.pageTitle}>Reports Dashboard</h1>
        </div>
      </div>

      <div style={styles.grid}>
        {reports.map((report) => (
          <div
            key={report.title}
            style={styles.card}
            onClick={() => navigate(report.path)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)";
            }}
          >
            <div style={{ ...styles.iconWrap, background: report.iconBg }}>
              {report.icon}
            </div>
            <div style={styles.cardTitle}>{report.title}</div>
            <div style={styles.cardDesc}>{report.description}</div>
            <button
              style={{ ...styles.viewBtn, background: report.btnColor }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(report.path);
              }}
            >
              View Report
            </button>
          </div>
        ))}
      </div>

      <div style={styles.footer}>© 2026 Deals2Wheels. All rights reserved.</div>
    </div>
  );
}

export default ReportsPage;
