import { Check } from "lucide-react";

/**
 * Compact horizontal stage tracker: New → Contacted → In Procurement → Follow Up → Won / Lost.
 * Purely presentational: the parent owns the current stage and decides what a click does.
 *
 * Props
 *  - current:    stage key (NEW | CONTACTED | PROCUREMENT | FOLLOW_UP | WON | LOST)
 *  - onSelect:   (stageKey) => void       one click = one call
 *  - selectable: optional array of keys that may be clicked (default: all)
 *  - disabled:   disables every step
 */
export const PIPELINE_STEPS = [
    { key: "NEW", label: "New" },
    { key: "CONTACTED", label: "Contacted" },
    { key: "PROCUREMENT", label: "In Procurement" },
    { key: "FOLLOW_UP", label: "Follow Up" },
    {
        key: "OUTCOME",
        label: "Won / Lost",
        options: [
            { key: "WON", label: "Won" },
            { key: "LOST", label: "Lost" },
        ],
    },
];

const stepOf = (key) =>
    PIPELINE_STEPS.findIndex(
        (step) => step.key === key || step.options?.some((o) => o.key === key)
    );

export default function LeadPipelineTracker({ current, onSelect, selectable, disabled = false }) {
    const currentIndex = Math.max(stepOf(current), 0);
    const canPick = (key) => !disabled && (!selectable || selectable.includes(key));

    return (
        <ol className="plt" aria-label="Lead pipeline">
            {PIPELINE_STEPS.map((step, index) => {
                const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "todo";

                if (step.options) {
                    return (
                        <li key={step.key} className={`plt-step plt-step--${state}`} aria-current={state === "active" ? "step" : undefined}>
                            <div className="plt-split" role="group" aria-label={step.label}>
                                {step.options.map((option) => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        className={`plt-btn plt-btn--half${current === option.key ? " is-active" : ""}`}
                                        disabled={!canPick(option.key)}
                                        aria-pressed={current === option.key}
                                        onClick={() => onSelect?.(option.key)}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </li>
                    );
                }

                return (
                    <li key={step.key} className={`plt-step plt-step--${state}`} aria-current={state === "active" ? "step" : undefined}>
                        <button
                            type="button"
                            className={`plt-btn${state === "active" ? " is-active" : ""}`}
                            disabled={!canPick(step.key)}
                            onClick={() => onSelect?.(step.key)}
                        >
                            {state === "done" && <Check size={12} aria-hidden="true" />}
                            {step.label}
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}
