import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
    downloadLeadEstimation,
    getLeadById,
    getLeadEstimations,
    getLeadFollowUpActivities,
    getLeadHistory,
    updateLeadStatus,
} from "../../../services/leadService";
import { getConversationForLead } from "../../../services/whatsappChatService";
import { ChatView } from "./WhatsAppChats";
import LeadProcurementDrawer from "./LeadProcurementDrawer";
import LeadFollowUpDrawer from "./LeadFollowupDrawer";
import LostReasonPicker from "./LostReasonPicker";
import { buildLostReason } from "./leadLostReasons";
import "./LeadWorkspace.css";

const STAGE_LABEL = {
    NEW: "New Lead",
    PROCUREMENT: "Procurement",
    FOLLOW_UP: "Follow-up",
    WON: "Won",
    LOST: "Lost",
};

const TABS = [
    { key: "chat", label: "Chat" },
    { key: "details", label: "Details" },
    { key: "procurement", label: "Procurement" },
    { key: "estimation", label: "Estimation" },
    { key: "history", label: "History" },
];

const canUseWhatsApp = () => {
    try {
        const role = JSON.parse(localStorage.getItem("user") || "{}").role;
        return role === "SUPER_ADMIN" || role === "STORE_OWNER";
    } catch {
        return false;
    }
};

const errorText = (err, fallback) =>
    err?.response?.data?.message || err?.response?.data?.error || fallback;

