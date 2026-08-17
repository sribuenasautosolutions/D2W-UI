/*
 * VehicleDrawer — shared presentational shell for the "add record" panels
 * used across Makes / Models / Generations / Variants.
 *
 * This component holds NO business logic, NO state tied to any entity,
 * and makes NO API calls. It only renders whatever is passed to it via
 * props/children. Each *Section.jsx keeps 100% of its existing state,
 * handlers and API calls — this just gives them a consistent chrome.
 */
import { CarFront, X } from "lucide-react";

function VehicleDrawer({
    open,
    onClose,
    icon = "🚗",
    title,
    description,
    footer,
    children,
    size = "medium",
}) {

    return (
        <>
            <div
                className={"vm-drawer-overlay" + (open ? " is-open" : "")}
                onClick={onClose}
            />

            <div className={`vm-drawer vm-drawer--${size}${open ? " is-open" : ""}`}>

                <div className="vm-drawer-header">
                    <div className="vm-drawer-icon">
                        {typeof icon === "object" ? icon : <CarFront size={21} />}
                    </div>
                    <div>
                        <h3 className="vm-drawer-title">{title}</h3>
                        {description && (
                            <p className="vm-drawer-desc">{description}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        className="vm-drawer-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="vm-drawer-body">
                    {children}
                </div>

                {footer && (
                    <div className="vm-drawer-footer">
                        {footer}
                    </div>
                )}

            </div>
        </>
    );
}

export default VehicleDrawer;
