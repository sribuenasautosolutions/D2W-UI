import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCart } from "../../context/CartContext";
import BatchSelectionModal from "./BatchSelectionModal";
import "./ProductCard.css";

function ProductCard({ product }) {
    const { addToCart } = useCart();

    const [openBatchModal, setOpenBatchModal] = useState(false);
    const navigate = useNavigate();

    const isAvailable =
        product.inStock === true ||
        product.quantity > 0;

    return (
        <div className="product-card">

            {/* Product Image */}
            <div className="product-image-container">
                {(product.image || product.imageUrl || product.mainImageUrl) ? (
                    <img
                        src={
                            product.image ||
                            product.imageUrl ||
                            product.mainImageUrl
                        }
                        alt={product.itemName}
                        className="product-image"
                    />
                ) : (
                    <span className="no-image">
                        No Image
                    </span>
                )}
            </div>

            {/* Brand */}
            <div className="product-brand">
                {product.brandName}
            </div>

            {/* Product Name */}
            <div className="product-name">
                {product.itemName}
            </div>

            {/* Part Number */}
            {product.partNumber && (
                <div className="product-part-number">
                    <span className="product-part-label">
                        Part:
                    </span>{" "}
                    {product.partNumber}
                </div>
            )}

            {/* Stock */}
            <div
                className={`product-stock ${
                    isAvailable
                        ? "product-stock-available"
                        : "product-stock-unavailable"
                }`}
            >
                {product.stockStatus ||
                    (isAvailable
                        ? "IN STOCK"
                        : "OUT OF STOCK")}

                {product.quantity > 0 && (
                    <span className="product-quantity">
                        {" "}· Qty: {product.quantity}{" "}
                        {product.stockUnit || "PCS"}
                    </span>
                )}
            </div>

            {/* Price */}
            <div className="product-price">
                ₹{product.sellingPrice} /{" "}
                {product.stockUnit || "PCS"}
            </div>

            {/* Buttons */}
            <div className="product-actions">

                {/* View */}
                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            `/pos/product/${product.inventoryId}`
                        )
                    }
                    className="product-view-btn"
                >
                    View
                </button>

                {/* Add */}
                <button
                    type="button"
                    onClick={() =>
                        setOpenBatchModal(true)
                    }
                    disabled={!isAvailable}
                    className={
                        isAvailable
                            ? "product-add-btn"
                            : "product-add-btn product-add-disabled"
                    }
                >
                    {isAvailable
                        ? "+ Add"
                        : "Out Of Stock"}
                </button>

            </div>

            {/* Batch Selection */}
            <BatchSelectionModal
                open={openBatchModal}
                product={product}
                onClose={() =>
                    setOpenBatchModal(false)
                }
                onSelect={(batch) => {

                    addToCart({
                        ...product,
                        batchId: batch.batchId,
                        batchNumber: batch.batchNumber,
                        availableQuantity: batch.availableQuantity,
                        inventoryStock: product.quantity,
                        mrp: batch.mrp,
                        sellingPrice: batch.sellingPrice,
                        purchasePrice: batch.purchasePrice
                    });

                    setOpenBatchModal(false);
                }}
            />

        </div>
    );
}

export default ProductCard;