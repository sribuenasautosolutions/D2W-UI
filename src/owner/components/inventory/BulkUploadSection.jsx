import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  CirclePlus,
  Download,
  FileSpreadsheet,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";

import api from "../../../services/api";

import "./BulkUploadSection.css";
import "./BulkUploadPriceSettings.css";

const CHUNK_SIZE = 100;

const PRICE_FIELDS = ["purchasePrice", "sellingPrice", "mrp"];
// Editing any of these changes the calculated amounts, so the row is recalculated on blur.
const CALC_FIELDS = [...PRICE_FIELDS, "quantity", "discountPercentage", "gstPercentage"];
const TEXT_FIELDS = ["partNumber", "itemName", "brandName", "hsnCode", "rackNumber"];
const PRICE_SOURCE_BY_FIELD = { purchasePrice: "PURCHASE_PRICE", sellingPrice: "SELLING_PRICE", mrp: "MRP" };
const DUPLICATE_MESSAGE = "Duplicate store and part number in this file";

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function errorMessage(error, fallback) {
  const body = error?.response?.data;
  return body?.message || body?.error || (typeof body === "string" ? body : "") || fallback;
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
  const field = { MRP: "mrp", PURCHASE_PRICE: "purchasePrice", SELLING_PRICE: "sellingPrice" }[row.priceSource];
  if (field) ["mrp", "purchasePrice", "sellingPrice"].forEach((key) => { if (key !== field) next[key] = null; });
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
      if (!Number.isFinite(number) || number <= 0) errors.push(`${label} must be greater than zero`);
    }
  });
  if (row.priceSource === "MANUAL" && entered !== 3) errors.push("Manual pricing requires all three prices");
  else if (entered === 0) errors.push("Enter one price for calculation or all three prices for manual pricing");
  else if (entered == 2) errors.push("Enter the third price, or keep only one price for calculation");
}

function validateEditedRow(row) {
  const errors = [];
  const discount = Number(row.discountPercentage ?? 0);
  if (!Number.isFinite(discount) || discount < 0 || discount >= 100) errors.push("Discount must be 0 or greater and less than 100%");
  if (String(row.partNumber || "").trim().toUpperCase().startsWith("SAMPLE-")) {
    errors.push("Template sample row must be replaced with a real product before import");
  }
  if (!row.storeId) errors.push("Valid store is required");
  if (!String(row.partNumber || "").trim()) errors.push("Part Number is required");
  if (!String(row.itemName || "").trim()) errors.push("Item Name is required");
  if (!String(row.brandName || "").trim()) errors.push("Brand is required");
  if (!String(row.hsnCode || "").trim()) errors.push("HSN Code is required");
  const quantity = Number(row.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) errors.push("Quantity must be a whole number above zero");

  if (row.gstPercentage === null || row.gstPercentage === undefined || String(row.gstPercentage).trim() === "") {
    errors.push("GST Percentage is required");
  } else {
    const gst = Number(row.gstPercentage);
    if (!Number.isFinite(gst) || gst < 0 || gst > 100) errors.push("GST Percentage must be between 0 and 100");
  }
  if (row.hsnCode && !/^\d{4,8}$/.test(String(row.hsnCode).trim())) errors.push("HSN Code must contain 4 to 8 digits");
  if (row.rackNumber && String(row.rackNumber).trim().length > 80) errors.push("Rack Number cannot exceed 80 characters");
  validatePriceSelection(row, errors);
  return errors;
}

function recheckRows(rows) {
  const keys = new Map();
  return rows.map((source) => {
    const row = { ...source, sampleRow: false };
    const errors = validateEditedRow(row);
    const key = `${row.storeId || ""}:${String(row.partNumber || "").trim().toUpperCase()}`;
    if (row.storeId && row.partNumber && keys.has(key)) {
      errors.push("Duplicate store and part number in this file");
    } else if (row.storeId && row.partNumber) {
      keys.set(key, row.rowNumber);
    }
    let status = "VALID";
    if (errors.some((item) => item.startsWith("Duplicate"))) status = "DUPLICATE_IN_FILE";
    else if (errors.length) status = "INVALID";
    return { ...row, errors, status };
  });
}

