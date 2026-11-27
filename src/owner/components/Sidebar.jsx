
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
    Printer,
    ReceiptText,
    Settings,
    ShoppingCart,
    ShieldCheck,
    SlidersHorizontal,
    Truck,
    UserRound,
    UsersRound,
} from "lucide-react";

import logo from "../../assets/NEW LOGO D2W.png";
import api from "../../services/api";
import { useAuthActions, useAuthState } from "../../auth/AuthContext";
import "./Sidebar.css";

const accessibleStoresCache = {
    userId: null,
    data: null,
    promise: null,
};

function NavLabel({ collapsed, children }) {
    return (
        <span className={collapsed ? "sidebar-label-rail" : ""}>
            {children}
        </span>
    );
}

function Sidebar() {
    const {
        user,
        hasPermission,
        hasAnyPermission,
        hasGlobalStoreManagementAuthority,
        activeStoreId,
    } = useAuthState();
    const { logoutSession, switchActiveStore } = useAuthActions();
    const location = useLocation();
    const userId = user?.userId ?? null;

    const [accessibleStores, setAccessibleStores] = useState(() =>
        userId && accessibleStoresCache.userId === userId && accessibleStoresCache.data
            ? accessibleStoresCache.data
            : []
    );

    useEffect(() => {
        if (!userId) {
            accessibleStoresCache.userId = null;
            accessibleStoresCache.data = null;
            accessibleStoresCache.promise = null;
            setAccessibleStores([]);
            return;
        }

        if (accessibleStoresCache.userId === userId && accessibleStoresCache.data) {
            setAccessibleStores(accessibleStoresCache.data);
            return;
        }

        let mounted = true;
        if (accessibleStoresCache.userId !== userId || !accessibleStoresCache.promise) {
            accessibleStoresCache.userId = userId;
            accessibleStoresCache.data = null;
            accessibleStoresCache.promise = api
                .get("/access-control/stores")
                .then((res) => {
                    const list = Array.isArray(res.data) ? res.data : [];
                    if (accessibleStoresCache.userId === userId) {
                        accessibleStoresCache.data = list;
                    }
                    return list;
                })
                .catch(() => {
                    if (accessibleStoresCache.userId === userId) {
                        accessibleStoresCache.promise = null;
                    }
                    return [];
                });
        }

        accessibleStoresCache.promise.then((list) => {
            if (mounted && accessibleStoresCache.userId === userId) {
                setAccessibleStores(list);
            }
        });

        return () => {
            mounted = false;
        };
    }, [userId]);

    const hasGlobalAuthority = hasGlobalStoreManagementAuthority();
    const isGlobalPortal = hasGlobalAuthority || user?.storeId == null;
    const portalPrefix = isGlobalPortal ? "/owner" : "/store";

    const canViewUsers = hasGlobalAuthority || hasPermission?.("EMPLOYEES.VIEW");
    const canManageRoles =
        hasGlobalAuthority ||
        hasAnyPermission?.([
            "ROLES.VIEW",
            "ROLES.CREATE",
            "ROLES.UPDATE",
            "ROLES.ASSIGN",
            "PERMISSIONS.VIEW",
            "PERMISSIONS.MANAGE",
        ]);
    const canViewStores = hasGlobalAuthority || hasPermission?.("STORES.VIEW");
    const canManageSettings = hasGlobalAuthority || hasPermission?.("STORES.UPDATE");
    const canViewDashboard = hasGlobalAuthority || hasPermission?.("DASHBOARD.VIEW");
    const canViewCatalogue =
        hasGlobalAuthority ||
        hasAnyPermission?.(["CATALOGUE.VIEW", "CATALOGUE.CREATE", "CATALOGUE.UPDATE"]);
    const canApproveLocalProducts =
        hasGlobalAuthority || hasPermission?.("LOCAL_PRODUCTS.APPROVE");
    const canViewVehicles =
        hasGlobalAuthority || hasAnyPermission?.(["VEHICLES.VIEW", "VEHICLES.MANAGE"]);
    const canViewInventory =
        hasGlobalAuthority ||
        hasAnyPermission?.([
            "INVENTORY.VIEW",
            "INVENTORY.ADJUST",
            "INVENTORY.TRANSFER",
            "BARCODES.PRINT",
        ]);
    const canViewPurchases =
        hasGlobalAuthority ||
        hasAnyPermission?.([
            "PURCHASE_ORDERS.VIEW",
            "PURCHASE_ORDERS.CREATE",
            "VENDORS.VIEW",
            "VENDORS.MANAGE",
        ]);
    const canViewSales =
        hasGlobalAuthority ||
        hasAnyPermission?.([
            "SALES.VIEW",
            "SALES.CREATE",
            "SALES.PAYMENT",
            "PAYMENTS.RECEIVE",
            "PROFORMA.VIEW",
            "LEADS.VIEW",
            "LEADS.CREATE",
            "LEADS.PROCUREMENT",
        ]);
    const canViewReports = hasGlobalAuthority || hasPermission?.("REPORTS.VIEW");

    const inventoryBase = `${portalPrefix}/inventory`;
    const purchasesBase = `${portalPrefix}/purchases`;
    const salesBase = `${portalPrefix}/sales`;

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
    const [settingsOpen, setSettingsOpen] = useState(
        location.pathname.startsWith(`${portalPrefix}/settings`)
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

            if (key === "settings") {
                setSettingsOpen((open) => !open);
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

    const roleLabel = user?.role || "User";

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

    const canPrintBarcodes = hasGlobalAuthority || hasPermission?.("BARCODES.PRINT");
    const canAdjustInventory = hasGlobalAuthority || hasPermission?.("INVENTORY.ADJUST");
    const canViewInventoryStock = hasGlobalAuthority || hasPermission?.("INVENTORY.VIEW");

    const filteredInventoryItems = inventoryItems.filter((item) => {
        if (item.key === "barcode") return canPrintBarcodes;
        if (item.key === "adjustment") return canAdjustInventory;
        return canViewInventoryStock;
    });

    const canViewVendors =
        hasGlobalAuthority || hasAnyPermission?.(["VENDORS.VIEW", "VENDORS.MANAGE"]);
    const canViewOrders =
        hasGlobalAuthority ||
        hasAnyPermission?.(["PURCHASE_ORDERS.VIEW", "PURCHASE_ORDERS.CREATE"]);

    const filteredPurchaseItems = purchaseItems.filter((item) => {
        if (item.key === "vendors") return canViewVendors;
        return canViewOrders;
    });

    const canViewSalesOrders = hasGlobalAuthority || hasPermission?.("SALES.VIEW");
    const canAccessPos =
        hasGlobalAuthority ||
        hasAnyPermission?.(["SALES.VIEW", "SALES.CREATE", "SALES.PAYMENT", "PAYMENTS.RECEIVE"]);
    const canViewProforma = hasGlobalAuthority || hasPermission?.("PROFORMA.VIEW");
    const canViewLeads =
        hasGlobalAuthority ||
        hasAnyPermission?.(["LEADS.VIEW", "LEADS.CREATE", "LEADS.PROCUREMENT"]);

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
                    {/* Dashboard */}
                    {canViewDashboard && (
                        <Link
                            to={`${portalPrefix}/dashboard`}
                            style={linkStyle(`${portalPrefix}/dashboard`)}
                            title={collapsed ? "Dashboard" : undefined}
                        >
                            <House size={17} />
                            <NavLabel collapsed={collapsed}>
                                Dashboard
                            </NavLabel>
                        </Link>
                    )}

                    {(canViewCatalogue || canApproveLocalProducts || canViewVehicles) && !collapsed && (
                        <div style={sectionLabelStyle}>
                            Catalog
                        </div>
                    )}

                    {canViewCatalogue && (
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

                    {canApproveLocalProducts && (
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

                    {canViewVehicles && (
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
                            to={`${portalPrefix}/reports`}
                            style={linkStyle(`${portalPrefix}/reports`)}
                            title={collapsed ? "Reports" : undefined}
                        >
                            <FileChartColumn size={17} />
                            <NavLabel collapsed={collapsed}>
                                Reports
                            </NavLabel>
                        </Link>
                    )}

                    {/* Global organization and access control */}
                    {isGlobalPortal && (canViewStores || canViewUsers || canManageRoles) && (
                        <>
                            {!collapsed ? (
                                <div style={sectionLabelStyle}>
                                    Organization
                                </div>
                            ) : (
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

                            {canManageRoles && (
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
                        </>
                    )}

                    {/* Store team and role management */}
                    {!isGlobalPortal && (canViewUsers || canManageRoles) && (
                        <>
                            {!collapsed && (
                                <div style={sectionLabelStyle}>
                                    Team
                                </div>
                            )}

                            {canViewUsers && (
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

                    {canManageSettings && (
                        <>
                            {!collapsed ? (
                                <div style={sectionLabelStyle}>
                                    Settings
                                </div>
                            ) : (
                                <div className="sidebar-divider" />
                            )}

                            <button
                                type="button"
                                className="sidebar-group-button"
                                onClick={toggleGroup("settings")}
                                aria-expanded={
                                    collapsed
                                        ? openFlyout === "settings"
                                        : settingsOpen
                                }
                                style={groupButtonStyle(
                                    location.pathname.startsWith(`${portalPrefix}/settings`)
                                )}
                                title={collapsed ? "Settings" : undefined}
                            >
                                <Settings size={17} />
                                <NavLabel collapsed={collapsed}>
                                    Settings
                                </NavLabel>

                                {!collapsed &&
                                    (settingsOpen ? (
                                        <ChevronDown size={16} />
                                    ) : (
                                        <ChevronRight size={16} />
                                    ))}
                            </button>

                            {!collapsed && settingsOpen && (
                                <div
                                    style={{
                                        display: "grid",
                                        gap: "2px",
                                        margin: "3px 0 7px",
                                    }}
                                >
                                    <Link
                                        to={`${portalPrefix}/settings`}
                                        style={{
                                            ...moduleLinkStyle(
                                                location.pathname.startsWith(`${portalPrefix}/settings`)
                                            ),
                                            paddingLeft: "34px",
                                        }}
                                    >
                                        <Printer size={15} />
                                        <span>Print</span>
                                    </Link>
                                </div>
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
                        {openFlyout === "settings" && "Settings"}
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

                        {openFlyout === "settings" && (
                            <Link
                                to={`${portalPrefix}/settings`}
                                style={flyoutLinkStyle(
                                    location.pathname.startsWith(`${portalPrefix}/settings`)
                                )}
                                onClick={closeFlyout}
                            >
                                <Printer size={15} />
                                <span>Print</span>
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

export default Sidebar;
