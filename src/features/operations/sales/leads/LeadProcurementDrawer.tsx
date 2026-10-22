import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Pencil, Trash2, X } from "lucide-react";
import {
  applyProcurementLookup,
  formatMrp,
  procurementTotal,
} from "./procurementUiUtils";

import {
  completeLeadProcurement,
  getLeadById,
  updateLead,
  createLeadFollowUpActivity,
  getLeadFollowUpActivities,
  addProcurementItem,
  lookupLeadItemProduct,
  saveLeadItemProcurement,
  deleteLeadProcurementItem,
  updateLeadStatus,
  identifyCustomerRequirement,
  lookupProcurementProduct,
} from "../../../../services/leadService";
import { getSalespersons } from "../../../../services/salespersonService";

import { procurementWork } from "./leadWorkflowUtils";

import ProcurementSourceSelect from "./ProcurementSourceSelect";
import CustomerRequirementTable from "./CustomerRequirementTable";
import ActivityLogStream from "./ActivityLogStream";

// Legacy stylesheet stays imported: the Follow-up drawer shares its classes.
import LeadProcurementStyles from "./LeadProcurementStyles";

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
      value !== null && value !== undefined && String(value).trim() !== "",
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
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
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
    estimatedAvailabilityDate: item?.estimatedAvailabilityDate || "",
    procurementSource: item?.procurementSource || "",
    vendorStockItemId: item?.selectedVendorStockItemId || "",
    notes: item?.notes || "",
  };
}

/* ============================================================
   SMALL PRESENTATIONAL HELPERS
   ============================================================ */

