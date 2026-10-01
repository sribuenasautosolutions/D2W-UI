import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    AlertTriangle,
    CarFront,
    ChevronRight,
    FileText,
    Filter,
    PackageCheck,
    Pencil,
    Phone,
    Plus,
    Search,
    Trophy,
    UserPlus,
    Users,
    X,
} from "lucide-react";

import { getLeads, updateLead } from "../../../services/leadService";
import { getCustomerByMobile, saveCustomer, searchCustomersByStore } from "../../../services/customerService";
import { createSalesperson, getSalespersons } from "../../../services/salespersonService";
import "./LeadList.css";
import LeadCreate from "./LeadCreate";


/* ============================================================
   Stage definitions — same mapping used by the previous version.
   ============================================================ */
const STAGES = [
    { key: "NEW",         label: "New",          tone: "blue",   Icon: UserPlus },
    { key: "PROCUREMENT", label: "Procurement",  tone: "orange", Icon: PackageCheck },
    { key: "PROFORMA",    label: "Proforma",     tone: "purple", Icon: FileText },
    { key: "FOLLOW_UP",   label: "Follow-up",    tone: "amber",  Icon: Phone },
    { key: "WON",         label: "Won",          tone: "green",  Icon: Trophy },
    { key: "LOST",        label: "Lost",         tone: "red",    Icon: X },
];

const KPI_DEFINITIONS = [
    { key: "total", label: "Total Leads", tone: "blue",  Icon: Users },
    { key: "won",   label: "Won Leads",   tone: "green", Icon: Trophy },
    { key: "lost",  label: "Lost Leads",  tone: "red",   Icon: X },
];

/* Backend-status → UI-stage alias (unchanged). */
const STATUS_MAP = {
    NEW: "NEW",
    PROCUREMENT: "PROCUREMENT",
    PROCUREMENT_COMPLETED: "PROFORMA",
    READY_FOR_PROFORMA: "PROFORMA",
    PROFORMA: "PROFORMA",
    QUOTATION_SENT: "PROFORMA",
    FOLLOW_UP: "FOLLOW_UP",
    FOLLOWUP: "FOLLOW_UP",
    WON: "WON",
    LOST: "LOST",
};

/* ---------- Helpers (unchanged behavior) ---------- */
const firstValue = (...values) =>
    values.find(
        (item) =>
            item !== null &&
            item !== undefined &&
            String(item).trim() !== ""
    );

const getCustomerName = (lead) =>
    firstValue(lead?.customerName, lead?.customer?.name) ||
    "Customer unavailable";

const getStoreName = (lead) =>
    firstValue(lead?.storeName, lead?.store?.name) || "Store unavailable";

const getCustomerPhone = (lead) =>
    firstValue(
        lead?.customerPhone,
        lead?.phone,
        lead?.mobile,
        lead?.customer?.phone,
        lead?.customer?.mobile,
        lead?.customer?.mobileNumber
    ) || "Phone not available";

const getPrimaryItem = (lead) => {
    if (!Array.isArray(lead?.items)) return "";
    const item = lead.items.find(Boolean);
    return (
        firstValue(
            item?.productName,
            item?.partNumber,
            item?.requirement,
            item?.brandName
        ) || ""
    );
};

const getVehicleName = (lead) => {
    if (!Array.isArray(lead?.items)) return "Vehicle not specified";
    const vehicle = lead.items
        .map((item) =>
            firstValue(
                item?.vehicleDescription,
                item?.vehicleName,
                item?.vehicle,
                item?.fitmentDescription
            )
        )
        .find(Boolean);
    return vehicle || "Vehicle not specified";
};

const getItemCount = (lead) => {
    if (Array.isArray(lead?.items)) return lead.items.length;
    if (Number.isFinite(Number(lead?.itemCount))) return Number(lead.itemCount);
    return 0;
};

const getRawStatus = (lead) => String(lead?.status || "").toUpperCase();

const hasProcurementData = (lead) => {
    if (!Array.isArray(lead?.items)) return false;
    return lead.items.some((item) =>
        Boolean(
            item?.procurementSource ||
                item?.selectedVendorId ||
                item?.selectedVendorStockItemId ||
                item?.selectedVendorName ||
                item?.availabilityStatus ||
                (item?.quotedMrp !== null && item?.quotedMrp !== undefined) ||
                (item?.quotedSellingPrice !== null &&
                    item?.quotedSellingPrice !== undefined) ||
                (item?.sellingQuantity !== null &&
                    item?.sellingQuantity !== undefined)
        )
    );
};

