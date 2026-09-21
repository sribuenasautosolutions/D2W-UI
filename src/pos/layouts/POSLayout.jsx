import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import d2wLogo from "./d2w-logo.png";

const S = {
    wrap: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#f1f5f9",
        fontFamily:
            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    },

    /* ================= TOPBAR ================= */

    topbar: {
        background: "#0f1c3a",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "0 16px",
        height: "56px",
        flexShrink: 0,
        borderBottom: "2px solid #2563eb",
        position: "relative",
        zIndex: 1000
    },

    logoArea: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexShrink: 0
    },

    logo: {
        display: "flex",
        alignItems: "center"
    },

    logoImg: {
        height: "34px",
        width: "auto",
        display: "block",
        cursor: "pointer"
    },

    addVehicleButton: {
    height: "36px",
    padding: "0 13px",
    border: "1px solid #3b82f6",
    borderRadius: "6px",
    background: "#2563eb",
    color: "#fff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    whiteSpace: "nowrap"
},

    vehicleDropdown: {
        position: "absolute",
        top: "52px",
        left: "16px",
        width: "310px",
        maxHeight: "calc(100vh - 75px)",
        overflowY: "auto",
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        boxShadow: "0 12px 30px rgba(15,23,42,0.20)",
        zIndex: 2000,
        padding: "14px"
    },

    searchWrap: {
        flex: 1,
        display: "flex",
        gap: "8px",
        minWidth: 0,
        maxWidth: "720px"
    },

    searchInput: {
        flex: 1,
        minWidth: 0,
        height: "36px",
        borderRadius: "6px",
        border: "1px solid #334155",
        background: "#1e2d4a",
        color: "#e2e8f0",
        fontSize: "13px",
        padding: "0 12px",
        outline: "none"
    },

    searchBtn: {
        height: "36px",
        padding: "0 18px",
        background: "#2563eb",
        border: "none",
        borderRadius: "6px",
        color: "#fff",
        fontSize: "13px",
        cursor: "pointer",
        fontWeight: "500"
    },

    navRight: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginLeft: "auto",
        flexShrink: 0
    },

    /* ================= CART HEADER BUTTON ================= */

    cartHeaderButton: {
        height: "36px",
        padding: "0 12px",
        border: "1px solid #475569",
        borderRadius: "6px",
        background: "#162542",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "13px",
        fontWeight: "600"
    },

    cartCountBadge: {
        minWidth: "19px",
        height: "19px",
        padding: "0 5px",
        borderRadius: "10px",
        background: "#ef4444",
        color: "#fff",
        fontSize: "11px",
        fontWeight: "700",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
    },

    /* ================= PROFILE ================= */

    profileWrap: {
        position: "relative"
    },

    profileTrigger: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        height: "36px",
        padding: "0 8px 0 4px",
        background: "transparent",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer"
    },

    avatar: {
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        background: "#2563eb",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "700",
        flexShrink: 0
    },

    avatarLg: {
        width: "38px",
        height: "38px",
        borderRadius: "50%",
        background: "#2563eb",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        fontWeight: "700",
        flexShrink: 0
    },

    chevron: {
        fontSize: "10px",
        color: "#94a3b8",
        transition: "transform .15s ease"
    },

    profileMenu: {
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        width: "230px",
        background: "#fff",
        borderRadius: "10px",
        boxShadow: "0 12px 30px rgba(15,23,42,.18)",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        zIndex: 3000
    },

    profileMenuHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 14px",
        borderBottom: "1px solid #f1f5f9"
    },

    profileName: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#1e293b"
    },

    profileRole: {
        fontSize: "11px",
        color: "#64748b",
        marginTop: "2px"
    },

    profileMenuItem: {
        width: "100%",
        textAlign: "left",
        padding: "10px 14px",
        background: "none",
        border: "none",
        fontSize: "13px",
        color: "#1e293b",
        cursor: "pointer"
    },

    /* ================= BODY ================= */

    body: {
        display: "flex",
        flex: 1,
        overflow: "hidden",
        minWidth: 0
    },

    /* ================= MAIN PRODUCTS ================= */

    main: {
        flex: 1,
        minWidth: 0,
        overflowY: "auto",
        padding: "16px"
    },

    /* ================= CART ================= */

    cartPanel: {
        width: "272px",
        flexShrink: 0,
        background: "#fff",
        borderLeft: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column"
    },

    cartHd: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderBottom: "1px solid #f1f5f9"
    },

    cartTitle: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#1e293b",
        display: "flex",
        alignItems: "center",
        gap: "6px"
    },

    clearBtn: {
        fontSize: "12px",
        color: "#ef4444",
        background: "none",
        border: "none",
        cursor: "pointer"
    },

    cartItems: {
        flex: 1,
        overflowY: "auto",
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
    },

    cartItem: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px",
        border: "1px solid #f1f5f9",
        borderRadius: "8px"
    },

    ciImg: {
        width: "44px",
        height: "44px",
        background: "#f8fafc",
        borderRadius: "6px",
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    },

    ciInfo: {
        flex: 1,
        minWidth: 0
    },

    ciName: {
        fontSize: "12px",
        fontWeight: "600",
        color: "#1e293b",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
    },

    ciBrand: {
        fontSize: "11px",
        color: "#64748b"
    },

    ciPrice: {
        fontSize: "12px",
        color: "#2563eb",
        marginTop: "2px"
    },

    ciRight: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "6px"
    },

    ciDel: {
        background: "none",
        border: "none",
        color: "#ef4444",
        cursor: "pointer",
        fontSize: "14px",
        lineHeight: 1,
        padding: 0
    },

    qtyRow: {
        display: "flex",
        alignItems: "center",
        gap: "6px"
    },

    qtyBtn: {
        width: "22px",
        height: "22px",
        border: "1px solid #e2e8f0",
        borderRadius: "4px",
        background: "#f8fafc",
        cursor: "pointer",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        color: "#1e293b"
    },

    qtyVal: {
        fontSize: "12px",
        fontWeight: "600",
        minWidth: "16px",
        textAlign: "center",
        color: "#1e293b"
    },

    cartFooter: {
        borderTop: "1px solid #f1f5f9",
        padding: "14px 16px"
    },

    summaryRow: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "13px",
        color: "#64748b",
        marginBottom: "5px"
    },

    summaryTotal: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "15px",
        fontWeight: "600",
        color: "#1e293b",
        marginTop: "6px",
        marginBottom: "10px"
    },

    invoiceBtn: {
        width: "100%",
        height: "40px",
        background: "#16a34a",
        border: "none",
        borderRadius: "8px",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer"
    },

    emptyCart: {
        textAlign: "center",
        padding: "30px 0",
        color: "#94a3b8",
        fontSize: "13px"
    }
};

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
    const user = JSON.parse(localStorage.getItem("user"));

    const {
        cartItems,
        clearCart,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart
    } = useCart();

    const navigate = useNavigate();

    const [profileOpen, setProfileOpen] = useState(false);
    const [vehicleOpen, setVehicleOpen] = useState(false);

    const profileRef = useRef(null);
    const vehicleRef = useRef(null);

    /* ================= OUTSIDE CLICK ================= */

    useEffect(() => {
        const handleOutsideClick = (event) => {

            if (
                profileRef.current &&
                !profileRef.current.contains(event.target)
            ) {
                setProfileOpen(false);
            }

            if (
                vehicleRef.current &&
                !vehicleRef.current.contains(event.target)
            ) {
                setVehicleOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };
    }, []);

    /* ================= USER ================= */

    const initials = (user?.name || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    const handleBackToAdmin = () => {
        setProfileOpen(false);

        navigate(
            user?.role === "SUPER_ADMIN"
                ? "/owner/dashboard"
                : "/store/dashboard"
        );
    };

    /* ================= CART ================= */

    const totalQuantity = cartItems.reduce(
        (sum, item) =>
            sum + Number(item.quantity || 0),
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
        const draftId =
            localStorage.getItem("pos_active_draft_id");

        navigate(
            draftId
                ? `/pos/checkout?draftId=${encodeURIComponent(draftId)}`
                : "/pos/checkout"
        );
    };

    const handleClearCart = () => {
        if (
            window.confirm(
                "Clear all items from this cart?"
            )
        ) {
            clearCart();
        }
    };

    /* ================= RENDER ================= */

    return (
        <div style={S.wrap}>

            {/* ================= TOPBAR ================= */}

            <div style={S.topbar}>

                {/* LOGO + VEHICLE BUTTON */}

                <div
                    style={S.logoArea}
                    ref={vehicleRef}
                >

                    <div style={S.logo}>
                        <img
                            src={d2wLogo}
                            alt="Deals2Wheels"
                            style={S.logoImg}
                            onClick={onHomeClick}
                        />
                    </div>

                    <button
                        type="button"
                        style={S.addVehicleButton}
                        onClick={() =>
                            setVehicleOpen(
                                (open) => !open
                            )
                        }
                    >
                        🚗 Add a vehicle
                        <span>▾</span>
                    </button>

                    {/* EXISTING VEHICLE SELECTOR */}

                    {vehicleOpen && (
                        <div style={S.vehicleDropdown}>
                            {children[0]}
                        </div>
                    )}

                </div>

                {/* SEARCH */}

                <div style={S.searchWrap}>

                    <input
                        type="text"
                        placeholder="Search by Part Number, Brand, Product Name, SKU..."
                        value={searchText}
                        onChange={(e) =>
                            onSearchChange(
                                e.target.value
                            )
                        }
                        style={S.searchInput}
                        disabled={!selectedStoreId}
                    />

                    <button
                        type="button"
                        style={S.searchBtn}
                    >
                        Search
                    </button>

                </div>

                {/* RIGHT NAV */}

                <div style={S.navRight}>

                    {/* STORE */}

                    {user?.role === "SUPER_ADMIN" && (
                        <select
                            aria-label="POS store"
                            value={selectedStoreId}
                            onChange={(e) =>
                                onStoreChange?.(
                                    e.target.value
                                )
                            }
                            style={{
                                width: 150,
                                height: 32,
                                borderRadius: 6,
                                padding: "0 7px",
                                fontSize: 11,
                                border:
                                    "1px solid #475569",
                                background: "#fff",
                                color: "#0f172a"
                            }}
                        >
                            <option value="">
                                Select store
                            </option>

                            {stores.map((store) => (
                                <option
                                    key={store.id}
                                    value={store.id}
                                >
                                    {store.storeName}
                                </option>
                            ))}
                        </select>
                    )}

                    {user?.role === "STORE_OWNER" && (
                        <span
                            style={{
                                fontSize: 12,
                                color: "#dbeafe",
                                background: "#1e3a5f",
                                border:
                                    "1px solid #31527e",
                                padding: "8px 10px",
                                borderRadius: 6
                            }}
                        >
                            Store:{" "}
                            {user?.storeName ||
                                "Assigned store"}
                        </span>
                    )}

                    {/* HELD BILLS */}

                    <button
                        type="button"
                        style={{
                            ...S.searchBtn,
                            background: "#f59e0b"
                        }}
                        onClick={onHeldBills}
                    >
                        Held Bills ({heldBillsCount})
                    </button>

                    {/* CART ICON */}

                    <button
                        type="button"
                        style={S.cartHeaderButton}
                        onClick={() => {
                            // Cart panel is already visible.
                            // This keeps the existing cart functionality.
                        }}
                        aria-label="Shopping cart"
                    >
                        🛒
                        <span>Cart</span>

                        <span
                            style={S.cartCountBadge}
                        >
                            {totalQuantity}
                        </span>
                    </button>

                    {/* PROFILE */}

                    <div
                        style={S.profileWrap}
                        ref={profileRef}
                    >

                        <button
                            type="button"
                            style={S.profileTrigger}
                            onClick={() =>
                                setProfileOpen(
                                    (open) => !open
                                )
                            }
                            aria-haspopup="true"
                            aria-expanded={profileOpen}
                            aria-label="Account menu"
                        >

                            <span style={S.avatar}>
                                {initials}
                            </span>

                            <span
                                style={{
                                    ...S.chevron,
                                    transform:
                                        profileOpen
                                            ? "rotate(180deg)"
                                            : "rotate(0deg)"
                                }}
                            >
                                ▾
                            </span>

                        </button>

                        {profileOpen && (
                            <div style={S.profileMenu}>

                                <div
                                    style={
                                        S.profileMenuHeader
                                    }
                                >

                                    <span
                                        style={
                                            S.avatarLg
                                        }
                                    >
                                        {initials}
                                    </span>

                                    <div>

                                        <div
                                            style={
                                                S.profileName
                                            }
                                        >
                                            {user?.name ||
                                                "User"}
                                        </div>

                                        <div
                                            style={
                                                S.profileRole
                                            }
                                        >
                                            {(
                                                user?.role ||
                                                ""
                                            ).replaceAll(
                                                "_",
                                                " "
                                            )}

                                            {user?.storeName
                                                ? ` · ${user.storeName}`
                                                : ""}
                                        </div>

                                    </div>

                                </div>

                                {/* BACK TO ADMIN */}

                                {user?.role !==
                                    "CASHIER" && (
                                    <button
                                        type="button"
                                        style={
                                            S.profileMenuItem
                                        }
                                        onClick={
                                            handleBackToAdmin
                                        }
                                    >
                                        ← Back to Admin
                                    </button>
                                )}

                                {/* LOGOUT */}

                                <button
                                    type="button"
                                    style={{
                                        ...S.profileMenuItem,
                                        color: "#dc2626"
                                    }}
                                    onClick={
                                        handleLogout
                                    }
                                >
                                    Logout
                                </button>

                            </div>
                        )}

                    </div>

                </div>

            </div>

            {/* ================= BODY ================= */}

            <div style={S.body}>

                {/* PRODUCT AREA */}

                <div style={S.main}>
                    {children[1]}
                </div>

                {/* ================= CART PANEL ================= */}

                <div style={S.cartPanel}>

                    <div style={S.cartHd}>

                        <span style={S.cartTitle}>
                            🛒 Cart ({totalQuantity})
                        </span>

                        {cartItems.length > 0 && (
                            <button
                                type="button"
                                style={S.clearBtn}
                                onClick={
                                    handleClearCart
                                }
                            >
                                Clear
                            </button>
                        )}

                    </div>

                    <div style={S.cartItems}>

                        {cartItems.length === 0 ? (

                            <div style={S.emptyCart}>
                                Your cart is empty
                            </div>

                        ) : (

                            cartItems.map((item) => (

                                <div
                                    style={S.cartItem}
                                    key={`${item.inventoryId}_${item.batchId}`}
                                >

                                    <div
                                        style={S.ciImg}
                                    >

                                        {(item.image ||
                                            item.imageUrl ||
                                            item.mainImageUrl) ? (

                                            <img
                                                src={
                                                    item.image ||
                                                    item.imageUrl ||
                                                    item.mainImageUrl
                                                }
                                                alt={
                                                    item.itemName
                                                }
                                                style={{
                                                    width:
                                                        "100%",
                                                    height:
                                                        "100%",
                                                    objectFit:
                                                        "contain"
                                                }}
                                            />

                                        ) : null}

                                    </div>

                                    <div
                                        style={S.ciInfo}
                                    >

                                        <div
                                            style={
                                                S.ciName
                                            }
                                            title={
                                                item.itemName
                                            }
                                        >
                                            {item.itemName}
                                        </div>

                                        {item.brandName && (
                                            <div
                                                style={
                                                    S.ciBrand
                                                }
                                            >
                                                {
                                                    item.brandName
                                                }
                                            </div>
                                        )}

                                        <div
                                            style={
                                                S.ciPrice
                                            }
                                        >
                                            ₹
                                            {Number(
                                                item.sellingPrice ||
                                                    0
                                            ).toFixed(2)}
                                            {" / "}
                                            {item.stockUnit ||
                                                "PCS"}
                                        </div>

                                    </div>

                                    <div
                                        style={S.ciRight}
                                    >

                                        <button
                                            type="button"
                                            style={S.ciDel}
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

                                        <div
                                            style={
                                                S.qtyRow
                                            }
                                        >

                                            <button
                                                type="button"
                                                style={
                                                    S.qtyBtn
                                                }
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

                                            <span
                                                style={
                                                    S.qtyVal
                                                }
                                            >
                                                {
                                                    item.quantity
                                                }
                                            </span>

                                            <button
                                                type="button"
                                                style={
                                                    S.qtyBtn
                                                }
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

                    {/* CART FOOTER */}

                    <div
                        style={S.cartFooter}
                    >

                        <div
                            style={S.summaryRow}
                        >
                            <span>Items</span>
                            <span>
                                {cartItems.length}
                            </span>
                        </div>

                        <div
                            style={S.summaryRow}
                        >
                            <span>Quantity</span>
                            <span>
                                {totalQuantity}
                            </span>
                        </div>

                        <div
                            style={S.summaryTotal}
                        >
                            <span>Subtotal</span>
                            <span>
                                ₹{subtotal.toFixed(2)}
                            </span>
                        </div>

                        <button
                            type="button"
                            style={S.invoiceBtn}
                            onClick={
                                handleCheckout
                            }
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