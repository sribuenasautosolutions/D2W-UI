import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getInventoryDetails, getCompatibleVehicles } from "../../services/productService";
import { useCart } from "../context/CartContext";
import "./ProductDetailsPage.css";

function ProductDetailsPage({ inventoryId, embedded = false, onClose }) {
    const { id: routeId } = useParams();
    const id = inventoryId || routeId;
    console.log("route product id=", id);

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [compatibility, setCompatibility] = useState([]);
    const [showCompatibility, setShowCompatibility] = useState(false);

    const { addToCart } = useCart();
    

    useEffect(() => {
        loadProduct();
    }, [id]);

    const loadProduct = async () => {

    try {

   const data =
    await getInventoryDetails(id);

        console.log(
            "PRODUCT DETAILS = ",
            data
        );

        setProduct(data);
        console.log("PRODUCT DETAILS =", data);
console.log("PRODUCT ID FOR FITMENT =", data.productId);

       if (data.productId != null) {

    const fitments =
        await getCompatibleVehicles(data.productId);

        console.log("FITMENTS FROM API =", fitments);
console.log("FITMENTS IS ARRAY =", Array.isArray(fitments));
console.log("FITMENTS LENGTH =", fitments?.length);

    

    setCompatibility(fitments);

} else {

    setCompatibility([]);
}

    } catch(error) {

        console.error(error);

    } finally {

        setLoading(false);
    }
};

    if (loading) {
        return <h2>Loading...</h2>;
    }

    if (!product) {
        return <h2>Product Not Found</h2>;
    }

    return (
        <div className="product-details-page">
            <div className="product-details-topbar">
                {!embedded && <button
                    onClick={() => window.history.back()}  className="product-back-button">
                    ← Back
                </button>}
                {embedded && <button onClick={onClose}   className="product-close-button">Close</button>}
            </div>

            {/* MAIN SECTION */}
            <div  className="product-details-main">
                {/* IMAGE SECTION */}
                <div className="product-image-card">
                    <img
                        src={
                            product.images?.[0] &&
                            !product.images?.[0].includes("example.com")
                                ? product.images?.[0]
                                : "https://placehold.co/600x600?text=Deals2Wheels"
                        }
                        alt={product.itemName}
                        className="product-main-image"
                    />
                </div>

                {/* DETAILS SECTION */}
                <div>
                    {/* BRAND */}
                    <p className="product-brand">
                        {product.brandName}
                    </p>

                    {/* TITLE */}
                    <h1 className="product-title">
                        {product.itemName}
                    </h1>

                    {/* PRICE */}
                    <h2 className="product-price">
                        ₹{product.sellingPrice}
                    </h2>

                    {/* PRODUCT INFO */}
                    <div className="product-info-grid">
                        <div className="product-info-item">
                        <span className="product-info-label">Part Number</span>
                        <span className="product-info-value">
                            {product.partNumber}
                        </span>
                    </div>

                    <div className="product-info-item">
                        <span className="product-info-label">SKU</span>
                        <span className="product-info-value">
                            {product.sku}
                        </span>
                    </div>

                    <div className="product-info-item">
                        <span className="product-info-label">Category</span>
                        <span className="product-info-value">
                            {product.categoryName}
                        </span>
                    </div>

                    <div className="product-info-item">
                        <span className="product-info-label">Product Master</span>
                        <span className="product-info-value">
                            {product.productMasterName}
                        </span>
                    </div>

                    <div className="product-info-item">
                        <span className="product-info-label">HSN Code</span>
                        <span className="product-info-value">
                            {product.hsncode}
                        </span>
                    </div>

                    <div className="product-info-item">
                        <span className="product-info-label">GST</span>
                        <span className="product-info-value">
                            {product.gstPercentage != null
                                ? `${product.gstPercentage}%`
                                : "—"}
                        </span>
                    </div>

                    <div className="product-info-item">
                        <span className="product-info-label">MRP</span>
                        <span className="product-info-value">
                            {product.mrp != null
                                ? `₹${product.mrp}`
                                : "—"}
                        </span>
                    </div>

                    <div className="product-info-item">
                        <span className="product-info-label">Available Stock</span>
                        <span className="product-info-value">
                            {product.quantity != null
                                ? product.quantity
                                : "—"}
                        </span>
                    </div>
                    </div>

                    {/* STOCK */}
                    <div className="product-stock">
                        {product.inStock ? (
                            <span className="product-stock-in">
                                In Stock
                            </span>
                        ) : (
                            <span className="product-stock-out">
                                Out Of Stock
                            </span>
                        )}
                    </div>

                    {/* ACTONABLE BUTTONS */}
                    
                    <div className="product-actions">
                        <button
                            type="button"
                            className="view-compatibility-button"
                            onClick={() => setShowCompatibility((previous) => !previous)}
                        >
                            {showCompatibility
                                ? "Hide Compatible Vehicles"
                                : "View Compatible Vehicles"}
                        </button>

                        {!embedded && (
                            <button
                                type="button"
                                className="add-to-cart-button"
                                onClick={() => {
                                    console.log("PRODUCT BEFORE CART", product);
                                    addToCart(product);
                                    alert("Product Added To Cart");
                                }}
                            >
                                Add To Cart
                            </button>
                        )}
                    </div>

            </div>
        </div>

            {/* COMPATIBLE VEHICLES SECTION */}
            {showCompatibility && (
    <div id="compatible-vehicles" className="compatibility-section">
        <h2 className="compatibility-title">
            Compatible Vehicles
        </h2>

        {compatibility.length > 0 ? (
            <div className="compatibility-table-wrapper">
                <table className="compatibility-table">
                    <thead>
                        <tr>
                            <th>Year</th>
                            <th>Make</th>
                            <th>Model</th>
                            <th>Engine</th>
                            <th>Fuel Type</th>
                            <th>Engine Type</th>
                        </tr>
                    </thead>

                    <tbody>
                        {compatibility.map((vehicle, index) => (
                            <tr key={index}>
                                <td>{vehicle.year}</td>
                                <td>{vehicle.make}</td>
                                <td>{vehicle.model}</td>
                                <td>{vehicle.engine}</td>
                                <td>{vehicle.fuelType}</td>
                                <td>{vehicle.engineType}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <p className="compatibility-empty">
                No compatible vehicles found.
            </p>
        )}
    </div>
)}
        </div>
    );
}

export default ProductDetailsPage;
