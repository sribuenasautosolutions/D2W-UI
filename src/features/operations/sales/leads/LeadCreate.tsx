import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Search, X } from "lucide-react";

import { createLead, updateLead } from "../../../../services/leadService";
import { getAllStores } from "../../../../services/storeService";
import {
  getCustomerByMobile,
  saveCustomer,
  searchCustomersByStore,
} from "../../../../services/customerService";
import {
  createSalesperson,
  getSalespersons,
} from "../../../../services/salespersonService";

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
  onClose = () => {},
  mode = "create",
  lead = null,
  onSaved = () => {},
  onViewLead = () => {},
  onToast = () => {},
}: any) {
  const isEditMode = mode === "edit";
  const navigate = useNavigate();

  const user = useMemo(() => readUser(), []);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  /* ============================== STORE ============================== */
  const [selectedStoreId, setSelectedStoreId] = useState(
    isSuperAdmin ? "" : String(user?.storeId || ""),
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
        const response: any = await getAllStores();
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
          error?.response?.data?.message || "Unable to load stores.",
        );
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
        String(lead.salespersonId),
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
          searchName,
        );

        if (cancelled || !Array.isArray(result)) return;

        const existing = result.find(
          (item) =>
            String(item?.id ?? item?.customerId ?? "") ===
            String(lead.customerId),
        );

        if (!existing) return;

        setSelectedCustomer((previous) => ({
          ...(previous || {}),
          ...existing,
        }));
        setCustomerMobile(existing?.mobileNumber ?? existing?.mobile ?? "");
        setCustomerName(existing?.customerName ?? existing?.name ?? searchName);
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
      const customer = await getCustomerByMobile(
        mobile,
        Number(selectedStoreId),
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
          "Existing customer not found. Select an existing customer by mobile number.",
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
            "Existing customer not found. Select an existing customer by mobile number.",
          );
          return;
        }
        setCustomerForm({ ...EMPTY_CUSTOMER, mobileNumber: mobile });
        setCustomerModalOpen(true);
      } else {
        console.error("Customer lookup failed:", error);
        setCustomerLookupMessage(
          error?.response?.data?.message || "Unable to check customer.",
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
          "Unable to save customer.",
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
      (item) => String(item?.id ?? item?.salespersonId) === value,
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
          "Unable to save salesperson.",
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
          salespersonId:
            result?.salespersonId ?? selectedSalesperson?.id ?? null,
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
            "Unable to update lead.",
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
      const createMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Unable to create lead.";
      if (typeof onToast === "function") onToast(createMessage, "error");
      else alert(createMessage);
    } finally {
      setCreatingLead(false);
    }
  };

  /* ============================== VIEW CREATED LEAD ============================== */
  // Opens the Lead Overview drawer on the list page. The create response may
  // omit some display fields, so fill gaps from the form (server values win).
  const handleViewCreatedLead = () => {
    if (!createdLead) return;

    if (typeof onViewLead === "function") {
      const fromForm = {
        customerId: selectedCustomer?.id ?? null,
        customerName: selectedCustomer?.customerName || customerName,
        customerMobile: selectedCustomer?.mobileNumber || customerMobile,
        salespersonId: selectedSalesperson?.id ?? null,
        salespersonName: selectedSalesperson?.salespersonName ?? null,
        salespersonMobile: selectedSalesperson?.mobileNumber ?? null,
        storeId: selectedStoreId ? Number(selectedStoreId) : null,
        source: source || null,
        customerRequirement: customerRequirement.trim() || null,
        location: location.trim() || null,
        vinNumber: vinNumber.trim() || null,
      };
      const fromServer = Object.fromEntries(
        Object.entries(createdLead).filter(
          ([, value]) => value !== null && value !== undefined && value !== "",
        ),
      );
      onViewLead({ ...fromForm, ...fromServer });
      return;
    }

    // Fallback (LeadCreate used outside the list page): previous behaviour
    const base = isSuperAdmin ? "/owner/sales" : "/store/sales";
    navigate(`${base}/leads/${createdLead.id}?view=readonly`);
  };

  /* ============================== BACK / CLOSE ============================== */
  const handleBack = () => {
    if (typeof onClose === "function") onClose();
    else navigate(isSuperAdmin ? "/owner/sales/leads" : "/store/sales/leads");
  };

  /* ============================== RENDER ============================== */
  return (
    <section className="lead-page">
      <style>{`/* ==========================================================================
   LeadCreate — page-level / side-drawer card (no dimmed backdrop)
   Built to live inside ANY container: it fills the width it is given,
   never overflows it, and never depends on the viewport width.
   ========================================================================== */

.lead-page {
  --lead-blue: #2563eb;
  --lead-blue-hover: #1d4ed8;
  --lead-blue-ring: rgba(37, 99, 235, 0.14);

  --lead-slate-900: #0f172a;
  --lead-slate-700: #334155;
  --lead-slate-500: #64748b;
  --lead-slate-400: #94a3b8;
  --lead-border: #e2e8f0;
  --lead-divider: #f1f5f9;
  --lead-danger: #dc2626;

  --lead-font: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif;

  /* fill the drawer, never exceed it */
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 24px;
  background: #ffffff; /* plain white, no box inside */
  border: 0;
  border-radius: 0;
  box-shadow: none;
  outline: 0;
  color: var(--lead-slate-900);
  font-family: var(--lead-font);
  -webkit-font-smoothing: antialiased;
}

.lead-page,
.lead-page *,
.lead-page *::before,
.lead-page *::after {
  box-sizing: border-box;
}

.lead-page button,
.lead-page input,
.lead-page select,
.lead-page textarea {
  font-family: inherit;
  max-width: 100%;
}

.lead-shell {
  width: 100%;
  max-width: 720px;
  min-width: 0;
  margin: 0 auto;
  padding: 0;
  background: none;
  border: 0;
  box-shadow: none;
}

/* ---------------- Header (sits inside the same 16px gutter as the card) ---------------- */
.lead-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 24px;
  padding: 0;
}

.lead-header-text {
  min-width: 0;
  flex: 1 1 auto;
}

.lead-eyebrow {
  display: block;
  margin-bottom: 6px;
  color: var(--lead-blue);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lead-title {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--lead-slate-900);
}

.lead-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--lead-slate-500);
}

.lead-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--lead-slate-500);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.lead-close-btn:hover {
  background: var(--lead-divider);
  color: var(--lead-slate-900);
}

.lead-close-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--lead-blue-ring);
  color: var(--lead-blue);
}

.lead-close-btn--sm {
  width: 30px;
  height: 30px;
}

/* ---------------- Form body: layout only. No box, border, shadow, padding or background. ---------------- */
.lead-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  min-width: 0;
  padding: 0;
  background: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

/* ---------------- Fields ---------------- */
.lead-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  margin: 0; /* spacing comes from the parent gap only */
}

.lead-field--full {
  width: 100%;
}

.lead-label {
  display: block;
  color: var(--lead-slate-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
}

.lead-req {
  margin-left: 2px;
  color: var(--lead-danger);
  font-weight: 700;
}

.lead-input {
  display: block;
  width: 100%;
  min-width: 0;
  height: 44px;
  margin: 0;
  padding: 0 12px;
  border: 1px solid var(--lead-border);
  border-radius: 10px;
  background-color: #ffffff;
  color: var(--lead-slate-900);
  font-size: 14px;
  line-height: normal;
  text-overflow: ellipsis;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.lead-input::placeholder {
  color: var(--lead-slate-400);
  opacity: 1;
  text-overflow: ellipsis;
}

.lead-input:hover:not(:disabled):not(.lead-input--readonly) {
  border-color: #cbd5e1;
}

.lead-input:focus {
  border-color: var(--lead-blue);
  box-shadow: 0 0 0 3px var(--lead-blue-ring);
}

.lead-input:disabled,
.lead-input--readonly,
.lead-input[readonly] {
  background-color: #f8fafc;
  color: var(--lead-slate-500);
  cursor: not-allowed;
}

.lead-textarea {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 96px;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--lead-border);
  border-radius: 10px;
  background: #ffffff;
  color: var(--lead-slate-900);
  font-size: 14px;
  line-height: 1.5;
  resize: vertical; /* vertical only: can't be dragged past the card */
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.lead-textarea::placeholder {
  color: var(--lead-slate-400);
  opacity: 1;
}

.lead-textarea:hover {
  border-color: #cbd5e1;
}

.lead-textarea:focus {
  border-color: var(--lead-blue);
  box-shadow: 0 0 0 3px var(--lead-blue-ring);
}

/* ---------------- Two-column grid ----------------
   minmax(0, 1fr) is the key: columns may shrink below their content,
   so nothing can push the card wider than the drawer. */
.lead-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 16px;
  width: 100%;
  min-width: 0;
  margin: 0;
}

@media (max-width: 359px) {
  .lead-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* ---------------- Lookup input (search icon + input + spinner) ---------------- */
.lead-lookup {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--lead-border);
  border-radius: 10px;
  background: #ffffff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.lead-lookup:hover {
  border-color: #cbd5e1;
}

.lead-lookup:focus-within {
  border-color: var(--lead-blue);
  box-shadow: 0 0 0 3px var(--lead-blue-ring);
}

.lead-lookup-icon {
  flex: 0 0 auto;
  color: var(--lead-slate-400);
}

.lead-lookup-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--lead-slate-900);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
}

.lead-lookup-input::placeholder {
  color: var(--lead-slate-400);
  opacity: 1;
}

.lead-lookup-input:disabled {
  color: var(--lead-slate-400);
  cursor: not-allowed;
}

.lead-lookup-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  border: 2px solid rgba(37, 99, 235, 0.25);
  border-top-color: var(--lead-blue);
  border-radius: 50%;
  animation: leadSpin 0.7s linear infinite;
}

@keyframes leadSpin {
  to { transform: rotate(360deg); }
}

/* ---------------- Hints / errors ---------------- */
.lead-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  color: var(--lead-slate-500);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
}

.lead-hint--success {
  color: #059669;
}

.lead-field-error {
  margin: 0;
  color: var(--lead-danger);
  font-size: 12px;
  font-weight: 500;
}

/* ---------------- Footer: Cancel (white) + primary, right-aligned, never clipped ---------------- */
.lead-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
  margin: 0;
  padding-top: 20px;
  border-top: 1px solid var(--lead-divider);
}

/* ---------------- Buttons ---------------- */
.lead-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  height: 44px;
  padding: 0 20px;
  border: 1px solid transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.005em;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease,
    box-shadow 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.lead-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--lead-blue-ring);
}

.lead-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.lead-btn--ghost {
  background: #ffffff;
  border-color: var(--lead-border);
  color: var(--lead-slate-700);
}

.lead-btn--ghost:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.lead-btn--primary {
  background: var(--lead-blue);
  border-color: var(--lead-blue);
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.25);
}

.lead-btn--primary:hover:not(:disabled) {
  background: var(--lead-blue-hover);
  border-color: var(--lead-blue-hover);
}

/* ==========================================================================
   SUB-DIALOGS (new customer / new salesperson / success)
   No dimming, no blur: overlay is transparent and only catches clicks.
   ========================================================================== */
.lead-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: grid;
  place-items: center;
  padding: 16px;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  animation: leadFade 0.15s ease both;
}

@keyframes leadFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.lead-modal {
  display: flex;
  flex-direction: column;
  width: min(440px, 100%);
  max-height: calc(100dvh - 32px);
  overflow: hidden;
  background: #ffffff;
  border: 1px solid var(--lead-border);
  border-radius: 12px;
  box-shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.14),
    0 1px 3px rgba(15, 23, 42, 0.06);
  animation: leadRise 0.18s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes leadRise {
  from { opacity: 0; transform: translateY(6px) scale(0.99); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.lead-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--lead-divider);
  flex-shrink: 0;
}

.lead-modal-kicker {
  display: block;
  margin-bottom: 4px;
  color: var(--lead-blue);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.lead-modal-title {
  margin: 0;
  color: var(--lead-slate-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
}

.lead-modal-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  overflow-y: auto;
  flex: 1 1 auto;
}

.lead-modal-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px 20px;
  border-top: 1px solid var(--lead-divider);
  background: #ffffff;
  flex-shrink: 0;
}

.lead-mobile-lock {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #eff6ff;
}

.lead-mobile-lock span {
  color: var(--lead-slate-500);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.lead-mobile-lock strong {
  color: #1e40af;
  font-size: 15px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.lead-mobile-lock small {
  margin-top: 2px;
  color: var(--lead-slate-500);
  font-size: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .lead-page *,
  .lead-page *::before,
  .lead-page *::after,
  .lead-modal-overlay,
  .lead-modal,
  .lead-lookup-spinner {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}


/* ==========================================================================
   SUCCESS POPUP — dimmed, blurred backdrop (same look as the drawer backdrop).
   Rendered in a portal on <body>, so it declares the tokens it needs.
   ========================================================================== */
.lead-modal-overlay--backdrop {
  --lead-blue: #2563eb;
  --lead-blue-hover: #1d4ed8;
  --lead-blue-ring: rgba(37, 99, 235, 0.14);
  --lead-slate-900: #0f172a;
  --lead-slate-700: #334155;
  --lead-slate-500: #64748b;
  --lead-slate-400: #94a3b8;
  --lead-border: #e2e8f0;
  --lead-divider: #f1f5f9;

  z-index: 1500;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.lead-modal-overlay--backdrop,
.lead-modal-overlay--backdrop *,
.lead-modal-overlay--backdrop *::before,
.lead-modal-overlay--backdrop *::after {
  box-sizing: border-box;
}

.lead-modal-overlay--backdrop button {
  font-family: inherit;
}

.lead-modal-overlay--backdrop .lead-modal {
  box-shadow: 0 24px 60px -12px rgba(15, 23, 42, 0.35),
    0 2px 6px rgba(15, 23, 42, 0.08);
}
`}</style>

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
                  const name = store.storeName ?? store.name ?? `Store ${id}`;
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </select>
              {storeError && <p className="lead-field-error">{storeError}</p>}
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
                  selectedSalesperson?.id ? String(selectedSalesperson.id) : ""
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
              onChange={(event) => setCustomerRequirement(event.target.value)}
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
                <span className="lead-modal-kicker">New Customer</span>
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
                          event.target.value,
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
                            event.target.value.toUpperCase(),
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
                <span className="lead-modal-kicker">New Salesperson</span>
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
      {createdLead &&
        !isEditMode &&
        createPortal(
          <div className="lead-modal-overlay lead-modal-overlay--backdrop">
            <div className="lead-modal" role="dialog" aria-modal="true">
              <div className="lead-modal-head">
                <div>
                  <span className="lead-modal-kicker">Lead Created</span>
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
                  onClick={handleViewCreatedLead}
                >
                  View Lead
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
