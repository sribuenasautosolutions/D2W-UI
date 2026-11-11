import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowLeft, CirclePlus, Download, Filter,
  MoreHorizontal, PackageCheck, ReceiptText, RotateCcw, Search, Trash2, Upload, X,
} from "lucide-react";
import api from "../../../services/api";
import VendorBillBulkUploader from "./VendorBillBulkUploader";
import VendorPurchaseInvoiceView from "./VendorPurchaseInvoiceView";
import "./VendorPurchasesSection.css";

/* =========================================================
   Row model
   ========================================================= */
const emptyRow = () => ({
  key: `${Date.now()}-${Math.random()}`,
  itemId: null,
  partNumber: "",
  itemName: "",
  stockUnit: "PCS",
  packSize: null,
  contentsUnit: null,
  brandName: "",
  categoryName: "",
  masterName: "",
  description: "",
  oemNumber: "",
  quantity: "",
  damagedQuantity: "",
  rejectedQuantity: "",
  purchasePrice: "",
  discountPercentage: "",
  mrp: "",
  gstPercentage: "18",
  rackNumber: "",
  hsnCode: "",
  sellingPrice: "",
  productId: null,
  localProductId: null,
  selectedPartNumber: null,
  availableStock: null,
  discountAmount: "",
  priceSource: "MRP",
});

function getUser() {
  try { return JSON.parse(localStorage.getItem("user")) || {}; }
  catch { return {}; }
}

function isValidGstValue(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return true;
  return /^[A-Za-z0-9]{1,15}$/.test(trimmed);
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}

function displayBillStatus(bill) {
  return bill?.status === "DRAFT" ? "DRAFT" : (bill?.paymentStatus || "UNPAID");
}

function sortLabel(mode) {
  return { NEWEST: "Newest", OLDEST: "Oldest", AMOUNT_HIGH: "Amount high", AMOUNT_LOW: "Amount low" }[mode];
}

/* =========================================================
   Amount formula
   ---------------------------------------------------------
   GST_INCLUSIVE → lineTotal = PP × qty
   GST_EXCLUSIVE → lineTotal = (PP + PP × GST%) × qty
   ========================================================= */
function computeRowAmounts(row, columnMode = "GST_INCLUSIVE") {
  const acceptedQuantity = Math.max(
    0,
    Number(row.quantity || 0)
      - Number(row.damagedQuantity || 0)
      - Number(row.rejectedQuantity || 0)
  );

  const purchasePrice = Math.max(0, Number(row.purchasePrice || 0));
  const gstPct = Math.max(0, Number(row.gstPercentage || 0));
  const gstFactor = gstPct / 100;

  let taxableRate;
  let gstPerUnit;
  let lineTotal;

  if (columnMode === "GST_EXCLUSIVE") {
    gstPerUnit = purchasePrice * gstFactor;
    taxableRate = purchasePrice;
    lineTotal = (purchasePrice + gstPerUnit) * acceptedQuantity;
  } else {
    lineTotal = purchasePrice * acceptedQuantity;
    taxableRate = gstFactor > 0 ? purchasePrice / (1 + gstFactor) : purchasePrice;
    gstPerUnit = purchasePrice - taxableRate;
  }

  const taxableAmount = taxableRate * acceptedQuantity;
  const gstAmount = gstPerUnit * acceptedQuantity;

  return {
    acceptedQuantity,
    taxableRate,
    gstPerUnit,
    taxableAmount: Number(taxableAmount.toFixed(2)),
    gstAmount: Number(gstAmount.toFixed(2)),
    discountAmount: 0,
    lineTotal: Number(lineTotal.toFixed(2)),
  };
}

/* =========================================================
   Auto price calculation between MRP / Purchase Price / Selling Price
   ---------------------------------------------------------
   When the user types a value into ANY of the three and all three
   were previously blank, the other two are auto-filled.
   After that, editing one field only changes that field.
   ========================================================= */
function isPriceGroupEmpty(row) {
  return row.purchasePrice === "" && row.mrp === "" && row.sellingPrice === "";
}

function calculatePricesFromSource(row, source, sourceValue) {
  const sourcePrice = Number(sourceValue);

  const discount = Math.min(
    99.99,
    Math.max(0, Number(row.discountPercentage || 0))
  );

  const gst = Math.min(
    100,
    Math.max(0, Number(row.gstPercentage || 0))
  );

  const gstFactor = 1 + gst / 100;

  if (!Number.isFinite(sourcePrice) || sourcePrice <= 0) {
    return null;
  }

  const discountFactor = 1 - discount / 100;

  let mrp;
  let sellingPrice;
  let purchasePrice;

  if (source === "SELLING_PRICE") {
    sellingPrice = sourcePrice;
    mrp = Number((sourcePrice * gstFactor).toFixed(2));
    const discountAmount = Number((sellingPrice * discount / 100).toFixed(2));
    purchasePrice = Number((sellingPrice - discountAmount).toFixed(2)) * gstFactor;
  } else if (source === "MRP") {
    mrp = sourcePrice;
    sellingPrice = sourcePrice / gstFactor;
    purchasePrice = sourcePrice - Number((sourcePrice * discount / 100).toFixed(2));
  } else if (source === "PURCHASE_PRICE") {
    purchasePrice = sourcePrice;
    mrp = Number((sourcePrice / discountFactor).toFixed(2));
    sellingPrice = mrp / gstFactor;
  } else {
    return null;
  }

  return {
    mrp: Number(mrp || 0).toFixed(2),
    sellingPrice: Number(sellingPrice || 0).toFixed(2),
    purchasePrice: Number(purchasePrice || 0).toFixed(2),
  };
}

function isCompleteRow(row) {
  return Boolean(
    row.partNumber.trim()
    && row.itemName.trim()
    && row.brandName.trim()
    && Number(row.quantity) > 0
    && Number(row.damagedQuantity || 0) + Number(row.rejectedQuantity || 0) < Number(row.quantity)
    && row.purchasePrice !== "" && Number(row.purchasePrice) > 0
    && Number(row.mrp) > 0
    && Number(row.sellingPrice) > 0
  );
}

function isEmptyRow(row) {
  return !row.partNumber.trim()
    && !row.itemName.trim()
    && !row.brandName.trim()
    && !row.categoryName.trim()
    && !row.masterName.trim()
    && row.quantity === ""
    && Number(row.damagedQuantity || 0) === 0
    && Number(row.rejectedQuantity || 0) === 0
    && row.purchasePrice === ""
    && row.mrp === ""
    && row.sellingPrice === ""
    && !row.hsnCode.trim()
    && !row.rackNumber.trim();
}

function withTrailingEmptyRow(rows, defaults = {}) {
  return rows.length > 0 && isCompleteRow(rows.at(-1))
    ? [...rows, { ...emptyRow(), ...defaults }]
    : rows;
}

/* =========================================================
   Excel-Style Resizable Columns Hook
   ========================================================= */
const ITEM_TABLE_COLUMNS = [
  { id: "slNo", label: "Sl. No.", defaultWidth: 60, minWidth: 40, maxWidth: 120 },
  { id: "partNumber", label: "Part No.", defaultWidth: 110, minWidth: 80, maxWidth: 350 },
  { id: "itemName", label: "Item Name", defaultWidth: 150, minWidth: 100, maxWidth: 500 },
  { id: "brandName", label: "Brand", defaultWidth: 90, minWidth: 60, maxWidth: 250 },
  { id: "hsnCode", label: "HSN", defaultWidth: 70, minWidth: 50, maxWidth: 160 },
  { id: "quantity", label: "Qty", defaultWidth: 60, minWidth: 45, maxWidth: 150 },
  { id: "purchasePrice", label: "Purchase Price", defaultWidth: 130, minWidth: 105, maxWidth: 300 },
  { id: "mrp", label: "MRP", defaultWidth: 85, minWidth: 60, maxWidth: 200 },
  { id: "sellingPrice", label: "Selling", defaultWidth: 85, minWidth: 60, maxWidth: 200 },
  { id: "discountPercent", label: "Disc %", defaultWidth: 60, minWidth: 45, maxWidth: 150 },
  { id: "gstPercent", label: "GST %", defaultWidth: 60, minWidth: 45, maxWidth: 150 },
  { id: "rackLocation", label: "Rack", defaultWidth: 70, minWidth: 50, maxWidth: 180 },
  { id: "amount", label: "Amount", defaultWidth: 100, minWidth: 70, maxWidth: 250 },
  { id: "action", label: "", defaultWidth: 36, minWidth: 36, maxWidth: 60, resizable: false },
];

