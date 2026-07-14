import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProductById, getCompatibleVehicles } from "../../services/productService";
import { useCart } from "../context/CartContext";

function ProductDetailsPage() {
    const { id } = useParams();
    console.log("route product id=", id);

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [compatibility, setCompatibility] = useState([]);

    const { addToCart } = useCart();
    

    useEffect(() => {
        loadProduct();
    }, [id]);

    const loadProduct = async () => {

    try {

        const data =
            await getProductById(id);

        console.log(
            "PRODUCT DETAILS = ",
            data
        );

        setProduct(data);

        const fitments =
            await getCompatibleVehicles(id);

        console.log(
            "FITMENTS = ",
            fitments
        );

        setCompatibility(
            fitments
        );

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
        <div>
            <div style={{ padding: "15px 20px" }}>
                <button
                    onClick={() => window.history.back()}
                    style={{
                        padding: "10px 20px",
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer"
                    }}
                >
                    ← Back
                </button>
            </div>

            {/* MAIN SECTION */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "60px",
                    alignItems: "start"
                }}
            >
                {/* IMAGE SECTION */}
                <div
                    style={{
                        background: "white",
                        padding: "30px",
                        borderRadius: "20px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
                    }}
                >
                    <img
                        src={
                            product.images?.[0] &&
                            !product.images?.[0].includes("example.com")
                                ? product.images?.[0]
                                : "https://placehold.co/600x600?text=Deals2Wheels"
                        }
                        alt={product.itemName}
                        style={{
                            width: "100%",
                            borderRadius: "16px",
                            objectFit: "cover"
                        }}
                    />
                </div>

                {/* DETAILS SECTION */}
                <div>
                    {/* BRAND */}
                    <p
                        style={{
                            color: "#6b7280",
                            marginBottom: "10px",
                            fontSize: "15px"
                        }}
                    >
                        {product.brandName}
                    </p>

                    {/* TITLE */}
                    <h1
                        style={{
                            fontSize: "48px",
                            marginBottom: "20px",
                            lineHeight: "1.2"
                        }}
                    >
                        {product.itemName}
                    </h1>

                    {/* PRICE */}
                    <h2
                        style={{
                            fontSize: "42px",
                            marginBottom: "30px",
                            color: "#111827"
                        }}
                    >
                        ₹{product.sellingPrice}
                    </h2>

                    {/* PRODUCT INFO */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "14px", 
                            marginBottom: "30px"
                        }}
                    >
                        <p>
                            <strong>Part Number:</strong>{" "}
                            {product.partNumber}
                        </p>

                        <p>
                            <strong>SKU:</strong>{" "}
                            {product.sku}
                        </p>

                        <p>
                            <strong>Category:</strong>{" "}
                            {product.categoryName}
                        </p>

                        <p>
                            <strong>Product Master:</strong>{" "}
                            {product.productMasterName}
                        </p>

                        <p>
                            <strong>HSN Code:</strong>{" "}
                            {product.hsncode}
                        </p>

                        <p>
                            <strong>GST:</strong>{" "}
                            {product.gstPercentage != null
                                ? `${product.gstPercentage}%`
                                : "—"}
                        </p>

                        <p>
                            <strong>MRP:</strong>{" "}
                            {product.mrp != null ? `₹${product.mrp}` : "—"}
                        </p>

                        <p>
                            <strong>Available Stock:</strong>{" "}
                            {product.quantity != null ? product.quantity : "—"}
                        </p>
                    </div>

                    {/* STOCK */}
                    <div style={{ marginBottom: "24px" }}>
                        {product.inStock ? (
                            <span
                                style={{
                                    color: "green",
                                    fontWeight: "600",
                                    fontSize: "18px"
                                }}
                            >
                                In Stock
                            </span>
                        ) : (
                            <span
                                style={{
                                    color: "red",
                                    fontWeight: "600",
                                    fontSize: "18px"
                                }}
                            >
                                Out Of Stock
                            </span>
                        )}
                    </div>

                    {/* DESCRIPTION */}
                    <div style={{ marginBottom: "24px" }}>
                        <h3
                            style={{
                                marginBottom: "14px",
                                fontSize: "26px"
                            }}
                        >
                            Description
                        </h3>
                        <p
                            style={{
                                lineHeight: "1.9",
                                color: "#4b5563"
                            }}
                        >
                            {product.description}
                        </p>
                    </div>

                    {/* VIEW COMPATIBLE VEHICLES */}
                    <div style={{ marginBottom: "30px" }}>
                        <button
                            onClick={() => {
                                document
                                    .getElementById("compatible-vehicles")
                                    .scrollIntoView({ behavior: "smooth" });
                            }}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#2563eb",
                                cursor: "pointer",
                                fontSize: "16px",
                                fontWeight: "600",
                                padding: 0
                            }}
                        >
                            View Compatible Vehicles
                        </button>
                    </div>

                    {/* BUTTONS */}
                    <div style={{ display: "flex", gap: "16px" }}>
                        <button
                            onClick={() => {
                                console.log("PRODUCT BEFORE CART", product);
                                addToCart({
                                    ...product,
                                    productId: product.productId || product.id
                                });
                                alert("Product Added To Cart");
                            }}
                            style={{
                                padding: "14px 30px",
                                border: "none",
                                borderRadius: "10px",
                                background: "#111827",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "16px"
                            }}
                        >
                            Add To Cart
                        </button>
                    </div>
                </div>
            </div>

            {/* COMPATIBLE VEHICLES SECTION */}
            <div
                id="compatible-vehicles"
                style={{
                    marginTop: "50px",
                    background: "#ffffff",
                    padding: "30px",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb"
                }}
            >
                <h2
                    style={{
                        marginBottom: "20px",
                        fontSize: "28px",
                        fontWeight: "700",
                        color: "#111827"
                    }}
                >
                    Compatibility
                </h2>

                <div style={{ overflowX: "auto" }}>
                    {compatibility.length === 0 ? (
                        <p style={{ color: "#6b7280" }}>
                            No compatibility data available for this product.
                        </p>
                    ) : (
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                background: "#fff"
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        background: "#f8fafc",
                                        textAlign: "left"
                                    }}
                                >
                                    <th style={{ padding: "12px", border: "1px solid #e2e8f0" }}>Year</th>
                                    <th style={{ padding: "12px", border: "1px solid #e2e8f0" }}>Make</th>
                                    <th style={{ padding: "12px", border: "1px solid #e2e8f0" }}>Model</th>
                                    <th style={{ padding: "12px", border: "1px solid #e2e8f0" }}>Engine</th>
                                    <th style={{ padding: "12px", border: "1px solid #e2e8f0" }}>Fuel Type</th>
                                    <th style={{ padding: "12px", border: "1px solid #e2e8f0" }}>Engine Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {compatibility.map((vehicle, index) => (
                                    <tr key={index}>
                                        <td style={{ padding: "12px", border: "1px solid #e2e8f0" }}>
                                            {vehicle.year}
                                        </td>
                                        <td style={{ padding: "12px", border: "1px solid #e2e8f0" }}>
                                            {vehicle.make}
                                        </td>
                                        <td style={{ padding: "12px", border: "1px solid #e2e8f0" }}>
                                            {vehicle.model}
                                        </td>
                                        <td style={{ padding: "12px", border: "1px solid #e2e8f0" }}>
                                            {vehicle.engine}
                                        </td>
                                        <td style={{ padding: "12px", border: "1px solid #e2e8f0" }}>
                                            {vehicle.fuelType}
                                        </td>
                                        <td style={{ padding: "12px", border: "1px solid #e2e8f0" }}>
                                            {vehicle.engineType}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductDetailsPage;
