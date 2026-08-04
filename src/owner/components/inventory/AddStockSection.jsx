import { useRef, useState } from "react";
import { CirclePlus, PackageCheck, Search, Trash2 } from "lucide-react";
import api from "../../../services/api";
import BulkUploadSection from "./BulkUploadSection";

const emptyRow = () => ({
  key: `${Date.now()}-${Math.random()}`,
  partNumber: "",
  itemName: "",
  brandName: "",
  quantity: "",
  purchasePrice: "",
  mrp: "",
  priceMode: "GST_INCLUSIVE",
  gstPercentage: "18",
  rackNumber: "",
  hsnCode: "",
  sellingPrice: "",
  sellingManual: false,
  productId: null,
  localProductId: null,
  availableStock: null,
});

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function calculateFromSettings(mrpValue, priceMode, gstPercentage) {
  const mrp = Number(mrpValue);
  const gst = Number(gstPercentage);
  if (!Number.isFinite(mrp) || mrp <= 0) return "";
  if (priceMode === "GST_INCLUSIVE") return mrp.toFixed(2);
  return (mrp / (1 + (Number.isFinite(gst) ? gst : 0) / 100)).toFixed(2);
}

function isCompleteRow(row) {
  return Boolean(
    row.partNumber.trim()
    && row.itemName.trim()
    && row.brandName.trim()
    && Number(row.quantity) > 0
    && row.purchasePrice !== ""
    && Number(row.mrp) > 0
    && Number(row.sellingPrice) > 0
  );
}

function isEmptyRow(row) {
  return !row.partNumber.trim()
    && !row.itemName.trim()
    && !row.brandName.trim()
    && row.quantity === ""
    && row.purchasePrice === ""
    && row.mrp === ""
    && row.sellingPrice === ""
    && !row.hsnCode.trim()
    && !row.rackNumber.trim();
}

function withTrailingEmptyRow(rows) {
  return rows.length > 0 && isCompleteRow(rows.at(-1))
    ? [...rows, emptyRow()]
    : rows;
}

