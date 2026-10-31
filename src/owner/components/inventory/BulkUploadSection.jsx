import { useEffect, useRef, useState } from "react";
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
import BulkUploadShell from "./BulkUploadShell";

import "./BulkUploadSection.css";
import "./BulkUploadPriceSettings.css";

const CHUNK_SIZE = 100;
const PRICE_FIELDS = ["purchasePrice", "sellingPrice", "mrp"];
const hasValue = value => value !== null && value !== undefined && String(value).trim() !== "";

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
  const legacy = { MRP: "mrp", PURCHASE_PRICE: "purchasePrice", SELLING_PRICE: "sellingPrice" }[row.priceSource];
  const fields = Array.isArray(row.enteredPriceFields) ? row.enteredPriceFields :
    legacy ? [legacy] : PRICE_FIELDS.filter(field => hasValue(row[field]));
  next.enteredPriceFields = [...fields];
  PRICE_FIELDS.forEach(field => { if (!fields.includes(field)) next[field] = null; });
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
  if (entered === 0) errors.push("Enter at least one price; missing prices are calculated");
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
    if (source.status === "IMPORTED") {
      if (source.storeId && source.partNumber) keys.set(
        source.storeId + ":" + String(source.partNumber).trim().toUpperCase(), source.rowNumber);
      return source;
    }
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

