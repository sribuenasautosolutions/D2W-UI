import { Link, useLocation } from "react-router-dom";

function Sidebar() {

    const user =
        JSON.parse(
            localStorage.getItem(
                "user"
            )
        );

    const location = useLocation();

    const isOwner =
        user?.role === "OWNER";

    const isStoreManager =
        user?.role === "MAINSTORE_MANAGER";

    // active/inactive styling only — routes and behavior are untouched
    const linkStyle = (to, danger = false) => {
        const isActive = location.pathname === to;
        return {
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: danger ? "#FCA5A5" : (isActive ? "#FFFFFF" : "#94A3B8"),
            textDecoration: "none",
            padding: "10px 14px",
            borderRadius: "10px",
            fontSize: "13.5px",
            fontWeight: isActive ? 700 : 600,
            background: isActive && !danger ? "rgba(37, 99, 235, 0.9)" : "transparent",
            cursor: "pointer",
            transition: "background 0.15s ease, color 0.15s ease",
        };
    };

    const sectionLabelStyle = {
        fontSize: "10.5px",
        fontWeight: 700,
        letterSpacing: "0.8px",
        textTransform: "uppercase",
        color: "#64748B",
        padding: "18px 14px 6px 14px",
    };

    return (

        <div
            style={{
                width: "252px",
                background: "#0F172A",
                color: "white",
                minHeight: "100vh",
                padding: "20px 14px",
                display: "flex",
                flexDirection: "column",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif",
                borderRight: "1px solid rgba(255,255,255,0.06)",
            }}
        >

            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 10px 20px 10px" }}>
                <div
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        flexShrink: 0,
                    }}
                >
                    🛞
                </div>
                <h2 style={{ margin: 0, fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.2px" }}>
                    Deals2Wheels
                </h2>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>

                <div style={sectionLabelStyle}>Overview</div>

                {/* Dashboard */}
                <Link
                    to={
                        isOwner
                            ? "/owner/dashboard"
                            : "/store/dashboard"
                    }
                    style={linkStyle(isOwner ? "/owner/dashboard" : "/store/dashboard")}
                >
                    <span>🏠</span>
                    <span>Dashboard</span>
                </Link>

                {/* OWNER ONLY */}
                {(isOwner) && <div style={sectionLabelStyle}>Catalog</div>}

                {
                    isOwner && (
                        <Link
                            to="/owner/products"
                            style={linkStyle("/owner/products")}
                        >
                            <span>📦</span>
                            <span>Product Management</span>
                        </Link>
                    )
                }
                {
                         isOwner && (
                          <Link
                           to="/owner/product-approval"
                           style={linkStyle("/owner/product-approval")}
                         >
                           <span>✅</span>
                           <span>Product Approval</span>
                         </Link>
                         )
                        }
              

                {
                    isOwner && (
                        <Link
                            to="/owner/vehicles"
                            style={linkStyle("/owner/vehicles")}
                        >
                            <span>🚗</span>
                            <span>Vehicle Management</span>
                        </Link>
                    )
                }

                {/* COMMON MENU */}
                <div style={sectionLabelStyle}>Operations</div>

                <Link
                    to={
                        isOwner
                            ? "/owner/inventory"
                            : "/store/inventory"
                    }
                    style={linkStyle(isOwner ? "/owner/inventory" : "/store/inventory")}
                >
                    <span>📊</span>
                    <span>Inventory</span>
                </Link>

                <Link
                    to={
                        isOwner
                            ? "/owner/orders"
                            : "/store/orders"
                    }
                    style={linkStyle(isOwner ? "/owner/orders" : "/store/orders")}
                >
                    <span>🧾</span>
                    <span>Orders</span>
                </Link>

                <Link
                    to={
                        isOwner
                            ? "/owner/reports"
                            : "/store/reports"
                    }
                    style={linkStyle(isOwner ? "/owner/reports" : "/store/reports")}
                >
                    <span>📈</span>
                    <span>Reports</span>
                </Link>

                {/* OWNER ONLY */}
                {isOwner && <div style={sectionLabelStyle}>Organization</div>}

                {
                    isOwner && (
                        <Link
                            to="/owner/stores"
                            style={linkStyle("/owner/stores")}
                        >
                            <span>🏪</span>
                            <span>Stores</span>
                        </Link>
                    )
                }

                {
                    isOwner && (
                        <Link
                            to="/owner/users"
                            style={linkStyle("/owner/users")}
                        >
                            <span>👤</span>
                            <span>Users</span>
                        </Link>
                    )
                }

            </div>

            {/* LOGOUT */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px", marginTop: "12px" }}>
                <Link
                    to="/login"
                    style={linkStyle("/login", true)}
                    onClick={() =>
                        localStorage.removeItem(
                            "user"
                        )
                    }
                >
                    <span>🚪</span>
                    <span>Logout</span>
                </Link>
            </div>

        </div>
    );
}

export default Sidebar;
