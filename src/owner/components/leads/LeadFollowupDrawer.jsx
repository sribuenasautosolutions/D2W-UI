import { useEffect, useState } from "react";
import { X, Trash2, Download, Plus } from "lucide-react";

import {
  getLeadById,
  updateLeadStatus,
  deleteLeadProcurementItem,
  submitLeadCustomerChanges,
} from "../../../services/leadService";

import { formatMrp, procurementTotal } from "./procurementUiUtils";
import "./LeadProcurementDrawer.css";
import LeadEstimationPreview from "./LeadEstimationPreview";
import CustomerChangesTable from "./CustomerChangesTable";
import { prepareCustomerChanges } from "./leadWorkflowUtils";

const STATUS_OPTIONS = ["FOLLOW_UP", "WON", "LOST"];

function firstValue(...values) {
  return values.find(
    (v) => v !== null && v !== undefined && String(v).trim() !== ""
  );
}

export default function LeadFollowUpDrawer({
  lead,
  onClose,
  onUpdated,
  onToast,
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fullLead, setFullLead] = useState(null);

  const [status, setStatus] = useState("FOLLOW_UP");
  const [lostReason, setLostReason] = useState("");

  const [addingRequirement, setAddingRequirement] = useState(false);
  const [editingRequirements, setEditingRequirements] = useState(false);
  const [changeDrafts, setChangeDrafts] = useState({});
  const [newRequirement, setNewRequirement] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");

  const [previewOpen, setPreviewOpen] = useState(false);
  const downloading = false;

  /* ---------------- LOAD ---------------- */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!lead?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await getLeadById(lead.id);
        if (cancelled) return;
        setFullLead(data);
        setStatus(data?.status || "FOLLOW_UP");
      } catch (e) {
        if (!cancelled)
          setError(
            e?.response?.data?.message ||
              e?.response?.data?.error ||
              "Unable to load lead."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [lead?.id]);

  /* ---------------- DERIVED ---------------- */
  const customerName =
    firstValue(
      fullLead?.customerName,
      fullLead?.customer?.customerName,
      fullLead?.customer?.name,
      lead?.customerName
    ) || "Customer unavailable";

  const customerPhone =
    firstValue(
      fullLead?.customerPhone,
      fullLead?.customerMobile,
      fullLead?.customer?.mobileNumber,
      fullLead?.customer?.mobile,
      lead?.customerPhone
    ) || "Phone not available";

  const salespersonName =
    firstValue(
      fullLead?.salespersonName,
      fullLead?.salesperson?.salespersonName,
      fullLead?.salesperson?.name,
      lead?.salespersonName
    ) || "Not assigned";

  const leadNumber =
    firstValue(fullLead?.leadNumber, lead?.leadNumber) ||
    `LEAD-${lead?.id || ""}`;

  const customerRequirement =
    firstValue(fullLead?.customerRequirement, lead?.customerRequirement) ||
    "No requirement specified";

  const items = Array.isArray(fullLead?.items) ? fullLead.items : [];
  const totalMrp = procurementTotal(items);

  /* ---------------- DELETE ROW ---------------- */
  const handleDeleteItem = async (item) => {
    if (!item?.id || busy) return;
    if (
      !window.confirm(
        `Remove ${item.partNumber || "this item"} from this lead?`
      )
    )
      return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await deleteLeadProcurementItem(lead.id, item.id);
      setFullLead(response);
      onUpdated?.(response);
      setSuccess("Item removed.");
      onToast?.(`${item.partNumber || "Item"} removed`, "success");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Unable to delete this item.";
      setError(msg);
      onToast?.(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- SEND TO PROCUREMENT ---------------- */
  const handleSendToProcurement = async () => {
    let payload;
    try {
      const quantity = Number(newQuantity);
      if (addingRequirement && (!newRequirement.trim() || !Number.isInteger(quantity) || quantity < 1))
        throw new Error("Enter a requirement description and positive whole quantity.");
      payload = prepareCustomerChanges(items, changeDrafts, addingRequirement ? [{
        requirement: newRequirement.trim(), quantity, reason: "Customer requirement added during follow-up"
      }] : []);
    } catch (e) { setError(e.message); return; }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await submitLeadCustomerChanges(lead.id, payload);
      setFullLead(response);
      onUpdated?.(response);
      onToast?.(`${leadNumber} sent back to Procurement`, "success");

      setNewRequirement("");
      setNewQuantity("1");
      setAddingRequirement(false);
      onClose?.();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Unable to send to Procurement.";
      setError(msg);
      onToast?.(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- DOWNLOAD ESTIMATION ---------------- */
  const handleDownloadEstimation = () => {
    if (!items.length) { setError("No procurement items to estimate."); return; }
    setPreviewOpen(true);
  };

  /* ---------------- STATUS CHANGE ---------------- */
  const confirmStatus = async () => {
    if (status === fullLead?.status) {
      setError("Select a different status to update.");
      return;
    }
    if (status === "LOST" && !lostReason.trim()) {
      setError("Lost reason is required.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        status === "LOST"
          ? await updateLeadStatus(lead.id, "LOST", lostReason.trim())
          : await updateLeadStatus(lead.id, status);
      setFullLead((prev) => ({ ...prev, ...updated }));
      onUpdated?.(updated);
      setSuccess(`Lead moved to ${status}.`);
      onToast?.(`Lead moved to ${status.replaceAll("_", " ")}`, "success");
      if (status === "WON" || status === "LOST") onClose?.();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Unable to update status.";
      setError(msg);
      onToast?.(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="procurement-drawer-content follow-up-drawer-content">
      {/* ============================================
          HEADER
          ============================================ */}
      <header className="procurement-drawer-header">
        <div className="procurement-header-main">
          <div className="procurement-drawer-eyebrow">
            CUSTOMER FOLLOW-UP
          </div>
          <div className="procurement-header-title-row">
            <h2>{leadNumber}</h2>
          </div>

          <div className="procurement-customer-meta procurement-customer-meta--with-status">
            <label className="procurement-meta-field">
              <span>Customer</span>
              <input type="text" value={customerName} readOnly />
            </label>
            <label className="procurement-meta-field">
              <span>Mobile</span>
              <input type="text" value={customerPhone} readOnly />
            </label>
            <label className="procurement-meta-field">
              <span>Salesperson</span>
              <input type="text" value={salespersonName} readOnly />
            </label>
            <label className="procurement-meta-field">
              <span>Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={busy}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <button
          type="button"
          className="procurement-drawer-close"
          onClick={onClose}
          aria-label="Close follow-up drawer"
        >
          <X size={17} />
        </button>
      </header>

      {/* ============================================
          BODY
          ============================================ */}
      <main className="procurement-drawer-body follow-up-body">
        {loading ? (
          <div className="procurement-table-state">Loading lead...</div>
        ) : (
          <>
            {error && (
              <div className="procurement-message error">{error}</div>
            )}
            {success && (
              <div className="procurement-message success">{success}</div>
            )}

           {/* Customer Requirement — read-only, styled like Procurement */}
            <section className="followup-requirement-panel">
              <div className="followup-requirement-label">
                Customer Requirement
              </div>
              <div className="followup-requirement-text">
                {customerRequirement}
              </div>
            </section>

            {status === "LOST" && (
              <section className="followup-lost-panel">
                <div className="followup-lost-label">Lost Reason</div>
                <label className="procurement-meta-field">
                  <span>Why will the customer not proceed?</span>
                  <input
                    type="text"
                    maxLength={500}
                    value={lostReason}
                    disabled={busy}
                    onChange={(e) => setLostReason(e.target.value)}
                    placeholder="Enter lost reason..."
                  />
                </label>
              </section>
            )}

            {status !== fullLead?.status && (
              <button
                type="button"
                className="procurement-complete-btn followup-status-btn"
                disabled={
                  busy || (status === "LOST" && !lostReason.trim())
                }
                onClick={confirmStatus}
              >
                {busy
                  ? "Updating..."
                  : `Move to ${status.replaceAll("_", " ")}`}
              </button>
            )}

            {/* ============================================
                PROCUREMENT ITEMS
                ============================================ */}
            <section className="procurement-table-section followup-table-section">
              <div className="followup-table-heading">
                <div className="followup-table-heading-text">
                  <h3>Procurement Items</h3>
                  <span>
                    Parts Procurement confirmed for this customer.
                  </span>
                </div>

                <div className="followup-table-heading-actions">
                  <button type="button" className="followup-add-requirement-btn" disabled={busy || !items.length}
                    onClick={() => setEditingRequirements(true)}>Edit Requirements / Quantity</button>
                  <span className="procurement-table-count">
                    {items.length}
                  </span>
                  <button
                    type="button"
                    className="followup-add-requirement-btn"
                    onClick={() => setAddingRequirement(true)}
                    disabled={busy || addingRequirement}
                  >
                    <Plus size={14} /> Add Requirement
                  </button>
                </div>
              </div>

              {editingRequirements && <div className="followup-new-requirement-panel">
                <CustomerChangesTable items={items} drafts={changeDrafts} disabled={busy}
                  onChange={(id, draft) => setChangeDrafts(current => ({ ...current, [id]: draft }))} />
                {!addingRequirement && <div className="followup-new-requirement-actions">
                  <button type="button" className="procurement-save-all-btn" disabled={busy} onClick={handleSendToProcurement}>Send to Procurement</button>
                  <button type="button" className="procurement-cancel-btn" disabled={busy}
                    onClick={() => { setEditingRequirements(false); setChangeDrafts({}); }}>Cancel</button>
                </div>}
              </div>}
              {addingRequirement && (
                <div className="followup-new-requirement-panel">
                  <div className="followup-new-requirement-fields">
                    <label className="procurement-meta-field">
                      <span>Customer Requirement Description</span>
                      <textarea
                        rows={3}
                        value={newRequirement}
                        disabled={busy}
                        onChange={(e) =>
                          setNewRequirement(e.target.value)
                        }
                        placeholder="What does the customer want to add or change?"
                      />
                    </label>
                    <label className="procurement-meta-field followup-qty-field">
                      <span>Quantity</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={newQuantity}
                        disabled={busy}
                        onChange={(e) =>
                          setNewQuantity(e.target.value)
                        }
                      />
                    </label>
                  </div>
                  <div className="followup-new-requirement-actions">
                    <button
                      type="button"
                      className="procurement-save-all-btn"
                      onClick={handleSendToProcurement}
                      disabled={busy || !newRequirement.trim()}
                    >
                      {busy ? "Sending..." : "Send to Procurement"}
                    </button>
                    <button
                      type="button"
                      className="procurement-cancel-btn"
                      onClick={() => {
                        setAddingRequirement(false);
                        setNewRequirement("");
                        setNewQuantity("1");
                      }}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {items.length === 0 ? (
                <div className="procurement-table-state">
                  No procurement items recorded for this lead.
                </div>
              ) : (
                <div className="procurement-table-wrap">
                  <table className="procurement-table followup-table">
                    <thead>
                      <tr>
                        <th>Part Number</th>
                        <th>Part Name</th>
                        <th>MRP</th>
                        <th>Requested Qty</th>
                        <th>Source</th>
                        <th>Vendor</th>
                        <th>Availability</th>
                        <th>ETA</th>
                        <th className="followup-delete-col">
                          Delete
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id || index}>
                          <td>{item.partNumber || "—"}</td>
                          <td className="procurement-table-name">
                            <strong>
                              {item.productName ||
                                item.requirement ||
                                "—"}
                            </strong>
                          </td>
                          <td>{formatMrp(item.quotedMrp)}</td>
                          <td>{item.requestedQuantity || "—"}</td>
                          <td>
                            {item.procurementSource === "LOCAL"
                              ? "D2W"
                              : item.procurementSource === "VENDOR"
                              ? "Vendor"
                              : (item.procurementSource || "—").replaceAll(
                                  "_",
                                  " "
                                )}
                          </td>
                          <td>{item.selectedVendorName || "—"}</td>
                          <td>
                            {(item.availabilityStatus || "—").replaceAll(
                              "_",
                              " "
                            )}
                          </td>
                          <td>
                            {item.estimatedAvailabilityDate || "—"}
                          </td>
                          <td className="followup-delete-col">
                            <button
                              type="button"
                              className="procurement-table-remove"
                              onClick={() => handleDeleteItem(item)}
                              disabled={busy}
                              aria-label={`Delete item ${
                                item.partNumber || index + 1
                              }`}
                              title="Delete item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="followup-total-mrp">
                <span>Total MRP</span>
                <strong>{formatMrp(totalMrp)}</strong>
              </div>
            </section>
          </>
        )}
      </main>

      {/* ============================================
          FOOTER — download right, close left
          ============================================ */}
      {previewOpen && <LeadEstimationPreview leadId={lead.id} itemIds={items.map(item => item.id)}
        onClose={() => setPreviewOpen(false)} onDownloaded={() => onToast?.("Estimation downloaded.", "success")} />}
      <footer className="follow-up-drawer-footer">
        <button
          type="button"
          className="procurement-cancel-btn"
          onClick={onClose}
          disabled={busy || downloading}
        >
          Close
        </button>

        <button
          type="button"
          className="procurement-complete-btn followup-download-btn"
          onClick={handleDownloadEstimation}
          disabled={busy || downloading || items.length === 0}
        >
          <Download size={14} />
          {downloading ? "Preparing..." : "Download Estimation"}
        </button>
      </footer>
    </div>
  );
}