export default function BulkUploadSection({ onClose, hideTitle = false }) {
  const user = currentUser();
  const [allDiscount, setAllDiscount] = useState("");
  const workInProgress = useRef(false);
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
  const [filter, setFilter] = useState("ALL");
  const [editing, setEditing] = useState(null);
  const activeCell = useRef(null);
  const latestRows = useRef([]);
  const dirtyRows = useRef(new Set());
  const [confirming, setConfirming] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [lastRejectedRows, setLastRejectedRows] = useState([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api
      .get("/stores", { params: { page: 0, size: 100, active: true } })
      .then(({ data }) => setStores(Array.isArray(data?.content) ? data.content : []))
      .catch(() => setError("Unable to load stores."));
  }, [isSuperAdmin]);

  const rows = preview?.rows || [];
  useEffect(() => { latestRows.current = preview?.rows || []; }, [preview]);
  const visibleRows = filter === "ALL" ? rows : rows.filter((row) => row.status === filter || row.rowNumber === editing?.rowNumber);
  const validRows = rows.filter((row) => row.status === "VALID");
  const rejectedRows = rows.filter((row) => !["VALID", "IMPORTED"].includes(row.status));

  const refreshCounts = (nextRows) => {
    latestRows.current = nextRows;
    setPreview((current) => ({
      ...(current || {}),
      rows: nextRows,
      totalRows: nextRows.length,
      validRows: nextRows.filter((row) => row.status === "VALID").length,
      invalidRows: nextRows.filter((row) => !["VALID", "IMPORTED"].includes(row.status)).length,
      duplicateRows: nextRows.filter((row) => row.status === "DUPLICATE_IN_FILE").length,
    }));
  };

  const previewFile = async () => {
    if (workInProgress.current) return;
    if (!file) { setError("Choose a CSV, XLS, or XLSX file first."); return; }
    if (!fixedStoreId) { setError("Select the store that will receive this opening stock."); return; }
    workInProgress.current = true;
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
      dirtyRows.current.clear(); activeCell.current = null; setEditing(null);
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
    setFile(null); setPreview(null); setProgress(0); setError("");
    setImportSummary(null); setLastRejectedRows([]); setFilter("ALL"); setEditing(null); setConfirming(false);
    dirtyRows.current.clear(); activeCell.current = null;
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
    setFilter("ALL");
    requestAnimationFrame(() => document.getElementById(`bulk-cell-${nextRowNumber}-partNumber`)?.focus());
  };

  const removeRow = (rowNumber) => {
    dirtyRows.current.delete(rowNumber);
    const nextRows = rows.filter((row) => row.rowNumber !== rowNumber);
    refreshCounts(recheckRows(nextRows));
  };

  const updateRowField = (rowNumber, field, value) => {
    const nextRows = latestRows.current.map(current => {
      if (current.rowNumber !== rowNumber || current.status === "IMPORTED") return current;
      const next = { ...current, [field]: value };
      if (PRICE_FIELDS.includes(field)) {
        // Once all prices are displayed, editing one makes the others fixed inputs.
        // Automatic calculation starts again after Clear Prices (or all three blanks).
        const fields = new Set(PRICE_FIELDS.every(key => hasValue(current[key]))
          ? PRICE_FIELDS : sourceRow(current).enteredPriceFields);
        if (hasValue(value)) fields.add(field); else fields.delete(field);
        next.enteredPriceFields = [...fields];
        next.priceSource = fields.size === 3 ? "MANUAL" : fields.size === 2 ? "PARTIAL" : null;
      }
      dirtyRows.current.add(rowNumber);
      const errors = validateEditedRow(next);
      return { ...next, status: "INVALID", errors: errors.length ? errors : ["Pending validation"] };
    });
    refreshCounts(nextRows);
  };

  const recalculateRows = async (nextRows, rowNumber = null) => {
    if (workInProgress.current) return null;
    workInProgress.current = true;
    setBusy(true); setError("");
    try {
      const pending = nextRows.filter((row) => row.status !== "IMPORTED" && (rowNumber === null || row.rowNumber === rowNumber))
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
      const merged = nextRows.map((row) => updated.get(row.rowNumber) || row);
      const duplicateChecks = recheckRows(merged);
      refreshCounts(merged.map((row, index) => {
        if (row.status === "IMPORTED") return row;
        const duplicates = duplicateChecks[index].errors.filter(message => message.startsWith("Duplicate"));
        const errors = [...new Set([...(row.errors || []).filter(message => !message.startsWith("Duplicate")), ...duplicates])];
        return { ...row, errors, status: duplicates.length ? "DUPLICATE_IN_FILE" : errors.length ? "INVALID" : "VALID" };
      }));
      updated.forEach((_, number) => dirtyRows.current.delete(number));
      return updated;
    } catch (requestError) {
      setError(errorMessage(requestError, "Prices could not be recalculated. Please retry."));
      return null;
    } finally { workInProgress.current = false; setBusy(false); }
  };

  const finishCell = async () => {
    const cell = activeCell.current;
    activeCell.current = null;
    setEditing(null);
    if (cell && dirtyRows.current.has(cell.rowNumber)) await recalculateRows(latestRows.current, cell.rowNumber);
  };

  const renderCell = (row, field) => {
    const label = editableFields.find(([key]) => key === field)[1];
    const numeric = ["quantity", ...PRICE_FIELDS, "gstPercentage", "discountPercentage"].includes(field);
    return <input id={`bulk-cell-${row.rowNumber}-${field}`} className="bulk-inline-cell"
      aria-label={`${label}, row ${row.rowNumber}`} title={label}
      type={numeric ? "number" : "text"} min={numeric ? "0" : undefined}
      step={numeric && field !== "quantity" ? "0.01" : undefined}
      value={row[field] ?? ""} placeholder={label} disabled={busy || row.status === "IMPORTED"}
      onFocus={() => {
        activeCell.current = { rowNumber: row.rowNumber, original: { ...row }, wasDirty: dirtyRows.current.has(row.rowNumber) };
        setEditing({ rowNumber: row.rowNumber, field });
      }}
      onChange={event => updateRowField(row.rowNumber, field, event.target.value)}
      onBlur={event => {
        // Let Tab move between cells before calculating missing prices for the row.
        if (event.relatedTarget?.matches("input.bulk-inline-cell")
            && event.currentTarget.closest("tr")?.contains(event.relatedTarget)) return;
        finishCell();
      }}
      onKeyDown={event => {
        if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
        if (event.key === "Escape") {
          event.preventDefault();
          const cell = activeCell.current;
          if (cell) {
            refreshCounts(latestRows.current.map(current => current.rowNumber === cell.rowNumber ? cell.original : current));
            if (!cell.wasDirty) dirtyRows.current.delete(cell.rowNumber);
          }
          activeCell.current = null; setEditing(null); event.currentTarget.blur();
        }
      }} />;
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
    if (workInProgress.current || !validRows.length) return;
    workInProgress.current = true;
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
      setLastRejectedRows(remainingRejected);
      // Keep rejected rows editable; IMPORTED rows stay locked and are excluded
      // from every later recalculation/import. Uncorrected rows block only themselves.
      refreshCounts(nextRows);
      setFilter("ALL"); setEditing(null);
      if (remainingRejected.length === 0 && summary.importedRows > 0) {
        setFile(null); setPreview(null); setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (requestError) {
      setError(`${errorMessage(requestError, "Import stopped.")} ${processed} row(s) were completed before it stopped.`);
    } finally { workInProgress.current = false; setBusy(false); }
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

       <BulkUploadShell
          title="Opening Stock"
          subtitle="Select one receiving store, then upload stock without vendor or invoice details."
          hideTitle={hideTitle}
          onSample={downloadTemplate}
          topSlot={
            isSuperAdmin && (
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
            )
          }
          file={file}
          fileInputRef={fileInputRef}
          busy={busy}
          onFile={(chosen) => {
            if (workInProgress.current) return;
            setFile(chosen);
            setPreview(null);
            setImportSummary(null);
            setLastRejectedRows([]);
            setProgress(0);
            setError("");
          }}
          progress={progress}
          onRemoveFile={clearFile}
          notices={
            <>
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
            </>
          }
          onCancel={onClose || (() => {})}
          onSubmit={previewFile}
          submitDisabled={!file || !fixedStoreId || busy}
          submitLabel={busy && !preview ? "Reading..." : "Preview file"}
        />

        {preview && (
          <>
            {/* Import summary */}
            <div className="bulk-kpis" role="group" aria-label="Import summary">
              <button type="button" className={`bulk-kpi bulk-kpi--total${filter === "ALL" ? " is-active" : ""}`} aria-pressed={filter === "ALL"} onClick={() => setFilter("ALL")}>
                <strong>{rows.length}</strong>
                <span>Total rows</span>
              </button>
              <button type="button" className={`bulk-kpi bulk-kpi--ready${filter === "VALID" ? " is-active" : ""}`} aria-pressed={filter === "VALID"} onClick={() => setFilter("VALID")}>
                <strong>{validRows.length}</strong>
                <span>Ready</span>
              </button>
              <button type="button" className={`bulk-kpi bulk-kpi--invalid${filter === "INVALID" ? " is-active" : ""}`} aria-pressed={filter === "INVALID"} onClick={() => setFilter("INVALID")}>
                <strong>{rows.filter((r) => r.status === "INVALID").length}</strong>
                <span>Invalid</span>
              </button>
              <button type="button" className={`bulk-kpi bulk-kpi--duplicate${filter === "DUPLICATE_IN_FILE" ? " is-active" : ""}`} aria-pressed={filter === "DUPLICATE_IN_FILE"} onClick={() => setFilter("DUPLICATE_IN_FILE")}>
                <strong>{rows.filter((r) => r.status === "DUPLICATE_IN_FILE").length}</strong>
                <span>Duplicates</span>
              </button>
              <button type="button" className={`bulk-kpi bulk-kpi--imported${filter === "IMPORTED" ? " is-active" : ""}`} aria-pressed={filter === "IMPORTED"} onClick={() => setFilter("IMPORTED")}>
                <strong>{rows.filter((r) => r.status === "IMPORTED").length}</strong>
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
                    disabled={busy || !rows.some((r) => r.status !== "IMPORTED")}
                    onClick={applyDiscountToAll}
                  >
                    Apply to all rows
                  </button>
                </div>

                <div className="bulk-preview-actions">
                  <button className="bulk-button bulk-button--secondary" type="button" disabled={busy} onClick={addRow}>
                    <CirclePlus size={14} /> Add row
                  </button>
                  {rejectedRows.length > 0 && (
                    <button className="bulk-button bulk-button--secondary" type="button" onClick={downloadRejected}>
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
            <div className="bulk-table-wrap" tabIndex={0} role="region" aria-label="Opening stock preview rows">
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
                        {renderCell(row, "itemName")}
                        {renderCell(row, "partNumber")}
                        {renderCell(row, "brandName")}
                        <details className="bulk-inline-details">
                          <summary>HSN / Rack</summary>
                          {renderCell(row, "hsnCode")}
                          {renderCell(row, "rackNumber")}
                        </details>
                      </td>
                      <td className="is-store">{row.storeName || row.storeCode || "-"}</td>
                      <td className="is-num">{renderCell(row, "quantity")}</td>
                      <td className="is-num">{renderCell(row, "purchasePrice")}</td>
                      <td className="is-num">{renderCell(row, "sellingPrice")}</td>
                      <td className="is-num">{renderCell(row, "mrp")}</td>
                      <td className="is-mode">{row.priceSource === "MANUAL" ? "Prices preserved" : row.priceSource === "PARTIAL" ? "Two entered + calculated" : "Calculated"}
                        <button type="button" className="bulk-inline-clear" disabled={busy || row.status === "IMPORTED"}
                          aria-label={`Clear prices, row ${row.rowNumber}`} onClick={() => {
                            dirtyRows.current.add(row.rowNumber);
                            refreshCounts(latestRows.current.map(current => current.rowNumber === row.rowNumber
                              ? { ...current, purchasePrice: "", sellingPrice: "", mrp: "", priceSource: null,
                                enteredPriceFields: [], status: "INVALID", errors: ["Enter at least one price; missing prices are calculated"] }
                              : current));
                            setFilter("ALL");
                          }}>Clear Prices</button>
                      </td>
                      <td className="is-num">{renderCell(row, "discountPercentage")}</td>
                      <td className="is-num">{row.discountAmount ?? "-"}</td>
                      <td className="is-num">{row.lineTotal ?? "-"}</td>
                      <td className="is-num">{renderCell(row, "gstPercentage")}%</td>
                      <td><span className="bulk-tag">{row.productMatch || "-"}</span></td>
                      <td className="is-status">
                        <span className={`bulk-status bulk-status--${row.status?.toLowerCase()}`}>
                          {row.status?.replaceAll("_", " ")}
                        </span>
                        {row.errors?.length > 0 && <small title={row.errors.join("; ")}>{row.errors.join("; ")}</small>}
                      </td>
                      <td className="is-actions">
                        <div className="bulk-row-actions">
                          <button className="bulk-icon" type="button" title="Remove row" aria-label={`Remove row ${row.rowNumber}`} disabled={busy || row.status === "IMPORTED"} onClick={() => removeRow(row.rowNumber)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleRows.length === 0 && <div className="bulk-empty">No rows match this filter.</div>}
            </div>
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
              <button className="bulk-button bulk-button--primary" disabled={busy || !validRows.length} onClick={importRows}>Confirm import</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
