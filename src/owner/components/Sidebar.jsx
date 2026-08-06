import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    Boxes,
    Building2,
    CarFront,
    ChevronDown,
    ChevronRight,
    CirclePlus,
    ClipboardCheck,
    ClipboardList,
    FileChartColumn,
    History,
    House,
    LogOut,
    PackageSearch,
    ReceiptText,
    SlidersHorizontal,
    UserRound,
} from "lucide-react";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
}

function Sidebar() {
    const user = getStoredUser();
    const location = useLocation();
    const isOwner = user?.role === "SUPER_ADMIN";
    const inventoryBase = isOwner
        ? "/owner/inventory"
        : "/store/inventory";
    const isInventoryRoute = location.pathname === inventoryBase;
    const inventoryView =
        new URLSearchParams(location.search).get("view") || "stock";
    const [inventoryOpen, setInventoryOpen] = useState(isInventoryRoute);

    const linkStyle = (to, danger = false) => {
        const isActive = location.pathname === to;

        return {
            display: "flex",
            alignItems: "center",
            gap: "12px",
            minHeight: "38px",
            color: danger ? "#FCA5A5" : (isActive ? "#FFFFFF" : "#94A3B8"),
            textDecoration: "none",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "13.5px",
            fontWeight: isActive ? 700 : 600,
            background: isActive && !danger
                ? "rgba(37, 99, 235, 0.72)"
                : "transparent",
            boxSizing: "border-box",
        };
    };

    const sectionLabelStyle = {
        fontSize: "10.5px",
        fontWeight: 700,
        letterSpacing: "0.8px",
        textTransform: "uppercase",
        color: "#64748B",
        padding: "18px 12px 6px",
    };

    const inventoryItems = [
        { key: "stock", label: "Current Stock", icon: PackageSearch },
        { key: "addstock", label: "Add Stock", icon: CirclePlus },
        { key: "transactions", label: "Transactions", icon: History },
        { key: "adjustment", label: "Adjustments", icon: SlidersHorizontal },
        { key: "batchreport", label: "Batch Report", icon: ClipboardList },
    ];

    const inventoryLinkStyle = (view) => ({
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minHeight: "34px",
        color:
            isInventoryRoute && inventoryView === view
                ? "#FFFFFF"
                : "#94A3B8",
        textDecoration: "none",
        padding: "7px 12px 7px 40px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight:
            isInventoryRoute && inventoryView === view
                ? 700
                : 500,
        background:
            isInventoryRoute && inventoryView === view
                ? "rgba(37, 99, 235, 0.72)"
                : "transparent",
        boxSizing: "border-box",
    });

    return (
        <aside
            style={{
                width: "252px",
                background: "#0F172A",
                color: "#FFFFFF",
                minHeight: "100vh",
                padding: "20px 14px",
                display: "flex",
                flexDirection: "column",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                boxSizing: "border-box",
                flexShrink: 0,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "4px 10px 22px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        lineHeight: 1,
                    }}
                >
                    <div style={{ fontSize: "30px", fontWeight: 900 }}>
                        <span style={{ color: "#FFFFFF" }}>D</span>
                        <span style={{ color: "#fd8e01" }}>2</span>
                        <span style={{ color: "#FFFFFF" }}>W</span>
                    </div>
                    <span
                        style={{
                            marginTop: "20px",
                            color: "#fd8e01",
                            fontSize: "8px",
                            fontWeight: 700,
                            letterSpacing: "2px",
                        }}
                    >
                        DEALS 2 WHEELS
                    </span>
                </div>
            </div>

            <nav style={{ flex: 1, overflowY: "auto" }}>
                <div style={sectionLabelStyle}>Overview</div>

                <Link
                    to={isOwner ? "/owner/dashboard" : "/store/dashboard"}
                    style={linkStyle(isOwner ? "/owner/dashboard" : "/store/dashboard")}
                >
                    <House size={17} />
                    <span>Dashboard</span>
                </Link>

                {isOwner && <div style={sectionLabelStyle}>Catalog</div>}

                {
                    isOwner && (
                        <Link to="/owner/products" style={linkStyle("/owner/products")}>
                            <Boxes size={17} />
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
                            <ClipboardCheck size={17} />
                            <span>Product Approval</span>
                        </Link>
                    )
                }

                {
                    isOwner && (
                        <Link to="/owner/vehicles" style={linkStyle("/owner/vehicles")}>
                            <CarFront size={17} />
                            <span>Vehicle Management</span>
                        </Link>
                    )
                }

                <div style={sectionLabelStyle}>Operations</div>

                <button
                    type="button"
                    onClick={() => setInventoryOpen((open) => !open)}
                    aria-expanded={inventoryOpen}
                    style={{
                        width: "100%",
                        minHeight: "40px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        color: isInventoryRoute ? "#FFFFFF" : "#94A3B8",
                        padding: "8px 12px",
                        border: 0,
                        borderRadius: "6px",
                        background: isInventoryRoute
                            ? "rgba(37, 99, 235, 0.34)"
                            : "transparent",
                        fontFamily: "inherit",
                        fontSize: "13.5px",
                        fontWeight: isInventoryRoute ? 700 : 600,
                        cursor: "pointer",
                    }}
                >
                    <Boxes size={17} />
                    <span style={{ flex: 1, textAlign: "left" }}>Inventory</span>
                    {
                        inventoryOpen
                            ? <ChevronDown size={16} />
                            : <ChevronRight size={16} />
                    }
                </button>

                {
                    inventoryOpen && (
                        <div
                            style={{
                                display: "grid",
                                gap: "2px",
                                margin: "3px 0 7px",
                            }}
                        >
                            {
                                inventoryItems.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.key}
                                            to={`${inventoryBase}?view=${item.key}`}
                                            style={inventoryLinkStyle(item.key)}
                                        >
                                            <Icon size={15} />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })
                            }
                        </div>
                    )
                }

                <Link
                    to={isOwner ? "/owner/orders" : "/store/orders"}
                    style={linkStyle(isOwner ? "/owner/orders" : "/store/orders")}
                >
                    <ReceiptText size={17} />
                    <span>Orders</span>
                </Link>

                <Link
                    to={isOwner ? "/owner/reports" : "/store/reports"}
                    style={linkStyle(isOwner ? "/owner/reports" : "/store/reports")}
                >
                    <FileChartColumn size={17} />
                    <span>Reports</span>
                </Link>

                {isOwner && <div style={sectionLabelStyle}>Organization</div>}

                {
                    isOwner && (
                        <Link to="/owner/stores" style={linkStyle("/owner/stores")}>
                            <Building2 size={17} />
                            <span>Stores</span>
                        </Link>
                    )
                }

                {
                    isOwner && (
                        <Link to="/owner/users" style={linkStyle("/owner/users")}>
                            <UserRound size={17} />
                            <span>Users</span>
                        </Link>
                    )
                }

                {
                    !isOwner && (
                        <>
                            <div style={sectionLabelStyle}>Team</div>
                            <Link to="/store/users" style={linkStyle("/store/users")}>
                                <UserRound size={17} />
                                <span>Employees</span>
                            </Link>
                        </>
                    )
                }
            </nav>

            <div
                style={{
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    paddingTop: "12px",
                    marginTop: "12px",
                }}
            >
                <Link
                    to="/login"
                    style={linkStyle("/login", true)}
                    onClick={() => localStorage.removeItem("user")}
                >
                    <LogOut size={17} />
                    <span>Logout</span>
                </Link>
            </div>
        </aside>
    );
}

export default Sidebar;
