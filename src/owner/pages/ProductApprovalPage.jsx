import { useEffect, useState } from "react";
import {
    Search, Bell, ChevronDown, ChevronRight, Boxes,
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
    console.log("[ProductApprovalPage] searchQuery:", searchQuery);
    const [profileOpen, setProfileOpen] = useState(false);

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
        if (reviewData?.canMerge && !reviewData?.canCreate) {
            return [{ id: "merge", label: "Merge Product", num: "01" }];
        }
        return [
            { id: "create", label: "Create Product", num: "01" },
            { id: "merge",  label: "Merge Product",  num: "02" },
        ];
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

    /* After Approve → refetch review so Merge appears */
    const handleApproved = () => {
        setReviewData(null);
    };

    /* After Merge → close drawer + refresh list */
    const handleWorkflowComplete = () => {
        closeDrawer();
        setRefreshSignal((c) => c + 1);
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
                            onChange={(e) => {
                                console.log("🟢 INPUT FIRED:", e.target.value);
                                setSearchQuery(e.target.value);
                            }}
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
                                    onApproved={handleApproved}
                                />
                            )}

                            {activeStep === "merge" && reviewData?.canMerge && (
                                <MergeSection
                                    reviewData={reviewData}
                                    selectedApproval={selectedApproval}
                                    onMerged={handleWorkflowComplete}
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
        </div>
    );
}

export default ProductApprovalPage;