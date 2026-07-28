

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

function POSPage() {
    const navigate = useNavigate();
    const [selectedVariant, setSelectedVariant] = useState("");
    const [products, setProducts] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [variantLabel, setVariantLabel] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const productsPerPage = 9;
    const { cartItems } = useCart();  // FIX: removed clearCart — not used here anymore

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
            navigate("/login");
            return;
        }
        loadStoreInventory();
    }, [navigate]);

    useEffect(() => {
        if (selectedVariant) loadProducts();
    }, [selectedVariant]);

    const loadProducts = async () => {
        try {
            const data = await getProductsByVariant(selectedVariant);
            setProducts(data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadStoreInventory = async () => {
        try {
            const data = await getAllProducts();
            setProducts(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSearchChange = async (text) => {
        setCurrentPage(1);
        setSearchText(text);
        if (text.trim() === "") {
            setSearchResults([]);
            await loadStoreInventory();
            return;
        }
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            const data = await searchProducts(text, user.storeId);
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
        await loadStoreInventory();
    };

    const displayProducts = searchText.trim() !== "" ? searchResults : products;
    const lastIndex = currentPage * productsPerPage;
    const firstIndex = lastIndex - productsPerPage;
    const currentProducts = displayProducts.slice(firstIndex, lastIndex);
    const totalPages = Math.ceil(displayProducts.length / productsPerPage);

    const sidebarHd = { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" };
    const sidebarTitle = { fontSize: "13px", fontWeight: "600", color: "#1e293b", margin: 0 };

    return (
        <POSLayout
            searchText={searchText}
            onSearchChange={handleSearchChange}
            onHomeClick={handleHomeClick}
        >
            {/* SLOT 0 — Vehicle selector for sidebar */}
            <div>
                <div style={sidebarHd}>
                    <span style={{ fontSize: "18px" }}>🚗</span>
                    <h3 style={sidebarTitle}>Vehicle Selection</h3>
                </div>
                <POSVehicleSelector
                    onVariantSelected={setSelectedVariant}
                    onLabelChange={setVariantLabel}
                />
            </div>

            {/* SLOT 1 — Products area */}
            <div>
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

                {displayProducts.length === 0 && (
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
                        <ProductCard key={product.inventoryId} product={product} />
                    ))}
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        Previous
                    </button>
                    <span>Page {currentPage} of {totalPages || 1}</span>
                    <button
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </POSLayout>
    );
}

export default POSPage;