function ManualStockReceipt() {
  const user = getUser();
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const [rows, setRows] = useState([emptyRow()]);
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(user.storeId ? String(user.storeId) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [priceMode, setPriceMode] = useState("GST_INCLUSIVE");
  const [gstPercentage, setGstPercentage] = useState("18");
  const [suggestions, setSuggestions] = useState({});
  const [suggestionFocus, setSuggestionFocus] = useState(null);
  const firstInputRefs = useRef({});

  const loadStores = async () => {
    if (!isSuperAdmin || stores.length) return;
    const response = await api.get("/stores", { params: { page: 0, size: 100, active: true } });
    setStores(Array.isArray(response.data?.content) ? response.data.content : []);
  };

  const updateRow = (key, field, value) => {
    setRows((current) => withTrailingEmptyRow(current.map((row) =>
      row.key === key ? {
        ...row,
        [field]: value,
        ...(field === "sellingPrice" ? { sellingManual: true } : {}),
      } : row
    )));
  };

  const addRow = () => {
    const next = emptyRow();
    setRows((current) => [...current, next]);
    requestAnimationFrame(() => firstInputRefs.current[next.key]?.focus());
  };

  const removeRow = (key) => {
    setRows((current) => current.length === 1
      ? [emptyRow()]
      : current.filter((row) => row.key !== key));
  };

  const findSuggestions = async (row, field, value) => {
    setSuggestionFocus({ key: row.key, field });
    updateRow(row.key, field, field === "partNumber" ? value.toUpperCase() : value);
    if (!storeId || value.trim().length < 1) {
      setSuggestions((current) => ({ ...current, [row.key]: [] }));
      return;
    }
    try {
      const response = await api.get("/store-inventory/suggestions", {
        params: { storeId: Number(storeId), query: value.trim() },
      });
      const matches = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.content || [];
      const exactPart = field === "partNumber"
        ? matches.find((product) =>
            product.partNumber?.toLowerCase() === value.trim().toLowerCase())
        : null;
      if (exactPart) {
        selectSuggestion(row.key, exactPart);
        return;
      }
      setSuggestions((current) => ({ ...current, [row.key]: matches }));
    } catch (error) {
      setSuggestions((current) => ({ ...current, [row.key]: [] }));
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to search catalogue products",
      });
    }
  };

  const selectSuggestion = (key, product) => {
    setRows((current) => withTrailingEmptyRow(current.map((row) => row.key === key ? {
      ...row,
      productId: product.productId,
      localProductId: product.localProductId,
      partNumber: product.partNumber || "",
      itemName: product.itemName || "",
      brandName: product.brandName || "",
      hsnCode: product.hsnCode || "",
      purchasePrice: product.purchasePrice ?? "",
      sellingPrice: product.sellingPrice ?? "",
      mrp: product.mrp ?? "",
      availableStock: product.availableStock ?? 0,
      sellingManual: false,
    } : row)));
    setSuggestions((current) => ({ ...current, [key]: [] }));
    setSuggestionFocus(null);
  };

  const recalculateAutomaticPrices = (nextMode, nextGst) => {
    setRows((current) => current.map((row) => row.sellingManual ? row : {
      ...row,
      sellingPrice: calculateFromSettings(row.mrp, nextMode, nextGst),
    }));
  };

  const validate = () => {
    if (!storeId) return "Select a store";
    const receiptRows = rows.filter((row) => !isEmptyRow(row));
    if (!receiptRows.length) return "Enter at least one stock row";
    for (let index = 0; index < receiptRows.length; index++) {
      const row = receiptRows[index];
      if (!row.partNumber.trim()) return `Row ${index + 1}: Part Number is required`;
      if (!row.itemName.trim()) return `Row ${index + 1}: Item Name is required`;
      if (!row.brandName.trim()) return `Row ${index + 1}: Brand is required`;
      if (Number(row.quantity) <= 0) return `Row ${index + 1}: Quantity must be greater than zero`;
      if (Number(row.purchasePrice) < 0 || row.purchasePrice === "") return `Row ${index + 1}: Purchase Price is required`;
      if (Number(row.mrp) <= 0) return `Row ${index + 1}: MRP must be greater than zero`;
      if (Number(row.sellingPrice) <= 0) return `Row ${index + 1}: Selling Price is required`;
      if (Number(row.purchasePrice) > Number(row.sellingPrice)) {
        return `Row ${index + 1}: Purchase Price cannot exceed Selling Price`;
      }
      if (Number(row.sellingPrice) > Number(row.mrp)) return `Row ${index + 1}: Selling Price cannot exceed MRP`;
    }
    return "";
  };

  const receiveStock = async () => {
    const error = validate();
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        storeId: Number(storeId),
        priceMode,
        gstPercentage: Number(gstPercentage),
        items: rows.filter((row) => !isEmptyRow(row)).map((row) => ({
          productId: row.productId,
          localProductId: row.localProductId,
          partNumber: row.partNumber.trim(),
          itemName: row.itemName.trim(),
          brandName: row.brandName.trim(),
          quantity: Number(row.quantity),
          purchasePrice: Number(row.purchasePrice),
          sellingPrice: Number(row.sellingPrice),
          mrp: Number(row.mrp),
          hsnCode: row.hsnCode.trim() || null,
          rackNumber: row.rackNumber.trim() || null,
        })),
      };
      const response = await api.post("/store-inventory/manual-receipt", payload);
      setMessage({
        type: "success",
        text: `${response.data.message}. ${response.data.processedRows} row(s) processed.`
      });
      setRows([emptyRow()]);
    } catch (requestError) {
      setMessage({
        type: "error",
        text: requestError.response?.data?.message || "Unable to receive stock",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={S.page}>
      <style>{`
        .manual-stock-table-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .manual-stock-table-scroll::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        @media (max-width: 1050px) {
          .manual-stock-table-scroll {
            overflow-x: auto !important;
            overflow-y: visible !important;
          }
        }
        .manual-stock-suggestions {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .manual-stock-suggestions::-webkit-scrollbar {
          width: 5px;
        }
        .manual-stock-suggestions::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 8px;
        }
      `}</style>
      <div style={S.toolbar}>
        <div>
          <h2 style={S.title}>Manual Stock Receipt</h2>
          <p style={S.subtitle}>Enter multiple products and receive them in one transaction.</p>
        </div>
        <div style={S.toolbarActions}>
          {isSuperAdmin ? (
            <select value={storeId} onFocus={loadStores}
              onChange={(event) => setStoreId(event.target.value)} style={S.storeSelect}>
              <option value="">Select store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.storeName}</option>
              ))}
            </select>
          ) : (
            <span style={S.storeBadge}>{user.storeName || "Assigned Store"}</span>
          )}
          <select value={priceMode} onChange={(event) => {
            setPriceMode(event.target.value);
            recalculateAutomaticPrices(event.target.value, gstPercentage);
          }} style={S.settingSelect}>
            <option value="GST_INCLUSIVE">With GST</option>
            <option value="GST_EXCLUSIVE">Without GST</option>
          </select>
          <label style={S.gstInput}>GST %
            <input type="number" min="0" max="100" value={gstPercentage}
              onChange={(event) => {
                setGstPercentage(event.target.value);
                recalculateAutomaticPrices(priceMode, event.target.value);
              }} style={S.gstNumber} />
          </label>
          <button type="button" disabled={saving} onClick={receiveStock} style={S.primaryButton}>
            <PackageCheck size={17} /> {saving ? "Receiving..." : "Receive Stock"}
          </button>
        </div>
      </div>

      {message && <div style={message.type === "error" ? S.error : S.success}>{message.text}</div>}

      <div className="manual-stock-table-scroll" style={S.tableWrap}>
        <table style={S.table}>
          <colgroup>
            <col style={{ width: 30 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 105 }} />
            <col style={{ width: 88 }} />
            <col style={{ width: 58 }} />
            <col style={{ width: 92 }} />
            <col style={{ width: 84 }} />
            <col style={{ width: 94 }} />
            <col style={{ width: 82 }} />
            <col style={{ width: 42 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={S.th}>#</th>
              <th style={S.th}>Part Number</th>
              <th style={S.th}>Item Name</th>
              <th style={S.th}>Brand</th>
              <th style={S.th}>HSN Code</th>
              <th style={S.th}>Qty</th>
              <th style={S.th}>Purchase Price</th>
              <th style={S.th}>MRP</th>
              <th style={S.th}>Selling Price</th>
              <th style={S.th}>Rack No.</th>
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key}>
                <td style={S.rowNumber}>{index + 1}</td>
                <td style={S.td}>
                  <SuggestionInput row={row} field="partNumber" placeholder="Part number"
                    inputRef={(element) => { firstInputRefs.current[row.key] = element; }}
                    suggestions={suggestionFocus?.key === row.key && suggestionFocus?.field === "partNumber" ? suggestions[row.key] || [] : []}
                    onChange={findSuggestions} onSelect={selectSuggestion} />
                </td>
                <td style={S.td}><SuggestionInput row={row} field="itemName" placeholder="Item name"
                  suggestions={suggestionFocus?.key === row.key && suggestionFocus?.field === "itemName" ? suggestions[row.key] || [] : []} onChange={findSuggestions} onSelect={selectSuggestion} /></td>
                <td style={S.td}><SuggestionInput row={row} field="brandName" placeholder="Brand"
                  suggestions={suggestionFocus?.key === row.key && suggestionFocus?.field === "brandName" ? suggestions[row.key] || [] : []} onChange={findSuggestions} onSelect={selectSuggestion} /></td>
                <CellInput value={row.hsnCode} placeholder="Optional"
                  onChange={(value) => updateRow(row.key, "hsnCode", value)} />
                <CellInput type="number" value={row.quantity} placeholder="0"
                  onChange={(value) => updateRow(row.key, "quantity", value)} narrow />
                <CellInput type="number" value={row.purchasePrice} placeholder="0.00"
                  onChange={(value) => updateRow(row.key, "purchasePrice", value)} />
                <CellInput type="number" value={row.mrp} placeholder="0.00"
                  onChange={(value) => {
                    setRows((current) => withTrailingEmptyRow(current.map((item) => item.key === row.key ? {
                      ...item,
                      mrp: value,
                      sellingPrice: item.sellingManual
                        ? item.sellingPrice
                        : calculateFromSettings(value, priceMode, gstPercentage),
                    } : item)));
                  }} />
                <CellInput type="number" value={row.sellingPrice} placeholder="0.00"
                  onChange={(value) => updateRow(row.key, "sellingPrice", value)} />
                <CellInput value={row.rackNumber} placeholder="Optional"
                  onChange={(value) => updateRow(row.key, "rackNumber", value)} />
                <td style={S.td}>
                  <button type="button" onClick={() => removeRow(row.key)}
                    style={S.deleteButton} title="Remove row"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addRow} style={S.addRowFooter}>
        <CirclePlus size={16} /> Add another row
      </button>
    </section>
  );
}

