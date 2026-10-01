import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, Eye, Pencil, Save, Upload, X } from "lucide-react";
import api from "../../../services/api";

const today = () => new Date().toISOString().slice(0, 10);

export default function VendorStockModal({ vendor, onClose }) {
    const [tab, setTab] = useState("stock");
    const [current, setCurrent] = useState(null);
    const [history, setHistory] = useState([]);
    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);
    const [validFrom, setValidFrom] = useState(today());
    const [validUntil, setValidUntil] = useState(today());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [editing, setEditing] = useState(false);
    const [historyDetail, setHistoryDetail] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [stockResponse, historyResponse] = await Promise.all([
                api.get(`/api/vendor-stock-uploads/vendors/${vendor.id}/current`),
                api.get(`/api/vendor-stock-uploads/vendors/${vendor.id}/history`),
            ]);
            setCurrent(stockResponse.data);
            setHistory(Array.isArray(historyResponse.data) ? historyResponse.data : []);
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Unable to load vendor stock" });
        } finally {
            setLoading(false);
        }
    }, [vendor.id]);

    useEffect(() => { loadData(); }, [loadData]);

    const downloadSample = async () => {
        try {
            const response = await api.get("/api/vendor-stock-uploads/sample", { responseType: "blob" });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement("a");
            link.href = url; link.download = "vendor-stock-sample.xlsx"; link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Unable to download sample" });
        }
    };

    const uploadPreview = async () => {
        if (!file) return setMessage({ type: "error", text: "Choose an Excel or CSV file" });
        if (!validFrom || !validUntil) return setMessage({ type: "error", text: "Select both validity dates" });
        setSaving(true); setMessage(null);
        try {
            const form = new FormData();
            form.append("vendorId", vendor.id);
            form.append("validFrom", validFrom);
            form.append("validUntil", validUntil);
            form.append("file", file);
            const response = await api.post("/api/vendor-stock-uploads/preview", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setPreview(response.data);
            setEditing(false);
            setMessage({ type: "success", text: "Preview created. Review the rows before confirming." });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Unable to preview vendor stock" });
        } finally { setSaving(false); }
    };

    const confirm = async () => {
        if (!preview?.uploadId) return;
        setSaving(true); setMessage(null);
        try {
            await api.post(`/api/vendor-stock-uploads/${preview.uploadId}/confirm`);
            setMessage({ type: "success", text: "Vendor stock confirmed successfully" });
            setPreview(null); setFile(null); setTab("stock");
            await loadData();
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Unable to confirm vendor stock" });
        } finally { setSaving(false); }
    };

    const updatePreviewRow = (index, field, value) => setPreview((currentPreview) => ({
        ...currentPreview,
        rows: currentPreview.rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value, errors: [] } : row),
    }));

    const savePreviewChanges = async () => {
        setSaving(true); setMessage(null);
        try {
            const response = await api.put(`/api/vendor-stock-uploads/${preview.uploadId}/preview`, { rows: preview.rows });
            setPreview(response.data); setEditing(false);
            setMessage({ type: response.data.invalidRows ? "error" : "success", text: response.data.invalidRows ? "Changes saved. Correct the remaining invalid rows." : "Preview changes saved successfully." });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Unable to save preview changes" });
        } finally { setSaving(false); }
    };

    const viewHistory = async (uploadId) => {
        setLoading(true); setMessage(null);
        try {
            const response = await api.get(`/api/vendor-stock-uploads/${uploadId}`);
            setHistoryDetail(response.data);
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Unable to load uploaded stock" });
        } finally { setLoading(false); }
    };

    const rows = tab === "stock" ? (current?.rows || []) : (preview?.rows || []);

    return <div style={S.backdrop} onMouseDown={onClose}>
        <div style={S.modal} role="dialog" aria-modal="true" aria-label={`${vendor.vendorName} stock`} onMouseDown={(event) => event.stopPropagation()}>
            <style>{`.vendor-stock-table th{padding:10px 12px;text-align:left;background:#f8fafc;color:#64748b;font-size:10px;text-transform:uppercase}.vendor-stock-table td{padding:11px 12px;border-top:1px solid #e2e8f0}`}</style>
            <header style={S.header}>
                <div><h2 style={S.title}>{vendor.vendorName}</h2><p style={S.subtitle}>Vendor availability and stock uploads</p></div>
                <button type="button" style={S.close} onClick={onClose}><X size={19} /></button>
            </header>
            <nav style={S.tabs}>
                <Tab active={tab === "stock"} onClick={() => setTab("stock")}>Current Stock</Tab>
                <Tab active={tab === "upload"} onClick={() => setTab("upload")}>Upload Stock</Tab>
                <Tab active={tab === "history"} onClick={() => setTab("history")}>History</Tab>
            </nav>
            {message && <div style={{ ...S.message, ...(message.type === "error" ? S.error : S.success) }}>{message.text}</div>}
            <div style={S.body}>
                {tab === "upload" && !preview && <div style={S.uploadBox}>
                    <div style={S.formRow}>
                        <label style={S.field}><span>Valid From *</span><input style={S.input} type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></label>
                        <label style={S.field}><span>Valid Until *</span><input style={S.input} type="date" value={validUntil} min={validFrom} onChange={(e) => setValidUntil(e.target.value)} /></label>
                    </div>
                    <label style={S.fileBox}><Upload size={22} /><strong>{file?.name || "Choose vendor stock file"}</strong><span>CSV, XLS or XLSX. Maximum 10 MB.</span><input hidden type="file" accept=".csv,.xls,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
                    <div style={S.actions}><button type="button" style={S.secondary} onClick={downloadSample}><Download size={15} /> Download Sample</button><button type="button" style={S.primary} disabled={saving} onClick={uploadPreview}>{saving ? "Reading file..." : "Preview"}</button></div>
                </div>}

                {tab === "history" ? (historyDetail ? <>
                    <div style={S.summary}><button type="button" style={S.secondary} onClick={() => setHistoryDetail(null)}>Back to History</button><span>{historyDetail.fileName} · {historyDetail.status} · {historyDetail.validFrom} to {historyDetail.validUntil}</span></div>
                    <StockTable rows={historyDetail.rows || []} loading={loading} />
                </> : <HistoryTable history={history} loading={loading} onView={viewHistory} />) : (tab === "stock" || preview) && <>
                    <div style={S.summary}>
                        <span>{tab === "stock" ? (current?.uploadId ? `Valid ${current.validFrom} to ${current.validUntil}` : "No current confirmed stock") : `${preview.validRows} valid · ${preview.invalidRows} invalid`}</span>
                        {preview && <div style={S.rowActions}>{editing ? <button type="button" style={S.primary} disabled={saving} onClick={savePreviewChanges}><Save size={15} /> {saving ? "Saving..." : "Save Changes"}</button> : <button type="button" style={S.secondary} onClick={() => setEditing(true)}><Pencil size={15} /> Edit Preview</button>}<button type="button" style={S.primary} disabled={saving || editing || preview.validRows === 0 || preview.invalidRows > 0} onClick={confirm}><CheckCircle2 size={15} /> Confirm Stock</button></div>}
                    </div>
                    <StockTable rows={rows} loading={loading && tab === "stock"} showErrors={Boolean(preview)} editable={editing} onChange={updatePreviewRow} />
                </>}
            </div>
        </div>
    </div>;
}