function withCounts(current, nextRows) {
  return {
    ...(current || {}),
    rows: nextRows,
    totalRows: nextRows.length,
    validRows: nextRows.filter((row) => row.status === "VALID").length,
    invalidRows: nextRows.filter((row) => row.status !== "VALID").length,
    duplicateRows: nextRows.filter((row) => row.status === "DUPLICATE_IN_FILE").length,
  };
}

// Re-derives status and in-file duplicates after a single-cell edit while keeping the
// existing errors (client and server) of untouched rows. Rows that did not change keep
// the same object so memoized table rows do not re-render.
function reconcileRows(rows) {
  const keys = new Map();
  return rows.map((row) => {
    if (row.status === "IMPORTED") return row;
    const previous = row.errors || [];
    const errors = previous.filter((message) => !message.startsWith("Duplicate"));
    if (row.storeId && row.partNumber) {
      const key = `${row.storeId}:${String(row.partNumber).trim().toUpperCase()}`;
      if (keys.has(key)) errors.push(DUPLICATE_MESSAGE);
      else keys.set(key, row.rowNumber);
    }
    let status = "VALID";
    if (errors.some((message) => message.startsWith("Duplicate"))) status = "DUPLICATE_IN_FILE";
    else if (errors.length) status = "INVALID";
    const unchanged =
      status === row.status &&
      errors.length === previous.length &&
      errors.every((message, index) => message === previous[index]);
    return unchanged ? row : { ...row, errors, status };
  });
}

function canCalculate(row) {
  const source = sourceRow(row);
  const entered = PRICE_FIELDS.filter((field) => {
    const value = source[field];
    return value !== null && value !== undefined && String(value).trim() !== "";
  }).length;
  return entered === 1 || entered === 3;
}

