import { useEffect, useMemo, useState } from "react";
import { Building2, CirclePlus, Power, Search, Store, UserRoundCheck, X } from "lucide-react";
import api from "../../../services/api";

const emptyVendor = {
    vendorName: "", phone: "", contactPerson: "", email: "",
    gstNumber: "", state: "", pincode: "", address: "",
};

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
        return {};
    }
}

export default function VendorsSection() {
    const user = getUser();
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const [stores, setStores] = useState([]);
    const [storeId, setStoreId] = useState(user.storeId ? String(user.storeId) : "");
    const [vendors, setVendors] = useState([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyVendor);

    useEffect(() => {
        if (!isSuperAdmin) return;
        let active = true;
        api.get("/stores", { params: { page: 0, size: 100, active: true } })
            .then((response) => {
                if (!active) return;
                const content = Array.isArray(response.data?.content) ? response.data.content : [];
                const operationalStores = content.filter((store) => store.storeType !== "WAREHOUSE");
                setStores(operationalStores);
                setStoreId((current) => current || (operationalStores[0]?.id ? String(operationalStores[0].id) : ""));
            })
            .catch(() => active && setMessage({ type: "error", text: "Unable to load stores" }));
        return () => { active = false; };
    }, [isSuperAdmin]);

    const loadVendors = async () => {
        if (isSuperAdmin && !storeId) {
            setVendors([]);
            return;
        }
        setLoading(true);
        try {
            const response = await api.get("/vendors", {
                params: { ...(storeId ? { storeId: Number(storeId) } : {}), activeOnly: false },
            });
            setVendors(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Unable to load vendors" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadVendors(); }, [storeId]);

    const visibleVendors = useMemo(() => {
        const search = query.trim().toLowerCase();
        if (!search) return vendors;
        return vendors.filter((vendor) => [
            vendor.vendorName, vendor.contactPerson, vendor.phone,
            vendor.email, vendor.gstNumber, vendor.state,
        ].some((value) => String(value || "").toLowerCase().includes(search)));
    }, [query, vendors]);

    const activeCount = vendors.filter((vendor) => vendor.isActive).length;

    const saveVendor = async () => {
        if (isSuperAdmin && !storeId) return setMessage({ type: "error", text: "Select a store" });
        if (!form.vendorName.trim()) return setMessage({ type: "error", text: "Vendor name is required" });
        if (!/^\d{10}$/.test(form.phone)) return setMessage({ type: "error", text: "Phone must contain 10 digits" });
        setSaving(true);
        try {
            await api.post("/vendors", {
                ...form,
                storeId: storeId ? Number(storeId) : null,
                vendorName: form.vendorName.trim(),
                email: form.email.trim() || null,
                gstNumber: form.gstNumber.trim().toUpperCase(),
                contactPerson: form.contactPerson.trim() || null,
                state: form.state.trim() || null,
                pincode: form.pincode.trim(),
                address: form.address.trim() || null,
            });
            setModalOpen(false);
            setForm(emptyVendor);
            setMessage({ type: "success", text: "Vendor created successfully" });
            await loadVendors();
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Unable to create vendor" });
        } finally {
            setSaving(false);
        }
    };

    const changeStatus = async (vendor) => {
        try {
            await api.patch(`/vendors/${vendor.id}/active`, null, { params: { active: !vendor.isActive } });
            setMessage({ type: "success", text: `${vendor.vendorName} ${vendor.isActive ? "inactivated" : "activated"}` });
            await loadVendors();
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Unable to update vendor" });
        }
    };

    return (
        <section style={S.section}>
            <style>{`
                .vendors-summary small { display:block; color:#64748B; font-size:10.5px; font-weight:700; }
                .vendors-summary strong { display:block; margin-top:2px; color:#0F172A; font-size:19px; }
                .vendors-search-input { width:100%; border:0; outline:0; background:transparent; color:#0F172A; font:inherit; }
                .vendors-table th { padding:10px 13px; text-align:left; color:#8491A8; background:#F8FAFC; border-bottom:1px solid #E2E8F0; font-size:10px; letter-spacing:.45px; text-transform:uppercase; }
                .vendors-table td { padding:11px 13px; border-bottom:1px solid #E8EDF3; vertical-align:middle; }
                .vendors-table tbody tr:hover { background:#EFF6FF; }
                .vendors-table td strong, .vendors-table td small { display:block; }
                .vendors-table td strong { color:#0F172A; }
                .vendors-table td small { margin-top:3px; color:#94A3B8; font-size:10.5px; }
                .vendor-modal-header h2 { margin:0; color:#0F172A; font-size:17px; }
                .vendor-modal-header p { margin:3px 0 0; color:#64748B; font-size:12px; }
                .vendor-modal-header button, .vendor-message button { border:0; background:transparent; color:inherit; cursor:pointer; }
                @media (max-width: 860px) { .vendors-summary-grid { grid-template-columns:1fr !important; } }
            `}</style>
            {message && <div style={{ ...S.message, ...(message.type === "error" ? S.error : S.success) }}>{message.text}<button type="button" onClick={() => setMessage(null)}>×</button></div>}

            <div className="vendors-summary-grid" style={S.summaryRow}>
                <Summary icon={Building2} label="Total Vendors" value={vendors.length} />
                <Summary icon={UserRoundCheck} label="Active Vendors" value={activeCount} accent="#15803D" />
                <Summary icon={Store} label="Inactive Vendors" value={vendors.length - activeCount} accent="#B45309" />
            </div>

            <div style={S.toolbar}>
                <label style={S.search}><Search size={16} /><input className="vendors-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vendors..." /></label>
                <div style={S.toolbarActions}>
                    {isSuperAdmin && <select style={S.select} value={storeId} onChange={(event) => setStoreId(event.target.value)}><option value="">Select store</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.storeName}</option>)}</select>}
                    <button type="button" style={S.primary} onClick={() => setModalOpen(true)} disabled={isSuperAdmin && !storeId}><CirclePlus size={16} /> Add Vendor</button>
                </div>
            </div>

            <div style={S.tableWrap}>
                <table className="vendors-table" style={S.table}>
                    <thead><tr><th>Vendor</th><th>Contact</th><th>GST Number</th><th>Location</th><th>Status</th><th aria-label="Manage" /></tr></thead>
                    <tbody>
                        {visibleVendors.map((vendor) => <tr key={vendor.id}>
                            <td><strong>{vendor.vendorName}</strong><small>{vendor.contactPerson || "No contact person"}</small></td>
                            <td><span>{vendor.phone}</span><small>{vendor.email || "No email"}</small></td>
                            <td>{vendor.gstNumber || "—"}</td>
                            <td><span>{vendor.state || "—"}</span><small>{vendor.pincode || ""}</small></td>
                            <td><span style={{ ...S.status, ...(vendor.isActive ? S.active : S.inactive) }}>{vendor.isActive ? "Active" : "Inactive"}</span></td>
                            <td><button type="button" style={S.iconButton} title={vendor.isActive ? "Inactivate vendor" : "Activate vendor"} onClick={() => changeStatus(vendor)}><Power size={15} /></button></td>
                        </tr>)}
                        {!loading && !visibleVendors.length && <tr><td colSpan="6" style={S.empty}>No vendors found for this store.</td></tr>}
                        {loading && <tr><td colSpan="6" style={S.empty}>Loading vendors...</td></tr>}
                    </tbody>
                </table>
            </div>

            {modalOpen && <div style={S.backdrop} onMouseDown={() => !saving && setModalOpen(false)}>
                <div style={S.modal} role="dialog" aria-modal="true" aria-label="Add vendor" onMouseDown={(event) => event.stopPropagation()}>
                    <div className="vendor-modal-header" style={S.modalHeader}><div><h2>Add Vendor</h2><p>Create a supplier for the selected store.</p></div><button type="button" onClick={() => setModalOpen(false)}><X size={18} /></button></div>
                    <div style={S.formGrid}>
                        <Field label="Vendor Name *" value={form.vendorName} onChange={(value) => setForm({ ...form, vendorName: value })} autoFocus />
                        <Field label="Phone *" value={form.phone} maxLength={10} onChange={(value) => setForm({ ...form, phone: value.replace(/\D/g, "") })} />
                        <Field label="Contact Person" value={form.contactPerson} onChange={(value) => setForm({ ...form, contactPerson: value })} />
                        <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                        <Field label="GST Number" value={form.gstNumber} onChange={(value) => setForm({ ...form, gstNumber: value.toUpperCase() })} />
                        <Field label="State" value={form.state} onChange={(value) => setForm({ ...form, state: value })} />
                        <Field label="Pincode" value={form.pincode} maxLength={6} onChange={(value) => setForm({ ...form, pincode: value.replace(/\D/g, "") })} />
                        <label style={{ ...S.field, gridColumn: "1 / -1" }}><span>Address</span><textarea style={S.textarea} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
                    </div>
                    <div style={S.modalActions}><button type="button" style={S.secondary} onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button><button type="button" style={S.primary} onClick={saveVendor} disabled={saving}>{saving ? "Saving..." : "Save Vendor"}</button></div>
                </div>
            </div>}
        </section>
    );
}

function Summary({ icon: Icon, label, value, accent = "#3158D4" }) {
    return <div className="vendors-summary" style={S.summary}><span style={{ ...S.summaryIcon, color: accent }}><Icon size={17} /></span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function Field({ label, value, onChange, type = "text", maxLength, autoFocus = false }) {
    return <label style={S.field}><span>{label}</span><input style={S.input} autoFocus={autoFocus} type={type} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

const S = {
    section: { display: "grid", gap: 12 },
    summaryRow: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 },
    summary: { minHeight: 64, padding: "10px 14px", display: "flex", alignItems: "center", gap: 11, borderRadius: 9, background: "#E8E9EB" },
    summaryIcon: { width: 34, height: 34, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(255,255,255,.72)" },
    summaryRowText: {},
    toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "3px 0" },
    toolbarActions: { display: "flex", alignItems: "center", gap: 8 },
    search: { width: "min(390px, 42vw)", height: 36, padding: "0 11px", display: "flex", alignItems: "center", gap: 8, borderRadius: 7, background: "#FFF", border: "1px solid #D8DEE8", color: "#64748B" },
    select: { height: 36, minWidth: 190, padding: "0 10px", border: "1px solid #D8DEE8", borderRadius: 7, background: "#FFF", color: "#334155" },
    primary: { minHeight: 36, padding: "0 14px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, border: 0, borderRadius: 7, background: "#3158D4", color: "#FFF", fontWeight: 750, cursor: "pointer" },
    secondary: { minHeight: 36, padding: "0 14px", border: "1px solid #CBD5E1", borderRadius: 7, background: "#FFF", color: "#334155", fontWeight: 700, cursor: "pointer" },
    tableWrap: { overflow: "hidden", borderRadius: 9, background: "#FFF", boxShadow: "0 1px 3px rgba(15,23,42,.08)" },
    table: { width: "100%", borderCollapse: "collapse", color: "#334155", fontSize: 12.5 },
    status: { display: "inline-flex", padding: "4px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800 },
    active: { color: "#15803D", background: "#DCFCE7" },
    inactive: { color: "#B45309", background: "#FEF3C7" },
    iconButton: { width: 31, height: 31, display: "grid", placeItems: "center", border: 0, borderRadius: 7, background: "#EEF2FF", color: "#3158D4", cursor: "pointer" },
    empty: { padding: 40, textAlign: "center", color: "#94A3B8" },
    message: { minHeight: 36, padding: "7px 11px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 7, fontSize: 12.5, fontWeight: 650 },
    success: { color: "#166534", background: "#DCFCE7" },
    error: { color: "#B91C1C", background: "#FEE2E2" },
    backdrop: { position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 18, background: "rgba(15,23,42,.42)", backdropFilter: "blur(2px)" },
    modal: { width: "min(650px, 96vw)", overflow: "hidden", borderRadius: 11, background: "#FFF", boxShadow: "0 24px 70px rgba(15,23,42,.28)" },
    modalHeader: { padding: "17px 20px", display: "flex", alignItems: "start", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0" },
    formGrid: { padding: 20, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
    field: { display: "grid", gap: 5, color: "#475569", fontSize: 11.5, fontWeight: 700 },
    input: { height: 37, padding: "0 10px", border: "1px solid #D8DEE8", borderRadius: 7, outline: 0, color: "#0F172A", background: "#FFF", boxSizing: "border-box" },
    textarea: { minHeight: 70, padding: 10, resize: "vertical", border: "1px solid #D8DEE8", borderRadius: 7, outline: 0, color: "#0F172A", fontFamily: "inherit", boxSizing: "border-box" },
    modalActions: { padding: "12px 20px", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid #E2E8F0" },
};
