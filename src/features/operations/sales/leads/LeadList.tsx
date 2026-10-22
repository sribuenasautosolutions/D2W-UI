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

import { getAllStores } from "../../../../services/storeService";

import {
  getLeads,
  updateLead,
  completeLeadProcurement,
} from "../../../../services/leadService";
import {
  getCustomerByMobile,
  saveCustomer,
  searchCustomersByStore,
} from "../../../../services/customerService";
import {
  createSalesperson,
  getSalespersons,
} from "../../../../services/salespersonService";

import LeadCreate from "./LeadCreate";
import LeadKanbanCard from "./LeadKanbanCard";
import LeadProcurementDrawer from "./LeadProcurementDrawer";
import LeadFollowUpDrawer from "./LeadFollowupDrawer";

/* ============================================================
   STAGE DEFINITIONS  (Proforma removed)
   ============================================================ */

const STAGES = [
  { key: "NEW", label: "New Leads", Icon: UserPlus },
  { key: "PROCUREMENT", label: "Procurement", Icon: PackageCheck },
  { key: "FOLLOW_UP", label: "Customer Follow-up", Icon: Phone },
  { key: "WON", label: "Won", Icon: Trophy },
  { key: "LOST", label: "Lost", Icon: X },
];

const KPI_DEFINITIONS = [
  { key: "total", label: "Total Leads", Icon: Users },
  { key: "followUp", label: "Follow-ups Due", Icon: Phone },
  { key: "won", label: "Won Leads", Icon: Trophy },
  { key: "lost", label: "Lost Leads", Icon: X },
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
    (item) => item !== null && item !== undefined && String(item).trim() !== "",
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
        <FieldHint message={salespersonMessage} found={salespersonFound} />
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
    (item) => item.value.toLowerCase() === raw.toLowerCase(),
  );
  if (exact) return exact.value;
  const label = EDIT_SOURCE_OPTIONS.find(
    (item) => item.label.toLowerCase() === raw.toLowerCase(),
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
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  /* ---- drawer mode: "view" | "edit" ---- */
  const [mode, setMode] = useState(initialMode);
  const isView = mode === "view";
  // Any edit interaction while in Overview flips the drawer to Edit mode
  const enterEdit = () =>
    setMode((current) => (current === "view" ? "edit" : current));

  const [storeId] = useState(
    String(lead?.storeId ?? lead?.store?.id ?? user?.storeId ?? ""),
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
      lead?.source ?? lead?.sourceName ?? lead?.leadSource ?? "",
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
      lead?.mobile,
    ) || "",
  );
  const [customerName, setCustomerName] = useState(
    firstValue(
      lead?.customerName,
      lead?.customer?.customerName,
      lead?.customer?.name,
    ) || "",
  );
  const [selectedCustomer, setSelectedCustomer] = useState<any>(
    lead?.customerId || lead?.customer?.id
      ? {
          id: lead?.customerId ?? lead?.customer?.id,
          customerName:
            firstValue(
              lead?.customerName,
              lead?.customer?.customerName,
              lead?.customer?.name,
            ) || "",
          mobileNumber:
            firstValue(
              lead?.customerPhone,
              lead?.customerMobile,
              lead?.customer?.mobileNumber,
              lead?.customer?.mobile,
            ) || "",
        }
      : null,
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
      lead?.salesperson?.mobile,
    ) || "",
  );
  const [salespersonName, setSalespersonName] = useState(
    firstValue(
      lead?.salespersonName,
      lead?.salesperson?.salespersonName,
      lead?.salesperson?.name,
    ) || "",
  );
  const [selectedSalesperson, setSelectedSalesperson] = useState<any>(
    lead?.salespersonId || lead?.salesperson?.id
      ? {
          id: lead?.salespersonId ?? lead?.salesperson?.id,
          salespersonName:
            firstValue(
              lead?.salespersonName,
              lead?.salesperson?.salespersonName,
              lead?.salesperson?.name,
            ) || "",
          mobileNumber:
            firstValue(
              lead?.salespersonMobile,
              lead?.salesperson?.mobileNumber,
              lead?.salesperson?.mobile,
            ) || "",
        }
      : null,
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
        lead?.leadSourceName,
    ),
  );
  const [customerRequirement, setCustomerRequirement] = useState(
    lead?.customerRequirement || "",
  );
  const [location, setLocation] = useState(
    lead?.location ?? lead?.storeLocation ?? "",
  );
  const [assignTo, setAssignTo] = useState(
    lead?.assignedTo ?? lead?.assignedToName ?? "",
  );
  const [saving, setSaving] = useState(false);

  /* ---- dirty detection ---- */
  const hasChanges = useMemo(() => {
    const s = initialSnapshot;
    return (
      String(selectedCustomer?.id || "") !== String(s.customerId || "") ||
      String(selectedSalesperson?.id || "") !== String(s.salespersonId || "") ||
      (source || "") !== (s.source || "") ||
      customerRequirement.trim() !== (s.customerRequirement || "").trim() ||
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
        const salespersonId = lead?.salespersonId ?? lead?.salesperson?.id;
        if (salespersonId) {
          const existing = list.find(
            (item) =>
              String(item?.id ?? item?.salespersonId) === String(salespersonId),
          );
          if (existing) {
            setSelectedSalesperson(existing);
            setSalespersonMobile(
              existing?.mobileNumber ?? existing?.mobile ?? salespersonMobile,
            );
            setSalespersonName(
              existing?.salespersonName ?? existing?.name ?? salespersonName,
            );
            setSalespersonMessage("Existing salesperson selected.");
          }
        }
      } catch (error) {
        console.error("Unable to load salespersons:", error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
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
      lead?.customer?.name,
    );
    if (!name) return undefined;
    const resolve = async () => {
      try {
        const result = await searchCustomersByStore(Number(storeId), name);
        if (cancelled || !Array.isArray(result)) return;
        const existing = result.find(
          (item) =>
            String(item?.id ?? item?.customerId) ===
            String(selectedCustomer.id),
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
    return () => {
      cancelled = true;
    };
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
      if (error?.response?.status === 404 || error?.response?.status === 204) {
        setCustomerForm({
          ...EMPTY_EDIT_CUSTOMER,
          mobileNumber: mobile,
        });
        setCustomerModalOpen(true);
      } else {
        setCustomerMessage(
          error?.response?.data?.message || "Unable to check customer.",
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
          "Unable to save customer.",
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  /* ---- salesperson lookup ---- */
  const lookupSalesperson = (mobile) => {
    if (!storeId || !/^\d{10}$/.test(mobile)) return;
    const found = salespersons.find(
      (item) => String(item?.mobileNumber ?? item?.mobile ?? "") === mobile,
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
          "Unable to save salesperson.",
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
      const payload: any = {
        customerId: selectedCustomer.id,
        salespersonId:
          selectedSalesperson?.id ?? selectedSalesperson?.salespersonId ?? null,
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
          "Unable to update lead.",
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
                    updateCustomerForm("customerName", e.target.value)
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
                    updateCustomerForm("customerType", e.target.value)
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
                      value={customerForm.gstRegistrationType}
                      onChange={(e) =>
                        updateCustomerForm(
                          "gstRegistrationType",
                          e.target.value,
                        )
                      }
                    >
                      <option value="UNREGISTERED">Unregistered</option>
                      <option value="REGISTERED">Registered</option>
                    </select>
                  </div>
                  {customerForm.gstRegistrationType === "REGISTERED" && (
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
                            e.target.value.toUpperCase(),
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
                {savingCustomer ? "Saving..." : "Create Customer"}
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
                {savingSalesperson ? "Saving..." : "Create Salesperson"}
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

  /* ---- salespersons for drawers ---- */
  const [drawerSalespersons, setDrawerSalespersons] = useState<any[]>([]);
  const [drawerStoreId, setDrawerStoreId] = useState<string>("");

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
        store ? Number(store) : null,
      );
      if (version !== loadVersion.current) return;
      const content = Array.isArray((response as any)?.content)
        ? response.content
        : [];
      setLeads(content);
      setTotalPages(Number(response?.totalPages || 0));
      setTotalElements(Number(response?.totalElements || 0));

      // Derive storeId from first lead or localStorage and load salespersons
      const inferredStoreId =
        store ||
        (content[0]?.storeId ? String(content[0].storeId) : "") ||
        String(localStorage.getItem("storeId") || "");
      if (inferredStoreId && inferredStoreId !== drawerStoreId) {
        setDrawerStoreId(inferredStoreId);
        getSalespersons(Number(inferredStoreId))
          .then((list) => {
            if (Array.isArray(list)) setDrawerSalespersons(list);
          })
          .catch(() => {});
      }
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
        !query || searchableValues.some((item) => item.includes(query));
      const matchesSalesperson =
        !salesperson ||
        String(lead?.salespersonId || "") === String(salesperson);
      const matchesStore =
        !store || String(lead?.storeId || "") === String(store);
      const leadSource = firstValue(
        lead?.sourceId,
        lead?.source,
        lead?.sourceName,
      );
      const matchesSource =
        !source || String(leadSource || "") === String(source);
      const matchesStatus = !filterStatus || getStage(lead) === filterStatus;
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
    const groups = Object.fromEntries(STAGES.map((stage) => [stage.key, []]));
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
    [counts],
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
    getAllStores()
      .then((response) => {
        if (!cancelled) {
          let user: any = {};
          try {
            user = JSON.parse(localStorage.getItem("user") || "{}");
          } catch {
            /* Invalid session data: no extra store choices. */
          }
          const rows = Array.isArray(response)
            ? response
            : (response as any)?.content || [];
          setAuthorizedStores(
            user.role === "SUPER_ADMIN"
              ? rows
              : rows.filter((row) => String(row.id) === String(user.storeId)),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setAuthorizedStores([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const storeOptions = useMemo(() => {
    const map = new Map();
    authorizedStores.forEach((row) =>
      map.set(String(row.id), row.storeName || row.storeCode),
    );
    leads.forEach((row) => {
      if (row.storeId != null && row.storeName)
        map.set(String(row.storeId), row.storeName);
    });
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
    searchTerm.trim() || salesperson || store || source || filterStatus,
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

  // Card click â†’ read-only Lead Overview (flips to Edit on first keystroke)
  const handleOpenOverview = (lead) =>
    setDrawer({ lead, mode: "view", nonce: Date.now() });

  // Edit button â†’ editable "Edit Lead"
  const handleEditLead = (lead) =>
    setDrawer({ lead, mode: "edit", nonce: Date.now() });

  const handleOpenProcurement = (lead) => {
    if (lead?.id) setProcurementLead(lead);
  };

  const handleOpenFollowUp = (lead) => {
    if (lead?.id) setFollowUpLead(lead);
  };

  // Procurement â†’ Follow-up: direct move, no drawer
  const handleMoveToFollowUp = async (lead) => {
    if (!lead?.id) return;
    try {
      await completeLeadProcurement(lead.id);
      pushToast(
        `${lead.leadNumber || "Lead"} moved to Customer Follow-up`,
        "success",
      );
      loadLeads();
    } catch (error) {
      pushToast(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Unable to move lead to follow-up.",
        "error",
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
      <style>{`/* ==========================================================================
   Leads â€” Kanban board + right-side drawer
   White bg Â· black bold headings Â· minimal, professional
   ========================================================================== */

.lead-page {
    --blue: #2563eb;
    --ink: #000000;
    --text: #111827;
    --muted: #6b7280;
    --soft: #9ca3af;
    --border: #e5e7eb;
    --border-strong: #d1d5db;
    --surface: #ffffff;
    --surface-soft: #f9fafb;

    --radius: 8px;
    --radius-sm: 6px;

    width: 100%;
    min-height: 100%;
    /* padding: var(--sp-4) var(--sp-5) var(--sp-6);                 */
    background: #ffffff;
    color: var(--text);


    font-size: 14px;
    line-height: 1.45;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
}

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
}

/* Global Inter override (page + drawer + sub-forms) */
.lead-page,
.lead-page *,
.lead-drawer,
.lead-drawer *,
.lead-create-page,
.lead-create-page * {

}

/* ==========================================================================
   HEADER
   ========================================================================== */
.lead-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    margin-top: 0;
    margin-bottom: var(--sp-4);
    padding-top: 0;
    flex-wrap: wrap;
}

.lead-title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--ink);
    line-height: 1.15;
}

.lead-header-actions {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
}

.lead-new-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    height: 36px;
    padding: 0 var(--sp-4);
    background: var(--blue);
    color: #ffffff;
    border: 1px solid var(--blue);
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease;
}
.lead-new-btn:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
}

/* ==========================================================================
   KPI CARDS
   ========================================================================== */
.lead-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--sp-3);
    margin-bottom: var(--sp-3);
}

.lead-kpi-card {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    border: 1px solid var(--border);
    border-left: 3px solid var(--border-strong);
    border-radius: var(--radius);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    cursor: pointer;
    text-align: left;
    transition: box-shadow 0.15s ease, transform 0.08s ease,
        background-color 0.15s ease, border-color 0.15s ease;
}
.lead-kpi-card:hover {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}
.lead-kpi-card:active {
    transform: translateY(1px);
}

.lead-kpi-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    transition: transform 0.15s ease;
}
.lead-kpi-card:hover .lead-kpi-icon {
    transform: none;
}

.lead-kpi-content {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.lead-kpi-label {
    font-size: 12px;
    font-weight: 800;
    color: var(--ink);
    letter-spacing: -0.005em;
    text-transform: uppercase;
    margin-bottom: 2px;
}

.lead-kpi-number {
    font-size: 20px;
    font-weight: 800;
    color: var(--ink);
    letter-spacing: -0.02em;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
}

/* Card 1 â€” TOTAL LEADS Â· BLUE */
.lead-kpi-card:nth-child(1) {
    background: #f8fbff;
    border-color: #dbeafe;
    border-left-color: #2563eb;
}
.lead-kpi-card:nth-child(1) .lead-kpi-icon {
    background: #dbeafe;
    color: #2563eb;
}

/* Card 2 â€” FOLLOW-UPS DUE Â· AMBER */
.lead-kpi-card:nth-child(2) {
    background: #fffdf5;
    border-color: #fde68a;
    border-left-color: #d97706;
}
.lead-kpi-card:nth-child(2) .lead-kpi-icon {
    background: #fef3c7;
    color: #d97706;
}

/* Card 3 â€” WON LEADS Â· GREEN */
.lead-kpi-card:nth-child(3) {
    background: #f7fdf9;
    border-color: #bbf7d0;
    border-left-color: #16a34a;
}
.lead-kpi-card:nth-child(3) .lead-kpi-icon {
    background: #dcfce7;
    color: #16a34a;
}

/* Card 4 â€” LOST LEADS Â· RED */
.lead-kpi-card:nth-child(4) {
    background: #fffafa;
    border-color: #fecaca;
    border-left-color: #dc2626;
}
.lead-kpi-card:nth-child(4) .lead-kpi-icon {
    background: #fee2e2;
    color: #dc2626;
}

/* ==========================================================================
   TOOLBAR
   ========================================================================== */
.lead-toolbar {
    display: grid;
    grid-template-columns: minmax(200px, 1fr) auto auto auto auto auto;
    gap: var(--sp-2);
    align-items: center;
    margin-bottom: var(--sp-3);
    padding: var(--sp-3) var(--sp-3);
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: var(--radius);
}

.lead-toolbar-search {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    height: 36px;
    padding: 0 var(--sp-3);
    background: var(--surface-soft);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    transition: border-color 0.15s ease, box-shadow 0.15s ease,
        background 0.15s ease;
}
.lead-toolbar-search:focus-within {
    background: #ffffff;
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
.lead-toolbar-search svg {
    flex-shrink: 0;
    color: var(--soft);
}
.lead-toolbar-search input {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 13px;
    color: var(--text);
}
.lead-toolbar-search input::placeholder {
    color: var(--soft);
}

.lead-toolbar-select {
    height: 36px;
    padding: 0 var(--sp-3);
    min-width: 140px;
    background: #ffffff;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.005em;
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.lead-toolbar-select option {
    font-weight: 600;
    color: var(--ink);
}
.lead-toolbar-select:hover {
    border-color: var(--soft);
}
.lead-toolbar-select:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.lead-toolbar-reset {
    height: 36px;
    padding: 0 var(--sp-3);
    background: #ffffff;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    color: var(--muted);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
}
.lead-toolbar-reset:hover {
    background: var(--surface-soft);
    color: var(--text);
}

/* ==========================================================================
   FOLLOW-UP ALERT
   ========================================================================== */
.lead-followup-alert {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    flex-wrap: wrap;
    padding: var(--sp-3) var(--sp-3);
    margin-bottom: var(--sp-3);
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-left: 3px solid #d97706;
    border-radius: var(--radius);
}

.lead-alert-content {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    flex: 1 1 auto;
    min-width: 0;
}

.lead-alert-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: #f59e0b;
    color: #ffffff;
}

.lead-alert-content div {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.lead-alert-content strong {
    color: #78350f;
    font-size: 12.5px;
    font-weight: 700;
}
.lead-alert-content span {
    color: #92400e;
    font-size: 11.5px;
}

.lead-alert-action,
.lead-alert-close {
    border: 0;
    background: transparent;
    cursor: pointer;
    font: inherit;
}
.lead-alert-action {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-2) var(--sp-1);
    color: #d97706;
    font-size: 12.5px;
    font-weight: 700;
}
.lead-alert-action:hover {
    text-decoration: underline;
}
.lead-alert-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-sm);
    color: #d97706;
}
.lead-alert-close:hover {
    background: rgba(0, 0, 0, 0.05);
}

/* ==========================================================================
   KANBAN BOARD
   ========================================================================== */
.lead-kanban {
    width: 100%;
    overflow-x: auto;
    padding-bottom: var(--sp-1);
    scrollbar-width: none;
    -ms-overflow-style: none;
}
.lead-kanban::-webkit-scrollbar {
    display: none;
}

.lead-kanban-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(240px, 1fr));
    gap: var(--sp-3);
    align-items: start;
    min-width: 100%;
}

.lead-kanban-col {
    display: flex;
    flex-direction: column;
    background: var(--surface-soft);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--sp-3);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

/* Column tint per stage */
.lead-kanban-col--new {
    background: #eff6ff;
    border-color: #dbeafe;
}
.lead-kanban-col--procurement {
    background: #fff7ed;
    border-color: #fed7aa;
}
.lead-kanban-col--follow_up {
    background: #fffbeb;
    border-color: #fde68a;
}
.lead-kanban-col--won {
    background: #f0fdf4;
    border-color: #bbf7d0;
}
.lead-kanban-col--lost {
    background: #fef2f2;
    border-color: #fecaca;
}

/* Active column ring */
.lead-kanban-col.is-active {
    border-width: 2px;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
}
.lead-kanban-col--new.is-active {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.lead-kanban-col--procurement.is-active {
    border-color: #ea580c;
    box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.15);
}
.lead-kanban-col--follow_up.is-active {
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.15);
}
.lead-kanban-col--won.is-active {
    border-color: #16a34a;
    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
}
.lead-kanban-col--lost.is-active {
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
}

.lead-kanban-col-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-2);
    margin-bottom: var(--sp-3);
    padding: 0 2px;
    background: transparent;
    border: 0;
}

.lead-kanban-col-title {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    font-size: 12.5px;
    font-weight: 800;
    letter-spacing: -0.01em;
    text-transform: uppercase;
    color: var(--ink);
}
.lead-kanban-col-title svg {
    color: var(--ink);
    opacity: 0.75;
}

.lead-kanban-col-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 20px;
    padding: 0 var(--sp-2);
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 999px;
    color: var(--ink);
    font-size: 11px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
}

.lead-kanban-col .lead-card {
    background: #ffffff;
}

.lead-kanban-col-body {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    min-height: 40px;
}

.lead-kanban-empty {
    padding: var(--sp-5) var(--sp-2);
    text-align: center;
    color: var(--soft);
    font-size: 12px;
}

/* ==========================================================================
   LEAD CARD (compact, Kanban)
   ========================================================================== */
.lead-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    cursor: pointer;
    transition: box-shadow 0.15s ease, transform 0.08s ease,
        border-color 0.15s ease;
}
.lead-card:hover {
    border-color: var(--border-strong);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
}

.lead-card-body {
    display: flex;
    flex-direction: column;
    padding: var(--sp-3) var(--sp-3) var(--sp-3);
}

/* ---- New card structure ---- */
.lead-card-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-2);
    margin-bottom: var(--sp-2);
}

.lead-card-number {
    font-size: 11.5px;
    font-weight: 800;
    color: var(--ink);
    letter-spacing: -0.005em;
    font-variant-numeric: tabular-nums;
}

.lead-card-customer {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    margin-bottom: var(--sp-2);
    min-width: 0;
}
.lead-card-customer-name {
    overflow: hidden;
    color: var(--ink);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ---- Legacy card header (kept) ---- */
.lead-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--sp-2);
    margin-bottom: var(--sp-2);
}
.lead-card-title-block {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    min-width: 0;
    flex: 1 1 auto;
}
.lead-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--blue);
    border: 1px solid var(--blue);
    color: #ffffff;
    font-size: 11.5px;
    font-weight: 700;
}
.lead-card-title-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.lead-card-title-text strong {
    overflow: hidden;
    color: var(--ink);
    font-size: 12.5px;
    font-weight: 700;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.lead-card-title-text span {
    color: var(--muted);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
}

.lead-card-edit-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: rgba(37, 99, 235, 0.08);
    border: 1px solid rgba(37, 99, 235, 0.25);
    border-radius: var(--radius-sm);
    color: var(--blue);
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease,
        border-color 0.15s ease;
}
.lead-card-edit-btn:hover {
    background: rgba(37, 99, 235, 0.08);
    border-color: var(--blue);
    color: var(--blue);
}

.lead-card-contact {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) 0;
    color: var(--text);
    font-size: 11.5px;
    font-weight: 500;
}
.lead-card-contact svg {
    color: #05cb4a;
    flex-shrink: 0;
}

.lead-card-vehicle {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) 0;
    border-top: 1px solid var(--border);
    min-width: 0;
}
.lead-card-vehicle > svg {
    flex: 0 0 auto;
    color: #185ec1;
}
.lead-card-vehicle > div {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.lead-card-vehicle span,
.lead-card-item-preview span {
    color: var(--muted);
    font-size: 10px;
    font-weight: 500;
}
.lead-card-vehicle strong,
.lead-card-item-preview strong {
    overflow: hidden;
    color: var(--text);
    font-size: 11.5px;
    font-weight: 600;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.lead-card-item-preview {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--sp-2) 0;
    border-top: 1px solid var(--border);
    min-width: 0;
}

.lead-card-requirement {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    padding: var(--sp-2) 0;
    border-top: 1px solid var(--border);
    min-width: 0;
}
.lead-card-requirement span {
    color: var(--muted);
    font-size: 10px;
    font-weight: 500;
}
.lead-card-requirement-input {
    width: 100%;
    resize: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-soft);
    color: var(--text);
    font-size: 11.5px;
    font-weight: 600;
    line-height: 1.35;
    padding: var(--sp-2) var(--sp-2);
    font-family: inherit;
    pointer-events: none;
}
.lead-card-requirement-input:focus {
    outline: none;
}

.lead-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-2);
    padding-top: var(--sp-2);
    margin-top: var(--sp-1);
    border-top: 1px solid var(--border);
}

.lead-card-footer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-2);
    padding-top: var(--sp-2);
    margin-top: var(--sp-1);
    border-top: 1px solid var(--border);
}

.lead-card-salesperson {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    color: var(--text);
    font-size: 11.5px;
    font-weight: 600;
    min-width: 0;
}
.lead-card-salesperson svg {
    flex: 0 0 auto;
    color: #7c3aed;
}
.lead-card-salesperson span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.lead-card-procurement-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-1) var(--sp-2);
    background: rgba(37, 99, 235, 0.08);
    border: 1px solid rgba(37, 99, 235, 0.3);
    border-radius: var(--radius-sm);
    color: var(--blue);
    font-size: 10.5px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.15s ease;
}
.lead-card-procurement-btn:hover {
    background: rgba(37, 99, 235, 0.15);
}

.lead-card-stage-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    padding: 3px var(--sp-2);
    background: var(--surface-soft);
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text);
    font-size: 10.5px;
    font-weight: 700;
    white-space: nowrap;
}
.lead-card-item-count {
    color: var(--muted);
    font-size: 10.5px;
    font-weight: 600;
    white-space: nowrap;
}

/* ==========================================================================
   EMPTY / LOADING
   ========================================================================== */
.lead-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    padding: var(--sp-9) var(--sp-6);
    text-align: center;
}
.lead-empty-state strong {
    color: var(--ink);
    font-size: 14px;
    font-weight: 700;
}
.lead-empty-state span {
    color: var(--muted);
    font-size: 12.5px;
}

/* ==========================================================================
   PAGINATION
   ========================================================================== */
.lead-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-3);
    margin-top: var(--sp-4);
}
.lead-pagination button {
    height: 34px;
    padding: 0 var(--sp-4);
    background: #ffffff;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
}
.lead-pagination button:hover:not(:disabled) {
    background: var(--surface-soft);
}
.lead-pagination button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}
.lead-pagination span {
    color: var(--muted);
    font-size: 12.5px;
    font-weight: 500;
}

/* ==========================================================================
   RIGHT-SIDE DRAWER (Create Lead + Edit Lead)
   ========================================================================== */
.lead-drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(15, 23, 42, 0.35);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    animation: leadDrawerFade 0.18s ease both;
}
@keyframes leadDrawerFade {
    from { opacity: 0; }
    to   { opacity: 1; }
}

.lead-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(560px, 100%);
    max-width: 100vw;
    background: #ffffff;
    border-left: 1px solid var(--border);
    box-shadow: -20px 0 50px rgba(15, 23, 42, 0.18);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: leadDrawerSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes leadDrawerSlide {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
}

/* Legacy drawer fallback (in case class isn't applied) */
.lead-drawer .lead-create-page {
    min-height: auto;
    max-height: 100%;
    overflow-y: auto;
    padding: var(--sp-4) var(--sp-5) var(--sp-6);
    background: #ffffff;
    flex: 1 1 auto;
    box-sizing: border-box;
    scrollbar-width: thin;
    scrollbar-color: rgba(60, 60, 67, 0.2) transparent;
}
.lead-drawer .lead-create-page::-webkit-scrollbar {
    width: 6px;
}
.lead-drawer .lead-create-page::-webkit-scrollbar-thumb {
    background: rgba(60, 60, 67, 0.2);
    border-radius: 3px;
}
.lead-drawer > .lead-create-header,
.lead-drawer > .lead-create-form {
    padding: var(--sp-4) var(--sp-5);
}




/* ============================================================
   DRAWER â€” compact on all sides, no bottom gap
   ============================================================ */
.lead-drawer--narrow {
    width: min(440px, 100%) !important;
    top: 0;
    bottom: 0;
    height: 100vh;
    max-height: 100vh;
    max-width: 100vw;
    overflow: hidden;
}

/* page wrapper â€” kill all outer padding, no gap */
.lead-drawer--narrow .lead-create-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100vh;
    padding: var(--sp-4) var(--sp-3) var(--sp-2);
    box-sizing: border-box;
    overflow: hidden;
    background: #ffffff;
    gap: 0;
}

/* header â€” small compact padding, no top gap */
.lead-drawer--narrow .lead-create-header {
    margin: 0;
    padding: var(--sp-3) var(--sp-4) var(--sp-2);
     padding-top: var(--sp-1);
}

/* card â€” remove centering, remove own padding/border, scroll inside */
.lead-drawer--narrow .lead-create-card {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);                       /* line spacing between fields */
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 0 var(--sp-4) var(--sp-2);             /* flush with drawer edges */
    border: 0;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(60, 60, 67, 0.2) transparent;
}
.lead-drawer--narrow .lead-create-card::-webkit-scrollbar {
    width: 6px;
}
.lead-drawer--narrow .lead-create-card::-webkit-scrollbar-thumb {
    background: rgba(60, 60, 67, 0.2);
    border-radius: 3px;
}

/* kill any margins on individual fields */
.lead-drawer--narrow .lead-field,
.lead-drawer--narrow .lead-section-grid,
.lead-drawer--narrow .requirement-section {
    margin: 0;
}

/* submit bar â€” sits right after the last field, no auto gap */
.lead-drawer--narrow .lead-submit-bar {
    margin: var(--sp-2) 0 0;                 /* small gap after fields */
    padding: var(--sp-3) var(--sp-4) var(--sp-4);
    border-top: 1px solid #e5e7eb;
    background: #ffffff;
    flex: 0 0 auto;
}

/* stacked action buttons */
.lead-submit-bar--stacked {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
}

/* Generic scroll wrapper (used by some drawer forms) */
.lead-drawer-scroll {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: var(--sp-4) var(--sp-5) var(--sp-6);
    box-sizing: border-box;
    scrollbar-width: thin;
    scrollbar-color: rgba(60, 60, 67, 0.2) transparent;
}
.lead-drawer-scroll::-webkit-scrollbar {
    width: 6px;
}
.lead-drawer-scroll::-webkit-scrollbar-thumb {
    background: rgba(60, 60, 67, 0.2);
    border-radius: 3px;
}

/* Bold labels in drawer forms */
.lead-create-form label {
    font-weight: 700 !important;
}

/* Sub-line under Edit Lead title */
.lead-edit-sub {
    margin-top: 2px;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    letter-spacing: 0.02em;
}

/* Stacked submit bar (Create/Update + Open Procurement) */
.lead-submit-bar--stacked {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
}

/* ==========================================================================
   BUTTONS â€” Open Procurement (drawer + card variants)
   ========================================================================== */
.lead-create-procurement-btn,
.open-procurement-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    height: 40px;
    width: 100%;
    padding: 0 var(--sp-4);
    background: #ffffff;
    color: var(--blue, #2563eb);
    border: 1px solid var(--blue, #2563eb);
    border-radius: var(--radius-sm, 8px);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.15s ease;
}
.lead-create-procurement-btn:hover,
.open-procurement-button:hover {
    background: rgba(37, 99, 235, 0.08);
}

/* ==========================================================================
   RESPONSIVE
   Assumes the layout shell auto-collapses the sidebar (hamburger) on mobile,
   so the content area below gets full viewport width.
   ========================================================================== */

/* ---------- â‰¤ 1280px : tighter toolbar ---------- */
@media (max-width: 1280px) {
    .lead-toolbar {
        grid-template-columns: minmax(180px, 1fr) 1fr 1fr 1fr;
    }
    .lead-toolbar-select {
        min-width: 120px;
    }
}

/* ---------- â‰¤ 1024px : tablet ---------- */
@media (max-width: 1024px) {
    .lead-kpi-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .lead-toolbar {
        grid-template-columns: 1fr 1fr;
    }
    .lead-toolbar-select {
        min-width: 0;
    }
    /* Kanban switches to vertical stack â€” no horizontal scroll */
    .lead-kanban {
        overflow-x: visible;
    }
    .lead-kanban-grid {
        grid-template-columns: 1fr;
        gap: var(--sp-3);
    }
}

/* ---------- â‰¤ 768px : tablet portrait / large phone ---------- */
@media (max-width: 768px) {
    .lead-page {
        /* padding: var(--sp-3) var(--sp-3) var(--sp-5); */
        min-width: 0;
        overflow-x: hidden;
    }

    .lead-header {
        margin-bottom: var(--sp-3);
    }
    .lead-title {
        font-size: 20px;
    }
    .lead-new-btn {
        height: 34px;
        padding: 0 var(--sp-3);
        font-size: 12.5px;
    }

    /* KPI â€” 2 up */
    .lead-kpi-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--sp-2);
        margin-bottom: var(--sp-3);
    }
    .lead-kpi-card {
        /* padding: var(--sp-3) var(--sp-3); */
        gap: var(--sp-3);
    }
    .lead-kpi-icon {
        flex: 0 0 32px;
        width: 32px;
        height: 32px;
    }
    .lead-kpi-label {
        font-size: 10.5px;
    }
    .lead-kpi-number {
        font-size: 18px;
    }

    /* Toolbar â€” single column, full-width controls */
    .lead-toolbar {
        grid-template-columns: 1fr;
        padding: var(--sp-2) var(--sp-3);
        gap: var(--sp-2);
    }
    .lead-toolbar-search {
        grid-column: 1 / -1;
        height: 34px;
    }
    .lead-toolbar-select,
    .lead-toolbar-reset {
        min-width: 0;
        width: 100%;
        height: 34px;
        font-size: 12.5px;
    }

    /* Kanban â€” stacked vertically */
    .lead-kanban {
        overflow-x: visible;
    }
    .lead-kanban-grid {
        grid-template-columns: 1fr;
        gap: var(--sp-3);
    }
    .lead-kanban-col {
        padding: var(--sp-3);
    }
    .lead-kanban-col-title {
        font-size: 11.5px;
    }

    /* Follow-up alert â€” stack its action */
    .lead-followup-alert {
        flex-wrap: wrap;
        gap: var(--sp-2);
        padding: var(--sp-3);
    }
    .lead-alert-content {
        flex: 1 1 100%;
    }
    .lead-alert-action {
        flex: 1 1 auto;
    }

    /* Drawer â€” full width */
    .lead-drawer,
    .lead-drawer--narrow {
        width: 100% !important;
        max-width: 100vw;
        border-left: 0;
        box-shadow: -10px 0 30px rgba(15, 23, 42, 0.18);
    }
    .lead-drawer--narrow .lead-create-header {
        padding: var(--sp-3) var(--sp-4) var(--sp-2);
    }
    .lead-drawer--narrow .lead-create-card {
        padding: 0 var(--sp-4) var(--sp-2);
        gap: var(--sp-3);
    }
    .lead-drawer--narrow .lead-submit-bar {
        padding: var(--sp-3) var(--sp-4) var(--sp-3);
    }

    /* Pagination */
    .lead-pagination {
        gap: var(--sp-2);
        margin-top: var(--sp-3);
    }
    .lead-pagination button {
        height: 32px;
        padding: 0 var(--sp-3);
        font-size: 12px;
    }
    .lead-pagination span {
        font-size: 12px;
    }
}

/* ---------- â‰¤ 480px : small phones ---------- */
@media (max-width: 480px) {
    .lead-page {
        /* padding: var(--sp-3) var(--sp-3) var(--sp-4); */
        min-width: 0;
        overflow-x: hidden;
    }

    .lead-title {
        font-size: 18px;
    }
    .lead-header {
        gap: var(--sp-2);
    }
    .lead-new-btn {
        height: 32px;
        padding: 0 var(--sp-3);
        font-size: 12px;
        gap: var(--sp-1);
    }

    /* KPI â€” single column */
    .lead-kpi-grid {
        grid-template-columns: 1fr;
        gap: var(--sp-2);
    }

    /* Toolbar â€” single column */
    .lead-toolbar {
        grid-template-columns: 1fr;
        padding: var(--sp-2);
    }
    .lead-toolbar-search input {
        font-size: 12.5px;
    }
    .lead-toolbar-select,
    .lead-toolbar-reset {
        height: 34px;
        font-size: 12px;
    }

    /* Kanban â€” stacked */
    .lead-kanban-grid {
        grid-template-columns: 1fr;
        gap: var(--sp-2);
    }
    .lead-kanban-col {
        padding: var(--sp-2);
    }
    .lead-kanban-col-body {
        gap: var(--sp-2);
    }

    /* Lead card tweaks */
    .lead-card-body {
        padding: var(--sp-2) var(--sp-3);
    }
    .lead-card-customer-name {
        font-size: 12.5px;
    }
    .lead-card-number {
        font-size: 11px;
    }
    .lead-card-contact {
        font-size: 11px;
    }
    .lead-card-requirement-input {
        font-size: 11px;
        padding: var(--sp-1) var(--sp-2);
    }
    .lead-card-procurement-btn {
        font-size: 10px;
        padding: 3px var(--sp-2);
    }
    .lead-card-salesperson {
        font-size: 11px;
    }

    /* Drawer edge-to-edge */
    .lead-drawer--narrow .lead-create-page {
        padding: 0;
    }
    .lead-drawer--narrow .lead-create-header {
        padding: var(--sp-3) var(--sp-3) var(--sp-2);
    }
    .lead-drawer--narrow .lead-create-card {
        padding: 0 var(--sp-3) var(--sp-2);
        gap: var(--sp-3);
    }
    .lead-drawer--narrow .lead-submit-bar {
        padding: var(--sp-3) var(--sp-3) var(--sp-3);
    }
}

/* ---------- â‰¤ 360px : extra small phones ---------- */
@media (max-width: 360px) {
    .lead-page {
        /* padding: var(--sp-2) var(--sp-2) var(--sp-4); */
    }
    .lead-card-requirement-input {
        font-size: 10.5px;
    }
    .lead-card-customer-name {
        font-size: 12px;
    }
}

/* ---------- Landscape phones (short height) ---------- */
@media (max-height: 500px) and (orientation: landscape) {
    .lead-drawer--narrow .lead-create-header {
        padding: var(--sp-2) var(--sp-4) var(--sp-1);
    }
    .lead-drawer--narrow .lead-create-card {
        gap: var(--sp-3);
    }
    .lead-drawer--narrow .lead-submit-bar {
        padding: var(--sp-2) var(--sp-4) var(--sp-3);
    }
}

/* ---------- Reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
    .lead-drawer-backdrop,
    .lead-drawer {
        animation-duration: 0.001ms !important;
    }
}
/* ============================================================
   CLOSE BUTTONS â€” red X
   Covers: drawer header ("Close"), customer modal, salesperson modal
   ============================================================ */

/* Drawer header close button ("âœ• Close") */
.lead-drawer--narrow .lead-back-button,
.lead-drawer .lead-back-button,
.lead-create-close {
    color: #dc2626 !important;                    /* red text / icon   */
    border-color: rgba(220, 38, 38, 0.35) !important;
    background: rgba(220, 38, 38, 0.06) !important;
    transition: background-color 0.15s ease,
                color 0.15s ease,
                border-color 0.15s ease;
}

.lead-drawer--narrow .lead-back-button:hover,
.lead-drawer .lead-back-button:hover,
.lead-create-close:hover {
    color: #b91c1c !important;                    /* darker red on hover */
    border-color: #dc2626 !important;
    background: rgba(220, 38, 38, 0.12) !important;
}

/* Force the icon itself to inherit the red */
.lead-drawer--narrow .lead-back-button svg,
.lead-drawer .lead-back-button svg,
.lead-create-close svg {
    color: #dc2626 !important;
    stroke: #dc2626 !important;
}
.lead-drawer--narrow .lead-back-button:hover svg,
.lead-drawer .lead-back-button:hover svg,
.lead-create-close:hover svg {
    color: #b91c1c !important;
    stroke: #b91c1c !important;
}

/* Inner-modal close button (customer / salesperson popups) */
.modal-close {
    color: #dc2626 !important;
    border-color: rgba(220, 38, 38, 0.35) !important;
    background: rgba(220, 38, 38, 0.06) !important;
    transition: background-color 0.15s ease,
                color 0.15s ease,
                border-color 0.15s ease;
}
.modal-close:hover {
    color: #b91c1c !important;
    border-color: #dc2626 !important;
    background: rgba(220, 38, 38, 0.12) !important;
}
.modal-close svg {
    color: #dc2626 !important;
    stroke: #dc2626 !important;
}
.modal-close:hover svg {
    color: #b91c1c !important;
    stroke: #b91c1c !important;
}


/* ============================================================
   KANBAN â€” per-column independent scroll (hidden scrollbar)
   ============================================================ */

.lead-page {
    --kanban-offset: 260px;
}

.lead-kanban-col {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - var(--kanban-offset));
    overflow: hidden;
    position: relative;
}


.lead-kanban-col-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 2px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
}

.lead-kanban-col-body::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
}

.lead-kanban-col-head {
    position: sticky;
    top: 0;
    z-index: 2;
    background: inherit;
    flex: 0 0 auto;
}

/* Topbar-right â€” item count + edit button */
.lead-card-topbar-right {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    flex-shrink: 0;
}

.lead-card-item-count {
    padding: 2px var(--sp-2);
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface-soft);
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
}


.lead-card-salesperson {
    flex: 1 1 auto;
    min-width: 0;
}

.lead-card-procurement-btn {
    flex-shrink: 0;
}
/* ============================================================
   NEW LEAD BUTTON â€” enhanced
   ============================================================ */
.lead-new-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    height: 40px;
    padding: 0 var(--sp-5);
    background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
    color: #ffffff;
    border: 1px solid #2563eb;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.005em;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
    transition: transform 0.12s ease, box-shadow 0.15s ease,
        background-color 0.15s ease;
}
.lead-new-btn svg {
    flex-shrink: 0;
}
.lead-new-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(37, 99, 235, 0.32);
}
.lead-new-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
}
.lead-new-btn:focus-visible {
    outline: 2px solid #1d4ed8;
    outline-offset: 2px;
}

/* ============================================================
   TOAST STACK
   ============================================================ */
.lead-toast-stack {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    max-width: min(360px, calc(100vw - 32px));
    pointer-events: none;
}

.lead-toast {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-3) var(--sp-3);
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 600;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
    pointer-events: auto;
    animation: leadToastIn 0.2s ease both;
}
@keyframes leadToastIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
}

.lead-toast--success {
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #047857;
}
.lead-toast--success svg {
    color: #059669;
}

.lead-toast--error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
}
.lead-toast--error svg {
    color: #dc2626;
}

.lead-toast span {
    flex: 1 1 auto;
    min-width: 0;
    overflow-wrap: anywhere;
}

.lead-toast button {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    border-radius: 4px;
    opacity: 0.75;
}
.lead-toast button:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.05);
}

@media (max-width: 480px) {
    .lead-toast-stack {
        bottom: 12px;
        right: 12px;
        left: 12px;
        max-width: none;
    }
}

/* ============================================================
   All drawers: single-column form fields
   ============================================================ */
.lead-drawer .lead-section-grid,
.lead-drawer--narrow .lead-section-grid,
.lead-drawer .lead-create-row {
    grid-template-columns: 1fr !important;
    display: grid;
    gap: var(--sp-3);
}

/* The EditLeadModal uses the same class, so it inherits this */
.lead-drawer .lead-create-row {
    display: grid !important;
    grid-template-columns: 1fr !important;
}


/* ==========================================================================
   LEAD OVERVIEW / EDIT DRAWER  (unified, no backdrop, no inner card)
   Compact width: min(520px, 90vw)
   ========================================================================== */

/* Compact slide-over panel */
.lead-drawer--wide {
    width: min(520px, 90vw) !important;
    max-width: 90vw;
    z-index: 1000;
    /* No "both" fill-mode: a lingering transform would trap the
       position:fixed customer/salesperson modals inside the drawer. */
    animation: leadDrawerSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.lead-ov {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: #ffffff;
}

/* ---- Header ---- */
.lead-ov-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 20px 14px;
    border-bottom: 1px solid #e2e8f0;
    flex: 0 0 auto;
}
.lead-ov-eyebrow {
    margin-bottom: 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #2563eb;
}
.lead-ov-title {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.2;
    color: #000000;
}

/* Clean 32x32 close button */
.lead-ov-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 32px;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    color: #475569;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease,
        border-color 0.15s ease;
}
.lead-ov-close svg {
    display: block;
    flex-shrink: 0;
}
.lead-ov-close:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #0f172a;
}
.lead-ov-close:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
}

/* ---- Body (scrolls) ---- */
.lead-ov-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 18px 20px;
    scrollbar-width: thin;
    scrollbar-color: rgba(60, 60, 67, 0.2) transparent;
}
.lead-ov-body::-webkit-scrollbar {
    width: 6px;
}
.lead-ov-body::-webkit-scrollbar-thumb {
    background: rgba(60, 60, 67, 0.2);
    border-radius: 3px;
}

/* ---- Form grid (2 columns) ---- */
.lf-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 14px;
}
.lf-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
}
.lf-field--full {
    grid-column: 1 / -1;
}
.lf-field label {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
}

/* Inputs / selects / icon wrappers */
.lf-input,
.lf-input-wrap {
    width: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    font-size: 13px;
    color: #111827;
    font-family: inherit;
    transition: border-color 0.15s ease, box-shadow 0.15s ease,
        background-color 0.15s ease;
}
.lf-input {
    height: 40px;
    padding: 0 12px;
}
.lf-input[readonly] {
    background: #f8fafc;
    color: #475569;
    cursor: default;
}
select.lf-input {
    cursor: pointer;
}
.lf-textarea {
    height: auto;
    padding: 10px 12px;
    resize: vertical;
    line-height: 1.45;
}
.lf-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 12px;
}
.lf-input-wrap svg {
    flex-shrink: 0;
    color: #94a3b8;
}
.lf-input-wrap input {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 13px;
    font-family: inherit;
    color: #111827;
}
.lf-input-wrap input::placeholder,
.lf-input::placeholder {
    color: #94a3b8;
}

/* Crisp focus ring */
.lf-input:focus,
.lf-input-wrap:focus-within {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

/* ---- Overview (view) mode: styled read-only look ----
   Fields stay focusable so the first keystroke can flip the drawer
   into Edit mode, but they read as static values until then. */
.lf-grid--view .lf-input,
.lf-grid--view .lf-input-wrap {
    background: #f8fafc;
    border-color: #eef2f7;
    color: #0f172a;
}
.lf-grid--view .lf-input-wrap input {
    color: #0f172a;
}
.lf-grid--view select.lf-input {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: none;
    cursor: text;
}
.lf-grid--view .lf-textarea {
    resize: none;
    cursor: text;
}
.lf-grid--view .lf-input:focus,
.lf-grid--view .lf-input-wrap:focus-within {
    background: #ffffff;
    border-color: #cbd5e1;
    box-shadow: none;
}

/* Lookup hints */
.lf-hint {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    color: #64748b;
}
.lf-hint--ok {
    color: #16a34a;
}

/* ---- Footer (right-aligned actions) ---- */
.lead-ov-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 20px;
    border-top: 1px solid #e2e8f0;
    background: #ffffff;
    flex: 0 0 auto;
}
.lead-ov-btn {
    height: 38px;
    padding: 0 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: background-color 0.15s ease, box-shadow 0.15s ease,
        transform 0.1s ease;
}
.lead-ov-btn--ghost {
    background: #ffffff;
    color: #334155;
    border: 1px solid #e2e8f0;
}
.lead-ov-btn--ghost:hover {
    background: #f8fafc;
}
.lead-ov-btn--primary {
    background: #2563eb;
    color: #ffffff;
    border: 1px solid #2563eb;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
    animation: leadSaveIn 0.18s ease both;
}
.lead-ov-btn--primary:hover:not(:disabled) {
    background: #1d4ed8;
    border-color: #1d4ed8;
}
.lead-ov-btn--primary:active:not(:disabled) {
    transform: translateY(1px);
}
.lead-ov-btn--primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
}
@keyframes leadSaveIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* ---- Responsive ---- */
@media (max-width: 560px) {
    .lf-grid {
        grid-template-columns: 1fr;
    }
    .lead-ov-header,
    .lead-ov-body,
    .lead-ov-footer {
        padding-left: 16px;
        padding-right: 16px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .lead-drawer--wide,
    .lead-ov-btn--primary {
        animation-duration: 0.001ms !important;
    }
}


/* ============================================================
   TOAST STACK â€” fixed top-right (above drawers and backdrops)
   ============================================================ */
.lead-toast-stack {
    top: 20px;
    right: 20px;
    bottom: auto;
    left: auto;
    z-index: 99999;
}
@media (max-width: 480px) {
    .lead-toast-stack {
        top: 12px;
        right: 12px;
        left: 12px;
        bottom: auto;
    }
}
`}</style>

      <header className="lead-header">
        <h1 className="lead-title">Leads</h1>
        <div className="lead-header-actions">
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
              selected={selectedStage === stageByKpi[definition.key]}
              onClick={() => handleStageSelect(stageByKpi[definition.key])}
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
          onChange={(e) => {
            setPage(0);
            setStore(e.target.value);
          }}
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
                {counts.followUp === 1 ? "" : "s"} need attention
              </strong>
              <span>Open the Follow-up column to review these leads.</span>
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
              const stageLeads = groupedByStage[stage.key] || [];
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
                      <div className="lead-kanban-empty">No leads</div>
                    ) : (
                      stageLeads.map((lead) => (
                        <LeadKanbanCard
                          key={lead.id}
                          lead={lead}
                          stage={getStage(lead)}
                          onView={handleOpenOverview}
                          onEdit={handleEditLead}
                          onProcurement={handleOpenProcurement}
                          onMoveToFollowUp={handleMoveToFollowUp}
                          onFollowUp={handleOpenFollowUp}
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
            onClick={() => setPage((current) => Math.max(0, current - 1))}
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
              setPage((current) => Math.min(totalPages - 1, current + 1))
            }
          >
            Next
          </button>
        </div>
      )}

      {/* LEAD OVERVIEW / EDIT DRAWER â€” no backdrop, compact slide-over */}
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
                  String(item?.id) === String(updatedLead?.id)
                    ? { ...item, ...updatedLead }
                    : item,
                ),
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
        <div className="lead-drawer-backdrop" onClick={refreshAfterAction}>
          <aside
            className="lead-drawer procurement-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <LeadProcurementDrawer
              lead={procurementLead}
              storeId={drawerStoreId}
              assignees={drawerSalespersons}
              onUpdated={() => loadLeads()}
              onClose={refreshAfterAction}
              onToast={pushToast}
            />
          </aside>
        </div>
      )}

      {/* FOLLOW-UP DRAWER */}
      {followUpLead && (
        <div className="lead-drawer-backdrop" onClick={refreshAfterAction}>
          <aside
            className="lead-drawer procurement-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <LeadFollowUpDrawer
              lead={followUpLead}
              storeId={drawerStoreId}
              assignees={drawerSalespersons}
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
                setStore((current) => (current ? String(created.storeId) : ""));
                setRefreshTick((current) => current + 1);
                pushToast(
                  `${created?.leadNumber || "Lead"} created successfully.`,
                  "success",
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