const EditableRow = memo(function EditableRow({ row, serial, busy, calculating, onChange, onCommit, onRemove }) {
  const locked = busy || row.status === "IMPORTED";

  const field = (name, label, { numeric = false, step, min, placeholder, className = "" } = {}) => (
    <input
      className={`bulk-cell-input${numeric ? " is-num" : ""}${className}`}
      type={numeric ? "number" : "text"}
      min={min}
      step={step}
      placeholder={placeholder}
      aria-label={`${label}, row ${serial}`}
      value={row[name] ?? ""}
      disabled={locked}
      onChange={(event) => onChange(row.rowNumber, name, event.target.value)}
      onBlur={() => onCommit(row.rowNumber)}
      onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
    />
  );

  return (
    <tr className={calculating ? "is-calculating" : undefined} aria-busy={calculating}>
      <td className="is-num is-serial" title={`File row ${row.rowNumber}`}>{serial}</td>
      <td className="is-product">
        {field("itemName", "Item name", { placeholder: "Item name", className: " bulk-cell-input--title" })}
        <div className="bulk-cell-sub">
          {field("partNumber", "Part number", { placeholder: "Part no." })}
          {field("brandName", "Brand", { placeholder: "Brand" })}
          {field("hsnCode", "HSN code", { placeholder: "HSN" })}
        </div>
      </td>
      <td className="is-store">{row.storeName || row.storeCode || "-"}</td>
      <td className="is-num">{field("quantity", "Quantity", { numeric: true, min: "0" })}</td>
      <td className="is-num">{field("purchasePrice", "Purchase price", { numeric: true, min: "0", step: "0.01" })}</td>
      <td className="is-num">{field("sellingPrice", "Selling price", { numeric: true, min: "0", step: "0.01" })}</td>
      <td className="is-num">{field("mrp", "MRP", { numeric: true, min: "0", step: "0.01" })}</td>
      <td className="is-num">{field("discountPercentage", "Discount percentage", { numeric: true, min: "0", step: "0.01" })}</td>
      <td className="is-num">{field("gstPercentage", "GST percentage", { numeric: true, min: "0", step: "0.01" })}</td>
      <td className="is-status">
        <span className={`bulk-status bulk-status--${row.status?.toLowerCase()}`}>
          {row.status?.replaceAll("_", " ")}
        </span>
        {row.errors?.length > 0 && <small title={row.errors.join("; ")}>{row.errors.join("; ")}</small>}
      </td>
      <td className="is-actions">
        <div className="bulk-row-actions">
          <button
            className="bulk-icon"
            type="button"
            title="Remove row"
            aria-label={`Remove row ${serial}`}
            disabled={locked}
            onClick={() => onRemove(row.rowNumber)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default function BulkUploadSection({ onClose, hideTitle = false }) {
  const user = currentUser();
  const [allDiscount, setAllDiscount] = useState("");
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(user.storeId ? String(user.storeId) : "");
  const fixedStoreId = selectedStoreId || null;

  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [lastRejectedRows, setLastRejectedRows] = useState([]);

  // Inline editing state
  const [calculating, setCalculating] = useState({});
  const calcSeq = useRef({});
  const dirtyRows = useRef(new Set());

  useEffect(() => {
    if (!isSuperAdmin) return;
    api
      .get("/stores", { params: { page: 0, size: 100, active: true } })
      .then(({ data }) => setStores(Array.isArray(data?.content) ? data.content : []))
      .catch(() => setError("Unable to load stores."));
  }, [isSuperAdmin]);

  const rows = preview?.rows || [];
  const validRows = rows.filter((row) => row.status === "VALID");
  const rejectedRows = rows.filter((row) => !["VALID", "IMPORTED"].includes(row.status));
  const isCalculating = Object.keys(calculating).length > 0;

  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const refreshCounts = (nextRows) => {
    setPreview((current) => withCounts(current, nextRows));
  };

  const resetCellState = () => {
    calcSeq.current = {};
    dirtyRows.current.clear();
    setCalculating({});
  };

  // Shared by the dropzone, drag-and-drop and the "Change file" button.
  const chooseFile = (picked) => {
    resetCellState();
    setFile(picked || null);
    setPreview(null);
    setImportSummary(null);
    setLastRejectedRows([]);
    setProgress(0);
    setError("");
  };

  const previewFile = async () => {
    if (!file) { setError("Choose a CSV, XLS, or XLSX file first."); return; }
    if (!fixedStoreId) { setError("Select the store that will receive this opening stock."); return; }
    resetCellState();
    setBusy(true); setError(""); setPreview(null); setImportSummary(null); setLastRejectedRows([]); setProgress(2);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("storeId", fixedStoreId);
      const response = await api.post("/store-inventory/bulk-upload/preview", data, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: ({ loaded, total }) => {
          if (total) setProgress(Math.max(2, Math.round((loaded / total) * 25)));
        },
      });
      setPreview(response.data);
      setProgress(30);
    } catch (requestError) {
      setProgress(0);
      setError(errorMessage(requestError, "The file could not be previewed."));
    } finally {
      setBusy(false);
    }
  };

  const clearFile = () => {
    resetCellState();
    setFile(null); setPreview(null); setProgress(0); setError("");
    setImportSummary(null); setLastRejectedRows([]); setConfirming(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addRow = () => {
    const nextRowNumber = rows.length ? Math.max(...rows.map((row) => row.rowNumber)) + 1 : 2;
    const selectedStore = stores.find((store) => String(store.id) === String(fixedStoreId));
    const newRow = {
      rowNumber: nextRowNumber, partNumber: "", itemName: "", brandName: "", quantity: "",
      purchasePrice: "", sellingPrice: "", mrp: "", hsnCode: "", gstPercentage: "", rackNumber: "",
      storeId: fixedStoreId || null,
      storeName: selectedStore?.storeName || user.storeName || "",
      storeCode: selectedStore?.storeCode || null,
      productMatch: null, status: "INVALID", errors: ["Complete the row before import"],
    };
    const nextRows = recheckRows([...rows, newRow]);
    refreshCounts(nextRows);
  };

  const removeRow = useCallback((rowNumber) => {
    setPreview((current) => {
      if (!current) return current;
      return withCounts(current, reconcileRows(current.rows.filter((row) => row.rowNumber !== rowNumber)));
    });
  }, []);

  // Inline cell edit: updates the row immediately and re-validates on the client.
  const updateCell = useCallback((rowNumber, field, value) => {
    if (CALC_FIELDS.includes(field)) dirtyRows.current.add(rowNumber);
    setPreview((current) => {
      if (!current) return current;
      const nextRows = current.rows.map((row) => {
        if (row.rowNumber !== rowNumber || row.status === "IMPORTED") return row;
        const next = { ...row, [field]: value };
        if (PRICE_FIELDS.includes(field) && row.priceSource !== "MANUAL") {
          next.purchasePrice = ""; next.sellingPrice = ""; next.mrp = "";
          next[field] = value;
          next.priceSource = PRICE_SOURCE_BY_FIELD[field];
        }
        return { ...next, sampleRow: false, errors: validateEditedRow(next) };
      });
      return withCounts(current, reconcileRows(nextRows));
    });
  }, []);

  // Recalculates one row through the same endpoint and payload shape as the bulk recalculation.
  const recalcRow = useCallback(async (rowNumber) => {
    const row = rowsRef.current.find((item) => item.rowNumber === rowNumber);
    if (!row || row.status === "IMPORTED" || !canCalculate(row)) return;

    const seq = (calcSeq.current[rowNumber] || 0) + 1;
    calcSeq.current[rowNumber] = seq;
    setCalculating((current) => ({ ...current, [rowNumber]: true }));

    try {
      const payload = { ...sourceRow(row), discountPercentage: Number(row.discountPercentage || 0) };
      const response = await api.post("/store-inventory/bulk-upload/recalculate", { rows: [payload] });
      // Ignore stale responses, or ones that arrive while the user is typing in this row again.
      if (calcSeq.current[rowNumber] !== seq || dirtyRows.current.has(rowNumber)) return;
      const calculated = response.data?.rows?.[0];
      if (!calculated) return;

      setPreview((current) => {
        if (!current) return current;
        const nextRows = current.rows.map((item) => {
          if (item.rowNumber !== rowNumber) return item;
          const merged = { ...calculated, sampleRow: false };
          // Keep text edits the user made while the request was in flight.
          TEXT_FIELDS.forEach((field) => { if (item[field] !== row[field]) merged[field] = item[field]; });
          const errors = [...new Set([...validateEditedRow(merged), ...(calculated.errors || [])])];
          return { ...merged, errors };
        });
        return withCounts(current, reconcileRows(nextRows));
      });
    } catch (requestError) {
      if (calcSeq.current[rowNumber] === seq) {
        setError(errorMessage(requestError, "Prices could not be recalculated. Please retry."));
      }
    } finally {
      if (calcSeq.current[rowNumber] === seq) {
        setCalculating((current) => {
          const next = { ...current };
          delete next[rowNumber];
          return next;
        });
      }
    }
  }, []);

  const commitCell = useCallback((rowNumber) => {
    if (!dirtyRows.current.has(rowNumber)) return;
    dirtyRows.current.delete(rowNumber);
    recalcRow(rowNumber);
  }, [recalcRow]);

  const recalculateRows = async (nextRows) => {
    setBusy(true); setError("");
    try {
      const pending = nextRows.filter((row) => row.status !== "IMPORTED")
        .map((row) => ({ ...sourceRow(row), discountPercentage: Number(row.discountPercentage || 0) }));
      const calculated = [];
      for (let offset = 0; offset < pending.length; offset += CHUNK_SIZE) {
        const response = await api.post("/store-inventory/bulk-upload/recalculate", { rows: pending.slice(offset, offset + CHUNK_SIZE) });
        calculated.push(...response.data.rows);
      }
      const checked = recheckRows(calculated).map((row, index) => {
        const errors = [...new Set([...row.errors, ...(calculated[index].errors || [])])];
        return { ...row, errors, status: errors.length ? "INVALID" : "VALID" };
      });
      const updated = new Map(checked.map((row) => [row.rowNumber, row]));
      refreshCounts(nextRows.map((row) => updated.get(row.rowNumber) || row));
      return true;
    } catch (requestError) {
      setError(errorMessage(requestError, "Prices could not be recalculated. Please retry."));
      return false;
    } finally { setBusy(false); }
  };

  const applyDiscountToAll = async () => {
    const discount = Number(allDiscount);
    if (allDiscount.trim() === "" || !Number.isFinite(discount) || discount < 0 || discount >= 100) {
      setError("Enter a discount from 0 up to, but not including, 100%.");
      return;
    }
    await recalculateRows(rows.map((row) => row.status === "IMPORTED" ? row : { ...row, discountPercentage: discount }));
  };

  const importRows = async () => {
    setConfirming(false); setBusy(true); setError(""); setProgress(30);
    let processed = 0;
    const summary = { importedRows: 0, failedRows: 0, createdRows: 0, updatedRows: 0 };
    let nextRows = [...rows];
    const rowsToImport = nextRows.filter((row) => row.status === "VALID");
    try {
      for (let offset = 0; offset < rowsToImport.length; offset += CHUNK_SIZE) {
        const chunk = rowsToImport.slice(offset, offset + CHUNK_SIZE);
        const response = await api.post("/store-inventory/bulk-upload/import", { rows: chunk });
        Object.keys(summary).forEach((key) => { summary[key] += Number(response.data?.[key] || 0); });
        const imported = new Map((response.data?.rows || []).map((row) => [row.rowNumber, row]));
        nextRows = nextRows.map((row) => imported.get(row.rowNumber) || row);
        processed += chunk.length;
        setProgress(rowsToImport.length ? 30 + Math.round((processed / rowsToImport.length) * 70) : 100);
        setPreview((current) => ({ ...(current || {}), rows: nextRows }));
      }
      const remainingRejected = nextRows.filter((row) => row.status !== "IMPORTED");
      summary.failedRows = Math.max(summary.failedRows, remainingRejected.length);
      setImportSummary(summary); setProgress(100);
      if (summary.importedRows > 0) {
        setLastRejectedRows(remainingRejected);
        setFile(null); setPreview(null); setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (requestError) {
      setError(`${errorMessage(requestError, "Import stopped.")} ${processed} row(s) were completed before it stopped.`);
    } finally { setBusy(false); }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get("/store-inventory/template", { responseType: "blob" });
      downloadBlob(response.data, "inventory-bulk-upload-template.xlsx");
    } catch (requestError) {
      setError(errorMessage(requestError, "Could not download the template."));
    }
  };

  const downloadRejected = async () => {
    try {
      const rowsToDownload = preview ? rejectedRows : lastRejectedRows;
      if (!rowsToDownload.length) { setError("There are no rejected rows to download."); return; }
      const response = await api.post("/store-inventory/bulk-upload/rejected/download", rowsToDownload, { responseType: "blob" });
      downloadBlob(response.data, "inventory-rejected-rows.xlsx");
    } catch (requestError) {
      setError(errorMessage(requestError, "Could not download rejected rows."));
    }
  };

  return (
    <section className="bulk-page-shell">
      <div className="bulk-page-shell__body">

        {/* ---- Title row ---- */}
        <div className="bulk-page-shell__title-row">
          {!hideTitle && (
            <div>
              <h2>Opening Stock</h2>
              <p>Select one receiving store, then upload stock without vendor or invoice details.</p>
            </div>
          )}
          <button type="button" className="bulk-page-shell__sample-btn" onClick={downloadTemplate}>
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

        {/* ---- Upload area (state-driven) ---- */}
        {/* One hidden input shared by every state */}
        <input
          id="bulk-file-input"
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          style={{ display: "none" }}
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />

        {!file ? (
          /* STATE 1: EMPTY -> medium dropzone */
          <label
            htmlFor="bulk-file-input"
            className="bulk-page-shell__dropzone bulk-page-shell__dropzone--empty"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              chooseFile(e.dataTransfer.files?.[0]);
            }}
          >
            <div className="bulk-page-shell__dropzone-icon">
              <UploadCloud size={22} />
            </div>
            <div className="bulk-page-shell__dropzone-title">
              Drag &amp; drop or{" "}
              <span className="bulk-page-shell__dropzone-browse">Browse file</span>
            </div>
            <div className="bulk-page-shell__dropzone-sub">CSV, XLS or XLSX · maximum 10 MB</div>
          </label>
        ) : (
          /* STATE 2 (busy) and STATE 3 (ready) -> same compact row */
          <div className={`bulk-file-bar${busy ? " is-uploading" : ""}`}>
            <FileSpreadsheet size={20} className="bulk-file-bar__icon" />
            <span className="bulk-file-bar__name" title={file.name}>{file.name}</span>

            {busy ? (
              <div className="bulk-file-bar__progress">
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
                <span className="bulk-file-bar__pct">{progress}%</span>
              </div>
            ) : (
              <span className="bulk-file-bar__spacer" />
            )}

            <div className="bulk-file-bar__actions">
              {!busy && (
                <button
                  type="button"
                  className="bulk-button bulk-button--secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change file
                </button>
              )}
              <button
                type="button"
                className="bulk-page-shell__remove-file"
                onClick={clearFile}
                disabled={busy}
                title={busy ? "Please wait until processing finishes" : "Remove file"}
              >
                <X size={15} />
                Remove
              </button>
              {!busy && (
                <button
                  type="button"
                  className="bulk-page-shell__primary"
                  disabled={!fixedStoreId}
                  onClick={previewFile}
                >
                  <Upload size={15} />
                  Preview file
                </button>
              )}
            </div>
          </div>
        )}

        {/* ---- Errors / summary ---- */}
        {error && <div className="bulk-alert bulk-alert--error">{error}</div>}

        {importSummary && (
          <div className="bulk-alert bulk-alert--success">
            Imported {importSummary.importedRows} row(s): {importSummary.createdRows} created and {importSummary.updatedRows} updated. Failed: {importSummary.failedRows}.
            {lastRejectedRows.length > 0 && (
              <button type="button" className="bulk-button bulk-button--secondary" onClick={downloadRejected}>
                <Download size={14} />
                Download rejected rows
              </button>
            )}
          </div>
        )}

        {/* ---- Preview (editable grid) ---- */}
        {preview && (
          <>
            <div className="bulk-preview-head" style={{ marginTop: 20, marginBottom: 10 }}>
              <h3>
                Import Preview <span className="bulk-preview-count">· {rows.length} rows</span>
              </h3>

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
                    disabled={busy || isCalculating || !rows.some((r) => r.status !== "IMPORTED")}
                    onClick={applyDiscountToAll}
                  >
                    Apply to all rows
                  </button>
                </div>

                <div className="bulk-preview-actions">
                  {rejectedRows.length > 0 && (
                    <button className="bulk-button bulk-button--secondary" type="button" onClick={downloadRejected}>
                      <Download size={14} /> Rejected rows
                    </button>
                  )}
                  <button
                    className="bulk-button bulk-button--primary"
                    type="button"
                    disabled={!validRows.length || busy || isCalculating}
                    onClick={() => setConfirming(true)}
                  >
                    Import {validRows.length} valid rows
                  </button>
                </div>
              </div>
            </div>

            <div className="bulk-table-wrap bulk-table-wrap--scroll">
              <table className="bulk-table bulk-edit-table">
                <thead>
                  <tr>
                    <th className="is-num col-serial">Sl. no.</th>
                    <th>Product</th>
                    <th className="col-store">Store</th>
                    <th className="is-num col-qty">Quantity</th>
                    <th className="is-num col-price">Purchase price</th>
                    <th className="is-num col-price">Selling price</th>
                    <th className="is-num col-price">MRP</th>
                    <th className="is-num col-small">Disc. %</th>
                    <th className="is-num col-small">GST %</th>
                    <th className="col-status">Status / reason</th>
                    <th className="is-actions" aria-label="Row actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <EditableRow
                      key={row.rowNumber}
                      row={row}
                      serial={index + 1}
                      busy={busy}
                      calculating={Boolean(calculating[row.rowNumber])}
                      onChange={updateCell}
                      onCommit={commitCell}
                      onRemove={removeRow}
                    />
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <div className="bulk-empty">No rows yet. Use Add row below.</div>}
            </div>

            <button
              type="button"
              className="bulk-button bulk-button--secondary bulk-add-row"
              onClick={addRow}
              disabled={busy}
            >
              <CirclePlus size={14} /> Add row
            </button>
          </>
        )}
      </div>

      {confirming && (
        <div className="bulk-modal-backdrop">
          <div className="bulk-modal bulk-modal--confirm" role="dialog" aria-modal="true">
            <h3>Import {validRows.length} validated rows?</h3>
            <p>This will create or update inventory and batches. Invalid and duplicate rows will remain unimported.</p>
            <div className="bulk-modal__actions">
              <button className="bulk-button bulk-button--secondary" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="bulk-button bulk-button--primary" disabled={isCalculating} onClick={importRows}>Confirm import</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}