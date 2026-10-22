import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getInventoryDetails,
  getCompatibleVehicles,
} from "../../../../services/productService";
import { useCart } from "./context/CartContext";
import BatchSelectionModal from "./components/product/BatchSelectionModal";

function ProductDetailsPage({
  inventoryId = undefined,
  embedded = false,
  onClose = undefined,
}: any = {}) {
  const { id: routeId } = useParams();
  const id = inventoryId || routeId;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [compatibility, setCompatibility] = useState([]);
  const [showCompatibility, setShowCompatibility] = useState(false);
  const [openBatchModal, setOpenBatchModal] = useState(false);

  const { addToCart } = useCart();

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const data = await getInventoryDetails(id);
      setProduct(data);

      if (data?.productId != null) {
        const fitments = await getCompatibleVehicles(data.productId);
        setCompatibility(fitments || []);
      } else {
        setCompatibility([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <h2 className="text-slate-600 font-semibold text-lg">Loading...</h2>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <h2 className="text-slate-600 font-semibold text-lg">
          Product Not Found
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:px-8 sm:py-6 bg-[#f8fafc] text-[#111827] box-border">
      {/* TOP BAR */}
      <div className="flex justify-between items-center mb-4">
        {!embedded && (
          <button
            onClick={() => window.history.back()}
            className="border-none rounded-[7px] py-2 px-4 text-[13px] font-semibold cursor-pointer transition-all duration-200 bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          >
            ← Back
          </button>
        )}
        {embedded && (
          <button
            onClick={onClose}
            className="border-none rounded-[7px] py-2 px-4 text-[13px] font-semibold cursor-pointer transition-all duration-200 bg-[#ef4444] hover:bg-[#dc2626] text-white ml-auto"
          >
            Close
          </button>
        )}
      </div>

      {/* MAIN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-6 items-start max-w-[1250px] mx-auto">
        {/* IMAGE CARD */}
        <div className="bg-white p-5 rounded-[14px] border border-[#e5e7eb] shadow-[0_3px_12px_rgba(15,23,42,0.05)]">
          <img
            src={
              product.images?.[0] &&
              !product.images?.[0].includes("example.com")
                ? product.images?.[0]
                : "https://placehold.co/600x600?text=Deals2Wheels"
            }
            alt={product.itemName}
            className="block w-full h-[260px] sm:h-[330px] lg:h-[390px] object-contain rounded-[10px]"
          />
        </div>

        {/* DETAILS SECTION */}
        <div className="bg-white p-6 rounded-[14px] border border-[#e5e7eb] shadow-[0_3px_12px_rgba(15,23,42,0.05)]">
          {/* BRAND */}
          <p className="m-0 mb-1 text-[#64748b] text-xs font-semibold uppercase tracking-[0.4px]">
            {product.brandName}
          </p>

          {/* TITLE */}
          <h1 className="m-0 mb-3 text-[23px] sm:text-[25px] lg:text-[27px] leading-tight font-bold text-[#111827]">
            {product.itemName}
          </h1>

          {/* PRICE */}
          <h2 className="m-0 mb-5 text-[22px] sm:text-[25px] font-bold text-[#111827]">
            ₹{product.sellingPrice}
          </h2>

          {/* PRODUCT INFO GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <div className="flex flex-col gap-1 py-2 px-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-[7px]">
              <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-[0.2px]">
                Part Number
              </span>
              <span className="text-[13px] font-semibold text-[#1e293b] break-words">
                {product.partNumber || "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 py-2 px-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-[7px]">
              <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-[0.2px]">
                SKU
              </span>
              <span className="text-[13px] font-semibold text-[#1e293b] break-words">
                {product.sku || "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 py-2 px-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-[7px]">
              <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-[0.2px]">
                Category
              </span>
              <span className="text-[13px] font-semibold text-[#1e293b] break-words">
                {product.categoryName || "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 py-2 px-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-[7px]">
              <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-[0.2px]">
                Product Master
              </span>
              <span className="text-[13px] font-semibold text-[#1e293b] break-words">
                {product.productMasterName || "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 py-2 px-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-[7px]">
              <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-[0.2px]">
                HSN Code
              </span>
              <span className="text-[13px] font-semibold text-[#1e293b] break-words">
                {product.hsncode || "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 py-2 px-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-[7px]">
              <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-[0.2px]">
                GST
              </span>
              <span className="text-[13px] font-semibold text-[#1e293b] break-words">
                {product.gstPercentage != null
                  ? `${product.gstPercentage}%`
                  : "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 py-2 px-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-[7px]">
              <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-[0.2px]">
                MRP
              </span>
              <span className="text-[13px] font-semibold text-[#1e293b] break-words">
                {product.mrp != null ? `₹${product.mrp}` : "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 py-2 px-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-[7px]">
              <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-[0.2px]">
                Available Stock
              </span>
              <span className="text-[13px] font-semibold text-[#1e293b] break-words">
                {product.quantity != null ? product.quantity : "—"}
              </span>
            </div>
          </div>

          {/* STOCK STATUS PILL */}
          <div className="mb-4">
            {product.inStock ? (
              <span className="inline-flex items-center py-1 px-3 rounded-[18px] text-xs font-bold text-[#15803d] bg-[#dcfce7]">
                In Stock
              </span>
            ) : (
              <span className="inline-flex items-center py-1 px-3 rounded-[18px] text-xs font-bold text-[#dc2626] bg-[#fee2e2]">
                Out Of Stock
              </span>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mt-1">
            <button
              type="button"
              className="py-3 px-4 border border-[#bfdbfe] rounded-[7px] text-[13px] font-semibold cursor-pointer transition-all duration-200 bg-[#eff6ff] hover:bg-[#dbeafe] hover:border-[#93c5fd] text-[#2563eb]"
              onClick={() => setShowCompatibility((previous) => !previous)}
            >
              {showCompatibility
                ? "Hide Compatible Vehicles"
                : "View Compatible Vehicles"}
            </button>

            {!embedded && (
              <button
                type="button"
                className="py-3 px-4 border-none rounded-[7px] text-[13px] font-semibold cursor-pointer transition-all duration-200 bg-[#111827] hover:bg-[#1f2937] hover:-translate-y-[1px] text-white"
                onClick={() => setOpenBatchModal(true)}
              >
                Add To Cart
              </button>
            )}
          </div>
        </div>

        <BatchSelectionModal
          open={openBatchModal}
          product={product}
          onClose={() => setOpenBatchModal(false)}
          onSelect={(batch) => {
            addToCart({
              ...product,
              batchId: batch.batchId,
              batchNumber: batch.batchNumber,
              mrp: batch.mrp,
              sellingPrice: batch.sellingPrice,
              purchasePrice: batch.purchasePrice,
            });
            setOpenBatchModal(false);
          }}
        />
      </div>

      {/* COMPATIBLE VEHICLES SECTION */}
      {showCompatibility && (
        <div
          id="compatible-vehicles"
          className="max-w-[1250px] mx-auto mt-5 p-5 bg-white border border-[#e5e7eb] rounded-[14px] shadow-[0_3px_12px_rgba(15,23,42,0.05)]"
        >
          <h2 className="m-0 mb-3 text-lg sm:text-[19px] font-bold text-[#111827]">
            Compatible Vehicles
          </h2>

          {compatibility.length > 0 ? (
            <div className="w-full overflow-x-auto border border-[#e2e8f0] rounded-lg">
              <table className="w-full min-w-[700px] border-collapse bg-white">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <th className="p-3 text-left font-bold text-[11px] text-[#475569] uppercase whitespace-nowrap">
                      Year
                    </th>
                    <th className="p-3 text-left font-bold text-[11px] text-[#475569] uppercase whitespace-nowrap">
                      Make
                    </th>
                    <th className="p-3 text-left font-bold text-[11px] text-[#475569] uppercase whitespace-nowrap">
                      Model
                    </th>
                    <th className="p-3 text-left font-bold text-[11px] text-[#475569] uppercase whitespace-nowrap">
                      Engine
                    </th>
                    <th className="p-3 text-left font-bold text-[11px] text-[#475569] uppercase whitespace-nowrap">
                      Fuel Type
                    </th>
                    <th className="p-3 text-left font-bold text-[11px] text-[#475569] uppercase whitespace-nowrap">
                      Engine Type
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {compatibility.map((vehicle, index) => (
                    <tr
                      key={index}
                      className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc] transition-colors"
                    >
                      <td className="p-3 text-xs text-[#334155]">
                        {vehicle.year}
                      </td>
                      <td className="p-3 text-xs text-[#334155]">
                        {vehicle.make}
                      </td>
                      <td className="p-3 text-xs text-[#334155]">
                        {vehicle.model}
                      </td>
                      <td className="p-3 text-xs text-[#334155]">
                        {vehicle.engine}
                      </td>
                      <td className="p-3 text-xs text-[#334155]">
                        {vehicle.fuelType}
                      </td>
                      <td className="p-3 text-xs text-[#334155]">
                        {vehicle.engineType}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="m-0 py-4 px-1 text-slate-500 text-sm">
              No compatible vehicles found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductDetailsPage;
