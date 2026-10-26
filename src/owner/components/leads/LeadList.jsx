import { useRef, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    PackageCheck,
    Phone,
    Plus,
    Search,
    Trophy,
    UserPlus,
    Users,
    X,
} from "lucide-react";

import { getAllStores } from "../../../services/storeService";

import {
    getLeads,
    updateLead,
    completeLeadProcurement,
} from "../../../services/leadService";
import {
    getCustomerByMobile,
    saveCustomer,
    searchCustomersByStore,
} from "../../../services/customerService";
import {
    createSalesperson,
    getSalespersons,
} from "../../../services/salespersonService";

import "./LeadList.css";
import LeadCreate from "./LeadCreate";
import LeadKanbanCard from "./LeadKanbanCard";
import LeadProcurementDrawer from "./LeadProcurementDrawer";
import LeadFollowUpDrawer from "./LeadFollowupDrawer";

/* ============================================================
   STAGE DEFINITIONS  (Proforma removed)
   ============================================================ */

const STAGES = [
    { key: "NEW",         label: "New Leads",          Icon: UserPlus     },
    { key: "PROCUREMENT", label: "Procurement",        Icon: PackageCheck },
    { key: "FOLLOW_UP",   label: "Customer Follow-up", Icon: Phone        },
    { key: "WON",         label: "Won",                Icon: Trophy       },
    { key: "LOST",        label: "Lost",               Icon: X            },
];

const KPI_DEFINITIONS = [
    { key: "total",    label: "Total Leads",    Icon: Users  },
    { key: "followUp", label: "Follow-ups Due", Icon: Phone  },
    { key: "won",      label: "Won Leads",      Icon: Trophy },
    { key: "lost",     label: "Lost Leads",     Icon: X      },
];

const STATUS_MAP = {
    NEW: "NEW",
    PROCUREMENT: "PROCUREMENT",
    PROCUREMENT_COMPLETED: "FOLLOW_UP",
    FOLLOW_UP: "FOLLOW_UP",
    FOLLOWUP: "FOLLOW_UP",
    WON: "WON",
    LOST: "LOST",
};

/* ============================================================
   HELPERS
   ============================================================ */

const firstValue = (...values) =>
    values.find(
        (item) =>
            item !== null &&
            item !== undefined &&
            String(item).trim() !== ""
    );

const getRawStatus = (lead) => String(lead?.status || "").toUpperCase();

const getLeadSearchValues = (lead) =>
    [
        lead.id,
        lead.leadNumber,
        lead.customerName,
        lead.customer?.name,
        lead.customerPhone,
        lead.customerRequirement,
        lead.notes,
        lead.storeName,
        lead.salespersonName,
        lead.createdByName,
        lead.status,
        ...(lead.items || []).flatMap((item) => [
            item.requirement,
            item.vehicleDescription,
            item.vin,
            item.productName,
            item.brandName,
            item.brandname,
            item.partNumber,
            item.hsnCode,
            item.selectedVendorName,
            item.availabilityStatus,
            item.procurementSource,
        ]),
    ]
        .filter((value) => value != null)
        .map((value) => String(value).toLowerCase());

const hasProcurementData = (lead) =>
    Array.isArray(lead?.items) &&
    lead.items.some((item) => item?.partNumber?.trim());

const getStage = (lead) => {
    const rawStatus = getRawStatus(lead);
    if (rawStatus === "NEW" && hasProcurementData(lead)) {
        return "PROCUREMENT";
    }
    return STATUS_MAP[rawStatus] || "NEW";
};

/* ============================================================
   KPI CARD
   ============================================================ */

function KpiCard({ definition, count, selected, onClick }) {
    const Icon = definition.Icon;
    return (
        <button
            type="button"
            className={`lead-kpi-card${selected ? " is-selected" : ""}`}
            onClick={onClick}
            aria-pressed={selected}
        >
            <span className="lead-kpi-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2.2} />
            </span>
            <span className="lead-kpi-content">
                <span className="lead-kpi-label">{definition.label}</span>
                <strong className="lead-kpi-number">{count}</strong>
            </span>
        </button>
    );
}

/* ============================================================
   LEAD FORM FIELDS  (reusable 2-column grid, used by Overview/Edit)
   viewMode only changes the look; typing in view mode is caught by
   the parent's change handlers, which switch the drawer to edit mode.
   ============================================================ */

const EDIT_SOURCE_OPTIONS = [
    { value: "PHONE",     label: "Phone"     },
    { value: "WHATSAPP",  label: "WhatsApp"  },
    { value: "WALK_IN",   label: "Walk-in"   },
    { value: "WEBSITE",   label: "Website"   },
    { value: "INSTAGRAM", label: "Instagram" },
    { value: "FACEBOOK",  label: "Facebook"  },
    { value: "INDIAMART", label: "IndiaMART" },
    { value: "REFERRAL",  label: "Referral"  },
    { value: "OTHER",     label: "Other"     },
];

