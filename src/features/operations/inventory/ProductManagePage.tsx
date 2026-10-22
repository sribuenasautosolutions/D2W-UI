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
      setLoadError(errorMessage(error, "Unable to load product details."));
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
        setRackDrafts(
          Object.fromEntries(
            rows.map((batch) => [batch.batchId, batch.rackNumber || ""]),
          ),
        );
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

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const canEditBasic =
    product && ["SUPER_ADMIN", "STORE_OWNER"].includes(currentUser.role);

  const saveRackNumber = async (batch) => {
    setSaveError("");
    try {
      const updated = await updateInventoryBatch(batch.batchId, {
        purchasePrice: batch.purchasePrice,
        sellingPrice: batch.sellingPrice,
        mrp: batch.mrp,
        rackNumber: (rackDrafts[batch.batchId] || "").trim(),
      });
      setBatches((current) =>
        current.map((item) =>
          item.batchId === batch.batchId ? updated : item,
        ),
      );
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
          description: product.description,
          categoryName: product.categoryName,
          masterName: product.productMasterName,
          gstPercentage: formData.gst === "" ? null : Number(formData.gst),
        });
      }

      // NOTE: there's no purchase-price update endpoint among the imported
      // services, so that field is shown but not persisted yet — wire up a
      // real endpoint here if you need it saved.
      if (
        Number(formData.sellingPrice) !== Number(product.sellingPrice) ||
        Number(formData.mrp) !== Number(product.mrp)
      ) {
        await updateInventoryPrices(inventoryId, {
          sellingPrice: Number(formData.sellingPrice),
          mrp: Number(formData.mrp),
        });
      }

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
      const adjustedQty =
        adjustmentData.adjustmentType === "add"
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
        errorMessage(error, "Unable to save the stock adjustment."),
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
        <style>{`/* =========================================================
   Product Manage Page
   Palette and spacing intentionally mirror CurrentStockSection.css
   (same slate/blue design language) so the two pages read as one
   product. Typography is upgraded to Inter for a crisper, more
   modern look than the browser's default UI font.
   ========================================================= */

@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

/* ---------- Page shell ---------- */

.manage-page-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  /* */
  overflow: hidden;
  background: #f8fafc;
  color: #1e293b;

  -webkit-font-smoothing: antialiased;
}

/* ---------- Header ---------- */

.manage-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-5);
  flex-shrink: 0;
  margin-bottom: var(--sp-5);
}

.manage-page-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.manage-page-header p {
  margin: var(--sp-2) 0 0;
  color: #64748b;
  font-size: 13px;
}

.manage-close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}

.manage-close-button:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
  transform: translateY(-1px);
}

.manage-close-button:active {
  transform: translateY(0);
}

/* ---------- Two-column layout ---------- */

.manage-layout {
  display: flex;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  gap: var(--sp-5);
  overflow: hidden;
}

.manage-main-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding-right: var(--sp-1);
  overflow-y: auto;
}

.manage-side-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  width: 300px;
  flex-shrink: 0;
  min-height: 0;
  overflow-y: auto;
}

/* ---------- Cards ---------- */

.manage-card {
  padding: var(--sp-6);
  margin-bottom: var(--sp-5);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.manage-card-heading {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: var(--sp-5);
}

.manage-card-heading h2 {
  margin: 0;
  color: #1e293b;
  font-size: 16px;
  font-weight: 700;
}

.manage-card-heading p {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
}

/* Item Information is reference/summary data the cashier rarely edits,
   while Transactions can run long — so this card is deliberately more
   compact (tighter padding, smaller fields, a 5-up row on wide screens)
   to leave more vertical room for the list below it. */
.manage-item-information-card {
  padding: var(--sp-4) var(--sp-5);
  margin-bottom: var(--sp-4);
}

.manage-item-information-card .manage-card-heading {
  margin-bottom: var(--sp-3);
}

.manage-item-information-card .manage-three-column-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--sp-3);
}

.manage-item-information-card .manage-form-field label {
  font-size: 11px;
}

.manage-item-information-card .manage-form-field input {
  height: 34px;
  font-size: 12px;
}

/* ---------- Form fields ---------- */

.manage-three-column-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-4);
}

.manage-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.manage-form-field label {
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.manage-form-field input,
.manage-form-field select {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  padding: 0 var(--sp-3);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  background: #ffffff;
  color: #1e293b;
  font-family: inherit;
  font-size: 13px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.manage-form-field input::placeholder {
  color: #94a3b8;
}

.manage-form-field input:focus,
.manage-form-field select:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 12%);
}

.manage-form-field select {
  cursor: pointer;
}

/* ---------- Section tabs (Pricing / Transactions / Stock Adjustment) ---------- */

.manage-details-card {
  padding: 0;
  overflow: hidden;
}

.manage-section-tabs {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  min-height: 52px;
  padding: 0 var(--sp-3);
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.manage-section-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  height: 52px;
  padding: 0 var(--sp-4);
  border: 0;
  border-bottom: 2px solid transparent;
  outline: none;
  background: transparent;
  color: #64748b;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s ease;
}

.manage-section-tab svg {
  flex-shrink: 0;
  color: #cbd5e1;
  transition: color 0.15s ease;
}

.manage-section-tab:hover {
  color: #334155;
}

.manage-section-tab:hover svg {
  color: #94a3b8;
}

.manage-section-tab-active {
  border-bottom-color: #2563eb;
  color: #2563eb;
}

.manage-section-tab-active svg {
  color: #2563eb;
}

/* ---------- Tab content ---------- */

@keyframes manage-tab-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.manage-tab-panel {
  padding: var(--sp-6);
  background: #ffffff;
  animation: manage-tab-fade-in 0.18s ease;
}

.manage-panel-heading {
  margin-bottom: var(--sp-5);
}

.manage-panel-heading h2 {
  margin: 0;
  color: #1e293b;
  font-size: 16px;
  font-weight: 700;
}

.manage-panel-heading p {
  margin: var(--sp-1) 0 0;
  color: #94a3b8;
  font-size: 12px;
}

/* ---------- Transactions table ---------- */

.manage-table-wrapper {
  width: 100%;
  max-height: 50vh;
  overflow: auto;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.manage-table-wrapper::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.manage-table-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.manage-table-wrapper::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.manage-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
}

.manage-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.manage-table td {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid #f1f5f9;
  color: #64748b;
  vertical-align: middle;
}

.manage-table tbody tr:last-child td {
  border-bottom: 0;
}

.manage-table tbody tr:hover {
  background: #f8fafc;
}

.manage-transaction-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--sp-1) var(--sp-2);
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
}

.manage-table-empty {
  padding: var(--sp-8) var(--sp-3) !important;
  color: #94a3b8 !important;
  text-align: center !important;
}

/* ---------- Stock adjustment form ---------- */

.manage-adjustment-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.manage-adjustment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-4);
}

.manage-adjustment-notice {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
}

.manage-adjustment-notice strong {
  color: #1e293b;
}

.manage-adjustment-button {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: 40px;
  padding: 0 var(--sp-5);
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.manage-adjustment-button:hover {
  background: #1d4ed8;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
  transform: translateY(-1px);
}

.manage-adjustment-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
}

/* ---------- Right summary panel ---------- */

.manage-summary-card {
  padding: var(--sp-6);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}

.manage-summary-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: var(--sp-4);
  border-radius: 10px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  color: #2563eb;
}

.manage-summary-card h2 {
  margin: 0;
  overflow: hidden;
  color: #1e293b;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manage-summary-card p {
  margin: var(--sp-1) 0 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manage-summary-status {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  margin-top: var(--sp-4);
  padding: var(--sp-1) var(--sp-3);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.manage-summary-status.is-ok {
  background: #f0fdf4;
  color: #15803d;
}

.manage-summary-status.is-low {
  background: #fffbeb;
  color: #b45309;
}

.manage-summary-divider {
  height: 1px;
  margin: var(--sp-5) 0;
  background: #f1f5f9;
}

.manage-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-2) 0;
  font-size: 13px;
}

.manage-summary-row span {
  color: #64748b;
}

.manage-summary-row strong {
  color: #1e293b;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

/* ---------- Action area ---------- */

.manage-actions-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}

.manage-save-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  width: 100%;
  min-height: 42px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.manage-save-button:hover {
  background: #1d4ed8;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
  transform: translateY(-1px);
}

.manage-save-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
}

.manage-save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.manage-cancel-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.manage-cancel-button:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.manage-save-message {
  color: #15803d;
  font-size: 12px;
  text-align: center;
}

/* ---------- Thin scrollbars, matching CurrentStockSection ---------- */

.manage-main-content,
.manage-side-panel {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.manage-main-content::-webkit-scrollbar,
.manage-side-panel::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.manage-main-content::-webkit-scrollbar-track,
.manage-side-panel::-webkit-scrollbar-track {
  background: transparent;
}

.manage-main-content::-webkit-scrollbar-thumb,
.manage-side-panel::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.manage-main-content::-webkit-scrollbar-thumb:hover,
.manage-side-panel::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ---------- Loading / error states ---------- */

.manage-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  font-size: 14px;
}

.manage-error-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-4);
  padding: var(--sp-6);
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #ffffff;
  color: #b91c1c;
}

.manage-alert {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  border-radius: 8px;
  font-size: 13px;
}

.manage-alert span {
  flex: 1;
}

.manage-alert-error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.manage-alert-success {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

/* =========================================================
   Responsive
   ========================================================= */

@media (max-width: 1150px) {
  .manage-side-panel {
    width: 270px;
  }
}

@media (max-width: 1150px) {
  .manage-item-information-card .manage-three-column-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1000px) {
  .manage-three-column-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .manage-layout {
    flex-direction: column;
    overflow-y: auto;
  }

  .manage-main-content {
    overflow: visible;
    padding-right: 0;
  }

  .manage-side-panel {
    width: 100%;
    overflow: visible;
  }
}

@media (max-width: 700px) {
  .manage-page-shell {
  }

  .manage-card {
    padding: var(--sp-4);
  }

  .manage-tab-panel {
    padding: var(--sp-4);
  }

  .manage-section-tabs {
    overflow-x: auto;
  }

  .manage-adjustment-grid {
    grid-template-columns: 1fr;
  }

  .manage-item-information-card .manage-three-column-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 500px) {
  .manage-three-column-grid {
    grid-template-columns: 1fr;
  }

  .manage-item-information-card .manage-three-column-grid {
    grid-template-columns: 1fr;
  }

  .manage-page-header h1 {
    font-size: 20px;
  }

  .manage-page-header {
    flex-wrap: wrap;
  }
}
`}</style>
        <div className="manage-loading">Loading product…</div>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="manage-page-shell">
        <style>{`/* =========================================================
   Product Manage Page
   Palette and spacing intentionally mirror CurrentStockSection.css
   (same slate/blue design language) so the two pages read as one
   product. Typography is upgraded to Inter for a crisper, more
   modern look than the browser's default UI font.
   ========================================================= */

@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

/* ---------- Page shell ---------- */

.manage-page-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  /* */
  overflow: hidden;
  background: #f8fafc;
  color: #1e293b;

  -webkit-font-smoothing: antialiased;
}

/* ---------- Header ---------- */

.manage-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-5);
  flex-shrink: 0;
  margin-bottom: var(--sp-5);
}

.manage-page-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.manage-page-header p {
  margin: var(--sp-2) 0 0;
  color: #64748b;
  font-size: 13px;
}

.manage-close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}

.manage-close-button:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
  transform: translateY(-1px);
}

.manage-close-button:active {
  transform: translateY(0);
}

/* ---------- Two-column layout ---------- */

.manage-layout {
  display: flex;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  gap: var(--sp-5);
  overflow: hidden;
}

.manage-main-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding-right: var(--sp-1);
  overflow-y: auto;
}

.manage-side-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  width: 300px;
  flex-shrink: 0;
  min-height: 0;
  overflow-y: auto;
}

/* ---------- Cards ---------- */

.manage-card {
  padding: var(--sp-6);
  margin-bottom: var(--sp-5);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.manage-card-heading {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: var(--sp-5);
}

.manage-card-heading h2 {
  margin: 0;
  color: #1e293b;
  font-size: 16px;
  font-weight: 700;
}

.manage-card-heading p {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
}

/* Item Information is reference/summary data the cashier rarely edits,
   while Transactions can run long — so this card is deliberately more
   compact (tighter padding, smaller fields, a 5-up row on wide screens)
   to leave more vertical room for the list below it. */
.manage-item-information-card {
  padding: var(--sp-4) var(--sp-5);
  margin-bottom: var(--sp-4);
}

.manage-item-information-card .manage-card-heading {
  margin-bottom: var(--sp-3);
}

.manage-item-information-card .manage-three-column-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--sp-3);
}

.manage-item-information-card .manage-form-field label {
  font-size: 11px;
}

.manage-item-information-card .manage-form-field input {
  height: 34px;
  font-size: 12px;
}

/* ---------- Form fields ---------- */

.manage-three-column-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-4);
}

.manage-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.manage-form-field label {
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.manage-form-field input,
.manage-form-field select {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  padding: 0 var(--sp-3);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  background: #ffffff;
  color: #1e293b;
  font-family: inherit;
  font-size: 13px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.manage-form-field input::placeholder {
  color: #94a3b8;
}

.manage-form-field input:focus,
.manage-form-field select:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 12%);
}

.manage-form-field select {
  cursor: pointer;
}

/* ---------- Section tabs (Pricing / Transactions / Stock Adjustment) ---------- */

.manage-details-card {
  padding: 0;
  overflow: hidden;
}

.manage-section-tabs {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  min-height: 52px;
  padding: 0 var(--sp-3);
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.manage-section-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  height: 52px;
  padding: 0 var(--sp-4);
  border: 0;
  border-bottom: 2px solid transparent;
  outline: none;
  background: transparent;
  color: #64748b;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s ease;
}

.manage-section-tab svg {
  flex-shrink: 0;
  color: #cbd5e1;
  transition: color 0.15s ease;
}

.manage-section-tab:hover {
  color: #334155;
}

.manage-section-tab:hover svg {
  color: #94a3b8;
}

.manage-section-tab-active {
  border-bottom-color: #2563eb;
  color: #2563eb;
}

.manage-section-tab-active svg {
  color: #2563eb;
}

/* ---------- Tab content ---------- */

@keyframes manage-tab-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.manage-tab-panel {
  padding: var(--sp-6);
  background: #ffffff;
  animation: manage-tab-fade-in 0.18s ease;
}

.manage-panel-heading {
  margin-bottom: var(--sp-5);
}

.manage-panel-heading h2 {
  margin: 0;
  color: #1e293b;
  font-size: 16px;
  font-weight: 700;
}

.manage-panel-heading p {
  margin: var(--sp-1) 0 0;
  color: #94a3b8;
  font-size: 12px;
}

/* ---------- Transactions table ---------- */

.manage-table-wrapper {
  width: 100%;
  max-height: 50vh;
  overflow: auto;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.manage-table-wrapper::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.manage-table-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.manage-table-wrapper::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.manage-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
}

.manage-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.manage-table td {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid #f1f5f9;
  color: #64748b;
  vertical-align: middle;
}

.manage-table tbody tr:last-child td {
  border-bottom: 0;
}

.manage-table tbody tr:hover {
  background: #f8fafc;
}

.manage-transaction-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--sp-1) var(--sp-2);
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
}

.manage-table-empty {
  padding: var(--sp-8) var(--sp-3) !important;
  color: #94a3b8 !important;
  text-align: center !important;
}

/* ---------- Stock adjustment form ---------- */

.manage-adjustment-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.manage-adjustment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-4);
}

.manage-adjustment-notice {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
}

.manage-adjustment-notice strong {
  color: #1e293b;
}

.manage-adjustment-button {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: 40px;
  padding: 0 var(--sp-5);
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.manage-adjustment-button:hover {
  background: #1d4ed8;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
  transform: translateY(-1px);
}

.manage-adjustment-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
}

/* ---------- Right summary panel ---------- */

.manage-summary-card {
  padding: var(--sp-6);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}

.manage-summary-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: var(--sp-4);
  border-radius: 10px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  color: #2563eb;
}

.manage-summary-card h2 {
  margin: 0;
  overflow: hidden;
  color: #1e293b;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manage-summary-card p {
  margin: var(--sp-1) 0 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manage-summary-status {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  margin-top: var(--sp-4);
  padding: var(--sp-1) var(--sp-3);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.manage-summary-status.is-ok {
  background: #f0fdf4;
  color: #15803d;
}

.manage-summary-status.is-low {
  background: #fffbeb;
  color: #b45309;
}

.manage-summary-divider {
  height: 1px;
  margin: var(--sp-5) 0;
  background: #f1f5f9;
}

.manage-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-2) 0;
  font-size: 13px;
}

.manage-summary-row span {
  color: #64748b;
}

.manage-summary-row strong {
  color: #1e293b;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

/* ---------- Action area ---------- */

.manage-actions-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}

.manage-save-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  width: 100%;
  min-height: 42px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.manage-save-button:hover {
  background: #1d4ed8;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
  transform: translateY(-1px);
}

.manage-save-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
}

.manage-save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.manage-cancel-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.manage-cancel-button:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.manage-save-message {
  color: #15803d;
  font-size: 12px;
  text-align: center;
}

/* ---------- Thin scrollbars, matching CurrentStockSection ---------- */

.manage-main-content,
.manage-side-panel {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.manage-main-content::-webkit-scrollbar,
.manage-side-panel::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.manage-main-content::-webkit-scrollbar-track,
.manage-side-panel::-webkit-scrollbar-track {
  background: transparent;
}

.manage-main-content::-webkit-scrollbar-thumb,
.manage-side-panel::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.manage-main-content::-webkit-scrollbar-thumb:hover,
.manage-side-panel::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ---------- Loading / error states ---------- */

.manage-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  font-size: 14px;
}

.manage-error-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-4);
  padding: var(--sp-6);
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #ffffff;
  color: #b91c1c;
}

.manage-alert {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  border-radius: 8px;
  font-size: 13px;
}

.manage-alert span {
  flex: 1;
}

.manage-alert-error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.manage-alert-success {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

/* =========================================================
   Responsive
   ========================================================= */

@media (max-width: 1150px) {
  .manage-side-panel {
    width: 270px;
  }
}

@media (max-width: 1150px) {
  .manage-item-information-card .manage-three-column-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1000px) {
  .manage-three-column-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .manage-layout {
    flex-direction: column;
    overflow-y: auto;
  }

  .manage-main-content {
    overflow: visible;
    padding-right: 0;
  }

  .manage-side-panel {
    width: 100%;
    overflow: visible;
  }
}

@media (max-width: 700px) {
  .manage-page-shell {
  }

  .manage-card {
    padding: var(--sp-4);
  }

  .manage-tab-panel {
    padding: var(--sp-4);
  }

  .manage-section-tabs {
    overflow-x: auto;
  }

  .manage-adjustment-grid {
    grid-template-columns: 1fr;
  }

  .manage-item-information-card .manage-three-column-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 500px) {
  .manage-three-column-grid {
    grid-template-columns: 1fr;
  }

  .manage-item-information-card .manage-three-column-grid {
    grid-template-columns: 1fr;
  }

  .manage-page-header h1 {
    font-size: 20px;
  }

  .manage-page-header {
    flex-wrap: wrap;
  }
}
`}</style>
        <div className="manage-error-panel">
          <strong>{loadError || "Product not found."}</strong>
          <button
            type="button"
            className="manage-cancel-button"
            onClick={handleClose}
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-page-shell">
      <style>{`/* =========================================================
   Product Manage Page
   Palette and spacing intentionally mirror CurrentStockSection.css
   (same slate/blue design language) so the two pages read as one
   product. Typography is upgraded to Inter for a crisper, more
   modern look than the browser's default UI font.
   ========================================================= */

@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

/* ---------- Page shell ---------- */

.manage-page-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  /* */
  overflow: hidden;
  background: #f8fafc;
  color: #1e293b;

  -webkit-font-smoothing: antialiased;
}

/* ---------- Header ---------- */

.manage-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-5);
  flex-shrink: 0;
  margin-bottom: var(--sp-5);
}

.manage-page-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.manage-page-header p {
  margin: var(--sp-2) 0 0;
  color: #64748b;
  font-size: 13px;
}

.manage-close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}

.manage-close-button:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
  transform: translateY(-1px);
}

.manage-close-button:active {
  transform: translateY(0);
}

/* ---------- Two-column layout ---------- */

.manage-layout {
  display: flex;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  gap: var(--sp-5);
  overflow: hidden;
}

.manage-main-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding-right: var(--sp-1);
  overflow-y: auto;
}

.manage-side-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  width: 300px;
  flex-shrink: 0;
  min-height: 0;
  overflow-y: auto;
}

/* ---------- Cards ---------- */

.manage-card {
  padding: var(--sp-6);
  margin-bottom: var(--sp-5);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.manage-card-heading {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: var(--sp-5);
}

.manage-card-heading h2 {
  margin: 0;
  color: #1e293b;
  font-size: 16px;
  font-weight: 700;
}

.manage-card-heading p {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
}

/* Item Information is reference/summary data the cashier rarely edits,
   while Transactions can run long — so this card is deliberately more
   compact (tighter padding, smaller fields, a 5-up row on wide screens)
   to leave more vertical room for the list below it. */
.manage-item-information-card {
  padding: var(--sp-4) var(--sp-5);
  margin-bottom: var(--sp-4);
}

.manage-item-information-card .manage-card-heading {
  margin-bottom: var(--sp-3);
}

.manage-item-information-card .manage-three-column-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--sp-3);
}

.manage-item-information-card .manage-form-field label {
  font-size: 11px;
}

.manage-item-information-card .manage-form-field input {
  height: 34px;
  font-size: 12px;
}

/* ---------- Form fields ---------- */

.manage-three-column-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-4);
}

.manage-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.manage-form-field label {
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.manage-form-field input,
.manage-form-field select {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  padding: 0 var(--sp-3);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  background: #ffffff;
  color: #1e293b;
  font-family: inherit;
  font-size: 13px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.manage-form-field input::placeholder {
  color: #94a3b8;
}

.manage-form-field input:focus,
.manage-form-field select:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 12%);
}

.manage-form-field select {
  cursor: pointer;
}

/* ---------- Section tabs (Pricing / Transactions / Stock Adjustment) ---------- */

.manage-details-card {
  padding: 0;
  overflow: hidden;
}

.manage-section-tabs {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  min-height: 52px;
  padding: 0 var(--sp-3);
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.manage-section-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  height: 52px;
  padding: 0 var(--sp-4);
  border: 0;
  border-bottom: 2px solid transparent;
  outline: none;
  background: transparent;
  color: #64748b;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s ease;
}

.manage-section-tab svg {
  flex-shrink: 0;
  color: #cbd5e1;
  transition: color 0.15s ease;
}

.manage-section-tab:hover {
  color: #334155;
}

.manage-section-tab:hover svg {
  color: #94a3b8;
}

.manage-section-tab-active {
  border-bottom-color: #2563eb;
  color: #2563eb;
}

.manage-section-tab-active svg {
  color: #2563eb;
}

/* ---------- Tab content ---------- */

@keyframes manage-tab-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.manage-tab-panel {
  padding: var(--sp-6);
  background: #ffffff;
  animation: manage-tab-fade-in 0.18s ease;
}

.manage-panel-heading {
  margin-bottom: var(--sp-5);
}

.manage-panel-heading h2 {
  margin: 0;
  color: #1e293b;
  font-size: 16px;
  font-weight: 700;
}

.manage-panel-heading p {
  margin: var(--sp-1) 0 0;
  color: #94a3b8;
  font-size: 12px;
}

/* ---------- Transactions table ---------- */

.manage-table-wrapper {
  width: 100%;
  max-height: 50vh;
  overflow: auto;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.manage-table-wrapper::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.manage-table-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.manage-table-wrapper::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.manage-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
}

.manage-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.manage-table td {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid #f1f5f9;
  color: #64748b;
  vertical-align: middle;
}

.manage-table tbody tr:last-child td {
  border-bottom: 0;
}

.manage-table tbody tr:hover {
  background: #f8fafc;
}

.manage-transaction-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--sp-1) var(--sp-2);
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
}

.manage-table-empty {
  padding: var(--sp-8) var(--sp-3) !important;
  color: #94a3b8 !important;
  text-align: center !important;
}

/* ---------- Stock adjustment form ---------- */

.manage-adjustment-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.manage-adjustment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-4);
}

.manage-adjustment-notice {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
}

.manage-adjustment-notice strong {
  color: #1e293b;
}

.manage-adjustment-button {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: 40px;
  padding: 0 var(--sp-5);
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.manage-adjustment-button:hover {
  background: #1d4ed8;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
  transform: translateY(-1px);
}

.manage-adjustment-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
}

/* ---------- Right summary panel ---------- */

.manage-summary-card {
  padding: var(--sp-6);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}

.manage-summary-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: var(--sp-4);
  border-radius: 10px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  color: #2563eb;
}

.manage-summary-card h2 {
  margin: 0;
  overflow: hidden;
  color: #1e293b;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manage-summary-card p {
  margin: var(--sp-1) 0 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manage-summary-status {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  margin-top: var(--sp-4);
  padding: var(--sp-1) var(--sp-3);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.manage-summary-status.is-ok {
  background: #f0fdf4;
  color: #15803d;
}

.manage-summary-status.is-low {
  background: #fffbeb;
  color: #b45309;
}

.manage-summary-divider {
  height: 1px;
  margin: var(--sp-5) 0;
  background: #f1f5f9;
}

.manage-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-2) 0;
  font-size: 13px;
}

.manage-summary-row span {
  color: #64748b;
}

.manage-summary-row strong {
  color: #1e293b;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

/* ---------- Action area ---------- */

.manage-actions-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}

.manage-save-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  width: 100%;
  min-height: 42px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.manage-save-button:hover {
  background: #1d4ed8;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
  transform: translateY(-1px);
}

.manage-save-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
}

.manage-save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.manage-cancel-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.manage-cancel-button:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.manage-save-message {
  color: #15803d;
  font-size: 12px;
  text-align: center;
}

/* ---------- Thin scrollbars, matching CurrentStockSection ---------- */

.manage-main-content,
.manage-side-panel {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.manage-main-content::-webkit-scrollbar,
.manage-side-panel::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.manage-main-content::-webkit-scrollbar-track,
.manage-side-panel::-webkit-scrollbar-track {
  background: transparent;
}

.manage-main-content::-webkit-scrollbar-thumb,
.manage-side-panel::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.manage-main-content::-webkit-scrollbar-thumb:hover,
.manage-side-panel::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ---------- Loading / error states ---------- */

.manage-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  font-size: 14px;
}

.manage-error-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-4);
  padding: var(--sp-6);
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #ffffff;
  color: #b91c1c;
}

.manage-alert {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  border-radius: 8px;
  font-size: 13px;
}

.manage-alert span {
  flex: 1;
}

.manage-alert-error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.manage-alert-success {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

/* =========================================================
   Responsive
   ========================================================= */

@media (max-width: 1150px) {
  .manage-side-panel {
    width: 270px;
  }
}

@media (max-width: 1150px) {
  .manage-item-information-card .manage-three-column-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1000px) {
  .manage-three-column-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .manage-layout {
    flex-direction: column;
    overflow-y: auto;
  }

  .manage-main-content {
    overflow: visible;
    padding-right: 0;
  }

  .manage-side-panel {
    width: 100%;
    overflow: visible;
  }
}

@media (max-width: 700px) {
  .manage-page-shell {
  }

  .manage-card {
    padding: var(--sp-4);
  }

  .manage-tab-panel {
    padding: var(--sp-4);
  }

  .manage-section-tabs {
    overflow-x: auto;
  }

  .manage-adjustment-grid {
    grid-template-columns: 1fr;
  }

  .manage-item-information-card .manage-three-column-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 500px) {
  .manage-three-column-grid {
    grid-template-columns: 1fr;
  }

  .manage-item-information-card .manage-three-column-grid {
    grid-template-columns: 1fr;
  }

  .manage-page-header h1 {
    font-size: 20px;
  }

  .manage-page-header {
    flex-wrap: wrap;
  }
}
`}</style>
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <div className="manage-page-header">
        <div>
          <h1>Edit Item</h1>

          <p>Update product information, pricing and inventory details.</p>
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
                <label htmlFor="itemCode">Item code / Part number</label>

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
                    activeSection === id ? "manage-section-tab-active" : ""
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
                    <label htmlFor="sellingPrice">Selling price</label>

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
                    <label htmlFor="purchasePrice">Purchase price</label>

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
                              {transaction.date || transaction.createdAt || "-"}
                            </td>

                            <td>
                              <span className="manage-transaction-badge">
                                {transaction.type ||
                                  transaction.transactionType ||
                                  "-"}
                              </span>
                            </td>

                            <td>
                              {transaction.quantity ?? transaction.qty ?? "-"}
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
                          <td colSpan={4} className="manage-table-empty">
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
                              onChange={(event) =>
                                setRackDrafts((current) => ({
                                  ...current,
                                  [batch.batchId]: event.target.value,
                                }))
                              }
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
                          <td colSpan={5} className="manage-table-empty">
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
                  <p>Increase or decrease the available stock quantity.</p>
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
                      <label htmlFor="adjustmentType">Adjustment type</label>

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
                      <option value="MANUAL_CORRECTION">
                        Manual correction
                      </option>
                    </select>
                  </div>

                  <div className="manage-adjustment-notice">
                    Current available stock: <strong>{availableStock}</strong>
                  </div>

                  <button type="submit" className="manage-adjustment-button">
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

            <h2>{formData.itemName || "Product name not available"}</h2>

            <p>{formData.brand || "Brand not available"}</p>

            <p>Part No. {formData.itemCode || "Not available"}</p>

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
              <strong>₹{formData.purchasePrice || "0.00"}</strong>
            </div>

            <div className="manage-summary-row">
              <span>Selling price</span>
              <strong>₹{formData.sellingPrice || "0.00"}</strong>
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
              <div className="manage-save-message">{saveMessage}</div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ProductManagePage;
