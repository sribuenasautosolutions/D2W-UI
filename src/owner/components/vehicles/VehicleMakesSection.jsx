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

function VehicleMakesSection() {
  const [makeName, setMakeName] = useState("");
  const [makes, setMakes] = useState([]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [sortConfig, setSortConfig] = useState({ key: "makeName", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadMakes();
  }, []);

  const loadMakes = async () => {
    try {
      const response = await api.get("/vehicle-makes");
      setMakes(response.data.data || []);
    } catch (error) {
      console.error(error);
      showToast("Failed to load makes", "error");
    }
  };

  const saveMake = async () => {
    if (!makeName.trim()) {
      showToast("Make name is required", "error");
      return;
    }
    try {
      const response = editingId
        ? await api.put(`/vehicle-makes/${editingId}`, { makeName })
        : await api.post("/vehicle-makes", { makeName });

      showToast(response.data?.message || (editingId ? "Make updated" : "Make added"), "success");
      setMakeName("");
      setEditingId(null);
      await loadMakes();
      setIsDrawerOpen(false);
    } catch (error) {
      console.error(error);
      const msg =
        error.response?.data?.errors?.join(", ") ||
        error.response?.data?.message ||
        "Error saving make";
      showToast(msg, "error");
    }
  };

  const handleEdit = (make) => {
    setEditingId(make.id);
    setMakeName(make.makeName || "");
    setIsDrawerOpen(true);
  };

  const handleDelete = async (make) => {
    if (!window.confirm(`Delete "${make.makeName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/vehicle-makes/${make.id}`);
      showToast(`Deleted "${make.makeName}"`, "success");
      await loadMakes();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Error deleting make", "error");
    }
  };

  const filteredMakes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return makes.filter((make) => {
      const matchesSearch =
        (make.makeName || "").toLowerCase().includes(term) ||
        (make.slug || "").toLowerCase().includes(term);
      const isActive = make.isActive !== false;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);
      return matchesSearch && matchesStatus;
    });
  }, [makes, searchTerm, statusFilter]);

  const sortedMakes = useMemo(() => {
    const sorted = [...filteredMakes];
    sorted.sort((a, b) => {
      const av = a[sortConfig.key] ?? "";
      const bv = b[sortConfig.key] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, {
        sensitivity: "base",
        numeric: true,
      });
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredMakes, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedMakes.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMakes = sortedMakes.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, makes.length, pageSize]);

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
      ["Make", "Slug", "Status"],
      ...makes.map((m) => [
        m.makeName,
        m.slug,
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
    a.download = "vehicle-makes.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported vehicle-makes.csv", "success");
  };

  const activeMakes = makes.filter((m) => m.isActive !== false).length;

  return (
    <div>
      <div className="vm-stats-row">
        <VehicleStatCard label="Total Makes" value={makes.length} tone="blue" />
        <VehicleStatCard label="Active Makes" value={activeMakes} tone="green" />
        <VehicleStatCard
          label="Inactive Makes"
          value={makes.length - activeMakes}
          tone="gray"
        />
        <VehicleStatCard
          label="Latest Added"
          value={makes.length ? toTitleCase(makes[makes.length - 1].makeName) : "—"}
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
              placeholder="Search makes…"
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
            aria-label="Search makes"
            title="Search"
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
              setMakeName("");
              setIsDrawerOpen(true);
            }}
          >
            <Plus size={17} /> Add Make
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="vm-filter-panel">
          <div className="vm-field">
            <label className="vm-label">Make status</label>
            <select
              className="vm-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All makes</option>
              <option value="active">Active makes</option>
              <option value="inactive">Inactive makes</option>
            </select>
          </div>
        </div>
      )}

      <div className="vm-panel">
        {filteredMakes.length === 0 ? (
          <div className="vm-empty">
            <div className="vm-empty-icon">
              <CarFront size={30} />
            </div>
            <div className="vm-empty-title">No makes found</div>
            <div>
              {makes.length === 0
                ? "Add your first make to get started."
                : "Try a different search or filter."}
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
                  <th className="vm-sortable" onClick={() => toggleSort("slug")}>
                    Slug <SortIcon columnKey="slug" />
                  </th>
                  <th className="vm-sortable" onClick={() => toggleSort("isActive")}>
                    Status <SortIcon columnKey="isActive" />
                  </th>
                  <th className="vm-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMakes.map((make) => {
                  const active = make.isActive !== false;
                  return (
                    <tr key={make.id}>
                      <td className="vm-cell-strong">
                        {toTitleCase(make.makeName)}
                      </td>
                      <td className="vm-cell-mono">{make.slug}</td>
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
                            onClick={() => handleEdit(make)}
                            title="Edit"
                            aria-label={`Edit ${make.makeName}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="vm-icon-btn vm-icon-btn-danger"
                            onClick={() => handleDelete(make)}
                            title="Delete"
                            aria-label={`Delete ${make.makeName}`}
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
              {sortedMakes.length === 0
                ? "0 of 0 makes"
                : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(
                    safePage * pageSize,
                    sortedMakes.length
                  )} of ${sortedMakes.length} makes`}
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
          setMakeName("");
        }}
        icon="🚗"
        title={editingId ? "Edit Make" : "Add New Make"}
        description="The top of the vehicle hierarchy — a manufacturer like Maruti Suzuki or Hyundai."
        footer={
          <>
            <button
              className="vm-btn vm-btn-secondary"
              onClick={() => {
                setIsDrawerOpen(false);
                setEditingId(null);
                setMakeName("");
              }}
            >
              Cancel
            </button>
            <button className="vm-btn vm-btn-primary" onClick={saveMake}>
              {editingId ? "Update Make" : "Save Make"}
            </button>
          </>
        }
      >
        <div className="vm-grid-1">
          <div className="vm-field">
            <label className="vm-label">
              Make name <span className="vm-req">*</span>
            </label>
            <input
              type="text"
              className="vm-input"
              placeholder="e.g. Maruti Suzuki"
              value={makeName}
              onChange={(e) => setMakeName(e.target.value)}
            />
          </div>
        </div>
      </VehicleDrawer>
    </div>
  );
}

export default VehicleMakesSection;