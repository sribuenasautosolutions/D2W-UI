import { useEffect, useMemo, useRef, useState } from "react";
import {
    Loader2,
} from "lucide-react";

import {
    completeLeadProcurement,
    getLeadById,
    addProcurementItem,
    lookupLeadItemProduct,
    saveLeadItemProcurement,
    lookupProcurementProduct,
    identifyCustomerRequirement,
    bulkLookupProcurementProducts,
    deleteLeadProcurementItem,
} from "../../../services/leadService";

import "./LeadProcurementDrawer.css";
import { procurementWork } from "./leadWorkflowUtils";
import ProcurementSourceSelect from "./ProcurementSourceSelect";
import { applyProcurementLookup, formatMrp, procurementTotal, procurementSummary } from "./procurementUiUtils";

const AVAILABILITY_STATUS = {
    AVAILABLE: "AVAILABLE",
    PARTIAL: "PARTIAL",
    ESTIMATED: "ESTIMATED",
    NOT_AVAILABLE: "NOT_AVAILABLE",
};


function toNumberOrEmpty(value) {
    if (value === null || value === undefined || value === "") return "";
    const number = Number(value);
    return Number.isFinite(number) ? number : "";
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

function LeadProcurementTable({ lead, onUpdated, mode = "PROCUREMENT", editing = false, decisionDrafts = {}, onDecisionEdit, onRequestChange, disabled = false, onClose }) {
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
    const leadSession = useRef(0);
    const pendingCreations = useRef({});
    const draftRef = useRef({});
    draftRef.current = itemDrafts;
    const [activeEntryTab, setActiveEntryTab] = useState("single");
    const lookupVersions = useRef({});
    const lookupTimers = useRef({});
    const returning = procurementLead?.status === "PROCUREMENT" && (procurementLead.customerChanges || []).some(change => change.processingState !== "COMPLETED");
    const readOnly = Boolean(procurementLead && !["NEW", "PROCUREMENT"].includes(procurementLead.status));

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
                    item.customerChange ? item.customerChange.processingState === "READY" : Boolean(item.partNumber && item.requestedQuantity > 0 && item.availabilityStatus && item.procurementSource)])));
                // Refresh facts without overwriting saved source, availability, quantity or vendor.
                for (const item of mode === "FOLLOW_UP" ? [] : records) {
                    if (!item.id || !item.partNumber) continue;
                    const version = (versions[item.id] || 0) + 1;
                    versions[item.id] = version;
                    setLookupLoading(current => ({ ...current, [item.id]: true }));
                    lookupLeadItemProduct(response.id, item.id, item.partNumber).then(result => {
                        if (cancelled || versions[item.id] !== version) return;
                        setLookupResults(current => ({ ...current, [item.id]: result }));
                        setItemDrafts(current => ({ ...current, [item.id]: {
                            ...applyProcurementLookup(current[item.id], result),
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
            Object.values(timers).forEach(clearTimeout);
            Object.keys(versions).forEach(id => { versions[id] += 1; });
        };
    }, [lead?.id, mode]);






    const allItemsSaved = useMemo(() => {
        if (items.length === 0) return false;
        return items.every((item) => Boolean(savedItems[item?.id]));
    }, [items, savedItems]);

    const updateDraft = (itemId, field, value) => {
        if (field === "sourceSelection") {
            setSavedItems(current => ({ ...current, [itemId]: false }));
            setItemErrors(current => ({ ...current, [itemId]: "" }));
            setSuccessMessage("");
            setItemDrafts(current => ({ ...current, [itemId]: { ...current[itemId],
                procurementSource: value.startsWith("vendor:") ? "VENDOR" : value,
                vendorStockItemId: value.startsWith("vendor:") ? value.slice(7) : "" } }));
            return;
        }
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
        setItemDrafts(current => ({ ...current, [itemId]: applyProcurementLookup(current[itemId] || {}, result) }));
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
            const result = String(item.id).startsWith("new-")
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

    const createAndLookupPart = async (partNumber, facts = null) => {
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
        if (facts) { setLookupResults(current => ({ ...current, [item.id]: facts })); applyLookupToDraft(item.id, facts); }
        else await lookupItem(item, item.partNumber || clean);
    };

    const lookupEntry = async (partNumber, version) => {
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

    // CHANGE 1: typing only updates the text. The request is sent ONLY when Enter is pressed.
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
        let results;
        try { results = (await bulkLookupProcurementProducts(lead.id, fresh)).items; }
        catch (error) { if (leadSession.current === session) { setErrorMessage(error?.response?.data?.message || "Bulk lookup failed."); setBulkLoading(false); } return; }
        for (const part of fresh) {
            if (leadSession.current !== session) return;
            try {
                const result = results.find(row => row.partNumber.toUpperCase() === part);
                if (result?.error) throw new Error(result.error);
                await createAndLookupPart(part, result?.lookup);
            }
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

    const deleteItem = async item => {
        if (savingItemId !== null) return;
        setSavingItemId(item.id); setErrorMessage(""); setSuccessMessage("");
        try {
            const response = await deleteLeadProcurementItem(lead.id, item.id);
            const records = procurementWork(response);
            setProcurementLead(response); setItems(records);
            setItemDrafts(current => Object.fromEntries(records.map(row => [row.id, current[row.id] || getItemInitialState(row)])));
            setSavedItems(current => Object.fromEntries(records.map(row => [row.id, current[row.id] ?? Boolean(row.requestedQuantity > 0 && row.availabilityStatus && row.procurementSource)])));
            lookupVersions.current[item.id] = (lookupVersions.current[item.id] || 0) + 1;
            clearTimeout(lookupTimers.current[item.id]); onUpdated?.(response);
            setSuccessMessage("Procurement item deleted.");
        } catch (error) { setErrorMessage(error?.response?.data?.message || error?.response?.data?.error || "Unable to delete this item."); }
        finally { setSavingItemId(null); }
    };
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
            const save = item.rawRequirement
                ? data => identifyCustomerRequirement(procurementLead.id, item.changeId, data)
                : data => saveLeadItemProcurement(procurementLead.id, item.id, data);
            const response = await save({
                partNumber: draft.partNumber.trim(), requestedQuantity: Number(draft.requestedQuantity),
                productName: draft.productName?.trim() || null, brandName: draft.brandName?.trim() || null,
                hsnCode: draft.hsnCode?.trim() || null, quotedMrp: draft.quotedMrp === "" ? null : Number(draft.quotedMrp),
                availabilityStatus: draft.availabilityStatus, procurementSource: draft.procurementSource,
                vendorStockItemId: draft.procurementSource === "VENDOR" ? Number(draft.vendorStockItemId) : null,
                estimatedAvailabilityDate: draft.availabilityStatus === "ESTIMATED" ? draft.estimatedAvailabilityDate : null,
                notes: draft.notes?.trim() || null
            });
            const saved = returning ? procurementWork(response).find(row => row.changeId === item.changeId)
                : response.items.find(row => row.id === item.id);
            setProcurementLead(response);
            onUpdated?.(response);
            setItems(current => current.map(row => row.id === item.id ? saved : row));
            setItemDrafts(current => ({ ...current, [saved.id]: getItemInitialState(saved) }));
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
                <td className="lpt-td">
                    {item.customerChange && <div className="lead-card-subtitle">
                        <strong>{item.customerChange.changeType === "NEW_REQUIREMENT" ? "NEW CUSTOMER REQUIREMENT" : "CUSTOMER CHANGE REQUESTED"}</strong>
                        <p>{item.customerChange.requestedRequirement || item.customerChange.originalRequirement}</p>
                        <p>Original Qty: {item.customerChange.originalQuantity ?? "—"} · Requested Qty: {item.customerChange.requestedQuantity}</p>
                        <p>{item.customerChange.reason}</p>
                    </div>}
                    <input className="lpt-input" aria-label={`Part number ${index + 1}`}
                        value={draft.partNumber} onChange={event => updateDraft(itemId, "partNumber", event.target.value)}
                        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); lookupItem(item); } }} />

                    {lookupResult?.foundInCatalogue === false ? (
                        <span className="lpt-stock lpt-stock--new">
                            New item
                        </span>
                    ) : (
                        <span
                            className={`lpt-stock ${availableQuantity > 0 ? "lpt-stock--ok" : "lpt-stock--idle"}`}
                        >
                            {lookupResult ? `D2W Stock: ${availableQuantity}` : "Waiting for lookup"}
                        </span>
                    )}

                    {isLookingUp && (
                        <span className="lpt-inline-loading">
                            <Loader2 size={11} />
                            Checking...
                        </span>
                    )}

                    {lookupError && (
                        <span className="lpt-cell-error">
                            {lookupError}
                        </span>
                    )}

                    {itemError && (
                        <span className="lpt-cell-error">
                            {itemError}
                        </span>
                    )}
                </td>

                <td className="lpt-td">
                    {productFound ? (
                        <strong>
                            {lookupResult?.productName ||
                                draft.productName ||
                                "—"}
                        </strong>
                    ) : (
                        <input
                            className="lpt-input"
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

                    {draft.brandName && <span className="lpt-muted">{draft.brandName}</span>}
                    {draft.hsnCode && <span className="lpt-muted">HSN: {draft.hsnCode}</span>}
                    <details className="lpt-notes"><summary>Notes</summary><textarea aria-label={`Notes ${index + 1}`} rows={2}
                        value={draft.notes || ""} onChange={event => updateDraft(itemId, "notes", event.target.value)} /></details>
                </td>



                <td className="lpt-td">
                    <input
                        className="lpt-input"
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
                <td className="lpt-td">
                    <input className="lpt-input lpt-input--qty" type="number" min="1" step="1"
                        aria-label={`Requested quantity ${index + 1}`} readOnly={Boolean(item.customerChange && item.customerChange.processingState !== "READY")} value={draft.requestedQuantity}
                        onChange={event => updateDraft(itemId, "requestedQuantity", event.target.value)} />
                </td>
                <td className="lpt-td">
                    <ProcurementSourceSelect draft={draft} vendors={vendorOptions} savedVendorName={item.selectedVendorName}
                        index={index} onChange={value => updateDraft(itemId, "sourceSelection", value)} />
                </td>

                <td className="lpt-td">
                    <select
                        aria-label={`Availability ${index + 1}`}
                        value={draft.availabilityStatus || ""}
                        onChange={(event) =>
                            handleStatusChange(
                                itemId,
                                event.target.value
                            )
                        }
                        className="lpt-input lpt-select"
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
                            Estimated
                        </option>
                        <option value="NOT_AVAILABLE">
                            Not Available
                        </option>
                    </select>
                </td>

                <td className="lpt-td">
                    {draft.availabilityStatus ===
                    AVAILABILITY_STATUS.ESTIMATED ? (
                        <input
                            className="lpt-input"
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
                        <span className="lpt-muted">
                            —
                        </span>
                    )}
                </td>
                <td className="lpt-td lpt-td--actions">
                    <button type="button" className="lpt-link-btn" disabled={readOnly || completing || savingItemId !== null || Boolean(lookupLoading[itemId])}
                        onClick={async () => { setSavingItemId(itemId); try { await saveItem(item); } finally { setSavingItemId(null); } }}>Save</button>
                    {!item.rawRequirement && <button type="button" className="lpt-link-btn lpt-link-btn--danger" disabled={readOnly || completing || savingItemId !== null} onClick={() => deleteItem(item)}>Delete</button>}
                </td>
            </tr>
        );
    };

    const currentRows = items.map(item => itemDrafts[item.id] || getItemInitialState(item));
    const summary = procurementSummary(currentRows);

        if (mode === "FOLLOW_UP") return <div className="lpt-root lpt-root--follow-up">
        <main className="lpt-body"><section className="lpt-card">
            <div className="lpt-head"><div className="lpt-title"><h3>Procurement Items</h3><span className="lpt-count">{lead.items?.length || 0}</span></div>
            <div className="lpt-total-chip"><span>Total MRP</span><strong>{formatMrp(procurementTotal(lead.items || []))}</strong></div></div>
            <div className="lpt-table-wrap"><table className="lpt-table lpt-table--followup"><colgroup><col style={{ width: "13%" }} /><col style={{ width: "17%" }} /><col style={{ width: "9%" }} /><col style={{ width: "7%" }} /><col style={{ width: "10%" }} /><col style={{ width: "11%" }} /><col style={{ width: "8%" }} /><col style={{ width: "12%" }} /><col style={{ width: "8%" }} /><col style={{ width: "5%" }} /></colgroup>
                <thead><tr>{["Part Number", "Part Name", "MRP", "Requested Qty", "Source", "Availability", "ETA", "Customer Decision", "Reason", "Action"].map(label => <th key={label}>{label}</th>)}</tr></thead>
                <tbody>{(lead.items || []).map((item, index) => {
                    const draft = decisionDrafts[item.id] || { leadCustomerDecision: item.leadCustomerDecision || "PENDING", customerRejectionReason: item.customerRejectionReason || "" };
                    return <tr key={item.id}>
                        <td className="lpt-td">{item.partNumber || "—"}</td><td className="lpt-td"><strong>{item.productName || "—"}</strong></td>
                        <td className="lpt-td">{formatMrp(item.quotedMrp)}</td><td className="lpt-td">{item.requestedQuantity}</td>
                        <td className="lpt-td">{item.procurementSource === "LOCAL" ? "D2W" : item.procurementSource === "VENDOR" ? item.selectedVendorName || "Vendor" : (item.procurementSource || "—").replaceAll("_", " ")}</td>
                        <td className="lpt-td">{(item.availabilityStatus || "—").replaceAll("_", " ")}</td><td className="lpt-td">{item.estimatedAvailabilityDate || "—"}</td>
                        <td className="lpt-td">{editing ? <select className="lpt-input lpt-select" aria-label={`Customer decision ${index + 1}`} disabled={disabled} value={draft.leadCustomerDecision}
                            onChange={event => onDecisionEdit(item.id, { ...draft, leadCustomerDecision: event.target.value, customerRejectionReason: "" })}>
                            {["PENDING", "ACCEPTED", "REJECTED"].map(value => <option key={value} value={value}>{value}</option>)}</select> : draft.leadCustomerDecision}</td>
                        <td className="lpt-td">{editing ? <input className="lpt-input" aria-label={`Rejection reason ${index + 1}`} list="customer-rejection-reasons" maxLength={2000}
                            disabled={disabled || draft.leadCustomerDecision !== "REJECTED"} required={draft.leadCustomerDecision === "REJECTED"} value={draft.customerRejectionReason}
                            onChange={event => onDecisionEdit(item.id, { ...draft, customerRejectionReason: event.target.value })} /> : item.customerRejectionReason || "—"}</td>
                        <td className="lpt-td">{onRequestChange && <button className="lpt-link-btn" disabled={disabled || editing} onClick={() => onRequestChange(item)}>Request Change</button>}</td>
                    </tr>;
                })}</tbody>
            </table></div>
            <datalist id="customer-rejection-reasons">{["Price too high", "Customer doesn't need it", "Bought elsewhere", "Not required now", "Other"].map(value => <option key={value} value={value} />)}</datalist>
        </section></main>
    </div>;

    return (
        <div className="lpt-root">
            <main className="lpt-body">
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

                <section className="lpt-card">
                    <div className="lpt-head">
                        <div className="lpt-title">
                            <h3>Procurement Items</h3>
                            <span className="lpt-count">{items.length}</span>
                        </div>
                        <div className="lpt-chips" aria-label="Procurement summary">
                            <span className="lpt-chip lpt-chip--total"><i />Total <strong>{items.length}</strong></span>
                            <span className="lpt-chip lpt-chip--d2w"><i />D2W <strong>{summary.d2w}</strong></span>
                            <span className="lpt-chip lpt-chip--vendor"><i />Vendor <strong>{summary.vendor}</strong></span>
                            <span className="lpt-chip lpt-chip--na"><i />Not Available <strong>{summary.notAvailable}</strong></span>
                        </div>
                        <div className="lpt-total-chip" aria-label="Total MRP">
                            <span>Total MRP</span>
                            <strong>{formatMrp(procurementTotal(currentRows))}</strong>
                        </div>
                    </div>

                    {loading ? (
                        <div className="lpt-state">
                            Loading procurement items...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="lpt-state">
                            Enter a part number below to start Procurement.
                        </div>
                    ) : (
                        <div className="lpt-table-wrap">
                            <fieldset disabled={loading || bulkLoading || readOnly || savingItemId !== null || completing} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}><table className="lpt-table lpt-table--edit"><colgroup><col style={{ width: "17%" }} /><col style={{ width: "22%" }} /><col style={{ width: "10%" }} /><col style={{ width: "8%" }} /><col style={{ width: "12%" }} /><col style={{ width: "15%" }} /><col style={{ width: "9%" }} /><col style={{ width: "7%" }} /></colgroup>
                                <thead>
                                    <tr>
                                        <th>Part Number</th>
                                        <th>Part Name</th>
                                        <th>MRP</th>
                                        <th>Requested Qty</th>
                                        <th>Source</th>
                                        <th>Availability</th>
                                        <th>ETA</th>
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

                {!returning && <section className="procurement-entry-panel">
    <div className="procurement-entry-row-top">
        {activeEntryTab === "single" ? (
            <div className="procurement-entry-input">
                <input
                    aria-label="Part number search"
                    value={entryPartNumber}
                    onChange={(e) => changeEntry(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            if (!entryPartNumber.trim()) return;
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
                    placeholder="Enter part number and press Enter"
                />
                {entryLoading ? <Loader2 size={14} className="spin" /> : <span className="procurement-enter-hint" aria-hidden="true">↵</span>}
            </div>
        ) : <div className="procurement-entry-input"><textarea rows={3} aria-label="Bulk part numbers" value={bulkPartsText}
            onChange={event => setBulkPartsText(event.target.value)} disabled={loading || readOnly || savingItemId !== null || completing || bulkLoading}
            placeholder="Paste part numbers, one per line" /></div>}

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
</section>}
            </main>
            <footer className="lpt-footer">
                {onClose ? <button type="button" className="lpt-btn lpt-btn--ghost" onClick={onClose}>Close</button> : <span />}
                <div className="lpt-footer-primary">
                <button
                    type="button"
                    className="lpt-btn lpt-btn--outline"
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
                    className="lpt-btn lpt-btn--primary"
                    disabled={
                        entryPartNumber.trim() !== "" || bulkPartsText.trim() !== "" || creatingItems > 0 || entryLoading || bulkLoading || loading || readOnly || savingItemId !== null || Object.values(lookupLoading).some(Boolean) || completing ||
                        !allItemsSaved ||
                        items.length === 0
                    }
                    onClick={handleCompleteProcurement}
                >
                    {completing
                        ? "Completing..."
                        : "Move to FollowUp"}
                </button>
                </div>
            </footer>
        </div>
    );
}

export default LeadProcurementTable;
