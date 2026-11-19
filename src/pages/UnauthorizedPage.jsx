import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function UnauthorizedPage() {
    const navigate = useNavigate();
    const { user, logoutSession } = useAuth();

    const handleLogoutAndLogin = () => {
        logoutSession();
        navigate("/login");
    };

    const handleReturnHome = () => {
        if (!user) {
            navigate("/login");
            return;
        }
        const role = (user.role || "").toUpperCase();
        if (role === "SUPER_ADMIN") {
            navigate("/owner/dashboard");
        } else if (role === "STORE_OWNER") {
            navigate("/store/dashboard");
        } else if (role === "CASHIER") {
            navigate("/pos");
        } else if (role === "PROCUREMENT") {
            navigate("/store/purchases");
        } else if (role === "SALESPERSON") {
            navigate("/salesperson/sales/leads");
        } else {
            navigate("/store/sales");
        }
    };

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                flexDirection: "column",
                background: "#f8fafc",
                fontFamily: "Inter, -apple-system, sans-serif"
            }}
        >
            <h1
                style={{
                    fontSize: "80px",
                    fontWeight: "800",
                    color: "#dc2626",
                    margin: 0
                }}
            >
                403
            </h1>

            <h2 style={{ fontSize: "24px", color: "#1e293b", margin: "10px 0 6px" }}>
                Access Denied
            </h2>

            <p style={{ color: "#64748b", margin: "0 0 24px", fontSize: "15px" }}>
                You do not have permission to view this page or resource.
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
                <button
                    type="button"
                    onClick={handleReturnHome}
                    style={{
                        background: "#0ea5e9",
                        color: "white",
                        padding: "11px 20px",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: "600",
                        fontSize: "14px",
                        cursor: "pointer"
                    }}
                >
                    Return to My Workspace
                </button>

                <button
                    type="button"
                    onClick={handleLogoutAndLogin}
                    style={{
                        background: "#ef4444",
                        color: "white",
                        padding: "11px 20px",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: "600",
                        fontSize: "14px",
                        cursor: "pointer"
                    }}
                >
                    Logout & Switch User
                </button>
            </div>
        </div>
    );
}

export default UnauthorizedPage;
