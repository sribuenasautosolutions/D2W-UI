import { useState, useEffect, useMemo, useRef } from "react";
import apiclient from "../../../services/apiclient";
import {
  Package, Hash, Wallet, Boxes, UploadCloud, Search, Trash2,
  CheckCircle2, XCircle, ChevronRight, ChevronLeft, Loader2, FileSpreadsheet,
  Download, Plus, RefreshCw, AlertTriangle, X, FileUp
} from "lucide-react";

/* =========================================================================
   CONFIG
   ========================================================================= */

const API_BASE = "http://localhost:8080";

const EMPTY_FORM = {
  itemName: "",
  description: "",
  partNumber: "",
  alternatePartNumber: "",
  oemNumber: "",
  ean: "",
  hsnCode: "",
  sku: "",
  brandId: "",
  categoryId: "",
  masterId: "",
  mrpPrice: "",
  manufacturer: "",
  countryOfOrigin: "",
  weight: "",
  catalogSource: ""
};

// Only backend-mandatory fields are required
const REQUIRED_FIELDS = ["itemName", "partNumber", "brandId", "categoryId", "masterId"];

const GST_OPTIONS = [
  { value: "0", label: "0% — Exempt" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" }
];

const optionLabel = (obj, ...keys) => {
  for (const k of keys) if (obj?.[k]) return obj[k];
  return `#${obj?.id ?? "?"}`;
};

const STEPS = [
  {
    id: "basic",
    title: "Basic Information",
    icon: Package,
    fields: [
      { name: "itemName", label: "Item name", type: "text", required: true, placeholder: "e.g. Brake Pad Set — Front" },
      { name: "description", label: "Description", type: "textarea", placeholder: "Short description shown to buyers" },
      { name: "brandId", label: "Brand", type: "select", required: true, dynamic: "brands", getOptions: (b) => b.map(x => ({ value: String(x.id), label: optionLabel(x, "brandName", "name") })) },
      { name: "categoryId", label: "Category", type: "select", required: true, dynamic: "categories", getOptions: (_b, c) => c.map(x => ({ value: String(x.id), label: optionLabel(x, "categoryName", "name") })) },
      { name: "masterId", label: "Product master", type: "select", required: true, dynamic: "masters", getOptions: (_b, _c, m) => m.map(x => ({ value: String(x.id), label: optionLabel(x, "masterName", "name") })) }
    ]
  },
  {
    id: "ids",
    title: "Part Identification",
    icon: Hash,
    fields: [
      { name: "partNumber", label: "Part number", type: "text", required: true, mono: true, placeholder: "PN-00123" },
      { name: "alternatePartNumber", label: "Alternate part number", type: "text", mono: true, placeholder: "Optional" },
      { name: "oemNumber", label: "OEM number", type: "text", mono: true, placeholder: "Optional" },
      { name: "ean", label: "EAN / Barcode", type: "text", mono: true, placeholder: "13-digit code" },
      { name: "hsnCode", label: "HSN code", type: "text", mono: true, placeholder: "e.g. 8708" },
      { name: "sku", label: "SKU", type: "text", mono: true, placeholder: "Internal SKU" }
    ]
  },
  {
    id: "pricing",
    title: "Pricing & Tax",
    icon: Wallet,
    fields: [
     {
    name: "mrpPrice",
    label: "MRP",
    type: "number",
    unit: "₹",
    placeholder: "0.00"
}
    ]
  },
  {
    id: "inventory",
    title: "Inventory & Manufacturer",
    icon: Boxes,
    fields: [
      
      { name: "manufacturer", label: "Manufacturer", type: "text", placeholder: "e.g. Bosch" },
      { name: "countryOfOrigin", label: "Country of origin", type: "text", placeholder: "e.g. India" },
      { name: "weight", label: "Weight", type: "number", unit: "kg", placeholder: "0.00" },
      { name: "catalogSource", label: "Catalog source", type: "text", placeholder: "Where this listing was sourced from" }
    ]
  }
];

const formatINR = (val) => {
  const n = Number(val);
  if (!val || Number.isNaN(n)) return "—";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb > 1024 ? (kb / 1024).toFixed(1) + " MB" : kb.toFixed(0) + " KB";
};

/* =========================================================================
   STYLES
   ========================================================================= */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

.pim-root{
  --ink:#1C2333; --ink-soft:#5B6478; --paper:#F3F4F9; --surface:#FFFFFF;
  --line:#E4E7F0; --signal:#D6571F; --signal-dark:#B8460F; --signal-bg:#FCEAE0;
  --success:#1F9D55; --success-bg:#E8F8EF; --danger:#DC2626; --danger-bg:#FDEDEC;
  --focus:rgba(214,87,31,0.28);
  font-family:'Inter',sans-serif; color:var(--ink); background:var(--paper);
  min-height:100vh; padding:32px 24px 80px; box-sizing:border-box;
}
.pim-root *{ box-sizing:border-box; }
.pim-shell{ max-width:1240px; margin:0 auto; }

/* ---------- header ---------- */
.pim-header{ display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:18px; margin-bottom:28px; }
.pim-eyebrow{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:var(--signal); font-weight:600; margin:0 0 6px; }
.pim-title{ font-family:'Space Grotesk',sans-serif; font-size:28px; font-weight:700; margin:0 0 4px; letter-spacing:-0.01em; }
.pim-subtitle{ font-size:14px; color:var(--ink-soft); margin:0; }
.pim-tabs{ display:flex; gap:4px; background:#fff; border:1px solid var(--line); padding:4px; border-radius:12px; }
.pim-tab{ display:flex; align-items:center; gap:6px; border:none; background:transparent; padding:9px 16px; border-radius:9px; font-size:13.5px; font-weight:600; color:var(--ink-soft); cursor:pointer; transition:background .15s, color .15s; font-family:'Inter',sans-serif; }
.pim-tab:hover{ color:var(--ink); }
.pim-tab.active{ background:var(--ink); color:#fff; }
.pim-tab svg{ width:15px; height:15px; }

/* ---------- banners ---------- */
.pim-banner{ display:flex; align-items:flex-start; gap:10px; padding:14px 16px; border-radius:10px; margin-bottom:20px; font-size:13.5px; }
.pim-banner.warn{ background:var(--danger-bg); color:#8a2a23; border:1px solid #f5c6c0; }
.pim-banner button{ margin-left:auto; flex-shrink:0; border:1px solid currentColor; background:transparent; color:inherit; font-weight:600; font-size:12.5px; padding:5px 10px; border-radius:7px; cursor:pointer; display:flex; align-items:center; gap:5px; }

/* ---------- toast ---------- */
.pim-toast{ position:fixed; top:22px; right:22px; z-index:50; display:flex; align-items:center; gap:10px; padding:13px 18px; border-radius:10px; box-shadow:0 10px 25px -8px rgba(0,0,0,0.25); font-size:13.5px; font-weight:500; animation:pim-slide .25s ease-out; max-width:340px; }
.pim-toast.success{ background:var(--ink); color:#fff; }
.pim-toast.success svg{ color:#5fe0a0; }
.pim-toast.error{ background:#fff; color:var(--danger); border:1px solid #f5c6c0; }
.pim-toast svg{ width:18px; height:18px; flex-shrink:0; }
@keyframes pim-slide{ from{ opacity:0; transform:translateY(-8px); } to{ opacity:1; transform:translateY(0); } }

/* ---------- progress ---------- */
.pim-progress-wrap{ margin-bottom:22px; }
.pim-progress-meta{ display:flex; justify-content:space-between; font-size:12.5px; color:var(--ink-soft); margin-bottom:6px; font-weight:500; }
.pim-progress-meta strong{ color:var(--ink); }
.pim-progress-track{ height:6px; background:#fff; border:1px solid var(--line); border-radius:99px; overflow:hidden; }
.pim-progress-fill{ height:100%; background:var(--signal); border-radius:99px; transition:width .3s ease; }

/* ---------- step layout ---------- */
.pim-layout{ display:flex; gap:22px; align-items:flex-start; }
.pim-rail{ flex:0 0 226px; display:flex; flex-direction:column; gap:4px; background:#fff; border:1px solid var(--line); border-radius:14px; padding:10px; }
.pim-rail-item{ display:flex; align-items:flex-start; gap:11px; padding:11px 10px; border-radius:10px; border:none; background:transparent; cursor:pointer; text-align:left; font-family:'Inter',sans-serif; transition:background .15s; }
.pim-rail-item:hover{ background:var(--paper); }
.pim-rail-item.active{ background:var(--signal-bg); }
.pim-rail-num{ flex-shrink:0; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; font-family:'Space Grotesk',sans-serif; background:#fff; border:1.5px solid var(--line); color:var(--ink-soft); }
.pim-rail-item.active .pim-rail-num{ border-color:var(--signal); color:var(--signal); }
.pim-rail-item.done .pim-rail-num{ background:var(--success); border-color:var(--success); color:#fff; }
.pim-rail-text-title{ font-size:13.5px; font-weight:600; color:var(--ink); line-height:1.3; }
.pim-rail-text-sub{ font-size:11.5px; color:var(--ink-soft); margin-top:2px; font-family:'JetBrains Mono',monospace; }
.pim-rail-item.active .pim-rail-text-title{ color:var(--signal-dark); }

.pim-card{ flex:1; min-width:0; background:#fff; border:1px solid var(--line); border-radius:14px; padding:26px 28px; }
.pim-card-head{ display:flex; align-items:center; gap:10px; margin-bottom:22px; padding-bottom:16px; border-bottom:1px solid var(--line); }
.pim-card-head .icon-wrap{ width:36px; height:36px; border-radius:10px; background:var(--signal-bg); color:var(--signal-dark); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.pim-card-head .icon-wrap svg{ width:18px; height:18px; }
.pim-card-title{ font-family:'Space Grotesk',sans-serif; font-size:18px; font-weight:700; margin:0; }
.pim-card-step{ font-size:12px; color:var(--ink-soft); margin:0; font-family:'JetBrains Mono',monospace; }

.pim-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(230px,1fr)); gap:18px; }
.pim-field{ display:flex; flex-direction:column; gap:6px; }
.pim-field.span2{ grid-column:1 / -1; }
.pim-label{ font-size:12.5px; font-weight:600; color:var(--ink-soft); display:flex; gap:4px; }
.pim-label .req{ color:var(--signal); }
.pim-input-wrap{ position:relative; }
.pim-input, .pim-select, .pim-textarea{ width:100%; padding:10px 12px; border:1.5px solid var(--line); border-radius:9px; font-size:14px; color:var(--ink); background:#fff; font-family:'Inter',sans-serif; transition:border-color .15s, box-shadow .15s; }
.pim-input.mono, .pim-select.mono{ font-family:'JetBrains Mono',monospace; font-size:13.5px; }
.pim-input:focus, .pim-select:focus, .pim-textarea:focus{ outline:none; border-color:var(--signal); box-shadow:0 0 0 3px var(--focus); }
.pim-input.unit{ padding-right:46px; }
.pim-textarea{ resize:vertical; min-height:78px; font-family:'Inter',sans-serif; }
.pim-unit-suffix{ position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:12px; color:var(--ink-soft); font-family:'JetBrains Mono',monospace; pointer-events:none; }
.pim-select{ appearance:none; background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M0 0l5 6 5-6z' fill='%235B6478'/></svg>"); background-repeat:no-repeat; background-position:right 14px center; padding-right:34px; }

.pim-card-foot{ display:flex; align-items:center; justify-content:space-between; margin-top:26px; padding-top:18px; border-top:1px solid var(--line); }
.pim-step-indicator{ font-size:12.5px; color:var(--ink-soft); font-family:'JetBrains Mono',monospace; }

/* ---------- buttons ---------- */
.pim-btn{ display:inline-flex; align-items:center; gap:7px; border-radius:9px; padding:10px 18px; font-size:13.5px; font-weight:600; cursor:pointer; border:1.5px solid transparent; font-family:'Inter',sans-serif; transition:transform .1s, background .15s, border-color .15s; }
.pim-btn:disabled{ opacity:0.5; cursor:not-allowed; }
.pim-btn:active:not(:disabled){ transform:scale(0.98); }
.pim-btn svg{ width:15px; height:15px; }
.pim-btn-primary{ background:var(--signal); color:#fff; }
.pim-btn-primary:hover:not(:disabled){ background:var(--signal-dark); }
.pim-btn-ghost{ background:#fff; color:var(--ink); border-color:var(--line); }
.pim-btn-ghost:hover:not(:disabled){ border-color:var(--ink-soft); }
.pim-btn-danger-ghost{ background:#fff; color:var(--danger); border-color:#f5c6c0; }
.pim-btn-danger-ghost:hover:not(:disabled){ background:var(--danger-bg); }
.pim-spin{ animation:pim-rotate .8s linear infinite; }
@keyframes pim-rotate{ to{ transform:rotate(360deg); } }

/* ---------- tag preview ---------- */
.pim-preview-col{ flex:0 0 270px; position:sticky; top:24px; }
.pim-tag{ position:relative; background:var(--ink); color:#fff; border-radius:14px; padding:22px 20px 18px; clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,0 100%); overflow:hidden; }
.pim-tag::before{ content:""; position:absolute; top:14px; left:14px; width:9px; height:9px; border-radius:50%; background:var(--paper); }
.pim-tag-eyebrow{ font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.1em; text-transform:uppercase; color:#f0a479; margin:8px 0 6px 14px; }
.pim-tag-name{ font-family:'Space Grotesk',sans-serif; font-size:19px; font-weight:700; line-height:1.25; margin:0 0 14px 14px; min-height:24px; }
.pim-tag-row{ display:flex; justify-content:space-between; align-items:center; margin:0 14px 10px; }
.pim-tag-chip{ font-family:'JetBrains Mono',monospace; font-size:11.5px; background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:6px; color:#dfe3f0; }
.pim-tag-price{ font-family:'Space Grotesk',sans-serif; font-size:26px; font-weight:700; margin:6px 14px 2px; }
.pim-tag-mrp{ font-size:12px; color:#aab1c4; text-decoration:line-through; margin:0 14px 14px; }
.pim-tag-badges{ display:flex; gap:6px; margin:0 14px 16px; flex-wrap:wrap; }
.pim-tag-badge{ font-size:11px; font-weight:600; padding:4px 9px; border-radius:99px; display:flex; align-items:center; gap:4px; }
.pim-tag-badge.in{ background:rgba(31,157,85,0.22); color:#79e6ab; }
.pim-tag-badge.out{ background:rgba(220,38,38,0.22); color:#ff9d96; }
.pim-tag-badge.gst{ background:rgba(255,255,255,0.12); color:#dfe3f0; }
.pim-tag-bars{ display:flex; gap:2px; align-items:flex-end; padding:12px 14px 0; height:26px; border-top:1px dashed rgba(255,255,255,0.18); margin-top:4px; }
.pim-tag-bars span{ display:block; background:rgba(255,255,255,0.35); width:3px; }
.pim-preview-hint{ font-size:11.5px; color:var(--ink-soft); text-align:center; margin-top:10px; }

/* ---------- bulk upload ---------- */
.pim-drop{ border:2px dashed var(--line); border-radius:14px; padding:42px 24px; text-align:center; background:#fff; cursor:pointer; transition:border-color .15s, background .15s; }
.pim-drop.drag{ border-color:var(--signal); background:var(--signal-bg); }
.pim-drop .icon-wrap{ width:52px; height:52px; border-radius:50%; background:var(--paper); display:flex; align-items:center; justify-content:center; margin:0 auto 14px; color:var(--signal); }
.pim-drop-title{ font-weight:600; font-size:15px; margin:0 0 4px; }
.pim-drop-sub{ font-size:12.5px; color:var(--ink-soft); margin:0; }
.pim-file-chip{ display:flex; align-items:center; gap:10px; background:#fff; border:1px solid var(--line); border-radius:10px; padding:10px 14px; margin-top:16px; }
.pim-file-chip svg{ color:var(--signal); flex-shrink:0; }
.pim-file-name{ font-size:13.5px; font-weight:600; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pim-file-size{ font-size:12px; color:var(--ink-soft); font-family:'JetBrains Mono',monospace; }
.pim-file-chip button{ border:none; background:transparent; color:var(--ink-soft); cursor:pointer; display:flex; }
.pim-bulk-actions{ display:flex; gap:10px; margin-top:18px; }
.pim-bulk-note{ font-size:12.5px; color:var(--ink-soft); margin-top:14px; line-height:1.5; }
.pim-upload-progress{ margin-top:14px; }
.pim-upload-progress-bar{ height:6px; background:var(--line); border-radius:99px; overflow:hidden; margin-top:6px; }
.pim-upload-progress-fill{ height:100%; background:var(--signal); border-radius:99px; transition:width .3s ease; }
.pim-upload-stats{ display:flex; gap:14px; margin-top:12px; flex-wrap:wrap; }
.pim-upload-stat{ font-size:12.5px; font-family:'JetBrains Mono',monospace; padding:6px 12px; border-radius:7px; border:1px solid var(--line); background:var(--paper); }
.pim-upload-stat.inserted{ color:var(--success); background:var(--success-bg); border-color:#b6e8ce; }
.pim-upload-stat.skipped{ color:#b45309; background:#fffbeb; border-color:#fcd34d; }
.pim-upload-stat.total{ color:var(--ink-soft); }
.pim-upload-error{ margin-top:10px; font-size:12.5px; color:var(--danger); background:var(--danger-bg); border:1px solid #f5c6c0; border-radius:8px; padding:8px 12px; }

/* ---------- table ---------- */
.pim-table-toolbar{ display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:16px; flex-wrap:wrap; }
.pim-search{ position:relative; flex:1; max-width:340px; }
.pim-search svg{ position:absolute; left:12px; top:50%; transform:translateY(-50%); width:15px; height:15px; color:var(--ink-soft); }
.pim-search input{ width:100%; padding:9px 12px 9px 34px; border:1.5px solid var(--line); border-radius:9px; font-size:13.5px; }
.pim-search input:focus{ outline:none; border-color:var(--signal); box-shadow:0 0 0 3px var(--focus); }
.pim-table-wrap{ overflow-x:auto; border:1px solid var(--line); border-radius:12px; }
.pim-table{ width:100%; border-collapse:collapse; font-size:13.5px; min-width:760px; }
.pim-table th{ text-align:left; padding:12px 14px; background:var(--paper); font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--ink-soft); border-bottom:1px solid var(--line); white-space:nowrap; }
.pim-table td{ padding:12px 14px; border-bottom:1px solid var(--line); vertical-align:middle; }
.pim-table tr:last-child td{ border-bottom:none; }
.pim-table tr:hover td{ background:#fafbff; }
.pim-mono{ font-family:'JetBrains Mono',monospace; font-size:12.5px; }
.pim-badge{ font-size:11.5px; font-weight:600; padding:4px 9px; border-radius:99px; display:inline-flex; align-items:center; gap:4px; }
.pim-badge.in{ background:var(--success-bg); color:var(--success); }
.pim-badge.out{ background:var(--danger-bg); color:var(--danger); }
.pim-row-actions{ display:flex; gap:6px; }
.pim-icon-btn{ border:1px solid var(--line); background:#fff; border-radius:7px; padding:6px; cursor:pointer; display:flex; color:var(--ink-soft); }
.pim-icon-btn:hover{ border-color:var(--ink-soft); color:var(--ink); }
.pim-icon-btn.danger:hover{ border-color:#f5c6c0; color:var(--danger); background:var(--danger-bg); }
.pim-empty{ text-align:center; padding:50px 20px; color:var(--ink-soft); }
.pim-empty svg{ width:34px; height:34px; margin-bottom:10px; color:var(--line); }
.pim-empty p{ margin:0; font-size:13.5px; }

/* ---------- responsive ---------- */
@media (max-width:980px){
  .pim-layout{ flex-direction:column; }
  .pim-rail{ flex-direction:row; overflow-x:auto; flex:none; width:100%; }
  .pim-rail-item{ flex-direction:column; align-items:center; text-align:center; min-width:120px; gap:6px; }
  .pim-rail-text-sub{ display:none; }
  .pim-preview-col{ flex:none; width:100%; position:static; max-width:340px; margin:0 auto; }
}
@media (max-width:560px){
  .pim-root{ padding:20px 14px 60px; }
  .pim-card{ padding:20px 18px; }
  .pim-header{ align-items:flex-start; }
  .pim-tabs{ width:100%; }
  .pim-tab{ flex:1; justify-content:center; }
}
@media (prefers-reduced-motion: reduce){
  .pim-toast{ animation:none; }
  .pim-spin{ animation-duration:1.4s; }
}
`;

/* =========================================================================
   SMALL SUB-COMPONENTS
   ========================================================================= */

function Field({ field, value, onChange, brands, categories, masters }) {
  const opts = field.dynamic ? field.getOptions(brands, categories, masters) : field.options;

  return (
    <div className={`pim-field ${field.type === "textarea" ? "span2" : ""}`}>
      <label className="pim-label">
        {field.label} {field.required && <span className="req">*</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea
          className="pim-textarea"
          name={field.name}
          value={value}
          placeholder={field.placeholder}
          onChange={onChange}
        />
      ) : field.type === "select" ? (
        <select className={`pim-select ${field.mono ? "mono" : ""}`} name={field.name} value={value} onChange={onChange}>
          <option value="">{field.dynamic ? `Select ${field.dynamic.slice(0, -1)}…` : "Select…"}</option>
          {(opts || []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
          {field.dynamic && opts && opts.length === 0 && <option disabled>No {field.dynamic} loaded</option>}
        </select>
      ) : (
        <div className="pim-input-wrap">
          <input
            className={`pim-input ${field.mono ? "mono" : ""} ${field.unit ? "unit" : ""}`}
            type={field.type}
            step={field.type === "number" ? "0.01" : undefined}
            min={field.type === "number" ? "0" : undefined}
            name={field.name}
            value={value}
            placeholder={field.placeholder}
            onChange={onChange}
          />
          {field.unit && <span className="pim-unit-suffix">{field.unit}</span>}
        </div>
      )}
    </div>
  );
}

function TagPreview({ formData, brands }) {
  const brand = brands.find((b) => String(b.id) === String(formData.brandId));
 const inStock = false;
  const showMrp = false;

  return (
    <div className="pim-preview-col">
      <div className="pim-tag">
        <div className="pim-tag-eyebrow">{brand ? optionLabel(brand, "brandName", "name") : "Shelf Tag Preview"}</div>
        <div className="pim-tag-name">{formData.itemName || "Untitled part"}</div>
        <div className="pim-tag-row">
          <span style={{ fontSize: 11, color: "#aab1c4" }}>PART NO.</span>
          <span className="pim-tag-chip">{formData.partNumber || "—"}</span>
        </div>
       <div className="pim-tag-price">
    {formatINR(formData.mrpPrice)}
</div>
        {showMrp && <div className="pim-tag-mrp">MRP {formatINR(formData.mrpPrice)}</div>}
       
        <div className="pim-tag-bars">
          {[6, 12, 8, 16, 10, 4, 14, 9, 18, 7, 11, 15].map((h, i) => (
            <span key={i} style={{ height: `${h}px` }} />
          ))}
        </div>
      </div>
      <p className="pim-preview-hint">Updates live as you fill in the form</p>
    </div>
  );
}

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */

function ItemsSection() {
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [brands, setBrands] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allMasters, setAllMasters] = useState([]);
  const [masters, setMasters] = useState([]);
  const [items, setItems] = useState([]);

  const [activeMainTab, setActiveMainTab] = useState("add"); // add | inventory | bulk
  const [activeStep, setActiveStep] = useState(0);

  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null); // { totalRows, insertedRows, skippedRows, errors }
  const [fetchError, setFetchError] = useState(false);
  const [status, setStatus] = useState(null); // { type, msg }

  const fileInputRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  // When categoryId changes, filter masters by category and clear masterId
  useEffect(() => {
    if (!formData.categoryId) {
      setMasters(allMasters);
      return;
    }
    const filtered = allMasters.filter(
      (m) => String(m.categoryId) === String(formData.categoryId) ||
             String(m.category?.id) === String(formData.categoryId)
    );
    setMasters(filtered.length > 0 ? filtered : allMasters);
  }, [formData.categoryId, allMasters]);

  const fetchData = async () => {
    setLoadingData(true);
    setFetchError(false);
    try {
      const [b, c, m, i] = await Promise.all([
        apiClient.get("/brands"),
apiClient.get("/categories"),
apiClient.get("/product-masters"),
apiClient.get("/products")
      ]);
      setBrands(b.data || []);
      setAllCategories(c.data || []);
      setCategories(c.data || []);
      setAllMasters(m.data || []);
      setMasters(m.data || []);
      setItems(i.data || []);
    } catch (e) {
      setFetchError(true);
    }
    setLoadingData(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "categoryId") {
      // Reset masterId when category changes
      setFormData((prev) => ({ ...prev, categoryId: value, masterId: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setActiveStep(0);
  };

  const requiredMissingInStep = (step) => step.fields.filter((f) => f.required && !formData[f.name]);

  const firstIncompleteStep = () => {
    for (let idx = 0; idx < STEPS.length; idx++) {
      if (requiredMissingInStep(STEPS[idx]).length > 0) return idx;
    }
    return -1;
  };

  const filledRequiredCount = REQUIRED_FIELDS.filter((f) => formData[f] !== "" && formData[f] != null).length;
  const progressPct = Math.round((filledRequiredCount / REQUIRED_FIELDS.length) * 100);
  const canSave = filledRequiredCount === REQUIRED_FIELDS.length;

  const saveItem = async () => {
    if (!canSave) {
      setStatus({ type: "error", msg: "Please complete all required fields marked with *." });
      const idx = firstIncompleteStep();
      if (idx !== -1) setActiveStep(idx);
      return;
    }
    setSaving(true);
    try {
   await apiClient.post("/products", formData);
      setStatus({ type: "success", msg: "Product saved successfully." });
      resetForm();
      fetchData();
    } catch (e) {
      setStatus({ type: "error", msg: "Failed to save product. Check the server and try again." });
    }
    setSaving(false);
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.itemName}"? This can't be undone.`)) return;
    try {
     await apiClient.delete(`/products/${item.id}`);
      setStatus({ type: "success", msg: "Product deleted." });
      fetchData();
    } catch (e) {
      setStatus({ type: "error", msg: "Failed to delete product." });
    }
  };

  const uploadBulk = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    const data = new FormData();
    data.append("file", selectedFile);

    try {
     const response = await apiClient.post(
    "/products/bulk-upload",
    data,
    {
        headers: {
            "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
                const pct = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                setUploadProgress(pct);
            }
        }
    }
);

      const result = response.data;
      setUploadResult(result);

      if (result.errors && result.errors.length > 0) {
        setStatus({
          type: "error",
          msg: `Upload completed with errors. Inserted: ${result.insertedRows} | Skipped: ${result.skippedRows}`
        });
      } else {
        setStatus({
          type: "success",
          msg: `Upload complete. Inserted: ${result.insertedRows} | Skipped: ${result.skippedRows}`
        });
        setSelectedFile(null);
        fetchData();
      }
    } catch (error) {
      setStatus({ type: "error", msg: "Bulk upload failed. Please check your file and try again." });
    }

    setUploading(false);
    setUploadProgress(100);
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      [it.itemName, it.partNumber, it.sku, it.oemNumber, it.brandName, it.categoryName, it.masterName].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Build the masters list for the current step's field (filtered by categoryId)
  const mastersForForm = formData.categoryId
    ? allMasters.filter(
        (m) =>
          String(m.categoryId) === String(formData.categoryId) ||
          String(m.category?.id) === String(formData.categoryId)
      )
    : allMasters;

  const step = STEPS[activeStep];

  // Inject filtered masters into the step field renderer
  const getMastersForField = () => mastersForForm.length > 0 ? mastersForForm : masters;

  return (
    <div className="pim-root">
      <style>{CSS}</style>

      {status && (
        <div className={`pim-toast ${status.type}`}>
          {status.type === "success" ? <CheckCircle2 /> : <AlertTriangle />}
          {status.msg}
        </div>
      )}

      <div className="pim-shell">
        <div className="pim-header">
          <div>
            <p className="pim-eyebrow">Catalog Manager</p>
            <h1 className="pim-title">Parts Inventory</h1>
            <p className="pim-subtitle">Add new parts, manage stock, and bulk import your catalog.</p>
          </div>
          <div className="pim-tabs">
            <button className={`pim-tab ${activeMainTab === "add" ? "active" : ""}`} onClick={() => setActiveMainTab("add")}>
              <Plus /> New Part
            </button>
            <button className={`pim-tab ${activeMainTab === "inventory" ? "active" : ""}`} onClick={() => setActiveMainTab("inventory")}>
              <Boxes /> Inventory
            </button>
            <button className={`pim-tab ${activeMainTab === "bulk" ? "active" : ""}`} onClick={() => setActiveMainTab("bulk")}>
              <UploadCloud /> Bulk Import
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="pim-banner warn">
            <AlertTriangle size={18} />
            <span>Can't reach the server at {API_BASE}. Make sure your backend is running, then retry.</span>
            <button onClick={fetchData}>
              <RefreshCw size={13} className={loadingData ? "pim-spin" : ""} /> Retry
            </button>
          </div>
        )}

        {/* ----------------- ADD PRODUCT ----------------- */}
        {activeMainTab === "add" && (
          <>
            <div className="pim-progress-wrap">
              <div className="pim-progress-meta">
                <span>Required fields completed</span>
                <span><strong>{filledRequiredCount}</strong> / {REQUIRED_FIELDS.length}</span>
              </div>
              <div className="pim-progress-track">
                <div className="pim-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="pim-layout">
              <div className="pim-rail">
                {STEPS.map((s, idx) => {
                  const missing = requiredMissingInStep(s).length;
                  const done = s.fields.some((f) => f.required) && missing === 0;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      className={`pim-rail-item ${idx === activeStep ? "active" : ""} ${done ? "done" : ""}`}
                      onClick={() => setActiveStep(idx)}
                      type="button"
                    >
                      <span className="pim-rail-num">{done ? <CheckCircle2 size={14} /> : idx + 1}</span>
                      <span>
                        <span className="pim-rail-text-title">{s.title}</span>
                        <div className="pim-rail-text-sub">
                          {missing > 0 ? `${missing} required left` : "Complete"}
                        </div>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pim-card">
                <div className="pim-card-head">
                  <span className="icon-wrap"><step.icon /></span>
                  <div>
                    <p className="pim-card-title">{step.title}</p>
                    <p className="pim-card-step">Step {activeStep + 1} of {STEPS.length}</p>
                  </div>
                </div>

                <div className="pim-grid">
                  {step.fields.map((f) => (
                    <Field
                      key={f.name}
                      field={f}
                      value={formData[f.name] ?? ""}
                      onChange={handleInputChange}
                      brands={brands}
                      categories={allCategories}
                      masters={f.name === "masterId" ? getMastersForField() : allMasters}
                    />
                  ))}
                </div>

                <div className="pim-card-foot">
                  <button className="pim-btn pim-btn-ghost" disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>
                    <ChevronLeft /> Back
                  </button>

                  {activeStep < STEPS.length - 1 ? (
                    <button className="pim-btn pim-btn-primary" onClick={() => setActiveStep((s) => s + 1)}>
                      Next <ChevronRight />
                    </button>
                  ) : (
                    <button className="pim-btn pim-btn-primary" onClick={saveItem} disabled={saving}>
                      {saving ? <Loader2 className="pim-spin" /> : <CheckCircle2 />}
                      {saving ? "Saving…" : "Save Product"}
                    </button>
                  )}
                </div>
              </div>

              <TagPreview formData={formData} brands={brands} />
            </div>
          </>
        )}

        {/* ----------------- INVENTORY ----------------- */}
        {activeMainTab === "inventory" && (
          <div className="pim-card">
            <div className="pim-table-toolbar">
              <div className="pim-search">
                <Search />
                <input
                  placeholder="Search by name, part number, brand, SKU…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="pim-btn pim-btn-ghost" onClick={fetchData}>
                <RefreshCw className={loadingData ? "pim-spin" : ""} /> Refresh
              </button>
            </div>

            {filteredItems.length === 0 ? (
              <div className="pim-empty">
                <Boxes />
                <p>{items.length === 0 ? "No parts in inventory yet — add your first product." : "No parts match your search."}</p>
              </div>
            ) : (
              <div className="pim-table-wrap">
                <table className="pim-table">
                  <thead>
                    <tr>
                      {["Item", "Part #", "Brand", "Category", "Master", "SKU", "OEM Number", "MRP Price", ""].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.itemName}</td>
                        <td className="pim-mono">{item.partNumber}</td>
                        <td>{item.brandName || "—"}</td>
                        <td>{item.categoryName || "—"}</td>
                        <td>{item.masterName || "—"}</td>
                        <td className="pim-mono">{item.sku || "—"}</td>
                        <td className="pim-mono">{item.oemNumber || "—"}</td>
                        <td className="pim-mono">{formatINR(item.mrpPrice)}</td>
                        <td>
                          <div className="pim-row-actions">
                            {/* Edit hidden: ProductResponseDTO does not return brandId/categoryId/masterId */}
                            <button className="pim-icon-btn danger" onClick={() => deleteItem(item)} title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ----------------- BULK IMPORT ----------------- */}
        {activeMainTab === "bulk" && (
          <div className="pim-card" style={{ maxWidth: 560 }}>
            <div
              className={`pim-drop ${dragOver ? "drag" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
              <span className="icon-wrap"><FileUp /></span>
              <p className="pim-drop-title">Drag & drop your file here</p>
              <p className="pim-drop-sub">or click to browse — CSV, XLS, or XLSX</p>
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
              <div className="pim-file-chip">
                <FileSpreadsheet size={20} />
                <span className="pim-file-name">{selectedFile.name}</span>
                <span className="pim-file-size">{formatBytes(selectedFile.size)}</span>
                <button onClick={() => { setSelectedFile(null); setUploadResult(null); }}><X size={16} /></button>
              </div>
            )}

            {uploading && (
              <div className="pim-upload-progress">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "var(--ink-soft)", marginBottom: 4 }}>
                  <span>Uploading…</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{uploadProgress}%</span>
                </div>
                <div className="pim-upload-progress-bar">
                  <div className="pim-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {uploadResult && !uploading && (
              <div style={{ marginTop: 14 }}>
                <div className="pim-upload-stats">
                  <span className="pim-upload-stat total">Total rows: {uploadResult.totalRows}</span>
                  <span className="pim-upload-stat inserted">Inserted: {uploadResult.insertedRows}</span>
                  <span className="pim-upload-stat skipped">Skipped: {uploadResult.skippedRows}</span>
                </div>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="pim-upload-error">
                    <strong>Error:</strong> {uploadResult.errors[0]}
                  </div>
                )}
              </div>
            )}

            <div className="pim-bulk-actions">
              <button className="pim-btn pim-btn-primary" onClick={uploadBulk} disabled={!selectedFile || uploading}>
                {uploading ? <Loader2 className="pim-spin" /> : <UploadCloud />}
                {uploading ? "Uploading…" : "Upload Products"}
              </button>
              <a href="/template.csv" download>
                <button type="button" className="pim-btn pim-btn-ghost"><Download /> Download Template</button>
              </a>
            </div>

            <p className="pim-bulk-note">
              The file should include columns matching your product fields (item name, part number,
              brand, category, master, pricing, and stock). Download the template above to see the
              expected layout before uploading.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ItemsSection;
