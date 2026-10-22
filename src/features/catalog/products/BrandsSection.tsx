import { useState, useEffect, useMemo } from "react";
import {
  Tag,
  Plus,
  Download,
  UploadCloud,
  Loader2,
  X,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import api from "../../../services/api";

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

  useEffect(() => {
    loadBrands();
  }, []);

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
    const q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.brandName?.toLowerCase().includes(q));
  }, [brands, query]);

  const activeCount = useMemo(
    () => brands.filter((b) => b.active).length,
    [brands],
  );

  const latestBrand = useMemo(() => {
    if (!brands.length) return "—";
    const sorted = [...brands].sort(
      (a, b) => Number(b.id || 0) - Number(a.id || 0),
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
    const csvContent = ["Brand Name", "Bosch", "Bajaj", "TVS", "Mahindra"].join(
      "\n",
    );
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
    <div className="flex flex-col gap-4">
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-4 p-4 px-5 bg-[#f8fbff] border border-[#dbeafe] border-l-[3px] border-l-[#2563eb] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] hover:-translate-y-[1px] transition-all">
          <span className="inline-flex items-center justify-center flex-shrink-0 w-[42px] h-[42px] rounded-[10px] bg-[#dbeafe] text-[#2563eb]">
            <Tag size={18} />
          </span>
          <div className="flex flex-col min-w-0 gap-0.5">
            <span className="text-[11.5px] font-bold tracking-wider uppercase text-slate-500">
              Total Brands
            </span>
            <strong className="text-[22px] font-extrabold text-slate-900 leading-none tracking-tight tabular-nums truncate">
              {brands.length}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 px-5 bg-[#f7fdf9] border border-[#bbf7d0] border-l-[3px] border-l-[#16a34a] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] hover:-translate-y-[1px] transition-all">
          <span className="inline-flex items-center justify-center flex-shrink-0 w-[42px] h-[42px] rounded-[10px] bg-[#dcfce7] text-[#16a34a]">
            <CheckCircle2 size={18} />
          </span>
          <div className="flex flex-col min-w-0 gap-0.5">
            <span className="text-[11.5px] font-bold tracking-wider uppercase text-slate-500">
              Active
            </span>
            <strong className="text-[22px] font-extrabold text-slate-900 leading-none tracking-tight tabular-nums truncate">
              {activeCount}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 px-5 bg-[#f9f7ff] border border-[#ddd6fe] border-l-[3px] border-l-[#7c3aed] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] hover:-translate-y-[1px] transition-all">
          <span className="inline-flex items-center justify-center flex-shrink-0 w-[42px] h-[42px] rounded-[10px] bg-[#ede9fe] text-[#7c3aed]">
            <Sparkles size={18} />
          </span>
          <div className="flex flex-col min-w-0 gap-0.5">
            <span className="text-[11.5px] font-bold tracking-wider uppercase text-slate-500">
              Latest Added
            </span>
            <strong
              className="text-base font-bold text-slate-900 leading-none truncate"
              title={latestBrand}
            >
              {latestBrand}
            </strong>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs flex flex-col">
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-blue-600" /> Loading
            brands…
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            No brands found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] min-h-[300px] scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
              <table className="w-full border-collapse table-fixed">
                <colgroup>
                  <col style={{ width: "45%" }} />
                  <col style={{ width: "35%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] tracking-wider uppercase text-slate-700 py-3.5 px-5 font-bold whitespace-nowrap border-b border-slate-200">
                      Brand
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] tracking-wider uppercase text-slate-700 py-3.5 px-5 font-bold whitespace-nowrap border-b border-slate-200">
                      Slug
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] tracking-wider uppercase text-slate-700 py-3.5 px-5 font-bold whitespace-nowrap border-b border-slate-200">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredBrands.map((brand) => (
                    <tr
                      key={brand.id}
                      className="hover:bg-blue-50/40 transition-colors duration-150 group"
                    >
                      <td className="py-3.5 px-5 text-xs font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                        {brand.brandName}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-600 font-mono truncate">
                        {brand.slug || "—"}
                      </td>
                      <td className="py-3.5 px-5 text-xs">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            brand.active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {brand.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="py-3 px-5 text-xs font-medium text-slate-500 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between">
              <span className="text-slate-600">
                Showing{" "}
                <strong className="text-slate-900 font-bold tabular-nums">
                  {filteredBrands.length}
                </strong>{" "}
                of{" "}
                <strong className="text-slate-900 font-bold tabular-nums">
                  {brands.length}
                </strong>{" "}
                brands
              </span>
              {filteredBrands.length !== brands.length && (
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  Filtered by search
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ADD BRAND MODAL */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={resetAddModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-[420px] p-5 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-base font-bold text-slate-900">
                Add Brand
              </span>
              <button
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                onClick={resetAddModal}
              >
                <X size={16} />
              </button>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Brand Name *
            </label>
            <input
              className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-slate-900 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition mb-4"
              autoFocus
              placeholder="e.g. Bosch"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveBrand()}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                className="px-4 py-2 border border-slate-200 rounded-md text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                onClick={resetAddModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                onClick={saveBrand}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Plus size={15} />
                )}
                {saving ? "Saving…" : "Save Brand"}
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
            className="bg-white rounded-xl shadow-xl w-full max-w-[480px] p-5 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-base font-bold text-slate-900">
                Bulk Upload Brands
              </span>
              <button
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                onClick={() => setShowBulkModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <button
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 mb-4 cursor-pointer"
              onClick={downloadSampleFile}
            >
              <Download size={14} /> Download Sample CSV
            </button>

            <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg mb-4 bg-slate-50/50">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                className="px-4 py-2 border border-slate-200 rounded-md text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                onClick={() => setShowBulkModal(false)}
              >
                Close
              </button>
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                onClick={uploadBrands}
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
    </div>
  );
}

export default BrandsSection;
