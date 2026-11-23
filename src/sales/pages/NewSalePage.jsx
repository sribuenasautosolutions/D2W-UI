import api from "../../services/api";
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
  calculateProformaPreview,
} from "../../services/proformaService";

import {
  AlertCircle, AlertTriangle, Calendar, CheckCircle2, Clock,
  ChevronDown, IndianRupee, Info, Loader2, Pencil, Percent,
  Plus, RotateCcw, Search, Store, Trash2, Upload, X,
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
  getCustomerByMobile,
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
    _rowId: `edit-row-${item.orderItemId || item.inventoryId || Math.random().toString(36).slice(2, 7)}`,
    itemName: item.itemName || item.productName,
    brandName: item.brandName || item.brand || "",
    brand: item.brandName || item.brand || "",
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
  if (!item) return 0;
  if (item.discountMode === "AMOUNT") {
    const base = Number(item.sellingPrice || 0) * Number(item.quantity || 1);
    if (!(base > 0)) return 0;
    const amt = Number(item.discountAmount ?? item.discountValue ?? 0);
    return normalizePercentage((amt / base) * 100);
  }
  return normalizePercentage(item.discountPercentage ?? item.discountValue ?? 0);
};

/* Discount value (without tax) for a given unit price and quantity. */
const lineDiscountAmount = (item, unitPrice, quantity) => {
  if (item?.discountMode === "AMOUNT") {
    return Number(item.discountAmount ?? item.discountValue ?? 0);
  }
  return (
    (Number(unitPrice || 0) *
      Number(quantity || 0) *
      effectiveDiscountPct(item)) /
    100
  );
};

const normalizeGstPercentage = (value) => {
  const number = Number(value);

  if (GST_PERCENTAGES.includes(number)) {
    return number;
  }

  return 0;
};

