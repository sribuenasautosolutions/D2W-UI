import { useState } from "react";
import { Download, FileSpreadsheet, Pencil, Upload, X } from "lucide-react";
import api from "../../../services/api";
import "./BulkUploadSection.css";
import "./BulkUploadPriceSettings.css";

const CHUNK_SIZE = 100;
const editableFields = [
  ["partNumber", "Part Number"], ["itemName", "Item Name"], ["brandName", "Brand"],
  ["quantity", "Qty"], ["purchasePrice", "Purchase Price"], ["sellingPrice", "Selling Price"],
  ["mrp", "MRP"], ["hsnCode", "HSN Code"], ["rackNumber", "Rack No."],
];

function currentUser() {
  try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
}

function errorMessage(error, fallback) {
  const body = error?.response?.data;
  return body?.message || body?.error || (typeof body === "string" ? body : "") || fallback;
}

function sellingPriceFromMrp(mrpValue, priceMode, gstValue) {
  const mrp = Number(mrpValue);
  const gst = Number(gstValue);
  if (!Number.isFinite(mrp) || mrp <= 0) return "";
  if (priceMode === "GST_INCLUSIVE") return mrp.toFixed(2);
  return (mrp / (1 + (Number.isFinite(gst) ? gst : 0) / 100)).toFixed(2);
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

function validateEditedRow(row) {
  const errors = [];
  if (String(row.partNumber || "").trim().toUpperCase() === "ABC123"
      && String(row.itemName || "").trim().toLowerCase() === "brake pad set") {
    errors.push("Template sample row must be replaced with a real product before import");
  }
  if (!row.storeId) errors.push("Valid store is required");
  if (!String(row.partNumber || "").trim()) errors.push("Part Number is required");
  if (!String(row.itemName || "").trim()) errors.push("Item Name is required");
  if (!String(row.brandName || "").trim()) errors.push("Brand is required");
  if (!Number.isInteger(Number(row.quantity)) || Number(row.quantity) <= 0) errors.push("Quantity must be a whole number above zero");
  if (row.purchasePrice === "" || Number(row.purchasePrice) < 0) errors.push("Purchase Price is required and cannot be negative");
  if (Number(row.sellingPrice) <= 0) errors.push("Selling Price must be greater than zero");
  if (Number(row.mrp) <= 0) errors.push("MRP must be greater than zero");
  if (Number(row.purchasePrice) > Number(row.sellingPrice)) errors.push("Purchase Price cannot exceed Selling Price");
  if (Number(row.sellingPrice) > Number(row.mrp)) errors.push("Selling Price cannot exceed MRP");
  if (row.hsnCode && !/^\d{4,8}$/.test(String(row.hsnCode).trim())) errors.push("HSN Code must contain 4 to 8 digits");
  return errors;
}

function recheckRows(rows) {
  const keys = new Map();
  return rows.map((source) => {
    const row = { ...source, sampleRow: false };
    const errors = validateEditedRow(row);
    const key = `${row.storeId || ""}:${String(row.partNumber || "").trim().toUpperCase()}`;
    if (row.storeId && row.partNumber && keys.has(key)) errors.push("Duplicate store and part number in this file");
    else if (row.storeId && row.partNumber) keys.set(key, row.rowNumber);
    return { ...row, errors, status: errors.some((item) => item.startsWith("Duplicate")) ? "DUPLICATE_IN_FILE" : errors.length ? "INVALID" : "VALID" };
  });
}

export default function BulkUploadSection() {
  const user = currentUser();
  const fixedStoreId = user.storeId || null;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [priceMode, setPriceMode] = useState("GST_INCLUSIVE");
  const [gstPercentage, setGstPercentage] = useState("18");

  const rows = preview?.rows || [];
  const visibleRows = filter === "ALL" ? rows : rows.filter((row) => row.status === filter);
  const validRows = rows.filter((row) => row.status === "VALID");
  const rejectedRows = rows.filter((row) => !["VALID", "IMPORTED"].includes(row.status));

  const refreshCounts = (nextRows) => setPreview((current) => ({
    ...(current || {}), rows: nextRows, totalRows: nextRows.length,
    validRows: nextRows.filter((row) => row.status === "VALID").length,
    invalidRows: nextRows.filter((row) => row.status !== "VALID").length,
    duplicateRows: nextRows.filter((row) => row.status === "DUPLICATE_IN_FILE").length,
  }));

  const previewFile = async () => {
    if (!file) { setError("Choose a CSV, XLS, or XLSX file first."); return; }
    setBusy(true); setError(""); setPreview(null); setImportSummary(null); setProgress(2);
    try {
      const data = new FormData();
      data.append("file", file);
      if (fixedStoreId) data.append("storeId", fixedStoreId);
      const response = await api.post("/store-inventory/bulk-upload/preview", data, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: ({ loaded, total }) => total && setProgress(Math.max(2, Math.round((loaded / total) * 25))),
      });
      setPreview(response.data); setProgress(30);
    } catch (requestError) {
      setProgress(0); setError(errorMessage(requestError, "The file could not be previewed."));
    } finally { setBusy(false); }
  };

  const removeRow = (rowNumber) => refreshCounts(recheckRows(rows.filter((row) => row.rowNumber !== rowNumber)));

  const applyPricing = (nextMode, nextGst) => {
    setPriceMode(nextMode);
    setGstPercentage(nextGst);
    refreshCounts(recheckRows(rows.map((row) => ({
      ...row,
      sellingPrice: sellingPriceFromMrp(row.mrp, nextMode, nextGst),
    }))));
  };

  const saveEditedRow = () => {
    const editedRow = { ...editing };
    const next = rows.map((row) => row.rowNumber === editing.rowNumber ? { ...row, ...editedRow } : row);
    refreshCounts(recheckRows(next));
    setEditing(null);
  };

  const importRows = async () => {
    setConfirming(false); setBusy(true); setError(""); setProgress(30);
    let processed = 0;
    const summary = { importedRows: 0, failedRows: 0, createdRows: 0, updatedRows: 0 };
    let nextRows = [...rows];
    try {
      for (let offset = 0; offset < validRows.length; offset += CHUNK_SIZE) {
        const chunk = validRows.slice(offset, offset + CHUNK_SIZE);
        const response = await api.post("/store-inventory/bulk-upload/import", { rows: chunk });
        Object.keys(summary).forEach((key) => { summary[key] += Number(response.data[key] || 0); });
        const imported = new Map((response.data.rows || []).map((row) => [row.rowNumber, row]));
        nextRows = nextRows.map((row) => imported.get(row.rowNumber) || row);
        processed += chunk.length;
        setProgress(30 + Math.round((processed / validRows.length) * 70));
        setPreview((current) => ({ ...current, rows: nextRows }));
      }
      setImportSummary(summary); setProgress(100);
    } catch (requestError) {
      setError(`${errorMessage(requestError, "Import stopped.")} ${processed} row(s) were completed before it stopped.`);
    } finally { setBusy(false); }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get("/store-inventory/template", { params: { storeManager: Boolean(fixedStoreId) }, responseType: "blob" });
      downloadBlob(response.data, "inventory-bulk-upload-template.xlsx");
    } catch (requestError) { setError(errorMessage(requestError, "Could not download the template.")); }
  };

  const downloadRejected = async () => {
    try {
      const response = await api.post("/store-inventory/bulk-upload/rejected/download", rejectedRows, { responseType: "blob" });
      downloadBlob(response.data, "inventory-rejected-rows.xlsx");
    } catch (requestError) { setError(errorMessage(requestError, "Could not download rejected rows.")); }
  };

  return (
    <section className="bulk-workflow">
      <div className="bulk-workflow__toolbar">
        <div><h2>Bulk Stock Receipt</h2><p>Preview, correct, and validate rows before inventory is updated.</p></div>
        <button className="bulk-button bulk-button--secondary" type="button" onClick={downloadTemplate}><Download size={15} /> Sample file</button>
      </div>

      <div className="bulk-filebar">
        <label className="bulk-filepicker"><FileSpreadsheet size={19} /><span>{file?.name || "Choose CSV, XLS, or XLSX"}</span>
          <input type="file" accept=".csv,.xls,.xlsx" onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null); setProgress(0); setError(""); }} />
        </label>
        <button className="bulk-button bulk-button--primary" type="button" disabled={!file || busy} onClick={previewFile}><Upload size={15} /> {busy && !preview ? "Reading..." : "Preview file"}</button>
      </div>

      {(progress > 0 || busy) && <div className="bulk-progress" aria-label={`Upload progress ${progress}%`}><span style={{ width: `${progress}%` }} /></div>}
      {error && <div className="bulk-alert bulk-alert--error">{error}</div>}
      {importSummary && <div className="bulk-alert bulk-alert--success">Imported {importSummary.importedRows} row(s): {importSummary.createdRows} created and {importSummary.updatedRows} updated. Failed: {importSummary.failedRows}.</div>}

      {preview && <>
        <div className="bulk-kpis">
          <button className={filter === "ALL" ? "is-active" : ""} onClick={() => setFilter("ALL")}><strong>{rows.length}</strong><span>Total rows</span></button>
          <button className={filter === "VALID" ? "is-active" : ""} onClick={() => setFilter("VALID")}><strong className="text-success">{validRows.length}</strong><span>Ready</span></button>
          <button className={filter === "INVALID" ? "is-active" : ""} onClick={() => setFilter("INVALID")}><strong className="text-danger">{rows.filter((row) => row.status === "INVALID").length}</strong><span>Invalid</span></button>
          <button className={filter === "DUPLICATE_IN_FILE" ? "is-active" : ""} onClick={() => setFilter("DUPLICATE_IN_FILE")}><strong className="text-warning">{rows.filter((row) => row.status === "DUPLICATE_IN_FILE").length}</strong><span>Duplicates</span></button>
          <button className={filter === "IMPORTED" ? "is-active" : ""} onClick={() => setFilter("IMPORTED")}><strong>{rows.filter((row) => row.status === "IMPORTED").length}</strong><span>Imported</span></button>
        </div>

        <div className="bulk-preview-head"><div><h3>Import Preview</h3><span>Click the pencil to edit a row. Changes are revalidated before import.</span></div><div className="bulk-preview-actions">
          <label className="bulk-header-setting"><span>Pricing</span><select value={priceMode} onChange={(event) => applyPricing(event.target.value, gstPercentage)}><option value="GST_INCLUSIVE">With GST</option><option value="GST_EXCLUSIVE">Without GST</option></select></label>
          <label className="bulk-header-setting bulk-header-gst"><span>GST</span><input type="number" min="0" max="100" value={gstPercentage} onChange={(event) => applyPricing(priceMode, event.target.value)} /><b>%</b></label>
          {rejectedRows.length > 0 && <button className="bulk-button bulk-button--secondary" onClick={downloadRejected}><Download size={14} /> Rejected rows</button>}
          <button className="bulk-button bulk-button--primary" disabled={!validRows.length || busy} onClick={() => setConfirming(true)}>Import {validRows.length} valid rows</button>
        </div></div>

        <div className="bulk-table-wrap"><table className="bulk-table"><thead><tr><th>Row</th><th>Product</th><th>Store</th><th>Qty</th><th>Purchase</th><th>Selling</th><th>MRP</th><th>Match</th><th>Status / reason</th><th /></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td><strong>{row.itemName || "-"}</strong><span>{row.partNumber || "No part number"} | {row.brandName || "No brand"}</span></td><td>{row.storeName || row.storeCode || "-"}</td><td>{row.quantity ?? "-"}</td><td>{row.purchasePrice ?? "-"}</td><td>{row.sellingPrice ?? "-"}</td><td>{row.mrp ?? "-"}</td><td><span className="bulk-tag">{row.productMatch || "-"}</span></td><td><span className={`bulk-status bulk-status--${row.status?.toLowerCase()}`}>{row.status?.replaceAll("_", " ")}</span>{row.errors?.length > 0 && <small title={row.errors.join("; ")}>{row.errors.join("; ")}</small>}</td><td><button className="bulk-icon" title="Edit row" onClick={() => setEditing(row)}><Pencil size={14} /></button></td></tr>)}</tbody>
        </table>{visibleRows.length === 0 && <div className="bulk-empty">No rows match this filter.</div>}</div>
      </>}

      {editing && <div className="bulk-modal-backdrop"><div className="bulk-modal" role="dialog" aria-modal="true"><div className="bulk-modal__head"><div><h3>Edit row {editing.rowNumber}</h3><span>All values will be validated again.</span></div><button className="bulk-icon" onClick={() => setEditing(null)}><X size={18} /></button></div>
      <div className="bulk-edit-grid">
        {editableFields.map(([field, label]) => <label key={field}><span>{label}</span><input type={["quantity", "purchasePrice", "sellingPrice", "mrp"].includes(field) ? "number" : "text"} value={editing[field] ?? ""} onChange={(event) => {
          const value = event.target.value;
          setEditing((current) => ({
            ...current,
            [field]: value,
            ...(field === "mrp" ? { sellingPrice: sellingPriceFromMrp(value, priceMode, gstPercentage) } : {}),
          }));
        }} /></label>)}
      </div><div className="bulk-modal__actions"><button className="bulk-button bulk-button--danger" onClick={() => { removeRow(editing.rowNumber); setEditing(null); }}>Remove row</button><button className="bulk-button bulk-button--secondary" onClick={() => setEditing(null)}>Cancel</button><button className="bulk-button bulk-button--primary" onClick={saveEditedRow}>Save row</button></div></div></div>}

      {confirming && <div className="bulk-modal-backdrop"><div className="bulk-modal bulk-modal--confirm" role="dialog" aria-modal="true"><h3>Import {validRows.length} validated rows?</h3><p>This will create or update inventory and batches. Invalid and duplicate rows will remain unimported.</p><div className="bulk-modal__actions"><button className="bulk-button bulk-button--secondary" onClick={() => setConfirming(false)}>Cancel</button><button className="bulk-button bulk-button--primary" onClick={importRows}>Confirm import</button></div></div></div>}
    </section>
  );
}
