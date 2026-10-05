import { useEffect, useMemo, useRef, useState } from "react";
import {
    Loader2,
    Trash2,
    X,
} from "lucide-react";

import {
    completeLeadProcurement,
    getLeadById,
    addProcurementItem,
    lookupLeadItemProduct,
    saveLeadItemProcurement,
} from "../../../services/leadService";

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

function LeadProcurementDrawer({ lead, onClose, onUpdated }) {
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
    const readOnly = Boolean(procurementLead && procurementLead.status !== "NEW");

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
                const records = response.items || [];
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
                    Boolean(item.partNumber && item.requestedQuantity > 0 && item.availabilityStatus && item.procurementSource)])));
                // Refresh facts without overwriting saved source, availability, quantity or vendor.
                for (const item of records) {
                    if (!item.id || !item.partNumber) continue;
                    const version = (versions[item.id] || 0) + 1;
                    versions[item.id] = version;
                    setLookupLoading(current => ({ ...current, [item.id]: true }));
                    lookupLeadItemProduct(response.id, item.id, item.partNumber).then(result => {
                        if (cancelled || versions[item.id] !== version) return;
                        setLookupResults(current => ({ ...current, [item.id]: result }));
                        setItemDrafts(current => ({ ...current, [item.id]: {
                            ...current[item.id], productName: result.productName || current[item.id].productName,
                            brandName: result.brandname || current[item.id].brandName,
                            hsnCode: result.hsnCode || current[item.id].hsnCode,
                            productItemId: result.productItemId ?? null, localProductId: result.localProductId ?? null,
                            quotedMrp: current[item.id].quotedMrp !== "" ? current[item.id].quotedMrp : result.mrp ?? ""
                        }}));
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
        if (field === "partNumber" && Object.entries(draftRef.current).some(([id, draft]) =>
                id !== String(itemId) && draft.partNumber.trim().toUpperCase() === value.trim().toUpperCase())) {
            setItemErrors(current => ({ ...current, [itemId]: "This part number is already in Procurement." }));
            return;
        }
        setSavedItems(current => ({ ...current, [itemId]: false }));
        setItemErrors(current => ({ ...current, [itemId]: "" }));
        setSuccessMessage("");
        if (field === "partNumber") {
            lookupVersions.current[itemId] = (lookupVersions.current[itemId] || 0) + 1;
            clearTimeout(lookupTimers.current[itemId]);
            setLookupResults(current => ({ ...current, [itemId]: null }));
            setLookupErrors(current => ({ ...current, [itemId]: "" }));
            setLookupLoading(current => ({ ...current, [itemId]: Boolean(value.trim()) }));
            setItemDrafts(current => ({ ...current, [itemId]: {
                ...current[itemId], partNumber: value, productName: "", brandName: "", hsnCode: "",
                productItemId: null, localProductId: null, quotedMrp: "", procurementSource: "",
                availabilityStatus: "", vendorStockItemId: "", estimatedAvailabilityDate: ""
            }}));
            if (value.trim()) lookupTimers.current[itemId] = setTimeout(() => {
                lookupItem({ id: itemId }, value);
            }, 400);
            return;
        }
        setItemDrafts(current => ({ ...current, [itemId]: {
            ...current[itemId], [field]: value,
            ...(field === "procurementSource" && value !== "VENDOR" ? { vendorStockItemId: "" } : {}),
            ...(field === "availabilityStatus" && value !== "ESTIMATED" ? { estimatedAvailabilityDate: "" } : {})
        }}));
    };

    const applyLookupToDraft = (itemId, result) => {
        setSavedItems(current => ({ ...current, [itemId]: false }));
        setItemDrafts(current => ({ ...current, [itemId]: {
            ...current[itemId], productName: result.productName || "", brandName: result.brandname || "",
            hsnCode: result.hsnCode || "", productItemId: result.productItemId ?? null,
            localProductId: result.localProductId ?? null,
            quotedMrp: result.mrp ?? current[itemId]?.quotedMrp ?? ""
        }}));
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
            const result = await lookupLeadItemProduct(
                procurementLead?.id || lead?.id,
                item.id,
                partNumber
            );

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
        clearTimeout(entryTimer.current);
        const version = ++entryVersion.current;
        setEntryLoading(Boolean(value.trim()));
        if (value.trim()) entryTimer.current = setTimeout(() => lookupEntry(value, version), 400);
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
            return false;
        }
        try {
            const response = await saveLeadItemProcurement(procurementLead.id, item.id, {
                partNumber: draft.partNumber.trim(), requestedQuantity: Number(draft.requestedQuantity),
                productName: draft.productName?.trim() || null, brandName: draft.brandName?.trim() || null,
                hsnCode: draft.hsnCode?.trim() || null, quotedMrp: draft.quotedMrp === "" ? null : Number(draft.quotedMrp),
                availabilityStatus: draft.availabilityStatus, procurementSource: draft.procurementSource,
                vendorStockItemId: draft.procurementSource === "VENDOR" ? Number(draft.vendorStockItemId) : null,
                estimatedAvailabilityDate: draft.availabilityStatus === "ESTIMATED" ? draft.estimatedAvailabilityDate : null,
                notes: draft.notes?.trim() || null
            });
            const saved = response.items.find(row => row.id === item.id);
            setItems(current => current.map(row => row.id === item.id ? saved : row));
            setItemDrafts(current => ({ ...current, [item.id]: getItemInitialState(saved) }));
            setSavedItems(current => ({ ...current, [item.id]: true }));
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
            for (const item of items) if (!await saveItem(item)) success = false;
            if (success) setSuccessMessage("All procurement items saved successfully.");
        } finally { setSavingItemId(null); }
    };

    const handleCompleteProcurement = async () => {
        setErrorMessage("");
        setSuccessMessage("");

        if (!allItemsSaved || creatingItems > 0 || entryLoading || bulkLoading || entryPartNumber.trim() || bulkPartsText.trim()) {
            setErrorMessage(
                "Save procurement details for every item before completing procurement."
            );
            return;
        }

        setCompleting(true);

        try {
            const response =
                await completeLeadProcurement(
                    procurementLead?.id || lead?.id
                );

            if (response) {
                setProcurementLead(response);
                onUpdated?.(response);
                const refreshed = await getLeadById(response.id);
                setProcurementLead(refreshed);
                onUpdated?.(refreshed);
            }

            setSuccessMessage(
                "Procurement completed successfully."
            );
        } catch (error) {
            console.error(
                "Unable to complete procurement:",
                error
            );

            setErrorMessage(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to complete procurement."
            );
        } finally {
            setCompleting(false);
        }
    };

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
            <tr key={itemId || index}>
                <td className="procurement-table-part">
                    <input className="procurement-table-input" aria-label={`Part number ${index + 1}`}
                        value={draft.partNumber} onChange={event => updateDraft(itemId, "partNumber", event.target.value)}
                        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); lookupItem(item); } }} />

                    {lookupResult?.foundInCatalogue === false ? (
                        <span className="procurement-new-availability">
                            New item
                        </span>
                    ) : (
                        <span
                            className={`procurement-availability-line ${
                                availableQuantity > 0
                                    ? "available"
                                    : "neutral"
                            }`}
                        >
                            {lookupResult ? `Available: ${availableQuantity}` : "Waiting for lookup"}
                        </span>
                    )}

                    {isLookingUp && (
                        <span className="procurement-inline-loading">
                            <Loader2 size={11} />
                            Checking...
                        </span>
                    )}

                    {lookupError && (
                        <span className="procurement-table-error">
                            {lookupError}
                        </span>
                    )}

                    {itemError && (
                        <span className="procurement-table-error">
                            {itemError}
                        </span>
                    )}
                </td>

                <td className="procurement-table-name">
                    {productFound ? (
                        <strong>
                            {lookupResult?.productName ||
                                draft.productName ||
                                "—"}
                        </strong>
                    ) : (
                        <input
                            className="procurement-table-input"
                            aria-label={`Part name ${index + 1}`}
                            value={draft.productName || ""}
                            onChange={(event) =>
                                updateDraft(
                                    itemId,
                                    "productName",
                                    event.target.value
                                )
                            }
                            placeholder="New product name"
                        />
                    )}

                    {!productFound && lookupResult && (
                        <span className="procurement-new-label">
                            New product
                        </span>
                    )}
                </td>



                <td className="procurement-table-mrp">
                    <input
                        className="procurement-table-input"
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`MRP ${index + 1}`}
                        readOnly={Boolean(lookupResult?.mrp)}
                        value={draft.quotedMrp}
                        onChange={(event) =>
                            updateDraft(
                                itemId,
                                "quotedMrp",
                                event.target.value
                            )
                        }
                    />
                </td>
                <td className="procurement-table-qty-cell">
                    <input className="procurement-table-input qty" type="number" min="1" step="1"
                        aria-label={`Requested quantity ${index + 1}`} value={draft.requestedQuantity}
                        onChange={event => updateDraft(itemId, "requestedQuantity", event.target.value)} />
                </td>
                <td className="procurement-table-source">
                    <select className="procurement-table-subselect" aria-label={`Source ${index+1}`}
                        value={draft.procurementSource}
                        onChange={event => updateDraft(itemId, "procurementSource", event.target.value)}>
                        <option value="">Select source</option>
                        <option value="LOCAL">D2W</option>
                        <option value="VENDOR">Vendor</option>
                        <option value="NEW">New</option>
                        <option value="NOT_AVAILABLE">Not Available</option>
                    </select>
                    {lookupResult && <span className="procurement-muted">D2W Stock: {availableQuantity} · Reserved: {lookupResult.reservedQuantity ?? 0}</span>}
                    {draft.procurementSource === "VENDOR" && <select className="procurement-table-subselect"
                        aria-label={`Vendor ${index+1}`} value={draft.vendorStockItemId}
                        onChange={event => updateDraft(itemId,"vendorStockItemId",event.target.value)}>
                        <option value="">Select vendor</option>
                        {item.selectedVendorStockItemId && item.selectedVendorName &&
                            !vendorOptions.some(vendor => String(getVendorStockItemId(vendor)) === String(item.selectedVendorStockItemId)) &&
                            <option value={item.selectedVendorStockItemId}>{item.selectedVendorName} — Saved availability: {item.vendorAvailableQuantity ?? 0}</option>}
                        {vendorOptions.map(vendor => <option key={getVendorStockItemId(vendor)}
                            value={getVendorStockItemId(vendor)}>{getVendorName(vendor)} — Available: {getVendorQuantity(vendor)}</option>)}
                    </select>}
                </td>

                <td className="procurement-table-availability">
                    <select
                        aria-label={`Availability ${index + 1}`}
                        value={draft.availabilityStatus || ""}
                        onChange={(event) =>
                            handleStatusChange(
                                itemId,
                                event.target.value
                            )
                        }
                        className="procurement-table-subselect"
                    >
                        <option value="">
                            Select status
                        </option>
                        <option value="AVAILABLE">
                            Available
                        </option>
                        <option value="PARTIAL">
                            Partial
                        </option>
                        <option value="ESTIMATED">
                            Estimation
                        </option>
                        <option value="NOT_AVAILABLE">
                            Not Available
                        </option>
                    </select>
                </td>

                <td className="procurement-table-estimated-date">
                    {draft.availabilityStatus ===
                    AVAILABILITY_STATUS.ESTIMATED ? (
                        <input
                            className="procurement-table-input"
                            type="date"
                            min={todayDate()}
                            aria-label={`Estimated date ${index + 1}`}
                            value={
                                draft.estimatedAvailabilityDate || ""
                            }
                            onChange={(event) =>
                                updateDraft(
                                    itemId,
                                    "estimatedAvailabilityDate",
                                    event.target.value
                                )
                            }
                        />
                    ) : (
                        <span className="procurement-muted">
                            —
                        </span>
                    )}
                </td>
                <td><button type="button" className="procurement-table-remove" aria-label={`Remove row ${index + 1}`}
                    title="Persisted LeadItems cannot be removed" disabled><Trash2 size={16} /></button></td>
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

    return (
        <div className="procurement-drawer-content">
            <header className="procurement-drawer-header">
                <div className="procurement-header-main">
                    <div className="procurement-drawer-eyebrow">
                        PROCUREMENT
                    </div>

                    <div className="procurement-header-title-row">
                        <h2>{leadNumber}</h2>

                        <span className="procurement-header-status">
                            {items.length} Items
                        </span>
                    </div>

                    <div className="procurement-customer-meta">
                        <label className="procurement-meta-field">
                            <span>Customer</span>
                            <input
                                type="text"
                                value={customerName}
                                readOnly
                                placeholder="Not available"
                            />
                        </label>
                        <label className="procurement-meta-field">
                            <span>Mobile</span>
                            <input
                                type="text"
                                value={customerPhone}
                                readOnly
                                placeholder="Not available"
                            />
                        </label>
                        <label className="procurement-meta-field">
                            <span>Salesperson</span>
                            <input
                                type="text"
                                value={salespersonName}
                                readOnly
                                placeholder="Not available"
                            />
                        </label>
                    </div>
                </div>

                <button
                    type="button"
                    className="procurement-drawer-close"
                    onClick={onClose}
                    aria-label="Close procurement"
                >
                    <X size={17} />
                </button>
            </header>

            <main className="procurement-drawer-body">
                <section className="procurement-requirement-panel">
                    <div className="procurement-panel-label">
                        Customer Requirement
                    </div>

                    <div className="procurement-requirement-text">
                        {customerRequirement}
                    </div>
                </section>

                <section className="procurement-entry-panel">
    <div className="procurement-entry-row-top">
        {activeEntryTab === "single" && (
            <div className="procurement-entry-input">
                <input
                    aria-label="Part number search"
                    value={entryPartNumber}
                    onChange={(e) => changeEntry(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            setEntryLoading(true);
                            lookupEntry(
                                entryPartNumber,
                                ++entryVersion.current
                            );
                        }
                    }}
                    disabled={
                        loading ||
                        !procurementLead ||
                        readOnly ||
                        savingItemId !== null ||
                        completing ||
                        bulkLoading
                    }
                    placeholder="Enter part number"
                />
                {entryLoading && <Loader2 size={14} className="spin" />}
            </div>
        )}

        <div className="procurement-entry-tabs">
            <button
                type="button"
                className={activeEntryTab === "single" ? "active" : ""}
                onClick={() => setActiveEntryTab("single")}
            >
                Single Part Entry
            </button>
            <button
                type="button"
                className={activeEntryTab === "bulk" ? "active" : ""}
                onClick={() => setActiveEntryTab("bulk")}
            >
                Paste Multiple Parts
            </button>
        </div>
    </div>

    {activeEntryTab === "bulk" && (
        <div className="procurement-bulk-entry">
            <textarea
                rows={4}
                aria-label="Bulk part numbers"
                value={bulkPartsText}
                onChange={(e) => setBulkPartsText(e.target.value)}
                disabled={
                    loading ||
                    !procurementLead ||
                    readOnly ||
                    savingItemId !== null ||
                    completing ||
                    bulkLoading
                }
                placeholder="One part number per line"
            />
            <div className="procurement-bulk-footer">
                <span>
                    Up to 100 part numbers. Duplicates are skipped.
                </span>
                <button
                    type="button"
                    onClick={handleBulkLookup}
                    disabled={
                        loading ||
                        !procurementLead ||
                        readOnly ||
                        savingItemId !== null ||
                        completing ||
                        bulkLoading ||
                        entryLoading
                    }
                >
                    {bulkLoading ? "Checking..." : "Check Parts"}
                </button>
            </div>
        </div>
    )}
