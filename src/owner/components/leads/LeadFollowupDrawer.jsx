import { useEffect, useMemo, useState } from "react";
import { X, Trash2, Download, Plus, Pencil, Check } from "lucide-react";

import {
  getLeadById,
  updateLeadStatus,
  deleteLeadProcurementItem,
  submitLeadCustomerChanges,
  createLeadFollowUpActivity,
  getLeadFollowUpActivities,
} from "../../../services/leadService";

import { formatMrp, procurementTotal } from "./procurementUiUtils";
import "./LeadProcurementDrawer.css";
import LeadEstimationPreview from "./LeadEstimationPreview";
import CustomerChangesTable from "./CustomerChangesTable";
import { prepareCustomerChanges } from "./leadWorkflowUtils";
import CustomerRequirementTable from "./CustomerRequirementTable";
import ActivityLogStream from "./ActivityLogStream";
import LostReasonPicker from "./LostReasonPicker";
import { buildLostReason } from "./leadLostReasons";

const STATUS_OPTIONS = ["FOLLOW_UP", "WON", "LOST"];

function todayDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function scheduleParts(value) {
  if (!value) return { followUpDate: "", followUpTime: "" };
  const [followUpDate = "", rawTime = ""] = String(value).split("T");
  return { followUpDate, followUpTime: rawTime.slice(0, 5) };
}

function firstValue(...values) {
  return values.find(
    (v) => v !== null && v !== undefined && String(v).trim() !== ""
  );
}

