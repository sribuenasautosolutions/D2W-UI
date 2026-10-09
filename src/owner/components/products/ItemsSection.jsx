import ProductUnitFields, { ProductUnitLabel } from "../../../components/ProductUnitFields";
import { useState, useEffect, useMemo } from "react";
import {
    Boxes,
    Search,
    Download,
    UploadCloud,
    Loader2,
    X,
    Wrench,
} from "lucide-react";
import apiclient from "../../../services/apiclient";
import FitmentDrawer from "./FitmentDrawer";
import "./ItemSection.css";

const EMPTY_FORM = {
    itemName: "", stockUnit: "PCS", packSize: null, contentsUnit: null,
    description: "",
    partNumber: "",
    oemNumber: "",
    ean: "",
    hsnCode: "",
    brandName: "",
    categoryName: "",
    masterName: "",
};

/**
 * ItemsSection
 * Search, Bulk Upload and Add Item are now controlled by the parent
 * (ProductPage) through the `query`, `requestBulkUpload` and
 * `requestAddItem` props.
 */
function ItemsSection({
    query = "",
    requestBulkUpload = 0,
    requestAddItem = 0,
    requestExport = 0,
}) {
    const [items, setItems] = useState([]);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [masters, setMasters] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [loading, setLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showMoreFields, setShowMoreFields] = useState(false);

    const [formData, setFormData] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);

    const [toast, setToast] = useState(null);

    /* ---------- Fitment drawer state ---------- */
    const [fitmentPart, setFitmentPart] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [itemResponse, brandResponse, categoryResponse, masterResponse] =
                await Promise.all([
                    apiclient.get("/products"),
                    apiclient.get("/brands"),
                    apiclient.get("/categories"),
                    apiclient.get("/product-masters"),
                ]);
            setItems(itemResponse.data || []);
            setBrands(brandResponse.data || []);
            setCategories(categoryResponse.data || []);
            setMasters(masterResponse.data || []);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    /* ---------- Modal triggers from parent ---------- */
    useEffect(() => {
        if (requestBulkUpload > 0) setShowBulkModal(true);
    }, [requestBulkUpload]);

    useEffect(() => {
        if (requestAddItem > 0) setShowAddModal(true);
    }, [requestAddItem]);
    
    useEffect(() => {
    if (requestExport > 0) handleExportItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [requestExport]);

    /* ---------- Toast auto-dismiss ---------- */
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(t);
    }, [toast]);

    /* ---------- Filter using the parent's query ---------- */
    const filteredItems = useMemo(() => {
        const q = String(query || "").trim().toLowerCase();
        if (!q) return items;
        return items.filter((it) =>
            [it.itemName, it.partNumber, it.oemNumber, it.brandName, it.categoryName, it.masterName]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
        );
    }, [items, query]);

    const brandOptions = useMemo(
        () => brands.map((b) => b.brandName).filter(Boolean),
        [brands]
    );
    const categoryOptions = useMemo(
        () => categories.map((c) => c.categoryName).filter(Boolean),
        [categories]
    );
    const masterOptions = useMemo(
        () => masters
            .filter((m) => !formData.categoryName || m.categoryName === formData.categoryName)
            .map((m) => m.masterName)
            .filter(Boolean),
        [formData.categoryName, masters]
    );

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            if (name === "masterName") {
                const selectedMaster = masters.find((m) => m.masterName === value);
                return { ...prev, masterName: value, categoryName: selectedMaster?.categoryName || prev.categoryName };
            }
            if (name === "categoryName") {
                const currentMaster = masters.find((m) => m.masterName === prev.masterName);
                return { ...prev, categoryName: value, masterName: currentMaster?.categoryName === value ? prev.masterName : "" };
            }
            return { ...prev, [name]: value };
        });
    };

    const resetAddModal = () => {
        setFormData(EMPTY_FORM);
        setShowAddModal(false);
        setShowMoreFields(false);
    };

    const saveItem = async () => {
        if (
            !formData.itemName.trim() ||
            !formData.partNumber.trim() ||
            !formData.brandName.trim() ||
            !formData.categoryName.trim() ||
            !formData.masterName.trim()
        ) {
            setToast({ type: "error", msg: "Item name, part number, brand, category and master are required." });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                itemName: formData.itemName.trim(),
                stockUnit: formData.stockUnit,
                packSize: formData.packSize,
                contentsUnit: formData.contentsUnit,
                description: formData.description.trim() || null,
                partNumber: formData.partNumber.trim(),
                oemNumber: formData.oemNumber.trim() || null,
                ean: formData.ean.trim() || null,
                hsnCode: formData.hsnCode.trim() || null,
                brandName: formData.brandName.trim(),
                categoryName: formData.categoryName.trim(),
                masterName: formData.masterName.trim(),
            };
            const response = await apiclient.post("/products", payload);
            setToast({ type: "success", msg: response.data });
            resetAddModal();
            loadData();
        } catch (error) {
            console.error("Failed to save item", error);
            setToast({ type: "error", msg: "Error saving item." });
        }
        setSaving(false);
    };

    const downloadTemplate = async () => {
        try {
            const response = await apiclient.get("/products/bulk-upload/template", {
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.download = "product_bulk_upload_template.xlsx";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to download template", error);
            setToast({ type: "error", msg: "Could not download template." });
        }
    };

    const handleExportItems = async () => {
    setExporting(true);
    try {
        const response = await apiclient.get("/products/export", {
            responseType: "blob",
            params: {
                /* pass the current search query so exported rows match the visible filter */
                query: query?.trim() || undefined,
            },
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.download = `products_${Date.now()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        setToast({ type: "success", msg: "Export started." });
    } catch (error) {
        console.error("Export failed", error);
        setToast({ type: "error", msg: "Unable to export items." });
    } finally {
        setExporting(false);
    }
};

    const uploadItems = async () => {
        if (!selectedFile) {
            setToast({ type: "error", msg: "Please select a file first." });
            return;
        }
        setUploading(true);
        setBulkResult(null);
        try {
            const data = new FormData();
            data.append("file", selectedFile);
            const response = await apiclient.post("/products/bulk-upload", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const result = response.data;
            setBulkResult(result);
            setToast({
                type: result.skippedRows > 0 ? "error" : "success",
                msg: `Processed ${result.totalRows} rows — ${result.successRows} saved, ${result.skippedRows} skipped.`,
            });
            setSelectedFile(null);
            loadData();
        } catch (error) {
            console.error("Bulk upload failed", error);
            setToast({ type: "error", msg: "Bulk upload failed." });
        }
        setUploading(false);
    };

    return (
        <div className="items-section">
            {/* TABLE */}
            <div className="items-table-card">
                {loading ? (
                    <div className="items-empty">
                        <Loader2 size={18} className="pc-spin" /> Loading items…
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="items-empty">No items found.</div>
                ) : (
                    <>
                        <table className="items-table">
                            <colgroup>
                                <col style={{ width: "14%" }} />
                                <col style={{ width: "26%" }} />
                                <col style={{ width: "12%" }} />
                                <col style={{ width: "16%" }} />
                                <col style={{ width: "16%" }} />
                                <col style={{ width: "16%" }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className="items-th">Part Number</th>
                                    <th className="items-th">Part Name</th>
                                    <th className="items-th">Brand</th>
                                    <th className="items-th">Category</th>
                                    <th className="items-th">Subcategory</th>
                                    <th className="items-th">Fitment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="items-tr">
                                        <td className="items-td-strong">{item.partNumber || "—"}</td>
                                        <td className="items-td">
                                            {item.itemName}
                                            <ProductUnitLabel product={item} />
                                        </td>
                                        <td className="items-td">{item.brandName || "—"}</td>
                                        <td className="items-td">{item.categoryName || "—"}</td>
                                        <td className="items-td">{item.masterName || "—"}</td>
                                        <td className="items-td">
                                            <button
                                                type="button"
                                                className="items-fitment-btn"
                                                onClick={() => setFitmentPart(item)}
                                            >
                                                <Wrench size={13} />
                                                Fitment
                                                {item.fitmentCount > 0 && (
                                                    <span className="items-fitment-count">
                                                        {item.fitmentCount}
                                                    </span>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="items-table-footer">
                            {filteredItems.length} of {items.length} items
                        </div>
                    </>
                )}
            </div>

            {/* ADD ITEM MODAL */}
            {showAddModal && (
                <div className="items-overlay" onClick={resetAddModal}>
                    <div className="items-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="items-modal-header">
                            <span className="items-modal-title">Add Item</span>
                            <button className="items-modal-close" onClick={resetAddModal}>
                                <X size={16} />
                            </button>
                        </div>

                        <label className="items-label">Item Name</label>
                        <input
                            className="items-input"
                            autoFocus
                            placeholder="e.g. Brake Pad Set — Front"
                            name="itemName"
                            value={formData.itemName}
                            onChange={handleInputChange}
                        />

                        <label className="items-label" style={{ marginTop: 12 }}>Part Number</label>
                        <input
                            className="items-input"
                            placeholder="PN-00123"
                            name="partNumber"
                            value={formData.partNumber}
                            onChange={handleInputChange}
                        />

                        <div className="items-field-row">
                            <div>
                                <label className="items-label">Brand</label>
                                <input
                                    className="items-input"
                                    list="brand-options"
                                    name="brandName"
                                    value={formData.brandName}
                                    onChange={handleInputChange}
                                    placeholder="Type or pick"
                                    autoComplete="off"
                                />
                                <datalist id="brand-options">
                                    {brandOptions.map((b) => <option key={b} value={b} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="items-label">Category</label>
                                <input
                                    className="items-input"
                                    list="category-options"
                                    name="categoryName"
                                    value={formData.categoryName}
                                    onChange={handleInputChange}
                                    placeholder="Type or pick"
                                    autoComplete="off"
                                />
                                <datalist id="category-options">
                                    {categoryOptions.map((c) => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                        </div>

                        <label className="items-label" style={{ marginTop: 12 }}>Master</label>
                        <input
                            className="items-input"
                            list="master-options"
                            name="masterName"
                            value={formData.masterName}
                            onChange={handleInputChange}
                            placeholder="Type or pick"
                            autoComplete="off"
                        />
                        <datalist id="master-options">
                            {masterOptions.map((m) => <option key={m} value={m} />)}
                        </datalist>

                        <button
                            type="button"
                            className="items-more-toggle"
                            onClick={() => setShowMoreFields((v) => !v)}
                        >
                            {showMoreFields ? "Hide optional details" : "+ Add optional details"}
                        </button>

                        {showMoreFields && (
                            <div className="items-more-fields">
                                <label className="items-label-sm">Description</label>
                                <textarea
                                    className="items-textarea"
                                    placeholder="Optional"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                />

                                <div className="items-field-row">
                                    <div>
                                        <label className="items-label-sm">OEM Number</label>
                                        <input className="items-input-sm" placeholder="Optional" name="oemNumber" value={formData.oemNumber} onChange={handleInputChange} />
                                    </div>
                                    <div>
                                        <label className="items-label-sm">EAN / Barcode</label>
                                        <input className="items-input-sm" placeholder="Optional" name="ean" value={formData.ean} onChange={handleInputChange} />
                                    </div>
                                </div>

                                <label className="items-label-sm" style={{ marginTop: 10 }}>HSN Code</label>
                                <input className="items-input-sm" placeholder="Optional" name="hsnCode" value={formData.hsnCode} onChange={handleInputChange} />
                            </div>
                        )}

                        <section className="product-units-section">
                            <h3>Unit and pack size</h3>
                            <p>Quantity counts the selected stock unit. Example: one can contains 3.5 L.</p>
                            <ProductUnitFields value={formData} onChange={setFormData} disabled={saving} />
                        </section>

                        <div className="items-modal-actions">
                            <button className="items-btn-ghost" onClick={resetAddModal}>Cancel</button>
                            <button className="items-btn-primary" onClick={saveItem} disabled={saving}>
                                {saving ? <Loader2 size={15} className="pc-spin" /> : <Boxes size={15} />}
                                {saving ? "Saving…" : "Save Item"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK UPLOAD MODAL */}
            {showBulkModal && (
                <div className="items-overlay" onClick={() => setShowBulkModal(false)}>
                    <div className="items-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="items-modal-header">
                            <span className="items-modal-title">Bulk Upload Items</span>
                            <button className="items-modal-close" onClick={() => setShowBulkModal(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        <p className="items-hint">
                            Accepts .csv or .xlsx/.xls files with 9 columns: Brand, Category, Master, Product
                            Name, Description, Part Number, OEM Number, EAN, HSN Code. Only Brand, Category,
                            Master, Product Name and Part Number are required — Brand/Category/Master are
                            created automatically if they don't exist yet. Pricing isn't supported in bulk
                            upload.
                        </p>

                        <button className="items-btn-link" onClick={downloadTemplate}>
                            <Download size={14} /> Download Excel Template
                        </button>

                        <div className="items-file-row">
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                            />
                        </div>

                        {selectedFile && (
                            <p className="items-file-label">Selected: {selectedFile.name}</p>
                        )}

                        <div className="items-modal-actions">
                            <button className="items-btn-ghost" onClick={() => setShowBulkModal(false)}>Close</button>
                            <button className="items-btn-primary" onClick={uploadItems} disabled={uploading}>
                                {uploading ? <Loader2 size={15} className="pc-spin" /> : <UploadCloud size={15} />}
                                {uploading ? "Uploading…" : "Upload File"}
                            </button>
                        </div>

                        {bulkResult && bulkResult.failedRows && bulkResult.failedRows.length > 0 && (
                            <div className="items-failed-box">
                                <p className="items-label">Skipped rows</p>
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
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
                <div className={`items-toast items-toast-${toast.type === "error" ? "error" : "success"}`}>
                    {toast.msg}
                </div>
            )}

            {/* FITMENT DRAWER */}
            {fitmentPart && (
                <FitmentDrawer
                    part={fitmentPart}
                    onClose={() => setFitmentPart(null)}
                    onSaved={() => loadData()}
                />
            )}
        </div>
    );
}

export default ItemsSection;