function Tab({ active, onClick, children }) { return <button type="button" onClick={onClick} style={{ ...S.tab, ...(active ? S.activeTab : {}) }}>{children}</button>; }

function StockTable({ rows, loading, showErrors, editable = false, onChange }) {
    return <div style={S.tableWrap}><table className="vendor-stock-table" style={S.table}><thead><tr><th>Part Number</th><th>Part Name</th><th>Brand</th><th>Quantity</th><th>MRP</th>{showErrors && <th>Validation</th>}</tr></thead><tbody>
        {rows.map((row, index) => <tr key={`${row.rowNumber || row.partNumber || "row"}-${index}`}><td>{editable ? <input style={S.cellInput} value={row.partNumber || ""} onChange={(e) => onChange(index,"partNumber",e.target.value)} /> : <strong>{row.partNumber || "—"}</strong>}</td><td>{editable ? <input style={S.cellInput} value={row.partName || ""} onChange={(e) => onChange(index,"partName",e.target.value)} /> : row.partName || "—"}</td><td>{editable ? <input style={S.cellInput} value={row.brand || ""} onChange={(e) => onChange(index,"brand",e.target.value)} /> : row.brand || "—"}</td><td>{editable ? <input style={S.numberInput} type="number" min="0" value={row.quantity ?? ""} onChange={(e) => onChange(index,"quantity",e.target.value)} /> : row.quantity ?? "—"}</td><td>{editable ? <input style={S.numberInput} type="number" min="0" value={row.mrp ?? ""} onChange={(e) => onChange(index,"mrp",e.target.value)} /> : row.mrp == null ? "—" : `₹${Number(row.mrp).toLocaleString("en-IN")}`}</td>{showErrors && <td style={row.errors?.length ? S.invalid : S.valid}>{row.errors?.length ? row.errors.join(", ") : "Valid"}</td>}</tr>)}
        {!loading && rows.length === 0 && <tr><td colSpan={showErrors ? 6 : 5} style={S.empty}>No stock available.</td></tr>}
        {loading && <tr><td colSpan={showErrors ? 6 : 5} style={S.empty}>Loading stock...</td></tr>}
    </tbody></table></div>;
}

