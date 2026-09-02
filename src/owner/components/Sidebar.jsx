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
    ShoppingCart,
    SlidersHorizontal,
    Truck,
    UserRound,
    UsersRound,
    Upload,
} from "lucide-react";
import logo from "../../assets/NEW LOGO D2W.png";
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
    const purchasesBase = isOwner
        ? "/owner/purchases"
        : "/store/purchases";
        const salesBase = isOwner
    ? "/owner/sales"
    : "/store/sales";
    const isInventoryRoute = location.pathname === inventoryBase;
    const isPurchasesRoute = location.pathname === purchasesBase;
    const inventoryView =
        new URLSearchParams(location.search).get("view") || "stock";
    const requestedPurchasesView =
        new URLSearchParams(location.search).get("view") || "vendors";
    const purchasesView = requestedPurchasesView === "vendorpurchases"
        ? "bills"
        : requestedPurchasesView;
const [inventoryOpen, setInventoryOpen] = useState(isInventoryRoute);
const [purchasesOpen, setPurchasesOpen] = useState(isPurchasesRoute);
const [salesOpen, setSalesOpen] = useState(
    location.pathname.startsWith(salesBase)
);
    const displayName = user?.name || "D2W User";
    const email = user?.email || "Email not available";
    const initials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "DU";
    const roleLabel = {
        SUPER_ADMIN: "Super Admin",
        STORE_OWNER: "Store Owner",
        CASHIER: "Cashier",
    }[user?.role] || "User";

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
        { key: "bulkstock", label: "Opening & Bulk Stock", icon: Upload },
        { key: "transactions", label: "Transactions", icon: History },
        { key: "adjustment", label: "Adjustments", icon: SlidersHorizontal },
        { key: "batchreport", label: "Batch Report", icon: ClipboardList },
    ];

    const purchaseItems = [
        { key: "vendors", label: "Vendors", icon: UsersRound },
        { key: "bills", label: "Bills", icon: CirclePlus },
        { key: "requestd2w", label: "D2W Stock Requests", icon: Truck },
    ];

    const moduleLinkStyle = (routeActive, currentView, view) => ({
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minHeight: "34px",
        color:
            routeActive && currentView === view
                ? "#FFFFFF"
                : "#94A3B8",
        textDecoration: "none",
        padding: "7px 12px 7px 40px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight:
            routeActive && currentView === view
                ? 700
                : 500,
        background:
            routeActive && currentView === view
                ? "rgba(37, 99, 235, 0.72)"
                : "transparent",
        boxSizing: "border-box",
    });

    return (
        <>
        <style>{`
            .app-sidebar-nav {
                scrollbar-width: none;
                -ms-overflow-style: none;
            }
            .app-sidebar-nav::-webkit-scrollbar {
                display: none;
            }
        `}</style>
        <aside
            style={{
                width: "238px",
                background: "linear-gradient(180deg, #111C33 0%, #0A1428 100%)",
                color: "#FFFFFF",
                minHeight: "100vh",
                padding: "18px 14px 14px",
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
                    padding: "0 10px 16px",
                }}
            >
               <div
    style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
    }}
>
    <img
        src={logo}
        alt="Deals2Wheels"
        style={{
            width: "170px",
            height: "auto",
            objectFit: "contain",
        }}
    />
