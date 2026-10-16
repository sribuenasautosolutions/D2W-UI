import { useEffect, useMemo, useRef, useState } from "react";
import {
    Check,
    ChevronDown,
    Loader2,
    Mail,
    Pencil,
    Phone,
    StickyNote,
    Trash2,
    Users,
    X,
} from "lucide-react";
import {
    applyProcurementLookup,
    formatMrp,
    procurementTotal,
} from "./procurementUiUtils";

import {
    completeLeadProcurement,
    getLeadById,
    addProcurementItem,
    lookupLeadItemProduct,
    saveLeadItemProcurement,
    deleteLeadProcurementItem,
    updateLeadStatus,
    identifyCustomerRequirement,
    lookupProcurementProduct,
} from "../../../services/leadService";

import { procurementWork } from "./leadWorkflowUtils";

import ProcurementSourceSelect from "./ProcurementSourceSelect";

// Legacy stylesheet stays imported: the Follow-up drawer shares its classes.
import "./LeadProcurementDrawer.css";


const PROCUREMENT_SOURCES = {
    LOCAL: "LOCAL",
    VENDOR: "VENDOR",
    NOT_AVAILABLE: "NOT_AVAILABLE",
};

const AVAILABILITY_STATUS = {
    AVAILABLE: "AVAILABLE",
    PARTIAL: "PARTIAL",
    ESTIMATED: "ESTIMATED",
    NOT_AVAILABLE: "NOT_AVAILABLE",
};

/* ---- UI-only constants (tabs, activity, pipeline) ---- */
const TABS = [
    { key: "items", label: "Overview / Items" },
    { key: "activity", label: "Activity & Notes" },
    { key: "pipeline", label: "Follow-up Schedule" },   
];

const ACTIVITY_TYPES = [
    { key: "Note", Icon: StickyNote },
    { key: "Call", Icon: Phone },
    { key: "Email", Icon: Mail },
    { key: "Meeting", Icon: Users },
];

const PIPELINE_STAGES = [
    { key: "NEW", label: "New" },
    { key: "PROCUREMENT", label: "Procurement" },
    { key: "FOLLOW_UP", label: "Follow-up" },
    { key: "WON", label: "Won" },
    { key: "LOST", label: "Lost" },
];

function firstValue(...values) {
    return values.find(
        (value) =>
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
    );
}

function toNumberOrEmpty(value) {
    if (value === null || value === undefined || value === "") return "";
    const number = Number(value);
    return Number.isFinite(number) ? number : "";
}


function getVendorStockItemId(vendor) {
    return vendor?.vendorStockItemId;
}

function getVendorName(vendor) {
    return vendor?.vendorName || "Vendor";
}

function getVendorQuantity(vendor) {
    return vendor?.availableQuantity;
}

function todayDate() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

function formatStamp(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getItemInitialState(item) {
    return {
        partNumber: item?.partNumber || "",
        productName: item?.productName || "",
        brandName: item?.brandName || item?.brandname || "",
        hsnCode: item?.hsnCode || "",
        quotedMrp: toNumberOrEmpty(item?.quotedMrp),
        productItemId: item?.productItemId ?? null,
        localProductId: item?.localProductId ?? null,
        
        requestedQuantity: item?.requestedQuantity ?? "",
        availabilityStatus: item?.availabilityStatus || "",
        estimatedAvailabilityDate:
            item?.estimatedAvailabilityDate || "",
        procurementSource: item?.procurementSource || "",
        vendorStockItemId: item?.selectedVendorStockItemId || "",
        notes: item?.notes || "",
    };
}

/* ============================================================
   SMALL PRESENTATIONAL HELPERS
   ============================================================ */

function SectionCard({ title, meta, defaultOpen = true, children }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <section className="pd-card">
            <button
                type="button"
                className="pd-card-head"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
            >
                <span className="pd-card-title">{title}</span>
                {meta}
                <ChevronDown
                    size={16}
                    className={`pd-chevron${open ? " is-open" : ""}`}
                />
            </button>
            {open && <div className="pd-card-body">{children}</div>}
        </section>
    );
}

function MetaField({ label, value, editing, onChange, placeholder }) {
    return (
        <label className={`pd-meta-field${editing ? " is-editing" : ""}`}>
            <span>{label}</span>
            <input
                type="text"
                value={value}
                readOnly={!editing}
                onChange={(event) => onChange?.(event.target.value)}
                placeholder={placeholder}
            />
        </label>
    );
}

