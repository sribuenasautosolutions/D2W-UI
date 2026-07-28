import { useState, useEffect } from "react";
import api from "../../../services/api";
import VehicleDrawer from "./VehicleDrawer";
import VehicleStatCard from "./VehicleStatCard";
import "./styles/vehicle-management.css";
import "./styles/VehicleGenerationsSection.css";

function VehicleGenerationsSection() {

    // ===== ORIGINAL STATE — unchanged =====
    const [generationName, setGenerationName] = useState("");
    const [generationNumber, setGenerationNumber] = useState("");
    const [facelift, setFacelift] = useState(false);
    const [bodyType, setBodyType] = useState("");
    const [startYear, setStartYear] = useState("");
    const [endYear, setEndYear] = useState("");
    const [selectedModelId, setSelectedModelId] = useState("");
    const [models, setModels] = useState([]);
    const [generations, setGenerations] = useState([]);
    const [message, setMessage] = useState(null); // { type, text }

    // ===== NEW: Make support =====
    const [makes, setMakes] = useState([]);
    const [selectedMakeId, setSelectedMakeId] = useState(""); // filter-bar make
    const [drawerMakeId, setDrawerMakeId] = useState("");     // drawer form make

    // ===== NEW UI-ONLY STATE =====
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // ===== NEW: pagination state =====
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // ===== ORIGINAL HANDLERS — unchanged =====
    const loadModels = async () => {
        try {
            const response = await api.get("/vehicle-models");
            setModels(response.data.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    // ===== NEW: load makes =====
    const loadMakes = async () => {
        try {
            const response = await api.get("/vehicle-makes");
            setMakes(response.data.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const loadAllGenerations = async () => {
        try {
            const response = await api.get("/vehicle-generations");
            setGenerations(response.data.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const loadGenerationsByModel = async (modelId) => {
        try {
            if (!modelId) {
                loadAllGenerations();
                return;
            }
            const response = await api.get(`/vehicle-generations/by-model/${modelId}`);
            setGenerations(response.data.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const saveGeneration = async () => {

        if (!selectedModelId) {
            setMessage({ type: "error", text: "Please select a model" });
            return;
        }
        if (!generationName.trim()) {
            setMessage({ type: "error", text: "Generation name is required" });
            return;
        }
        if (!generationNumber.trim()) {
            setMessage({ type: "error", text: "Generation number is required" });
            return;
        }
        if (!startYear) {
            setMessage({ type: "error", text: "Start year is required" });
            return;
        }
        if (!endYear) {
            setMessage({ type: "error", text: "End year is required" });
            return;
        }
        if (Number(startYear) > Number(endYear)) {
            setMessage({ type: "error", text: "Start year cannot be greater than end year" });
            return;
        }

        try {
            const response = await api.post("/vehicle-generations", {
                generationName: generationName,
                generationNumber: generationNumber,
                facelift: facelift,
                bodyType: bodyType,
                gproductionStartYear: startYear,
                gproductionEndYear: endYear,
                vehicleModel: {
                    id: selectedModelId
                }
            });

            setMessage({ type: "success", text: response.data.message });
            setGenerationName("");
            setGenerationNumber("");
            setFacelift(false);
            setBodyType("");
            setStartYear("");
            setEndYear("");
            await loadGenerationsByModel(selectedModelId);

            setIsDrawerOpen(false);

            setTimeout(() => { setMessage(null); }, 3000);

        } catch (error) {
            console.error(error);

            const backendMessage =
                error.response?.data?.errors?.join(", ") ||
                error.response?.data?.message ||
                "Error saving generation";

            setMessage({ type: "error", text: backendMessage });

            setIsDrawerOpen(true);

            setTimeout(() => { setMessage(null); }, 5000);
        }
    };

    useEffect(() => {
        loadMakes();
        loadModels();
        loadAllGenerations();
    }, []);

    // ===== UI-ONLY HELPERS =====

    // Models shown in the filter-bar dropdown, scoped to the chosen Make
    const filterBarModels = selectedMakeId
    ? models.filter((m) => String(m.vehicleMake?.id) === String(selectedMakeId))
    : models;

    // Models shown in the drawer's Model dropdown, scoped to the drawer's Make
    const drawerModels = drawerMakeId
        ? models.filter((m) => String(m.vehicleMake?.id) === String(drawerMakeId))
        : models;

    const handleFilterMakeChange = (makeId) => {
        setSelectedMakeId(makeId);
        // Reset model selection since the previous model may not belong to this make
        setSelectedModelId("");
        loadGenerationsByModel(""); // falls back to loadAllGenerations, then re-narrowed by search/table
    };

    const handleFilterModelChange = (modelId) => {
        setSelectedModelId(modelId);
        loadGenerationsByModel(modelId);
    };

    const handleDrawerMakeChange = (makeId) => {
        setDrawerMakeId(makeId);
        setSelectedModelId(""); // force re-pick of model under the new make
    };

    const filteredGenerations = generations.filter((g) =>
    (g.generationName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.modelName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.makeName || "").toLowerCase().includes(searchTerm.toLowerCase())
);

    const faceliftCount = generations.filter((g) => g.facelift).length;

    // ===== NEW: pagination derived values =====
    const totalPages = Math.max(1, Math.ceil(filteredGenerations.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedGenerations = filteredGenerations.slice(
        (safeCurrentPage - 1) * itemsPerPage,
        safeCurrentPage * itemsPerPage
    );
    const rangeStart = filteredGenerations.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
    const rangeEnd = Math.min(safeCurrentPage * itemsPerPage, filteredGenerations.length);

    // Reset to page 1 whenever the visible result set changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedMakeId, selectedModelId]);

    const goToPage = (page) => {
        const clamped = Math.min(Math.max(1, page), totalPages);
        setCurrentPage(clamped);
    };

    const exportCsv = () => {
        const rows = [
            ["Make", "Model", "Generation", "Generation Number", "Body Type", "Start Year", "End Year", "Facelift"],
           ...generations.map((g) => [
    g.makeName,
    g.modelName,
    g.generationName,
    g.generationNumber,
    g.bodyType,
    g.gproductionStartYear,
    g.gproductionEndYear,
    g.facelift ? "Yes" : "No",
]),
        ];
        const csv = rows.map((r) => r.map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "vehicle-generations.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>

            <div className="vm-stats-row">
                <VehicleStatCard label="Total generations" value={generations.length} icon="📅" tone="blue" />
                <VehicleStatCard label="Matching search" value={filteredGenerations.length} icon="🔎" tone="green" />
                <VehicleStatCard label="Facelift versions" value={faceliftCount} icon="✨" tone="amber" />
                <VehicleStatCard label="Hierarchy level" value="3 of 4" icon="🧭" tone="gray" />
            </div>

            <div className="vm-action-bar">
                <div className="vm-search-wrap">
                    <span className="vm-search-icon">🔍</span>
                    <input
                        className="vm-search-input"
                        placeholder="Search generations…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="vm-action-buttons">
                    <select
                        className="vm-select"
                        style={{ minWidth: 160 }}
                        value={selectedMakeId}
                        onChange={(e) => handleFilterMakeChange(e.target.value)}
                    >
                        <option value="">All makes</option>
                        {makes.map((make) => (
                            <option key={make.id} value={make.id}>
                                {make.makeName}
                            </option>
                        ))}
                    </select>

                    <select
                        className="vm-select"
                        style={{ minWidth: 200 }}
                        value={selectedModelId}
                        onChange={(e) => handleFilterModelChange(e.target.value)}
                    >
                        <option value="">All models</option>
                        {filterBarModels.map((model) => (
                            <option key={model.id} value={model.id}>
                                {model.vehicleMake?.makeName} → {model.modelName}
                            </option>
                        ))}
                    </select>

                    <button className="vm-btn vm-btn-secondary" onClick={exportCsv}>
                        ⬇ Export
                    </button>
                    <button
                        className="vm-btn vm-btn-primary"
                        onClick={() => {
                            setMessage(null);

                            // Clear previous values
                            setDrawerMakeId("");
                            setSelectedModelId("");
                            setGenerationName("");
                            setGenerationNumber("");
                            setBodyType("");
                            setFacelift(false);
                            setStartYear("");
                            setEndYear("");

                            // Open drawer
                            setIsDrawerOpen(true);
                        }}
                    >
                        + Add Generation
                    </button>
                </div>
            </div>

            {message && !isDrawerOpen && (
                <div className={`vm-alert vm-alert-${message.type}`}>
                    <span className="vm-alert-icon"><span>{message.type === "success" ? "✓" : "!"}</span></span>
                    <span>{message.text}</span>
                </div>
            )}

            <div className="vm-panel">
                {filteredGenerations.length === 0 ? (
                    <div className="vm-empty">
                        <div className="vm-empty-icon">📅</div>
                        <div className="vm-empty-title">No generations found</div>
                        <div>{generations.length === 0 ? "Add your first generation to get started." : "Try a different search or model filter."}</div>
                    </div>
                ) : (
                    <div className="vm-table-scroll">
                        <table className="vm-table">
                            <thead>
                                <tr>
                                    <th>Make</th>
                                    <th>Model</th>
                                    <th>Generation</th>
                                    <th>Gen. No.</th>
                                    <th>Body Type</th>
                                    <th>Start Year</th>
                                    <th>End Year</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedGenerations.map((generation) => (
                                    <tr key={generation.id}>
                                        <td>
    <span className="vm-chip">
         {generation.makeName || "—"}
    </span>
</td>
                                        <td>{generation.modelName || "—"}</td>
                                        <td>
                                            <span className="vm-cell-strong">{generation.generationName}</span>
                                            {generation.facelift && (
                                                <span className="vm-badge vm-badge-amber" style={{ marginLeft: 8 }}>
                                                    Facelift
                                                </span>
                                            )}
                                        </td>
                                        <td className="vm-cell-mono">{generation.generationNumber || "—"}</td>
                                        <td>{generation.bodyType || "—"}</td>
                                        <td className="vm-cell-mono">{generation.gproductionStartYear}</td>
                                        <td className="vm-cell-mono">{generation.gproductionEndYear}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="vm-table-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <span>
                        {filteredGenerations.length === 0
                            ? `0 of ${generations.length} generations`
                            : `Showing ${rangeStart}–${rangeEnd} of ${filteredGenerations.length} generations`}
                    </span>

                    {totalPages > 1 && (
                        <div className="vm-pagination" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                                className="vm-btn vm-btn-secondary"
                                onClick={() => goToPage(safeCurrentPage - 1)}
                                disabled={safeCurrentPage === 1}
                            >
                                ← Prev
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    className={`vm-btn ${page === safeCurrentPage ? "vm-btn-primary" : "vm-btn-secondary"}`}
                                    onClick={() => goToPage(page)}
                                    style={{ minWidth: 36 }}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                className="vm-btn vm-btn-secondary"
                                onClick={() => goToPage(safeCurrentPage + 1)}
                                disabled={safeCurrentPage === totalPages}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <VehicleDrawer
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                icon="📅"
                title="Add New Generation"
                description="A production generation of a model, with its year range and body type."
                footer={
                    <>
                        <button className="vm-btn vm-btn-secondary" onClick={() => setIsDrawerOpen(false)}>
                            Cancel
                        </button>
                        <button className="vm-btn vm-btn-primary" onClick={saveGeneration}>
                            Save Generation
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

                <div className="vm-grid-1">

                    <div className="vm-grid-2">
                        <div className="vm-field">
                            <label className="vm-label">
                                Make <span className="vm-req">*</span>
                            </label>
                            <select
                                className="vm-select"
                                value={drawerMakeId}
                                onChange={(e) => handleDrawerMakeChange(e.target.value)}
                            >
                                <option value="">Select make</option>
                                {makes.map((make) => (
                                    <option key={make.id} value={make.id}>
                                        {make.makeName}
                                    </option>
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
                                disabled={!drawerMakeId}
                                onChange={(e) => setSelectedModelId(e.target.value)}
                            >
                                <option value="">
                                    {drawerMakeId ? "Select model" : "Select make first"}
                                </option>
                                {drawerModels.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.modelName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Generation name <span className="vm-req">*</span>
                        </label>
                        <input
                            type="text"
                            className="vm-input"
                            placeholder="e.g. 5th Generation"
                            value={generationName}
                            onChange={(e) => setGenerationName(e.target.value)}
                        />
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Generation number <span className="vm-req">*</span>
                        </label>
                        <input
                            type="text"
                            className="vm-input"
                            placeholder="e.g. 5"
                            value={generationNumber}
                            onChange={(e) => setGenerationNumber(e.target.value)}
                        />
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">Body type</label>
                        <input
                            type="text"
                            className="vm-input"
                            placeholder="e.g. Hatchback"
                            value={bodyType}
                            onChange={(e) => setBodyType(e.target.value)}
                        />
                    </div>

                    <div className="vm-field">
                        <label className="vm-checkbox-row">
                            <input
                                type="checkbox"
                                checked={facelift}
                                onChange={(e) => setFacelift(e.target.checked)}
                            />
                            This is a facelift version
                        </label>
                    </div>

                    <div className="vm-grid-2">
                        <div className="vm-field">
                            <label className="vm-label">
                                Production start year <span className="vm-req">*</span>
                            </label>
                            <input
                                type="number"
                                className="vm-input vm-mono"
                                placeholder="e.g. 2020"
                                value={startYear}
                                onChange={(e) => setStartYear(e.target.value)}
                            />
                        </div>

                        <div className="vm-field">
                            <label className="vm-label">
                                Production end year <span className="vm-req">*</span>
                            </label>
                            <input
                                type="number"
                                className="vm-input vm-mono"
                                placeholder="e.g. 2024"
                                value={endYear}
                                onChange={(e) => setEndYear(e.target.value)}
                            />
                        </div>
                    </div>

                </div>
            </VehicleDrawer>

        </div>
    );
}

export default VehicleGenerationsSection;