const money = (v) =>
    v == null || v === "" ? "-" : `Rs. ${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const dateTime = (v) => (v ? new Date(v).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "-");
const dateOnly = (v) => (v ? new Date(v).toLocaleDateString([], { dateStyle: "medium" }) : "-");
const pretty = (v) => (v ? String(v).replaceAll("_", " ") : "-");

/* ---------- parts table (read only) ---------- */
function ItemsTable({ items, showProcurement }) {
    if (!items || items.length === 0) return <p className="lw-muted">No parts on this lead yet.</p>;
    return (
        <div className="lw-table-wrap">
            <table className="lw-table">
                <thead>
                    <tr>
                        <th>Requirement</th>
                        <th>Qty</th>
                        <th>Part number</th>
                        {showProcurement && <th>Part / brand</th>}
                        {showProcurement && <th>Availability</th>}
                        {showProcurement && <th>MRP</th>}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.id}>
                            <td>
                                {item.requirement || "-"}
                                {item.vehicleDescription ? <div className="lw-muted">{item.vehicleDescription}</div> : null}
                                {item.vin ? <div className="lw-muted">VIN {item.vin}</div> : null}
                            </td>
                            <td>{item.sellingQuantity ?? item.requestedQuantity ?? "-"}</td>
                            <td>{item.partNumber || <span className="lw-pending">Pending</span>}</td>
                            {showProcurement && (
                                <td>{[item.productName, item.brandName].filter(Boolean).join(" · ") || "-"}</td>
                            )}
                            {showProcurement && <td>{pretty(item.availabilityStatus)}</td>}
                            {showProcurement && <td>{money(item.quotedMrp)}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ---------- Details tab ---------- */
function DetailsTab({ lead, status, onEditLead }) {
    const rows = [
        ["Customer", lead.customerName],
        ["Mobile", lead.customerPhone],
        ...(lead.vinNumber || lead.vin ? [["VIN Number", lead.vinNumber || lead.vin]] : []),
        ["Source", pretty(lead.source)],
        ["Store", lead.storeName],
        ["Salesperson", lead.salespersonName || "Not assigned"],
        ["Created", `${dateTime(lead.createdAt)}${lead.createdByName ? ` by ${lead.createdByName}` : ""}`],
        ["Stage", STAGE_LABEL[status] || status],
    ];
    if (lead.status === "LOST") rows.push(["Lost reason", lead.lostReason || "No reason recorded"]);
    if (lead.closedAt) rows.push(["Closed", dateTime(lead.closedAt)]);

    return (
        <div className="lw-pad">
            <dl className="lw-dl">
                {rows.map(([k, v]) => (
                    <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v || "-"}</dd>
                    </div>
                ))}
            </dl>
            <h3 className="lw-h3">Customer requirement</h3>
            <p className="lw-requirement">{lead.customerRequirement || "No requirement specified"}</p>
            <h3 className="lw-h3">Parts</h3>
            <ItemsTable items={lead.items} showProcurement={false} />
            {lead.status === "NEW" && (
                <button type="button" className="lw-btn" onClick={() => onEditLead(lead)}>
                    Edit lead
                </button>
            )}
        </div>
    );
}

/* ---------- Estimation tab for a closed lead: past estimations ---------- */
function EstimationHistory({ leadId }) {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        getLeadEstimations(leadId)
            .then((data) => !cancelled && setRows(Array.isArray(data) ? data : []))
            .catch((err) => !cancelled && setError(errorText(err, "Could not load the estimations.")));
        return () => {
            cancelled = true;
        };
    }, [leadId]);

    const open = async (row) => {
        setBusyId(row.id);
        setError("");
        try {
            const blob = await downloadLeadEstimation(leadId, row.id);
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener");
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err) {
            setError(errorText(err, "Could not open the PDF."));
        } finally {
            setBusyId(null);
        }
    };

    if (error) return <div className="lw-error">{error}</div>;
    if (!rows) return <div className="lw-center"><Loader2 className="lw-spin" size={20} /></div>;
    if (rows.length === 0) return <p className="lw-muted lw-pad">No estimation was created for this lead.</p>;
    return (
        <ul className="lw-list">
            {rows.map((row) => (
                <li key={row.id}>
                    <div>
                        <strong>Estimation #{row.id}</strong>
                        <div className="lw-muted">{dateOnly(row.estimationDate)} · Total {money(row.totalMrp)}</div>
                    </div>
                    <button type="button" className="lw-btn lw-btn--small" disabled={busyId === row.id} onClick={() => open(row)}>
                        {busyId === row.id ? "Opening..." : "Open PDF"}
                    </button>
                </li>
            ))}
        </ul>
    );
}

/* ---------- History tab ---------- */
function HistoryTab({ lead }) {
    const [activities, setActivities] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        Promise.all([getLeadFollowUpActivities(lead.id), getLeadHistory(lead.id)])
            .then(([data, events]) => {
                if (cancelled) return;
                setActivities(Array.isArray(data) ? data : []);
                setHistory(Array.isArray(events) ? events : []);
            })
            .catch((err) => !cancelled && setError(errorText(err, "Could not load lead history.")));
        return () => {
            cancelled = true;
        };
    }, [lead.id]);

    const events = history
        .filter(event => !["FOLLOW_UP_ACTIVITY", "PROCUREMENT_ACTIVITY", "FOLLOW_UP_SCHEDULED"].includes(event.eventType))
        .map(event => ({
            at: event.createdAt,
            title: String(event.eventType || "Activity").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
            text: [event.actorName ? `By ${event.actorName}.` : "", event.previousValue ? `From ${event.previousValue}.` : "",
                event.newValue ? `To ${event.newValue}.` : "", event.details || ""].filter(Boolean).join(" "),
        }));
    if (lead.createdAt && !history.some(event => event.eventType === "LEAD_CREATED")) {
        events.push({
            at: lead.createdAt,
            title: "Lead created",
            text: `${lead.createdByName ? `By ${lead.createdByName}. ` : ""}Source: ${pretty(lead.source)}.`,
        });
    }
    (activities || []).forEach((a) =>
        events.push({
            at: a.createdAt,
            title: String(a.activityType || "FOLLOW_UP").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
            text: [
                a.createdByName ? `By ${a.createdByName}.` : "",
                a.customerResponseReason || "",
                a.nextFollowUpAt ? `Next follow-up: ${dateTime(a.nextFollowUpAt)}.` : "",
            ].filter(Boolean).join(" "),
        })
    );
    if (lead.closedAt && !history.some(event => event.eventType === "WON" || event.eventType === "LOST")) {
        events.push({
            at: lead.closedAt,
            title: lead.status === "WON" ? "Marked Won" : "Marked Lost",
            text: lead.status === "LOST" ? lead.lostReason || "No reason recorded." : "",
        });
    }
    events.sort((a, b) => new Date(a.at) - new Date(b.at));

    return (
        <div className="lw-pad">
            {error && <div className="lw-error">{error}</div>}
            {!activities && !error && <div className="lw-center"><Loader2 className="lw-spin" size={20} /></div>}
            {activities && (
                <ol className="lw-timeline">
                    {events.map((e, i) => (
                        <li key={i}>
                            <strong>{e.title}</strong>
                            <span className="lw-muted"> · {dateTime(e.at)}</span>
                            {e.text && <p>{e.text}</p>}
                        </li>
                    ))}
                </ol>
            )}
            <p className="lw-note">Lead assignments, stage changes, procurement, follow-ups, customer changes and outcomes are recorded here.</p>
        </div>
    );
}

/* ---------- the drawer ---------- */
export default function LeadWorkspaceDrawer({ lead, stage, userRole, onClose, onUpdated, onToast, onEditLead, onChatActivity }) {
    const [full, setFull] = useState(null);
    const [conversation, setConversation] = useState(undefined); // undefined = loading, null = no chat
    const [tab, setTab] = useState(null);
    const [loadError, setLoadError] = useState("");

    const [lostOpen, setLostOpen] = useState(false);
    const [lostChoice, setLostChoice] = useState("");
    const [lostNote, setLostNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [lostError, setLostError] = useState("");
    const showChat = canUseWhatsApp();

    const leadId = lead.id;
    const closed = stage === "WON" || stage === "LOST";

    // a stable function, so the chat's refresh timer is not restarted when the board re-renders
    const chatActivityRef = useRef(onChatActivity);
    useEffect(() => {
        chatActivityRef.current = onChatActivity;
    });
    const handleChatActivity = useCallback(() => chatActivityRef.current?.(), []);

    // load the full lead and the chat (a lead can have no chat)
    const loadFull = useCallback(async () => {
        try {
            setFull(await getLeadById(leadId));
        } catch (err) {
            setLoadError(errorText(err, "Could not load this lead."));
        }
    }, [leadId]);

    useEffect(() => {
        let cancelled = false;
        loadFull();
        if (!showChat) {
            setConversation(null);
            return () => { cancelled = true; };
        }
        getConversationForLead(leadId)
            .then((c) => !cancelled && setConversation(c))
            .catch(() => !cancelled && setConversation(null));
        return () => {
            cancelled = true;
        };
    }, [leadId, loadFull, showChat]);

    // first tab: the chat if there is one, otherwise the tab of the current stage
    useEffect(() => {
        if (tab !== null || conversation === undefined) return;
        if (conversation) setTab("chat");
        else if (stage === "PROCUREMENT") setTab("procurement");
        else if (stage === "FOLLOW_UP") setTab("estimation");
        else setTab("details");
    }, [conversation, stage, tab]);

    // when a stage changes (for example procurement is finished), refresh the details
    useEffect(() => {
        loadFull();
    }, [stage, loadFull]);

    const lostText = buildLostReason(lostChoice, lostNote);

    const confirmLost = async () => {
        if (!lostText || busy) return;
        setBusy(true);
        setLostError("");
        try {
            await updateLeadStatus(leadId, "LOST", lostText);
            onToast?.(`${lead.leadNumber || "Lead"} marked as Lost.`, "success");
            onUpdated?.();
            onClose?.();
        } catch (err) {
            setLostError(errorText(err, "Could not mark this lead as Lost."));
        } finally {
            setBusy(false);
        }
    };

    const data = full || lead;
    const name = data.customerName || lead.customerName || "Customer";

    return (
        <div className="lw-root">
            <header className="lw-header">
                <div className="lw-header-main">
                    <div className="lw-eyebrow">LEAD</div>
                    <h2>{lead.leadNumber || `LEAD-${lead.id}`}</h2>
                    <div className="lw-sub">
                        <span>{name}</span>
                        <span className={`lw-stage lw-stage--${String(stage).toLowerCase()}`}>{STAGE_LABEL[stage] || stage}</span>
                    </div>
                </div>
                <div className="lw-header-actions">
                    {!closed && (
                        <button type="button" className="lw-btn lw-btn--lost" onClick={() => { setLostOpen(true); setLostError(""); }}>
                            Lost
                        </button>
                    )}
                    <button type="button" className="lw-close" onClick={onClose} aria-label="Close lead">
                        <X size={18} />
                    </button>
                </div>
            </header>

            <nav className="lw-tabs" role="tablist">
                {TABS.filter((t) => t.key !== "chat" || showChat).map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.key}
                        className={`lw-tab${tab === t.key ? " is-active" : ""}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            <div className="lw-body">
                {loadError && <div className="lw-error">{loadError}</div>}
                {tab === null && <div className="lw-center"><Loader2 className="lw-spin" size={20} /></div>}

                {tab === "chat" && (
                    conversation ? (
                        <div className="lw-chat">
                            <ChatView embedded conversation={conversation} onActivity={handleChatActivity} />
                        </div>
                    ) : (
                        <p className="lw-muted lw-pad">
                            This lead has no WhatsApp chat. Leads from calls, walk-ins, or from before WhatsApp was
                            connected have no chat.
                        </p>
                    )
                )}

                {tab === "details" && <DetailsTab lead={data} status={stage} onEditLead={onEditLead} />}

                {tab === "procurement" && (
                    stage === "NEW" || stage === "PROCUREMENT" ? (
                        <div className="lw-embed">
                            <LeadProcurementDrawer lead={lead} userRole={userRole} onUpdated={onUpdated} onClose={onClose} onToast={onToast} />
                        </div>
                    ) : (
                        <div className="lw-pad">
                            <p className="lw-muted">Procurement is finished for this lead.</p>
                            <ItemsTable items={data.items} showProcurement />
                        </div>
                    )
                )}

                {tab === "estimation" && (
                    stage === "FOLLOW_UP" ? (
                        <div className="lw-embed">
                            <LeadFollowUpDrawer lead={lead} onUpdated={onUpdated} onClose={onClose} onToast={onToast} />
                        </div>
                    ) : closed ? (
                        <EstimationHistory leadId={leadId} />
                    ) : (
                        <p className="lw-muted lw-pad">
                            The estimation and the Won button come after procurement, when the lead is in Follow-up.
                        </p>
                    )
                )}

                {tab === "history" && <HistoryTab lead={data} />}
            </div>

            {lostOpen && (
                <div className="lw-modal-backdrop" onClick={() => !busy && setLostOpen(false)}>
                    <div className="lw-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <h3>Mark this lead as Lost</h3>
                        <p className="lw-muted">A Lost lead is closed and cannot be changed again.</p>
                        <LostReasonPicker
                            choice={lostChoice}
                            note={lostNote}
                            onChoiceChange={setLostChoice}
                            onNoteChange={setLostNote}
                            disabled={busy}
                        />
                        {lostError && <div className="lw-error" role="alert">{lostError}</div>}
                        <div className="lw-modal-actions">
                            <button type="button" className="lw-btn" onClick={() => setLostOpen(false)} disabled={busy}>
                                Cancel
                            </button>
                            <button type="button" className="lw-btn lw-btn--lost-solid" onClick={confirmLost} disabled={busy || !lostText}>
                                {busy ? "Saving..." : "Mark as Lost"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
