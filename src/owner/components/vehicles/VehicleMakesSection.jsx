import { useState, useEffect } from "react";
import { CarFront, Download, Filter, Plus, Search } from "lucide-react";

import api from "../../../services/api";
import VehicleDrawer from "./VehicleDrawer";
import VehicleStatCard from "./VehicleStatCard";
import "./styles/vehicle-management.css";
// import "./styles/VehicleMakesSection.css";

function VehicleMakesSection() {

    // ===== ORIGINAL STATE — unchanged =====
    const [makeName, setMakeName] = useState("");

    const [message, setMessage] = useState(null); // { type: "success" | "error", text }

    const [makes, setMakes] = useState([]);

    // ===== NEW UI-ONLY STATE (no API / business-logic impact) =====
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {

        loadMakes();

    }, []);

    // ===== ORIGINAL HANDLERS — unchanged =====
    const loadMakes = async () => {

        try {

            const response =
                await api.get(
                    "/vehicle-makes"
                );

          
           setMakes(response.data.data || []);

        } catch (error) {

            console.error(error);
        }
    }

    const saveMake = async () => {

        if (!makeName.trim()) {
            setMessage({ type: "error", text: "Make name is required" });
            return;
        }
        try {

          const response =
    await api.post(
        "/vehicle-makes",
        {
            makeName: makeName
        }
    );


    setMessage({type: "success",text: response.data.message});

        setMakeName("");
        await loadMakes();
        setIsDrawerOpen(false);
        setTimeout(() => {setMessage(null);}, 3000);

        } catch (error) {
         console.error(error);
         const backendMessage =
         error.response?.data?.errors?.join(", ") ||
        error.response?.data?.message || "Error saving make";

    
    setMessage({
        type: "error",
        text: backendMessage
    });

   
    setIsDrawerOpen(true);

   
    setTimeout(() => { setMessage(null);}, 5000);
}
    }

    
    const filteredMakes = makes.filter((make) => {
        const matchesSearch =
            (make.makeName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (make.slug || "").toLowerCase().includes(searchTerm.toLowerCase());
        const isActive = make.isActive !== false;
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "active" && isActive) ||
            (statusFilter === "inactive" && !isActive);
        return matchesSearch && matchesStatus;
    });

    const activeMakes = makes.filter((make) => make.isActive !== false).length;

    const exportCsv = () => {
        const rows = [["Make", "Slug"], ...makes.map((m) => [m.makeName, m.slug])];
        const csv = rows.map((r) => r.map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "vehicle-makes.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>

            <div className="vm-stats-row">
                <VehicleStatCard label="Total makes" value={makes.length} tone="blue" />
                <VehicleStatCard label="Active makes" value={activeMakes} tone="green" />
                <VehicleStatCard label="Inactive makes" value={makes.length - activeMakes} tone="amber" />
                <VehicleStatCard label="Latest added" value={makes.length ? makes[makes.length - 1].makeName : "—"} tone="purple" />
            </div>

            <div className="vm-action-bar">
                {searchOpen && <div className="vm-search-wrap">
                    <span className="vm-search-icon"><Search size={15} /></span>
                    <input
                        className="vm-search-input"
                        placeholder="Search makes…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>}

                <div className="vm-action-buttons">
                    <button
                        className={`vm-btn vm-btn-secondary vm-btn-icon${searchOpen ? " is-active" : ""}`}
                        onClick={() => setSearchOpen((open) => !open)}
                        aria-label="Search makes"
                        title="Search"
                    >
                        <Search size={16} />
                    </button>
                    <button className="vm-btn vm-btn-secondary" onClick={() => setFiltersOpen((open) => !open)}>
                        <Filter size={16} /> Filters
                    </button>
                    <button className="vm-btn vm-btn-secondary" onClick={exportCsv}>
                        <Download size={16} /> Export
                    </button>
                    <button
                        className="vm-btn vm-btn-primary"
                        onClick={() => {
                            setMessage(null);
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
                        <select className="vm-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">All makes</option>
                            <option value="active">Active makes</option>
                            <option value="inactive">Inactive makes</option>
                        </select>
                    </div>
                </div>
            )}

            {message && !isDrawerOpen && (
                <div className={`vm-alert vm-alert-${message.type}`}>
                    <span className="vm-alert-icon"><span>{message.type === "success" ? "✓" : "!"}</span></span>
                    <span>{message.text}</span>
                </div>
            )}

            <div className="vm-panel">
                {filteredMakes.length === 0 ? (
                    <div className="vm-empty">
                        <div className="vm-empty-icon"><CarFront size={30} /></div>
                        <div className="vm-empty-title">No makes found</div>
                        <div>{makes.length === 0 ? "Add your first make to get started." : "Try a different search term."}</div>
                    </div>
                ) : (
                    <div className="vm-table-scroll">
                        <table className="vm-table">
                            <thead>
                                <tr>
                                    <th>Make</th>
                                    <th>Slug</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMakes.map((make) => (
                                    <tr key={make.id}>
                                        <td className="vm-cell-strong">{make.makeName}</td>
                                        <td className="vm-cell-mono">{make.slug}</td>
                                        <td>
                                            <span className={`vm-badge ${make.isActive !== false ? "vm-badge-green" : "vm-badge-gray"}`}>
                                                {make.isActive !== false ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="vm-table-footer">
                    <span>{filteredMakes.length} of {makes.length} makes</span>
                </div>
            </div>

            <VehicleDrawer
                open={isDrawerOpen}
                size="medium"
                onClose={() => setIsDrawerOpen(false)}
                icon="🚗"
                title="Add New Make"
                description="The top of the vehicle hierarchy — a manufacturer like Maruti Suzuki or Hyundai."
                footer={
                    <>
                        <button className="vm-btn vm-btn-secondary" onClick={() => setIsDrawerOpen(false)}>
                            Cancel
                        </button>
                        <button className="vm-btn vm-btn-primary" onClick={saveMake}>
                            Save Make
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
    )
}

export default VehicleMakesSection;
