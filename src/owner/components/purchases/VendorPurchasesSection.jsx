import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, CirclePlus, Download, Filter, MoreHorizontal,
  PackageCheck, Pencil, Printer, Search, Trash2, Upload, X,
} from "lucide-react";
import api from "../../../services/api";
import VendorPurchaseInvoiceView from "./VendorPurchaseInvoiceView";

const emptyRow = () => ({
  key: `${Date.now()}-${Math.random()}`,
  itemId: null,
  partNumber: "",
  itemName: "",
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
  priceMode: "GST_EXCLUSIVE",
  gstPercentage: "18",
  rackNumber: "",
  hsnCode: "",
  sellingPrice: "",
  sellingManual: false,
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

// GST is treated as a free-form string, not a strict GSTIN structure:
// letters and numbers only, up to 15 characters, blank allowed.
function isValidGstValue(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return true;
  return /^[A-Za-z0-9]{1,15}$/.test(trimmed);
}

// Fixed pricing rule for the whole file:
//   - MRP is always GST-inclusive.
//   - Selling Price is always GST-exclusive.
//   - Purchase Price = MRP after discount, expressed as a GST-exclusive
//     (taxable) rate, since it feeds directly into the taxable amount /
//     GST calculations below.
function computeRowAmounts(row) {
  const acceptedQuantity = Math.max(
    0,
    Number(row.quantity || 0)
      - Number(row.damagedQuantity || 0)
      - Number(row.rejectedQuantity || 0)
  );

  const discountPercentage = Math.min(
    99.99,
    Math.max(0, Number(row.discountPercentage || 0))
  );
  const mrp = Math.max(0, Number(row.mrp || 0));
  const gstRate = Math.max(0, Number(row.gstPercentage || 0)) / 100;
  // MRP always includes GST, so the taxable base rate always removes it.
  const baseRate = gstRate > 0 ? mrp / (1 + gstRate) : mrp;
  const discountPerUnit = baseRate * discountPercentage / 100;
  const purchasePrice = baseRate - discountPerUnit;
  const grossAmount = Number((acceptedQuantity * baseRate).toFixed(2));
  const discountAmount = Number((acceptedQuantity * discountPerUnit).toFixed(2));
  const lineTotal = Number((acceptedQuantity * baseRate
    * (1 - discountPercentage / 100)).toFixed(2));

  return {
    acceptedQuantity,
    purchasePrice,
    discountPercentage,
    grossAmount,
    discountAmount,
    lineTotal,
  };
}

// Live purchase summary for the NEW / EDIT bill editor. GST is extracted
// from inclusive prices and added to exclusive prices. Each row keeps its
// own GST rate, while the bill decides between IGST and CGST + SGST.
function calculatePurchaseSummary(rows, paymentStatus, priceMode, gstMode) {
  let acceptedQuantity = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalBeforeRoundOff = 0;

  rows.forEach((row) => {
    if (isEmptyRow(row)) return;

    const amounts = computeRowAmounts(row);
    const lineBase = amounts.lineTotal;
    const gstRate = Math.max(0, Number(row.gstPercentage || 0));
    const rate = gstRate / 100;
    let lineTaxable = lineBase;
    let linePayable = lineBase;

    if (gstMode === "IGST") {
      let lineIgst = 0;
      if (lineBase > 0 && rate > 0) {
        lineIgst = Number((lineBase * rate).toFixed(2));
        linePayable = Number((lineBase + lineIgst).toFixed(2));
      }
      igstAmount += lineIgst;
    } else {
      let lineHalfTax = 0;
      if (lineBase > 0 && rate > 0) {
        lineHalfTax = Number((lineBase * (rate / 2)).toFixed(2));
        linePayable = Number((lineBase + lineHalfTax * 2).toFixed(2));
      }
      cgstAmount += lineHalfTax;
      sgstAmount += lineHalfTax;
    }

    acceptedQuantity += amounts.acceptedQuantity;
    taxableAmount += lineTaxable;
    totalBeforeRoundOff += linePayable;
  });

  const taxableAmountRounded = Number(taxableAmount.toFixed(2));
  const cgstAmountRounded = Number(cgstAmount.toFixed(2));
  const sgstAmountRounded = Number(sgstAmount.toFixed(2));
  const igstAmountRounded = Number(igstAmount.toFixed(2));
  const totalGstAmount = Number((
    cgstAmountRounded + sgstAmountRounded + igstAmountRounded
  ).toFixed(2));
  const totalBeforeRoundOffRounded = Number(totalBeforeRoundOff.toFixed(2));
  const totalAmount = Math.round(totalBeforeRoundOffRounded);
  const roundOffAmount = Number((totalAmount - totalBeforeRoundOffRounded).toFixed(2));

  return {
    acceptedQuantity,
    taxableAmount: taxableAmountRounded,
    cgstAmount: cgstAmountRounded,
    sgstAmount: sgstAmountRounded,
    igstAmount: igstAmountRounded,
    totalGstAmount,
    totalBeforeRoundOff: totalBeforeRoundOffRounded,
    roundOffAmount,
    totalAmount,
    balanceDue: paymentStatus === "PAID" ? 0 : totalAmount,
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

function ManualStockReceipt() {
  const user = getUser();
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const [rows, setRows] = useState([emptyRow()]);
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(user.storeId ? String(user.storeId) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [priceMode, setPriceMode] = useState("GST_INCLUSIVE");
  const [gstMode, setGstMode] = useState("CGST_SGST");
  const [gstPercentage, setGstPercentage] = useState("18");
  const [vendors, setVendors] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [screen, setScreen] = useState("list");
  const [billSearch, setBillSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
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
  const [paymentReference, setPaymentReference] = useState("");
  const [remarks, setRemarks] = useState("");
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
  const firstInputRefs = useRef({});
  const suggestionRequestRefs = useRef({});
  const importInputRef = useRef(null);
  const filterRef = useRef(null);
  const moreRef = useRef(null);
  const currentRowDefaults = { priceMode, gstPercentage };

  // Only ONE of Filter / More can be open at a time; outside click and
  // Escape close whichever is open.
  useEffect(() => {
    if (!filterOpen && !moreMenuOpen) return;
    const handleClick = (event) => {
      if (filterOpen && filterRef.current && !filterRef.current.contains(event.target)) setFilterOpen(false);
      if (moreMenuOpen && moreRef.current && !moreRef.current.contains(event.target)) setMoreMenuOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") { setFilterOpen(false); setMoreMenuOpen(false); }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [filterOpen, moreMenuOpen]);

  const toggleFilter = () => { setMoreMenuOpen(false); setFilterOpen((open) => !open); };
  const toggleMore = () => { setFilterOpen(false); setMoreMenuOpen((open) => !open); };

  useEffect(() => {
    setRows((current) => {
      const lastRow = current[current.length - 1];
      return lastRow && isCompleteRow(lastRow)
        ? [...current, { ...emptyRow(), priceMode, gstPercentage }]
        : current;
    });
  }, [rows, priceMode, gstPercentage]);

  useEffect(() => {
    if (!storeId) {
      setVendors([]);
      setVendorId("");
      return;
    }
    let active = true;
    api.get("/vendors", { params: { storeId: Number(storeId), activeOnly: true } })
      .then((response) => {
        if (!active) return;
        const data = Array.isArray(response.data) ? response.data : [];
        setVendors(data);
        setVendorId((current) => data.some((vendor) => String(vendor.id) === current) ? current : "");
      })
      .catch(() => active && setMessage({ type: "error", text: "Unable to load vendors" }));
    return () => { active = false; };
  }, [storeId]);

  useEffect(() => {
    if (!storeId) {
      setPurchases([]);
      return;
    }
    api.get("/vendor-purchases", { params: { storeId: Number(storeId) } })
      .then((response) => setPurchases(Array.isArray(response.data) ? response.data : []))
      .catch(() => setPurchases([]));
  }, [storeId]);

  const openVendorModal = () => {
    setVendorForm({ vendorName: "", phone: "", email: "", gstNumber: "", address: "", contactPerson: "", state: "", pincode: "" });
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
    if (isSuperAdmin && !vendorModalStoreId) return setVendorModalMessage({ type: "error", text: "Please select a store." });
    const targetStoreId = isSuperAdmin ? vendorModalStoreId : storeId;
    if (!targetStoreId) return setVendorModalMessage({ type: "error", text: "Please select a store." });
    if (!vendorForm.vendorName.trim()) return setVendorModalMessage({ type: "error", text: "Vendor name is required" });
    if (!/^\d{10}$/.test(vendorForm.phone)) return setVendorModalMessage({ type: "error", text: "Vendor phone must contain 10 digits" });
    if (!isValidGstValue(vendorForm.gstNumber)) return setVendorModalMessage({ type: "error", text: "GST number can contain only letters and numbers, up to 15 characters" });
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
      // If the vendor was created for the store currently selected on the
      // bill, refresh the vendor dropdown and preselect it.
      if (String(targetStoreId) === String(storeId)) {
        const response = await api.get("/vendors", { params: { storeId: Number(storeId), activeOnly: true } });
        const data = Array.isArray(response.data) ? response.data : [];
        setVendors(data);
        const created = data.find((vendor) => vendor.vendorName.toLowerCase() === vendorForm.vendorName.trim().toLowerCase());
        setVendorId(created ? String(created.id) : "");
      }
      setVendorModalOpen(false);
      setVendorModalMessage(null);
      setVendorForm({ vendorName: "", phone: "", email: "", gstNumber: "", address: "", contactPerson: "", state: "", pincode: "" });
      setMessage({ type: "success", text: "Vendor created successfully" });
    } catch (error) {
      setVendorModalMessage({ type: "error", text: error.response?.data?.message || "Unable to create vendor" });
    } finally {
      setVendorSaving(false);
    }
  };

  const loadStores = async () => {
    if (!isSuperAdmin || stores.length) return;
    const response = await api.get("/stores", { params: { page: 0, size: 100, active: true } });
    setStores(Array.isArray(response.data?.content) ? response.data.content : []);
  };

  // Auto-calculation between Purchase Price / MRP / Selling Price should
  // only run while all three price fields are still blank — i.e. the very
  // first value typed into a fresh row. Once any of the three has a
  // value, further edits to any one of these fields must update ONLY that
  // field and leave the others untouched (see updatePriceRow below).
  // Clearing all three brings the row back to "fresh" mode.
  const isPriceGroupEmpty = (row) =>
    row.purchasePrice === "" && row.mrp === "" && row.sellingPrice === "";

  // Generic field updater. All price-field math (MRP / Purchase Price /
  // Selling Price / Discount% / GST%) is handled by updatePriceRow, which
  // is wired directly to those inputs — this function just writes the
  // given field and resets catalog-linkage fields when the part number
  // changes.
  const updateRow = (key, field, value) => {
    setRows((current) =>
      withTrailingEmptyRow(
        current.map((row) => {
          if (row.key !== key) {
            return row;
          }

          return {
            ...row,
            [field]: value,

            ...(field === "partNumber"
              ? {
                  productId: null,
                  localProductId: null,
                  selectedPartNumber: null,
                }
              : {}),
          };
        }),
        currentRowDefaults
      )
    );
  };

  // Price fields need a separate updater because a number such as 1000 is
  // entered through several onChange events (1, 10, 100, 1000). Recalculate
  // on every event while the user is editing the selected source field.
  //
  // Fixed pricing rule (not configurable per row):
  //   MRP            is always GST-inclusive.
  //   Selling Price  is always GST-exclusive.
  //   Purchase Price = MRP after discount (GST-exclusive taxable rate).
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

    const calculatePrices = (row, source, sourceValue) => {
      const sourcePrice = Number(sourceValue);
      const discount = Math.min(99.99, Math.max(0, Number(row.discountPercentage || 0)));
      const gst = Math.min(100, Math.max(0, Number(row.gstPercentage || 0)));
      if (!Number.isFinite(sourcePrice) || sourcePrice <= 0) return null;

      const discountFactor = 1 - discount / 100;
      const gstFactor = 1 + gst / 100;

      let mrp;
      let sellingPrice;
      let purchasePrice;

      if (source === "MRP") {
        // MRP is the GST-inclusive starting point.
        mrp = sourcePrice;
        purchasePrice = mrp * discountFactor;
        sellingPrice = mrp / gstFactor;
      } else if (source === "SELLING_PRICE") {
        // Selling Price is GST-exclusive; add GST back to reach MRP.
        sellingPrice = sourcePrice;
        mrp = sellingPrice * gstFactor;
        purchasePrice = mrp * discountFactor;
      } else if (source === "PURCHASE_PRICE") {
        // Purchase Price is MRP after discount; reverse the discount.
        if (discountFactor <= 0) return null;
        purchasePrice = sourcePrice;
        mrp = purchasePrice / discountFactor;
        sellingPrice = mrp / gstFactor;
      } else {
        return null;
      }

      return {
        mrp: mrp.toFixed(2),
        sellingPrice: sellingPrice.toFixed(2),
        purchasePrice: purchasePrice.toFixed(2),
      };
    };

    setRows((current) => withTrailingEmptyRow(current.map((row) => {
      if (row.key !== key) return row;

      if (sourceByField[field]) {
        const source = sourceByField[field];
        const canCalculate = isPriceGroupEmpty(row) || row.priceSource === source;

        if (!canCalculate) {
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

        const calculated = calculatePrices(row, source, value);
        return calculated
          ? { ...row, ...calculated, [field]: value, priceSource: source }
          : { ...row, [field]: value, priceSource: source };
      }

      if (field === "discountPercentage" || field === "gstPercentage") {
        const nextRow = { ...row, [field]: value };
        const sourceField = fieldBySource[row.priceSource];
        if (!sourceField) return nextRow;
        const calculated = calculatePrices(nextRow, row.priceSource, nextRow[sourceField]);
        return calculated ? { ...nextRow, ...calculated } : nextRow;
      }

      return row;
    }), currentRowDefaults));
  };

  const applyPriceSettings = (nextMode, nextGstPercentage) => {
    const gst = Math.min(100, Math.max(0, Number(nextGstPercentage || 0)));
    setPriceMode(nextMode);
    setGstPercentage(nextGstPercentage);

    setRows((current) => current.map((row) => {
      const updatedRow = {
        ...row,
        priceMode: nextMode,
        gstPercentage: nextGstPercentage,
      };
      const mrp = Number(row.mrp || 0);
      if (!Number.isFinite(mrp) || mrp <= 0) return updatedRow;

      // MRP always includes GST, so Selling Price always removes it.
      const sellingPrice = mrp / (1 + gst / 100);

      return {
        ...updatedRow,
        sellingPrice: sellingPrice.toFixed(2),
        priceSource: "MRP",
      };
    }));
  };

  const addRow = () => {
    const next = { ...emptyRow(), ...currentRowDefaults };
    let focusKey = next.key;
    setRows((current) => {
      const lastRow = current[current.length - 1];
      if (lastRow && isEmptyRow(lastRow)) {
        focusKey = lastRow.key;
        return current;
      }
      return [...current, next];
    });
    requestAnimationFrame(() => firstInputRefs.current[focusKey]?.focus());
  };

  const removeRow = (key) => {
    setRows((current) => current.length === 1
      ? [{ ...emptyRow(), ...currentRowDefaults }]
      : current.filter((row) => row.key !== key));
  };

  const findSuggestions = async (row, field, value) => {
    const requestId = (suggestionRequestRefs.current[row.key] || 0) + 1;
    suggestionRequestRefs.current[row.key] = requestId;
    setSuggestionFocus({ key: row.key, field });
    updateRow(row.key, field, field === "partNumber" ? value.toUpperCase() : value);
    if (!storeId || value.trim().length < 1) {
      setSuggestions((current) => ({ ...current, [row.key]: [] }));
      return;
    }
    try {
      const response = await api.get("/store-inventory/suggestions", {
        params: { storeId: Number(storeId), query: value.trim() },
      });
      if (suggestionRequestRefs.current[row.key] !== requestId) return;
      const matches = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.content || [];
      const exactPart = field === "partNumber"
        ? matches.find((product) =>
            product.partNumber?.toLowerCase() === value.trim().toLowerCase())
        : null;
      if (exactPart) {
        selectSuggestion(row.key, exactPart);
        return;
      }
      setSuggestions((current) => ({ ...current, [row.key]: matches }));
    } catch (error) {
      if (suggestionRequestRefs.current[row.key] !== requestId) return;
      setSuggestions((current) => ({ ...current, [row.key]: [] }));
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to search catalogue products",
      });
    }
  };

  const selectSuggestion = (key, product) => {
    setRows((current) => withTrailingEmptyRow(current.map((row) => row.key === key ? {
      ...row,
      productId: product.productId,
      localProductId: product.localProductId,
      selectedPartNumber: product.partNumber || null,
      partNumber: product.partNumber || "",
      itemName: product.itemName || "",
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
      sellingManual: false,
      mrpManual: false,
      purchaseManual: false,
    } : row), currentRowDefaults));
    setSuggestions((current) => ({ ...current, [key]: [] }));
    setSuggestionFocus(null);
  };

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
    for (let index = 0; index < receiptRows.length; index++) {
      const row = receiptRows[index];
      if (!row.partNumber.trim()) return `Row ${index + 1}: Part Number is required`;
      if (!row.itemName.trim()) return `Row ${index + 1}: Item Name is required`;
      if (!row.brandName.trim()) return `Row ${index + 1}: Brand is required`;
      if (Number(row.quantity) <= 0) return `Row ${index + 1}: Quantity must be greater than zero`;
      const unavailable = Number(row.damagedQuantity || 0) + Number(row.rejectedQuantity || 0);
      if (unavailable >= Number(row.quantity)) return `Row ${index + 1}: accepted quantity must be greater than zero`;
      if (Number(row.purchasePrice) <= 0 || row.purchasePrice === "") return `Row ${index + 1}: Purchase Price must be greater than zero`;
      const discountPct = Number(row.discountPercentage || 0);
      if (Number.isNaN(discountPct) || discountPct < 0 || discountPct >= 100) return `Row ${index + 1}: Discount % must be at least 0 and below 100`;
      if (Number(row.mrp) <= 0)
        return `Row ${index + 1}: MRP must be greater than zero`;

      if (Number(row.sellingPrice) <= 0)
        return `Row ${index + 1}: Selling Price is required`;

      if (Number(row.sellingPrice) > Number(row.mrp))
        return `Row ${index + 1}: Selling Price cannot be greater than MRP`;
    }
    return "";
  };

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
        paymentReference: paymentStatus === "PAID" ? paymentReference.trim() || null : null,
        remarks: remarks.trim() || null,
        editReason: editingBillId ? editReason.trim() : null,
        status: editingBillId ? (selectedBill?.status || purchaseStatus) : purchaseStatus,
        priceMode,
        gstMode,
        items: rows.filter((row) => !isEmptyRow(row)).map((row) => ({
          itemId: row.itemId,
          productId: row.selectedPartNumber?.trim().toUpperCase() === row.partNumber.trim().toUpperCase()
            ? row.productId : null,
          localProductId: row.selectedPartNumber?.trim().toUpperCase() === row.partNumber.trim().toUpperCase()
            ? row.localProductId : null,
          partNumber: row.partNumber.trim(),
          itemName: row.itemName.trim(),
          brandName: row.brandName.trim(),
          receivedQuantity: Number(row.quantity),
          damagedQuantity: Number(row.damagedQuantity || 0),
          rejectedQuantity: Number(row.rejectedQuantity || 0),
          purchasePrice: Number(row.purchasePrice),
          discountPercentage: Number(row.discountPercentage || 0),
          discountAmount: computeRowAmounts(row).discountAmount,
          sellingPrice: Number(row.sellingPrice),
          mrp: Number(row.mrp),
          priceSource: row.priceSource || "MRP",
          hsnCode: row.hsnCode.trim() || null,
          categoryName: row.categoryName.trim() || null,
          masterName: row.masterName.trim() || null,
          description: row.description.trim() || null,
          oemNumber: row.oemNumber.trim() || null,
          gstPercentage: row.gstPercentage === "" ? null : Number(row.gstPercentage),
          rackNumber: row.rackNumber.trim() || null,
        })),
      };
      const response = editingBillId
        ? await api.put(`/vendor-purchases/${editingBillId}`, payload)
        : await api.post("/vendor-purchases", payload);
      const purchasesResponse = await api.get("/vendor-purchases", { params: { storeId: Number(storeId) } });
      setPurchases(Array.isArray(purchasesResponse.data) ? purchasesResponse.data : []);
      setMessage({
        type: "success",
        text: response.data.message || "Bill saved successfully"
      });
      setRows([emptyRow()]);
      setInvoiceNumber("");
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setDueDate(new Date().toISOString().slice(0, 10));
      setPaymentReference("");
      setRemarks("");
      setEditReason("");
      setEditingBillId(null);
      setSelectedBill(null);
      setScreen("list");
    } catch (requestError) {
      setMessage({
        type: "error",
        text: requestError.response?.data?.message || "Unable to receive stock",
      });
    } finally {
      setSaving(false);
    }
  };

  const openDraft = async (receiptId) => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await api.post(`/vendor-purchases/${receiptId}/open`);
      const purchasesResponse = await api.get("/vendor-purchases", { params: { storeId: Number(storeId) } });
      setPurchases(Array.isArray(purchasesResponse.data) ? purchasesResponse.data : []);
      setMessage({ type: "success", text: response.data.message });
      setSelectedBill(response.data);
      setScreen("detail");
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Unable to open the draft" });
    } finally {
      setSaving(false);
    }
  };

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
    setPaymentReference("");
    setRemarks("");
    setEditReason("");
    setPriceMode("GST_INCLUSIVE");
    setGstMode("CGST_SGST");
    setGstPercentage("18");
    setRows([emptyRow()]);
    setMessage(null);
    setScreen("editor");
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
    setPaymentReference(selectedBill.paymentReference || "");
    setRemarks(selectedBill.remarks || "");
    setEditReason("");
    setPriceMode(selectedBill.priceMode || "GST_INCLUSIVE");
    setGstMode(selectedBill.gstMode || "CGST_SGST");
    const loadedRows = (selectedBill.items || []).map((item) => ({
      ...emptyRow(),
      itemId: item.itemId,
      productId: item.productId,
      localProductId: item.localProductId,
      selectedPartNumber: item.partNumber,
      partNumber: item.partNumber || "",
      itemName: item.itemName || "",
      brandName: item.brandName || "",
      categoryName: item.categoryName || "",
      masterName: item.masterName || "",
      description: item.description || "",
      oemNumber: item.oemNumber || "",
      hsnCode: item.hsnCode || "",
      quantity: String(item.receivedQuantity ?? item.acceptedQuantity ?? ""),
      damagedQuantity: String(item.damagedQuantity || 0),
      rejectedQuantity: String(item.rejectedQuantity || 0),
      purchasePrice: String(item.purchasePrice ?? ""),
      discountPercentage: String(item.discountPercentage ?? 0),
      discountAmount: String(item.discountAmount ?? 0),
      mrp: String(item.mrp ?? ""),
      sellingPrice: String(item.sellingPrice ?? ""),
      gstPercentage: String(item.gstPercentage ?? gstPercentage),
      priceMode: selectedBill.priceMode || "GST_INCLUSIVE",
      rackNumber: item.rackNumber || "",
      // Preserve saved values as-is: mark every price field manual so
      // opening a saved bill does not trigger any automatic recalculation.
      sellingManual: false,
      mrpManual: false,
      purchaseManual: false,
      priceSource: item.priceSource || "MANUAL",
    }));
    const editRowDefaults = {
      priceMode: selectedBill.priceMode || "GST_INCLUSIVE",
      gstPercentage: String(selectedBill.items?.[0]?.gstPercentage ?? gstPercentage),
    };
    setRows(loadedRows.length
      ? [...loadedRows, { ...emptyRow(), ...editRowDefaults }]
      : [{ ...emptyRow(), ...editRowDefaults }]);
    setMessage(null);
    setScreen("editor");
  };

  const handleVendorChange = (value) => {
    if (value === "__add_vendor__") {
      openVendorModal();
      return;
    }
    setVendorId(value);
  };

  const exportBills = () => {
    const header = ["Date", "Bill Number", "Vendor Name", "Status", "Due Date", "Amount", "Balance Due"];
    const csvRows = visiblePurchases.map((bill) => [
      bill.invoiceDate, bill.vendorInvoiceNumber, bill.vendorName, displayBillStatus(bill),
      bill.dueDate || bill.invoiceDate, Number(bill.totalAmount || 0).toFixed(2),
      Number(bill.balanceDue || 0).toFixed(2),
    ]);
    const csv = [header, ...csvRows].map((row) => row.map(csvValue).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "vendor-bills.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    setMoreMenuOpen(false);
  };

  const importBills = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSaving(true);
    setMessage(null);
    try {
      const records = parseBillCsv(await file.text());
      let imported = 0;
      for (const record of records) {
        const vendor = vendors.find((item) => item.vendorName.trim().toLowerCase() === record.vendorName.toLowerCase());
        if (!vendor) throw new Error(`Vendor '${record.vendorName}' is not available. Create the vendor before importing.`);
        await api.post("/vendor-purchases", {
          storeId: Number(storeId), vendorId: vendor.id,
          vendorInvoiceNumber: record.invoiceNumber,
          invoiceDate: record.invoiceDate, dueDate: record.dueDate || record.invoiceDate,
          paymentStatus: record.paymentStatus, paymentMethod: record.paymentStatus === "PAID" ? record.paymentMethod : null,
          remarks: record.remarks || null, status: record.status,
          items: record.items,
        });
        imported++;
      }
      const response = await api.get("/vendor-purchases", { params: { storeId: Number(storeId) } });
      setPurchases(Array.isArray(response.data) ? response.data : []);
      setMessage({ type: "success", text: `${imported} bill(s) imported successfully` });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || error.message || "Unable to import bills" });
    } finally {
      setSaving(false);
      setMoreMenuOpen(false);
    }
  };

  const enteredRows = rows.filter((row) => !isEmptyRow(row));
  // Live purchase summary for the editor (per-row GST extraction).
  // Used by the "New Bill" / "Edit Bill" totals card so the user can see
  // the expected total before saving. The saved-bill DETAIL screen keeps
  // using selectedBill.* (the backend response) untouched.
  const purchaseSummary = calculatePurchaseSummary(
    rows,
    paymentStatus,
    priceMode,
    gstMode
  );
  const normalizedSearch = billSearch.trim().toLowerCase();
  const visiblePurchases = purchases
    .filter((purchase) => statusFilter === "ALL" || displayBillStatus(purchase) === statusFilter)
    .filter((purchase) => !normalizedSearch || [
      purchase.vendorInvoiceNumber,
      purchase.receiptNumber,
      purchase.vendorName,
      displayBillStatus(purchase),
    ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch)))
    .sort((left, right) => {
      if (sortMode === "OLDEST") return String(left.invoiceDate).localeCompare(String(right.invoiceDate));
      if (sortMode === "AMOUNT_HIGH") return Number(right.totalAmount || 0) - Number(left.totalAmount || 0);
      if (sortMode === "AMOUNT_LOW") return Number(left.totalAmount || 0) - Number(right.totalAmount || 0);
      return String(right.invoiceDate).localeCompare(String(left.invoiceDate));
    });
  const paidBills = purchases.filter((bill) => bill.status !== "DRAFT" && bill.paymentStatus === "PAID");
  const balanceBills = purchases.filter((bill) => bill.status !== "DRAFT" && bill.paymentStatus === "UNPAID");
  const paidValue = paidBills.reduce((total, bill) => total + Number(bill.totalAmount || 0), 0);
  const balanceValue = balanceBills.reduce((total, bill) => total + Number(bill.balanceDue ?? bill.totalAmount ?? 0), 0);

  return (
    <section className="bills-workspace" style={S.page}>
      <style>{`
        .vendor-bill-editor button:disabled { opacity: .55; cursor: not-allowed; }
        .vendor-bill-editor input::placeholder { color: #8A8F9C; }
        .vendor-bill-editor select, .vendor-bill-editor input { transition: border-color .15s ease, box-shadow .15s ease; }
        @media (max-width: 1050px) {
          .vendor-bill-editor .bill-meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 900px) {
          .vendor-bill-editor [style*="grid-template-columns: repeat(4"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .vendor-bill-editor [style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr !important; }
          .vendor-bill-editor [style*="white-space: nowrap"] { white-space: normal !important; }
        }
        @media (max-width: 720px) {
          .vendor-bill-editor [style*="justify-content: space-between"] { align-items: flex-start !important; }
          .vendor-bill-editor [style*="padding: 0 24px"] { padding-left: 14px !important; padding-right: 14px !important; }
        }

        .bills-workspace, .bills-workspace button, .bills-workspace input,
        .bills-workspace select, .bills-workspace textarea {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          font-weight: 400;
        }
        .bills-workspace input:focus, .bills-workspace select:focus,
        .bills-workspace textarea:focus {
          outline: none;
          border-color: #5b8def !important;
          box-shadow: 0 0 0 1px #5b8def;
        }
        .bills-register-table tbody tr:hover { background: #f7f9fc; }
        .vendor-items-table tbody tr:hover { background: #f7f9fc; }
        .vendor-items-table tbody tr:nth-child(even) { background: #fbfcfd; }
        .vendor-items-table tbody tr:nth-child(even):hover { background: #f7f9fc; }
        .vendor-items-table td input,
        .vendor-items-table td .suggestion-input-shell {
          border-color: transparent !important;
          background: transparent !important;
        }
        .vendor-items-table td input:hover,
        .vendor-items-table td .suggestion-input-shell:hover {
          border-color: #E2E5EA !important;
        }
        .vendor-items-table td input:focus,
        .vendor-items-table td .suggestion-input-shell:focus-within {
          background: #FFFFFF !important;
        }
        .vendor-items-table td input[type="number"] {
          -moz-appearance: textfield;
        }
        .vendor-items-table td input[type="number"]::-webkit-outer-spin-button,
        .vendor-items-table td input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .bill-more-menu button {
          width: 100%; height: 38px; padding: 0 12px; border: 0; background: #fff;
          display: flex; align-items: center; gap: 9px; color: #374151; font-size: 12.5px;
          cursor: pointer; text-align: left;
        }
        .bill-more-menu button:hover { background: #f5f7fa; }
        .bill-list-search button { border: 0; background: transparent; color: #6b7280; cursor: pointer; }
        .bill-financial-summary strong { display: block; margin-top: 7px; color: #111827; font-size: 18px; font-weight: 600; }
        .bill-financial-summary small { display: block; margin-top: 5px; color: #7b8492; font-size: 11px; }
        .bill-invoice-table th { background: #2f3133; color: #fff; font-weight: 600; }
        .bill-invoice-table th, .bill-invoice-table td { padding: 11px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .bill-invoice-table td strong, .bill-invoice-table td span { display: block; }
        .bill-invoice-table td strong { font-weight: 500; color: #111827; }
        .bill-invoice-table td span { margin-top: 4px; color: #6b7280; font-size: 11px; }
        .bill-summary-strip strong {
          display: block;
          margin-top: 7px;
          color: #111827;
          font-size: 16px;
          font-weight: 600;
        }
        .bill-list-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          box-shadow: none !important;
          color: #273142;
          font-size: 12.5px;
        }
        .bill-items-heading > div { display: grid; gap: 4px; }
        .bill-items-heading strong { color: #273142; font-size: 13px; font-weight: 600; }
        .bill-items-heading span { font-weight: 400; }
        .bill-totals table { border-collapse: collapse; }
        .bill-meta-grid > label:first-child { grid-column: span 2; }
        .manual-stock-table-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .manual-stock-table-scroll::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        @media (max-width: 1050px) {
          .bill-meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .manual-stock-table-scroll {
            overflow-x: auto !important;
            overflow-y: visible !important;
          }
        }
        @media (max-width: 640px) {
          .bill-footer-row { flex-direction: column !important; align-items: stretch !important; }
        }
        @media (max-width: 720px) {
          .bill-meta-grid { grid-template-columns: 1fr !important; }
          .bill-meta-grid > label:first-child { grid-column: auto; }
        }
        @media print {
          body * { visibility: hidden !important; }
          .bill-print-area, .bill-print-area * { visibility: visible !important; }
          .bill-print-area { position: absolute !important; inset: 0 !important; width: 100% !important; box-shadow: none !important; border: 0 !important; }
        }
        .manual-stock-suggestions {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .manual-stock-suggestions::-webkit-scrollbar {
          width: 5px;
        }
        .manual-stock-suggestions::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 8px;
        }
      `}</style>
      {screen === "list" && (
        <div style={S.listPage}>
          <header style={S.listHeader}>
            <h1 style={S.pageTitle}>All Bills</h1>
            <div style={S.listHeaderActions}>
              <button type="button" style={S.iconButton} title="Search bills" onClick={() => setSearchOpen((open) => !open)}><Search size={17} /></button>
              {isSuperAdmin && <select value={storeId} onFocus={loadStores} onChange={(event) => setStoreId(event.target.value)} style={S.storeFilterSelect} aria-label="Store filter">
                <option value="">Select store</option>
                {stores.map((store) => <option key={store.id} value={store.id}>{store.storeName}</option>)}
              </select>}
              <div ref={filterRef} style={S.relativeControl}>
                <button type="button" style={S.iconButton} title="Filter bills" onClick={toggleFilter}><Filter size={17} /></button>
                {filterOpen && <div style={S.filterMenu}>
                  <label style={S.filterLabel}>Status
                    <select style={S.filterSelect} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                      <option value="ALL">All statuses</option><option value="PAID">Paid</option>
                      <option value="UNPAID">Unpaid</option><option value="DRAFT">Draft</option>
                    </select>
                  </label>
                </div>}
              </div>
              <div ref={moreRef} style={S.relativeControl}>
                <button type="button" style={S.iconButton} title="More bill actions" onClick={toggleMore}><MoreHorizontal size={18} /></button>
                {moreMenuOpen && <div className="bill-more-menu" style={S.moreMenu}>
                  <button type="button" onClick={() => importInputRef.current?.click()}><Upload size={15} /> Import Bills</button>
                  <button type="button" onClick={() => { setSortMode((mode) => mode === "NEWEST" ? "OLDEST" : mode === "OLDEST" ? "AMOUNT_HIGH" : mode === "AMOUNT_HIGH" ? "AMOUNT_LOW" : "NEWEST"); setMoreMenuOpen(false); }}>
                    <Filter size={15} /> Sort: {sortLabel(sortMode)}
                  </button>
                  <button type="button" onClick={exportBills}><Download size={15} /> Export Bills</button>
                </div>}
              </div>
              <button type="button" onClick={startNewBill} style={S.primaryButton}><CirclePlus size={16} /> New Bill</button>
              <input ref={importInputRef} type="file" accept=".csv" hidden onChange={importBills} />
            </div>
          </header>

          <div className="bill-financial-summary" style={S.financialSummary}>
            <div style={S.financialMetric}><span>Paid Bills</span><strong>{formatMoney(paidValue)}</strong><small>{paidBills.length} bill{paidBills.length === 1 ? "" : "s"}</small></div>
            <div style={S.financialMetric}><span>Balance Due</span><strong>{formatMoney(balanceValue)}</strong><small>{balanceBills.length} unpaid bill{balanceBills.length === 1 ? "" : "s"}</small></div>
          </div>

          {(searchOpen || statusFilter !== "ALL") && <div style={S.listTools}>
            {searchOpen && <div className="bill-list-search" style={S.listSearch}><Search size={16} /><input autoFocus value={billSearch}
              onChange={(event) => setBillSearch(event.target.value)} placeholder="Search bill number, vendor or status" /><button type="button" onClick={() => { setBillSearch(""); setSearchOpen(false); }}><X size={14} /></button></div>}
            <span style={S.resultCount}>{visiblePurchases.length} result{visiblePurchases.length === 1 ? "" : "s"}</span>
          </div>}
          {message && <div style={message.type === "error" ? S.error : S.success}>{message.text}</div>}

          <div style={S.billTableWrap}>
            <table className="bills-register-table" style={S.billTable}>
              <thead><tr>
                <th style={S.listTh}>Date</th><th style={S.listTh}>Bill Number</th>
                <th style={S.listTh}>Vendor Name</th><th style={S.listTh}>Status</th>
                <th style={S.listTh}>Due Date</th><th style={{ ...S.listTh, textAlign: "right" }}>Amount</th>
                <th style={{ ...S.listTh, textAlign: "right" }}>Balance Due</th>
              </tr></thead>
              <tbody>
                {!storeId ? <tr><td colSpan="7" style={S.emptyBills}>Select a store to view bills.</td></tr>
                  : visiblePurchases.length === 0 ? <tr><td colSpan="7" style={S.emptyBills}>No bills found.</td></tr>
                  : visiblePurchases.map((bill) => <tr key={bill.receiptId} onClick={() => viewBill(bill.receiptId)} style={S.clickableRow}>
                    <td style={S.listTd}>{formatDate(bill.invoiceDate)}</td>
                    <td style={S.listTd}><button type="button" style={S.billLink} onClick={(event) => { event.stopPropagation(); viewBill(bill.receiptId); }}>{bill.vendorInvoiceNumber}</button></td>
                    <td style={S.listTd}>{bill.vendorName || "—"}</td>
                    <td style={S.listTd}><span style={statusStyle(displayBillStatus(bill))}>{displayBillStatus(bill)}</span></td>
                    <td style={S.listTd}>{formatDate(bill.dueDate || bill.invoiceDate)}</td>
                    <td style={{ ...S.listTd, textAlign: "right" }}>{formatMoney(bill.totalAmount)}</td>
                    <td style={{ ...S.listTd, textAlign: "right" }}>{formatMoney(bill.balanceDue)}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {screen === "detail" && selectedBill && (
        <VendorPurchaseInvoiceView
          bill={selectedBill}
          onBack={() => setScreen("list")}
          onEdit={beginEdit}
          onPrint={() => window.print()}
          onOpenDraft={openDraft}
          saving={saving}
        />
      )}

      {screen === "editor" ? <>
        <div className="vendor-bill-editor" style={S.editorPage}>
          <header style={S.editorHeader}>
            <div style={S.editorHeaderLeft}>
              <button
                type="button"
                onClick={() => setScreen(editingBillId ? "detail" : "list")}
                style={S.backButton}
                aria-label="Back to bills"
              >
                <ArrowLeft size={18} />
              </button>

              <div>
                <div style={S.breadcrumb}>
                  <span>Purchases</span>
                  <span style={S.breadcrumbChevron}>›</span>
                  <span>Bills</span>
                </div>
                <h1 style={S.editorPageTitle}>
                  {editingBillId ? "Edit Bill" : "New Bill"}
                </h1>
              </div>
            </div>

            <div style={S.editorHeaderRight}>
              <p style={S.editorHeaderHint}>
                {editingBillId
                  ? "Update the bill and provide a reason for the change."
                  : "Enter the vendor invoice and received item details."}
              </p>

              {isSuperAdmin && (
                <select
                  value={storeId}
                  onFocus={loadStores}
                  onChange={(event) => setStoreId(event.target.value)}
                  style={S.headerStoreSelect}
                  aria-label="Store"
                >
                  <option value="">Select store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.storeName}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => setScreen(editingBillId ? "detail" : "list")}
                style={S.cancelButton}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving || !storeId}
                onClick={() =>
                  editingBillId
                    ? savePurchase(selectedBill?.status || "OPEN")
                    : savePurchase("OPEN")
                }
                style={{
                  ...S.primaryButton,
                  opacity: saving || !storeId ? 0.55 : 1,
                  cursor: saving || !storeId ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : editingBillId ? "Save Changes" : "Save Bill"}
              </button>
            </div>
          </header>

          <main style={S.editorCanvas}>
            <div style={S.editorContent}>
              <section style={S.formCard}>
                <div style={S.formGridThree}>
                  <label style={S.metaField}>
                    <span style={S.fieldLabel}>
                      Vendor Name <span style={S.requiredStar}>*</span>
                    </span>
                    <select
                      value={vendorId}
                      onChange={(event) => handleVendorChange(event.target.value)}
                      style={S.metaInput}
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.vendorName}
                        </option>
                      ))}
                      <option value="__add_vendor__">+ Add New Vendor</option>
                    </select>
                  </label>

                  <label style={S.metaField}>
                    <span style={S.fieldLabel}>
                      Bill Number <span style={S.requiredStar}>*</span>
                    </span>
                    <input
                      style={S.metaInput}
                      value={invoiceNumber}
                      onChange={(event) => setInvoiceNumber(event.target.value)}
                      placeholder="e.g. INV-1023"
                    />
                  </label>

                  <label style={S.metaField}>
                    <span style={S.fieldLabel}>
                      Bill Date <span style={S.requiredStar}>*</span>
                    </span>
                    <input
                      type="date"
                      style={S.metaInput}
                      value={invoiceDate}
                      onChange={(event) => setInvoiceDate(event.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section style={S.formCard}>
                <div style={S.formGridFour}>
                  <label style={S.metaField}>
                    <span style={S.fieldLabel}>
                      Due Date <span style={S.requiredStar}>*</span>
                    </span>
                    <input
                      type="date"
                      style={S.metaInput}
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  </label>

                  <label style={S.metaField}>
                    <span style={S.fieldLabel}>
                      Payment Status <span style={S.requiredStar}>*</span>
                    </span>
                    <select
                      style={S.metaInput}
                      value={paymentStatus}
                      onChange={(event) => setPaymentStatus(event.target.value)}
                    >
                      <option value="PAID">Paid</option>
                      <option value="UNPAID">Unpaid</option>
                    </select>
                  </label>

                  {paymentStatus === "PAID" && (
                    <label style={S.metaField}>
                      <span style={S.fieldLabel}>
                        Payment Method <span style={S.requiredStar}>*</span>
                      </span>
                      <select
                        style={S.metaInput}
                        value={paymentMethod}
                        onChange={(event) => setPaymentMethod(event.target.value)}
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
                  )}

                  <label style={S.metaField}>
                    <span style={S.fieldLabel}>Payment Reference</span>
                    <input
                      style={S.metaInput}
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder="Optional"
                    />
                  </label>

                  <label style={S.metaField}>
                    <span style={S.fieldLabel}>Remarks</span>
                    <input
                      style={S.metaInput}
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                </div>

                {editingBillId && (
                  <div style={S.fullWidthField}>
                    <label style={S.metaField}>
                      <span style={S.fieldLabel}>
                        Reason for Editing <span style={S.requiredStar}>*</span>
                      </span>
                      <input
                        style={S.metaInput}
                        value={editReason}
                        onChange={(event) => setEditReason(event.target.value)}
                        placeholder="Explain why this saved bill is being changed"
                      />
                    </label>
                  </div>
                )}
              </section>

              {message && (
                <div style={message.type === "error" ? S.error : S.success}>
                  {message.text}
                </div>
              )}

              <section style={S.taxCard}>
                <h3 style={S.taxTitle}>Tax settings</h3>

                <div style={S.taxControls}>
                  <label style={S.taxField}>
                    <span>Price type</span>
                    <select
                      value={priceMode}
                      onChange={(event) => applyPriceSettings(
                        event.target.value,
                        gstPercentage
                      )}
                      style={S.settingSelect}
                    >
                      <option value="GST_INCLUSIVE">GST Inclusive</option>
                      <option value="GST_EXCLUSIVE">GST Exclusive</option>
                    </select>
                  </label>

                  <label style={S.taxField}>
                    <span>Tax type</span>
                    <select
                      value={gstMode}
                      onChange={(event) => setGstMode(event.target.value)}
                      style={S.settingSelect}
                    >
                      <option value="CGST_SGST">CGST + SGST</option>
                      <option value="IGST">IGST</option>
                    </select>
                  </label>

                  <label style={S.taxField}>
                    <span>GST %</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={gstPercentage}
                      onChange={(event) => applyPriceSettings(
                        priceMode,
                        event.target.value
                      )}
                      onWheel={(event) => event.currentTarget.blur()}
                      style={S.gstStandaloneInput}
                    />
                  </label>
                </div>
              </section>

              <section style={S.itemsCard}>
                <div style={S.itemsHeading}>
                  <div>
                    <strong style={S.itemsTitle}>Item details</strong>
                    <span style={S.itemsSubtitle}>
                      Search an existing part or enter a new item.
                    </span>
                  </div>
                  <span style={S.itemsCount}>
                    {enteredRows.length} item row{enteredRows.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="manual-stock-table-scroll" style={S.tableWrap}>
                  <table className="vendor-items-table" style={S.table}>
                    <colgroup>
                      <col style={{ width: 32 }} />
                      <col style={{ width: 110 }} />
                      <col style={{ width: 130 }} />
                      <col style={{ width: 90 }} />
                      <col style={{ width: 65 }} />
                      <col style={{ width: 58 }} />
                      <col style={{ width: 105 }} />
                      <col style={{ width: 92 }} />
                      <col style={{ width: 105 }} />
                      <col style={{ width: 88 }} />
                      <col style={{ width: 78 }} />
                      <col style={{ width: 110 }} />
                      <col style={{ width: 38 }} />
                    </colgroup>

                    <thead>
                      <tr>
                        <th style={S.th}>#</th>
                        <th style={S.th}>Part Number</th>
                        <th style={S.th}>Item Name</th>
                        <th style={S.th}>Brand</th>
                        <th style={S.th}>HSN</th>
                        <th style={S.th}>Qty</th>
                        <th style={S.th}>Purchase Price</th>
                        <th style={S.th}>MRP</th>
                        <th style={S.th}>Selling Price</th>
                        <th style={S.th}>Discount %</th>
                        <th style={S.th}>Rack No.</th>
                        <th style={{ ...S.th, textAlign: "right" }}>Amount</th>
                        <th style={S.th}></th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={row.key}>
                          <td style={S.rowNumber}>{index + 1}</td>

                          <td style={S.td}>
                            <SuggestionInput
                              row={row}
                              field="partNumber"
                              placeholder="Part number"
                              inputRef={(element) => {
                                firstInputRefs.current[row.key] = element;
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

                          <td style={S.td}>
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

                          <CellInput
                            value={row.brandName}
                            placeholder="Brand"
                            onChange={(value) => updateRow(row.key, "brandName", value)}
                          />

                          <CellInput
                            value={row.hsnCode}
                            placeholder="Optional"
                            onChange={(value) => updateRow(row.key, "hsnCode", value)}
                          />

                          <CellInput
                            type="number"
                            value={row.quantity}
                            placeholder="0"
                            onChange={(value) => updateRow(row.key, "quantity", value)}
                            narrow
                            step="1"
                          />

                          <CellInput
                            type="number"
                            value={row.purchasePrice}
                            placeholder="0.00"
                            onChange={(value) => updatePriceRow(row.key, "purchasePrice", value)}
                            step="10"
                          />

                          <CellInput
                            type="number"
                            value={row.mrp}
                            placeholder="0.00"
                            onChange={(value) => updatePriceRow(row.key, "mrp", value)}
                            step="10"
                          />

                          <CellInput
                            type="number"
                            value={row.sellingPrice}
                            placeholder="0.00"
                            onChange={(value) => updatePriceRow(row.key, "sellingPrice", value)}
                            step="10"
                          />

                          <td style={{ ...S.td, minWidth: 0 }}>
                            <input
                              type="number"
                              min="0"
                              max="99.99"
                              step="0.01"
                              value={row.discountPercentage}
                              onChange={(event) => {
                                const raw = event.target.value;
                                if (raw === "") {
                                  updatePriceRow(row.key, "discountPercentage", "");
                                  return;
                                }
                                const clamped = Math.min(99.99, Math.max(0, Number(raw)));
                                const discountPercentage = Number.isNaN(clamped) ? 0 : clamped;
                                updatePriceRow(
                                  row.key,
                                  "discountPercentage",
                                  String(discountPercentage)
                                );
                              }}
                              onWheel={(event) => event.currentTarget.blur()}
                              placeholder="0"
                              style={S.cellInputNumeric}
                              title={`Discount amount: -${formatMoney(
                                computeRowAmounts(row).discountAmount
                              )}`}
                            />
                          </td>

                          <CellInput
                            value={row.rackNumber}
                            placeholder="Optional"
                            onChange={(value) => updateRow(row.key, "rackNumber", value)}
                          />

                          <td style={S.amountCell}>
                            {formatMoney(computeRowAmounts(row).lineTotal)}
                          </td>

                          <td style={S.td}>
                            <button
                              type="button"
                              onClick={() => removeRow(row.key)}
                              style={S.deleteButton}
                              title="Remove row"
                              aria-label={`Remove row ${index + 1}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button type="button" onClick={addRow} style={S.addRowFooter}>
                  <CirclePlus size={16} />
                  Add Row
                </button>
              </section>

              <section style={S.summaryFooter}>
                <div style={S.summaryCard}>
                  <div style={S.summaryRows}>
                    <div style={S.summaryRow}>
                      <span>Total Accepted Qty</span>
                      <strong>{purchaseSummary.acceptedQuantity}</strong>
                    </div>

                    <div style={S.summaryRow}>
                      <span>Taxable Amount</span>
                      <strong>{formatMoney(purchaseSummary.taxableAmount)}</strong>
                    </div>

                    {gstMode === "IGST" ? (
                      <div style={S.summaryRow}>
                        <span>IGST</span>
                        <strong>{formatMoney(purchaseSummary.igstAmount)}</strong>
                      </div>
                    ) : <>
                      <div style={S.summaryRow}>
                        <span>CGST</span>
                        <strong>{formatMoney(purchaseSummary.cgstAmount)}</strong>
                      </div>

                      <div style={S.summaryRow}>
                        <span>SGST</span>
                        <strong>{formatMoney(purchaseSummary.sgstAmount)}</strong>
                      </div>
                    </>}

                    <div style={S.summaryRow}>
                      <span>Total GST</span>
                      <strong>{formatMoney(purchaseSummary.totalGstAmount)}</strong>
                    </div>

                    <div style={S.summaryDivider}></div>

                    <div style={S.summaryRow}>
                      <span>Total Before Round Off</span>
                      <strong>{formatMoney(purchaseSummary.totalBeforeRoundOff)}</strong>
                    </div>

                    <div style={S.summaryRow}>
                      <span>Round Off</span>
                      <strong>{formatMoney(purchaseSummary.roundOffAmount)}</strong>
                    </div>

                    <div style={S.grandTotalRow}>
                      <span>Grand Total</span>
                      <strong>{formatMoney(purchaseSummary.totalAmount)}</strong>
                    </div>

                    <div style={S.summaryRow}>
                      <span>Balance Due</span>
                      <strong>{formatMoney(purchaseSummary.balanceDue)}</strong>
                    </div>
                  </div>

                  <div style={S.summaryActions}>
                    <button
                      type="button"
                      onClick={() => setScreen(editingBillId ? "detail" : "list")}
                      style={S.cancelButton}
                    >
                      Cancel
                    </button>

                    {editingBillId ? (
                      <button
                        type="button"
                        disabled={saving || !storeId}
                        onClick={() => savePurchase(selectedBill?.status || "OPEN")}
                        style={{
                          ...S.primaryButton,
                          opacity: saving || !storeId ? 0.55 : 1,
                          cursor: saving || !storeId ? "not-allowed" : "pointer",
                        }}
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={saving || !storeId}
                          onClick={() => savePurchase("DRAFT")}
                          style={{
                            ...S.secondarySaveButton,
                            opacity: saving || !storeId ? 0.55 : 1,
                            cursor: saving || !storeId ? "not-allowed" : "pointer",
                          }}
                        >
                          {saving ? "Saving..." : "Save as Draft"}
                        </button>

                        <button
                          type="button"
                          disabled={saving || !storeId}
                          onClick={() => savePurchase("OPEN")}
                          style={{
                            ...S.primaryButton,
                            opacity: saving || !storeId ? 0.55 : 1,
                            cursor: saving || !storeId ? "not-allowed" : "pointer",
                          }}
                        >
                          <PackageCheck size={16} />
                          {saving ? "Saving..." : "Receive Stock"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </> : null}

      {vendorModalOpen && <div style={S.modalBackdrop} role="presentation" onMouseDown={closeVendorModal}>
        <div style={S.vendorModal} role="dialog" aria-modal="true" aria-label="Add vendor" onMouseDown={(event) => event.stopPropagation()}>
          <div style={S.modalHeader}><div><h3 style={S.modalTitle}>Add Vendor</h3><p style={S.modalSubtitle}>This vendor will be available for the selected store.</p></div><button type="button" style={S.closeButton} onClick={closeVendorModal}><X size={18} /></button></div>

          {vendorModalMessage && <div style={{ ...S.vendorModalMessage, ...(vendorModalMessage.type === "error" ? S.error : S.success) }}>{vendorModalMessage.text}</div>}

          <div style={S.vendorFormGrid}>
            {isSuperAdmin && (
              <label style={{ ...S.metaField, gridColumn: "1 / -1" }}>
                <span style={S.requiredLabel}>Store *</span>
                <select style={S.metaInput} value={vendorModalStoreId} onFocus={loadStores} onChange={(event) => setVendorModalStoreId(event.target.value)}>
                   <option value="">Select Store</option>
                  {stores.map((store) => <option key={store.id} value={store.id}>{store.storeName}</option>)}
                </select>
              </label>
            )}
            <label style={S.metaField}><span style={S.requiredLabel}>Vendor Name *</span><input autoFocus style={S.metaInput} value={vendorForm.vendorName} onChange={(event) => setVendorForm({ ...vendorForm, vendorName: event.target.value })} /></label>
            <label style={S.metaField}><span style={S.requiredLabel}>Phone *</span><input style={S.metaInput} maxLength="10" value={vendorForm.phone} onChange={(event) => setVendorForm({ ...vendorForm, phone: event.target.value.replace(/\D/g, "") })} /></label>
            <label style={S.metaField}><span>Contact Person</span><input style={S.metaInput} value={vendorForm.contactPerson} onChange={(event) => setVendorForm({ ...vendorForm, contactPerson: event.target.value })} /></label>
            <label style={S.metaField}><span>Email</span><input type="email" style={S.metaInput} value={vendorForm.email} onChange={(event) => setVendorForm({ ...vendorForm, email: event.target.value })} /></label>
            <label style={S.metaField}><span>GST Number</span><input style={S.metaInput} maxLength="15" value={vendorForm.gstNumber} onChange={(event) => setVendorForm({ ...vendorForm, gstNumber: event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15) })} /></label>
            <label style={S.metaField}><span>State</span><input style={S.metaInput} value={vendorForm.state} onChange={(event) => setVendorForm({ ...vendorForm, state: event.target.value })} /></label>
            <label style={S.metaField}><span>Pincode</span><input style={S.metaInput} maxLength="6" value={vendorForm.pincode} onChange={(event) => setVendorForm({ ...vendorForm, pincode: event.target.value.replace(/\D/g, "") })} /></label>
            <label style={{ ...S.metaField, gridColumn: "1 / -1" }}><span>Address</span><textarea style={S.metaTextarea} value={vendorForm.address} onChange={(event) => setVendorForm({ ...vendorForm, address: event.target.value })} /></label>
          </div>
          <div style={S.modalActions}><button type="button" style={S.cancelButton} onClick={closeVendorModal} disabled={vendorSaving}>Cancel</button><button type="button" style={S.primaryButton} onClick={createVendor} disabled={vendorSaving}>{vendorSaving ? "Saving..." : "Save Vendor"}</button></div>
        </div>
      </div>}
    </section>
  );
}

export default function VendorPurchasesSection() {
  return <ManualStockReceipt />;
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
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function displayBillStatus(bill) {
  return bill?.status === "DRAFT" ? "DRAFT" : (bill?.paymentStatus || "UNPAID");
}

function statusStyle(status) {
  if (status === "PAID") return S.paidStatus;
  if (status === "DRAFT") return S.draftStatus;
  return S.unpaidStatus;
}

function sortLabel(mode) {
  return { NEWEST: "Newest", OLDEST: "Oldest", AMOUNT_HIGH: "Amount high", AMOUNT_LOW: "Amount low" }[mode];
}

function csvValue(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index++;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(value.trim()); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index++;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; value = "";
    } else value += character;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeImportDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = value.split(/[/-]/);
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  throw new Error(`Invalid date '${value}'. Use YYYY-MM-DD or DD/MM/YYYY.`);
}

function parseBillCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("The import file has no bill rows");
  const headers = rows[0].map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const get = (row, names) => {
    const index = names.map((name) => headers.indexOf(name)).find((position) => position >= 0);
    return index === undefined ? "" : String(row[index] || "").trim();
  };
  const bills = new Map();
  rows.slice(1).forEach((row, index) => {
    const invoiceNumber = get(row, ["billnumber", "invoicenumber", "vendorinvoicenumber"]);
    const vendorName = get(row, ["vendorname", "vendor"]);
    const partNumber = get(row, ["partnumber", "partno"]);
    if (!invoiceNumber || !vendorName || !partNumber) throw new Error(`Row ${index + 2}: Bill Number, Vendor Name and Part Number are required`);
    const key = `${vendorName.toLowerCase()}|${invoiceNumber.toLowerCase()}`;
    if (!bills.has(key)) {
      const invoiceDate = normalizeImportDate(get(row, ["billdate", "invoicedate"]));
      bills.set(key, {
        invoiceNumber, vendorName, invoiceDate,
        dueDate: get(row, ["duedate"]) ? normalizeImportDate(get(row, ["duedate"])) : invoiceDate,
        paymentStatus: (get(row, ["paymentstatus"]) || "UNPAID").toUpperCase(),
        paymentMethod: (get(row, ["paymentmethod"]) || "CASH").toUpperCase(),
        status: (get(row, ["status"]) || "OPEN").toUpperCase(),
        remarks: get(row, ["remarks", "notes"]), items: [],
      });
    }
    const quantity = Number(get(row, ["quantity", "qty"]));
    const purchasePrice = Number(get(row, ["purchaseprice", "rate"]));
    const mrp = Number(get(row, ["mrp"]));
    const sellingPrice = Number(get(row, ["sellingprice"]));
    const discountRaw = get(row, ["discount", "discountpercentage", "discountpercent", "discount%"]);
    const discountPercentage = discountRaw === "" ? 0 : Number(discountRaw);
    if (!(quantity > 0) || purchasePrice < 0 || !(mrp > 0) || !(sellingPrice > 0)) throw new Error(`Row ${index + 2}: Quantity, Purchase Price, MRP and Selling Price are invalid`);
    if (Number.isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage >= 101) throw new Error(`Row ${index + 2}: Discount % must be between 0 and 100`);
    bills.get(key).items.push({
      partNumber, itemName: get(row, ["itemname", "item"]), brandName: get(row, ["brand", "brandname"]),
      hsnCode: get(row, ["hsn", "hsncode"]) || null, receivedQuantity: quantity,
      damagedQuantity: 0, rejectedQuantity: 0, purchasePrice, mrp, sellingPrice, discountPercentage,
      gstPercentage: Number(get(row, ["gst", "gstpercentage"]) || 0), rackNumber: get(row, ["rack", "racknumber"]) || null,
    });
  });
  return [...bills.values()];
}

function CellInput({
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  narrow = false,
  step
}) {
  const resolvedStep = type === "number" ? (step ?? "0.01") : undefined;
  const baseStyle = type === "number" ? S.cellInputNumeric : S.cellInput;

  return (
    <td style={S.td}>
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={resolvedStep}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        style={{
          ...baseStyle,
          ...(narrow ? S.narrowInput : {})
        }}
      />
    </td>
  );
}

function SuggestionInput({ row, field, placeholder, suggestions, onChange, onSelect, inputRef }) {
  return (
    <div style={S.suggestionWrap}>
      <div className="suggestion-input-shell" style={S.suggestionInput}>
        <Search size={13} color="#64748B" />
        <input ref={inputRef} value={row[field]}
          onChange={(event) => onChange(row, field, event.target.value)}
          placeholder={placeholder} style={S.inputBare} />
      </div>
      {field === "partNumber" && row.availableStock !== null && (
        <span style={S.availableStock}>Available: {row.availableStock}</span>
      )}
      {suggestions.length > 0 && (
        <div className="manual-stock-suggestions" style={S.suggestionMenu}>
          {suggestions.slice(0, 8).map((product) => (
            <button type="button"
              key={`${product.productId || "L"}-${product.localProductId || product.partNumber}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(row.key, product)}
              style={S.suggestionOption}>
              <strong>{product.itemName}</strong>
              <span>{product.partNumber} | {product.brandName || "No brand"} | Stock: {product.availableStock ?? 0}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const S = {
  editorPage: {
    minHeight: "calc(100vh - 28px)",
    background: "#F8FAFC",
    color: "#191C1E",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  },
  editorHeader: {
    minHeight: 64,
    padding: "0 24px",
    borderBottom: "1px solid #C3C6D7",
    background: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    boxSizing: "border-box",
    position: "sticky",
    top: 0,
    zIndex: 40,
  },
  editorHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minWidth: 0,
  },
  editorHeaderRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    minWidth: 0,
  },
  editorHeaderHint: {
    margin: 0,
    color: "#434655",
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
    color: "#737686",
    fontSize: 11,
  },
  breadcrumbChevron: {
    color: "#A0A4B0",
    fontSize: 14,
    lineHeight: 1,
  },
  editorPageTitle: {
    margin: 0,
    color: "#191C1E",
    fontSize: 20,
    lineHeight: "26px",
    fontWeight: 600,
    letterSpacing: "-0.01em",
  },
  headerStoreSelect: {
    height: 36,
    minWidth: 160,
    padding: "0 10px",
    border: "1px solid #C3C6D7",
    borderRadius: 4,
    background: "#FFFFFF",
    color: "#191C1E",
    fontSize: 12,
  },
  editorCanvas: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
    boxSizing: "border-box",
  },
  editorContent: {
    width: "min(1200px, 100%)",
    margin: "0 auto",
    display: "grid",
    gap: 18,
  },
  formCard: {
    background: "#FFFFFF",
    border: "1px solid #C3C6D7",
    borderRadius: 6,
    padding: 24,
    boxShadow: "0 1px 3px rgba(15,23,42,.05)",
  },
  formGridThree: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 20,
  },
  formGridFour: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 18,
    marginBottom: 18,
  },
  fullWidthField: {
    width: "100%",
  },
  fieldLabel: {
    display: "block",
    marginBottom: 7,
    color: "#434655",
    fontSize: 11,
    lineHeight: "16px",
    fontWeight: 600,
  },
  requiredStar: {
    color: "#BA1A1A",
  },
  taxCard: {
    minHeight: 58,
    padding: "0 24px",
    background: "#FFFFFF",
    border: "1px solid #C3C6D7",
    borderRadius: 6,
    boxShadow: "0 1px 3px rgba(15,23,42,.04)",
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  taxTitle: {
    margin: 0,
    color: "#191C1E",
    fontSize: 16,
    lineHeight: "22px",
    fontWeight: 600,
  },
  taxControls: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  taxField: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#434655",
    fontSize: 11,
    fontWeight: 600,
  },
  itemsCard: {
    background: "#FFFFFF",
    border: "1px solid #C3C6D7",
    borderRadius: 6,
    boxShadow: "0 1px 3px rgba(15,23,42,.05)",
    overflow: "hidden",
  },
  itemsHeading: {
    minHeight: 62,
    padding: "0 16px",
    borderBottom: "1px solid #C3C6D7",
    background: "#F7F9FB",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    boxSizing: "border-box",
  },
  itemsTitle: {
    display: "block",
    color: "#191C1E",
    fontSize: 16,
    lineHeight: "22px",
    fontWeight: 600,
  },
  itemsSubtitle: {
    display: "block",
    marginTop: 2,
    color: "#737686",
    fontSize: 11,
  },
  itemsCount: {
    color: "#737686",
    fontSize: 11,
    whiteSpace: "nowrap",
  },
  summaryFooter: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "4px 0 28px",
  },
  summaryCard: {
    width: "min(440px, 100%)",
    background: "#FFFFFF",
    border: "1px solid #C3C6D7",
    borderRadius: 6,
    padding: 20,
    boxShadow: "0 1px 3px rgba(15,23,42,.05)",
  },
  summaryRows: {
    display: "grid",
    gap: 9,
    marginBottom: 20,
  },
  summaryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    color: "#434655",
    fontSize: 12,
  },
  summaryRowStrong: {
    color: "#191C1E",
    fontWeight: 600,
  },
  summaryDivider: {
    height: 1,
    width: "100%",
    background: "#C3C6D7",
    margin: "3px 0",
  },
  grandTotalRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    padding: "11px 0",
    borderTop: "1px solid #C3C6D7",
    borderBottom: "1px solid #C3C6D7",
    color: "#191C1E",
    fontSize: 16,
    lineHeight: "22px",
    fontWeight: 600,
  },
  summaryActions: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  secondarySaveButton: {
    height: 38,
    padding: "0 14px",
    border: "1px solid #C3C6D7",
    borderRadius: 4,
    background: "#FFFFFF",
    color: "#434655",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },


  modeSwitch: { width: "fit-content", display: "flex", gap: 3, padding: 3, border: "1px solid #CBD5E1", borderRadius: 6, background: "#F1F5F9" },
  modeButton: { height: 32, padding: "0 14px", border: 0, borderRadius: 4, background: "transparent", color: "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  modeButtonActive: { background: "#FFFFFF", color: "#1D4ED8", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.12)" },
  page: { minHeight: "calc(100vh - 28px)", display: "block", background: "#FFFFFF", color: "#1F2937" },
  toolbar: { minHeight: 68, padding: "0 28px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, boxSizing: "border-box" },
  editorTitleGroup: { display: "flex", alignItems: "center", gap: 12 },
  backButton: { width: 34, height: 34, border: "1px solid #D7DCE5", borderRadius: 4, background: "#FFFFFF", color: "#4B5563", display: "grid", placeItems: "center", cursor: "pointer" },
  title: { margin: 0, fontSize: 20, lineHeight: 1.2, fontWeight: 600, color: "#111827" },
  subtitle: { margin: "3px 0 0", color: "#6B7280", fontSize: 12, fontWeight: 400 },
  toolbarActions: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  purchaseMeta: { display: "grid", gridTemplateColumns: "repeat(4, minmax(150px, 1fr))", gap: "18px 24px", padding: "24px 28px 26px", borderBottom: "1px solid #E5E7EB", background: "#FFFFFF" },
  metaField: { minWidth: 0, display: "grid", alignContent: "start", gap: 7, color: "#374151", fontSize: 12, fontWeight: 400 },
  requiredLabel: { color: "#DC2626", fontWeight: 400 },
  metaInput: { width: "100%", height: 38, padding: "0 10px", border: "1px solid #C9CED8", borderRadius: 3, background: "#FFF", boxSizing: "border-box", color: "#111827", fontSize: 13, fontWeight: 400 },
  metaTextarea: { width: "100%", minHeight: 68, padding: 10, border: "1px solid #C9CED8", borderRadius: 3, background: "#FFF", boxSizing: "border-box", resize: "vertical", fontSize: 13, fontWeight: 400 },
  vendorPicker: { display: "block" },
  addVendorButton: { height: 38, padding: "0 12px", border: "1px solid #9AB8F7", borderRadius: 3, background: "#FFFFFF", color: "#2563EB", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" },
  storeSelect: { height: 38, minWidth: 190, border: "1px solid #C9CED8", borderRadius: 3, padding: "0 10px", background: "#FFF", color: "#374151", fontSize: 12 },
  storeBadge: { height: 36, padding: "0 11px", display: "flex", alignItems: "center", border: "1px solid #D7DCE5", borderRadius: 3, background: "#FFF", color: "#4B5563", fontSize: 12, fontWeight: 400 },
  settingSelect: { height: 38, minWidth: 116, padding: "0 9px", border: "1px solid #C9CED8", borderRadius: 3, background: "#FFF", color: "#374151", fontSize: 12 },
  gstInput: { height: 38, padding: "0 7px 0 10px", border: "1px solid #C9CED8", borderRadius: 3, background: "#FFF", color: "#4B5563", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 400 },
  gstNumber: { width: 45, border: 0, outline: 0, font: "inherit" },
  primaryButton: { height: 38, padding: "0 15px", border: 0, borderRadius: 4, background: "#2563EB", color: "#FFF", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  secondaryButton: { height: 38, padding: "0 12px", border: "1px solid #BFDBFE", borderRadius: 5, background: "#EFF6FF", color: "#1D4ED8", display: "flex", alignItems: "center", gap: 7, fontWeight: 700, cursor: "pointer" },
  error: { margin: "14px 28px 0", padding: "10px 12px", borderLeft: "3px solid #DC2626", background: "#FEF2F2", color: "#B91C1C", fontSize: 12.5 },
  success: { margin: "14px 28px 0", padding: "10px 12px", borderLeft: "3px solid #16A34A", background: "#F0FDF4", color: "#15803D", fontSize: 12.5 },
  gstSettingsBar: { minHeight: 58, padding: "0 28px", display: "flex", alignItems: "center", gap: 20, borderBottom: "1px solid #E5E7EB", color: "#4B5563", fontSize: 12 },
  gstStandaloneInput: { width: 72, height: 34, marginLeft: 7, padding: "0 8px", border: "1px solid #C9CED8", borderRadius: 3 },
  tableWrap: { overflowX: "auto", overflowY: "visible", position: "relative", zIndex: 3, minHeight: "250px", borderBottom: "1px solid #C3C6D7", background: "#FFF" },
  table: { width: "100%", minWidth: 1060, tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0, fontSize: 12 },
  th: { position: "sticky", top: 0, zIndex: 2, height: 40, padding: "0 8px", borderBottom: "1px solid #202224", background: "#333333", color: "#FFFFFF", textAlign: "left", fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", whiteSpace: "nowrap" },
  td: { padding: 5, borderBottom: "1px solid #E5E7EB", verticalAlign: "top" },
  rowNumber: { padding: "13px 8px", borderBottom: "1px solid #F1F5F9", color: "#64748B", textAlign: "center" },
  acceptedCell: { padding: "14px 5px", borderBottom: "1px solid #EEF0F3", color: "#15803D", textAlign: "center", fontWeight: 600 },
  amountCell: { padding: "14px 7px", borderBottom: "1px solid #EEF0F3", color: "#111827", textAlign: "right", fontWeight: 500, whiteSpace: "nowrap" },
  cellInput: { width: "100%", height: 30, padding: "0 7px", border: "1px solid #D3D7DE", borderRadius: 3, boxSizing: "border-box", fontSize: 11.5, fontWeight: 400 },
  cellInputNumeric: { width: "100%", height: 30, padding: "0 7px", border: "1px solid #D3D7DE", borderRadius: 3, boxSizing: "border-box", fontSize: 11.5, fontWeight: 400, textAlign: "right" },
  discountAmountTag: { display: "block", marginTop: 3, color: "#B45309", fontSize: 9.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  narrowInput: { width: "100%" },
  suggestionWrap: { position: "relative", width: "100%" },
  suggestionInput: { width: "100%", height: 30, padding: "0 7px", border: "1px solid #D3D7DE", borderRadius: 3, display: "flex", alignItems: "center", gap: 4, boxSizing: "border-box" },
  inputBare: { width: "100%", minWidth: 0, border: 0, outline: 0, font: "inherit", fontSize: 11.5 },
  suggestionMenu: { position: "absolute", zIndex: 100, top: 37, left: 0, width: 260, maxHeight: 240, overflowY: "auto", padding: 4, border: "1px solid #CBD5E1", borderRadius: 5, background: "#FFF", boxShadow: "0 12px 28px rgba(15,23,42,.16)" },
  suggestionOption: { width: "100%", padding: "8px 9px", border: 0, borderBottom: "1px solid #F1F5F9", background: "#FFF", display: "grid", gap: 3, textAlign: "left", color: "#0F172A", fontSize: 11.5, cursor: "pointer" },
  availableStock: { display: "block", marginTop: 3, color: "#15803D", fontSize: 9.5, fontWeight: 700 },
  cellSelect: { width: 116, height: 34, border: "1px solid #CBD5E1", borderRadius: 4, background: "#FFF", fontSize: 11 },
  priceCell: { padding: "15px 8px", borderBottom: "1px solid #F1F5F9", color: "#0F766E", fontWeight: 800, whiteSpace: "nowrap" },
  lookupText: { display: "block", minHeight: 14, marginTop: 3, color: "#64748B", fontSize: 9.5 },
  found: { display: "block", minHeight: 14, marginTop: 3, color: "#15803D", fontSize: 9.5, fontWeight: 700 },
  newPart: { display: "block", minHeight: 14, marginTop: 3, color: "#B45309", fontSize: 9.5, fontWeight: 700 },
  deleteButton: { width: 32, height: 32, border: "1px solid #E5E7EB", borderRadius: 3, background: "#FFFFFF", color: "#B45353", display: "grid", placeItems: "center", cursor: "pointer" },
  addRowFooter: { margin: "12px 28px", height: 34, padding: "0 11px", border: "1px solid #A9BEEB", borderRadius: 3, background: "#FFFFFF", color: "#3568D4", display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 500, cursor: "pointer" },
  billFooter: { minHeight: 78, padding: "14px 28px", borderTop: "1px solid #E5E7EB", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20, background: "#FAFBFC", boxSizing: "border-box" },
  billTotalsCard: { border: "1px solid #E5E7EB", borderRadius: 5, background: "#FFFFFF", overflow: "hidden" },
  billTotalsTable: { borderCollapse: "collapse", fontSize: 12 },
  billTotalsLabel: { padding: "6px 16px", color: "#6B7280", textAlign: "left", whiteSpace: "nowrap" },
  billTotalsValue: { padding: "6px 16px", color: "#111827", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" },
  billTotalsLabelNet: { padding: "8px 16px", borderTop: "1px solid #E5E7EB", background: "#F0FDF4", color: "#15803D", fontWeight: 700, textAlign: "left", whiteSpace: "nowrap" },
  billTotalsValueNet: { padding: "8px 16px", borderTop: "1px solid #E5E7EB", background: "#F0FDF4", color: "#15803D", fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" },
  footerActions: { display: "flex", alignItems: "center", gap: 8 },
  listPage: { minHeight: "calc(100vh - 28px)", background: "#FFFFFF" },
  listHeader: { minHeight: 70, padding: "0 28px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, boxSizing: "border-box" },
  listHeaderActions: { display: "flex", alignItems: "center", gap: 10 },
  iconButton: { width: 38, height: 38, border: "1px solid #D5DAE2", borderRadius: 3, background: "#FFFFFF", color: "#4B5563", display: "grid", placeItems: "center", cursor: "pointer" },
  storeFilterSelect: { height: 38, minWidth: 170, padding: "0 10px", border: "1px solid #D5DAE2", borderRadius: 3, background: "#FFFFFF", color: "#374151" },
  relativeControl: { position: "relative" },
  filterMenu: { position: "absolute", zIndex: 50, top: 44, right: 0, width: 220, padding: 12, border: "1px solid #D8DDE6", borderRadius: 4, background: "#FFFFFF", boxShadow: "0 10px 28px rgba(15,23,42,.14)", display: "grid", gap: 12 },
  filterLabel: { display: "grid", gap: 6, color: "#4B5563", fontSize: 11.5 },
  filterSelect: { width: "100%", height: 34, border: "1px solid #C9CED8", borderRadius: 3, background: "#FFFFFF", padding: "0 8px", color: "#374151" },
  moreMenu: { position: "absolute", zIndex: 50, top: 44, right: 0, width: 190, padding: "5px 0", border: "1px solid #D8DDE6", borderRadius: 4, background: "#FFFFFF", boxShadow: "0 10px 28px rgba(15,23,42,.14)", overflow: "hidden" },
  pageTitle: { margin: 0, color: "#111827", fontSize: 20, fontWeight: 600 },
  pageSubtitle: { margin: "3px 0 0", color: "#6B7280", fontSize: 12, fontWeight: 400 },
  financialSummary: { minHeight: 92, margin: "0 28px", display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", alignItems: "center", borderBottom: "1px solid #E5E7EB" },
  financialMetric: { minHeight: 55, padding: "0 26px", borderRight: "1px solid #E5E7EB", display: "grid", alignContent: "center", color: "#6B7280", fontSize: 12 },
  summaryStrip: { minHeight: 94, margin: "0 28px", display: "grid", gridTemplateColumns: "1.5fr repeat(3, 1fr)", alignItems: "center", borderBottom: "1px solid #E5E7EB", background: "#FFFFFF" },
  summaryLead: { minHeight: 54, display: "flex", alignItems: "center", gap: 12, paddingRight: 24, borderRight: "1px solid #E5E7EB", color: "#6B7280", fontSize: 12 },
  summaryIcon: { width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center", color: "#A36117", background: "#FBE7C2" },
  summaryMetric: { minHeight: 54, padding: "0 22px", borderRight: "1px solid #E5E7EB", display: "grid", alignContent: "center", gap: 7, color: "#6B7280", fontSize: 12 },
  listTools: { minHeight: 62, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottom: "1px solid #E5E7EB" },
  listSearch: { width: "min(380px, 55vw)", height: 36, padding: "0 10px", border: "1px solid #D3D7DE", borderRadius: 3, display: "flex", alignItems: "center", gap: 8, color: "#7B8492", boxSizing: "border-box" },
  resultCount: { color: "#7B8492", fontSize: 12 },
  billTableWrap: { overflowX: "auto", background: "#FFFFFF" },
  billTable: { width: "100%", minWidth: 900, borderCollapse: "collapse", color: "#273142", fontSize: 12.5 },
  listTh: { height: 38, padding: "0 14px", borderBottom: "1px solid #D9DDE5", background: "#F7F8FA", color: "#657184", textAlign: "left", fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".25px", whiteSpace: "nowrap" },
  listTd: { height: 58, padding: "8px 14px", borderBottom: "1px solid #E8EBF0", verticalAlign: "middle", fontWeight: 400 },
  clickableRow: { cursor: "pointer" },
  billLink: { padding: 0, border: 0, background: "transparent", color: "#3568D4", fontSize: 12.5, fontWeight: 500, cursor: "pointer" },
  billNumber: { display: "block", color: "#3367D6", fontWeight: 500 },
  receiptNumber: { display: "block", marginTop: 4, color: "#8A93A3", fontSize: 10.5 },
  openStatus: { display: "inline-flex", padding: "4px 8px", borderRadius: 10, background: "#E9F7EF", color: "#16834A", fontSize: 10.5, fontWeight: 500 },
  draftStatus: { display: "inline-flex", padding: "4px 8px", borderRadius: 10, background: "#FFF4DD", color: "#A15C00", fontSize: 10.5, fontWeight: 500 },
  paidStatus: { display: "inline-flex", padding: "4px 8px", borderRadius: 10, background: "#E9F7EF", color: "#16834A", fontSize: 10.5, fontWeight: 500 },
  unpaidStatus: { display: "inline-flex", padding: "4px 8px", borderRadius: 10, background: "#FDECEC", color: "#C23B3B", fontSize: 10.5, fontWeight: 500 },
  tableAction: { padding: 0, border: 0, background: "transparent", color: "#3568D4", fontSize: 12, fontWeight: 500, cursor: "pointer" },
  completedText: { color: "#7B8492", fontSize: 11.5 },
  emptyBills: { height: 180, padding: 20, color: "#7B8492", textAlign: "center" },
  detailPage: { minHeight: "calc(100vh - 28px)", paddingBottom: 40, background: "#F5F6F8" },
  detailHeader: { minHeight: 66, padding: "0 22px", borderBottom: "1px solid #E1E4E9", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 },
  detailEyebrow: { color: "#6B7280", fontSize: 10.5 },
  detailTitle: { margin: "2px 0 0", color: "#111827", fontSize: 18, fontWeight: 600 },
  detailActions: { display: "flex", alignItems: "center", gap: 8 },
  plainAction: { height: 36, padding: "0 12px", border: "1px solid #D5DAE2", borderRadius: 3, background: "#FFFFFF", color: "#374151", display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, cursor: "pointer" },
  invoiceSheet: { width: "min(900px, calc(100% - 56px))", minHeight: 620, margin: "28px auto", padding: "42px 48px", border: "1px solid #DEE2E8", background: "#FFFFFF", boxShadow: "0 3px 12px rgba(15,23,42,.08)", boxSizing: "border-box" },
  invoiceTop: { display: "flex", justifyContent: "space-between", gap: 35, color: "#4B5563", fontSize: 12 },
  businessName: { display: "block", marginBottom: 8, color: "#111827", fontSize: 15, fontWeight: 600 },
  invoiceIdentity: { display: "grid", justifyItems: "end", gap: 7 },
  invoiceParties: { marginTop: 52, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, color: "#4B5563", fontSize: 12 },
  invoiceLabel: { display: "block", marginBottom: 7, color: "#7B8492", fontSize: 10, fontWeight: 600 },
  invoiceDates: { display: "grid", gap: 9 },
  invoiceTable: { width: "100%", marginTop: 34, borderCollapse: "collapse", fontSize: 11.5 },
  invoiceTotal: { width: 290, margin: "22px 0 0 auto", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, color: "#374151", fontSize: 12 },
  invoiceNotes: { marginTop: 28, paddingTop: 16, borderTop: "1px solid #E5E7EB", display: "grid", gap: 6, color: "#6B7280", fontSize: 12 },
  auditNote: { marginTop: 18, padding: "10px 12px", borderLeft: "3px solid #D4A15C", background: "#FFF9ED", color: "#72521F", fontSize: 11.5 },
  modalBackdrop: { position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 20, background: "rgba(17,24,39,.34)" },
  vendorModal: { width: "min(680px, 96vw)", borderRadius: 5, background: "#FFF", boxShadow: "0 20px 55px rgba(15,23,42,.22)", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "18px 20px", borderBottom: "1px solid #E2E8F0" },
  modalTitle: { margin: 0, color: "#111827", fontSize: 18, fontWeight: 600 },
  modalSubtitle: { margin: "4px 0 0", color: "#64748B", fontSize: 12 },
  closeButton: { width: 32, height: 32, border: 0, borderRadius: 5, display: "grid", placeItems: "center", background: "#F1F5F9", color: "#475569", cursor: "pointer" },
  vendorModalMessage: { margin: "14px 20px 0", padding: "10px 12px", borderLeft: "3px solid #DC2626", borderRadius: 3, fontSize: 12.5 },
  vendorFormGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, padding: 20 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 8, padding: "13px 20px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC" },
  cancelButton: { height: 38, padding: "0 15px", border: "1px solid #C3C6D7", borderRadius: 4, background: "#FFFFFF", color: "#191C1E", fontSize: 12, fontWeight: 500, cursor: "pointer" },
};
