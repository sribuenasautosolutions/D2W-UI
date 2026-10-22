import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

// Tiny event bus — call showToast() from anywhere, no provider needed.
const listeners = new Set<(toast: any) => void>();

export function showToast(text: any, type = "success", duration = 3500) {
  const id = `${Date.now()}-${Math.random()}`;
  listeners.forEach((fn) => fn({ id, text, type, duration }));
}

export function VehicleToastHost() {
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const handler = (toast: any) => {
      setToasts((prev) => [...prev, toast]);
      if (toast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, toast.duration);
      }
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="vm-toast-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`vm-toast vm-toast-${t.type}`}>
          <span className="vm-toast-icon">
            {t.type === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
          </span>
          <span className="vm-toast-text">{t.text}</span>
          <button
            className="vm-toast-close"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
