import { useCart } from "../../context/CartContext";

function ProductCard({ product }) {

const { addToCart } = useCart();

const isAvailable =
    product.availbleInStore === true ||
    product.storeQuantity > 0;

return (

    <div
        style={{
            background: "white",
            borderRadius: "14px",
            padding: "18px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            transition: "0.3s"
        }}
    >

        <div
            style={{
                height: "180px",
                background: "#f3f4f6",
                borderRadius: "18px",
                marginBottom: "16px",
                overflow: "hidden"
            }}
        >

            {
                product.mainImageUrl ? (

                    <img
                        src={product.mainImageUrl}
                        alt={product.itemName}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain"
                        }}
                    />

                ) : (

                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#9ca3af"
                        }}
                    >
                        No Image
                    </div>

                )
            }

        </div>

        <p
            style={{
                color: "#6b7280",
                fontSize: "14px",
                marginBottom: "6px"
            }}
        >
            {product.brandName}
        </p>

        <h3
            style={{
                fontSize: "18px",
                marginBottom: "10px",
                minHeight: "40px"
            }}
        >
            {product.itemName}
        </h3>

        <p
            style={{
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "6px"
            }}
        >
            Part No: {product.partNumber}
        </p>

        <p
            style={{
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "10px"
            }}
        >
            Available Qty: {product.storeQuantity || 0}
        </p>

        <h2
            style={{
                marginBottom: "12px"
            }}
        >
            ₹{product.sellingPrice}
        </h2>

        <div
            style={{
                marginBottom: "16px"
            }}
        >

            <span
                style={{
                    color: isAvailable ? "green" : "red",
                    fontWeight: "700"
                }}
            >
                {product.stockStatus || (isAvailable ? "IN STOCK" : "OUT OF STOCK")}
            </span>

        </div>

        <button
            onClick={() => addToCart(product)}
            disabled={!isAvailable}
            style={{
                width: "100%",
                padding: "12px",
                border: "none",
                borderRadius: "18px",
                background: isAvailable ? "#2563eb" : "#9ca3af",
                color: "white",
                cursor: isAvailable ? "pointer" : "not-allowed"
            }}
        >
            {isAvailable ? "Add To Cart" : "Out Of Stock"}
        </button>

    </div>

);

}

export default ProductCard;