</div>
            </div>

            <nav
                className="app-sidebar-nav"
                style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
            >

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
                                            style={moduleLinkStyle(isInventoryRoute, inventoryView, item.key)}
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

                <button
                    type="button"
                    onClick={() => setPurchasesOpen((open) => !open)}
                    aria-expanded={purchasesOpen}
                    style={{
                        width: "100%",
                        minHeight: "40px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        color: isPurchasesRoute ? "#FFFFFF" : "#94A3B8",
                        padding: "8px 12px",
                        border: 0,
                        borderRadius: "6px",
                        background: isPurchasesRoute ? "rgba(217, 119, 6, 0.22)" : "transparent",
                        fontFamily: "inherit",
                        fontSize: "13.5px",
                        fontWeight: isPurchasesRoute ? 700 : 600,
                        cursor: "pointer",
                    }}
                >
                    <ShoppingCart size={17} />
                    <span style={{ flex: 1, textAlign: "left" }}>Purchases</span>
                    {purchasesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {purchasesOpen && (
                    <div style={{ display: "grid", gap: "2px", margin: "3px 0 7px" }}>
                        {purchaseItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.key}
                                    to={`${purchasesBase}?view=${item.key}`}
                                    style={moduleLinkStyle(isPurchasesRoute, purchasesView, item.key)}
                                >
                                    <Icon size={15} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}

               <button
    type="button"
    onClick={() => setSalesOpen((open) => !open)}
    aria-expanded={salesOpen}
    style={{
        width: "100%",
        minHeight: "40px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        color: location.pathname.startsWith(salesBase)
            ? "#FFFFFF"
            : "#94A3B8",
        padding: "8px 12px",
        border: 0,
        borderRadius: "6px",
        background: location.pathname.startsWith(salesBase)
            ? "rgba(37, 99, 235, 0.34)"
            : "transparent",
        fontFamily: "inherit",
        fontSize: "13.5px",
        fontWeight: location.pathname.startsWith(salesBase)
            ? 700
            : 600,
        cursor: "pointer",
    }}
>
    <ReceiptText size={17} />

    <span
        style={{
            flex: 1,
            textAlign: "left",
        }}
    >
        Sales
    </span>

    {salesOpen ? (
        <ChevronDown size={16} />
    ) : (
        <ChevronRight size={16} />
    )}
</button>

{salesOpen && (
    <div
        style={{
            display: "grid",
            gap: "2px",
            margin: "3px 0 7px",
        }}
    >
        <Link
            to={salesBase}
            style={{
                ...moduleLinkStyle(
                    location.pathname === salesBase,
                    "",
                    ""
                ),
                paddingLeft: "40px",
            }}
        >
            <ReceiptText size={15} />
            <span>Sales Invoices</span>
        </Link>

        <Link
            to="/pos"
            style={{ ...moduleLinkStyle(false, "", ""), paddingLeft: "40px" }}
        >
            <ShoppingCart size={15} />
            <span>POS</span>
        </Link>
        <Link
            to={`${salesBase}/proforma`}
            style={{ ...moduleLinkStyle(location.pathname.startsWith(`${salesBase}/proforma`), "", ""), paddingLeft: "40px" }}
        >
            <ReceiptText size={15} />
            <span>Proforma Invoices</span>
        </Link>
    </div>
)}

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
                    paddingTop: "14px",
                    marginTop: "12px",
                }}
            >
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "32px minmax(0, 1fr) 30px",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 8px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                }}>
                    <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        display: "grid",
                        placeItems: "center",
                        color: "#FFFFFF",
                        background: "#3158D4",
                        fontSize: "10.5px",
                        fontWeight: 800,
                    }}>
                        {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{
                            fontSize: "11.5px",
                            fontWeight: 750,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}>
                            {displayName}
                        </div>
                        <div style={{
                            marginTop: "2px",
                            color: "#8EA0BE",
                            fontSize: "9px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }} title={email}>
                            {roleLabel} · {email}
                        </div>
                    </div>
                    <Link
                        to="/login"
                        onClick={() => localStorage.removeItem("user")}
                        aria-label="Logout"
                        title="Logout"
                        style={{
                            width: "30px",
                            height: "30px",
                            display: "grid",
                            placeItems: "center",
                            borderRadius: "7px",
                            color: "#FCA5A5",
                            background: "rgba(248,113,113,0.08)",
                            textDecoration: "none",
                        }}
                    >
                        <LogOut size={15} />
                    </Link>
                </div>
            </div>
        </aside>
        </>
    );
}

export default Sidebar;
