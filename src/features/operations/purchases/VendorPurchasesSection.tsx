import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CirclePlus,
  Download,
  Filter,
  MoreHorizontal,
  PackageCheck,
  ReceiptText,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import api from "../../../services/api";
import VendorBillBulkUploader from "./VendorBillBulkUploader";
import VendorPurchaseInvoiceView from "./VendorPurchaseInvoiceView";

/* =========================================================
   Row model
   ========================================================= */
const emptyRow = (): Record<string, any> => ({
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
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function isValidGstValue(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return true;
  return /^[A-Za-z0-9]{1,15}$/.test(trimmed);
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}

function displayBillStatus(bill) {
  return bill?.status === "DRAFT" ? "DRAFT" : bill?.paymentStatus || "UNPAID";
}

function sortLabel(mode) {
  return {
    NEWEST: "Newest",
    OLDEST: "Oldest",
    AMOUNT_HIGH: "Amount high",
    AMOUNT_LOW: "Amount low",
  }[mode];
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
    Number(row.quantity || 0) -
      Number(row.damagedQuantity || 0) -
      Number(row.rejectedQuantity || 0),
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
    taxableRate =
      gstFactor > 0 ? purchasePrice / (1 + gstFactor) : purchasePrice;
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

function calculatePricesFromSource(
  row: any,
  source: any,
  sourceValue: any,
  columnPriceMode?: any,
) {
  const sourcePrice = Number(sourceValue);

  const discount = Math.min(
    99.99,
    Math.max(0, Number(row.discountPercentage || 0)),
  );

  const gst = Math.min(100, Math.max(0, Number(row.gstPercentage || 0)));

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
    const discountAmount = Number(((sellingPrice * discount) / 100).toFixed(2));
    purchasePrice =
      Number((sellingPrice - discountAmount).toFixed(2)) * gstFactor;
  } else if (source === "MRP") {
    mrp = sourcePrice;
    sellingPrice = sourcePrice / gstFactor;
    purchasePrice =
      sourcePrice - Number(((sourcePrice * discount) / 100).toFixed(2));
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
    row.partNumber.trim() &&
    row.itemName.trim() &&
    row.brandName.trim() &&
    Number(row.quantity) > 0 &&
    Number(row.damagedQuantity || 0) + Number(row.rejectedQuantity || 0) <
      Number(row.quantity) &&
    row.purchasePrice !== "" &&
    Number(row.purchasePrice) > 0 &&
    Number(row.mrp) > 0 &&
    Number(row.sellingPrice) > 0,
  );
}

function isEmptyRow(row) {
  return (
    !row.partNumber.trim() &&
    !row.itemName.trim() &&
    !row.brandName.trim() &&
    !row.categoryName.trim() &&
    !row.masterName.trim() &&
    row.quantity === "" &&
    Number(row.damagedQuantity || 0) === 0 &&
    Number(row.rejectedQuantity || 0) === 0 &&
    row.purchasePrice === "" &&
    row.mrp === "" &&
    row.sellingPrice === "" &&
    !row.hsnCode.trim() &&
    !row.rackNumber.trim()
  );
}

function withTrailingEmptyRow(rows, defaults = {}) {
  return rows.length > 0 && isCompleteRow(rows.at(-1))
    ? [...rows, { ...emptyRow(), ...defaults }]
    : rows;
}

/* =========================================================
   Main component
   ========================================================= */
function ManualStockReceipt() {
  const user = getUser();
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const [rows, setRows] = useState([emptyRow()]);
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(
    user.storeId ? String(user.storeId) : "",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [gstMode, setGstMode] = useState("CGST_SGST");
  const [gstPercentage, setGstPercentage] = useState("18");
  const [columnPriceMode, setColumnPriceMode] = useState("GST_INCLUSIVE");

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
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorModalMessage, setVendorModalMessage] = useState(null);
  const [vendorModalStoreId, setVendorModalStoreId] = useState("");
  const [vendorForm, setVendorForm] = useState({
    vendorName: "",
    phone: "",
    email: "",
    gstNumber: "",
    address: "",
    contactPerson: "",
    state: "",
    pincode: "",
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
      if (
        filterOpen &&
        filterRef.current &&
        !filterRef.current.contains(event.target)
      )
        setFilterOpen(false);
      if (
        moreMenuOpen &&
        moreRef.current &&
        !moreRef.current.contains(event.target)
      )
        setMoreMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setFilterOpen(false);
        setMoreMenuOpen(false);
      }
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
    if (!storeId) {
      setVendors([]);
      setVendorId("");
      return;
    }
    let active = true;
    api
      .get("/vendors", {
        params: { storeId: Number(storeId), activeOnly: true },
      })
      .then((res) => {
        if (!active) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setVendors(data);
        setVendorId((cur) =>
          data.some((v) => String(v.id) === cur) ? cur : "",
        );
      })
      .catch(
        () =>
          active &&
          setMessage({ type: "error", text: "Unable to load vendors" }),
      );
    return () => {
      active = false;
    };
  }, [storeId]);

  /* ---- load purchases ---- */
  useEffect(() => {
    if (!storeId) {
      setPurchases([]);
      return;
    }
    api
      .get("/vendor-purchases", { params: { storeId: Number(storeId) } })
      .then((res) => setPurchases(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPurchases([]));
  }, [storeId]);

  const loadStores = async () => {
    if (!isSuperAdmin || stores.length) return;
    const res = await api.get("/stores", {
      params: { page: 0, size: 100, active: true },
    });
    setStores(Array.isArray(res.data?.content) ? res.data.content : []);
  };

  /* ---- row mutators ---- */
  const updateRow = (key, field, value) => {
    setRows((current) =>
      withTrailingEmptyRow(
        current.map((row) =>
          row.key !== key
            ? row
            : {
                ...row,
                [field]: value,
                importErrors: [],
                ...(field === "partNumber"
                  ? {
                      productId: null,
                      localProductId: null,
                      selectedPartNumber: null,
                      ...(row.importStatus ? { importStatus: "NEW" } : {}),
                    }
                  : {}),
              },
        ),
        currentRowDefaults,
      ),
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
            const canCalculate =
              isPriceGroupEmpty(row) || row.priceSource === source;

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

            const calculated = calculatePricesFromSource(
              row,
              source,
              value,
              columnPriceMode,
            );
            return calculated
              ? {
                  ...row,
                  ...calculated,
                  [field]: value,
                  priceSource: source,
                  importErrors: [],
                }
              : {
                  ...row,
                  [field]: value,
                  priceSource: source,
                  importErrors: [],
                };
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
              columnPriceMode,
            );
            return calculated ? { ...nextRow, ...calculated } : nextRow;
          }

          return row;
        }),
        currentRowDefaults,
      ),
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
          nextMode,
        );
        return calculated ? { ...row, ...calculated } : row;
      }),
    );
  };

  const addRow = () => {
    const next: any = { ...emptyRow(), ...currentRowDefaults };
    let focusKey = next.key;
    setRows((current) => {
      const last = current[current.length - 1];
      if (last && isEmptyRow(last)) {
        focusKey = last.key;
        return current;
      }
      return [...current, next];
    });
    requestAnimationFrame(() => firstInputRefs.current[focusKey]?.focus());
  };

  const removeRow = (key) => {
    setRows((current) =>
      current.length === 1
        ? [{ ...emptyRow(), ...currentRowDefaults }]
        : current.filter((row) => row.key !== key),
    );
  };

  /* ---- suggestions ---- */
  const findSuggestions = async (row, field, value) => {
    const reqId = (suggestionRequestRefs.current[row.key] || 0) + 1;
    suggestionRequestRefs.current[row.key] = reqId;
    setSuggestionFocus({ key: row.key, field });
    updateRow(
      row.key,
      field,
      field === "partNumber" ? value.toUpperCase() : value,
    );

    if (!storeId || value.trim().length < 1) {
      setSuggestions((c) => ({ ...c, [row.key]: [] }));
      return;
    }
    try {
      const res = await api.get("/store-inventory/suggestions", {
        params: { storeId: Number(storeId), query: value.trim() },
      });
      if (suggestionRequestRefs.current[row.key] !== reqId) return;
      const matches = Array.isArray(res.data)
        ? res.data
        : res.data?.content || [];
      const exact =
        field === "partNumber"
          ? matches.find(
              (p) => p.partNumber?.toLowerCase() === value.trim().toLowerCase(),
            )
          : null;
      if (exact) {
        selectSuggestion(row.key, exact);
        return;
      }
      setSuggestions((c) => ({ ...c, [row.key]: matches }));
    } catch {
      if (suggestionRequestRefs.current[row.key] !== reqId) return;
      setSuggestions((c) => ({ ...c, [row.key]: [] }));
    }
  };

  const selectSuggestion = (key, product) => {
    setRows((current) =>
      withTrailingEmptyRow(
        current.map((row) =>
          row.key === key
            ? {
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
                ...(row.importStatus
                  ? { importStatus: "EXISTING", importErrors: [] }
                  : {}),
              }
            : row,
        ),
        currentRowDefaults,
      ),
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
    if (editingBillId && !editReason.trim())
      return "Reason for editing is required";
    if (paymentStatus === "PAID" && !paymentMethod)
      return "Select the payment method";

    const receiptRows = rows.filter((row) => !isEmptyRow(row));
    if (!receiptRows.length) return "Enter at least one stock row";

    for (let i = 0; i < receiptRows.length; i++) {
      const row = receiptRows[i];
      const label = `Row ${i + 1}`;
      if (row.importErrors?.length)
        return `${label}: ${row.importErrors.join("; ")}`;
      if (!row.partNumber.trim()) return `${label}: Part Number is required`;
      if (!row.itemName.trim()) return `${label}: Item Name is required`;
      if (!row.brandName.trim()) return `${label}: Brand is required`;
      if (row.importStatus === "NEW" && !row.hsnCode.trim())
        return `${label}: HSN is required for new imported items`;
      if (
        !Number.isSafeInteger(Number(row.quantity)) ||
        Number(row.quantity) <= 0
      )
        return `${label}: Quantity must be a positive whole number`;
      const unavailable =
        Number(row.damagedQuantity || 0) + Number(row.rejectedQuantity || 0);
      if (unavailable >= Number(row.quantity))
        return `${label}: accepted quantity must be greater than zero`;
      if (Number(row.purchasePrice) <= 0 || row.purchasePrice === "")
        return `${label}: Purchase Price must be greater than zero`;
      const discountPct = Number(row.discountPercentage || 0);
      if (Number.isNaN(discountPct) || discountPct < 0 || discountPct >= 100)
        return `${label}: Discount % must be at least 0 and below 100`;
      if (Number(row.mrp) <= 0)
        return `${label}: MRP must be greater than zero`;
      if (Number(row.sellingPrice) <= 0)
        return `${label}: Selling Price is required`;
      if (Number(row.sellingPrice) > Number(row.mrp))
        return `${label}: Selling Price cannot be greater than MRP`;
    }
    return "";
  };

  /* ---- save ---- */
  const savePurchase = async (purchaseStatus) => {
    const error = validate();
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }

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
        status: editingBillId
          ? selectedBill?.status || purchaseStatus
          : purchaseStatus,
        gstMode,
        priceMode: columnPriceMode,
        items: rows
          .filter((row) => !isEmptyRow(row))
          .map((row) => {
            const amounts = computeRowAmounts(row, columnPriceMode);
            return {
              itemId: row.itemId,
              productId:
                row.selectedPartNumber?.trim().toUpperCase() ===
                row.partNumber.trim().toUpperCase()
                  ? row.productId
                  : null,
              localProductId:
                row.selectedPartNumber?.trim().toUpperCase() ===
                row.partNumber.trim().toUpperCase()
                  ? row.localProductId
                  : null,
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
              gstPercentage:
                row.gstPercentage === "" ? null : Number(row.gstPercentage),
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

      const listRes = await api.get("/vendor-purchases", {
        params: { storeId: Number(storeId) },
      });
      setPurchases(Array.isArray(listRes.data) ? listRes.data : []);

      setMessage({
        type: "success",
        text: response.data.message || "Bill saved successfully",
      });

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
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Unable to receive stock",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ---- vendor modal ---- */
  const openVendorModal = () => {
    setVendorForm({
      vendorName: "",
      phone: "",
      email: "",
      gstNumber: "",
      address: "",
      contactPerson: "",
      state: "",
      pincode: "",
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
    if (!targetStoreId)
      return setVendorModalMessage({
        type: "error",
        text: "Please select a store.",
      });
    if (!vendorForm.vendorName.trim())
      return setVendorModalMessage({
        type: "error",
        text: "Vendor name is required",
      });
    if (!/^\d{10}$/.test(vendorForm.phone))
      return setVendorModalMessage({
        type: "error",
        text: "Vendor phone must contain 10 digits",
      });
    if (!isValidGstValue(vendorForm.gstNumber))
      return setVendorModalMessage({
        type: "error",
        text: "GST number can only contain letters and numbers, up to 15 characters",
      });

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
        const response = await api.get("/vendors", {
          params: { storeId: Number(storeId), activeOnly: true },
        });
        const data = Array.isArray(response.data) ? response.data : [];
        setVendors(data);
        const created = data.find(
          (vendor) =>
            vendor.vendorName.toLowerCase() ===
            vendorForm.vendorName.trim().toLowerCase(),
        );
        setVendorId(created ? String(created.id) : "");
      }

      setVendorModalOpen(false);
      setVendorModalMessage(null);
      setVendorForm({
        vendorName: "",
        phone: "",
        email: "",
        gstNumber: "",
        address: "",
        contactPerson: "",
        state: "",
        pincode: "",
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
    if (value === "__add_vendor__") {
      openVendorModal();
      return;
    }
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
      const listRes = await api.get("/vendor-purchases", {
        params: { storeId: Number(storeId) },
      });
      setPurchases(Array.isArray(listRes.data) ? listRes.data : []);
      setMessage({ type: "success", text: response.data.message });
      setSelectedBill(response.data);
      setScreen("detail");
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to open the draft",
      });
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
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to load bill",
      });
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
        : [emptyRow()],
    );
    setMessage(null);
    setScreen("editor");
  };

  const exportBills = async () => {
    if (!visiblePurchases.length) {
      setMessage({ type: "error", text: "No bills to export." });
      return;
    }
    setSaving(true);
    try {
      const response = await api.post(
        "/vendor-purchases/export",
        visiblePurchases.map((bill) => bill.receiptId),
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "vendor-bills.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMoreMenuOpen(false);
    } catch {
      setMessage({
        type: "error",
        text: "Unable to export vendor bills. Please retry.",
      });
    } finally {
      setSaving(false);
    }
  };

  const openBillImport = () => {
    setMoreMenuOpen(false);
    if (!storeId) {
      setMessage({
        type: "error",
        text: "Select a store before importing bill items.",
      });
      return;
    }
    setMessage(null);
    setScreen("import");
  };

  const loadImportedItems = async (uploadResult) => {
    setSaving(true);
    setMessage(null);
    try {
      const importedRows = Array.isArray(uploadResult?.rows)
        ? uploadResult.rows
        : [];
      const preparedRows = importedRows.map((imported) => ({
        ...emptyRow(),
        partNumber: imported.partNumber || "",
        itemName: imported.itemName || "",
        brandName: imported.brandName || "",
        hsnCode: imported.hsnCode || "",
        quantity: imported.quantity == null ? "" : String(imported.quantity),
        purchasePrice:
          imported.purchasePrice == null ? "" : String(imported.purchasePrice),
        mrp: imported.mrp == null ? "" : String(imported.mrp),
        sellingPrice:
          imported.sellingPrice == null ? "" : String(imported.sellingPrice),
        priceSource: imported.priceSource || "MANUAL",
        discountPercentage:
          imported.discountPercentage == null
            ? "0"
            : String(imported.discountPercentage),
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
          : [{ ...emptyRow(), gstPercentage: "18" }],
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
        text:
          error.response?.data?.message || "Unable to prepare the bill preview",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleFilter = () => {
    setMoreMenuOpen(false);
    setFilterOpen((o) => !o);
  };
  const toggleMore = () => {
    setFilterOpen(false);
    setMoreMenuOpen((o) => !o);
  };

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
    .filter(
      (p) => statusFilter === "ALL" || displayBillStatus(p) === statusFilter,
    )
    .filter(
      (p) =>
        !normalizedSearch ||
        [
          p.vendorInvoiceNumber,
          p.receiptNumber,
          p.vendorName,
          displayBillStatus(p),
        ].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(normalizedSearch),
        ),
    )
    .sort((a, b) => {
      if (sortMode === "OLDEST")
        return String(a.invoiceDate).localeCompare(String(b.invoiceDate));
      if (sortMode === "AMOUNT_HIGH")
        return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
      if (sortMode === "AMOUNT_LOW")
        return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      return String(b.invoiceDate).localeCompare(String(a.invoiceDate));
    });

  const paidBills = purchases.filter(
    (b) => b.status !== "DRAFT" && b.paymentStatus === "PAID",
  );
  const balanceBills = purchases.filter(
    (b) => b.status !== "DRAFT" && b.paymentStatus === "UNPAID",
  );
  const paidValue = paidBills.reduce(
    (t, b) => t + Number(b.totalAmount || 0),
    0,
  );
  const balanceValue = balanceBills.reduce(
    (t, b) => t + Number(b.balanceDue ?? b.totalAmount ?? 0),
    0,
  );

  /* =======================================================
     RENDER
     ======================================================= */
  return (
    <section className="vp-page">
      <style>{`/* ================================================================
   Vendor Purchases Section — New Bill editor
   ================================================================ */

.vp-page {
  min-height: calc(100vh - 28px);
  background: #ffffff;
  color: #1f2937;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  font-size: 12px;
  line-height: 1.45;
}
.vp-page *, .vp-page *::before, .vp-page *::after { box-sizing: border-box; }
.vp-page button { font-family: inherit; cursor: pointer; }
.vp-page input, .vp-page select, .vp-page textarea { font-family: inherit; }
.vp-page input:focus, .vp-page select:focus, .vp-page textarea:focus {
  outline: none;
}

/* ================================================================
   EDITOR PAGE
   ================================================================ */
.vp-editor-page {
  min-height: calc(100vh - 28px);
  background: #ffffff;
  color: #191c1e;
  display: flex;
  flex-direction: column;
}

/* ---------- HEADER (not sticky) ---------- */
.vp-editor-header {
  min-height: 60px;
  padding: 10px 24px;
  border-bottom: 1px solid #e1e5ea;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.vp-editor-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.vp-editor-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.vp-back-button {
  width: 34px;
  height: 34px;
  border: 1px solid #d7dce5;
  border-radius: 6px;
  background: #fff;
  color: #4b5563;
  display: grid;
  place-items: center;
  transition: background 0.12s ease;
}
.vp-back-button:hover {
  background: #f5f7fa;
  border-color: #b8c0cc;
}
.vp-editor-page-title {
  margin: 0;
  color: #0f172a;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.vp-editor-subheading {
  display: block;
  margin-top: 1px;
  color: #7a8494;
  font-size: 11px;
}

.vp-header-store-field {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.vp-header-store-select {
  height: 34px;
  min-width: 180px;
  padding: 0 10px;
  border: 1px solid #c9ced8;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  font-size: 12.5px;
  text-transform: none;
  letter-spacing: normal;
  font-weight: 500;
}

/* ---------- CANVAS ---------- */
.vp-editor-canvas {
  padding: 20px 24px 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.vp-editor-content {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

/* ================================================================
   METADATA — single row
   ================================================================ */
.vp-meta-section {
  padding: 18px 20px;
  border: 1px solid #e1e7ef;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  display: grid;
  gap: 14px;
}

.vp-meta-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr 1.1fr;
  gap: 14px;
  align-items: start;
}
.vp-meta-row--full {
  grid-template-columns: 1fr;
}

.vp-meta-item {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.vp-meta-item--full {
  grid-column: 1 / -1;
}

.vp-field-label {
  display: block;
  color: #0f172a;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.015em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vp-required-star {
  color: #dc2626;
  margin-left: 2px;
}

.vp-meta-input {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  font-size: 12.5px;
  font-weight: 500;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.vp-meta-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}
.vp-meta-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.vp-meta-input:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

/* ================================================================
   MESSAGES
   ================================================================ */
.vp-editor-message {
  padding: 12px 14px;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12.5px;
}
.vp-editor-message--error {
  border: 1px solid #fecaca;
  border-left: 3px solid #dc2626;
  background: #fef2f2;
  color: #991b1b;
}
.vp-editor-message--success {
  border: 1px solid #bbf7d0;
  border-left: 3px solid #16a34a;
  background: #f0fdf4;
  color: #166534;
}
.vp-editor-message-copy {
  display: grid;
  gap: 2px;
}
.vp-editor-message-copy strong { font-weight: 600; }

/* ================================================================
   ITEMS CARD
   ================================================================ */
.vp-items-card {
  background: #fff;
  border: 1px solid #e1e7ef;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}
.vp-items-heading {
  min-height: 60px;
  padding: 14px 18px;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.vp-items-title {
  display: block;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}
.vp-items-subtitle {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 11px;
}
.vp-items-heading-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.vp-items-tax-inline {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #0f172a;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}
.vp-items-tax-select {
  height: 32px;
  min-width: 130px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  font-size: 12px;
  font-weight: 500;
}
.vp-items-gst-rate {
  height: 32px;
  width: 72px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 2px;
}
.vp-items-gst-rate input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 12px;
  font-weight: 500;
  text-align: right;
}
.vp-items-gst-rate span {
  color: #94a3b8;
  font-size: 11px;
}
/* ================================================================
   TABLE — full grid (rows + columns)
   ================================================================ */
.vp-items-table {
  width: 100%;
  min-width: 1120px;
  table-layout: fixed;
  border-collapse: collapse !important;
  border: 1px solid #cbd5e1 !important;
  font-size: 12px;
}

/* ---------- HEADER — full grid ---------- */
.vp-items-table thead th {
  padding: 8px 10px !important;
  background: #f1f5f9 !important;
  color: #0f172a !important;
  border: 1px solid #cbd5e1 !important;
  text-align: left !important;
  font-size: 10.5px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  white-space: nowrap !important;
  vertical-align: top !important;
}

/* ---------- BODY — full grid ---------- */
.vp-items-table tbody td {
  padding: 6px !important;
  border: 1px solid #e2e8f0 !important;
  vertical-align: middle !important;
  background: #fff;
}

.vp-items-table tbody tr:hover td {
  background: #f8faff !important;
}

/* ---------- PURCHASE PRICE HEADER ---------- */
.vp-items-table thead th.vp-th-pp {
  padding: 8px 10px !important;
  vertical-align: top !important;
}

.vp-th-pp-inner {
  display: block !important;
}

.vp-th-pp-label {
  display: block !important;
  margin-bottom: 6px !important;
  color: #0f172a !important;
  font-size: 10.5px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  white-space: nowrap !important;
  line-height: 1.2 !important;
}

.vp-th-pp-mode {
  display: block !important;
  width: 100% !important;
  height: 22px !important;
  padding: 0 18px 0 8px !important;
  border: 1px solid #cbd5e1 !important;
  outline: 0 !important;
  border-radius: 4px !important;
  background-color: #ffffff !important;
  color: #334155 !important;
  font-family: inherit !important;
  font-size: 9px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  cursor: pointer !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  text-align: left !important;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") !important;
  background-repeat: no-repeat !important;
  background-position: right 5px center !important;
  background-size: 8px !important;
  box-sizing: border-box !important;
}

.vp-th-pp-mode:hover {
  border-color: #94a3b8 !important;
}
.vp-th-pp-mode:focus {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15) !important;
}
.vp-th-pp-mode.is-inclusive,
.vp-th-pp-mode.is-exclusive {
  background-color: #ffffff !important;
  color: #334155 !important;
}
/* ---------- Cell inputs (borderless until hover/focus) ---------- */
.vp-cell-input {
  width: 100%;
  height: 34px;
  padding: 0 6px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #0f172a;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.12s ease;
}
.vp-cell-input::placeholder {
  color: #cbd5e1;
  font-weight: 400;
}
.vp-cell-input:hover,
.vp-cell-input:focus {
  background: #f1f5f9;
  outline: none;
}
.vp-cell-input.is-numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.vp-cell-input[type="number"] { -moz-appearance: textfield; }
.vp-cell-input[type="number"]::-webkit-outer-spin-button,
.vp-cell-input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
/* ---------- Suggestion shell ---------- */
.vp-suggest-wrap {
  position: relative;
  width: 100%;
}
.vp-suggest-shell {
  width: 100%;
  height: 34px;
  padding: 0 6px;
  border: 0;
  border-radius: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  transition: background 0.12s ease;
}
.vp-suggest-shell:hover,
.vp-suggest-shell:focus-within {
  background: #f1f5f9;
  outline: none;
}
.vp-suggest-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 12px;
  font-weight: 500;
}
.vp-suggest-input::placeholder {
  color: #cbd5e1;
  font-weight: 400;
}
.vp-suggest-menu {
  position: absolute;
  z-index: 100;
  top: 38px;
  left: 0;
  width: 300px;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
}
.vp-suggest-option {
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-radius: 5px;
  background: #fff;
  display: grid;
  gap: 3px;
  text-align: left;
  color: #0f172a;
  font-size: 12px;
  cursor: pointer;
}
.vp-suggest-option:hover { background: #f5f7fa; }
.vp-suggest-option strong { font-weight: 600; }
.vp-suggest-option span {
  color: #64748b;
  font-size: 11px;
}
.vp-available-stock {
  display: block;
  margin-top: 3px;
  color: #15803d;
  font-size: 10px;
  font-weight: 700;
}

/* ---------- Row number / amount / delete ---------- */
.vp-row-number {
  padding: 12px 4px;
  color: #94a3b8;
  text-align: center;
  font-size: 11.5px;
  font-weight: 600;
}
.vp-amount-cell {
  padding: 12px 12px;
  color: #0f172a;
  text-align: right;
  font-weight: 700;
  white-space: nowrap;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.vp-delete-button {
  width: 30px;
  height: 30px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #b91c1c;
  display: grid;
  place-items: center;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.vp-delete-button:hover {
  background: #fef2f2;
  border-color: #fecaca;
}

/* ---------- Add Row footer ---------- */
.vp-items-footer {
  padding: 10px 18px 14px;
  border-top: 1px solid #eef2f7;
  background: #fafbfc;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.vp-add-row-button {
  height: 36px;
  padding: 0 14px;
  border: 1px dashed #93b4ee;
  border-radius: 6px;
  background: #fff;
  color: #1d4ed8;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.12s ease;
}
.vp-add-row-button:hover {
  background: #eff6ff;
  border-color: #2563eb;
  border-style: solid;
}

/* ================================================================
   SUMMARY
   ================================================================ */
.vp-summary-section {
  display: flex;
  justify-content: flex-end;
}
.vp-summary-card {
  width: min(380px, 100%);
  background: #fff;
  border: 1px solid #e1e7ef;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}
.vp-summary-title {
  margin: 0;
  padding: 14px 18px 10px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
  border-bottom: 1px solid #eef2f7;
}
.vp-summary-rows {
  display: grid;
  gap: 10px;
  padding: 14px 18px 16px;
}
.vp-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: #475569;
  font-size: 12.5px;
}
.vp-summary-row strong {
  color: #0f172a;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.vp-grand-total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 0 4px;
  margin-top: 4px;
  border-top: 1px solid #e2e8f0;
  color: #2563eb;
  font-size: 15px;
  font-weight: 700;
}
.vp-grand-total-row strong { font-variant-numeric: tabular-nums; }

/* ================================================================
   STICKY FOOTER
   ================================================================ */
.vp-editor-footer {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 24px;
  margin-top: 16px;
  background: #fff;
  border-top: 1px solid #e1e5ea;
  box-shadow: 0 -4px 12px rgba(15, 23, 42, 0.05);
}
.vp-editor-footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.vp-footer-cancel {
  height: 38px;
  padding: 0 18px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #475569;
  font-size: 12.5px;
  font-weight: 600;
  transition: background 0.12s ease;
}
.vp-footer-cancel:hover { background: #f5f7fa; }
.vp-footer-secondary {
  height: 38px;
  padding: 0 16px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  font-size: 12.5px;
  font-weight: 600;
}
.vp-footer-secondary:hover:not(:disabled) { background: #f5f7fa; }
.vp-footer-primary {
  height: 38px;
  padding: 0 20px;
  border: 0;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
  transition: background 0.12s ease, transform 0.08s ease;
}
.vp-footer-primary:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}
.vp-footer-primary:disabled,
.vp-footer-secondary:disabled,
.vp-footer-cancel:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ================================================================
   LIST VIEW
   ================================================================ */
.vp-list-page {
  min-height: calc(100vh - 28px);
  background: #fff;
}
.vp-list-header {
  min-height: 90px;
  padding: 16px 24px;
  border-bottom: 1px solid #e1e6ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.vp-list-title-group {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 240px;
}
.vp-list-title-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: #eff4ff;
  color: #2563eb;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.vp-list-eyebrow {
  display: block;
  margin-bottom: 1px;
  color: #64748b;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.vp-page-title {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.vp-page-subtitle {
  margin: 3px 0 0;
  color: #64748b;
  font-size: 11.5px;
}
.vp-list-header-actions {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}
.vp-list-search {
  width: 245px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
}
.vp-list-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 12.5px;
}
.vp-list-search button {
  border: 0;
  background: transparent;
  color: #94a3b8;
}
.vp-store-filter-field {
  display: grid;
  gap: 3px;
  color: #64748b;
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.vp-store-filter-select {
  height: 38px;
  min-width: 180px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  font-size: 12.5px;
  text-transform: none;
  letter-spacing: normal;
  font-weight: 500;
}
.vp-toolbar-button {
  height: 38px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 600;
}
.vp-toolbar-button:hover { background: #f5f7fa; }
.vp-toolbar-button.is-active {
  border-color: #93b4ee;
  background: #eff6ff;
  color: #1d4ed8;
}
.vp-primary-button {
  height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
}
.vp-primary-button:hover:not(:disabled) { background: #1d4ed8; }
.vp-primary-button:disabled { opacity: 0.55; cursor: not-allowed; }
.vp-cancel-button {
  height: 38px;
  padding: 0 16px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  font-size: 12.5px;
  font-weight: 600;
}
.vp-relative { position: relative; }
.vp-filter-menu,
.vp-more-menu {
  position: absolute;
  z-index: 50;
  top: 44px;
  right: 0;
  padding: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
}
.vp-filter-menu { width: 220px; }
.vp-filter-label {
  display: grid;
  gap: 6px;
  color: #334155;
  font-size: 12px;
}
.vp-filter-select {
  width: 100%;
  height: 34px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
}
.vp-more-menu { width: 190px; padding: 4px 0; }
.vp-more-menu button {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 0;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 9px;
  color: #334155;
  font-size: 12.5px;
  text-align: left;
}
.vp-more-menu button:hover { background: #f5f7fa; }

/* Financial metrics */
.vp-financial-summary {
  padding: 14px 24px;
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 12px;
  border-bottom: 1px solid #e6eaf0;
  background: #f8fafc;
}
.vp-financial-metric {
  min-height: 66px;
  padding: 10px 15px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 10.5px;
}
.vp-metric-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.vp-metric-icon--paid { background: #eaf8f0; color: #16834a; }
.vp-metric-icon--due { background: #fff3e8; color: #b65d16; }
.vp-financial-metric strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}
.vp-financial-metric small {
  display: block;
  margin-top: 3px;
  color: #94a3b8;
  font-size: 11px;
}
.vp-list-tools {
  min-height: 46px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e5e7eb;
  color: #64748b;
  font-size: 11.5px;
}
.vp-list-tools button {
  background: transparent;
  border: 0;
  color: #2563eb;
  cursor: pointer;
}
.vp-result-count { margin-left: auto; color: #64748b; font-size: 12px; }
.vp-error,
.vp-success {
  margin: 14px 24px 0;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 12.5px;
}
.vp-error { border-left: 3px solid #dc2626; background: #fef2f2; color: #b91c1c; }
.vp-success { border-left: 3px solid #16a34a; background: #f0fdf4; color: #166534; }
.vp-bill-table-wrap { overflow-x: auto; background: #fff; }
.vp-bill-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  color: #334155;
  font-size: 12.5px;
}
.vp-bill-table thead th {
  height: 40px;
  padding: 0 14px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  text-align: left;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.vp-bill-table tbody td {
  height: 56px;
  padding: 10px 14px;
  border-bottom: 1px solid #eef2f7;
  vertical-align: middle;
}
.vp-bill-table tbody tr { cursor: pointer; transition: background 0.1s ease; }
.vp-bill-table tbody tr:hover { background: #f5f8ff; }
.vp-bill-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: #2563eb;
  font-size: 12.5px;
  font-weight: 600;
}
.vp-bill-link:hover { text-decoration: underline; }
.vp-status-pill {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.vp-status--paid { background: #dcfce7; color: #15803d; }
.vp-status--draft { background: #fef3c7; color: #a16207; }
.vp-status--unpaid { background: #fee2e2; color: #b91c1c; }
.vp-empty-state {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}
.vp-empty-state-icon {
  width: 52px;
  height: 52px;
  margin-bottom: 4px;
  border-radius: 12px;
  background: #eff4ff;
  color: #2563eb;
  display: grid;
  place-items: center;
}
.vp-empty-state strong { color: #0f172a; font-size: 13px; font-weight: 700; }
.vp-empty-state-button {
  height: 34px;
  margin-top: 8px;
  padding: 0 14px;
  border: 1px solid #93b4ee;
  border-radius: 6px;
  background: #eff6ff;
  color: #1d4ed8;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
}
.vp-empty-bills { height: 180px; padding: 20px; text-align: center; }

/* ================================================================
   VENDOR MODAL
   ================================================================ */
.vp-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.45);
}
.vp-vendor-modal {
  width: min(680px, 96vw);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 20px 55px rgba(15, 23, 42, 0.25);
  overflow: hidden;
}
.vp-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
}
.vp-modal-title { margin: 0; color: #0f172a; font-size: 16px; font-weight: 700; }
.vp-modal-subtitle { margin: 4px 0 0; color: #64748b; font-size: 12px; }
.vp-modal-close {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 6px;
  background: #f1f5f9;
  color: #475569;
  display: grid;
  place-items: center;
}
.vp-modal-close:hover { background: #e2e8f0; }
.vp-vendor-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 20px;
}
.vp-meta-field {
  display: grid;
  gap: 5px;
  align-content: start;
  color: #334155;
  font-size: 12px;
}
.vp-span-2 { grid-column: 1 / -1; }
.vp-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

/* ================================================================
   RESPONSIVE
   ================================================================ */
@media (max-width: 1200px) {
  .vp-meta-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .vp-editor-header { padding: 10px 16px; }
  .vp-editor-canvas { padding: 16px; }
  .vp-editor-footer { padding: 12px 16px; }
}
@media (max-width: 720px) {
  .vp-meta-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .vp-list-header { padding: 12px 16px; }
  .vp-financial-summary {
    padding: 12px 16px;
    grid-template-columns: 1fr;
  }
  .vp-editor-footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  .vp-editor-footer-actions { justify-content: stretch; }
  .vp-editor-footer-actions > button { flex: 1; }
  .vp-vendor-form-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .vp-meta-row {
    grid-template-columns: 1fr;
  }
}
/* Fallback: force .vp-th-pp children to stack */
.vp-items-table th.vp-th-pp {
  white-space: normal !important;
}
.vp-items-table th.vp-th-pp .vp-th-pp-label,
.vp-items-table th.vp-th-pp .vp-th-pp-mode {
  display: block;
  width: 100%;
}`}</style>
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
                  <button
                    type="button"
                    onClick={() => setBillSearch("")}
                    aria-label="Clear"
                  >
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
                      <option key={s.id} value={s.id}>
                        {s.storeName}
                      </option>
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
                <button
                  type="button"
                  className="vp-toolbar-button"
                  onClick={toggleMore}
                >
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
                          m === "NEWEST"
                            ? "OLDEST"
                            : m === "OLDEST"
                              ? "AMOUNT_HIGH"
                              : m === "AMOUNT_HIGH"
                                ? "AMOUNT_LOW"
                                : "NEWEST",
                        );
                        setMoreMenuOpen(false);
                      }}
                    >
                      <Filter size={15} /> Sort: {sortLabel(sortMode)}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={exportBills}
                    >
                      <Download size={15} /> Export Bills
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="vp-primary-button"
                onClick={startNewBill}
              >
                <CirclePlus size={16} /> New Bill
              </button>
            </div>
          </header>

          <div className="vp-financial-summary">
            <div className="vp-financial-metric">
              <div className="vp-metric-icon vp-metric-icon--paid">
                <PackageCheck size={18} />
              </div>
              <div>
                <span>Paid bills</span>
                <strong>{formatMoney(paidValue)}</strong>
                <small>
                  {paidBills.length} completed bill
                  {paidBills.length === 1 ? "" : "s"}
                </small>
              </div>
            </div>
            <div className="vp-financial-metric">
              <div className="vp-metric-icon vp-metric-icon--due">
                <AlertTriangle size={18} />
              </div>
              <div>
                <span>Balance due</span>
                <strong>{formatMoney(balanceValue)}</strong>
                <small>
                  {balanceBills.length} unpaid bill
                  {balanceBills.length === 1 ? "" : "s"}
                </small>
              </div>
            </div>
          </div>

          {statusFilter !== "ALL" && (
            <div className="vp-list-tools">
              <span>
                Showing status: <strong>{statusFilter}</strong>
              </span>
              <button type="button" onClick={() => setStatusFilter("ALL")}>
                Clear filter
              </button>
              <span className="vp-result-count">
                {visiblePurchases.length} result
                {visiblePurchases.length === 1 ? "" : "s"}
              </span>
            </div>
          )}

          {message && (
            <div
              className={message.type === "error" ? "vp-error" : "vp-success"}
            >
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
                    <td colSpan={7} className="vp-empty-bills">
                      <div className="vp-empty-state">
                        <div className="vp-empty-state-icon">
                          <ReceiptText size={24} />
                        </div>
                        <strong>Select a store</strong>
                        <span>
                          Choose a store above to view its vendor bills and
                          balances.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : visiblePurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="vp-empty-bills">
                      <div className="vp-empty-state">
                        <div className="vp-empty-state-icon">
                          <ReceiptText size={24} />
                        </div>
                        <strong>No vendor bills yet</strong>
                        <span>
                          Create a new bill or import supplier items to begin
                          receiving stock.
                        </span>
                        <button
                          type="button"
                          className="vp-empty-state-button"
                          onClick={startNewBill}
                        >
                          <CirclePlus size={15} /> Create first bill
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visiblePurchases.map((bill) => (
                    <tr
                      key={bill.receiptId}
                      onClick={() => viewBill(bill.receiptId)}
                    >
                      <td>{formatDate(bill.invoiceDate)}</td>
                      <td>
                        <button
                          type="button"
                          className="vp-bill-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewBill(bill.receiptId);
                          }}
                        >
                          {bill.vendorInvoiceNumber}
                        </button>
                      </td>
                      <td>{bill.vendorName || "—"}</td>
                      <td>
                        <span
                          className={`vp-status-pill vp-status--${displayBillStatus(bill).toLowerCase()}`}
                        >
                          {displayBillStatus(bill)}
                        </span>
                      </td>
                      <td>{formatDate(bill.dueDate || bill.invoiceDate)}</td>
                      <td style={{ textAlign: "right" }}>
                        {formatMoney(bill.totalAmount)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {formatMoney(bill.balanceDue)}
                      </td>
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
                      <option key={s.id} value={s.id}>
                        {s.storeName}
                      </option>
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
                        <option key={v.id} value={v.id}>
                          {v.vendorName}
                        </option>
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
                      {paymentStatus === "PAID" && (
                        <span className="vp-required-star"> *</span>
                      )}
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
                        Reason for Editing{" "}
                        <span className="vp-required-star">*</span>
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
                  <table className="vp-items-table">
                    <colgroup>
                      <col style={{ width: 60 }} />
                      <col style={{ width: 110 }} />
                      <col style={{ width: 150 }} />
                      <col style={{ width: 90 }} />
                      <col style={{ width: 70 }} />
                      <col style={{ width: 60 }} />
                      <col style={{ width: 130 }} />
                      <col style={{ width: 85 }} />
                      <col style={{ width: 85 }} />
                      <col style={{ width: 60 }} />
                      <col style={{ width: 60 }} />
                      <col style={{ width: 70 }} />
                      <col style={{ width: 100 }} />
                      <col style={{ width: 36 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Sl. No.</th>
                        <th>Part No.</th>
                        <th>Item Name</th>
                        <th>Brand</th>
                        <th>HSN</th>
                        <th>Qty</th>
                        <th className="vp-th-pp">
                          <div className="vp-th-pp-inner">
                            <span className="vp-th-pp-label">
                              Purchase Price
                            </span>
                            <select
                              className={`vp-th-pp-mode ${
                                columnPriceMode === "GST_INCLUSIVE"
                                  ? "is-inclusive"
                                  : "is-exclusive"
                              }`}
                              value={columnPriceMode}
                              onChange={(e) =>
                                applyColumnPriceMode(e.target.value)
                              }
                              title="With or without tax"
                            >
                              <option value="GST_INCLUSIVE">With Tax</option>
                              <option value="GST_EXCLUSIVE">Without Tax</option>
                            </select>
                          </div>
                        </th>
                        <th>MRP</th>
                        <th>Selling</th>
                        <th>Disc %</th>
                        <th>GST %</th>
                        <th>Rack</th>
                        <th style={{ textAlign: "right" }}>Amount</th>
                        <th></th>
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
                              inputRef={(el) => {
                                firstInputRefs.current[row.key] = el;
                              }}
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
                              onChange={(v) =>
                                updateRow(row.key, "brandName", v)
                              }
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
                              onChange={(v) =>
                                updateRow(row.key, "quantity", v)
                              }
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
                                updatePriceRow(
                                  row.key,
                                  "purchasePrice",
                                  e.target.value,
                                )
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
                              onChange={(v) =>
                                updatePriceRow(row.key, "mrp", v)
                              }
                            />
                          </td>

                          <td>
                            <CellInput
                              type="number"
                              value={row.sellingPrice}
                              placeholder="0.00"
                              step="10"
                              onChange={(v) =>
                                updatePriceRow(row.key, "sellingPrice", v)
                              }
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
                                updatePriceRow(
                                  row.key,
                                  "discountPercentage",
                                  e.target.value,
                                )
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
                                updatePriceRow(
                                  row.key,
                                  "gstPercentage",
                                  e.target.value,
                                )
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="18"
                            />
                          </td>

                          <td>
                            <CellInput
                              value={row.rackNumber}
                              placeholder="A-12"
                              onChange={(v) =>
                                updateRow(row.key, "rackNumber", v)
                              }
                            />
                          </td>

                          <td className="vp-amount-cell">
                            {formatMoney(
                              computeRowAmounts(row, columnPriceMode).lineTotal,
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
                      <strong>
                        {formatMoney(purchaseSummary.taxableAmount)}
                      </strong>
                    </div>

                    {gstMode === "IGST" ? (
                      <div className="vp-summary-row">
                        <span>IGST</span>
                        <strong>
                          {formatMoney(purchaseSummary.igstAmount)}
                        </strong>
                      </div>
                    ) : (
                      <>
                        <div className="vp-summary-row">
                          <span>CGST</span>
                          <strong>
                            {formatMoney(purchaseSummary.cgstAmount)}
                          </strong>
                        </div>
                        <div className="vp-summary-row">
                          <span>SGST</span>
                          <strong>
                            {formatMoney(purchaseSummary.sgstAmount)}
                          </strong>
                        </div>
                      </>
                    )}

                    <div className="vp-summary-row">
                      <span>Total GST</span>
                      <strong>
                        {formatMoney(purchaseSummary.totalGstAmount)}
                      </strong>
                    </div>
                    <div className="vp-summary-row">
                      <span>Round Off</span>
                      <strong>
                        {formatMoney(purchaseSummary.roundOffAmount)}
                      </strong>
                    </div>
                    <div className="vp-grand-total-row">
                      <span>Grand Total</span>
                      <strong>
                        {formatMoney(purchaseSummary.totalAmount)}
                      </strong>
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
          <div
            className="vp-vendor-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="vp-modal-header">
              <div>
                <h3 className="vp-modal-title">Add Vendor</h3>
                <p className="vp-modal-subtitle">
                  This vendor will be available for the selected store.
                </p>
              </div>
              <button
                type="button"
                className="vp-modal-close"
                onClick={closeVendorModal}
              >
                <X size={18} />
              </button>
            </div>

            {vendorModalMessage && (
              <div
                className={
                  vendorModalMessage.type === "error"
                    ? "vp-error"
                    : "vp-success"
                }
              >
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
                      <option key={s.id} value={s.id}>
                        {s.storeName}
                      </option>
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
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, vendorName: e.target.value })
                  }
                />
              </label>
              <label className="vp-meta-field">
                <span className="vp-field-label">Phone *</span>
                <input
                  className="vp-meta-input"
                  maxLength={10}
                  value={vendorForm.phone}
                  onChange={(e) =>
                    setVendorForm({
                      ...vendorForm,
                      phone: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </label>
              <label className="vp-meta-field">
                <span className="vp-field-label">Contact Person</span>
                <input
                  className="vp-meta-input"
                  value={vendorForm.contactPerson}
                  onChange={(e) =>
                    setVendorForm({
                      ...vendorForm,
                      contactPerson: e.target.value,
                    })
                  }
                />
              </label>
              <label className="vp-meta-field">
                <span className="vp-field-label">Email</span>
                <input
                  type="email"
                  className="vp-meta-input"
                  value={vendorForm.email}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, email: e.target.value })
                  }
                />
              </label>
              <label className="vp-meta-field">
                <span className="vp-field-label">GST Number</span>
                <input
                  className="vp-meta-input"
                  maxLength={15}
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
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, state: e.target.value })
                  }
                />
              </label>
              <label className="vp-meta-field">
                <span className="vp-field-label">Pincode</span>
                <input
                  className="vp-meta-input"
                  maxLength={6}
                  value={vendorForm.pincode}
                  onChange={(e) =>
                    setVendorForm({
                      ...vendorForm,
                      pincode: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </label>
              <label className="vp-meta-field vp-span-2">
                <span className="vp-field-label">Address</span>
                <textarea
                  className="vp-meta-input"
                  style={{ minHeight: 68, paddingTop: 8 }}
                  value={vendorForm.address}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, address: e.target.value })
                  }
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
function CellInput({ value, onChange, placeholder, type = "text", step }: any) {
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

function SuggestionInput({
  row,
  field,
  placeholder,
  suggestions,
  onChange,
  onSelect,
  inputRef,
}: any) {
  return (
    <div className="vp-suggest-wrap">
      <div className="vp-suggest-shell">
        <Search size={13} color="#64748B" />
        <input
          ref={inputRef}
          className="vp-suggest-input"
          value={row[field]}
          onChange={(e) => onChange(row, field, e.target.value)}
          placeholder={placeholder}
        />
      </div>
      {field === "partNumber" && row.availableStock !== null && (
        <span className="vp-available-stock">
          Available: {row.availableStock}
        </span>
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
