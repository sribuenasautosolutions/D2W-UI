

import { useState, useEffect } from "react";
import POSLayout from "../layouts/POSLayout";
import POSVehicleSelector from "../components/vehicle/POSVehicleSelector";
import ProductCard from "../../pos/components/product/ProductCard";
import {
    getProductsByVariant,
    searchProducts,
    getAllProducts
} from "../../services/productService";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../pos/context/CartContext";
import { getAllStores } from "../../services/storeService";

function POSPage() {
    const navigate = useNavigate();
    const [selectedVariant, setSelectedVariant] = useState("");
    const [products, setProducts] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [variantLabel, setVariantLabel] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [serverTotalPages, setServerTotalPages] = useState(0);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [heldBills, setHeldBills] = useState([]);
    const [showHeldBills, setShowHeldBills] = useState(false);
    const { replaceCart, clearCart } = useCart();
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const [stores,setStores]=useState([]);
    const [selectedStoreId,setSelectedStoreId]=useState(
        user?.role === "SUPER_ADMIN"
            ? localStorage.getItem("pos_store_id") || ""
            : user?.storeId || ""
    );

    const productsPerPage = 9;
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
            navigate("/login");
            return;
        }
        if(user?.role === "SUPER_ADMIN") getAllStores().then(v=>setStores(Array.isArray(v)?v:(v?.content||[]))).catch(console.error);
        else localStorage.removeItem("pos_store_id");
        if(selectedStoreId) loadStoreInventory(1);
        try {
            const editableDrafts = JSON.parse(localStorage.getItem("pos_held_payments") || "[]")
                .filter((entry) => entry.draftId && Array.isArray(entry.cartItems));
            localStorage.setItem("pos_held_payments", JSON.stringify(editableDrafts));
            setHeldBills(editableDrafts);
        }
        catch { setHeldBills([]); }
    }, [navigate]);

    useEffect(() => {
        if (selectedVariant) loadProducts();
    }, [selectedVariant]);

    const loadProducts = async () => {
        try {
            setLoadingProducts(true);
            const data = await getProductsByVariant(selectedVariant);
            setProducts(data);
            setServerTotalPages(0);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const loadStoreInventory = async (page = currentPage) => {
        try {
            setLoadingProducts(true);
            const data = await getAllProducts(page - 1, productsPerPage);
            setProducts(data.content || []);
            setServerTotalPages(data.totalPages || 0);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleSearchChange = async (text) => {
        setCurrentPage(1);
        setSearchText(text);
        if (text.trim() === "") {
            setSearchResults([]);
            if (selectedVariant) await loadProducts();
            else await loadStoreInventory(1);
            return;
        }
        try {
            const data = await searchProducts(text, selectedStoreId);
            setSearchResults(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleHomeClick = async () => {
        setSelectedVariant("");
        setVariantLabel("");
        setSearchText("");
        setSearchResults([]);
        setCurrentPage(1);
        await loadStoreInventory(1);
    };

    const handleVariantSelected = async (variantId) => {
        setCurrentPage(1);
        setSelectedVariant(variantId);
        setSearchText("");
        setSearchResults([]);
        if (!variantId) await loadStoreInventory(1);
    };

    const resumeHeldBill = (bill) => {
        replaceCart(bill.cartItems);
        localStorage.setItem("pos_active_draft_id", bill.draftId);
        navigate(`/pos/checkout?draftId=${encodeURIComponent(bill.draftId)}`);
    };

    const displayProducts = searchText.trim() !== "" ? searchResults : products;
    const usesServerPaging = !selectedVariant && searchText.trim() === "";
    const lastIndex = currentPage * productsPerPage;
    const firstIndex = lastIndex - productsPerPage;
    const currentProducts = usesServerPaging ? displayProducts : displayProducts.slice(firstIndex, lastIndex);
    const totalPages = usesServerPaging ? serverTotalPages : Math.ceil(displayProducts.length / productsPerPage);

    const changePage = async (page) => {
        setCurrentPage(page);
        if (usesServerPaging) await loadStoreInventory(page);
    };

    const sidebarHd = { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" };
    const sidebarTitle = { fontSize: "13px", fontWeight: "600", color: "#1e293b", margin: 0 };

    return (
        <>
        <POSLayout
            searchText={searchText}
            onSearchChange={handleSearchChange}
            onHomeClick={handleHomeClick}
            onHeldBills={() => setShowHeldBills(true)}
            heldBillsCount={heldBills.length}
            stores={stores}
            selectedStoreId={selectedStoreId}
            onStoreChange={(id)=>{if (String(id) !== String(selectedStoreId)) clearCart();setSelectedStoreId(id);localStorage.setItem("pos_store_id",id);setProducts([]);setSearchResults([]);setSearchText("");setSelectedVariant("");setCurrentPage(1);setTimeout(()=>loadStoreInventory(1),0);}}
        >
            {/* SLOT 0 — Vehicle selector for sidebar */}
            <div>
                <div style={sidebarHd}>
                    <span style={{ fontSize: "18px" }}>🚗</span>
                    <h3 style={sidebarTitle}>Vehicle Selection</h3>
                </div>
                <POSVehicleSelector
                    onVariantSelected={handleVariantSelected}
                    onLabelChange={setVariantLabel}
                />
            </div>

            {/* SLOT 1 — Products area */}
            <div>
                {!selectedStoreId && <div style={{padding:"48px 24px",textAlign:"center",background:"#fff",border:"1px dashed #93c5fd",borderRadius:12,color:"#475569"}}><strong style={{display:"block",fontSize:18,color:"#0f172a",marginBottom:8}}>Select a store to start POS</strong>Product search and inventory will load only from the selected store.</div>}
                {(selectedVariant || searchText) && (
                    <div style={{ marginBottom: "14px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                            {searchText ? "Search Results" : "Compatible Products"}
                        </div>
                        {variantLabel && !searchText && (
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                                (For {variantLabel})
                            </div>
                        )}
                    </div>
                )}

                {loadingProducts && <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>Loading products...</div>}
                {!loadingProducts && displayProducts.length === 0 && (
                    <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8", fontSize: "14px" }}>
                        {selectedVariant || searchText
                            ? "No products found"
                            : "Select a vehicle or search to view products"}
                    </div>
                )}

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "14px"
                }}>
                    {currentProducts.map((product) => (
                        <ProductCard key={product.inventoryId || product.productId || product.id} product={product} />
                    ))}
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
                    <button
                        disabled={currentPage === 1}
                        onClick={() => changePage(currentPage - 1)}
                    >
                        Previous
                    </button>
                    <span>Page {currentPage} of {totalPages || 1}</span>
                    <button
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => changePage(currentPage + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </POSLayout>
        {showHeldBills && (
            <div onClick={() => setShowHeldBills(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 1000, display: "grid", placeItems: "center" }}>
                <div onClick={(event) => event.stopPropagation()} style={{ width: "min(620px, 92vw)", maxHeight: "75vh", overflow: "auto", background: "#fff", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                        <h3 style={{ margin: 0 }}>Held Bills</h3>
                        <button onClick={() => setShowHeldBills(false)}>Close</button>
                    </div>
                    {heldBills.length === 0 ? <p>No held bills.</p> : heldBills.map((bill) => (
                        <button key={bill.draftId || bill.orderId} onClick={() => resumeHeldBill(bill)} style={{ width: "100%", display: "flex", justifyContent: "space-between", padding: "12px", marginBottom: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer" }}>
                            <span>Draft · {bill.customerName || "Customer"}</span>
                            <span>₹{Number(bill.balanceAmount ?? bill.totalAmount ?? 0).toFixed(2)}</span>
                            <span style={{ color: "#2563eb" }}>Open cart →</span>
                        </button>
                    ))}
                </div>
            </div>
        )}
        </>
    );
}

export default POSPage;
