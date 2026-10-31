import { ProductUnitLabel } from "../../components/ProductUnitFields";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import OpeningStockManualEntry from "../../owner/components/inventory/OpeningStockManualEntry";
import "../../owner/components/inventory/CurrentStockSection.css"; 
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  convertProforma,
  getProforma,
  saveProforma,
  updateProforma,
} from "../../services/proformaService";

import {
  AlertCircle, AlertTriangle, Calendar, CheckCircle2,
  ChevronDown, IndianRupee, Info, Loader2, Pencil, Percent,
  Plus, Search, Store, Trash2, Upload, X,
} from "lucide-react";

import { getAllStores } from "../../services/storeService";
import {
  getCurrentStockPage,
  getManagementBatches,
} from "../../services/storeInventoryPanelService";

import {
  placeOrder,
  getInvoice,
  amendInvoice,
  previewInvoiceAmendment,
  calculateOrder,
} from "../../services/orderService";
import { addPayment } from "../../services/paymentService";

import {
  searchCustomersByStore,
  saveCustomer,
  updateCustomer,
} from "../../services/customerService";

import "./NewSalePage.css";
import { saleCalculationRows } from "../utils/saleCalculationRows";

/* =========================================================
   HELPERS
========================================================= */

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

const invoiceItemsForEdit = (source) =>
  source.items.map((item) => ({
    ...item,
    itemName: item.itemName || item.productName,
    hsnCode: item.hsncode,
    quantity: Number(item.quantity),
    availableQuantity: Number(item.availableQuantity ?? item.quantity),
    gstType: item.gstType?.startsWith("IGST_")
      ? "IGST"
      : item.gstType === "NONE"
        ? "NONE"
        : "CGST_SGST",
    discountPercentage: Number(item.discountPercentage || 0),
    gstPercentage: Number(item.gstPercentage || 0),
  }));

const RECALC_DEBOUNCE_MS = 400;

const GST_PERCENTAGES = [0, 5, 12, 18, 28];

const money = (value) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const normalizePercentage = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(100, Math.max(0, number));
};

const effectiveDiscountPct = (item) => {
  if (item.discountMode === "AMOUNT") {
    const base = Number(item.sellingPrice || 0) * Number(item.quantity || 0);
    if (!(base > 0)) return 0;
    return normalizePercentage((Number(item.discountAmount || 0) / base) * 100);
  }
  return normalizePercentage(item.discountPercentage);
};

/* Discount value (without tax) for a given unit price and quantity. */
const lineDiscountAmount = (item, unitPrice, quantity) =>
  (Number(unitPrice || 0) *
    Number(quantity || 0) *
    effectiveDiscountPct(item)) /
  100;

const normalizeGstPercentage = (value) => {
  const number = Number(value);

  if (GST_PERCENTAGES.includes(number)) {
    return number;
  }

  return 0;
};

/* =========================================================
   FRONTEND GST TYPE -> BACKEND GST TYPE
   Frontend: CGST_SGST | IGST | NONE
   Backend:  GST_5..28 | IGST_5..28 | NONE
========================================================= */

