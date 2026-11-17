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
    Pencil,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import apiclient from "../../../services/apiclient";
import FitmentDrawer from "./FitmentDrawer";
import ProductSpecificationsForm from "./ProductSpecificationsForm";
import "./ItemSection.css"; // still needed by ProductSpecificationsForm / Specifications tab; remove once those are migrated

const EMPTY_FORM = {
    itemName: "",
    stockUnit: "PCS",
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
/* Tailwind class strings used by this section */
const BTN_BASE =
    "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-[13.5px] font-semibold [font-family:inherit] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60";
const BTN_PRIMARY = `${BTN_BASE} border-brand bg-brand text-white hover:enabled:border-brand-hover hover:enabled:bg-brand-hover`;
const BTN_GHOST = `${BTN_BASE} border-line bg-transparent text-ink-muted hover:enabled:bg-surface-soft`;
const ROW_ACTION =
    "group/act inline-flex h-[30px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold whitespace-nowrap [font-family:inherit] transition-colors duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const ROW_ACTION_FITMENT = `${ROW_ACTION} border-brand/25 bg-primary-soft text-brand hover:border-brand hover:bg-brand hover:text-white`;
const ROW_ACTION_EDIT = `${ROW_ACTION} border-line bg-surface text-ink-soft hover:border-brand hover:bg-primary-soft hover:text-brand`;
const LABEL = "mb-1 block text-xs font-medium text-ink-muted";
const LABEL_SM = "mb-1 block text-[11.5px] font-medium text-ink-faint";
const FIELD =
    "box-border w-full rounded-[7px] border border-line bg-surface text-ink outline-none [font-family:inherit] transition placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand/15";
const INPUT = `${FIELD} px-3 py-2 text-[13.5px]`;
const INPUT_SM = `${FIELD} rounded-md px-2 py-2 text-[12.5px]`;
const TEXTAREA = `${FIELD} min-h-[50px] resize-y px-3 py-2 text-[13.5px]`;
const FIELD_ROW = "mt-3 flex gap-3 [&>*]:min-w-0 [&>*]:flex-1";
const TH =
    " bg-surface-soft px-4 py-2.5 text-left align-middle text-xs font-semibold tracking-[0.04em] whitespace-nowrap text-black uppercase";
const TD = "px-4 py-2.5 align-middle text-sm leading-snug text-ink-soft [overflow-wrap:anywhere]";

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
    /* ---------- Pagination (in the browser) ---------- */
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(25);
const [prevQuery, setPrevQuery] = useState(query);
if (query !== prevQuery) {
    setPrevQuery(query);
    setPage(1);
}


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

    const selectedCategory = categories.find((category) =>
        (formData.categoryId && String(category.id) === String(formData.categoryId)) ||
        (formData.categoryName && category.categoryName === formData.categoryName)
    );

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
    const total = filteredItems.length;
const pageCount = Math.max(1, Math.ceil(total / pageSize));
const safePage = Math.min(page, pageCount);
const startIndex = (safePage - 1) * pageSize;
const pageItems = filteredItems.slice(startIndex, startIndex + pageSize);

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
            setFormData((current) => ({
                ...current,
                masterId: value,
                masterName: selectedMaster?.masterName || "",
                categoryName: nextCategory,
                categoryId: String(nextCategoryId)
            }));
            return;
        }
        if (name === "categoryId") {
            const category = categories.find((item) => String(item.id) === value);
            const nextCategoryName = category?.categoryName || "";
            const currentMaster = masters.find((m) => String(m.id) === formData.masterId);
            if (nextCategoryName !== formData.categoryName) setSpecificationValues({});
            setFormData((current) => ({
                ...current,
                categoryId: value,
                categoryName: nextCategoryName,
                masterName: currentMaster?.categoryName === nextCategoryName ? current.masterName : "",
                masterId: currentMaster?.categoryName === nextCategoryName ? current.masterId : ""
            }));
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
            setFormData({
                ...EMPTY_FORM,
                ...data,
                categoryId: String(data.categoryId || ""),
                masterId: String(data.masterId || ""),
                itemName: data.itemName || "",
                description: data.description || "",
            });
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
        } finally {
            setSaving(false);
        }
    };

    const saveItem = async () => {
        if (
            !formData.itemName.trim() ||
            !formData.partNumber.trim() ||
            !formData.brandName.trim() ||
            !formData.categoryName.trim() ||
            !formData.masterName.trim()
        ) {
            setToast({ type: "error", msg: "Item name, part number, brand, category and subcategory are required." });
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
                description: formData.description?.trim() || null,
                partNumber: formData.partNumber.trim(),
                oemNumber: formData.oemNumber?.trim() || null,
                ean: formData.ean?.trim() || null,
                hsnCode: formData.hsnCode?.trim() || null,
                brandName: formData.brandName.trim(),
                categoryName: formData.categoryName.trim(),
                categoryId: formData.categoryId ? Number(formData.categoryId) : (selectedCategory?.id ? Number(selectedCategory.id) : null),
                masterName: formData.masterName.trim(),
                masterId: formData.masterId ? Number(formData.masterId) : null,
                specifications,
            };

            const response = editingItemId
                ? await apiclient.put(`/products/${editingItemId}`, payload)
                : await apiclient.post("/products", payload);

            setToast({ type: "success", msg: editingItemId ? "Product updated." : response.data });
            resetAddModal();
            loadData();
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
        <div className="w-full text-ink">
            {/* TABLE */}
            <div className="overflow-x-auto overflow-y-hidden rounded-[10px] bg-surface shadow-[0_1px_3px_rgba(15,23,42,0.10),0_1px_2px_rgba(15,23,42,0.06)]">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-faint">
                        <Loader2 size={18} className="animate-spin" /> Loading items…
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-faint">No items found.</div>
                ) : (
                    <>
                        <table className="w-full min-w-[1100px] table-fixed border-collapse">
                            <colgroup>
                                <col className="w-[12%]" />   {/* Part Number */}
                                <col className="w-[20%]" />   {/* Part Name */}
                                <col className="w-[9%]" />    {/* Unit */}
                                <col className="w-[13%]" />   {/* Brand */}
                                <col className="w-[14%]" />   {/* Category */}
                                <col className="w-[13%]" />   {/* Subcategory */}
                                <col className="w-[11%]" />   {/* Fitment */}
                                <col className="w-[8%]" />    {/* Edit */}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className={TH}>Part Number</th>
                                    <th className={TH}>Part Name</th>
                                    <th className={TH}>Unit</th>
                                    <th className={TH}>Brand</th>
                                    <th className={TH}>Category</th>
                                    <th className={TH}>Subcategory</th>
                                    <th className={TH}>Fitment</th>
                                    <th className={TH}>Edit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.map((item) => (
    <tr key={item.id} className="transition-colors duration-150 even:bg-surface-soft hover:bg-primary-soft">
                                        <td className={`${TD} font-semibold text-ink tabular-nums`}>{item.partNumber || "—"}</td>
                                        <td className={TD}>
                                            {item.itemName}
                                        </td>
                                        <td className={`${TD} text-[13px] text-ink-muted`}>{UNIT_LABELS[item.stockUnit] || UNIT_LABELS.PCS}</td>
                                        <td className={TD}>{item.brandName || "—"}</td>
                                        <td className={TD}>{item.categoryName || "—"}</td>
                                        <td className={TD}>{item.masterName || "—"}</td>
                                        <td className={`${TD} whitespace-nowrap`}>
                                            <button
                                                type="button"
                                                className={ROW_ACTION_FITMENT}
                                                onClick={() => setFitmentPart(item)}
                                            >
                                                <Wrench size={13} className="shrink-0" />
                                                Fitment
                                                {item.fitmentCount > 0 && (
                                                    <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-brand px-[5px] text-[10px] font-bold text-white transition-colors group-hover/act:bg-white group-hover/act:text-brand">
                                                        {item.fitmentCount}
                                                    </span>
                                                )}
                                            </button>
                                        </td>
                                        <td className={`${TD} whitespace-nowrap`}>
                                            <button type="button" className={ROW_ACTION_EDIT} onClick={() => editItem(item)} aria-label={`Edit ${item.itemName}`}>
                                                <Pencil size={13} className="shrink-0" /> Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-soft px-4 py-2.5 text-[12.5px] text-ink-muted">
    <span className="tabular-nums">
        Showing {startIndex + 1}–{startIndex + pageItems.length} of {total.toLocaleString()} items
        {total !== items.length && ` (${items.length.toLocaleString()} total)`}
    </span>
    <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
            Rows per page
            <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="h-8 cursor-pointer rounded-md border border-line bg-surface px-2 text-[12.5px] text-ink hover:border-line-strong focus:border-brand"
            >
                {[25, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                ))}
            </select>
        </label>
        <div className="flex items-center gap-2">
            <button
                type="button"
                aria-label="Previous page"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-ink transition-colors hover:bg-line-soft disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-surface"
            >
                <ChevronLeft size={16} />
            </button>
            <span className="min-w-[88px] text-center font-medium text-ink tabular-nums">
                Page {safePage} of {pageCount}
            </span>
            <button
                type="button"
                aria-label="Next page"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-ink transition-colors hover:bg-line-soft disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-surface"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    </div>
</div>
                    </>
                )}
            </div>

            {/* ADD ITEM MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,24,39,0.4)] p-4" onClick={resetAddModal}>
                    <div className="box-border max-h-[82vh] w-[520px] max-w-full overflow-y-auto rounded-xl bg-surface p-5 shadow-[0_10px_30px_rgba(0,0,0,0.15)]" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-[15px] font-semibold text-ink">{editingItemId ? "Edit Item" : "Add Item"}</span>
                            <button className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-faint transition-colors hover:bg-line-soft hover:text-ink" onClick={resetAddModal}>
                                <X size={16} />
                            </button>
                        </div>

                        <label className={LABEL}>Part Name *</label>
                        <input
                            className={INPUT}
                            autoFocus
                            placeholder="e.g. Brake Pad Set — Front"
                            name="itemName"
                            value={formData.itemName}
                            onChange={handleInputChange}
                        />

                        <label className={`${LABEL} mt-3`}>Part Number *</label>
                        <input
                            className={INPUT}
                            placeholder="PN-00123"
                            name="partNumber"
                            value={formData.partNumber}
                            onChange={handleInputChange}
                        />

                        <div className={FIELD_ROW}>
                            <div>
                                <label className={LABEL}>Brand *</label>
                                <input
                                    className={INPUT}
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
                                <label className={LABEL}>Category *</label>
                                <select className={INPUT} name="categoryId" value={formData.categoryId} onChange={handleInputChange}>
                                    <option value="">Select category</option>
                                    {categories.filter((category) => category.active !== false).map((category) =>
                                        <option key={category.id} value={category.id}>{category.categoryName}</option>)}
                                </select>
                            </div>
                        </div>

                        <label className={`${LABEL} mt-3`}>Subcategory *</label>
                        <select className={INPUT} name="masterId" value={formData.masterId} onChange={handleInputChange}>
                            <option value="">Select subcategory</option>
                            {masterOptions.map((master) => <option key={master.id} value={master.id}>
                                {master.masterName}{masterOptions.filter((candidate) => candidate.masterName === master.masterName).length > 1 ? ` · ${master.categoryName} · #${master.id}` : ""}
                            </option>)}
                        </select>

                        <div className={FIELD_ROW}>
                            <div>
                                <label className={`${LABEL} mt-3`}>HSN Code *</label>
                                <input className={INPUT} placeholder="Enter HSN code" name="hsnCode" value={formData.hsnCode} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <label className={`${LABEL} mt-3`}>Unit *</label>
                                <select className={INPUT} name="stockUnit" value={formData.stockUnit || "PCS"} onChange={handleInputChange} required>
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
                            className="mt-4 block cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-semibold text-brand [font-family:inherit] hover:underline"
                            onClick={() => setShowMoreFields((v) => !v)}
                        >
                            {showMoreFields ? "Hide optional details" : "+ Add optional details"}
                        </button>

                        {showMoreFields && (
                            <div className="mt-3 rounded-lg border border-line-soft bg-surface-soft p-3">
                                <label className={LABEL_SM}>Description</label>
                                <textarea
                                    className={TEXTAREA}
                                    placeholder="Optional"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                />

                                <div className={FIELD_ROW}>
                                    <div>
                                        <label className={LABEL_SM}>OEM Number</label>
                                        <input className={INPUT_SM} placeholder="Optional" name="oemNumber" value={formData.oemNumber} onChange={handleInputChange} />
                                    </div>
                                    <div>
                                        <label className={LABEL_SM}>EAN / Barcode</label>
                                        <input className={INPUT_SM} placeholder="Optional" name="ean" value={formData.ean} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>
                        )}


                        <div className="mt-5 flex justify-end gap-3 max-sm:flex-col-reverse max-sm:[&>button]:w-full">
                            <button className={BTN_GHOST} onClick={resetAddModal}>Cancel</button>
                            <button className={BTN_PRIMARY} onClick={saveItem} disabled={saving}>
                                {saving ? <Loader2 size={15} className="animate-spin" /> : <Boxes size={15} />}
                                {saving ? "Saving…" : editingItemId ? "Save Changes" : "Save Item"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK UPLOAD MODAL */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,24,39,0.4)] p-4" onClick={() => setShowBulkModal(false)}>
                    <div className="box-border max-h-[82vh] w-[520px] max-w-full overflow-y-auto rounded-xl bg-surface p-5 shadow-[0_10px_30px_rgba(0,0,0,0.15)]" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-[15px] font-semibold text-ink">Bulk Upload Items</span>
                            <button className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-faint transition-colors hover:bg-line-soft hover:text-ink" onClick={() => setShowBulkModal(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        <p className="mb-4 text-[12.5px] leading-normal text-ink-muted">
                            Accepts .csv or .xlsx/.xls files with 9 columns: Brand, Category, Subcategory, Product
                            Name, Description, Part Number, OEM Number, EAN, HSN Code. Only Brand, Category,
                            Master, Product Name and Part Number are required — Brand/Category/Master are
                            created automatically if they don't exist yet. Pricing isn't supported in bulk
                            upload.
                        </p>

                        <button className="mb-4 inline-flex h-auto cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-[13.5px] font-semibold text-brand [font-family:inherit] hover:underline" onClick={downloadTemplate}>
                            <Download size={14} /> Download Excel Template
                        </button>

                        <div className="mb-2">
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                            />
                        </div>

                        {selectedFile && (
                            <p className="mt-2 mb-0 text-[12.5px] text-ink-soft">Selected: {selectedFile.name}</p>
                        )}

                        <div className="mt-5 flex justify-end gap-3 max-sm:flex-col-reverse max-sm:[&>button]:w-full">
                            <button className={BTN_GHOST} onClick={() => setShowBulkModal(false)}>Close</button>
                            <button className={BTN_PRIMARY} onClick={uploadItems} disabled={uploading}>
                                {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                                {uploading ? "Uploading…" : "Upload File"}
                            </button>
                        </div>

                        {bulkResult && bulkResult.failedRows && bulkResult.failedRows.length > 0 && (
                            <div className="mt-4 max-h-[140px] overflow-y-auto rounded-lg border border-red-100 bg-red-50 p-3">
                                <p className={LABEL}>Skipped rows</p>
                                <ul className="m-0 pl-[18px] text-[13px] text-red-700">
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
                <div
                    className={`fixed right-6 bottom-6 z-[60] animate-[itemsToastIn_0.2s_ease_both] rounded-lg border px-5 py-3 text-[13.5px] font-medium shadow-[0_6px_16px_rgba(0,0,0,0.15)] ${
                        toast.type === "error"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-600"
                    }`}
                >
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