import { useState, useEffect } from "react";
import { Download, Filter, Plus, Search, Tags } from "lucide-react";
import api from "../../../services/api";
import VehicleDrawer from "./VehicleDrawer";
import VehicleStatCard from "./VehicleStatCard";
import { showToast } from "./VehicleToast";
import "./styles/vehicle-management.css";

const getGenerationStartYear = (generation) =>
    generation.productionStartYear ?? generation.gproductionStartYear;

const getGenerationEndYear = (generation) =>
    generation.productionEndYear ?? generation.gproductionEndYear;

const getVariantEndYear = (variant) =>
    variant.variantEndYear ?? variant.varaintEndYear;

const getEngineCapacity = (variant) =>
    variant.engineCapacity ?? variant.enginecapacity;

const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "LPG"];
const TRANSMISSIONS = ["Manual", "Automatic", "AMT", "CVT", "DCT", "iMT"];
const DOOR_OPTIONS = [2, 3, 4, 5];
const EMISSION_STANDARDS = ["BS3", "BS4", "BS6 Phase 1", "BS6 Phase 2", "Euro 5", "Euro 6"];
const REGIONS = ["India", "Global", "Europe", "Middle East", "USA"];

const MIN_YEAR = 1900;
const MAX_YEAR = 2099;

const PAGE_SIZE = 10;

