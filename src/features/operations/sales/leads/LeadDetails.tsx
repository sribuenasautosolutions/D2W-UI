import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import {
  getLeadById,
  getLeadEstimations,
  getLeadFollowUpActivities,
  lookupLeadItemProduct,
  saveLeadItemProcurement,
  completeLeadProcurement,
  reopenLeadProcurement,
  saveLeadProcurementTable,
  markLeadLost,
  updateLead,
} from "../../../../services/leadService";

import { searchCustomersByStore } from "../../../../services/customerService";
import { getSalespersons } from "../../../../services/salespersonService";

import ProcurementItemCard from "./ProcurementItemCard";

/* =========================================================
   HELPERS
========================================================= */

const errorText = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong"
  );
};

const rowFrom = (item) => ({
  id: item?.id,
  requirement: item?.requirement || "",
  vehicleDescription: item?.vehicleDescription || "",
  vin: item?.vin || "",
  requestedQuantity: item?.requestedQuantity || 1,

  productItemId:
    item?.productItemId || item?.productId || item?.localProductId || "",

  productName: item?.productName || "",
  partNumber: item?.partNumber || "",
  brandname: item?.brandname || "",
  hsnCode: item?.hsnCode || "",

  quotedMrp: item?.quotedMrp ?? "",
  quotedSellingPrice: item?.quotedSellingPrice ?? "",

  sellingQuantity: item?.sellingQuantity || item?.requestedQuantity || 1,

  availabilityStatus: item?.availabilityStatus || "",
  estimatedAvailabilityDate: item?.estimatedAvailabilityDate || "",

  procurementSource: item?.procurementSource || "",

  vendorAvailableQuantity: item?.vendorAvailableQuantity ?? "",

  selectedVendorStockItem: item?.selectedVendorStockItem || null,

  notes: item?.notes || "",
});

const payload = (row) => ({
  leadItemId: row.id,

  requirement: row.requirement,
  vehicleDescription: row.vehicleDescription,
  vin: row.vin,

  requestedQuantity: Number(row.requestedQuantity || 0),

  productItemId: row.productItemId === "" ? null : Number(row.productItemId),

  quotedMrp: row.quotedMrp === "" ? null : Number(row.quotedMrp),

  quotedSellingPrice:
    row.quotedSellingPrice === "" ? null : Number(row.quotedSellingPrice),

  sellingQuantity:
    row.sellingQuantity === "" ? null : Number(row.sellingQuantity),

  availabilityStatus: row.availabilityStatus || null,

  estimatedAvailabilityDate: row.estimatedAvailabilityDate || null,

  procurementSource: row.procurementSource || null,

  selectedVendorStockItem: row.selectedVendorStockItem || null,

  notes: row.notes || null,
});

const validate = (row) => {
  if (!row.productItemId) {
    return "Please select a product.";
  }

  if (!row.requestedQuantity || Number(row.requestedQuantity) <= 0) {
    return "Requested quantity must be greater than zero.";
  }

  if (row.quotedSellingPrice !== "" && Number(row.quotedSellingPrice) < 0) {
    return "Selling price cannot be negative.";
  }

  return "";
};

/* =========================================================
   COMPONENT
========================================================= */