function statusLabel(value) {
  const text = String(value || "").replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function MetaField({ label, value, editing, onChange }) {
  return (
    <label className={`fu-meta-field${editing ? " is-editing" : ""}${!editing && /not assigned/i.test(String(value || "")) ? " is-unassigned" : ""}`}>
      <span>{label}</span>
      <input type="text" value={value} readOnly={!editing} onChange={(e) => onChange?.(e.target.value)} />
    </label>
  );
}

export default function LeadFollowUpDrawer({
  lead,
  onClose,
  onUpdated,
  onToast,
  onCustomerEdit,
  assignees,
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fullLead, setFullLead] = useState(null);

  /* The next date/time is persisted with each follow-up activity. */
  const [schedule, setSchedule] = useState({ followUpDate: "", followUpTime: "" });

  const [status, setStatus] = useState("FOLLOW_UP");
  const [lostChoice, setLostChoice] = useState("");
  const [lostNote, setLostNote] = useState("");
  const lostReason = buildLostReason(lostChoice, lostNote);

  const [addingRequirement, setAddingRequirement] = useState(false);
  const [editingRequirements, setEditingRequirements] = useState(false);
  const [changeDrafts, setChangeDrafts] = useState({});
  const [newRequirement, setNewRequirement] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");

  const [previewOpen, setPreviewOpen] = useState(false);
  const downloading = false;

  /* ---- UI-only state: customer edit toggle + activity log ---- */
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerEdits, setCustomerEdits] = useState({});
  const [activities, setActivities] = useState([]);

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
      setActivities([]);
      setCustomerEdits({});
      setEditingCustomer(false);
      try {
        const [data, savedActivities] = await Promise.all([
          getLeadById(lead.id), getLeadFollowUpActivities(lead.id),
        ]);
        if (cancelled) return;
        setFullLead(data);
        setStatus(data?.status || "FOLLOW_UP");
        const activityList = Array.isArray(savedActivities) ? savedActivities : [];
        setActivities(activityList.map(activity => ({
          id: activity.id, type: activity.activityType || "Note",
          text: activity.customerResponseReason || "", at: activity.createdAt,
          nextFollowUpAt: activity.nextFollowUpAt,
          createdByName: activity.createdByName,
        })));
        const latestSchedule = activityList.find(activity => activity.nextFollowUpAt)?.nextFollowUpAt;
        const restoredSchedule = scheduleParts(latestSchedule);
        setSchedule(latestSchedule && new Date(latestSchedule) > new Date()
          ? restoredSchedule : { followUpDate: "", followUpTime: "" });
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

  const vinNumber = firstValue(
    fullLead?.vinNumber,
    fullLead?.vin,
    lead?.vinNumber,
    lead?.vin
  );

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

  /* ---------------- UI-only derived + handlers ---------------- */
  const shownCustomer = {
    name: customerEdits.name ?? customerName,
    phone: customerEdits.phone ?? customerPhone,
    salesperson: customerEdits.salesperson ?? salespersonName,
  };

  const toggleCustomerEdit = () => {
    if (editingCustomer && Object.keys(customerEdits).length > 0) {
      // Optional hook: the parent may persist these. Nothing is saved here.
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

  const addActivity = async (type, text) => {
    if (Boolean(schedule.followUpDate) !== Boolean(schedule.followUpTime)) {
      setError("Enter both the next follow-up date and time, or leave both blank.");
      return false;
    }
    const nextFollowUpAt = schedule.followUpDate && schedule.followUpTime
      ? `${schedule.followUpDate}T${schedule.followUpTime}:00` : null;
    try {
      setError("");
      const saved = await createLeadFollowUpActivity(lead.id, {
        customerResponseReason: text,
        activityType: String(type).toUpperCase(),
        nextFollowUpAt,
      });
      setActivities(current => [{
        id: saved.id, type: saved.activityType || type,
        text: saved.customerResponseReason || text, at: saved.createdAt,
        nextFollowUpAt: saved.nextFollowUpAt,
        createdByName: saved.createdByName,
      }, ...current]);
      onUpdated?.();
      return true;
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to save this follow-up activity.");
      return false;
    }
  };

  const trail = useMemo(() => {
    const entries = [...activities];
    if (fullLead?.createdAt) {
      entries.push({ id: "system-created", type: "System", text: `${leadNumber} created`, at: fullLead.createdAt });
    }
    return entries;
  }, [activities, fullLead?.createdAt, leadNumber]);

  const statusDirty = status !== fullLead?.status;
  const latestScheduledAt = activities.find(activity => activity.nextFollowUpAt)?.nextFollowUpAt;
  const latestSchedule = scheduleParts(latestScheduledAt);
  const scheduleDirty = Boolean(schedule.followUpDate || schedule.followUpTime) && (
    schedule.followUpDate !== latestSchedule.followUpDate ||
    schedule.followUpTime !== latestSchedule.followUpTime
  );

  const summaryD2w = items.filter((item) => item.procurementSource === "LOCAL").length;
  const summaryVendor = items.filter((item) => item.procurementSource === "VENDOR").length;
  const summaryNotAvailable = items.filter((item) => item.procurementSource === "NOT_AVAILABLE").length;

  /* ---------------- DELETE ROW ---------------- */
  const handleDeleteItem = async (item) => {
    if (!item?.id || busy) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await deleteLeadProcurementItem(lead.id, item.id);
      setFullLead(response);
      onUpdated?.(response);
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
    if (!statusDirty && !scheduleDirty) {
      return;
    }
    if (statusDirty && status === "LOST" && !lostReason.trim()) {
      setError("Lost reason is required.");
      return;
    }
    if (scheduleDirty && (!schedule.followUpDate || !schedule.followUpTime)) {
      setError("Enter both the next follow-up date and time.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      if (scheduleDirty) {
        const scheduled = await createLeadFollowUpActivity(lead.id, {
          customerResponseReason: "Next follow-up scheduled",
          activityType: "NOTE",
          nextFollowUpAt: `${schedule.followUpDate}T${schedule.followUpTime}:00`,
        });
        setActivities(current => [{
          id: scheduled.id, type: scheduled.activityType || "NOTE",
          text: scheduled.customerResponseReason || "Next follow-up scheduled",
          at: scheduled.createdAt, nextFollowUpAt: scheduled.nextFollowUpAt,
          createdByName: scheduled.createdByName,
        }, ...current]);
      }
      if (statusDirty) {
        const updated = status === "LOST"
          ? await updateLeadStatus(lead.id, "LOST", lostReason.trim())
          : await updateLeadStatus(lead.id, status);
        setFullLead((prev) => ({ ...prev, ...updated }));
        onUpdated?.(updated);
        setSuccess(`Lead moved to ${status}.`);
        onToast?.(`Lead moved to ${status.replaceAll("_", " ")}`, "success");
        if (status === "WON" || status === "LOST") onClose?.();
      } else {
        setSuccess("Next follow-up date and time saved.");
        onToast?.("Next follow-up date and time saved.", "success");
        onUpdated?.();
      }
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
    <div className="fu-root lead-drawer-container">
      {/* ======================= HEADER ======================= */}
      <header className="fu-header">
        <div className="fu-header-top">
          <div>
            <div className="fu-eyebrow">CUSTOMER FOLLOW-UP</div>
            <div className="fu-title-row">
              <h2>{leadNumber}</h2>
              <span className="fu-badge">{items.length}</span>
              <button
                type="button"
                className={`fu-icon-btn fu-edit-toggle${editingCustomer ? " is-active" : ""}`}
                onClick={toggleCustomerEdit}
                aria-pressed={editingCustomer}
                aria-label={editingCustomer ? "Finish editing customer info" : "Edit customer info"}
                title={editingCustomer ? "Done editing" : "Edit customer info"}
              >
                {editingCustomer ? <Check size={15} /> : <Pencil size={14} />}
              </button>
            </div>
          </div>
          <button type="button" className="fu-icon-btn" onClick={onClose} aria-label="Close follow-up drawer">
            <X size={17} />
          </button>
        </div>
      </header>

      {/* ======================= BODY ======================= */}
      <div className="fu-split drawer-body-grid">
        <div className="fu-left">
            <section className="fu-info" aria-label="Customer details">
              <h3 className="fu-section-title">Customer Info</h3>
              <div className="fu-meta-row">
              <MetaField label="Customer" value={shownCustomer.name} editing={editingCustomer}
                onChange={(v) => updateCustomerEdit("name", v)} />
              <MetaField label="Mobile" value={shownCustomer.phone} editing={editingCustomer}
                onChange={(v) => updateCustomerEdit("phone", v)} />
              {vinNumber && <MetaField label="VIN Number" value={vinNumber} />}
              <MetaField label="Salesperson" value={shownCustomer.salesperson} />
              <label className="fu-meta-field"><span>Created by</span><input value={fullLead?.createdByName || "—"} readOnly /></label>
              <label className="fu-meta-field"><span>Procurement person</span><input value={fullLead?.procurementUserName || "—"} readOnly /></label>
              <label className="fu-meta-field">
                <span>Lead ID</span>
                <input type="text" value={leadNumber} readOnly />
              </label>
              <label className="fu-meta-field is-editing">
                <span>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy}>
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>{statusLabel(st)}</option>
                  ))}
                </select>
              </label>
            </div>
            </section>
      <main className="fu-body fu-main">
        {loading ? (
          <div className="fu-state">Loading lead...</div>
        ) : (
          <>
            {error && <div className="fu-alert fu-alert--error">{error}</div>}
            {success && <div className="fu-alert fu-alert--success">{success}</div>}

            {status === "LOST" && (
              <section className="fu-lost">
                <LostReasonPicker
                  choice={lostChoice}
                  note={lostNote}
                  onChoiceChange={setLostChoice}
                  onNoteChange={setLostNote}
                  disabled={busy}
                />
              </section>
            )}

            <CustomerRequirementTable
              requirement={customerRequirement}
              actions={
                <>
                  <button type="button" className="fu-btn fu-btn--outline fu-btn--sm"
                    disabled={busy || !items.length} onClick={() => setEditingRequirements(true)}>
                    Edit Requirements / Quantity
                  </button>
                  <button type="button" className="fu-btn fu-btn--outline fu-btn--sm"
                    onClick={() => setAddingRequirement(true)} disabled={busy || addingRequirement}>
                    <Plus size={14} /> Add Requirement
                  </button>
                </>
              }
            >
              {editingRequirements && (
                <div className="fu-panel edit-requirement-card-wrapper">
                  <div className="edit-requirement-scroll edit-requirement-table-container">
                    <CustomerChangesTable items={items} drafts={changeDrafts} disabled={busy}
                      onChange={(id, draft) => setChangeDrafts(current => ({ ...current, [id]: draft }))} />
                  </div>
                  {!addingRequirement && (
                    <div className="fu-panel-actions">
                      <button type="button" className="fu-btn fu-btn--outline fu-btn--sm" disabled={busy}
                        onClick={handleSendToProcurement}>Send to Procurement</button>
                      <button type="button" className="fu-btn fu-btn--ghost fu-btn--sm requirement-cancel-btn" disabled={busy}
                        onClick={() => { setEditingRequirements(false); setChangeDrafts({}); }}>Cancel</button>
                    </div>
                  )}
                </div>
              )}

              {addingRequirement && (
                <div className="fu-panel">
                  <div className="fu-panel-fields">
                    <label className="fu-field">
                      <span>Customer requirement description</span>
                      <textarea
                        className="fu-textarea"
                        rows={3}
                        value={newRequirement}
                        disabled={busy}
                        onChange={(e) => setNewRequirement(e.target.value)}
                        placeholder="What does the customer want to add or change?"
                      />
                    </label>
                    <label className="fu-field fu-field--qty">
                      <span>Quantity</span>
                      <input className="fu-input" type="number" min="1" step="1" value={newQuantity}
                        disabled={busy} onChange={(e) => setNewQuantity(e.target.value)} />
                    </label>
                  </div>
                  <div className="fu-panel-actions">
                    <button type="button" className="fu-btn fu-btn--outline fu-btn--sm"
                      onClick={handleSendToProcurement} disabled={busy || !newRequirement.trim()}>
                      {busy ? "Sending..." : "Send to Procurement"}
                    </button>
                    <button type="button" className="fu-btn fu-btn--ghost fu-btn--sm requirement-cancel-btn"
                      onClick={() => { setAddingRequirement(false); setNewRequirement(""); setNewQuantity("1"); }}
                      disabled={busy}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </CustomerRequirementTable>

            {/* ---------- Procurement items ---------- */}
            <section className="lpt-card">
              <div className="lpt-head">
                <div className="lpt-title">
                  <h3>Procurement Items</h3>
                  <span className="lpt-count">{items.length}</span>
                </div>
                <div className="lpt-chips" aria-label="Procurement summary">
                  <span className="lpt-chip lpt-chip--total"><i />Total <strong>{items.length}</strong></span>
                  <span className="lpt-chip lpt-chip--d2w"><i />D2W <strong>{summaryD2w}</strong></span>
                  <span className="lpt-chip lpt-chip--vendor"><i />Vendor <strong>{summaryVendor}</strong></span>
                  <span className="lpt-chip lpt-chip--na"><i />Not Available <strong>{summaryNotAvailable}</strong></span>
                </div>
                <div className="lpt-total-chip" aria-label="Total MRP">
                  <span>Total MRP</span>
                  <strong>{formatMrp(totalMrp)}</strong>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="lpt-state">No procurement items recorded for this lead.</div>
              ) : (
                <div className="lpt-table-wrap">
                  <table className="lpt-table lpt-table--followup-lite procurement-grid-table">
                    <colgroup>
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "7%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "56px" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Part Number</th>
                        <th>Part Name</th>
                        <th>MRP</th>
                        <th>Req. Qty</th>
                        <th>Source</th>
                        <th>Vendor</th>
                        <th>Availability</th>
                        <th>ETA</th>
                        <th className="lpt-col-action">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id || index}>
                          <td className="lpt-td">{item.partNumber || "—"}</td>
                          <td className="lpt-td">
                            <strong>{item.productName || item.requirement || "—"}</strong>
                          </td>
                          <td className="lpt-td">{formatMrp(item.quotedMrp)}</td>
                          <td className="lpt-td">{item.requestedQuantity || "—"}</td>
                          <td className="lpt-td">
                            {item.procurementSource === "LOCAL"
                              ? "D2W"
                              : item.procurementSource === "VENDOR"
                              ? "Vendor"
                              : (item.procurementSource || "—").replaceAll("_", " ")}
                          </td>
                          <td className="lpt-td">{item.selectedVendorName || "—"}</td>
                          <td className="lpt-td">{(item.availabilityStatus || "—").replaceAll("_", " ")}</td>
                          <td className="lpt-td">{item.estimatedAvailabilityDate || "—"}</td>
                          <td className="lpt-td lpt-col-action">
                            <button
                              type="button"
                              className="lpt-row-remove delete-icon-btn"
                              onClick={() => handleDeleteItem(item)}
                              disabled={busy}
                              aria-label={`Delete item ${item.partNumber || index + 1}`}
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
            </section>

          </>
        )}
      </main>
        </div>
        <aside className="fu-side" aria-label="Activity and schedule">
          <section className="fu-schedule" aria-label="Next follow-up schedule">
            <h3 className="fu-side-title">Next Follow-up</h3>
            <p className="als-hint">The date and time are saved with the next activity note.</p>
            <div className="fu-schedule-row">
              <label className="fu-meta-field is-editing">
                <span>Follow-up date</span>
                <input type="date" min={todayDate()} value={schedule.followUpDate} disabled={busy}
                  onChange={(e) => setSchedule((c) => ({ ...c, followUpDate: e.target.value }))} />
              </label>
              <label className="fu-meta-field is-editing">
                <span>Follow-up time</span>
                <input type="time" value={schedule.followUpTime} disabled={busy}
                  onChange={(e) => setSchedule((c) => ({ ...c, followUpTime: e.target.value }))} />
              </label>
            </div>
          </section>
          <ActivityLogStream entries={trail} onAdd={addActivity} disabled={busy} />
        </aside>
      </div>

      {previewOpen && <LeadEstimationPreview leadId={lead.id} itemIds={items.map(item => item.id)}
        onClose={() => setPreviewOpen(false)} onDownloaded={() => onToast?.("Estimation downloaded.", "success")} />}

      {/* ======================= FOOTER ======================= */}
      <footer className="fu-footer">
        <button type="button" className="fu-btn fu-btn--ghost" onClick={onClose} disabled={busy || downloading}>
          Close
        </button>
        <div className="fu-footer-primary">
          <button type="button" className="fu-btn fu-btn--outline" onClick={confirmStatus}
            disabled={busy || (!statusDirty && !scheduleDirty) || (statusDirty && status === "LOST" && !lostReason.trim())}>
            {busy ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" className="fu-btn fu-btn--primary" onClick={handleDownloadEstimation}
            disabled={busy || downloading || items.length === 0}>
            <Download size={14} />
            {downloading ? "Preparing..." : "Download Estimation / Proforma (PDF)"}
          </button>
        </div>
      </footer>
    </div>
  );
}
