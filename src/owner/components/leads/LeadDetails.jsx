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
} from "../../../services/leadService";

import { searchCustomersByStore } from "../../../services/customerService";
import { getSalespersons } from "../../../services/salespersonService";

import ProcurementItemCard from "./ProcurementItemCard";

import "./LeadWorkflow.css";


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
    item?.productItemId ||
    item?.productId ||
    item?.localProductId ||
    "",

  productName: item?.productName || "",
  partNumber: item?.partNumber || "",
  brandname: item?.brandname || "",
  hsnCode: item?.hsnCode || "",

  quotedMrp: item?.quotedMrp ?? "",
  quotedSellingPrice: item?.quotedSellingPrice ?? "",

  sellingQuantity:
    item?.sellingQuantity ||
    item?.requestedQuantity ||
    1,

  availabilityStatus: item?.availabilityStatus || "",
  estimatedAvailabilityDate:
    item?.estimatedAvailabilityDate || "",

  procurementSource: item?.procurementSource || "",

  vendorAvailableQuantity:
    item?.vendorAvailableQuantity ?? "",

  selectedVendorStockItem:
    item?.selectedVendorStockItem || null,

  notes: item?.notes || "",
});


const payload = (row) => ({
  leadItemId: row.id,

  requirement: row.requirement,
  vehicleDescription: row.vehicleDescription,
  vin: row.vin,

  requestedQuantity: Number(row.requestedQuantity || 0),

  productItemId:
    row.productItemId === ""
      ? null
      : Number(row.productItemId),

  quotedMrp:
    row.quotedMrp === ""
      ? null
      : Number(row.quotedMrp),

  quotedSellingPrice:
    row.quotedSellingPrice === ""
      ? null
      : Number(row.quotedSellingPrice),

  sellingQuantity:
    row.sellingQuantity === ""
      ? null
      : Number(row.sellingQuantity),

  availabilityStatus:
    row.availabilityStatus || null,

  estimatedAvailabilityDate:
    row.estimatedAvailabilityDate || null,

  procurementSource:
    row.procurementSource || null,

  selectedVendorStockItem:
    row.selectedVendorStockItem || null,

  notes: row.notes || null,
});