export default function AddStockSection() {
  const [entryMode, setEntryMode] = useState("manual");

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div role="tablist" aria-label="Stock entry method" style={S.modeSwitch}>
        <button type="button" role="tab" aria-selected={entryMode === "manual"}
          onClick={() => setEntryMode("manual")}
          style={{ ...S.modeButton, ...(entryMode === "manual" ? S.modeButtonActive : {}) }}>
          Manual Entry
        </button>
        <button type="button" role="tab" aria-selected={entryMode === "bulk"}
          onClick={() => setEntryMode("bulk")}
          style={{ ...S.modeButton, ...(entryMode === "bulk" ? S.modeButtonActive : {}) }}>
          Bulk Upload
        </button>
      </div>
      {entryMode === "manual" ? <ManualStockReceipt /> : <BulkUploadSection />}
    </div>
  );
}

function CellInput({ value, onChange, placeholder, type = "text", narrow = false }) {
  return (
    <td style={S.td}>
      <input type={type} min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value} onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder} style={{ ...S.cellInput, ...(narrow ? S.narrowInput : {}) }} />
    </td>
  );
}

function SuggestionInput({ row, field, placeholder, suggestions, onChange, onSelect, inputRef }) {
  return (
    <div style={S.suggestionWrap}>
      <div style={S.suggestionInput}>
        <Search size={13} color="#64748B" />
        <input ref={inputRef} value={row[field]}
          onChange={(event) => onChange(row, field, event.target.value)}
          placeholder={placeholder} style={S.inputBare} />
      </div>
      {field === "partNumber" && row.availableStock !== null && (
        <span style={S.availableStock}>Available: {row.availableStock}</span>
      )}
      {suggestions.length > 0 && (
        <div className="manual-stock-suggestions" style={S.suggestionMenu}>
          {suggestions.slice(0, 8).map((product) => (
            <button type="button"
              key={`${product.productId || "L"}-${product.localProductId || product.partNumber}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(row.key, product)}
              style={S.suggestionOption}>
              <strong>{product.itemName}</strong>
              <span>{product.partNumber} | {product.brandName || "No brand"} | Stock: {product.availableStock ?? 0}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const S = {
  modeSwitch: { width: "fit-content", display: "flex", gap: 3, padding: 3, border: "1px solid #CBD5E1", borderRadius: 6, background: "#F1F5F9" },
  modeButton: { height: 32, padding: "0 14px", border: 0, borderRadius: 4, background: "transparent", color: "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  modeButtonActive: { background: "#FFFFFF", color: "#1D4ED8", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.12)" },
  page: { display: "grid", gap: 12 },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 },
  title: { margin: 0, fontSize: 17, color: "#0F172A" },
  subtitle: { margin: "4px 0 0", color: "#64748B", fontSize: 12 },
  toolbarActions: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  storeSelect: { height: 38, minWidth: 180, border: "1px solid #CBD5E1", borderRadius: 5, padding: "0 9px", background: "#FFF" },
  storeBadge: { height: 36, padding: "0 11px", display: "flex", alignItems: "center", border: "1px solid #E2E8F0", borderRadius: 5, background: "#FFF", color: "#475569", fontSize: 12, fontWeight: 700 },
  settingSelect: { height: 38, minWidth: 112, padding: "0 8px", border: "1px solid #CBD5E1", borderRadius: 5, background: "#FFF", fontSize: 11.5 },
  gstInput: { height: 38, padding: "0 7px 0 9px", border: "1px solid #CBD5E1", borderRadius: 5, background: "#FFF", color: "#475569", display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700 },
  gstNumber: { width: 45, border: 0, outline: 0, font: "inherit" },
  primaryButton: { height: 38, padding: "0 13px", border: 0, borderRadius: 5, background: "#2563EB", color: "#FFF", display: "flex", alignItems: "center", gap: 7, fontWeight: 800, cursor: "pointer" },
  secondaryButton: { height: 38, padding: "0 12px", border: "1px solid #BFDBFE", borderRadius: 5, background: "#EFF6FF", color: "#1D4ED8", display: "flex", alignItems: "center", gap: 7, fontWeight: 700, cursor: "pointer" },
  error: { padding: "10px 12px", border: "1px solid #FECACA", borderRadius: 5, background: "#FEF2F2", color: "#B91C1C", fontSize: 12.5 },
  success: { padding: "10px 12px", border: "1px solid #BBF7D0", borderRadius: 5, background: "#F0FDF4", color: "#15803D", fontSize: 12.5 },
  tableWrap: { overflow: "visible", position: "relative", zIndex: 3, minHeight: "clamp(220px, calc(100vh - 405px), 460px)", border: "1px solid #E2E8F0", borderRadius: 7, background: "#FFF" },
  table: { width: "100%", minWidth: 915, tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0, fontSize: 12 },
  th: { position: "sticky", top: 0, zIndex: 2, padding: "10px 5px", borderBottom: "1px solid #CBD5E1", background: "#F8FAFC", color: "#64748B", textAlign: "left", fontSize: 9.5, textTransform: "uppercase", whiteSpace: "nowrap" },
  td: { padding: 5, borderBottom: "1px solid #F1F5F9", verticalAlign: "top" },
  rowNumber: { padding: "13px 8px", borderBottom: "1px solid #F1F5F9", color: "#64748B", textAlign: "center" },
  cellInput: { width: "100%", height: 34, padding: "0 6px", border: "1px solid #CBD5E1", borderRadius: 4, boxSizing: "border-box", font: "inherit", fontSize: 11 },
  narrowInput: { width: "100%" },
  suggestionWrap: { position: "relative", width: "100%" },
  suggestionInput: { width: "100%", height: 34, padding: "0 6px", border: "1px solid #CBD5E1", borderRadius: 4, display: "flex", alignItems: "center", gap: 4, boxSizing: "border-box" },
  inputBare: { width: "100%", minWidth: 0, border: 0, outline: 0, font: "inherit", fontSize: 11.5 },
  suggestionMenu: { position: "absolute", zIndex: 100, top: 37, left: 0, width: 260, maxHeight: 240, overflowY: "auto", padding: 4, border: "1px solid #CBD5E1", borderRadius: 5, background: "#FFF", boxShadow: "0 12px 28px rgba(15,23,42,.16)" },
  suggestionOption: { width: "100%", padding: "8px 9px", border: 0, borderBottom: "1px solid #F1F5F9", background: "#FFF", display: "grid", gap: 3, textAlign: "left", color: "#0F172A", fontSize: 11.5, cursor: "pointer" },
  availableStock: { display: "block", marginTop: 3, color: "#15803D", fontSize: 9.5, fontWeight: 700 },
  cellSelect: { width: 116, height: 34, border: "1px solid #CBD5E1", borderRadius: 4, background: "#FFF", fontSize: 11 },
  priceCell: { padding: "15px 8px", borderBottom: "1px solid #F1F5F9", color: "#0F766E", fontWeight: 800, whiteSpace: "nowrap" },
  lookupText: { display: "block", minHeight: 14, marginTop: 3, color: "#64748B", fontSize: 9.5 },
  found: { display: "block", minHeight: 14, marginTop: 3, color: "#15803D", fontSize: 9.5, fontWeight: 700 },
  newPart: { display: "block", minHeight: 14, marginTop: 3, color: "#B45309", fontSize: 9.5, fontWeight: 700 },
  deleteButton: { width: 32, height: 32, border: "1px solid #FECACA", borderRadius: 4, background: "#FEF2F2", color: "#DC2626", display: "grid", placeItems: "center", cursor: "pointer" },
  addRowFooter: { justifySelf: "start", height: 36, padding: "0 11px", border: "1px dashed #93C5FD", borderRadius: 5, background: "#F8FBFF", color: "#1D4ED8", display: "flex", alignItems: "center", gap: 7, fontWeight: 700, cursor: "pointer" },
};
