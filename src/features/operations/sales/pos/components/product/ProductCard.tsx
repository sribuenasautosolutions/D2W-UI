import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import BatchSelectionModal from "./BatchSelectionModal";

function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [openBatchModal, setOpenBatchModal] = useState(false);
  const navigate = useNavigate();

  const isAvailable = product.inStock === true || product.quantity > 0;

  return (
    <div className="bg-white border border-[#e4e7ec] rounded-[10px] p-3 flex flex-col gap-2 box-border shadow-[0_2px_6px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_16px_rgba(15,23,42,0.10)] hover:border-[#d7deea] hover:-translate-y-0.5 transition-all duration-200">
      {/* Product Image */}
      <div className="h-[90px] bg-[#f8fafc] rounded-[7px] overflow-hidden flex items-center justify-center">
        {product.image || product.imageUrl || product.mainImageUrl ? (
          <img
            src={product.image || product.imageUrl || product.mainImageUrl}
            alt={product.itemName}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-[#cbd5e1] text-[13px] font-normal">
            No Image
          </span>
        )}
      </div>

      {/* Brand */}
      <div className="text-[11px] font-bold text-[#64748b]">
        {product.brandName}
      </div>

      {/* Product Name */}
      <div className="text-[12px] font-semibold text-[#101828] leading-[1.3] min-h-[34px]">
        {product.itemName}
      </div>

      {/* Part Number */}
      {product.partNumber && (
        <div className="text-[12px] font-semibold text-[#062d83] leading-[1.4]">
          <span className="font-bold text-[#062d83]">Part:</span>{" "}
          {product.partNumber}
        </div>
      )}

      {/* Stock */}
      <div
        className={`text-[11px] font-semibold ${
          isAvailable ? "text-[#16a34a]" : "text-[#ef4444]"
        }`}
      >
        {product.stockStatus || (isAvailable ? "IN STOCK" : "OUT OF STOCK")}

        {product.quantity > 0 && (
          <span className="text-[#64748b] font-normal">
            {" "}
            · Qty: {product.quantity} {product.stockUnit || "PCS"}
          </span>
        )}
      </div>

      {/* Price */}
      <div className="text-[13px] font-semibold text-[#042592] mt-0.5">
        ₹{product.sellingPrice} / {product.stockUnit || "PCS"}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        {/* View */}
        <button
          type="button"
          onClick={() => navigate(`/pos/product/${product.inventoryId}`)}
          className="flex-1 h-8 border border-[#64748b] rounded-md bg-white text-[#475569] cursor-pointer text-xs font-semibold hover:bg-[#f1f5f9] hover:border-[#062d83] hover:text-[#062d83] hover:-translate-y-[1px] hover:shadow-[0_2px_6px_rgba(15,23,42,0.08)] active:translate-y-0 transition-all duration-200"
        >
          View
        </button>

        {/* Add */}
        <button
          type="button"
          onClick={() => setOpenBatchModal(true)}
          disabled={!isAvailable}
          className={`flex-1 h-8 rounded-md text-xs font-semibold transition-all duration-200 ${
            isAvailable
              ? "border border-[#062d83] bg-white text-[#062d83] cursor-pointer hover:bg-[#062d83] hover:text-white hover:-translate-y-[1px] hover:shadow-[0_3px_8px_rgba(6,45,131,0.18)] active:translate-y-0"
              : "border border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed"
          }`}
        >
          {isAvailable ? "+ Add" : "Out Of Stock"}
        </button>
      </div>

      {/* Batch Selection */}
      <BatchSelectionModal
        open={openBatchModal}
        product={product}
        onClose={() => setOpenBatchModal(false)}
        onSelect={(batch) => {
          addToCart({
            ...product,
            batchId: batch.batchId,
            batchNumber: batch.batchNumber,
            availableQuantity: batch.availableQuantity,
            inventoryStock: product.quantity,
            mrp: batch.mrp,
            sellingPrice: batch.sellingPrice,
            purchasePrice: batch.purchasePrice,
          });

          setOpenBatchModal(false);
        }}
      />
    </div>
  );
}

export default ProductCard;
