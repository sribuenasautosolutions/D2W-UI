import { useEffect, useState } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Boxes,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

import PendingApprovalSection from "./PendingApprovalSection";
import Review from "./Review";
import ProductSection from "./ProductSection";
import MergeSection from "./MergeSection";

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

  const removeToast = (id) => setToasts((c) => c.filter((t) => t.id !== id));

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
    const canMerge = !!reviewData?.canMerge;

    if (canMerge && !canCreate) {
      return [{ id: "merge", label: "Merge Product", num: "01" }];
    }

    if (canCreate && !canMerge) {
      return [{ id: "create", label: "Create Product", num: "01" }];
    }

    if (canCreate && canMerge) {
      return [
        { id: "create", label: "Create Product", num: "01" },
        { id: "merge", label: "Merge Product", num: "02" },
      ];
    }

    return [];
  })();

  const isStepUnlocked = (id) => {
    switch (id) {
      case "create":
        return !!reviewData?.canCreate;
      case "merge":
        return !!reviewData?.canMerge;
      default:
        return false;
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

  const handleWorkflowComplete = (
    message = "Product approved and added to catalogue.",
  ) => {
    closeDrawer();
    setRefreshSignal((c) => c + 1);
    pushToast(message, "success");
  };

  return (
    <div className="min-h-screen h-screen overflow-y-auto overflow-x-hidden m-0 p-0 w-full bg-white text-gray-800">
      {/* NAVBAR */}
      <header className="sticky top-0 z-30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 h-auto md:h-[60px] px-5 py-3 md:py-0 bg-white border-b border-gray-200">
        <nav
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 whitespace-nowrap flex-shrink-0"
          aria-label="Breadcrumb"
        >
          <Boxes size={16} className="text-blue-700 flex-shrink-0" />
          <span>Product Management</span>
          <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
          <span className="text-blue-700 font-extrabold">Product Approval</span>
        </nav>

        <div className="inline-flex items-center gap-2 justify-end flex-shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-80 h-[38px] px-4 bg-slate-100 border border-transparent rounded-full transition-colors duration-150 focus-within:bg-white focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-700/20">
            <Search size={15} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search pending products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-0 h-full border-0 outline-none bg-transparent text-[13.5px] text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <button
            type="button"
            className="relative inline-flex items-center justify-center w-[38px] h-[38px] bg-transparent border border-transparent rounded-full text-slate-600 cursor-pointer transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2.5 w-[7px] h-[7px] bg-red-500 border-[1.5px] border-white rounded-full" />
          </button>

          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-2 h-[38px] pl-1 pr-3 bg-transparent border border-transparent rounded-full cursor-pointer transition-colors duration-150 hover:bg-slate-100"
              onClick={() => setProfileOpen((v) => !v)}
              aria-expanded={profileOpen}
            >
              <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-900 to-blue-600 rounded-full text-white text-[11.5px] font-extrabold">
                {initials}
              </span>
              <span className="hidden md:inline text-[13px] font-semibold text-slate-900 whitespace-nowrap max-w-[180px] truncate">
                {displayName}
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-500 transition-transform duration-150 ${profileOpen ? "rotate-180" : ""}`}
              />
            </button>

            {profileOpen && (
              <div className="absolute top-[calc(100%+8px)] right-0 min-w-[180px] p-2 bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col gap-0.5 z-50">
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-transparent border-0 rounded-md text-gray-700 text-[13px] font-semibold text-left cursor-pointer transition-colors duration-150 hover:bg-slate-100"
                >
                  My profile
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-transparent border-0 rounded-md text-gray-700 text-[13px] font-semibold text-left cursor-pointer transition-colors duration-150 hover:bg-slate-100"
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-transparent border-0 rounded-md text-red-600 text-[13px] font-semibold text-left cursor-pointer transition-colors duration-150 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SECTION */}
      <div className="p-5 max-w-[1600px] mx-auto">
        <PendingApprovalSection
          selectedApproval={selectedApproval}
          setSelectedApproval={setSelectedApproval}
          refreshSignal={refreshSignal}
          query={searchQuery}
        />
      </div>

      {/* WORKFLOW DRAWER */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px]"
          onClick={closeDrawer}
        >
          <aside
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[540px] md:w-[620px] max-w-full bg-white border-l border-gray-200 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0">
              <div>
                <div className="text-blue-700 text-[10px] font-extrabold tracking-wider uppercase mb-0.5">
                  Product Approval Workflow
                </div>
                <h2 className="text-base font-extrabold tracking-tight text-slate-900 m-0">
                  {selectedApproval?.productName || "Review Submission"}
                </h2>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center w-[30px] h-[30px] p-0 bg-white border border-gray-300 rounded-md text-gray-700 text-sm font-bold cursor-pointer transition-colors hover:bg-red-50 hover:border-red-500 hover:text-red-600"
                onClick={closeDrawer}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Stepper */}
            <div className="flex gap-2 px-5 py-2.5 border-b border-gray-100 bg-gray-50 flex-shrink-0 overflow-x-auto">
              {visibleSteps.map((step, index) => {
                const isActive = activeStep === step.id;
                const isComplete =
                  visibleSteps.findIndex((s) => s.id === activeStep) > index;
                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!isStepUnlocked(step.id)}
                    className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-[12.5px] font-semibold cursor-pointer transition-all duration-150 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive
                        ? "bg-blue-700 border border-blue-700 text-white shadow-sm"
                        : isComplete
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                          : "bg-white border border-gray-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                    }`}
                    onClick={() => goToStep(step.id)}
                  >
                    <span
                      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-extrabold tabular-nums ${
                        isActive ? "bg-white/20 text-white" : "bg-black/5"
                      }`}
                    >
                      {step.num}
                    </span>
                    <span className="whitespace-nowrap">{step.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 bg-white">
              {/* Headless Review */}
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
                      `${selectedApproval?.productName || "Product"} approved and added to catalogue.`,
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
                      `${selectedApproval?.productName || "Product"} merged successfully.`,
                    )
                  }
                  onToast={pushToast}
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                className="inline-flex items-center justify-center h-[34px] px-4 bg-white text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors hover:bg-gray-100 hover:border-gray-400"
                onClick={closeDrawer}
              >
                Cancel
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* TOAST STACK */}
      <div
        className="fixed top-6 right-6 z-[2000] flex flex-col gap-2 max-w-[min(360px,calc(100vw-32px))] pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 p-3 rounded-lg text-xs font-semibold shadow-lg pointer-events-auto ${
              t.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
            role="status"
          >
            {t.type === "success" ? (
              <CheckCircle2
                size={16}
                className="text-emerald-600 flex-shrink-0"
              />
            ) : (
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            )}
            <span className="flex-1 min-w-0 break-words">{t.message}</span>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss"
              className="flex-shrink-0 p-0.5 rounded text-inherit opacity-75 hover:opacity-100 hover:bg-black/5"
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
