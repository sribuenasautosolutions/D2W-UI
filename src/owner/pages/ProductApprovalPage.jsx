import { useEffect, useState } from "react";
import {
    Search, Bell, ChevronDown, ChevronRight, Boxes,
    CheckCircle2, AlertCircle, X,
} from "lucide-react";

import PendingApprovalSection from "../../owner/components/productreqest/PendingApprovalSection";
import Review from "../../owner/components/productreqest/Review";
import ProductSection from "../../owner/components/productreqest/ProductSection";
import MergeSection from "../../owner/components/productreqest/MergeSection";
import "../../owner/components/productreqest/styles/product-approval-page.css";
import "../../owner/components/productreqest/styles/product-approval.css";

const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
};

function ProductApprovalPage() {
    const [activeStep, setActiveStep] = useState("create");
    const [selectedApproval, setSelectedApproval] = useState(null);
    const [reviewData, setReviewData] = useState(null);
    const [refreshSignal, setRefreshSignal] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [profileOpen, setProfileOpen] = useState(false);

    /* ================= TOASTS ================= */
    const [toasts, setToasts] = useState([]);

    const pushToast = (message, type = "success") => {
        const id = Date.now() + Math.random();
        setToasts((c) => [...c, { id, message, type }]);
        setTimeout(() => {
            setToasts((c) => c.filter((t) => t.id !== id));
        }, 3200);
    };

    const removeToast = (id) =>
        setToasts((c) => c.filter((t) => t.id !== id));

    const isDrawerOpen = !!selectedApproval;

    const user = readUser();
    const displayName = user?.name || "Super Admin";
    const initials =
        displayName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0].toUpperCase())
            .join("") || "SA";

    /* Auto-route to the correct step once review data arrives */
    useEffect(() => {
        if (!reviewData) return;

        if (reviewData.canMerge) {
            setActiveStep("merge");
            return;
        }
        if (reviewData.canCreate) {
            setActiveStep("create");
        }
    }, [reviewData]);

    /* Visible steps depend on what the backend allows */
    const visibleSteps = (() => {
    const canCreate = !!reviewData?.canCreate;
    const canMerge  = !!reviewData?.canMerge;

    // Only merge is possible → show only Merge as step 01
    if (canMerge && !canCreate) {
        return [{ id: "merge", label: "Merge Product", num: "01" }];
    }

    // Only create is possible → show only Create as step 01
    if (canCreate && !canMerge) {
        return [{ id: "create", label: "Create Product", num: "01" }];
    }

    // Both possible (rare) → show both in workflow order
    if (canCreate && canMerge) {
        return [
            { id: "create", label: "Create Product", num: "01" },
            { id: "merge",  label: "Merge Product",  num: "02" },
        ];
    }

    // Neither — still loading reviewData → show nothing
    return [];
})();

    const isStepUnlocked = (id) => {
        switch (id) {
            case "create": return !!reviewData?.canCreate;
            case "merge":  return !!reviewData?.canMerge;
            default:       return false;
        }
    };

    const goToStep = (id) => {
        if (!isStepUnlocked(id)) return;
        setActiveStep(id);
    };

    const closeDrawer = () => {
        setSelectedApproval(null);
        setReviewData(null);
        setActiveStep("create");
    };

    /* ================= WORKFLOW COMPLETE =================
       Used by BOTH Create and Merge paths.
       - closes the drawer
       - bumps refreshSignal → PendingApprovalSection refetches
         (the approved item disappears from the queue, the new
         product appears in the global catalogue on next load)
       - fires a success toast
    ===================================================== */
    const handleWorkflowComplete = (message = "Product approved and added to catalogue.") => {
        closeDrawer();
        setRefreshSignal((c) => c + 1);
        pushToast(message, "success");
    };

    return (
        <div className="pa-page">
            {/* ==============================
                NAVBAR
                ============================== */}
            <header className="pa-navbar">
                <nav className="pa-breadcrumb" aria-label="Breadcrumb">
                    <Boxes size={16} className="pa-breadcrumb-icon" />
                    <span>Product Management</span>
                    <ChevronRight size={16} className="pa-breadcrumb-sep" />
                    <span className="pa-breadcrumb-active">Product Approval</span>
                </nav>

                <div className="pa-navbar-right">
                    <div className="pa-navbar-search">
                        <Search size={15} />
                        <input
                            type="text"
                            placeholder="Search pending products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <button
                        type="button"
                        className="pa-navbar-bell"
                        aria-label="Notifications"
                    >
                        <Bell size={18} />
                        <span className="pa-navbar-bell-dot" />
                    </button>

                    <div className="pa-navbar-profile-wrap">
                        <button
                            type="button"
                            className="pa-navbar-profile"
                            onClick={() => setProfileOpen((v) => !v)}
                            aria-expanded={profileOpen}
                        >
                            <span className="pa-navbar-profile-initials">{initials}</span>
                            <span className="pa-navbar-profile-name">{displayName}</span>
                            <ChevronDown
                                size={14}
                                className={`pa-navbar-profile-chev${profileOpen ? " is-open" : ""}`}
                            />
                        </button>

                        {profileOpen && (
                            <div className="pa-navbar-dropdown">
                                <button type="button">My profile</button>
                                <button type="button">Settings</button>
                                <button type="button" className="is-danger">Sign out</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ==============================
                SECTION
                ============================== */}
            <div className="pa-section">
                <PendingApprovalSection
                    selectedApproval={selectedApproval}
                    setSelectedApproval={setSelectedApproval}
                    refreshSignal={refreshSignal}
                    query={searchQuery}
                />
            </div>

            {/* ==============================
                WORKFLOW DRAWER
                ============================== */}
            {isDrawerOpen && (
                <div className="pa-drawer-backdrop" onClick={closeDrawer}>
                    <aside
                        className="pa-drawer"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Header */}
                        <div className="pa-drawer-header">
                            <div>
                                <div className="pa-drawer-eyebrow">
                                    Product Approval Workflow
                                </div>
                                <h2 className="pa-drawer-title">
                                    {selectedApproval?.productName || "Review Submission"}
                                </h2>
                            </div>
                            <button
                                type="button"
                                className="pa-drawer-close"
                                onClick={closeDrawer}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Stepper */}
                        <div className="pa-drawer-steps">
                            {visibleSteps.map((step, index) => (
                                <button
                                    key={step.id}
                                    type="button"
                                    disabled={!isStepUnlocked(step.id)}
                                    className={
                                        "pa-drawer-step" +
                                        (activeStep === step.id ? " is-active" : "") +
                                        (visibleSteps.findIndex((s) => s.id === activeStep) > index
                                            ? " is-complete"
                                            : "")
                                    }
                                    onClick={() => goToStep(step.id)}
                                >
                                    <span className="pa-drawer-step-num">{step.num}</span>
                                    <span className="pa-drawer-step-label">{step.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Body */}
                        <div className="pa-drawer-body">
                            {/* Headless Review — fetches reviewData, renders nothing */}
                            <Review
                                selectedApproval={selectedApproval}
                                reviewData={reviewData}
                                setReviewData={setReviewData}
                                onNext={() => goToStep("create")}
                                hidden
                            />

                            {activeStep === "create" && reviewData?.canCreate && (
                                <ProductSection
                                    reviewData={reviewData}
                                    selectedApproval={selectedApproval}
                                    onApproved={() =>
                                        handleWorkflowComplete(
                                            `${selectedApproval?.productName || "Product"} approved and added to catalogue.`
                                        )
                                    }
                                    onToast={pushToast}
                                />
                            )}

                            {activeStep === "merge" && reviewData?.canMerge && (
                                <MergeSection
                                    reviewData={reviewData}
                                    selectedApproval={selectedApproval}
                                    onMerged={() =>
                                        handleWorkflowComplete(
                                            `${selectedApproval?.productName || "Product"} merged successfully.`
                                        )
                                    }
                                    onToast={pushToast}
                                />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="pa-drawer-footer">
                            <button
                                type="button"
                                className="pa-btn-ghost"
                                onClick={closeDrawer}
                            >
                                Cancel
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* ==============================
                TOAST STACK
                ============================== */}
            <div className="pa-toast-stack" aria-live="polite">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pa-toast pa-toast--${t.type}`}
                        role="status"
                    >
                        {t.type === "success" ? (
                            <CheckCircle2 size={16} />
                        ) : (
                            <AlertCircle size={16} />
                        )}
                        <span>{t.message}</span>
                        <button
                            type="button"
                            onClick={() => removeToast(t.id)}
                            aria-label="Dismiss"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ProductApprovalPage;