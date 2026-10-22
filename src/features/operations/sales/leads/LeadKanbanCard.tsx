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
    lead.source || lead.sourceName || "Source not recorded",
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
    (item) => item.partNumber?.trim() || item.requirement,
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
      className="grid w-full min-w-0 cursor-pointer rounded-lg border border-gray-200 bg-white text-gray-900 transition-colors duration-150 hover:border-slate-400 focus-visible:border-slate-400 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(37,99,235,0.25)] [&>*]:min-w-0 [&>*]:min-h-0 [&>*]:overflow-hidden"
      style={{
        gridTemplateColumns: "minmax(0, 1fr)",
        gridTemplateRows: "24px 22px 38px 56px 42px 36px",
        rowGap: "6px",
        padding: "12px 14px",
      }}
      data-lead-id={lead.id}
      role="button"
      tabIndex={0}
      aria-label={`Open ${number} for ${name}`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && ["Enter", " "].includes(e.key)) {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* 1 · Lead ID + edit */}
      <header className="flex items-center justify-between gap-2">
        <strong
          className="min-w-0 overflow-hidden text-slate-500 text-[11.5px] font-bold tabular-nums truncate"
          title={number}
        >
          {number}
        </strong>
        <button
          type="button"
          className="inline-flex items-center justify-center flex-none w-6 h-6 p-0 border border-gray-200 rounded-md bg-white text-slate-600 cursor-pointer transition-all duration-150 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
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
      <div className="flex items-center">
        <strong
          className="min-w-0 overflow-hidden text-slate-900 text-sm font-bold leading-tight truncate"
          title={name}
        >
          {name}
        </strong>
      </div>

      {/* 3 · Lead source + phone */}
      <div className="grid grid-cols-2 gap-x-3 content-end pt-2 border-t border-slate-100">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="flex items-center gap-1 h-3 overflow-hidden text-slate-400 text-[9.5px] font-bold tracking-wider leading-3 uppercase whitespace-nowrap">
            <Tag size={11} aria-hidden="true" /> Lead Source
          </span>
          <span
            className="block overflow-hidden text-slate-700 text-xs font-semibold tabular-nums leading-4 truncate"
            title={sourceLabel}
          >
            {sourceLabel}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="flex items-center gap-1 h-3 overflow-hidden text-slate-400 text-[9.5px] font-bold tracking-wider leading-3 uppercase whitespace-nowrap">
            <Phone size={11} aria-hidden="true" /> Mobile
          </span>
          <span
            className="block overflow-hidden text-slate-700 text-xs font-semibold tabular-nums leading-4 truncate"
            title={mobile}
          >
            {mobile}
          </span>
        </div>
      </div>

      {/* 4 · Requirement (max 2 lines) */}
      <div className="flex flex-col gap-0.5 pt-2 border-t border-slate-100">
        <span className="flex-none text-slate-400 text-[9.5px] font-bold tracking-wider leading-3 uppercase">
          Requirement
        </span>
        <p
          className="m-0 line-clamp-2 overflow-hidden text-slate-700 text-xs leading-[17px] break-anywhere whitespace-pre-line"
          title={requirement}
        >
          {requirement}
        </p>
      </div>

      {/* 5 · Stage-specific details (fixed-size region) */}
      <div
        className={
          hasDetails
            ? "flex flex-col justify-center gap-0.5 px-2.5 border border-gray-200 rounded-md bg-slate-50"
            : "flex flex-col justify-center gap-0.5 px-2.5 border border-transparent bg-transparent rounded-md"
        }
      >
        {showLostReason && (
          <>
            <span className="overflow-hidden text-slate-500 text-[11px] font-semibold leading-[15px] truncate">
              Lost Reason
            </span>
            <span
              className="min-w-0 overflow-hidden text-slate-900 text-xs font-bold leading-4 truncate"
              title={lead.lostReason?.trim() || undefined}
            >
              {lead.lostReason?.trim() || "No reason recorded"}
            </span>
          </>
        )}

        {showProcurement && (
          <>
            <span className="overflow-hidden text-slate-500 text-[11px] font-semibold leading-[15px] truncate">
              {itemsCount} Procurement Item
              {itemsCount === 1 ? "" : "s"}
            </span>
            <strong className="min-w-0 overflow-hidden text-slate-900 text-xs font-bold leading-4 truncate">
              Total MRP: {formatMrp(totalMrp)}
            </strong>
          </>
        )}

        {showFollowUp && (
          <span className="flex items-center gap-1.5 min-w-0 text-slate-600">
            <Calendar size={12} aria-hidden="true" />
            <span className="min-w-0 overflow-hidden text-slate-900 text-xs font-bold leading-4 truncate">
              Next: {new Date(nextFollowUpAt).toLocaleDateString()}
            </span>
          </span>
        )}
      </div>

      {/* 6 · Salesperson + action */}
      <footer className="flex items-end justify-between gap-2 pt-2 border-t border-slate-100">
        <span
          className="inline-flex items-center flex-1 gap-[5px] min-w-0 h-7 text-slate-500 text-[11.5px] font-semibold"
          title={salesperson}
        >
          <UserCircle size={13} strokeWidth={2} aria-hidden="true" />
          <span className="min-w-0 overflow-hidden truncate">
            {salesperson}
          </span>
        </span>
        {!closed && (
          <button
            type="button"
            className="inline-flex items-center justify-center flex-[0_1_auto] gap-[5px] min-w-0 max-w-[62%] h-7 px-2.5 border border-blue-200 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold cursor-pointer transition-all duration-150 hover:border-blue-300 hover:bg-blue-100"
            title={actionLabel}
            onClick={handleAction}
          >
            <ActionIcon size={12} aria-hidden="true" />
            <span className="min-w-0 overflow-hidden truncate">
              {actionLabel}
            </span>
          </button>
        )}
      </footer>
    </article>
  );
}
