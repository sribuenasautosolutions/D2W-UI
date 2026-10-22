import { useState, useEffect, useMemo, useRef } from "react";
import api from "../../../services/api";
import {
  GitMerge,
  Search,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Plus,
  UploadCloud,
  FileSpreadsheet,
  X,
  FileUp,
  Download,
  Hash,
} from "lucide-react";

/* =========================================================================
   CONFIG
   ========================================================================= */

/* =========================================================================
   STYLES — identical token system as ItemsSection (pim-root)
   ========================================================================= */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

.cr-root{
  --ink:#1C2333; --ink-soft:#5B6478; --paper:#F3F4F9; --surface:#FFFFFF;
  --line:#E4E7F0; --signal:#D6571F; --signal-dark:#B8460F; --signal-bg:#FCEAE0;
  --success:#1F9D55; --success-bg:#E8F8EF; --danger:#DC2626; --danger-bg:#FDEDEC;
  --focus:rgba(214,87,31,0.28);
  font-family:'Inter',sans-serif; color:var(--ink); background:var(--paper);
  min-height:100vh; padding:32px 24px 80px; box-sizing:border-box;
}
.cr-root *{ box-sizing:border-box; }
.cr-shell{ max-width:1100px; margin:0 auto; }

/* header */
.cr-header{ margin-bottom:28px; }
.cr-eyebrow{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:var(--signal); font-weight:600; margin:0 0 6px; }
.cr-title{ font-family:'Space Grotesk',sans-serif; font-size:28px; font-weight:700; margin:0 0 4px; letter-spacing:-0.01em; }
.cr-subtitle{ font-size:14px; color:var(--ink-soft); margin:0; }