const validate = (row) => {
  if (!row.productItemId) {
    return "Please select a product.";
  }

  if (!row.requestedQuantity || Number(row.requestedQuantity) <= 0) {
    return "Requested quantity must be greater than zero.";
  }

  if (
    row.quotedSellingPrice !== "" &&
    Number(row.quotedSellingPrice) < 0
  ) {
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
  const viewOnly = new URLSearchParams(location.search).get("view") === "readonly";
  const [followUpHistory, setFollowUpHistory] = useState([]);
  const [estimations, setEstimations] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const leadsPath = location.pathname.startsWith("/owner/")
  ? "/owner/sales/leads"
  : location.pathname.startsWith("/salesperson/")
  ? "/salesperson/sales/leads"
  : location.pathname.startsWith("/procurement/")
  ? "/procurement/sales/leads"
  : "/store/sales/leads";

  const [lead, setLead] = useState(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =====================================================
     DIRECT LEAD EDITING
  ===================================================== */

  const [editForm, setEditForm] = useState({
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

  const closed =
    status === "WON" ||
    status === "LOST";

  const completed =
    status === "PROCUREMENT_COMPLETED";

  const editableLead =
    status === "NEW" && !viewOnly;


  const readOnlyProcurement =
    viewOnly || closed ||
    completed;


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
          const [activities, documents] = await Promise.all([getLeadFollowUpActivities(id), getLeadEstimations(id)]);
          setFollowUpHistory(activities); setEstimations(documents);
        }
        catch (historyFailure) { setFollowUpHistory([]); setHistoryError(errorText(historyFailure)); }
      }

      /*
       * IMPORTANT:
       * Initialize the editable fields directly
       * when the View page opens.
       */
      setEditForm({
        customerId: data?.customerId || "",
        customerName: data?.customerName || "",

        salespersonId:
          data?.salespersonId || "",

        salespersonName:
          data?.salespersonName || "",

        source:
          data?.source || "",

        customerRequirement:
          data?.customerRequirement || "",

        notes:
          data?.notes || "",
      });

      setCustomerSearch(
        data?.customerName || ""
      );

      setRows(
        Array.isArray(data?.items)
          ? data.items.map(rowFrom)
          : []
      );

      /*
       * Load salespersons for the lead store.
       */
      if (data?.storeId) {
        try {
          const salespersons =
            await getSalespersons(data.storeId);

          setSalespersonOptions(
            Array.isArray(salespersons)
              ? salespersons
              : []
          );
        } catch (salespersonError) {
          console.error(
            "Salesperson loading failed",
            salespersonError
          );

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

    customerSearchTimer.current = setTimeout(
      async () => {
        if (!lead?.storeId) {
          return;
        }

        try {
          setCustomerSearching(true);

          const result =
            await searchCustomersByStore(
              lead.storeId,
              value
            );

          setCustomerOptions(
            Array.isArray(result)
              ? result
              : []
          );
        } catch (err) {
          console.error(
            "Customer search failed",
            err
          );

          setCustomerOptions([]);
        } finally {
          setCustomerSearching(false);
        }
      },
      300
    );
  };


  const selectCustomer = (customer) => {
    updateEditField(
      "customerId",
      customer?.id || ""
    );

    updateEditField(
      "customerName",
      customer?.customerName || ""
    );

    setCustomerSearch(
      customer?.customerName || ""
    );

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
        customerId:
          Number(editForm.customerId),

        salespersonId:
          editForm.salespersonId
            ? Number(editForm.salespersonId)
            : null,

        source:
          editForm.source.trim(),

        customerRequirement:
          editForm.customerRequirement.trim(),

        notes:
          editForm.notes?.trim() || null,
      };

      const updated =
        await updateLead(
          lead.id,
          request
        );

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

        customerId:
          updated?.customerId ??
          editForm.customerId,

        customerName:
          updated?.customerName ??
          editForm.customerName,

        salespersonId:
          updated?.salespersonId ??
          editForm.salespersonId,

        salespersonName:
          updated?.salespersonName ??
          editForm.salespersonName,

        source:
          updated?.source ??
          editForm.source,

        customerRequirement:
          updated?.customerRequirement ??
          editForm.customerRequirement,

        notes:
          updated?.notes ??
          editForm.notes,

        updatedAt:
          updated?.updatedAt ??
          previous.updatedAt,
      }));

      /*
       * Keep form synchronized.
       */
      setEditForm((previous) => ({
        ...previous,

        customerId:
          updated?.customerId ??
          previous.customerId,

        customerName:
          updated?.customerName ??
          previous.customerName,

        salespersonId:
          updated?.salespersonId ??
          previous.salespersonId,

        salespersonName:
          updated?.salespersonName ??
          previous.salespersonName,

        source:
          updated?.source ??
          previous.source,

        customerRequirement:
          updated?.customerRequirement ??
          previous.customerRequirement,

        notes:
          updated?.notes ??
          previous.notes,
      }));

      setSuccess(
        "Lead details updated successfully."
      );

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
          : row
      )
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

      const result =
        await lookupLeadItemProduct(
          lead.id,
          row.id,
          {
            requirement: row.requirement,
            vehicleDescription:
              row.vehicleDescription,
            vin: row.vin,
          }
        );

      updateRow(row.id, {
        ...result,
      });

    } catch (err) {
      setProcurementError(
        errorText(err)
      );
    } finally {
      setSavingRowId(null);
    }
  };


  /* =====================================================
     SAVE PROCUREMENT ROW
  ===================================================== */

  const saveProcurementRow = async (row) => {
    const validation =
      validate(row);

    if (validation) {
      setProcurementError(validation);
      return;
    }

    try {
      setSavingRowId(row.id);
      setProcurementError("");
      setProcurementSuccess("");

      const saved =
        await saveLeadItemProcurement(
          lead.id,
          payload(row)
        );

      if (saved) {
        updateRow(
          row.id,
          {
            ...saved,
          }
        );
      }

      setProcurementSuccess(
        "Procurement item saved successfully."
      );

    } catch (err) {
      setProcurementError(
        errorText(err)
      );
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
        const validation =
          validate(row);

        if (validation) {
          throw new Error(
            `${row.requirement || "Item"}: ${validation}`
          );
        }

        await saveLeadItemProcurement(
          lead.id,
          payload(row)
        );
      }

      setDirty(false);

      setProcurementSuccess(
        "Procurement details saved successfully."
      );

    } catch (err) {
      setProcurementError(
        errorText(err)
      );
    } finally {
      setBusy(false);
    }
  };


  /* =====================================================
     COMPLETE PROCUREMENT
  ===================================================== */

  const handleCompleteProcurement =
    async () => {
      try {
        setBusy(true);
        setProcurementError("");
        setProcurementSuccess("");

        const result =
          await completeLeadProcurement(
            lead.id
          );

        setLead((previous) => ({
          ...previous,
          ...(result || {}),
          status:
            result?.status ||
            "PROCUREMENT_COMPLETED",
        }));

        setProcurementSuccess(
          "Procurement completed successfully."
        );

      } catch (err) {
        setProcurementError(
          errorText(err)
        );
      } finally {
        setBusy(false);
      }
    };


  /* =====================================================
     REOPEN PROCUREMENT
  ===================================================== */

  const handleReopenProcurement =
    async () => {
      try {
        setBusy(true);
        setProcurementError("");

        const result =
          await reopenLeadProcurement(
            lead.id
          );

        setLead((previous) => ({
          ...previous,
          ...(result || {}),
          status:
            result?.status ||
            "NEW",
        }));

        setProcurementSuccess(
          "Lead reopened successfully."
        );

      } catch (err) {
        setProcurementError(
          errorText(err)
        );
      } finally {
        setBusy(false);
      }
    };


  /* =====================================================
     SAVE PROCUREMENT TABLE
  ===================================================== */

  const saveProcurementTable =
    async () => {
      try {
        setBusy(true);
        setProcurementError("");

        const result =
          await saveLeadProcurementTable(
            lead.id,
            rows.map(payload)
          );

        if (Array.isArray(result)) {
          setRows(
            result.map(rowFrom)
          );
        }

        setDirty(false);

        setProcurementSuccess(
          "Procurement table saved successfully."
        );

      } catch (err) {
        setProcurementError(
          errorText(err)
        );
      } finally {
        setBusy(false);
      }
    };

 

  /* =====================================================
     MARK LOST
  ===================================================== */

  const handleMarkLost = async () => {
    if (!lostReason.trim()) {
      setProcurementError(
        "Please enter a lost reason."
      );
      return;
    }

    try {
      setBusy(true);
      setProcurementError("");

      const result =
        await markLeadLost(
          lead.id,
          lostReason.trim()
        );

      setLead((previous) => ({
        ...previous,
        ...(result || {}),
        status:
          result?.status || "LOST",
        lostReason:
          result?.lostReason ||
          lostReason.trim(),
      }));

      setLostReason("");

    } catch (err) {
      setProcurementError(
        errorText(err)
      );
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
        <div className="lead-loading">
          Loading lead...
        </div>
      </div>
    );
  }


  if (!lead) {
    return (
      <div className="lead-workflow-page">
        <div className="lead-error-box">
          {error || "Lead not found."}
        </div>
      </div>
    );
  }


  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="lead-workflow-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="lead-workflow-header">

        <div>
          <Link
  to={leadsPath}
  className="lead-back-link"
