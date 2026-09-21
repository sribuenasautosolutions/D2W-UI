import { useEffect, useState, useRef } from "react";

import PendingApprovalSection from "../../owner/components/productreqest/PendingApprovalSection";
import Review from "../../owner/components/productreqest/Review";
import ProductSection from "../../owner/components/productreqest/ProductSection";
import MergeSection from "../../owner/components/productreqest/MergeSection";
import "../../owner/components/productreqest/styles/product-approval-page.css";
import "../../owner/components/productreqest/styles/product-approval.css";

// Steps shown inside the workflow modal only. "Pending Approvals" is no
// longer a step — it's the page underneath the modal.
const STEPS = [
    {
        id: "review",
        label: "Review Product",
        num: "01",
    },
    {
        id: "product",
        label: "Create Product",
        num: "02",
    },
    {
        id: "merge",
        label: "Merge Product",
        num: "03",
    },
];

function ProductApprovalPage() {
    
    const pageStartTime = useRef(performance.now());

    useEffect(() => {
        requestAnimationFrame(() => {
            console.log(
                "Product Approval page painted:",
                (performance.now() - pageStartTime.current).toFixed(2),
                "ms"
            );
        });
    }, []);

    // Which workflow step is currently visible INSIDE the modal.
    const [activeStep, setActiveStep] = useState("review");

    // Selected row from Pending Approval table. The modal is open
    // whenever this is non-null — closing the modal clears it.
    const [selectedApproval, setSelectedApproval] = useState(null);

    // Full response from GET /local-products/{approvalRequestId}
    const [reviewData, setReviewData] = useState(null);

    // Bumped after a successful Approve/Merge so the Pending Products
    // table reloads once the modal closes. UI-only, no business logic.
    const [refreshSignal, setRefreshSignal] = useState(0);

    const isModalOpen = !!selectedApproval;

    // Clicking "View" in Pending Approvals sets selectedApproval — when that
    // happens, (re)open the modal on the Review step.
    useEffect(() => {

        if (selectedApproval) {

            setActiveStep("review");

        }

    }, [selectedApproval]);
    

    // Once the review comes back and a duplicate exists, merging is
    // required — auto-activate the Merge step instead of Create.
    useEffect(() => {

        if (reviewData?.canMerge) {

            setActiveStep("merge");

        }

    }, [reviewData]);




    // Steps can only be reached once their prerequisite data exists, so the
    // stepper stays disabled instead of showing an empty/broken section.
    const isStepUnlocked = (id) => {

        switch (id) {

            case "review":
                return !!selectedApproval;

            case "product":
                return !!reviewData;

            case "merge":
                return !!reviewData;

            default:
                return false;

        }

    };

    const goToStep = (id) => {

        if (!isStepUnlocked(id)) {

            return;

        }

        setActiveStep(id);

    };

    // Closes the modal and resets the workflow so the next "View" click
    // starts clean on Review.
    const closeModal = () => {

        setSelectedApproval(null);
        setReviewData(null);
        setActiveStep("review");

    };

    // Called after a successful Approve (or Merge) — closes the popup and
    // refreshes the Pending Products list, per the required workflow.
    const handleWorkflowComplete = () => {

        closeModal();
        setRefreshSignal((count) => count + 1);

    };

console.log("Review Data in ProductApprovalPage:", reviewData);
    return (

        <div className="vc-app">

            <div className="vc-page-shell">

                <main className="vc-main vc-main-full">

                    <div className="vc-topbar">

                        <div className="vc-crumb">

                            Product Management

                        </div>

                        <h1 className="vc-h1">

                            Product Approval

                        </h1>

                    </div>

                    {/* Dashboard cards + search + Pending Products table ONLY */}

                    <div
                        id="pending"
                        className="vc-section"
                        data-section-id="pending"
                    >

                        <PendingApprovalSection
                            selectedApproval={selectedApproval}
                            setSelectedApproval={setSelectedApproval}
                            refreshSignal={refreshSignal}
                        />

                    </div>

                </main>

            </div>

            {/* ===================== Workflow Modal ===================== */}

            {
                isModalOpen &&

                (

                    <div
                        className="pa-modal-overlay"
                        onMouseDown={(e) => {

                            if (e.target === e.currentTarget) {

                                closeModal();

                            }

                        }}
                    >

                        <div className="pa-modal" role="dialog" aria-modal="true">

                            <div className="pa-modal-header">

                                <div className="pa-modal-heading">

                                    <div className="pa-modal-eyebrow">
                                        Product Approval Workflow
                                    </div>

                                    <h2 className="pa-modal-title">
                                        {
                                            selectedApproval?.productName ||
                                            "Review Submission"
                                        }
                                    </h2>

                                </div>

                                <button
                                    className="pa-modal-close"
                                    onClick={closeModal}
                                    aria-label="Close"
                                >
                                    ✕
                                </button>

                            </div>

                            <div className="pa-modal-steps">

                                {
                                    STEPS.map((step, index) => (

                                        <button
                                            key={step.id}
                                            type="button"
                                            disabled={!isStepUnlocked(step.id)}
                                            className={
                                                "pa-modal-step" +
                                                (activeStep === step.id
                                                    ? " is-active"
                                                    : "") +
                                                (STEPS.findIndex((s) => s.id === activeStep) > index
                                                    ? " is-complete"
                                                    : "")
                                            }
                                            onClick={() => goToStep(step.id)}
                                        >

                                            <span className="pa-modal-step-num">
                                                {step.num}
                                            </span>

                                            <span className="pa-modal-step-label">
                                                {step.label}
                                            </span>

                                        </button>

                                    ))
                                }

                            </div>

                            <div className="pa-modal-body">

                                {
                                    activeStep === "review" &&

                                    (

                                        <Review
                                            selectedApproval={selectedApproval}
                                            reviewData={reviewData}
                                            setReviewData={setReviewData}
                                            onNext={() => setActiveStep("product")}
                                        />

                                    )
                                }

                                {
                                    activeStep === "product" &&

                                    (

                                        <ProductSection
                                            reviewData={reviewData}
                                            selectedApproval={selectedApproval}
                                            onApproved={handleWorkflowComplete}
                                        />

                                    )
                                }

                                {
                                    activeStep === "merge" &&

                                    (

                                        <MergeSection
                                            reviewData={reviewData}
                                        />

                                    )
                                }

                            </div>

                            <div className="pa-modal-footer">

                                <div className="pa-modal-footer-left">

                                    {
                                        activeStep !== "review" &&

                                        (

                                            <button
                                                className="vm-btn vm-btn-secondary"
                                                onClick={() => setActiveStep("review")}
                                            >
                                                ← Previous
                                            </button>

                                        )
                                    }

                                </div>

                                <div className="pa-modal-footer-right">

                                    <button
                                        className="vm-btn vm-btn-ghost"
                                        onClick={closeModal}
                                    >
                                        Cancel
                                    </button>

                                    {
                                        activeStep === "merge" &&

                                        (

                                            <button
                                                className="vm-btn vm-btn-primary"
                                                onClick={() => {

                                                    alert(
                                                        "Merge workflow is not yet available."
                                                    );

                                                }}
                                            >
                                                Merge Product
                                            </button>

                                        )
                                    }

                                </div>

                            </div>

                        </div>

                    </div>

                )
            }

        </div>

    );

}

export default ProductApprovalPage;
