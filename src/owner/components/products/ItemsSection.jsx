import { Fragment, useState, useEffect, useMemo } from "react";
import {
    Boxes,
    Download,
    UploadCloud,
    Loader2,
    X,
    Wrench,
    Pencil,
} from "lucide-react";
import apiclient from "../../../services/apiclient";
import FitmentDrawer from "./FitmentDrawer";
import ProductSpecificationsForm from "./ProductSpecificationsForm";
import "./ItemSection.css";

const EMPTY_FORM = {
    itemName: "", stockUnit: "PCS",
    description: "",
    partNumber: "",
    oemNumber: "",
    ean: "",
    hsnCode: "",
    brandName: "",
    categoryName: "",
    categoryId: "",
    masterName: "",
    masterId: "",
};
const UNIT_LABELS = { PCS: "Piece", BOTTLE: "Bottle", CAN: "Can", BOX: "Box", SET: "Set", PAIR: "Pair", PACK: "Pack" };

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
    const [editingItemId, setEditingItemId] = useState(null);
    const [specificationAttributes, setSpecificationAttributes] = useState([]);
    const [specificationValues, setSpecificationValues] = useState({});
    const [specificationsLoading, setSpecificationsLoading] = useState(false);
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

    const selectedCategory = categories.find((category) => category.categoryName === formData.categoryName);
    useEffect(() => {
        let active = true;
        if (!selectedCategory?.id) {
            setSpecificationAttributes([]);
            setSpecificationsLoading(false);
            return () => { active = false; };
        }
        setSpecificationsLoading(true);
        apiclient.get(`/product-attributes/category/${selectedCategory.id}`)
            .then(({ data }) => active && setSpecificationAttributes(data || []))
            .catch((error) => {
                console.error("Failed to load category specifications", error);
                if (active) setSpecificationAttributes([]);
            })
            .finally(() => active && setSpecificationsLoading(false));
        return () => { active = false; };
    }, [selectedCategory?.id]);

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
    const masterOptions = useMemo(
        () => masters
            .filter((m) => m.active !== false && (!formData.categoryName || m.categoryName === formData.categoryName))
            .filter((m) => m.masterName),
        [formData.categoryName, masters]
    );

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "masterId") {
            const selectedMaster = masters.find((m) => String(m.id) === value);
            const nextCategory = selectedMaster?.categoryName || formData.categoryName;
            const nextCategoryId = selectedMaster?.categoryId || categories.find((category) => category.categoryName === nextCategory)?.id || "";
            if (nextCategory !== formData.categoryName) setSpecificationValues({});
            setFormData((current) => ({ ...current, masterId: value, masterName: selectedMaster?.masterName || "", categoryName: nextCategory, categoryId: String(nextCategoryId) }));
            return;
        }
        if (name === "categoryId") {
            const category = categories.find((item) => String(item.id) === value);
            const nextCategoryName = category?.categoryName || "";
            const currentMaster = masters.find((m) => String(m.id) === formData.masterId);
            if (nextCategoryName !== formData.categoryName) setSpecificationValues({});
            setFormData((current) => ({ ...current, categoryId: value, categoryName: nextCategoryName,
                masterName: currentMaster?.categoryName === nextCategoryName ? current.masterName : "",
                masterId: currentMaster?.categoryName === nextCategoryName ? current.masterId : "" }));
            return;
        }
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const resetAddModal = () => {
        setFormData(EMPTY_FORM);
        setEditingItemId(null);
        setSpecificationValues({});
        setShowAddModal(false);
        setShowMoreFields(false);
    };

    const editItem = async (item) => {
        setSaving(true);
        try {
            const { data } = await apiclient.get(`/products/${item.id}`);
            setEditingItemId(item.id);
            setFormData({ ...EMPTY_FORM, ...data, categoryId: String(data.categoryId || ""), masterId: String(data.masterId || ""), itemName: data.itemName || "", description: data.description || "" });
            const values = {};
            (data.specifications || []).forEach((specification) => {
                values[specification.attributeId] = specification.inputType === "BOOLEAN"
                    ? specification.booleanValue
                    : specification.inputType === "NUMBER" ? (specification.numberValue ?? "") : (specification.textValue ?? "");
            });
            setSpecificationValues(values);
            setShowAddModal(true);
        } catch (error) {
            setToast({ type: "error", msg: error.response?.data?.message || "Could not load product details." });
        } finally { setSaving(false); }
    };

    const saveItem = async () => {
        if (
            !formData.itemName.trim() ||
            !formData.partNumber.trim() ||
            !formData.brandName.trim() ||
            !formData.categoryName.trim() ||
            !formData.masterName.trim() ||
            !formData.hsnCode.trim()
        ) {
            setToast({ type: "error", msg: "Part name, part number, brand, category, subcategory and HSN code are required." });
            return;
        }
        const missingRequired = specificationAttributes.find((attribute) => {
            const value = specificationValues[attribute.id];
            return attribute.required && (attribute.inputType === "BOOLEAN"
                ? typeof value !== "boolean"
                : value === undefined || value === null || String(value).trim() === "");
        });
        if (missingRequired) {
            setToast({ type: "error", msg: `${missingRequired.attributeName} is required for this category.` });
            return;
        }
        setSaving(true);
        try {
            const specifications = specificationAttributes
                .filter((attribute) => attribute.inputType === "BOOLEAN"
                    || (specificationValues[attribute.id] !== undefined && specificationValues[attribute.id] !== null && String(specificationValues[attribute.id]).trim() !== ""))
                .map((attribute) => ({
                    attributeId: attribute.id,
                    value: attribute.inputType === "BOOLEAN" ? Boolean(specificationValues[attribute.id])
                        : attribute.inputType === "NUMBER" ? Number(specificationValues[attribute.id]) : String(specificationValues[attribute.id]),
                }));
            const payload = {
                itemName: formData.itemName.trim(),
                stockUnit: formData.stockUnit,
                description: formData.description.trim() || null,
                partNumber: formData.partNumber.trim(),
                oemNumber: formData.oemNumber.trim() || null,
                ean: formData.ean.trim() || null,
                hsnCode: formData.hsnCode.trim(),
                brandName: formData.brandName.trim(),
                categoryName: formData.categoryName.trim(),
                masterName: formData.masterName.trim(),
                masterId: formData.masterId ? Number(formData.masterId) : null,
                specifications,
            };
            const response = editingItemId
                ? await apiclient.put(`/products/${editingItemId}`, payload)
                : await apiclient.post("/products", payload);
            setToast({ type: "success", msg: editingItemId ? "Product updated." : response.data });
            resetAddModal();
            await loadData();
        } catch (error) {
            console.error("Failed to save item", error);
            setToast({ type: "error", msg: error.response?.data?.message || "Error saving item." });
        } finally {
            setSaving(false);
        }
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
    if (exporting) return;
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
                                <col style={{ width: "13%" }} />
                                <col style={{ width: "22%" }} />
                                <col style={{ width: "10%" }} />
                                <col style={{ width: "10%" }} />
                                <col style={{ width: "13%" }} />
                                <col style={{ width: "10%" }} />
                                <col style={{ width: "8%" }} />
                                <col style={{ width: "14%" }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className="items-th">Part Number</th>
                                    <th className="items-th">Part Name</th>
                                    <th className="items-th">Unit</th>
                                    <th className="items-th">Brand</th>
                                    <th className="items-th">Category</th>
                                    <th className="items-th">Subcategory</th>
                                    <th className="items-th">Fitment</th>
                                    <th className="items-th">Edit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <Fragment key={item.id}>
                                    <tr key={item.id} className="items-tr">
                                        <td className="items-td-strong">{item.partNumber || "—"}</td>
                                        <td className="items-td">
                                            {item.itemName}
                                        </td>
                                        <td className="items-td">{UNIT_LABELS[item.stockUnit] || UNIT_LABELS.PCS}</td>
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
                                        <td className="items-td">
                                            <button type="button" className="items-fitment-btn" onClick={() => editItem(item)} aria-label={`Edit ${item.itemName}`}>
                                                <Pencil size={13} /> Edit
                                            </button>
                                        </td>
                                    </tr>
                                    </Fragment>
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
                            <span className="items-modal-title">{editingItemId ? "Edit Item" : "Add Item"}</span>
                            <button className="items-modal-close" onClick={resetAddModal}>
                                <X size={16} />
                            </button>
                        </div>

                        <label className="items-label">Part Name *</label>
                        <input
                            className="items-input"
                            autoFocus
                            placeholder="e.g. Brake Pad Set — Front"
                            required
                            name="itemName"
                            value={formData.itemName}
                            onChange={handleInputChange}
                        />

                        <label className="items-label" style={{ marginTop: 12 }}>Part Number *</label>
                        <input
                            className="items-input"
                            placeholder="PN-00123"
                            required
                            name="partNumber"
                            value={formData.partNumber}
                            onChange={handleInputChange}
                        />

                        <div className="items-field-row">
                            <div>
                                <label className="items-label">Brand *</label>
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
                                <label className="items-label">Category *</label>
                                <select className="items-input" name="categoryId" value={formData.categoryId} onChange={handleInputChange}>
                                    <option value="">Select category</option>
                                    {categories.filter((category) => category.active !== false).map((category) =>
                                        <option key={category.id} value={category.id}>{category.categoryName}</option>)}
                                </select>
                            </div>
                        </div>

                        <label className="items-label" style={{ marginTop: 12 }}>Subcategory *</label>
                        <select className="items-input" name="masterId" value={formData.masterId} onChange={handleInputChange}>
                            <option value="">Select subcategory</option>
                            {masterOptions.map((master) => <option key={master.id} value={master.id}>
                                {master.masterName}{masterOptions.filter((candidate) => candidate.masterName === master.masterName).length > 1 ? ` · ${master.categoryName} · #${master.id}` : ""}
                            </option>)}
                        </select>

                        <div className="items-field-row">
                            <div>
                                <label className="items-label" style={{ marginTop: 12 }}>HSN Code *</label>
                                <input className="items-input" placeholder="Enter HSN code" name="hsnCode" value={formData.hsnCode} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <label className="items-label" style={{ marginTop: 12 }}>Unit *</label>
                                <select className="items-input" name="stockUnit" value={formData.stockUnit || "PCS"} onChange={handleInputChange} required>
                                    <option value="PCS">Piece</option><option value="BOTTLE">Bottle</option><option value="CAN">Can</option>
                                    <option value="BOX">Box</option><option value="SET">Set</option><option value="PAIR">Pair</option><option value="PACK">Pack</option>
                                </select>
                            </div>
                        </div>

                        <ProductSpecificationsForm attributes={specificationAttributes} values={specificationValues}
                            onChange={(attributeId, value) => setSpecificationValues((current) => ({ ...current, [attributeId]: value }))}
                            disabled={saving} loading={specificationsLoading} />

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

                            </div>
                        )}


                        <div className="items-modal-actions">
                            <button className="items-btn-ghost" onClick={resetAddModal}>Cancel</button>
                            <button className="items-btn-primary" onClick={saveItem} disabled={saving}>
                                {saving ? <Loader2 size={15} className="pc-spin" /> : <Boxes size={15} />}
                                {saving ? "Saving…" : editingItemId ? "Save Changes" : "Save Item"}
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
                            Accepts .csv or .xlsx/.xls files with 9 columns: Brand, Category, Subcategory, Product
                            Name, Description, Part Number, OEM Number, EAN, HSN Code. Only Brand, Category,
                            Subcategory, Product Name and Part Number are required — Brand/Category/Subcategory are
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