/* toast */
.cr-toast{ position:fixed; top:22px; right:22px; z-index:50; display:flex; align-items:center; gap:10px; padding:13px 18px; border-radius:10px; box-shadow:0 10px 25px -8px rgba(0,0,0,0.25); font-size:13.5px; font-weight:500; animation:cr-slide .25s ease-out; max-width:360px; }
.cr-toast.success{ background:var(--ink); color:#fff; }
.cr-toast.success svg{ color:#5fe0a0; }
.cr-toast.error{ background:#fff; color:var(--danger); border:1px solid #f5c6c0; }
.cr-toast svg{ width:18px; height:18px; flex-shrink:0; }
@keyframes cr-slide{ from{ opacity:0; transform:translateY(-8px); } to{ opacity:1; transform:translateY(0); } }

/* banner */
.cr-banner{ display:flex; align-items:flex-start; gap:10px; padding:14px 16px; border-radius:10px; margin-bottom:20px; font-size:13.5px; background:var(--danger-bg); color:#8a2a23; border:1px solid #f5c6c0; }
.cr-banner button{ margin-left:auto; flex-shrink:0; border:1px solid currentColor; background:transparent; color:inherit; font-weight:600; font-size:12.5px; padding:5px 10px; border-radius:7px; cursor:pointer; display:flex; align-items:center; gap:5px; }

/* card */
.cr-card{ background:#fff; border:1px solid var(--line); border-radius:14px; padding:26px 28px; margin-bottom:22px; }
.cr-card-head{ display:flex; align-items:center; gap:10px; margin-bottom:22px; padding-bottom:16px; border-bottom:1px solid var(--line); }
.cr-card-head .icon-wrap{ width:36px; height:36px; border-radius:10px; background:var(--signal-bg); color:var(--signal-dark); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.cr-card-head .icon-wrap svg{ width:18px; height:18px; }
.cr-card-title{ font-family:'Space Grotesk',sans-serif; font-size:17px; font-weight:700; margin:0; }
.cr-card-sub{ font-size:12px; color:var(--ink-soft); margin:2px 0 0; font-family:'JetBrains Mono',monospace; }

/* form grid */
.cr-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:16px; margin-bottom:20px; }
.cr-field{ display:flex; flex-direction:column; gap:6px; }
.cr-label{ font-size:12px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:var(--ink-soft); }
.cr-input, .cr-select{ width:100%; padding:10px 12px; border:1.5px solid var(--line); border-radius:9px; font-size:14px; color:var(--ink); background:#fff; font-family:'Inter',sans-serif; transition:border-color .15s, box-shadow .15s; }
.cr-select{ appearance:none; background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M0 0l5 6 5-6z' fill='%235B6478'/></svg>"); background-repeat:no-repeat; background-position:right 14px center; padding-right:34px; }
.cr-input:focus, .cr-select:focus{ outline:none; border-color:var(--signal); box-shadow:0 0 0 3px var(--focus); }
.cr-input.mono{ font-family:'JetBrains Mono',monospace; font-size:13.5px; }

/* buttons */
.cr-btn{ display:inline-flex; align-items:center; gap:7px; border-radius:9px; padding:10px 18px; font-size:13.5px; font-weight:600; cursor:pointer; border:1.5px solid transparent; font-family:'Inter',sans-serif; transition:transform .1s, background .15s, border-color .15s; }
.cr-btn:disabled{ opacity:0.5; cursor:not-allowed; }
.cr-btn:active:not(:disabled){ transform:scale(0.98); }
.cr-btn svg{ width:15px; height:15px; }
.cr-btn-primary{ background:var(--signal); color:#fff; }
.cr-btn-primary:hover:not(:disabled){ background:var(--signal-dark); }
.cr-btn-ghost{ background:#fff; color:var(--ink); border-color:var(--line); }
.cr-btn-ghost:hover:not(:disabled){ border-color:var(--ink-soft); }
.cr-btn-success{ background:#16a34a; color:#fff; border-color:#16a34a; }
.cr-btn-success:hover:not(:disabled){ background:#15803d; }
.cr-spin{ animation:cr-rotate .8s linear infinite; }
@keyframes cr-rotate{ to{ transform:rotate(360deg); } }

/* product pill */
.cr-product-pill{ display:inline-flex; align-items:center; gap:8px; background:var(--signal-bg); border:1px solid #f3c09a; border-radius:8px; padding:6px 12px; font-size:13px; font-weight:600; color:var(--signal-dark); margin-bottom:18px; }
.cr-product-pill .mono{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--ink-soft); margin-left:4px; }

/* table */
.cr-table-toolbar{ display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:16px; flex-wrap:wrap; }
.cr-search{ position:relative; flex:1; max-width:320px; }
.cr-search svg{ position:absolute; left:12px; top:50%; transform:translateY(-50%); width:15px; height:15px; color:var(--ink-soft); }
.cr-search input{ width:100%; padding:9px 12px 9px 34px; border:1.5px solid var(--line); border-radius:9px; font-size:13.5px; font-family:'Inter',sans-serif; color:var(--ink); background:#fff; }
.cr-search input:focus{ outline:none; border-color:var(--signal); box-shadow:0 0 0 3px var(--focus); }
.cr-table-meta{ font-size:12.5px; color:var(--ink-soft); font-family:'JetBrains Mono',monospace; }
.cr-table-wrap{ overflow-x:auto; overflow-y:auto; max-height:calc(100vh - 320px); min-height:300px; border:1px solid var(--line); border-radius:12px; scrollbar-width:thin; }
.cr-table{ width:100%; border-collapse:collapse; font-size:13.5px; min-width:560px; }
.cr-table thead{ position:sticky; top:0; z-index:10; }
.cr-table th{ position:sticky; top:0; z-index:10; text-align:left; padding:12px 16px; background:#f3f4f9; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--ink-soft); border-bottom:1px solid var(--line); white-space:nowrap; box-shadow:0 1px 0 0 var(--line); }
.cr-table td{ padding:12px 16px; border-bottom:1px solid var(--line); vertical-align:middle; }
.cr-table tr:last-child td{ border-bottom:none; }
.cr-table tr:hover td{ background:#fafbff; }
.cr-mono{ font-family:'JetBrains Mono',monospace; font-size:12.5px; }
.cr-brand-chip{ display:inline-flex; align-items:center; gap:5px; background:var(--paper); border:1px solid var(--line); padding:3px 9px; border-radius:6px; font-size:12.5px; font-weight:600; color:var(--ink); }
.cr-icon-btn{ border:1px solid var(--line); background:#fff; border-radius:7px; padding:6px; cursor:pointer; display:flex; color:var(--ink-soft); transition:all .15s; }
.cr-icon-btn.danger:hover{ border-color:#f5c6c0; color:var(--danger); background:var(--danger-bg); }
.cr-empty{ text-align:center; padding:50px 20px; color:var(--ink-soft); }
.cr-empty svg{ width:34px; height:34px; margin-bottom:10px; color:var(--line); display:block; margin-left:auto; margin-right:auto; }
.cr-empty p{ margin:0; font-size:13.5px; }
.cr-empty-hint{ font-size:12px; color:#b0b8cc; margin-top:4px; }

/* filter tabs */
.cr-filter-tabs{ display:flex; gap:4px; background:var(--paper); border:1px solid var(--line); padding:4px; border-radius:10px; }
.cr-filter-tab{ border:none; background:transparent; padding:6px 14px; border-radius:7px; font-size:12.5px; font-weight:600; color:var(--ink-soft); cursor:pointer; font-family:'Inter',sans-serif; transition:background .15s, color .15s; white-space:nowrap; }
.cr-filter-tab:hover{ color:var(--ink); }
.cr-filter-tab.active{ background:#fff; color:var(--ink); box-shadow:0 1px 3px rgba(0,0,0,0.08); }

/* bulk upload */
.cr-drop{ border:2px dashed var(--line); border-radius:14px; padding:36px 24px; text-align:center; background:#fff; cursor:pointer; transition:border-color .15s, background .15s; }
.cr-drop.drag{ border-color:var(--signal); background:var(--signal-bg); }
.cr-drop .icon-wrap{ width:48px; height:48px; border-radius:50%; background:var(--paper); display:flex; align-items:center; justify-content:center; margin:0 auto 12px; color:var(--signal); }
.cr-drop-title{ font-weight:600; font-size:14.5px; margin:0 0 4px; }
.cr-drop-sub{ font-size:12.5px; color:var(--ink-soft); margin:0; }
.cr-file-chip{ display:flex; align-items:center; gap:10px; background:#fff; border:1px solid var(--line); border-radius:10px; padding:10px 14px; margin-top:14px; }
.cr-file-chip svg{ color:var(--signal); flex-shrink:0; }
.cr-file-name{ font-size:13.5px; font-weight:600; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cr-file-size{ font-size:12px; color:var(--ink-soft); font-family:'JetBrains Mono',monospace; }
.cr-file-chip button{ border:none; background:transparent; color:var(--ink-soft); cursor:pointer; display:flex; }
.cr-bulk-actions{ display:flex; gap:10px; margin-top:16px; flex-wrap:wrap; }
.cr-upload-stats{ display:flex; gap:12px; margin-top:14px; flex-wrap:wrap; }
.cr-upload-stat{ font-size:12.5px; font-family:'JetBrains Mono',monospace; padding:6px 12px; border-radius:7px; border:1px solid var(--line); background:var(--paper); }
.cr-upload-stat.inserted{ color:var(--success); background:var(--success-bg); border-color:#b6e8ce; }
.cr-upload-stat.skipped{ color:#b45309; background:#fffbeb; border-color:#fcd34d; }
.cr-upload-error{ margin-top:10px; font-size:12.5px; color:var(--danger); background:var(--danger-bg); border:1px solid #f5c6c0; border-radius:8px; padding:8px 12px; }

/* stats bar */
.cr-stats{ display:flex; gap:14px; margin-bottom:22px; flex-wrap:wrap; }
.cr-stat-card{ flex:1; min-width:130px; background:#fff; border:1px solid var(--line); border-radius:12px; padding:16px 18px; }
.cr-stat-val{ font-family:'Space Grotesk',sans-serif; font-size:26px; font-weight:700; color:var(--ink); line-height:1; }
.cr-stat-label{ font-size:12px; color:var(--ink-soft); margin-top:4px; font-weight:500; }

@media(max-width:600px){
  .cr-root{ padding:20px 14px 60px; }
  .cr-card{ padding:20px 18px; }
  .cr-grid{ grid-template-columns:1fr; }
}
@media(prefers-reduced-motion:reduce){
  .cr-toast{ animation:none; }
  .cr-spin{ animation-duration:1.4s; }
}
`;

const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb > 1024 ? (kb / 1024).toFixed(1) + " MB" : kb.toFixed(0) + " KB";
};

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */

function CrossReferenceSection() {
  const [products, setProducts] = useState([]);
  const [allCrossRefs, setAllCrossRefs] = useState([]); // ALL cross refs loaded upfront
  const [loadingAll, setLoadingAll] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Add form
  const [selectedProductId, setSelectedProductId] = useState("");
  const [crossBrand, setCrossBrand] = useState("");
  const [crossPartNumber, setCrossPartNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // Table filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProductId, setFilterProductId] = useState("all");

  // Bulk upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const [status, setStatus] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  // Fetch products + ALL cross references at once
  const fetchAll = async () => {
    setLoadingAll(true);
    setFetchError(false);
    try {
      const [pRes, crRes] = await Promise.all([
        api.get(`/products`),
        api.get(`/cross-references`),
      ]);
      setProducts(pRes.data || []);
      setAllCrossRefs(crRes.data || []);
    } catch (e) {
      // If bulk endpoint fails, try products only then cross-refs per product
      try {
        const pRes = await api.get(`/products`);
        setProducts(pRes.data || []);
        // Load cross refs for all products in parallel
        const prods = pRes.data || [];
        if (prods.length > 0) {
          const crResults = await Promise.allSettled(
            prods.map((p) => api.get(`/cross-references/product/${p.id}`)),
          );
          const merged = crResults
            .filter((r) => r.status === "fulfilled")
            .flatMap((r) => r.value.data || []);
          setAllCrossRefs(merged);
        }
      } catch (e2) {
        setFetchError(true);
      }
    }
    setLoadingAll(false);
  };

  const handleSave = async () => {
    if (!selectedProductId || !crossBrand.trim() || !crossPartNumber.trim()) {
      setStatus({
        type: "error",
        msg: "Select a product and fill in both Cross Brand and Cross Part Number.",
      });
      return;
    }
    setSaving(true);
    try {
      const response = await api.post("/cross-references", {
        productId: Number(selectedProductId),
        crossBrand: crossBrand.trim(),
        crossPartNumber: crossPartNumber.trim(),
      });
      setCrossBrand("");
      setCrossPartNumber("");
      setStatus({
        type: "success",
        msg: response.data || "Cross reference saved successfully.",
      });
      fetchAll();
    } catch (e) {
      setStatus({
        type: "error",
        msg: "Failed to save cross reference. Please try again.",
      });
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this cross reference? This can't be undone."))
      return;
    try {
      await api.delete(`/cross-references/${id}`);
      setStatus({ type: "success", msg: "Cross reference deleted." });
      setAllCrossRefs((prev) => prev.filter((cr) => cr.id !== id));
    } catch (e) {
      setStatus({ type: "error", msg: "Failed to delete cross reference." });
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadResult(null);
    const data = new FormData();
    data.append("file", selectedFile);
    try {
      const res = await api.post("/cross-references/bulk-upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadResult(res.data || {});
      const hasErrors = res.data?.failedRows?.length > 0;
      setStatus({
        type: hasErrors ? "error" : "success",
        msg: hasErrors
          ? `Upload done with errors. Inserted: ${res.data.successRows} | Skipped: ${res.data.skippedRows}`
          : `Upload complete. Inserted: ${res.data.successRows} | Skipped: ${res.data.skippedRows}`,
      });
      if (!hasErrors) setSelectedFile(null);
      fetchAll();
    } catch (e) {
      setStatus({
        type: "error",
        msg: "Bulk upload failed. Check the file and try again.",
      });
    }
    setUploading(false);
  };

  const downloadTemplate = () => {
    const csv =
      "Part Number,Cross Brand,Cross Part Number\nBRK-1234,Valeo,VP-00123\n";
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "cross-reference-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Enrich cross refs with product info for display
  const enrichedCrossRefs = useMemo(() => {
    return allCrossRefs.map((cr) => {
      const product = products.find(
        (p) => String(p.id) === String(cr.productId),
      );
      return { ...cr, product };
    });
  }, [allCrossRefs, products]);

  // Filter by product tab + search
  const filteredCrossRefs = useMemo(() => {
    let list = enrichedCrossRefs;
    if (filterProductId !== "all") {
      list = list.filter(
        (cr) => String(cr.productId) === String(filterProductId),
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((cr) =>
        [
          cr.crossBrand,
          cr.crossPartNumber,
          cr.product?.itemName,
          cr.product?.partNumber,
          cr.product?.brandName,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    return list;
  }, [enrichedCrossRefs, filterProductId, searchQuery]);

  // Unique products that actually have cross refs (for filter tabs)
  const productsWithCrossRefs = useMemo(() => {
    const ids = new Set(allCrossRefs.map((cr) => String(cr.productId)));
    return products.filter((p) => ids.has(String(p.id)));
  }, [allCrossRefs, products]);

  return (
    <div className="cr-root">
      <style>{CSS}</style>

      {status && (
        <div className={`cr-toast ${status.type}`}>
          {status.type === "success" ? <CheckCircle2 /> : <AlertTriangle />}
          {status.msg}
        </div>
      )}

      <div className="cr-shell">
        {/* Header */}
        <div className="cr-header">
          <p className="cr-eyebrow">Catalog Manager</p>
          <h1 className="cr-title">Cross References</h1>
          <p className="cr-subtitle">
            Map competitor and alternate brand part numbers to items in your
            catalog.
          </p>
        </div>

        {fetchError && (
          <div className="cr-banner">
            <AlertTriangle size={18} />
            <span>
              Can't reach the server. Make sure your backend is running, then
              retry.
            </span>
            <button onClick={fetchAll}>
              <RefreshCw size={13} className={loadingAll ? "cr-spin" : ""} />{" "}
              Retry
            </button>
          </div>
        )}

        {/* Stats bar */}
        <div className="cr-stats">
          <div className="cr-stat-card">
            <div className="cr-stat-val">{allCrossRefs.length}</div>
            <div className="cr-stat-label">Total cross references</div>
          </div>
          <div className="cr-stat-card">
            <div className="cr-stat-val">{productsWithCrossRefs.length}</div>
            <div className="cr-stat-label">Products mapped</div>
          </div>
          <div className="cr-stat-card">
            <div className="cr-stat-val">
              {
                new Set(allCrossRefs.map((cr) => cr.crossBrand).filter(Boolean))
                  .size
              }
            </div>
            <div className="cr-stat-label">Unique cross brands</div>
          </div>
          <div className="cr-stat-card">
            <div className="cr-stat-val">{products.length}</div>
            <div className="cr-stat-label">Products in catalog</div>
          </div>
        </div>

        {/* ── ADD CROSS REFERENCE ── */}
        <div className="cr-card">
          <div className="cr-card-head">
            <span className="icon-wrap">
              <Plus />
            </span>
            <div>
              <p className="cr-card-title">Add Cross Reference</p>
              <p className="cr-card-sub">
                Link an alternate part number from another brand
              </p>
            </div>
          </div>

          <div className="cr-grid">
            <div className="cr-field" style={{ gridColumn: "1 / -1" }}>
              <label className="cr-label">Product</label>
              <select
                className="cr-select"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.itemName} ({p.partNumber}) — {p.brandName}
                  </option>
                ))}
              </select>
            </div>

            <div className="cr-field">
              <label className="cr-label">Cross Brand</label>
              <input
                className="cr-input"
                value={crossBrand}
                onChange={(e) => setCrossBrand(e.target.value)}
                placeholder="e.g. Valeo"
              />
            </div>

            <div className="cr-field">
              <label className="cr-label">Cross Part Number</label>
              <input
                className="cr-input mono"
                value={crossPartNumber}
                onChange={(e) => setCrossPartNumber(e.target.value)}
                placeholder="e.g. VP-00123"
              />
            </div>
          </div>

          <button
            className="cr-btn cr-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="cr-spin" /> : <CheckCircle2 />}
            {saving ? "Saving…" : "Save Cross Reference"}
          </button>
        </div>

        {/* ── BULK UPLOAD ── */}
        <div className="cr-card">
          <div className="cr-card-head">
            <span className="icon-wrap">
              <UploadCloud />
            </span>
            <div>
              <p className="cr-card-title">Bulk Upload</p>
              <p className="cr-card-sub">
                Import cross references from a spreadsheet
              </p>
            </div>
          </div>

          <div
            className={`cr-drop ${dragOver ? "drag" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.[0]) {
                setSelectedFile(e.dataTransfer.files[0]);
                setUploadResult(null);
              }
            }}
          >
            <span className="icon-wrap">
              <FileUp />
            </span>
            <p className="cr-drop-title">Drag & drop your file here</p>
            <p className="cr-drop-sub">
              or click to browse — CSV, XLS, or XLSX
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              style={{ display: "none" }}
              onChange={(e) => {
                setSelectedFile(e.target.files[0]);
                setUploadResult(null);
              }}
            />
          </div>

          {selectedFile && (
            <div className="cr-file-chip">
              <FileSpreadsheet size={20} />
              <span className="cr-file-name">{selectedFile.name}</span>
              <span className="cr-file-size">
                {formatBytes(selectedFile.size)}
              </span>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setUploadResult(null);
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {uploadResult && !uploading && (
            <div style={{ marginTop: 14 }}>
              <div className="cr-upload-stats">
                <span className="cr-upload-stat">
                  Total: {uploadResult.totalRows ?? "—"}
                </span>
                <span className="cr-upload-stat inserted">
                  Inserted: {uploadResult.successRows ?? "—"}
                </span>
                <span className="cr-upload-stat skipped">
                  Skipped: {uploadResult.skippedRows ?? "—"}
                </span>
              </div>
              {Array.isArray(uploadResult.failedRows) &&
                uploadResult.failedRows.length > 0 && (
                  <div className="cr-upload-error">
                    <strong>Error:</strong> {uploadResult.failedRows[0]?.reason}
                    {uploadResult.failedRows.length > 1 &&
                      ` (+${uploadResult.failedRows.length - 1} more)`}
                  </div>
                )}
            </div>
          )}

          <div className="cr-bulk-actions">
            <button
              className="cr-btn cr-btn-success"
              onClick={handleBulkUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? <Loader2 className="cr-spin" /> : <UploadCloud />}
              {uploading ? "Uploading…" : "Upload Cross References"}
            </button>
            <button
              type="button"
              className="cr-btn cr-btn-ghost"
              onClick={downloadTemplate}
            >
              <Download /> Download Template
            </button>
          </div>
        </div>

        {/* ── CROSS REFERENCE TABLE ── */}
        <div className="cr-card">
          <div className="cr-card-head">
            <span className="icon-wrap">
              <GitMerge />
            </span>
            <div>
              <p className="cr-card-title">All Cross References</p>
              <p className="cr-card-sub">
                {allCrossRefs.length} total mapping
                {allCrossRefs.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="cr-table-toolbar">
            <div className="cr-search">
              <Search />
              <input
                placeholder="Search brand, part number, product…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="cr-btn cr-btn-ghost" onClick={fetchAll}>
              <RefreshCw className={loadingAll ? "cr-spin" : ""} size={14} />{" "}
              Refresh
            </button>
          </div>

          {/* Product filter tabs — only shown when there are cross refs */}
          {productsWithCrossRefs.length > 0 && (
            <div style={{ overflowX: "auto", marginBottom: 18 }}>
              <div className="cr-filter-tabs" style={{ width: "max-content" }}>
                <button
                  className={`cr-filter-tab ${filterProductId === "all" ? "active" : ""}`}
                  onClick={() => setFilterProductId("all")}
                >
                  All ({allCrossRefs.length})
                </button>
                {productsWithCrossRefs.map((p) => {
                  const count = allCrossRefs.filter(
                    (cr) => String(cr.productId) === String(p.id),
                  ).length;
                  return (
                    <button
                      key={p.id}
                      className={`cr-filter-tab ${filterProductId === String(p.id) ? "active" : ""}`}
                      onClick={() => setFilterProductId(String(p.id))}
                    >
                      {p.itemName} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {loadingAll ? (
            <div className="cr-empty">
              <Loader2
                className="cr-spin"
                style={{
                  width: 28,
                  height: 28,
                  color: "var(--signal)",
                  marginBottom: 10,
                }}
              />
              <p>Loading cross references…</p>
            </div>
          ) : filteredCrossRefs.length === 0 ? (
            <div className="cr-empty">
              <GitMerge />
              <p>
                {allCrossRefs.length === 0
                  ? "No cross references yet — add your first one above."
                  : "No results match your filter."}
              </p>
              {allCrossRefs.length === 0 && (
                <p className="cr-empty-hint">
                  Use the form above or bulk upload a spreadsheet.
                </p>
              )}
            </div>
          ) : (
            <div className="cr-table-wrap">
              <table className="cr-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Part #</th>
                    <th>Cross Brand</th>
                    <th>Cross Part Number</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCrossRefs.map((cr) => (
                    <tr key={cr.id}>
                      <td>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13.5,
                            lineHeight: 1.3,
                          }}
                        >
                          {cr.product?.itemName || `Product #${cr.productId}`}
                        </div>
                        {cr.product?.brandName && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--ink-soft)",
                              marginTop: 2,
                            }}
                          >
                            {cr.product.brandName}
                          </div>
                        )}
                      </td>
                      <td className="cr-mono">
                        {cr.product?.partNumber || "—"}
                      </td>
                      <td>
                        <span className="cr-brand-chip">{cr.crossBrand}</span>
                      </td>
                      <td className="cr-mono">{cr.crossPartNumber}</td>
                      <td>
                        <button
                          className="cr-icon-btn danger"
                          onClick={() => handleDelete(cr.id)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredCrossRefs.length > 0 && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "var(--ink-soft)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Showing {filteredCrossRefs.length} of {allCrossRefs.length} cross
              references
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CrossReferenceSection;