function FieldHint({ message, found }) {
    if (!message) return null;
    return (
        <div className={found ? "lf-hint lf-hint--ok" : "lf-hint"}>
            {found && <CheckCircle2 size={12} />}
            {message}
        </div>
    );
}

function LeadFormFields({
    viewMode = false,
    customerMobile,
    onCustomerMobileChange,
    customerLoading,
    customerMessage,
    customerFound,
    customerName,
    source,
    onSourceChange,
    salespersonMobile,
    onSalespersonMobileChange,
    salespersonMessage,
    salespersonFound,
    showLocation = false,
    location = "",
    onLocationChange,
    showAssignTo = false,
    assignTo = "",
    onAssignToChange,
    requirement,
    onRequirementChange,
}) {
    return (
        <div className={`lf-grid${viewMode ? " lf-grid--view" : ""}`}>
            {/* Row 1: Customer Mobile | Customer Name */}
            <div className="lf-field">
                <label>Customer Mobile</label>
                <div className="lf-input-wrap">
                    <Search size={14} />
                    <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={customerMobile}
                        onChange={onCustomerMobileChange}
                        placeholder="10-digit mobile number"
                    />
                    {customerLoading && <span className="lookup-spinner" />}
                </div>
                <FieldHint message={customerMessage} found={customerFound} />
            </div>

            <div className="lf-field">
                <label>Customer Name</label>
                <input
                    className="lf-input"
                    type="text"
                    value={customerName}
                    placeholder="Auto-filled from mobile"
                    readOnly
                />
            </div>

            {/* Row 2: Lead Source | Salesperson Mobile */}
            <div className="lf-field">
                <label>Lead Source</label>
                <select
                    className="lf-input"
                    value={source}
                    onChange={(e) => onSourceChange(e.target.value)}
                >
                    <option value="">Select source</option>
                    {EDIT_SOURCE_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="lf-field">
                <label>Salesperson Mobile</label>
                <div className="lf-input-wrap">
                    <Search size={14} />
                    <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={salespersonMobile}
                        onChange={onSalespersonMobileChange}
                        placeholder="10-digit mobile number"
                    />
                </div>
                <FieldHint
                    message={salespersonMessage}
                    found={salespersonFound}
                />
            </div>

            {/* Row 3: Location | Assign To (only if present on the lead) */}
            {showLocation && (
                <div className="lf-field">
                    <label>Location</label>
                    <input
                        className="lf-input"
                        type="text"
                        value={location}
                        onChange={(e) => onLocationChange?.(e.target.value)}
                        placeholder="Location"
                    />
                </div>
            )}

            {showAssignTo && (
                <div className="lf-field">
                    <label>Assign To</label>
                    <input
                        className="lf-input"
                        type="text"
                        value={assignTo}
                        onChange={(e) => onAssignToChange?.(e.target.value)}
                        placeholder="Assignee"
                    />
                </div>
            )}

            {/* Full width */}
            <div className="lf-field lf-field--full">
                <label>Customer Requirement</label>
                <textarea
                    className="lf-input lf-textarea"
                    rows={5}
                    value={requirement}
                    onChange={(e) => onRequirementChange(e.target.value)}
                    placeholder="Customer requirement..."
                />
            </div>
        </div>
    );
}

/* ============================================================
   LEAD OVERVIEW / EDIT DRAWER CONTENT
   initialMode: "view" (card click) | "edit" (Edit button)
   ============================================================ */

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

function EditLeadModal({ lead, initialMode = "edit", onClose, onSaved }) {
    const user = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("user")); }
        catch { return null; }
    }, []);

    /* ---- drawer mode: "view" | "edit" ---- */
    const [mode, setMode] = useState(initialMode);
    const isView = mode === "view";
    // Any edit interaction while in Overview flips the drawer to Edit mode
    const enterEdit = () => setMode((current) => (current === "view" ? "edit" : current));

    const [storeId] = useState(
        String(lead?.storeId ?? lead?.store?.id ?? user?.storeId ?? "")
    );

    // Optional fields: shown only when the lead actually carries them
    const hasLocationField =
        lead?.location != null || lead?.storeLocation != null;
    const hasAssignField =
        lead?.assignedTo != null || lead?.assignedToName != null;

    const [initialSnapshot] = useState({
        customerId: lead?.customerId ?? lead?.customer?.id ?? "",
        salespersonId: lead?.salespersonId ?? lead?.salesperson?.id ?? "",
        source: normalizeEditSource(
            lead?.source ?? lead?.sourceName ?? lead?.leadSource ?? ""
        ),
        customerRequirement: lead?.customerRequirement || "",
        location: lead?.location ?? lead?.storeLocation ?? "",
        assignTo: lead?.assignedTo ?? lead?.assignedToName ?? "",
    });

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
                  customerName:
                      firstValue(
                          lead?.customerName,
                          lead?.customer?.customerName,
                          lead?.customer?.name
                      ) || "",
                  mobileNumber:
                      firstValue(
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
                  salespersonName:
                      firstValue(
                          lead?.salespersonName,
                          lead?.salesperson?.salespersonName,
                          lead?.salesperson?.name
                      ) || "",
                  mobileNumber:
                      firstValue(
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
            lead?.source ??
                lead?.sourceName ??
                lead?.leadSource ??
                lead?.leadSourceName
        )
    );
    const [customerRequirement, setCustomerRequirement] = useState(
        lead?.customerRequirement || ""
    );
    const [location, setLocation] = useState(
        lead?.location ?? lead?.storeLocation ?? ""
    );
    const [assignTo, setAssignTo] = useState(
        lead?.assignedTo ?? lead?.assignedToName ?? ""
    );
    const [saving, setSaving] = useState(false);

    /* ---- dirty detection ---- */
    const hasChanges = useMemo(() => {
        const s = initialSnapshot;
        return (
            String(selectedCustomer?.id || "") !== String(s.customerId || "") ||
            String(selectedSalesperson?.id || "") !==
                String(s.salespersonId || "") ||
            (source || "") !== (s.source || "") ||
            customerRequirement.trim() !==
                (s.customerRequirement || "").trim() ||
            (hasLocationField &&
                String(location).trim() !== String(s.location || "").trim()) ||
            (hasAssignField &&
                String(assignTo).trim() !== String(s.assignTo || "").trim())
        );
    }, [
        initialSnapshot,
        selectedCustomer?.id,
        selectedSalesperson?.id,
        source,
        customerRequirement,
        location,
        assignTo,
        hasLocationField,
        hasAssignField,
    ]);

    /* ---- load salespersons ---- */
    useEffect(() => {
        let cancelled = false;
        if (!storeId) return undefined;
        const load = async () => {
            try {
                const response = await getSalespersons(Number(storeId));
                if (cancelled) return;
                const list = Array.isArray(response) ? response : [];
                setSalespersons(list);
                const salespersonId =
                    lead?.salespersonId ?? lead?.salesperson?.id;
                if (salespersonId) {
                    const existing = list.find(
                        (item) =>
                            String(item?.id ?? item?.salespersonId) ===
                            String(salespersonId)
                    );
                    if (existing) {
                        setSelectedSalesperson(existing);
                        setSalespersonMobile(
                            existing?.mobileNumber ??
                                existing?.mobile ??
                                salespersonMobile
                        );
                        setSalespersonName(
                            existing?.salespersonName ??
                                existing?.name ??
                                salespersonName
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, lead]);

    /* ---- resolve customer mobile if missing ---- */
    useEffect(() => {
        let cancelled = false;
        if (!storeId || selectedCustomer?.mobileNumber || !selectedCustomer?.id)
            return undefined;
        const name = firstValue(
            lead?.customerName,
            lead?.customer?.customerName,
            lead?.customer?.name
        );
        if (!name) return undefined;
        const resolve = async () => {
            try {
                const result = await searchCustomersByStore(
                    Number(storeId),
                    name
                );
                if (cancelled || !Array.isArray(result)) return;
                const existing = result.find(
                    (item) =>
                        String(item?.id ?? item?.customerId) ===
                        String(selectedCustomer.id)
                );
                if (existing) {
                    setSelectedCustomer(existing);
                    setCustomerMobile(
                        existing?.mobileNumber ?? existing?.mobile ?? ""
                    );
                    setCustomerName(
                        existing?.customerName ?? existing?.name ?? name
                    );
                    setCustomerMessage("Existing customer selected.");
                }
            } catch (error) {
                console.warn("Unable to resolve customer mobile:", error);
            }
        };
        resolve();
        return () => { cancelled = true; };
    }, [storeId, selectedCustomer?.id, selectedCustomer?.mobileNumber, lead]);

    /* ---- customer lookup ---- */
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
                setCustomerForm({
                    ...EMPTY_EDIT_CUSTOMER,
                    mobileNumber: mobile,
                });
                setCustomerModalOpen(true);
            }
        } catch (error) {
            if (
                error?.response?.status === 404 ||
                error?.response?.status === 204
            ) {
                setCustomerForm({
                    ...EMPTY_EDIT_CUSTOMER,
                    mobileNumber: mobile,
                });
                setCustomerModalOpen(true);
            } else {
                setCustomerMessage(
                    error?.response?.data?.message ||
                        "Unable to check customer."
                );
            }
        } finally {
            setCustomerLoading(false);
        }
    };

    const handleCustomerMobileChange = (event) => {
        enterEdit();
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
        if (!/^\d{10}$/.test(mobile))
            return alert("Enter a valid 10-digit mobile number.");
        const requiresGst =
            customerForm.customerType !== "WALK_IN" &&
            customerForm.gstRegistrationType === "REGISTERED";
        if (requiresGst && !/^[0-9A-Za-z]{15}$/.test(customerForm.gstin.trim()))
            return alert("A valid 15-character GSTIN is required.");
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
                gstin: requiresGst
                    ? customerForm.gstin.trim().toUpperCase()
                    : null,
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

    /* ---- salesperson lookup ---- */
    const lookupSalesperson = (mobile) => {
        if (!storeId || !/^\d{10}$/.test(mobile)) return;
        const found = salespersons.find(
            (item) =>
                String(item?.mobileNumber ?? item?.mobile ?? "") === mobile
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
        enterEdit();
        const value = event.target.value.replace(/\D/g, "").slice(0, 10);
        setSalespersonMobile(value);
        setSalespersonMessage("");
        if (String(selectedSalesperson?.mobileNumber || "") !== value) {
            setSelectedSalesperson(null);
            setSalespersonName("");
        }
        if (value.length === 10) lookupSalesperson(value);
    };

    const handleSaveSalesperson = async () => {
        const name = salespersonForm.salespersonName.trim();
        const mobile = salespersonForm.mobileNumber.trim();
        if (!name) return alert("Salesperson name is required.");
        if (!/^\d{10}$/.test(mobile))
            return alert("Enter a valid 10-digit mobile number.");
        setSavingSalesperson(true);
        try {
            const saved = await createSalesperson({
                salespersonName: name,
                mobileNumber: mobile,
                storeId: Number(storeId),
            });
            setSalespersons((current) => [...current, saved]);
            setSelectedSalesperson(saved);
            setSalespersonMobile(saved?.mobileNumber || mobile);
            setSalespersonName(saved?.salespersonName || name);
            setSalespersonMessage("New salesperson created.");
            setSalespersonModalOpen(false);
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

    /* ---- save lead ---- */
    const handleSave = async () => {
        if (!selectedCustomer?.id)
            return alert("Please select or create the customer.");
        if (!customerRequirement.trim())
            return alert("Customer requirement is required.");
        if (!source) return alert("Lead source is required.");
        setSaving(true);
        try {
            const payload = {
                customerId: selectedCustomer.id,
                salespersonId:
                    selectedSalesperson?.id ??
                    selectedSalesperson?.salespersonId ??
                    null,
                source,
                customerRequirement: customerRequirement.trim(),
            };
            // Verify these field names against your backend DTO
            if (hasLocationField) payload.location = String(location).trim();
            if (hasAssignField) payload.assignedTo = String(assignTo).trim();

            const updatedLead = await updateLead(lead.id, payload);
            onSaved?.(updatedLead);
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
            if (field === "gstRegistrationType" && value === "UNREGISTERED") {
                next.gstin = "";
            }
            return next;
        });
    };

    return (
        <section className={`lead-ov${isView ? " lead-ov--view" : ""}`}>
            {/* HEADER */}
            <header className="lead-ov-header">
                <div>
                    <div className="lead-ov-eyebrow">LEAD MANAGEMENT</div>
                    <h1 className="lead-ov-title">
                        {isView ? "Lead Overview" : "Edit Lead"}
                    </h1>
                </div>
                <button
                    type="button"
                    className="lead-ov-close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <X size={16} />
                </button>
            </header>

            {/* BODY */}
            <div className="lead-ov-body">
                <LeadFormFields
                    viewMode={isView}
                    customerMobile={customerMobile}
                    onCustomerMobileChange={handleCustomerMobileChange}
                    customerLoading={customerLoading}
                    customerMessage={customerMessage}
                    customerFound={!!selectedCustomer}
                    customerName={customerName}
                    source={source}
                    onSourceChange={(value) => {
                        enterEdit();
                        setSource(value);
                    }}
                    salespersonMobile={salespersonMobile}
                    onSalespersonMobileChange={handleSalespersonMobileChange}
                    salespersonMessage={salespersonMessage}
                    salespersonFound={!!selectedSalesperson}
                    showLocation={hasLocationField}
                    location={location}
                    onLocationChange={(value) => {
                        enterEdit();
                        setLocation(value);
                    }}
                    showAssignTo={hasAssignField}
                    assignTo={assignTo}
                    onAssignToChange={(value) => {
                        enterEdit();
                        setAssignTo(value);
                    }}
                    requirement={customerRequirement}
                    onRequirementChange={(value) => {
                        enterEdit();
                        setCustomerRequirement(value);
                    }}
                />
            </div>

            {/* FOOTER */}
            <footer className="lead-ov-footer">
                {isView ? (
                    <button
                        type="button"
                        className="lead-ov-btn lead-ov-btn--ghost"
                        onClick={onClose}
                    >
                        Close
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            className="lead-ov-btn lead-ov-btn--ghost"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="lead-ov-btn lead-ov-btn--primary"
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                        >
                            {saving ? "Saving..." : "Update Changes"}
                        </button>
                    </>
                )}
            </footer>

            {/* CUSTOMER MODAL */}
            {customerModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-card modal-small">
                        <div className="modal-header">
                            <div>
                                <span className="modal-kicker">CUSTOMER</span>
                                <h2>Create Customer</h2>
                            </div>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => setCustomerModalOpen(false)}
                            >
                                <X size={15} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="mobile-lock-card">
                                <span>Mobile Number</span>
                                <strong>{customerForm.mobileNumber}</strong>
                            </div>
                            <div className="lead-field">
                                <label>
                                    Customer Name <span>*</span>
                                </label>
                                <input
                                    value={customerForm.customerName}
                                    onChange={(e) =>
                                        updateCustomerForm(
                                            "customerName",
                                            e.target.value
                                        )
                                    }
                                    autoFocus
                                />
                            </div>
                            <div className="lead-field">
                                <label>
                                    Customer Type <span>*</span>
                                </label>
                                <select
                                    value={customerForm.customerType}
                                    onChange={(e) =>
                                        updateCustomerForm(
                                            "customerType",
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="WALK_IN">Walk-in</option>
                                    <option value="RETAIL">Retail</option>
                                    <option value="WHOLESALE">Wholesale</option>
                                    <option value="BUSINESS">Business</option>
                                </select>
                            </div>
                            {customerForm.customerType !== "WALK_IN" && (
                                <>
                                    <div className="lead-field">
                                        <label>GST Registration</label>
                                        <select
                                            value={
                                                customerForm.gstRegistrationType
                                            }
                                            onChange={(e) =>
                                                updateCustomerForm(
                                                    "gstRegistrationType",
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="UNREGISTERED">
                                                Unregistered
                                            </option>
                                            <option value="REGISTERED">
                                                Registered
                                            </option>
                                        </select>
                                    </div>
                                    {customerForm.gstRegistrationType ===
                                        "REGISTERED" && (
                                        <div className="lead-field">
                                            <label>
                                                GSTIN <span>*</span>
                                            </label>
                                            <input
                                                value={customerForm.gstin}
                                                maxLength={15}
                                                onChange={(e) =>
                                                    updateCustomerForm(
                                                        "gstin",
                                                        e.target.value.toUpperCase()
                                                    )
                                                }
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setCustomerModalOpen(false)}
                                disabled={savingCustomer}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="primary-button"
                                onClick={handleSaveCustomer}
                                disabled={savingCustomer}
                            >
                                {savingCustomer
                                    ? "Saving..."
                                    : "Create Customer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SALESPERSON MODAL */}
            {salespersonModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-card modal-small">
                        <div className="modal-header">
                            <div>
                                <span className="modal-kicker">SALESPERSON</span>
                                <h2>Create Salesperson</h2>
                            </div>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => setSalespersonModalOpen(false)}
                            >
                                <X size={15} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="mobile-lock-card">
                                <span>Mobile Number</span>
                                <strong>{salespersonForm.mobileNumber}</strong>
                            </div>
                            <div className="lead-field">
                                <label>
                                    Salesperson Name <span>*</span>
                                </label>
                                <input
                                    value={salespersonForm.salespersonName}
                                    maxLength={150}
                                    onChange={(e) =>
                                        setSalespersonForm((current) => ({
                                            ...current,
                                            salespersonName: e.target.value,
                                        }))
                                    }
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setSalespersonModalOpen(false)}
                                disabled={savingSalesperson}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="primary-button"
                                onClick={handleSaveSalesperson}
                                disabled={savingSalesperson}
                            >
                                {savingSalesperson
                                    ? "Saving..."
                                    : "Create Salesperson"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

function LeadList() {
    const navigate = useNavigate();
    const location = useLocation();

    const basePath = location.pathname.startsWith("/owner/")
        ? "/owner/sales"
        : "/store/sales";

    const [showCreateLeadDrawer, setShowCreateLeadDrawer] = useState(false);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [page, setPage] = useState(0);
    const pageSize = 30;
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [selectedStage, setSelectedStage] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [salesperson, setSalesperson] = useState("");
    const [store, setStore] = useState("");
    const [authorizedStores, setAuthorizedStores] = useState([]);
    const [refreshTick, setRefreshTick] = useState(0);
    const loadVersion = useRef(0);
    const [source, setSource] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [followUpAlertVisible, setFollowUpAlertVisible] = useState(true);

    // Overview / Edit drawer: { lead, mode: "view" | "edit", nonce }
    const [drawer, setDrawer] = useState(null);

    /* ---- drawer state ---- */
    const [procurementLead, setProcurementLead] = useState(null);
    const [followUpLead, setFollowUpLead] = useState(null);

    /* ---- toasts ---- */
    const [toasts, setToasts] = useState([]);

    const pushToast = (message, type = "success") => {
        const id = Date.now() + Math.random();
        setToasts((current) => [...current, { id, message, type }]);
        setTimeout(() => {
            setToasts((current) => current.filter((t) => t.id !== id));
        }, 3200);
    };

    const removeToast = (id) =>
        setToasts((current) => current.filter((t) => t.id !== id));

    /* ---- load leads ---- */
    const loadLeads = async () => {
        const version = ++loadVersion.current;
        setLoading(true);
        setErrorMessage("");
        try {
            const response = await getLeads(
                page,
                pageSize,
                "createdAt",
                "DESC",
                store ? Number(store) : null
            );
            if (version !== loadVersion.current) return;
            const content = Array.isArray(response?.content)
                ? response.content
                : [];
            setLeads(content);
            setTotalPages(Number(response?.totalPages || 0));
            setTotalElements(Number(response?.totalElements || 0));
        } catch (error) {
            if (version !== loadVersion.current) return;
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
            if (version === loadVersion.current) setLoading(false);
        }
    };

    useEffect(() => {
        loadLeads();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, store, refreshTick]);

    /* ---- Esc closes the overview/edit drawer ---- */
    useEffect(() => {
        if (!drawer) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape") setDrawer(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [drawer]);

    const filteredLeads = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return leads.filter((lead) => {
            const searchableValues = getLeadSearchValues(lead);
            const matchesSearch =
                !query ||
                searchableValues.some((item) => item.includes(query));
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
            followUp: 0,
            won: 0,
            lost: 0,
        };
        leads.forEach((lead) => {
            const stage = getStage(lead);
            if (stage === "NEW") result.new += 1;
            if (stage === "PROCUREMENT") result.procurement += 1;
            if (stage === "FOLLOW_UP") result.followUp += 1;
            if (stage === "WON") result.won += 1;
            if (stage === "LOST") result.lost += 1;
        });
        return result;
    }, [leads, totalElements]);

    const groupedByStage = useMemo(() => {
        const groups = Object.fromEntries(
            STAGES.map((stage) => [stage.key, []])
        );
        filteredLeads.forEach((lead) => {
            const stage = getStage(lead);
            if (groups[stage]) groups[stage].push(lead);
        });
        return groups;
    }, [filteredLeads]);

    const stageCounts = useMemo(
        () => ({
            NEW: counts.new,
            PROCUREMENT: counts.procurement,
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
            if (id != null && name) map.set(String(id), name);
        });
        return Array.from(map.entries());
    }, [leads]);

    useEffect(() => {
        let cancelled = false;
        getAllStores().then(response => {
            if (!cancelled) {
                let user = {}; try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch { /* Invalid session data: no extra store choices. */ }
                const rows = Array.isArray(response) ? response : response?.content || [];
                setAuthorizedStores(user.role === "SUPER_ADMIN" ? rows : rows.filter(row => String(row.id) === String(user.storeId)));
            }
        }).catch(() => { if (!cancelled) setAuthorizedStores([]); });
        return () => { cancelled = true; };
    }, []);
    const storeOptions = useMemo(() => {
        const map = new Map();
        authorizedStores.forEach(row => map.set(String(row.id), row.storeName || row.storeCode));
        leads.forEach(row => { if (row.storeId != null && row.storeName) map.set(String(row.storeId), row.storeName); });
        return Array.from(map.entries());
    }, [leads, authorizedStores]);

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

    /* -------- Card handlers -------- */

    // Card click → read-only Lead Overview (flips to Edit on first keystroke)
    const handleOpenOverview = (lead) =>
        setDrawer({ lead, mode: "view", nonce: Date.now() });

    // Edit button → editable "Edit Lead"
    const handleEditLead = (lead) =>
        setDrawer({ lead, mode: "edit", nonce: Date.now() });

    const handleOpenProcurement = (lead) => {
        if (lead?.id) setProcurementLead(lead);
    };

    const handleOpenFollowUp = (lead) => {
        if (lead?.id) setFollowUpLead(lead);
    };

    // Procurement → Follow-up: direct move, no drawer
    const handleMoveToFollowUp = async (lead) => {
        if (!lead?.id) return;
        try {
            await completeLeadProcurement(lead.id);
            pushToast(
                `${lead.leadNumber || "Lead"} moved to Customer Follow-up`,
                "success"
            );
            loadLeads();
        } catch (error) {
            pushToast(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to move lead to follow-up.",
                "error"
            );
        }
    };

    const refreshAfterAction = () => {
        setProcurementLead(null);
        setFollowUpLead(null);
        loadLeads();
    };

    return (
        <section className="lead-page">
            <header className="lead-header">
                <h1 className="lead-title">Leads</h1>
                <div className="lead-header-actions">
                    <button
                        type="button"
                        className="lead-new-btn"
                        style={{ background: "#0f766e", borderColor: "#0f766e" }}
                        onClick={() => navigate(`${basePath}/leads/chats`)}
                    >
                        Chats
                    </button>
                    <button
                        type="button"
                        className="lead-new-btn"
                        style={{ background: "#16a34a", borderColor: "#16a34a" }}
                        onClick={() => navigate(`${basePath}/leads/whatsapp`)}
                    >
                        WhatsApp
                    </button>
                    <button
                        type="button"
                        className="lead-new-btn"
                        onClick={() => setShowCreateLeadDrawer(true)}
                    >
                        <Plus size={16} strokeWidth={2.4} />
                        New Lead
                    </button>
                </div>
            </header>

            {/* KPI CARDS */}
            <section className="lead-kpi-grid" aria-label="Lead summary">
                {KPI_DEFINITIONS.map((definition) => {
                    const stageByKpi = {
                        total: "ALL",
                        followUp: "FOLLOW_UP",
                        won: "WON",
                        lost: "LOST",
                    };
                    return (
                        <KpiCard
                            key={definition.key}
                            definition={definition}
                            count={counts[definition.key] || 0}
                            selected={
                                selectedStage === stageByKpi[definition.key]
                            }
                            onClick={() =>
                                handleStageSelect(stageByKpi[definition.key])
                            }
                        />
                    );
                })}
            </section>

            {/* TOOLBAR */}
            <section className="lead-toolbar">
                <div className="lead-toolbar-search">
                    <Search size={15} />
                    <input
                        type="text"
                        placeholder="Search leads, customers, vehicles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select
                    className="lead-toolbar-select"
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

                <select
                    className="lead-toolbar-select"
                    value={salesperson}
                    onChange={(e) => setSalesperson(e.target.value)}
                >
                    <option value="">All Salespersons</option>
                    {salespersonOptions.map(([id, name]) => (
                        <option key={id} value={id}>
                            {name}
                        </option>
                    ))}
                </select>

                <select
                    className="lead-toolbar-select"
                    value={store}
                    onChange={(e) => { setPage(0); setStore(e.target.value); }}
                >
                    <option value="">All Stores</option>
                    {storeOptions.map(([id, name]) => (
                        <option key={id} value={id}>
                            {name}
                        </option>
                    ))}
                </select>

                <select
                    className="lead-toolbar-select"
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

                {isFiltered && (
                    <button
                        type="button"
                        className="lead-toolbar-reset"
                        onClick={resetFilters}
                    >
                        Reset
                    </button>
                )}
            </section>

            {/* FOLLOW-UP ALERT */}
            {followUpAlertVisible && counts.followUp > 0 && (
                <div className="lead-followup-alert" role="status">
                    <div className="lead-alert-content">
                        <span className="lead-alert-icon" aria-hidden="true">
                            <AlertTriangle size={15} />
                        </span>
                        <div>
                            <strong>
                                {counts.followUp} follow-up
                                {counts.followUp === 1 ? "" : "s"} need
                                attention
                            </strong>
                            <span>
                                Open the Follow-up column to review these
                                leads.
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
                        <X size={15} />
                    </button>
                </div>
            )}

            {/* KANBAN BOARD */}
            <section className="lead-kanban">
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
                            className="lead-toolbar-reset"
                            onClick={loadLeads}
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <div className="lead-kanban-grid">
                        {STAGES.map((stage) => {
                            const stageLeads =
                                groupedByStage[stage.key] || [];
                            const Icon = stage.Icon;
                            const isActive = selectedStage === stage.key;
                            return (
                                <div
                                    key={stage.key}
                                    className={`lead-kanban-col lead-kanban-col--${stage.key.toLowerCase()}${
                                        isActive ? " is-active" : ""
                                    }`}
                                >
                                    <div className="lead-kanban-col-head">
                                        <span className="lead-kanban-col-title">
                                            <Icon size={14} />
                                            {stage.label}
                                        </span>
                                        <span className="lead-kanban-col-count">
                                            {stageCounts[stage.key]}
                                        </span>
                                    </div>

                                    <div className="lead-kanban-col-body">
                                        {stageLeads.length === 0 ? (
                                            <div className="lead-kanban-empty">
                                                No leads
                                            </div>
                                        ) : (
                                            stageLeads.map((lead) => (
                                                <LeadKanbanCard
                                                    key={lead.id}
                                                    lead={lead}
                                                    stage={getStage(lead)}
                                                    onView={handleOpenOverview}
                                                    onEdit={handleEditLead}
                                                    onProcurement={
                                                        handleOpenProcurement
                                                    }
                                                    onMoveToFollowUp={
                                                        handleMoveToFollowUp
                                                    }
                                                    onFollowUp={
                                                        handleOpenFollowUp
                                                    }
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* PAGINATION */}
            {!loading && totalPages > 1 && (
                <div className="lead-pagination">
                    <button
                        type="button"
                        disabled={page === 0}
                        onClick={() =>
                            setPage((current) => Math.max(0, current - 1))
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
                            setPage((current) =>
                                Math.min(totalPages - 1, current + 1)
                            )
                        }
                    >
                        Next
                    </button>
                </div>
            )}

            {/* LEAD OVERVIEW / EDIT DRAWER — no backdrop, compact slide-over */}
            {drawer && (
                <aside className="lead-drawer lead-drawer--wide">
                    <EditLeadModal
                        key={drawer.nonce}
                        lead={drawer.lead}
                        initialMode={drawer.mode}
                        onClose={() => setDrawer(null)}
                        onSaved={(updatedLead) => {
                            setLeads((currentLeads) =>
                                currentLeads.map((item) =>
                                    String(item?.id) ===
                                    String(updatedLead?.id)
                                        ? { ...item, ...updatedLead }
                                        : item
                                )
                            );
                            setDrawer(null);
                            pushToast("Lead updated successfully.", "success");
                            loadLeads();
                        }}
                    />
                </aside>
            )}

            {/* PROCUREMENT DRAWER */}
            {procurementLead && (
                <div
                    className="lead-drawer-backdrop"
                    onClick={refreshAfterAction}
                >
                    <aside
                        className="lead-drawer procurement-drawer"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <LeadProcurementDrawer
                            lead={procurementLead}
                            onUpdated={() => loadLeads()}
                            onClose={refreshAfterAction}
                            onToast={pushToast}
                        />
                    </aside>
                </div>
            )}

            {/* FOLLOW-UP DRAWER */}
            {followUpLead && (
                <div
                    className="lead-drawer-backdrop"
                    onClick={refreshAfterAction}
                >
                    <aside
                        className="lead-drawer procurement-drawer"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <LeadFollowUpDrawer
                            lead={followUpLead}
                            onUpdated={() => loadLeads()}
                            onClose={refreshAfterAction}
                            onToast={pushToast}
                        />
                    </aside>
                </div>
            )}

            {/* CREATE LEAD DRAWER */}
            {showCreateLeadDrawer && (
                <div
                    className="lead-drawer-backdrop"
                    onClick={() => setShowCreateLeadDrawer(false)}
                >
                    <aside
                        className="lead-drawer lead-drawer--narrow"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <LeadCreate
                            onSaved={(created) => {
                                setPage(0);
                                setStore(current => current ? String(created.storeId) : "");
                                setRefreshTick(current => current + 1);
                                pushToast(
                                    `${created?.leadNumber || "Lead"} created successfully.`,
                                    "success"
                                );
                            }}
                            onToast={pushToast}
                            onViewLead={(created) => {
                                setShowCreateLeadDrawer(false);
                                setDrawer({
                                    lead: created,
                                    mode: "view",
                                    nonce: Date.now(),
                                });
                            }}
                            onClose={() => {
                                setShowCreateLeadDrawer(false);
                                loadLeads();
                            }}
                        />
                    </aside>
                </div>
            )}

            {/* TOAST STACK */}
            <div className="lead-toast-stack" aria-live="polite">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`lead-toast lead-toast--${t.type}`}
                        role="status"
                    >
                        {t.type === "success" ? (
                            <CheckCircle2 size={16} />
                        ) : (
                            <AlertCircle size={16} />
                        )}
                        <span>{t.message}</span>
                        <button
                            type="button"
                            onClick={() => removeToast(t.id)}
                            aria-label="Dismiss"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default LeadList; 
