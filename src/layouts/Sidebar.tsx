import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

import logo from "../assets/NEW LOGO D2W.png";
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}
function NavLabel({ collapsed, children }) {
  return (
    <span
      className={
        collapsed
          ? "block mt-1 text-[11px] font-semibold leading-[14px] tracking-tight text-center text-slate-300 max-w-full overflow-hidden text-ellipsis whitespace-nowrap group-hover:text-white transition-colors"
          : ""
      }
    >
      {children}
    </span>
  );
}
function Sidebar() {
  const user = getStoredUser();
  const location = useLocation();
  const navigate = useNavigate();
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
    location.pathname.startsWith(salesBase),
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

  const handleFlyoutNav = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(to);
    closeFlyout();
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

  const linkStyle = (to: string, danger = false): React.CSSProperties => {
    const isActive = location.pathname === to;
    return {
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: collapsed ? 0 : "12px",
      minHeight: collapsed ? "60px" : "40px",
      color: danger ? "#FF8080" : isActive ? "#FFFFFF" : "#CBD5E1",
      textDecoration: "none",
      padding: collapsed ? "8px 0" : "8px 12px",
      borderRadius: "6px",
      fontSize: "13.5px",
      fontWeight: isActive ? 700 : 500,
      background: isActive && !danger ? "#1E40AF" : "transparent",
      boxSizing: "border-box",
      flexDirection: collapsed ? "column" : "row",
    };
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    color: "#94A3B8",
    padding: "18px 12px 6px",
  };

  const groupButtonStyle = (isActive: boolean): React.CSSProperties => ({
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

  const moduleLinkStyle = (
    routeActive: boolean,
    currentView: string,
    view: string,
  ): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minHeight: "34px",
    color: routeActive && currentView === view ? "#FFFFFF" : "#CBD5E1",
    textDecoration: "none",
    padding: "7px 12px 7px 40px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: routeActive && currentView === view ? 700 : 500,
    background: routeActive && currentView === view ? "#1E40AF" : "transparent",
    boxSizing: "border-box",
  });

  const flyoutLinkStyle = (isActive: boolean): React.CSSProperties => ({
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

  /* ---------- nav data ---------- */

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

  const sidebarWidth = collapsed ? 80 : 238;

  /* ============================================================ */

  return (
    <>
      <aside
        style={{
          width: `${sidebarWidth}px`,
          backgroundColor: "#0A1128", // Solid clean dark slate navy
          color: "#FFFFFF",
          minHeight: "100vh",
          padding: collapsed ? "8px 8px 14px" : "8px 14px 14px",
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
        {/* header: logo + hamburger */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: "8px",
            padding: collapsed ? "0 0 16px" : "0 4px 16px",
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
            className="inline-flex items-center justify-center w-9 h-9 p-0 border border-slate-700 rounded-md bg-slate-900 text-white cursor-pointer hover:bg-slate-800 hover:border-slate-600 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 transition-colors flex-shrink-0"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            <Menu size={18} />
          </button>
        </div>

        <nav
          className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
        >
          {/* Dashboard */}
          <Link
            to={isOwner ? "/owner/dashboard" : "/store/dashboard"}
            style={linkStyle(isOwner ? "/owner/dashboard" : "/store/dashboard")}
            title={collapsed ? "Dashboard" : undefined}
          >
            <House size={17} />
            <NavLabel collapsed={collapsed}>Dashboard</NavLabel>
          </Link>

          {isOwner && !collapsed && (
            <div style={sectionLabelStyle}>Catalog</div>
          )}

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

          {!collapsed && <div style={sectionLabelStyle}>Operations</div>}

          {/* Inventory group */}
          <button
            type="button"
            className="sidebar-group-button"
            onClick={toggleGroup("inventory")}
            aria-expanded={
              collapsed ? openFlyout === "inventory" : inventoryOpen
            }
            style={groupButtonStyle(isInventoryRoute)}
            title={collapsed ? "Inventory" : undefined}
          >
            <Boxes size={17} />
            <NavLabel collapsed={collapsed}>Inventory</NavLabel>
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
              {inventoryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    to={`${inventoryBase}?view=${item.key}`}
                    style={moduleLinkStyle(
                      isInventoryRoute,
                      inventoryView,
                      item.key,
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
              collapsed ? openFlyout === "purchases" : purchasesOpen
            }
            style={groupButtonStyle(isPurchasesRoute)}
            title={collapsed ? "Purchases" : undefined}
          >
            <ShoppingCart size={17} />
            <NavLabel collapsed={collapsed}>Purchases</NavLabel>
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
              {purchaseItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    to={`${purchasesBase}?view=${item.key}`}
                    style={moduleLinkStyle(
                      isPurchasesRoute,
                      purchasesView,
                      item.key,
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
            aria-expanded={collapsed ? openFlyout === "sales" : salesOpen}
            style={groupButtonStyle(location.pathname.startsWith(salesBase))}
            title={collapsed ? "Sales" : undefined}
          >
            <ReceiptText size={17} />
            <NavLabel collapsed={collapsed}>Sales</NavLabel>
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
              {salesItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    style={{
                      ...moduleLinkStyle(item.active, "", ""),
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
            style={linkStyle(isOwner ? "/owner/reports" : "/store/reports")}
            title={collapsed ? "Reports" : undefined}
          >
            <FileChartColumn size={17} />
            <NavLabel collapsed={collapsed}>Reports</NavLabel>
          </Link>

          {isOwner && !collapsed && (
            <div style={sectionLabelStyle}>Organization</div>
          )}
          {isOwner && collapsed && (
            <div className="h-[1px] my-3 mx-2 bg-slate-800" />
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
              {!collapsed && <div style={sectionLabelStyle}>Team</div>}
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
            borderTop: "1px solid #1E293B",
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
                color: "#FF8080",
                background: "rgba(239, 68, 68, 0.12)",
                textDecoration: "none",
              }}
            >
              <LogOut size={16} />
            </Link>
          ) : (
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
                  {roleLabel} Â· {email}
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
                  borderRadius: "6px",
                  color: "#FF8080",
                  background: "rgba(239, 68, 68, 0.12)",
                  textDecoration: "none",
                }}
              >
                <LogOut size={15} />
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Flyout panels */}
      {collapsed && openFlyout && flyoutRect && (
        <div
          className="sidebar-flyout fixed z-[1000] min-w-[220px] p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl text-white"
          style={{ top: flyoutRect.top, left: flyoutRect.left }}
        >
          <div className="py-1.5 px-3 text-[11px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-800 mb-1.5">
            {openFlyout === "inventory" && "Inventory"}
            {openFlyout === "purchases" && "Purchases"}
            {openFlyout === "sales" && "Sales"}
          </div>

          <div className="grid gap-0.5">
            {openFlyout === "inventory" &&
              inventoryItems.map((item) => {
                const Icon = item.icon;
                const active = isInventoryRoute && inventoryView === item.key;
                return (
                  <Link
                    key={item.key}
                    to={`${inventoryBase}?view=${item.key}`}
                    style={flyoutLinkStyle(active)}
                    onClick={handleFlyoutNav(
                      `${inventoryBase}?view=${item.key}`,
                    )}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

            {openFlyout === "purchases" &&
              purchaseItems.map((item) => {
                const Icon = item.icon;
                const active = isPurchasesRoute && purchasesView === item.key;
                return (
                  <Link
                    key={item.key}
                    to={`${purchasesBase}?view=${item.key}`}
                    style={flyoutLinkStyle(active)}
                    onClick={handleFlyoutNav(
                      `${purchasesBase}?view=${item.key}`,
                    )}
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
                    onClick={handleFlyoutNav(item.to)}
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
