import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeftRight,
  Boxes,
  ClipboardEdit,
  IndianRupee,
  Layers3,
  Save,
  X,
} from "lucide-react";
import api from "../../../services/api";
import {
  getProductDetails,
  getManagementBatches,
  updateInventoryBatch,
  updateInventoryPrices,
  updateProductBasicInformation,
} from "../../../services/storeInventoryPanelService";
import "./ProductManagePage.css";

// This page is reached via navigate() from the Edit button on the Current Stock
// detail view (productManageRoute in CurrentStockSection.jsx), e.g.:
//   /owner/inventory/products/:inventoryId/manage?storeId=...
// Because it's a routed page rather than a component a parent renders directly,
// it cannot receive product/onClose/onSave as props — React Router only ever
// passes URL params to a route's element. So this page reads inventoryId/storeId
// from the URL itself, fetches the product, and Close/Cancel navigate back
// instead of calling a prop that would never have been supplied.
const SECTIONS = [
  { id: "pricing", label: "Pricing", icon: IndianRupee },
  { id: "batches", label: "Batches & Rack", icon: Layers3 },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "adjustment", label: "Stock Adjustment", icon: ClipboardEdit },
];

function errorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

const ProductManagePage = () => {
  const { inventoryId } = useParams();
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get("storeId") || "";
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeSection, setActiveSection] = useState("pricing");
  const [transactions, setTransactions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [rackDrafts, setRackDrafts] = useState({});

  const [formData, setFormData] = useState({
    itemName: "",
    itemCode: "",
    hsn: "",
    brand: "",
    gst: "",
    sellingPrice: "",
    mrp: "",
    purchasePrice: "",
  });

  const [adjustmentData, setAdjustmentData] = useState({
    adjustmentType: "add",
    quantity: "",
    reason: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [adjustmentError, setAdjustmentError] = useState("");

  // ---- Load the actual product this page was navigated to ----
  const loadProduct = useCallback(async () => {
    if (!inventoryId || !storeId) return;

    setLoading(true);
    setLoadError("");

    try {
      const data = await getProductDetails(storeId, inventoryId);
      setProduct(data);
    } catch (error) {
      setLoadError(
        errorMessage(error, "Unable to load product details.")
      );
    } finally {
      setLoading(false);
    }
  }, [inventoryId, storeId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Keep the edit form in sync whenever fresh product data arrives
  // (initial load, or after a successful save).
  useEffect(() => {
    if (!product) return;

    setFormData({
      itemName: product.itemName || product.name || "",
      itemCode: product.itemCode || product.partNumber || "",
      hsn: product.hsn || product.itemHsn || product.hsncode || "",
      brand: product.brand || product.brandName || "",
      gst: product.gst ?? product.gstPercentage ?? "",
      sellingPrice: product.sellingPrice ?? "",
      mrp: product.mrp ?? "",
      purchasePrice: product.purchasePrice ?? "",
    });
  }, [product]);

  useEffect(() => {
    if (!inventoryId || activeSection !== "transactions") return;

    api
      .get(`/inventory-transactions/inventory/${inventoryId}`)
      .then(({ data }) => {
        setTransactions(Array.isArray(data) ? data : data?.content || []);
      })
      .catch(() => setTransactions([]));
  }, [inventoryId, activeSection]);

  useEffect(() => {
    if (!inventoryId || activeSection !== "batches") return;

    getManagementBatches(inventoryId)
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setBatches(rows);
        setRackDrafts(Object.fromEntries(
          rows.map((batch) => [batch.batchId, batch.rackNumber || ""])
        ));
      })
      .catch((error) => {
        setSaveError(errorMessage(error, "Unable to load batch rack numbers."));
      });
  }, [inventoryId, activeSection]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleAdjustmentChange = (event) => {
    const { name, value } = event.target;

    setAdjustmentData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // Only a LOCAL product's catalogue fields (name/code/HSN/brand/GST) are
  // editable here — matches the same rule used on the Current Stock page.
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const canEditBasic = product && (
    product.productSource === "LOCAL" || currentUser.role === "SUPER_ADMIN"
  );

  const saveRackNumber = async (batch) => {
    setSaveError("");
    try {
      const updated = await updateInventoryBatch(batch.batchId, {
        purchasePrice: batch.purchasePrice,
        sellingPrice: batch.sellingPrice,
        mrp: batch.mrp,
        rackNumber: (rackDrafts[batch.batchId] || "").trim(),
      });
      setBatches((current) => current.map((item) =>
        item.batchId === batch.batchId ? updated : item
      ));
      setSaveMessage("Rack number saved successfully.");
    } catch (error) {
      setSaveError(errorMessage(error, "Unable to save rack number."));
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      if (canEditBasic) {
        await updateProductBasicInformation(inventoryId, {
          itemName: formData.itemName,
          partNumber: formData.itemCode,
          hsnCode: formData.hsn,
          brandName: formData.brand,
          gstPercentage: formData.gst === "" ? null : Number(formData.gst),
        });
      }

      // NOTE: there's no purchase-price update endpoint among the imported
      // services, so that field is shown but not persisted yet — wire up a
      // real endpoint here if you need it saved.
      await updateInventoryPrices(inventoryId, {
        sellingPrice: Number(formData.sellingPrice),
        mrp: Number(formData.mrp),
      });

      setSaveMessage("Changes saved successfully.");
      await loadProduct();
    } catch (error) {
      setSaveError(errorMessage(error, "Unable to save changes."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStockAdjustment = async (event) => {
    event.preventDefault();
    setAdjustmentError("");

    try {
      const quantity = Number(adjustmentData.quantity);
      const adjustedQty = adjustmentData.adjustmentType === "add"
        ? Number(availableStock) + quantity
        : Number(availableStock) - quantity;

      if (adjustedQty < 0) {
        setAdjustmentError("Removal quantity cannot exceed available stock.");
        return;
      }

      await api.post("/inventory-adjustment", {
        inventoryId: Number(inventoryId),
        storeId: Number(storeId),
        adjustedQty,
        reason: adjustmentData.reason,
        remarks: `${adjustmentData.adjustmentType === "add" ? "Added" : "Removed"} ${quantity} from Current Stock`,
      });

      setAdjustmentData({ adjustmentType: "add", quantity: "", reason: "" });
      await loadProduct();
    } catch (error) {
      setAdjustmentError(
        errorMessage(error, "Unable to save the stock adjustment.")
      );
    }
  };

  // Close (×) and Cancel both take you back to wherever you navigated from —
  // this is the fix for the × button not doing anything.
  const handleClose = () => navigate(-1);

  const availableStock =
    product?.quantity ?? product?.availableStock ?? product?.stock ?? 0;

  const minimumStock = product?.minimumStock ?? product?.minStock ?? 0;

  const isLowStock = availableStock <= minimumStock;

  if (loading) {
    return (
      <div className="manage-page-shell">
        <div className="manage-loading">Loading product…</div>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="manage-page-shell">
        <div className="manage-error-panel">
          <strong>{loadError || "Product not found."}</strong>
          <button type="button" className="manage-cancel-button" onClick={handleClose}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-page-shell">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <div className="manage-page-header">
        <div>
          <h1>Edit Item</h1>

          <p>
            Update product information, pricing and inventory details.
          </p>
        </div>

        <button
          type="button"
          className="manage-close-button"
          onClick={handleClose}
          aria-label="Close edit page"
        >
          <X size={18} />
        </button>
      </div>

      <div className="manage-layout">
        {/* =====================================================
            MAIN CONTENT
        ====================================================== */}
        <main className="manage-main-content">
          {/* ===================================================
              ITEM INFORMATION
          ==================================================== */}
          <section className="manage-card manage-item-information-card">
            <div className="manage-card-heading">
              <h2>Item information</h2>
              <p>Basic product and catalogue details</p>
            </div>

            <div className="manage-three-column-grid">
              {/* Item Name */}
              <div className="manage-form-field">
                <label htmlFor="itemName">Item name</label>

                <input
                  id="itemName"
                  name="itemName"
                  type="text"
                  disabled={!canEditBasic}
                  value={formData.itemName}
                  onChange={handleInputChange}
                  placeholder="Enter item name"
                />
              </div>

              {/* Item Code */}
              <div className="manage-form-field">
                <label htmlFor="itemCode">
                  Item code / Part number
                </label>

                <input
                  id="itemCode"
                  name="itemCode"
                  type="text"
                  disabled={!canEditBasic}
                  value={formData.itemCode}
                  onChange={handleInputChange}
                  placeholder="Enter item code"
                />
              </div>

              {/* HSN */}
              <div className="manage-form-field">
                <label htmlFor="hsn">Item HSN</label>

                <input
                  id="hsn"
                  name="hsn"
                  type="text"
                  disabled={!canEditBasic}
                  value={formData.hsn}
                  onChange={handleInputChange}
                  placeholder="Enter HSN"
                />
              </div>

              {/* Brand */}
              <div className="manage-form-field">
                <label htmlFor="brand">Brand</label>

                <input
                  id="brand"
                  name="brand"
                  type="text"
                  disabled={!canEditBasic}
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="Enter brand"
                />
              </div>

              {/* GST */}
              <div className="manage-form-field">
                <label htmlFor="gst">GST %</label>

                <input
                  id="gst"
                  name="gst"
                  type="number"
                  disabled={!canEditBasic}
                  value={formData.gst}
                  onChange={handleInputChange}
                  placeholder="Enter GST percentage"
                />
              </div>
            </div>
          </section>

          {/* ===================================================
              SECTION NAVIGATION
          ==================================================== */}
          <section className="manage-card manage-details-card">
            <div className="manage-section-tabs">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`manage-section-tab ${
                    activeSection === id
                      ? "manage-section-tab-active"
                      : ""
                  }`}
                  onClick={() => setActiveSection(id)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* =================================================
                PRICING CONTENT
            ================================================== */}
            {activeSection === "pricing" && (
              <div className="manage-tab-panel">
                <div className="manage-panel-heading">
                  <h2>Pricing</h2>
                  <p>Set the selling price and maximum retail price.</p>
                </div>

                {saveError && (
                  <div className="manage-alert manage-alert-error">
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="manage-three-column-grid">
                  {/* Selling Price */}
                  <div className="manage-form-field">
                    <label htmlFor="sellingPrice">
                      Selling price
                    </label>

                    <input
                      id="sellingPrice"
                      name="sellingPrice"
                      type="number"
                      value={formData.sellingPrice}
                      onChange={handleInputChange}
                      placeholder="Enter selling price"
                    />
                  </div>

                  {/* MRP */}
                  <div className="manage-form-field">
                    <label htmlFor="mrp">MRP</label>

                    <input
                      id="mrp"
                      name="mrp"
                      type="number"
                      value={formData.mrp}
                      onChange={handleInputChange}
                      placeholder="Enter MRP"
                    />
                  </div>

                  {/* Purchase Price */}
                  <div className="manage-form-field">
                    <label htmlFor="purchasePrice">
                      Purchase price
                    </label>

                    <input
                      id="purchasePrice"
                      name="purchasePrice"
                      type="number"
                      value={formData.purchasePrice}
                      onChange={handleInputChange}
                      placeholder="Enter purchase price"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* =================================================
                TRANSACTIONS CONTENT
            ================================================== */}
            {activeSection === "transactions" && (
              <div className="manage-tab-panel">
                <div className="manage-panel-heading">
                  <h2>Transactions</h2>
                  <p>View the transaction history for this product.</p>
                </div>

                <div className="manage-table-wrapper">
                  <table className="manage-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Reference</th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.length > 0 ? (
                        transactions.map((transaction, index) => (
                          <tr
                            key={
                              transaction.id ||
                              transaction.transactionId ||
                              index
                            }
                          >
                            <td>
                              {transaction.date ||
                                transaction.createdAt ||
                                "-"}
                            </td>

                            <td>
                              <span className="manage-transaction-badge">
                                {transaction.type ||
                                  transaction.transactionType ||
                                  "-"}
                              </span>
                            </td>

                            <td>
                              {transaction.quantity ??
                                transaction.qty ??
                                "-"}
                            </td>

                            <td>
                              {transaction.reference ||
                                transaction.referenceNumber ||
                                "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="4"
                            className="manage-table-empty"
                          >
                            No transactions available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "batches" && (
              <div className="manage-tab-panel">
                <div className="manage-panel-heading">
                  <h2>Batches and rack numbers</h2>
                  <p>Update the storage rack for each inventory batch.</p>
                </div>

                {saveError && (
                  <div className="manage-alert manage-alert-error">
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="manage-table-wrapper">
                  <table className="manage-table">
                    <thead>
                      <tr>
                        <th>Batch</th>
                        <th>MRP</th>
                        <th>Available</th>
                        <th>Rack number</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((batch) => (
                        <tr key={batch.batchId}>
                          <td>{batch.batchNumber}</td>
                          <td>₹{batch.mrp}</td>
                          <td>{batch.availableQuantity}</td>
                          <td>
                            <input
                              type="text"
                              maxLength={80}
                              value={rackDrafts[batch.batchId] || ""}
                              onChange={(event) => setRackDrafts((current) => ({
                                ...current,
                                [batch.batchId]: event.target.value,
                              }))}
                              placeholder="Enter rack number"
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="manage-adjustment-button"
                              onClick={() => saveRackNumber(batch)}
                            >
                              <Save size={14} /> Save
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!batches.length && (
                        <tr>
                          <td colSpan="5" className="manage-table-empty">
                            No batches available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =================================================
                STOCK ADJUSTMENT CONTENT
            ================================================== */}
            {activeSection === "adjustment" && (
              <div className="manage-tab-panel">
                <div className="manage-panel-heading">
                  <h2>Stock Adjustment</h2>
                  <p>
                    Increase or decrease the available stock quantity.
                  </p>
                </div>

                {adjustmentError && (
                  <div className="manage-alert manage-alert-error">
                    <span>{adjustmentError}</span>
                  </div>
                )}

                <form
                  className="manage-adjustment-form"
                  onSubmit={handleStockAdjustment}
                >
                  <div className="manage-adjustment-grid">
                    {/* Adjustment Type */}
                    <div className="manage-form-field">
                      <label htmlFor="adjustmentType">
                        Adjustment type
                      </label>

                      <select
                        id="adjustmentType"
                        name="adjustmentType"
                        value={adjustmentData.adjustmentType}
                        onChange={handleAdjustmentChange}
                      >
                        <option value="add">Add stock</option>
                        <option value="remove">Remove stock</option>
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="manage-form-field">
                      <label htmlFor="quantity">Quantity</label>

                      <input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="1"
                        value={adjustmentData.quantity}
                        onChange={handleAdjustmentChange}
                        placeholder="Enter quantity"
                        required
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="manage-form-field">
                    <label htmlFor="reason">Reason</label>

                    <select
                      id="reason"
                      name="reason"
                      value={adjustmentData.reason}
                      onChange={handleAdjustmentChange}
                      required
                    >
                      <option value="">Select reason</option>
                      <option value="PHYSICAL_COUNT">Physical count</option>
                      <option value="DAMAGED">Damaged</option>
                      <option value="LOST">Lost</option>
                      <option value="MANUAL_CORRECTION">Manual correction</option>
                    </select>
                  </div>

                  <div className="manage-adjustment-notice">
                    Current available stock:{" "}
                    <strong>{availableStock}</strong>
                  </div>

                  <button
                    type="submit"
                    className="manage-adjustment-button"
                  >
                    <ClipboardEdit size={15} />
                    Apply Stock Adjustment
                  </button>
                </form>
              </div>
            )}
          </section>
        </main>

        {/* =====================================================
            RIGHT SIDE SUMMARY
        ====================================================== */}
        <aside className="manage-side-panel">
          <section className="manage-summary-card">
            <div className="manage-summary-icon">
              <Boxes size={22} />
            </div>

            <h2>
              {formData.itemName || "Product name not available"}
            </h2>

            <p>{formData.brand || "Brand not available"}</p>

            <p>
              Part No. {formData.itemCode || "Not available"}
            </p>

            <div
              className={`manage-summary-status ${
                isLowStock ? "is-low" : "is-ok"
              }`}
            >
              {isLowStock ? "Low stock" : "In stock"}
            </div>

            <div className="manage-summary-divider" />

            <div className="manage-summary-row">
              <span>Purchase price</span>
              <strong>
                ₹{formData.purchasePrice || "0.00"}
              </strong>
            </div>

            <div className="manage-summary-row">
              <span>Selling price</span>
              <strong>
                ₹{formData.sellingPrice || "0.00"}
              </strong>
            </div>

            <div className="manage-summary-row">
              <span>MRP</span>
              <strong>₹{formData.mrp || "0.00"}</strong>
            </div>

            <div className="manage-summary-row">
              <span>Available stock</span>
              <strong>{availableStock}</strong>
            </div>

            <div className="manage-summary-row">
              <span>Minimum stock</span>
              <strong>{minimumStock}</strong>
            </div>
          </section>

          {/* Cancel calls the same handleClose as the × button — a labeled
              second trigger, since a lone icon in the corner is easy to
              miss or mistake for not working. Both navigate back now. */}
          <section className="manage-actions-card">
            <button
              type="button"
              className="manage-save-button"
              onClick={handleSaveChanges}
              disabled={isSaving}
            >
              <Save size={15} />
              {isSaving ? "Saving..." : "Save changes"}
            </button>

            <button
              type="button"
              className="manage-cancel-button"
              onClick={handleClose}
            >
              Cancel
            </button>

            {saveMessage && (
              <div className="manage-save-message">
                {saveMessage}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ProductManagePage;
