import {
    Pencil,
    Phone,
    UserCircle,
    PackageCheck,
    PhoneCall,
    Calendar,
    Tag,
} from "lucide-react";
import { formatMrp, procurementTotal } from "./procurementUiUtils";
import "./LeadKanbanCard.css";

export default function LeadKanbanCard({
    lead,
    stage,
    onView,
    onEdit,
    onProcurement,
    onMoveToFollowUp,
    onFollowUp,
}) {
    const isNew = stage === "NEW";
    const procurement = stage === "PROCUREMENT";
    const followUp = stage === "FOLLOW_UP";
    const closed = stage === "WON" || stage === "LOST";

    const name =
        lead.customerName || lead.customer?.name || "Customer unavailable";
    const number = lead.leadNumber || `LEAD-${lead.id}`;
    const sourceLabel = String(
        lead.source || lead.sourceName || "Source not recorded"
    ).replaceAll("_", " ");
    const mobile =
        lead.customerPhone ||
        lead.customerMobile ||
        lead.customer?.mobileNumber ||
        lead.customer?.mobile ||
        "Phone not available";
    const salesperson =
        lead.salespersonName ||
        lead.salesperson?.salespersonName ||
        lead.salesperson?.name ||
        "Not assigned";
    const requirement = lead.customerRequirement || "No requirement specified";

    const items = (lead.items || []).filter(
        (item) => item.partNumber?.trim() || item.requirement
    );
    const itemsCount = items.length;
    const totalMrp = procurementTotal(items);

    const nextFollowUpAt =
        lead.nextFollowUpAt ||
        (Array.isArray(lead.followUpActivities) &&
            lead.followUpActivities[0]?.nextFollowUpAt);

    // Stage-specific content (all existing data) renders inside ONE
    // fixed-size details region so every card keeps the same height.
    const showLostReason = lead.status === "LOST";
    const showProcurement = procurement;
    const showFollowUp = followUp && nextFollowUpAt;
    const hasDetails = showLostReason || showProcurement || showFollowUp;

    // ---------- CARD BODY CLICK ----------
    // NEW / WON / LOST → open view drawer (Lead Overview, read-only)
    // PROCUREMENT     → open procurement drawer
    // FOLLOW_UP       → open follow-up drawer
    const handleCardClick = () => {
        if (procurement) onProcurement?.(lead);
        else if (followUp) onFollowUp?.(lead);
        else onView?.(lead);
    };

    // ---------- ACTION BUTTON ----------
    const handleAction = (event) => {
        event.stopPropagation();
        if (isNew) onProcurement?.(lead);
        else if (procurement) onMoveToFollowUp?.(lead);
        else if (followUp) onFollowUp?.(lead);
        else onView?.(lead);
    };

    let actionLabel = "View Lead";
    let ActionIcon = PackageCheck;
    if (isNew) {
        actionLabel = "Proceed to Procurement";
    } else if (procurement) {
        actionLabel = "Move to Follow-up";
        ActionIcon = PhoneCall;
    } else if (followUp) {
        actionLabel = "Follow-up";
        ActionIcon = PhoneCall;
    }

    return (
        <article
            className="d2w-lead-card"
            data-lead-id={lead.id}
            role="button"
            tabIndex={0}
            aria-label={`Open ${number} for ${name}`}
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
            {/* 1 · Lead ID + edit */}
            <header className="d2w-lead-card-top">
                <strong className="d2w-lead-number" title={number}>
                    {number}
                </strong>
                <button
                    type="button"
                    className="d2w-lead-edit"
                    aria-label={`Edit ${number}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(lead);
                    }}
                >
                    <Pencil size={13} />
                </button>
            </header>

            {/* 2 · Customer name (primary) */}
            <div className="d2w-lead-customer">
                <strong title={name}>{name}</strong>
            </div>

            {/* 3 · Lead source + phone */}
            <div className="d2w-lead-info-grid">
                <div className="d2w-lead-info-field">
                    <span className="d2w-lead-info-label">
                        <Tag size={11} aria-hidden="true" /> Lead Source
                    </span>
                    <span className="d2w-lead-info-value" title={sourceLabel}>
                        {sourceLabel}
                    </span>
                </div>
                <div className="d2w-lead-info-field">
                    <span className="d2w-lead-info-label">
                        <Phone size={11} aria-hidden="true" /> Mobile
                    </span>
                    <span className="d2w-lead-info-value" title={mobile}>
                        {mobile}
                    </span>
                </div>
            </div>

            {/* 4 · Requirement (max 2 lines) */}
            <div className="d2w-lead-requirement">
                <span>Requirement</span>
                <p title={requirement}>{requirement}</p>
            </div>

            {/* 5 · Stage-specific details (fixed-size region) */}
            <div
                className={`d2w-lead-details${
                    hasDetails ? "" : " d2w-lead-details--empty"
                }`}
            >
                {showLostReason && (
                    <>
                        <span className="d2w-lead-details-label">
                            Lost Reason
                        </span>
                        <span
                            className="d2w-lead-details-text"
                            title={lead.lostReason?.trim() || undefined}
                        >
                            {lead.lostReason?.trim() || "No reason recorded"}
                        </span>
                    </>
                )}

                {showProcurement && (
                    <>
                        <span className="d2w-lead-details-label">
                            {itemsCount} Procurement Item
                            {itemsCount === 1 ? "" : "s"}
                        </span>
                        <strong className="d2w-lead-details-text">
                            Total MRP: {formatMrp(totalMrp)}
                        </strong>
                    </>
                )}

                {showFollowUp && (
                    <span className="d2w-lead-details-row">
                        <Calendar size={12} aria-hidden="true" />
                        <span className="d2w-lead-details-text">
                            Next: {new Date(nextFollowUpAt).toLocaleDateString()}
                        </span>
                    </span>
                )}
            </div>

            {/* 6 · Salesperson + action */}
            <footer className="d2w-lead-footer">
                <span className="d2w-lead-salesperson" title={salesperson}>
                    <UserCircle size={13} strokeWidth={2} aria-hidden="true" />
                    <span>{salesperson}</span>
                </span>
                {!closed && (
                    <button
                        type="button"
                        className="d2w-lead-action"
                        title={actionLabel}
                        onClick={handleAction}
                    >
                        <ActionIcon size={12} aria-hidden="true" />
                        <span>{actionLabel}</span>
                    </button>
                )}
            </footer>
        </article>
    );
}
