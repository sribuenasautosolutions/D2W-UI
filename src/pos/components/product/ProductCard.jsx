import { useCart } from "../../context/CartContext";
import { useNavigate } from "react-router-dom";

function ProductCard({ product }) {


    const { addToCart } = useCart();

    const navigate = useNavigate();


    const isAvailable =
        product.inStock === true ||
        product.quantity > 0;
       

    return (
        <div style={{
            background: "#fff", borderRadius: "10px", padding: "12px",
            border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: "8px",
            transition: "box-shadow 0.2s"
        }}>
            <div style={{ height: "90px", background: "#f8fafc", borderRadius: "7px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(product.image || product.imageUrl || product.mainImageUrl)
    ? (
        <img
            src={
                product.image ||
                product.imageUrl ||
                product.mainImageUrl
            }
            alt={product.itemName}
            style={{
                width: "100%",
                height: "100%",
                objectFit: "contain"
            }}
        />
    )
    : (
        <span
            style={{
                color: "#cbd5e1",
                fontSize: "13px"
            }}
        >
            No Image
        </span>
    )
}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>{product.brandName}</div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b", lineHeight: 1.3, minHeight: "34px" }}>{product.itemName}</div>
            {product.partNumber && (
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Part: {product.partNumber}</div>
            )}
            <div style={{ fontSize: "11px", color: isAvailable ? "#16a34a" : "#ef4444", fontWeight: "600" }}>
                {product.stockStatus || (isAvailable ? "IN STOCK" : "OUT OF STOCK")}
               {product.quantity > 0 && (
    <span
        style={{
            color: "#64748b",
            fontWeight: "400"
        }}
    >
        {" "}· Qty: {product.quantity}
    </span>
)}
            </div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#2563eb" }}>₹{product.sellingPrice}</div>
           <div
    style={{
        display: "flex",
        gap: "8px"
    }}
>
    

    <button
       onClick={() =>
   navigate(
    `/pos/product/${product.productId || product.id}`
)
}
        style={{
            flex: 1,
            height: "32px",
            border: "1px solid #64748b",
            borderRadius: "6px",
            background: "#ffffff",
            color: "#64748b",
            cursor: "pointer",
            fontSize: "13px"
        }}
    >
        View
    </button>

    <button
        onClick={() =>
            addToCart(product)
        }
        disabled={!isAvailable}
        style={{
            flex: 1,
            height: "32px",
            border: isAvailable
                ? "1px solid #2563eb"
                : "1px solid #e2e8f0",
            borderRadius: "6px",
            background: isAvailable
                ? "transparent"
                : "#f8fafc",
            color: isAvailable
                ? "#2563eb"
                : "#94a3b8",
            cursor: isAvailable
                ? "pointer"
                : "not-allowed",
            fontSize: "13px",
            fontWeight: "500"
        }}
    >
        {isAvailable
            ? "+ Add"
            : "Out Of Stock"}
    </button>

</div>
        </div>
    );
}

export default ProductCard;
  