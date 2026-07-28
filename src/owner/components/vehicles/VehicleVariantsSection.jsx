import { useState, useEffect } from "react";
import api from "../../../services/api";
import VehicleDrawer from "./VehicleDrawer";
import VehicleStatCard from "./VehicleStatCard";
import "./styles/vehicle-management.css";
import "./styles/VehicleVariantsSection.css";

// fixed vocab lists — kept at module level so they don't re-create on every render
const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "LPG"];
const TRANSMISSIONS = ["Manual", "Automatic", "AMT", "CVT", "DCT", "iMT"];
const DOOR_OPTIONS = [2, 3, 4, 5];
const EMISSION_STANDARDS = ["BS3", "BS4", "BS6 Phase 1", "BS6 Phase 2", "Euro 5", "Euro 6"];
const REGIONS = ["India", "Global", "Europe", "Middle East", "USA"];

// year bounds for the start/end year number inputs
const MIN_YEAR = 1900;
const MAX_YEAR = 2099;

// pagination
const PAGE_SIZE = 10;

function VehicleVariantsSection() {

    // ===== ORIGINAL STATE — unchanged =====
    // cascading selection state
    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [generations, setGenerations] = useState([]);
    const [selectedMakeId, setSelectedMakeId] = useState("");
    const [selectedModelId, setSelectedModelId] = useState("");
    const [selectedGenerationId, setSelectedGenerationId] = useState("");

    // variant form fields
    const [variantName, setVariantName] = useState("");
    const [variantStartYear, setVariantStartYear] = useState("");
    const [varaintEndYear, setVaraintEndYear] = useState("");
    const [doors, setDoors] = useState("");
    const [engineType, setEngineType] = useState("");
    const [engineCode, setEngineCode] = useState("");
    const [enginecapacity, setEnginecapacity] = useState("");
    const [emssionStandard, setEmssionStandard] = useState("");
    const [fuelType, setFuelType] = useState("");
    const [transmission, setTransmission] = useState("");
    const [chassisCode, setChassisCode] = useState("");
    const [vinprefix, setVinprefix] = useState("");
    const [region, setRegion] = useState("");

    const [variants, setVariants] = useState([]);
    const [message, setMessage] = useState(null); // { type, text }

    // ===== NEW UI-ONLY STATE =====
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // ===== ORIGINAL HANDLERS — unchanged =====
    const loadMakes = async () => {
        try {
            const response = await api.get("/vehicle-makes");
            setMakes(response.data.data);
        } catch (error) {
            console.log(error);
        }
    };

    const loadModelsByMake = async (makeId) => {
        setModels([]);
        setGenerations([]);
        setSelectedModelId("");
        setSelectedGenerationId("");
        if (!makeId) return;
        try {
            const response = await api.get(`/vehicle-models/by-make/${makeId}`);
            setModels(response.data.data);
        } catch (error) {
            console.log(error);
        }
    };

    const loadGenerationsByModel = async (modelId) => {
        setGenerations([]);
        setSelectedGenerationId("");
        if (!modelId) return;
        try {
            const response = await api.get(`/vehicle-generations/by-model/${modelId}`);
            setGenerations(response.data.data);
        } catch (error) {
            console.log(error);
        }
    };

    // NEW — loads every variant, same role as loadAllModels() on the Models page.
    const loadAllVariants = async () => {
        try {
            const response = await api.get("/vehicle-variants");
            setVariants(response.data.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    // UPDATED — now behaves like loadModels(makeId): falls back to "load everything"
    // when no generation is selected, instead of clearing the table.
    const loadVariantsByGeneration = async (generationId) => {
        try {
            if (!generationId) {
                loadAllVariants();
                return;
            }
            const response = await api.get(`/vehicle-variants/by-generation/${generationId}`);
            setVariants(response.data.data);
        } catch (error) {
            console.error(error);
        }
    };

    const saveVariant = async () => {

        if (!selectedGenerationId) {
            setMessage({ type: "error", text: "Please select Make → Model → Generation" });
            return;
        }
        if (!variantName.trim()) {
            setMessage({ type: "error", text: "Variant name is required" });
            return;
        }
        if (!variantStartYear) {
            setMessage({ type: "error", text: "Variant start year is required" });
            return;
        }
        if (!varaintEndYear) {
            setMessage({ type: "error", text: "Variant end year is required" });
            return;
        }
        if (Number(variantStartYear) > Number(varaintEndYear)) {
            setMessage({ type: "error", text: "Start year cannot be greater than end year" });
            return;
        }
        if (!fuelType) {
            setMessage({ type: "error", text: "Please select fuel type" });
            return;
        }
        if (!transmission) {
            setMessage({ type: "error", text: "Please select transmission" });
            return;
        }
        if (!enginecapacity.trim()) {
            setMessage({ type: "error", text: "Engine capacity is required" });
            return;
        }
        if (!region) {
            setMessage({ type: "error", text: "Please select region" });
            return;
        }

        try {
            const response = await api.post("/vehicle-variants", {
                variantName: variantName,
                variantStartYear: variantStartYear,
                varaintEndYear: varaintEndYear,
                doors: doors || null,
                engineType: engineType,
                engineCode: engineCode || null,
                enginecapacity: enginecapacity,
                emssionStandard: emssionStandard,
                fuelType: fuelType,
                transmission: transmission,
                chassisCode: chassisCode,
                vinprefix: vinprefix,
                region: region,
                vehicleGeneration: { id: selectedGenerationId }
            });

            setMessage({ type: "success", text: response.data.message });

            // reset variant-specific fields only — keep Make/Model/Generation
            // selected so the user can add another variant to the same generation
            setVariantName("");
            setVariantStartYear("");
            setVaraintEndYear("");
            setDoors("");
            setEngineType("");
            setEngineCode("");
            setEnginecapacity("");
            setEmssionStandard("");
            setFuelType("");
            setTransmission("");
            setChassisCode("");
            setVinprefix("");
            setRegion("");

            // refresh whatever is currently being viewed (a specific
            // generation, or the full list) so the new row shows up either way
            loadVariantsByGeneration(selectedGenerationId);

        } catch (error) {
            console.log(error);
            const backendMessage =
                error.response?.data?.errors?.join(", ") ||
                error.response?.data?.message ||
                "Error saving variant";
            setMessage({ type: "error", text: backendMessage });
        }
    };

    useEffect(() => {
        loadMakes();
        loadAllVariants();
    }, []);

    // ===== UI-ONLY HELPERS =====
    const filteredVariants = variants.filter((v) =>
        (v.variantName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.fuelType || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.transmission || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const electrifiedCount = variants.filter((v) => v.fuelType === "Electric" || v.fuelType === "Hybrid").length;

    // pagination derived from the filtered list
    const totalPages = Math.max(1, Math.ceil(filteredVariants.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedVariants = filteredVariants.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    );

    // reset to page 1 whenever the underlying list or search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedGenerationId, variants.length]);

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    const exportCsv = () => {
        const rows = [
            ["Variant", "Fuel", "Transmission", "Start Year", "End Year"],
            ...variants.map((v) => [v.variantName, v.fuelType, v.transmission, v.variantStartYear, v.varaintEndYear]),
        ];
        const csv = rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "vehicle-variants.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>

            <div className="vm-stats-row">
                <VehicleStatCard label="Total variants" value={variants.length} icon="🏷" tone="blue" />
                <VehicleStatCard label="Matching search" value={filteredVariants.length} icon="🔎" tone="green" />
                <VehicleStatCard label="Electric / Hybrid" value={electrifiedCount} icon="⚡" tone="amber" />
                <VehicleStatCard label="Hierarchy level" value="4 of 4" icon="🧭" tone="gray" />
            </div>

            <div className="vm-action-bar">
                <div className="vm-search-wrap">
                    <span className="vm-search-icon">🔍</span>
                    <input
                        className="vm-search-input"
                        placeholder="Search variants…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="vm-action-buttons">
                    <button className="vm-btn vm-btn-secondary" onClick={exportCsv}>
                        ⬇ Export
                    </button>
                    <button
                        className="vm-btn vm-btn-primary"
                        onClick={() => {
                            setMessage(null);
                            setIsDrawerOpen(true);
                        }}
                    >
                        + Add Variant
                    </button>
                </div>
            </div>

            <div className="vm-panel" style={{ marginBottom: 16, padding: "16px 18px" }}>
                <div className="vm-grid-3">
                    <div className="vm-field">
                        <label className="vm-label">
                            Make
                        </label>
                        <select
                            className="vm-select"
                            value={selectedMakeId}
                            onChange={(e) => {
                                setSelectedMakeId(e.target.value);
                                loadModelsByMake(e.target.value);
                                loadVariantsByGeneration(""); // clearing make -> show all variants again
                            }}
                        >
                            <option value="">All makes</option>
                            {makes.map((make) => (
                                <option key={make.id} value={make.id}>{make.makeName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Model
                        </label>
                        <select
                            className="vm-select"
                            value={selectedModelId}
                            disabled={!selectedMakeId}
                            onChange={(e) => {
                                setSelectedModelId(e.target.value);
                                loadGenerationsByModel(e.target.value);
                                loadVariantsByGeneration(""); // clearing model -> show all variants again
                            }}
                        >
                            <option value="">All models</option>
                            {models.map((model) => (
                                <option key={model.id} value={model.id}>{model.modelName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Generation
                        </label>
                        <select
                            className="vm-select"
                            value={selectedGenerationId}
                            disabled={!selectedModelId}
                            onChange={(e) => {
                                setSelectedGenerationId(e.target.value);
                                loadVariantsByGeneration(e.target.value);
                            }}
                        >
                            <option value="">All generations</option>
                            {generations.map((gen) => (
                                <option key={gen.id} value={gen.id}>
                                    {gen.generationName} ({gen.gproductionStartYear}–{gen.gproductionEndYear})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {message && !isDrawerOpen && (
                <div className={`vm-alert vm-alert-${message.type}`}>
                    <span className="vm-alert-icon"><span>{message.type === "success" ? "✓" : "!"}</span></span>
                    <span>{message.text}</span>
                </div>
            )}

            <div className="vm-panel">
                {filteredVariants.length === 0 ? (
                    <div className="vm-empty">
                        <div className="vm-empty-icon">🏷</div>
                        <div className="vm-empty-title">No variants found</div>
                        <div>
                            {variants.length === 0
                                ? "Add your first variant to get started."
                                : "Try a different search or hierarchy filter."}
                        </div>
                    </div>
                ) : (
                    <div className="vm-table-scroll">
                        <table className="vm-table">
                            <thead>
                                <tr>
                                    <th>Make / Model / Generation</th>
                                    <th>Variant</th>
                                    <th>Fuel / Transmission</th>
                                    <th>Engine</th>
                                    <th>Years</th>
                                    <th>Region</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedVariants.map((variant) => (
                                    <tr key={variant.id}>
                                        <td>
                                            <span className="vm-chip-trail">
                                                <span className="vm-chip">
                                                         {variant.makeName}
                                                </span>
                                                <span className="vm-chip-sep">→</span>
                                                <span>{variant.modelName}</span>
                                                <span className="vm-chip-sep">→</span>
                                                <span>{variant.generationName}</span>
                                            </span>
                                        </td>
                                        <td className="vm-cell-strong">{variant.variantName}</td>
                                        <td>
                                            <span className="vm-badge vm-badge-blue">{variant.fuelType}</span>
                                            {" "}
                                            <span className="vm-badge vm-badge-gray">{variant.transmission}</span>
                                        </td>
                                        <td className="vm-cell-mono">
                                            {variant.engineCode || "—"}
                                            {variant.enginecapacity ? ` · ${variant.enginecapacity}` : ""}
                                        </td>
                                        <td className="vm-cell-mono">
                                            {variant.variantStartYear}
                                            {variant.varaintEndYear ? `–${variant.varaintEndYear}` : "–present"}
                                        </td>
                                        <td>{variant.region}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="vm-table-footer">
                    <span>
                        {filteredVariants.length === 0
                            ? "0 of 0 variants"
                            : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredVariants.length)} of ${filteredVariants.length} variants`}
                    </span>

                    {totalPages > 1 && (
                        <div className="vm-pagination">
                            <button
                                className="vm-btn vm-btn-secondary"
                                onClick={() => goToPage(safePage - 1)}
                                disabled={safePage === 1}
                            >
                                ‹ Prev
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    className={`vm-btn ${page === safePage ? "vm-btn-primary" : "vm-btn-secondary"}`}
                                    onClick={() => goToPage(page)}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                className="vm-btn vm-btn-secondary"
                                onClick={() => goToPage(safePage + 1)}
                                disabled={safePage === totalPages}
                            >
                                Next ›
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <VehicleDrawer
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                icon="🏷"
                title="Add New Variant"
                description="The most specific record — trim, engine, and spec within a generation."
                footer={
                    <>
                        <button className="vm-btn vm-btn-secondary" onClick={() => setIsDrawerOpen(false)}>
                            Cancel
                        </button>
                        <button className="vm-btn vm-btn-primary" onClick={saveVariant}>
                            Save Variant
                        </button>
                    </>
                }
            >
                {message && (
                    <div className={`vm-alert vm-alert-${message.type}`}>
                        <span className="vm-alert-icon"><span>{message.type === "success" ? "✓" : "!"}</span></span>
                        <span>{message.text}</span>
                    </div>
                )}

                <div className="vm-divider">Vehicle hierarchy</div>

                <div className="vm-grid-1" style={{ marginTop: 12, marginBottom: 8 }}>

                    <div className="vm-field">
                        <label className="vm-label">
                            Make <span className="vm-req">*</span>
                        </label>
                        <select
                            className="vm-select"
                            value={selectedMakeId}
                            onChange={(e) => {
                                setSelectedMakeId(e.target.value);
                                loadModelsByMake(e.target.value);
                            }}
                        >
                            <option value="">Select make</option>
                            {makes.map((make) => (
                                <option key={make.id} value={make.id}>{make.makeName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Model <span className="vm-req">*</span>
                        </label>
                        <select
                            className="vm-select"
                            value={selectedModelId}
                            disabled={!selectedMakeId}
                            onChange={(e) => {
                                setSelectedModelId(e.target.value);
                                loadGenerationsByModel(e.target.value);
                            }}
                        >
                            <option value="">Select model</option>
                            {models.map((model) => (
                                <option key={model.id} value={model.id}>{model.modelName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Generation <span className="vm-req">*</span>
                        </label>
                        <select
                            className="vm-select"
                            value={selectedGenerationId}
                            disabled={!selectedModelId}
                            onChange={(e) => {
                                setSelectedGenerationId(e.target.value);
                                loadVariantsByGeneration(e.target.value);
                            }}
                        >
                            <option value="">Select generation</option>
                            {generations.map((gen) => (
                                <option key={gen.id} value={gen.id}>
                                    {gen.generationName} ({gen.gproductionStartYear}–{gen.gproductionEndYear})
                                </option>
                            ))}
                        </select>
                    </div>

                </div>

                <div className="vm-divider">Variant details</div>

                <div className="vm-grid-1" style={{ marginTop: 12 }}>

                    <div className="vm-field">
                        <label className="vm-label">
                            Variant name <span className="vm-req">*</span>
                        </label>
                        <input
                            type="text"
                            className="vm-input"
                            placeholder="e.g. ZXI+ AMT"
                            value={variantName}
                            onChange={(e) => setVariantName(e.target.value)}
                        />
                    </div>

                    <div className="vm-grid-2">
                        <div className="vm-field">
                            <label className="vm-label">Doors</label>
                            <select className="vm-select" value={doors} onChange={(e) => setDoors(e.target.value)}>
                                <option value="">Select</option>
                                {DOOR_OPTIONS.map((d) => (
                                    <option key={d} value={d}>{d} doors</option>
                                ))}
                            </select>
                        </div>

                        <div className="vm-field">
                            <label className="vm-label">
                                Start year <span className="vm-req">*</span>
                            </label>
                            <input
                                type="number"
                                className="vm-input vm-mono"
                                placeholder="e.g. 2021"
                                min={MIN_YEAR}
                                max={MAX_YEAR}
                                step="1"
                                value={variantStartYear}
                                onChange={(e) => setVariantStartYear(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="vm-grid-2">
                        <div className="vm-field">
                            <label className="vm-label">
                                End year <span className="vm-req">*</span>
                            </label>
                            <input
                                type="number"
                                className="vm-input vm-mono"
                                placeholder="e.g. 2024"
                                min={MIN_YEAR}
                                max={MAX_YEAR}
                                step="1"
                                value={varaintEndYear}
                                onChange={(e) => setVaraintEndYear(e.target.value)}
                            />
                        </div>

                        <div className="vm-field">
                            <label className="vm-label">
                                Fuel type <span className="vm-req">*</span>
                            </label>
                            <select className="vm-select" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                                <option value="">Select</option>
                                {FUEL_TYPES.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="vm-grid-2">
                        <div className="vm-field">
                            <label className="vm-label">
                                Transmission <span className="vm-req">*</span>
                            </label>
                            <select className="vm-select" value={transmission} onChange={(e) => setTransmission(e.target.value)}>
                                <option value="">Select</option>
                                {TRANSMISSIONS.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="vm-field">
                            <label className="vm-label">Engine type</label>
                            <input
                                type="text"
                                className="vm-input"
                                placeholder="e.g. K-Series"
                                value={engineType}
                                onChange={(e) => setEngineType(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="vm-grid-2">
                        <div className="vm-field">
                            <label className="vm-label">Engine code</label>
                            <input
                                type="text"
                                className="vm-input vm-mono"
                                placeholder="e.g. K12N (optional)"
                                value={engineCode}
                                onChange={(e) => setEngineCode(e.target.value)}
                            />
                        </div>

                        <div className="vm-field">
                            <label className="vm-label">
                                Engine capacity <span className="vm-req">*</span>
                            </label>
                            <input
                                type="text"
                                className="vm-input vm-mono"
                                placeholder="e.g. 1197cc"
                                value={enginecapacity}
                                onChange={(e) => setEnginecapacity(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="vm-grid-2">
                        <div className="vm-field">
                            <label className="vm-label">Emission standard</label>
                            <select className="vm-select" value={emssionStandard} onChange={(e) => setEmssionStandard(e.target.value)}>
                                <option value="">Select</option>
                                {EMISSION_STANDARDS.map((e) => (
                                    <option key={e} value={e}>{e}</option>
                                ))}
                            </select>
                        </div>

                        <div className="vm-field">
                            <label className="vm-label">Chassis code</label>
                            <input
                                type="text"
                                className="vm-input vm-mono"
                                placeholder="Optional"
                                value={chassisCode}
                                onChange={(e) => setChassisCode(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="vm-grid-2">
                        <div className="vm-field">
                            <label className="vm-label">VIN prefix</label>
                            <input
                                type="text"
                                className="vm-input vm-mono"
                                placeholder="e.g. MA3EJKD1S"
                                value={vinprefix}
                                onChange={(e) => setVinprefix(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Region <span className="vm-req">*</span>
                        </label>
                        <select className="vm-select" value={region} onChange={(e) => setRegion(e.target.value)}>
                            <option value="">Select</option>
                            {REGIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                </div>
            </VehicleDrawer>

        </div>
    );
}

export default VehicleVariantsSection;