function LeadProcurementDrawer({
    lead,
    onClose,
    onUpdated,
    onToast,
    onCustomerEdit,
    assignees,
}) {
    const [loading, setLoading] = useState(true);
    const [savingItemId, setSavingItemId] = useState(null);
    const [completing, setCompleting] = useState(false);

    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [procurementLead, setProcurementLead] = useState(null);
    const [itemDrafts, setItemDrafts] = useState({});
    const [lookupResults, setLookupResults] = useState({});
    const [lookupLoading, setLookupLoading] = useState({});
    const [lookupErrors, setLookupErrors] = useState({});
    const [itemErrors, setItemErrors] = useState({});
    const [savedItems, setSavedItems] = useState({});

    const [items, setItems] = useState([]);
    const [entryPartNumber, setEntryPartNumber] = useState("");
    const [entryLoading, setEntryLoading] = useState(false);
    const [bulkPartsText, setBulkPartsText] = useState("");
    const [bulkLoading, setBulkLoading] = useState(false);
    const [creatingItems, setCreatingItems] = useState(0);
    const entryVersion = useRef(0);
    const entryTimer = useRef(null);
    const leadSession = useRef(0);
    const pendingCreations = useRef({});
    const draftRef = useRef({});
    draftRef.current = itemDrafts;
    const [activeEntryTab, setActiveEntryTab] = useState("single");
    const lookupVersions = useRef({});
    const lookupTimers = useRef({});
    const readOnly = Boolean(procurementLead && !["NEW", "PROCUREMENT"].includes(procurementLead.status));

    /* ---- UI-only state: tabs, customer edit toggle, activity, pipeline ---- */
    const [activeTab, setActiveTab] = useState("items");
    const [editingCustomer, setEditingCustomer] = useState(false);
    const [customerEdits, setCustomerEdits] = useState({});

    const [activityType, setActivityType] = useState("Note");
    const [activityText, setActivityText] = useState("");
    const [activities, setActivities] = useState([]);

    const [pipeline, setPipeline] = useState({
        stage: null,
        assignedTo: null,
        followUpDate: "",
        followUpTime: "",
    });

    useEffect(() => {
        let cancelled = false;
        const session = ++leadSession.current;
        pendingCreations.current = {};
        const timers = lookupTimers.current;
        const versions = lookupVersions.current;

        const loadLead = async () => {
            if (!lead?.id) {
                setProcurementLead(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setErrorMessage("");
            setSuccessMessage("");
            setLookupResults({});
            setLookupErrors({});
            setLookupLoading({});
            setItemErrors({});
            setSavedItems({});
            setItems([]);
            setEntryPartNumber("");
            setBulkPartsText("");
            setEntryLoading(false);
            setBulkLoading(false);
            setCreatingItems(0);

            try {
                const response = await getLeadById(lead.id);

                if (cancelled) return;

                setProcurementLead(response);

                const drafts = {};
                const records = procurementWork(response);
                setItems(records);
                records.forEach(
                    (item) => {
                        if (item?.id) {
                            drafts[item.id] = getItemInitialState(item);
                        }
                    }
                );

                setItemDrafts(drafts);

                setSavedItems(Object.fromEntries(records.map(item => [item.id,
                    Boolean(!item.rawRequirement && item.partNumber && item.requestedQuantity > 0 && item.availabilityStatus && item.procurementSource && (!item.customerChange || item.customerChange.processingState === "READY"))])));
                // Refresh facts without overwriting saved source, availability, quantity or vendor.
                for (const item of records) {
                    if (!item.id || !item.partNumber || item.rawRequirement) continue;
                    const version = (versions[item.id] || 0) + 1;
                    versions[item.id] = version;
                    setLookupLoading(current => ({ ...current, [item.id]: true }));
                    lookupLeadItemProduct(response.id, item.id, item.partNumber).then(result => {
                        if (cancelled || versions[item.id] !== version) return;
                        setLookupResults(current => ({ ...current, [item.id]: result }));
                        setItemDrafts(current => ({
                            ...current,
                            [item.id]: {
                                ...applyProcurementLookup(current[item.id] || {}, result),
                                quotedMrp:
                                    current[item.id]?.quotedMrp !== ""
                                        ? current[item.id].quotedMrp
                                        : result.mrp ?? "",
                            },
                        }));
                    }).catch(error => {
                        if (cancelled || versions[item.id] !== version) return;
                        setLookupErrors(current => ({ ...current, [item.id]: error?.response?.data?.message || error?.response?.data?.error || "Unable to lookup this part number." }));
                    }).finally(() => {
                        if (!cancelled && versions[item.id] === version)
                            setLookupLoading(current => ({ ...current, [item.id]: false }));
                    });
                }
            } catch (error) {
                console.error("Unable to load procurement lead:", error);

                if (!cancelled) {
                    setErrorMessage(
                        error?.response?.data?.message ||
                            error?.response?.data?.error ||
                            "Unable to load lead details."
                    );
                    setProcurementLead(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadLead();

        return () => {
            cancelled = true;
            if (leadSession.current === session) leadSession.current += 1;
            entryVersion.current += 1;
            clearTimeout(entryTimer.current);
            Object.values(timers).forEach(clearTimeout);
            Object.keys(versions).forEach(id => { versions[id] += 1; });
        };
    }, [lead?.id]);

    const customerName =
        firstValue(
            procurementLead?.customerName,
            procurementLead?.customer?.customerName,
            procurementLead?.customer?.name,
            lead?.customerName
        ) || "Customer unavailable";

    const customerPhone =
        firstValue(
            procurementLead?.customerPhone,
            procurementLead?.customer?.mobileNumber,
            procurementLead?.customer?.mobile,
            lead?.customerPhone
        ) || "Phone not available";

    const salespersonName =
        firstValue(
            procurementLead?.salespersonName,
            procurementLead?.salesPersonName,
            procurementLead?.salesperson?.name,
            procurementLead?.salesperson?.fullName,
            procurementLead?.salesPerson?.name,
            lead?.salespersonName,
            lead?.salesPersonName
        ) || "Salesperson not assigned";

    const leadNumber =
        firstValue(procurementLead?.leadNumber, lead?.leadNumber) ||
        `LEAD-${lead?.id || ""}`;

    const customerRequirement =
        firstValue(
            procurementLead?.customerRequirement,
            lead?.customerRequirement
        ) || "No requirement specified";

    const allItemsSaved = useMemo(() => {
        if (items.length === 0) return false;
        return items.every((item) => Boolean(savedItems[item?.id]));
    }, [items, savedItems]);
    

    const updateDraft = (itemId, field, value) => {
    if (field === "sourceSelection") {
        setSavedItems((current) => ({ ...current, [itemId]: false }));
        setItemErrors((current) => ({ ...current, [itemId]: "" }));
        setSuccessMessage("");
        setItemDrafts((current) => ({
            ...current,
            [itemId]: {
                ...current[itemId],
                procurementSource: value.startsWith("vendor:")
                    ? "VENDOR"
                    : value,
                vendorStockItemId: value.startsWith("vendor:")
                    ? value.slice(7)
                    : "",
            },
        }));
        return;
    }
    if (
        field === "partNumber" &&
        Object.entries(draftRef.current).some(
            ([id, draft]) =>
                id !== String(itemId) &&
                draft.partNumber.trim().toUpperCase() ===
                    value.trim().toUpperCase()
        )
    ) {
        setItemErrors((current) => ({
            ...current,
            [itemId]: "This part number is already in Procurement.",
        }));
        return;
    }

    setSavedItems((current) => ({ ...current, [itemId]: false }));
    setItemErrors((current) => ({ ...current, [itemId]: "" }));
    setSuccessMessage("");

    if (field === "partNumber") {
        lookupVersions.current[itemId] =
            (lookupVersions.current[itemId] || 0) + 1;
        clearTimeout(lookupTimers.current[itemId]);
        setLookupResults((current) => ({ ...current, [itemId]: null }));
        setLookupErrors((current) => ({ ...current, [itemId]: "" }));
        setLookupLoading((current) => ({
            ...current,
            [itemId]: Boolean(value.trim()),
        }));
        setItemDrafts((current) => ({
            ...current,
            [itemId]: {
                ...current[itemId],
                partNumber: value,
                productName: "",
                brandName: "",
                hsnCode: "",
                productItemId: null,
                localProductId: null,
                quotedMrp: "",
                procurementSource: "",
                availabilityStatus: "",
                vendorStockItemId: "",
                estimatedAvailabilityDate: "",
            },
        }));
        if (value.trim()) {
            lookupTimers.current[itemId] = setTimeout(() => {
                lookupItem({ id: itemId }, value);
            }, 400);
        }
        return;
    }

    setItemDrafts((current) => ({
        ...current,
        [itemId]: {
            ...current[itemId],
            [field]: value,
            ...(field === "procurementSource" && value !== "VENDOR"
                ? { vendorStockItemId: "" }
                : {}),
            ...(field === "availabilityStatus" && value !== "ESTIMATED"
                ? { estimatedAvailabilityDate: "" }
                : {}),
        },
    }));
};

    const applyLookupToDraft = (itemId, result) => {
    setSavedItems(current => ({ ...current, [itemId]: false }));
    setItemDrafts(current => ({
        ...current,
        [itemId]: {
            ...applyProcurementLookup(current[itemId] || {}, result),
            quotedMrp:
                current[itemId]?.quotedMrp !== ""
                    ? current[itemId].quotedMrp
                    : result.mrp ?? "",
        },
    }));
};
    const getEffectiveLookupResult = (item) =>
        item?.id ? lookupResults[item.id] || null : null;

    const lookupItem = async (item, partNumberOverride = null) => {
        if (!item?.id) return null;

        const partNumber = String(
            partNumberOverride ??
                itemDrafts[item.id]?.partNumber ??
                item?.partNumber ??
                ""
        ).trim();

        if (!partNumber) return null;
        const session = leadSession.current;
        clearTimeout(lookupTimers.current[item.id]);
        const version = (lookupVersions.current[item.id] || 0) + 1;
        lookupVersions.current[item.id] = version;

        setLookupLoading((current) => ({
            ...current,
            [item.id]: true,
        }));

        setLookupErrors((current) => ({
            ...current,
            [item.id]: "",
        }));

        try {
            const raw = items.find(row => row.id === item.id)?.rawRequirement;
            const result = raw
                ? await lookupProcurementProduct(procurementLead?.id || lead?.id, partNumber)
                : await lookupLeadItemProduct(procurementLead?.id || lead?.id, item.id, partNumber);

            if (leadSession.current !== session || lookupVersions.current[item.id] !== version) return null;
            setLookupResults((current) => ({
                ...current,
                [item.id]: result,
            }));

            applyLookupToDraft(item.id, result, item);

            return result;
        } catch (error) {
            if (leadSession.current !== session || lookupVersions.current[item.id] !== version) return null;

            setLookupResults((current) => ({
                ...current,
                [item.id]: null,
            }));

            setLookupErrors((current) => ({
                ...current,
                [item.id]:
                    error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to lookup this part number.",
            }));

            return null;
        } finally {
            if (leadSession.current === session && lookupVersions.current[item.id] === version) setLookupLoading((current) => ({
                ...current,
                [item.id]: false,
            }));
        }
    };
    const duplicatePart = partNumber => Object.values(draftRef.current).some(draft =>
        draft.partNumber.trim().toUpperCase() === partNumber.trim().toUpperCase());

    const addPersistedRow = item => {
        // Creation succeeds independently of lookup. Never discard its persisted identity.
        if (draftRef.current[item.id]) return;
        const draft = getItemInitialState(item);
        draftRef.current = { ...draftRef.current, [item.id]: draft };
        setItems(current => current.some(row => row.id === item.id) ? current : [...current, item]);
        setItemDrafts(current => ({ ...current, [item.id]: draft }));
        setSavedItems(current => ({ ...current, [item.id]: false }));
    };

    const createAndLookupPart = async partNumber => {
        const session = leadSession.current;
        const clean = partNumber.trim();
        const key = clean.toUpperCase();
        const pending = pendingCreations.current;
        // Enter and debounce may overlap. They must share one creation request.
        if (!pending[key]) {
            setCreatingItems(current => current + 1);
            pending[key] = addProcurementItem(lead.id, clean).finally(() => {
                if (leadSession.current === session) setCreatingItems(current => current - 1);
            });
        }
        let item;
        try { item = await pending[key]; }
        finally { delete pending[key]; }
        if (leadSession.current !== session) return;
        addPersistedRow(item);
        await lookupItem(item, item.partNumber || clean);
    };

    const lookupEntry = async (partNumber, version) => {
        clearTimeout(entryTimer.current);
        const clean = partNumber.trim();
        const session = leadSession.current;
        if (!clean) { setEntryLoading(false); return; }
        if (duplicatePart(clean)) {
            setErrorMessage(clean + " is already in Procurement.");
            setEntryLoading(false);
            return;
        }
        try {
            await createAndLookupPart(clean);
            if (leadSession.current !== session || entryVersion.current !== version) return;
            setEntryPartNumber("");
            setErrorMessage("");
        } catch (error) {
            if (leadSession.current === session && entryVersion.current === version)
                setErrorMessage(error?.response?.data?.message || error?.response?.data?.error || "Unable to add this part number.");
        } finally {
            if (leadSession.current === session && entryVersion.current === version) setEntryLoading(false);
        }
    };

    const changeEntry = value => {
    setEntryPartNumber(value);
    setErrorMessage("");
};

    const handleBulkLookup = async () => {
        const parts = [...new Set(bulkPartsText.split(/[\r\n,]+/).map(part => part.trim().toUpperCase()).filter(Boolean))];
        if (!parts.length || parts.length > 100) { setErrorMessage("Enter between 1 and 100 part numbers."); return; }
        const fresh = parts.filter(part => !duplicatePart(part));
        if (!fresh.length) { setErrorMessage("These parts are already in Procurement."); return; }
        setBulkLoading(true); setErrorMessage("");
        const session = leadSession.current;
        const failed = [];
        for (const part of fresh) {
            if (leadSession.current !== session) return;
            try { await createAndLookupPart(part); }
            catch (error) {
                failed.push(part);
                if (leadSession.current === session)
                    setErrorMessage(error?.response?.data?.message || error?.response?.data?.error || "Unable to add some parts.");
            }
        }
        if (leadSession.current !== session) return;
        setBulkPartsText(failed.join("\n"));
        if (parts.length !== fresh.length) setSuccessMessage("Existing parts were skipped.");
        setBulkLoading(false);
    };

    const handleStatusChange = (itemId, status) => updateDraft(itemId, "availabilityStatus", status);

    const validateDraft = (draft, lookup) => {
        if (!draft.partNumber?.trim()) return "Part Number is required.";
        if (!Number.isInteger(Number(draft.requestedQuantity)) || Number(draft.requestedQuantity) < 1)
            return "Requested quantity must be a positive integer.";
        if (!draft.availabilityStatus) return "Availability status is required.";
        if (!draft.procurementSource) return "Select a procurement source.";
        if (draft.quotedMrp !== "" && (!Number.isFinite(Number(draft.quotedMrp)) || Number(draft.quotedMrp) <= 0))
            return "MRP must be greater than zero.";
        if (draft.availabilityStatus !== "NOT_AVAILABLE" && !(Number(draft.quotedMrp || lookup?.mrp) > 0))
            return "MRP is required for this availability status.";
        if (draft.procurementSource === "VENDOR" && !draft.vendorStockItemId) return "Select a vendor.";
        if (draft.availabilityStatus === "ESTIMATED") {
            if (!draft.estimatedAvailabilityDate) return "Estimated availability date is required.";
            if (draft.estimatedAvailabilityDate < todayDate()) return "Estimated availability date cannot be in the past.";
        }
        return "";
    };

    const saveItem = async (item) => {
        const draft = itemDrafts[item.id] || getItemInitialState(item);
        const validation = validateDraft(draft, lookupResults[item.id]);
        if (validation) {
            setItemErrors(current => ({ ...current, [item.id]: validation }));
             onToast?.(validation, "error");
            return false;
        }
        try {
            const payload = {
                partNumber: draft.partNumber.trim(), requestedQuantity: Number(draft.requestedQuantity),
                productName: draft.productName?.trim() || null, brandName: draft.brandName?.trim() || null,
                hsnCode: draft.hsnCode?.trim() || null, quotedMrp: draft.quotedMrp === "" ? null : Number(draft.quotedMrp),
                availabilityStatus: draft.availabilityStatus, procurementSource: draft.procurementSource,
                vendorStockItemId: draft.procurementSource === "VENDOR" ? Number(draft.vendorStockItemId) : null,
                estimatedAvailabilityDate: draft.availabilityStatus === "ESTIMATED" ? draft.estimatedAvailabilityDate : null,
                notes: draft.notes?.trim() || null
            };
            const response = item.rawRequirement
                ? await identifyCustomerRequirement(procurementLead.id, item.changeId, payload)
                : await saveLeadItemProcurement(procurementLead.id, item.id, payload);
            const saved = procurementWork(response).find(row => item.changeId ? row.changeId === item.changeId : row.id === item.id);
            setProcurementLead(response);
            setItems(current => current.map(row => row.id === item.id ? saved : row));
            setItemDrafts(current => {
                const next = { ...current }; delete next[item.id];
                return { ...next, [saved.id]: getItemInitialState(saved) };
            });
            setSavedItems(current => ({ ...current, [saved.id]: true }));
            setItemErrors(current => ({ ...current, [item.id]: "" }));
            return true;
        } catch (error) {
            setItemErrors(current => ({ ...current, [item.id]: error?.response?.data?.message || error?.response?.data?.error || "Unable to save this row." }));
            return false;
        }
    };

   const handleSaveAll = async () => {
    setSavingItemId("ALL");
    setSuccessMessage("");
    try {
        let success = true;
        for (const item of items) {
            if (!(await saveItem(item))) success = false;
        }

        if (!success) {
            setErrorMessage("Please fix the highlighted rows.");
            onToast?.("Please fix the highlighted rows.", "error");
            return;
        }

        setSuccessMessage("Procurement saved.");

        // NEW → PROCUREMENT transition
        if (procurementLead?.status === "NEW" && items.length > 0) {
            try {
                await updateLeadStatus(procurementLead.id, "PROCUREMENT");
                onToast?.(
                    `${leadNumber} added to Procurement`,
                    "success"
                );
            } catch (err) {
                console.warn("Unable to move lead to PROCUREMENT:", err);
                onToast?.(
                    "Saved, but unable to move lead to Procurement.",
                    "error"
                );
            }
        } else {
            onToast?.("Procurement saved.", "success");
        }

        onUpdated?.();
        onClose?.();
    } catch (err) {
        onToast?.("Unexpected error while saving.", "error");
    } finally {
        setSavingItemId(null);
    }
};
const deleteItem = async (item) => {
    if (!item?.id || item.rawRequirement) return;
    if (savingItemId !== null || completing) return;
    if (
        !window.confirm(
            `Remove ${item.partNumber || "this item"} from Procurement?`
        )
    )
        return;

    setSavingItemId(item.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
        const response = await deleteLeadProcurementItem(
            procurementLead?.id || lead?.id,
            item.id
        );

        const records = procurementWork(response);
        setProcurementLead(response);
        setItems(records);
        setItemDrafts((current) =>
            Object.fromEntries(
                records.map((row) => [
                    row.id,
                    current[row.id] || getItemInitialState(row),
                ])
            )
        );
        setSavedItems((current) =>
            Object.fromEntries(
                records.map((row) => [
                    row.id,
                    current[row.id] ??
                        Boolean(
                            row.requestedQuantity > 0 &&
                                row.availabilityStatus &&
                                row.procurementSource
                        ),
                ])
            )
        );
        lookupVersions.current[item.id] =
            (lookupVersions.current[item.id] || 0) + 1;
        clearTimeout(lookupTimers.current[item.id]);

        onUpdated?.(response);
        setSuccessMessage("Procurement item deleted.");
        onToast?.(
            `${item.partNumber || "Item"} removed from Procurement`,
            "success"
        );
    } catch (error) {
        const msg =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Unable to delete this item.";
        setErrorMessage(msg);
        onToast?.(msg, "error");
    } finally {
        setSavingItemId(null);
    }
};
    const handleCompleteProcurement = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (
        !allItemsSaved ||
        creatingItems > 0 ||
        entryLoading ||
        bulkLoading ||
        entryPartNumber.trim() ||
        bulkPartsText.trim()
    ) {
        setErrorMessage(
            "Save procurement details for every item before completing procurement."
        );
        onToast?.("Save every item before completing procurement.", "error");
        return;
    }

    setCompleting(true);

    try {
        const response = await completeLeadProcurement(
            procurementLead?.id || lead?.id
        );

        if (response) {
            setProcurementLead(response);
            onUpdated?.(response);
            const refreshed = await getLeadById(response.id);
            setProcurementLead(refreshed);
            onUpdated?.(refreshed);
        }

        setSuccessMessage("Procurement completed successfully.");
        onToast?.(
            `${leadNumber} moved to Customer Follow-up`,
            "success"
        );
    } catch (error) {
        console.error("Unable to complete procurement:", error);
        const msg =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Unable to complete procurement.";
        setErrorMessage(msg);
        onToast?.(msg, "error");
    } finally {
        setCompleting(false);
    }
};

    /* ---- UI-only handlers ---- */
    const shownCustomer = {
        name: customerEdits.name ?? customerName,
        phone: customerEdits.phone ?? customerPhone,
        salesperson: customerEdits.salesperson ?? salespersonName,
    };

    const toggleCustomerEdit = () => {
        if (editingCustomer && Object.keys(customerEdits).length > 0) {
            // Optional hook: parent can persist these values. Nothing is saved here.
            onCustomerEdit?.({
                customerName: shownCustomer.name,
                customerPhone: shownCustomer.phone,
                salespersonName: shownCustomer.salesperson,
            });
        }
        setEditingCustomer((current) => !current);
    };

    const updateCustomerEdit = (field, value) =>
        setCustomerEdits((current) => ({ ...current, [field]: value }));

    const logActivity = () => {
        const text = activityText.trim();
        if (!text) return;
        setActivities((current) => [
            { id: `${Date.now()}-${Math.random()}`, type: activityType, text, at: new Date() },
            ...current,
        ]);
        setActivityText("");
    };

    const rawStatus = String(procurementLead?.status || lead?.status || "").toUpperCase();
    const derivedStage =
        rawStatus === "PROCUREMENT_COMPLETED" || rawStatus === "FOLLOWUP"
            ? "FOLLOW_UP"
            : PIPELINE_STAGES.some((stage) => stage.key === rawStatus)
            ? rawStatus
            : "NEW";
    const currentStage = pipeline.stage ?? derivedStage;

    const assigneeOptions = useMemo(() => {
        const list = Array.isArray(assignees) && assignees.length
            ? assignees
            : salespersonName !== "Salesperson not assigned"
            ? [salespersonName]
            : [];
        return list;
    }, [assignees, salespersonName]);
    const currentAssignee = pipeline.assignedTo ?? (assigneeOptions[0] || "");

    const trail = useMemo(() => {
        const entries = [...activities];
        const created = procurementLead?.createdAt;
        if (created) {
            entries.push({
                id: "system-created",
                type: "System",
                text: `${leadNumber} created`,
                at: created,
            });
        }
        return entries;
    }, [activities, procurementLead?.createdAt, leadNumber]);

    const renderEditableRow = (item, index) => {
        const itemId = item?.id;
        const draft =
            itemDrafts[itemId] ||
            getItemInitialState(item);
        const lookupResult =
            getEffectiveLookupResult(item);
        const vendorOptions = Array.isArray(
            lookupResult?.vendorOptions
        )
            ? lookupResult.vendorOptions
            : [];
        const availableQuantity = Number(
            lookupResult?.availableQuantity ?? 0
        );
        const isLookingUp = Boolean(
            lookupLoading[itemId]
        );
        const itemError = itemErrors[itemId];
        const lookupError = lookupErrors[itemId];

        const productFound =
            lookupResult?.foundInCatalogue === true || Boolean(draft.productItemId || draft.localProductId);

        return (
            <tr key={itemId || index} className={itemError ? "has-error" : ""}>
                <td className="pd-td pd-td-part">
                    <input className="pd-input" aria-label={`Part number ${index + 1}`}
                        value={draft.partNumber} onChange={event => updateDraft(itemId, "partNumber", event.target.value)}
                        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); lookupItem(item); } }} />

                    {lookupResult?.foundInCatalogue === false ? (
                        <span className="pd-stock pd-stock--new">New item</span>
                    ) : (
                        <span
                            className={`pd-stock ${
                                availableQuantity > 0 ? "pd-stock--ok" : "pd-stock--idle"
                            }`}
                        >
                            {lookupResult ? `Available: ${availableQuantity}` : "Waiting for lookup"}
                        </span>
                    )}

                    {isLookingUp && (
                        <span className="pd-inline-loading">
                            <Loader2 size={11} className="spin" />
                            Checking...
                        </span>
                    )}

                    {lookupError && <span className="pd-cell-error">{lookupError}</span>}
                    {itemError && <span className="pd-cell-error">{itemError}</span>}
                </td>

                <td className="pd-td">
                    {productFound ? (
                        <strong className="pd-product-name">
                            {lookupResult?.productName ||
                                draft.productName ||
                                "—"}
                        </strong>
                    ) : (
                        <input
                            className="pd-input"
                            aria-label={`Part name ${index + 1}`}
                            value={draft.productName || ""}
                            onChange={(event) =>
                                updateDraft(itemId, "productName", event.target.value)
                            }
                            placeholder="New product name"
                        />
                    )}
                </td>

                <td className="pd-td">
                    <input
                        className="pd-input"
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`MRP ${index + 1}`}
                        readOnly={Boolean(lookupResult?.mrp)}
                        value={draft.quotedMrp}
                        onChange={(event) =>
                            updateDraft(itemId, "quotedMrp", event.target.value)
                        }
                    />
                </td>

                <td className="pd-td">
                    <input className="pd-input pd-input--qty" type="number" min="1" step="1"
                        aria-label={`Requested quantity ${index + 1}`} value={draft.requestedQuantity}
                        onChange={event => updateDraft(itemId, "requestedQuantity", event.target.value)} />
                </td>

                <td className="pd-td pd-td-source">
                    <ProcurementSourceSelect
                        draft={draft}
                        vendors={vendorOptions}
                        savedVendorName={item.selectedVendorName}
                        index={index}
                        onChange={(value) =>
                            updateDraft(itemId, "sourceSelection", value)
                        }
                    />
                </td>

                <td className="pd-td">
                    <select
                        aria-label={`Availability ${index + 1}`}
                        value={draft.availabilityStatus || ""}
                        onChange={(event) =>
                            handleStatusChange(itemId, event.target.value)
                        }
                        className="pd-input pd-select"
                    >
                        <option value="">Select status</option>
                        <option value="AVAILABLE">Available</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="ESTIMATED">Estimation</option>
                        <option value="NOT_AVAILABLE">Not Available</option>
                    </select>
                </td>

                <td className="pd-td">
                    {draft.availabilityStatus ===
                    AVAILABILITY_STATUS.ESTIMATED ? (
                        <input
                            className="pd-input"
                            type="date"
                            min={todayDate()}
                            aria-label={`Estimated date ${index + 1}`}
                            value={draft.estimatedAvailabilityDate || ""}
                            onChange={(event) =>
                                updateDraft(
                                    itemId,
                                    "estimatedAvailabilityDate",
                                    event.target.value
                                )
                            }
                        />
                    ) : (
                        <span className="pd-dash">—</span>
                    )}
                </td>

                <td className="pd-td pd-td-action">
                    <button
                        type="button"
                        className="pd-row-remove"
                        aria-label={`Remove row ${index + 1}`}
                        title="Remove item"
                        disabled={savingItemId !== null || completing || item.rawRequirement}
                        onClick={() => deleteItem(item)}
                    >
                        <Trash2 size={15} />
                    </button>
                </td>
            </tr>
        );
    };

    const totalInternal = items.filter(
        (item) =>
            itemDrafts[item?.id]?.procurementSource ===
            PROCUREMENT_SOURCES.LOCAL
    ).length;

    const totalVendor = items.filter(
        (item) =>
            itemDrafts[item?.id]?.procurementSource ===
            PROCUREMENT_SOURCES.VENDOR
    ).length;

    const totalNotAvailable = items.filter(
        (item) =>
            itemDrafts[item?.id]?.procurementSource ===
            PROCUREMENT_SOURCES.NOT_AVAILABLE
    ).length;

    const pendingChanges = (procurementLead?.customerChanges || []).filter(
        (change) => change.processingState !== "COMPLETED"
    );

    const entryDisabled =
        loading ||
        !procurementLead ||
        readOnly ||
        savingItemId !== null ||
        completing ||
        bulkLoading;

    return (
        <div className="pd-root">
            <header className="pd-header">
    <div className="pd-header-top">
        <div className="pd-header-title">
            <span className="pd-tag">PROCUREMENT</span>
            <h2>{leadNumber}</h2>
            <span className="pd-badge">{items.length} Items</span>
            <button
                type="button"
                className={`pd-icon-btn pd-edit-toggle${editingCustomer ? " is-active" : ""}`}
                onClick={toggleCustomerEdit}
                aria-pressed={editingCustomer}
                aria-label={editingCustomer ? "Finish editing customer info" : "Edit customer info"}
                title={editingCustomer ? "Done editing" : "Edit customer info"}
            >
                {editingCustomer ? <Check size={15} /> : <Pencil size={14} />}
            </button>
        </div>
        <button type="button" className="pd-icon-btn pd-close" onClick={onClose} aria-label="Close procurement">
            <X size={17} />
        </button>
    </div>
</header>

<section className="pd-details" aria-label="Lead details and assignment">
    <h3 className="pd-details-title">Lead Details &amp; Assignment</h3>
    <div className="pd-details-grid">
        <MetaField label="Customer" value={shownCustomer.name} editing={editingCustomer}
            onChange={(v) => updateCustomerEdit("name", v)} placeholder="Not available" />
        <MetaField label="Mobile" value={shownCustomer.phone} editing={editingCustomer}
            onChange={(v) => updateCustomerEdit("phone", v)} placeholder="Not available" />
        <MetaField label="Salesperson" value={shownCustomer.salesperson} editing={editingCustomer}
            onChange={(v) => updateCustomerEdit("salesperson", v)} placeholder="Not available" />

        <label className="pd-meta-field">
            <span>Lead stage</span>
            <select
                value={currentStage}
                onChange={(e) => setPipeline((c) => ({ ...c, stage: e.target.value }))}
            >
                {PIPELINE_STAGES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                ))}
            </select>
        </label>

        <label className="pd-meta-field">
            <span>Assigned to</span>
            <select
                value={currentAssignee}
                onChange={(e) => setPipeline((c) => ({ ...c, assignedTo: e.target.value }))}
            >
                <option value="">Unassigned</option>
                {assigneeOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                ))}
            </select>
        </label>
    </div>
