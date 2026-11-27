import { lazy, Suspense, useEffect, useState } from "react";
import { Upload, Plus } from "lucide-react";
import { useAuthState } from "../../../auth/AuthContext";

import VehicleMakesSection from "./VehicleMakesSection";
const VehicleModelsSection      = lazy(() => import("./VehicleModelsSection"));
const VehicleGenerationsSection = lazy(() => import("./VehicleGenerationsSection"));
const VehicleVariantsSection    = lazy(() => import("./VehicleVariantsSection"));
const VehicleBulkUploadSection  = lazy(() => import("./VehicleBulkUploadSection"));
const VehicleQuickAddDrawer     = lazy(() => import("./VehicleQuickAddDrawer"));
import { VehicleToastHost } from "./VehicleToast";
import "./styles/vehicle-management.css";

const TAB_PREFETCH = {
    models:      () => import("./VehicleModelsSection"),
    generations: () => import("./VehicleGenerationsSection"),
    variants:    () => import("./VehicleVariantsSection"),
    bulk:        () => import("./VehicleBulkUploadSection"),
};

const PRIMARY_TABS = [
    { key: "makes",       label: "Makes" },
    { key: "models",      label: "Models" },
    { key: "generations", label: "Generations" },
    { key: "variants",    label: "Variants" },
];

const UTILITY_TABS = [
    { key: "bulk", label: "Bulk Upload", icon: Upload },
];

function VehicleManagement() {
    const { hasPermission } = useAuthState();
    const canManageVehicles = hasPermission?.("VEHICLES.MANAGE");
    const [activeTab, setActiveTab] = useState("makes");
    const [addVehicleOpen, setAddVehicleOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Prefetch non-default tab chunks after mount so they're warm when the user clicks
    useEffect(() => {
        const id = typeof requestIdleCallback !== "undefined"
            ? requestIdleCallback(() => {
                import("./VehicleModelsSection");
                import("./VehicleGenerationsSection");
                import("./VehicleVariantsSection");
                import("./VehicleBulkUploadSection");
                import("./VehicleQuickAddDrawer");
            })
            : setTimeout(() => {
                import("./VehicleModelsSection");
                import("./VehicleGenerationsSection");
                import("./VehicleVariantsSection");
                import("./VehicleBulkUploadSection");
                import("./VehicleQuickAddDrawer");
            }, 2000);
        return () => {
            if (typeof requestIdleCallback !== "undefined") cancelIdleCallback(id);
            else clearTimeout(id);
        };
    }, []);

    const currentTab = !canManageVehicles && activeTab === "bulk" ? "makes" : activeTab;

    return (
        <div className="vm-page">

            <VehicleToastHost />

            <div className="vm-tabs">
                <div className="vm-tabs-flow">
                    {PRIMARY_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            className={
                                "vm-tab-flow" +
                                (currentTab === tab.key ? " is-active" : "")
                            }
                            onClick={() => setActiveTab(tab.key)}
                            onMouseEnter={() => TAB_PREFETCH[tab.key]?.()}
                        >
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {canManageVehicles && (
                    <>
                        <div className="vm-tabs-divider" />

                        <div className="vm-tabs-extra">
                            {UTILITY_TABS.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className={
                                        "vm-tab" +
                                        (currentTab === tab.key ? " is-active" : "")
                                    }
                                    onClick={() => setActiveTab(tab.key)}
                                    onMouseEnter={() => TAB_PREFETCH[tab.key]?.()}
                                >
                                    <tab.icon size={15} />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="vm-btn vm-btn-primary vm-tabs-add"
                            onClick={() => setAddVehicleOpen(true)}
                        >
                            <Plus size={16} /> Add Vehicle
                        </button>
                    </>
                )}
            </div>

            <Suspense fallback={<div className="vm-tab-content" style={{ minHeight: 200 }} />}>
            <div key={`${currentTab}-${refreshKey}`} className="vm-tab-content">
                {currentTab === "makes"       && <VehicleMakesSection />}
                {currentTab === "models"      && <VehicleModelsSection />}
                {currentTab === "generations" && <VehicleGenerationsSection />}
                {currentTab === "variants"    && <VehicleVariantsSection />}
                {currentTab === "bulk" && canManageVehicles && (
                    <VehicleBulkUploadSection
                        onGoToTab={(key) => setActiveTab(key)}
                    />
                )}
            </div>
            </Suspense>

            <Suspense fallback={null}>
            <VehicleQuickAddDrawer
                open={addVehicleOpen}
                onClose={() => setAddVehicleOpen(false)}
                onSaved={() => {
                    setActiveTab("variants");
                    setRefreshKey((k) => k + 1);
                }}
            />
            </Suspense>

        </div>
    );
}

export default VehicleManagement;