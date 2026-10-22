import { useState, useEffect } from "react";
import { CalendarRange, Download, Filter, Plus, Search } from "lucide-react";
import api from "../../../services/api";
import VehicleDrawer from "./VehicleDrawer";
import VehicleStatCard from "./VehicleStatCard";
import { showToast } from "./VehicleToast";

// Supports records returned by both the corrected API and an older running
// backend. This can be removed after every environment uses the corrected DTO.
const getGenerationStartYear = (generation) =>
  generation.productionStartYear ?? generation.gproductionStartYear;

const getGenerationEndYear = (generation) =>
  generation.productionEndYear ?? generation.gproductionEndYear;

function VehicleGenerationsSection() {
  // ===== FORM STATE =====
  const [generationName, setGenerationName] = useState("");
  const [generationNumber, setGenerationNumber] = useState("");
  const [facelift, setFacelift] = useState(false);
  const [bodyType, setBodyType] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [models, setModels] = useState([]);
  const [generations, setGenerations] = useState([]);

  // ===== Make support =====
  const [makes, setMakes] = useState([]);
  const [selectedMakeId, setSelectedMakeId] = useState("");
  const [drawerMakeId, setDrawerMakeId] = useState("");

  // ===== UI STATE =====
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ===== Pagination =====
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ===== Data loading =====
  const loadModels = async () => {
    try {
      const response = await api.get("/vehicle-models");
      setModels(response.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

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
      showToast("Failed to load generations", "error");
    }
  };

  const loadGenerationsByModel = async (modelId) => {
    try {
      if (!modelId) {
        loadAllGenerations();
        return;
      }
      const response = await api.get(
        `/vehicle-generations/by-model/${modelId}`,
      );
      setGenerations(response.data.data || []);
    } catch (error) {
      console.error(error);
      showToast("Failed to load generations", "error");
    }
  };

  const saveGeneration = async () => {
    if (!selectedModelId) {
      showToast("Please select a model", "error");
      return;
    }
    if (!generationName.trim()) {
      showToast("Generation name is required", "error");
      return;
    }
    if (!generationNumber.trim()) {
      showToast("Generation number is required", "error");
      return;
    }
    if (!startYear) {
      showToast("Start year is required", "error");
      return;
    }
    if (!endYear) {
      showToast("End year is required", "error");
      return;
    }
    if (Number(startYear) > Number(endYear)) {
      showToast("Start year cannot be greater than end year", "error");
      return;
    }

    try {
      const response = await api.post("/vehicle-generations", {
        generationName: generationName,
        generationNumber: generationNumber,
        facelift: facelift,
        bodyType: bodyType,
        productionStartYear: startYear,
        productionEndYear: endYear,
        vehicleModel: {
          id: selectedModelId,
        },
      });

      showToast(response.data?.message || "Generation added", "success");
      setGenerationName("");
      setGenerationNumber("");
      setFacelift(false);
      setBodyType("");
      setStartYear("");
      setEndYear("");
      await loadGenerationsByModel(selectedModelId);

      setIsDrawerOpen(false);
    } catch (error) {
      console.error(error);
      const backendMessage =
        error.response?.data?.errors?.join(", ") ||
        error.response?.data?.message ||
        "Error saving generation";
      showToast(backendMessage, "error");
    }
  };

  useEffect(() => {
    loadMakes();
    loadModels();
    loadAllGenerations();
  }, []);

  // ===== Filter helpers =====
  const filterBarModels = selectedMakeId
    ? models.filter((m) => String(m.vehicleMake?.id) === String(selectedMakeId))
    : models;

  const drawerModels = drawerMakeId
    ? models.filter((m) => String(m.vehicleMake?.id) === String(drawerMakeId))
    : models;

  const handleFilterMakeChange = (makeId) => {
    setSelectedMakeId(makeId);
    setSelectedModelId("");
    loadGenerationsByModel("");
  };

  const handleFilterModelChange = (modelId) => {
    setSelectedModelId(modelId);
    loadGenerationsByModel(modelId);
  };

  const handleDrawerMakeChange = (makeId) => {
    setDrawerMakeId(makeId);
    setSelectedModelId("");
  };

  const filteredGenerations = generations.filter(
    (g) =>
      (g.generationName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (g.modelName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.makeName || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const faceliftCount = generations.filter((g) => g.facelift).length;

  // ===== Pagination =====
  const totalPages = Math.max(
    1,
    Math.ceil(filteredGenerations.length / itemsPerPage),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedGenerations = filteredGenerations.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  );
  const rangeStart =
    filteredGenerations.length === 0
      ? 0
      : (safeCurrentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * itemsPerPage,
    filteredGenerations.length,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMakeId, selectedModelId]);

  const goToPage = (page) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(clamped);
  };

  const exportCsv = () => {
    const rows = [
      [
        "Make",
        "Model",
        "Generation",
        "Generation Number",
        "Body Type",
        "Start Year",
        "End Year",
        "Facelift",
      ],
      ...generations.map((g) => [
        g.makeName,
        g.modelName,
        g.generationName,
        g.generationNumber,
        g.bodyType,
        g.productionStartYear,
        g.productionEndYear,
        g.facelift ? "Yes" : "No",
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vehicle-generations.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported vehicle-generations.csv", "success");
  };

  return (
    <div>
      <div className="vm-stats-row">
        <VehicleStatCard
          label="Total generations"
          value={generations.length}
          tone="blue"
        />
        <VehicleStatCard
          label="Active generations"
          value={generations.filter((item) => item.isActive !== false).length}
          tone="green"
        />
        <VehicleStatCard
          label="Facelift versions"
          value={faceliftCount}
          tone="amber"
        />
        <VehicleStatCard
          label="Matching results"
          value={filteredGenerations.length}
          tone="purple"
        />
      </div>

      <div className="vm-action-bar">
        {searchOpen && (
          <div className="vm-search-wrap is-open">
            <span className="vm-search-icon">
              <Search size={15} />
            </span>
            <input
              className="vm-search-input"
              placeholder="Search generations…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className="vm-action-buttons">
          <button
            className={`vm-btn vm-btn-secondary vm-btn-icon${searchOpen ? " is-active" : ""}`}
            onClick={() => setSearchOpen((open) => !open)}
            aria-label="Search generations"
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
            onClick={() => {
              setDrawerMakeId("");
              setSelectedModelId("");
              setGenerationName("");
              setGenerationNumber("");
              setBodyType("");
              setFacelift(false);
              setStartYear("");
              setEndYear("");
              setIsDrawerOpen(true);
            }}
          >
            <Plus size={17} /> Add Generation
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="vm-filter-panel">
          <div className="vm-field">
            <label className="vm-label">Brand / make</label>
            <select
              className="vm-select"
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
          </div>
          <div className="vm-field">
            <label className="vm-label">Model</label>
            <select
              className="vm-select"
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
          </div>
        </div>
      )}

      <div className="vm-panel">
        {filteredGenerations.length === 0 ? (
          <div className="vm-empty">
            <div className="vm-empty-icon">
              <CalendarRange size={30} />
            </div>
            <div className="vm-empty-title">No generations found</div>
            <div>
              {generations.length === 0
                ? "Add your first generation to get started."
                : "Try a different search or model filter."}
            </div>
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
                  <th>Status</th>
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
                      <span className="vm-cell-strong">
                        {generation.generationName}
                      </span>
                      {generation.facelift && (
                        <span
                          className="vm-badge vm-badge-amber"
                          style={{ marginLeft: 8 }}
                        >
                          Facelift
                        </span>
                      )}
                    </td>
                    <td className="vm-cell-mono">
                      {generation.generationNumber || "—"}
                    </td>
                    <td>{generation.bodyType || "—"}</td>
                    <td className="vm-cell-mono">
                      {getGenerationStartYear(generation) ?? "—"}
                    </td>
                    <td className="vm-cell-mono">
                      {getGenerationEndYear(generation) ?? "—"}
                    </td>
                    <td>
                      <span
                        className={`vm-badge ${generation.isActive !== false ? "vm-badge-green" : "vm-badge-gray"}`}
                      >
                        {generation.isActive !== false ? "Active" : "Inactive"}
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
            {filteredGenerations.length === 0
              ? `0 of ${generations.length} generations`
              : `Showing ${rangeStart}–${rangeEnd} of ${filteredGenerations.length} generations`}
          </span>

          {totalPages > 1 && (
            <div className="vm-pagination">
              <button
                className="vm-btn vm-btn-secondary"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
              >
                ← Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    className={`vm-btn ${page === safeCurrentPage ? "vm-btn-primary" : "vm-btn-secondary"}`}
                    onClick={() => goToPage(page)}
                    style={{ minWidth: 36 }}
                  >
                    {page}
                  </button>
                ),
              )}

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
        variant="compact"
        eyebrow="Vehicle Generations"
        onClose={() => setIsDrawerOpen(false)}
        title="Add New Generation"
        description="A production generation of a model, with its year range and body type."
        footer={
          <>
            <button
              className="vm-btn vm-btn-secondary"
              onClick={() => setIsDrawerOpen(false)}
            >
              Cancel
            </button>
            <button className="vm-btn vm-btn-primary" onClick={saveGeneration}>
              Save Generation
            </button>
          </>
        }
      >
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
