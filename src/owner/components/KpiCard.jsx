function KpiCard({
  title,
  value,
  color,
  icon = "📊",
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "14px",
        padding: "18px",
        borderLeft: `5px solid ${color}`,
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        transition: "0.3s",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            color: "#64748b",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          {title}
        </span>

        <span
          style={{
            fontSize: "24px",
          }}
        >
          {icon}
        </span>
      </div>

      <div
        style={{
          fontSize: "30px",
          fontWeight: "700",
          color: "#0f172a",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: "8px",
          fontSize: "12px",
          color: "#94a3b8",
        }}
      >
        
      </div>
    </div>
  );
}

export default KpiCard;