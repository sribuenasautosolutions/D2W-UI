import { useEffect, useRef, useState } from "react";
import {
  CirclePlus,
  Download,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";

import api from "../../../services/api";

const CHUNK_SIZE = 100;
const PRICE_FIELDS = ["purchasePrice", "sellingPrice", "mrp"];
const hasValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const editableFields = [
  ["partNumber", "Part Number"],
  ["itemName", "Item Name"],
  ["brandName", "Brand"],
  ["hsnCode", "HSN Code"],
  ["quantity", "Qty"],
  ["purchasePrice", "Purchase Price"],
  ["mrp", "MRP"],
  ["sellingPrice", "Selling Price"],
  ["gstPercentage", "GST %"],
  ["discountPercentage", "Discount %"],
  ["rackNumber", "Rack Number"],
];

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function errorMessage(error, fallback) {
  const body = error?.response?.data;
  return (
    body?.message ||
    body?.error ||
    (typeof body === "string" ? body : "") ||
    fallback
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function sourceRow(row) {
  const next = { ...row };
  const legacy = {
    MRP: "mrp",
    PURCHASE_PRICE: "purchasePrice",
    SELLING_PRICE: "sellingPrice",
  }[row.priceSource];
  const fields = Array.isArray(row.enteredPriceFields)
    ? row.enteredPriceFields
    : legacy
      ? [legacy]
      : PRICE_FIELDS.filter((field) => hasValue(row[field]));
  next.enteredPriceFields = [...fields];
  PRICE_FIELDS.forEach((field) => {
    if (!fields.includes(field)) next[field] = null;
  });
  return next;
}

function validatePriceSelection(row, errors) {
  row = sourceRow(row);
  const prices = [
    ["purchasePrice", "Purchase Price"],
    ["mrp", "MRP"],
    ["sellingPrice", "Selling Price"],
  ];
  let entered = 0;
  prices.forEach(([field, label]) => {
    const value = row[field];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      entered++;
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0)
        errors.push(`${label} must be greater than zero`);
    }
  });
  if (entered === 0)
    errors.push("Enter at least one price; missing prices are calculated");
}

function validateEditedRow(row) {
  const errors = [];
  const discount = Number(row.discountPercentage ?? 0);
  if (!Number.isFinite(discount) || discount < 0 || discount >= 100)
    errors.push("Discount must be 0 or greater and less than 100%");
  if (
    String(row.partNumber || "")
      .trim()
      .toUpperCase()
      .startsWith("SAMPLE-")
  ) {
    errors.push(
      "Template sample row must be replaced with a real product before import",
    );
  }
  if (!row.storeId) errors.push("Valid store is required");
  if (!String(row.partNumber || "").trim())
    errors.push("Part Number is required");
  if (!String(row.itemName || "").trim()) errors.push("Item Name is required");
  if (!String(row.brandName || "").trim()) errors.push("Brand is required");
  if (!String(row.hsnCode || "").trim()) errors.push("HSN Code is required");
  const quantity = Number(row.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0)
    errors.push("Quantity must be a whole number above zero");

  if (
    row.gstPercentage === null ||
    row.gstPercentage === undefined ||
    String(row.gstPercentage).trim() === ""
  ) {
    errors.push("GST Percentage is required");
  } else {
    const gst = Number(row.gstPercentage);
    if (!Number.isFinite(gst) || gst < 0 || gst > 100)
      errors.push("GST Percentage must be between 0 and 100");
  }
  if (row.hsnCode && !/^\d{4,8}$/.test(String(row.hsnCode).trim()))
    errors.push("HSN Code must contain 4 to 8 digits");
  if (row.rackNumber && String(row.rackNumber).trim().length > 80)
    errors.push("Rack Number cannot exceed 80 characters");
  validatePriceSelection(row, errors);
  return errors;
}

function recheckRows(rows) {
  const keys = new Map();
  return rows.map((source) => {
    if (source.status === "IMPORTED") {
      if (source.storeId && source.partNumber)
        keys.set(
          source.storeId + ":" + String(source.partNumber).trim().toUpperCase(),
          source.rowNumber,
        );
      return source;
    }
    const row = { ...source, sampleRow: false };
    const errors = validateEditedRow(row);
    const key = `${row.storeId || ""}:${String(row.partNumber || "")
      .trim()
      .toUpperCase()}`;
    if (row.storeId && row.partNumber && keys.has(key)) {
      errors.push("Duplicate store and part number in this file");
    } else if (row.storeId && row.partNumber) {
      keys.set(key, row.rowNumber);
    }
    let status = "VALID";
    if (errors.some((item) => item.startsWith("Duplicate")))
      status = "DUPLICATE_IN_FILE";
    else if (errors.length) status = "INVALID";
    return { ...row, errors, status };
  });
}

export default function BulkUploadSection({ onClose, hideTitle = false }) {
  const user = currentUser();
  const [allDiscount, setAllDiscount] = useState("");
  const workInProgress = useRef(false);
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(
    user.storeId ? String(user.storeId) : "",
  );
  const fixedStoreId = selectedStoreId || null;

  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [lastRejectedRows, setLastRejectedRows] = useState([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api
      .get("/stores", { params: { page: 0, size: 100, active: true } })
      .then(({ data }) =>
        setStores(Array.isArray(data?.content) ? data.content : []),
      )
      .catch(() => setError("Unable to load stores."));
  }, [isSuperAdmin]);

  const rows = preview?.rows || [];
  const visibleRows =
    filter === "ALL" ? rows : rows.filter((row) => row.status === filter);
  const validRows = rows.filter((row) => row.status === "VALID");
  const rejectedRows = rows.filter(
    (row) => !["VALID", "IMPORTED"].includes(row.status),
  );

  const refreshCounts = (nextRows) => {
    setPreview((current) => ({
      ...(current || {}),
      rows: nextRows,
      totalRows: nextRows.length,
      validRows: nextRows.filter((row) => row.status === "VALID").length,
      invalidRows: nextRows.filter(
        (row) => !["VALID", "IMPORTED"].includes(row.status),
      ).length,
      duplicateRows: nextRows.filter(
        (row) => row.status === "DUPLICATE_IN_FILE",
      ).length,
    }));
  };

  const previewFile = async () => {
    if (workInProgress.current) return;
    if (!file) {
      setError("Choose a CSV, XLS, or XLSX file first.");
      return;
    }
    if (!fixedStoreId) {
      setError("Select the store that will receive this opening stock.");
      return;
    }
    workInProgress.current = true;
    setBusy(true);
    setError("");
    setPreview(null);
    setImportSummary(null);
    setLastRejectedRows([]);
    setProgress(2);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("storeId", fixedStoreId);
      const response = await api.post(
        "/store-inventory/bulk-upload/preview",
        data,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: ({ loaded, total }) => {
            if (total)
              setProgress(Math.max(2, Math.round((loaded / total) * 25)));
          },
        },
      );
      setPreview(response.data);
      setProgress(30);
    } catch (requestError) {
      setProgress(0);
      setError(errorMessage(requestError, "The file could not be previewed."));
    } finally {
      workInProgress.current = false;
      setBusy(false);
    }
  };

  const clearFile = () => {
    if (workInProgress.current) return;
    setFile(null);
    setPreview(null);
    setProgress(0);
    setError("");
    setImportSummary(null);
    setLastRejectedRows([]);
    setFilter("ALL");
    setEditing(null);
    setConfirming(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addRow = () => {
    const nextRowNumber = rows.length
      ? Math.max(...rows.map((row) => row.rowNumber)) + 1
      : 2;
    const selectedStore = stores.find(
      (store) => String(store.id) === String(fixedStoreId),
    );
    const newRow = {
      rowNumber: nextRowNumber,
      partNumber: "",
      itemName: "",
      brandName: "",
      quantity: "",
      purchasePrice: "",
      sellingPrice: "",
      mrp: "",
      hsnCode: "",
      gstPercentage: "",
      rackNumber: "",
      storeId: fixedStoreId || null,
      storeName: selectedStore?.storeName || user.storeName || "",
      storeCode: selectedStore?.storeCode || null,
      productMatch: null,
      status: "INVALID",
      errors: ["Complete the row before import"],
    };
    const nextRows = recheckRows([...rows, newRow]);
    refreshCounts(nextRows);
    setEditing(newRow);
  };

  const removeRow = (rowNumber) => {
    const nextRows = rows.filter((row) => row.rowNumber !== rowNumber);
    refreshCounts(recheckRows(nextRows));
  };

  const updateEditingField = (field, value) => {
    setEditing((current) => {
      if (!current) return current;
      const next = { ...current, [field]: value };
      if (PRICE_FIELDS.includes(field)) {
        // Once all prices are displayed, editing one makes the others fixed inputs.
        // Automatic calculation starts again after Clear Prices (or all three blanks).
        const fields = new Set(
          PRICE_FIELDS.every((key) => hasValue(current[key]))
            ? PRICE_FIELDS
            : sourceRow(current).enteredPriceFields,
        );
        if (hasValue(value)) fields.add(field);
        else fields.delete(field);
        next.enteredPriceFields = [...fields];
        next.priceSource =
          fields.size === 3 ? "MANUAL" : fields.size === 2 ? "PARTIAL" : null;
      }
      return next;
    });
  };

  const recalculateRows = async (nextRows) => {
    if (workInProgress.current) return null;
    workInProgress.current = true;
    setBusy(true);
    setError("");
    try {
      const pending = nextRows
        .filter((row) => row.status !== "IMPORTED")
        .map((row) => ({
          ...sourceRow(row),
          discountPercentage: Number(row.discountPercentage || 0),
        }));
      const calculated = [];
      for (let offset = 0; offset < pending.length; offset += CHUNK_SIZE) {
        const response = await api.post(
          "/store-inventory/bulk-upload/recalculate",
          { rows: pending.slice(offset, offset + CHUNK_SIZE) },
        );
        calculated.push(...response.data.rows);
      }
      const checked = recheckRows(calculated).map((row, index) => {
        const errors = [
          ...new Set([...row.errors, ...(calculated[index].errors || [])]),
        ];
        return { ...row, errors, status: errors.length ? "INVALID" : "VALID" };
      });
      const updated = new Map(checked.map((row) => [row.rowNumber, row]));
      refreshCounts(nextRows.map((row) => updated.get(row.rowNumber) || row));
      return updated;
    } catch (requestError) {
      setError(
        errorMessage(
          requestError,
          "Prices could not be recalculated. Please retry.",
        ),
      );
      return null;
    } finally {
      workInProgress.current = false;
      setBusy(false);
    }
  };

  const saveEditedRow = async () => {
    if (!editing || busy) return;
    const updated = await recalculateRows(
      rows.map((row) => (row.rowNumber === editing.rowNumber ? editing : row)),
    );
    const corrected: any = updated?.get(editing.rowNumber);
    if (corrected?.status === "VALID") {
      setEditing(null);
      setFilter("ALL");
    } else if (corrected) {
      setEditing(corrected);
      setError(corrected.errors.join("; "));
    }
  };

  const applyDiscountToAll = async () => {
    const discount = Number(allDiscount);
    if (
      allDiscount.trim() === "" ||
      !Number.isFinite(discount) ||
      discount < 0 ||
      discount >= 100
    ) {
      setError("Enter a discount from 0 up to, but not including, 100%.");
      return;
    }
    await recalculateRows(
      rows.map((row) =>
        row.status === "IMPORTED"
          ? row
          : { ...row, discountPercentage: discount },
      ),
    );
  };

  const importRows = async () => {
    if (workInProgress.current || !validRows.length) return;
    workInProgress.current = true;
    setConfirming(false);
    setBusy(true);
    setError("");
    setProgress(30);
    let processed = 0;
    const summary = {
      importedRows: 0,
      failedRows: 0,
      createdRows: 0,
      updatedRows: 0,
    };
    let nextRows = [...rows];
    const rowsToImport = nextRows.filter((row) => row.status === "VALID");
    try {
      for (let offset = 0; offset < rowsToImport.length; offset += CHUNK_SIZE) {
        const chunk = rowsToImport.slice(offset, offset + CHUNK_SIZE);
        const response = await api.post("/store-inventory/bulk-upload/import", {
          rows: chunk,
        });
        Object.keys(summary).forEach((key) => {
          summary[key] += Number(response.data?.[key] || 0);
        });
        const imported = new Map(
          (response.data?.rows || []).map((row) => [row.rowNumber, row]),
        );
        nextRows = nextRows.map((row) => imported.get(row.rowNumber) || row);
        processed += chunk.length;
        setProgress(
          rowsToImport.length
            ? 30 + Math.round((processed / rowsToImport.length) * 70)
            : 100,
        );
        setPreview((current) => ({ ...(current || {}), rows: nextRows }));
      }
      const remainingRejected = nextRows.filter(
        (row) => row.status !== "IMPORTED",
      );
      summary.failedRows = Math.max(
        summary.failedRows,
        remainingRejected.length,
      );
      setImportSummary(summary);
      setProgress(100);
      setLastRejectedRows(remainingRejected);
      // Keep rejected rows editable; IMPORTED rows stay locked and are excluded
      // from every later recalculation/import. Uncorrected rows block only themselves.
      refreshCounts(nextRows);
      setFilter("ALL");
      setEditing(null);
      if (remainingRejected.length === 0 && summary.importedRows > 0) {
        setFile(null);
        setPreview(null);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (requestError) {
      setError(
        `${errorMessage(requestError, "Import stopped.")} ${processed} row(s) were completed before it stopped.`,
      );
    } finally {
      workInProgress.current = false;
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get("/store-inventory/template", {
        responseType: "blob",
      });
      downloadBlob(response.data, "inventory-bulk-upload-template.xlsx");
    } catch (requestError) {
      setError(errorMessage(requestError, "Could not download the template."));
    }
  };

  const downloadRejected = async () => {
    try {
      const rowsToDownload = preview ? rejectedRows : lastRejectedRows;
      if (!rowsToDownload.length) {
        setError("There are no rejected rows to download.");
        return;
      }
      const response = await api.post(
        "/store-inventory/bulk-upload/rejected/download",
        rowsToDownload,
        { responseType: "blob" },
      );
      downloadBlob(response.data, "inventory-rejected-rows.xlsx");
    } catch (requestError) {
      setError(errorMessage(requestError, "Could not download rejected rows."));
    }
  };

  return (
    <section className="bulk-page-shell">
      <style>{`.bulk-workflow{display:grid;gap: var(--sp-3);color:#0f172a}.bulk-workflow button{font:inherit}.bulk-workflow__toolbar,.bulk-filebar,.bulk-preview-head{display:flex;align-items:center;justify-content:space-between;gap: var(--sp-3)}.bulk-workflow h2,.bulk-workflow h3{margin: 0}.bulk-workflow h2{font-size:17px}.bulk-workflow p,.bulk-preview-head span,.bulk-modal__head span{margin: var(--sp-1) 0 0;color:#64748b;font-size:12px}.bulk-button{height:36px;display:inline-flex;align-items:center;justify-content:center;gap: var(--sp-2);padding: 0 var(--sp-3);border-radius:5px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-size:12px;font-weight:750;cursor:pointer}.bulk-button:disabled{opacity:.5;cursor:not-allowed}.bulk-button--primary{border-color:#2563eb;background:#2563eb;color:#fff}.bulk-button--danger{border-color:#fecaca;color:#b91c1c;background:#fff}.bulk-filebar{padding: var(--sp-3);border:1px solid #dbe3ee;border-radius:6px;background:#fff}.bulk-filepicker{height:40px;min-width:360px;display:flex;align-items:center;gap: var(--sp-2);padding: 0 var(--sp-3);border:1px dashed #94a3b8;border-radius:5px;color:#475569;font-size:12px;cursor:pointer}.bulk-filepicker input{display:none}.bulk-progress{height:5px;border-radius:5px;background:#e2e8f0;overflow:hidden}.bulk-progress span{display:block;height:100%;background:#2563eb;transition:width .2s ease}.bulk-alert{padding: var(--sp-2) var(--sp-3);border:1px solid;border-radius:5px;font-size:12px;font-weight:650}.bulk-alert--error{border-color:#fecaca;background:#fef2f2;color:#b91c1c}.bulk-alert--success{border-color:#bbf7d0;background:#f0fdf4;color:#166534}.bulk-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap: var(--sp-2)}.bulk-kpis button{height:58px;display:flex;align-items:center;justify-content:space-between;padding: 0 var(--sp-3);border:1px solid #dbe3ee;border-radius:5px;background:#fff;color:#64748b;cursor:pointer}.bulk-kpis button.is-active{border-color:#60a5fa;background:#eff6ff}.bulk-kpis strong{font-size:18px;color:#0f172a}.bulk-kpis span{font-size:11px}.text-success{color:#15803d!important}.text-danger{color:#dc2626!important}.text-warning{color:#d97706!important}.bulk-preview-head{margin-top: 2px}.bulk-preview-head h3{font-size:14px}.bulk-preview-head>div:last-child{display:flex;gap: var(--sp-2)}.bulk-table-wrap{border:1px solid #dbe3ee;border-radius:6px;background:#fff;overflow:auto;max-height:410px}.bulk-table{width:100%;min-width:1100px;border-collapse:collapse;font-size:11.5px}.bulk-table th{position:sticky;top:0;z-index:1;padding: var(--sp-2) var(--sp-2);text-align:left;background:#f8fafc;border-bottom:1px solid #dbe3ee;color:#64748b;text-transform:uppercase;font-size:10px}.bulk-table td{padding: var(--sp-2);border-bottom:1px solid #eef2f7;vertical-align:top}.bulk-table td strong,.bulk-table td span{display:block}.bulk-table td>span:not(.bulk-status):not(.bulk-tag){margin-top: 2px;color:#64748b}.bulk-table small{display:block;max-width:250px;margin-top: var(--sp-1);color:#b91c1c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bulk-tag,.bulk-status{width:fit-content;padding: 3px var(--sp-2);border-radius:4px;background:#f1f5f9;color:#475569;font-size:9.5px;font-weight:800}.bulk-status--valid,.bulk-status--imported{background:#dcfce7;color:#166534}.bulk-status--invalid,.bulk-status--failed{background:#fee2e2;color:#b91c1c}.bulk-status--duplicate_in_file{background:#ffedd5;color:#9a3412}.bulk-icon{width:30px;height:30px;display:inline-grid;place-items:center;border:1px solid #cbd5e1;border-radius:5px;background:#fff;color:#2563eb;cursor:pointer}.bulk-empty{padding: var(--sp-7);text-align:center;color:#64748b;font-size:12px}.bulk-modal-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding: var(--sp-5);background:rgba(15,23,42,.48)}.bulk-modal{width:min(720px,100%);padding: var(--sp-4);border-radius:7px;background:#fff;box-shadow:0 20px 50px rgba(15,23,42,.28)}.bulk-modal--confirm{width:min(430px,100%)}.bulk-modal__head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom: var(--sp-4)}.bulk-modal__head h3,.bulk-modal--confirm h3{font-size:16px}.bulk-edit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap: var(--sp-3)}.bulk-edit-grid label{display:grid;gap: var(--sp-1);color:#475569;font-size:11px;font-weight:700}.bulk-edit-grid input{height:36px;padding: 0 var(--sp-2);border:1px solid #cbd5e1;border-radius:5px;outline:none}.bulk-edit-grid input:focus{border-color:#3b82f6;box-shadow:0 0 0 2px #dbeafe}.bulk-modal__actions{display:flex;justify-content:flex-end;gap: var(--sp-2);margin-top: var(--sp-4)}.bulk-modal__actions .bulk-button--danger{margin-right: auto}@media(max-width:900px){.bulk-kpis{grid-template-columns:repeat(2,1fr)}.bulk-edit-grid{grid-template-columns:repeat(2,1fr)}.bulk-filepicker{min-width:0;flex:1}}@media(max-width:600px){.bulk-workflow__toolbar,.bulk-filebar,.bulk-preview-head{align-items:stretch;flex-direction:column}.bulk-preview-head>div:last-child{display:grid}.bulk-kpis,.bulk-edit-grid{grid-template-columns:1fr}.bulk-filepicker{width:100%;box-sizing:border-box}}

.bulk-file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  min-height: 32px;
}

.bulk-file-row .bulk-progress {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}

.bulk-file-row .bulk-page-shell__remove-file {
  flex: 0 0 auto;
  margin-top: 0;
}

/* ---- 14.2 Import summary KPI cards ---- */
.bulk-kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0 20px;
}

.bulk-kpi {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  min-height: 68px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.bulk-kpi:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.bulk-kpi.is-active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 1px #2563eb inset;
}

.bulk-kpi strong {
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
}

.bulk-kpi span {
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.bulk-kpi strong.text-success { color: #16a34a; }
.bulk-kpi strong.text-danger  { color: #dc2626; }
.bulk-kpi strong.text-warning { color: #d97706; }

/* ---- 14.3 Preview header text block ---- */
.bulk-preview-head__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1 1 260px;
}

.bulk-preview-head__text span {
  color: #64748b;
  font-size: 12.5px;
  line-height: 1.4;
}

/* ---- 14.4 Bulk discount control group ---- */
.bulk-discount-control__row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.bulk-discount-control__row > label {
  flex: 0 1 auto;
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
}

.bulk-discount-control__group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 1 auto;
}

.bulk-discount-control__group input {
  width: 110px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.bulk-discount-control__group input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px #dbeafe;
}

.bulk-discount-control__group input:disabled {
  background: #f1f5f9;
  cursor: not-allowed;
}

/* ---- 14.5 Table cell modifiers ---- */
.bulk-table th.is-num,
.bulk-table td.is-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.bulk-table th.is-actions,
.bulk-table td.is-actions {
  width: 88px;
  text-align: right;
  white-space: nowrap;
}

.bulk-table td.is-product {
  min-width: 180px;
  max-width: 260px;
}

.bulk-table td.is-product strong {
  display: block;
  color: #0f172a;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.bulk-table td.is-product span {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.bulk-table td.is-store,
.bulk-table td.is-mode {
  max-width: 160px;
  overflow-wrap: anywhere;
}

.bulk-table td.is-status {
  min-width: 180px;
  max-width: 260px;
}

.bulk-table td.is-status small {
  display: block;
  margin-top: 4px;
  color: #b91c1c;
  font-size: 11px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

/* ---- 14.6 Row action group ---- */
.bulk-row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

/* ---- 14.7 Responsive: preview additions ---- */
@media (max-width: 900px) {
  .bulk-kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .bulk-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bulk-file-row {
    flex-direction: column;
    align-items: stretch;
  }

  .bulk-discount-control__row,
  .bulk-discount-control__group {
    width: 100%;
  }

  .bulk-discount-control__group input {
    flex: 1 1 auto;
    width: 100%;
  }

  .bulk-preview-head {
    flex-direction: column;
    align-items: stretch;
  }

  .bulk-preview-actions {
    justify-content: flex-start;
  }
}
/* ==========================================================================
   BULK UPLOAD PRICE SETTINGS + PREVIEW FILE UI
   Consolidated. No duplicates, no dead selectors.
   ========================================================================== */

/* ==========================================================================
   PART 1 — PRICE SETTINGS PANEL (pre-existing)
   ========================================================================== */

.bulk-price-settings {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: var(--sp-3);
  padding: var(--sp-3);
  margin-bottom: var(--sp-3);
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #eff6ff;
}

.bulk-price-settings label,
.bulk-price-settings > div {
  display: grid;
  gap: var(--sp-1);
}

.bulk-price-settings span {
  color: #475569;
  font-size: 10.5px;
  font-weight: 750;
}

.bulk-price-settings select,
.bulk-gst-input {
  height: 36px;
  border: 1px solid #bfdbfe;
  border-radius: 5px;
  background: #fff;
}

.bulk-price-settings select {
  padding: 0 var(--sp-2);
}

.bulk-gst-input {
  display: flex;
  align-items: center;
}

.bulk-gst-input input {
  width: 100%;
  height: 32px;
  padding: 0 var(--sp-2);
  border: 0;
  outline: 0;
}

.bulk-gst-input b {
  padding-right: var(--sp-2);
  color: #475569;
}

.bulk-price-settings > div strong {
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 var(--sp-3);
  border-radius: 5px;
  background: #fff;
  color: #1d4ed8;
  font-size: 14px;
}

/* ==========================================================================
   PART 2 — HEADER SETTING (pre-existing)
   ========================================================================== */

.bulk-header-setting {
  height: 36px;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-2);
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  background: #fff;
}

.bulk-header-setting span {
  color: #64748b;
  font-size: 10px;
  font-weight: 750;
  text-transform: uppercase;
}

.bulk-header-setting select,
.bulk-header-setting input {
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 11px;
  font-weight: 700;
}

.bulk-header-gst input {
  width: 38px;
}

.bulk-header-gst b {
  color: #475569;
  font-size: 11px;
}

/* ==========================================================================
   PART 3 — PREVIEW FILE UI (scoped to .bulk-page-shell)
   ========================================================================== */

/* ---- 3.1 File row: progress + Remove file on one line ---- */
.bulk-page-shell .bulk-file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}
.bulk-page-shell .bulk-file-row .bulk-progress {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}
.bulk-page-shell .bulk-file-row .bulk-page-shell__remove-file {
  flex: 0 0 auto;
  margin-top: 0;
}

/* ---- 3.2 KPI cards — base ---- */
.bulk-page-shell .bulk-kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin: 4px 0 18px;
  padding-bottom: 18px;
  border-bottom: 1px solid #e2e8f0;
}

.bulk-page-shell .bulk-kpi {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  min-height: 64px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
}

.bulk-page-shell .bulk-kpi strong {
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.bulk-page-shell .bulk-kpi span {
  color: #000000;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .03em;
  text-transform: uppercase;
}

/* ---- 3.3 KPI cards — static status accents ---- */
.bulk-page-shell .bulk-kpi--total      { border-left: 3px solid #2563eb; }
.bulk-page-shell .bulk-kpi--ready      { border-left: 3px solid #16a34a; }
.bulk-page-shell .bulk-kpi--invalid    { border-left: 3px solid #dc2626; }
.bulk-page-shell .bulk-kpi--duplicate  { border-left: 3px solid #d97706; }
.bulk-page-shell .bulk-kpi--imported   { border-left: 3px solid #0f172a; }

.bulk-page-shell .bulk-kpi--total      strong { color: #2563eb; }
.bulk-page-shell .bulk-kpi--ready      strong { color: #16a34a; }
.bulk-page-shell .bulk-kpi--invalid    strong { color: #dc2626; }
.bulk-page-shell .bulk-kpi--duplicate  strong { color: #d97706; }
.bulk-page-shell .bulk-kpi--imported   strong { color: #0f172a; }

/* ---- 3.4 KPI cards — active state (per-status highlight) ---- */
.bulk-page-shell .bulk-kpi--total.is-active {
  background: #eff6ff;
  border-color: #2563eb;
  border-left-color: #2563eb;
  box-shadow: inset 0 0 0 1px #2563eb;
}
.bulk-page-shell .bulk-kpi--ready.is-active {
  background: #f0fdf4;
  border-color: #16a34a;
  border-left-color: #16a34a;
  box-shadow: inset 0 0 0 1px #16a34a;
}
.bulk-page-shell .bulk-kpi--invalid.is-active {
  background: #fef2f2;
  border-color: #dc2626;
  border-left-color: #dc2626;
  box-shadow: inset 0 0 0 1px #dc2626;
}
.bulk-page-shell .bulk-kpi--duplicate.is-active {
  background: #fffbeb;
  border-color: #d97706;
  border-left-color: #d97706;
  box-shadow: inset 0 0 0 1px #d97706;
}
.bulk-page-shell .bulk-kpi--imported.is-active {
  background: #f1f5f9;
  border-color: #0f172a;
  border-left-color: #0f172a;
  box-shadow: inset 0 0 0 1px #0f172a;
}

/* ---- 3.5 KPI cards — hover (only when not active) ---- */
.bulk-page-shell .bulk-kpi--total:not(.is-active):hover     { background: #f5f8ff; border-color: #bfdbfe; }
.bulk-page-shell .bulk-kpi--ready:not(.is-active):hover     { background: #f5fdf8; border-color: #bbf7d0; }
.bulk-page-shell .bulk-kpi--invalid:not(.is-active):hover   { background: #fef6f6; border-color: #fecaca; }
.bulk-page-shell .bulk-kpi--duplicate:not(.is-active):hover { background: #fffdf5; border-color: #fde68a; }
.bulk-page-shell .bulk-kpi--imported:not(.is-active):hover  { background: #f8fafc; border-color: #cbd5e1; }

/* ---- 3.6 Preview toolbar: heading + discount + actions on one row ---- */
.bulk-page-shell .bulk-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin: 0 0 12px;
}

.bulk-page-shell .bulk-preview-head > h3 {
  margin: 0;
  flex: 0 0 auto;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.bulk-page-shell .bulk-preview-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-left: auto;
}

.bulk-page-shell .bulk-preview-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ---- 3.7 Inline discount control group ---- */
.bulk-page-shell .bulk-discount-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #f8fafc;
}

.bulk-page-shell .bulk-discount-inline > label {
  color: #000000;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.bulk-page-shell .bulk-discount-inline input {
  width: 78px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  font-family: inherit;
  font-size: 12.5px;
  outline: none;
  transition: border-color .15s ease, box-shadow .15s ease;
}

.bulk-page-shell .bulk-discount-inline input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px #dbeafe;
}

.bulk-page-shell .bulk-discount-inline input:disabled {
  background: #f1f5f9;
  cursor: not-allowed;
}

/* ---- 3.8 Table wrapper — hidden scrollbar ---- */
.bulk-page-shell .bulk-table-wrap {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  scrollbar-width: none;          /* Firefox */
}
.bulk-page-shell .bulk-table-wrap::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;                  /* WebKit / Blink */
}

/* ---- 3.9 Table — fixed layout, compact, percentage widths ---- */
.bulk-page-shell .bulk-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 12px;
}

/* Header */
.bulk-page-shell .bulk-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 8px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #000000;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Body cells */
.bulk-page-shell .bulk-table tbody td {
  padding: 8px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  font-size: 12px;
  vertical-align: middle;
  min-width: 0;
}
.bulk-page-shell .bulk-table tbody tr:last-child td { border-bottom: 0; }
.bulk-page-shell .bulk-table tbody tr:hover { background: #f8fafc; }

/* Column widths — sums to 100% (no horizontal scroll on desktop) */
.bulk-page-shell .bulk-table th:nth-child(1),
.bulk-page-shell .bulk-table td:nth-child(1)  { width: 3.5%; }   /* Row */
.bulk-page-shell .bulk-table th:nth-child(2),
.bulk-page-shell .bulk-table td:nth-child(2)  { width: 14%;  }   /* Product */
.bulk-page-shell .bulk-table th:nth-child(3),
.bulk-page-shell .bulk-table td:nth-child(3)  { width: 9%;   }   /* Store */
.bulk-page-shell .bulk-table th:nth-child(4),
.bulk-page-shell .bulk-table td:nth-child(4)  { width: 4%;   }   /* Qty */
.bulk-page-shell .bulk-table th:nth-child(5),
.bulk-page-shell .bulk-table td:nth-child(5)  { width: 6%;   }   /* Purchase */
.bulk-page-shell .bulk-table th:nth-child(6),
.bulk-page-shell .bulk-table td:nth-child(6)  { width: 6%;   }   /* Selling */
.bulk-page-shell .bulk-table th:nth-child(7),
.bulk-page-shell .bulk-table td:nth-child(7)  { width: 5.5%; }   /* MRP */
.bulk-page-shell .bulk-table th:nth-child(8),
.bulk-page-shell .bulk-table td:nth-child(8)  { width: 8%;   }   /* Pricing mode */
.bulk-page-shell .bulk-table th:nth-child(9),
.bulk-page-shell .bulk-table td:nth-child(9)  { width: 6%;   }   /* Discount % */
.bulk-page-shell .bulk-table th:nth-child(10),
.bulk-page-shell .bulk-table td:nth-child(10) { width: 7%;   }   /* Discount / unit */
.bulk-page-shell .bulk-table th:nth-child(11),
.bulk-page-shell .bulk-table td:nth-child(11) { width: 7%;   }   /* Purchase total */
.bulk-page-shell .bulk-table th:nth-child(12),
.bulk-page-shell .bulk-table td:nth-child(12) { width: 4%;   }   /* GST */
.bulk-page-shell .bulk-table th:nth-child(13),
.bulk-page-shell .bulk-table td:nth-child(13) { width: 6%;   }   /* Match */
.bulk-page-shell .bulk-table th:nth-child(14),
.bulk-page-shell .bulk-table td:nth-child(14) { width: 11%;  }   /* Status / reason */
.bulk-page-shell .bulk-table th:nth-child(15),
.bulk-page-shell .bulk-table td:nth-child(15) { width: 3%;   }   /* Actions */

/* ---- 3.10 Numeric alignment ---- */
.bulk-page-shell .bulk-table th.is-num,
.bulk-page-shell .bulk-table td.is-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ---- 3.11 Text wrapping for wide-content cells ---- */
.bulk-page-shell .bulk-table td.is-product,
.bulk-page-shell .bulk-table td.is-store,
.bulk-page-shell .bulk-table td.is-mode,
.bulk-page-shell .bulk-table td.is-status {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.bulk-page-shell .bulk-table td.is-product strong {
  display: block;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}
.bulk-page-shell .bulk-table td.is-product span {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 10.5px;
  line-height: 1.3;
}
.bulk-page-shell .bulk-table td.is-status small {
  display: -webkit-box;
  margin-top: 3px;
  color: #b91c1c;
  font-size: 10.5px;
  line-height: 1.35;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---- 3.12 Actions column ---- */
.bulk-page-shell .bulk-table th.is-actions,
.bulk-page-shell .bulk-table td.is-actions {
  text-align: right;
  white-space: nowrap;
  padding-left: 4px;
  padding-right: 8px;
}

.bulk-page-shell .bulk-row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

/* ---- 3.13 Compact icon buttons ---- */
.bulk-page-shell .bulk-table .bulk-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: background .15s ease, color .15s ease, border-color .15s ease;
}
.bulk-page-shell .bulk-table .bulk-icon:hover:not(:disabled) {
  background: #f8fafc;
  color: #0f172a;
  border-color: #cbd5e1;
}
.bulk-page-shell .bulk-table .bulk-icon:disabled {
  opacity: .45;
  cursor: not-allowed;
}

/* ---- 3.14 Modal form-field labels — black ---- */
.bulk-page-shell .bulk-edit-grid label > span,
.bulk-page-shell .bulk-modal label > span {
  color: #000000;
  font-weight: 600;
}

/* ==========================================================================
   PART 4 — RESPONSIVE
   ========================================================================== */

@media (max-width: 1100px) {
  .bulk-page-shell .bulk-kpis {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }
  .bulk-page-shell .bulk-kpi {
    min-height: 58px;
    padding: 10px 12px;
  }
  .bulk-page-shell .bulk-kpi strong { font-size: 18px; }
}

@media (max-width: 900px) {
  .bulk-page-shell .bulk-kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .bulk-page-shell .bulk-preview-toolbar {
    width: 100%;
    margin-left: 0;
    justify-content: flex-start;
  }
  .bulk-page-shell .bulk-preview-actions {
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .bulk-page-shell .bulk-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .bulk-page-shell .bulk-file-row {
    flex-direction: column;
    align-items: stretch;
  }
  .bulk-page-shell .bulk-preview-head {
    flex-direction: column;
    align-items: stretch;
  }
  .bulk-page-shell .bulk-discount-inline {
    width: 100%;
  }
  .bulk-page-shell .bulk-discount-inline input {
    flex: 1 1 auto;
    width: 100%;
  }
  .bulk-page-shell .bulk-preview-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 600px) {
  .bulk-price-settings {
    grid-template-columns: 1fr;
  }
}`}</style>
      <div className="bulk-page-shell__body">
        {/* ---- Title row ---- */}
        <div className="bulk-page-shell__title-row">
          {!hideTitle && (
            <div>
              <h2>Opening Stock</h2>
              <p>
                Select one receiving store, then upload stock without vendor or
                invoice details.
              </p>
            </div>
          )}
          <button
            type="button"
            className="bulk-page-shell__sample-btn"
            onClick={downloadTemplate}
          >
            <Download size={15} />
            Sample file
          </button>
        </div>

        {/* ---- Store select (super admin) ---- */}
        {isSuperAdmin && (
          <label className="bulk-page-shell__store">
            <span>Receiving store</span>
            <select
              value={selectedStoreId}
              disabled={busy}
              onChange={(event) => {
                setSelectedStoreId(event.target.value);
                clearFile();
              }}
            >
              <option value="">Select store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.storeName} ({store.storeCode})
                </option>
              ))}
            </select>
          </label>
        )}

        {/* ---- Dropzone ---- */}
        <label
          className={`bulk-page-shell__dropzone${file ? " has-file" : ""}${busy ? " is-busy" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (workInProgress.current) return;
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) {
              setFile(dropped);
              setPreview(null);
              setImportSummary(null);
              setLastRejectedRows([]);
              setProgress(0);
              setError("");
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            disabled={busy}
            accept=".csv,.xls,.xlsx"
            style={{ display: "none" }}
            onChange={(event) => {
              if (workInProgress.current) return;
              setFile(event.target.files?.[0] || null);
              setPreview(null);
              setImportSummary(null);
              setLastRejectedRows([]);
              setProgress(0);
              setError("");
            }}
          />

          <div className="bulk-page-shell__dropzone-icon">
            <UploadCloud size={22} />
          </div>

          {file ? (
            <>
              <div className="bulk-page-shell__dropzone-title">
                <FileSpreadsheet size={16} />
                {file.name}
              </div>
              <div className="bulk-page-shell__dropzone-sub">
                Click to choose a different file
              </div>
            </>
          ) : (
            <>
              <div className="bulk-page-shell__dropzone-title">
                Drop the file here
              </div>
              <div className="bulk-page-shell__dropzone-sub">
                CSV, XLS or XLSX · maximum 10 MB
              </div>
            </>
          )}

          <span className="bulk-page-shell__dropzone-browse">Browse file</span>
        </label>

        {/* ---- File row: progress + Remove file ---- */}
        {(file || progress > 0 || busy) && (
          <div className="bulk-file-row">
            {(progress > 0 || busy) && (
              <div
                className="bulk-progress"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Upload progress ${progress}%`}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
            )}
            {file && (
              <button
                type="button"
                className="bulk-page-shell__remove-file"
                onClick={clearFile}
                title="Remove file"
              >
                <X size={15} />
                Remove file
              </button>
            )}
          </div>
        )}

        {/* ---- Errors / summary ---- */}
        {error && <div className="bulk-alert bulk-alert--error">{error}</div>}

        {importSummary && (
          <div className="bulk-alert bulk-alert--success">
            Imported {importSummary.importedRows} row(s):{" "}
            {importSummary.createdRows} created and {importSummary.updatedRows}{" "}
            updated. Failed: {importSummary.failedRows}.
            {lastRejectedRows.length > 0 && (
              <button
                type="button"
                className="bulk-button bulk-button--secondary"
                onClick={downloadRejected}
              >
                <Download size={14} />
                Download rejected rows
              </button>
            )}
          </div>
        )}

        {/* ---- Footer ---- */}
        <div className="bulk-page-shell__footer">
          <button
            type="button"
            className="bulk-page-shell__cancel"
            onClick={onClose || (() => {})}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bulk-page-shell__primary"
            disabled={!file || !fixedStoreId || busy}
            onClick={previewFile}
          >
            <Upload size={15} />
            {busy && !preview ? "Reading..." : "Preview file"}
          </button>
        </div>

        {/* ---- Preview ---- */}
        {preview && (
          <>
            {/* Import summary */}
            <div className="bulk-kpis" role="group" aria-label="Import summary">
              <button
                type="button"
                className={`bulk-kpi bulk-kpi--total${filter === "ALL" ? " is-active" : ""}`}
                aria-pressed={filter === "ALL"}
                onClick={() => setFilter("ALL")}
              >
                <strong>{rows.length}</strong>
                <span>Total rows</span>
              </button>
              <button
                type="button"
                className={`bulk-kpi bulk-kpi--ready${filter === "VALID" ? " is-active" : ""}`}
                aria-pressed={filter === "VALID"}
                onClick={() => setFilter("VALID")}
              >
                <strong>{validRows.length}</strong>
                <span>Ready</span>
              </button>
              <button
                type="button"
                className={`bulk-kpi bulk-kpi--invalid${filter === "INVALID" ? " is-active" : ""}`}
                aria-pressed={filter === "INVALID"}
                onClick={() => setFilter("INVALID")}
              >
                <strong>
                  {rows.filter((r) => r.status === "INVALID").length}
                </strong>
                <span>Invalid</span>
              </button>
              <button
                type="button"
                className={`bulk-kpi bulk-kpi--duplicate${filter === "DUPLICATE_IN_FILE" ? " is-active" : ""}`}
                aria-pressed={filter === "DUPLICATE_IN_FILE"}
                onClick={() => setFilter("DUPLICATE_IN_FILE")}
              >
                <strong>
                  {rows.filter((r) => r.status === "DUPLICATE_IN_FILE").length}
                </strong>
                <span>Duplicates</span>
              </button>
              <button
                type="button"
                className={`bulk-kpi bulk-kpi--imported${filter === "IMPORTED" ? " is-active" : ""}`}
                aria-pressed={filter === "IMPORTED"}
                onClick={() => setFilter("IMPORTED")}
              >
                <strong>
                  {rows.filter((r) => r.status === "IMPORTED").length}
                </strong>
                <span>Imported</span>
              </button>
            </div>

            {/* Preview toolbar: heading + discount + actions */}
            <div className="bulk-preview-head">
              <h3>Import Preview</h3>

              <div className="bulk-preview-toolbar">
                <div className="bulk-discount-inline">
                  <label htmlFor="opening-stock-discount">Discount %</label>
                  <input
                    id="opening-stock-discount"
                    type="number"
                    min="0"
                    max="99.99"
                    step="0.01"
                    value={allDiscount}
                    disabled={busy}
                    onChange={(e) => setAllDiscount(e.target.value)}
                  />
                  <button
                    type="button"
                    className="bulk-button bulk-button--secondary"
                    disabled={
                      busy || !rows.some((r) => r.status !== "IMPORTED")
                    }
                    onClick={applyDiscountToAll}
                  >
                    Apply to all rows
                  </button>
                </div>

                <div className="bulk-preview-actions">
                  <button
                    className="bulk-button bulk-button--secondary"
                    type="button"
                    onClick={addRow}
                  >
                    <CirclePlus size={14} /> Add row
                  </button>
                  {rejectedRows.length > 0 && (
                    <button
                      className="bulk-button bulk-button--secondary"
                      type="button"
                      onClick={downloadRejected}
                    >
                      <Download size={14} /> Rejected rows
                    </button>
                  )}
                  <button
                    className="bulk-button bulk-button--primary"
                    type="button"
                    disabled={!validRows.length || busy}
                    onClick={() => setConfirming(true)}
                  >
                    Import {validRows.length} valid rows
                  </button>
                </div>
              </div>
            </div>

            {/* Data table */}
            <div className="bulk-table-wrap">
              <table className="bulk-table">
                <thead>
                  <tr>
                    <th className="is-num">Row</th>
                    <th>Product</th>
                    <th>Store</th>
                    <th className="is-num">Qty</th>
                    <th className="is-num">Purchase</th>
                    <th className="is-num">Selling</th>
                    <th className="is-num">MRP</th>
                    <th>Pricing mode</th>
                    <th className="is-num">Discount %</th>
                    <th className="is-num">Discount / unit</th>
                    <th className="is-num">Purchase total</th>
                    <th className="is-num">GST</th>
                    <th>Match</th>
                    <th>Status / reason</th>
                    <th className="is-actions" aria-label="Row actions" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td className="is-num">{row.rowNumber}</td>
                      <td className="is-product">
                        <strong>{row.itemName || "-"}</strong>
                        <span>
                          {row.partNumber || "No part number"} |{" "}
                          {row.brandName || "No brand"}
                        </span>
                      </td>
                      <td className="is-store">
                        {row.storeName || row.storeCode || "-"}
                      </td>
                      <td className="is-num">{row.quantity ?? "-"}</td>
                      <td className="is-num">{row.purchasePrice ?? "-"}</td>
                      <td className="is-num">{row.sellingPrice ?? "-"}</td>
                      <td className="is-num">{row.mrp ?? "-"}</td>
                      <td className="is-mode">
                        {row.priceSource === "MANUAL"
                          ? "Prices preserved"
                          : row.priceSource === "PARTIAL"
                            ? "Two entered + calculated"
                            : "Calculated"}
                      </td>
                      <td className="is-num">{row.discountPercentage ?? 0}%</td>
                      <td className="is-num">{row.discountAmount ?? "-"}</td>
                      <td className="is-num">{row.lineTotal ?? "-"}</td>
                      <td className="is-num">{row.gstPercentage ?? "-"}%</td>
                      <td>
                        <span className="bulk-tag">
                          {row.productMatch || "-"}
                        </span>
                      </td>
                      <td className="is-status">
                        <span
                          className={`bulk-status bulk-status--${row.status?.toLowerCase()}`}
                        >
                          {row.status?.replaceAll("_", " ")}
                        </span>
                        {row.errors?.length > 0 && (
                          <small title={row.errors.join("; ")}>
                            {row.errors.join("; ")}
                          </small>
                        )}
                      </td>
                      <td className="is-actions">
                        <div className="bulk-row-actions">
                          <button
                            className="bulk-icon"
                            type="button"
                            title="Edit row"
                            aria-label={`Edit row ${row.rowNumber}`}
                            disabled={busy || row.status === "IMPORTED"}
                            onClick={() => setEditing({ ...row })}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="bulk-icon"
                            type="button"
                            title="Remove row"
                            aria-label={`Remove row ${row.rowNumber}`}
                            disabled={busy || row.status === "IMPORTED"}
                            onClick={() => removeRow(row.rowNumber)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleRows.length === 0 && (
                <div className="bulk-empty">No rows match this filter.</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ---- Edit modal (unchanged) ---- */}
      {editing && (
        <div className="bulk-modal-backdrop">
          <div className="bulk-modal" role="dialog" aria-modal="true">
            <div className="bulk-modal__head">
              <div>
                <h3>Edit row {editing.rowNumber}</h3>
                <span>
                  Enter one, two or three prices. Only blanks are calculated.
                  Editing a filled price preserves the others.
                </span>
              </div>
              <button
                className="bulk-icon"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p>
              Purchase is final cost including GST and discount. Selling
              excludes GST. Calculated MRP is a suggestion.
            </p>
            <button
              type="button"
              className="bulk-button bulk-button--secondary"
              disabled={busy}
              onClick={() =>
                setEditing((current) => ({
                  ...current,
                  purchasePrice: "",
                  sellingPrice: "",
                  mrp: "",
                  priceSource: null,
                  enteredPriceFields: [],
                  errors: [],
                }))
              }
            >
              Clear Prices
            </button>
            {editing.errors?.length > 0 && (
              <div className="bulk-alert bulk-alert--error" role="alert">
                {editing.errors.join("; ")}
              </div>
            )}

            <div className="bulk-edit-grid">
              {editableFields.map(([field, label]) => (
                <label key={field}>
                  <span>{label}</span>
                  <input
                    type={
                      [
                        "quantity",
                        "purchasePrice",
                        "sellingPrice",
                        "mrp",
                        "gstPercentage",
                        "discountPercentage",
                      ].includes(field)
                        ? "number"
                        : "text"
                    }
                    min={
                      [
                        "quantity",
                        "purchasePrice",
                        "sellingPrice",
                        "mrp",
                        "gstPercentage",
                        "discountPercentage",
                      ].includes(field)
                        ? "0"
                        : undefined
                    }
                    step={
                      [
                        "purchasePrice",
                        "sellingPrice",
                        "mrp",
                        "gstPercentage",
                        "discountPercentage",
                      ].includes(field)
                        ? "0.01"
                        : undefined
                    }
                    value={editing[field] ?? ""}
                    disabled={busy}
                    onChange={(event) =>
                      updateEditingField(field, event.target.value)
                    }
                  />
                </label>
              ))}
            </div>

            <div className="bulk-modal__actions">
              <button
                className="bulk-button bulk-button--danger"
                disabled={busy}
                onClick={() => {
                  removeRow(editing.rowNumber);
                  setEditing(null);
                }}
              >
                Remove row
              </button>
              <button
                className="bulk-button bulk-button--secondary"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button
                className="bulk-button bulk-button--primary"
                disabled={busy}
                onClick={saveEditedRow}
              >
                {busy ? "Calculating..." : "Save row"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <div className="bulk-modal-backdrop">
          <div
            className="bulk-modal bulk-modal--confirm"
            role="dialog"
            aria-modal="true"
          >
            <h3>Import {validRows.length} validated rows?</h3>
            <p>
              This will create or update inventory and batches. Invalid and
              duplicate rows will remain unimported.
            </p>
            <div className="bulk-modal__actions">
              <button
                className="bulk-button bulk-button--secondary"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button
                className="bulk-button bulk-button--primary"
                disabled={busy || !validRows.length}
                onClick={importRows}
              >
                Confirm import
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