const getStage = (lead) => {
    const rawStatus = getRawStatus(lead);
    if (rawStatus === "NEW" && hasProcurementData(lead)) return "PROCUREMENT";
    return STATUS_MAP[rawStatus] || "NEW";
};

const getStageDefinition = (stage) =>
    STAGES.find((item) => item.key === stage) || STAGES[0];

const getLeadSearchValues = (lead) => {
    const values = [
        lead?.id,
        lead?.leadNumber,
        lead?.customerName,
        lead?.customer?.name,
        lead?.customerRequirement,
        lead?.notes,
        lead?.storeName,
        lead?.salespersonName,
        lead?.createdByName,
        lead?.status,
    ];
    if (Array.isArray(lead?.items)) {
        lead.items.forEach((item) => {
            values.push(
                item?.requirement,
                item?.vehicleDescription,
                item?.vin,
                item?.productName,
                item?.brandName,
                item?.brandname,
                item?.partNumber,
                item?.hsnCode,
                item?.selectedVendorName,
                item?.availabilityStatus,
                item?.procurementSource
            );
        });
    }
    return values
        .filter((item) => item !== null && item !== undefined)
        .map((item) => String(item).toLowerCase());
};

/* ============================================================
   KPI Card
   ============================================================ */
function KpiCard({ definition, count, selected, onClick }) {
    const Icon = definition.Icon;
    return (
        <button
            type="button"
            className={`lead-kpi-card lead-kpi-${definition.tone}${
                selected ? " is-selected" : ""
            }`}
            onClick={onClick}
            aria-pressed={selected}
        >
            <span className="lead-kpi-icon" aria-hidden="true">
                <Icon size={20} strokeWidth={2.2} />
            </span>
            <span className="lead-kpi-content">
                <span className="lead-kpi-label">{definition.label}</span>
                <strong className="lead-kpi-number">{count}</strong>
            </span>
        </button>
    );
}


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
function LeadViewModal({ lead, onClose, onEdit }) {
    if (!lead) return null;

    const customerName =
        firstValue(
            lead?.customerName,
            lead?.customer?.customerName,
            lead?.customer?.name
        ) || "Not available";

    // Reuse the existing customer phone logic from LeadList.
    const customerPhone = getCustomerPhone(lead);

    const salespersonName =
        firstValue(
            lead?.salespersonName,
            lead?.salesperson?.salespersonName,
            lead?.salesperson?.name
        ) || "Not assigned";

    const source =
        firstValue(
            lead?.source,
            lead?.sourceName,
            lead?.leadSource,
            lead?.leadSourceName
        ) || "Not available";

    const requirement =
        firstValue(lead?.customerRequirement) || "Not available";

    return (
        <div
            className="lead-view-modal-overlay"
            onClick={onClose}
        >
            <div
                className="lead-view-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="lead-view-title"
            >
                {/* HEADER */}
                <div className="lead-view-modal-header">
                    <div>
                        <div className="lead-view-modal-eyebrow">
                            LEAD DETAILS
                        </div>

                        <h2 id="lead-view-title">
                            {lead?.leadNumber || `Lead #${lead?.id}`}
                        </h2>
                    </div>

                    <div className="lead-view-modal-actions">
                        {/* EDIT */}
                        <button
                            type="button"
                            className="lead-view-edit-btn"
                            onClick={() => onEdit(lead)}
                            title="Edit Lead"
                            aria-label="Edit Lead"
                        >
                            <Pencil size={18} strokeWidth={2.2} />
                        </button>

                        {/* CLOSE */}
                        <button
                            type="button"
                            className="lead-view-close-btn"
                            onClick={onClose}
                            title="Close"
                            aria-label="Close"
                        >
                            <X size={20} strokeWidth={2.2} />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="lead-view-modal-body">

                    {/* CUSTOMER */}
                    <section className="lead-view-section">
                        <div className="lead-view-section-title">
                            Customer
                        </div>

                        <div className="lead-view-grid">
                            <div className="lead-view-field">
                                <span>Customer Name</span>
                                <strong>{customerName}</strong>
                            </div>

                            <div className="lead-view-field">
                                <span>Mobile Number</span>
                                <strong>{customerPhone}</strong>
                            </div>
                        </div>
                    </section>

                    {/* SALESPERSON */}
                    <section className="lead-view-section">
                        <div className="lead-view-section-title">
                            Salesperson
                        </div>

                        <div className="lead-view-grid">
                            <div className="lead-view-field">
                                <span>Salesperson Name</span>
                                <strong>{salespersonName}</strong>
                            </div>
                        </div>
                    </section>

                    {/* LEAD INFORMATION */}
                    <section className="lead-view-section">
                        <div className="lead-view-section-title">
                            Lead Information
                        </div>

                        <div className="lead-view-grid">
                            <div className="lead-view-field">
                                <span>Lead Source</span>
                                <strong>{source}</strong>
                            </div>
                        </div>
                    </section>

                    {/* CUSTOMER REQUIREMENT */}
                    <section className="lead-view-section">
                        <div className="lead-view-section-title">
                            Customer Requirement
                        </div>

                        <div className="lead-view-requirement">
                            {requirement}
                        </div>
                    </section>

                </div>

                {/* FOOTER */}
                <div className="lead-view-modal-footer">
                    <button
                        type="button"
                        className="lead-view-footer-edit"
                        onClick={() => onEdit(lead)}
                    >
                        <Pencil size={17} strokeWidth={2.2} />
                        Edit Lead
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   Lead Card — with edit button
   ============================================================ */
function LeadCard({ lead, onView, onEdit }) {
    const stage = getStage(lead);
    const stageDefinition = getStageDefinition(stage);
    const customerName = getCustomerName(lead);
    const customerPhone = getCustomerPhone(lead);
    const vehicleName = getVehicleName(lead);
    const itemCount = getItemCount(lead);
    const primaryItem = getPrimaryItem(lead);
    const leadNumber =
        firstValue(lead?.leadNumber) || `LEAD-${lead?.id ?? "—"}`;

   const handleOpen = () => onView(lead);

    const handleKeyDown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpen();
        }
    };

    return (
        <article
            className={`lead-card lead-card-${stageDefinition.tone}`}
            data-lead-id={lead?.id}
            role="button"
            tabIndex={0}
            onClick={handleOpen}
            onKeyDown={handleKeyDown}
            aria-label={`Open lead ${leadNumber} for ${customerName}`}
        >
            <div className="lead-card-accent" />

            <div className="lead-card-body">
                <div className="lead-card-header">
                    <div className="lead-card-title-block">
                        <div className="lead-avatar" aria-hidden="true">
                            {customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="lead-card-title-text">
                            <strong title={customerName}>{customerName}</strong>
                            <span>{leadNumber}</span>
                        </div>
                    </div>

                    <div className="lead-card-header-actions">
                        <span
                            className={`lead-card-stage lead-stage-badge-${stageDefinition.tone}`}
                        >
                            {stageDefinition.label}
                        </span>

                        {/* ✅ NEW: Edit icon */}
                        <button
                            type="button"
                            className="lead-card-edit-btn"
                            onClick={(event) => {
                                event.stopPropagation();
                                onEdit(lead);
                            }}
                            aria-label={`Edit lead ${leadNumber}`}
                            title="Edit"
                        >
                            <Pencil size={14} />
                        </button>
                    </div>
                </div>

                <div className="lead-card-contact">
                    <Phone size={15} strokeWidth={2} aria-hidden="true" />
                    <span>{customerPhone}</span>
                </div>

                <div className="lead-card-vehicle">
                    <CarFront size={18} strokeWidth={2} aria-hidden="true" />
                    <div>
                        <span>Vehicle requirement</span>
                        <strong title={vehicleName}>{vehicleName}</strong>
                    </div>
                </div>

                {primaryItem && (
                    <div className="lead-card-item-preview">
                        <span>Requested item</span>
                        <strong title={primaryItem}>{primaryItem}</strong>
                    </div>
                )}

                <div className="lead-card-data-grid">
                    <div className="lead-card-data-cell">
                        <span>Items</span>
                        <strong>{itemCount}</strong>
                    </div>
                </div>

                <div className="lead-card-footer">
                    <button
                        type="button"
                        className="lead-card-view-button"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleOpen();
                        }}
                    >
                        Open lead
                        <ChevronRight size={15} strokeWidth={2.3} />
                    </button>
                </div>
            </div>
        </article>
    );
}

