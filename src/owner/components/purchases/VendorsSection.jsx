import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, CirclePlus, Download, Filter, MoreHorizontal, Power, Search, Store, UserRoundCheck, X } from "lucide-react";
import api from "../../../services/api";
import VendorStockModal from "./VendorStockModal";
import "./Vendorssection.css";

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

// GST is treated as a free-form string, not a strict GSTIN structure:
// letters and numbers only, up to 15 characters, blank allowed.
function isValidGstValue(value) {
    const trimmed = (value || "").trim();
    if (!trimmed) return true;
    return /^[A-Za-z0-9]{1,15}$/.test(trimmed);
}

function csvValue(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
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
    const [modalStoreId, setModalStoreId] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [selectedVendor, setSelectedVendor] = useState(null);
    const filterRef = useRef(null);
    const moreRef = useRef(null);

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

    // Only ONE of Filter / More can be open at a time; outside click and
    // Escape close whichever is open.
    useEffect(() => {
        if (!filterOpen && !moreMenuOpen) return;
        const handleClick = (event) => {
            if (filterOpen && filterRef.current && !filterRef.current.contains(event.target)) setFilterOpen(false);
            if (moreMenuOpen && moreRef.current && !moreRef.current.contains(event.target)) setMoreMenuOpen(false);
        };
        const handleKey = (event) => {
            if (event.key === "Escape") { setFilterOpen(false); setMoreMenuOpen(false); }
        };
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [filterOpen, moreMenuOpen]);

    const toggleFilter = () => { setMoreMenuOpen(false); setFilterOpen((open) => !open); };
    const toggleMore = () => { setFilterOpen(false); setMoreMenuOpen((open) => !open); };

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
        return vendors.filter((vendor) => {
            if (statusFilter === "ACTIVE" && !vendor.isActive) return false;
            if (statusFilter === "INACTIVE" && vendor.isActive) return false;
            if (!search) return true;
            return [
                vendor.vendorName, vendor.contactPerson, vendor.phone,
                vendor.email, vendor.gstNumber, vendor.state,
            ].some((value) => String(value || "").toLowerCase().includes(search));
        });
    }, [query, vendors, statusFilter]);

    const activeCount = vendors.filter((vendor) => vendor.isActive).length;
    const share = (count) => (vendors.length ? `${Math.round((count / vendors.length) * 100)}%` : "0%");

    const openAddVendor = () => {
        setForm(emptyVendor);
        setModalStoreId(storeId || "");
        setMessage(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;
        setModalOpen(false);
        setMessage(null);
    };

    const saveVendor = async () => {
        if (isSuperAdmin && !modalStoreId) return setMessage({ type: "error", text: "Please select a store." });
        if (!form.vendorName.trim()) return setMessage({ type: "error", text: "Vendor name is required" });
        if (!/^\d{10}$/.test(form.phone)) return setMessage({ type: "error", text: "Phone must contain 10 digits" });
        if (!isValidGstValue(form.gstNumber)) return setMessage({ type: "error", text: "GST number can contain only letters and numbers, up to 15 characters" });
        setSaving(true);
        try {
            await api.post("/vendors", {
                ...form,
                storeId: isSuperAdmin ? (modalStoreId ? Number(modalStoreId) : null) : (storeId ? Number(storeId) : null),
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

    const exportVendors = () => {
        const header = ["Vendor Name", "Phone", "Contact Person", "Email", "GST Number", "State", "Pincode", "Status"];
        const rows = visibleVendors.map((vendor) => [
            vendor.vendorName, vendor.phone, vendor.contactPerson || "", vendor.email || "",
            vendor.gstNumber || "", vendor.state || "", vendor.pincode || "", vendor.isActive ? "Active" : "Inactive",
        ]);
        const csv = [header, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        link.download = "vendors.csv";
        link.click();
        URL.revokeObjectURL(link.href);
        setMoreMenuOpen(false);
    };

    return (
        <section className="vs-section">
            {message && !modalOpen && (
                <div className={`vs-message vs-message--${message.type === "error" ? "error" : "success"}`}>
                    {message.text}
                    <button type="button" onClick={() => setMessage(null)}>×</button>
                </div>
            )}

            <div className="vs-summary-row">
                <Summary icon={Building2} label="Total Vendors" value={vendors.length} hint="All vendors" />
                <Summary icon={UserRoundCheck} label="Active Vendors" value={activeCount} accent="#15803D" hint={`${share(activeCount)} of total`} />
                <Summary icon={Store} label="Inactive Vendors" value={vendors.length - activeCount} accent="#B45309" hint={`${share(vendors.length - activeCount)} of total`} />
            </div>

            <div className="vs-toolbar">
                <div className="vs-toolbar-left">
                    <label className="vs-search">
                        <Search size={16} />
                        <input className="vs-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vendors..." />
                    </label>
                    {isSuperAdmin && (
                        <select className="vs-select" value={storeId} onChange={(event) => setStoreId(event.target.value)}>
                            <option value="">Select store</option>
                            {stores.map((store) => <option key={store.id} value={store.id}>{store.storeName}</option>)}
                        </select>
                    )}
                </div>
                <div className="vs-toolbar-actions">

                    <div ref={filterRef} className="vs-relative">
                        <button type="button" className="vs-icon-button" title="Filter vendors" onClick={toggleFilter}><Filter size={16} /></button>
                        {filterOpen && (
                            <div className="vs-filter-menu">
                                <label className="vs-filter-label">Status
                                    <select className="vs-filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                        <option value="ALL">All statuses</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                    </select>
                                </label>
                            </div>
                        )}
                    </div>

                    <div ref={moreRef} className="vs-relative">
                        <button type="button" className="vs-icon-button" title="More vendor actions" onClick={toggleMore}><MoreHorizontal size={16} /></button>
                        {moreMenuOpen && (
                            <div className="vs-more-menu">
                                <button type="button" onClick={exportVendors}><Download size={15} /> Export Vendors</button>
                            </div>
                        )}
                    </div>

                    <button type="button" className="vs-btn-primary" onClick={openAddVendor}><CirclePlus size={16} /> Add Vendor</button>
                </div>
            </div>

            <div className="vs-table-wrap">
                <table className="vs-table">
                    <thead>
                        <tr>
                            <th>Vendor</th>
                            <th>Contact</th>
                            <th>GST Number</th>
                            <th>Location</th>
                            <th>Status</th>
                            <th className="vs-col-action">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleVendors.map((vendor) => (
                            <tr key={vendor.id} onClick={() => setSelectedVendor(vendor)}>
                                <td><strong>{vendor.vendorName}</strong><small>{vendor.contactPerson || "No contact person"}</small></td>
                                <td><span>{vendor.phone}</span><small>{vendor.email || "No email"}</small></td>
                                <td>{vendor.gstNumber || "—"}</td>
                                <td><span>{vendor.state || "—"}</span><small>{vendor.pincode || ""}</small></td>
                                <td>
                                    <span className={`vs-status ${vendor.isActive ? "vs-status--active" : "vs-status--inactive"}`}>
                                        {vendor.isActive ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="vs-col-action">
                                    <button
                                        type="button"
                                        className={`vs-row-action ${vendor.isActive ? "vs-row-action--deactivate" : "vs-row-action--activate"}`}
                                        title={vendor.isActive ? "Inactivate vendor" : "Activate vendor"}
                                        onClick={(event) => { event.stopPropagation(); changeStatus(vendor); }}
                                    >
                                        <Power size={14} /> {vendor.isActive ? "Deactivate" : "Activate"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!loading && !visibleVendors.length && <tr><td colSpan="6" className="vs-table-empty">No vendors found for this store.</td></tr>}
                        {loading && <tr><td colSpan="6" className="vs-table-empty">Loading vendors...</td></tr>}
                    </tbody>
                </table>
                {!loading && (
                    <div className="vs-table-footer">
                        Showing <strong>{visibleVendors.length}</strong> of <strong>{vendors.length}</strong> {vendors.length === 1 ? "vendor" : "vendors"}
                    </div>
                )}
            </div>

            {modalOpen && (
                <div className="vs-backdrop" onMouseDown={closeModal}>
                    <div className="vs-modal" role="dialog" aria-modal="true" aria-label="Add vendor" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="vs-modal-header">
                            <div><h2>Add Vendor</h2><p>Create a supplier for the selected store.</p></div>
                            <button type="button" onClick={closeModal}><X size={18} /></button>
                        </div>

                        {message && (
                            <div className={`vs-message vs-message--modal vs-message--${message.type === "error" ? "error" : "success"}`}>
                                {message.text}
                                <button type="button" onClick={() => setMessage(null)}>×</button>
                            </div>
                        )}

                        <div className="vs-form-grid">
                            {isSuperAdmin && (
                                <label className="vs-field vs-field--full">
                                    <span>Store *</span>
                                    <select className="vs-input" value={modalStoreId} onChange={(event) => setModalStoreId(event.target.value)}>
                                        <option value="">Select Store</option>
                                        {stores.map((store) => <option key={store.id} value={store.id}>{store.storeName}</option>)}
                                    </select>
                                </label>
                            )}
                            <Field label="Vendor Name *" value={form.vendorName} onChange={(value) => setForm({ ...form, vendorName: value })} autoFocus />
                            <Field label="Phone *" value={form.phone} maxLength={10} onChange={(value) => setForm({ ...form, phone: value.replace(/\D/g, "") })} />
                            <Field label="Contact Person" value={form.contactPerson} onChange={(value) => setForm({ ...form, contactPerson: value })} />
                            <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                            <Field label="GST Number" value={form.gstNumber} maxLength={15} onChange={(value) => setForm({ ...form, gstNumber: value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15) })} />
                            <Field label="State" value={form.state} onChange={(value) => setForm({ ...form, state: value })} />
                            <Field label="Pincode" value={form.pincode} maxLength={6} onChange={(value) => setForm({ ...form, pincode: value.replace(/\D/g, "") })} />
                            <label className="vs-field vs-field--full">
                                <span>Address</span>
                                <textarea className="vs-textarea" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
                            </label>
                        </div>
                        <div className="vs-modal-actions">
                            <button type="button" className="vs-btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
                            <button type="button" className="vs-btn-primary" onClick={saveVendor} disabled={saving}>{saving ? "Saving..." : "Save Vendor"}</button>
                        </div>
                    </div>
                </div>
            )}
            {selectedVendor && <VendorStockModal vendor={selectedVendor} onClose={() => setSelectedVendor(null)} />}
        </section>
    );
}

function Summary({ icon: Icon, label, value, accent = "#3158D4", hint }) {
    return (
        <div className="vs-summary" style={{ "--vs-accent": accent }}>
            <span className="vs-summary-icon"><Icon size={20} /></span>
            <div><small>{label}</small><strong>{value}</strong></div>
            {hint && <span className="vs-summary-hint">{hint}</span>}
        </div>
    );
}

function Field({ label, value, onChange, type = "text", maxLength, autoFocus = false }) {
    return (
        <label className="vs-field">
            <span>{label}</span>
            <input className="vs-input" autoFocus={autoFocus} type={type} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} />
        </label>
    );
}
