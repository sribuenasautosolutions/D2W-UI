import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function VehicleDrawer({
  open,
  size = "medium",
  onClose,
  icon,
  title,
  description,
  footer,
  children,
  eyebrow,
  variant = "default",
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sizeClass =
    size === "wide"
      ? "vm-drawer--wide"
      : size === "medium"
      ? "vm-drawer--medium"
      : "";

  const isCompact = variant === "compact";

  const drawerContent = (
    <>
      <div
        className={`vm-drawer-overlay${open ? " is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={
          "vm-drawer" +
          (isCompact ? " vm-drawer--compact" : "") +
          (sizeClass ? " " + sizeClass : "") +
          (open ? " is-open" : "")
        }
        role="dialog"
        aria-modal="true"
      >
        <div className="vm-drawer-header">
          {!isCompact && icon && <div className="vm-drawer-icon">{icon}</div>}

          <div className="vm-drawer-header-content">
            {isCompact && eyebrow && (
              <div className="vm-drawer-eyebrow">{eyebrow}</div>
            )}
            <h2 className="vm-drawer-title">{title}</h2>
            {description && <p className="vm-drawer-desc">{description}</p>}
          </div>

          {isCompact ? (
            <button
              type="button"
              className="vm-drawer-close-pill"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={14} />
              <span>Close</span>
            </button>
          ) : (
            <button
              type="button"
              className="vm-drawer-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="vm-drawer-body">{children}</div>

        {footer && <div className="vm-drawer-footer">{footer}</div>}
      </div>
    </>
  );

  // React Portal — mounts at document.body, escapes every ancestor transform.
  if (typeof document === "undefined") return null;
  return createPortal(drawerContent, document.body);
}

export default VehicleDrawer;