import { useState } from "react";
import { StickyNote, Phone, Mail, MessageCircle } from "lucide-react";

/**
 * Interaction log: quick type tags, a compact note box and a chronological timeline.
 * Entries are owned by the parent so system / stage-change lines can be added automatically.
 *
 * Props
 *  - entries:  [{ id, type, text, at }] newest first. Types: Note | Call | Email | WhatsApp | Status | System
 *  - onAdd:    (type, text) => void
 *  - disabled: disables the composer
 */
const TYPES = [
  { key: "Note", Icon: StickyNote },
  { key: "Call", Icon: Phone },
  { key: "Email", Icon: Mail },
  { key: "WhatsApp", Icon: MessageCircle },
];

function formatStamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityLogStream({
  entries = [],
  onAdd,
  disabled = false,
}) {
  const [type, setType] = useState("Note");
  const [text, setText] = useState("");

  const submit = () => {
    const clean = text.trim();
    if (!clean || disabled) return;
    onAdd?.(type, clean);
    setText("");
  };

  return (
    <section className="als">
      <div className="als-head">
        <span className="als-title">Activity &amp; Notes</span>
        <span className="als-count">{entries.length}</span>
      </div>

      <div className="als-composer">
        <div
          className="als-tags"
          role="radiogroup"
          aria-label="Interaction type"
        >
          {TYPES.map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={type === key}
              className={`als-tag als-tag--${key.toLowerCase()}${type === key ? " is-active" : ""}`}
              onClick={() => setType(key)}
            >
              <Icon size={12} aria-hidden="true" />
              {key}
            </button>
          ))}
        </div>
        <div className="als-input-row">
          <textarea
            className="als-input"
            rows={1}
            value={text}
            disabled={disabled}
            aria-label="Activity note"
            placeholder={`Log a ${type.toLowerCase()}…`}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button
            type="button"
            className="als-add"
            onClick={submit}
            disabled={disabled || !text.trim()}
          >
            Add Note
          </button>
        </div>
        <span className="als-hint">
          Saved to lead history. Ctrl + Enter to add.
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="als-empty">No activity yet.</div>
      ) : (
        <ol className="als-timeline">
          {entries.map((entry) => {
            const kind = String(entry.type).toLowerCase();
            return (
              <li key={entry.id} className="als-item">
                <span className={`als-dot als-dot--${kind}`} />
                <div className="als-body">
                  <div className="als-meta">
                    <span className={`als-badge als-badge--${kind}`}>
                      {entry.type}
                    </span>
                    <time>{formatStamp(entry.at)}</time>
                  </div>
                  <p>{entry.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
