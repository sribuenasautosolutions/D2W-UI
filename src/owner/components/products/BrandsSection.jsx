import { useState, useEffect, useMemo } from "react";
import {
    Tag, Plus, Download, UploadCloud, Loader2, X,
    CheckCircle2, Sparkles,
} from "lucide-react";
import api from "../../../services/api";
import "./BrandSection.css";

function BrandsSection({
    query = "",
    requestBulkUpload = 0,
    requestAddBrand = 0,
}) {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);

    const [brandName, setBrandName] = useState("");
    const [saving, setSaving] = useState(false);

    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);

    const [toast, setToast] = useState(null);

    const loadBrands = async () => {
        setLoading(true);
        try {
            const response = await api.get("/brands");
            setBrands(response.data || []);
        } catch (error) {
            console.error("Failed to load brands", error);
        }
        setLoading(false);
    };

    useEffect(() => { loadBrands(); }, []);

    /* Parent-driven modal triggers */
    useEffect(() => {
        if (requestBulkUpload > 0) setShowBulkModal(true);
    }, [requestBulkUpload]);

    useEffect(() => {
        if (requestAddBrand > 0) setShowAddModal(true);
    }, [requestAddBrand]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(t);
    }, [toast]);

    /* Filter uses the parent's query (navbar search) */
    const filteredBrands = useMemo(() => {
        const q = String(query || "").trim().toLowerCase();
        if (!q) return brands;
        return brands.filter((b) =>
            b.brandName?.toLowerCase().includes(q)
        );
    }, [brands, query]);

    const activeCount = useMemo(
        () => brands.filter((b) => b.active).length,
        [brands]
    );

    const latestBrand = useMemo(() => {
        if (!brands.length) return "—";
        const sorted = [...brands].sort(
            (a, b) => Number(b.id || 0) - Number(a.id || 0)
        );
        return sorted[0]?.brandName || "—";
    }, [brands]);

    const resetAddModal = () => {
        setBrandName("");
        setShowAddModal(false);
    };

    const saveBrand = async () => {
        if (!brandName.trim()) {
            setToast({ type: "error", msg: "Brand name is required." });
            return;
        }
        setSaving(true);
        try {
            const response = await api.post("/brands", {
                brandName: brandName.trim(),
            });
            setToast({ type: "success", msg: response.data });
            resetAddModal();
            loadBrands();
        } catch (error) {
            console.error("Failed to save brand", error);
            setToast({ type: "error", msg: "Error saving brand." });
        }
        setSaving(false);
    };

    const downloadSampleFile = () => {
        const csvContent = ["Brand Name", "Bosch", "Bajaj", "TVS", "Mahindra"].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "brand_bulk_upload_sample.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const uploadBrands = async () => {
        if (!selectedFile) {
            setToast({ type: "error", msg: "Please select a file first." });
            return;
        }
        setUploading(true);
        setBulkResult(null);
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            const response = await api.post("/brands/bulk-upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const result = response.data;
            setBulkResult(result);
            setToast({
                type: result.skippedRows > 0 ? "error" : "success",
                msg: `Processed ${result.totalRows} rows — ${result.successRows} saved, ${result.skippedRows} skipped.`,
            });
            setSelectedFile(null);
            loadBrands();
        } catch (error) {
            console.error("Bulk upload failed", error);
            setToast({ type: "error", msg: "Bulk upload failed." });
        }
        setUploading(false);
    };

    return (
        <div className="brands-section">
            {/* KPI CARDS */}
            <div className="brands-kpi-grid">
                <div className="brands-kpi-card brands-kpi-card--blue">
                    <span className="brands-kpi-icon"><Tag size={18} /></span>
                    <div className="brands-kpi-content">
                        <span className="brands-kpi-label">Total Brands</span>
                        <strong className="brands-kpi-value">{brands.length}</strong>
                    </div>
                </div>

                <div className="brands-kpi-card brands-kpi-card--green">
                    <span className="brands-kpi-icon"><CheckCircle2 size={18} /></span>
                    <div className="brands-kpi-content">
                        <span className="brands-kpi-label">Active</span>
                        <strong className="brands-kpi-value">{activeCount}</strong>
                    </div>
                </div>

                <div className="brands-kpi-card brands-kpi-card--violet">
                    <span className="brands-kpi-icon"><Sparkles size={18} /></span>
                    <div className="brands-kpi-content">
                        <span className="brands-kpi-label">Latest Added</span>
                        <strong
                            className="brands-kpi-value brands-kpi-value--small"
                            title={latestBrand}
                        >
                            {latestBrand}
                        </strong>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="brands-table-card">
                {loading ? (
                    <div className="brands-empty">
                        <Loader2 size={18} className="pc-spin" /> Loading brands…
                    </div>
                ) : filteredBrands.length === 0 ? (
                    <div className="brands-empty">No brands found.</div>
                ) : (
                    <>
                        <table className="brands-table">
                            <colgroup>
                                <col style={{ width: "50%" }} />
                                <col style={{ width: "30%" }} />
                                <col style={{ width: "20%" }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className="brands-th">Brand</th>
                                    <th className="brands-th">Slug</th>
                                    <th className="brands-th">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBrands.map((brand) => (
                                    <tr key={brand.id} className="brands-tr">
                                        <td className="brands-td-strong">{brand.brandName}</td>
                                        <td className="brands-td">{brand.slug}</td>
                                        <td className="brands-td">
                                            <span
                                                className={`brands-badge ${brand.active ? "is-active" : "is-inactive"}`}
                                            >
                                                {brand.active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="brands-table-footer">
                            {filteredBrands.length} of {brands.length} brands
                        </div>
                    </>
                )}
            </div>

            {/* ADD BRAND MODAL */}
            {showAddModal && (
                <div className="brands-overlay" onClick={resetAddModal}>
                    <div className="brands-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="brands-modal-header">
                            <span className="brands-modal-title">Add Brand</span>
                            <button className="brands-modal-close" onClick={resetAddModal}>
                                <X size={16} />
                            </button>
                        </div>

                        <label className="brands-label">Brand Name *</label>
                        <input
                            className="brands-input"
                            autoFocus
                            placeholder="e.g. Bosch"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveBrand()}
                        />

                        <div className="brands-modal-actions">
                            <button className="brands-btn-ghost" onClick={resetAddModal}>Cancel</button>
                            <button className="brands-btn-primary" onClick={saveBrand} disabled={saving}>
                                {saving ? <Loader2 size={15} className="pc-spin" /> : <Plus size={15} />}
                                {saving ? "Saving…" : "Save Brand"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK UPLOAD MODAL */}
            {showBulkModal && (
                <div className="brands-overlay" onClick={() => setShowBulkModal(false)}>
                    <div className="brands-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="brands-modal-header">
                            <span className="brands-modal-title">Bulk Upload Brands</span>
                            <button className="brands-modal-close" onClick={() => setShowBulkModal(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        <button className="brands-link-btn" onClick={downloadSampleFile}>
                            <Download size={14} /> Download Sample CSV
                        </button>

                        <div className="brands-file-row">
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                            />
                        </div>

                        <div className="brands-modal-actions">
                            <button className="brands-btn-ghost" onClick={() => setShowBulkModal(false)}>Close</button>
                            <button className="brands-btn-primary" onClick={uploadBrands} disabled={uploading}>
                                {uploading ? <Loader2 size={15} className="pc-spin" /> : <UploadCloud size={15} />}
                                {uploading ? "Uploading…" : "Upload File"}
                            </button>
                        </div>

                        {bulkResult && bulkResult.failedRows && bulkResult.failedRows.length > 0 && (
                            <div className="brands-failed-box">
                                <p className="brands-label">Skipped rows</p>
                                <ul>
                                    {bulkResult.failedRows.map((f, idx) => (
                                        <li key={idx}>Row {f.rowNumber}: {f.reason}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TOAST */}
            {toast && (
                <div className={`brands-toast brands-toast--${toast.type === "error" ? "error" : "success"}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}

export default BrandsSection;