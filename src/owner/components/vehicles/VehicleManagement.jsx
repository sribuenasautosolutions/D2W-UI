import { useState } from "react";
import { Upload, Plus } from "lucide-react";

import VehicleMakesSection from "./VehicleMakesSection";
import VehicleModelsSection from "./VehicleModelsSection";
import VehicleGenerationsSection from "./VehicleGenerationsSection";
import VehicleVariantsSection from "./VehicleVariantsSection";
import VehicleBulkUploadSection from "./VehicleBulkUploadSection";
import VehicleQuickAddDrawer from "./VehicleQuickAddDrawer";
import { VehicleToastHost } from "./VehicleToast";
import "./styles/vehicle-management.css";

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
    const [activeTab, setActiveTab] = useState("makes");
    const [addVehicleOpen, setAddVehicleOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

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
                                (activeTab === tab.key ? " is-active" : "")
                            }
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="vm-tabs-divider" />

                <div className="vm-tabs-extra">
                    {UTILITY_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            className={
                                "vm-tab" +
                                (activeTab === tab.key ? " is-active" : "")
                            }
                            onClick={() => setActiveTab(tab.key)}
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
            </div>

            <div key={`${activeTab}-${refreshKey}`} className="vm-tab-content">
                {activeTab === "makes"       && <VehicleMakesSection />}
                {activeTab === "models"      && <VehicleModelsSection />}
                {activeTab === "generations" && <VehicleGenerationsSection />}
                {activeTab === "variants"    && <VehicleVariantsSection />}
                {activeTab === "bulk"        && (
                    <VehicleBulkUploadSection
                        onGoToTab={(key) => setActiveTab(key)}
                    />
                )}
            </div>

            <VehicleQuickAddDrawer
                open={addVehicleOpen}
                onClose={() => setAddVehicleOpen(false)}
                onSaved={() => {
                    setActiveTab("variants");
                    setRefreshKey((k) => k + 1);
                }}
            />

        </div>
    );
}

export default VehicleManagement;