>
  ← Back to Leads
</Link>

          <h1>
            {lead.leadNumber ||
              `Lead #${lead.id}`}
          </h1>

          <p>
            Lead Details & Procurement
          </p>
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
              {busy
                ? "Saving..."
                : "Save Lead Changes"}
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
                onClick={
                  handleCompleteProcurement
                }
                disabled={
                  busy ||
                  rows.length === 0 ||
                  dirty
                }
              >
                Complete Procurement
              </button>
            </>
          )}


          {completed && !viewOnly && (
            <button
              type="button"
              className="lead-secondary-button"
              onClick={
                handleReopenProcurement
              }
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

      {error && (
        <div className="lead-alert lead-alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="lead-alert lead-alert-success">
          {success}
        </div>
      )}

      {procurementError && (
        <div className="lead-alert lead-alert-error">
          {procurementError}
        </div>
      )}

      {procurementSuccess && (
        <div className="lead-alert lead-alert-success">
          {procurementSuccess}
        </div>
      )}


      {viewOnly && <section className="lead-card">
        <h2>Follow-up and Estimation</h2>
        <p>Latest estimation date: {lead.estimationDate || "Not generated"}</p>
        {estimations.map(document => <p key={document.id}>Estimation #{document.id} · {document.estimationDate} · {document.items.length} items · ₹{document.totalMrp} · {document.showPartNumber ? "Full part numbers" : "Masked part numbers"}</p>)}
        {historyError ? <p>Unable to load follow-up history: {historyError}</p> : followUpHistory.length ? followUpHistory.map(activity => <p key={activity.id}>
          {activity.createdByName || "Staff"} · {activity.createdAt || ""} · {activity.customerResponseReason} · Next follow-up: {activity.nextFollowUpAt || "—"}
        </p>) : <p>No follow-up activities recorded.</p>}
      </section>}

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
              lead.status || ""
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

            <label>
              Customer
            </label>

            {editableLead ? (
              <div className="lead-customer-editor">

                <input
                  type="text"
                  value={customerSearch}
                  onChange={(event) =>
                    handleCustomerSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search customer..."
                />

                {customerSearching && (
                  <div className="lead-search-loading">
                    Searching...
                  </div>
                )}

                {customerOptions.length > 0 && (
                  <div className="lead-customer-dropdown">

                    {customerOptions.map(
                      (customer) => (
                        <button
                          type="button"
                          key={customer.id}
                          className="lead-customer-option"
                          onClick={() =>
                            selectCustomer(
                              customer
                            )
                          }
                        >
                          <strong>
                            {customer.customerName}
                          </strong>

                          <span>
                            {customer.mobileNumber ||
                              ""}
                          </span>
                        </button>
                      )
                    )}

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

            <label>
              Salesperson
            </label>

            {editableLead ? (
              <select
                value={
                  editForm.salespersonId || ""
                }
                onChange={(event) => {

                  const selectedId =
                    event.target.value;

                  const selected =
                    salespersonOptions.find(
                      (item) =>
                        String(item.id) ===
                        String(selectedId)
                    );

                  updateEditField(
                    "salespersonId",
                    selectedId
                  );

                  updateEditField(
                    "salespersonName",
                    selected?.salespersonName ||
                      ""
                  );
                }}
              >
                <option value="">
                  Select salesperson
                </option>

                {salespersonOptions.map(
                  (salesperson) => (
                    <option
                      key={salesperson.id}
                      value={salesperson.id}
                    >
                      {salesperson.salespersonName}
                    </option>
                  )
                )}

              </select>
            ) : (
              <div className="lead-summary-value">
                {lead.salespersonName || "—"}
              </div>
            )}

          </div>


          {/* SOURCE */}

          <div className="lead-summary-field">

            <label>
              Source
            </label>

            {editableLead ? (
              <select
                value={editForm.source || ""}
                onChange={(event) =>
                  updateEditField(
                    "source",
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select source
                </option>

                <option value="PHONE">
                  Phone
                </option>

                <option value="WHATSAPP">
                  WhatsApp
                </option>

                <option value="WALK_IN">
                  Walk In
                </option>

                <option value="WEBSITE">
                  Website
                </option>

                <option value="INSTAGRAM">
                  Instagram
                </option>

                <option value="FACEBOOK">
                  Facebook
                </option>

                <option value="INDIAMART">
                  IndiaMART
                </option>

                <option value="REFERRAL">
                  Referral
                </option>

                <option value="OTHER">
                  Other
                </option>
              </select>
            ) : (
              <div className="lead-summary-value">
                {lead.source || "—"}
              </div>
            )}

          </div>


          {/* STORE */}

          <div className="lead-summary-field">

            <label>
              Store
            </label>

            <div className="lead-summary-value">
              {lead.storeName || "—"}
            </div>

          </div>


          {/* CREATED BY */}

          <div className="lead-summary-field">

            <label>
              Created By
            </label>

            <div className="lead-summary-value">
              {lead.createdByName || "—"}
            </div>

          </div>


          {/* CREATED */}

          <div className="lead-summary-field">

            <label>
              Created
            </label>

            <div className="lead-summary-value">
              {lead.createdAt
                ? new Date(
                    lead.createdAt
                  ).toLocaleString()
                : "—"}
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
            <h2>
              Customer Requirement
            </h2>
          </div>
        </div>


        {editableLead ? (
          <textarea
            className="lead-main-textarea"
            value={
              editForm.customerRequirement
            }
            onChange={(event) =>
              updateEditField(
                "customerRequirement",
                event.target.value
              )
            }
            placeholder="Enter customer requirement..."
            rows={4}
          />
        ) : (
          <div className="lead-readonly-text">
            {lead.customerRequirement ||
              "No requirement added."}
          </div>
        )}

      </section>


      {/* =================================================
          NOTES
      ================================================= */}

      <section className="lead-card">

        <div className="lead-card-header">
          <div>
            <h2>
              Notes
            </h2>
          </div>
        </div>


        {editableLead ? (
          <textarea
            className="lead-main-textarea"
            value={
              editForm.notes || ""
            }
            onChange={(event) =>
              updateEditField(
                "notes",
                event.target.value
              )
            }
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
            <h2>
              Procurement
            </h2>

            <span className="lead-card-subtitle">
              {rows.length} item
              {rows.length !== 1
                ? "s"
                : ""}
            </span>
          </div>

          <div className="lead-procurement-actions">

            {!readOnlyProcurement && (
              <button
                type="button"
                className="lead-secondary-button"
                onClick={
                  saveProcurementTable
                }
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
                readOnly={
                  readOnlyProcurement
                }
                saving={
                  savingRowId === row.id
                }
                onChange={
                  (changes) =>
                    updateRow(
                      row.id,
                      changes
                    )
                }
                onLookup={() =>
                  lookupProduct(row)
                }
                onSave={() =>
                  saveProcurementRow(row)
                }
              />
            ))}

          </div>
        )}

      </section>


      {/* =================================================
          LOST LEAD
      ================================================= */}

      {!viewOnly && !closed &&
        !completed &&
        (
          <section className="lead-card lead-lost-section">

            <div className="lead-card-header">
              <div>
                <h2>
                  Mark Lead as Lost
                </h2>
              </div>
            </div>

            <textarea
              className="lead-main-textarea"
              value={lostReason}
              onChange={(event) =>
                setLostReason(
                  event.target.value
                )
              }
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
