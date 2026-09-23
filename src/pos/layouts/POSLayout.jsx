import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, ChevronDown, MapPin, ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";
import d2wLogo from "./d2w-logo.png";

const S = {
    wrap: { display: "flex", flexDirection: "column", height: "100vh", background: "#f1f5f9", fontFamily: "system-ui, sans-serif" },
    // TOPBAR — light theme, blue accent line/buttons to match the D2W logo's blue mark
    topbar: { background: "#056df4", color: "#1e293b", display: "flex", alignItems: "center", gap: "14px", padding: "0 20px", height: "56px", flexShrink: 0, borderBottom: "2px solid #2563eb", boxShadow: "0 1px 3px rgba(15,23,42,0.06)" },
    logo: { display: "flex", alignItems: "center", minWidth: "80px", flexShrink: 0 },
    logoImg: { height: "34px", width: "auto", display: "block", cursor: "pointer" },
    searchWrap: { flex: 1, display: "flex", gap: "8px" },
    searchInput: { flex: 1, height: "36px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b", fontSize: "13px", padding: "0 12px", outline: "none" },
    searchBtn: { height: "36px", padding: "0 18px", background: "#edeff3", border: "none", borderRadius: "6px", color: "#2563eb", fontSize: "13px", cursor: "pointer", fontWeight: "500" },
    navRight: { display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 },

    // ADD A VEHICLE dropdown (replaces the old always-visible left sidebar)
    vehicleWrap: { position: "relative", flexShrink: 0 },
    vehicleTrigger: { display: "flex", alignItems: "center", gap: "7px", height: "36px", padding: "0 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", color: "#1d4ed8", fontSize: "13px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" },
    vehicleMenu: { position: "absolute", top: "calc(100% + 10px)", left: 0, width: "300px", maxHeight: "75vh", overflowY: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 12px 30px rgba(15,23,42,.16)", border: "1px solid #e2e8f0", padding: "16px", zIndex: 1000, color: "#1e293b" },

    // CHOOSE A STORE control
    storeWrap: { position: "relative", flexShrink: 0 },
    storeTrigger: { display: "flex", alignItems: "center", gap: "7px", height: "36px", padding: "0 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", color: "#334155", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap", maxWidth: "170px" },
    storeTriggerLabel: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    storeMenu: { position: "absolute", top: "calc(100% + 10px)", left: 0, width: "220px", maxHeight: "260px", overflowY: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 12px 30px rgba(15,23,42,.16)", border: "1px solid #e2e8f0", overflow: "hidden", zIndex: 1000 },
    storeMenuItem: { width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", fontSize: "13px", color: "#1e293b", cursor: "pointer" },
    storeBadge: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "8px 10px", borderRadius: "6px", whiteSpace: "nowrap" },

    // PROFILE DROPDOWN (Logout + Back to Admin live here)
    profileWrap: { position: "relative", flexShrink: 0 },
    profileTrigger: { display: "flex", alignItems: "center", gap: "8px", height: "36px", padding: "0 8px 0 4px", background: "transparent", border: "none", borderRadius: "8px", cursor: "pointer" },
    avatar: { width: "30px", height: "30px", borderRadius: "50%", background: "#fff", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0 },
    avatarLg: { width: "38px", height: "38px", borderRadius: "50%", background: "#fff", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", flexShrink: 0 },
    chevron: { transition: "transform .15s ease", color: "#64748b" },
    profileMenu: { position: "absolute", top: "calc(100% + 10px)", right: 0, width: "230px", background: "#fff", borderRadius: "10px", boxShadow: "0 12px 30px rgba(15,23,42,.16)", border: "1px solid #e2e8f0", overflow: "hidden", zIndex: 1000 },
    profileMenuHeader: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderBottom: "1px solid #f1f5f9" },
    profileName: { fontSize: "13px", fontWeight: "600", color: "#1e293b" },
    profileRole: { fontSize: "11px", color: "#64748b", marginTop: "2px" },
    profileMenuItem: { width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", fontSize: "13px", color: "#1e293b", cursor: "pointer" },
    profileMenuDivider: { borderTop: "1px solid #f1f5f9" },

    // NAVBAR CART ICON (small live counter, separate from the full cart panel)
    navCartIcon: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "8px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", flexShrink: 0 },
    navCartBadge: { position: "absolute", top: "-6px", right: "-6px", minWidth: "18px", height: "18px", padding: "0 4px", borderRadius: "999px", background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 },

    // BODY (left sidebar removed — main/cart split 60/40)
    body: { display: "flex", flex: 1, overflow: "hidden" },
    main: { flex: "0 0 75%", maxWidth: "75%", overflowY: "auto", padding: "16px", boxSizing: "border-box" },

    // CART SUMMARY
    cartPanel: { flex: "0 0 25%", maxWidth: "25%", background: "#fff", borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column", boxSizing: "border-box" },
    cartHd: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #f1f5f9" },
    cartTitle: { fontSize: "14px", fontWeight: "600", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" },
    clearBtn: { fontSize: "12px", color: "#ef4444", background: "none", border: "none", cursor: "pointer" },
    cartItems: { flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "10px" },
    cartItem: { display: "flex", alignItems: "center", gap: "10px", padding: "10px", border: "1px solid #f1f5f9", borderRadius: "8px" },
    ciImg: { width: "44px", height: "44px", background: "#f8fafc", borderRadius: "6px", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
    ciInfo: { flex: 1, minWidth: 0 },
    ciName: { fontSize: "12px", fontWeight: "600", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    ciBrand: { fontSize: "11px", color: "#64748b" },
    ciPrice: { fontSize: "12px", color: "#2563eb", marginTop: "2px" },
    ciRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" },
    ciDel: { background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: 0 },
    qtyRow: { display: "flex", alignItems: "center", gap: "6px" },
    qtyBtn: { width: "22px", height: "22px", border: "1px solid #e2e8f0", borderRadius: "4px", background: "#f8fafc", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, color: "#1e293b" },
    qtyVal: { fontSize: "12px", fontWeight: "600", minWidth: "16px", textAlign: "center", color: "#1e293b" },
    cartFooter: { borderTop: "1px solid #f1f5f9", padding: "14px 16px" },
    summaryRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b", marginBottom: "5px" },
    summaryTotal: { display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "600", color: "#1e293b", marginTop: "6px", marginBottom: "10px" },
    invoiceBtn: { width: "100%", height: "40px", background: "#16a34a", border: "none", borderRadius: "8px", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
    emptyCart: { textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: "13px" },
};

function POSLayout({
    children,
    searchText,
    onSearchChange,
    onHomeClick,
    onHeldBills,
    heldBillsCount = 0,
    stores = [], selectedStoreId = "", onStoreChange
}) {
    const user = JSON.parse(localStorage.getItem("user"));
    const {
        cartItems, clearCart, increaseQuantity, decreaseQuantity, removeFromCart,
    } = useCart();

    const navigate = useNavigate();

    // ---- Dropdown open/close state (Add a Vehicle / Choose a Store / Profile) ----
    const [vehicleOpen, setVehicleOpen] = useState(false);
    const [storeOpen, setStoreOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const vehicleRef = useRef(null);
    const storeRef = useRef(null);
    const profileRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (vehicleRef.current && !vehicleRef.current.contains(event.target)) setVehicleOpen(false);
            if (storeRef.current && !storeRef.current.contains(event.target)) setStoreOpen(false);
            if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

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

    const goToAdmin = () => {
        setProfileOpen(false);
        navigate(user?.role === "SUPER_ADMIN" ? "/owner/dashboard" : "/store/dashboard");
    };

    const selectedStoreName =
        stores.find((s) => String(s.id) === String(selectedStoreId))?.storeName;

    // ---- Cart panel (unchanged logic — same navigate()/confirm() as before) ----
    const totalQuantity = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const subtotal = cartItems.reduce(
        (sum, item) => sum + Number(item.sellingPrice || 0) * Number(item.quantity || 0),
        0
    );

    const handleCheckout = () => {
        const draftId = localStorage.getItem("pos_active_draft_id");
        navigate(draftId ? `/pos/checkout?draftId=${encodeURIComponent(draftId)}` : "/pos/checkout");
    };

    const handleClearCart = () => {
        if (window.confirm("Clear all items from this cart?")) clearCart();
    };

    return (
        <div style={S.wrap}>
            {/* TOPBAR */}
            <div style={S.topbar}>
                <div style={S.logo}>
                    <img
                        src={d2wLogo}
                        alt="Deals2Wheels"
                        style={S.logoImg}
                        onClick={onHomeClick}
                    />
                </div>

                {/* ADD A VEHICLE — dropdown holding the same vehicle selector that used
                    to be a permanent left sidebar (children[0], unchanged internally) */}
                <div style={S.vehicleWrap} ref={vehicleRef}>
                    <button type="button" style={S.vehicleTrigger} onClick={() => setVehicleOpen((o) => !o)}>
                        <Car size={16} />
                        Add a Vehicle
                        <ChevronDown size={14} style={{ ...S.chevron, color: "#1e293b", transform: vehicleOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                    </button>
                    {vehicleOpen && (
                        <div style={S.vehicleMenu}>
                            {children[0]}
                        </div>
                    )}
                </div>

                <div style={{...S.searchWrap,maxWidth:"720px"}}>
                    <input
                        type="text"
                        placeholder="Search by Part Number, Brand, Product Name, SKU..."
                        value={searchText}
                        onChange={(e) => onSearchChange(e.target.value)}
                        style={S.searchInput}
                        disabled={!selectedStoreId}
                    />
                    <button style={S.searchBtn}>Search</button>
                </div>

                <div style={S.navRight}>
                    {/* CHOOSE A STORE */}
                    {user?.role === "SUPER_ADMIN" ? (
                        <div style={S.storeWrap} ref={storeRef}>
                            <button type="button" style={S.storeTrigger} onClick={() => setStoreOpen((o) => !o)}>
                                <MapPin size={14} />
                                <span style={S.storeTriggerLabel}>{selectedStoreName || "Choose a Store"}</span>
                                <ChevronDown size={13} style={{ ...S.chevron, transform: storeOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                            </button>
                            {storeOpen && (
                                <div style={S.storeMenu}>
                                    {stores.length === 0 && (
                                        <div style={{ padding: "10px 14px", fontSize: "12px", color: "#94a3b8" }}>No stores available</div>
                                    )}
                                    {stores.map((s) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            style={S.storeMenuItem}
                                            onClick={() => { onStoreChange?.(s.id); setStoreOpen(false); }}
                                        >
                                            {s.storeName}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        user?.role === "STORE_OWNER" && (
                            <span style={S.storeBadge}>
                                <MapPin size={14} />
                                {user?.storeName || "Assigned store"}
                            </span>
                        )
                    )}

                    <button style={{ ...S.searchBtn, background: "#edebe9" }} onClick={onHeldBills}>
                        Held Bills ({heldBillsCount})
                    </button>

                    {/* PROFILE — Back to Admin now lives here instead of as a standalone button */}
                    <div style={S.profileWrap} ref={profileRef}>
                        <button
                            type="button"
                            style={S.profileTrigger}
                            onClick={() => setProfileOpen((open) => !open)}
                            aria-haspopup="true"
                            aria-expanded={profileOpen}
                            aria-label="Account menu"
                        >
                            <span style={S.avatar}>{initials}</span>
                            <ChevronDown size={14} style={{ ...S.chevron, transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                        </button>

                        {profileOpen && (
                            <div style={S.profileMenu}>
                                <div style={S.profileMenuHeader}>
                                    <span style={S.avatarLg}>{initials}</span>
                                    <div>
                                        <div style={S.profileName}>{user?.name || "User"}</div>
                                        <div style={S.profileRole}>
                                            {(user?.role || "").replaceAll("_", " ")}
                                            {user?.storeName ? ` · ${user.storeName}` : ""}
                                        </div>
                                    </div>
                                </div>
                                {user?.role !== "CASHIER" && (
                                    <button type="button" style={S.profileMenuItem} onClick={goToAdmin}>
                                        Back to Admin
                                    </button>
                                )}
                                <div style={S.profileMenuDivider} />
                                <button type="button" style={{ ...S.profileMenuItem, color: "#dc2626" }} onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Live cart counter icon */}
                    <div style={S.navCartIcon}>
                        <ShoppingCart size={17} />
                        <span style={S.navCartBadge}>{cartItems.length}</span>
                    </div>
                </div>
            </div>

            <div style={S.body}>
                {/* PRODUCT AREA — 60% */}
                <div style={S.main}>
                    {children[1]}
                </div>

                {/* CART SUMMARY — 40% */}
                <div style={S.cartPanel}>
                    <div style={S.cartHd}>
                        <span style={S.cartTitle}>🛒 Cart ({cartItems.length})</span>
                        {cartItems.length > 0 && (
                            <button type="button" style={S.clearBtn} onClick={handleClearCart}>
                                Clear
                            </button>
                        )}
                    </div>

                    <div style={S.cartItems}>
                        {cartItems.length === 0 ? (
                            <div style={S.emptyCart}>Your cart is empty</div>
                        ) : (
                            cartItems.map((item) => (
                                <div style={S.cartItem} key={`${item.inventoryId}_${item.batchId}`}>
                                    <div style={S.ciImg}>
                                        {(item.image || item.imageUrl || item.mainImageUrl) ? (
                                            <img
                                                src={item.image || item.imageUrl || item.mainImageUrl}
                                                alt={item.itemName}
                                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                            />
                                        ) : null}
                                    </div>
                                    <div style={S.ciInfo}>
                                        <div style={S.ciName} title={item.itemName}>{item.itemName}</div>
                                        {item.brandName && <div style={S.ciBrand}>{item.brandName}</div>}
                                        <div style={S.ciPrice}>₹{Number(item.sellingPrice || 0).toFixed(2)} / {item.stockUnit || "PCS"}</div>
                                    </div>
                                    <div style={S.ciRight}>
                                        <button
                                            type="button"
                                            style={S.ciDel}
                                            aria-label="Remove item"
                                            onClick={() => removeFromCart(item.inventoryId, item.batchId)}
                                        >
                                            ✕
                                        </button>
                                        <div style={S.qtyRow}>
                                            <button
                                                type="button"
                                                style={S.qtyBtn}
                                                aria-label="Decrease quantity"
                                                onClick={() => decreaseQuantity(item.inventoryId, item.batchId)}
                                            >
                                                −
                                            </button>
                                            <span style={S.qtyVal}>{item.quantity}</span>
                                            <button
                                                type="button"
                                                style={S.qtyBtn}
                                                aria-label="Increase quantity"
                                                onClick={() => increaseQuantity(item.inventoryId, item.batchId)}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={S.cartFooter}>
                        <div style={S.summaryRow}><span>Items</span><span>{cartItems.length}</span></div>
                        <div style={S.summaryRow}><span>Quantity</span><span>{totalQuantity}</span></div>
                        <div style={S.summaryTotal}><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                        <button type="button" style={S.invoiceBtn} onClick={handleCheckout}>
                            Proceed to Checkout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default POSLayout;