const toBackendGstType = (gstType, gstPercentage) => {
  const percentage = Number(gstPercentage || 0);

  if (gstType === "CGST_SGST") {
    if (percentage === 5) return "GST_5";
    if (percentage === 12) return "GST_12";
    if (percentage === 18) return "GST_18";
    if (percentage === 28) return "GST_28";
    return "NONE";
  }

  if (gstType === "IGST") {
    if (percentage === 5) return "IGST_5";
    if (percentage === 12) return "IGST_12";
    if (percentage === 18) return "IGST_18";
    if (percentage === 28) return "IGST_28";
    return "NONE";
  }

  return "NONE";
};
function DiscountTypeMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const Icon = value === "AMOUNT" ? IndianRupee : Percent;

  return (
    <div className="ns-dmenu" ref={ref}>
      <button
        type="button"
        className="ns-dmenu-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Discount type"
      >
        <Icon size={12} />
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="ns-dmenu-list" role="listbox">
          {[
            ["PERCENT", "Percentage", Percent],
            ["AMOUNT", "Amount", IndianRupee],
          ].map(([mode, label, Ico]) => (
            <button
              key={mode}
              type="button"
              role="option"
              aria-selected={value === mode}
              className={value === mode ? "active" : ""}
              onClick={() => {
                onChange(mode);
                setOpen(false);
              }}
            >
              <Ico size={12} /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function defaultValidatePrices(row, errors) {
  (row.enteredPriceFields || []).forEach((field) => {
    if (!Number.isFinite(Number(row[field])) || Number(row[field]) <= 0)
      errors.push(`${field} must be greater than zero`);
  });
}
/* =========================================================
   PAGE
========================================================= */

export default function NewSalePage({ documentMode = "SALE" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: proformaEditId, orderId: editOrderId } = useParams();
  const isProforma = documentMode === "PROFORMA";

  /* Existing invoice: DRAFT -> "Complete Sale", anything else -> amendment. */
  const isExistingInvoice = !isProforma && Boolean(editOrderId);
  const [isDraft, setIsDraft] = useState(false);
  const isInvoiceEdit = isExistingInvoice && !isDraft;
  const [originalInvoice, setOriginalInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(isExistingInvoice);
  const [invoiceEditError, setInvoiceEditError] = useState("");
  const [editReason, setEditReason] = useState("");
  const amendmentBusy = useRef(false);

  const user = useMemo(() => readUser(), []);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  /* =====================================================
       TOASTS (lightweight, no extra dependency)
    ===================================================== */

  const [toasts, setToasts] = useState([]);
  const toastCounter = useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const toast = useMemo(() => {
    const push = (type, message) => {
      const text =
        typeof message === "string"
          ? message
          : message?.message || message?.error || "Something went wrong.";
      const id = ++toastCounter.current;
      setToasts((current) => [...current.slice(-3), { id, type, text }]);
      setTimeout(
        () => dismissToast(id),
        type === "error" || type === "warning" ? 6000 : 3500,
      );
    };
    return {
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      warning: (message) => push("warning", message),
      info: (message) => push("info", message),
    };
  }, [dismissToast]);

  /* =====================================================
       STORE
    ===================================================== */

  const [selectedStoreId, setSelectedStoreId] = useState(
    isSuperAdmin ? "" : String(user?.storeId || ""),
  );

  const [stores, setStores] = useState([]);

  const [storeLoading, setStoreLoading] = useState(false);

  const [storeError, setStoreError] = useState("");

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    const loadStores = async () => {
      setStoreLoading(true);
      setStoreError("");

      try {
        const response = await getAllStores();

        const data = Array.isArray(response)
          ? response
          : Array.isArray(response?.content)
            ? response.content
            : [];

        setStores(data);
      } catch (error) {
        console.error("Failed to load stores:", error);

        setStores([]);

        setStoreError(
          error?.response?.data?.message || "Unable to load stores.",
        );
      } finally {
        setStoreLoading(false);
      }
    };

    loadStores();
  }, [isSuperAdmin]);

  const handleStoreChange = (event) => {
    const newStoreId = event.target.value;

    setSelectedStoreId(newStoreId);

    /*
     * A bill belongs to one store.
     * Changing store clears current bill.
     */

    setItems([]);
    setBlankRows([]);
    setRowSearch(null);

    setCalculation(null);
    setCalcError("");
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomerResults([]);
    setBulkSalePreview(null);
  };

  /* =====================================================
       GST DEFAULTS
       One header dropdown sets tax type AND rate together.
       Value format: "<TYPE>:<PERCENT>" e.g. "CGST_SGST:18"
    ===================================================== */

  const [defaultGstType, setDefaultGstType] = useState("CGST_SGST");

  const [defaultGstPercentage, setDefaultGstPercentage] = useState(18);

  const handleDefaultGstChange = (value) => {
    const [type, pct] = String(value).split(":");
    const percentage = type === "NONE" ? 0 : normalizeGstPercentage(pct);

    setDefaultGstType(type);
    setDefaultGstPercentage(percentage);

    setItems((current) =>
      current.map((item) => ({
        ...item,
        gstType: type,
        gstPercentage: percentage,
      })),
    );
  };

  /* =====================================================
       STOCK SEARCH (used by the in-table row search)
    ===================================================== */

  const fetchStock = async (text) => {
    // Sales must search stock, including store-local products
    // that do not exist in the global product catalogue.
    const response = await getCurrentStockPage(selectedStoreId, {
      search: text,
      onlyAvailable: true,
      page: 0,
      size: 100,
    });

    return Array.isArray(response)
      ? response
      : Array.isArray(response?.content)
        ? response.content
        : [];
  };

  /* =====================================================
       BILL ITEMS
    ===================================================== */

  const [items, setItems] = useState([]);

  const [bulkSalePreview, setBulkSalePreview] = useState(null);
  const bulkSaleStore = useRef(selectedStoreId);
  bulkSaleStore.current = selectedStoreId;

  /*
   * Excel upload happens on its own page (SalesBulkUploadPage). The page
   * validates the file and sends the preview back here; this merges the
   * accepted rows into the bill.
   */
  const applyBulkPreview = (preview, gst = {}) => {
    const gstType = gst.type ?? defaultGstType;
    const gstPercentage = gst.percentage ?? defaultGstPercentage;

    setBulkSalePreview(preview);
    if (Number(preview.invalidRows) > 0) {
      toast.warning(
        `${preview.validRows} valid row(s) added, ${preview.invalidRows} rejected. See the details above the table.`,
      );
    } else {
      toast.success(`${preview.validRows} row(s) added from the file.`);
    }

    const uploadedItems = (preview.items || []).map((item) => ({
      productId: item.inventory?.productId ?? null,
      localProductId: item.inventory?.localProductId ?? null,
      inventoryId: item.inventory?.inventoryId,
      batchId: item.batchId ?? null,
      batchNumber: item.inventory?.batchNumber ?? null,
      partNumber: item.partNumber,
      itemName: item.inventory?.itemName,
      brandName: item.inventory?.brandName,
      hsnCode: item.inventory?.hsncode,
      quantity: Number(item.requestedQuantity || 0),
      availableQuantity: Number(
        item.batchAvailableQuantity ?? item.inventory?.quantity ?? 0,
      ),
      mrp: Number(item.inventory?.mrp || 0),
      sellingPrice: Number(item.inventory?.sellingPrice || 0),
      discountPercentage: 0,
      gstType: gstType === "NONE" ? "NONE" : gstType,
      gstPercentage:
        gstType === "NONE"
          ? 0
          : Number(item.inventory?.gstPercentage ?? gstPercentage ?? 0),
      gstAmount: 0,
      bulkUploaded: true,
    }));

    setItems((current) => {
      const incomingInventory = new Set(
        uploadedItems.map((item) => String(item.inventoryId)),
      );
      // A corrected file replaces its Excel quantities for the included
      // inventory items. Keep manual quantities and previously accepted
      // items absent from the corrected file. Reuploads do not double them.
      const merged = current.flatMap((item) => {
        if (!incomingInventory.has(String(item.inventoryId))) return [item];
        const oldExcelQty = Number(
          item.bulkQuantity ?? (item.bulkUploaded ? item.quantity : 0),
        );
        const manualQty = Math.max(
          0,
          Number(item.quantity || 0) - oldExcelQty,
        );
        return manualQty
          ? [
              {
                ...item,
                quantity: manualQty,
                bulkQuantity: 0,
                bulkUploaded: false,
              },
            ]
          : [];
      });
      uploadedItems.forEach((uploaded) => {
        const index = merged.findIndex(
          (item) =>
            String(item.inventoryId) === String(uploaded.inventoryId) &&
            String(item.batchId) === String(uploaded.batchId),
        );
        if (index < 0)
          merged.push({ ...uploaded, bulkQuantity: uploaded.quantity });
        else
          merged[index] = {
            ...merged[index],
            quantity: Number(merged[index].quantity || 0) + uploaded.quantity,
            bulkQuantity:
              Number(merged[index].bulkQuantity || 0) + uploaded.quantity,
            bulkUploaded: true,
          };
      });
      return merged;
    });
  };

  /* Open the import page, carrying the current bill so nothing is lost. */
  const goToBulkUpload = () => {
    if (!selectedStoreId) {
      toast.warning("Select a store before uploading the sale file.");
      return;
    }
    const { salesBulk, ...previousState } = location.state || {};
    navigate(`${isSuperAdmin ? "/owner" : "/store"}/sales/import-items`, {
      state: {
        storeId: selectedStoreId,
        returnTo: location.pathname,
        returnState: {
          ...previousState,
          bill: {
            storeId: selectedStoreId,
            customer: selectedCustomer,
            customerSearch,
            items,
            billDiscountPercent,
            defaultGstType,
            defaultGstPercentage,
            invoiceDate,
            paymentStatus,
            paymentMethod,
            paymentReference,
          },
        },
      },
    });
  };

  /*
   * BLANK ROWS (in-table search)
   * ----------------------------
   * Blank rows live in their own list so they never reach the calculation
   * or the saved invoice. Typing in a blank row searches stock; picking a
   * result turns the row into a real bill item. One blank row is always
   * kept at the bottom of the table so there is always a row to search in.
   */

  const [blankRows, setBlankRows] = useState([]);
  const rowSearchRequest = useRef(0);
  const [rowSearch, setRowSearch] = useState(null);
  const [addItemOpen, setAddItemOpen] = useState(false);

  const focusLastBlankRow = () => {
    setTimeout(() => {
      const inputs = document.querySelectorAll("[data-part-row]");
      inputs[inputs.length - 1]?.focus();
    }, 60);
  };

  const addBlankRow = () => {
    const id = Date.now();
    setBlankRows((current) => [...current, { id, partNumber: "" }]);
    focusLastBlankRow();
  };

  useEffect(() => {
    if (blankRows.length === 0) {
      setBlankRows([{ id: Date.now(), partNumber: "" }]);
    }
  }, [blankRows.length]);

  useEffect(() => {
    if (!rowSearch) return undefined;
    const close = () => setRowSearch(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [rowSearch?.rowId]);

  const removeBlankRow = (rowId) => {
    setBlankRows((current) => current.filter((row) => row.id !== rowId));
    setRowSearch(null);
  };

  const handleBlankRowSearch = async (rowId, text, element) => {
    setBlankRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, partNumber: text } : row,
      ),
    );

    const requestId = ++rowSearchRequest.current;
    const box = element.getBoundingClientRect();
    const position = {
      left: box.left,
      top: box.bottom + 4,
      width: Math.max(box.width, 380),
    };
    const trimmed = text.trim();

    if (!selectedStoreId) {
      setRowSearch({
        rowId,
        ...position,
        results: [],
        loading: false,
        error: "Select a store before searching for parts.",
      });
      return;
    }

    if (trimmed.length < 2) {
  setRowSearch({ rowId, ...position, results: [], loading: false, error: "", idle: true });
  return;
}

    setRowSearch({
      rowId,
      ...position,
      results: [],
      loading: true,
      error: "",
    });

    try {
      const results = await fetchStock(trimmed);
      if (requestId !== rowSearchRequest.current) return;
      setRowSearch({ rowId, ...position, results, loading: false, error: "" });
    } catch (error) {
      if (requestId !== rowSearchRequest.current) return;
      setRowSearch({
        rowId,
        ...position,
        results: [],
        loading: false,
        error:
          error?.response?.data?.message || "Unable to search store inventory.",
      });
    }
  };

  /*
   * BATCH RULE
   * ----------
   * New sale / draft      -> no batch picked; backend FIFO allocation.
   * Editing a saved invoice:
   *   ONE available batch  -> add immediately.
   *   MULTIPLE batches      -> show batch selector.
   *   NO available batches  -> do not add.
   */

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const batchLookupRequest = useRef(0);
  const batchReplaceRow = useRef(null);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  const closeBatchSelector = () => {
    setBatchModalOpen(false);
    setSelectedProductForBatch(null);
    setAvailableBatches([]);
    setSelectedBatchId(null);
    batchReplaceRow.current = null;
  };

  /*
   * IMPORTANT:
   * The complete duplicate check happens inside setItems(current => ...)
   * so stale React state cannot make a second product disappear.
   */

  const addProductWithBatch = (product, batch, replaceRowId = null) => {
    const productId = product.productId ?? null;

    const inventoryId = product.inventoryId;

    const localProductId = product.localProductId ?? null;

    const batchId = batch?.batchId ?? batch?.id ?? null;

    const availableQuantity = Number(
      batch?.availableQuantity ?? product?.quantity ?? 0,
    );

    if (
      !inventoryId ||
      (!productId && !localProductId) ||
      availableQuantity <= 0
    ) {
      console.error("Cannot add product/batch:", {
        product,
        batch,
      });
      toast.error("This product can't be added. It may be out of stock.");
      return;
    }

    setItems((current) => {
      /*
       * Same product + different batch must remain
       * as separate bill lines.
       */
      const existingIndex = current.findIndex(
        (item) =>
          String(item.inventoryId) === String(inventoryId) &&
          String(item.batchId) === String(batchId),
      );

      if (existingIndex >= 0) {
        const existing = current[existingIndex];

        const currentQuantity = Number(existing.quantity || 0);

        if (currentQuantity >= availableQuantity) {
          return current;
        }

        return current.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity: currentQuantity + 1,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          productId,
          localProductId,
          inventoryId,

          batchId,
          batchNumber:
            batch?.batchNumber ?? batch?.batchNo ?? batch?.number ?? null,

          partNumber: product.partNumber ?? "-",

          itemName:
            product.itemName ?? product.productName ?? product.name ?? "-",

          stockUnit: product.stockUnit || "PCS",
          packSize: product.packSize ?? null,
          contentsUnit: product.contentsUnit ?? null,
          quantity: 1,
          availableQuantity,

          /*
           * Price belongs to the selected batch.
           */
          mrp: Number(batch?.mrp ?? product?.mrp ?? 0),

          sellingPrice: Number(
            batch?.sellingPrice ??
              batch?.sellingPriceAmount ??
              product?.sellingPrice ??
              0,
          ),

          discountPercentage: 0,

          gstType: defaultGstType === "NONE" ? "NONE" : defaultGstType,

          gstPercentage:
            defaultGstType === "NONE" ? 0 : Number(defaultGstPercentage),

          gstAmount: 0,
          taxableAmount: 0,
          lineTotal: 0,
        },
      ];
    });

    if (replaceRowId != null) {
      setBlankRows((current) =>
        current.filter((row) => row.id !== replaceRowId),
      );
      // A fresh blank row is added automatically; move the cursor into it.
      focusLastBlankRow();
    }
    setRowSearch(null);

    closeBatchSelector();
  };

  const handleAddProduct = async (product, replaceRowId = null) => {
    if (!selectedStoreId || !product?.inventoryId) {
      return;
    }

    if (!isInvoiceEdit) {
      // New sales and drafts continue to use backend FIFO allocation.
      addProductWithBatch(product, null, replaceRowId);
      return;
    }

    const requestId = ++batchLookupRequest.current;
    const receivingStore = selectedStoreId;
    setBatchLoading(true);
    try {
      const response = await getManagementBatches(product.inventoryId);
      if (
        requestId !== batchLookupRequest.current ||
        String(bulkSaleStore.current) !== String(receivingStore)
      )
        return;
      const batches = (Array.isArray(response) ? response : []).filter(
        (batch) => Number(batch.availableQuantity) > 0 && batch.active !== false,
      );
      if (!batches.length) {
        toast.warning(
          "No available stock batch exists for this product. Refresh stock before adding it.",
        );
        return;
      }
      if (batches.length === 1) {
        addProductWithBatch(product, batches[0], replaceRowId);
        return;
      }
      batchReplaceRow.current = replaceRowId;
      setSelectedProductForBatch(product);
      setAvailableBatches(batches);
      setSelectedBatchId(batches[0].batchId ?? batches[0].id);
      setRowSearch(null);
      setBatchModalOpen(true);
    } catch (error) {
      if (requestId === batchLookupRequest.current)
        toast.error(
          error?.response?.data?.message ||
            "Unable to load stock batches. Please retry.",
        );
    } finally {
      if (requestId === batchLookupRequest.current) setBatchLoading(false);
    }
  };

  const confirmBatchSelection = () => {
    if (!selectedProductForBatch || !selectedBatchId) {
      return;
    }

    const batch = availableBatches.find(
      (item) => String(item?.batchId ?? item?.id) === String(selectedBatchId),
    );

    if (batch) {
      addProductWithBatch(
        selectedProductForBatch,
        batch,
        batchReplaceRow.current,
      );
    }
  };
  const openAddItem = () => {
  if (!selectedStoreId) return;
  setRowSearch(null);
  setAddItemOpen(true);
};

const handleItemCreated = async (result, submitted) => {
  setAddItemOpen(false);
  const partNumber = submitted?.partNumber;
  if (!partNumber) {
    toast.success("Item added. Search for it to add it to the bill.");
    return;
  }
  try {
    const results = await fetchStock(partNumber);
    const match = results.find(
      (p) =>
        String(p.partNumber ?? "").trim().toLowerCase() ===
        partNumber.toLowerCase(),
    );
    if (!match) {
      toast.info(
        "Item saved. It will appear in search once it is approved and in stock.",
      );
      return;
    }
    await handleAddProduct(match);
    toast.success(`${partNumber} added to the bill.`);
  } catch {
    toast.warning("Item saved, but it could not be added to the bill. Search for it.");
  }
};

  /* =====================================================
       QUANTITY
    ===================================================== */

  const updateItemQuantity = (index, value) => {
    const requestedQuantity = value === "" ? "" : Math.floor(Number(value));

    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const availableQuantity = Number(item.availableQuantity ?? 0);

        if (requestedQuantity === "") {
          return { ...item, quantity: "" };
        }

        if (!Number.isFinite(requestedQuantity)) return item;

        return {
          ...item,

          quantity: Math.min(Math.max(1, requestedQuantity), availableQuantity),
        };
      }),
    );
  };

  const finishItemQuantityEdit = (index) => {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const availableQuantity = Number(item.availableQuantity ?? 0);
        const quantity = Math.floor(Number(item.quantity));

        return {
          ...item,
          quantity:
            Number.isFinite(quantity) && quantity >= 1
              ? Math.min(quantity, availableQuantity)
              : 1,
        };
      }),
    );
  };

  const updateAllocatedQuantity = (itemIndex, allocatedQuantity, value) => {
    const requestedAllocation = Math.floor(Number(value));
    if (!Number.isFinite(requestedAllocation) || requestedAllocation < 1)
      return;

    setItems((current) =>
      current.map((item, index) => {
        if (index !== itemIndex) return item;

        const currentTotal = Number(item.quantity ?? 0);
        const availableQuantity = Number(item.availableQuantity ?? 0);
        const requestedTotal =
          currentTotal - Number(allocatedQuantity ?? 0) + requestedAllocation;

        return {
          ...item,
          quantity: Math.min(Math.max(1, requestedTotal), availableQuantity),
        };
      }),
    );
  };

  /* Invoice edit only: MRP and unit price are editable per line. */
  const updateItemField = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  /* =====================================================
       DISCOUNT
       Two editable sub-columns: % and Amount.
       The backend accepts a percentage only, so an amount typed
       in the Amount column is converted to the equivalent
       percentage (base = the price shown in the Price / Unit column).
    ===================================================== */

  const updateItemDiscountPercent = (index, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              discountMode: "PERCENT",
              discountPercentage: normalizePercentage(value),
            }
          : item,
      ),
    );
  };

  const updateItemDiscountAmount = (index, value, base) => {
    const amount = Math.max(0, Number(value) || 0);
    const percentage =
      base > 0 ? normalizePercentage((amount / base) * 100) : 0;

    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              discountMode: "PERCENT",
              discountPercentage: percentage,
            }
          : item,
      ),
    );
  };

  // Discount entry mode for the whole table: PERCENT (default) or AMOUNT.
  const [discountType, setDiscountType] = useState("PERCENT");
  /* =====================================================
       REMOVE ITEM
    ===================================================== */

  const removeItem = (index) => {
    // Lines already saved on a completed invoice cannot be deleted.
    if (isInvoiceEdit && items[index]?.orderItemId) return;
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  /* =====================================================
       CALCULATION
    ===================================================== */

  const [calculationResult, setCalculation] = useState(null);
  const [calculationKey, setCalculationKey] = useState("");

  // Overall bill discount percentage.
  // Sent to the backend calculation and the final invoice payload.
  const [billDiscountPercent, setBillDiscountPercent] = useState(0);

  const handleBillDiscountChange = (value) => {
    setBillDiscountPercent(normalizePercentage(value));
  };

  const [calcLoading, setCalcLoading] = useState(false);

  const [calcError, setCalcError] = useState("");

  const debounceRef = useRef(null);

  const requestIdRef = useRef(0);

  const buildCalculationRequest = useCallback(
    (currentItems) => {
      return {
        storeId: Number(selectedStoreId),

        billDiscountPercent: normalizePercentage(billDiscountPercent),

        items: currentItems.map((item) => ({
          productId: item.productId ?? null,

          /*
           * Local products do not have a global productId.
           * Preserve localProductId so the backend can identify them.
           */
          localProductId: item.localProductId ?? null,

          inventoryId: item.inventoryId,

          batchId: item.batchId ?? null,

          quantity: Number(item.quantity),

          discountPercentage: effectiveDiscountPct(item),

          gstType: toBackendGstType(item.gstType, item.gstPercentage),
        })),
      };
    },
    [selectedStoreId, billDiscountPercent],
  );

  const buildAmendmentRequest = useCallback(
    (currentItems) => ({
      editToken: originalInvoice?.editToken,
      reason: editReason,
      billDiscountPercent: normalizePercentage(billDiscountPercent),
      items: currentItems.map((item) => ({
        orderItemId: item.orderItemId ?? null,
        inventoryId: Number(item.inventoryId),
        batchId: item.batchId == null ? null : Number(item.batchId),
        quantity: Number(item.quantity),
        sellingPrice: Number(item.sellingPrice),
        mrp: Number(item.mrp),
        discountPercentage: effectiveDiscountPct(item),
        gstType: toBackendGstType(item.gstType, item.gstPercentage),
      })),
    }),
    [originalInvoice, editReason, billDiscountPercent],
  );

  /* A result is only shown while it still matches the current inputs. */
  const currentCalculationKey = JSON.stringify(
    isInvoiceEdit
      ? buildAmendmentRequest(items)
      : buildCalculationRequest(items),
  );
  const calculation =
    calculationKey === currentCalculationKey ? calculationResult : null;

  const recalculateBill = useCallback(
    async (currentItems) => {
      if (!selectedStoreId || (!isInvoiceEdit && currentItems.length === 0)) {
        setCalculation(null);
        setCalcError("");
        setCalcLoading(false);

        return;
      }

      const requestId = ++requestIdRef.current;

      setCalcLoading(true);
      setCalcError("");

      try {
        const payload = isInvoiceEdit
          ? buildAmendmentRequest(currentItems)
          : buildCalculationRequest(currentItems);
        const response = await (isInvoiceEdit
          ? previewInvoiceAmendment(editOrderId, payload)
          : calculateOrder(payload));

        /*
         * Ignore an old response if a newer
         * calculation request has already started.
         */

        if (requestId === requestIdRef.current) {
          setCalculation(response);
          setCalculationKey(JSON.stringify(payload));
        }
      } catch (error) {
        if (requestId === requestIdRef.current) {
          console.error("Order calculation failed:", error);

          setCalculation(null);

          setCalcError(
            error?.response?.data?.message ||
              error?.response?.data?.error ||
              "Unable to calculate bill.",
          );
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setCalcLoading(false);
        }
      }
    },
    [
      selectedStoreId,
      buildCalculationRequest,
      isInvoiceEdit,
      editOrderId,
      buildAmendmentRequest,
    ],
  );

  useEffect(() => {
    if (!selectedStoreId || (!isInvoiceEdit && items.length === 0)) {
      setCalculation(null);
      setCalcError("");
      setCalcLoading(false);

      return undefined;
    }

    if (
      items.some(
        (item) =>
          !Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 1,
      )
    ) {
      setCalcLoading(false);
      return undefined;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      recalculateBill(items);
    }, RECALC_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [items, selectedStoreId, recalculateBill, isInvoiceEdit]);

  /*
   * Match the backend calculation response with the frontend items.
   * saleCalculationRows owns this matching (batch allocation, invoice edit).
   * allocationIndex is added here so every row keeps a stable unique key.
   */

  const displayRows = useMemo(() => {
    const counts = {};
    return saleCalculationRows(items, calculation, isInvoiceEdit).map((row) => {
      const allocationIndex = counts[row.itemIndex] ?? 0;
      counts[row.itemIndex] = allocationIndex + 1;
      return { ...row, allocationIndex };
    });
  }, [items, calculation, isInvoiceEdit]);

  /* Column totals for the TOTAL row at the end of the table. */
  const totals = useMemo(() => {
    const sum = { qty: 0, mrp: 0, price: 0, discount: 0, taxable: 0, total: 0 };

    displayRows.forEach(({ item, line }) => {
      const qty = Number(line?.quantity ?? item.quantity ?? 0) || 0;
      const unit = Number(line?.sellingPrice ?? item.sellingPrice ?? 0);

      sum.qty += qty;
      sum.mrp += Number(line?.mrp ?? item.mrp ?? 0) * qty;
      sum.price += unit * qty;
      sum.discount += lineDiscountAmount(item, unit, qty);
      sum.taxable += Number(line?.taxableAmount ?? item.taxableAmount ?? 0);
      sum.total += Number(line?.lineTotal ?? item.lineTotal ?? 0);
    });

    return sum;
  }, [displayRows]);

  const roundOffValue = Number(calculation?.roundOff ?? 0);

  const gstTotal =
    Number(calculation?.cgst ?? 0) +
    Number(calculation?.sgst ?? 0) +
    Number(calculation?.igst ?? 0);

  /* =====================================================
       CUSTOMER
    ===================================================== */

  const emptyCustomerForm = {
    customerName: "",
    mobileNumber: "",
    gstRegistrationType: "UNREGISTERED",
    gstin: "",
    state: "",
    email: "",
    billingAddress: "",
    shippingAddress: "",
  };

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [saleSameAsBilling, setSaleSameAsBilling] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [paymentReference, setPaymentReference] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [createdOrderAmount, setCreatedOrderAmount] = useState(null);

  const customerLookupRequest = useRef(0);

  const loadCustomerOptions = async (query = "") => {
    if (!selectedStoreId) return;
    const requestId = ++customerLookupRequest.current;
    setCustomerLoading(true);
    try {
      const customers = await searchCustomersByStore(selectedStoreId, query);
      if (requestId === customerLookupRequest.current) {
        setCustomerResults(Array.isArray(customers) ? customers : []);
      }
    } catch (error) {
      if (requestId === customerLookupRequest.current) {
        setCustomerResults([]);
        console.error("Customer search failed:", error);
      }
    } finally {
      if (requestId === customerLookupRequest.current)
        setCustomerLoading(false);
    }
  };

const selectCustomer = (customer) => {
  const billing = isProforma ? "" : (customer.billingAddress ?? "");
  const shipping = isProforma ? "" : (customer.shippingAddress ?? "");
  setSelectedCustomer({
    ...customer,
    billingAddress: billing,
    shippingAddress: shipping,
  });
  setSaleSameAsBilling(Boolean(billing) && billing === shipping);
  setCustomerSearch(customer.customerName ?? "");
  setCustomerDropdownOpen(false);
};
const updateSaleAddress = (field, value) => {
  setSelectedCustomer((current) =>
    current
      ? {
          ...current,
          [field]: value,
          ...(field === "billingAddress" && saleSameAsBilling
            ? { shippingAddress: value }
            : {}),
        }
      : current,
  );
};

const handleSaleSameAsBilling = (checked) => {
  setSaleSameAsBilling(checked);
  if (checked) {
    setSelectedCustomer((current) =>
      current
        ? { ...current, shippingAddress: current.billingAddress ?? "" }
        : current,
    );
  }
};
  const openCustomerModal = (customer = null) => {
    setEditingCustomer(customer);
    setCustomerForm(
      customer
        ? {
            customerName: customer.customerName ?? "",
            mobileNumber: customer.mobileNumber ?? "",
            gstRegistrationType: customer.gstRegistrationType ?? "UNREGISTERED",
            gstin: customer.gstin ?? "",
            state: customer.state ?? "",
            email: customer.email ?? "",
            billingAddress: customer.billingAddress ?? "",
            shippingAddress: customer.shippingAddress ?? "",
          }
        : emptyCustomerForm,
    );
    const billing = customer?.billingAddress ?? "";
    const shipping = customer?.shippingAddress ?? "";
    setSameAsBilling(Boolean(billing) && billing === shipping);
    setCustomerDropdownOpen(false);
    setCustomerModalOpen(true);
  };

  const handleCustomerFormChange = (field, value) => {
    setCustomerForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "billingAddress" && sameAsBilling
        ? { shippingAddress: value }
        : {}),
    }));
  };

  const handleSameAsBilling = (checked) => {
    setSameAsBilling(checked);
    if (checked)
      setCustomerForm((current) => ({
        ...current,
        shippingAddress: current.billingAddress,
      }));
  };

  const handleSaveB2BCustomer = async () => {
    if (!selectedStoreId) return toast.warning("Select a store first.");
    if (!customerForm.customerName.trim())
      return toast.warning("Party name is required.");
    if (!/^\d{10}$/.test(customerForm.mobileNumber))
      return toast.warning("Enter a valid 10-digit mobile number.");
    if (
      customerForm.gstRegistrationType !== "UNREGISTERED" &&
      !/^[0-9A-Za-z]{15}$/.test(customerForm.gstin.trim())
    ) {
      return toast.warning("A valid 15-character GSTIN is required.");
    }

    const { billingAddress, shippingAddress, ...customerFields } = customerForm;

const payload = {
  ...(isProforma ? customerFields : customerForm),
  storeId: Number(selectedStoreId),
  customerType: "B2B",
  gstin: customerForm.gstin.trim().toUpperCase() || null,
};

    setSavingCustomer(true);
    try {
      const saved = editingCustomer
        ? await updateCustomer(editingCustomer.id, payload)
        : await saveCustomer(payload);
      selectCustomer(saved);
      setCustomerModalOpen(false);
      toast.success(editingCustomer ? "Customer updated." : "Customer added.");
      await loadCustomerOptions("");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Unable to save customer.",
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  const validateCustomer = () => {
    if (!selectedCustomer) throw new Error("Please select a B2B customer.");
  };

  /* =====================================================
       DATE
    ===================================================== */

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [invoiceDate, setInvoiceDate] = useState(today);

  useEffect(() => {
    const source = location.state?.proforma;
    if (isProforma || !source) return;
    setSelectedStoreId(String(source.storeId || ""));
    setSelectedCustomer(source.customer || null);
    setCustomerSearch(source.customer?.customerName || "");
    setItems(Array.isArray(source.items) ? source.items : []);
    setBillDiscountPercent(source.billDiscountPercent || 0);
    setDefaultGstType(source.defaultGstType || "CGST_SGST");
    setDefaultGstPercentage(source.defaultGstPercentage ?? 18);
  }, [isProforma, location.state]);

  useEffect(() => {
    if (!isProforma || !proformaEditId) return;
    let live = true;
    getProforma(proformaEditId)
      .then((source) => {
        if (!live) return;
        setSelectedStoreId(String(source.storeId || ""));
        setSelectedCustomer({
          id: source.customerId,
          customerName: source.customerName,
          mobileNumber: source.customerMobile,
          email: source.customerEmail,
          gstin: source.customerGstin,
          gstRegistrationType: source.customerGstRegistrationType,
          state: source.customerState,
        });
        setCustomerSearch(source.customerName || "");
        setItems(
          (source.items || []).map((item) => ({
            ...item,
            quantity: Number(item.quantity),
            sellingPrice: Number(item.unitPrice),
            batchId: null,
          })),
        );
        setBillDiscountPercent(source.billDiscountPercent || 0);
        setReceivedAmount(
            source.receivedAmount != null ? String(source.receivedAmount) : "",
          );
                  setDefaultGstType(source.defaultGstType || "CGST_SGST");
        setDefaultGstPercentage(source.defaultGstPercentage ?? 18);
        setInvoiceDate(source.invoiceDate || today);
      })
      .catch((error) =>
        toast.error(
          error?.response?.data?.message ||
            "Unable to load the proforma for editing.",
        ),
      );
    return () => {
      live = false;
    };
  }, [isProforma, proformaEditId]);

  /* =====================================================
       LOAD EXISTING INVOICE (edit a sale / complete a draft)
    ===================================================== */

  useEffect(() => {
    if (!isExistingInvoice) return;
    let live = true;
    setInvoiceLoading(true);
    setInvoiceEditError("");
    getInvoice(editOrderId)
      .then((source) => {
        if (!live) return;
        if (["CANCELLED", "RETURNED"].includes(source.orderStatus))
          throw new Error("This invoice can no longer be edited.");
        if (
          !source.editToken ||
          (source.items || []).some((item) => !item.inventoryId || !item.batchId)
        )
          throw new Error(
            "This invoice is missing stock references. Its historical stock must be repaired before editing.",
          );
        setIsDraft(source.orderStatus === "DRAFT");
        setOriginalInvoice(source);
        setSelectedStoreId(String(source.storeId));
        setSelectedCustomer({
          customerName: source.customerName,
          mobileNumber: source.phone,
          gstin: source.customerGstin,
          gstRegistrationType:
            source.customerGstRegistrationType || "UNREGISTERED",
          state: source.customerState,
          email: source.customerEmail,
          billingAddress:
            source.billingAddress || source.customerAddress || "",
          shippingAddress: source.shippingAddress || "",
        });
        setSaleSameAsBilling(
          Boolean(source.billingAddress || source.customerAddress) &&
            (source.billingAddress || source.customerAddress) === source.shippingAddress,
        );
        setCustomerSearch(source.customerName || "");
        setItems(invoiceItemsForEdit(source));
        setBillDiscountPercent(Number(source.billDiscountPercentage || 0));
        const first = source.items[0];
        setDefaultGstType(
          first?.gstType?.startsWith("IGST_")
            ? "IGST"
            : first?.gstType === "NONE"
              ? "NONE"
              : "CGST_SGST",
        );
        setDefaultGstPercentage(Number(first?.gstPercentage ?? 18));
        setInvoiceDate(String(source.orderDate || "").split("T")[0]);
        setPaymentStatus(Number(source.balanceAmount) > 0 ? "UNPAID" : "PAID");
        setPaymentMethod("CASH");
        setPaymentReference("");
      })
      .catch((error) => {
        if (live)
          setInvoiceEditError(
            error.response?.data?.message ||
              error.message ||
              "Unable to load invoice.",
          );
      })
      .finally(() => {
        if (live) setInvoiceLoading(false);
      });
    return () => {
      live = false;
    };
  }, [isExistingInvoice, editOrderId]);

  /* =====================================================
       RETURN FROM THE EXCEL IMPORT PAGE
       Restores the bill that was open before the upload and
       merges the rows the import page accepted.
    ===================================================== */

  const handledBillKey = useRef(null);
  useEffect(() => {
    const bill = location.state?.bill;
    if (!bill || isProforma || handledBillKey.current === location.key) return;
    handledBillKey.current = location.key;

    setSelectedStoreId(String(bill.storeId || ""));
    setSelectedCustomer(bill.customer || null);
    setCustomerSearch(bill.customerSearch || "");
    setItems(Array.isArray(bill.items) ? bill.items : []);
    setBillDiscountPercent(bill.billDiscountPercent || 0);
    setDefaultGstType(bill.defaultGstType || "CGST_SGST");
    setDefaultGstPercentage(bill.defaultGstPercentage ?? 18);
    if (bill.invoiceDate) setInvoiceDate(bill.invoiceDate);
    setPaymentStatus(bill.paymentStatus || "PAID");
    setPaymentMethod(bill.paymentMethod || "CASH");
    setPaymentReference(bill.paymentReference || "");

    const incoming = location.state?.salesBulk;
    if (incoming?.preview) {
      applyBulkPreview(incoming.preview, {
        type: bill.defaultGstType || "CGST_SGST",
        percentage: bill.defaultGstPercentage ?? 18,
      });
    }
  }, [isProforma, location.key]);

  /* =====================================================
       CREATE / AMEND INVOICE
    ===================================================== */

  const createInvoice = async (saveAsDraft = false) => {
    /* ---------- amend an existing, completed invoice ---------- */
    if (isInvoiceEdit) {
      if (amendmentBusy.current) return;
      if (!editReason.trim()) {
        setInvoiceEditError("A reason is required to edit this invoice.");
        return;
      }
      if (calcLoading || calcError || !calculation) {
        setInvoiceEditError(
          calcError ||
            "Please wait for the invoice calculation before saving.",
        );
        return;
      }
      const balance = Math.max(
        0,
        Number(calculation.netPayable) - Number(originalInvoice?.paidAmount || 0),
      );
      const collectPayment = paymentStatus === "PAID";
      if (
        collectPayment &&
        balance > 0 &&
        paymentMethod !== "CASH" &&
        !paymentReference.trim()
      ) {
        setInvoiceEditError(
          paymentMethod === "UPI"
            ? "UPI UTR number is required."
            : "Card transaction/reference number is required.",
        );
        return;
      }
      amendmentBusy.current = true;
      setCreatingInvoice(true);
      setInvoiceEditError("");
      let savedInvoice = null;
      try {
        savedInvoice = await amendInvoice(editOrderId, {
          ...buildAmendmentRequest(items),
           receivedAmount: receivedAmount === "" ? null : Number(receivedAmount), 
          ...(collectPayment
            ? {
                payment: {
                  paymentMethod,
                  transactionNumber:
                    paymentMethod === "CASH" ? null : paymentReference.trim(),
                },
              }
            : {}),
        });
        // Keep the saved item IDs and edit token if payment needs a retry.
        setOriginalInvoice(savedInvoice);
        setItems(invoiceItemsForEdit(savedInvoice));
        const remainingBalance = Number(savedInvoice.balanceAmount);
        if (collectPayment && remainingBalance > 0) {
          // Also supports the existing backend used by New Sale.
          await addPayment({
            orderId: Number(editOrderId),
            collectedBy: String(
              user?.name ?? user?.username ?? user?.email ?? user?.id ?? "Admin",
            ),
            payments: [
              {
                amount: remainingBalance,
                paymentMethod,
                transactionNumber:
                  paymentMethod === "CASH" ? null : paymentReference.trim(),
                remarks: null,
                customerTendered:
                  paymentMethod === "CASH" ? remainingBalance : null,
                changeReturn: 0,
              },
            ],
          });
        }
        if (
          collectPayment &&
          !["CANCELLED", "RETURNED"].includes(savedInvoice.orderStatus)
        ) {
          const confirmed = await getInvoice(editOrderId);
          if (
            confirmed.orderStatus !== "PAID" ||
            Number(confirmed.balanceAmount) > 0
          )
            throw new Error(
              "Payment is still pending. Please retry saving the payment.",
            );
        }
        navigate(
          `${isSuperAdmin ? "/owner" : "/store"}/sales/invoice/${editOrderId}`,
          { replace: true },
        );
      } catch (error) {
        if (savedInvoice) {
          try {
            const latest = await getInvoice(editOrderId);
            setOriginalInvoice(latest);
            setItems(invoiceItemsForEdit(latest));
            // A lost response must not cause a second payment on retry.
            if (
              collectPayment &&
              latest.orderStatus === "PAID" &&
              Number(latest.balanceAmount) === 0
            ) {
              navigate(
                `${isSuperAdmin ? "/owner" : "/store"}/sales/invoice/${editOrderId}`,
                { replace: true },
              );
              return;
            }
          } catch {
            /* Keep saved item IDs; show the failure below. */
          }
        }
        const message =
          (typeof error.response?.data === "string"
            ? error.response.data
            : error.response?.data?.message) ||
          error.message ||
          "Unable to update invoice. Reload before retrying.";
        setInvoiceEditError(
          savedInvoice
            ? `Invoice changes are saved. Payment could not be confirmed: ${message}`
            : message,
        );
      } finally {
        amendmentBusy.current = false;
        setCreatingInvoice(false);
      }
      return;
    }

    /* ---------- new sale / draft / proforma ---------- */

    if (creatingInvoice) {
      return;
    }

    if (!selectedStoreId) {
      toast.warning("Please select a store first.");

      return;
    }

    if (items.length === 0) {
      toast.warning("Add at least one product before saving.");

      return;
    }

    // Rejected Excel rows were never added to items. They do not block
    // saving accepted/corrected rows; server recalculation still validates
    // every item actually included in the sale.
    if (customerLoading) {
      toast.info("Please wait for customer verification to finish.");

      return;
    }

    if (calcLoading) {
      toast.info("Please wait for the bill calculation to finish.");

      return;
    }

    if (calcError || !calculation) {
      toast.error(
        calcError ||
          "Bill calculation is not available. Please check the bill before saving.",
      );

      return;
    }

    setCreatingInvoice(true);

    try {
      validateCustomer();

      const payableAmount = Number(
        createdOrderAmount ?? calculation?.netPayable ?? 0,
      );
      if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
        throw new Error("The payable amount must be greater than zero.");
      }
      if (isProforma) {
        const proformaPayload = {
          storeId: Number(selectedStoreId),
          customerId: selectedCustomer.id,
          items: items.map((item) => ({
            inventoryId: item.inventoryId,
            productId: item.productId ?? null,
            localProductId: item.localProductId ?? null,
            quantity: Number(item.quantity),
            unitPrice: Number(item.sellingPrice ?? 0),
            discountPercentage: effectiveDiscountPct(item),
            gstType: toBackendGstType(item.gstType, item.gstPercentage),
            gstPercentage: Number(item.gstPercentage ?? 0),
          })),
          billDiscountPercent: normalizePercentage(billDiscountPercent),
          receivedAmount: receivedAmount === "" ? null : Number(receivedAmount), 
          defaultGstType,
          defaultGstPercentage,
          invoiceDate,
        };
        const saved = proformaEditId
          ? await updateProforma(proformaEditId, proformaPayload)
          : await saveProforma(proformaPayload);
        navigate(
          `${isSuperAdmin ? "/owner" : "/store"}/sales/proforma/${saved.id}`,
          { replace: true },
        );
        return;
      }
      if (
        !saveAsDraft &&
        paymentStatus === "PAID" &&
        paymentMethod !== "CASH" &&
        !paymentReference.trim()
      ) {
        throw new Error(
          paymentMethod === "UPI"
            ? "UPI UTR number is required."
            : "Card transaction/reference number is required.",
        );
      }

      /*
       * FINAL ORDER REQUEST
       * inventoryId MUST be sent here (backend: "Inventory ID is required").
       */

      const orderData = {
        draft: saveAsDraft,
        ...(isDraft
          ? {
              draftId: Number(editOrderId),
              editToken: originalInvoice?.editToken,
            }
          : {}),

        storeId: Number(selectedStoreId),

        customerId: selectedCustomer.id,

        saleType: "B2B",

        customerName: selectedCustomer.customerName.trim(),

        phone: selectedCustomer.mobileNumber.trim(),

        address: (selectedCustomer.billingAddress ?? "").trim(),

        customerGstin: selectedCustomer.gstin ?? null,
        customerGstRegistrationType:
          selectedCustomer.gstRegistrationType ?? "UNREGISTERED",
        customerState: selectedCustomer.state ?? null,
        customerEmail: selectedCustomer.email ?? null,
        billingAddress: selectedCustomer.billingAddress ?? null,
        shippingAddress: selectedCustomer.shippingAddress ?? null,
        placeOfSupply: selectedCustomer.state ?? null,

        paymentMethod: "PENDING",

        invoiceDate,

        billDiscountPercent: normalizePercentage(billDiscountPercent),
        receivedAmount: receivedAmount === "" ? null : Number(receivedAmount),

        items: items.map((item) => ({
          productId: item.productId ?? null,

          /*
           * Local products have productId = null.
           * Send localProductId so the backend can resolve them.
           */
          localProductId: item.localProductId ?? null,

          inventoryId: item.inventoryId,

          batchId: item.batchId ?? null,

          quantity: Number(item.quantity),

          discountPercentage: effectiveDiscountPct(item),

          gstType: toBackendGstType(item.gstType, item.gstPercentage),
        })),
      };

      console.log("Creating invoice with payload:", orderData);

      const response =
        createdOrderId ??
        (location.state?.proforma?.sourceProformaId
          ? await convertProforma(
              location.state.proforma.sourceProformaId,
              orderData,
            )
          : await placeOrder(orderData));

      /*
       * Backend may return: number | { id } | { orderId }
       */

      const orderId = response?.orderId ?? response?.id ?? response;

      if (!orderId) {
        throw new Error(
          "Invoice was created but no order ID was returned by the server.",
        );
      }

      if (saveAsDraft) {
        navigate(`${isSuperAdmin ? "/owner" : "/store"}/sales`, {
          replace: true,
        });
        return;
      }

      setCreatedOrderId(orderId);
      setCreatedOrderAmount(payableAmount);

      if (paymentStatus === "PAID") {
        await addPayment({
          orderId: Number(orderId),
          collectedBy: String(
            user?.name ?? user?.username ?? user?.email ?? user?.id ?? "Admin",
          ),
          payments: [
            {
              amount: payableAmount,
              paymentMethod,
              transactionNumber:
                paymentMethod === "CASH" ? null : paymentReference.trim(),
              remarks: null,
              customerTendered: paymentMethod === "CASH" ? payableAmount : null,
              changeReturn: 0,
            },
          ],
        });
      }

      // Open the saved invoice; printing remains an explicit invoice action.
      navigate(
        `${isSuperAdmin ? "/owner" : "/store"}/sales/invoice/${orderId}`,
        { replace: true },
      );
    } catch (error) {
      console.error("Invoice creation failed:", error);

      const backendMessage =
        (typeof error?.response?.data === "string"
          ? error.response.data
          : null) ||
        error?.response?.data?.message ||
        error?.response?.data?.error;

      const validationErrors = error?.response?.data?.errors;

      let message =
        backendMessage || error?.message || "Unable to create invoice.";

      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        message = validationErrors.join("\n");
      }

      toast.error(message);
    } finally {
      setCreatingInvoice(false);
    }
  };

  useEffect(() => {
    const onKey = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
      if (customerModalOpen || batchModalOpen || addItemOpen) return;
      event.preventDefault();
      createInvoice();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* =====================================================
       RENDER
    ===================================================== */

  if (isExistingInvoice && invoiceLoading)
    return (
      <section className="ns-page">
        <div className="ns-state">Loading invoice for editing...</div>
      </section>
    );

  if (isExistingInvoice && !originalInvoice)
    return (
      <section className="ns-page" role="alert">
        <div className="ns-state">
          <p>{invoiceEditError || "Invoice could not be loaded."}</p>
          <button
            type="button"
            className="ns-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </section>
    );

  const renderStockResult = (product, index, onPick) => {
    const quantity = Number(product.quantity ?? 0);
    const mrp = Number(product.mrp ?? 0);
    const sellingPrice = Number(product.sellingPrice ?? product.price ?? 0);
    const productName =
      product.itemName ?? product.productName ?? product.name ?? "Product";
    const partNumber = product.partNumber ?? "-";

    return (
      <button
        type="button"
        className="ns-result"
        key={product.inventoryId ?? product.productId ?? index}
        disabled={quantity <= 0}
        onClick={() => onPick(product)}
      >
        <div>
          <strong>{productName}</strong>
          <ProductUnitLabel product={product} />
          <span>Part Number: {partNumber}</span>
          <span>Stock: {quantity}</span>
        </div>
        <div>
          <span>MRP {money(mrp)}</span>
          <strong>{money(sellingPrice)}</strong>
        </div>
      </button>
    );
  };

  const billItemCount = items.length;
  const pageTitle = isDraft
    ? "Draft Sale"
    : isInvoiceEdit
      ? "Edit Invoice"
      : isProforma
        ? proformaEditId
          ? "Edit Proforma"
          : "New Proforma"
        : "New Sale";
  const paidAmount = Number(originalInvoice?.paidAmount || 0);
  const netPayable = Number(calculation?.netPayable || 0);

  return (
    <section className="ns-page">
      {/* ============ TOP BAR ============ */}
      <header className="ns-top">
        <h1>{pageTitle}</h1>

        <div className="ns-top-right">
          <div className="ns-store">
            <Store size={15} className="ns-field-icon" color="#f59e0b" />
            {isSuperAdmin ? (
              <select
                className="ns-input ns-has-icon"
                value={selectedStoreId}
                onChange={handleStoreChange}
                disabled={storeLoading || isExistingInvoice}
                aria-label="Store"
              >
                <option value="">
                  {storeLoading ? "Loading..." : "Select store"}
                </option>
                {stores.map((store) => {
                  const storeId = store.id ?? store.storeId;
                  const storeName =
                    store.storeName ?? store.name ?? `Store ${storeId}`;
                  const storeCode = store.storeCode ?? store.code;
                  return (
                    <option key={storeId} value={storeId}>
                      {storeName}
                      {storeCode ? ` (${storeCode})` : ""}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                className="ns-input ns-has-icon"
                readOnly
                value={user?.storeName || "Current Store"}
                aria-label="Store"
              />
            )}
            {storeError && <div className="ns-err">{storeError}</div>}
          </div>

          {isExistingInvoice && (
            <div className="ns-invno">
              <input
                className="ns-input"
                readOnly
                value={originalInvoice?.invoiceNumber || ""}
                placeholder="Invoice No."
                aria-label="Invoice number"
                title="Invoice number"
              />
            </div>
          )}

          <div className="ns-date">
            <Calendar size={15} className="ns-field-icon" color="#1d4ed8" />
            <input
              type="date"
              className="ns-input ns-has-icon"
              value={invoiceDate}
              disabled={isInvoiceEdit}
              onChange={(event) => setInvoiceDate(event.target.value)}
              aria-label="Date"
            />
          </div>

          {!isProforma && !isInvoiceEdit && (
            <>
              <span className="ns-divider" aria-hidden="true" />

              <button
                type="button"
                className="ns-btn tool upload"
                disabled={!selectedStoreId}
                onClick={goToBulkUpload}
                title="Import items from an Excel or CSV file"
              >
                <Upload size={15} />
                Upload Excel
              </button>
            </>
          )}

          <span className="ns-divider" aria-hidden="true" />

          <button
            type="button"
            className="ns-close"
            onClick={() =>
              navigate(isSuperAdmin ? "/owner/sales" : "/store/sales")
            }
            disabled={creatingInvoice}
            aria-label="Exit"
            title="Exit"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="ns-body">
        {invoiceEditError && (
          <div className="ns-alert" role="alert">
            {invoiceEditError}
          </div>
        )}

        {/* ============ CUSTOMER BAR ============ */}
       <div className="ns-customer">
  <div className="ns-combo">
    <Search size={14} className="ns-search-icon" />
    <input
      type="text"
      className="ns-input ns-search-input"
      value={customerSearch}
      placeholder={
        selectedStoreId ? "Search customer name..." : "Select store first"
      }
      disabled={!selectedStoreId || isInvoiceEdit}
      onFocus={() => {
        setCustomerDropdownOpen(true);
        loadCustomerOptions(customerSearch);
      }}
      onChange={(event) => {
        const value = event.target.value;
        setCustomerSearch(value);
        setSelectedCustomer(null);
        setCustomerDropdownOpen(true);
        loadCustomerOptions(value);
      }}
    />

    {customerDropdownOpen && (
      <div className="ns-options">
        <button
          type="button"
          className="ns-new-opt"
          onClick={() => openCustomerModal()}
        >
          <Plus size={14} /> New Party / Customer
        </button>
        {customerLoading ? (
          <span>Searching...</span>
        ) : customerResults.length === 0 ? (
          <span>No customers found for this store.</span>
        ) : (
          customerResults.map((customer) => (
            <button
              type="button"
              key={customer.id}
              onClick={() => selectCustomer(customer)}
            >
              <strong>{customer.customerName}</strong>
              <small>
                {customer.mobileNumber}
                {customer.gstin ? ` · ${customer.gstin}` : ""}
                {customer.balanceAmount != null
                  ? ` · Balance ${money(customer.balanceAmount)}`
                  : ""}
              </small>
            </button>
          ))
        )}
      </div>
    )}
  </div>

  <input
    className="ns-input ns-phone"
    value={selectedCustomer?.mobileNumber || ""}
    readOnly
    placeholder="Phone (auto-filled)"
    aria-label="Phone number"
  />

  {!isProforma && (
  <>
    <input
      className="ns-input ns-addr"
      value={selectedCustomer?.billingAddress ?? ""}
      placeholder="Billing address"
      disabled={!selectedCustomer || isInvoiceEdit}
      onChange={(event) =>
        updateSaleAddress("billingAddress", event.target.value)
      }
      aria-label="Billing address"
    />

    <div className="ns-addr-wrap">
      <input
        className="ns-input ns-addr"
        value={selectedCustomer?.shippingAddress ?? ""}
        placeholder="Shipping address"
        disabled={!selectedCustomer || isInvoiceEdit || saleSameAsBilling}
        onChange={(event) =>
          updateSaleAddress("shippingAddress", event.target.value)
        }
        aria-label="Shipping address"
      />
      <label className="ns-same">
        <input
          type="checkbox"
          checked={saleSameAsBilling}
          disabled={!selectedCustomer || isInvoiceEdit}
          onChange={(event) => handleSaleSameAsBilling(event.target.checked)}
        />
        Same as billing
      </label>
    </div>
  </>
)}

  <button
    type="button"
    className="ns-btn soft"
    disabled={!selectedCustomer || isInvoiceEdit}
    onClick={() => openCustomerModal(selectedCustomer)}
    title={
      selectedCustomer
        ? "Edit customer and addresses"
        : "Select a customer first"
    }
  >
    <Pencil size={13} /> Edit Customer / Addresses
  </button>
</div>

        {/* ============ BILL ITEMS ============ */}
        <section className="ns-panel">
          <div className="ns-items-head">
            <div className="ns-items-title">
              <h2>Bill Items</h2>
              <span className="ns-badge">{billItemCount} item(s)</span>
            </div>
          </div>

          {bulkSalePreview && (
            <div
              className={`ns-bulk ${bulkSalePreview.invalidRows > 0 ? "has-errors" : ""}`}
            >
              <div className="ns-bulk-head">
                <strong>{bulkSalePreview.totalRows} rows uploaded</strong>
                <span>
                  {bulkSalePreview.validRows} valid ·{" "}
                  {bulkSalePreview.invalidRows} invalid
                </span>
              </div>
              {bulkSalePreview.invalidRows > 0 && (
                <>
                  <p>
                    Rejected rows are excluded from this bill. Valid rows can be
                    saved. Upload corrections to add them; previously accepted
                    items are kept.
                  </p>
                  <div className="ns-bulk-errors">
                    {(bulkSalePreview.rows || [])
                      .filter((row) => !row.valid)
                      .map((row) => (
                        <p key={`${row.rowNumber}-${row.partNumber}`}>
                          <strong>
                            Row {row.rowNumber}
                            {row.partNumber ? ` · ${row.partNumber}` : ""}
                          </strong>
                          <span>{(row.errors || []).join(". ")}</span>
                        </p>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="ns-table-wrap">
            <table className="ns-table">
              <colgroup>
                {[3.5, 11, 13, 5, 7, 9.5, 10, 9, 9, 8, 9, 6].map((w, i) => (
                  <col key={i} style={{ width: `${w}%` }} />
                ))}
              </colgroup>
              <thead>
              <tr>
                <th rowSpan={2}>S.No</th>
                <th rowSpan={2}>Part Number</th>
                <th rowSpan={2}>Part Name</th>
                <th rowSpan={2} className="num">Qty</th>
                <th rowSpan={2} className="num">MRP</th>
                <th rowSpan={2} className="num">Price / Unit</th>
               <th rowSpan={2} className="ctr">
                <div className="ns-disc-head">
                  <span>Discount</span>
                  <DiscountTypeMenu value={discountType} onChange={setDiscountType} />
                </div>
              </th>
                <th rowSpan={2} className="num">Taxable Value</th>
                <th colSpan={2} className="ctr">GST</th>
                <th rowSpan={2} className="num">Total</th>
                <th rowSpan={2} className="ctr">Actions</th>
              </tr>
              <tr>      
                  <th>
                    <select
                      className="ns-th-select"
                      value={
                        defaultGstType === "NONE"
                          ? "NONE:0"
                          : `${defaultGstType}:${defaultGstPercentage}`
                      }
                      onChange={(event) =>
                        handleDefaultGstChange(event.target.value)
                      }
                      aria-label="Tax type and GST rate"
                    >
                      <optgroup label="GST (CGST + SGST)">
                        {GST_PERCENTAGES.filter((p) => p > 0).map((p) => (
                          <option key={`g${p}`} value={`CGST_SGST:${p}`}>
                            GST {p}%
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="IGST">
                        {GST_PERCENTAGES.filter((p) => p > 0).map((p) => (
                          <option key={`i${p}`} value={`IGST:${p}`}>
                            IGST {p}%
                          </option>
                        ))}
                      </optgroup>
                      <option value="NONE:0">No Tax</option>
                    </select>
                  </th>
                  <th className="num">Amount</th>
                </tr>
              </thead>

              <tbody>
                {displayRows.map(
                  ({ item, itemIndex, line, allocationIndex }, index) => {
                    const rowQty =
                      Number(line?.quantity ?? item.quantity ?? 0) || 0;
                    const unitPrice = Number(
                      line?.sellingPrice ?? item.sellingPrice ?? 0,
                    );
                    const shownPrice = unitPrice;
                    const discountPct = effectiveDiscountPct(item);
                    const discountBase = unitPrice * rowQty;
                    const discountAmt = lineDiscountAmount(item, unitPrice, rowQty);
                    const rowTaxable = Number(
                      line?.taxableAmount ?? item.taxableAmount ?? 0,
                    );
                    const rowTotal = Number(
                      line?.lineTotal ?? item.lineTotal ?? 0,
                    );
                    const rowGstAmount = line
                      ? Math.max(0, rowTotal - rowTaxable)
                      : 0;
                    const mrpRange =
                      line &&
                      line.maxMrp != null &&
                      line.maxMrp !== line.mrp;
                    const priceRange =
                      line &&
                      line.maxSellingPrice != null &&
                      line.maxSellingPrice !== line.sellingPrice;
                    const lockedLine = isInvoiceEdit && Boolean(item.orderItemId);

                    return (
                      <tr
                        key={`${item.inventoryId}-${line?.batchId ?? item.batchId ?? "pending"}-${itemIndex}-${allocationIndex}`}
                      >
                        <td>{index + 1}</td>
                        <td className="ns-part">{item.partNumber}</td>
                        <td className="ns-strong ns-name">
                          {item.itemName}
                          <ProductUnitLabel product={item} />
                        </td>
                        <td className="num">
                          <input
                            type="number"
                            min="1"
                            max={item.availableQuantity}
                            className="ns-cell-input"
                            key={`${line?.batchId ?? "pending"}-${line?.quantity ?? item.quantity}`}
                            defaultValue={line?.quantity ?? item.quantity}
                            disabled={creatingInvoice}
                            onFocus={(event) => event.currentTarget.select()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter")
                                event.currentTarget.blur();
                            }}
                            onBlur={(event) => {
                              const entered = Number(event.target.value);
                              if (
                                Number.isFinite(entered) &&
                                entered >
                                  Number(item.availableQuantity ?? Infinity)
                              ) {
                                toast.warning(
                                  `Only ${item.availableQuantity} in stock for ${item.partNumber}.`,
                                );
                              }
                              if (line && !isInvoiceEdit) {
                                updateAllocatedQuantity(
                                  itemIndex,
                                  line.quantity,
                                  event.target.value,
                                );
                              } else {
                                updateItemQuantity(
                                  itemIndex,
                                  event.target.value,
                                );
                                finishItemQuantityEdit(itemIndex);
                              }
                            }}
                            aria-label={`Quantity for ${item.partNumber}`}
                          />
                        </td>
                        <td className="num">
                          {isInvoiceEdit ? (
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              className="ns-cell-input"
                              key={`mrp-${itemIndex}-${item.mrp}`}
                              defaultValue={item.mrp}
                              disabled={creatingInvoice}
                              onFocus={(event) => event.currentTarget.select()}
                              onKeyDown={(event) => {
                                if (event.key === "Enter")
                                  event.currentTarget.blur();
                              }}
                              onBlur={(event) =>
                                updateItemField(
                                  itemIndex,
                                  "mrp",
                                  event.target.value,
                                )
                              }
                              aria-label={`MRP for ${item.partNumber}`}
                            />
                          ) : mrpRange ? (
                            `${money(line.mrp)}–${money(line.maxMrp)}`
                          ) : (
                            money(line?.mrp ?? item.mrp)
                          )}
                        </td>
                        <td className="num">
                          {isInvoiceEdit ? (
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              className="ns-cell-input"
                              key={`price-${itemIndex}-${item.sellingPrice}`}
                              defaultValue={item.sellingPrice}
                              disabled={creatingInvoice}
                              title="Unit price (excluding tax)"
                              onFocus={(event) => event.currentTarget.select()}
                              onKeyDown={(event) => {
                                if (event.key === "Enter")
                                  event.currentTarget.blur();
                              }}
                              onBlur={(event) =>
                                updateItemField(
                                  itemIndex,
                                  "sellingPrice",
                                  event.target.value,
                                )
                              }
                              aria-label={`Unit price for ${item.partNumber}`}
                            />
                          ) : priceRange ? (
                            `${money(line.sellingPrice)}–${money(line.maxSellingPrice)}`
                          ) : (
                            money(shownPrice)
                          )}
                        </td>
                        <td className="num">
                        {discountType === "PERCENT" ? (
                          <input
                            type="number" min="0" max="100" step="0.01"
                            className="ns-cell-input"
                            key={`pct-${itemIndex}-${discountPct.toFixed(2)}`}
                            defaultValue={Number(discountPct.toFixed(2))}
                            onFocus={(e) => e.currentTarget.select()}
                            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                            onBlur={(e) => updateItemDiscountPercent(itemIndex, e.target.value)}
                            aria-label="Discount percentage"
                          />
                        ) : (
                          <input
                            type="number" min="0" step="0.01"
                            className="ns-cell-input"
                            key={`amt-${itemIndex}-${discountAmt.toFixed(2)}`}
                            defaultValue={Number(discountAmt.toFixed(2))}
                            onFocus={(e) => e.currentTarget.select()}
                            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                            onBlur={(e) =>
                              updateItemDiscountAmount(itemIndex, e.target.value, discountBase)
                            }
                            aria-label="Discount amount"
                          />
                        )}
                      </td>
                        <td className="num">
                          {line ? money(rowTaxable) : "—"}
                        </td>
                        <td className="num">
                          {item.gstType === "NONE" ? (
                            "No Tax"
                          ) : (
                            <>
                              {item.gstPercentage}%
                              <small className="ns-sub">
                                {item.gstType === "IGST"
                                  ? "IGST"
                                  : "CGST + SGST"}
                              </small>
                            </>
                          )}
                        </td>
                        <td className="num">{money(rowGstAmount)}</td>
                        <td className="num ns-strong">
                          {line ? money(rowTotal) : "—"}
                        </td>
                        <td className="ctr">
                          <button
                            type="button"
                            className="ns-del"
                            onClick={() => removeItem(itemIndex)}
                            disabled={lockedLine}
                            title={
                              lockedLine
                                ? "Saved items cannot be deleted from a completed invoice"
                                : "Remove item"
                            }
                            aria-label="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  },
                )}

                {/* Search rows: type a part number, name or brand right here */}
                {blankRows.map((row) => (
                  <tr key={`blank-${row.id}`} className="ns-search-row">
                    <td className="ctr ns-add-icon">
                      <Plus size={14} />
                    </td>
                    <td colSpan={2}>
                      <div className="ns-cell-search">
                        <Search size={14} />
                        <input
                          data-part-row={row.id}
                          value={row.partNumber}
                          placeholder={
                            selectedStoreId
                              ? "Add item: search by part number, name or brand..."
                              : "Select a store first"
                          }
                          autoComplete="off"
                          onChange={(event) =>
                            handleBlankRowSearch(
                              row.id,
                              event.target.value,
                              event.currentTarget,
                            )
                          }
                          onFocus={(event) => {
                            if (!selectedStoreId) return;
                            const box = event.currentTarget.getBoundingClientRect();
                            setRowSearch((current) =>
                              current?.rowId === row.id
                                ? current
                                : {
                                    rowId: row.id,
                                    left: box.left,
                                    top: box.bottom + 4,
                                    width: Math.max(box.width, 380),
                                    results: [], loading: false, error: "", idle: true,
                                  },
                            );
                          }}
                          onBlur={() => setRowSearch(null)}
                          aria-label="Search product by part number, name or brand"
                        />
                      </div>
                    </td>
                    <td className="ctr">
                      {blankRows.length > 1 && (
                        <button
                          type="button"
                          className="ns-del"
                          onClick={() => removeBlankRow(row.id)}
                          aria-label="Remove row"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              {displayRows.length > 0 && (
                <tfoot>
                 <tr>
                    <td colSpan={3}>TOTAL</td>
                    <td className="num">{totals.qty}</td>
                    <td className="num">{money(totals.mrp)}</td>
                    <td className="num">{money(totals.price)}</td>
                    <td className="num">{money(totals.discount)}</td>
                    <td className="num">{money(totals.taxable)}</td>
                    <td />
                    <td className="num">{money(gstTotal)}</td>
                    <td className="num">{money(totals.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="ns-table-foot">
            <button type="button" className="ns-add-row" onClick={addBlankRow}>
              + ADD ROW
            </button>
          </div>
        </section>

        {/* ============ PAYMENT / OVERALL DISCOUNT / EDIT REASON ============ */}
        <div className="ns-bottom">
          <div className="ns-bottom-left">
            {!isProforma && (
              <div className="ns-payment">
                <h2>Payment</h2>

                {isInvoiceEdit && (
                  <p className="ns-payment-note">
                    Already collected: {money(paidAmount)}. Select Paid to
                    collect the remaining balance when you save. Existing
                    payments are retained.
                  </p>
                )}

                <div
                  className="ns-seg"
                  role="group"
                  aria-label="Payment status"
                >
                  {["PAID", "UNPAID"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={paymentStatus === status ? "active" : ""}
                      onClick={() => setPaymentStatus(status)}
                      disabled={creatingInvoice || Boolean(createdOrderId)}
                    >
                      {status === "PAID" ? "Paid" : "Unpaid"}
                    </button>
                  ))}
                </div>

                {paymentStatus === "PAID" && (
                  <div
                    className="ns-seg"
                    role="group"
                    aria-label="Payment mode"
                  >
                    {[
                      ["CASH", "Cash"],
                      ["UPI", "UPI"],
                      ["CARD", "Card"],
                    ].map(([method, label]) => (
                      <button
                        key={method}
                        type="button"
                        className={paymentMethod === method ? "active" : ""}
                        onClick={() => {
                          setPaymentMethod(method);
                          setPaymentReference("");
                        }}
                        disabled={creatingInvoice || Boolean(createdOrderId)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {paymentStatus === "PAID" && paymentMethod !== "CASH" && (
                  <input
                    className="ns-input"
                    value={paymentReference}
                    maxLength={100}
                    onChange={(event) =>
                      setPaymentReference(event.target.value)
                    }
                    aria-label={
                      paymentMethod === "UPI"
                        ? "UTR number"
                        : "Card transaction/reference number"
                    }
                    placeholder={
                      paymentMethod === "UPI"
                        ? "Enter UPI UTR number"
                        : "Enter card reference number"
                    }
                  />
                )}

                {createdOrderId && (
                  <p className="ns-payment-note">
                    Sale #{createdOrderId} was created and stock was deducted.
                    Correct the payment details and save again; a second sale
                    will not be created.
                  </p>
                )}
              </div>
            )}

            {isDraft && (
              <p className="ns-payment-note">
                Draft: stock is deducted only when you complete this sale.
              </p>
            )}

            {isInvoiceEdit && (
              <div className="ns-edit">
                <label htmlFor="invoice-edit-reason">
                  Reason for invoice edit <span aria-hidden="true">*</span>
                </label>
                <textarea
                  id="invoice-edit-reason"
                  required
                  maxLength={500}
                  disabled={creatingInvoice}
                  value={editReason}
                  onChange={(event) => {
                    setEditReason(event.target.value);
                    setInvoiceEditError("");
                  }}
                />
                <p className="ns-payment-note">
                  Collected: {money(paidAmount)}. Existing payments are
                  retained.
                </p>
                {paidAmount > netPayable && (
                  <p className="ns-payment-note refund">
                    Refund due: {money(paidAmount - netPayable)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="ns-bottom-right">
            <div className="ns-overall">
              <label htmlFor="ns-overall-discount">Overall Discount</label>
              <div className="ns-overall-input">
                <input
                  id="ns-overall-discount"
                  className="ns-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={billDiscountPercent}
                  onChange={(event) =>
                    handleBillDiscountChange(event.target.value)
                  }
                />
                <span>%</span>
              </div>
            </div>
            
                <div className="ns-overall">
                  <label htmlFor="ns-received-amount">Received Amount</label>
                  <div className="ns-overall-input">
                    <span>₹</span>
                    <input
                      id="ns-received-amount"
                      className="ns-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      disabled={creatingInvoice || Boolean(createdOrderId)}
                    />
                  </div>
                </div>
          </div>
        </div>
      </div>

      {/* ============ FOOTER: BILL SUMMARY (left) + SAVE (right) ============ */}
      <div className="ns-actions">
        <div className="ns-foot-left">
          <div className="ns-eq" aria-label="Bill summary">
            <div className="ns-term" style={{ "--accent": "#64748b" }}>
              <span>Taxable amount</span>
              <strong>{money(calculation?.taxableAmount)}</strong>
            </div>

            {defaultGstType === "IGST" ? (
              <>
                <b className="ns-op">+</b>
                <div className="ns-term" style={{ "--accent": "#2563eb" }}>
                  <span>IGST</span>
                  <strong>{money(calculation?.igst)}</strong>
                </div>
              </>
            ) : defaultGstType === "CGST_SGST" ? (
              <>
                <b className="ns-op">+</b>
                <div className="ns-term" style={{ "--accent": "#2563eb" }}>
                  <span>CGST</span>
                  <strong>{money(calculation?.cgst)}</strong>
                </div>
                <b className="ns-op">+</b>
                <div className="ns-term" style={{ "--accent": "#7c3aed" }}>
                  <span>SGST</span>
                  <strong>{money(calculation?.sgst)}</strong>
                </div>
              </>
            ) : null}

            {Number(billDiscountPercent) > 0 && (
              <>
                <b className="ns-op">−</b>
                <div className="ns-term" style={{ "--accent": "#16a34a" }}>
                  <span>Bill discount ({billDiscountPercent}%)</span>
                  <strong>{money(calculation?.billDiscount)}</strong>
                </div>
              </>
            )}

            <b className="ns-op">{roundOffValue < 0 ? "−" : "+"}</b>
            <div className="ns-term" style={{ "--accent": "#d97706" }}>
              <span>Round off</span>
              <strong>{money(Math.abs(roundOffValue))}</strong>
            </div>

            <b className="ns-op">=</b>
            <div className="ns-term grand">
              <span>Grand total</span>
              <strong>{money(calculation?.netPayable)}</strong>
            </div>
          </div>

          {(calcLoading ||
            (!calculation && items.length > 0 && !calcError)) && (
            <em className="ns-foot-note">Calculating...</em>
          )}
          {calcError && <em className="ns-foot-note error">{calcError}</em>}
        </div>

        <div className="ns-foot-right">
          {!isProforma && !isInvoiceEdit && !createdOrderId && (
            <button
              type="button"
              className="ns-btn"
              disabled={creatingInvoice}
              onClick={() => createInvoice(true)}
            >
              Save Draft
            </button>
          )}

          <button
            type="button"
            className="ns-btn primary"
            onClick={() => createInvoice()}
            disabled={creatingInvoice}
          >
            {creatingInvoice ? (
              <Loader2 size={14} className="ns-spin" />
            ) : isInvoiceEdit ? (
              "Save Invoice Changes"
            ) : isProforma ? (
              proformaEditId ? (
                "Update Proforma"
              ) : (
                "⚡ Save Proforma"
              )
            ) : isDraft ? (
              "Complete Sale"
            ) : (
              "⚡ Save Sale"
            )}
          </button>
        </div>
      </div>

      {/* ============ TOASTS ============ */}
      <div className="ns-toasts" aria-live="polite">
        {toasts.map((entry) => {
          const Icon =
            entry.type === "success"
              ? CheckCircle2
              : entry.type === "error"
                ? AlertCircle
                : entry.type === "warning"
                  ? AlertTriangle
                  : Info;
          return (
            <div
              key={entry.id}
              className={`ns-toast ${entry.type}`}
              role={entry.type === "error" ? "alert" : "status"}
            >
              <Icon size={16} className="ns-toast-ico" />
              <span className="ns-toast-msg">{entry.text}</span>
              <button
                type="button"
                onClick={() => dismissToast(entry.id)}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* ============ IN-TABLE ROW SEARCH DROPDOWN ============ */}
      {rowSearch && (
        <div
          className="ns-results fixed"
          style={{
            left: rowSearch.left,
            top: rowSearch.top,
            width: rowSearch.width,
          }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <button
            type="button"
            className="ns-add-item-opt"
            disabled={!selectedStoreId}
            onClick={openAddItem}
          >
            <Plus size={14} /> Add Item
          </button>
          {rowSearch.idle ? (
            <div className="ns-msg">Type at least 2 characters to search.</div>
          ) : rowSearch.loading ? (
            <div className="ns-msg">Searching...</div>
          ) : rowSearch.error ? (
            <div className="ns-msg error">{rowSearch.error}</div>
          ) : rowSearch.results.length === 0 ? (
            <div className="ns-msg">No available products found.</div>
          ) : (
            rowSearch.results.map((product, index) =>
              renderStockResult(product, index, (picked) =>
                handleAddProduct(picked, rowSearch.rowId),
              ),
            )
          )}
        </div>
      )}

      {/* ============ CUSTOMER & ADDRESS MODAL ============ */}
      {customerModalOpen && (
        <div className="ns-overlay" role="dialog" aria-modal="true">
          <div className="ns-modal">
            <div className="ns-modal-head">
              <div>
                <h2>Customer Information &amp; Addresses</h2>
                <p>
                  {editingCustomer ? "Update" : "Add"} B2B customer details for
                  the selected store
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className="ns-form">
              <label>
                Customer Name *
                <input
                  className="ns-input"
                  value={customerForm.customerName}
                  onChange={(event) =>
                    handleCustomerFormChange("customerName", event.target.value)
                  }
                />
              </label>
              <label>
                Phone Number *
                <input
                  className="ns-input"
                  value={customerForm.mobileNumber}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    handleCustomerFormChange(
                      "mobileNumber",
                      event.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                />
              </label>

              <label>
                GST Registration Type
                <select
                  className="ns-input"
                  value={customerForm.gstRegistrationType}
                  onChange={(event) =>
                    handleCustomerFormChange(
                      "gstRegistrationType",
                      event.target.value,
                    )
                  }
                >
                  <option value="UNREGISTERED">Unregistered</option>
                  <option value="REGISTERED">Registered</option>
                </select>
              </label>
              <label>
                {customerForm.gstRegistrationType !== "UNREGISTERED"
                  ? "GSTIN *"
                  : "GSTIN (Optional)"}
                <input
                  className="ns-input"
                  value={customerForm.gstin}
                  maxLength={15}
                  disabled={customerForm.gstRegistrationType === "UNREGISTERED"}
                  onChange={(event) =>
                    handleCustomerFormChange(
                      "gstin",
                      event.target.value
                        .toUpperCase()
                        .replace(/[^0-9A-Z]/g, ""),
                    )
                  }
                />
              </label>

              <label>
                Email (Optional)
                <input
                  className="ns-input"
                  type="email"
                  value={customerForm.email}
                  onChange={(event) =>
                    handleCustomerFormChange("email", event.target.value)
                  }
                />
              </label>
              <label>
                State
                <input
                  className="ns-input"
                  value={customerForm.state}
                  onChange={(event) =>
                    handleCustomerFormChange("state", event.target.value)
                  }
                />
              </label>

              {!isProforma && (
  <>
    <label>
      Billing Address
      <textarea
        value={customerForm.billingAddress}
        onChange={(event) =>
          handleCustomerFormChange(
            "billingAddress",
            event.target.value,
          )
        }
      />
    </label>
    <label>
      Shipping Address
      <textarea
        value={customerForm.shippingAddress}
        disabled={sameAsBilling}
        onChange={(event) =>
          handleCustomerFormChange(
            "shippingAddress",
            event.target.value,
          )
        }
      />
    </label>

    <label className="ns-check">
      <input
        type="checkbox"
        checked={sameAsBilling}
        onChange={(event) =>
          handleSameAsBilling(event.target.checked)
        }
      />
      Same as Billing Address
    </label>
  </>
)}
            </div>

            <div className="ns-modal-foot">
              <button
                type="button"
                className="ns-btn"
                onClick={() => setCustomerModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ns-btn primary"
                disabled={savingCustomer}
                onClick={handleSaveB2BCustomer}
              >
                {savingCustomer ? "Saving..." : "Save Customer Details"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ BATCH MODAL (invoice edit, multiple batches) ============ */}
      {batchModalOpen && (
        <div className="ns-overlay">
          <div className="ns-modal">
            <div className="ns-modal-head">
              <div>
                <h2>Select Batch</h2>
                <p>{selectedProductForBatch?.itemName ?? "Product"}</p>
              </div>
              <button
                type="button"
                onClick={closeBatchSelector}
                aria-label="Close batch selector"
              >
                <X size={17} />
              </button>
            </div>
            <div className="ns-batch-list">
              {availableBatches.map((batch) => {
                const selected =
                  String(selectedBatchId) === String(batch.batchId ?? batch.id);
                return (
                  <button
                    type="button"
                    key={batch.batchId ?? batch.id}
                    className={`ns-batch-opt ${selected ? "selected" : ""}`}
                    onClick={() =>
                      setSelectedBatchId(batch.batchId ?? batch.id)
                    }
                  >
                    <div>
                      <strong>
                        {batch.batchNumber ?? batch.batchNo ?? batch.id}
                      </strong>
                      {(batch.recommended || batch.fifo || batch.isFifo) && (
                        <span className="ns-fifo">FIFO</span>
                      )}
                    </div>
                    <span>
                      Available: {Number(batch.availableQuantity ?? 0)}
                    </span>
                    <span>MRP: {money(batch.mrp)}</span>
                    <span>
                      Selling:{" "}
                      {money(
                        batch.sellingPrice ?? batch.sellingPriceAmount ?? 0,
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="ns-modal-foot">
              <button
                type="button"
                className="ns-btn"
                onClick={closeBatchSelector}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ns-btn primary"
                disabled={!selectedBatchId || batchLoading}
                onClick={confirmBatchSelection}
              >
                Select Batch
              </button>
            </div>
          </div>
        </div>
      )}
      {addItemOpen &&
  createPortal(
    <>
      <div
        className="stock-drawer-overlay"
        onClick={() => setAddItemOpen(false)}
        aria-hidden="true"
      />
      <aside
        className="stock-drawer stock-drawer--wide"
        role="dialog"
        aria-modal="true"
        aria-label="Add Item"
      >
        <header className="stock-drawer-header">
          <div>
            <span className="stock-drawer-eyebrow">Inventory</span>
            <h2 className="stock-drawer-title">Add Item</h2>
          </div>
          <button
            type="button"
            className="stock-drawer-close"
            onClick={() => setAddItemOpen(false)}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="stock-drawer-body stock-drawer-body--embedded">
          <OpeningStockManualEntry
            compact
            storeId={selectedStoreId || null}
            validatePrices={defaultValidatePrices}
            onCreated={handleItemCreated}
            onSelectApproved={() => setAddItemOpen(false)}
          />
        </div>
      </aside>
    </>,
    document.body,
  )}
    </section>
  );
}
