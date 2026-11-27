import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, ChevronDown, MapPin, ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../../auth/AuthContext";
import d2wLogo from "./d2w-logo.png";
import "./POSLayout.css";

function POSLayout({
    children,
    searchText,
    onSearchChange,
    onHomeClick,
    onHeldBills,
    heldBillsCount = 0,
    stores = [],
    selectedStoreId = "",
    onStoreChange
}) {
    const { user: authUser, hasPermission, hasGlobalStoreManagementAuthority } = useAuth();
    const user = authUser || JSON.parse(localStorage.getItem("user") || "null");
    const isSuperAdmin = Boolean(hasGlobalStoreManagementAuthority?.());
    const canCreateSale = isSuperAdmin || Boolean(hasPermission?.("SALES.CREATE"));
    const canViewSales = isSuperAdmin || Boolean(hasPermission?.("SALES.VIEW"));
    const hasBackOfficeAccess =
        isSuperAdmin ||
        Boolean(
            hasPermission?.("DASHBOARD.VIEW") ||
            hasPermission?.("INVENTORY.VIEW") ||
            hasPermission?.("PURCHASE_ORDERS.VIEW") ||
            hasPermission?.("REPORTS.VIEW")
        );

    const {
        cartItems,
        clearCart,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
    } = useCart();

    const navigate = useNavigate();

    const [vehicleOpen, setVehicleOpen] = useState(false);
    const [storeOpen, setStoreOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const vehicleRef = useRef(null);
    const storeRef = useRef(null);
    const profileRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                vehicleRef.current &&
                !vehicleRef.current.contains(event.target)
            ) {
                setVehicleOpen(false);
            }

            if (
                storeRef.current &&
                !storeRef.current.contains(event.target)
            ) {
                setStoreOpen(false);
            }

            if (
                profileRef.current &&
                !profileRef.current.contains(event.target)
            ) {
                setProfileOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    const initials = (user?.name || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("activeStoreId");
        window.dispatchEvent(new CustomEvent("auth:logout"));
        window.location.href = "/login";
    };

    const goToAdmin = () => {
        setProfileOpen(false);

        if (isSuperAdmin) {
            navigate("/owner/dashboard");
        } else if (hasPermission?.("DASHBOARD.VIEW")) {
            navigate("/store/dashboard");
        } else {
            navigate("/store/sales");
        }
    };

    const selectedStoreName =
        stores.find(
            (s) => String(s.id) === String(selectedStoreId)
        )?.storeName;

    const totalQuantity = cartItems.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
    );

    const subtotal = cartItems.reduce(
        (sum, item) =>
            sum +
            Number(item.sellingPrice || 0) *
                Number(item.quantity || 0),
        0
    );

    const handleCheckout = () => {
        if (!canCreateSale) {
            alert("You do not have permission to create sales.");
            return;
        }
        const draftId = localStorage.getItem("pos_active_draft_id");

        navigate(
            draftId
                ? `/pos/checkout?draftId=${encodeURIComponent(draftId)}`
                : "/pos/checkout"
        );
    };

    const handleClearCart = () => {
        if (window.confirm("Clear all items from this cart?")) {
            clearCart();
        }
    };

    return (
        <div className="pos-wrap">

            {/* TOPBAR */}
            <div className="pos-topbar">

                <div className="pos-logo">
                    <img
                        src={d2wLogo}
                        alt="Deals2Wheels"
                        className="pos-logo-img"
                        onClick={onHomeClick}
                    />
                </div>

                {/* ADD A VEHICLE */}
                <div
                    className="vehicle-wrap"
                    ref={vehicleRef}
                >
                    <button
                        type="button"
                        className="vehicle-trigger"
                        onClick={() =>
                            setVehicleOpen((open) => !open)
                        }
                    >
                        <Car size={16} />

                        Add a Vehicle

                        <ChevronDown
                            size={14}
                            className={`chevron vehicle-chevron ${
                                vehicleOpen ? "open" : ""
                            }`}
                        />
                    </button>

                    {vehicleOpen && (
                        <div className="vehicle-menu">
                            {children[0]}
                        </div>
                    )}
                </div>

                {/* SEARCH */}
                <div className="search-wrap search-wrap-limited">
                    <input
                        type="text"
                        placeholder="Search by Part Number, Brand, Product Name, SKU..."
                        value={searchText}
                        onChange={(e) =>
                            onSearchChange(e.target.value)
                        }
                        className="pos-search-input"
                        disabled={!selectedStoreId}
                    />

                    <button className="pos-search-btn">
                        Search
                    </button>
                </div>

                <div className="pos-nav-right">

                    {/* STORE */}
                    {isSuperAdmin ? (
                        <div
                            className="store-wrap"
                            ref={storeRef}
                        >
                            <button
                                type="button"
                                className="store-trigger"
                                onClick={() =>
                                    setStoreOpen((open) => !open)
                                }
                            >
                                <MapPin size={14} />

                                <span className="store-trigger-label">
                                    {selectedStoreName ||
                                        "Choose a Store"}
                                </span>

                                <ChevronDown
                                    size={13}
                                    className={`chevron ${
                                        storeOpen ? "open" : ""
                                    }`}
                                />
                            </button>

                            {storeOpen && (
                                <div className="store-menu">

                                    {stores.length === 0 && (
                                        <div className="no-stores">
                                            No stores available
                                        </div>
                                    )}

                                    {stores.map((s) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            className="store-menu-item"
                                            onClick={() => {
                                                onStoreChange?.(s.id);
                                                setStoreOpen(false);
                                            }}
                                        >
                                            {s.storeName}
                                        </button>
                                    ))}

                                </div>
                            )}
                        </div>
                    ) : (
                        user?.storeId != null && (
                            <span className="store-badge">
                                <MapPin size={14} />

                                {user?.storeName ||
                                    "Assigned store"}
                            </span>
                        )
                    )}

                    {/* INVOICES & SALES LINK */}
                    {canViewSales && (
                        <button
                            type="button"
                            className="pos-search-btn"
                            style={{ background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1", marginRight: "4px" }}
                            onClick={() => navigate(isSuperAdmin ? "/owner/sales" : "/store/sales")}
                        >
                            Invoices & Sales
                        </button>
                    )}

                    {/* HELD BILLS */}
                    <button
                        type="button"
                        className="pos-search-btn held-bills-btn"
                        onClick={onHeldBills}
                    >
                        Held Bills ({heldBillsCount})
                    </button>

                    {/* PROFILE */}
                    <div
                        className="profile-wrap"
                        ref={profileRef}
                    >
                        <button
                            type="button"
                            className="profile-trigger"
                            onClick={() =>
                                setProfileOpen(
                                    (open) => !open
                                )
                            }
                            aria-haspopup="true"
                            aria-expanded={profileOpen}
                            aria-label="Account menu"
                        >
                            <span className="avatar">
                                {initials}
                            </span>

                            <ChevronDown
                                size={14}
                                className={`chevron ${
                                    profileOpen ? "open" : ""
                                }`}
                            />
                        </button>

                        {profileOpen && (
                            <div className="profile-menu">

                                <div className="profile-menu-header">

                                    <span className="avatar-lg">
                                        {initials}
                                    </span>

                                    <div>
                                        <div className="profile-name">
                                            {user?.name || "User"}
                                        </div>

                                        <div className="profile-role">
                                            {(user?.role || "").replaceAll(
                                                "_",
                                                " "
                                            )}

                                            {user?.storeName
                                                ? ` · ${user.storeName}`
                                                : ""}
                                        </div>
                                    </div>

                                </div>

                                <button
                                    type="button"
                                    className="profile-menu-item"
                                    onClick={goToAdmin}
                                >
                                    {hasBackOfficeAccess ? "Back to Admin" : "Sales & Invoices"}
                                </button>

                                <div className="profile-menu-divider" />

                                <button
                                    type="button"
                                    className="profile-menu-item logout-item"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>

                            </div>
                        )}
                    </div>

                    {/* CART COUNTER */}
                    <div className="nav-cart-icon">
                        <ShoppingCart size={17} />

                        <span className="nav-cart-badge">
                            {cartItems.length}
                        </span>
                    </div>

                </div>
            </div>

            {/* BODY */}
            <div className="pos-body">

                {/* PRODUCT AREA */}
                <div className="pos-main">
                    {children[1]}
                </div>

                {/* CART */}
                <div className="cart-panel">

                    <div className="cart-header">
                        <span className="cart-title">
                            🛒 Cart ({cartItems.length})
                        </span>

                        {cartItems.length > 0 && (
                            <button
                                type="button"
                                className="clear-btn"
                                onClick={handleClearCart}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="cart-items">

                        {cartItems.length === 0 ? (
                            <div className="empty-cart">
                                Your cart is empty
                            </div>
                        ) : (
                            cartItems.map((item) => (
                                <div
                                    className="cart-item"
                                    key={`${item.inventoryId}_${item.batchId}`}
                                >

                                    <div className="cart-item-img">
                                        {(
                                            item.image ||
                                            item.imageUrl ||
                                            item.mainImageUrl
                                        ) ? (
                                            <img
                                                src={
                                                    item.image ||
                                                    item.imageUrl ||
                                                    item.mainImageUrl
                                                }
                                                alt={item.itemName}
                                                className="cart-item-image"
                                            />
                                        ) : null}
                                    </div>

                                    <div className="cart-item-info">

                                        <div
                                            className="cart-item-name"
                                            title={item.itemName}
                                        >
                                            {item.itemName}
                                        </div>

                                        {item.brandName && (
                                            <div className="cart-item-brand">
                                                {item.brandName}
                                            </div>
                                        )}

                                        <div className="cart-item-price">
                                            ₹
                                            {Number(
                                                item.sellingPrice || 0
                                            ).toFixed(2)}
                                            {" / "}
                                            {item.stockUnit || "PCS"}
                                        </div>

                                    </div>

                                    <div className="cart-item-right">

                                        <button
                                            type="button"
                                            className="cart-item-delete"
                                            aria-label="Remove item"
                                            onClick={() =>
                                                removeFromCart(
                                                    item.inventoryId,
                                                    item.batchId
                                                )
                                            }
                                        >
                                            ✕
                                        </button>

                                        <div className="qty-row">

                                            <button
                                                type="button"
                                                className="qty-btn"
                                                aria-label="Decrease quantity"
                                                onClick={() =>
                                                    decreaseQuantity(
                                                        item.inventoryId,
                                                        item.batchId
                                                    )
                                                }
                                            >
                                                −
                                            </button>

                                            <span className="qty-value">
                                                {item.quantity}
                                            </span>

                                            <button
                                                type="button"
                                                className="qty-btn"
                                                aria-label="Increase quantity"
                                                onClick={() =>
                                                    increaseQuantity(
                                                        item.inventoryId,
                                                        item.batchId
                                                    )
                                                }
                                            >
                                                +
                                            </button>

                                        </div>

                                    </div>
                                </div>
                            ))
                        )}

                    </div>

                    <div className="cart-footer">

                        <div className="summary-row">
                            <span>Items</span>
                            <span>{cartItems.length}</span>
                        </div>

                        <div className="summary-row">
                            <span>Quantity</span>
                            <span>{totalQuantity}</span>
                        </div>

                        <div className="summary-total">
                            <span>Subtotal</span>
                            <span>
                                ₹{subtotal.toFixed(2)}
                            </span>
                        </div>

                        <button
                            type="button"
                            className="invoice-btn"
                            onClick={handleCheckout}
                            disabled={cartItems.length === 0 || !canCreateSale}
                            style={{ opacity: (cartItems.length === 0 || !canCreateSale) ? 0.6 : 1, cursor: (cartItems.length === 0 || !canCreateSale) ? "not-allowed" : "pointer" }}
                            title={!canCreateSale ? "You do not have permission to create sales" : undefined}
                        >
                            Proceed to Checkout
                        </button>

                    </div>

                </div>
            </div>
        </div>
    );
}

export default POSLayout;