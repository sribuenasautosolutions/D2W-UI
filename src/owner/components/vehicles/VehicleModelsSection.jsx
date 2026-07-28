import { useState, useEffect } from "react";

import api from "../../../services/api";
import VehicleDrawer from "./VehicleDrawer";
import VehicleStatCard from "./VehicleStatCard";
import "./styles/vehicle-management.css";
import "./styles/VehicleModelsSection.css";

// pagination
const PAGE_SIZE = 10;

function VehicleModelsSection() {

    // ===== ORIGINAL STATE — unchanged =====
    const [modelName, setModelName] = useState("");

    const [selectedMakeId, setSelectedMakeId] = useState("");

    const [makes, setMakes] = useState([]);

    const [models, setModels] = useState([]);

    const [message, setMessage] = useState(null); // { type, text }

    // ===== NEW UI-ONLY STATE =====
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [drawerMakeId, setDrawerMakeId] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // ===== ORIGINAL HANDLERS — unchanged =====
    const loadMakes = async () => {

        try {

            const response =
                await api.get(
                    "/vehicle-makes"
                );

   setMakes(response.data.data || []);

        } catch (error) {

            console.log(error);
        }
    }

    const loadAllModels = async () => {

        try {

            const response =
               await api.get(
    "/vehicle-models"
);

           setModels(response.data.data || []);

        } catch (error) {

            console.error(error);
        }
    }

    const loadModels = async (makeId) => {

        try {

            if (!makeId) {

                loadAllModels();

                return;
            }

            const response =
               await api.get(
    `/vehicle-models/by-make/${makeId}`
);

            setModels(response.data.data);

        } catch (error) {

            console.error(error);
        }
    }

    const saveModel = async () => {
        if (!selectedMakeId) {
            setMessage({ type: "error", text: "Please select a make" });
            return;
        }

        if (!modelName.trim()) {
            setMessage({ type: "error", text: "Model name is required" });
            return;
        }
        try {

            const response =
                await api.post(
    "/vehicle-models",
                    {
                        modelName: modelName,
                        vehicleMake: {
                            id: selectedMakeId
                        }
                    }
                );

            setMessage({ type: "success", text: response.data.message });

           setModelName("");

            await loadModels(selectedMakeId);

            setIsDrawerOpen(false);

        setTimeout(() => {setMessage(null);}, 3000);

        } catch(error){

            console.error(error);

            const backendMessage =
            error.response?.data?.errors?.join(", ") ||
            error.response?.data?.message ||"Error saving model";

    setMessage({ type:"error",text:backendMessage
    });

    setIsDrawerOpen(true);

    setTimeout(()=>{
        setMessage(null);
    },5000);

}
    }

    useEffect(() => {

        loadMakes();

        loadAllModels();

    }, []);

    // ===== UI-ONLY HELPERS =====
    const filteredModels = models.filter((model) =>
        (model.modelName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (model.vehicleMake?.makeName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    // pagination derived from the filtered list
    const totalPages = Math.max(1, Math.ceil(filteredModels.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedModels = filteredModels.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    );

    // reset to page 1 whenever the underlying list, search term, or make filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedMakeId, models.length]);

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    const exportCsv = () => {
        const rows = [["Make", "Model"], ...models.map((m) => [m.vehicleMake?.makeName, m.modelName])];
        const csv = rows.map((r) => r.map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "vehicle-models.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>

            <div className="vm-stats-row">
                <VehicleStatCard label="Total models" value={models.length} icon="🚙" tone="blue" />
                <VehicleStatCard label="Matching search" value={filteredModels.length} icon="🔎" tone="green" />
                <VehicleStatCard label="Makes covered" value={new Set(models.map((m) => m.vehicleMake?.id)).size} icon="🏷" tone="amber" />
                <VehicleStatCard label="Hierarchy level" value="2 of 4" icon="🧭" tone="gray" />
            </div>

            <div className="vm-action-bar">
                <div className="vm-search-wrap">
                    <span className="vm-search-icon">🔍</span>
                    <input
                        className="vm-search-input"
                        placeholder="Search models…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="vm-action-buttons">
                    <select
                        className="vm-select"
                        style={{ minWidth: 170 }}
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

                    <button className="vm-btn vm-btn-secondary" onClick={exportCsv}>
                        ⬇ Export
                    </button>
                    <button
                        className="vm-btn vm-btn-primary"
                        onClick={() => {
                        setMessage(null);
                        setModelName("");
                        setDrawerMakeId(selectedMakeId);
                        setIsDrawerOpen(true);
                        }}
                    >
                        + Add Model
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
                {filteredModels.length === 0 ? (
                    <div className="vm-empty">
                        <div className="vm-empty-icon">🚙</div>
                        <div className="vm-empty-title">No models found</div>
                        <div>{models.length === 0 ? "Add your first model to get started." : "Try a different search or make filter."}</div>
                    </div>
                ) : (
                    <div className="vm-table-scroll">
                        <table className="vm-table">
                            <thead>
                                <tr>
                                    <th>Make</th>
                                    <th>Model</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedModels.map((model) => (
                                    <tr key={model.id}>
                                        <td>
                                            <span className="vm-badge vm-badge-blue">{model.vehicleMake?.makeName}</span>
                                        </td>
                                        <td className="vm-cell-strong">{model.modelName}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="vm-table-footer">
                    <span>
                        {filteredModels.length === 0
                            ? "0 of 0 models"
                            : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredModels.length)} of ${filteredModels.length} models`}
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
                icon="🚙"
                title="Add New Model"
                description="A model belongs to one make — e.g. Swift under Maruti Suzuki."
                footer={
                    <>
                        <button className="vm-btn vm-btn-secondary" onClick={() => setIsDrawerOpen(false)}>
                            Cancel
                        </button>
                        <button className="vm-btn vm-btn-primary" onClick={saveModel}>
                            Save Model
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
    )
}

export default VehicleModelsSection;
