
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
    ShieldCheck,
    SlidersHorizontal,
    Truck,
    UserRound,
    UsersRound,
} from "lucide-react";

import logo from "../../assets/NEW LOGO D2W.png";
import { useAuth } from "../../auth/AuthContext";
import "./Sidebar.css";

function NavLabel({ collapsed, children }) {
    return (
        <span className={collapsed ? "sidebar-label-rail" : ""}>
            {children}
        </span>
    );
}

function Sidebar() {
    const { user, logoutSession, hasPermission, hasAnyPermission, activeStoreId, switchActiveStore } = useAuth();
    const location = useLocation();

    const [accessibleStores, setAccessibleStores] = useState([]);

    useEffect(() => {
        let mounted = true;
        if (user) {
            import("../../services/api").then(({ default: api }) => {
                api.get("/access-control/stores")
                    .then((res) => {
                        if (mounted && Array.isArray(res.data)) {
                            setAccessibleStores(res.data);
                        }
                    })
                    .catch(() => {});
            });
        }
        return () => { mounted = false; };
    }, [user]);

    const isOwner = user?.role === "SUPER_ADMIN";
    const isStoreOwner = user?.role === "STORE_OWNER";
    const canViewUsers = isOwner || isStoreOwner || hasAnyPermission?.(["EMPLOYEES.VIEW"]);
    const canManageRoles = isOwner || isStoreOwner || hasAnyPermission?.(["ROLES.VIEW", "ROLES.CREATE", "ROLES.UPDATE", "ROLES.ASSIGN"]);
    const canManageSystemRoles = isOwner || hasPermission?.("ROLES.CREATE") || hasPermission?.("PERMISSIONS.MANAGE");
    const canViewStores = isOwner || hasPermission?.("STORES.VIEW");
    const canViewDashboard = isOwner || isStoreOwner || hasPermission?.("DASHBOARD.VIEW");
    const canViewInventory = isOwner || isStoreOwner || hasAnyPermission?.(["INVENTORY.VIEW", "INVENTORY.ADJUST", "INVENTORY.TRANSFER", "BARCODES.PRINT"]);
    const canViewPurchases = isOwner || isStoreOwner || hasAnyPermission?.(["PURCHASE_ORDERS.VIEW", "PURCHASE_ORDERS.CREATE", "VENDORS.VIEW", "VENDORS.MANAGE"]);
    const canViewSales = isOwner || isStoreOwner || user?.role === "CASHIER" || hasAnyPermission?.(["SALES.VIEW", "SALES.CREATE", "PROFORMA.VIEW", "LEADS.VIEW"]);
    const canViewReports = isOwner || isStoreOwner || hasPermission?.("REPORTS.VIEW");
    const isSalesperson = user?.role === "SALESPERSON";
    const isProcurement = user?.role === "PROCUREMENT";
    const isLeadStaff = isSalesperson || isProcurement;

    const homeBase = isSalesperson
        ? "/salesperson"
        : isProcurement
            ? "/procurement"
            : isOwner
                ? "/owner"
                : "/store";

    const inventoryBase = isOwner ? "/owner/inventory" : "/store/inventory";
    const purchasesBase = isOwner ? "/owner/purchases" : "/store/purchases";
    const salesBase = isOwner
        ? "/owner/sales"
        : isLeadStaff
            ? `${homeBase}/sales`
            : "/store/sales";

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

    // Expand/collapse submenu state
    const [inventoryOpen, setInventoryOpen] = useState(isInventoryRoute);
    const [purchasesOpen, setPurchasesOpen] = useState(isPurchasesRoute);
    const [salesOpen, setSalesOpen] = useState(
        location.pathname.startsWith(salesBase)
    );

    // Collapsed sidebar state
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem("sidebar-collapsed") === "true";
        } catch {
            return false;
        }
    });

    const [openFlyout, setOpenFlyout] = useState(null);
    const [flyoutRect, setFlyoutRect] = useState(null);

    // Persist sidebar state
    useEffect(() => {
        try {
            localStorage.setItem("sidebar-collapsed", String(collapsed));
        } catch {
            // Ignore storage errors
        }
    }, [collapsed]);

    // Close flyout when clicking outside
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

        return () => {
            document.removeEventListener("mousedown", handler);
        };
    }, [openFlyout]);

    // Close flyout when sidebar expands
    useEffect(() => {
        if (!collapsed) {
            setOpenFlyout(null);
            setFlyoutRect(null);
        }
    }, [collapsed]);

    const toggleGroup = (key) => (event) => {
        if (!collapsed) {
            if (key === "inventory") {
                setInventoryOpen((open) => !open);
            }

            if (key === "purchases") {
                setPurchasesOpen((open) => !open);
            }

            if (key === "sales") {
                setSalesOpen((open) => !open);
            }

            return;
        }

        if (openFlyout === key) {
            setOpenFlyout(null);
            setFlyoutRect(null);
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();

        setFlyoutRect({
            top: rect.top,
            left: rect.right + 6,
        });

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

    const roleLabel = {
        SUPER_ADMIN: "Super Admin",
        STORE_OWNER: "Store Owner",
        CASHIER: "Cashier",
        SALESPERSON: "Salesperson",
        PROCUREMENT: "Procurement",
    }[user?.role] || "User";

    // Style helpers
    const linkStyle = (to, danger = false) => {
        const isActive =
            location.pathname === to ||
            (to !== "/" && location.pathname.startsWith(`${to}/`));

        return {
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: collapsed ? 0 : "12px",
            minHeight: collapsed ? "60px" : "40px",
            color: danger
                ? "#FF8080"
                : isActive
                    ? "#FFFFFF"
                    : "#CBD5E1",
            textDecoration: "none",
            padding: collapsed ? "8px 0" : "8px 12px",
            borderRadius: "6px",
            fontSize: "13.5px",
            fontWeight: isActive ? 700 : 500,
            background:
                isActive && !danger ? "#1E40AF" : "transparent",
            boxSizing: "border-box",
            flexDirection: collapsed ? "column" : "row",
        };
    };

    const sectionLabelStyle = {
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.8px",
        textTransform: "uppercase",
        color: "#94A3B8",
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
        color: isActive ? "#FFFFFF" : "#CBD5E1",
        padding: collapsed ? "8px 0" : "8px 12px",
        border: 0,
        borderRadius: "6px",
        background: isActive ? "#1E3A8A" : "transparent",
        fontFamily: "inherit",
        fontSize: "13.5px",
        fontWeight: isActive ? 700 : 500,
        cursor: "pointer",
    });

    const moduleLinkStyle = (routeActive, currentView, view) => ({
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minHeight: "34px",
        color:
            routeActive && currentView === view
                ? "#FFFFFF"
                : "#CBD5E1",
        textDecoration: "none",
        padding: "7px 12px 7px 40px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight:
            routeActive && currentView === view ? 700 : 500,
        background:
            routeActive && currentView === view
                ? "#1E40AF"
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
        background: isActive ? "#1E40AF" : "transparent",
        whiteSpace: "nowrap",
        boxSizing: "border-box",
    });

    // Navigation data
    const inventoryItems = [
        { key: "stock", label: "Current Stock", icon: PackageSearch },
        { key: "transactions", label: "Transactions", icon: History },
        { key: "adjustment", label: "Adjustments", icon: SlidersHorizontal },
        { key: "batchreport", label: "Batch Report", icon: ClipboardList },
        { key: "barcode", label: "Barcodes", icon: Barcode },
    ];

    const purchaseItems = [
        { key: "vendors", label: "Vendors", icon: UsersRound },
        { key: "vendororders", label: "Vendor Orders", icon: ClipboardList },
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

    const canPrintBarcodes = isOwner || isStoreOwner || hasPermission?.("BARCODES.PRINT");
    const canAdjustInventory = isOwner || isStoreOwner || hasPermission?.("INVENTORY.ADJUST");
    const canViewInventoryStock = isOwner || isStoreOwner || hasPermission?.("INVENTORY.VIEW");

    const filteredInventoryItems = inventoryItems.filter((item) => {
        if (item.key === "barcode") return canPrintBarcodes;
        if (item.key === "adjustment") return canAdjustInventory;
        return canViewInventoryStock;
    });

    const canViewVendors = isOwner || isStoreOwner || hasAnyPermission?.(["VENDORS.VIEW", "VENDORS.MANAGE"]);
    const canViewOrders = isOwner || isStoreOwner || hasAnyPermission?.(["PURCHASE_ORDERS.VIEW", "PURCHASE_ORDERS.CREATE"]);

    const filteredPurchaseItems = purchaseItems.filter((item) => {
        if (item.key === "vendors") return canViewVendors;
        return canViewOrders;
    });

    const canViewSalesOrders = isOwner || isStoreOwner || user?.role === "CASHIER" || hasPermission?.("SALES.VIEW");
    const canAccessPos = isOwner || isStoreOwner || user?.role === "CASHIER" || hasAnyPermission?.(["SALES.VIEW", "SALES.CREATE", "PAYMENTS.RECEIVE"]);
    const canViewProforma = isOwner || isStoreOwner || hasPermission?.("PROFORMA.VIEW");
    const canViewLeads = isOwner || isStoreOwner || hasPermission?.("LEADS.VIEW");

    const filteredSalesItems = salesItems.filter((item) => {
        if (item.key === "invoices") return canViewSalesOrders;
        if (item.key === "pos") return canAccessPos;
        if (item.key === "proforma") return canViewProforma;
        if (item.key === "leads") return canViewLeads;
        return true;
    });

    const sidebarWidth = collapsed ? 80 : 238;

    return (
        <>
            <aside
                className={
                    collapsed
                        ? "dashboard-sidebar-wrap dashboard-sidebar-wrap--collapsed"
                        : "dashboard-sidebar-wrap"
                }
                style={{
                    width: `${sidebarWidth}px`,
                    backgroundColor: "#0A1128",
                    color: "#FFFFFF",
                    minHeight: "100vh",
                    padding: collapsed
                        ? "8px 8px 14px"
                        : "8px 14px 14px",
                    display: "flex",
                    flexDirection: "column",
                    fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif",
                    borderRight: "1px solid #1E293B",
                    boxSizing: "border-box",
                    flexShrink: 0,
                    transition: "width 0.2s ease, padding 0.2s ease",
                    height: "100vh",
                    margin: 0,
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: collapsed
                            ? "center"
                            : "space-between",
                        gap: "8px",
                        padding: collapsed
                            ? "0 0 16px"
                            : "0 4px 16px",
                        borderBottom: "1px solid #1E293B",
                        marginBottom: "12px",
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
                        onClick={() => setCollapsed((value) => !value)}
                        aria-label={
                            collapsed
                                ? "Expand sidebar"
                                : "Collapse sidebar"
                        }
                        title={collapsed ? "Expand" : "Collapse"}
                    >
                        <Menu size={18} />
                    </button>
                </div>

                <nav
                    className="app-sidebar-nav"
                    style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                    }}
                >
                    {isLeadStaff ? (
                        <>
                            <Link
                                to={`${homeBase}/dashboard`}
                                style={linkStyle(`${homeBase}/dashboard`)}
                            >
                                <House size={17} />
                                <NavLabel collapsed={collapsed}>
                                    Dashboard
                                </NavLabel>
                            </Link>

                            {!collapsed && (
                                <div style={sectionLabelStyle}>
                                    {isSalesperson ? "Sales" : "Operations"}
                                </div>
                            )}

                            <Link
                                to={`${homeBase}/sales/leads`}
                                style={linkStyle(`${homeBase}/sales/leads`)}
                            >
                                {isSalesperson ? (
                                    <ClipboardList size={17} />
                                ) : (
                                    <PackageSearch size={17} />
                                )}

                                <NavLabel collapsed={collapsed}>
                                    {isSalesperson
                                        ? "My Leads"
                                        : "Assigned Procurement"}
                                </NavLabel>
                            </Link>
                        </>
                    ) : (
                        <>
                            {/* Dashboard */}
                            {canViewDashboard && (
                                <Link
                                    to={
                                        isOwner
                                            ? "/owner/dashboard"
                                            : "/store/dashboard"
                                    }
                                    style={linkStyle(
                                        isOwner
                                            ? "/owner/dashboard"
                                            : "/store/dashboard"
                                    )}
                                    title={collapsed ? "Dashboard" : undefined}
                                >
                                    <House size={17} />
                                    <NavLabel collapsed={collapsed}>
                                        Dashboard
                                    </NavLabel>
                                </Link>
                            )}

                            {isOwner && !collapsed && (
                                <div style={sectionLabelStyle}>
                                    Catalog
                                </div>
                            )}

                            {(isOwner || hasAnyPermission?.(["CATALOGUE.VIEW", "CATALOGUE.CREATE", "CATALOGUE.UPDATE"])) && (
                                <Link
                                    to="/owner/products"
                                    style={linkStyle("/owner/products")}
                                    title={
                                        collapsed
                                            ? "Product Management"
                                            : undefined
                                    }
                                >
                                    <Boxes size={17} />
                                    <NavLabel collapsed={collapsed}>
                                        Product Management
                                    </NavLabel>
                                </Link>
                            )}

                            {(isOwner || hasPermission?.("LOCAL_PRODUCTS.APPROVE")) && (
                                <Link
                                    to="/owner/product-approval"
                                    style={linkStyle("/owner/product-approval")}
                                    title={
                                        collapsed
                                            ? "Product Approval"
                                            : undefined
                                    }
                                >
                                    <ClipboardCheck size={17} />
                                    <NavLabel collapsed={collapsed}>
                                        Product Approval
                                    </NavLabel>
                                </Link>
                            )}

                            {(isOwner || hasAnyPermission?.(["VEHICLES.VIEW", "VEHICLES.MANAGE"])) && (
                                <Link
                                    to="/owner/vehicles"
                                    style={linkStyle("/owner/vehicles")}
                                    title={
                                        collapsed
                                            ? "Vehicle Management"
                                            : undefined
                                    }
                                >
                                    <CarFront size={17} />
                                    <NavLabel collapsed={collapsed}>
                                        Vehicle Management
                                    </NavLabel>
                                </Link>
                            )}

                            {!collapsed && (canViewInventory || canViewPurchases || canViewSales) && (
                                <div style={sectionLabelStyle}>
                                    Operations
                                </div>
                            )}

                            {/* Inventory */}
                            {canViewInventory && filteredInventoryItems.length > 0 && (
                                <>
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
                                        <NavLabel collapsed={collapsed}>
                                            Inventory
                                        </NavLabel>

                                        {!collapsed &&
                                            (inventoryOpen ? (
                                                <ChevronDown size={16} />
                                            ) : (
                                                <ChevronRight size={16} />
                                            ))}
                                    </button>

                                    {!collapsed && inventoryOpen && (
                                        <div
                                            style={{
                                                display: "grid",
                                                gap: "2px",
                                                margin: "3px 0 7px",
                                            }}
                                        >
                                            {filteredInventoryItems.map((item) => {
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
                                </>
                            )}

                            {/* Purchases */}
                            {canViewPurchases && filteredPurchaseItems.length > 0 && (
                                <>
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
                                        <NavLabel collapsed={collapsed}>
                                            Purchases
                                        </NavLabel>

                                        {!collapsed &&
                                            (purchasesOpen ? (
                                                <ChevronDown size={16} />
                                            ) : (
                                                <ChevronRight size={16} />
                                            ))}
                                    </button>

                                    {!collapsed && purchasesOpen && (
                                        <div
                                            style={{
                                                display: "grid",
                                                gap: "2px",
                                                margin: "3px 0 7px",
                                            }}
                                        >
                                            {filteredPurchaseItems.map((item) => {
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
                                </>
                            )}

                            {/* Sales */}
                            {canViewSales && filteredSalesItems.length > 0 && (
                                <>
                                    <button
                                        type="button"
                                        className="sidebar-group-button"
                                        onClick={toggleGroup("sales")}
                                        aria-expanded={
                                            collapsed
                                                ? openFlyout === "sales"
                                                : salesOpen
                                        }
                                        style={groupButtonStyle(
                                            location.pathname.startsWith(salesBase)
                                        )}
                                        title={collapsed ? "Sales" : undefined}
                                    >
                                        <ReceiptText size={17} />
                                        <NavLabel collapsed={collapsed}>
                                            Sales
                                        </NavLabel>

                                        {!collapsed &&
                                            (salesOpen ? (
                                                <ChevronDown size={16} />
                                            ) : (
                                                <ChevronRight size={16} />
                                            ))}
                                    </button>

                                    {!collapsed && salesOpen && (
                                        <div
                                            style={{
                                                display: "grid",
                                                gap: "2px",
                                                margin: "3px 0 7px",
                                            }}
                                        >
                                            {filteredSalesItems.map((item) => {
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
                                </>
                            )}

                            {/* Reports */}
                            {canViewReports && (
                                <Link
                                    to={
                                        isOwner
                                            ? "/owner/reports"
                                            : "/store/reports"
                                    }
                                    style={linkStyle(
                                        isOwner
                                            ? "/owner/reports"
                                            : "/store/reports"
                                    )}
                                    title={collapsed ? "Reports" : undefined}
                                >
                                    <FileChartColumn size={17} />
                                    <NavLabel collapsed={collapsed}>
                                        Reports
                                    </NavLabel>
                                </Link>
                            )}

                            {/* Organization and access control */}
                            {isOwner && !collapsed && (
                                <div style={sectionLabelStyle}>
                                    Organization
                                </div>
                            )}

                            {isOwner && collapsed && (
                                <div className="sidebar-divider" />
                            )}

                            {canViewStores && (
                                <Link
                                    to="/owner/stores"
                                    style={linkStyle("/owner/stores")}
                                    title={collapsed ? "Stores" : undefined}
                                >
                                    <Building2 size={17} />
                                    <NavLabel collapsed={collapsed}>
                                        Stores
                                    </NavLabel>
                                </Link>
                            )}

                            {canViewUsers && (
                                <Link
                                    to="/owner/users"
                                    style={linkStyle("/owner/users")}
                                    title={collapsed ? "Users" : undefined}
                                >
                                    <UserRound size={17} />
                                    <NavLabel collapsed={collapsed}>
                                        Users
                                    </NavLabel>
                                </Link>
                            )}

                            {/* SYSTEM role management */}
                            {canManageSystemRoles && (
                                <Link
                                    to="/owner/roles"
                                    style={linkStyle("/owner/roles")}
                                    title={
                                        collapsed
                                            ? "Roles & Permissions"
                                            : undefined
                                    }
                                >
                                    <ShieldCheck size={17} />
                                    <NavLabel collapsed={collapsed}>
                                        Roles & Permissions
                                    </NavLabel>
                                </Link>
                            )}

                            {/* Store team and role management */}
                            {!canManageSystemRoles && (canViewUsers || canManageRoles) && (
                                <>
                                    {!collapsed && (
                                        <div style={sectionLabelStyle}>
                                            Team
                                        </div>
                                    )}

                                    {(isStoreOwner || canViewUsers) && (
                                        <Link
                                            to="/store/users"
                                            style={linkStyle("/store/users")}
                                            title={
                                                collapsed
                                                    ? "Employees"
                                                    : undefined
                                            }
                                        >
                                            <UserRound size={17} />
                                            <NavLabel collapsed={collapsed}>
                                                Employees
                                            </NavLabel>
                                        </Link>
                                    )}

                                    {canManageRoles && (
                                        <Link
                                            to="/store/roles"
                                            style={linkStyle("/store/roles")}
                                            title={
                                                collapsed
                                                    ? "Roles & Permissions"
                                                    : undefined
                                            }
                                        >
                                            <ShieldCheck size={17} />
                                            <NavLabel collapsed={collapsed}>
                                                Roles & Permissions
                                            </NavLabel>
                                        </Link>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </nav>

                {/* Footer profile */}
                <div
                    style={{
                        borderTop: "1px solid #1E293B",
                        paddingTop: "14px",
                        marginTop: "12px",
                    }}
                >
                    {collapsed ? (
                        <Link
                            to="/login"
                            onClick={logoutSession}
                            aria-label="Logout"
                            title="Logout"
                            style={{
                                display: "grid",
                                placeItems: "center",
                                width: "100%",
                                height: "38px",
                                borderRadius: "8px",
                                color: "#FF8080",
                                background: "rgba(239, 68, 68, 0.12)",
                                textDecoration: "none",
                            }}
                        >
                            <LogOut size={16} />
                        </Link>
                    ) : (
                        <div>
                            {accessibleStores.length > 1 && (
                                <div style={{ marginBottom: "8px" }}>
                                    <label style={{ fontSize: "10px", color: "#94A3B8", display: "block", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                        Active Store
                                    </label>
                                    <select
                                        value={activeStoreId || (user?.storeId ?? "")}
                                        onChange={(e) => switchActiveStore(e.target.value ? Number(e.target.value) : null)}
                                        style={{
                                            width: "100%",
                                            background: "#111827",
                                            color: "#F8FAFC",
                                            border: "1px solid #1E293B",
                                            borderRadius: "6px",
                                            padding: "4px 8px",
                                            fontSize: "11px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {accessibleStores.map((st) => (
                                            <option key={st.id} value={st.id}>
                                                {st.storeName} ({st.storeCode})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "32px minmax(0, 1fr) 30px",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px",
                                    borderRadius: "8px",
                                    background: "#111827",
                                    border: "1px solid #1E293B",
                                }}
                            >
                            <div
                                style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "6px",
                                    display: "grid",
                                    placeItems: "center",
                                    color: "#FFFFFF",
                                    background: "#2563EB",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                }}
                            >
                                {initials}
                            </div>

                            <div style={{ minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        color: "#FFFFFF",
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
                                        color: "#94A3B8",
                                        fontSize: "10px",
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
                                onClick={logoutSession}
                                aria-label="Logout"
                                title="Logout"
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    display: "grid",
                                    placeItems: "center",
                                    borderRadius: "6px",
                                    color: "#FF8080",
                                    background: "rgba(239, 68, 68, 0.12)",
                                    textDecoration: "none",
                                }}
                            >
                                <LogOut size={15} />
                            </Link>
                        </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Collapsed sidebar flyouts */}
            {collapsed && openFlyout && flyoutRect && (
                <div
                    className="sidebar-flyout"
                    style={{
                        top: flyoutRect.top,
                        left: flyoutRect.left,
                    }}
                >
                    <div className="sidebar-flyout-header">
                        {openFlyout === "inventory" && "Inventory"}
                        {openFlyout === "purchases" && "Purchases"}
                        {openFlyout === "sales" && "Sales"}
                    </div>

                    <div className="sidebar-flyout-body">
                        {openFlyout === "inventory" &&
                            filteredInventoryItems.map((item) => {
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
                            filteredPurchaseItems.map((item) => {
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
                            filteredSalesItems.map((item) => {
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
