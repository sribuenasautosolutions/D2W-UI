import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { updateLead } from "../../../services/leadService";
import { getCustomerByMobile, saveCustomer, searchCustomersByStore } from "../../../services/customerService";
import { createSalesperson, getSalespersons } from "../../../services/salespersonService";
import LeadCreate from "./LeadCreate";
import LeadBoard from "./LeadBoard";
import "./LeadList.css";
const firstValue = (...values) => values.find(value => value != null && String(value).trim() !== "");
const EDIT_SOURCE_OPTIONS = [
    { value: "PHONE", label: "Phone" },
    { value: "WHATSAPP", label: "WhatsApp" },
    { value: "WALK_IN", label: "Walk-in" },
    { value: "WEBSITE", label: "Website" },
    { value: "INSTAGRAM", label: "Instagram" },
    { value: "FACEBOOK", label: "Facebook" },
    { value: "INDIAMART", label: "IndiaMART" },
    { value: "REFERRAL", label: "Referral" },
    { value: "OTHER", label: "Other" },
];

const normalizeEditSource = (value) => {
    if (value == null) return "";
    const raw = String(value).trim();
    if (!raw) return "";
    const exact = EDIT_SOURCE_OPTIONS.find(
        (item) => item.value.toLowerCase() === raw.toLowerCase()
    );
    if (exact) return exact.value;
    const label = EDIT_SOURCE_OPTIONS.find(
        (item) => item.label.toLowerCase() === raw.toLowerCase()
    );
    return label ? label.value : raw.toUpperCase().replace(/\s+/g, "_");
};

const EMPTY_EDIT_CUSTOMER = {
    customerName: "",
    mobileNumber: "",
    customerType: "WALK_IN",
    gstRegistrationType: "UNREGISTERED",
    gstin: "",
};