/* ============================================================
   Main component
   ============================================================ */
function LeadList() {
    const navigate = useNavigate();
    const location = useLocation();

    const basePath = location.pathname.startsWith("/owner/")
        ? "/owner/sales"
        : "/store/sales";
        
    const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [page, setPage] = useState(0);
    const pageSize = 30;
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [selectedStage, setSelectedStage] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);  // ✅ NEW
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [salesperson, setSalesperson] = useState("");
    const [store, setStore] = useState("");
    const [source, setSource] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [followUpAlertVisible, setFollowUpAlertVisible] = useState(true);

    /* ✅ NEW: edit modal state */
    const [editingLead, setEditingLead] = useState(null);
    const [viewingLead, setViewingLead] = useState(null);

    const loadLeads = async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const response = await getLeads(page, pageSize, "createdAt", "DESC");
            const content = Array.isArray(response?.content) ? response.content : [];
            setLeads(content);
            setTotalPages(Number(response?.totalPages || 0));
            setTotalElements(Number(response?.totalElements || 0));
        } catch (error) {
            console.error("Unable to load leads:", error);
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Unable to load leads.";
            setErrorMessage(message);
            setLeads([]);
            setTotalPages(0);
            setTotalElements(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeads();
    }, [page]);

    const filteredLeads = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return leads.filter((lead) => {
            const searchableValues = getLeadSearchValues(lead);
            const matchesSearch =
                !query || searchableValues.some((item) => item.includes(query));
            const matchesSalesperson =
                !salesperson ||
                String(lead?.salespersonId || "") === String(salesperson);
            const matchesStore =
                !store || String(lead?.storeId || "") === String(store);
            const leadSource = firstValue(
                lead?.sourceId,
                lead?.source,
                lead?.sourceName
            );
            const matchesSource =
                !source || String(leadSource || "") === String(source);
            const matchesStatus =
                !filterStatus || getStage(lead) === filterStatus;
            return (
                matchesSearch &&
                matchesSalesperson &&
                matchesStore &&
                matchesSource &&
                matchesStatus
            );
        });
    }, [leads, searchTerm, salesperson, store, source, filterStatus]);

    const counts = useMemo(() => {
        const result = {
            total: totalElements,
            new: 0,
            procurement: 0,
            proforma: 0,
            followUp: 0,
            won: 0,
            lost: 0,
        };
        leads.forEach((lead) => {
            const stage = getStage(lead);
            if (stage === "NEW") result.new += 1;
            if (stage === "PROCUREMENT") result.procurement += 1;
            if (stage === "PROFORMA") result.proforma += 1;
            if (stage === "FOLLOW_UP") result.followUp += 1;
            if (stage === "WON") result.won += 1;
            if (stage === "LOST") result.lost += 1;
        });
        return result;
    }, [leads, totalElements]);

    const stageLeads = useMemo(() => {
        if (selectedStage === "ALL") return filteredLeads;
        return filteredLeads.filter((lead) => getStage(lead) === selectedStage);
    }, [filteredLeads, selectedStage]);

    const stageCounts = useMemo(
        () => ({
            NEW: counts.new,
            PROCUREMENT: counts.procurement,
            PROFORMA: counts.proforma,
            FOLLOW_UP: counts.followUp,
            WON: counts.won,
            LOST: counts.lost,
        }),
        [counts]
    );

    const salespersonOptions = useMemo(() => {
        const map = new Map();
        leads.forEach((lead) => {
            const id = lead?.salespersonId;
            const name = lead?.salespersonName;
            if (id !== null && id !== undefined && name) {
                map.set(String(id), name);
            }
        });
        return Array.from(map.entries());
    }, [leads]);

    const storeOptions = useMemo(() => {
        const map = new Map();
        leads.forEach((lead) => {
            const id = lead?.storeId;
            const name = lead?.storeName;
            if (id !== null && id !== undefined && name) {
                map.set(String(id), name);
            }
        });
        return Array.from(map.entries());
    }, [leads]);

    const sourceOptions = useMemo(() => {
        const map = new Map();
        leads.forEach((lead) => {
            const id = firstValue(lead?.sourceId, lead?.source);
            const name = firstValue(lead?.sourceName, lead?.source);
            if (id && name) map.set(String(id), name);
        });
        return Array.from(map.entries());
    }, [leads]);

    const isFiltered = Boolean(
        searchTerm.trim() || salesperson || store || source || filterStatus
    );

    const resetFilters = () => {
        setSearchTerm("");
        setSalesperson("");
        setStore("");
        setSource("");
        setFilterStatus("");
        setPage(0);
    };

    const handleStageSelect = (stage) => setSelectedStage(stage);

    const handleViewLead = (lead) => {
    if (!lead) return;
    setViewingLead(lead);
};

    const handleEditLead = (lead) => setEditingLead(lead);

    

    return (
        <section className="lead-page">
            {/* ============================================================
                HEADER ROW — Leads + Search + Filters + New Lead
                ============================================================ */}
            <header className="lead-header">
                <h1 className="lead-title">Leads</h1>

                <div className="lead-header-actions">
                    {/* Search — icon only, expands on click */}
                    <div
                        className={`lead-search${
                            searchOpen ? " is-open" : ""
                        }`}
                    >
                        <button
                            type="button"
                            className="lead-search-toggle"
                            onClick={() => setSearchOpen((v) => !v)}
                            aria-label="Toggle search"
                            aria-expanded={searchOpen}
                        >
                            <Search size={17} />
                        </button>
                        {searchOpen && (
                            <input
                                type="text"
                                className="lead-search-input"
                                placeholder="Search lead, customer, vehicle or part number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                                onBlur={(e) => {
                                    // Collapse only if empty
                                    if (!e.target.value.trim()) {
                                        setSearchOpen(false);
                                    }
                                }}
                                aria-label="Search leads"
                            />
                        )}
                    </div>

                    <button
                        type="button"
                        className={`lead-filter-btn${
                            filtersOpen ? " is-open" : ""
                        }`}
                        onClick={() => setFiltersOpen((v) => !v)}
                        aria-expanded={filtersOpen}
                    >
                        <Filter size={15} />
                        Filters
                        {isFiltered && <span className="lead-filter-dot" />}
                    </button>

                    <button
                        type="button"
                        className="lead-new-btn"
                        onClick={() => setShowCreateLeadModal(true)}
                    >
                        <Plus size={16} strokeWidth={2.2} />
                        New Lead
                    </button>
                </div>
            </header>

            {/* ============================================================
                FOLLOW-UP ALERT (unchanged)
                ============================================================ */}
            {followUpAlertVisible && counts.followUp > 0 && (
                <div className="lead-followup-alert" role="status">
                    <div className="lead-alert-content">
                        <span className="lead-alert-icon" aria-hidden="true">
                            <AlertTriangle size={17} />
                        </span>
                        <div>
                            <strong>
                                {counts.followUp} follow-up
                                {counts.followUp === 1 ? "" : "s"} need attention
                            </strong>
                            <span>
                                Open the Follow-up stage to review these leads.
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="lead-alert-action"
                        onClick={() => handleStageSelect("FOLLOW_UP")}
                    >
                        View reminders
                        <ChevronRight size={14} />
                    </button>
                    <button
                        type="button"
                        className="lead-alert-close"
                        onClick={() => setFollowUpAlertVisible(false)}
                        aria-label="Dismiss follow-up alert"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ============================================================
    FILTER PANEL (unchanged behavior)
    ============================================================ */}
{filtersOpen && (
    <section className="lead-filter-panel">
        <div className="lead-filter-field">
            <label htmlFor="lead-salesperson-filter">Salesperson</label>
            <select
                id="lead-salesperson-filter"
                value={salesperson}
                onChange={(e) => setSalesperson(e.target.value)}
            >
                <option value="">All Salespeople</option>
                {salespersonOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                        {name}
                    </option>
                ))}
            </select>
        </div>
        <div className="lead-filter-field">
            <label htmlFor="lead-store-filter">Store</label>
            <select
                id="lead-store-filter"
                value={store}
                onChange={(e) => setStore(e.target.value)}
            >
                <option value="">All Stores</option>
                {storeOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                        {name}
                    </option>
                ))}
            </select>
        </div>
        <div className="lead-filter-field">
            <label htmlFor="lead-source-filter">Source</label>
            <select
                id="lead-source-filter"
                value={source}
                onChange={(e) => setSource(e.target.value)}
            >
                <option value="">All Sources</option>
                {sourceOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                        {name}
                    </option>
                ))}
            </select>
        </div>
        {/* <div className="lead-filter-field">
            <label htmlFor="lead-status-filter">Status</label>
            <select
                id="lead-status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
            >
                <option value="">All Statuses</option>
                {STAGES.map((stage) => (
                    <option key={stage.key} value={stage.key}>
                        {stage.label}
                    </option>
                ))}
            </select>
        </div> */}
        <button
            type="button"
            className="lead-filter-reset"
            onClick={resetFilters}
        >
            Reset filters
        </button>
    </section>
)}

            {/* ============================================================
                KPI CARDS — 3 with icons
                ============================================================ */}
            <section className="lead-kpi-grid" aria-label="Lead summary">
                {KPI_DEFINITIONS.map((definition) => {
                    const stageByKpi = {
                        total: "ALL",
                        won: "WON",
                        lost: "LOST",
                    };
                    return (
                        <KpiCard
                            key={definition.key}
                            definition={definition}
                            count={counts[definition.key] || 0}
                            selected={selectedStage === stageByKpi[definition.key]}
                            onClick={() =>
                                handleStageSelect(stageByKpi[definition.key])
                            }
                        />
                    );
                })}
            </section>

            {/* ============================================================
                STATUS CHIPS — New / Procurement / Proforma / Follow-up / Won / Lost
                Each shows stage + count. Clicking fills the chip color.
                ============================================================ */}
            <nav className="lead-stage-chips" aria-label="Lead pipeline stages">
                {STAGES.map((stage) => {
                    const isActive = selectedStage === stage.key;
                    return (
                        <button
                            key={stage.key}
                            type="button"
                            className={`lead-stage-chip lead-stage-chip-${
                                stage.tone
                            }${isActive ? " is-active" : ""}`}
                            onClick={() => handleStageSelect(stage.key)}
                            aria-pressed={isActive}
                        >
                            <span>{stage.label}</span>
                            <strong>{stageCounts[stage.key]}</strong>
                        </button>
                    );
                })}
            </nav>

            {/* ============================================================
                RESULTS — 3 cards per row
                ============================================================ */}
            <section className="lead-results">
                {loading ? (
                    <div className="lead-empty-state">
                        <strong>Loading leads...</strong>
                        <span>Fetching lead information from backend.</span>
                    </div>
                ) : errorMessage ? (
                    <div className="lead-empty-state">
                        <strong>Unable to load leads</strong>
                        <span>{errorMessage}</span>
                        <button
                            type="button"
                            className="lead-filter-reset"
                            onClick={loadLeads}
                        >
                            Retry
                        </button>
                    </div>
                ) : stageLeads.length === 0 ? (
                    <div className="lead-empty-state">
                        <strong>No matching leads</strong>
                        <span>
                            No leads match the current search or filters.
                        </span>
                    </div>
                ) : (
                    <div className="lead-card-grid">
                        {stageLeads.map((lead) => (
                            <LeadCard
                                key={lead.id}
                                lead={lead}
                                onView={handleViewLead}
                                onEdit={handleEditLead}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* ============================================================
                PAGINATION (unchanged)
                ============================================================ */}
            {!loading && totalPages > 1 && (
                <div className="lead-pagination">
                    <button
                        type="button"
                        disabled={page === 0}
                        onClick={() =>
                            setPage((c) => Math.max(0, c - 1))
                        }
                    >
                        Previous
                    </button>
                    <span>
                        Page {page + 1} of {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={page >= totalPages - 1}
                        onClick={() =>
                            setPage((c) => Math.min(totalPages - 1, c + 1))
                        }
                    >
                        Next
                    </button>
                </div>
            )}
    {viewingLead && (
    <LeadViewModal
        lead={viewingLead}
        onClose={() => setViewingLead(null)}
        onEdit={(lead) => {
            setViewingLead(null);
            setEditingLead(lead);
        }}
    />
)}
            {/* ============================================================
                EDIT LEAD — existing LeadList edit functionality
                Create Lead remains completely separate.
                ============================================================ */}
            {editingLead && (
                <div
                    className="lead-create-modal-overlay"
                    onClick={() => setEditingLead(null)}
                >
                    <div
                        className="lead-create-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <EditLeadModal
                            lead={editingLead}
                            onClose={() => setEditingLead(null)}
                            onSaved={(updatedLead) => {
                                setLeads((currentLeads) =>
                                    currentLeads.map((item) =>
                                        String(item?.id) === String(updatedLead?.id)
                                            ? { ...item, ...updatedLead }
                                            : item
                                    )
                                );
                                setEditingLead(null);
                                loadLeads();
                            }}
                        />
                    </div>
                </div>
            )}

            {showCreateLeadModal && (
                <div
                    className="lead-create-modal-overlay"
                    onClick={() => setShowCreateLeadModal(false)}
                >
                    <div
                        className="lead-create-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <LeadCreate
                            onClose={() => {
                                setShowCreateLeadModal(false);
                                loadLeads(); // refresh list after modal closes
                            }}
                        />
                    </div>
                </div>
            )}




        </section>
    );
}

export default LeadList;