function HistoryTable({ history, loading, onView }) {
    return <div style={S.tableWrap}><table className="vendor-stock-table" style={S.table}><thead><tr><th>File</th><th>Uploaded</th><th>Validity</th><th>Rows</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {history.map((upload) => <tr key={upload.uploadId}><td>{upload.fileName}</td><td>{upload.uploadedAt ? new Date(upload.uploadedAt).toLocaleString() : "—"}</td><td>{upload.validFrom} to {upload.validUntil}</td><td>{upload.validRows} valid / {upload.invalidRows} invalid</td><td><strong>{upload.status}</strong></td><td><button type="button" style={S.viewButton} onClick={() => onView(upload.uploadId)}><Eye size={14} /> View</button></td></tr>)}
        {!loading && history.length === 0 && <tr><td colSpan="6" style={S.empty}>No uploads yet.</td></tr>}
    </tbody></table></div>;
}

const S = {
    backdrop: { position: "fixed", inset: 0, zIndex: 1100, background: "rgba(15,23,42,.48)", display: "grid", placeItems: "center", padding: 18 },
    modal: { width: "min(1050px, 97vw)", maxHeight: "92vh", overflow: "hidden", background: "#fff", borderRadius: 12, boxShadow: "0 24px 70px rgba(15,23,42,.3)", display: "flex", flexDirection: "column" },
    header: { padding: "17px 20px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0" }, title: { margin: 0, fontSize: 19 }, subtitle: { margin: "4px 0 0", color: "#64748B", fontSize: 12 },
    close: { border: 0, background: "transparent", cursor: "pointer", color: "#475569" }, tabs: { display: "flex", gap: 4, padding: "0 20px", borderBottom: "1px solid #E2E8F0" }, tab: { padding: "12px 14px", border: 0, borderBottom: "2px solid transparent", background: "transparent", color: "#64748B", fontWeight: 700, cursor: "pointer" }, activeTab: { color: "#3158D4", borderBottomColor: "#3158D4" },
    body: { padding: 20, overflow: "auto", minHeight: 300 }, message: { margin: "12px 20px 0", padding: "9px 12px", borderRadius: 7, fontSize: 12.5 }, success: { color: "#166534", background: "#DCFCE7" }, error: { color: "#B91C1C", background: "#FEE2E2" },
    uploadBox: { display: "grid", gap: 16 }, formRow: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }, field: { display: "grid", gap: 6, fontSize: 12, color: "#475569", fontWeight: 700 }, input: { height: 38, padding: "0 10px", border: "1px solid #CBD5E1", borderRadius: 7 },
    fileBox: { minHeight: 130, border: "1px dashed #94A3B8", borderRadius: 9, display: "grid", placeItems: "center", alignContent: "center", gap: 5, color: "#475569", cursor: "pointer" }, actions: { display: "flex", justifyContent: "space-between", gap: 9 }, primary: { minHeight: 36, padding: "0 14px", border: 0, borderRadius: 7, background: "#3158D4", color: "white", fontWeight: 750, display: "inline-flex", gap: 7, alignItems: "center", cursor: "pointer" }, secondary: { minHeight: 36, padding: "0 14px", border: "1px solid #CBD5E1", borderRadius: 7, background: "white", color: "#334155", fontWeight: 700, display: "inline-flex", gap: 7, alignItems: "center", cursor: "pointer" },
    summary: { minHeight: 42, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, color: "#475569", fontSize: 12.5 }, rowActions: { display: "flex", alignItems: "center", gap: 8 }, tableWrap: { overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 8 }, table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 }, empty: { padding: 45, textAlign: "center", color: "#94A3B8" }, valid: { color: "#15803D" }, invalid: { color: "#B91C1C", minWidth: 180 }, cellInput: { width: "100%", minWidth: 115, height: 32, padding: "0 7px", border: "1px solid #CBD5E1", borderRadius: 5, boxSizing: "border-box" }, numberInput: { width: 90, height: 32, padding: "0 7px", border: "1px solid #CBD5E1", borderRadius: 5, boxSizing: "border-box" }, viewButton: { minHeight: 31, padding: "0 10px", border: "1px solid #C7D2FE", borderRadius: 6, background: "#EEF2FF", color: "#3158D4", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" },
};
