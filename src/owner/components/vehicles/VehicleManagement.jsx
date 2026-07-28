import { useState } from "react";

import VehicleMakesSection from "./VehicleMakesSection";
import VehicleModelsSection from "./VehicleModelsSection";
import VehicleGenerationsSection from "./VehicleGenerationsSection";
import VehicleVariantsSection from "./VehicleVariantsSection";
import VehicleBulkUploadSection from "./VehicleBulkUploadSection";
import "./styles/vehicle-management.css";

// Page tabs — these switch the content area only, they are NOT sidebar
// routes. No routing change: this whole page still lives at whatever
// route your router already points at the vehicles module (e.g. /owner/vehicles).
const TABS = [
    { key: "makes", label: "Makes", icon: "🚗" },
    { key: "models", label: "Models", icon: "🚙" },
    { key: "generations", label: "Generations", icon: "📅" },
    { key: "variants", label: "Variants", icon: "🏷" },
    { key: "bulk", label: "Bulk Upload", icon: "📤" },
];

function VehicleManagement() {

    const [activeTab, setActiveTab] = useState("makes");

    return (
        <div className="vm-page">

            <div className="vm-breadcrumb">
                <span>Dashboard</span>
                <span>›</span>
                <span className="vm-crumb-current">Vehicle Management</span>
            </div>

            <div className="vm-header">
                <div>
                    <h1 className="vm-header-title">
                        🚗 Vehicle Management
                    </h1>
                    <p className="vm-header-sub">
                        Manage Vehicle Master Data — Vehicle Hierarchy
                    </p>
                </div>

                <span className="vm-header-badge">
                    Make → Model → Generation → Variant
                </span>
            </div>

            <div className="vm-tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        className={
                            "vm-tab" +
                            (activeTab === tab.key ? " is-active" : "")
                        }
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {activeTab === "makes" && <VehicleMakesSection />}
            {activeTab === "models" && <VehicleModelsSection />}
            {activeTab === "generations" && <VehicleGenerationsSection />}
            {activeTab === "variants" && <VehicleVariantsSection />}
            {activeTab === "bulk" && (
                <VehicleBulkUploadSection
                    onGoToTab={(key) => setActiveTab(key)}
                />
            )}

        </div>
    );
}

export default VehicleManagement;
