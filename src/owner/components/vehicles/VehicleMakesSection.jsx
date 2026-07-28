import { useState, useEffect } from "react";

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

    
    const filteredMakes = makes.filter((make) =>
        (make.makeName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (make.slug || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                <VehicleStatCard label="Total makes" value={makes.length} icon="🚗" tone="blue" />
                <VehicleStatCard label="Matching search" value={filteredMakes.length} icon="🔎" tone="green" />
                <VehicleStatCard label="Latest added" value={makes.length ? makes[makes.length - 1].makeName : "—"} icon="🆕" tone="amber" />
                <VehicleStatCard label="Hierarchy level" value="1 of 4" icon="🧭" tone="gray" />
            </div>

            <div className="vm-action-bar">
                <div className="vm-search-wrap">
                    <span className="vm-search-icon">🔍</span>
                    <input
                        className="vm-search-input"
                        placeholder="Search makes…"
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
                        + Add Make
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
                {filteredMakes.length === 0 ? (
                    <div className="vm-empty">
                        <div className="vm-empty-icon">🚗</div>
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
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMakes.map((make) => (
                                    <tr key={make.id}>
                                        <td className="vm-cell-strong">{make.makeName}</td>
                                        <td className="vm-cell-mono">{make.slug}</td>
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
