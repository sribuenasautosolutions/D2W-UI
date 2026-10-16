import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Search, X } from "lucide-react";

import { createLead, updateLead } from "../../../services/leadService";
import { getAllStores } from "../../../services/storeService";
import {
    getCustomerByMobile,
    saveCustomer,
    searchCustomersByStore,
} from "../../../services/customerService";
import {
    createSalesperson,
    getSalespersons,
} from "../../../services/salespersonService";

import "./LeadCreate.css";

const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
};

const EMPTY_CUSTOMER = {
    customerName: "",
    mobileNumber: "",
    customerType: "WALK_IN",
    gstRegistrationType: "UNREGISTERED",
    gstin: "",
};

const EMPTY_SALESPERSON = {
    salespersonName: "",
    mobileNumber: "",
};

const SOURCE_OPTIONS = [
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

const NEW_SALESPERSON_VALUE = "__new__";

export default function LeadCreate({
    onClose,
    mode = "create",
    lead = null,
    onSaved,
}) {
    const isEditMode = mode === "edit";
    const navigate = useNavigate();

    const user = useMemo(() => readUser(), []);
    const isSuperAdmin = user?.role === "SUPER_ADMIN";

    /* ============================== STORE ============================== */
    const [selectedStoreId, setSelectedStoreId] = useState(
        isSuperAdmin ? "" : String(user?.storeId || "")
    );
    const [stores, setStores] = useState([]);
    const [storeLoading, setStoreLoading] = useState(false);
    const [storeError, setStoreError] = useState("");

    /* ============================== CUSTOMER ============================== */
    const [customerMobile, setCustomerMobile] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
    const [customerLookupMessage, setCustomerLookupMessage] = useState("");
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER);
    const [savingCustomer, setSavingCustomer] = useState(false);
    const customerLookupRequest = useRef(0);

    /* ============================== SALESPERSON ============================== */
    const [salespersons, setSalespersons] = useState([]);
    const [selectedSalesperson, setSelectedSalesperson] = useState(null);
    const [salespersonLoading, setSalespersonLoading] = useState(false);
    const [salespersonModalOpen, setSalespersonModalOpen] = useState(false);
    const [salespersonForm, setSalespersonForm] = useState(EMPTY_SALESPERSON);
    const [savingSalesperson, setSavingSalesperson] = useState(false);

    /* ============================== LEAD ============================== */
    const [source, setSource] = useState("");
    const [customerRequirement, setCustomerRequirement] = useState("");
    const [location, setLocation] = useState("");
    const [vinNumber, setVinNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [creatingLead, setCreatingLead] = useState(false);
    const [createdLead, setCreatedLead] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);

    /* ============================== EDIT MODE INIT ============================== */
    useEffect(() => {
        if (!isEditMode || !lead) return;

        const storeId = lead?.storeId ?? lead?.store?.id ?? "";
        setSelectedStoreId(String(storeId || ""));

        const customer = {
            id: lead?.customerId ?? lead?.customer?.id ?? "",
            customerName:
                lead?.customerName ??
                lead?.customer?.customerName ??
                lead?.customer?.name ??
                "",
            mobileNumber:
                lead?.customerMobile ??
                lead?.customer?.mobileNumber ??
                lead?.customer?.mobile ??
                lead?.mobile ??
                "",
        };

        setSelectedCustomer(customer.id ? customer : null);
        setCustomerMobile(customer.mobileNumber || "");
        setCustomerName(customer.customerName || "");

        const salesperson = {
            id: lead?.salespersonId ?? lead?.salesperson?.id ?? "",
            salespersonName:
                lead?.salespersonName ?? lead?.salesperson?.salespersonName ?? "",
            mobileNumber:
                lead?.salespersonMobile ?? lead?.salesperson?.mobileNumber ?? "",
        };

        setSelectedSalesperson(salesperson.id ? salesperson : null);

        setSource(lead?.source ?? lead?.sourceName ?? "");
        setCustomerRequirement(lead?.customerRequirement || "");
        setLocation(lead?.location || lead?.storeLocation || "");
        setVinNumber(lead?.vinNumber || lead?.vin || "");
        setNotes(lead?.notes || "");
        setCreatedLead(null);
    }, [isEditMode, lead]);

    /* ============================== LOAD STORES ============================== */
    useEffect(() => {
        if (!isSuperAdmin) return;

        const loadStores = async () => {
            setStoreLoading(true);
            setStoreError("");
            try {
                const response = await getAllStores();
                const data = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.content)
                    ? response.content
                    : [];
                setStores(data);
            } catch (error) {
                console.error("Failed to load stores:", error);
                setStores([]);
                setStoreError(error?.response?.data?.message || "Unable to load stores.");
            } finally {
                setStoreLoading(false);
            }
        };
        loadStores();
    }, [isSuperAdmin]);

    /* ============================== LOAD SALESPERSONS ============================== */
    const loadSalespersons = useCallback(async (storeId) => {
        if (!storeId) {
            setSalespersons([]);
            return;
        }
        setSalespersonLoading(true);
        try {
            const response = await getSalespersons(Number(storeId));
            setSalespersons(Array.isArray(response) ? response : []);
        } catch (error) {
            console.error("Unable to load salespersons:", error);
            setSalespersons([]);
        } finally {
            setSalespersonLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSalespersons(selectedStoreId);
        if (isEditMode) return;
        setSelectedSalesperson(null);
    }, [selectedStoreId, loadSalespersons, isEditMode]);

    /* ============================== HYDRATE SALESPERSON (EDIT MODE) ============================== */
    useEffect(() => {
        if (!isEditMode || !lead?.salespersonId || !salespersons.length) return;

        const existing = salespersons.find(
            (item) =>
                String(item?.id ?? item?.salespersonId ?? "") ===
                String(lead.salespersonId)
        );

        if (!existing) return;
        setSelectedSalesperson(existing);
    }, [isEditMode, lead, salespersons]);

    /* ============================== HYDRATE CUSTOMER (EDIT MODE) ============================== */
    useEffect(() => {
        if (!isEditMode || !selectedStoreId || !lead?.customerId) return;

        const searchName =
            lead?.customerName ??
            lead?.customer?.customerName ??
            lead?.customer?.name ??
            "";

        if (!searchName.trim()) return;

        let cancelled = false;

        const resolveCustomer = async () => {
            try {
                const result = await searchCustomersByStore(
                    Number(selectedStoreId),
                    searchName
                );

                if (cancelled || !Array.isArray(result)) return;

                const existing = result.find(
                    (item) =>
                        String(item?.id ?? item?.customerId ?? "") ===
                        String(lead.customerId)
                );

                if (!existing) return;

                setSelectedCustomer((previous) => ({
                    ...(previous || {}),
                    ...existing,
                }));
                setCustomerMobile(existing?.mobileNumber ?? existing?.mobile ?? "");
                setCustomerName(
                    existing?.customerName ?? existing?.name ?? searchName
                );
                setCustomerLookupMessage("Existing customer selected.");
            } catch (error) {
                console.warn("Unable to hydrate existing customer:", error);
            }
        };

        resolveCustomer();

        return () => {
            cancelled = true;
        };
    }, [isEditMode, selectedStoreId, lead]);

    /* ============================== STORE CHANGE ============================== */
    const handleStoreChange = (event) => {
        const value = event.target.value;
        setSelectedStoreId(value);

        setSelectedCustomer(null);
        setCustomerMobile("");
        setCustomerName("");
        setCustomerLookupMessage("");

        setSelectedSalesperson(null);
        setSource("");
    };

    /* ============================== CUSTOMER LOOKUP ============================== */
    const lookupCustomer = async (mobile) => {
        if (!selectedStoreId) return;
        if (!/^\d{10}$/.test(mobile)) return;

        const requestId = ++customerLookupRequest.current;
        setCustomerLookupLoading(true);
        setCustomerLookupMessage("");

        try {
            const customer = await getCustomerByMobile(mobile, Number(selectedStoreId));

            if (requestId !== customerLookupRequest.current) return;

            if (customer) {
                setSelectedCustomer(customer);
                setCustomerMobile(customer.mobileNumber || mobile);
                setCustomerName(customer.customerName || "");
                setCustomerLookupMessage("Existing customer found.");
                return;
            }

            if (isEditMode) {
                setCustomerLookupMessage(
                    "Existing customer not found. Select an existing customer by mobile number."
                );
                return;
            }

            setCustomerForm({ ...EMPTY_CUSTOMER, mobileNumber: mobile });
            setCustomerModalOpen(true);
        } catch (error) {
            if (requestId !== customerLookupRequest.current) return;

            const status = error?.response?.status;
            if (status === 404 || status === 204) {
                if (isEditMode) {
                    setCustomerLookupMessage(
                        "Existing customer not found. Select an existing customer by mobile number."
                    );
                    return;
                }
                setCustomerForm({ ...EMPTY_CUSTOMER, mobileNumber: mobile });
                setCustomerModalOpen(true);
            } else {
                console.error("Customer lookup failed:", error);
                setCustomerLookupMessage(
                    error?.response?.data?.message || "Unable to check customer."
                );
            }
        } finally {
            if (requestId === customerLookupRequest.current) {
                setCustomerLookupLoading(false);
            }
        }
    };

    const handleCustomerMobileChange = (event) => {
        const value = event.target.value.replace(/\D/g, "").slice(0, 10);
        setCustomerMobile(value);
        setCustomerLookupMessage("");

        if (selectedCustomer && selectedCustomer.mobileNumber !== value) {
            setSelectedCustomer(null);
            setCustomerName("");
        }

        if (value.length === 10 && value !== selectedCustomer?.mobileNumber) {
            lookupCustomer(value);
        }
    };

    /* ============================== CUSTOMER MODAL ============================== */
    const handleCustomerFormChange = (field, value) => {
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

    const handleSaveCustomer = async () => {
        if (!selectedStoreId) {
            alert("Select a store first.");
            return;
        }
        const name = customerForm.customerName.trim();
        const mobile = customerForm.mobileNumber.trim();

        if (!name) {
            alert("Customer name is required.");
            return;
        }
        if (!/^\d{10}$/.test(mobile)) {
            alert("Enter a valid 10-digit mobile number.");
            return;
        }

        const requiresGst =
            customerForm.customerType !== "WALK_IN" &&
            customerForm.gstRegistrationType === "REGISTERED";

        if (requiresGst && !/^[0-9A-Za-z]{15}$/.test(customerForm.gstin.trim())) {
            alert("A valid 15-character GSTIN is required.");
            return;
        }

        const payload = {
            customerName: name,
            mobileNumber: mobile,
            customerType: customerForm.customerType,
            gstRegistrationType:
                customerForm.customerType === "WALK_IN"
                    ? "UNREGISTERED"
                    : customerForm.gstRegistrationType,
            gstin: requiresGst ? customerForm.gstin.trim().toUpperCase() : null,
            storeId: Number(selectedStoreId),
        };

        setSavingCustomer(true);
        try {
            const saved = await saveCustomer(payload);
            setSelectedCustomer(saved);
            setCustomerMobile(saved?.mobileNumber || mobile);
            setCustomerName(saved?.customerName || name);
            setCustomerLookupMessage("New customer created.");
            setCustomerModalOpen(false);
        } catch (error) {
            console.error("Unable to save customer:", error);
            alert(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to save customer."
            );
        } finally {
            setSavingCustomer(false);
        }
    };

    /* ============================== SALESPERSON DROPDOWN ============================== */
    const handleSalespersonSelect = (event) => {
        const value = event.target.value;

        if (value === NEW_SALESPERSON_VALUE) {
            setSalespersonForm(EMPTY_SALESPERSON);
            setSalespersonModalOpen(true);
            return;
        }

        if (!value) {
            setSelectedSalesperson(null);
            return;
        }

        const found = salespersons.find(
            (item) => String(item?.id ?? item?.salespersonId) === value
        );
        setSelectedSalesperson(found || null);
    };

    const handleSaveSalesperson = async () => {
        const name = salespersonForm.salespersonName.trim();
        const mobile = salespersonForm.mobileNumber.trim();

        if (!selectedStoreId) {
            alert("Select a store first.");
            return;
        }
        if (!name) {
            alert("Salesperson name is required.");
            return;
        }
        if (!/^\d{10}$/.test(mobile)) {
            alert("Enter a valid 10-digit mobile number.");
            return;
        }

        setSavingSalesperson(true);
        try {
            const saved = await createSalesperson({
                salespersonName: name,
                mobileNumber: mobile,
                storeId: Number(selectedStoreId),
            });
            await loadSalespersons(selectedStoreId);
            setSelectedSalesperson(saved);
            setSalespersonModalOpen(false);
        } catch (error) {
            console.error("Unable to save salesperson:", error);
            alert(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to save salesperson."
            );
        } finally {
            setSavingSalesperson(false);
        }
    };

    /* ============================== CREATE / UPDATE ============================== */
    const handleCreateLead = async () => {
        if (!selectedStoreId) {
            alert("Select a store first.");
            return;
        }
        if (!selectedCustomer) {
            alert("Enter customer mobile number.");
            return;
        }

        if (isEditMode) {
            if (!lead?.id) {
                alert("Lead ID is missing.");
                return;
            }

            const payload = {
                customerId: Number(selectedCustomer.id),
                salespersonId: selectedSalesperson?.id
                    ? Number(selectedSalesperson.id)
                    : null,
                source: source.trim() || null,
                customerRequirement: customerRequirement.trim() || null,
                location: location.trim() || null,
                vinNumber: vinNumber.trim() || null,
                notes: notes.trim() || null,
            };

            setSavingEdit(true);
            try {
                const result = await updateLead(lead.id, payload);
                const mergedLead = {
                    ...lead,
                    ...(result || {}),
                    customerId: result?.customerId ?? selectedCustomer.id,
                    customerName: result?.customerName ?? selectedCustomer.customerName,
                    salespersonId: result?.salespersonId ?? selectedSalesperson?.id ?? null,
                    salespersonName:
                        result?.salespersonName ??
                        selectedSalesperson?.salespersonName ??
                        null,
                    source: result?.source ?? source,
                    customerRequirement:
                        result?.customerRequirement ?? customerRequirement.trim(),
                    location: result?.location ?? location,
                    vinNumber: result?.vinNumber ?? vinNumber,
                    notes: result?.notes ?? lead?.notes ?? null,
                    items: result?.items ?? lead?.items ?? [],
                };

                if (typeof onSaved === "function") onSaved(mergedLead);
                if (typeof onClose === "function") onClose();
            } catch (error) {
                console.error("Unable to update lead:", error);
                alert(
                    error?.response?.data?.message ||
                        error?.response?.data?.error ||
                        "Unable to update lead."
                );
            } finally {
                setSavingEdit(false);
            }
            return;
        }

        const payload = {
            customerId: Number(selectedCustomer.id),
            salespersonId: selectedSalesperson?.id
                ? Number(selectedSalesperson.id)
                : null,
            storeId: isSuperAdmin ? Number(selectedStoreId) : null,
            source: source || null,
            customerRequirement: customerRequirement.trim() || null,
            location: location.trim() || null,
            vinNumber: vinNumber.trim() || null,
            items: [],
        };

        setCreatingLead(true);
        try {
            const result = await createLead(payload);
            setCreatedLead(result);
            onSaved?.(result);
        } catch (error) {
            console.error("Unable to create lead:", error);
            alert(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to create lead."
            );
        } finally {
            setCreatingLead(false);
        }
    };

    /* ============================== BACK / CLOSE ============================== */
    const handleBack = () => {
        if (typeof onClose === "function") onClose();
        else
            navigate(isSuperAdmin ? "/owner/sales/leads" : "/store/sales/leads");
    };

    /* ============================== RENDER ============================== */
    return (
        <section className="lead-page">
            <div className="lead-shell">

                {/* ============ HEADER ============ */}
                <header className="lead-header">
                    <div className="lead-header-text">
                        <span className="lead-eyebrow">Lead Management</span>
                        <h1 className="lead-title">
                            {isEditMode ? "Edit Lead" : "Create Lead"}
                        </h1>
                        <p className="lead-subtitle">
                            {isEditMode
                                ? "Update the prospect's details."
                                : "Add a prospect to your pipeline."}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="lead-close-btn"
                        onClick={handleBack}
                        aria-label="Close"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </header>

                {/* ============ FORM CARD ============ */}
                <div className="lead-card">

                    {/* Store — full width (super admin only) */}
                    {isSuperAdmin && (
                        <div className="lead-field lead-field--full">
                            <label htmlFor="lead-store" className="lead-label">
                                Store <span className="lead-req">*</span>
                            </label>
                            <select
                                id="lead-store"
                                value={selectedStoreId}
                                onChange={handleStoreChange}
                                disabled={storeLoading || isEditMode}
                                className="lead-input"
                            >
                                <option value="">
                                    {storeLoading ? "Loading..." : "Select store"}
                                </option>
                                {stores.map((store) => {
                                    const id = store.id ?? store.storeId;
                                    const name =
                                        store.storeName ??
                                        store.name ??
                                        `Store ${id}`;
                                    return (
                                        <option key={id} value={id}>
                                            {name}
                                        </option>
                                    );
                                })}
                            </select>
                            {storeError && (
                                <p className="lead-field-error">{storeError}</p>
                            )}
                        </div>
                    )}

                    {/* Two-column grid */}
                    <div className="lead-grid">

                        {/* Customer Mobile — REQUIRED */}
                        <div className="lead-field">
                            <label htmlFor="lead-customer-mobile" className="lead-label">
                                Customer Mobile <span className="lead-req">*</span>
                            </label>
                            <div className="lead-lookup">
                                <Search size={16} className="lead-lookup-icon" />
                                <input
                                    id="lead-customer-mobile"
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={customerMobile}
                                    onChange={handleCustomerMobileChange}
                                    placeholder="10-digit mobile"
                                    disabled={!selectedStoreId}
                                    className="lead-lookup-input"
                                />
                                {customerLookupLoading && (
                                    <span className="lead-lookup-spinner" aria-hidden="true" />
                                )}
                            </div>
                            {customerLookupMessage && (
                                <p
                                    className={
                                        selectedCustomer
                                            ? "lead-hint lead-hint--success"
                                            : "lead-hint"
                                    }
                                >
                                    {selectedCustomer && <CheckCircle2 size={12} />}
                                    {customerLookupMessage}
                                </p>
                            )}
                        </div>

                        {/* Customer Name (auto-filled) */}
                        <div className="lead-field">
                            <label htmlFor="lead-customer-name" className="lead-label">
                                Customer Name
                            </label>
                            <input
                                id="lead-customer-name"
                                type="text"
                                value={customerName}
                                placeholder="Auto-filled from mobile"
                                readOnly
                                disabled={!selectedCustomer}
                                className="lead-input lead-input--readonly"
                            />
                        </div>

                        {/* Assign To — dropdown */}
                        <div className="lead-field">
                            <label htmlFor="lead-salesperson" className="lead-label">
                                Assign To
                            </label>
                            <select
                                id="lead-salesperson"
                                value={
                                    selectedSalesperson?.id
                                        ? String(selectedSalesperson.id)
                                        : ""
                                }
                                onChange={handleSalespersonSelect}
                                disabled={!selectedStoreId || salespersonLoading}
                                className="lead-input"
                            >
                                <option value="">
                                    {salespersonLoading ? "Loading..." : "Unassigned"}
                                </option>
                                {salespersons.map((sp) => {
                                    const id = sp.id ?? sp.salespersonId;
                                    const label = sp.salespersonName
                                        ? `${sp.salespersonName}${sp.mobileNumber ? ` · ${sp.mobileNumber}` : ""}`
                                        : sp.mobileNumber || `Salesperson ${id}`;
                                    return (
                                        <option key={id} value={id}>
                                            {label}
                                        </option>
                                    );
                                })}
                                <option value={NEW_SALESPERSON_VALUE}>
                                    + Add new salesperson
                                </option>
                            </select>
                        </div>

                        {/* Location */}
                        <div className="lead-field">
                            <label htmlFor="lead-location" className="lead-label">
                                Location
                            </label>
                            <input
                                id="lead-location"
                                type="text"
                                value={location}
                                onChange={(event) => setLocation(event.target.value)}
                                placeholder="City or area"
                                maxLength={150}
                                className="lead-input"
                            />
                        </div>

                        {/* VIN Number */}
                        <div className="lead-field">
                            <label htmlFor="lead-vin" className="lead-label">
                                VIN Number
                            </label>
                            <input
                                id="lead-vin"
                                type="text"
                                value={vinNumber}
                                onChange={(event) => setVinNumber(event.target.value)}
                                placeholder="Vehicle identification no."
                                maxLength={30}
                                className="lead-input"
                            />
                        </div>

                        {/* Lead Source */}
                        <div className="lead-field">
                            <label htmlFor="lead-source" className="lead-label">
                                Lead Source
                            </label>
                            <select
                                id="lead-source"
                                value={source}
                                onChange={(event) => setSource(event.target.value)}
                                className="lead-input"
                            >
                                <option value="">Select source</option>
                                {SOURCE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Notes — edit mode only */}
                    {isEditMode && (
                        <div className="lead-field lead-field--full">
                            <label htmlFor="lead-notes" className="lead-label">
                                Notes
                            </label>
                            <textarea
                                id="lead-notes"
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                placeholder="Update existing lead notes..."
                                rows={3}
                                className="lead-textarea"
                            />
                        </div>
                    )}

                    {/* Customer Requirement */}
                    <div className="lead-field lead-field--full">
                        <label htmlFor="lead-requirement" className="lead-label">
                            Customer Requirement
                        </label>
                        <textarea
                            id="lead-requirement"
                            value={customerRequirement}
                            onChange={(event) =>
                                setCustomerRequirement(event.target.value)
                            }
                            placeholder="Example: Maruti Swift brake pad, Skoda 2014 oil filter..."
                            rows={3}
                            className="lead-textarea"
                        />
                    </div>

                    {/* ============ FOOTER ============ */}
                    <div className="lead-footer">
                        <button
                            type="button"
                            className="lead-btn lead-btn--ghost"
                            onClick={handleBack}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="lead-btn lead-btn--primary"
                            onClick={handleCreateLead}
                            disabled={creatingLead || savingEdit}
                        >
                            {isEditMode
                                ? savingEdit
                                    ? "Saving..."
                                    : "Save Changes"
                                : creatingLead
                                ? "Creating..."
                                : "Create Lead"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ============================================================
                CUSTOMER MODAL
            ============================================================ */}
            {customerModalOpen && !isEditMode && (
                <div className="lead-modal-overlay">
                    <div className="lead-modal">
                        <div className="lead-modal-head">
                            <div>
                                <span className="lead-modal-kicker">
                                    New Customer
                                </span>
                                <h2 className="lead-modal-title">Create Customer</h2>
                            </div>
                            <button
                                type="button"
                                className="lead-close-btn lead-close-btn--sm"
                                onClick={() => setCustomerModalOpen(false)}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="lead-modal-body">
                            <div className="lead-mobile-lock">
                                <span>Mobile Number</span>
                                <strong>{customerForm.mobileNumber}</strong>
                            </div>

                            <div className="lead-field">
                                <label className="lead-label">
                                    Customer Name <span className="lead-req">*</span>
                                </label>
                                <input
                                    value={customerForm.customerName}
                                    onChange={(event) =>
                                        handleCustomerFormChange("customerName", event.target.value)
                                    }
                                    placeholder="Enter customer name"
                                    autoFocus
                                    className="lead-input"
                                />
                            </div>

                            <div className="lead-field">
                                <label className="lead-label">
                                    Customer Type <span className="lead-req">*</span>
                                </label>
                                <select
                                    value={customerForm.customerType}
                                    onChange={(event) =>
                                        handleCustomerFormChange("customerType", event.target.value)
                                    }
                                    className="lead-input"
                                >
                                    <option value="WALK_IN">Walk-in</option>
                                    <option value="GARAGE">Garage</option>
                                    <option value="RETAIL">Retail</option>
                                    <option value="B2B">B2B</option>
                                </select>
                            </div>

                            {customerForm.customerType !== "WALK_IN" && (
                                <>
                                    <div className="lead-field">
                                        <label className="lead-label">
                                            GST Registration <span className="lead-req">*</span>
                                        </label>
                                        <select
                                            value={customerForm.gstRegistrationType}
                                            onChange={(event) =>
                                                handleCustomerFormChange(
                                                    "gstRegistrationType",
                                                    event.target.value
                                                )
                                            }
                                            className="lead-input"
                                        >
                                            <option value="UNREGISTERED">Unregistered</option>
                                            <option value="REGISTERED">Registered</option>
                                        </select>
                                    </div>

                                    {customerForm.gstRegistrationType === "REGISTERED" && (
                                        <div className="lead-field">
                                            <label className="lead-label">
                                                GSTIN <span className="lead-req">*</span>
                                            </label>
                                            <input
                                                value={customerForm.gstin}
                                                maxLength={15}
                                                onChange={(event) =>
                                                    handleCustomerFormChange(
                                                        "gstin",
                                                        event.target.value.toUpperCase()
                                                    )
                                                }
                                                placeholder="15-character GSTIN"
                                                className="lead-input"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="lead-modal-footer">
                            <button
                                type="button"
                                className="lead-btn lead-btn--ghost"
                                onClick={() => setCustomerModalOpen(false)}
                                disabled={savingCustomer}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="lead-btn lead-btn--primary"
                                onClick={handleSaveCustomer}
                                disabled={savingCustomer}
                            >
                                {savingCustomer ? "Saving..." : "Save Customer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================
                SALESPERSON MODAL
            ============================================================ */}
            {salespersonModalOpen && !isEditMode && (
                <div className="lead-modal-overlay">
                    <div className="lead-modal">
                        <div className="lead-modal-head">
                            <div>
                                <span className="lead-modal-kicker">
                                    New Salesperson
                                </span>
                                <h2 className="lead-modal-title">Add Salesperson</h2>
                            </div>
                            <button
                                type="button"
                                className="lead-close-btn lead-close-btn--sm"
                                onClick={() => setSalespersonModalOpen(false)}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="lead-modal-body">
                            <div className="lead-field">
                                <label className="lead-label">
                                    Salesperson Name <span className="lead-req">*</span>
                                </label>
                                <input
                                    value={salespersonForm.salespersonName}
                                    maxLength={150}
                                    onChange={(event) =>
                                        setSalespersonForm((current) => ({
                                            ...current,
                                            salespersonName: event.target.value,
                                        }))
                                    }
                                    placeholder="Enter salesperson name"
                                    autoFocus
                                    className="lead-input"
                                />
                            </div>

                            <div className="lead-field">
                                <label className="lead-label">
                                    Mobile Number <span className="lead-req">*</span>
                                </label>
                                <input
                                    value={salespersonForm.mobileNumber}
                                    inputMode="numeric"
                                    maxLength={10}
                                    onChange={(event) =>
                                        setSalespersonForm((current) => ({
                                            ...current,
                                            mobileNumber: event.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 10),
                                        }))
                                    }
                                    placeholder="10-digit mobile number"
                                    className="lead-input"
                                />
                            </div>
                        </div>

                        <div className="lead-modal-footer">
                            <button
                                type="button"
                                className="lead-btn lead-btn--ghost"
                                onClick={() => setSalespersonModalOpen(false)}
                                disabled={savingSalesperson}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="lead-btn lead-btn--primary"
                                onClick={handleSaveSalesperson}
                                disabled={savingSalesperson}
                            >
                                {savingSalesperson ? "Saving..." : "Save Salesperson"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================
                SUCCESS POPUP
            ============================================================ */}
            {createdLead && !isEditMode && (
                <div className="lead-modal-overlay">
                    <div className="lead-modal">
                        <div className="lead-modal-head">
                            <div>
                                <span className="lead-modal-kicker">
                                    Lead Created
                                </span>
                                <h2 className="lead-modal-title">
                                    Lead Created Successfully
                                </h2>
                            </div>
                            <button
                                type="button"
                                className="lead-close-btn lead-close-btn--sm"
                                onClick={() => setCreatedLead(null)}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="lead-modal-body">
                            <div className="lead-mobile-lock">
                                <span>Lead Number</span>
                                <strong>{createdLead.leadNumber || createdLead.id}</strong>
                                <small>
                                    {createdLead.customerName
                                        ? `Customer: ${createdLead.customerName}`
                                        : "The lead has been saved."}
                                </small>
                            </div>
                        </div>

                        <div className="lead-modal-footer">
                            <button
                                type="button"
                                className="lead-btn lead-btn--ghost"
                                onClick={() => {
                                    setCreatedLead(null);
                                    if (typeof onClose === "function") onClose();
                                }}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className="lead-btn lead-btn--primary"
                                onClick={() => {
                                    const base = isSuperAdmin
                                        ? "/owner/sales"
                                        : "/store/sales";
                                    navigate(
                                        `${base}/leads/${createdLead.id}?view=readonly`
                                    );
                                }}
                            >
                                View Lead
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}