import React from "react";
import {
    Pencil,
    User,
    Calendar,
    AlertCircle,
    MessageCircle,
} from "lucide-react";
import { formatMrp, procurementTotal } from "./procurementUiUtils";
import "./LeadKanbanCard.css";

const getInitials = (name) => {
    if (!name || typeof name !== "string") return "LD";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
};

export default function LeadKanbanCard({
    lead,
    stage,
    onView,
    onEdit,
    onProcurement,
    onMoveToFollowUp,
    onFollowUp,
    onOpenWorkspace,
    chatLink,
}) {
    const isProcurement = stage === "PROCUREMENT";
    const isFollowUp = stage === "FOLLOW_UP";
    const isLost = stage === "LOST";

    const unread = chatLink?.unreadCount || 0;

    const name =
        lead.customerName ||
        lead.customer?.name ||
        lead.leadNumber ||
        "Unnamed Lead";

    const creatorName =
        lead.createdByName ||
        lead.salespersonName ||
        lead.customerName ||
        "Staff";

    const rawSource =
        lead.source ||
        lead.sourceName ||
        lead.leadSource ||
        lead.leadSourceName ||
        "Other";

    const cleanSource = String(rawSource).replaceAll("_", " ");
    const displaySource =
        cleanSource.charAt(0).toUpperCase() + cleanSource.slice(1).toLowerCase();

    const initials = getInitials(
        lead.salespersonName || lead.customerName || creatorName
    );

    const items = (lead.items || []).filter(
        (item) => item.partNumber?.trim() || item.requirement
    );
    const itemsCount = items.length;
    const totalMrp = procurementTotal(items);

    const nextFollowUpAt =
        lead.nextFollowUpAt ||
        (Array.isArray(lead.followUpActivities) &&
            lead.followUpActivities[0]?.nextFollowUpAt);

    // Card click opens the appropriate workflow drawer
    const handleCardClick = () => {
        if (onOpenWorkspace) {
            onOpenWorkspace(lead);
        } else if (isProcurement) {
            onProcurement?.(lead);
        } else if (isFollowUp) {
            onFollowUp?.(lead);
        } else {
            onView?.(lead);
        }
    };

    return (
        <article
            className="ref-lead-card"
            data-lead-id={lead.id}
            role="button"
            tabIndex={0}
            aria-label={`Open details for ${name}`}
            onClick={handleCardClick}
            onKeyDown={(e) => {
                if (
                    e.target === e.currentTarget &&
                    ["Enter", " "].includes(e.key)
                ) {
                    e.preventDefault();
                    handleCardClick();
                }
            }}
        >
            {/* Top row: Lead ID + Name & Hover Edit */}
            <div className="ref-lead-header">
                <div className="ref-lead-name-wrap">
                    {lead.leadNumber && (
                        <span className="ref-lead-id">{lead.leadNumber}</span>
                    )}
                    <h3 className="ref-lead-name" title={name}>
                        {name}
                    </h3>
                </div>
                <div className="ref-lead-header-actions">
                    {(chatLink || String(lead?.source || "").toUpperCase() === "WHATSAPP") && (
                        <button
                            type="button"
                            className={`d2w-lead-chat${unread > 0 ? " has-unread" : ""}`}
                            title={
                                unread > 0
                                    ? `${unread} unread WhatsApp message${unread === 1 ? "" : "s"} — click to open chat`
                                    : "WhatsApp chat — click to open"
                            }
                            aria-label="Open WhatsApp chat"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenWorkspace) {
                                    onOpenWorkspace(lead, "chat");
                                }
                            }}
                        >
                            <MessageCircle size={12} aria-hidden="true" />
                            {unread > 0 ? unread : ""}
                        </button>
                    )}
                    <button
                        type="button"
                        className="ref-lead-edit-btn"
                        title={`Edit ${name}`}
                        aria-label={`Edit ${name}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(lead);
                        }}
                    >
                        <Pencil size={12} />
                    </button>
                </div>
            </div>

            {/* Subtitle: Added by Creator */}
            <div className="ref-lead-creator">
                <User size={12} className="ref-lead-creator-icon" aria-hidden="true" />
                <span title={`Added by ${creatorName}`}>
                    Added by {creatorName}
                </span>
            </div>

            {/* Stage-specific detail strips */}
            {isProcurement && itemsCount > 0 && (
                <div className="ref-lead-mrp-strip">
                    <span>{itemsCount} Item{itemsCount > 1 ? "s" : ""}</span>
                    <strong>{formatMrp(totalMrp)}</strong>
                </div>
            )}

            {isFollowUp && nextFollowUpAt && (
                <div className="ref-lead-mrp-strip">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={11} /> Next:
                    </span>
                    <strong>{new Date(nextFollowUpAt).toLocaleDateString()}</strong>
                </div>
            )}

            {isLost && lead.lostReason && (
                <div className="ref-lead-lost-strip" title={lead.lostReason}>
                    <AlertCircle size={11} />
                    <span>{lead.lostReason}</span>
                </div>
            )}

            {/* Footer row: Source tag & Initials Avatar */}
            <footer className="ref-lead-footer">
                <span
                    className={`ref-lead-source-tag ref-lead-source-tag--${String(rawSource || "other").toLowerCase()}`}
                    title={`Source: ${displaySource}`}
                >
                    {displaySource}
                </span>
                <span className="ref-lead-avatar" title={lead.salespersonName || creatorName}>
                    {initials}
                </span>
            </footer>
        </article>
    );
}