const normalizePartNumber = (val) =>
  String(val || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

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
const SALE_TABLE_COLUMNS = [
  { id: "sNo", index: 0, label: "S.No", defaultWidth: 50, minWidth: 40, maxWidth: 90 },
  { id: "partNumber", index: 1, label: "Part Number", defaultWidth: 150, minWidth: 90, maxWidth: 380 },
  { id: "itemName", index: 2, label: "Part Name", defaultWidth: 180, minWidth: 110, maxWidth: 500 },
  { id: "brandName", index: 3, label: "Brand", defaultWidth: 130, minWidth: 70, maxWidth: 300 },
  { id: "quantity", index: 4, label: "Qty", defaultWidth: 70, minWidth: 45, maxWidth: 160 },
  { id: "mrp", index: 5, label: "MRP", defaultWidth: 90, minWidth: 60, maxWidth: 220 },
  { id: "sellingPrice", index: 6, label: "Price / Unit", defaultWidth: 100, minWidth: 70, maxWidth: 240 },
  { id: "discountPercent", index: 7, label: "Disc %", defaultWidth: 75, minWidth: 50, maxWidth: 160 },
  { id: "discountAmount", index: 8, label: "Disc (₹)", defaultWidth: 85, minWidth: 55, maxWidth: 180 },
  { id: "taxable", index: 9, label: "Taxable", defaultWidth: 100, minWidth: 70, maxWidth: 260 },
  { id: "gstType", index: 10, label: "GST Rate", defaultWidth: 110, minWidth: 80, maxWidth: 240 },
  { id: "gstAmount", index: 11, label: "GST Amount", defaultWidth: 95, minWidth: 65, maxWidth: 220 },
  { id: "total", index: 12, label: "Total", defaultWidth: 110, minWidth: 80, maxWidth: 280 },
  { id: "actions", index: 13, label: "Actions", defaultWidth: 55, minWidth: 40, maxWidth: 90, resizable: false },
];

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
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [paymentReference, setPaymentReference] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
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
       COLUMN RESIZING (Excel-Style with minWidth & maxWidth)
    ===================================================== */
  const storageKey = "d2w_newsale_col_widths_v3";

  const [colWidths, setColWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === SALE_TABLE_COLUMNS.length) {
          return parsed.map((w, idx) => {
            const col = SALE_TABLE_COLUMNS[idx];
            if (!col) return w;
            return Math.max(col.minWidth, Math.min(col.maxWidth, Number(w) || col.defaultWidth));
          });
        }
      }
    } catch {
      // ignore
    }
    return SALE_TABLE_COLUMNS.map((col) => col.defaultWidth);
  });

  const hasCustomWidths = useMemo(() => {
    return SALE_TABLE_COLUMNS.some(
      (col, idx) => colWidths[idx] != null && colWidths[idx] !== col.defaultWidth
    );
  }, [colWidths]);

  const startColResize = useCallback(
    (colIndex, e) => {
      e.preventDefault();
      e.stopPropagation();

      const col = SALE_TABLE_COLUMNS[colIndex];
      if (!col || col.resizable === false) return;

      const startX = e.clientX;
      const startWidth = colWidths[colIndex] || col.defaultWidth;
      const minW = col.minWidth || 40;
      const maxW = col.maxWidth || 500;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMouseMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(minW, Math.min(maxW, Math.round(startWidth + delta)));
        setColWidths((prev) => {
          const next = [...prev];
          next[colIndex] = newWidth;
          return next;
        });
      };

      const handleMouseUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);

        setColWidths((latest) => {
          try {
            localStorage.setItem(storageKey, JSON.stringify(latest));
          } catch {
            /* ignore */
          }
          return latest;
        });
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [colWidths]
  );

  const resetColumn = useCallback((colIndex) => {
    const col = SALE_TABLE_COLUMNS[colIndex];
    if (!col) return;
    setColWidths((prev) => {
      const next = [...prev];
      next[colIndex] = col.defaultWidth;
      const allMatchDefaults = SALE_TABLE_COLUMNS.every(
        (c, idx) => next[idx] === c.defaultWidth
      );
      try {
        if (allMatchDefaults) {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  }, []);

  const resetAllColumns = useCallback(() => {
    const defaults = SALE_TABLE_COLUMNS.map((col) => col.defaultWidth);
    setColWidths(defaults);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    toast?.info?.("Column widths reset to default");
  }, [toast]);

  const renderResizer = (colIndex) => {
    const col = SALE_TABLE_COLUMNS[colIndex];
    if (!col || col.resizable === false) return null;
    return (
      <span
        className="ns-col-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${col.label} column (double-click to reset)`}
        title={`Drag to resize (${col.minWidth}px - ${col.maxWidth}px, double-click to reset)`}
        onMouseDown={(e) => startColResize(colIndex, e)}
        onDoubleClick={() => resetColumn(colIndex)}
      />
    );
  };

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
    let live = true;
    const loadStores = async () => {
      setStoreLoading(true);
      setStoreError("");

      try {
        const response = await getAllStores();
        if (!live) return;

        const data = Array.isArray(response)
          ? response
          : Array.isArray(response?.content)
            ? response.content
            : [];

        setStores(data);
        if (data.length > 0) {
          setSelectedStoreId((current) => {
            if (current && data.some((s) => String(s.id) === String(current))) return current;
            return user?.storeId ? String(user.storeId) : String(data[0].id);
          });
        }
      } catch (error) {
        console.error("Failed to load stores:", error);
        if (!live) return;
        setStores([]);
        setStoreError(
          error?.response?.data?.message || "Unable to load stores.",
        );
      } finally {
        if (live) setStoreLoading(false);
      }
    };

    loadStores();
    return () => { live = false; };
  }, [user]);

  /* Discount entry mode for the whole table: PERCENT (default) or AMOUNT */
  const [discountType, setDiscountType] = useState("PERCENT");

  /* Price tax mode for the whole table: GST_EXCLUSIVE (default) or GST_INCLUSIVE */
  const [columnPriceMode, setColumnPriceMode] = useState("GST_EXCLUSIVE");

  /* =====================================================
       GST DEFAULTS
       One header dropdown sets tax type AND rate together.
       Value format: "<TYPE>:<PERCENT>" e.g. "CGST_SGST:18"
    ===================================================== */

  const [defaultGstType, setDefaultGstType] = useState("CGST_SGST");

  const [defaultGstPercentage, setDefaultGstPercentage] = useState(18);

  const createEmptyItem = useCallback(
    () => ({
      _rowId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      inventoryId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: null,
      localProductId: null,
      batchId: null,
      batchNumber: null,
      partNumber: "",
      itemName: "",
      brandName: "",
      brand: "",
      hsnCode: "",
      stockUnit: "PCS",
      packSize: null,
      contentsUnit: null,
      quantity: "",
      availableQuantity: 999999,
      mrp: "",
      sellingPrice: "",
      isManualPriceOverride: false,
      discountMode: discountType,
      discountPercentage: 0,
      discountAmount: 0,
      discountValue: 0,
      gstType: defaultGstType === "NONE" ? "NONE" : defaultGstType,
      gstPercentage:
        defaultGstType === "NONE" ? 0 : Number(defaultGstPercentage),
      gstAmount: 0,
      taxableAmount: 0,
      lineTotal: 0,
    }),
    [defaultGstType, defaultGstPercentage, discountType],
  );

  const resetFormState = useCallback(() => {
    setItems([createEmptyItem()]);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setIsDraft(false);
    setOriginalInvoice(null);
    setCreatedOrderId(null);
    setCreatedOrderAmount(null);
    setCalculation(null);
    setCalcError("");
    setReceivedAmount("");
    setPaymentStatus("PAID");
    setPaymentMethod("CASH");
    setPaymentReference("");
    setEditReason("");
    setBillDiscountPercent(0);
  }, [createEmptyItem]);

  const lastPathnameRef = useRef(location.pathname);
  useEffect(() => {
    const isNew = !editOrderId && !proformaEditId && !location.state?.proforma && !location.state?.bill;
    if (isNew && lastPathnameRef.current !== location.pathname) {
      resetFormState();
    }
    lastPathnameRef.current = location.pathname;
  }, [location.pathname, editOrderId, proformaEditId, location.state, resetFormState]);

  const handleStoreChange = (event) => {
    const newStoreId = event.target.value;

    setSelectedStoreId(newStoreId);

    /*
     * A bill belongs to one store.
     * Changing store clears current bill and resets with one empty row.
     */

    setItems([createEmptyItem()]);
    setRowSearch(null);

    setCalculation(null);
    setCalcError("");
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomerResults([]);
    setBulkSalePreview(null);
  };

  const handleDefaultGstChange = (value) => {
    const [type, pct] = String(value).split(":");
    const percentage = type === "NONE" ? 0 : normalizeGstPercentage(pct);

    setDefaultGstType(type);
    setDefaultGstPercentage(percentage);

    setItems((current) =>
      current.map((item) => {
        let updatedSellingPrice = item.sellingPrice;
        if (!item.isManualPriceOverride && item.mrp !== "" && Number(item.mrp) > 0) {
          updatedSellingPrice = columnPriceMode === "GST_INCLUSIVE"
            ? item.mrp
            : calculateRateFromMrp(item.mrp, percentage);
        }
        return {
          ...item,
          gstType: type,
          gstPercentage: percentage,
          sellingPrice: updatedSellingPrice,
        };
      }),
    );
  };

  const handlePriceModeChange = (nextMode) => {
    setColumnPriceMode(nextMode);
    setItems((current) =>
      current.map((item) => {
        if (item.isManualPriceOverride || !item.sellingPrice || Number(item.sellingPrice) <= 0) {
          return item;
        }
        const gstPct = Number(item.gstPercentage ?? defaultGstPercentage ?? 0);
        const autoMrp = nextMode === "GST_INCLUSIVE"
          ? item.sellingPrice
          : calculateMrpFromRate(item.sellingPrice, gstPct);
        return { ...item, mrp: autoMrp };
      }),
    );
  };

  /* =====================================================
       STOCK SEARCH (used by the in-table row search)
    ===================================================== */

  const fetchStock = async (text) => {
    const storeIdToUse =
      selectedStoreId ||
      (user?.storeId ? String(user.storeId) : "") ||
      (stores.length > 0 ? String(stores[0].id) : "");
    if (isProforma) {
      try {
        const promises = [];
        if (storeIdToUse) {
          promises.push(
            getCurrentStockPage(storeIdToUse, {
              search: text,
              onlyAvailable: false,
              page: 0,
              size: 50,
            }),
          );
        } else if (isSuperAdmin) {
          promises.push(
            getCurrentStockPage(null, {
              search: text,
              onlyAvailable: false,
              page: 0,
              size: 50,
            }),
          );
        } else {
          promises.push(Promise.resolve({ content: [] }));
        }

        promises.push(
          api.get(`/products/search`, {
            params: { text, keyword: text, storeId: storeIdToUse || undefined },
          }),
        );

        const [stockRes, catRes] = await Promise.allSettled(promises);

        const stockRaw = stockRes.status === "fulfilled" ? stockRes.value : [];
        const stockItems = Array.isArray(stockRaw)
          ? stockRaw
          : Array.isArray(stockRaw?.content)
            ? stockRaw.content
            : [];

        const catRaw = catRes.status === "fulfilled" ? catRes.value?.data : [];
        const catData = Array.isArray(catRaw) ? catRaw : [];

        // Format store inventory items
        const formattedStockItems = stockItems.map((p) => ({
          inventoryId: p.inventoryId,
          storeId: p.storeId,
          productId: p.productId ?? null,
          localProductId: p.localProductId ?? null,
          itemName: p.itemName,
          partNumber: p.partNumber,
          brand: p.brandName || p.brand,
          brandName: p.brandName || p.brand,
          hsnCode: p.hsncode || p.hsnCode,
          gstPercentage: p.gstPercentage,
          quantity: Number(p.quantity ?? 0),
          mrp: Number(p.mrp ?? 0),
          sellingPrice: Number(p.sellingPrice ?? 0),
          source: "STOCK",
        }));

        // Format global catalog items
        const formattedGlobalItems = catData.map((p) => ({
          inventoryId: p.inventoryId ?? null,
          storeId: p.storeId,
          productId: p.id,
          localProductId: null,
          itemName: p.itemName,
          partNumber: p.partNumber,
          brand: p.brandName,
          brandName: p.brandName,
          hsnCode: p.hsnCode,
          gstPercentage: p.gstPercentage,
          quantity: Number(p.quantity ?? 0),
          mrp: Number(p.mrp ?? p.mrpPrice ?? 0),
          sellingPrice: Number(p.sellingPrice ?? 0),
          source: p.inventoryId ? "STOCK" : "GLOBAL",
        }));

        const seen = new Set();
        const merged = [];

        // Include current stock items first (prioritize available store stock)
        for (const item of [...formattedStockItems, ...formattedGlobalItems]) {
          const partNorm = normalizePartNumber(item.partNumber);
          const nameKey = (item.itemName || "").trim().toLowerCase();
          const uniqueKey = partNorm ? `part-${partNorm}` : nameKey ? `name-${nameKey}` : `id-${item.productId || item.inventoryId}`;

          if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            merged.push(item);
          }
        }
        return merged;
      } catch (err) {
        console.error("fetchStock error:", err);
        return [];
      }
    }

    if (!storeIdToUse && !isSuperAdmin) {
      return [];
    }

    const response = await getCurrentStockPage(storeIdToUse || null, {
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

  const [items, setItems] = useState(() => [
    {
      inventoryId: `row-${Date.now()}-init`,
      productId: null,
      localProductId: null,
      batchId: null,
      batchNumber: null,
      partNumber: "",
      itemName: "",
      brandName: "",
      brand: "",
      hsnCode: "",
      stockUnit: "PCS",
      packSize: null,
      contentsUnit: null,
      quantity: "",
      availableQuantity: 999999,
      mrp: "",
      sellingPrice: "",
      discountMode: "PERCENT",
      discountPercentage: 0,
      discountAmount: 0,
      discountValue: 0,
      gstType: "CGST_SGST",
      gstPercentage: 18,
      gstAmount: 0,
      taxableAmount: 0,
      lineTotal: 0,
    },
  ]);

  useEffect(() => {
    if (items.length === 0 && !isExistingInvoice) {
      setItems([createEmptyItem()]);
      return;
    }
    const last = items[items.length - 1];
    const isLastFilled = Boolean(
      (last && (
        (last.partNumber && String(last.partNumber).trim() !== "") ||
        (last.itemName && String(last.itemName).trim() !== "") ||
        (last.brand && String(last.brand).trim() !== "") ||
        (last.brandName && String(last.brandName).trim() !== "") ||
        (last.mrp !== "" && Number(last.mrp) > 0) ||
        (last.sellingPrice !== "" && Number(last.sellingPrice) > 0) ||
        (last.quantity !== "" && Number(last.quantity) > 0) ||
        last.productId != null
      ))
    );

    if (isLastFilled) {
      setItems((prev) => [...prev, createEmptyItem()]);
    }
  }, [items, isExistingInvoice, createEmptyItem]);

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
      _rowId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: item.inventory?.productId ?? null,
      localProductId: item.inventory?.localProductId ?? null,
      inventoryId: item.inventory?.inventoryId,
      batchId: item.batchId ?? null,
      batchNumber: item.inventory?.batchNumber ?? null,
      partNumber: item.partNumber,
      itemName: item.inventory?.itemName,
      brandName: item.inventory?.brandName || item.inventory?.brand || "",
      brand: item.inventory?.brand || item.inventory?.brandName || "",
      hsnCode: item.inventory?.hsncode || item.inventory?.hsnCode || "",
      stockUnit: item.inventory?.stockUnit || "PCS",
      quantity: Number(item.requestedQuantity || 0),
      availableQuantity: Number(
        item.batchAvailableQuantity ?? item.inventory?.quantity ?? 0,
      ),
      mrp: Number(item.inventory?.mrp || 0),
      sellingPrice: Number(item.inventory?.sellingPrice || 0),
      discountMode: "PERCENT",
      discountPercentage: 0,
      discountAmount: 0,
      discountValue: 0,
      gstType: gstType === "NONE" ? "NONE" : gstType,
      gstPercentage:
        gstType === "NONE"
          ? 0
          : Number(item.inventory?.gstPercentage ?? gstPercentage ?? 0),
      gstAmount: 0,
      taxableAmount: 0,
      lineTotal: 0,
      bulkUploaded: true,
      isManualPriceOverride: false,
    }));

    setItems((current) => {
      // Discard blank/unfilled placeholder rows so uploaded Excel rows start at row 1
      const isBlankRow = (it) =>
        (!it.partNumber || String(it.partNumber).trim() === "") &&
        (!it.itemName || String(it.itemName).trim() === "") &&
        !it.productId &&
        (!it.quantity || Number(it.quantity) === 0) &&
        String(it.inventoryId || "").startsWith("row-");

      const existingRealItems = current.filter((it) => !isBlankRow(it));

      const incomingInventory = new Set(
        uploadedItems.map((item) => String(item.inventoryId)),
      );
      // A corrected file replaces its Excel quantities for the included
      // inventory items. Keep manual quantities and previously accepted
      // items absent from the corrected file. Reuploads do not double them.
      const merged = existingRealItems.flatMap((item) => {
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
      return merged.length === 0 ? [createEmptyItem()] : merged;
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
        isProforma,
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
            editReason,
          },
        },
      },
    });
  };

  /*
   * IN-TABLE ROW SEARCH
   * -------------------
   * Every row's Part Number cell is a searchable input.
   * Typing searches stock; picking a result fills the row.
   */

  const rowSearchRequest = useRef(0);
  const [rowSearch, setRowSearch] = useState(null);
  const [addItemOpen, setAddItemOpen] = useState(false);

  useEffect(() => {
    if (!rowSearch) return undefined;
    const handleOutsideClick = (e) => {
      if (e?.target && e.target.closest?.(".ns-results")) {
        return;
      }
      setRowSearch(null);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setRowSearch(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [rowSearch]);

  const handlePartNumberSearch = async (itemIndex, text, element) => {
    updateItemField(itemIndex, "partNumber", text);

    const requestId = ++rowSearchRequest.current;
    if (!element) return;
    const box = element.getBoundingClientRect();
    const position = {
      left: Math.max(10, Math.min(box.left, window.innerWidth - 470)),
      top: box.bottom + 4,
      width: Math.max(box.width, 460),
    };
    const trimmed = (text || "").trim();

    if (trimmed.length < 2) {
      setRowSearch(null);
      return;
    }

    try {
      const results = await fetchStock(trimmed);
      if (requestId !== rowSearchRequest.current) return;
      if (Array.isArray(results) && results.length > 0) {
        setRowSearch({ itemIndex, ...position, results, loading: false, error: "" });

        // Auto-fetch details if there is an exact or normalized part number match!
        const normTarget = normalizePartNumber(trimmed);
        const exact = results.find(
          (r) =>
            (r.partNumber || "").trim().toLowerCase() === trimmed.toLowerCase() ||
            (normTarget && normalizePartNumber(r.partNumber) === normTarget),
        );
        if (exact) {
          applyProductToItem(itemIndex, exact, null, true /* keepDropdownOpen */);
          setRowSearch({ itemIndex, ...position, results, loading: false, error: "" });
        }
      } else {
        setRowSearch(null);
      }
    } catch {
      if (requestId !== rowSearchRequest.current) return;
      setRowSearch(null);
    }
  };

  const handlePartNumberPaste = async (itemIndex, event) => {
    const pasted = event.clipboardData?.getData("text") || "";
    const cleanText = pasted.trim();
    if (!cleanText) return;

    updateItemField(itemIndex, "partNumber", cleanText);

    const targetElement = event.currentTarget;
    const requestId = ++rowSearchRequest.current;
    const box = targetElement.getBoundingClientRect();
    const position = {
      left: Math.max(10, Math.min(box.left, window.innerWidth - 470)),
      top: box.bottom + 4,
      width: Math.max(box.width, 460),
    };

    try {
      const results = await fetchStock(cleanText);
      if (requestId !== rowSearchRequest.current) return;
      if (Array.isArray(results) && results.length > 0) {
        const normTarget = normalizePartNumber(cleanText);
        const exact =
          results.find(
            (r) =>
              (r.partNumber || "").trim().toLowerCase() === cleanText.toLowerCase() ||
              (normTarget && normalizePartNumber(r.partNumber) === normTarget),
          ) || results[0];

        if (exact) {
          applyProductToItem(itemIndex, exact, null, true /* keepDropdownOpen */);
        }
        setRowSearch({ itemIndex, ...position, results, loading: false, error: "" });
      } else {
        setRowSearch(null);
      }
    } catch {
      if (requestId !== rowSearchRequest.current) return;
      setRowSearch(null);
    }
  };

  const handlePartNumberKeyDown = (itemIndex, event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (rowSearch && rowSearch.results?.length > 0) {
        const val = (event.target.value || "").trim().toLowerCase();
        const normVal = normalizePartNumber(event.target.value);
        const exact = rowSearch.results.find(
          (r) =>
            (r.partNumber || "").trim().toLowerCase() === val ||
            (normVal && normalizePartNumber(r.partNumber) === normVal),
        );
        const picked = exact || rowSearch.results[0];
        handleAddProduct(picked, itemIndex);
        setRowSearch(null);
      }
    } else if (event.key === "Escape") {
      setRowSearch(null);
    }
  };

  const handlePartNumberBlur = async (itemIndex, value) => {
    setTimeout(async () => {
      const trimmed = (value || "").trim();
      if (trimmed.length >= 2) {
        const normTarget = normalizePartNumber(trimmed);
        try {
          const results = await fetchStock(trimmed);
          if (Array.isArray(results) && results.length > 0) {
            const exact = results.find(
              (r) =>
                (r.partNumber || "").trim().toLowerCase() === trimmed.toLowerCase() ||
                (normTarget && normalizePartNumber(r.partNumber) === normTarget),
            );
            if (exact) {
              setItems((current) => {
                const target = current[itemIndex];
                if (!target || target.itemName) return current; // already autofilled
                return current;
              });
              handleAddProduct(exact, itemIndex);
            }
          }
        } catch {}
      }
    }, 200);
  };

  const handleItemNameSearch = async (itemIndex, text, element) => {
    updateItemField(itemIndex, "itemName", text);

    const requestId = ++rowSearchRequest.current;
    if (!element) return;
    const box = element.getBoundingClientRect();
    const position = {
      left: Math.max(10, Math.min(box.left, window.innerWidth - 470)),
      top: box.bottom + 4,
      width: Math.max(box.width, 460),
    };
    const trimmed = (text || "").trim();

    if (trimmed.length < 2) {
      setRowSearch(null);
      return;
    }

    try {
      const results = await fetchStock(trimmed);
      if (requestId !== rowSearchRequest.current) return;
      if (Array.isArray(results) && results.length > 0) {
        setRowSearch({ itemIndex, ...position, results, loading: false, error: "" });

        // Auto-fetch if exact item name match
        const exact = results.find(
          (r) => (r.itemName || "").trim().toLowerCase() === trimmed.toLowerCase(),
        );
        if (exact) {
          applyProductToItem(itemIndex, exact, null, true /* keepDropdownOpen */);
          setRowSearch({ itemIndex, ...position, results, loading: false, error: "" });
        }
      } else {
        setRowSearch(null);
      }
    } catch {
      if (requestId !== rowSearchRequest.current) return;
      setRowSearch(null);
    }
  };

  const handleItemNamePaste = async (itemIndex, event) => {
    const pasted = event.clipboardData?.getData("text") || "";
    const cleanText = pasted.trim();
    if (!cleanText) return;

    updateItemField(itemIndex, "itemName", cleanText);

    const targetElement = event.currentTarget;
    const requestId = ++rowSearchRequest.current;
    const box = targetElement.getBoundingClientRect();
    const position = {
      left: Math.max(10, Math.min(box.left, window.innerWidth - 470)),
      top: box.bottom + 4,
      width: Math.max(box.width, 460),
    };

    try {
      const results = await fetchStock(cleanText);
      if (requestId !== rowSearchRequest.current) return;
      if (Array.isArray(results) && results.length > 0) {
        const exact = results.find(
          (r) => (r.itemName || "").trim().toLowerCase() === cleanText.toLowerCase(),
        );
        if (exact) {
          applyProductToItem(itemIndex, exact, null, true /* keepDropdownOpen */);
        }
        setRowSearch({ itemIndex, ...position, results, loading: false, error: "" });
      } else {
        setRowSearch(null);
      }
    } catch {
      if (requestId !== rowSearchRequest.current) return;
      setRowSearch(null);
    }
  };

  const addNewItemRow = () => {
    setItems((current) => [...current, createEmptyItem()]);
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

  const applyProductToItem = (index, product, batch = null, keepDropdownOpen = false) => {
    const productId = product.productId ?? (product.source === "GLOBAL" ? product.id : null);
    const localProductId = product.localProductId ?? null;
    const inventoryId =
      product.inventoryId ||
      (isProforma
        ? `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        : null);
    const batchId = batch?.batchId ?? batch?.id ?? null;
    const availableQuantity = Number(
      batch?.availableQuantity ??
        product?.quantity ??
        (isProforma ? 999999 : 0),
    );
    const rawMrp = Number(batch?.mrp ?? product?.mrp ?? 0);
    const rawPrice = Number(
      batch?.sellingPrice ??
        batch?.sellingPriceAmount ??
        product?.sellingPrice ??
        product?.unitPrice ??
        0,
    );
    const gstPct = Number(
      product?.gstPercentage != null && product?.gstPercentage !== ""
        ? product.gstPercentage
        : (defaultGstType === "NONE" ? 0 : defaultGstPercentage),
    );
    let calculatedMrp = rawMrp;
    let calculatedPrice = rawPrice;
    if (calculatedMrp > 0 && calculatedPrice === 0) {
      calculatedPrice = calculateRateFromMrp(calculatedMrp, gstPct);
    } else if (calculatedPrice > 0 && calculatedMrp === 0) {
      calculatedMrp = calculateMrpFromRate(calculatedPrice, gstPct);
    }

    const itemData = {
      productId,
      localProductId,
      inventoryId: inventoryId || `item-${Date.now()}`,
      batchId,
      batchNumber:
        batch?.batchNumber ?? batch?.batchNo ?? batch?.number ?? null,
      partNumber: product.partNumber ?? "",
      itemName:
        product.itemName ?? product.productName ?? product.name ?? "",
      brandName: product.brandName || product.brand || "",
      hsnCode: product.hsnCode || product.hsncode || "",
      stockUnit: product.stockUnit || "PCS",
      packSize: product.packSize ?? null,
      contentsUnit: product.contentsUnit ?? null,
      quantity: 1,
      availableQuantity,
      mrp: calculatedMrp,
      sellingPrice: calculatedPrice,
      discountMode: discountType,
      discountPercentage: 0,
      discountAmount: 0,
      discountValue: 0,
      gstType: defaultGstType === "NONE" ? "NONE" : defaultGstType,
      gstPercentage: gstPct,
      gstAmount: 0,
      taxableAmount: 0,
      lineTotal: 0,
    };

    setItems((current) => {
      if (typeof index === "number" && index >= 0 && index < current.length) {
        return current.map((item, i) =>
          i === index
            ? {
                ...item,
                ...itemData,
                _rowId: item._rowId,
                quantity:
                  item.quantity && Number(item.quantity) > 0
                    ? item.quantity
                    : 1,
              }
            : item,
        );
      }
      return [
        ...current,
        {
          ...itemData,
          _rowId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        },
      ];
    });

    if (!keepDropdownOpen) {
      setRowSearch(null);
    }
    closeBatchSelector();
  };

  const addProductWithBatch = (product, batch, replaceRowIndex = null, keepDropdownOpen = false) => {
    applyProductToItem(replaceRowIndex, product, batch, keepDropdownOpen);
  };

  const handleAddProduct = async (product, replaceRowIndex = null, keepDropdownOpen = false) => {
    if (!selectedStoreId && (product?.storeId || stores.length > 0)) {
      setSelectedStoreId(String(product?.storeId || stores[0].id));
    }

    if (!product?.inventoryId && !isProforma) {
      return;
    }

    if (!isInvoiceEdit || isProforma) {
      // New sales, drafts, and proformas use direct addition or FIFO allocation
      addProductWithBatch(product, null, replaceRowIndex, keepDropdownOpen);
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
        addProductWithBatch(product, batches[0], replaceRowIndex);
        return;
      }
      batchReplaceRow.current = replaceRowIndex;
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

        if (isProforma) {
          return {
            ...item,
            quantity: Math.max(1, requestedQuantity),
          };
        }

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

        if (item.quantity === "" || item.quantity == null) {
          return item;
        }

        const availableQuantity = Number(item.availableQuantity ?? 0);
        const parsed = Number(item.quantity);
        if (Number.isNaN(parsed) || parsed <= 0) {
          return { ...item, quantity: "" };
        }
        const quantity = Math.floor(parsed);

        if (isProforma) {
          return {
            ...item,
            quantity,
          };
        }

        return {
          ...item,
          quantity: Math.min(quantity, availableQuantity),
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

  /* Bidirectional MRP <-> Rate calculation based on GST percentage:
   * Rate = MRP / (1 + GST% / 100)
   * MRP  = Rate * (1 + GST% / 100)
   */
  const calculateRateFromMrp = (mrp, gstPct) => {
    const numMrp = Number(mrp) || 0;
    const rate = Number(gstPct ?? defaultGstPercentage ?? 0);
    if (rate <= 0 || numMrp <= 0) return numMrp;
    return Math.round((numMrp / (1 + rate / 100)) * 100) / 100;
  };

  const calculateMrpFromRate = (rate, gstPct) => {
    const numRate = Number(rate) || 0;
    const gst = Number(gstPct ?? defaultGstPercentage ?? 0);
    if (gst <= 0 || numRate <= 0) return numRate;
    return Math.round((numRate * (1 + gst / 100)) * 100) / 100;
  };

  /* MRP, unit price and item details are editable per line */
  const updateItemField = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const gstPct = Number(item.gstPercentage ?? defaultGstPercentage ?? 0);

        if (field === "mrp") {
          const mrp = value === "" ? "" : Math.max(0, Number(value) || 0);
          // Only auto-recalculate rate if user hasn't manually overridden price or price is empty
          const shouldAutoCalcRate =
            !item.isManualPriceOverride ||
            item.sellingPrice === "" ||
            Number(item.sellingPrice) === 0;
          const autoRate =
            shouldAutoCalcRate && mrp !== ""
              ? columnPriceMode === "GST_INCLUSIVE"
                ? mrp
                : calculateRateFromMrp(mrp, gstPct)
              : item.sellingPrice;
          return {
            ...item,
            mrp,
            sellingPrice: autoRate,
          };
        }

        if (field === "sellingPrice") {
          const rate = value === "" ? "" : Math.max(0, Number(value) || 0);
          // Do NOT overwrite MRP if product is autofetched or MRP is already set.
          // Only auto-calculate MRP on a blank manual entry row.
          const shouldAutoMrp =
            (item.mrp === "" || item.mrp == null || Number(item.mrp) === 0) &&
            !item.productId;
          const autoMrp =
            shouldAutoMrp && rate !== ""
              ? columnPriceMode === "GST_INCLUSIVE"
                ? rate
                : calculateMrpFromRate(rate, gstPct)
              : item.mrp;
          return {
            ...item,
            sellingPrice: rate,
            mrp: autoMrp,
            isManualPriceOverride: true,
          };
        }

        if (field === "gstPercentage") {
          const newGst = value === "" ? 0 : Number(value) || 0;
          let newPrice = item.sellingPrice;
          if (!item.isManualPriceOverride && item.mrp && Number(item.mrp) > 0) {
            newPrice = calculateRateFromMrp(item.mrp, newGst);
          }
          return {
            ...item,
            gstPercentage: newGst,
            sellingPrice: newPrice,
          };
        }

        if (field === "brandName" || field === "brand") {
          return {
            ...item,
            brandName: value,
            brand: value,
          };
        }

        return { ...item, [field]: value };
      }),
    );
  };

  /* =====================================================
       DISCOUNT
       Supports two modes: PERCENT (%) or AMOUNT (₹).
       Frontend sends discountType, discountValue, and discountPercentage.
    ===================================================== */

  const updateItemDiscountPercent = (index, value) => {
    const pct = value === "" ? "" : normalizePercentage(value);
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const numPct = Number(pct) || 0;
        const qty = Number(item.quantity) || 1;
        const base = Number(item.sellingPrice || 0) * qty;
        const amt = (base * numPct) / 100;
        return {
          ...item,
          discountMode: "PERCENT",
          discountPercentage: pct,
          discountAmount: amt,
          discountValue: numPct,
        };
      }),
    );
  };

  const updateItemDiscountAmount = (index, value, base) => {
    const amt = value === "" ? "" : Math.max(0, Number(value) || 0);
    const numAmt = Number(amt) || 0;
    const percentage =
      base > 0 ? normalizePercentage((numAmt / base) * 100) : 0;

    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return {
          ...item,
          discountMode: "AMOUNT",
          discountAmount: amt,
          discountValue: numAmt,
          discountPercentage: percentage,
        };
      }),
    );
  };

  /* =====================================================
       REMOVE ITEM
    ===================================================== */

  const removeItem = (index) => {
    setItems((current) => {
      const updated = current.filter((_, itemIndex) => itemIndex !== index);
      return updated.length === 0 ? [createEmptyItem()] : updated;
    });
    setRowSearch(null);
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
      const activeItems = currentItems.filter(
        (item) =>
          item.inventoryId &&
          !String(item.inventoryId).startsWith("row-") &&
          !String(item.inventoryId).startsWith("item-"),
      );
      return {
        storeId: Number(selectedStoreId),

        billDiscountPercent: normalizePercentage(billDiscountPercent),

        items: activeItems.map((item) => {
          const rawPrice = Number(item.sellingPrice ?? 0);
          const gstPct = Number(item.gstPercentage ?? 0);
          const taxableUnitPrice =
            columnPriceMode === "GST_INCLUSIVE" && gstPct > 0
              ? Math.round((rawPrice / (1 + gstPct / 100)) * 100) / 100
              : rawPrice;

          return {
            productId: item.productId ?? null,

            /*
             * Local products do not have a global productId.
             * Preserve localProductId so the backend can identify them.
             */
            localProductId: item.localProductId ?? null,

            inventoryId: item.inventoryId,

            batchId: item.batchId ?? null,

            quantity: Number(item.quantity || 1),
            unitPrice: taxableUnitPrice,
            sellingPrice: rawPrice,
            mrp: Number(item.mrp ?? 0),

            discountPercentage: effectiveDiscountPct(item),
            discountType:
              (item.discountMode || discountType) === "AMOUNT"
                ? "AMOUNT"
                : "PERCENT",
            discountValue:
              (item.discountMode || discountType) === "AMOUNT"
                ? Number(item.discountAmount ?? item.discountValue ?? 0)
                : Number(item.discountPercentage ?? 0),

            gstType: toBackendGstType(item.gstType, item.gstPercentage),
          };
        }),
      };
    },
    [selectedStoreId, billDiscountPercent, discountType],
  );

  const buildProformaCalculationRequest = useCallback(
    (currentItems) => {
      const activeItems = currentItems.filter(
        (item) =>
          ((item.partNumber && item.partNumber.trim()) ||
            (item.itemName && item.itemName.trim()) ||
            Number(item.sellingPrice) > 0 ||
            Number(item.mrp) > 0) &&
          Number(item.quantity) > 0,
      );
      return {
        storeId: Number(selectedStoreId),
        billDiscountPercent: normalizePercentage(billDiscountPercent),
        items: activeItems.map((item) => {
          const rawPrice = Number(item.sellingPrice ?? 0);
          const gstPct = Number(item.gstPercentage ?? 0);
          const taxableUnitPrice =
            columnPriceMode === "GST_INCLUSIVE" && gstPct > 0
              ? Math.round((rawPrice / (1 + gstPct / 100)) * 100) / 100
              : rawPrice;

          return {
            inventoryId:
              item.inventoryId &&
              !String(item.inventoryId).startsWith("row-") &&
              !String(item.inventoryId).startsWith("item-") &&
              !String(item.inventoryId).startsWith("manual-") &&
              !String(item.inventoryId).startsWith("proforma-")
                ? Number(item.inventoryId)
                : null,
            productId: item.productId ?? null,
            localProductId: item.localProductId ?? null,
            partNumber: item.partNumber ? item.partNumber.trim() : null,
            itemName: item.itemName?.trim() || item.partNumber?.trim() || "Item",
            brandName: item.brandName ?? null,
            hsnCode: item.hsnCode ?? null,
            mrp: Number(item.mrp ?? 0),
            quantity: Number(item.quantity || 1),
            unitPrice: taxableUnitPrice,
            discountPercentage: effectiveDiscountPct(item),
            discountType:
              (item.discountMode || discountType) === "AMOUNT"
                ? "AMOUNT"
                : "PERCENT",
            discountValue:
              (item.discountMode || discountType) === "AMOUNT"
                ? Number(item.discountAmount ?? item.discountValue ?? 0)
                : Number(item.discountPercentage ?? 0),
            gstType: toBackendGstType(item.gstType, item.gstPercentage),
            gstPercentage: gstPct,
          };
        }),
        defaultGstType,
        defaultGstPercentage,
      };
    },
    [
      selectedStoreId,
      billDiscountPercent,
      defaultGstType,
      defaultGstPercentage,
      discountType,
      columnPriceMode,
    ],
  );

  const buildAmendmentRequest = useCallback(
    (currentItems) => {
      const validItems = (currentItems || []).filter(
        (item) =>
          item.inventoryId &&
          !String(item.inventoryId).startsWith("row-") &&
          !String(item.inventoryId).startsWith("item-") &&
          Number(item.quantity) > 0 &&
          Number(item.sellingPrice) > 0,
      );
      return {
        editToken: originalInvoice?.editToken,
        reason: (editReason || "").trim() || "Invoice amended",
        billDiscountPercent: normalizePercentage(billDiscountPercent),
        items: validItems.map((item) => ({
          orderItemId: item.orderItemId ?? null,
          inventoryId: Number(item.inventoryId),
          batchId: item.batchId == null ? null : Number(item.batchId),
          quantity: Number(item.quantity),
          sellingPrice: Number(item.sellingPrice),
          mrp: Number(item.mrp || item.sellingPrice),
          discountPercentage: effectiveDiscountPct(item),
          gstType: toBackendGstType(item.gstType, item.gstPercentage),
        })),
      };
    },
    [originalInvoice, editReason, billDiscountPercent],
  );

  /* A result is only shown while it still matches the current inputs. */
  const currentCalculationKey = JSON.stringify(
    isInvoiceEdit
      ? buildAmendmentRequest(items)
      : isProforma
        ? buildProformaCalculationRequest(items)
        : buildCalculationRequest(items),
  );
  const calculation =
    calculationKey === currentCalculationKey ? calculationResult : null;

  const recalculateBill = useCallback(
    async (currentItems) => {
      const hasActive = isProforma
        ? currentItems.some(
            (it) =>
              (it.partNumber && it.partNumber.trim()) ||
              (it.itemName && it.itemName.trim()) ||
              Number(it.sellingPrice) > 0 ||
              Number(it.mrp) > 0,
          )
        : currentItems.some(
            (it) =>
              it.inventoryId &&
              !String(it.inventoryId).startsWith("row-") &&
              !String(it.inventoryId).startsWith("item-"),
          );

      if (!selectedStoreId || !hasActive) {
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
          : isProforma
            ? buildProformaCalculationRequest(currentItems)
            : buildCalculationRequest(currentItems);
        const response = await (isInvoiceEdit
          ? previewInvoiceAmendment(editOrderId, payload)
          : isProforma
            ? calculateProformaPreview(payload)
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
      buildProformaCalculationRequest,
      isProforma,
      isInvoiceEdit,
      editOrderId,
      buildAmendmentRequest,
    ],
  );

  useEffect(() => {
    const activeValidItems = items.filter(
      (item) =>
        Number(item.quantity) > 0 &&
        ((item.partNumber && item.partNumber.trim()) ||
          (item.itemName && item.itemName.trim()) ||
          Number(item.sellingPrice) > 0 ||
          Number(item.mrp) > 0),
    );

    if (!selectedStoreId || activeValidItems.length === 0) {
      setCalculation(null);
      setCalcError("");
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
      const qty = Math.max(0, Number(line?.quantity ?? item.quantity ?? 0) || 0);
      const rawPrice = item.isManualPriceOverride
        ? Number(item.sellingPrice ?? 0)
        : Number(line?.sellingPrice ?? item.sellingPrice ?? 0);
      const gstPct = Number(item.gstPercentage || 0);
      const gstFactor = gstPct / 100;
      const unit =
        columnPriceMode === "GST_INCLUSIVE" && gstFactor > 0
          ? rawPrice / (1 + gstFactor)
          : rawPrice;

      const discountAmt = lineDiscountAmount(item, unit, qty);
      const computedTaxable = Math.max(0, unit * qty - discountAmt);
      const rowTaxable = item.isManualPriceOverride
        ? computedTaxable
        : Number(
            line?.taxableAmount != null && Number(line.taxableAmount) > 0
              ? line.taxableAmount
              : computedTaxable,
          );
      const rowGst = item.isManualPriceOverride
        ? (rowTaxable * gstFactor)
        : Number(
            line?.gstAmount != null && Number(line.gstAmount) > 0
              ? line.gstAmount
              : (rowTaxable * gstFactor),
          );
      const rowTotal = item.isManualPriceOverride
        ? (rowTaxable + rowGst)
        : Number(
            line?.lineTotal != null && Number(line.lineTotal) > 0
              ? line.lineTotal
              : (rowTaxable + rowGst),
          );

      sum.qty += qty;
      sum.mrp += Number(line?.mrp ?? item.mrp ?? 0) * qty;
      sum.price += rawPrice * qty;
      sum.discount += discountAmt;
      sum.taxable += rowTaxable;
      sum.total += rowTotal;
    });

    return sum;
  }, [displayRows, columnPriceMode]);

  const roundOffValue = Number(calculation?.roundOff ?? 0);

  const gstTotal =
    Number(calculation?.cgst ?? 0) +
    Number(calculation?.sgst ?? 0) +
    Number(calculation?.igst ?? 0);

  const calculatedGstTotal = useMemo(() => {
    const hasManualPrice = displayRows.some(({ item }) => item.isManualPriceOverride);
    if (gstTotal > 0 && !hasManualPrice) return gstTotal;
    return displayRows.reduce((acc, { item, line }) => {
      const rowQty = Math.max(0, Number(line?.quantity ?? item.quantity ?? 0) || 0);
      const rawPrice = item.isManualPriceOverride
        ? Number(item.sellingPrice ?? 0)
        : Number(line?.sellingPrice ?? item.sellingPrice ?? 0);
      const gstPct = Number(item.gstPercentage || 0);
      const gstFactor = gstPct / 100;
      const unit =
        columnPriceMode === "GST_INCLUSIVE" && gstFactor > 0
          ? rawPrice / (1 + gstFactor)
          : rawPrice;

      const discountAmt = lineDiscountAmount(item, unit, rowQty);
      const computedTaxable = Math.max(0, unit * rowQty - discountAmt);
      const rowTaxable = item.isManualPriceOverride
        ? computedTaxable
        : Number(
            line?.taxableAmount != null && Number(line.taxableAmount) > 0
              ? line.taxableAmount
              : computedTaxable,
          );
      const rowGst = item.isManualPriceOverride
        ? (rowTaxable * gstFactor)
        : Number(
            line?.gstAmount != null && Number(line.gstAmount) > 0
              ? line.gstAmount
              : (rowTaxable * gstFactor),
          );
      return acc + rowGst;
    }, 0);
  }, [gstTotal, displayRows, columnPriceMode]);

  const hasManualPrice = useMemo(
    () => displayRows.some(({ item }) => item.isManualPriceOverride),
    [displayRows],
  );

  const effectiveTaxableAmount = hasManualPrice
    ? totals.taxable
    : calculation?.taxableAmount != null
      ? calculation.taxableAmount
      : totals.taxable;

  const effectiveGstTotal = hasManualPrice
    ? calculatedGstTotal
    : gstTotal > 0
      ? gstTotal
      : calculatedGstTotal;

  const effectiveGrandTotal = hasManualPrice
    ? totals.total || (totals.taxable + calculatedGstTotal)
    : calculation?.netPayable != null
      ? calculation.netPayable
      : totals.total || (totals.taxable + calculatedGstTotal);

  /* =====================================================
       CUSTOMER
    ===================================================== */

  const emptyCustomerForm = {
    customerName: "",
    tradeName: "",
    legalName: "",
    mobileNumber: "",
    gstRegistrationType: isProforma ? "REGISTERED" : "UNREGISTERED",
    gstin: "",
    state: "",
    email: "",
    billingAddress: "",
    shippingAddress: "",
  };

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
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
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [createdOrderAmount, setCreatedOrderAmount] = useState(null);

  const customerLookupRequest = useRef(0);
  const customerBoxRef = useRef(null);

  useEffect(() => {
    if (!customerDropdownOpen) return undefined;
    const onMouseDown = (event) => {
      if (!customerBoxRef.current?.contains(event.target)) {
        setCustomerDropdownOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setCustomerDropdownOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [customerDropdownOpen]);

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

  const lookupCustomerByMobile = async (digits) => {
    if (!selectedStoreId || !/^\d{10}$/.test(digits)) return;
    const req = ++customerLookupRequest.current;
    setCustomerLoading(true);
    try {
      const found = await getCustomerByMobile(digits, Number(selectedStoreId));
      if (req === customerLookupRequest.current) {
        if (found) {
          selectCustomer(found);
          setCustomerDropdownOpen(false);
        } else {
          setCustomerResults([]);
          setCustomerDropdownOpen(true);
        }
      }
    } catch (error) {
      if (req === customerLookupRequest.current) {
        console.error("Mobile lookup failed:", error);
      }
    } finally {
      if (req === customerLookupRequest.current) {
        setCustomerLoading(false);
      }
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
    const displayName =
      customer.legalName &&
      customer.customerName &&
      customer.legalName !== customer.customerName
        ? `${customer.legalName} (${customer.customerName})`
        : customer.customerName || customer.legalName || "";
    setCustomerSearch(displayName);
    setPhoneSearch(customer.mobileNumber ?? "");
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

  const openCustomerModal = (customer = null, prefillMobile = "") => {
    setEditingCustomer(customer);
    const legal = customer?.legalName || customer?.customerName || "";
    const trade =
      customer?.legalName &&
      customer?.customerName &&
      customer.legalName !== customer.customerName
        ? customer.customerName
        : customer?.tradeName || "";

    setCustomerForm(
      customer
        ? {
            customerName: legal,
            tradeName: trade,
            legalName: legal,
            mobileNumber: customer.mobileNumber ?? "",
            gstRegistrationType:
              customer.gstRegistrationType ??
              (isProforma ? "REGISTERED" : "UNREGISTERED"),
            gstin: customer.gstin ?? "",
            state: customer.state ?? "",
            email: customer.email ?? "",
            billingAddress: customer.billingAddress ?? "",
            shippingAddress: customer.shippingAddress ?? "",
          }
        : {
            ...emptyCustomerForm,
            mobileNumber:
              prefillMobile ||
              phoneSearch ||
              customerSearch.replace(/\D/g, "").slice(0, 10),
            gstRegistrationType: isProforma ? "REGISTERED" : "UNREGISTERED",
          },
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
      return toast.warning("Customer Name is required.");
    if (!/^\d{10}$/.test(customerForm.mobileNumber))
      return toast.warning("Enter a valid 10-digit mobile number.");

    const isRegistered =
      customerForm.gstRegistrationType !== "UNREGISTERED" ||
      Boolean(customerForm.gstin?.trim()) ||
      isProforma;

    if (
      customerForm.gstRegistrationType !== "UNREGISTERED" &&
      !/^[0-9A-Za-z]{15}$/.test(customerForm.gstin.trim())
    ) {
      return toast.warning("A valid 15-character GSTIN is required.");
    }

    const { billingAddress, shippingAddress, ...customerFields } = customerForm;

    const legalNameVal = customerForm.customerName.trim();
    const tradeNameVal =
      isRegistered && customerForm.tradeName?.trim()
        ? customerForm.tradeName.trim()
        : legalNameVal;

    const payload = {
      ...(isProforma ? customerFields : customerForm),
      customerName: tradeNameVal,
      legalName: legalNameVal,
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
  const [invoiceTime, setInvoiceTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  });

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
          legalName: source.customerLegalName,
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
            mrp: Number(item.mrp || 0),
            batchId: null,
          })),
        );
        setBillDiscountPercent(source.billDiscountPercent || 0);
        const adv =
          source.advanceAmount != null
            ? String(source.advanceAmount)
            : source.receivedAmount != null
              ? String(source.receivedAmount)
              : "";
        setReceivedAmount(adv);
        if (source.paymentMethod) {
          setPaymentMethod(source.paymentMethod);
        }
        if (source.paymentReference) {
          setPaymentReference(source.paymentReference);
        }
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
          id: source.customerId,
          customerName: source.customerName,
          legalName: source.customerLegalName,
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
    if (bill.editReason) setEditReason(bill.editReason);

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
        setInvoiceEditError(
          paymentStatus === "UNPAID"
            ? "A reason is required to edit this invoice and mark it as Unpaid."
            : "A reason is required to edit this invoice."
        );
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
          paymentStatus,
          receivedAmount: receivedAmount === "" ? null : Number(receivedAmount),
          ...(collectPayment
            ? {
                payment: {
                  paymentMethod: paymentMethod || "CASH",
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
        const validItems = items.filter(
          (it) =>
            (it.partNumber && it.partNumber.trim()) ||
            (it.itemName && it.itemName.trim()) ||
            Number(it.sellingPrice) > 0 ||
            Number(it.mrp) > 0,
        );
        if (validItems.length === 0) {
          throw new Error("Please add at least one item with details.");
        }
        const proformaPayload = {
          storeId: Number(selectedStoreId),
          customerId: selectedCustomer.id,
          customerLegalName: (selectedCustomer?.legalName || selectedCustomer?.customerLegalName || customerForm?.legalName || "").trim() || null,
          items: validItems.map((item) => ({
            inventoryId:
              item.inventoryId &&
              !String(item.inventoryId).startsWith("row-") &&
              !String(item.inventoryId).startsWith("item-") &&
              !String(item.inventoryId).startsWith("manual-") &&
              !String(item.inventoryId).startsWith("proforma-")
                ? Number(item.inventoryId)
                : null,
            productId: item.productId ?? null,
            localProductId: item.localProductId ?? null,
            partNumber: item.partNumber ? item.partNumber.trim() : null,
            itemName: item.itemName?.trim() || item.partNumber?.trim() || "Item",
            brandName: item.brandName ?? null,
            hsnCode: item.hsnCode ?? null,
            mrp: Number(item.mrp ?? 0),
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.sellingPrice ?? 0),
            discountPercentage: effectiveDiscountPct(item),
            discountType:
              (item.discountMode || discountType) === "AMOUNT"
                ? "AMOUNT"
                : "PERCENT",
            discountValue:
              (item.discountMode || discountType) === "AMOUNT"
                ? Number(item.discountAmount ?? item.discountValue ?? 0)
                : Number(item.discountPercentage ?? 0),
            gstType: toBackendGstType(item.gstType, item.gstPercentage),
            gstPercentage: Number(item.gstPercentage ?? 0),
          })),
          billDiscountPercent: normalizePercentage(billDiscountPercent),
          draft: Boolean(saveAsDraft),
          advanceAmount:
            receivedAmount !== "" && Number(receivedAmount) > 0
              ? Number(receivedAmount)
              : null,
          paymentMethod:
            receivedAmount !== "" && Number(receivedAmount) > 0
              ? paymentMethod
              : null,
          paymentReference:
            receivedAmount !== "" &&
            Number(receivedAmount) > 0 &&
            paymentMethod !== "CASH"
              ? paymentReference.trim()
              : null,
          defaultGstType,
          defaultGstPercentage,
          invoiceDate,
          invoiceTime: invoiceTime || new Date().toTimeString().slice(0, 8),
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

      const validSaleItems = items.filter(
        (it) =>
          it.inventoryId &&
          !String(it.inventoryId).startsWith("row-") &&
          Number(it.quantity) > 0,
      );
      if (validSaleItems.length === 0) {
        throw new Error("Please add at least one product with valid stock before saving.");
      }

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
        customerLegalName: (selectedCustomer?.legalName || selectedCustomer?.customerLegalName || customerForm?.legalName || "").trim() || null,

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
        invoiceTime: invoiceTime || new Date().toTimeString().slice(0, 8),

        billDiscountPercent: normalizePercentage(billDiscountPercent),
        receivedAmount: receivedAmount === "" ? null : Number(receivedAmount),

        items: validSaleItems.map((item) => {
          const rawPrice = Number(item.sellingPrice ?? 0);
          const gstPct = Number(item.gstPercentage ?? 0);
          const taxableUnitPrice =
            columnPriceMode === "GST_INCLUSIVE" && gstPct > 0
              ? Math.round((rawPrice / (1 + gstPct / 100)) * 100) / 100
              : rawPrice;
          return {
            proformaItemId: item.proformaItemId || (location.state?.proforma ? item.id : null),

            productId: item.productId ?? null,

            /*
             * Local products have productId = null.
             * Send localProductId so the backend can resolve them.
             */
            localProductId: item.localProductId ?? null,

            inventoryId: item.inventoryId ?? null,

            batchId: item.batchId ?? null,

            quantity: Number(item.quantity),
            unitPrice: taxableUnitPrice,
            sellingPrice: rawPrice,
            mrp: Number(item.mrp ?? 0),

            discountPercentage: effectiveDiscountPct(item),

            gstType: toBackendGstType(item.gstType, item.gstPercentage),
          };
        }),
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
        resetFormState();
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
    const brand = product.brandName || product.brand;
    const isFromStock = Boolean(product.inventoryId || (quantity > 0 && product.source !== "GLOBAL"));

    return (
      <button
        type="button"
        className="ns-result"
        key={product.inventoryId ?? product.productId ?? index}
        disabled={!isProforma && quantity <= 0}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPick(product)}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <strong>{productName}</strong>
            {isFromStock ? (
              <span style={{ fontSize: "10px", padding: "1px 6px", background: "#dcfce7", color: "#15803d", borderRadius: "4px", fontWeight: 700 }}>
                In Stock ({quantity})
              </span>
            ) : (
              <span style={{ fontSize: "10px", padding: "1px 6px", background: "#ede9fe", color: "#6d28d9", borderRadius: "4px", fontWeight: 700 }}>
                Global Product
              </span>
            )}
          </div>
          <ProductUnitLabel product={product} />
          <span>Part Number: {partNumber} {brand ? `• ${brand}` : ""}</span>
          {product.hsnCode && <span style={{ fontSize: "11px", color: "#64748b" }}>HSN: {product.hsnCode} • GST: {product.gstPercentage ?? 18}%</span>}
        </div>
        <div style={{ textAlign: "right" }}>
          {mrp > 0 && <span style={{ display: "block", fontSize: "11px", color: "#64748b" }}>MRP {money(mrp)}</span>}
          <strong style={{ fontSize: "13px", color: "#1e293b" }}>
            {sellingPrice > 0 ? money(sellingPrice) : mrp > 0 ? `Rate ~${money(calculateRateFromMrp(mrp, product.gstPercentage ?? 18))}` : "Price TBD"}
          </strong>
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
              navigate(
                isProforma
                  ? (isSuperAdmin ? "/owner/sales/proforma" : "/store/sales/proforma")
                  : (isSuperAdmin ? "/owner/sales" : "/store/sales")
              )
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
  <div className="ns-combo" ref={customerBoxRef}>
    <Search size={14} className="ns-search-icon" />
    <input
      type="text"
      className="ns-input ns-search-input"
      value={customerSearch}
      placeholder={
        selectedStoreId ? "Search customer name or 10-digit mobile..." : "Select store first"
      }
      disabled={!selectedStoreId || isInvoiceEdit}
      onFocus={() => {
        setCustomerDropdownOpen(true);
        loadCustomerOptions(customerSearch);
      }}
      onClick={() => setCustomerDropdownOpen(true)}
      onChange={(event) => {
        const value = event.target.value;
        setCustomerSearch(value);
        setSelectedCustomer(null);
        setCustomerDropdownOpen(true);
        const digits = value.replace(/\D/g, "");
        if (digits.length === 10) {
          lookupCustomerByMobile(digits);
        } else {
          loadCustomerOptions(value);
        }
      }}
    />

    {customerDropdownOpen && (
      <div className="ns-options">
        <button
          type="button"
          className="ns-new-opt"
          onClick={() => openCustomerModal(null, phoneSearch || customerSearch.replace(/\D/g, ""))}
        >
          <Plus size={14} /> New Party / Customer {(phoneSearch || customerSearch.replace(/\D/g, "").slice(0, 10)) ? `(${phoneSearch || customerSearch.replace(/\D/g, "").slice(0, 10)})` : ""}
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
              <strong>
                {customer.legalName &&
                customer.customerName &&
                customer.legalName !== customer.customerName
                  ? `${customer.legalName} (${customer.customerName})`
                  : customer.customerName || customer.legalName}
              </strong>
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
    value={selectedCustomer ? selectedCustomer.mobileNumber : phoneSearch}
    placeholder={selectedStoreId ? "Phone / Mobile search" : "Phone (auto-filled)"}
    disabled={!selectedStoreId || isInvoiceEdit}
    maxLength={10}
    onChange={(event) => {
      const val = event.target.value.replace(/\D/g, "").slice(0, 10);
      setPhoneSearch(val);
      if (selectedCustomer && val !== selectedCustomer.mobileNumber) {
        setSelectedCustomer(null);
        setCustomerSearch("");
      }
      if (val.length === 10) {
        lookupCustomerByMobile(val);
      }
    }}
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
            <button
              type="button"
              className={`ns-reset-cols-btn ${hasCustomWidths ? "is-customized" : ""}`}
              onClick={resetAllColumns}
              title="Reset all column widths to default (Double-click any column header border to reset that column)"
            >
              <RotateCcw size={12} />
              <span>Reset Columns</span>
            </button>
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
            <table
              className="ns-table"
              style={{
                width: "100%",
                minWidth: `${colWidths.reduce((a, b) => a + b, 0)}px`,
              }}
            >
              <colgroup>
                {colWidths.map((w, i) => (
                  <col key={i} style={{ width: `${w}px` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} className="ctr ns-th-resizable">
                    S.No
                    {renderResizer(0)}
                  </th>
                  <th rowSpan={2} className="ns-th-resizable">
                    Part Number
                    {renderResizer(1)}
                  </th>
                  <th rowSpan={2} className="ns-th-resizable">
                    Part Name
                    {renderResizer(2)}
                  </th>
                  <th rowSpan={2} className="ns-th-resizable">
                    Brand
                    {renderResizer(3)}
                  </th>
                  <th rowSpan={2} className="num ns-th-resizable">
                    Qty
                    {renderResizer(4)}
                  </th>
                  <th rowSpan={2} className="num ns-th-resizable">
                    MRP
                    {renderResizer(5)}
                  </th>
                  <th rowSpan={2} className="num ns-th-resizable">
                    Price / Unit
                    {renderResizer(6)}
                  </th>
                  <th colSpan={2} className="ctr ns-th-resizable">
                    Discount
                    {renderResizer(8)}
                  </th>
                  <th rowSpan={2} className="num ns-th-resizable">
                    Taxable
                    {renderResizer(9)}
                  </th>
                  <th colSpan={2} className="ctr ns-th-resizable">
                    GST
                    {renderResizer(11)}
                  </th>
                  <th rowSpan={2} className="num ns-th-resizable">
                    Total
                    {renderResizer(12)}
                  </th>
                  <th rowSpan={2} className="ctr ns-th-resizable">
                    Actions
                    {renderResizer(13)}
                  </th>
                </tr>
                <tr>
                  <th className="num ns-th-resizable">
                    Disc %
                    {renderResizer(7)}
                  </th>
                  <th className="num ns-th-resizable">
                    Disc (₹)
                    {renderResizer(8)}
                  </th>
                  <th className="ns-th-resizable">
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
                    {renderResizer(10)}
                  </th>
                  <th className="num ns-th-resizable">
                    Amount
                    {renderResizer(11)}
                  </th>
                </tr>
              </thead>

              <tbody>
                {displayRows.map(
                  ({ item, itemIndex, line, allocationIndex }, index) => {
                    const rowQty = Math.max(0, Number(line?.quantity ?? item.quantity ?? 0) || 0);
                    const rawPrice = item.isManualPriceOverride
                      ? Number(item.sellingPrice ?? 0)
                      : Number(line?.sellingPrice ?? item.sellingPrice ?? 0);
                    const gstPct = Number(item.gstPercentage || 0);
                    const gstFactor = gstPct / 100;
                    const unitPrice =
                      columnPriceMode === "GST_INCLUSIVE" && gstFactor > 0
                        ? rawPrice / (1 + gstFactor)
                        : rawPrice;

                    const discountPct = effectiveDiscountPct(item);
                    const discountBase = unitPrice * rowQty;
                    const discountAmt = lineDiscountAmount(item, unitPrice, rowQty);
                    const computedTaxable = Math.max(0, unitPrice * rowQty - discountAmt);
                    const rowTaxable = item.isManualPriceOverride
                      ? computedTaxable
                      : Number(
                          line?.taxableAmount != null && Number(line.taxableAmount) > 0
                            ? line.taxableAmount
                            : computedTaxable,
                        );
                    const computedGst = rowTaxable * gstFactor;
                    const rowGstAmount = item.isManualPriceOverride
                      ? computedGst
                      : Number(
                          line?.gstAmount != null && Number(line.gstAmount) > 0
                            ? line.gstAmount
                            : computedGst,
                        );
                    const rowTotal = item.isManualPriceOverride
                      ? (rowTaxable + rowGstAmount)
                      : Number(
                          line?.lineTotal != null && Number(line.lineTotal) > 0
                            ? line.lineTotal
                            : (rowTaxable + rowGstAmount),
                        );
                    const lockedLine = isInvoiceEdit && Boolean(item.orderItemId);

                    return (
                      <tr
                        key={item._rowId || `row-${itemIndex}-${allocationIndex}`}
                      >
                        <td>{index + 1}</td>
                        <td className="ns-cell-box ns-part">
                          <input
                            type="text"
                            className="ns-cell-input text-center"
                            placeholder="Search / enter part..."
                            value={item.partNumber || ""}
                            disabled={lockedLine || creatingInvoice}
                            onChange={(event) =>
                              handlePartNumberSearch(
                                itemIndex,
                                event.target.value,
                                event.currentTarget,
                              )
                            }
                            onPaste={(event) =>
                              handlePartNumberPaste(itemIndex, event)
                            }
                            onKeyDown={(event) =>
                              handlePartNumberKeyDown(itemIndex, event)
                            }
                            onBlur={(event) =>
                              handlePartNumberBlur(itemIndex, event.target.value)
                            }
                            onFocus={(event) => {
                              if ((item.partNumber || "").trim().length >= 2) {
                                handlePartNumberSearch(
                                  itemIndex,
                                  item.partNumber,
                                  event.currentTarget,
                                );
                              }
                            }}
                            aria-label={`Part number for row ${index + 1}`}
                          />
                        </td>
                        <td className="ns-cell-box ns-name">
                          <input
                            type="text"
                            className="ns-cell-input text-center"
                            placeholder="Part name"
                            value={item.itemName || ""}
                            disabled={lockedLine || creatingInvoice}
                            onChange={(event) =>
                              handleItemNameSearch(
                                itemIndex,
                                event.target.value,
                                event.currentTarget,
                              )
                            }
                            onPaste={(event) =>
                              handleItemNamePaste(itemIndex, event)
                            }
                            onFocus={(event) => {
                              if ((item.itemName || "").trim().length >= 2) {
                                handleItemNameSearch(
                                  itemIndex,
                                  item.itemName,
                                  event.currentTarget,
                                );
                              }
                            }}
                            aria-label={`Part name for row ${index + 1}`}
                          />
                        </td>
                        <td className="ns-cell-box ns-brand">
                          <input
                            type="text"
                            className="ns-cell-input text-center"
                            placeholder="Brand"
                            value={item.brandName || item.brand || ""}
                            disabled={lockedLine || creatingInvoice}
                            onChange={(event) =>
                              updateItemField(
                                itemIndex,
                                "brandName",
                                event.target.value,
                              )
                            }
                            aria-label={`Brand for row ${index + 1}`}
                          />
                        </td>
                        <td className="ns-cell-box num">
                          <input
                            type="number"
                            min="0"
                            max={isProforma ? undefined : item.availableQuantity}
                            className="ns-cell-input text-center ns-input-qty"
                            placeholder="0"
                            value={
                              item.quantity === 0 || item.quantity === "" || item.quantity == null
                                ? ""
                                : item.quantity
                            }
                            disabled={creatingInvoice}
                            onFocus={(event) => event.currentTarget.select()}
                            onChange={(event) =>
                              updateItemQuantity(
                                itemIndex,
                                event.target.value,
                              )
                            }
                            onBlur={() => finishItemQuantityEdit(itemIndex)}
                            aria-label={`Quantity for ${item.partNumber || index + 1}`}
                          />
                        </td>
                        <td className="ns-cell-box num">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="ns-cell-input text-center"
                            placeholder="0.00"
                            value={
                              item.mrp === 0 || item.mrp === "" || item.mrp == null
                                ? ""
                                : item.mrp
                            }
                            disabled={creatingInvoice}
                            onFocus={(event) => event.currentTarget.select()}
                            onChange={(event) =>
                              updateItemField(
                                itemIndex,
                                "mrp",
                                event.target.value,
                              )
                            }
                            aria-label={`MRP for ${item.partNumber || index + 1}`}
                          />
                        </td>
                        <td className="ns-cell-box num">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="ns-cell-input text-center ns-input-price"
                            placeholder="0.00"
                            value={
                              item.sellingPrice === 0 ||
                              item.sellingPrice === "" ||
                              item.sellingPrice == null
                                ? ""
                                : item.sellingPrice
                            }
                            disabled={creatingInvoice}
                            title={columnPriceMode === "GST_INCLUSIVE" ? "Unit price (including tax)" : "Unit price (excluding tax)"}
                            onFocus={(event) => event.currentTarget.select()}
                            onChange={(event) =>
                              updateItemField(
                                itemIndex,
                                "sellingPrice",
                                event.target.value,
                              )
                            }
                            aria-label={`Unit price for ${item.partNumber || index + 1}`}
                          />
                        </td>
                        <td className="ns-cell-box num">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="ns-cell-input text-center"
                            placeholder="0"
                            value={
                              !discountPct || discountPct === 0
                                ? ""
                                : Number(discountPct.toFixed(2))
                            }
                            disabled={creatingInvoice}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) =>
                              updateItemDiscountPercent(itemIndex, e.target.value)
                            }
                            aria-label="Discount percentage"
                          />
                        </td>
                        <td className="ns-cell-box num">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="ns-cell-input text-center"
                            placeholder="0.00"
                            value={
                              !discountAmt || discountAmt === 0
                                ? ""
                                : Number(discountAmt.toFixed(2))
                            }
                            disabled={creatingInvoice}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) =>
                              updateItemDiscountAmount(
                                itemIndex,
                                e.target.value,
                                discountBase,
                              )
                            }
                            aria-label="Discount amount"
                          />
                        </td>
                        <td className="num ns-calc-cell">
                          {money(rowTaxable)}
                        </td>
                        <td className="num ns-calc-cell">
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
                        <td className="num ns-calc-cell">
                          {money(rowGstAmount)}
                        </td>
                        <td className="num ns-strong ns-calc-cell ns-calc-total">
                          {money(rowTotal)}
                        </td>
                        <td className="ctr">
                          <button
                            type="button"
                            className="ns-del"
                            onClick={() => removeItem(itemIndex)}
                            disabled={creatingInvoice}
                            title="Remove item"
                            aria-label="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>

              {displayRows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={4}>TOTAL</td>
                    <td className="num">{totals.qty || 0}</td>
                    <td className="num">{money(totals.mrp)}</td>
                    <td className="num">{money(totals.price)}</td>
                    <td className="num" />
                    <td className="num">{money(totals.discount)}</td>
                    <td className="num">{money(totals.taxable)}</td>
                    <td />
                    <td className="num">{money(calculatedGstTotal)}</td>
                    <td className="num">{money(totals.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="ns-table-foot">
            <button type="button" className="ns-add-row" onClick={addNewItemRow}>
              + ADD ROW
            </button>
          </div>
        </section>

        {/* ============ PAYMENT / OVERALL DISCOUNT / EDIT REASON ============ */}
        <div className="ns-bottom">
          <div className="ns-bottom-left">
            {isProforma && (
              <div className="ns-payment">
                <h2>Received</h2>

                <div
                  className="ns-seg"
                  role="group"
                  aria-label="Advance payment mode"
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
                      disabled={creatingInvoice}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {paymentMethod !== "CASH" && (
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
              </div>
            )}

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
                  {paymentStatus === "UNPAID"
                    ? "Reason for invoice edit & Unpaid status"
                    : "Reason for invoice edit"}{" "}
                  <span aria-hidden="true">*</span>
                </label>
                <textarea
                  id="invoice-edit-reason"
                  required
                  maxLength={500}
                  disabled={creatingInvoice}
                  value={editReason}
                  placeholder={
                    paymentStatus === "UNPAID"
                      ? "Specify the reason for editing and marking this invoice as Unpaid..."
                      : undefined
                  }
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

            {/* MIDDLE PROMINENT GRAND TOTAL DISPLAY */}
            <div className="ns-overall ns-middle-grand-total">
              <label>Grand Total</label>
              <div className="ns-grand-display">
                <strong>{money(effectiveGrandTotal)}</strong>
              </div>
            </div>

            <div className="ns-overall">
              <label htmlFor="ns-received-amount">
                Received
              </label>
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
                  placeholder="0.00"
                />
              </div>
            </div>

            {Number(receivedAmount) > 0 && (
              <div className="ns-balance-due-display">
                <span>Balance Due:</span>
                <strong>{money(Math.max(0, Number(effectiveGrandTotal) - Number(receivedAmount)))}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ FOOTER: BILL SUMMARY (left) + SAVE (right) ============ */}
      <div className="ns-actions">
        <div className="ns-foot-left">
          <div className="ns-eq" aria-label="Bill summary">
            <div className="ns-term" style={{ "--accent": "#64748b" }}>
              <span>Taxable amount</span>
              <strong>
                {money(effectiveTaxableAmount)}
              </strong>
            </div>

            {defaultGstType === "IGST" ? (
              <>
                <b className="ns-op">+</b>
                <div className="ns-term" style={{ "--accent": "#2563eb" }}>
                  <span>IGST</span>
                  <strong>
                    {money(effectiveGstTotal)}
                  </strong>
                </div>
              </>
            ) : defaultGstType === "CGST_SGST" ? (
              <>
                <b className="ns-op">+</b>
                <div className="ns-term" style={{ "--accent": "#2563eb" }}>
                  <span>CGST</span>
                  <strong>
                    {money(effectiveGstTotal / 2)}
                  </strong>
                </div>
                <b className="ns-op">+</b>
                <div className="ns-term" style={{ "--accent": "#7c3aed" }}>
                  <span>SGST</span>
                  <strong>
                    {money(effectiveGstTotal / 2)}
                  </strong>
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
              <strong>
                {money(effectiveGrandTotal)}
              </strong>
            </div>
          </div>

          {calcLoading && <em className="ns-foot-note">Calculating...</em>}
          {calcError && <em className="ns-foot-note error">{calcError}</em>}
        </div>

        <div className="ns-foot-right">
          {isProforma && (
            <button
              type="button"
              className="ns-btn"
              disabled={creatingInvoice}
              onClick={() =>
                navigate(
                  isSuperAdmin ? "/owner/sales/proforma" : "/store/sales/proforma"
                )
              }
            >
              Cancel
            </button>
          )}

          {(!isInvoiceEdit || isProforma) && !createdOrderId && (
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
      {rowSearch && rowSearch.results?.length > 0 && (
        <div
          className="ns-results fixed"
          style={{
            left: rowSearch.left,
            top: rowSearch.top,
            width: rowSearch.width,
            maxHeight: "320px",
            overflowY: "auto",
            zIndex: 5000,
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 12px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              fontSize: "11px",
              fontWeight: 600,
              color: "#64748b",
            }}
          >
            <span>Suggestions ({rowSearch.results.length})</span>
            <button
              type="button"
              onClick={() => setRowSearch(null)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: "4px",
                color: "#64748b",
                display: "inline-flex",
                alignItems: "center",
              }}
              title="Close suggestions"
              aria-label="Close suggestions"
            >
              <X size={14} />
            </button>
          </div>
          {rowSearch.results.map((product, index) =>
            renderStockResult(product, index, (picked) => {
              handleAddProduct(picked, rowSearch.itemIndex);
              setRowSearch(null);
            }),
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
                {customerForm.gstRegistrationType !== "UNREGISTERED" ||
                Boolean(customerForm.gstin?.trim()) ||
                isProforma
                  ? "Customer Name (Legal Name) *"
                  : "Customer Name *"}
                <input
                  className="ns-input"
                  placeholder={
                    customerForm.gstRegistrationType !== "UNREGISTERED" ||
                    Boolean(customerForm.gstin?.trim()) ||
                    isProforma
                      ? "Legal company name as per GST certificate"
                      : "Customer Name"
                  }
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
                  {!isProforma && <option value="UNREGISTERED">Unregistered</option>}
                  <option value="REGISTERED">Registered</option>
                </select>
              </label>

              <label>
                {customerForm.gstRegistrationType !== "UNREGISTERED"
                  ? "GSTIN *"
                  : "GSTIN (Optional)"}
                <input
                  className="ns-input"
                  placeholder="15-character GSTIN"
                  value={customerForm.gstin || ""}
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

              {(customerForm.gstRegistrationType !== "UNREGISTERED" ||
                Boolean(customerForm.gstin?.trim()) ||
                isProforma) && (
                <label style={{ gridColumn: "1 / -1" }}>
                  Trade Name (Optional)
                  <input
                    className="ns-input"
                    placeholder="Trade / Brand / Shop Name (if different from legal name)"
                    value={customerForm.tradeName || ""}
                    onChange={(event) =>
                      handleCustomerFormChange("tradeName", event.target.value)
                    }
                  />
                </label>
              )}

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
