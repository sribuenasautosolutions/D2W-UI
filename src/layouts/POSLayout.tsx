import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, ChevronDown, MapPin, ShoppingCart } from "lucide-react";
import { useCart } from "../features/operations/sales/pos/context/CartContext";
import d2wLogo from "../assets/d2w-logo.png";

function POSLayout({
  children,
  searchText,
  onSearchChange,
  onHomeClick,
  onHeldBills,
  heldBillsCount = 0,
  stores = [],
  selectedStoreId = "",
  onStoreChange,
}) {
  const user = JSON.parse(localStorage.getItem("user"));

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
      if (vehicleRef.current && !vehicleRef.current.contains(event.target)) {
        setVehicleOpen(false);
      }

      if (storeRef.current && !storeRef.current.contains(event.target)) {
        setStoreOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(event.target)) {
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
    localStorage.clear();
    window.location.href = "/login";
  };

  const goToAdmin = () => {
    setProfileOpen(false);

    navigate(
      user?.role === "SUPER_ADMIN" ? "/owner/dashboard" : "/store/dashboard",
    );
  };

  const selectedStoreName = stores.find(
    (s) => String(s.id) === String(selectedStoreId),
  )?.storeName;

  const totalQuantity = cartItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  const subtotal = cartItems.reduce(
    (sum, item) =>
      sum + Number(item.sellingPrice || 0) * Number(item.quantity || 0),
    0,
  );

  const handleCheckout = () => {
    const draftId = localStorage.getItem("pos_active_draft_id");

    navigate(
      draftId
        ? `/pos/checkout?draftId=${encodeURIComponent(draftId)}`
        : "/pos/checkout",
    );
  };

  const handleClearCart = () => {
    if (window.confirm("Clear all items from this cart?")) {
      clearCart();
    }
  };

  return (
    <>
      <style>{`
                .pos-search-input:focus {
                    border-color: #b8ccff;
                    box-shadow: 0 0 0 2px rgba(255,255,255,0.2);
                }
                .pos-search-btn:hover {
                    background: #e8f1ff;
                    color: #062d83;
                    transform: translateY(-1px);
                    box-shadow: 0 3px 8px rgba(6,45,131,0.12);
                }
                .pos-search-btn:active { transform: translateY(0); }
                .vehicle-trigger:hover {
                    background: #e8f1ff;
                    border-color: #e8f1ff;
                    transform: translateY(-1px);
                    box-shadow: 0 3px 8px rgba(6,45,131,0.12);
                }
                .store-trigger:hover {
                    background: #e8f1ff;
                    border-color: #e8f1ff;
                    transform: translateY(-1px);
                    box-shadow: 0 3px 8px rgba(6,45,131,0.12);
                }
                .store-menu-item:hover { background: #f1f5f9; }
                .profile-menu-item:hover { background: #f1f5f9; }
                .logout-item:hover { background: #fef2f2 !important; }
                .nav-cart-icon:hover {
                    background: #e8f1ff;
                    transform: translateY(-1px);
                    box-shadow: 0 3px 8px rgba(6,45,131,0.12);
                }
                .product-card:hover {
                    box-shadow: 0 6px 16px rgba(15,23,42,0.10);
                    transform: translateY(-2px);
                    border-color: #d7deea;
                }
                .product-view-btn:hover {
                    background: #f1f5f9;
                    border-color: #64748b;
                    color: #1e293b;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 6px rgba(15,23,42,0.08);
                }
                .product-add-btn:hover {
                    background: #062d83;
                    border-color: #062d83;
                    color: #ffffff;
                    transform: translateY(-1px);
                    box-shadow: 0 3px 8px rgba(6,45,131,0.18);
                }
                .product-view-btn:active,
                .product-add-btn:active { transform: translateY(0); box-shadow: none; }
                .cart-item:hover {
                    border-color: #d7deea;
                    box-shadow: 0 2px 7px rgba(15,23,42,0.06);
                }
                .cart-item-delete:hover { transform: scale(1.1); opacity: 0.8; }
                .qty-btn:hover { background: #e8f1ff; border-color: #062d83; color: #062d83; }
                .qty-btn:active { transform: scale(0.95); }
                .invoice-btn:hover {
                    background: #15803d;
                    transform: translateY(-1px);
                    box-shadow: 0 3px 8px rgba(22,163,74,0.20);
                }
                .invoice-btn:active { transform: translateY(0); box-shadow: none; }
                .clear-btn:hover { opacity: 0.75; }
                .chevron.open { transform: rotate(180deg); }

                /* Scrollbars */
                .pos-main::-webkit-scrollbar,
                .cart-items::-webkit-scrollbar,
                .vehicle-menu::-webkit-scrollbar,
                .store-menu::-webkit-scrollbar { width: 6px; }
                .pos-main::-webkit-scrollbar-track,
                .cart-items::-webkit-scrollbar-track,
                .vehicle-menu::-webkit-scrollbar-track,
                .store-menu::-webkit-scrollbar-track { background: transparent; }
                .pos-main::-webkit-scrollbar-thumb,
                .cart-items::-webkit-scrollbar-thumb,
                .vehicle-menu::-webkit-scrollbar-thumb,
                .store-menu::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .pos-main::-webkit-scrollbar-thumb:hover,
                .cart-items::-webkit-scrollbar-thumb:hover,
                .vehicle-menu::-webkit-scrollbar-thumb:hover,
                .store-menu::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

                /* Responsive */
                @media (max-width: 1100px) {
                    .pos-topbar-responsive { gap: 0.5rem; padding: 0 0.75rem; }
                    .pos-nav-right-responsive { gap: 0.5rem; }
                    .pos-main { padding: 0.75rem; }
                }
                @media (max-width: 900px) {
                    .cart-panel { flex: 0 0 30%; max-width: 30%; }
                    .pos-main { flex: 0 0 70%; max-width: 70%; }
                    .search-wrap-limited { max-width: none; }
                }
            `}</style>

      {/* pos-wrap */}
      <div className="flex flex-col h-screen bg-[#f1f5f9]">
        {/* TOPBAR */}
        <div
          className="pos-topbar-responsive bg-[#062d83] text-white flex items-center gap-4 px-5 h-14 flex-shrink-0 border-b-2 border-[#062d83] shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
          style={{ height: 56 }}
        >
          {/* Logo */}
          <div className="flex items-center min-w-[80px] flex-shrink-0">
            <img
              src={d2wLogo}
              alt="Deals2Wheels"
              className="h-[34px] w-auto block cursor-pointer"
              onClick={onHomeClick}
            />
          </div>

          {/* ADD A VEHICLE */}
          <div className="relative flex-shrink-0" ref={vehicleRef}>
            <button
              type="button"
              className="vehicle-trigger flex items-center gap-2 h-9 px-4 bg-white border border-white rounded-[6px] text-[#062d83] text-[13px] font-bold cursor-pointer whitespace-nowrap transition-[background,border-color,transform,box-shadow] duration-200 ease-in-out"
              onClick={() => setVehicleOpen((open) => !open)}
            >
              <Car size={16} />
              Add a Vehicle
              <ChevronDown
                size={14}
                className={`chevron text-[#1e293b] transition-transform duration-150 ease-in-out ${
                  vehicleOpen ? "open" : ""
                }`}
              />
            </button>

            {vehicleOpen && (
              <div className="vehicle-menu absolute top-[calc(100%+10px)] left-0 w-[300px] max-h-[75vh] overflow-y-auto bg-white rounded-[10px] shadow-[0_12px_30px_rgba(15,23,42,0.16)] border border-[#e2e8f0] p-4 z-[1000] text-[#1e293b]">
                {children[0]}
              </div>
            )}
          </div>

          {/* SEARCH */}
          <div
            className="search-wrap-limited flex-1 flex gap-2"
            style={{ maxWidth: 720 }}
          >
            <input
              type="text"
              placeholder="Search by Part Number, Brand, Product Name, SKU..."
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pos-search-input flex-1 h-9 rounded-[6px] border border-white bg-white text-[#1e293b] text-[13px] font-normal px-3 outline-none transition-[border-color,box-shadow] duration-200 ease-in-out"
              disabled={!selectedStoreId}
            />

            <button className="pos-search-btn h-9 px-5 bg-white border-none rounded-[6px] text-[#062d83] text-[13px] font-bold cursor-pointer transition-[background,color,transform,box-shadow] duration-200 ease-in-out">
              Search
            </button>
          </div>

          {/* NAV RIGHT */}
          <div className="pos-nav-right-responsive flex items-center gap-4 flex-shrink-0">
            {/* STORE */}
            {user?.role === "SUPER_ADMIN" ? (
              <div className="relative flex-shrink-0" ref={storeRef}>
                <button
                  type="button"
                  className="store-trigger flex items-center gap-2 h-9 px-3 bg-white border border-white rounded-[6px] text-[#062d83] text-[12px] font-bold cursor-pointer whitespace-nowrap max-w-[170px] transition-[background,border-color,transform,box-shadow] duration-200 ease-in-out"
                  onClick={() => setStoreOpen((open) => !open)}
                >
                  <MapPin size={14} />

                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {selectedStoreName || "Choose a Store"}
                  </span>

                  <ChevronDown
                    size={13}
                    className={`chevron text-[#64748b] transition-transform duration-150 ease-in-out ${
                      storeOpen ? "open" : ""
                    }`}
                  />
                </button>

                {storeOpen && (
                  <div className="store-menu absolute top-[calc(100%+10px)] left-0 w-[220px] max-h-[260px] overflow-hidden bg-white rounded-[10px] shadow-[0_12px_30px_rgba(15,23,42,0.16)] border border-[#e2e8f0] z-[1000]">
                    {stores.length === 0 && (
                      <div className="px-4 py-3 text-[12px] text-[#94a3b8]">
                        No stores available
                      </div>
                    )}

                    {stores.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="store-menu-item w-full text-left px-4 py-3 bg-transparent border-none text-[13px] font-medium text-[#062d83] cursor-pointer transition-[background] duration-200 ease-in-out"
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
              user?.role === "STORE_OWNER" && (
                <span className="flex items-center gap-2 text-[12px] font-semibold text-[#062d83] bg-white border border-white px-3 py-2 rounded-[6px] whitespace-nowrap">
                  <MapPin size={14} />

                  {user?.storeName || "Assigned store"}
                </span>
              )
            )}

            {/* HELD BILLS */}
            <button
              type="button"
              className="pos-search-btn held-bills-btn h-9 px-5 bg-white border-none rounded-[6px] text-[#062d83] text-[13px] font-bold cursor-pointer transition-[background,color,transform,box-shadow] duration-200 ease-in-out"
              onClick={onHeldBills}
            >
              Held Bills ({heldBillsCount})
            </button>

            {/* PROFILE */}
            <div className="relative flex-shrink-0" ref={profileRef}>
              <button
                type="button"
                className="flex items-center gap-2 h-9 px-2 pl-1 bg-transparent border-none rounded-lg cursor-pointer"
                onClick={() => setProfileOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={profileOpen}
                aria-label="Account menu"
              >
                <span className="w-[30px] h-[30px] rounded-full bg-white text-[#062d83] flex items-center justify-center font-bold flex-shrink-0 text-[12px]">
                  {initials}
                </span>

                <ChevronDown
                  size={14}
                  className={`chevron text-[#64748b] transition-transform duration-150 ease-in-out ${
                    profileOpen ? "open" : ""
                  }`}
                />
              </button>

              {profileOpen && (
                <div className="absolute top-[calc(100%+10px)] right-0 w-[230px] bg-white rounded-[10px] shadow-[0_12px_30px_rgba(15,23,42,0.16)] border border-[#e2e8f0] overflow-hidden z-[1000]">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f1f5f9]">
                    <span className="w-[38px] h-[38px] rounded-full bg-white text-[#062d83] flex items-center justify-center font-bold flex-shrink-0 text-[14px]">
                      {initials}
                    </span>

                    <div>
                      <div className="text-[13px] font-bold text-[#062d83]">
                        {user?.name || "User"}
                      </div>

                      <div className="text-[11px] font-normal text-[#04070b] mt-0.5">
                        {(user?.role || "").replaceAll("_", " ")}

                        {user?.storeName ? ` · ${user.storeName}` : ""}
                      </div>
                    </div>
                  </div>

                  {user?.role !== "CASHIER" && (
                    <button
                      type="button"
                      className="profile-menu-item w-full text-left px-4 py-3 bg-transparent border-none text-[13px] font-medium text-[#1e293b] cursor-pointer transition-[background] duration-200 ease-in-out"
                      onClick={goToAdmin}
                    >
                      Back to Admin
                    </button>
                  )}

                  <div className="border-t border-[#e2e8f0]" />

                  <button
                    type="button"
                    className="logout-item profile-menu-item w-full text-left px-4 py-3 bg-transparent border-none text-[13px] font-medium text-[#dc2626] cursor-pointer transition-[background] duration-200 ease-in-out"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* CART COUNTER */}
            <div className="nav-cart-icon relative flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-white text-[#062d83] flex-shrink-0 cursor-pointer transition-[background,transform,box-shadow] duration-200 ease-in-out">
              <ShoppingCart size={17} />

              <span className="absolute -top-[6px] -right-[6px] min-w-[18px] h-[18px] px-1 rounded-full bg-[#ef4444] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {cartItems.length}
              </span>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="flex flex-1 overflow-hidden">
          {/* PRODUCT AREA */}
          <div className="pos-main flex-[0_0_75%] max-w-[75%] overflow-y-auto p-4 box-border">
            {children[1]}
          </div>

          {/* CART */}
          <div className="cart-panel flex-[0_0_25%] max-w-[25%] bg-white border-l border-[#e2e8f0] flex flex-col box-border">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#e2e8f0]">
              <span className="text-[14px] font-semibold text-[#062d83] flex items-center gap-2">
                🛒 Cart ({cartItems.length})
              </span>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  className="clear-btn text-[12px] font-semibold text-[#ef4444] bg-transparent border-none cursor-pointer transition-opacity duration-200 ease-in-out"
                  onClick={handleClearCart}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="cart-items flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {cartItems.length === 0 ? (
                <div className="text-center py-7 text-[#94a3b8] text-[13px]">
                  Your cart is empty
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    className="cart-item flex items-center gap-3 p-3 border border-[#e2e8f0] rounded-lg transition-[box-shadow,border-color] duration-200 ease-in-out"
                    key={`${item.inventoryId}_${item.batchId}`}
                  >
                    <div className="w-11 h-11 bg-[#f8fafc] rounded-[6px] overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.image || item.imageUrl || item.mainImageUrl ? (
                        <img
                          src={item.image || item.imageUrl || item.mainImageUrl}
                          alt={item.itemName}
                          className="w-full h-full object-contain"
                        />
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[13px] font-semibold text-[#062d83] whitespace-nowrap overflow-hidden text-ellipsis"
                        title={item.itemName}
                      >
                        {item.itemName}
                      </div>

                      {item.brandName && (
                        <div className="text-[11px] font-medium text-[#060606]">
                          {item.brandName}
                        </div>
                      )}

                      <div className="text-[12px] font-semibold text-[#062d83] mt-0.5">
                        ₹{Number(item.sellingPrice || 0).toFixed(2)}
                        {" / "}
                        {item.stockUnit || "PCS"}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        className="cart-item-delete bg-transparent border-none text-[#ef4444] cursor-pointer text-[14px] leading-none p-0 transition-[transform,opacity] duration-150 ease-in-out"
                        aria-label="Remove item"
                        onClick={() =>
                          removeFromCart(item.inventoryId, item.batchId)
                        }
                      >
                        ✕
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="qty-btn w-[22px] h-[22px] border border-[#cbd5e1] rounded-[4px] bg-[#f8fafc] cursor-pointer text-[14px] flex items-center justify-center leading-none text-[#1e293b] transition-[background,border-color,color,transform] duration-200 ease-in-out"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            decreaseQuantity(item.inventoryId, item.batchId)
                          }
                        >
                          −
                        </button>

                        <span className="text-[12px] font-semibold min-w-[16px] text-center text-[#1e293b]">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          className="qty-btn w-[22px] h-[22px] border border-[#cbd5e1] rounded-[4px] bg-[#f8fafc] cursor-pointer text-[14px] flex items-center justify-center leading-none text-[#1e293b] transition-[background,border-color,color,transform] duration-200 ease-in-out"
                          aria-label="Increase quantity"
                          onClick={() =>
                            increaseQuantity(item.inventoryId, item.batchId)
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

            <div className="border-t border-[#f1f5f9] px-4 py-4">
              <div className="flex justify-between text-[13px] font-normal text-[#010101] mb-1">
                <span>Items</span>
                <span>{cartItems.length}</span>
              </div>

              <div className="flex justify-between text-[13px] font-normal text-[#010101] mb-1">
                <span>Quantity</span>
                <span>{totalQuantity}</span>
              </div>

              <div className="flex justify-between text-[15px] font-semibold text-[#1e293b] mt-2 mb-3">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <button
                type="button"
                className="invoice-btn w-full h-10 bg-[#16a34a] border-none rounded-lg text-white text-[14px] font-semibold cursor-pointer transition-[background,transform,box-shadow] duration-200 ease-in-out"
                onClick={handleCheckout}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default POSLayout;