function SectionCard({
  title,
  meta = null,
  defaultOpen = true,
  children,
}: any) {
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
    <label
      className={`pd-meta-field${editing ? " is-editing" : ""}${!editing && /not assigned/i.test(String(value || "")) ? " is-unassigned" : ""}`}
    >
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
  storeId,
}: any) {
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState(null);
  const [completing, setCompleting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [procurementLead, setProcurementLead] = useState<any>(null);
  const [loadedSalespersons, setLoadedSalespersons] = useState<any[]>([]);
  const [savingAssignee, setSavingAssignee] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [itemDrafts, setItemDrafts] = useState<any>({});
  const [lookupResults, setLookupResults] = useState<any>({});
  const [lookupLoading, setLookupLoading] = useState<any>({});
  const [lookupErrors, setLookupErrors] = useState<any>({});
  const [itemErrors, setItemErrors] = useState<any>({});
  const [savedItems, setSavedItems] = useState<any>({});

  const [items, setItems] = useState<any[]>([]);
  const [entryPartNumber, setEntryPartNumber] = useState("");
  const [entryLoading, setEntryLoading] = useState(false);
  const [bulkPartsText, setBulkPartsText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [creatingItems, setCreatingItems] = useState(0);
  const entryVersion = useRef(0);
  const entryTimer = useRef(null);
  const leadSession = useRef(0);
  const pendingCreations = useRef({});
  const draftRef = useRef<any>({});
  draftRef.current = itemDrafts;
  const [activeEntryTab, setActiveEntryTab] = useState("single");
  const lookupVersions = useRef({});
  const lookupTimers = useRef({});
  const readOnly = Boolean(
    procurementLead && !["NEW", "PROCUREMENT"].includes(procurementLead.status),
  );

  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerEdits, setCustomerEdits] = useState<any>({});

  const [activities, setActivities] = useState<any[]>([]);

  const [pipeline, setPipeline] = useState<any>({
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

        const initialFollowUp =
          response?.nextFollowUpAt || lead?.nextFollowUpAt || "";
        const [initDate, initTime] = initialFollowUp
          ? initialFollowUp.split("T")
          : ["", ""];
        const initAssignedId =
          response?.salespersonId ??
          response?.salesperson?.id ??
          lead?.salespersonId ??
          null;

        setPipeline({
          stage: response?.status || null,
          assignedTo: initAssignedId ? String(initAssignedId) : "",
          followUpDate: initDate || "",
          followUpTime: initTime ? initTime.slice(0, 5) : "",
        });

        try {
          const remoteActivities = await getLeadFollowUpActivities(lead.id);
          if (!cancelled && Array.isArray(remoteActivities)) {
            const parsed = remoteActivities.map((act: any) => {
              let actType = "Note";
              let text =
                act.customerResponseReason || act.notes || act.reason || "";
              const match = text.match(
                /^\[(Note|Call|Email|WhatsApp|Status|System)\]\s*(.*)$/,
              );
              if (match) {
                actType = match[1];
                text = match[2];
              } else if (act.activityType) {
                actType = act.activityType;
              }
              return {
                id: act.id || `${Date.now()}-${Math.random()}`,
                type: actType,
                text: text,
                at: act.createdAt || act.activityDate || act.date || new Date(),
              };
            });
            setActivities(parsed);
          }
        } catch (actErr) {
          console.warn("Unable to load follow-up activities:", actErr);
        }

        const effStoreId =
          response?.storeId ||
          lead?.storeId ||
          storeId ||
          localStorage.getItem("storeId");
        if ((!assignees || assignees.length === 0) && effStoreId) {
          getSalespersons(Number(effStoreId))
            .then((list) => {
              if (!cancelled && Array.isArray(list))
                setLoadedSalespersons(list);
            })
            .catch((err) =>
              console.warn("Could not load salespersons for drawer:", err),
            );
        }

        const drafts = {};
        const records = procurementWork(response);
        setItems(records);
        records.forEach((item) => {
          if (item?.id) {
            drafts[item.id] = getItemInitialState(item);
          }
        });

        setItemDrafts(drafts);

        setSavedItems(
          Object.fromEntries(
            records.map((item) => [
              item.id,
              Boolean(
                !item.rawRequirement &&
                item.partNumber &&
                item.requestedQuantity > 0 &&
                item.availabilityStatus &&
                item.procurementSource &&
                (!item.customerChange ||
                  item.customerChange.processingState === "READY"),
              ),
            ]),
          ),
        );
        // Refresh facts without overwriting saved source, availability, quantity or vendor.
        for (const item of records) {
          if (!item.id || !item.partNumber || item.rawRequirement) continue;
          const version = (versions[item.id] || 0) + 1;
          versions[item.id] = version;
          setLookupLoading((current) => ({ ...current, [item.id]: true }));
          lookupLeadItemProduct(response.id, item.id, item.partNumber)
            .then((result) => {
              if (cancelled || versions[item.id] !== version) return;
              setLookupResults((current) => ({
                ...current,
                [item.id]: result,
              }));
              setItemDrafts((current) => ({
                ...current,
                [item.id]: {
                  ...applyProcurementLookup(current[item.id] || {}, result),
                  quotedMrp:
                    current[item.id]?.quotedMrp !== ""
                      ? current[item.id].quotedMrp
                      : (result.mrp ?? ""),
                },
              }));
            })
            .catch((error) => {
              if (cancelled || versions[item.id] !== version) return;
              setLookupErrors((current) => ({
                ...current,
                [item.id]:
                  error?.response?.data?.message ||
                  error?.response?.data?.error ||
                  "Unable to lookup this part number.",
              }));
            })
            .finally(() => {
              if (!cancelled && versions[item.id] === version)
                setLookupLoading((current) => ({
                  ...current,
                  [item.id]: false,
                }));
            });
        }
      } catch (error) {
        console.error("Unable to load procurement lead:", error);

        if (!cancelled) {
          setErrorMessage(
            error?.response?.data?.message ||
              error?.response?.data?.error ||
              "Unable to load lead details.",
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
      Object.keys(versions).forEach((id) => {
        versions[id] += 1;
      });
    };
  }, [lead?.id]);

  const customerName =
    firstValue(
      procurementLead?.customerName,
      procurementLead?.customer?.customerName,
      procurementLead?.customer?.name,
      lead?.customerName,
    ) || "Customer unavailable";

  const customerPhone =
    firstValue(
      procurementLead?.customerPhone,
      procurementLead?.customer?.mobileNumber,
      procurementLead?.customer?.mobile,
      lead?.customerPhone,
    ) || "Phone not available";

  const salespersonName =
    firstValue(
      procurementLead?.salespersonName,
      procurementLead?.salesPersonName,
      procurementLead?.salesperson?.name,
      procurementLead?.salesperson?.fullName,
      procurementLead?.salesPerson?.name,
      lead?.salespersonName,
      lead?.salesPersonName,
    ) || "Salesperson not assigned";

  const leadNumber =
    firstValue(procurementLead?.leadNumber, lead?.leadNumber) ||
    `LEAD-${lead?.id || ""}`;

  const customerRequirement =
    firstValue(
      procurementLead?.customerRequirement,
      lead?.customerRequirement,
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
          procurementSource: value.startsWith("vendor:") ? "VENDOR" : value,
          vendorStockItemId: value.startsWith("vendor:") ? value.slice(7) : "",
        },
      }));
      return;
    }
    if (
      field === "partNumber" &&
      Object.entries(draftRef.current).some(
        ([id, draft]: [string, any]) =>
          id !== String(itemId) &&
          draft.partNumber.trim().toUpperCase() === value.trim().toUpperCase(),
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

  const applyLookupToDraft = (itemId, result, _item?: any) => {
    setSavedItems((current) => ({ ...current, [itemId]: false }));
    setItemDrafts((current) => ({
      ...current,
      [itemId]: {
        ...applyProcurementLookup(current[itemId] || {}, result),
        quotedMrp:
          current[itemId]?.quotedMrp !== ""
            ? current[itemId].quotedMrp
            : (result.mrp ?? ""),
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
        "",
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
      const raw = items.find((row) => row.id === item.id)?.rawRequirement;
      const result = raw
        ? await lookupProcurementProduct(
            procurementLead?.id || lead?.id,
            partNumber,
          )
        : await lookupLeadItemProduct(
            procurementLead?.id || lead?.id,
            item.id,
            partNumber,
          );

      if (
        leadSession.current !== session ||
        lookupVersions.current[item.id] !== version
      )
        return null;
      setLookupResults((current) => ({
        ...current,
        [item.id]: result,
      }));

      applyLookupToDraft(item.id, result, item);

      return result;
    } catch (error) {
      if (
        leadSession.current !== session ||
        lookupVersions.current[item.id] !== version
      )
        return null;

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
      if (
        leadSession.current === session &&
        lookupVersions.current[item.id] === version
      )
        setLookupLoading((current) => ({
          ...current,
          [item.id]: false,
        }));
    }
  };
  const duplicatePart = (partNumber: any) =>
    Object.values(draftRef.current).some(
      (draft: any) =>
        draft.partNumber.trim().toUpperCase() ===
        partNumber.trim().toUpperCase(),
    );

  const addPersistedRow = (item) => {
    // Creation succeeds independently of lookup. Never discard its persisted identity.
    if (draftRef.current[item.id]) return;
    const draft = getItemInitialState(item);
    draftRef.current = { ...draftRef.current, [item.id]: draft };
    setItems((current) =>
      current.some((row) => row.id === item.id) ? current : [...current, item],
    );
    setItemDrafts((current) => ({ ...current, [item.id]: draft }));
    setSavedItems((current) => ({ ...current, [item.id]: false }));
  };

  const createAndLookupPart = async (partNumber) => {
    const session = leadSession.current;
    const clean = partNumber.trim();
    const key = clean.toUpperCase();
    const pending = pendingCreations.current;
    // Enter and debounce may overlap. They must share one creation request.
    if (!pending[key]) {
      setCreatingItems((current) => current + 1);
      pending[key] = addProcurementItem(lead.id, clean).finally(() => {
        if (leadSession.current === session)
          setCreatingItems((current) => current - 1);
      });
    }
    let item;
    try {
      item = await pending[key];
    } finally {
      delete pending[key];
    }
    if (leadSession.current !== session) return;
    addPersistedRow(item);
    await lookupItem(item, item.partNumber || clean);
  };

  const lookupEntry = async (partNumber, version) => {
    clearTimeout(entryTimer.current);
    const clean = partNumber.trim();
    const session = leadSession.current;
    if (!clean) {
      setEntryLoading(false);
      return;
    }
    if (duplicatePart(clean)) {
      setErrorMessage(clean + " is already in Procurement.");
      setEntryLoading(false);
      return;
    }
    try {
      await createAndLookupPart(clean);
      if (leadSession.current !== session || entryVersion.current !== version)
        return;
      setEntryPartNumber("");
      setErrorMessage("");
    } catch (error) {
      if (leadSession.current === session && entryVersion.current === version)
        setErrorMessage(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Unable to add this part number.",
        );
    } finally {
      if (leadSession.current === session && entryVersion.current === version)
        setEntryLoading(false);
    }
  };

  const changeEntry = (value) => {
    setEntryPartNumber(value);
    setErrorMessage("");
  };

  const handleBulkLookup = async () => {
    const parts = [
      ...new Set(
        bulkPartsText
          .split(/[\r\n,]+/)
          .map((part) => part.trim().toUpperCase())
          .filter(Boolean),
      ),
    ];
    if (!parts.length || parts.length > 100) {
      setErrorMessage("Enter between 1 and 100 part numbers.");
      return;
    }
    const fresh = parts.filter((part) => !duplicatePart(part));
    if (!fresh.length) {
      setErrorMessage("These parts are already in Procurement.");
      return;
    }
    setBulkLoading(true);
    setErrorMessage("");
    const session = leadSession.current;
    const failed = [];
    for (const part of fresh) {
      if (leadSession.current !== session) return;
      try {
        await createAndLookupPart(part);
      } catch (error) {
        failed.push(part);
        if (leadSession.current === session)
          setErrorMessage(
            error?.response?.data?.message ||
              error?.response?.data?.error ||
              "Unable to add some parts.",
          );
      }
    }
    if (leadSession.current !== session) return;
    setBulkPartsText(failed.join("\n"));
    if (parts.length !== fresh.length)
      setSuccessMessage("Existing parts were skipped.");
    setBulkLoading(false);
  };

  const handleStatusChange = (itemId, status) =>
    updateDraft(itemId, "availabilityStatus", status);

  const validateDraft = (draft, lookup) => {
    if (!draft.partNumber?.trim()) return "Part Number is required.";
    if (
      !Number.isInteger(Number(draft.requestedQuantity)) ||
      Number(draft.requestedQuantity) < 1
    )
      return "Requested quantity must be a positive integer.";
    if (!draft.availabilityStatus) return "Availability status is required.";
    if (!draft.procurementSource) return "Select a procurement source.";
    if (
      draft.quotedMrp !== "" &&
      (!Number.isFinite(Number(draft.quotedMrp)) ||
        Number(draft.quotedMrp) <= 0)
    )
      return "MRP must be greater than zero.";
    if (
      draft.availabilityStatus !== "NOT_AVAILABLE" &&
      !(Number(draft.quotedMrp || lookup?.mrp) > 0)
    )
      return "MRP is required for this availability status.";
    if (draft.procurementSource === "VENDOR" && !draft.vendorStockItemId)
      return "Select a vendor.";
    if (draft.availabilityStatus === "ESTIMATED") {
      if (!draft.estimatedAvailabilityDate)
        return "Estimated availability date is required.";
      if (draft.estimatedAvailabilityDate < todayDate())
        return "Estimated availability date cannot be in the past.";
    }
    return "";
  };

  const saveItem = async (item) => {
    const draft = itemDrafts[item.id] || getItemInitialState(item);
    const validation = validateDraft(draft, lookupResults[item.id]);
    if (validation) {
      setItemErrors((current) => ({ ...current, [item.id]: validation }));
      onToast?.(validation, "error");
      return false;
    }
    try {
      const payload = {
        partNumber: draft.partNumber.trim(),
        requestedQuantity: Number(draft.requestedQuantity),
        productName: draft.productName?.trim() || null,
        brandName: draft.brandName?.trim() || null,
        hsnCode: draft.hsnCode?.trim() || null,
        quotedMrp: draft.quotedMrp === "" ? null : Number(draft.quotedMrp),
        availabilityStatus: draft.availabilityStatus,
        procurementSource: draft.procurementSource,
        vendorStockItemId:
          draft.procurementSource === "VENDOR"
            ? Number(draft.vendorStockItemId)
            : null,
        estimatedAvailabilityDate:
          draft.availabilityStatus === "ESTIMATED"
            ? draft.estimatedAvailabilityDate
            : null,
        notes: draft.notes?.trim() || null,
      };
      const response = item.rawRequirement
        ? await identifyCustomerRequirement(
            procurementLead.id,
            item.changeId,
            payload,
          )
        : await saveLeadItemProcurement(procurementLead.id, item.id, payload);
      const saved = procurementWork(response).find((row) =>
        item.changeId ? row.changeId === item.changeId : row.id === item.id,
      );
      setProcurementLead(response);
      setItems((current) =>
        current.map((row) => (row.id === item.id ? saved : row)),
      );
      setItemDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return { ...next, [saved.id]: getItemInitialState(saved) };
      });
      setSavedItems((current) => ({ ...current, [saved.id]: true }));
      setItemErrors((current) => ({ ...current, [item.id]: "" }));
      return true;
    } catch (error) {
      setItemErrors((current) => ({
        ...current,
        [item.id]:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Unable to save this row.",
      }));
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
          onToast?.(`${leadNumber} added to Procurement`, "success");
        } catch (err) {
          console.warn("Unable to move lead to PROCUREMENT:", err);
          onToast?.("Saved, but unable to move lead to Procurement.", "error");
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

    setSavingItemId(item.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await deleteLeadProcurementItem(
        procurementLead?.id || lead?.id,
        item.id,
      );

      const records = procurementWork(response);
      setProcurementLead(response);
      setItems(records);
      setItemDrafts((current) =>
        Object.fromEntries(
          records.map((row) => [
            row.id,
            current[row.id] || getItemInitialState(row),
          ]),
        ),
      );
      setSavedItems((current) =>
        Object.fromEntries(
          records.map((row) => [
            row.id,
            current[row.id] ??
              Boolean(
                row.requestedQuantity > 0 &&
                row.availabilityStatus &&
                row.procurementSource,
              ),
          ]),
        ),
      );
      lookupVersions.current[item.id] =
        (lookupVersions.current[item.id] || 0) + 1;
      clearTimeout(lookupTimers.current[item.id]);

      onUpdated?.(response);
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
        "Save procurement details for every item before completing procurement.",
      );
      onToast?.("Save every item before completing procurement.", "error");
      return;
    }

    setCompleting(true);

    try {
      const response = await completeLeadProcurement(
        procurementLead?.id || lead?.id,
      );

      if (response) {
        setProcurementLead(response);
        onUpdated?.(response);
        const refreshed = await getLeadById(response.id);
        setProcurementLead(refreshed);
        onUpdated?.(refreshed);
      }

      setSuccessMessage("Procurement completed successfully.");
      onToast?.(`${leadNumber} moved to Customer Follow-up`, "success");
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

  const normalizedSalespersons = useMemo(() => {
    const sourceList =
      Array.isArray(assignees) && assignees.length > 0
        ? assignees
        : loadedSalespersons;

    const list: { id: string | number; name: string }[] = [];
    const seen = new Set<string>();

    if (Array.isArray(sourceList)) {
      for (const sp of sourceList) {
        if (!sp) continue;
        if (typeof sp === "string") {
          if (
            sp !== "Salesperson not assigned" &&
            sp !== "Not assigned" &&
            !seen.has(sp)
          ) {
            seen.add(sp);
            list.push({ id: sp, name: sp });
          }
        } else if (typeof sp === "object") {
          const id = sp.id ?? sp.salespersonId ?? sp.userId;
          const name =
            sp.salespersonName ??
            sp.name ??
            sp.fullName ??
            sp.username ??
            (id ? `Salesperson #${id}` : "");
          if (
            id !== undefined &&
            id !== null &&
            name &&
            !seen.has(String(id))
          ) {
            seen.add(String(id));
            list.push({ id, name });
          }
        }
      }
    }

    const currentSpId = procurementLead?.salespersonId ?? lead?.salespersonId;
    const currentSpName =
      salespersonName !== "Salesperson not assigned" &&
      salespersonName !== "Not assigned"
        ? salespersonName
        : "";
    if (currentSpId && !seen.has(String(currentSpId))) {
      list.unshift({
        id: currentSpId,
        name: currentSpName || `Salesperson #${currentSpId}`,
      });
    } else if (!currentSpId && currentSpName && !seen.has(currentSpName)) {
      list.unshift({ id: currentSpName, name: currentSpName });
    }

    return list;
  }, [
    assignees,
    loadedSalespersons,
    procurementLead?.salespersonId,
    lead?.salespersonId,
    salespersonName,
  ]);

  const currentAssignee =
    pipeline.assignedTo !== null && pipeline.assignedTo !== undefined
      ? String(pipeline.assignedTo)
      : procurementLead?.salespersonId
        ? String(procurementLead.salespersonId)
        : "";

  const handleAssigneeChange = async (selectedId: string) => {
    if (!lead?.id || savingAssignee) return;
    const sp = normalizedSalespersons.find(
      (s) => String(s.id) === String(selectedId),
    );
    const newId = sp && !Number.isNaN(Number(sp.id)) ? Number(sp.id) : null;
    const newName = sp ? sp.name : null;

    setPipeline((c: any) => ({ ...c, assignedTo: selectedId }));
    setSavingAssignee(true);
    try {
      await updateLead(lead.id, {
        salespersonId: newId as any,
        salespersonName: newName as any,
      });
      onToast?.(
        newName ? `Assigned to ${newName}` : "Lead unassigned",
        "success",
      );
      onUpdated?.();

      const noteText = newName
        ? `Reassigned lead to ${newName}`
        : "Lead unassigned";
      try {
        await createLeadFollowUpActivity(lead.id, {
          customerResponseReason: `[System] ${noteText}`,
        });
        setActivities((cur) => [
          {
            id: `reassign-${Date.now()}`,
            type: "System",
            text: noteText,
            at: new Date(),
          },
          ...cur,
        ]);
      } catch (actErr) {
        console.warn("Failed to log reassignment activity:", actErr);
      }
    } catch (err: any) {
      console.error("Failed to update salesperson:", err);
      onToast?.(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update salesperson",
        "error",
      );
    } finally {
      setSavingAssignee(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!lead?.id || !pipeline.followUpDate || savingSchedule) return;
    setSavingSchedule(true);
    try {
      const nextFollowUpAt = pipeline.followUpTime
        ? `${pipeline.followUpDate}T${pipeline.followUpTime}:00`
        : `${pipeline.followUpDate}T09:00:00`;
      const noteText = `Follow-up scheduled for ${pipeline.followUpDate}${pipeline.followUpTime ? ` at ${pipeline.followUpTime}` : ""}`;

      await createLeadFollowUpActivity(lead.id, {
        customerResponseReason: `[Note] ${noteText}`,
        nextFollowUpAt,
      });

      setActivities((cur) => [
        {
          id: `sched-${Date.now()}`,
          type: "Note",
          text: noteText,
          at: new Date(),
        },
        ...cur,
      ]);
      onToast?.("Follow-up schedule saved", "success");
      onUpdated?.();
    } catch (err: any) {
      console.error("Failed to save follow-up schedule:", err);
      onToast?.(
        err?.response?.data?.message || "Failed to save schedule",
        "error",
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  const addActivity = async (type: string, text: string) => {
    if (!lead?.id) return;
    const tempId = `temp-${Date.now()}`;
    const newEntry = { id: tempId, type, text, at: new Date() };
    setActivities((current) => [newEntry, ...current]);

    try {
      let nextFollowUpAt: string | undefined = undefined;
      if (pipeline.followUpDate) {
        nextFollowUpAt = pipeline.followUpTime
          ? `${pipeline.followUpDate}T${pipeline.followUpTime}:00`
          : `${pipeline.followUpDate}T09:00:00`;
      }
      const saved = await createLeadFollowUpActivity(lead.id, {
        customerResponseReason: `[${type}] ${text}`,
        nextFollowUpAt,
      });
      if (saved?.id) {
        setActivities((current) =>
          current.map((e) => (e.id === tempId ? { ...e, id: saved.id } : e)),
        );
      }
      onToast?.("Activity logged", "success");
      onUpdated?.();
    } catch (err: any) {
      console.error("Failed to log activity:", err);
      onToast?.(
        err?.response?.data?.message || "Failed to log activity",
        "error",
      );
    }
  };

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
    const draft = itemDrafts[itemId] || getItemInitialState(item);
    const lookupResult = getEffectiveLookupResult(item);
    const vendorOptions = Array.isArray(lookupResult?.vendorOptions)
      ? lookupResult.vendorOptions
      : [];
    const availableQuantity = Number(lookupResult?.availableQuantity ?? 0);
    const isLookingUp = Boolean(lookupLoading[itemId]);
    const itemError = itemErrors[itemId];
    const lookupError = lookupErrors[itemId];

    const productFound =
      lookupResult?.foundInCatalogue === true ||
      Boolean(draft.productItemId || draft.localProductId);

    return (
      <tr key={itemId || index} className={itemError ? "has-error" : ""}>
        <td className="pd-td pd-td-part">
          <input
            className="pd-input"
            aria-label={`Part number ${index + 1}`}
            value={draft.partNumber}
            onChange={(event) =>
              updateDraft(itemId, "partNumber", event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                lookupItem(item);
              }
            }}
          />

          {lookupResult?.foundInCatalogue === false ? (
            <span className="pd-stock pd-stock--new">New item</span>
          ) : (
            <span
              className={`pd-stock ${
                availableQuantity > 0 ? "pd-stock--ok" : "pd-stock--idle"
              }`}
            >
              {lookupResult
                ? `Available: ${availableQuantity}`
                : "Waiting for lookup"}
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
              {lookupResult?.productName || draft.productName || "—"}
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
          <input
            className="pd-input pd-input--qty"
            type="number"
            min="1"
            step="1"
            aria-label={`Requested quantity ${index + 1}`}
            value={draft.requestedQuantity}
            onChange={(event) =>
              updateDraft(itemId, "requestedQuantity", event.target.value)
            }
          />
        </td>

        <td className="pd-td pd-td-source">
          <ProcurementSourceSelect
            draft={draft}
            vendors={vendorOptions}
            savedVendorName={item.selectedVendorName}
            index={index}
            onChange={(value) => updateDraft(itemId, "sourceSelection", value)}
          />
        </td>

        <td className="pd-td">
          <select
            aria-label={`Availability ${index + 1}`}
            value={draft.availabilityStatus || ""}
            onChange={(event) => handleStatusChange(itemId, event.target.value)}
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
          {draft.availabilityStatus === AVAILABILITY_STATUS.ESTIMATED ? (
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
                  event.target.value,
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
            className="pd-row-remove delete-icon-btn"
            aria-label={`Remove row ${index + 1}`}
            title="Remove item"
            disabled={
              savingItemId !== null || completing || item.rawRequirement
            }
            onClick={() => deleteItem(item)}
          >
            <Trash2 size={15} />
          </button>
        </td>
      </tr>
    );
  };

  const totalMrp = procurementTotal(items);
  const totalInternal = items.filter(
    (item) =>
      itemDrafts[item?.id]?.procurementSource === PROCUREMENT_SOURCES.LOCAL,
  ).length;

  const totalVendor = items.filter(
    (item) =>
      itemDrafts[item?.id]?.procurementSource === PROCUREMENT_SOURCES.VENDOR,
  ).length;

  const totalNotAvailable = items.filter(
    (item) =>
      itemDrafts[item?.id]?.procurementSource ===
      PROCUREMENT_SOURCES.NOT_AVAILABLE,
  ).length;

  const pendingChanges = (procurementLead?.customerChanges || []).filter(
    (change) => change.processingState !== "COMPLETED",
  );

  const entryDisabled =
    loading ||
    !procurementLead ||
    readOnly ||
    savingItemId !== null ||
    completing ||
    bulkLoading;

  return (
    <div className="pd-root lead-drawer-container">
      <LeadProcurementStyles />
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
              aria-label={
                editingCustomer
                  ? "Finish editing customer info"
                  : "Edit customer info"
              }
              title={editingCustomer ? "Done editing" : "Edit customer info"}
            >
              {editingCustomer ? <Check size={15} /> : <Pencil size={14} />}
            </button>
          </div>
          <button
            type="button"
            className="pd-icon-btn pd-close"
            onClick={onClose}
            aria-label="Close procurement"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      <div className="pd-split drawer-body-grid">
        <div className="pd-left">
          <section className="pd-card pd-info" aria-label="Customer details">
            <h3 className="pd-section-title">Customer Info</h3>
            <div className="pd-meta-row">
              <MetaField
                label="Customer"
                value={shownCustomer.name}
                editing={editingCustomer}
                onChange={(v) => updateCustomerEdit("name", v)}
                placeholder="Not available"
              />
              <MetaField
                label="Mobile"
                value={shownCustomer.phone}
                editing={editingCustomer}
                onChange={(v) => updateCustomerEdit("phone", v)}
                placeholder="Not available"
              />
              <MetaField
                label="Salesperson"
                value={shownCustomer.salesperson}
                editing={editingCustomer}
                onChange={(v) => updateCustomerEdit("salesperson", v)}
                placeholder="Not available"
              />
              <label className="pd-meta-field">
                <span>Lead ID</span>
                <input type="text" value={leadNumber} readOnly />
              </label>
            </div>
          </section>
          {/* ======================= BODY ======================= */}
          <main className="pd-body pd-main">
            {errorMessage && (
              <div className="pd-alert pd-alert--error">{errorMessage}</div>
            )}
            {successMessage && (
              <div className="pd-alert pd-alert--success">{successMessage}</div>
            )}

            <CustomerRequirementTable
              requirement={customerRequirement}
              changes={pendingChanges.map((change) => {
                const item = (procurementLead?.items || []).find(
                  (row) => row.id === change.itemId,
                );
                return {
                  id: change.id,
                  title:
                    change.requestedRequirement ||
                    item?.requirement ||
                    item?.productName ||
                    item?.partNumber,
                  quantity: change.requestedQuantity,
                  reason: change.reason,
                };
              })}
            />

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
                    <i />
                    Total <strong>{items.length}</strong>
                  </span>
                  <span className="pd-chip pd-chip--d2w">
                    <i />
                    D2W <strong>{totalInternal}</strong>
                  </span>
                  <span className="pd-chip pd-chip--vendor">
                    <i />
                    Vendor <strong>{totalVendor}</strong>
                  </span>
                  <span className="pd-chip pd-chip--na">
                    <i />
                    Not Available <strong>{totalNotAvailable}</strong>
                  </span>
                </div>
                <div
                  className="lpt-total-chip pd-total-chip"
                  aria-label="Total MRP"
                >
                  <span>Total MRP</span>
                  <strong>{formatMrp(totalMrp)}</strong>
                </div>
              </div>

              {loading ? (
                <div className="pd-state">Loading procurement items...</div>
              ) : items.length === 0 ? (
                <div className="pd-state">
                  Enter a part number below to start Procurement.
                </div>
              ) : (
                <div className="pd-table-wrap">
                  <fieldset
                    disabled={
                      loading ||
                      bulkLoading ||
                      readOnly ||
                      savingItemId !== null ||
                      completing
                    }
                    className="pd-fieldset"
                  >
                    <table className="pd-table procurement-grid-table">
                      <colgroup>
                        <col style={{ width: "16%" }} />
                        <col style={{ width: "22%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "56px" }} />
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
          </main>
        </div>
        <aside className="pd-side" aria-label="Activity and schedule">
          <section className="pd-schedule" aria-label="Assignment and schedule">
            <h3 className="pd-side-title">Assignment &amp; Schedule</h3>
            <label className="pd-meta-field">
              <span>Assigned to</span>
              <select
                value={currentAssignee}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                disabled={savingAssignee}
              >
                <option value="">Unassigned</option>
                {normalizedSalespersons.map((sp) => (
                  <option key={sp.id} value={String(sp.id)}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="pd-schedule-row">
              <label className="pd-meta-field">
                <span>Follow-up date</span>
                <input
                  type="date"
                  min={todayDate()}
                  value={pipeline.followUpDate}
                  onChange={(e) =>
                    setPipeline((c: any) => ({
                      ...c,
                      followUpDate: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="pd-meta-field">
                <span>Follow-up time</span>
                <input
                  type="time"
                  value={pipeline.followUpTime}
                  onChange={(e) =>
                    setPipeline((c: any) => ({
                      ...c,
                      followUpTime: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
            {pipeline.followUpDate && (
              <button
                type="button"
                className="pd-schedule-save-btn"
                disabled={savingSchedule}
                onClick={handleSaveSchedule}
                style={{
                  marginTop: "6px",
                  width: "100%",
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: savingSchedule ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                }}
              >
                {savingSchedule ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : null}
                {savingSchedule ? "Saving Schedule..." : "Save Schedule"}
              </button>
            )}
          </section>
          <ActivityLogStream entries={trail} onAdd={addActivity} />
        </aside>
      </div>

      {/* ======================= FOOTER ======================= */}
      <footer className="pd-footer">
        <button
          type="button"
          className="pd-btn pd-btn--ghost"
          onClick={onClose}
        >
          Close
        </button>

        <div className="pd-footer-primary">
          <button
            type="button"
            className="pd-btn pd-btn--outline"
            disabled={
              creatingItems > 0 ||
              entryLoading ||
              bulkLoading ||
              loading ||
              readOnly ||
              completing ||
              savingItemId !== null ||
              Object.values(lookupLoading).some(Boolean) ||
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
              entryPartNumber.trim() !== "" ||
              bulkPartsText.trim() !== "" ||
              creatingItems > 0 ||
              entryLoading ||
              bulkLoading ||
              loading ||
              readOnly ||
              savingItemId !== null ||
              Object.values(lookupLoading).some(Boolean) ||
              completing ||
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
