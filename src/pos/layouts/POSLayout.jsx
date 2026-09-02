import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const S = {
    wrap: { display: "flex", flexDirection: "column", height: "100vh", background: "#f1f5f9", fontFamily: "system-ui, sans-serif" },
    // TOPBAR
    topbar: { background: "#0f1c3a", color: "#fff", display: "flex", alignItems: "center", gap: "16px", padding: "0 20px", height: "56px", flexShrink: 0, borderBottom: "2px solid #2563eb" },
    logo: { display: "flex", alignItems: "center", gap: "10px", minWidth: "200px" },
    logoIcon: { width: "32px", height: "32px", background: "#2563eb", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" },
    brandName: { fontSize: "15px", fontWeight: "600", color: "#fff", margin: 0 },
    brandSub: { fontSize: "11px", color: "#94a3b8", margin: 0 },
    searchWrap: { flex: 1, display: "flex", gap: "8px" },
    searchInput: { flex: 1, height: "36px", borderRadius: "6px", border: "1px solid #334155", background: "#1e2d4a", color: "#e2e8f0", fontSize: "13px", padding: "0 12px", outline: "none" },
    searchBtn: { height: "36px", padding: "0 18px", background: "#2563eb", border: "none", borderRadius: "6px", color: "#fff", fontSize: "13px", cursor: "pointer", fontWeight: "500" },
    navRight: { display: "flex", alignItems: "center", gap: "14px" },
    welcomeTxt: { fontSize: "13px", color: "#94a3b8" },
    logoutBtn: { height: "32px", padding: "0 14px", border: "1px solid #ef4444", background: "transparent", borderRadius: "6px", color: "#ef4444", fontSize: "12px", cursor: "pointer" },
    // BODY
    body: { display: "flex", flex: 1, overflow: "hidden" },
    // SIDEBAR
    sidebar: {
    width: "280px",
    flexShrink: 0,
    background: "#fff",
    borderRight: "1px solid #e2e8f0",
    padding: "16px"
},
    sectionHd: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" },
    sectionIcon: { fontSize: "18px" },
    sectionTitle: { fontSize: "13px", fontWeight: "600", color: "#1e293b", margin: 0 },
    fieldLabel: { fontSize: "11px", color: "#64748b", marginBottom: "4px", marginTop: "10px", display: "block" },
    fieldInput: { width: "100%", height: "34px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#f8fafc", color: "#1e293b", fontSize: "13px", padding: "0 10px", boxSizing: "border-box" },
    divider: { border: "none", borderTop: "1px solid #f1f5f9", margin: "16px 0" },
    // MAIN / PRODUCTS
    main: { flex: 1, overflowY: "auto", padding: "16px" },
    // CART
    cartPanel: { width: "272px", flexShrink: 0, background: "#fff", borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column" },
    cartHd: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #f1f5f9" },
    cartTitle: { fontSize: "14px", fontWeight: "600", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" },
    clearBtn: { fontSize: "12px", color: "#ef4444", background: "none", border: "none", cursor: "pointer" },
    cartItems: { flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "10px" },
    cartItem: { display: "flex", alignItems: "center", gap: "10px", padding: "10px", border: "1px solid #f1f5f9", borderRadius: "8px" },
    ciImg: { width: "44px", height: "44px", background: "#f8fafc", borderRadius: "6px", overflow: "hidden", flexShrink: 0 },
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
    notesArea: { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#f8fafc", color: "#1e293b", fontSize: "12px", resize: "none", height: "52px", boxSizing: "border-box", marginBottom: "10px" },
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
    cartItems, clearCart,
} = useCart();


const navigate=useNavigate();

    return (
        <div style={S.wrap}>
            {/* TOPBAR */}
            <div style={S.topbar}>
                <div style={S.logo}>
                    <div style={S.logoIcon}>🚗</div>
                    <div>
                       <p
    style={{
        ...S.brandName,
        cursor: "pointer"
    }}
    onClick={onHomeClick}
>
    Deals2Wheels POS
</p>
                        <p style={S.brandSub}>{user?.storeName}</p>
                    </div>
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
                    {user?.role === "SUPER_ADMIN" && <select aria-label="POS store" value={selectedStoreId} onChange={(e)=>onStoreChange?.(e.target.value)} style={{width:150,height:32,borderRadius:6,padding:"0 7px",fontSize:11,border:"1px solid #475569",background:"#fff",color:"#0f172a"}}><option value="">Select store</option>{stores.map(s=><option key={s.id} value={s.id}>{s.storeName}</option>)}</select>}
                    {user?.role === "STORE_OWNER" && <span style={{fontSize:12,color:"#dbeafe",background:"#1e3a5f",border:"1px solid #31527e",padding:"8px 10px",borderRadius:6}}>Store: {user?.storeName || "Assigned store"}</span>}
                    <button style={{ ...S.searchBtn, background: "#f59e0b" }} onClick={onHeldBills}>
                        Held Bills ({heldBillsCount})
                    </button>
                   
                    <span style={S.welcomeTxt}>Welcome, {user?.name}</span>
                    {user?.role !== "CASHIER" && <button style={{...S.logoutBtn,borderColor:"#94a3b8",color:"#e2e8f0"}} onClick={()=>navigate(user?.role==="SUPER_ADMIN"?"/owner/dashboard":"/store/dashboard")}>Back to Admin</button>}
                    <button style={S.logoutBtn} onClick={() => { localStorage.clear(); window.location.href = "/login"; }}>
                        Logout
                    </button>
                </div>
            </div>

            <div style={S.body}>
                {/* LEFT SIDEBAR */}
                <div style={S.sidebar}>
                    {/* Vehicle Selection — rendered by children via POSPage */}
                    {children[0]}

                    <hr style={S.divider} />

           
                </div>

                {/* PRODUCT AREA */}
                <div style={S.main}>
                    {children[1]}
                </div>

             
                    </div>
                    <button
    onClick={() => {
        const draftId = localStorage.getItem("pos_active_draft_id");
        navigate(draftId ? `/pos/checkout?draftId=${encodeURIComponent(draftId)}` : "/pos/checkout");
    }}
    style={{
        position: "fixed",
        right: "25px",
        bottom: "25px",
        background: "#2563eb",
        color: "#fff",
        border: "none",
        borderRadius: "50px",
        padding: "14px 22px",
        fontSize: "16px",
        fontWeight: "600",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        zIndex: 999
    }}
>
    🛒 Cart ({cartItems.length})
</button>
{cartItems.length > 0 && <button onClick={()=>{if(window.confirm("Clear all items from this cart?")) clearCart();}} style={{position:"fixed",right:"25px",bottom:"82px",background:"#fff",color:"#dc2626",border:"1px solid #fecaca",borderRadius:"8px",padding:"8px 14px",cursor:"pointer",zIndex:999}}>Clear Cart</button>}
                </div>
            
        
    );
}

export default POSLayout;
