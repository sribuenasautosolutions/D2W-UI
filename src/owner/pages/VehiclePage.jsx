import { useState } from "react";

import VehicleMakesSection
from "../../owner/components/vehicles/VehicleMakesSection";

import VehicleModelsSection
from "../../owner/components/vehicles/VehicleModelsSection";

import VehicleGenerationsSection
from "../../owner/components/vehicles/VehicleGenerationsSection";

import VehicleVariantsSection
from "../../owner/components/vehicles/VehicleVariantsSection";
import VehicleBulkUploadSection from "../components/vehicles/VehicleBulkUploadSection";

function VehiclePage() {

    const [activeTab,
        setActiveTab] =
            useState("makes");

    return (

        <div>

            <h1
                style={{
                    marginBottom: "20px"
                }}
            >
                Vehicle Management
            </h1>

            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "20px",
                    marginBottom: "20px",
                    flexWrap: "wrap"
                }}
            >

                <button
                    onClick={() =>
                        setActiveTab("makes")
                    }
                    style={{
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        background:
                            activeTab === "makes"
                                ? "#2563eb"
                                : "#f3f4f6",
                        color:
                            activeTab === "makes"
                                ? "white"
                                : "#111827"
                    }}
                >
                    Makes
                </button>

                <button
                    onClick={() =>
                        setActiveTab("models")
                    }
                    style={{
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        background:
                            activeTab === "models"
                                ? "#2563eb"
                                : "#f3f4f6",
                        color:
                            activeTab === "models"
                                ? "white"
                                : "#111827"
                    }}
                >
                    Models
                </button>

                <button
                    onClick={() =>
                        setActiveTab("generations")
                    }
                    style={{
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        background:
                            activeTab === "generations"
                                ? "#2563eb"
                                : "#f3f4f6",
                        color:
                            activeTab === "generations"
                                ? "white"
                                : "#111827"
                    }}
                >
                    Generations
                </button>

                <button
                    onClick={() =>
                        setActiveTab("variants")
                    }
                    style={{
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        background:
                            activeTab === "variants"
                                ? "#2563eb"
                                : "#f3f4f6",
                        color:
                            activeTab === "variants"
                                ? "white"
                                : "#111827"
                    }}
                >
                    Variants
                </button>
                <button
    onClick={() =>
        setActiveTab("bulk")
    }
    style={{
        padding: "10px 20px",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
        background:
            activeTab === "bulk"
                ? "#2563eb"
                : "#f3f4f6",
        color:
            activeTab === "bulk"
                ? "white"
                : "#111827"
    }}
>
    Bulk Upload
</button>

            </div>

            <div
                style={{
                    background: "white",
                    padding: "20px",
                    borderRadius: "10px",
                    boxShadow:
                        "0 2px 8px rgba(0,0,0,0.08)"
                }}
            >

                {
                    activeTab === "makes" &&
                    <VehicleMakesSection />
                }

                {
                    activeTab === "models" &&
                    <VehicleModelsSection />
                }

                {
                    activeTab === "generations" &&
                    <VehicleGenerationsSection />
                }

                {
                    activeTab === "variants" &&
                    <VehicleVariantsSection />
                }
                {
    activeTab === "bulk" &&
    <VehicleBulkUploadSection />
}

            </div>

        </div>
    );
}

export default VehiclePage;