import { useState, useEffect, useMemo } from "react";
import {
  CarFront,
  Download,
  Filter,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import api from "../../../services/api";
import VehicleDrawer from "./VehicleDrawer";
import VehicleStatCard from "./VehicleStatCard";
import { showToast } from "./VehicleToast";
import "./styles/vehicle-management.css";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const toTitleCase = (s = "") =>
  s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

function VehicleModelsSection() {
  const [modelName, setModelName] = useState("");
  const [selectedMakeId, setSelectedMakeId] = useState("");
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: "modelName", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadMakes = async () => {
    try {
      const response = await api.get("/vehicle-makes");
      setMakes(response.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadAllModels = async () => {
    try {
      const response = await api.get("/vehicle-models");
      setModels(response.data.data || []);
    } catch (error) {
      console.error(error);
      showToast("Failed to load models", "error");
    }
  };

  const loadModels = async (makeId) => {
    try {
      if (!makeId) {
        loadAllModels();
        return;
      }
      const response = await api.get(`/vehicle-models/by-make/${makeId}`);
      setModels(response.data.data || []);
    } catch (error) {
      console.error(error);
      showToast("Failed to load models", "error");
    }
  };

  const saveModel = async () => {
    if (!selectedMakeId) {
      showToast("Please select a make", "error");
      return;
    }
    if (!modelName.trim()) {
      showToast("Model name is required", "error");
      return;
    }
    try {
      const payload = {
        modelName,
        vehicleMake: { id: selectedMakeId },
      };
      const response = editingId
        ? await api.put(`/vehicle-models/${editingId}`, payload)
        : await api.post("/vehicle-models", payload);

      showToast(response.data?.message || (editingId ? "Model updated" : "Model added"), "success");
      setModelName("");
      setEditingId(null);
      await loadModels(selectedMakeId);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error(error);
      const msg =
        error.response?.data?.errors?.join(", ") ||
        error.response?.data?.message ||
        "Error saving model";
      showToast(msg, "error");
    }
  };

  const handleEdit = (model) => {
    setEditingId(model.id);
    setModelName(model.modelName || "");
    setSelectedMakeId(model.vehicleMake?.id || "");
    setIsDrawerOpen(true);
  };

  const handleDelete = async (model) => {
    if (!window.confirm(`Delete "${model.modelName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/vehicle-models/${model.id}`);
      showToast(`Deleted "${model.modelName}"`, "success");
      await loadModels(selectedMakeId);
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Error deleting model", "error");
    }
  };

  useEffect(() => {
    loadMakes();
    loadAllModels();
  }, []);

  const filteredModels = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return models.filter(
      (model) =>
        (model.modelName || "").toLowerCase().includes(term) ||
        (model.vehicleMake?.makeName || "").toLowerCase().includes(term)
    );
  }, [models, searchTerm]);

  const sortedModels = useMemo(() => {
    const sorted = [...filteredModels];
    sorted.sort((a, b) => {
      let av = "";
      let bv = "";
      if (sortConfig.key === "makeName") {
        av = a.vehicleMake?.makeName ?? "";
        bv = b.vehicleMake?.makeName ?? "";
      } else if (sortConfig.key === "isActive") {
        av = a.isActive !== false ? "Active" : "Inactive";
        bv = b.isActive !== false ? "Active" : "Inactive";
      } else {
        av = a[sortConfig.key] ?? "";
        bv = b[sortConfig.key] ?? "";
      }
      const cmp = String(av).localeCompare(String(bv), undefined, {
        sensitivity: "base",
        numeric: true,
      });
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredModels, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedModels.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedModels = sortedModels.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMakeId, models.length, pageSize]);

  const toggleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={12} className="vm-sort-icon" />
    ) : (
      <ArrowDown size={12} className="vm-sort-icon" />
    );
  };

  const exportCsv = () => {
    const rows = [
      ["Make", "Model", "Status"],
      ...models.map((m) => [
        m.vehicleMake?.makeName,
        m.modelName,
        m.isActive !== false ? "Active" : "Inactive",
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vehicle-models.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported vehicle-models.csv", "success");
  };

  return (
    <div>
      <div className="vm-stats-row">
        <VehicleStatCard label="Total Models" value={models.length} tone="blue" />
        <VehicleStatCard
          label="Active Models"
          value={models.filter((m) => m.isActive !== false).length}
          tone="green"
        />
        <VehicleStatCard
          label="Makes Covered"
          value={new Set(models.map((m) => m.vehicleMake?.id)).size}
          tone="purple"
        />
        <VehicleStatCard
          label="Matching Results"
          value={filteredModels.length}
          tone="amber"
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
              placeholder="Search models…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className="vm-action-buttons">
          <button
            className={`vm-btn vm-btn-secondary vm-btn-icon${searchOpen ? " is-active" : ""}`}
            onClick={() => setSearchOpen((o) => !o)}
            aria-label="Search models"
          >
            <Search size={16} />
          </button>
          <button
            className={`vm-btn vm-btn-secondary${filtersOpen ? " is-active" : ""}`}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Filter size={16} /> Filters
          </button>
          <button className="vm-btn vm-btn-secondary" onClick={exportCsv}>
            <Download size={16} /> Export
          </button>
          <button
            className="vm-btn vm-btn-primary"
            onClick={() => {
              setEditingId(null);
              setModelName("");
              setIsDrawerOpen(true);
            }}
          >
            <Plus size={17} /> Add Model
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
              onChange={(e) => {
                setSelectedMakeId(e.target.value);
                loadModels(e.target.value);
              }}
            >
              <option value="">All makes</option>
              {makes.map((make) => (
                <option key={make.id} value={make.id}>
                  {make.makeName}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="vm-panel">
        {filteredModels.length === 0 ? (
          <div className="vm-empty">
            <div className="vm-empty-icon">
              <CarFront size={30} />
            </div>
            <div className="vm-empty-title">No models found</div>
            <div>
              {models.length === 0
                ? "Add your first model to get started."
                : "Try a different search or make filter."}
            </div>
          </div>
        ) : (
          <div className="vm-table-scroll">
            <table className="vm-table">
              <thead>
                <tr>
                  <th className="vm-sortable" onClick={() => toggleSort("makeName")}>
                    Make <SortIcon columnKey="makeName" />
                  </th>
                  <th className="vm-sortable" onClick={() => toggleSort("modelName")}>
                    Model <SortIcon columnKey="modelName" />
                  </th>
                  <th className="vm-sortable" onClick={() => toggleSort("isActive")}>
                    Status <SortIcon columnKey="isActive" />
                  </th>
                  <th className="vm-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedModels.map((model) => {
                  const active = model.isActive !== false;
                  return (
                    <tr key={model.id}>
                      <td>
                        <span className="vm-badge vm-badge-blue">
                          {toTitleCase(model.vehicleMake?.makeName)}
                        </span>
                      </td>
                      <td className="vm-cell-strong">
                        {toTitleCase(model.modelName)}
                      </td>
                      <td>
                        <span
                          className={`vm-badge ${
                            active ? "vm-badge-green" : "vm-badge-gray"
                          }`}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="vm-actions-col">
                        <div className="vm-row-actions">
                          <button
                            className="vm-icon-btn"
                            onClick={() => handleEdit(model)}
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="vm-icon-btn vm-icon-btn-danger"
                            onClick={() => handleDelete(model)}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="vm-table-footer">
          <div className="vm-footer-left">
            <span>
              {sortedModels.length === 0
                ? "0 of 0 models"
                : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(
                    safePage * pageSize,
                    sortedModels.length
                  )} of ${sortedModels.length} models`}
            </span>
            <label className="vm-page-size">
              Rows per page
              <select
                className="vm-select vm-select-sm"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {totalPages > 1 && (
            <div className="vm-pagination">
              <button
                className="vm-btn vm-btn-secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                ‹ Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 || p === totalPages || Math.abs(p - safePage) <= 1
                )
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const gap = prev && p - prev > 1;
                  return (
                    <span key={p} className="vm-page-item">
                      {gap && <span className="vm-page-ellipsis">…</span>}
                      <button
                        className={`vm-btn ${
                          p === safePage ? "vm-btn-primary" : "vm-btn-secondary"
                        }`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}
              <button
                className="vm-btn vm-btn-secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
        size="medium"
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingId(null);
          setModelName("");
        }}
        icon="🚙"
        title={editingId ? "Edit Model" : "Add New Model"}
        description="A model belongs to one make — e.g. Swift under Maruti Suzuki."
        footer={
          <>
            <button
              className="vm-btn vm-btn-secondary"
              onClick={() => {
                setIsDrawerOpen(false);
                setEditingId(null);
                setModelName("");
              }}
            >
              Cancel
            </button>
            <button className="vm-btn vm-btn-primary" onClick={saveModel}>
              {editingId ? "Update Model" : "Save Model"}
            </button>
          </>
        }
      >
        <div className="vm-grid-1">
          <div className="vm-field">
            <label className="vm-label">
              Make <span className="vm-req">*</span>
            </label>
            <select
              className="vm-select"
              value={selectedMakeId}
              onChange={(e) => {
                setSelectedMakeId(e.target.value);
                loadModels(e.target.value);
              }}
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
              Model name <span className="vm-req">*</span>
            </label>
            <input
              type="text"
              className="vm-input"
              placeholder="e.g. Swift"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </div>
        </div>
      </VehicleDrawer>
    </div>
  );
}

export default VehicleModelsSection;