function EditLeadModal({ lead, onClose, onSaved }) {
    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user"));
        } catch {
            return null;
        }
    }, []);

    const [storeId] = useState(String(lead?.storeId ?? lead?.store?.id ?? user?.storeId ?? ""));
    const [customerMobile, setCustomerMobile] = useState(
        firstValue(
            lead?.customerPhone,
            lead?.customerMobile,
            lead?.customer?.mobileNumber,
            lead?.customer?.mobile,
            lead?.phone,
            lead?.mobile
        ) || ""
    );
    const [customerName, setCustomerName] = useState(
        firstValue(
            lead?.customerName,
            lead?.customer?.customerName,
            lead?.customer?.name
        ) || ""
    );
    const [selectedCustomer, setSelectedCustomer] = useState(
        lead?.customerId || lead?.customer?.id
            ? {
                  id: lead?.customerId ?? lead?.customer?.id,
                  customerName: firstValue(
                      lead?.customerName,
                      lead?.customer?.customerName,
                      lead?.customer?.name
                  ) || "",
                  mobileNumber: firstValue(
                      lead?.customerPhone,
                      lead?.customerMobile,
                      lead?.customer?.mobileNumber,
                      lead?.customer?.mobile
                  ) || "",
              }
            : null
    );
    const [customerMessage, setCustomerMessage] = useState("");
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [customerForm, setCustomerForm] = useState(EMPTY_EDIT_CUSTOMER);
    const [savingCustomer, setSavingCustomer] = useState(false);

    const [salespersons, setSalespersons] = useState([]);
    const [salespersonMobile, setSalespersonMobile] = useState(
        firstValue(
            lead?.salespersonMobile,
            lead?.salesperson?.mobileNumber,
            lead?.salesperson?.mobile
        ) || ""
    );
    const [salespersonName, setSalespersonName] = useState(
        firstValue(
            lead?.salespersonName,
            lead?.salesperson?.salespersonName,
            lead?.salesperson?.name
        ) || ""
    );
    const [selectedSalesperson, setSelectedSalesperson] = useState(
        lead?.salespersonId || lead?.salesperson?.id
            ? {
                  id: lead?.salespersonId ?? lead?.salesperson?.id,
                  salespersonName: firstValue(
                      lead?.salespersonName,
                      lead?.salesperson?.salespersonName,
                      lead?.salesperson?.name
                  ) || "",
                  mobileNumber: firstValue(
                      lead?.salespersonMobile,
                      lead?.salesperson?.mobileNumber,
                      lead?.salesperson?.mobile
                  ) || "",
              }
            : null
    );
    const [salespersonMessage, setSalespersonMessage] = useState("");
    const [salespersonModalOpen, setSalespersonModalOpen] = useState(false);
    const [salespersonForm, setSalespersonForm] = useState({
        salespersonName: "",
        mobileNumber: "",
    });
    const [savingSalesperson, setSavingSalesperson] = useState(false);

    const [source, setSource] = useState(
        normalizeEditSource(
            lead?.source ?? lead?.sourceName ?? lead?.leadSource ?? lead?.leadSourceName
        )
    );
    const [customerRequirement, setCustomerRequirement] = useState(
        lead?.customerRequirement || ""
    );
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        if (!storeId) return undefined;

        const load = async () => {
            try {
                const response = await getSalespersons(Number(storeId));
                if (cancelled) return;
                const list = Array.isArray(response) ? response : [];
                setSalespersons(list);

                const salespersonId = lead?.salespersonId ?? lead?.salesperson?.id;
                if (salespersonId) {
                    const existing = list.find(
                        (item) => String(item?.id ?? item?.salespersonId) === String(salespersonId)
                    );
                    if (existing) {
                        setSelectedSalesperson(existing);
                        setSalespersonMobile(
                            existing?.mobileNumber ?? existing?.mobile ?? salespersonMobile
                        );
                        setSalespersonName(
                            existing?.salespersonName ?? existing?.name ?? salespersonName
                        );
                        setSalespersonMessage("Existing salesperson selected.");
                    }
                }
            } catch (error) {
                console.error("Unable to load salespersons:", error);
            }
        };
        load();
        return () => { cancelled = true; };
        // Existing lead/store is intentionally loaded once when the edit popup opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, lead]);

    useEffect(() => {
        let cancelled = false;
        if (!storeId || selectedCustomer?.mobileNumber || !selectedCustomer?.id) return undefined;

        const name = firstValue(lead?.customerName, lead?.customer?.customerName, lead?.customer?.name);
        if (!name) return undefined;

        const resolve = async () => {
            try {
                const result = await searchCustomersByStore(Number(storeId), name);
                if (cancelled || !Array.isArray(result)) return;
                const existing = result.find(
                    (item) => String(item?.id ?? item?.customerId) === String(selectedCustomer.id)
                );
                if (existing) {
                    setSelectedCustomer(existing);
                    setCustomerMobile(existing?.mobileNumber ?? existing?.mobile ?? "");
                    setCustomerName(existing?.customerName ?? existing?.name ?? name);
                    setCustomerMessage("Existing customer selected.");
                }
            } catch (error) {
                console.warn("Unable to resolve customer mobile:", error);
            }
        };
        resolve();
        return () => { cancelled = true; };
    }, [storeId, selectedCustomer?.id, selectedCustomer?.mobileNumber, lead]);

    const lookupCustomer = async (mobile) => {
        if (!storeId || !/^\d{10}$/.test(mobile)) return;
        setCustomerLoading(true);
        setCustomerMessage("");
        try {
            const found = await getCustomerByMobile(mobile, Number(storeId));
            if (found) {
                setSelectedCustomer(found);
                setCustomerName(found?.customerName ?? found?.name ?? "");
                setCustomerMobile(found?.mobileNumber ?? found?.mobile ?? mobile);
                setCustomerMessage("Existing customer selected.");
            } else {
                setCustomerForm({ ...EMPTY_EDIT_CUSTOMER, mobileNumber: mobile });
                setCustomerModalOpen(true);
            }
        } catch (error) {
            if (error?.response?.status === 404 || error?.response?.status === 204) {
                setCustomerForm({ ...EMPTY_EDIT_CUSTOMER, mobileNumber: mobile });
                setCustomerModalOpen(true);
            } else {
                setCustomerMessage(
                    error?.response?.data?.message || "Unable to check customer."
                );
            }
        } finally {
            setCustomerLoading(false);
        }
    };

    const handleCustomerMobileChange = (event) => {
        const value = event.target.value.replace(/\D/g, "").slice(0, 10);
        setCustomerMobile(value);
        setCustomerMessage("");
        if (String(selectedCustomer?.mobileNumber || "") !== value) {
            setSelectedCustomer(null);
            setCustomerName("");
        }
        if (value.length === 10) lookupCustomer(value);
    };

    const handleSaveCustomer = async () => {
        const name = customerForm.customerName.trim();
        const mobile = customerForm.mobileNumber.trim();
        if (!name) return alert("Customer name is required.");
        if (!/^\d{10}$/.test(mobile)) return alert("Enter a valid 10-digit mobile number.");

        const requiresGst =
            customerForm.customerType !== "WALK_IN" &&
            customerForm.gstRegistrationType === "REGISTERED";
        if (requiresGst && !/^[0-9A-Za-z]{15}$/.test(customerForm.gstin.trim())) {
            return alert("A valid 15-character GSTIN is required.");
        }

        setSavingCustomer(true);
        try {
            const saved = await saveCustomer({
                customerName: name,
                mobileNumber: mobile,
                customerType: customerForm.customerType,
                gstRegistrationType:
                    customerForm.customerType === "WALK_IN"
                        ? "UNREGISTERED"
                        : customerForm.gstRegistrationType,
                gstin: requiresGst ? customerForm.gstin.trim().toUpperCase() : null,
                storeId: Number(storeId),
            });
            setSelectedCustomer(saved);
            setCustomerMobile(saved?.mobileNumber || mobile);
            setCustomerName(saved?.customerName || name);
            setCustomerMessage("New customer created.");
            setCustomerModalOpen(false);
        } catch (error) {
            alert(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to save customer."
            );
        } finally {
            setSavingCustomer(false);
        }
    };

    const lookupSalesperson = (mobile) => {
        if (!storeId || !/^\d{10}$/.test(mobile)) return;
        const found = salespersons.find(
            (item) => String(item?.mobileNumber ?? item?.mobile ?? "") === mobile
        );
        if (found) {
            setSelectedSalesperson(found);
            setSalespersonName(found?.salespersonName ?? found?.name ?? "");
            setSalespersonMobile(found?.mobileNumber ?? found?.mobile ?? mobile);
            setSalespersonMessage("Existing salesperson selected.");
            return;
        }
        setSalespersonForm({ salespersonName: "", mobileNumber: mobile });
        setSalespersonModalOpen(true);
    };

    const handleSalespersonMobileChange = (event) => {
        const value = event.target.value.replace(/\D/g, "").slice(0, 10);
        setSalespersonMobile(value);
        setSalespersonMessage("");
        if (String(selectedSalesperson?.mobileNumber || selectedSalesperson?.mobile || "") !== value) {
            setSelectedSalesperson(null);
            setSalespersonName("");
        }
        if (value.length === 10) lookupSalesperson(value);
    };

    const handleSaveSalesperson = async () => {
        const name = salespersonForm.salespersonName.trim();
        const mobile = salespersonForm.mobileNumber.trim();
        if (!name) return alert("Salesperson name is required.");
        if (!/^\d{10}$/.test(mobile)) return alert("Enter a valid 10-digit mobile number.");

        setSavingSalesperson(true);
        try {
            const saved = await createSalesperson({
                salespersonName: name,
                mobileNumber: mobile,
                storeId: Number(storeId),
            });
            setSelectedSalesperson(saved);
            setSalespersonMobile(saved?.mobileNumber || mobile);
            setSalespersonName(saved?.salespersonName || name);
            setSalespersonMessage("New salesperson created.");
            setSalespersonModalOpen(false);
            const response = await getSalespersons(Number(storeId));
            setSalespersons(Array.isArray(response) ? response : []);
        } catch (error) {
            alert(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to save salesperson."
            );
        } finally {
            setSavingSalesperson(false);
        }
    };

    const handleSave = async () => {
        if (!selectedCustomer?.id) return alert("Select an existing customer or create the new customer.");
        if (!selectedSalesperson?.id) return alert("Select an existing salesperson or create the new salesperson.");
        if (!source) return alert("Select a lead source.");
        if (!customerRequirement.trim()) return alert("Customer requirement is required.");

        setSaving(true);
        try {
            const response = await updateLead(lead.id, {
                customerId: Number(selectedCustomer.id),
                salespersonId: Number(selectedSalesperson.id),
                source,
                customerRequirement: customerRequirement.trim(),
                notes: lead?.notes ?? null,
            });

            onSaved({
                ...lead,
                ...(response || {}),
                customerId: response?.customerId ?? selectedCustomer.id,
                customerName: response?.customerName ?? customerName,
                customerPhone: customerMobile,
                salespersonId: response?.salespersonId ?? selectedSalesperson.id,
                salespersonName: response?.salespersonName ?? salespersonName,
                salespersonMobile,
                source,
                customerRequirement: customerRequirement.trim(),
                notes: lead?.notes ?? null,
            });
        } catch (error) {
            alert(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to update lead."
            );
        } finally {
            setSaving(false);
        }
    };

    const updateCustomerForm = (field, value) => {
        setCustomerForm((current) => {
            const next = { ...current, [field]: value };
            if (field === "customerType" && value === "WALK_IN") {
                next.gstRegistrationType = "UNREGISTERED";
                next.gstin = "";
            }
            if (field === "gstRegistrationType" && value === "UNREGISTERED") next.gstin = "";
            return next;
        });
    };

    return (
        <>
            <div className="lead-create-header">
                <div>
                    <span className="lead-create-eyebrow">LEAD MANAGEMENT</span>
                    <h2>Edit Lead</h2>
                    <small>{lead?.leadNumber || `LEAD-${lead?.id || ""}`}</small>
                </div>
                <button type="button" className="lead-create-close" onClick={onClose} aria-label="Close">
                    <X size={17} />
                </button>
            </div>

            <div className="lead-create-form">
                <div className="lead-create-row">
                    <div className="lead-create-field">
                        <label>Customer Mobile <span>*</span></label>
                        <div className="lead-input-with-icon">
                            <Search size={14} />
                            <input value={customerMobile} onChange={handleCustomerMobileChange} maxLength={10} placeholder="10-digit mobile number" />
                        </div>
                        {customerLoading && <small>Checking customer...</small>}
                        {!customerLoading && customerMessage && <small className="lead-create-success">✓ {customerMessage}</small>}
                    </div>
                    <div className="lead-create-field">
                        <label>Customer Name</label>
                        <input value={customerName} readOnly placeholder="Auto-filled from mobile" />
                    </div>
                </div>

                <div className="lead-create-row">
                    <div className="lead-create-field">
                        <label>Salesperson Mobile <span>*</span></label>
                        <div className="lead-input-with-icon">
                            <Search size={14} />
                            <input value={salespersonMobile} onChange={handleSalespersonMobileChange} maxLength={10} placeholder="10-digit mobile number" />
                        </div>
                        {salespersonMessage && <small className="lead-create-success">✓ {salespersonMessage}</small>}
                    </div>
                    <div className="lead-create-field">
                        <label>Lead Source <span>*</span></label>
                        <select value={source} onChange={(e) => setSource(e.target.value)}>
                            <option value="">Select source</option>
                            {EDIT_SOURCE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="lead-create-field">
                    <label>Customer Requirement <span>*</span></label>
                    <textarea value={customerRequirement} onChange={(e) => setCustomerRequirement(e.target.value)} rows={4} />
                </div>

                <div className="lead-create-footer">
                    <button type="button" className="lead-create-submit" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            {customerModalOpen && (
                <div className="lead-create-inner-modal-overlay">
                    <div className="lead-create-inner-modal">
                        <div className="lead-create-modal-header">
                            <div>
                                <span className="lead-create-eyebrow">CUSTOMER</span>
                                <h3>Create Customer</h3>
                            </div>
                            <button type="button" onClick={() => setCustomerModalOpen(false)}><X size={17} /></button>
                        </div>
                        <div className="lead-create-modal-body">
                            <label>Mobile Number</label>
                            <input value={customerForm.mobileNumber} readOnly />
                            <label>Customer Name *</label>
                            <input value={customerForm.customerName} onChange={(e) => updateCustomerForm("customerName", e.target.value)} autoFocus />
                            <label>Customer Type</label>
                            <select value={customerForm.customerType} onChange={(e) => updateCustomerForm("customerType", e.target.value)}>
                                <option value="WALK_IN">Walk-in</option>
                                <option value="RETAIL">Retail</option>
                                <option value="WHOLESALE">Wholesale</option>
                                <option value="BUSINESS">Business</option>
                            </select>
                            {customerForm.customerType !== "WALK_IN" && (
                                <>
                                    <label>GST Registration</label>
                                    <select value={customerForm.gstRegistrationType} onChange={(e) => updateCustomerForm("gstRegistrationType", e.target.value)}>
                                        <option value="UNREGISTERED">Unregistered</option>
                                        <option value="REGISTERED">Registered</option>
                                    </select>
                                    {customerForm.gstRegistrationType === "REGISTERED" && (
                                        <>
                                            <label>GSTIN *</label>
                                            <input value={customerForm.gstin} onChange={(e) => updateCustomerForm("gstin", e.target.value.toUpperCase())} maxLength={15} />
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="lead-create-modal-footer">
                            <button type="button" onClick={() => setCustomerModalOpen(false)}>Cancel</button>
                            <button type="button" className="lead-create-submit" onClick={handleSaveCustomer} disabled={savingCustomer}>
                                {savingCustomer ? "Saving..." : "Create Customer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {salespersonModalOpen && (
                <div className="lead-create-inner-modal-overlay">
                    <div className="lead-create-inner-modal">
                        <div className="lead-create-modal-header">
                            <div>
                                <span className="lead-create-eyebrow">SALESPERSON</span>
                                <h3>Create Salesperson</h3>
                            </div>
                            <button type="button" onClick={() => setSalespersonModalOpen(false)}><X size={17} /></button>
                        </div>
                        <div className="lead-create-modal-body">
                            <label>Mobile Number</label>
                            <input value={salespersonForm.mobileNumber} readOnly />
                            <label>Salesperson Name *</label>
                            <input value={salespersonForm.salespersonName} onChange={(e) => setSalespersonForm((current) => ({ ...current, salespersonName: e.target.value }))} autoFocus />
                        </div>
                        <div className="lead-create-modal-footer">
                            <button type="button" onClick={() => setSalespersonModalOpen(false)}>Cancel</button>
                            <button type="button" className="lead-create-submit" onClick={handleSaveSalesperson} disabled={savingSalesperson}>
                                {savingSalesperson ? "Saving..." : "Create Salesperson"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function LeadList() {
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    const [revision, setRevision] = useState(0);
    const refresh = () => setRevision(value => value + 1);
    return <>
        <LeadBoard revision={revision} onEdit={setEditing} onCreate={() => setCreating(true)} />
        {(editing || creating) && <div className="lead-create-modal-overlay">
            <div className="lead-create-modal" role="dialog" aria-modal="true" aria-label={editing ? "Edit lead" : "New lead"}>
                {editing ? <EditLeadModal lead={editing} onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); refresh(); }} /> :
                    <LeadCreate onClose={() => { setCreating(false); refresh(); }} />}
            </div>
        </div>}
    </>;
}
