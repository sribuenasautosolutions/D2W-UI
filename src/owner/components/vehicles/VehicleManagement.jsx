import { useState } from "react";
import { ChevronRight, Upload } from "lucide-react";

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
    { key: "makes", label: "Make" },
    { key: "models", label: "Model" },
    { key: "generations", label: "Generation" },
    { key: "variants", label: "Variant" },
    { key: "bulk", label: "Bulk Upload", icon: Upload },
];

// Hierarchy steps are shown as a connected Make → Model → Generation → Variant
// flow (matches the vehicle hierarchy order). Anything after that (Bulk
// Upload) is shown as a plain tab, separated by a divider. Purely visual
// grouping — activeTab/onClick logic below is unchanged.
const HIERARCHY_TABS = TABS.slice(0, 4);
const EXTRA_TABS = TABS.slice(4);

function VehicleManagement() {

    const [activeTab, setActiveTab] = useState("makes");

    return (
        <div className="vm-page">

            <div className="vm-tabs">
                <div className="vm-tabs-flow">
                    {HIERARCHY_TABS.map((tab, index) => (
                        <div key={tab.key} className="vm-tab-flow-group">
                            <button
                                type="button"
                                className={
                                    "vm-tab-flow" +
                                    (activeTab === tab.key ? " is-active" : "")
                                }
                                onClick={() => setActiveTab(tab.key)}
                            >
                                <span>{tab.label}</span>
                            </button>
                            {index < HIERARCHY_TABS.length - 1 && (
                                <span className="vm-tab-arrow"><ChevronRight size={15} /></span>
                            )}
                        </div>
                    ))}
                </div>

                {EXTRA_TABS.length > 0 && <div className="vm-tabs-divider" />}

                <div className="vm-tabs-extra">
                    {EXTRA_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            className={
                                "vm-tab" +
                                (activeTab === tab.key ? " is-active" : "")
                            }
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div key={activeTab} className="vm-tab-content">
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

        </div>
    );
}

export default VehicleManagement;