</section>

                {errorMessage && (
                    <div className="procurement-message error">
                        {errorMessage}
                    </div>
                )}

                {successMessage && (
                    <div className="procurement-message success">
                        {successMessage}
                    </div>
                )}

                <section className="procurement-table-section">
                    <div className="procurement-table-heading">
                        <div>
                            <h3>Procurement Items</h3>
                            <span>
                                Review stock facts, then choose source, availability and a vendor when needed.
                            </span>
                        </div>

                        <span className="procurement-table-count">
                            {items.length}
                        </span>
                    </div>

                    {loading ? (
                        <div className="procurement-table-state">
                            Loading procurement items...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="procurement-table-state">
                            Enter a part number above to start Procurement.
                        </div>
                    ) : (
                        <div className="procurement-table-wrap">
                            <fieldset disabled={loading || bulkLoading || readOnly || savingItemId !== null || completing} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}><table className="procurement-table">
                                <thead>
                                    <tr>
                                        <th>Part Number</th>
                                        <th>Part Name</th>
                                        <th>MRP</th>
                                        <th>Requested Qty</th>
                                        <th>Source</th>
                                        <th>Availability</th>
                                        <th>Estimated Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {items.map(renderEditableRow)}
                                </tbody>
                            </table></fieldset>
                        </div>
                    )}
                </section>
            </main>

            <div className="procurement-summary-bar">
                <div>
                    <span>Total</span>
                    <strong>{items.length}</strong>
                </div>

                <div className="internal">
                    <span>D2W</span>
                    <strong>{totalInternal}</strong>
                </div>

                <div className="vendor">
                    <span>Vendor</span>
                    <strong>{totalVendor}</strong>
                </div>

                <div className="not-available">
                    <span>Not Available</span>
                    <strong>{totalNotAvailable}</strong>
                </div>
            </div>

            <footer className="procurement-drawer-footer">
                <button
                    type="button"
                    className="procurement-cancel-btn"
                    onClick={onClose}
                >
                    Close
                </button>

                <button
                    type="button"
                    className="procurement-save-all-btn"
                    disabled={
                        creatingItems > 0 || entryLoading || bulkLoading || loading || readOnly || completing || savingItemId !== null || Object.values(lookupLoading).some(Boolean) ||
                        items.length === 0
                    }
                    onClick={handleSaveAll}
                >
                    {savingItemId === "ALL"
                        ? "Saving..."
                        : "Save Procurement"}
                </button>

                <button
                    type="button"
                    className="procurement-complete-btn"
                    disabled={
                        entryPartNumber.trim() !== "" || bulkPartsText.trim() !== "" || creatingItems > 0 || entryLoading || bulkLoading || loading || readOnly || savingItemId !== null || Object.values(lookupLoading).some(Boolean) || completing ||
                        !allItemsSaved ||
                        items.length === 0
                    }
                    onClick={handleCompleteProcurement}
                >
                    {completing
                        ? "Completing..."
                        : "Complete Procurement"}
                </button>
            </footer>
        </div>
    );
}

export default LeadProcurementDrawer;
