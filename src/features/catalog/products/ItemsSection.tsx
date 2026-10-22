import ProductUnitFields, {
  ProductUnitLabel,
} from "../../../components/ProductUnitFields";
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

const EMPTY_FORM = {
  itemName: "",
  stockUnit: "PCS",
  packSize: null,
  contentsUnit: null,
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
    const q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      [
        it.itemName,
        it.partNumber,
        it.oemNumber,
        it.brandName,
        it.categoryName,
        it.masterName,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, query]);

  const brandOptions = useMemo(
    () => brands.map((b) => b.brandName).filter(Boolean),
    [brands],
  );
  const categoryOptions = useMemo(
    () => categories.map((c) => c.categoryName).filter(Boolean),
    [categories],
  );
  const masterOptions = useMemo(
    () =>
      masters
        .filter(
          (m) =>
            !formData.categoryName || m.categoryName === formData.categoryName,
        )
        .map((m) => m.masterName)
        .filter(Boolean),
    [formData.categoryName, masters],
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "masterName") {
        const selectedMaster = masters.find((m) => m.masterName === value);
        return {
          ...prev,
          masterName: value,
          categoryName: selectedMaster?.categoryName || prev.categoryName,
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const resetAddModal = () => {
    setFormData(EMPTY_FORM);
    setShowMoreFields(false);
    setShowAddModal(false);
  };

  const saveItem = async () => {
    if (!formData.itemName.trim()) {
      setToast({ type: "error", msg: "Item name is required." });
      return;
    }
    setSaving(true);
    try {
      await apiclient.post("/products", formData);
      setToast({ type: "success", msg: "Item created successfully." });
      resetAddModal();
      loadData();
    } catch (error) {
      console.error("Failed to save item", error);
      setToast({
        type: "error",
        msg: error?.response?.data?.message || "Error saving item.",
      });
    }
    setSaving(false);
  };

  const downloadTemplate = async () => {
    try {
      const response = await apiclient.get("/products/template", {
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
    <div className="text-slate-800 w-full flex flex-col min-w-0">
      {/* TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs flex flex-col">
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-blue-600" /> Loading
            items…
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            No items found.
          </div>
        ) : (
          <>
            {/* Scrollable table viewport with sticky header */}
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-235px)] min-h-[350px] scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
              <table className="w-full border-collapse table-fixed">
                <colgroup>
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "27%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] tracking-wider uppercase text-slate-700 py-3.5 px-4 font-bold whitespace-nowrap border-b border-slate-200">
                      Part Number
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] tracking-wider uppercase text-slate-700 py-3.5 px-4 font-bold whitespace-nowrap border-b border-slate-200">
                      Part Name
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] tracking-wider uppercase text-slate-700 py-3.5 px-4 font-bold whitespace-nowrap border-b border-slate-200">
                      Brand
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] tracking-wider uppercase text-slate-700 py-3.5 px-4 font-bold whitespace-nowrap border-b border-slate-200">
                      Category
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] tracking-wider uppercase text-slate-700 py-3.5 px-4 font-bold whitespace-nowrap border-b border-slate-200">
                      Subcategory
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50 text-center text-[11px] tracking-wider uppercase text-slate-700 py-3.5 px-4 font-bold whitespace-nowrap border-b border-slate-200">
                      Fitment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/40 transition-colors duration-150 group"
                    >
                      <td className="py-3 px-4 text-xs font-bold text-slate-900 font-mono tracking-tight truncate group-hover:text-blue-700 transition-colors">
                        {item.partNumber || "—"}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-800 truncate">
                        {item.itemName}
                        <ProductUnitLabel product={item} />
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 truncate">
                        {item.brandName || "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 truncate">
                        {item.categoryName || "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 truncate">
                        {item.masterName || "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-center">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-1.5 h-[30px] px-3 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 rounded-lg text-blue-700 text-xs font-bold whitespace-nowrap cursor-pointer transition-all duration-150 hover:shadow-xs active:translate-y-px"
                          onClick={() => setFitmentPart(item)}
                        >
                          <Wrench size={13} className="text-blue-600" />
                          Fitment
                          {item.fitmentCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white ml-0.5">
                              {item.fitmentCount}
                            </span>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pinned table footer */}
            <div className="py-3 px-4 text-xs font-medium text-slate-500 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between">
              <span className="text-slate-600">
                Showing{" "}
                <strong className="text-slate-900 font-bold tabular-nums">
                  {filteredItems.length}
                </strong>{" "}
                of{" "}
                <strong className="text-slate-900 font-bold tabular-nums">
                  {items.length}
                </strong>{" "}
                items
              </span>
              {filteredItems.length !== items.length && (
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  Filtered by search
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ADD ITEM MODAL */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={resetAddModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-[540px] p-6 border border-slate-200 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-base font-bold text-slate-900">
                Add Item
              </span>
              <button
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                onClick={resetAddModal}
              >
                <X size={16} />
              </button>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Item Name *
            </label>
            <input
              className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-slate-900 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 mb-3"
              autoFocus
              placeholder="e.g. Brake Pad Set — Front"
              name="itemName"
              value={formData.itemName}
              onChange={handleInputChange}
            />

            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Part Number
            </label>
            <input
              className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-slate-900 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 mb-3"
              placeholder="PN-00123"
              name="partNumber"
              value={formData.partNumber}
              onChange={handleInputChange}
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Brand
                </label>
                <input
                  className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-slate-900 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  list="brand-options"
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleInputChange}
                  placeholder="Type or pick"
                  autoComplete="off"
                />
                <datalist id="brand-options">
                  {brandOptions.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Category
                </label>
                <input
                  className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-slate-900 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  list="category-options"
                  name="categoryName"
                  value={formData.categoryName}
                  onChange={handleInputChange}
                  placeholder="Type or pick"
                  autoComplete="off"
                />
                <datalist id="category-options">
                  {categoryOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Master
            </label>
            <input
              className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-slate-900 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 mb-3"
              list="master-options"
              name="masterName"
              value={formData.masterName}
              onChange={handleInputChange}
              placeholder="Type or pick"
              autoComplete="off"
            />
            <datalist id="master-options">
              {masterOptions.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>

            <button
              type="button"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 py-1 mb-3 cursor-pointer"
              onClick={() => setShowMoreFields((v) => !v)}
            >
              {showMoreFields
                ? "Hide optional details"
                : "+ Add optional details"}
            </button>

            {showMoreFields && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-3 grid gap-2.5">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Description
                </label>
                <textarea
                  className="w-full h-16 p-2 border border-slate-300 rounded-md bg-white text-xs text-slate-900 outline-none"
                  placeholder="Optional"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      OEM Number
                    </label>
                    <input
                      className="w-full h-8 px-2 border border-slate-300 rounded bg-white text-xs"
                      placeholder="Optional"
                      name="oemNumber"
                      value={formData.oemNumber}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      EAN / Barcode
                    </label>
                    <input
                      className="w-full h-8 px-2 border border-slate-300 rounded bg-white text-xs"
                      placeholder="Optional"
                      name="ean"
                      value={formData.ean}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    HSN Code
                  </label>
                  <input
                    className="w-full h-8 px-2 border border-slate-300 rounded bg-white text-xs"
                    placeholder="Optional"
                    name="hsnCode"
                    value={formData.hsnCode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            <section className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg mb-4">
              <h3 className="m-0 text-xs font-bold text-slate-900 mb-0.5">
                Unit and pack size
              </h3>
              <p className="m-0 text-[11px] text-slate-500 mb-2.5">
                Quantity counts the selected stock unit. Example: one can
                contains 3.5 L.
              </p>
              <ProductUnitFields
                value={formData}
                onChange={setFormData}
                disabled={saving}
              />
            </section>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                className="px-4 py-2 border border-slate-200 rounded-md text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                onClick={resetAddModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                onClick={saveItem}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Boxes size={15} />
                )}
                {saving ? "Saving…" : "Save Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      {showBulkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowBulkModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] p-6 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-base font-bold text-slate-900">
                Bulk Upload Items
              </span>
              <button
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                onClick={() => setShowBulkModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Accepts .csv or .xlsx/.xls files with 9 columns: Brand, Category,
              Master, Product Name, Description, Part Number, OEM Number, EAN,
              HSN Code. Pricing isn't supported in bulk upload.
            </p>

            <button
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 mb-4 cursor-pointer"
              onClick={downloadTemplate}
            >
              <Download size={14} /> Download Excel Template
            </button>

            <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg mb-4 bg-slate-50/50">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              />
            </div>

            {selectedFile && (
              <p className="text-xs text-slate-600 mb-3 font-medium">
                Selected: {selectedFile.name}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                className="px-4 py-2 border border-slate-200 rounded-md text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                onClick={() => setShowBulkModal(false)}
              >
                Close
              </button>
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                onClick={uploadItems}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <UploadCloud size={15} />
                )}
                {uploading ? "Uploading…" : "Upload File"}
              </button>
            </div>

            {bulkResult &&
              bulkResult.failedRows &&
              bulkResult.failedRows.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg max-h-40 overflow-y-auto">
                  <p className="text-xs font-bold text-red-700 uppercase mb-1">
                    Skipped rows
                  </p>
                  <ul className="m-0 pl-4 text-xs text-red-600">
                    {bulkResult.failedRows.map((f, idx) => (
                      <li key={idx}>
                        Row {f.rowNumber}: {f.reason}
                      </li>
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
          className={`fixed bottom-5 right-5 z-50 py-2.5 px-4 rounded-lg shadow-lg text-sm font-semibold text-white ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
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
