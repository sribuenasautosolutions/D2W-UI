import { LOST_NOTE_MAX, LOST_REASONS } from "./leadLostReasons";
import "./LeadWorkspace.css";

// Reason list for "Lost". "Other" asks for a short note.
export default function LostReasonPicker({ choice, note, onChoiceChange, onNoteChange, disabled = false }) {
    return (
        <div className="lw-reason">
            <label className="lw-field">
                <span>Why was this lead lost?</span>
                <select value={choice} disabled={disabled} onChange={(e) => onChoiceChange(e.target.value)}>
                    <option value="">Select a reason</option>
                    {LOST_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
            </label>
            {choice === "OTHER" && (
                <label className="lw-field">
                    <span>Short note (required)</span>
                    <input
                        type="text"
                        maxLength={LOST_NOTE_MAX}
                        value={note}
                        disabled={disabled}
                        onChange={(e) => onNoteChange(e.target.value)}
                        placeholder="Write the reason"
                    />
                </label>
            )}
        </div>
    );
}
