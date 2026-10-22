import { Link } from "react-router-dom";

function UnauthorizedPage() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        flexDirection: "column",
        background: "#f8fafc",
      }}
    >
      <h1
        style={{
          fontSize: "80px",
          color: "#dc2626",
          margin: 0,
        }}
      >
        403
      </h1>

      <h2>Access Denied</h2>

      <p>You don't have permission to access this page.</p>

      <Link
        to="/login"
        style={{
          marginTop: "20px",
          textDecoration: "none",
          background: "#2563eb",
          color: "white",
          padding: "12px 24px",
          borderRadius: "8px",
        }}
      >
        Go to Login
      </Link>
    </div>
  );
}

export default UnauthorizedPage;