const TOTAL_DEFAULT_WIDTH = ITEM_TABLE_COLUMNS.reduce((sum, col) => sum + col.defaultWidth, 0);

function useResizableColumns({ tableKey, columnsConfig, tableRef }) {
  const getUserId = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user"));
      return u?.id || "guest";
    } catch {
      return "guest";
    }
  };

  const storageKey = `d2w_col_widths_${tableKey}_${getUserId()}`;

  const defaultWidths = useMemo(() => {
    const map = {};
    columnsConfig.forEach((col) => {
      map[col.id] = col.defaultWidth;
    });
    return map;
  }, [columnsConfig]);

  const [hasCustomWidths, setHasCustomWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return columnsConfig.some(
          (col) => typeof parsed[col.id] === "number" && parsed[col.id] !== col.defaultWidth
        );
      }
    } catch {}
    return false;
  });

  const [columnWidths, setColumnWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...defaultWidths };
        columnsConfig.forEach((col) => {
          if (typeof parsed[col.id] === "number" && !isNaN(parsed[col.id])) {
            merged[col.id] = Math.max(
              col.minWidth || 30,
              Math.min(col.maxWidth || 800, parsed[col.id])
            );
          }
        });
        return merged;
      }
    } catch {
      /* ignore */
    }
    return defaultWidths;
  });

  const resizingRef = useRef(null);

  const startResize = useCallback(
    (colId, e) => {
      e.preventDefault();
      e.stopPropagation();

      const col = columnsConfig.find((c) => c.id === colId);
      if (!col || col.resizable === false) return;

      // If not yet customized, capture real rendered widths from DOM so dragging never snaps
      let currentWidths = { ...columnWidths };
      if (!hasCustomWidths && tableRef?.current) {
        const ths = tableRef.current.querySelectorAll("thead th");
        if (ths.length === columnsConfig.length) {
          columnsConfig.forEach((c, idx) => {
            const rendered = Math.round(ths[idx].getBoundingClientRect().width);
            if (rendered > 0) {
              currentWidths[c.id] = rendered;
            }
          });
          setColumnWidths(currentWidths);
        }
        setHasCustomWidths(true);
      }

      const startX = e.clientX;
      const startWidth = currentWidths[colId] || col.defaultWidth;

      resizingRef.current = {
        colId,
        startX,
        startWidth,
        minWidth: col.minWidth || 40,
        maxWidth: col.maxWidth || 800,
        initialWidths: currentWidths,
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMouseMove = (moveEvent) => {
        if (!resizingRef.current) return;
        const { colId: activeColId, startX: origX, startWidth: origW, minWidth, maxWidth, initialWidths } =
          resizingRef.current;
        const delta = moveEvent.clientX - origX;
        const newWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(origW + delta)));
        setColumnWidths((prev) => ({
          ...(initialWidths || prev),
          [activeColId]: newWidth,
        }));
      };

      const handleMouseUp = () => {
        if (resizingRef.current) {
          setHasCustomWidths(true);
          setColumnWidths((latest) => {
            try {
              localStorage.setItem(storageKey, JSON.stringify(latest));
            } catch {}
            return latest;
          });
        }
        resizingRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [columnWidths, columnsConfig, hasCustomWidths, storageKey, tableRef]
  );

  const resetColumn = useCallback(
    (colId) => {
      const col = columnsConfig.find((c) => c.id === colId);
      if (!col) return;
      setColumnWidths((prev) => {
        const updated = {
          ...prev,
          [colId]: col.defaultWidth,
        };
        const allMatchDefaults = columnsConfig.every(
          (c) => !updated[c.id] || updated[c.id] === c.defaultWidth
        );
        if (allMatchDefaults) {
          setHasCustomWidths(false);
          try {
            localStorage.removeItem(storageKey);
          } catch {}
        } else {
          try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    },
    [columnsConfig, storageKey]
  );

  const resetAllColumns = useCallback(() => {
    setColumnWidths(defaultWidths);
    setHasCustomWidths(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [defaultWidths, storageKey]);

  const totalTableWidth = useMemo(() => {
    return Object.values(columnWidths).reduce((sum, w) => sum + (Number(w) || 0), 0);
  }, [columnWidths]);

  return {
    columnWidths,
    hasCustomWidths,
    startResize,
    resetColumn,
    resetAllColumns,
    totalTableWidth,
  };
}

/* =========================================================
   Main component
   ========================================================= */
function ManualStockReceipt() {
  const user = getUser();
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const [rows, setRows] = useState([emptyRow()]);
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(user.storeId ? String(user.storeId) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [gstMode, setGstMode] = useState("CGST_SGST");
  const [gstPercentage, setGstPercentage] = useState("18");
  const [columnPriceMode, setColumnPriceMode] = useState("GST_INCLUSIVE");

  const itemsTableRef = useRef(null);

  const {
    columnWidths: itemColWidths,
    hasCustomWidths: hasItemCustomWidths,
    startResize: startItemColResize,
    resetColumn: resetItemCol,
    resetAllColumns: resetAllItemCols,
    totalTableWidth: itemsTableTotalWidth,
  } = useResizableColumns({
    tableKey: "vendor_purchases_items",
    columnsConfig: ITEM_TABLE_COLUMNS,
    tableRef: itemsTableRef,
  });

  const [vendors, setVendors] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [screen, setScreen] = useState("list");
  const [billSearch, setBillSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortMode, setSortMode] = useState("NEWEST");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [editingBillId, setEditingBillId] = useState(null);
  const [editReason, setEditReason] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorModalMessage, setVendorModalMessage] = useState(null);
  const [vendorModalStoreId, setVendorModalStoreId] = useState("");
  const [vendorForm, setVendorForm] = useState({
    vendorName: "", phone: "", email: "", gstNumber: "", address: "",
    contactPerson: "", state: "", pincode: "",
  });
  const [suggestions, setSuggestions] = useState({});
  const [suggestionFocus, setSuggestionFocus] = useState(null);
  const [importPreview, setImportPreview] = useState(null);

  const firstInputRefs = useRef({});
  const suggestionRequestRefs = useRef({});
  const filterRef = useRef(null);
  const moreRef = useRef(null);
  const messageRef = useRef(null);

  const currentRowDefaults = { gstPercentage };

  /* ---- outside-click / Escape for menus ---- */
  useEffect(() => {
    if (!filterOpen && !moreMenuOpen) return;
    const onClick = (event) => {
      if (filterOpen && filterRef.current && !filterRef.current.contains(event.target)) setFilterOpen(false);
      if (moreMenuOpen && moreRef.current && !moreRef.current.contains(event.target)) setMoreMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { setFilterOpen(false); setMoreMenuOpen(false); }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen, moreMenuOpen]);

  /* ---- auto-append trailing empty row ---- */
  useEffect(() => {
    setRows((current) => {
      const last = current[current.length - 1];
      return last && isCompleteRow(last)
        ? [...current, { ...emptyRow(), ...currentRowDefaults }]
        : current;
    });
  }, [rows, gstPercentage]);

  /* ---- load vendors ---- */
  useEffect(() => {
    if (!storeId) { setVendors([]); setVendorId(""); return; }
    let active = true;
    api.get("/vendors", { params: { storeId: Number(storeId), activeOnly: true } })
      .then((res) => {
        if (!active) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setVendors(data);
        setVendorId((cur) => data.some((v) => String(v.id) === cur) ? cur : "");
      })
      .catch(() => active && setMessage({ type: "error", text: "Unable to load vendors" }));
    return () => { active = false; };
  }, [storeId]);

  /* ---- load purchases ---- */
  useEffect(() => {
    if (!storeId) { setPurchases([]); return; }
    api.get("/vendor-purchases", { params: { storeId: Number(storeId) } })
      .then((res) => setPurchases(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPurchases([]));
  }, [storeId]);

  const loadStores = async () => {
    if (!isSuperAdmin || stores.length) return;
    const res = await api.get("/stores", { params: { page: 0, size: 100, active: true } });
    setStores(Array.isArray(res.data?.content) ? res.data.content : []);
  };

  /* ---- row mutators ---- */
  const updateRow = (key, field, value) => {
    setRows((current) =>
      withTrailingEmptyRow(
        current.map((row) => row.key !== key ? row : {
          ...row,
          [field]: value,
          importErrors: [],
          ...(field === "partNumber" ? {
            productId: null, localProductId: null, selectedPartNumber: null,
            ...(row.importStatus ? { importStatus: "NEW" } : {}),
          } : {}),
        }),
        currentRowDefaults
      )
    );
  };

  /* ------------------------------------------------------
     updatePriceRow — the core pricing engine.
     - When all three prices are blank, typing into any one of them
       auto-calculates the other two via calculatePricesFromSource.
     - Once any price has a value, only that field is changed.
     - Editing Discount% or GST% recalculates from the tracked source.
     ------------------------------------------------------ */
  const updatePriceRow = (key, field, value) => {
    const sourceByField = {
      mrp: "MRP",
      sellingPrice: "SELLING_PRICE",
      purchasePrice: "PURCHASE_PRICE",
    };
    const fieldBySource = {
      MRP: "mrp",
      SELLING_PRICE: "sellingPrice",
      PURCHASE_PRICE: "purchasePrice",
    };

    setRows((current) =>
      withTrailingEmptyRow(
        current.map((row) => {
          if (row.key !== key) return row;

          // ----- Typing into MRP / Selling / Purchase -----
          if (sourceByField[field]) {
            const source = sourceByField[field];
            const canCalculate = isPriceGroupEmpty(row) || row.priceSource === source;

            if (!canCalculate) {
              // user is manually editing one field — only update it
              return { ...row, [field]: value, priceSource: "MANUAL" };
            }

            if (value === "") {
              return {
                ...row,
                mrp: "",
                sellingPrice: "",
                purchasePrice: "",
                priceSource: source,
              };
            }

            const calculated = calculatePricesFromSource(row, source, value, columnPriceMode);
            return calculated
              ? { ...row, ...calculated, [field]: value, priceSource: source, importErrors: [] }
              : { ...row, [field]: value, priceSource: source, importErrors: [] };
          }

          // ----- Typing into Discount% or GST% recalculates from source -----
          if (field === "discountPercentage" || field === "gstPercentage") {
            const nextRow = { ...row, [field]: value };
            const sourceField = fieldBySource[row.priceSource];
            if (!sourceField) return nextRow;
            const calculated = calculatePricesFromSource(
              nextRow,
              row.priceSource,
              nextRow[sourceField],
              columnPriceMode
            );
            return calculated ? { ...nextRow, ...calculated } : nextRow;
          }

          return row;
        }),
        currentRowDefaults
      )
    );
  };

  /* ---- when the column price mode changes, recalc all rows that have a source ---- */
  const applyColumnPriceMode = (nextMode) => {
    setColumnPriceMode(nextMode);
    setRows((current) =>
      current.map((row) => {
        const sourceField = {
          MRP: "mrp",
          SELLING_PRICE: "sellingPrice",
          PURCHASE_PRICE: "purchasePrice",
        }[row.priceSource];
        if (!sourceField) return row;
        const calculated = calculatePricesFromSource(
          row,
          row.priceSource,
          row[sourceField],
          nextMode
        );
        return calculated ? { ...row, ...calculated } : row;
      })
    );
  };

  const addRow = () => {
    const next = { ...emptyRow(), ...currentRowDefaults };
    let focusKey = next.key;
    setRows((current) => {
      const last = current[current.length - 1];
      if (last && isEmptyRow(last)) { focusKey = last.key; return current; }
      return [...current, next];
    });
    requestAnimationFrame(() => firstInputRefs.current[focusKey]?.focus());
  };

  const removeRow = (key) => {
    setRows((current) =>
      current.length === 1
        ? [{ ...emptyRow(), ...currentRowDefaults }]
        : current.filter((row) => row.key !== key)
    );
  };

  /* ---- suggestions ---- */
  const findSuggestions = async (row, field, value) => {
    const reqId = (suggestionRequestRefs.current[row.key] || 0) + 1;
    suggestionRequestRefs.current[row.key] = reqId;
    setSuggestionFocus({ key: row.key, field });
    updateRow(row.key, field, field === "partNumber" ? value.toUpperCase() : value);

    if (!storeId || value.trim().length < 1) {
      setSuggestions((c) => ({ ...c, [row.key]: [] }));
      return;
    }
    try {
      const res = await api.get("/store-inventory/suggestions", {
        params: { storeId: Number(storeId), query: value.trim() },
      });
      if (suggestionRequestRefs.current[row.key] !== reqId) return;
      const matches = Array.isArray(res.data) ? res.data : res.data?.content || [];
      const exact = field === "partNumber"
        ? matches.find((p) => p.partNumber?.toLowerCase() === value.trim().toLowerCase())
        : null;
      if (exact) { selectSuggestion(row.key, exact); return; }
      setSuggestions((c) => ({ ...c, [row.key]: matches }));
    } catch {
      if (suggestionRequestRefs.current[row.key] !== reqId) return;
      setSuggestions((c) => ({ ...c, [row.key]: [] }));
    }
  };

  const selectSuggestion = (key, product) => {
    setRows((current) =>
      withTrailingEmptyRow(
        current.map((row) => row.key === key ? {
          ...row,
          productId: product.productId,
          localProductId: product.localProductId,
          selectedPartNumber: product.partNumber || null,
          partNumber: product.partNumber || "",
          itemName: product.itemName || "",
          stockUnit: product.stockUnit || "PCS",
          packSize: product.packSize ?? null,
          contentsUnit: product.contentsUnit ?? null,
          brandName: product.brandName || "",
          categoryName: product.categoryName || "",
          masterName: product.masterName || "",
          description: product.description || "",
          oemNumber: product.oemNumber || "",
          gstPercentage: product.gstPercentage ?? row.gstPercentage,
          hsnCode: product.hsnCode || "",
          purchasePrice: product.purchasePrice ?? "",
          sellingPrice: product.sellingPrice ?? "",
          mrp: product.mrp ?? "",
          priceSource: product.priceSource || "MANUAL",
          availableStock: product.availableStock ?? 0,
          ...(row.importStatus ? { importStatus: "EXISTING", importErrors: [] } : {}),
        } : row),
        currentRowDefaults
      )
    );
    setSuggestions((c) => ({ ...c, [key]: [] }));
    setSuggestionFocus(null);
  };

  /* ---- validation ---- */
  const validate = () => {
    if (!storeId) return "Select a store";
    if (!vendorId) return "Select a vendor";
    if (!invoiceNumber.trim()) return "Vendor invoice number is required";
    if (!invoiceDate) return "Invoice date is required";
    if (!dueDate) return "Due date is required";
    if (editingBillId && !editReason.trim()) return "Reason for editing is required";
    if (paymentStatus === "PAID" && !paymentMethod) return "Select the payment method";

    const receiptRows = rows.filter((row) => !isEmptyRow(row));
    if (!receiptRows.length) return "Enter at least one stock row";

    for (let i = 0; i < receiptRows.length; i++) {
      const row = receiptRows[i];
      const label = `Row ${i + 1}`;
      if (row.importErrors?.length) return `${label}: ${row.importErrors.join("; ")}`;
      if (!row.partNumber.trim()) return `${label}: Part Number is required`;
      if (!row.itemName.trim()) return `${label}: Item Name is required`;
      if (!row.brandName.trim()) return `${label}: Brand is required`;
      if (row.importStatus === "NEW" && !row.hsnCode.trim()) return `${label}: HSN is required for new imported items`;
      if (!Number.isSafeInteger(Number(row.quantity)) || Number(row.quantity) <= 0) return `${label}: Quantity must be a positive whole number`;
      const unavailable = Number(row.damagedQuantity || 0) + Number(row.rejectedQuantity || 0);
      if (unavailable >= Number(row.quantity)) return `${label}: accepted quantity must be greater than zero`;
      if (Number(row.purchasePrice) <= 0 || row.purchasePrice === "") return `${label}: Purchase Price must be greater than zero`;
      const discountPct = Number(row.discountPercentage || 0);
      if (Number.isNaN(discountPct) || discountPct < 0 || discountPct >= 100) return `${label}: Discount % must be at least 0 and below 100`;
      if (Number(row.mrp) <= 0) return `${label}: MRP must be greater than zero`;
      if (Number(row.sellingPrice) <= 0) return `${label}: Selling Price is required`;
      if (Number(row.sellingPrice) > Number(row.mrp)) return `${label}: Selling Price cannot be greater than MRP`;
    }
    return "";
  };

  /* ---- save ---- */
  const savePurchase = async (purchaseStatus) => {
    const error = validate();
    if (error) { setMessage({ type: "error", text: error }); return; }

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        storeId: Number(storeId),
        vendorId: Number(vendorId),
        vendorInvoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        dueDate,
        paymentStatus,
        paymentMethod: paymentStatus === "PAID" ? paymentMethod : null,
        editReason: editingBillId ? editReason.trim() : null,
        status: editingBillId ? (selectedBill?.status || purchaseStatus) : purchaseStatus,
        gstMode,
        priceMode: columnPriceMode,
        items: rows.filter((row) => !isEmptyRow(row)).map((row) => {
          const amounts = computeRowAmounts(row, columnPriceMode);
          return {
            itemId: row.itemId,
            productId: row.selectedPartNumber?.trim().toUpperCase() === row.partNumber.trim().toUpperCase() ? row.productId : null,
            localProductId: row.selectedPartNumber?.trim().toUpperCase() === row.partNumber.trim().toUpperCase() ? row.localProductId : null,
            partNumber: row.partNumber.trim(),
            itemName: row.itemName.trim(),
            stockUnit: row.stockUnit || "PCS",
            packSize: row.packSize || null,
            contentsUnit: row.contentsUnit || null,
            brandName: row.brandName.trim(),
            receivedQuantity: Number(row.quantity),
            damagedQuantity: Number(row.damagedQuantity || 0),
            rejectedQuantity: Number(row.rejectedQuantity || 0),
            purchasePrice: Number(row.purchasePrice),
            discountPercentage: Number(row.discountPercentage || 0),
            discountAmount: amounts.discountAmount,
            sellingPrice: Number(row.sellingPrice),
            mrp: Number(row.mrp),
            priceSource: row.priceSource || "MRP",
            priceMode: columnPriceMode,
            hsnCode: row.hsnCode.trim() || null,
            categoryName: row.categoryName.trim() || null,
            masterName: row.masterName.trim() || null,
            description: row.description.trim() || null,
            oemNumber: row.oemNumber.trim() || null,
            gstPercentage: row.gstPercentage === "" ? null : Number(row.gstPercentage),
            rackNumber: row.rackNumber.trim() || null,
            lineTotal: amounts.lineTotal,
            taxableAmount: amounts.taxableAmount,
            gstAmount: amounts.gstAmount,
          };
        }),
      };

      const response = editingBillId
        ? await api.put(`/vendor-purchases/${editingBillId}`, payload)
        : await api.post("/vendor-purchases", payload);

      const listRes = await api.get("/vendor-purchases", { params: { storeId: Number(storeId) } });
      setPurchases(Array.isArray(listRes.data) ? listRes.data : []);

      setMessage({ type: "success", text: response.data.message || "Bill saved successfully" });

      setRows([emptyRow()]);
      setInvoiceNumber("");
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setDueDate(new Date().toISOString().slice(0, 10));
      setEditReason("");
      setEditingBillId(null);
      setSelectedBill(null);
      setImportPreview(null);
      setScreen("list");
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Unable to receive stock" });
    } finally {
      setSaving(false);
    }
  };

  /* ---- vendor modal ---- */
  const openVendorModal = () => {
    setVendorForm({
      vendorName: "", phone: "", email: "", gstNumber: "", address: "",
      contactPerson: "", state: "", pincode: "",
    });
    setVendorModalStoreId(storeId || "");
    setVendorModalMessage(null);
    setVendorModalOpen(true);
  };

  const closeVendorModal = () => {
    if (vendorSaving) return;
    setVendorModalOpen(false);
    setVendorModalMessage(null);
  };

  const createVendor = async () => {
    const targetStoreId = isSuperAdmin ? vendorModalStoreId : storeId;
    if (!targetStoreId) return setVendorModalMessage({ type: "error", text: "Please select a store." });
    if (!vendorForm.vendorName.trim()) return setVendorModalMessage({ type: "error", text: "Vendor name is required" });
    if (!/^\d{10}$/.test(vendorForm.phone)) return setVendorModalMessage({ type: "error", text: "Vendor phone must contain 10 digits" });
    if (!isValidGstValue(vendorForm.gstNumber)) return setVendorModalMessage({ type: "error", text: "GST number can only contain letters and numbers, up to 15 characters" });

    setVendorSaving(true);
    try {
      await api.post("/vendors", {
        ...vendorForm,
        storeId: Number(targetStoreId),
        email: vendorForm.email.trim() || null,
        gstNumber: vendorForm.gstNumber.trim().toUpperCase(),
        address: vendorForm.address.trim() || null,
        contactPerson: vendorForm.contactPerson.trim() || null,
        state: vendorForm.state.trim() || null,
        pincode: vendorForm.pincode.trim(),
      });

      if (String(targetStoreId) === String(storeId)) {
        const response = await api.get("/vendors", { params: { storeId: Number(storeId), activeOnly: true } });
        const data = Array.isArray(response.data) ? response.data : [];
        setVendors(data);
        const created = data.find(
          (vendor) => vendor.vendorName.toLowerCase() === vendorForm.vendorName.trim().toLowerCase()
        );
        setVendorId(created ? String(created.id) : "");
      }

      setVendorModalOpen(false);
      setVendorModalMessage(null);
      setVendorForm({
        vendorName: "", phone: "", email: "", gstNumber: "", address: "",
        contactPerson: "", state: "", pincode: "",
      });
      setMessage({ type: "success", text: "Vendor created successfully" });
    } catch (error) {
      setVendorModalMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to create vendor",
      });
    } finally {
      setVendorSaving(false);
    }
  };

  const handleVendorChange = (value) => {
    if (value === "__add_vendor__") { openVendorModal(); return; }
    setVendorId(value);
  };

  /* ---- bill actions ---- */
  const startNewBill = () => {
    setEditingBillId(null);
    setSelectedBill(null);
    setVendorId("");
    setInvoiceNumber("");
    const today = new Date().toISOString().slice(0, 10);
    setInvoiceDate(today);
    setDueDate(today);
    setPaymentStatus("PAID");
    setPaymentMethod("CASH");
    setEditReason("");
    setGstMode("CGST_SGST");
    setGstPercentage("18");
    setColumnPriceMode("GST_INCLUSIVE");
    setRows([emptyRow()]);
    setImportPreview(null);
    setMessage(null);
    setScreen("editor");
  };

  const openDraft = async (receiptId) => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await api.post(`/vendor-purchases/${receiptId}/open`);
      const listRes = await api.get("/vendor-purchases", { params: { storeId: Number(storeId) } });
      setPurchases(Array.isArray(listRes.data) ? listRes.data : []);
      setMessage({ type: "success", text: response.data.message });
      setSelectedBill(response.data);
      setScreen("detail");
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Unable to open the draft" });
    } finally {
      setSaving(false);
    }
  };

  const viewBill = async (receiptId) => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await api.get(`/vendor-purchases/${receiptId}`);
      setSelectedBill(response.data);
      setScreen("detail");
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Unable to load bill" });
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = () => {
    if (!selectedBill) return;
    setEditingBillId(selectedBill.receiptId);
    setVendorId(String(selectedBill.vendorId));
    setInvoiceNumber(selectedBill.vendorInvoiceNumber || "");
    setInvoiceDate(selectedBill.invoiceDate || "");
    setDueDate(selectedBill.dueDate || selectedBill.invoiceDate || "");
    setPaymentStatus(selectedBill.paymentStatus || "UNPAID");
    setPaymentMethod(selectedBill.paymentMethod || "CASH");
    setEditReason("");
    setGstMode(selectedBill.gstMode || "CGST_SGST");
    setColumnPriceMode(selectedBill.priceMode || "GST_INCLUSIVE");

    const loadedRows = (selectedBill.items || []).map((item) => ({
      ...emptyRow(),
      itemId: item.itemId,
      productId: item.productId,
      localProductId: item.localProductId,
      selectedPartNumber: item.partNumber,
      partNumber: item.partNumber || "",
      itemName: item.itemName || "",
      stockUnit: item.stockUnit || "PCS",
      packSize: item.packSize ?? null,
      contentsUnit: item.contentsUnit ?? null,
      brandName: item.brandName || "",
      categoryName: item.categoryName || "",
      masterName: item.masterName || "",
      description: item.description || "",
      oemNumber: item.oemNumber || "",
      hsnCode: item.hsnCode || "",
      quantity: String(item.receivedQuantity ?? item.acceptedQuantity ?? ""),
      purchasePrice: String(item.purchasePrice ?? ""),
      discountPercentage: String(item.discountPercentage ?? 0),
      mrp: String(item.mrp ?? ""),
      sellingPrice: String(item.sellingPrice ?? ""),
      gstPercentage: String(item.gstPercentage ?? gstPercentage),
      rackNumber: item.rackNumber || "",
      priceSource: item.priceSource || "MANUAL",
    }));
    setRows(
      loadedRows.length
        ? [...loadedRows, { ...emptyRow(), gstPercentage }]
        : [emptyRow()]
    );
    setMessage(null);
    setScreen("editor");
  };

  const exportBills = async () => {
    if (!visiblePurchases.length) { setMessage({type:"error",text:"No bills to export."}); return; }
    setSaving(true);
    try {
      const response = await api.post("/vendor-purchases/export", visiblePurchases.map(bill => bill.receiptId), {responseType:"blob"});
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href=url; link.download="vendor-bills.xlsx";
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMoreMenuOpen(false);
    } catch { setMessage({type:"error",text:"Unable to export vendor bills. Please retry."}); }
    finally { setSaving(false); }
  };

  const openBillImport = () => {
    setMoreMenuOpen(false);
    if (!storeId) {
      setMessage({ type: "error", text: "Select a store before importing bill items." });
      return;
    }
    setMessage(null);
    setScreen("import");
  };

  const loadImportedItems = async (uploadResult) => {
    setSaving(true);
    setMessage(null);
    try {
      const importedRows = Array.isArray(uploadResult?.rows) ? uploadResult.rows : [];
      const preparedRows = importedRows.map((imported) => ({
        ...emptyRow(),
        partNumber: imported.partNumber || "",
        itemName: imported.itemName || "",
        brandName: imported.brandName || "",
        hsnCode: imported.hsnCode || "",
        quantity: imported.quantity == null ? "" : String(imported.quantity),
        purchasePrice: imported.purchasePrice == null ? "" : String(imported.purchasePrice),
        mrp: imported.mrp == null ? "" : String(imported.mrp),
        sellingPrice: imported.sellingPrice == null ? "" : String(imported.sellingPrice),
        priceSource: imported.priceSource || "MANUAL",
        discountPercentage: imported.discountPercentage == null ? "0" : String(imported.discountPercentage),
        gstPercentage: String(imported.gstPercentage ?? 18),
        rackNumber: imported.rackNumber || "",
        importStatus: imported.errors?.length ? "ERROR" : "NEW",
        importErrors: imported.errors || [],
        importRowNumber: imported.rowNumber,
      }));

      setEditingBillId(null);
      setSelectedBill(null);
      setVendorId("");
      setInvoiceNumber("");
      const today = new Date().toISOString().slice(0, 10);
      setInvoiceDate(today);
      setDueDate(today);
      setPaymentStatus("UNPAID");
      setPaymentMethod("CASH");
      setEditReason("");
      setGstMode("CGST_SGST");
      setGstPercentage("18");
      setColumnPriceMode("GST_INCLUSIVE");
      setRows(
        preparedRows.length
          ? [...preparedRows, { ...emptyRow(), gstPercentage: "18" }]
          : [{ ...emptyRow(), gstPercentage: "18" }]
      );
      setImportPreview({
        fileName: uploadResult.fileName,
        totalRows: uploadResult.totalRows,
        invalidRows: uploadResult.invalidRows,
        existingCount: 0,
        newCount: importedRows.length,
      });
      setScreen("editor");
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to prepare the bill preview",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleFilter = () => { setMoreMenuOpen(false); setFilterOpen((o) => !o); };
  const toggleMore = () => { setFilterOpen(false); setMoreMenuOpen((o) => !o); };

  /* ---- derived ---- */
  const enteredRows = rows.filter((row) => !isEmptyRow(row));

  const purchaseSummary = (() => {
    let totalItems = 0;
    let taxableAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let grandTotal = 0;

    rows.forEach((row) => {
      if (isEmptyRow(row)) return;
      const a = computeRowAmounts(row, columnPriceMode);
      totalItems += 1;
      taxableAmount += a.taxableAmount;
      grandTotal += a.lineTotal;

      if (gstMode === "IGST") {
        igstAmount += a.gstAmount;
      } else {
        cgstAmount += a.gstAmount / 2;
        sgstAmount += a.gstAmount / 2;
      }
    });

    const roundOff = Math.round(grandTotal) - grandTotal;

    return {
      totalItems,
      taxableAmount: Number(taxableAmount.toFixed(2)),
      cgstAmount: Number(cgstAmount.toFixed(2)),
      sgstAmount: Number(sgstAmount.toFixed(2)),
      igstAmount: Number(igstAmount.toFixed(2)),
      totalGstAmount: Number((cgstAmount + sgstAmount + igstAmount).toFixed(2)),
      roundOffAmount: Number(roundOff.toFixed(2)),
      totalAmount: Math.round(grandTotal),
      balanceDue: paymentStatus === "PAID" ? 0 : Math.round(grandTotal),
    };
  })();

  const normalizedSearch = billSearch.trim().toLowerCase();

  const visiblePurchases = purchases
    .filter((p) => statusFilter === "ALL" || displayBillStatus(p) === statusFilter)
    .filter((p) => !normalizedSearch || [
      p.vendorInvoiceNumber, p.receiptNumber, p.vendorName, displayBillStatus(p),
    ].some((v) => String(v || "").toLowerCase().includes(normalizedSearch)))
    .sort((a, b) => {
      if (sortMode === "OLDEST") return String(a.invoiceDate).localeCompare(String(b.invoiceDate));
      if (sortMode === "AMOUNT_HIGH") return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
      if (sortMode === "AMOUNT_LOW") return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      return String(b.invoiceDate).localeCompare(String(a.invoiceDate));
    });

  const paidBills = purchases.filter((b) => b.status !== "DRAFT" && b.paymentStatus === "PAID");
  const balanceBills = purchases.filter((b) => b.status !== "DRAFT" && b.paymentStatus === "UNPAID");
  const paidValue = paidBills.reduce((t, b) => t + Number(b.totalAmount || 0), 0);
  const balanceValue = balanceBills.reduce((t, b) => t + Number(b.balanceDue ?? b.totalAmount ?? 0), 0);

  /* =======================================================
     RENDER
     ======================================================= */
  return (
    <section className="vp-page">
      {/* ===================== LIST VIEW ===================== */}
      {screen === "list" && (
        <div className="vp-list-page">
          <header className="vp-list-header">
            <div className="vp-list-title-group">
              <div className="vp-list-title-icon">
                <ReceiptText size={21} />
              </div>
              <div>
                <span className="vp-list-eyebrow">Purchases</span>
                <h1 className="vp-page-title">Vendor bills</h1>
                <p className="vp-page-subtitle">
                  Review supplier invoices, payment status and stock receipts.
                </p>
              </div>
            </div>

            <div className="vp-list-header-actions">
              <div className="vp-list-search">
                <Search size={16} />
                <input
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                  placeholder="Search bills or vendors"
                />
                {billSearch && (
                  <button type="button" onClick={() => setBillSearch("")} aria-label="Clear">
                    <X size={14} />
                  </button>
                )}
              </div>

              {isSuperAdmin && (
                <label className="vp-store-filter-field">
                  <span>Store</span>
                  <select
                    value={storeId}
                    onFocus={loadStores}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="vp-store-filter-select"
                  >
                    <option value="">Select store</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.storeName}</option>
                    ))}
                  </select>
                </label>
              )}

              <div ref={filterRef} className="vp-relative">
                <button
                  type="button"
                  className={`vp-toolbar-button${statusFilter !== "ALL" ? " is-active" : ""}`}
                  onClick={toggleFilter}
                >
                  <Filter size={16} /> Filter
                </button>
                {filterOpen && (
                  <div className="vp-filter-menu">
                    <label className="vp-filter-label">
                      Status
                      <select
                        className="vp-filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="ALL">All statuses</option>
                        <option value="PAID">Paid</option>
                        <option value="UNPAID">Unpaid</option>
                        <option value="DRAFT">Draft</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>

              <div ref={moreRef} className="vp-relative">
                <button type="button" className="vp-toolbar-button" onClick={toggleMore}>
                  <MoreHorizontal size={17} /> More
                </button>
                {moreMenuOpen && (
                  <div className="vp-more-menu">
                    <button type="button" onClick={openBillImport}>
                      <Upload size={15} /> Import Bills
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSortMode((m) =>
                          m === "NEWEST" ? "OLDEST" :
                          m === "OLDEST" ? "AMOUNT_HIGH" :
                          m === "AMOUNT_HIGH" ? "AMOUNT_LOW" : "NEWEST"
                        );
                        setMoreMenuOpen(false);
                      }}
                    >
                      <Filter size={15} /> Sort: {sortLabel(sortMode)}
                    </button>
                    <button type="button" disabled={saving} onClick={exportBills}>
                      <Download size={15} /> Export Bills
                    </button>
                  </div>
                )}
              </div>

              <button type="button" className="vp-primary-button" onClick={startNewBill}>
                <CirclePlus size={16} /> New Bill
              </button>
            </div>
          </header>

          <div className="vp-financial-summary">
            <div className="vp-financial-metric">
              <div className="vp-metric-icon vp-metric-icon--paid"><PackageCheck size={18} /></div>
              <div>
                <span>Paid bills</span>
                <strong>{formatMoney(paidValue)}</strong>
                <small>{paidBills.length} completed bill{paidBills.length === 1 ? "" : "s"}</small>
              </div>
            </div>
            <div className="vp-financial-metric">
              <div className="vp-metric-icon vp-metric-icon--due"><AlertTriangle size={18} /></div>
              <div>
                <span>Balance due</span>
                <strong>{formatMoney(balanceValue)}</strong>
                <small>{balanceBills.length} unpaid bill{balanceBills.length === 1 ? "" : "s"}</small>
              </div>
            </div>
          </div>

          {statusFilter !== "ALL" && (
            <div className="vp-list-tools">
              <span>Showing status: <strong>{statusFilter}</strong></span>
              <button type="button" onClick={() => setStatusFilter("ALL")}>Clear filter</button>
              <span className="vp-result-count">
                {visiblePurchases.length} result{visiblePurchases.length === 1 ? "" : "s"}
              </span>
            </div>
          )}

          {message && (
            <div className={message.type === "error" ? "vp-error" : "vp-success"}>
              {message.text}
            </div>
          )}

          <div className="vp-bill-table-wrap">
            <table className="vp-bill-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bill Number</th>
                  <th>Vendor Name</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "right" }}>Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {!storeId ? (
                  <tr>
                    <td colSpan="7" className="vp-empty-bills">
                      <div className="vp-empty-state">
                        <div className="vp-empty-state-icon"><ReceiptText size={24} /></div>
                        <strong>Select a store</strong>
                        <span>Choose a store above to view its vendor bills and balances.</span>
                      </div>
                    </td>
                  </tr>
                ) : visiblePurchases.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="vp-empty-bills">
                      <div className="vp-empty-state">
                        <div className="vp-empty-state-icon"><ReceiptText size={24} /></div>
                        <strong>No vendor bills yet</strong>
                        <span>Create a new bill or import supplier items to begin receiving stock.</span>
                        <button type="button" className="vp-empty-state-button" onClick={startNewBill}>
                          <CirclePlus size={15} /> Create first bill
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visiblePurchases.map((bill) => (
                    <tr key={bill.receiptId} onClick={() => viewBill(bill.receiptId)}>
                      <td>{formatDate(bill.invoiceDate)}</td>
                      <td>
                        <button
                          type="button"
                          className="vp-bill-link"
                          onClick={(e) => { e.stopPropagation(); viewBill(bill.receiptId); }}
                        >
                          {bill.vendorInvoiceNumber}
                        </button>
                      </td>
                      <td>{bill.vendorName || "—"}</td>
                      <td>
                        <span className={`vp-status-pill vp-status--${displayBillStatus(bill).toLowerCase()}`}>
                          {displayBillStatus(bill)}
                        </span>
                      </td>
                      <td>{formatDate(bill.dueDate || bill.invoiceDate)}</td>
                      <td style={{ textAlign: "right" }}>{formatMoney(bill.totalAmount)}</td>
                      <td style={{ textAlign: "right" }}>{formatMoney(bill.balanceDue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== IMPORT VIEW ===================== */}
      {screen === "import" && (
        <VendorBillBulkUploader
          storeId={storeId}
          onBack={() => setScreen("list")}
          onParsed={loadImportedItems}
        />
      )}

      {/* ===================== DETAIL VIEW ===================== */}
      {screen === "detail" && selectedBill && (
        <VendorPurchaseInvoiceView
          bill={selectedBill}
          onBack={() => setScreen("list")}
          onEdit={beginEdit}
          onOpenDraft={openDraft}
          saving={saving}
        />
      )}

      {/* ===================== EDITOR VIEW ===================== */}
      {screen === "editor" && (
        <div className="vp-editor-page">
          <header className="vp-editor-header">
            <div className="vp-editor-header-left">
              <button
                type="button"
                onClick={() => setScreen(editingBillId ? "detail" : "list")}
                className="vp-back-button"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="vp-editor-page-title">
                  {editingBillId ? "Edit Bill" : "New Bill"}
                </h1>
                <span className="vp-editor-subheading">
                  {importPreview
                    ? `Imported from ${importPreview.fileName}`
                    : "Supplier invoice and stock receipt"}
                </span>
              </div>
            </div>

            <div className="vp-editor-header-right">
              {isSuperAdmin && (
                <label className="vp-header-store-field">
                  <span>Receiving store</span>
                  <select
                    value={storeId}
                    onFocus={loadStores}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="vp-header-store-select"
                  >
                    <option value="">Select store</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.storeName}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </header>

          <main className="vp-editor-canvas">
            <div className="vp-editor-content">
              {/* ===== METADATA — single row ===== */}
              <section className="vp-meta-section">
                <div className="vp-meta-row">
                  <label className="vp-meta-item">
                    <span className="vp-field-label">
                      Vendor Name <span className="vp-required-star">*</span>
                    </span>
                    <select
                      value={vendorId}
                      onChange={(e) => handleVendorChange(e.target.value)}
                      className="vp-meta-input"
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.vendorName}</option>
                      ))}
                      <option value="__add_vendor__">+ Add New Vendor</option>
                    </select>
                  </label>

                  <label className="vp-meta-item">
                    <span className="vp-field-label">
                      Bill Number <span className="vp-required-star">*</span>
                    </span>
                    <input
                      className="vp-meta-input"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. INV-1023"
                    />
                  </label>

                  <label className="vp-meta-item">
                    <span className="vp-field-label">
                      Bill Date <span className="vp-required-star">*</span>
                    </span>
                    <input
                      type="date"
                      className="vp-meta-input"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </label>

                  <label className="vp-meta-item">
                    <span className="vp-field-label">
                      Payment Status <span className="vp-required-star">*</span>
                    </span>
                    <select
                      className="vp-meta-input"
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                    >
                      <option value="PAID">Paid</option>
                      <option value="UNPAID">Unpaid</option>
                    </select>
                  </label>

                  <label className="vp-meta-item">
                    <span className="vp-field-label">
                      Due Date <span className="vp-required-star">*</span>
                    </span>
                    <input
                      type="date"
                      className="vp-meta-input"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </label>

                  <label className="vp-meta-item">
                    <span className="vp-field-label">
                      Payment Method
                      {paymentStatus === "PAID" && <span className="vp-required-star"> *</span>}
                    </span>
                    <select
                      className="vp-meta-input"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={paymentStatus !== "PAID"}
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                      <option value="IMPS">IMPS</option>
                      <option value="NEFT">NEFT</option>
                      <option value="RTGS">RTGS</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </label>
                </div>

                {editingBillId && (
                  <div className="vp-meta-row vp-meta-row--full">
                    <label className="vp-meta-item vp-meta-item--full">
                      <span className="vp-field-label">
                        Reason for Editing <span className="vp-required-star">*</span>
                      </span>
                      <input
                        className="vp-meta-input"
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="Explain why this saved bill is being changed"
                      />
                    </label>
                  </div>
                )}
              </section>

              {/* ===== MESSAGES ===== */}
              {message && (
                <div
                  ref={messageRef}
                  className={`vp-editor-message ${
                    message.type === "error"
                      ? "vp-editor-message--error"
                      : "vp-editor-message--success"
                  }`}
                >
                  {message.type === "error" && <AlertTriangle size={20} />}
                  <div className="vp-editor-message-copy">
                    <strong>
                      {message.type === "error"
                        ? "Bill cannot be saved yet"
                        : "Completed"}
                    </strong>
                    <span>{message.text}</span>
                  </div>
                </div>
              )}

              {/* ===== ITEMS TABLE ===== */}
              <section className="vp-items-card">
                <div className="vp-items-heading">
                  <div>
                    <strong className="vp-items-title">Item details</strong>
                    <span className="vp-items-subtitle">
                      Search an existing part or enter a new item.
                    </span>
                  </div>

                  <div className="vp-items-heading-right">
                    <button
                      type="button"
                      className="vp-reset-cols-btn"
                      onClick={resetAllItemCols}
                      title="Reset all column widths to default (Double-click any column header border to reset that column)"
                    >
                      <RotateCcw size={12} />
                      <span>Reset Columns</span>
                    </button>

                    <label className="vp-items-tax-inline">
                      <span>Tax split</span>
                      <select
                        value={gstMode}
                        onChange={(e) => setGstMode(e.target.value)}
                        className="vp-items-tax-select"
                      >
                        <option value="CGST_SGST">CGST + SGST</option>
                        <option value="IGST">IGST</option>
                      </select>
                    </label>

                    <label className="vp-items-tax-inline">
                      <span>Default GST</span>
                      <div className="vp-items-gst-rate">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={gstPercentage}
                          onChange={(e) => setGstPercentage(e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                        <span>%</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="vp-table-wrap">
                  <table
                    ref={itemsTableRef}
                    className="vp-items-table"
                    style={{
                      width: hasItemCustomWidths ? `${itemsTableTotalWidth}px` : "100%",
                      minWidth: hasItemCustomWidths ? `${itemsTableTotalWidth}px` : "100%",
                      tableLayout: "fixed",
                    }}
                  >
                    <colgroup>
                      {ITEM_TABLE_COLUMNS.map((col) => (
                        <col
                          key={col.id}
                          style={{
                            width: hasItemCustomWidths
                              ? `${itemColWidths[col.id]}px`
                              : `${((col.defaultWidth / TOTAL_DEFAULT_WIDTH) * 100).toFixed(3)}%`,
                          }}
                        />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ width: hasItemCustomWidths ? `${itemColWidths.slNo}px` : undefined }}>
                          <span>Sl. No.</span>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("slNo", e)}
                            onDoubleClick={() => resetItemCol("slNo")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th style={{ width: hasItemCustomWidths ? `${itemColWidths.partNumber}px` : undefined }}>
                          <span>Part No.</span>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("partNumber", e)}
                            onDoubleClick={() => resetItemCol("partNumber")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th style={{ width: hasItemCustomWidths ? `${itemColWidths.itemName}px` : undefined }}>
                          <span>Item Name</span>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("itemName", e)}
                            onDoubleClick={() => resetItemCol("itemName")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th style={{ width: hasItemCustomWidths ? `${itemColWidths.brandName}px` : undefined }}>
                          <span>Brand</span>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("brandName", e)}
                            onDoubleClick={() => resetItemCol("brandName")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th style={{ width: hasItemCustomWidths ? `${itemColWidths.hsnCode}px` : undefined }}>
                          <span>HSN</span>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("hsnCode", e)}
                            onDoubleClick={() => resetItemCol("hsnCode")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th style={{ width: hasItemCustomWidths ? `${itemColWidths.quantity}px` : undefined }}>
                          <span>Qty</span>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("quantity", e)}
                            onDoubleClick={() => resetItemCol("quantity")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th
                          className="vp-th-pp"
                          style={{ width: hasItemCustomWidths ? `${itemColWidths.purchasePrice}px` : undefined }}
                        >
                          <div className="vp-th-pp-inner">
                            <span className="vp-th-pp-label">Purchase Price</span>
                            <select
                              className={`vp-th-pp-mode ${
                                columnPriceMode === "GST_INCLUSIVE" ? "is-inclusive" : "is-exclusive"
                              }`}
                              value={columnPriceMode}
                              onChange={(e) => applyColumnPriceMode(e.target.value)}
                              title="With or without tax"
                            >
                              <option value="GST_INCLUSIVE">With Tax</option>
                              <option value="GST_EXCLUSIVE">Without Tax</option>
                            </select>
                          </div>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("purchasePrice", e)}
                            onDoubleClick={() => resetItemCol("purchasePrice")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th style={{ width: hasItemCustomWidths ? `${itemColWidths.mrp}px` : undefined }}>
                          <span>MRP</span>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("mrp", e)}
                            onDoubleClick={() => resetItemCol("mrp")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th style={{ width: hasItemCustomWidths ? `${itemColWidths.sellingPrice}px` : undefined }}>
                          <span>Selling</span>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("sellingPrice", e)}
                            onDoubleClick={() => resetItemCol("sellingPrice")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th style={{ width: hasItemCustomWidths ? `${itemColWidths.discountPercent}px` : undefined }}>
                          <span>Disc %</span>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("discountPercent", e)}
                            onDoubleClick={() => resetItemCol("discountPercent")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th style={{ width: hasItemCustomWidths ? `${itemColWidths.gstPercent}px` : undefined }}>
                          <span>GST %</span>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("gstPercent", e)}
                            onDoubleClick={() => resetItemCol("gstPercent")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th style={{ width: hasItemCustomWidths ? `${itemColWidths.rackLocation}px` : undefined }}>
                          <span>Rack</span>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("rackLocation", e)}
                            onDoubleClick={() => resetItemCol("rackLocation")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th
                          style={{
                            width: hasItemCustomWidths ? `${itemColWidths.amount}px` : undefined,
                            textAlign: "center",
                          }}
                        >
                          <span>Amount</span>
                          <div
                            className="vp-col-resizer"
                            onMouseDown={(e) => startItemColResize("amount", e)}
                            onDoubleClick={() => resetItemCol("amount")}
                            title="Drag to resize, double-click to reset"
                          />
                        </th>
                        <th style={{ width: hasItemCustomWidths ? `${itemColWidths.action}px` : undefined }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={row.key}>
                          <td className="vp-row-number">{index + 1}</td>

                          <td>
                            <SuggestionInput
                              row={row}
                              field="partNumber"
                              placeholder="Part number"
                              inputRef={(el) => { firstInputRefs.current[row.key] = el; }}
                              suggestions={
                                suggestionFocus?.key === row.key &&
                                suggestionFocus?.field === "partNumber"
                                  ? suggestions[row.key] || []
                                  : []
                              }
                              onChange={findSuggestions}
                              onSelect={selectSuggestion}
                            />
                          </td>

                          <td>
                            <SuggestionInput
                              row={row}
                              field="itemName"
                              placeholder="Item name"
                              suggestions={
                                suggestionFocus?.key === row.key &&
                                suggestionFocus?.field === "itemName"
                                  ? suggestions[row.key] || []
                                  : []
                              }
                              onChange={findSuggestions}
                              onSelect={selectSuggestion}
                            />
                          </td>

                          <td>
                            <CellInput
                              value={row.brandName}
                              placeholder="Brand"
                              onChange={(v) => updateRow(row.key, "brandName", v)}
                            />
                          </td>

                          <td>
                            <CellInput
                              value={row.hsnCode}
                              placeholder="8708"
                              onChange={(v) => updateRow(row.key, "hsnCode", v)}
                            />
                          </td>

                          <td>
                            <CellInput
                              type="number"
                              value={row.quantity}
                              placeholder="0"
                              step="1"
                              onChange={(v) => updateRow(row.key, "quantity", v)}
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="10"
                              className="vp-cell-input is-numeric"
                              value={row.purchasePrice}
                              onChange={(e) =>
                                updatePriceRow(row.key, "purchasePrice", e.target.value)
                              }
                              placeholder="0.00"
                            />
                          </td>

                          <td>
                            <CellInput
                              type="number"
                              value={row.mrp}
                              placeholder="0.00"
                              step="10"
                              onChange={(v) => updatePriceRow(row.key, "mrp", v)}
                            />
                          </td>

                          <td>
                            <CellInput
                              type="number"
                              value={row.sellingPrice}
                              placeholder="0.00"
                              step="10"
                              onChange={(v) => updatePriceRow(row.key, "sellingPrice", v)}
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              max="99.99"
                              step="0.01"
                              className="vp-cell-input is-numeric"
                              value={row.discountPercentage}
                              onChange={(e) =>
                                updatePriceRow(row.key, "discountPercentage", e.target.value)
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="0"
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              className="vp-cell-input is-numeric"
                              value={row.gstPercentage}
                              onChange={(e) =>
                                updatePriceRow(row.key, "gstPercentage", e.target.value)
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="18"
                            />
                          </td>

                          <td>
                            <CellInput
                              value={row.rackNumber}
                              placeholder="A-12"
                              onChange={(v) => updateRow(row.key, "rackNumber", v)}
                            />
                          </td>

                          <td className="vp-amount-cell">
                            {formatMoney(
                              computeRowAmounts(row, columnPriceMode).lineTotal
                            )}
                          </td>

                          <td>
                            <button
                              type="button"
                              onClick={() => removeRow(row.key)}
                              className="vp-delete-button"
                              title="Remove row"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="vp-items-footer">
                  <button
                    type="button"
                    onClick={addRow}
                    className="vp-add-row-button"
                  >
                    <CirclePlus size={15} />
                    Add Row
                  </button>
                </div>
              </section>

              {/* ===== SUMMARY ===== */}
              <section className="vp-summary-section">
                <div className="vp-summary-card">
                  <h3 className="vp-summary-title">Payment Summary</h3>
                  <div className="vp-summary-rows">
                    <div className="vp-summary-row">
                      <span>Total Items</span>
                      <strong>{purchaseSummary.totalItems}</strong>
                    </div>
                    <div className="vp-summary-row">
                      <span>Taxable Amount</span>
                      <strong>{formatMoney(purchaseSummary.taxableAmount)}</strong>
                    </div>

                    {gstMode === "IGST" ? (
                      <div className="vp-summary-row">
                        <span>IGST</span>
                        <strong>{formatMoney(purchaseSummary.igstAmount)}</strong>
                      </div>
                    ) : (
                      <>
                        <div className="vp-summary-row">
                          <span>CGST</span>
                          <strong>{formatMoney(purchaseSummary.cgstAmount)}</strong>
                        </div>
                        <div className="vp-summary-row">
                          <span>SGST</span>
                          <strong>{formatMoney(purchaseSummary.sgstAmount)}</strong>
                        </div>
                      </>
                    )}

                    <div className="vp-summary-row">
                      <span>Total GST</span>
                      <strong>{formatMoney(purchaseSummary.totalGstAmount)}</strong>
                    </div>
                    <div className="vp-summary-row">
                      <span>Round Off</span>
                      <strong>{formatMoney(purchaseSummary.roundOffAmount)}</strong>
                    </div>
                    <div className="vp-grand-total-row">
                      <span>Grand Total</span>
                      <strong>{formatMoney(purchaseSummary.totalAmount)}</strong>
                    </div>
                    <div className="vp-summary-row">
                      <span>Balance Due</span>
                      <strong>{formatMoney(purchaseSummary.balanceDue)}</strong>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ===== STICKY FOOTER ===== */}
            <footer className="vp-editor-footer">
              <button
                type="button"
                className="vp-footer-cancel"
                onClick={() => setScreen(editingBillId ? "detail" : "list")}
              >
                Cancel
              </button>
              <div className="vp-editor-footer-actions">
                {!editingBillId && (
                  <button
                    type="button"
                    disabled={saving || !storeId}
                    className="vp-footer-secondary"
                    onClick={() => savePurchase("DRAFT")}
                  >
                    {saving ? "Saving..." : "Save as Draft"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving || !storeId}
                  className="vp-footer-primary"
                  onClick={() =>
                    editingBillId
                      ? savePurchase(selectedBill?.status || "OPEN")
                      : savePurchase("OPEN")
                  }
                >
                  <PackageCheck size={15} />
                  {saving
                    ? "Saving..."
                    : editingBillId
                    ? "Save Changes"
                    : "Receive Stock"}
                </button>
              </div>
            </footer>
          </main>
        </div>
      )}

      {/* ===================== VENDOR MODAL ===================== */}
      {vendorModalOpen && (
        <div className="vp-modal-backdrop" onMouseDown={closeVendorModal}>
          <div className="vp-vendor-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="vp-modal-header">
              <div>
                <h3 className="vp-modal-title">Add Vendor</h3>
                <p className="vp-modal-subtitle">
                  This vendor will be available for the selected store.
                </p>
              </div>
              <button type="button" className="vp-modal-close" onClick={closeVendorModal}>
                <X size={18} />
              </button>
            </div>

            {vendorModalMessage && (
              <div className={vendorModalMessage.type === "error" ? "vp-error" : "vp-success"}>
                {vendorModalMessage.text}
              </div>
            )}

            <div className="vp-vendor-form-grid">
              {isSuperAdmin && (
                <label className="vp-meta-field vp-span-2">
                  <span className="vp-field-label">Store *</span>
                  <select
                    className="vp-meta-input"
                    value={vendorModalStoreId}
                    onFocus={loadStores}
                    onChange={(e) => setVendorModalStoreId(e.target.value)}
                  >
                    <option value="">Select Store</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.storeName}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="vp-meta-field">
                <span className="vp-field-label">Vendor Name *</span>
                <input
                  className="vp-meta-input"
                  autoFocus
                  value={vendorForm.vendorName}
                  onChange={(e) => setVendorForm({ ...vendorForm, vendorName: e.target.value })}
                />
              </label>
              <label className="vp-meta-field">
                <span className="vp-field-label">Phone *</span>
                <input
                  className="vp-meta-input"
                  maxLength="10"
                  value={vendorForm.phone}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, phone: e.target.value.replace(/\D/g, "") })
                  }
                />
              </label>
              <label className="vp-meta-field">
                <span className="vp-field-label">Contact Person</span>
                <input
                  className="vp-meta-input"
                  value={vendorForm.contactPerson}
                  onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                />
              </label>
              <label className="vp-meta-field">
                <span className="vp-field-label">Email</span>
                <input
                  type="email"
                  className="vp-meta-input"
                  value={vendorForm.email}
                  onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                />
              </label>
              <label className="vp-meta-field">
                <span className="vp-field-label">GST Number</span>
                <input
                  className="vp-meta-input"
                  maxLength="15"
                  value={vendorForm.gstNumber}
                  onChange={(e) =>
                    setVendorForm({
                      ...vendorForm,
                      gstNumber: e.target.value
                        .replace(/[^a-zA-Z0-9]/g, "")
                        .toUpperCase()
                        .slice(0, 15),
                    })
                  }
                />
              </label>
              <label className="vp-meta-field">
                <span className="vp-field-label">State</span>
                <input
                  className="vp-meta-input"
                  value={vendorForm.state}
                  onChange={(e) => setVendorForm({ ...vendorForm, state: e.target.value })}
                />
              </label>
              <label className="vp-meta-field">
                <span className="vp-field-label">Pincode</span>
                <input
                  className="vp-meta-input"
                  maxLength="6"
                  value={vendorForm.pincode}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, pincode: e.target.value.replace(/\D/g, "") })
                  }
                />
              </label>
              <label className="vp-meta-field vp-span-2">
                <span className="vp-field-label">Address</span>
                <textarea
                  className="vp-meta-input"
                  style={{ minHeight: 68, paddingTop: 8 }}
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                />
              </label>
            </div>

            <div className="vp-modal-actions">
              <button
                type="button"
                className="vp-cancel-button"
                onClick={closeVendorModal}
                disabled={vendorSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="vp-primary-button"
                onClick={createVendor}
                disabled={vendorSaving}
              >
                {vendorSaving ? "Saving..." : "Save Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function VendorPurchasesSection() {
  return <ManualStockReceipt />;
}

/* =========================================================
   Helper components
   ========================================================= */
function CellInput({ value, onChange, placeholder, type = "text", step }) {
  return (
    <input
      type={type}
      min={type === "number" ? "0" : undefined}
      step={type === "number" ? (step ?? "0.01") : undefined}
      className={`vp-cell-input ${type === "number" ? "is-numeric" : ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function SuggestionInput({ row, field, placeholder, suggestions, onChange, onSelect, inputRef }) {
  const hasValue = Boolean(row[field] && String(row[field]).trim());

  return (
    <div className="vp-suggest-wrap">
      <div className="vp-suggest-shell">
        {!hasValue && <Search size={13} color="#64748B" />}
        <input
          ref={inputRef}
          className="vp-suggest-input"
          value={row[field]}
          onChange={(e) => onChange(row, field, e.target.value)}
          placeholder={placeholder}
        />
      </div>
      {field === "partNumber" && row.availableStock !== null && (
        <span className="vp-available-stock">Available: {row.availableStock}</span>
      )}
      {suggestions.length > 0 && (
        <div className="vp-suggest-menu">
          {suggestions.slice(0, 8).map((p) => (
            <button
              type="button"
              key={`${p.productId || "L"}-${p.localProductId || p.partNumber}`}
              className="vp-suggest-option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(row.key, p)}
            >
              <strong>{p.itemName}</strong>
              <span>
                {p.partNumber} · {p.brandName || "No brand"} · Stock:{" "}
                {p.availableStock ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
