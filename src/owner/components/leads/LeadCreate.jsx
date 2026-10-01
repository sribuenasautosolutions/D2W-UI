import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    Search,
    X,
} from "lucide-react";

import {
    createLead,
    updateLead,
} from "../../../services/leadService";
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

    /* =========================================================
       STORE
    ========================================================= */
    const [selectedStoreId, setSelectedStoreId] = useState(
        isSuperAdmin ? "" : String(user?.storeId || "")
    );
    const [stores, setStores] = useState([]);
    const [storeLoading, setStoreLoading] = useState(false);
    const [storeError, setStoreError] = useState("");

    /* =========================================================
       CUSTOMER
    ========================================================= */
    const [customerMobile, setCustomerMobile] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
    const [customerLookupMessage, setCustomerLookupMessage] = useState("");
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER);
    const [savingCustomer, setSavingCustomer] = useState(false);
    const customerLookupRequest = useRef(0);

    /* =========================================================
       SALESPERSON
    ========================================================= */
    const [salespersons, setSalespersons] = useState([]);
    const [salespersonMobile, setSalespersonMobile] = useState("");
    const [salespersonName, setSalespersonName] = useState("");
    const [selectedSalesperson, setSelectedSalesperson] = useState(null);
    const [salespersonLoading, setSalespersonLoading] = useState(false);
    const [salespersonLookupMessage, setSalespersonLookupMessage] = useState("");
    const [salespersonModalOpen, setSalespersonModalOpen] = useState(false);
    const [salespersonForm, setSalespersonForm] = useState(EMPTY_SALESPERSON);
    const [savingSalesperson, setSavingSalesperson] = useState(false);

    /* =========================================================
       LEAD
    ========================================================= */
    const [source, setSource] = useState("");
    const [customerRequirement, setCustomerRequirement] = useState("");
    const [notes, setNotes] = useState("");
    const [creatingLead, setCreatingLead] = useState(false);
    const [createdLead, setCreatedLead] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);

    /* =========================================================
       EDIT MODE INITIALIZATION
    ========================================================= */
    useEffect(() => {
        if (!isEditMode || !lead) return;

        const storeId =
            lead?.storeId ??
            lead?.store?.id ??
            "";

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

        setSelectedCustomer(
            customer.id ? customer : null
        );
        setCustomerMobile(customer.mobileNumber || "");
        setCustomerName(customer.customerName || "");

        const salesperson = {
            id:
                lead?.salespersonId ??
                lead?.salesperson?.id ??
                "",
            salespersonName:
                lead?.salespersonName ??
                lead?.salesperson?.salespersonName ??
                "",
            mobileNumber:
                lead?.salespersonMobile ??
                lead?.salesperson?.mobileNumber ??
                "",
        };

        setSelectedSalesperson(
            salesperson.id ? salesperson : null
        );
        setSalespersonMobile(
            salesperson.mobileNumber || ""
        );
        setSalespersonName(
            salesperson.salespersonName || ""
        );

        setSource(
            lead?.source ??
                lead?.sourceName ??
                ""
        );
        setCustomerRequirement(
            lead?.customerRequirement || ""
        );
        setNotes(lead?.notes || "");
        setCreatedLead(null);
    }, [isEditMode, lead]);

    /* =========================================================
       LOAD STORES
    ========================================================= */
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
                setStoreError(
                    error?.response?.data?.message || "Unable to load stores."
                );
            } finally {
                setStoreLoading(false);
            }
        };
        loadStores();
    }, [isSuperAdmin]);

    /* =========================================================
       LOAD SALESPERSONS
    ========================================================= */
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

        // In edit mode, keep the existing salesperson selected.
        // The existing lead already contains salespersonId, so we must
        // not clear it when the salesperson list loads.
        if (isEditMode) return;

        setSelectedSalesperson(null);
        setSalespersonMobile("");
        setSalespersonName("");
        setSalespersonLookupMessage("");
    }, [selectedStoreId, loadSalespersons, isEditMode]);

    /* =========================================================
       HYDRATE EXISTING SALESPERSON IN EDIT MODE
    ========================================================= */
    useEffect(() => {
        if (!isEditMode || !lead?.salespersonId || !salespersons.length) {
            return;
        }

        const existing = salespersons.find(
            (item) =>
                String(item?.id ?? item?.salespersonId ?? "") ===
                String(lead.salespersonId)
        );

        if (!existing) return;

        setSelectedSalesperson(existing);
        setSalespersonName(
            existing?.salespersonName ??
                existing?.name ??
                lead?.salespersonName ??
                ""
        );
        setSalespersonMobile(
            existing?.mobileNumber ??
                existing?.mobile ??
                lead?.salespersonMobile ??
                ""
        );
        setSalespersonLookupMessage("Existing salesperson selected.");
    }, [isEditMode, lead, salespersons]);

    /* =========================================================
       HYDRATE EXISTING CUSTOMER IN EDIT MODE
       The lead API may return customerId/name without mobile.
       Resolve the same existing customer from the store so the
       create-style mobile field can show the real value.
    ========================================================= */
    useEffect(() => {
        if (
            !isEditMode ||
            !selectedStoreId ||
            !lead?.customerId
        ) {
            return;
        }

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
                setCustomerMobile(
                    existing?.mobileNumber ??
                        existing?.mobile ??
                        ""
                );
                setCustomerName(
                    existing?.customerName ??
                        existing?.name ??
                        searchName
                );
                setCustomerLookupMessage("Existing customer selected.");
            } catch (error) {
                console.warn(
                    "Unable to hydrate existing customer:",
                    error
                );
            }
        };

        resolveCustomer();

        return () => {
            cancelled = true;
        };
    }, [isEditMode, selectedStoreId, lead]);

    /* =========================================================
       STORE CHANGE
    ========================================================= */
    const handleStoreChange = (event) => {
        const value = event.target.value;
        setSelectedStoreId(value);

        setSelectedCustomer(null);
        setCustomerMobile("");
        setCustomerName("");
        setCustomerLookupMessage("");

        setSelectedSalesperson(null);
        setSalespersonMobile("");
        setSalespersonName("");
        setSalespersonLookupMessage("");

        setSource("");
    };

    /* =========================================================
       CUSTOMER LOOKUP — runs automatically at 10 digits
    ========================================================= */
    const lookupCustomer = async (mobile) => {
        if (!selectedStoreId) return;
        if (!/^\d{10}$/.test(mobile)) return;

        const requestId = ++customerLookupRequest.current;
        setCustomerLookupLoading(true);
        setCustomerLookupMessage("");

        try {
            const customer = await getCustomerByMobile(
                mobile,
                Number(selectedStoreId)
            );

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

            // Create mode only: allow creating a new customer.
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
                    error?.response?.data?.message ||
                        "Unable to check customer."
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

        // Reset selections when editing
        if (selectedCustomer && selectedCustomer.mobileNumber !== value) {
            setSelectedCustomer(null);
            setCustomerName("");
        }

        // Auto-trigger lookup at 10 digits
        if (value.length === 10 && value !== selectedCustomer?.mobileNumber) {
            lookupCustomer(value);
        }
    };

    /* =========================================================
       CUSTOMER MODAL
    ========================================================= */
    const handleCustomerFormChange = (field, value) => {
        setCustomerForm((current) => {
            const next = { ...current, [field]: value };
            if (field === "customerType" && value === "WALK_IN") {
                next.gstRegistrationType = "UNREGISTERED";
                next.gstin = "";
            }
            if (
                field === "gstRegistrationType" &&
                value === "UNREGISTERED"
            ) {
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

        if (
            requiresGst &&
            !/^[0-9A-Za-z]{15}$/.test(customerForm.gstin.trim())
        ) {
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
            gstin: requiresGst
                ? customerForm.gstin.trim().toUpperCase()
                : null,
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

    /* =========================================================
       SALESPERSON LOOKUP — runs automatically at 10 digits
    ========================================================= */
    const lookupSalesperson = (mobile) => {
        if (!selectedStoreId) return;
        if (!/^\d{10}$/.test(mobile)) return;

        const found = salespersons.find(
            (sp) => sp.mobileNumber === mobile
        );

        if (found) {
            setSelectedSalesperson(found);
            setSalespersonName(found.salespersonName || "");
            setSalespersonLookupMessage("Existing salesperson found.");
            return;
        }

        if (isEditMode) {
            setSalespersonLookupMessage(
                "Existing salesperson not found. Select an existing salesperson by mobile number."
            );
            return;
        }

        // Create mode only: allow creating a new salesperson.
        setSalespersonForm({
            salespersonName: "",
            mobileNumber: mobile,
        });
        setSalespersonModalOpen(true);
    };

    const handleSalespersonMobileChange = (event) => {
        const value = event.target.value.replace(/\D/g, "").slice(0, 10);
        setSalespersonMobile(value);
        setSalespersonLookupMessage("");

        if (
            selectedSalesperson &&
            selectedSalesperson.mobileNumber !== value
        ) {
            setSelectedSalesperson(null);
            setSalespersonName("");
        }

        // Auto-trigger lookup at 10 digits
        if (value.length === 10 && value !== selectedSalesperson?.mobileNumber) {
            lookupSalesperson(value);
        }
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
            setSelectedSalesperson(saved);
            setSalespersonMobile(saved?.mobileNumber || mobile);
            setSalespersonName(saved?.salespersonName || name);
            setSalespersonLookupMessage("New salesperson created.");
            setSalespersonModalOpen(false);
            await loadSalespersons(selectedStoreId);
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

    /* =========================================================
       CREATE / UPDATE LEAD
    ========================================================= */
    const handleCreateLead = async () => {
        if (!selectedStoreId) {
            alert("Select a store first.");
            return;
        }

        if (!selectedCustomer) {
            alert("Enter customer mobile number.");
            return;
        }

        if (!selectedSalesperson) {
            alert("Enter salesperson mobile number.");
            return;
        }

        if (!source) {
            alert("Select a lead source.");
            return;
        }

        if (!customerRequirement.trim()) {
            alert("Customer requirement is required.");
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
                source: source.trim(),
                customerRequirement:
                    customerRequirement.trim(),
                notes: notes.trim() || null,
            };

            setSavingEdit(true);

            try {
                const result = await updateLead(
                    lead.id,
                    payload
                );

                const mergedLead = {
                    ...lead,
                    ...(result || {}),
                    customerId:
                        result?.customerId ??
                        selectedCustomer.id,
                    customerName:
                        result?.customerName ??
                        selectedCustomer.customerName,
                    salespersonId:
                        result?.salespersonId ??
                        selectedSalesperson.id,
                    salespersonName:
                        result?.salespersonName ??
                        selectedSalesperson.salespersonName,
                    source:
                        result?.source ??
                        source,
                    customerRequirement:
                        result?.customerRequirement ??
                        customerRequirement.trim(),
                    notes:
                        result?.notes ??
                        lead?.notes ??
                        null,
                    items:
                        result?.items ??
                        lead?.items ??
                        [],
                };

                if (typeof onSaved === "function") {
                    onSaved(mergedLead);
                }

                if (typeof onClose === "function") {
                    onClose();
                }
            } catch (error) {
                console.error(
                    "Unable to update lead:",
                    error
                );

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
            salespersonId: Number(selectedSalesperson.id),
            storeId: isSuperAdmin
                ? Number(selectedStoreId)
                : null,
            source,
            customerRequirement:
                customerRequirement.trim(),
            items: [],
        };

        setCreatingLead(true);

        try {
            const result = await createLead(payload);
            setCreatedLead(result);
        } catch (error) {
            console.error(
                "Unable to create lead:",
                error
            );

            alert(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to create lead."
            );
        } finally {
            setCreatingLead(false);
        }
    };

    /* =========================================================
       BACK / CLOSE
    ========================================================= */
    const handleBack = () => {
        if (typeof onClose === "function") onClose();
        else
            navigate(
                isSuperAdmin ? "/owner/sales/leads" : "/store/sales/leads"
            );
    };

    /* =========================================================
       RENDER
    ========================================================= */
    return (
        <section className="lead-create-page">
            {/* =================================================
                HEADER
            ================================================= */}
            <div className="lead-create-header">
                <div className="lead-create-header-left">
                    <div className="lead-eyebrow">LEAD MANAGEMENT</div>
                    <h1>{isEditMode ? "Edit Lead" : "Create Lead"}</h1>
                </div>

                <div className="lead-create-header-right">
                    {isSuperAdmin && (
                        <div className="lead-store-field">
                            <label>
                                Store <span>*</span>
                            </label>
                            <select
                                value={selectedStoreId}
                                onChange={handleStoreChange}
                                disabled={storeLoading || isEditMode}
                            >
                                <option value="">
                                    {storeLoading
                                        ? "Loading..."
                                        : "Select store"}
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
                                <div className="field-error">{storeError}</div>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        className="lead-back-button"
                        onClick={handleBack}
                    >
                        <ArrowLeft size={13} />
                        {onClose ? "Close" : "Back"}
                    </button>
                </div>
            </div>

            {/* =================================================
                MAIN CARD
            ================================================= */}
            <div className="lead-create-card">
                {/* =============================================
                    CUSTOMER ROW
                ============================================= */}
                <div className="lead-section-grid">
                    <div className="lead-field">
                        <label>
                            Customer Mobile <span>*</span>
                        </label>
                        <div className="lookup-input-wrap">
                            <Search size={14} />
                            <input
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                value={customerMobile}
                                onChange={handleCustomerMobileChange}
                                placeholder="10-digit mobile number"
                                disabled={!selectedStoreId}
                            />
                            {customerLookupLoading && (
                                <span className="lookup-spinner" />
                            )}
                        </div>
                        {customerLookupMessage && (
                            <div
                                className={
                                    selectedCustomer
                                        ? "lookup-success"
                                        : "lookup-hint"
                                }
                            >
                                {selectedCustomer && (
                                    <CheckCircle2 size={12} />
                                )}
                                {customerLookupMessage}
                            </div>
                        )}
                    </div>

                    <div className="lead-field">
                        <label>Customer Name</label>
                        <input
                            type="text"
                            value={customerName}
                            placeholder="Auto-filled from mobile"
                            readOnly
                            disabled={!selectedCustomer}
                        />
                    </div>
                </div>

                {/* =============================================
                    SALESPERSON + SOURCE
                ============================================= */}
                <div className="lead-section-grid">
                    <div className="lead-field">
                        <label>
                            Salesperson Mobile <span>*</span>
                        </label>
                        <div className="lookup-input-wrap">
                            <Search size={14} />
                            <input
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                value={salespersonMobile}
                                onChange={handleSalespersonMobileChange}
                                placeholder="10-digit mobile number"
                                disabled={!selectedStoreId}
                            />
                        </div>
                        {salespersonLookupMessage && (
                            <div
                                className={
                                    selectedSalesperson
                                        ? "lookup-success"
                                        : "lookup-hint"
                                }
                            >
                                {selectedSalesperson && (
                                    <CheckCircle2 size={12} />
                                )}
                                {salespersonLookupMessage}
                            </div>
                        )}
                    </div>

                    <div className="lead-field">
                        <label>
                            Lead Source <span>*</span>
                        </label>
                        <select
                            value={source}
                            onChange={(event) => setSource(event.target.value)}
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

                {/* =============================================
                    NOTES — edit existing notes only
                ============================================= */}
                {isEditMode && (
                    <div className="requirement-section">
                        <h2>Notes</h2>
                        <textarea
                            value={notes}
                            onChange={(event) =>
                                setNotes(event.target.value)
                            }
                            placeholder="Update existing lead notes..."
                            rows={3}
                        />
                    </div>
                )}

                {/* =============================================
                    REQUIREMENT
                ============================================= */}
                <div className="requirement-section">
                    <h2>
                        Customer Requirement <span>*</span>
                    </h2>
                    <textarea
                        value={customerRequirement}
                        onChange={(event) =>
                            setCustomerRequirement(event.target.value)
                        }
                        placeholder="Example: Maruti Swift brake pad, Skoda 2014 oil filter..."
                        rows={4}
                    />
                </div>

                {/* =============================================
                    SUBMIT
                ============================================= */}
                <div className="lead-submit-bar">
                    <button
                        type="button"
                        className="create-lead-button"
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

            {/* =====================================================
                CUSTOMER MODAL
            ===================================================== */}
            {customerModalOpen && !isEditMode && (
                <div className="modal-overlay">
                    <div className="modal-card modal-small">
                        <div className="modal-header">
                            <div>
                                <span className="modal-kicker">
                                    NEW CUSTOMER
                                </span>
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
                                    onChange={(event) =>
                                        handleCustomerFormChange(
                                            "customerName",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Enter customer name"
                                    autoFocus
                                />
                            </div>

                            <div className="lead-field">
                                <label>
                                    Customer Type <span>*</span>
                                </label>
                                <select
                                    value={customerForm.customerType}
                                    onChange={(event) =>
                                        handleCustomerFormChange(
                                            "customerType",
                                            event.target.value
                                        )
                                    }
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
                                        <label>
                                            GST Registration <span>*</span>
                                        </label>
                                        <select
                                            value={
                                                customerForm.gstRegistrationType
                                            }
                                            onChange={(event) =>
                                                handleCustomerFormChange(
                                                    "gstRegistrationType",
                                                    event.target.value
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
                                                onChange={(event) =>
                                                    handleCustomerFormChange(
                                                        "gstin",
                                                        event.target.value.toUpperCase()
                                                    )
                                                }
                                                placeholder="15-character GSTIN"
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
                                {savingCustomer ? "Saving..." : "Save Customer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
                SALESPERSON MODAL
            ===================================================== */}
            {salespersonModalOpen && !isEditMode && (
                <div className="modal-overlay">
                    <div className="modal-card modal-small">
                        <div className="modal-header">
                            <div>
                                <span className="modal-kicker">
                                    NEW SALESPERSON
                                </span>
                                <h2>Add Salesperson</h2>
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
                                <strong>
                                    {salespersonForm.mobileNumber}
                                </strong>
                            </div>

                            <div className="lead-field">
                                <label>
                                    Salesperson Name <span>*</span>
                                </label>
                                <input
                                    value={salespersonForm.salespersonName}
                                    maxLength={150}
                                    onChange={(event) =>
                                        setSalespersonForm((current) => ({
                                            ...current,
                                            salespersonName:
                                                event.target.value,
                                        }))
                                    }
                                    placeholder="Enter salesperson name"
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
                                    : "Save Salesperson"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
                SUCCESS POPUP
            ===================================================== */}
            {createdLead && !isEditMode && (
                <div className="modal-overlay">
                    <div className="modal-card modal-small">
                        <div className="modal-header">
                            <div>
                                <span className="modal-kicker">
                                    LEAD CREATED
                                </span>
                                <h2>Lead Created Successfully</h2>
                            </div>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => setCreatedLead(null)}
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="mobile-lock-card">
                                <span>Lead Number</span>
                                <strong>
                                    {createdLead.leadNumber || createdLead.id}
                                </strong>
                                <small>
                                    {createdLead.customerName
                                        ? `Customer: ${createdLead.customerName}`
                                        : "The lead has been saved."}
                                </small>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => {
                                    setCreatedLead(null);
                                    if (typeof onClose === "function")
                                        onClose();
                                }}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className="primary-button"
                                onClick={() => {
                                    const base = isSuperAdmin
                                        ? "/owner/sales"
                                        : "/store/sales";
                                    navigate(
                                        `${base}/leads/${createdLead.id}`
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