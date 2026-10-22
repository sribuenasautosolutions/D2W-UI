import VehicleManagementStyles from "./VehicleManagementStyles";
import { useEffect, useRef, useState } from "react";

import VehicleMakesSection from "./VehicleMakesSection";
import VehicleModelsSection from "./VehicleModelsSection";
import VehicleGenerationsSection from "./VehicleGenerationsSection";
import VehicleVariantsSection from "./VehicleVariantsSection";
import VehicleBulkUploadSection from "./VehicleBulkUploadSection";

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
  const sectionRefs = useRef<Record<string, any>>({});

  // Scroll-spy: highlight whichever section is currently in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(
              (entry.target as HTMLElement).dataset.sectionId || "",
            );
          }
        });
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el as HTMLElement);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id) => {
    sectionRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex flex-1 overflow-hidden scroll-smooth">
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col p-4 gap-2 flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
          <div className="flex items-center gap-3 pb-4 mb-2 border-b border-gray-100">
            <div className="w-9 h-9 bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center rounded-lg shadow-sm">
              VC
            </div>
            <div className="flex flex-col">
              <strong className="text-sm font-bold text-gray-900 leading-tight">
                Vehicle Catalog
              </strong>
              <span className="text-xs text-gray-500">Master data console</span>
            </div>
          </div>

          <div className="text-[11px] font-bold tracking-wider uppercase text-gray-400 px-2 mt-2">
            Catalog hierarchy
          </div>

          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left w-full cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-bold hover:bg-blue-100/60"
                    : "text-gray-600 hover:bg-slate-50 hover:text-gray-900"
                }`}
                onClick={() => scrollToSection(section.id)}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums ${
                    isActive
                      ? "bg-blue-200/60 text-blue-800"
                      : "bg-black/5 text-gray-600"
                  }`}
                >
                  {section.num}
                </span>
                <span>{section.label}</span>
              </button>
            );
          })}

          <div className="mt-auto pt-4 border-t border-gray-100 text-[11.5px] text-gray-400 leading-relaxed px-2">
            All sections stay loaded — jump between them without losing anything
            you've typed.
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          <VehicleManagementStyles />
          <div className="flex flex-col gap-1 mb-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Vehicle Management
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Vehicle Catalog
            </h1>
          </div>

          <div
            id="makes"
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs scroll-mt-6"
            data-section-id="makes"
            ref={(el) => {
              sectionRefs.current.makes = el;
            }}
          >
            <VehicleMakesSection />
          </div>

          <div
            id="models"
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs scroll-mt-6"
            data-section-id="models"
            ref={(el) => {
              sectionRefs.current.models = el;
            }}
          >
            <VehicleModelsSection />
          </div>

          <div
            id="generations"
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs scroll-mt-6"
            data-section-id="generations"
            ref={(el) => {
              sectionRefs.current.generations = el;
            }}
          >
            <VehicleGenerationsSection />
          </div>

          <div
            id="variants"
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs scroll-mt-6"
            data-section-id="variants"
            ref={(el) => {
              sectionRefs.current.variants = el;
            }}
          >
            <VehicleVariantsSection />
          </div>

          <div
            id="bulk"
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs scroll-mt-6"
            data-section-id="bulk"
            ref={(el) => {
              sectionRefs.current.bulk = el;
            }}
          >
            <VehicleBulkUploadSection />
          </div>
        </main>
      </div>
    </div>
  );
}

export default VehiclePage;
