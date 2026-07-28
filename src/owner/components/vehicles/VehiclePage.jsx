import { useEffect, useRef, useState } from "react";

import VehicleMakesSection
from "../../owner/components/vehicles/VehicleMakesSection";

import VehicleModelsSection
from "../../owner/components/vehicles/VehicleModelsSection";

import VehicleGenerationsSection
from "../../owner/components/vehicles/VehicleGenerationsSection";

import VehicleVariantsSection
from "../../owner/components/vehicles/VehicleVariantsSection";

import VehicleBulkUploadSection from "../components/vehicles/VehicleBulkUploadSection";

import "./styles/vehicle-management.css";
import "./styles/VehiclePage.css";

// Order matters: it's the real Make -> Model -> Generation -> Variant hierarchy,
// so the sidebar numbers it like steps, not a decorative list.
const SECTIONS = [
    { id: "makes", label: "Makes", num: "01" },
    { id: "models", label: "Models", num: "02" },
    { id: "generations", label: "Generations", num: "03" },
    { id: "variants", label: "Variants", num: "04" },
    { id: "bulk", label: "Bulk Upload", num: "05" },
];

function VehiclePage() {

    const [activeSection, setActiveSection] = useState("makes");
    const sectionRefs = useRef({});

    // Scroll-spy: highlight whichever section is currently in view, instead of
    // forcing the user to click a tab (and lose whatever they'd typed elsewhere).
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.dataset.sectionId);
                    }
                });
            },
            { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
        );

        Object.values(sectionRefs.current).forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = (id) => {
        sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div className="vc-app">
            <div className="vc-shell">

                <aside className="vc-sidebar">
                    <div className="vc-brand">
                        <div className="vc-brand-mark">VC</div>
                        <div className="vc-brand-text">
                            <strong>Vehicle Catalog</strong>
                            <span>Master data console</span>
                        </div>
                    </div>

                    <div className="vc-nav-label">Catalog hierarchy</div>

                    {SECTIONS.map((section) => (
                        <button
                            key={section.id}
                            className={
                                "vc-nav-item" +
                                (activeSection === section.id ? " is-active" : "")
                            }
                            onClick={() => scrollToSection(section.id)}
                        >
                            <span className="vc-nav-num">{section.num}</span>
                            {section.label}
                        </button>
                    ))}

                    <div className="vc-sidebar-footer">
                        All sections stay loaded — jump between them without
                        losing anything you've typed.
                    </div>
                </aside>

                <main className="vc-main">

                    <div className="vc-topbar">
                        <div className="vc-crumb">Vehicle Management</div>
                        <h1 className="vc-h1">Vehicle Catalog</h1>
                    </div>

                    <div
                        id="makes"
                        className="vc-section"
                        data-section-id="makes"
                        ref={(el) => (sectionRefs.current.makes = el)}
                    >
                        <VehicleMakesSection />
                    </div>

                    <div
                        id="models"
                        className="vc-section"
                        data-section-id="models"
                        ref={(el) => (sectionRefs.current.models = el)}
                    >
                        <VehicleModelsSection />
                    </div>

                    <div
                        id="generations"
                        className="vc-section"
                        data-section-id="generations"
                        ref={(el) => (sectionRefs.current.generations = el)}
                    >
                        <VehicleGenerationsSection />
                    </div>

                    <div
                        id="variants"
                        className="vc-section"
                        data-section-id="variants"
                        ref={(el) => (sectionRefs.current.variants = el)}
                    >
                        <VehicleVariantsSection />
                    </div>

                    <div
                        id="bulk"
                        className="vc-section"
                        data-section-id="bulk"
                        ref={(el) => (sectionRefs.current.bulk = el)}
                    >
                        <VehicleBulkUploadSection />
                    </div>

                </main>
            </div>
        </div>
    );
}

export default VehiclePage;
