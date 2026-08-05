import { useCallback, useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import api from "../../../services/api";
import { createInventoryAdjustment } from "../../../services/inventoryTransactionService";

const reasons = ["DAMAGED", "LOST", "PHYSICAL_COUNT", "MANUAL_CORRECTION"];

function getUser() {
  try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
}

export default function InventoryAdjustmentSection() {
  const user = getUser();
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(user.storeId ? String(user.storeId) : "");
  const [inventory, setInventory] = useState([]);
  const [inventoryId, setInventoryId] = useState("");
  const [adjustedQty, setAdjustedQty] = useState("");
  const [reason, setReason] = useState("PHYSICAL_COUNT");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get("/stores", { params: { page: 0, size: 100, active: true } }).then((response) => {
      const activeStores = Array.isArray(response.data?.content) ? response.data.content : [];
      setStores(activeStores);
    }).catch(() => setMessage({ type: "error", text: "Unable to load stores" }));
  }, [isSuperAdmin]);

  const loadInventory = useCallback(async () => {
    if (!storeId) {
      setInventory([]);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.get(`/store-inventory/store/${storeId}`);
      setInventory((response.data || []).filter((item) => Number(item.quantity) > 0));
    } catch (error) {
      setInventory([]);
      setMessage({ type: "error", text: error.response?.data?.message || "Unable to load available stock" });
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    // Data loading is intentionally tied to the selected store.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInventory();
  }, [loadInventory]);

  const selected = useMemo(
    () => inventory.find((item) => String(item.inventoryId) === inventoryId),
    [inventory, inventoryId]
  );

  const save = async () => {
    if (!storeId || !selected) {
      setMessage({ type: "error", text: "Select an available inventory item" });
      return;
    }
    if (adjustedQty === "" || Number(adjustedQty) < 0) {
      setMessage({ type: "error", text: "Adjusted quantity must be zero or greater" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await createInventoryAdjustment({
        storeId: Number(storeId),
        inventoryId: selected.inventoryId,
        adjustedQty: Number(adjustedQty),
        reason,
        remarks: remarks.trim() || null,
      });
      setMessage({ type: "success", text: response });
      setInventoryId("");
      setAdjustedQty("");
      setRemarks("");
      await loadInventory();
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Adjustment failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={S.page}>
      <div style={S.heading}>
        <div style={S.icon}><SlidersHorizontal size={18} /></div>
        <div><h2 style={S.title}>Stock Adjustment</h2><p style={S.subtitle}>Correct the physical quantity of available store stock.</p></div>
      </div>
      {message && <div style={message.type === "error" ? S.error : S.success}>{message.text}</div>}
      <div style={S.form}>
        {isSuperAdmin && <Field label="Store"><select style={S.input} value={storeId} onChange={(e) => { setStoreId(e.target.value); setInventoryId(""); }}><option value="">Select store</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.storeName}</option>)}</select></Field>}
        <Field label="Available stock item"><select style={S.input} value={inventoryId} disabled={!storeId || loading} onChange={(e) => { setInventoryId(e.target.value); const item = inventory.find((entry) => String(entry.inventoryId) === e.target.value); setAdjustedQty(item ? String(item.quantity) : ""); }}><option value="">{loading ? "Loading stock..." : "Select inventory item"}</option>{inventory.map((item) => <option key={item.inventoryId} value={item.inventoryId}>{item.itemName} | {item.partNumber} | Available: {item.quantity}</option>)}</select></Field>
        <Field label="Current quantity"><input style={S.readonly} value={selected?.quantity ?? ""} readOnly placeholder="Select stock" /></Field>
        <Field label="New physical quantity"><input style={S.input} type="number" min="0" value={adjustedQty} onChange={(e) => setAdjustedQty(e.target.value)} placeholder="0" /></Field>
        <Field label="Reason"><select style={S.input} value={reason} onChange={(e) => setReason(e.target.value)}>{reasons.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></Field>
        <Field label="Remarks"><input style={S.input} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional note" /></Field>
      </div>
      {selected && <div style={S.summary}><span>Product <strong>{selected.itemName}</strong></span><span>Part <strong>{selected.partNumber}</strong></span><span>Current <strong>{selected.quantity}</strong></span><span>Difference <strong>{adjustedQty === "" ? "—" : Number(adjustedQty) - Number(selected.quantity)}</strong></span></div>}
      <button type="button" style={S.button} disabled={saving || !selected} onClick={save}>{saving ? "Saving..." : "Save Adjustment"}</button>
    </section>
  );
}

function Field({ label, children }) { return <label style={S.field}><span style={S.label}>{label}</span>{children}</label>; }

const S = {
  page: { display: "grid", gap: 14, padding: 18, border: "1px solid #E2E8F0", borderRadius: 7, background: "#FFF" },
  heading: { display: "flex", alignItems: "center", gap: 10 }, icon: { width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 6, background: "#EFF6FF", color: "#2563EB" },
  title: { margin: 0, fontSize: 17, color: "#0F172A" }, subtitle: { margin: "3px 0 0", fontSize: 12, color: "#64748B" },
  form: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }, field: { display: "grid", gap: 5 }, label: { fontSize: 11, fontWeight: 700, color: "#475569" },
  input: { width: "100%", height: 38, boxSizing: "border-box", padding: "0 9px", border: "1px solid #CBD5E1", borderRadius: 5, background: "#FFF", color: "#0F172A" }, readonly: { width: "100%", height: 38, boxSizing: "border-box", padding: "0 9px", border: "1px solid #E2E8F0", borderRadius: 5, background: "#F8FAFC", color: "#475569" },
  summary: { display: "flex", gap: 22, flexWrap: "wrap", padding: "11px 12px", border: "1px solid #DBEAFE", borderRadius: 5, background: "#F8FBFF", color: "#475569", fontSize: 12 },
  button: { justifySelf: "start", height: 38, padding: "0 15px", border: 0, borderRadius: 5, background: "#2563EB", color: "#FFF", fontWeight: 800, cursor: "pointer" },
  error: { padding: 10, border: "1px solid #FECACA", borderRadius: 5, background: "#FEF2F2", color: "#B91C1C", fontSize: 12 }, success: { padding: 10, border: "1px solid #BBF7D0", borderRadius: 5, background: "#F0FDF4", color: "#15803D", fontSize: 12 },
};