function VehicleVariantsSection() {

    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [generations, setGenerations] = useState([]);
    const [selectedMakeId, setSelectedMakeId] = useState("");
    const [selectedModelId, setSelectedModelId] = useState("");
    const [selectedGenerationId, setSelectedGenerationId] = useState("");

    const [variantName, setVariantName] = useState("");
    const [variantStartYear, setVariantStartYear] = useState("");
    const [variantEndYear, setVariantEndYear] = useState("");
    const [doors, setDoors] = useState("");
    const [engineType, setEngineType] = useState("");
    const [engineCode, setEngineCode] = useState("");
    const [engineCapacity, setEngineCapacity] = useState("");
    const [emissionStandard, setEmissionStandard] = useState("");
    const [fuelType, setFuelType] = useState("");
    const [transmission, setTransmission] = useState("");
    const [chassisCode, setChassisCode] = useState("");
    const [vinPrefix, setVinPrefix] = useState("");
    const [region, setRegion] = useState("");

    const [variants, setVariants] = useState([]);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [filtersOpen, setFiltersOpen] = useState(false);

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

    const loadAllVariants = async () => {
        try {
            const response = await api.get("/vehicle-variants");
            setVariants(response.data.data || []);
        } catch (error) {
            console.error(error);
            showToast("Failed to load variants", "error");
        }
    };

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
            showToast("Failed to load variants", "error");
        }
    };

    const saveVariant = async () => {

        if (!selectedGenerationId) {
            showToast("Please select Make → Model → Generation", "error");
            return;
        }
        if (!variantName.trim()) {
            showToast("Variant name is required", "error");
            return;
        }
        if (!variantStartYear) {
            showToast("Variant start year is required", "error");
            return;
        }
        if (!variantEndYear) {
            showToast("Variant end year is required", "error");
            return;
        }
        if (Number(variantStartYear) > Number(variantEndYear)) {
            showToast("Start year cannot be greater than end year", "error");
            return;
        }
        if (!fuelType) {
            showToast("Please select fuel type", "error");
            return;
        }
        if (!transmission) {
            showToast("Please select transmission", "error");
            return;
        }
        if (!engineCapacity.trim()) {
            showToast("Engine capacity is required", "error");
            return;
        }
        if (!region) {
            showToast("Please select region", "error");
            return;
        }
try {
    const response = await api.post("/vehicle-variants", {
        variantName: variantName,
        variantStartYear: variantStartYear,
        variantEndYear: variantEndYear,
        doors: doors || null,
        engineType: engineType,
        engineCode: engineCode || null,
        engineCapacity: engineCapacity,
        emissionStandard: emissionStandard,
        fuelType: fuelType,
        transmission: transmission,
        chassisCode: chassisCode,
        vinPrefix: vinPrefix,
        region: region,
        vehicleGeneration: { id: selectedGenerationId }
    });

    showToast(response.data?.message || "Variant added", "success");

    setVariantName("");
    setVariantStartYear("");
    setVariantEndYear("");
    setDoors("");
    setEngineType("");
    setEngineCode("");
    setEngineCapacity("");
    setEmissionStandard("");
    setFuelType("");
    setTransmission("");
    setChassisCode("");
    setVinPrefix("");
    setRegion("");

    loadVariantsByGeneration(selectedGenerationId);
    setIsDrawerOpen(false);        // ← the missing line

} catch (error) {
    console.log(error);
    const backendMessage =
        error.response?.data?.errors?.join(", ") ||
        error.response?.data?.message ||
        "Error saving variant";
    showToast(backendMessage, "error");
    // drawer stays OPEN on error so the user can fix and retry
}
    };
    useEffect(() => {
        loadMakes();
        loadAllVariants();
    }, []);

    const filteredVariants = variants.filter((v) =>
        (v.variantName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.fuelType || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.transmission || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const electrifiedCount = variants.filter((v) => v.fuelType === "Electric" || v.fuelType === "Hybrid").length;

    const totalPages = Math.max(1, Math.ceil(filteredVariants.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedVariants = filteredVariants.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    );

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
            ...variants.map((v) => [v.variantName, v.fuelType, v.transmission, v.variantStartYear, getVariantEndYear(v)]),
        ];
        const csv = rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "vehicle-variants.csv";
        a.click();
        URL.revokeObjectURL(url);
        showToast("Exported vehicle-variants.csv", "success");
    };

    return (
        <div>

            <div className="vm-stats-row">
                <VehicleStatCard label="Total variants" value={variants.length} tone="blue" />
                <VehicleStatCard label="Active variants" value={variants.filter((item) => item.isActive !== false).length} tone="green" />
                <VehicleStatCard label="Electric / Hybrid" value={electrifiedCount} tone="amber" />
                <VehicleStatCard label="Matching results" value={filteredVariants.length} tone="purple" />
            </div>

            <div className="vm-action-bar">
                {searchOpen && <div className="vm-search-wrap is-open">
                    <span className="vm-search-icon"><Search size={15} /></span>
                    <input
                        className="vm-search-input"
                        placeholder="Search variants…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>}

                <div className="vm-action-buttons">
                    <button
                        className={`vm-btn vm-btn-secondary vm-btn-icon${searchOpen ? " is-active" : ""}`}
                        onClick={() => setSearchOpen((open) => !open)}
                        aria-label="Search variants"
                        title="Search"
                    >
                        <Search size={16} />
                    </button>
                    <button
                        className={`vm-btn vm-btn-secondary${filtersOpen ? " is-active" : ""}`}
                        onClick={() => setFiltersOpen((open) => !open)}
                    >
                        <Filter size={16} /> Filters
                    </button>
                    <button className="vm-btn vm-btn-secondary" onClick={exportCsv}>
                        <Download size={16} /> Export
                    </button>
                    <button
                        className="vm-btn vm-btn-primary"
                        onClick={() => setIsDrawerOpen(true)}
                    >
                        <Plus size={17} /> Add Variant
                    </button>
                </div>
            </div>

            {filtersOpen && <div className="vm-filter-panel">
                <div className="vm-grid-3">
                    <div className="vm-field">
                        <label className="vm-label">Make</label>
                        <select
                            className="vm-select"
                            value={selectedMakeId}
                            onChange={(e) => {
                                setSelectedMakeId(e.target.value);
                                loadModelsByMake(e.target.value);
                                loadVariantsByGeneration("");
                            }}
                        >
                            <option value="">All makes</option>
                            {makes.map((make) => (
                                <option key={make.id} value={make.id}>{make.makeName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">Model</label>
                        <select
                            className="vm-select"
                            value={selectedModelId}
                            disabled={!selectedMakeId}
                            onChange={(e) => {
                                setSelectedModelId(e.target.value);
                                loadGenerationsByModel(e.target.value);
                                loadVariantsByGeneration("");
                            }}
                        >
                            <option value="">All models</option>
                            {models.map((model) => (
                                <option key={model.id} value={model.id}>{model.modelName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">Generation</label>
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
                                    {gen.generationName} ({getGenerationStartYear(gen) ?? "—"}–{getGenerationEndYear(gen) ?? "—"})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>}

            <div className="vm-panel">
                {filteredVariants.length === 0 ? (
                    <div className="vm-empty">
                        <div className="vm-empty-icon"><Tags size={30} /></div>
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
                                    <th>Status</th>
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
                                            {getEngineCapacity(variant) ? ` · ${getEngineCapacity(variant)}` : ""}
                                        </td>
                                        <td className="vm-cell-mono">
                                            {variant.variantStartYear}
                                            {getVariantEndYear(variant) ? `–${getVariantEndYear(variant)}` : "–present"}
                                        </td>
                                        <td>{variant.region}</td>
                                        <td>
                                            <span className={`vm-badge ${variant.isActive !== false ? "vm-badge-green" : "vm-badge-gray"}`}>
                                                {variant.isActive !== false ? "Active" : "Inactive"}
                                            </span>
                                        </td>
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
                variant="compact"
                eyebrow="Vehicle Variants"
                onClose={() => setIsDrawerOpen(false)}
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
                <div className="vm-divider">Vehicle hierarchy</div>

                <div className="vm-grid-2" style={{ marginTop: 12, marginBottom: 8 }}>

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

                    <div className="vm-field vm-span-2">
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
                                    {gen.generationName} ({getGenerationStartYear(gen) ?? "—"}–{getGenerationEndYear(gen) ?? "—"})
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
                                value={variantEndYear}
                                onChange={(e) => setVariantEndYear(e.target.value)}
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
                                value={engineCapacity}
                                onChange={(e) => setEngineCapacity(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="vm-grid-2">
                        <div className="vm-field">
                            <label className="vm-label">Emission standard</label>
                            <select className="vm-select" value={emissionStandard} onChange={(e) => setEmissionStandard(e.target.value)}>
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
                                value={vinPrefix}
                                onChange={(e) => setVinPrefix(e.target.value)}
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