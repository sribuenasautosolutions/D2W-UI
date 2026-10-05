import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    Barcode,
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
    Menu,
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
import "./Sidebar.css";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
}
function NavLabel({ collapsed, children }) {
    return (
        <span className={collapsed ? "sidebar-label-rail" : ""}>
            {children}
        </span>
    );
}
function Sidebar() {
    const user = getStoredUser();
    const location = useLocation();
    const isOwner = user?.role === "SUPER_ADMIN";

    const inventoryBase = isOwner ? "/owner/inventory" : "/store/inventory";
    const purchasesBase = isOwner ? "/owner/purchases" : "/store/purchases";
    const salesBase = isOwner ? "/owner/sales" : "/store/sales";

    const isInventoryRoute = location.pathname === inventoryBase;
    const isPurchasesRoute = location.pathname === purchasesBase;

    const inventoryView =
        new URLSearchParams(location.search).get("view") || "stock";
    const requestedPurchasesView =
        new URLSearchParams(location.search).get("view") || "vendors";
    const purchasesView =
        requestedPurchasesView === "vendorpurchases"
            ? "bills"
            : requestedPurchasesView;

    /* ---- expand/collapse sub-menus (expanded mode) ---- */
    const [inventoryOpen, setInventoryOpen] = useState(isInventoryRoute);
    const [purchasesOpen, setPurchasesOpen] = useState(isPurchasesRoute);
    const [salesOpen, setSalesOpen] = useState(
        location.pathname.startsWith(salesBase)
    );

    /* ---- icon-rail state ---- */
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem("sidebar-collapsed") === "true";
        } catch {
            return false;
        }
    });
    const [openFlyout, setOpenFlyout] = useState(null); // "inventory" | "purchases" | "sales"
    const [flyoutRect, setFlyoutRect] = useState(null); // { top, left }

    /* persist collapsed state */
    useEffect(() => {
        try {
            localStorage.setItem("sidebar-collapsed", String(collapsed));
        } catch {
            /* ignore */
        }
    }, [collapsed]);

    /* close flyout when clicking outside */
    useEffect(() => {
        if (!openFlyout) return undefined;
        const handler = (event) => {
            if (
                event.target.closest(".sidebar-flyout") ||
                event.target.closest(".sidebar-group-button")
            ) {
                return;
            }
            setOpenFlyout(null);
            setFlyoutRect(null);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [openFlyout]);

    /* auto-close flyout when sidebar expands */
    useEffect(() => {
        if (!collapsed) {
            setOpenFlyout(null);
            setFlyoutRect(null);
        }
    }, [collapsed]);

    const toggleGroup = (key) => (event) => {
        if (!collapsed) {
            if (key === "inventory") setInventoryOpen((o) => !o);
            if (key === "purchases") setPurchasesOpen((o) => !o);
            if (key === "sales") setSalesOpen((o) => !o);
            return;
        }
        if (openFlyout === key) {
            setOpenFlyout(null);
            setFlyoutRect(null);
            return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        setFlyoutRect({ top: rect.top, left: rect.right + 6 });
        setOpenFlyout(key);
    };

    const closeFlyout = () => {
        setOpenFlyout(null);
        setFlyoutRect(null);
    };

    const displayName = user?.name || "D2W User";
    const email = user?.email || "Email not available";
    const initials =
        displayName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0].toUpperCase())
            .join("") || "DU";
    const roleLabel =
        {
            SUPER_ADMIN: "Super Admin",
            STORE_OWNER: "Store Owner",
            CASHIER: "Cashier",
        }[user?.role] || "User";

    /* ---------- style helpers (aware of collapsed) ---------- */

    const linkStyle = (to, danger = false) => {
        const isActive = location.pathname === to;
        return {
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: collapsed ? 0 : "12px",
            minHeight: collapsed ? "60px" : "40px",
            color: danger ? "#FCA5A5" : isActive ? "#FFFFFF" : "#94A3B8",
            textDecoration: "none",
            padding: collapsed ? "8px 0" : "8px 12px",
            borderRadius: "6px",
            fontSize: "13.5px",
            fontWeight: isActive ? 700 : 600,
            background:
                isActive && !danger ? "rgba(37, 99, 235, 0.72)" : "transparent",
            boxSizing: "border-box",
            flexDirection: collapsed ? "column" : "row",
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

    const groupButtonStyle = (isActive) => ({
        width: "100%",
        minHeight: collapsed ? "60px" : "40px",
        flexDirection: collapsed ? "column" : "row",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: collapsed ? 0 : "12px",
        color: isActive ? "#FFFFFF" : "#94A3B8",
        padding: collapsed ? "8px 0" : "8px 12px",
        border: 0,
        borderRadius: "6px",
        background: isActive ? "rgba(37, 99, 235, 0.34)" : "transparent",
        fontFamily: "inherit",
        fontSize: "13.5px",
        fontWeight: isActive ? 700 : 600,
        cursor: "pointer",
    });

    const moduleLinkStyle = (routeActive, currentView, view) => ({
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minHeight: "34px",
        color:
            routeActive && currentView === view ? "#FFFFFF" : "#94A3B8",
        textDecoration: "none",
        padding: "7px 12px 7px 40px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: routeActive && currentView === view ? 700 : 500,
        background:
            routeActive && currentView === view
                ? "rgba(37, 99, 235, 0.72)"
                : "transparent",
        boxSizing: "border-box",
    });

    const flyoutLinkStyle = (isActive) => ({
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minHeight: "34px",
        color: isActive ? "#FFFFFF" : "#CBD5E1",
        textDecoration: "none",
        padding: "7px 12px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: isActive ? 700 : 500,
        background: isActive
            ? "rgba(37, 99, 235, 0.72)"
            : "transparent",
        whiteSpace: "nowrap",
        boxSizing: "border-box",
    });

    /* ---------- nav data ---------- */

    const inventoryItems = [
        { key: "stock", label: "Current Stock", icon: PackageSearch },
        { key: "bulkstock", label: "Opening & Bulk Stock", icon: Upload },
        { key: "transactions", label: "Transactions", icon: History },
        { key: "adjustment", label: "Adjustments", icon: SlidersHorizontal },
        { key: "batchreport", label: "Batch Report", icon: ClipboardList },
        { key: "barcode", label: "Barcodes", icon: Barcode },
    ];

    const purchaseItems = [
        { key: "vendors", label: "Vendors", icon: UsersRound },
        { key: "bills", label: "Bills", icon: CirclePlus },
        { key: "requestd2w", label: "D2W Stock Requests", icon: Truck },
    ];

    const salesItems = [
        {
            key: "invoices",
            label: "Sales Invoices",
            icon: ReceiptText,
            to: salesBase,
            active: location.pathname === salesBase,
        },
        {
            key: "pos",
            label: "POS",
            icon: ShoppingCart,
            to: "/pos",
            active: location.pathname === "/pos",
        },
        {
            key: "proforma",
            label: "Proforma Invoices",
            icon: ReceiptText,
            to: `${salesBase}/proforma`,
            active: location.pathname.startsWith(`${salesBase}/proforma`),
        },
        {
            key: "leads",
            label: "Leads",
            icon: ClipboardList,
            to: `${salesBase}/leads`,
            active: location.pathname.startsWith(`${salesBase}/leads`),
        },
    ];

    const sidebarWidth = collapsed ? 80 : 238;

    /* ============================================================ */

    return (
        <>
            <aside
                style={{
                    width: `${sidebarWidth}px`,
                    background:
                        "linear-gradient(180deg,#071633 0%,#0B2A66 50%,#1247A8 100%)",
                    color: "#FFFFFF",
                    minHeight: "100vh",
                    padding: collapsed ? "18px 8px 14px" : "18px 14px 14px",
                    display: "flex",
                    flexDirection: "column",
                    fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                    boxSizing: "border-box",
                    flexShrink: 0,
                    transition: "width 0.2s ease, padding 0.2s ease",
                }}
            >
                {/* header: logo + hamburger */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: collapsed
                            ? "center"
                            : "space-between",
                        gap: "8px",
                        padding: collapsed ? "0 0 16px" : "0 4px 16px",
                    }}
                >
                    {!collapsed && (
                        <img
                            src={logo}
                            alt="Deals2Wheels"
                            style={{
                                width: "150px",
                                height: "auto",
                                objectFit: "contain",
                            }}
                        />
                    )}
                    <button
                        type="button"
                        className="sidebar-toggle-btn"
                        onClick={() => setCollapsed((c) => !c)}
                        aria-label={
                            collapsed ? "Expand sidebar" : "Collapse sidebar"
                        }
                        title={collapsed ? "Expand" : "Collapse"}
                    >
                        <Menu size={18} />
                    </button>
                </div>

                <nav
                    className="app-sidebar-nav"
                    style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
                >
                    {/* Dashboard */}
                    <Link
                        to={isOwner ? "/owner/dashboard" : "/store/dashboard"}
                        style={linkStyle(
                            isOwner ? "/owner/dashboard" : "/store/dashboard"
                        )}
                        title={collapsed ? "Dashboard" : undefined}
                    >
                        <House size={17} />
                        <NavLabel collapsed={collapsed}>Dashboard</NavLabel>
                    </Link>

                    {isOwner && !collapsed && (
                        <div style={sectionLabelStyle}>Catalog</div>
                    )}
                    {/* {isOwner && collapsed && (
                        <div className="sidebar-divider" />
                    )} */}

                    {isOwner && (
                        <Link
                            to="/owner/products"
                            style={linkStyle("/owner/products")}
                            title={collapsed ? "Product Management" : undefined}
                        >
                            <Boxes size={17} />
                            <NavLabel collapsed={collapsed}>Product Management</NavLabel>
                        </Link>
                    )}

                    {isOwner && (
                        <Link
                            to="/owner/product-approval"
                            style={linkStyle("/owner/product-approval")}
                            title={collapsed ? "Product Approval" : undefined}
                        >
                            <ClipboardCheck size={17} />
                            <NavLabel collapsed={collapsed}>Product Approval</NavLabel>
                        </Link>
                    )}

                    {isOwner && (
                        <Link
                            to="/owner/vehicles"
                            style={linkStyle("/owner/vehicles")}
                            title={collapsed ? "Vehicle Management" : undefined}
                        >
                            <CarFront size={17} />
                           <NavLabel collapsed={collapsed}>Vehicle Management</NavLabel>
                        </Link>
                    )}

                    {!collapsed && (
                        <div style={sectionLabelStyle}>Operations</div>
                    )}
                    {/* {collapsed && <div className="sidebar-divider" />} */}

                    {/* Inventory group */}
                    <button
                        type="button"
                        className="sidebar-group-button"
                        onClick={toggleGroup("inventory")}
                        aria-expanded={
                            collapsed
                                ? openFlyout === "inventory"
                                : inventoryOpen
                        }
                        style={groupButtonStyle(isInventoryRoute)}
                        title={collapsed ? "Inventory" : undefined}
                    >
                        <Boxes size={17} />
                        <NavLabel collapsed={collapsed}>Inventory</NavLabel>
                        {!collapsed && (
                            inventoryOpen
                                ? <ChevronDown size={16} />
                                : <ChevronRight size={16} />
                        )}
                    </button>

                    {!collapsed && inventoryOpen && (
                        <div
                            style={{
                                display: "grid",
                                gap: "2px",
                                margin: "3px 0 7px",
                            }}
                        >
                            {inventoryItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.key}
                                        to={`${inventoryBase}?view=${item.key}`}
                                        style={moduleLinkStyle(
                                            isInventoryRoute,
                                            inventoryView,
                                            item.key
                                        )}
                                    >
                                        <Icon size={15} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* Purchases group */}
                    <button
                        type="button"
                        className="sidebar-group-button"
                        onClick={toggleGroup("purchases")}
                        aria-expanded={
                            collapsed
                                ? openFlyout === "purchases"
                                : purchasesOpen
                        }
                        style={groupButtonStyle(isPurchasesRoute)}
                        title={collapsed ? "Purchases" : undefined}
                    >
                        <ShoppingCart size={17} />
                        <NavLabel collapsed={collapsed}>Purchases</NavLabel>
                        {!collapsed && (
                            purchasesOpen
                                ? <ChevronDown size={16} />
                                : <ChevronRight size={16} />
                        )}
                    </button>

                    {!collapsed && purchasesOpen && (
                        <div
                            style={{
                                display: "grid",
                                gap: "2px",
                                margin: "3px 0 7px",
                            }}
                        >
                            {purchaseItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.key}
                                        to={`${purchasesBase}?view=${item.key}`}
                                        style={moduleLinkStyle(
                                            isPurchasesRoute,
                                            purchasesView,
                                            item.key
                                        )}
                                    >
                                        <Icon size={15} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* Sales group */}
                    <button
                        type="button"
                        className="sidebar-group-button"
                        onClick={toggleGroup("sales")}
                        aria-expanded={
                            collapsed ? openFlyout === "sales" : salesOpen
                        }
                        style={groupButtonStyle(
                            location.pathname.startsWith(salesBase)
                        )}
                        title={collapsed ? "Sales" : undefined}
                    >
                        <ReceiptText size={17} />
                       <NavLabel collapsed={collapsed}>Sales</NavLabel>
                        {!collapsed && (
                            salesOpen
                                ? <ChevronDown size={16} />
                                : <ChevronRight size={16} />
                        )}
                    </button>

                    {!collapsed && salesOpen && (
                        <div
                            style={{
                                display: "grid",
                                gap: "2px",
                                margin: "3px 0 7px",
                            }}
                        >
                            {salesItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.key}
                                        to={item.to}
                                        style={{
                                            ...moduleLinkStyle(
                                                item.active,
                                                "",
                                                ""
                                            ),
                                            paddingLeft: "40px",
                                        }}
                                    >
                                        <Icon size={15} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* Reports */}
                    <Link
                        to={isOwner ? "/owner/reports" : "/store/reports"}
                        style={linkStyle(
                            isOwner ? "/owner/reports" : "/store/reports"
                        )}
                        title={collapsed ? "Reports" : undefined}
                    >
                        <FileChartColumn size={17} />
                        <NavLabel collapsed={collapsed}>Reports</NavLabel>
                    </Link>

                    {isOwner && !collapsed && (
                        <div style={sectionLabelStyle}>Organization</div>
                    )}
                    {isOwner && collapsed && (
                        <div className="sidebar-divider" />
                    )}

                    {isOwner && (
                        <Link
                            to="/owner/stores"
                            style={linkStyle("/owner/stores")}
                            title={collapsed ? "Stores" : undefined}
                        >
                            <Building2 size={17} />
                            <NavLabel collapsed={collapsed}>Stores</NavLabel>
                        </Link>
                    )}

                    {isOwner && (
                        <Link
                            to="/owner/users"
                            style={linkStyle("/owner/users")}
                            title={collapsed ? "Users" : undefined}
                        >
                            <UserRound size={17} />
                           <NavLabel collapsed={collapsed}>Users</NavLabel>
                        </Link>
                    )}

                    {!isOwner && (
                        <>
                            {!collapsed && (
                                <div style={sectionLabelStyle}>Team</div>
                            )}
                            {/* {collapsed && <div className="sidebar-divider" />} */}
                            <Link
                                to="/store/users"
                                style={linkStyle("/store/users")}
                                title={collapsed ? "Employees" : undefined}
                            >
                                <UserRound size={17} />
                                <NavLabel collapsed={collapsed}>Employees</NavLabel>
                            </Link>
                        </>
                    )}
                </nav>

                {/* footer card */}
                <div
                    style={{
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        paddingTop: "14px",
                        marginTop: "12px",
                    }}
                >
                    {collapsed ? (
                        <Link
                            to="/login"
                            onClick={() => localStorage.removeItem("user")}
                            aria-label="Logout"
                            title="Logout"
                            style={{
                                display: "grid",
                                placeItems: "center",
                                width: "100%",
                                height: "38px",
                                borderRadius: "8px",
                                color: "#FCA5A5",
                                background: "rgba(248,113,113,0.08)",
                                textDecoration: "none",
                            }}
                        >
                            <LogOut size={16} />
                        </Link>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "32px minmax(0, 1fr) 30px",
                                alignItems: "center",
                                gap: "8px",
                                padding: "7px 8px",
                                borderRadius: "10px",
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.08)",
                            }}
                        >
                            <div
                                style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    display: "grid",
                                    placeItems: "center",
                                    color: "#FFFFFF",
                                    background: "#3158D4",
                                    fontSize: "10.5px",
                                    fontWeight: 800,
                                }}
                            >
                                {initials}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: "11.5px",
                                        fontWeight: 750,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {displayName}
                                </div>
                                <div
                                    style={{
                                        marginTop: "2px",
                                        color: "#8EA0BE",
                                        fontSize: "9px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                    title={email}
                                >
                                    {roleLabel} · {email}
                                </div>
                            </div>
                            <Link
                                to="/login"
                                onClick={() =>
                                    localStorage.removeItem("user")
                                }
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
                    )}
                </div>
            </aside>

            {/* Flyout panels — rendered as siblings, positioned with fixed */}
            {collapsed && openFlyout && flyoutRect && (
                <div
                    className="sidebar-flyout"
                    style={{ top: flyoutRect.top, left: flyoutRect.left }}
                >
                    <div className="sidebar-flyout-header">
                        {openFlyout === "inventory" && "Inventory"}
                        {openFlyout === "purchases" && "Purchases"}
                        {openFlyout === "sales" && "Sales"}
                    </div>

                    <div className="sidebar-flyout-body">
                        {openFlyout === "inventory" &&
                            inventoryItems.map((item) => {
                                const Icon = item.icon;
                                const active =
                                    isInventoryRoute &&
                                    inventoryView === item.key;
                                return (
                                    <Link
                                        key={item.key}
                                        to={`${inventoryBase}?view=${item.key}`}
                                        style={flyoutLinkStyle(active)}
                                        onClick={closeFlyout}
                                    >
                                        <Icon size={15} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}

                        {openFlyout === "purchases" &&
                            purchaseItems.map((item) => {
                                const Icon = item.icon;
                                const active =
                                    isPurchasesRoute &&
                                    purchasesView === item.key;
                                return (
                                    <Link
                                        key={item.key}
                                        to={`${purchasesBase}?view=${item.key}`}
                                        style={flyoutLinkStyle(active)}
                                        onClick={closeFlyout}
                                    >
                                        <Icon size={15} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}

                        {openFlyout === "sales" &&
                            salesItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.key}
                                        to={item.to}
                                        style={flyoutLinkStyle(item.active)}
                                        onClick={closeFlyout}
                                    >
                                        <Icon size={15} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                    </div>
                </div>
            )}
        </>
    );
}

export default Sidebar;