export default function LeadDetails() {
  const { id } = useParams();
  const location = useLocation();
  const viewOnly =
    new URLSearchParams(location.search).get("view") === "readonly";
  const [followUpHistory, setFollowUpHistory] = useState([]);
  const [estimations, setEstimations] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const leadsPath = location.pathname.startsWith("/owner/")
    ? "/owner/sales/leads"
    : "/store/sales/leads";

  const [lead, setLead] = useState(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =====================================================
     DIRECT LEAD EDITING
  ===================================================== */

  const [editForm, setEditForm] = useState<{
    customerId: string | number;
    customerName: string;
    salespersonId: string | number;
    salespersonName: string;
    source: string;
    customerRequirement: string;
    notes: string;
  }>({
    customerId: "",
    customerName: "",
    salespersonId: "",
    salespersonName: "",
    source: "",
    customerRequirement: "",
    notes: "",
  });

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);

  const [salespersonOptions, setSalespersonOptions] = useState([]);

  const customerSearchTimer = useRef(null);

  /* =====================================================
     PROCUREMENT
  ===================================================== */

  const [rows, setRows] = useState([]);

  const [procurementError, setProcurementError] = useState("");
  const [procurementSuccess, setProcurementSuccess] = useState("");

  const [lostReason, setLostReason] = useState("");

  const [savingRowId, setSavingRowId] = useState(null);

  const [dirty, setDirty] = useState(false);

  /* =====================================================
     STATUS
  ===================================================== */

  const status = lead?.status;

  const closed = status === "WON" || status === "LOST";

  const completed = status === "PROCUREMENT_COMPLETED";

  const editableLead = status === "NEW" && !viewOnly;

  const readOnlyProcurement = viewOnly || closed || completed;

  /* =====================================================
     LOAD LEAD
  ===================================================== */

  useEffect(() => {
    if (!id) {
      setError("Lead ID is missing from the URL.");
      setLoading(false);
      return;
    }

    loadLead();
  }, [id, viewOnly]);

  const loadLead = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getLeadById(id);

      setLead(data);
      if (viewOnly) {
        try {
          const [activities, documents] = await Promise.all([
            getLeadFollowUpActivities(id),
            getLeadEstimations(id),
          ]);
          setFollowUpHistory(activities);
          setEstimations(documents);
        } catch (historyFailure) {
          setFollowUpHistory([]);
          setHistoryError(errorText(historyFailure));
        }
      }

      /*
       * IMPORTANT:
       * Initialize the editable fields directly
       * when the View page opens.
       */
      setEditForm({
        customerId: data?.customerId || "",
        customerName: data?.customerName || "",

        salespersonId: data?.salespersonId || "",

        salespersonName: data?.salespersonName || "",

        source: data?.source || "",

        customerRequirement: data?.customerRequirement || "",

        notes: data?.notes || "",
      });

      setCustomerSearch(data?.customerName || "");

      setRows(Array.isArray(data?.items) ? data.items.map(rowFrom) : []);

      /*
       * Load salespersons for the lead store.
       */
      if (data?.storeId) {
        try {
          const salespersons = await getSalespersons(data.storeId);

          setSalespersonOptions(
            Array.isArray(salespersons) ? salespersons : [],
          );
        } catch (salespersonError) {
          console.error("Salesperson loading failed", salespersonError);

          setSalespersonOptions([]);
        }
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     DIRECT FIELD CHANGE
  ===================================================== */

  const updateEditField = (field, value) => {
    setEditForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSuccess("");
    setError("");
  };

  /* =====================================================
     CUSTOMER SEARCH
  ===================================================== */

  const handleCustomerSearch = (value) => {
    setCustomerSearch(value);

    /*
     * If user clears the customer field.
     */
    if (!value.trim()) {
      setCustomerOptions([]);

      updateEditField("customerId", "");
      updateEditField("customerName", "");

      return;
    }

    if (customerSearchTimer.current) {
      clearTimeout(customerSearchTimer.current);
    }

    customerSearchTimer.current = setTimeout(async () => {
      if (!lead?.storeId) {
        return;
      }

      try {
        setCustomerSearching(true);

        const result = await searchCustomersByStore(lead.storeId, value);

        setCustomerOptions(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error("Customer search failed", err);

        setCustomerOptions([]);
      } finally {
        setCustomerSearching(false);
      }
    }, 300);
  };

  const selectCustomer = (customer) => {
    updateEditField("customerId", customer?.id || "");

    updateEditField("customerName", customer?.customerName || "");

    setCustomerSearch(customer?.customerName || "");

    setCustomerOptions([]);
  };

  /* =====================================================
     SAVE LEAD CHANGES
  ===================================================== */

  const saveLeadChanges = async () => {
    if (!lead?.id) {
      return;
    }

    if (!editForm.customerId) {
      setError("Customer is required.");
      return;
    }

    if (!editForm.source?.trim()) {
      setError("Lead source is required.");
      return;
    }

    if (!editForm.customerRequirement?.trim()) {
      setError("Customer requirement is required.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setSuccess("");

      const request = {
        customerId: Number(editForm.customerId),

        salespersonId: editForm.salespersonId
          ? Number(editForm.salespersonId)
          : null,

        source: editForm.source.trim(),

        customerRequirement: editForm.customerRequirement.trim(),

        notes: editForm.notes?.trim() || null,
      };

      const updated = await updateLead(lead.id, request);

      /*
       * IMPORTANT:
       *
       * Do NOT replace the complete lead object
       * with `updated`.
       *
       * Current backend response can contain an
       * empty items array.
       *
       * Merge the changed fields into the existing
       * lead so procurement data remains on screen.
       */
      setLead((previous) => ({
        ...previous,

        customerId: updated?.customerId ?? editForm.customerId,

        customerName: updated?.customerName ?? editForm.customerName,

        salespersonId: updated?.salespersonId ?? editForm.salespersonId,

        salespersonName: updated?.salespersonName ?? editForm.salespersonName,

        source: updated?.source ?? editForm.source,

        customerRequirement:
          updated?.customerRequirement ?? editForm.customerRequirement,

        notes: updated?.notes ?? editForm.notes,

        updatedAt: updated?.updatedAt ?? previous.updatedAt,
      }));

      /*
       * Keep form synchronized.
       */
      setEditForm((previous) => ({
        ...previous,

        customerId: updated?.customerId ?? previous.customerId,

        customerName: updated?.customerName ?? previous.customerName,

        salespersonId: updated?.salespersonId ?? previous.salespersonId,

        salespersonName: updated?.salespersonName ?? previous.salespersonName,

        source: updated?.source ?? previous.source,

        customerRequirement:
          updated?.customerRequirement ?? previous.customerRequirement,

        notes: updated?.notes ?? previous.notes,
      }));

      setSuccess("Lead details updated successfully.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  /* =====================================================
     PROCUREMENT ROW CHANGE
  ===================================================== */

  const updateRow = (rowId, changes) => {
    setRows((previous) =>
      previous.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ...changes,
            }
          : row,
      ),
    );

    setDirty(true);
    setProcurementSuccess("");
    setProcurementError("");
  };

  /* =====================================================
     PRODUCT LOOKUP
  ===================================================== */

  const lookupProduct = async (row) => {
    try {
      setSavingRowId(row.id);
      setProcurementError("");

      const result = await lookupLeadItemProduct(lead.id, row.id, {
        requirement: row.requirement,
        vehicleDescription: row.vehicleDescription,
        vin: row.vin,
      });

      updateRow(row.id, {
        ...result,
      });
    } catch (err) {
      setProcurementError(errorText(err));
    } finally {
      setSavingRowId(null);
    }
  };

  /* =====================================================
     SAVE PROCUREMENT ROW
  ===================================================== */

  const saveProcurementRow = async (row) => {
    const validation = validate(row);

    if (validation) {
      setProcurementError(validation);
      return;
    }

    try {
      setSavingRowId(row.id);
      setProcurementError("");
      setProcurementSuccess("");

      const saved = await saveLeadItemProcurement(lead.id, payload(row));

      if (saved) {
        updateRow(row.id, {
          ...saved,
        });
      }

      setProcurementSuccess("Procurement item saved successfully.");
    } catch (err) {
      setProcurementError(errorText(err));
    } finally {
      setSavingRowId(null);
    }
  };

  /* =====================================================
     SAVE ALL PROCUREMENT
  ===================================================== */

  const saveAllProcurement = async () => {
    try {
      setBusy(true);
      setProcurementError("");
      setProcurementSuccess("");

      for (const row of rows) {
        const validation = validate(row);

        if (validation) {
          throw new Error(`${row.requirement || "Item"}: ${validation}`);
        }

        await saveLeadItemProcurement(lead.id, payload(row));
      }

      setDirty(false);

      setProcurementSuccess("Procurement details saved successfully.");
    } catch (err) {
      setProcurementError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  /* =====================================================
     COMPLETE PROCUREMENT
  ===================================================== */

  const handleCompleteProcurement = async () => {
    try {
      setBusy(true);
      setProcurementError("");
      setProcurementSuccess("");

      const result = await completeLeadProcurement(lead.id);

      setLead((previous) => ({
        ...previous,
        ...(result || {}),
        status: result?.status || "PROCUREMENT_COMPLETED",
      }));

      setProcurementSuccess("Procurement completed successfully.");
    } catch (err) {
      setProcurementError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  /* =====================================================
     REOPEN PROCUREMENT
  ===================================================== */

  const handleReopenProcurement = async () => {
    try {
      setBusy(true);
      setProcurementError("");

      const result = await reopenLeadProcurement(lead.id);

      setLead((previous) => ({
        ...previous,
        ...(result || {}),
        status: result?.status || "NEW",
      }));

      setProcurementSuccess("Lead reopened successfully.");
    } catch (err) {
      setProcurementError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  /* =====================================================
     SAVE PROCUREMENT TABLE
  ===================================================== */

  const saveProcurementTable = async () => {
    try {
      setBusy(true);
      setProcurementError("");

      const result = await saveLeadProcurementTable(lead.id, rows.map(payload));

      if (Array.isArray(result)) {
        setRows(result.map(rowFrom));
      }

      setDirty(false);

      setProcurementSuccess("Procurement table saved successfully.");
    } catch (err) {
      setProcurementError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  /* =====================================================
     MARK LOST
  ===================================================== */

  const handleMarkLost = async () => {
    if (!lostReason.trim()) {
      setProcurementError("Please enter a lost reason.");
      return;
    }

    try {
      setBusy(true);
      setProcurementError("");

      const result = await markLeadLost(lead.id, lostReason.trim());

      setLead((previous) => ({
        ...previous,
        ...(result || {}),
        status: result?.status || "LOST",
        lostReason: result?.lostReason || lostReason.trim(),
      }));

      setLostReason("");
    } catch (err) {
      setProcurementError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="lead-workflow-page">
        <style>{`/* =========================================================
   LEAD WORKFLOW PAGE
========================================================= */

.lead-workflow-page {
  width: 100%;
  min-height: 100vh;
  padding: var(--sp-6);
  background: #f5f7fb;
  box-sizing: border-box;
}


/* =========================================================
   HEADER
========================================================= */

.lead-workflow-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-6);
  margin-bottom: var(--sp-6);
}

.lead-workflow-header h1 {
  margin: var(--sp-2) 0 var(--sp-1);
  font-size: 28px;
  font-weight: 700;
  color: #172033;
}

.lead-workflow-header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.lead-back-link {
  color: #2563eb;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}

.lead-back-link:hover {
  text-decoration: underline;
}


/* =========================================================
   HEADER BUTTONS
========================================================= */

.lead-header-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.lead-primary-button,
.lead-secondary-button,
.lead-save-button,
.lead-danger-button {
  min-height: 40px;
  padding: 0 var(--sp-4);
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    opacity 0.2s ease,
    transform 0.2s ease;
}

.lead-primary-button {
  background: #2563eb;
  color: #ffffff;
}

.lead-primary-button:hover {
  background: #1d4ed8;
}

.lead-secondary-button {
  background: #ffffff;
  color: #1f2937;
  border-color: #d1d5db;
}

.lead-secondary-button:hover {
  background: #f9fafb;
}

.lead-save-button {
  background: linear-gradient(
    135deg,
    #2563eb,
    #4f46e5
  );
  color: #ffffff;
  box-shadow:
    0 4px 12px rgba(37, 99, 235, 0.2);
}

.lead-save-button:hover {
  transform: translateY(-1px);
  box-shadow:
    0 6px 16px rgba(37, 99, 235, 0.28);
}

.lead-danger-button {
  margin-top: var(--sp-3);
  background: #dc2626;
  color: #ffffff;
}

.lead-danger-button:hover {
  background: #b91c1c;
}

.lead-primary-button:disabled,
.lead-secondary-button:disabled,
.lead-save-button:disabled,
.lead-danger-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}


/* =========================================================
   ALERTS
========================================================= */

.lead-alert {
  margin-bottom: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.lead-alert-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.lead-alert-success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
}


/* =========================================================
   CARD
========================================================= */

.lead-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: var(--sp-6);
  margin-bottom: var(--sp-5);
  box-shadow:
    0 2px 8px rgba(15, 23, 42, 0.04);
}

.lead-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  margin-bottom: var(--sp-5);
}

.lead-card-header h2 {
  margin: 0;
  color: #172033;
  font-size: 18px;
  font-weight: 700;
}

.lead-card-subtitle {
  display: block;
  margin-top: var(--sp-1);
  color: #6b7280;
  font-size: 13px;
}


/* =========================================================
   STATUS
========================================================= */

.lead-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 var(--sp-3);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: #eef2ff;
  color: #4338ca;
}

.lead-status-new {
  background: #eff6ff;
  color: #1d4ed8;
}

.lead-status-procurement_completed {
  background: #ecfdf5;
  color: #047857;
}

.lead-status-won {
  background: #ecfdf5;
  color: #047857;
}

.lead-status-lost {
  background: #fef2f2;
  color: #b91c1c;
}


/* =========================================================
   LEAD SUMMARY
========================================================= */

.lead-summary-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: var(--sp-5);
}

.lead-summary-field {
  min-width: 0;
}

.lead-summary-field label {
  display: block;
  margin-bottom: var(--sp-2);
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.lead-summary-value {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: var(--sp-3) var(--sp-3);
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #1f2937;
  font-size: 14px;
}


/* =========================================================
   DIRECT EDIT FIELDS
========================================================= */

.lead-summary-field input,
.lead-summary-field select {
  width: 100%;
  height: 42px;
  box-sizing: border-box;
  padding: 0 var(--sp-3);
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  font-size: 14px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.lead-summary-field input:focus,
.lead-summary-field select:focus {
  border-color: #2563eb;
  box-shadow:
    0 0 0 3px rgba(37, 99, 235, 0.1);
}

.lead-summary-grid-editable
  .lead-summary-field
  label::after {
  content: " *";
  color: #2563eb;
}


/* =========================================================
   CUSTOMER SEARCH
========================================================= */

.lead-customer-editor {
  position: relative;
}

.lead-search-loading {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  padding: var(--sp-3) var(--sp-3);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #6b7280;
  font-size: 13px;
  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.08);
}

.lead-customer-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  max-height: 240px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #dbe1ea;
  border-radius: 8px;
  box-shadow:
    0 12px 28px rgba(15, 23, 42, 0.12);
}

.lead-customer-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-3);
  border: 0;
  border-bottom: 1px solid #eef1f5;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.lead-customer-option:last-child {
  border-bottom: 0;
}

.lead-customer-option:hover {
  background: #f8fafc;
}

.lead-customer-option strong {
  color: #172033;
  font-size: 14px;
}

.lead-customer-option span {
  color: #64748b;
  font-size: 12px;
}


/* =========================================================
   TEXTAREA
========================================================= */

.lead-main-textarea {
  width: 100%;
  min-height: 100px;
  box-sizing: border-box;
  padding: var(--sp-3) var(--sp-4);
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.lead-main-textarea:focus {
  border-color: #2563eb;
  box-shadow:
    0 0 0 3px rgba(37, 99, 235, 0.1);
}

.lead-readonly-text {
  min-height: 60px;
  padding: var(--sp-4);
  box-sizing: border-box;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}


/* =========================================================
   PROCUREMENT
========================================================= */

.lead-procurement-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.lead-procurement-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.lead-empty-state {
  padding: var(--sp-8) var(--sp-5);
  text-align: center;
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  color: #6b7280;
  background: #f9fafb;
}


/* =========================================================
   LOST
========================================================= */

.lead-lost-section {
  border-color: #fee2e2;
}


/* =========================================================
   LOADING / ERROR
========================================================= */

.lead-loading {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 15px;
}

.lead-error-box {
  padding: var(--sp-5);
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}


/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1100px) {
  .lead-summary-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .lead-workflow-page {
    padding: var(--sp-4);
  }

  .lead-workflow-header {
    flex-direction: column;
  }

  .lead-header-actions {
    width: 100%;
  }

  .lead-header-actions button {
    flex: 1;
  }

  .lead-summary-grid {
    grid-template-columns: 1fr;
  }

  .lead-card {
    padding: var(--sp-4);
  }

  .lead-card-header {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 520px) {
  .lead-header-actions {
    flex-direction: column;
  }

  .lead-header-actions button {
    width: 100%;
  }

  .lead-procurement-actions {
    width: 100%;
    flex-direction: column;
  }

  .lead-procurement-actions button {
    width: 100%;
  }
}`}</style>
        <div className="lead-loading">Loading lead...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="lead-workflow-page">
        <style>{`/* =========================================================
   LEAD WORKFLOW PAGE
========================================================= */

.lead-workflow-page {
  width: 100%;
  min-height: 100vh;
  padding: var(--sp-6);
  background: #f5f7fb;
  box-sizing: border-box;
}


/* =========================================================
   HEADER
========================================================= */

.lead-workflow-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-6);
  margin-bottom: var(--sp-6);
}

.lead-workflow-header h1 {
  margin: var(--sp-2) 0 var(--sp-1);
  font-size: 28px;
  font-weight: 700;
  color: #172033;
}

.lead-workflow-header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.lead-back-link {
  color: #2563eb;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}

.lead-back-link:hover {
  text-decoration: underline;
}


/* =========================================================
   HEADER BUTTONS
========================================================= */

.lead-header-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.lead-primary-button,
.lead-secondary-button,
.lead-save-button,
.lead-danger-button {
  min-height: 40px;
  padding: 0 var(--sp-4);
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    opacity 0.2s ease,
    transform 0.2s ease;
}

.lead-primary-button {
  background: #2563eb;
  color: #ffffff;
}

.lead-primary-button:hover {
  background: #1d4ed8;
}

.lead-secondary-button {
  background: #ffffff;
  color: #1f2937;
  border-color: #d1d5db;
}

.lead-secondary-button:hover {
  background: #f9fafb;
}

.lead-save-button {
  background: linear-gradient(
    135deg,
    #2563eb,
    #4f46e5
  );
  color: #ffffff;
  box-shadow:
    0 4px 12px rgba(37, 99, 235, 0.2);
}

.lead-save-button:hover {
  transform: translateY(-1px);
  box-shadow:
    0 6px 16px rgba(37, 99, 235, 0.28);
}

.lead-danger-button {
  margin-top: var(--sp-3);
  background: #dc2626;
  color: #ffffff;
}

.lead-danger-button:hover {
  background: #b91c1c;
}

.lead-primary-button:disabled,
.lead-secondary-button:disabled,
.lead-save-button:disabled,
.lead-danger-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}


/* =========================================================
   ALERTS
========================================================= */

.lead-alert {
  margin-bottom: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.lead-alert-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.lead-alert-success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
}


/* =========================================================
   CARD
========================================================= */

.lead-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: var(--sp-6);
  margin-bottom: var(--sp-5);
  box-shadow:
    0 2px 8px rgba(15, 23, 42, 0.04);
}

.lead-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  margin-bottom: var(--sp-5);
}

.lead-card-header h2 {
  margin: 0;
  color: #172033;
  font-size: 18px;
  font-weight: 700;
}

.lead-card-subtitle {
  display: block;
  margin-top: var(--sp-1);
  color: #6b7280;
  font-size: 13px;
}


/* =========================================================
   STATUS
========================================================= */

.lead-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 var(--sp-3);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: #eef2ff;
  color: #4338ca;
}

.lead-status-new {
  background: #eff6ff;
  color: #1d4ed8;
}

.lead-status-procurement_completed {
  background: #ecfdf5;
  color: #047857;
}

.lead-status-won {
  background: #ecfdf5;
  color: #047857;
}

.lead-status-lost {
  background: #fef2f2;
  color: #b91c1c;
}


/* =========================================================
   LEAD SUMMARY
========================================================= */

.lead-summary-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: var(--sp-5);
}

.lead-summary-field {
  min-width: 0;
}

.lead-summary-field label {
  display: block;
  margin-bottom: var(--sp-2);
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.lead-summary-value {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: var(--sp-3) var(--sp-3);
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #1f2937;
  font-size: 14px;
}


/* =========================================================
   DIRECT EDIT FIELDS
========================================================= */

.lead-summary-field input,
.lead-summary-field select {
  width: 100%;
  height: 42px;
  box-sizing: border-box;
  padding: 0 var(--sp-3);
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  font-size: 14px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.lead-summary-field input:focus,
.lead-summary-field select:focus {
  border-color: #2563eb;
  box-shadow:
    0 0 0 3px rgba(37, 99, 235, 0.1);
}

.lead-summary-grid-editable
  .lead-summary-field
  label::after {
  content: " *";
  color: #2563eb;
}


/* =========================================================
   CUSTOMER SEARCH
========================================================= */

.lead-customer-editor {
  position: relative;
}

.lead-search-loading {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  padding: var(--sp-3) var(--sp-3);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #6b7280;
  font-size: 13px;
  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.08);
}

.lead-customer-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  max-height: 240px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #dbe1ea;
  border-radius: 8px;
  box-shadow:
    0 12px 28px rgba(15, 23, 42, 0.12);
}

.lead-customer-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-3);
  border: 0;
  border-bottom: 1px solid #eef1f5;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.lead-customer-option:last-child {
  border-bottom: 0;
}

.lead-customer-option:hover {
  background: #f8fafc;
}

.lead-customer-option strong {
  color: #172033;
  font-size: 14px;
}

.lead-customer-option span {
  color: #64748b;
  font-size: 12px;
}


/* =========================================================
   TEXTAREA
========================================================= */

.lead-main-textarea {
  width: 100%;
  min-height: 100px;
  box-sizing: border-box;
  padding: var(--sp-3) var(--sp-4);
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.lead-main-textarea:focus {
  border-color: #2563eb;
  box-shadow:
    0 0 0 3px rgba(37, 99, 235, 0.1);
}

.lead-readonly-text {
  min-height: 60px;
  padding: var(--sp-4);
  box-sizing: border-box;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}


/* =========================================================
   PROCUREMENT
========================================================= */

.lead-procurement-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.lead-procurement-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.lead-empty-state {
  padding: var(--sp-8) var(--sp-5);
  text-align: center;
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  color: #6b7280;
  background: #f9fafb;
}


/* =========================================================
   LOST
========================================================= */

.lead-lost-section {
  border-color: #fee2e2;
}


/* =========================================================
   LOADING / ERROR
========================================================= */

.lead-loading {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 15px;
}

.lead-error-box {
  padding: var(--sp-5);
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}


/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1100px) {
  .lead-summary-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .lead-workflow-page {
    padding: var(--sp-4);
  }

  .lead-workflow-header {
    flex-direction: column;
  }

  .lead-header-actions {
    width: 100%;
  }

  .lead-header-actions button {
    flex: 1;
  }

  .lead-summary-grid {
    grid-template-columns: 1fr;
  }

  .lead-card {
    padding: var(--sp-4);
  }

  .lead-card-header {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 520px) {
  .lead-header-actions {
    flex-direction: column;
  }

  .lead-header-actions button {
    width: 100%;
  }

  .lead-procurement-actions {
    width: 100%;
    flex-direction: column;
  }

  .lead-procurement-actions button {
    width: 100%;
  }
}`}</style>
        <div className="lead-error-box">{error || "Lead not found."}</div>
      </div>
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="lead-workflow-page">
      <style>{`/* =========================================================
   LEAD WORKFLOW PAGE
========================================================= */

.lead-workflow-page {
  width: 100%;
  min-height: 100vh;
  padding: var(--sp-6);
  background: #f5f7fb;
  box-sizing: border-box;
}


/* =========================================================
   HEADER
========================================================= */

.lead-workflow-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-6);
  margin-bottom: var(--sp-6);
}

.lead-workflow-header h1 {
  margin: var(--sp-2) 0 var(--sp-1);
  font-size: 28px;
  font-weight: 700;
  color: #172033;
}

.lead-workflow-header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.lead-back-link {
  color: #2563eb;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}

.lead-back-link:hover {
  text-decoration: underline;
}


/* =========================================================
   HEADER BUTTONS
========================================================= */

.lead-header-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.lead-primary-button,
.lead-secondary-button,
.lead-save-button,
.lead-danger-button {
  min-height: 40px;
  padding: 0 var(--sp-4);
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    opacity 0.2s ease,
    transform 0.2s ease;
}

.lead-primary-button {
  background: #2563eb;
  color: #ffffff;
}

.lead-primary-button:hover {
  background: #1d4ed8;
}

.lead-secondary-button {
  background: #ffffff;
  color: #1f2937;
  border-color: #d1d5db;
}

.lead-secondary-button:hover {
  background: #f9fafb;
}

.lead-save-button {
  background: linear-gradient(
    135deg,
    #2563eb,
    #4f46e5
  );
  color: #ffffff;
  box-shadow:
    0 4px 12px rgba(37, 99, 235, 0.2);
}

.lead-save-button:hover {
  transform: translateY(-1px);
  box-shadow:
    0 6px 16px rgba(37, 99, 235, 0.28);
}

.lead-danger-button {
  margin-top: var(--sp-3);
  background: #dc2626;
  color: #ffffff;
}

.lead-danger-button:hover {
  background: #b91c1c;
}

.lead-primary-button:disabled,
.lead-secondary-button:disabled,
.lead-save-button:disabled,
.lead-danger-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}


/* =========================================================
   ALERTS
========================================================= */

.lead-alert {
  margin-bottom: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.lead-alert-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.lead-alert-success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
}


/* =========================================================
   CARD
========================================================= */

.lead-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: var(--sp-6);
  margin-bottom: var(--sp-5);
  box-shadow:
    0 2px 8px rgba(15, 23, 42, 0.04);
}

.lead-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  margin-bottom: var(--sp-5);
}

.lead-card-header h2 {
  margin: 0;
  color: #172033;
  font-size: 18px;
  font-weight: 700;
}

.lead-card-subtitle {
  display: block;
  margin-top: var(--sp-1);
  color: #6b7280;
  font-size: 13px;
}


/* =========================================================
   STATUS
========================================================= */

.lead-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 var(--sp-3);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: #eef2ff;
  color: #4338ca;
}

.lead-status-new {
  background: #eff6ff;
  color: #1d4ed8;
}

.lead-status-procurement_completed {
  background: #ecfdf5;
  color: #047857;
}

.lead-status-won {
  background: #ecfdf5;
  color: #047857;
}

.lead-status-lost {
  background: #fef2f2;
  color: #b91c1c;
}


/* =========================================================
   LEAD SUMMARY
========================================================= */

.lead-summary-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: var(--sp-5);
}

.lead-summary-field {
  min-width: 0;
}

.lead-summary-field label {
  display: block;
  margin-bottom: var(--sp-2);
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.lead-summary-value {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: var(--sp-3) var(--sp-3);
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #1f2937;
  font-size: 14px;
}


/* =========================================================
   DIRECT EDIT FIELDS
========================================================= */

.lead-summary-field input,
.lead-summary-field select {
  width: 100%;
  height: 42px;
  box-sizing: border-box;
  padding: 0 var(--sp-3);
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  font-size: 14px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.lead-summary-field input:focus,
.lead-summary-field select:focus {
  border-color: #2563eb;
  box-shadow:
    0 0 0 3px rgba(37, 99, 235, 0.1);
}

.lead-summary-grid-editable
  .lead-summary-field
  label::after {
  content: " *";
  color: #2563eb;
}


/* =========================================================
   CUSTOMER SEARCH
========================================================= */

.lead-customer-editor {
  position: relative;
}

.lead-search-loading {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  padding: var(--sp-3) var(--sp-3);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #6b7280;
  font-size: 13px;
  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.08);
}

.lead-customer-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  max-height: 240px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #dbe1ea;
  border-radius: 8px;
  box-shadow:
    0 12px 28px rgba(15, 23, 42, 0.12);
}

.lead-customer-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-3);
  border: 0;
  border-bottom: 1px solid #eef1f5;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.lead-customer-option:last-child {
  border-bottom: 0;
}

.lead-customer-option:hover {
  background: #f8fafc;
}

.lead-customer-option strong {
  color: #172033;
  font-size: 14px;
}

.lead-customer-option span {
  color: #64748b;
  font-size: 12px;
}


/* =========================================================
   TEXTAREA
========================================================= */

.lead-main-textarea {
  width: 100%;
  min-height: 100px;
  box-sizing: border-box;
  padding: var(--sp-3) var(--sp-4);
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.lead-main-textarea:focus {
  border-color: #2563eb;
  box-shadow:
    0 0 0 3px rgba(37, 99, 235, 0.1);
}

.lead-readonly-text {
  min-height: 60px;
  padding: var(--sp-4);
  box-sizing: border-box;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}


/* =========================================================
   PROCUREMENT
========================================================= */

.lead-procurement-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.lead-procurement-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.lead-empty-state {
  padding: var(--sp-8) var(--sp-5);
  text-align: center;
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  color: #6b7280;
  background: #f9fafb;
}


/* =========================================================
   LOST
========================================================= */

.lead-lost-section {
  border-color: #fee2e2;
}


/* =========================================================
   LOADING / ERROR
========================================================= */

.lead-loading {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 15px;
}

.lead-error-box {
  padding: var(--sp-5);
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}


/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1100px) {
  .lead-summary-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .lead-workflow-page {
    padding: var(--sp-4);
  }

  .lead-workflow-header {
    flex-direction: column;
  }

  .lead-header-actions {
    width: 100%;
  }

  .lead-header-actions button {
    flex: 1;
  }

  .lead-summary-grid {
    grid-template-columns: 1fr;
  }

  .lead-card {
    padding: var(--sp-4);
  }

  .lead-card-header {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 520px) {
  .lead-header-actions {
    flex-direction: column;
  }

  .lead-header-actions button {
    width: 100%;
  }

  .lead-procurement-actions {
    width: 100%;
    flex-direction: column;
  }

  .lead-procurement-actions button {
    width: 100%;
  }
}`}</style>

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="lead-workflow-header">
        <div>
          <Link to={leadsPath} className="lead-back-link">
            ← Back to Leads
          </Link>

          <h1>{lead.leadNumber || `Lead #${lead.id}`}</h1>

          <p>Lead Details & Procurement</p>
        </div>

        <div className="lead-header-actions">
          {/* DIRECT SAVE BUTTON */}
          {editableLead && (
            <button
              type="button"
              className="lead-save-button"
              onClick={saveLeadChanges}
              disabled={busy}
            >
              {busy ? "Saving..." : "Save Lead Changes"}
            </button>
          )}

          {!readOnlyProcurement && (
            <>
              <button
                type="button"
                className="lead-secondary-button"
                onClick={saveAllProcurement}
                disabled={busy}
              >
                Save Procurement
              </button>

              <button
                type="button"
                className="lead-primary-button"
                onClick={handleCompleteProcurement}
                disabled={busy || rows.length === 0 || dirty}
              >
                Complete Procurement
              </button>
            </>
          )}

          {completed && !viewOnly && (
            <button
              type="button"
              className="lead-secondary-button"
              onClick={handleReopenProcurement}
              disabled={busy}
            >
              Reopen Procurement
            </button>
          )}
        </div>
      </div>

      {/* =================================================
          ALERTS
      ================================================= */}

      {error && <div className="lead-alert lead-alert-error">{error}</div>}

      {success && (
        <div className="lead-alert lead-alert-success">{success}</div>
      )}

      {procurementError && (
        <div className="lead-alert lead-alert-error">{procurementError}</div>
      )}

      {procurementSuccess && (
        <div className="lead-alert lead-alert-success">
          {procurementSuccess}
        </div>
      )}

      {viewOnly && (
        <section className="lead-card">
          <h2>Follow-up and Estimation</h2>
          <p>
            Latest estimation date: {lead.estimationDate || "Not generated"}
          </p>
          {estimations.map((document) => (
            <p key={document.id}>
              Estimation #{document.id} · {document.estimationDate} ·{" "}
              {document.items.length} items · ₹{document.totalMrp} ·{" "}
              {document.showPartNumber
                ? "Full part numbers"
                : "Masked part numbers"}
            </p>
          ))}
          {historyError ? (
            <p>Unable to load follow-up history: {historyError}</p>
          ) : followUpHistory.length ? (
            followUpHistory.map((activity) => (
              <p key={activity.id}>
                {activity.createdByName || "Staff"} · {activity.createdAt || ""}{" "}
                · {activity.customerResponseReason} · Next follow-up:{" "}
                {activity.nextFollowUpAt || "—"}
              </p>
            ))
          ) : (
            <p>No follow-up activities recorded.</p>
          )}
        </section>
      )}

      {/* =================================================
          LEAD SUMMARY
      ================================================= */}

      <section className="lead-card">
        <div className="lead-card-header">
          <div>
            <h2>Lead Information</h2>

            <span className="lead-card-subtitle">
              {editableLead
                ? "Update lead information directly"
                : "Lead information"}
            </span>
          </div>

          <span
            className={`lead-status lead-status-${String(
              lead.status || "",
            ).toLowerCase()}`}
          >
            {lead.status}
          </span>
        </div>

        <div
          className={
            editableLead
              ? "lead-summary-grid lead-summary-grid-editable"
              : "lead-summary-grid"
          }
        >
          {/* CUSTOMER */}

          <div className="lead-summary-field lead-editable-field">
            <label>Customer</label>

            {editableLead ? (
              <div className="lead-customer-editor">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(event) => handleCustomerSearch(event.target.value)}
                  placeholder="Search customer..."
                />

                {customerSearching && (
                  <div className="lead-search-loading">Searching...</div>
                )}

                {customerOptions.length > 0 && (
                  <div className="lead-customer-dropdown">
                    {customerOptions.map((customer) => (
                      <button
                        type="button"
                        key={customer.id}
                        className="lead-customer-option"
                        onClick={() => selectCustomer(customer)}
                      >
                        <strong>{customer.customerName}</strong>

                        <span>{customer.mobileNumber || ""}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="lead-summary-value">
                {lead.customerName || "—"}
              </div>
            )}
          </div>

          {/* SALESPERSON */}

          <div className="lead-summary-field">
            <label>Salesperson</label>

            {editableLead ? (
              <select
                value={editForm.salespersonId || ""}
                onChange={(event) => {
                  const selectedId = event.target.value;

                  const selected = salespersonOptions.find(
                    (item) => String(item.id) === String(selectedId),
                  );

                  updateEditField("salespersonId", selectedId);

                  updateEditField(
                    "salespersonName",
                    selected?.salespersonName || "",
                  );
                }}
              >
                <option value="">Select salesperson</option>

                {salespersonOptions.map((salesperson) => (
                  <option key={salesperson.id} value={salesperson.id}>
                    {salesperson.salespersonName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="lead-summary-value">
                {lead.salespersonName || "—"}
              </div>
            )}
          </div>

          {/* SOURCE */}

          <div className="lead-summary-field">
            <label>Source</label>

            {editableLead ? (
              <select
                value={editForm.source || ""}
                onChange={(event) =>
                  updateEditField("source", event.target.value)
                }
              >
                <option value="">Select source</option>

                <option value="PHONE">Phone</option>

                <option value="WHATSAPP">WhatsApp</option>

                <option value="WALK_IN">Walk In</option>

                <option value="WEBSITE">Website</option>

                <option value="INSTAGRAM">Instagram</option>

                <option value="FACEBOOK">Facebook</option>

                <option value="INDIAMART">IndiaMART</option>

                <option value="REFERRAL">Referral</option>

                <option value="OTHER">Other</option>
              </select>
            ) : (
              <div className="lead-summary-value">{lead.source || "—"}</div>
            )}
          </div>

          {/* STORE */}

          <div className="lead-summary-field">
            <label>Store</label>

            <div className="lead-summary-value">{lead.storeName || "—"}</div>
          </div>

          {/* CREATED BY */}

          <div className="lead-summary-field">
            <label>Created By</label>

            <div className="lead-summary-value">
              {lead.createdByName || "—"}
            </div>
          </div>

          {/* CREATED */}

          <div className="lead-summary-field">
            <label>Created</label>

            <div className="lead-summary-value">
              {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "—"}
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          CUSTOMER REQUIREMENT
      ================================================= */}

      <section className="lead-card">
        <div className="lead-card-header">
          <div>
            <h2>Customer Requirement</h2>
          </div>
        </div>

        {editableLead ? (
          <textarea
            className="lead-main-textarea"
            value={editForm.customerRequirement}
            onChange={(event) =>
              updateEditField("customerRequirement", event.target.value)
            }
            placeholder="Enter customer requirement..."
            rows={4}
          />
        ) : (
          <div className="lead-readonly-text">
            {lead.customerRequirement || "No requirement added."}
          </div>
        )}
      </section>

      {/* =================================================
          NOTES
      ================================================= */}

      <section className="lead-card">
        <div className="lead-card-header">
          <div>
            <h2>Notes</h2>
          </div>
        </div>

        {editableLead ? (
          <textarea
            className="lead-main-textarea"
            value={editForm.notes || ""}
            onChange={(event) => updateEditField("notes", event.target.value)}
            placeholder="Add notes..."
            rows={4}
          />
        ) : (
          <div className="lead-readonly-text">
            {lead.notes || "No notes added."}
          </div>
        )}
      </section>

      {/* =================================================
          PROCUREMENT
      ================================================= */}

      <section className="lead-card">
        <div className="lead-card-header">
          <div>
            <h2>Procurement</h2>

            <span className="lead-card-subtitle">
              {rows.length} item
              {rows.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="lead-procurement-actions">
            {!readOnlyProcurement && (
              <button
                type="button"
                className="lead-secondary-button"
                onClick={saveProcurementTable}
                disabled={busy}
              >
                Save Table
              </button>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="lead-empty-state">
            No procurement items added yet.
          </div>
        ) : (
          <div className="lead-procurement-list">
            {rows.map((row) => (
              <ProcurementItemCard
                key={row.id}
                row={row}
                readOnly={readOnlyProcurement}
                saving={savingRowId === row.id}
                onChange={(changes) => updateRow(row.id, changes)}
                onLookup={() => lookupProduct(row)}
                onSave={() => saveProcurementRow(row)}
              />
            ))}
          </div>
        )}
      </section>

      {/* =================================================
          LOST LEAD
      ================================================= */}

      {!viewOnly && !closed && !completed && (
        <section className="lead-card lead-lost-section">
          <div className="lead-card-header">
            <div>
              <h2>Mark Lead as Lost</h2>
            </div>
          </div>

          <textarea
            className="lead-main-textarea"
            value={lostReason}
            onChange={(event) => setLostReason(event.target.value)}
            placeholder="Enter reason..."
            rows={3}
          />

          <button
            type="button"
            className="lead-danger-button"
            onClick={handleMarkLost}
            disabled={busy}
          >
            Mark as Lost
          </button>
        </section>
      )}
    </div>
  );
}