</section>

            {/* ======================= TABS ======================= */}
            <nav className="pd-tabs" role="tablist" aria-label="Procurement sections">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        className={`pd-tab${activeTab === tab.key ? " is-active" : ""}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                        {tab.key === "items" && <span className="pd-tab-count">{items.length}</span>}
                        {tab.key === "activity" && activities.length > 0 && (
                            <span className="pd-tab-count">{activities.length}</span>
                        )}
                    </button>
                ))}
            </nav>

            {/* ======================= BODY ======================= */}
            <main className="pd-body">
                {errorMessage && <div className="pd-alert pd-alert--error">{errorMessage}</div>}
                {successMessage && <div className="pd-alert pd-alert--success">{successMessage}</div>}

                {/* ---------- TAB 1 · OVERVIEW / ITEMS ---------- */}
                {activeTab === "items" && (
                    <>
                        <SectionCard title="Customer Requirement">
                            <div className="pd-muted-box">{customerRequirement}</div>
                        </SectionCard>

                        {pendingChanges.length > 0 && (
                            <SectionCard
                                title="New / Changed Customer Requirements"
                                meta={<span className="pd-badge pd-badge--warn">{pendingChanges.length}</span>}
                            >
                                <div className="pd-change-list">
                                    {pendingChanges.map((change) => {
                                        const item = (procurementLead.items || []).find((row) => row.id === change.itemId);
                                        return (
                                            <div key={change.id} className="pd-muted-box pd-change">
                                                <strong>
                                                    {change.requestedRequirement || item?.requirement || item?.productName || item?.partNumber}
                                                </strong>
                                                <span>Requested quantity: {change.requestedQuantity}</span>
                                                {change.reason && <span>{change.reason}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </SectionCard>
                        )}

                        <SectionCard title="Add Parts" defaultOpen>
                            <div className="pd-entry-row">
                                {activeEntryTab === "single" && (
                                    <div className="pd-search">
                                        <input
                                            aria-label="Part number search"
                                            value={entryPartNumber}
                                            onChange={(e) => changeEntry(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    setEntryLoading(true);
                                                    lookupEntry(entryPartNumber, ++entryVersion.current);
                                                }
                                            }}
                                            disabled={entryDisabled}
                                            placeholder="Enter part number and press Enter"
                                        />
                                        {entryLoading && <Loader2 size={14} className="spin" />}
                                    </div>
                                )}

                                <div className="pd-segmented">
                                    <button
                                        type="button"
                                        className={activeEntryTab === "single" ? "is-active" : ""}
                                        onClick={() => setActiveEntryTab("single")}
                                    >
                                        Single Part Entry
                                    </button>
                                    <button
                                        type="button"
                                        className={activeEntryTab === "bulk" ? "is-active" : ""}
                                        onClick={() => setActiveEntryTab("bulk")}
                                    >
                                        Paste Multiple Parts
                                    </button>
                                </div>
                            </div>

                            {activeEntryTab === "bulk" && (
                                <div className="pd-bulk">
                                    <textarea
                                        rows={4}
                                        aria-label="Bulk part numbers"
                                        value={bulkPartsText}
                                        onChange={(e) => setBulkPartsText(e.target.value)}
                                        disabled={entryDisabled}
                                        placeholder="One part number per line"
                                    />
                                    <div className="pd-bulk-footer">
                                        <span>Up to 100 part numbers. Duplicates are skipped.</span>
                                        <button
                                            type="button"
                                            className="pd-btn pd-btn--primary pd-btn--sm"
                                            onClick={handleBulkLookup}
                                            disabled={entryDisabled || entryLoading}
                                        >
                                            {bulkLoading ? "Checking..." : "Check Parts"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </SectionCard>

                        <section className="pd-card">
                            <div className="pd-table-head">
                                <div className="pd-table-title">
                                    <h3>Procurement Items</h3>
                                    <span className="pd-badge">{items.length}</span>
                                </div>

                                <div className="pd-chips" aria-label="Procurement summary">
                                    <span className="pd-chip pd-chip--total">
                                        <i />Total <strong>{items.length}</strong>
                                    </span>
                                    <span className="pd-chip pd-chip--d2w">
                                        <i />D2W <strong>{totalInternal}</strong>
                                    </span>
                                    <span className="pd-chip pd-chip--vendor">
                                        <i />Vendor <strong>{totalVendor}</strong>
                                    </span>
                                    <span className="pd-chip pd-chip--na">
                                        <i />Not Available <strong>{totalNotAvailable}</strong>
                                    </span>
                                </div>
                            </div>

                            {loading ? (
                                <div className="pd-state">Loading procurement items...</div>
                            ) : items.length === 0 ? (
                                <div className="pd-state">Enter a part number above to start Procurement.</div>
                            ) : (
                                <div className="pd-table-wrap">
                                    <fieldset
                                        disabled={loading || bulkLoading || readOnly || savingItemId !== null || completing}
                                        className="pd-fieldset"
                                    >
                                        <table className="pd-table">
                                            <colgroup>
                                                <col style={{ width: "17%" }} />
                                                <col style={{ width: "17%" }} />
                                                <col style={{ width: "10%" }} />
                                                <col style={{ width: "8%" }} />
                                                <col style={{ width: "16%" }} />
                                                <col style={{ width: "15%" }} />
                                                <col style={{ width: "13%" }} />
                                                <col style={{ width: "4%" }} />
                                            </colgroup>
                                            <thead>
                                                <tr>
                                                    <th>Part Number</th>
                                                    <th>Part Name</th>
                                                    <th>MRP</th>
                                                    <th>Req. Qty</th>
                                                    <th>Source</th>
                                                    <th>Availability</th>
                                                    <th>Est. Date</th>
                                                    <th aria-label="Actions" />
                                                </tr>
                                            </thead>
                                            <tbody>{items.map(renderEditableRow)}</tbody>
                                        </table>
                                    </fieldset>
                                </div>
                            )}
                        </section>
                    </>
                )}

                {/* ---------- TAB 2 · ACTIVITY & NOTES ---------- */}
                {activeTab === "activity" && (
                    <>
                        <section className="pd-card">
                            <div className="pd-card-static-head">
                                <span className="pd-card-title">Log Activity</span>
                            </div>
                            <div className="pd-card-body">
                                <div className="pd-activity-types" role="radiogroup" aria-label="Activity type">
                                    {ACTIVITY_TYPES.map(({ key, Icon }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            role="radio"
                                            aria-checked={activityType === key}
                                            className={`pd-type-chip pd-type-chip--${key.toLowerCase()}${activityType === key ? " is-active" : ""}`}
                                            onClick={() => setActivityType(key)}
                                        >
                                            <Icon size={13} />
                                            {key}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    className="pd-textarea"
                                    rows={3}
                                    value={activityText}
                                    onChange={(e) => setActivityText(e.target.value)}
                                    placeholder={`Add a ${activityType.toLowerCase()}...`}
                                    aria-label="Activity details"
                                />
                                <div className="pd-activity-actions">
                                    <span className="pd-hint">Kept in this session only until connected to the backend.</span>
                                    <button
                                        type="button"
                                        className="pd-btn pd-btn--primary pd-btn--sm"
                                        onClick={logActivity}
                                        disabled={!activityText.trim()}
                                    >
                                        Log {activityType}
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="pd-card">
                            <div className="pd-card-static-head">
                                <span className="pd-card-title">Activity History</span>
                                <span className="pd-badge">{trail.length}</span>
                            </div>
                            <div className="pd-card-body">
                                {trail.length === 0 ? (
                                    <div className="pd-state pd-state--flat">No activity yet. Log a note, call, email or meeting above.</div>
                                ) : (
                                    <ol className="pd-timeline">
                                        {trail.map((entry) => (
                                            <li key={entry.id} className="pd-timeline-item">
                                                <span className={`pd-timeline-dot pd-timeline-dot--${String(entry.type).toLowerCase()}`} />
                                                <div className="pd-timeline-content">
                                                    <div className="pd-timeline-meta">
                                                        <span className={`pd-type-tag pd-type-tag--${String(entry.type).toLowerCase()}`}>
                                                            {entry.type}
                                                        </span>
                                                        <time>{formatStamp(entry.at)}</time>
                                                    </div>
                                                    <p>{entry.text}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {/* ---------- TAB 3 · PIPELINE & ASSIGNMENT ---------- */}
                {activeTab === "pipeline" && (
                    <>
                        <section className="pd-card">
                            <div className="pd-card-static-head">
                                <span className="pd-card-title">Pipeline Stage</span>
                            </div>
                            <div className="pd-card-body">
                                <div className="pd-stage-row" role="radiogroup" aria-label="Pipeline stage">
                                    {PIPELINE_STAGES.map((stage) => (
                                        <button
                                            key={stage.key}
                                            type="button"
                                            role="radio"
                                            aria-checked={currentStage === stage.key}
                                            className={`pd-stage pd-stage--${stage.key.toLowerCase()}${currentStage === stage.key ? " is-active" : ""}`}
                                            onClick={() => setPipeline((current) => ({ ...current, stage: stage.key }))}
                                        >
                                            {stage.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="pd-card">
                            <div className="pd-card-static-head">
                                <span className="pd-card-title">Assignment & Follow-up</span>
                            </div>
                            <div className="pd-card-body">
                                <div className="pd-form-grid">
                                    <label className="pd-field">
                                        <span>Assigned To</span>
                                        <select
                                            className="pd-input pd-select"
                                            value={currentAssignee}
                                            onChange={(e) => setPipeline((current) => ({ ...current, assignedTo: e.target.value }))}
                                        >
                                            <option value="">Unassigned</option>
                                            {assigneeOptions.map((name) => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </label>

                                    <span className="pd-field-spacer" aria-hidden="true" />

                                    <label className="pd-field">
                                        <span>Follow-up Date</span>
                                        <input
                                            className="pd-input"
                                            type="date"
                                            min={todayDate()}
                                            value={pipeline.followUpDate}
                                            onChange={(e) => setPipeline((current) => ({ ...current, followUpDate: e.target.value }))}
                                        />
                                    </label>

                                    <label className="pd-field">
                                        <span>Follow-up Time</span>
                                        <input
                                            className="pd-input"
                                            type="time"
                                            value={pipeline.followUpTime}
                                            onChange={(e) => setPipeline((current) => ({ ...current, followUpTime: e.target.value }))}
                                        />
                                    </label>
                                </div>
                                <p className="pd-hint pd-hint--block">
                                    Stage, assignee and follow-up schedule are kept in this session only. Use “Move to FollowUp” in the footer to advance the lead.
                                </p>
                            </div>
                        </section>
                    </>
                )}
            </main>

            {/* ======================= FOOTER ======================= */}
            <footer className="pd-footer">
                <button type="button" className="pd-btn pd-btn--ghost" onClick={onClose}>
                    Close
                </button>

                <div className="pd-footer-primary">
                    <button
                        type="button"
                        className="pd-btn pd-btn--outline"
                        disabled={
                            creatingItems > 0 || entryLoading || bulkLoading || loading || readOnly || completing || savingItemId !== null || Object.values(lookupLoading).some(Boolean) ||
                            items.length === 0
                        }
                        onClick={handleSaveAll}
                    >
                        {savingItemId === "ALL" ? "Saving..." : "Save Procurement"}
                    </button>

                    <button
                        type="button"
                        className="pd-btn pd-btn--primary"
                        disabled={
                            entryPartNumber.trim() !== "" || bulkPartsText.trim() !== "" || creatingItems > 0 || entryLoading || bulkLoading || loading || readOnly || savingItemId !== null || Object.values(lookupLoading).some(Boolean) || completing ||
                            !allItemsSaved ||
                            items.length === 0
                        }
                        onClick={handleCompleteProcurement}
                    >
                        {completing ? "Completing..." : "Move to FollowUp"}
                    </button>
                </div>
            </footer>
        </div>
    );
}

export default LeadProcurementDrawer;
