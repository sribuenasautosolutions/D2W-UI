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

import "./BulkUploadSection.css";
import "./BulkUploadPriceSettings.css";

const CHUNK_SIZE = 100;

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
  const [filter, setFilter] = useState("ALL");
  const [editing, setEditing] = useState(null);
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
  const visibleRows = filter === "ALL" ? rows : rows.filter((row) => row.status === filter);
  const validRows = rows.filter((row) => row.status === "VALID");
  const rejectedRows = rows.filter((row) => !["VALID", "IMPORTED"].includes(row.status));

  const refreshCounts = (nextRows) => {
    setPreview((current) => ({
      ...(current || {}),
      rows: nextRows,
      totalRows: nextRows.length,
      validRows: nextRows.filter((row) => row.status === "VALID").length,
      invalidRows: nextRows.filter((row) => row.status !== "VALID").length,
      duplicateRows: nextRows.filter((row) => row.status === "DUPLICATE_IN_FILE").length,
    }));
  };

  const previewFile = async () => {
    if (!file) { setError("Choose a CSV, XLS, or XLSX file first."); return; }
    if (!fixedStoreId) { setError("Select the store that will receive this opening stock."); return; }
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
    setFile(null); setPreview(null); setProgress(0); setError("");
    setImportSummary(null); setLastRejectedRows([]); setFilter("ALL"); setEditing(null); setConfirming(false);
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
      if (["purchasePrice", "sellingPrice", "mrp"].includes(field) && current.priceSource !== "MANUAL") {
        next.purchasePrice = ""; next.sellingPrice = ""; next.mrp = "";
        next[field] = value;
        next.priceSource = { purchasePrice: "PURCHASE_PRICE", sellingPrice: "SELLING_PRICE", mrp: "MRP" }[field];
      }
      return next;
    });
  };

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

  const saveEditedRow = async () => {
    if (!editing || busy) return;
    if (await recalculateRows(rows.map((row) => row.rowNumber === editing.rowNumber ? editing : row))) setEditing(null);
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
        setFile(null); setPreview(null); setFilter("ALL"); setEditing(null); setProgress(0);
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

        {/* ---- Dropzone ---- */}
        <label
          className={`bulk-page-shell__dropzone${file ? " has-file" : ""}${busy ? " is-busy" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
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
            accept=".csv,.xls,.xlsx"
            style={{ display: "none" }}
            onChange={(event) => {
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
              <div className="bulk-page-shell__dropzone-sub">Click to choose a different file</div>
            </>
          ) : (
            <>
              <div className="bulk-page-shell__dropzone-title">Drop the file here</div>
              <div className="bulk-page-shell__dropzone-sub">CSV, XLS or XLSX · maximum 10 MB</div>
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
            Imported {importSummary.importedRows} row(s): {importSummary.createdRows} created and {importSummary.updatedRows} updated. Failed: {importSummary.failedRows}.
            {lastRejectedRows.length > 0 && (
              <button type="button" className="bulk-button bulk-button--secondary" onClick={downloadRejected}>
                <Download size={14} />
                Download rejected rows
              </button>
            )}
          </div>
        )}

        {/* ---- Footer ---- */}
        <div className="bulk-page-shell__footer">
          <button type="button" className="bulk-page-shell__cancel" onClick={onClose || (() => {})}>
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
                  <button className="bulk-button bulk-button--secondary" type="button" onClick={addRow}>
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
                        <span>{row.partNumber || "No part number"} | {row.brandName || "No brand"}</span>
                      </td>
                      <td className="is-store">{row.storeName || row.storeCode || "-"}</td>
                      <td className="is-num">{row.quantity ?? "-"}</td>
                      <td className="is-num">{row.purchasePrice ?? "-"}</td>
                      <td className="is-num">{row.sellingPrice ?? "-"}</td>
                      <td className="is-num">{row.mrp ?? "-"}</td>
                      <td className="is-mode">{row.priceSource === "MANUAL" ? "All three prices" : "Calculated"}</td>
                      <td className="is-num">{row.discountPercentage ?? 0}%</td>
                      <td className="is-num">{row.discountAmount ?? "-"}</td>
                      <td className="is-num">{row.lineTotal ?? "-"}</td>
                      <td className="is-num">{row.gstPercentage ?? "-"}%</td>
                      <td><span className="bulk-tag">{row.productMatch || "-"}</span></td>
                      <td className="is-status">
                        <span className={`bulk-status bulk-status--${row.status?.toLowerCase()}`}>
                          {row.status?.replaceAll("_", " ")}
                        </span>
                        {row.errors?.length > 0 && <small title={row.errors.join("; ")}>{row.errors.join("; ")}</small>}
                      </td>
                      <td className="is-actions">
                        <div className="bulk-row-actions">
                          <button className="bulk-icon" type="button" title="Edit row" aria-label={`Edit row ${row.rowNumber}`} disabled={busy || row.status === "IMPORTED"} onClick={() => setEditing(sourceRow(row))}>
                            <Pencil size={14} />
                          </button>
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

      {/* ---- Edit modal (unchanged) ---- */}
      {editing && (
        <div className="bulk-modal-backdrop">
          <div className="bulk-modal" role="dialog" aria-modal="true">
            <div className="bulk-modal__head">
              <div>
                <h3>Edit row {editing.rowNumber}</h3>
                <span>Enter one price to calculate the rest, or choose all three prices to keep your own values.</span>
              </div>
              <button className="bulk-icon" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>

            <label style={{ display: "block", marginBottom: 16 }}>
              Pricing mode
              <select
                value={editing.priceSource === "MANUAL" ? "MANUAL" : "AUTO"}
                disabled={busy}
                onChange={(event) => setEditing((current) => event.target.value === "MANUAL"
                  ? { ...current, priceSource: "MANUAL" }
                  : { ...current, priceSource: null, purchasePrice: "", sellingPrice: "", mrp: "" })}
              >
                <option value="AUTO">Calculate from one price</option>
                <option value="MANUAL">Use all three prices</option>
              </select>
              <p>Purchase price is final cost including GST and discount. Selling price excludes GST. MRP includes GST. Manual prices are not reduced again by Discount %.</p>
            </label>

            <div className="bulk-edit-grid">
              {editableFields.map(([field, label]) => (
                <label key={field}>
                  <span>{label}</span>
                  <input
                    type={["quantity", "purchasePrice", "sellingPrice", "mrp", "gstPercentage", "discountPercentage"].includes(field) ? "number" : "text"}
                    min={["quantity", "purchasePrice", "sellingPrice", "mrp", "gstPercentage", "discountPercentage"].includes(field) ? "0" : undefined}
                    step={["purchasePrice", "sellingPrice", "mrp", "gstPercentage", "discountPercentage"].includes(field) ? "0.01" : undefined}
                    value={editing[field] ?? ""}
                    onChange={(event) => updateEditingField(field, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="bulk-modal__actions">
              <button className="bulk-button bulk-button--danger" onClick={() => { removeRow(editing.rowNumber); setEditing(null); }}>
                Remove row
              </button>
              <button className="bulk-button bulk-button--secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="bulk-button bulk-button--primary" onClick={saveEditedRow}>
                {busy ? "Calculating..." : "Save row"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <div className="bulk-modal-backdrop">
          <div className="bulk-modal bulk-modal--confirm" role="dialog" aria-modal="true">
            <h3>Import {validRows.length} validated rows?</h3>
            <p>This will create or update inventory and batches. Invalid and duplicate rows will remain unimported.</p>
            <div className="bulk-modal__actions">
              <button className="bulk-button bulk-button--secondary" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="bulk-button bulk-button--primary" onClick={importRows}>Confirm import</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}