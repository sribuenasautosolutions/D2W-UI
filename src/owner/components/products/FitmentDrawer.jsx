import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

import {
    fetchFitmentMakes,
    fetchFitmentModels,
    fetchFitmentYears,
    fetchFitments,
    saveFitments,
} from "../../../services/fitmentservices";

import "./FitmentDrawer.css";

function FitmentDrawer({ part, onClose, onSaved }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [years, setYears] = useState([]);

    const [selectedMake, setSelectedMake] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [selectedYear, setSelectedYear] = useState("");

    const [loadingModels, setLoadingModels] = useState(false);
    const [loadingYears, setLoadingYears] = useState(false);

    const [fits, setFits] = useState([]);

    const partNumber = part?.partNumber || "";

    /* ---------------- load initial data ---------------- */
    useEffect(() => {
        let cancelled = false;
        if (!partNumber) {
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const [makesRes, fitsRes] = await Promise.all([
                    fetchFitmentMakes(),
                    fetchFitments(partNumber),
                ]);

                if (cancelled) return;

                setMakes(Array.isArray(makesRes) ? makesRes : []);
                setFits(Array.isArray(fitsRes) ? fitsRes : []);
            } catch (error) {
                console.error("Unable to load fitment data:", error);
                toast.error("Unable to load fitment data.");
                setMakes([]);
                setFits([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [partNumber]);

    /* ---------------- load models when make changes ---------------- */
    useEffect(() => {
        let cancelled = false;
        if (!selectedMake) {
            setModels([]);
            setSelectedModel("");
            setYears([]);
            setSelectedYear("");
            return;
        }
        setLoadingModels(true);
        (async () => {
            try {
                const res = await fetchFitmentModels(selectedMake);
                if (!cancelled) setModels(Array.isArray(res) ? res : []);
            } catch (error) {
                console.error(error);
                if (!cancelled) setModels([]);
            } finally {
                if (!cancelled) setLoadingModels(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedMake]);

    /* ---------------- load years when model changes ---------------- */
    useEffect(() => {
        let cancelled = false;
        if (!selectedMake || !selectedModel) {
            setYears([]);
            setSelectedYear("");
            return;
        }
        setLoadingYears(true);
        (async () => {
            try {
                const res = await fetchFitmentYears(selectedMake, selectedModel);
                if (!cancelled) setYears(Array.isArray(res) ? res : []);
            } catch (error) {
                console.error(error);
                if (!cancelled) setYears([]);
            } finally {
                if (!cancelled) setLoadingYears(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedMake, selectedModel]);

    /* ---------------- derived ---------------- */
    const existingKeys = useMemo(
        () =>
            new Set(
                fits.map(
                    (f) =>
                        `${f.make}::${f.model}::${f.year}`.toUpperCase()
                )
            ),
        [fits]
    );

    const currentKey =
        selectedMake && selectedModel && selectedYear
            ? `${selectedMake}::${selectedModel}::${selectedYear}`.toUpperCase()
            : "";

    const isDuplicate = currentKey && existingKeys.has(currentKey);
    const canAdd = selectedMake && selectedModel && selectedYear && !isDuplicate;

    /* ---------------- handlers ---------------- */
    const handleAdd = () => {
        if (!canAdd) return;

        const makeName =
            makes.find((m) => String(m.id) === String(selectedMake))?.name ||
            selectedMake;
        const modelName =
            models.find((m) => String(m.id) === String(selectedModel))?.name ||
            selectedModel;

        const newFit = {
            id: `draft-${Date.now()}`,
            makeId: selectedMake,
            modelId: selectedModel,
            year: selectedYear,
            make: makeName,
            model: modelName,
        };

        setFits((current) => [...current, newFit]);
        setSelectedMake("");
        setSelectedModel("");
        setSelectedYear("");
        setModels([]);
        setYears([]);
    };

    const handleRemove = (id) => {
        setFits((current) => current.filter((f) => f.id !== id));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveFitments(partNumber, fits);
            toast.success("Fitments saved.");
            onSaved?.(fits);
            onClose?.();
        } catch (error) {
            console.error(error);
            toast.error(
                error?.response?.data?.message || "Unable to save fitments."
            );
        } finally {
            setSaving(false);
        }
    };

    /* ---------------- render ---------------- */
    return createPortal(
        <div className="fitment-drawer-backdrop" onClick={onClose}>
            <aside
                className="fitment-drawer"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <header className="fitment-drawer-header">
                    <div>
                        <div className="fitment-drawer-eyebrow">
                            FITMENT
                        </div>
                        <h2>Vehicle Fitment</h2>
                    </div>
                    <button
                        type="button"
                        className="fitment-drawer-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={17} />
                    </button>
                </header>

                {/* STICKY PART NUMBER */}
                <div className="fitment-part-sticky">
                    <label>
                        Part Number
                        <input
                            type="text"
                            value={partNumber}
                            readOnly
                            placeholder="—"
                        />
                    </label>
                </div>

                {/* BODY */}
                <div className="fitment-drawer-body">
                    {loading ? (
                        <div className="fitment-loading">
                            <Loader2 size={16} className="spin" />
                            Loading fitment data...
                        </div>
                    ) : (
                        <>
                            {/* SELECTOR */}
                            <section className="fitment-selector">
                                <h3 className="fitment-section-title">
                                    Add Vehicle Variant
                                </h3>

                                <div className="fitment-selector-grid">
                                    <label className="fitment-field">
                                        <span>Make</span>
                                        <select
                                            value={selectedMake}
                                            onChange={(e) =>
                                                setSelectedMake(
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select make
                                            </option>
                                            {makes.map((m) => (
                                                <option
                                                    key={m.id}
                                                    value={m.id}
                                                >
                                                    {m.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="fitment-field">
                                        <span>Model</span>
                                        <select
                                            value={selectedModel}
                                            onChange={(e) =>
                                                setSelectedModel(
                                                    e.target.value
                                                )
                                            }
                                            disabled={
                                                !selectedMake ||
                                                loadingModels
                                            }
                                        >
                                            <option value="">
                                                {loadingModels
                                                    ? "Loading..."
                                                    : "Select model"}
                                            </option>
                                            {models.map((m) => (
                                                <option
                                                    key={m.id}
                                                    value={m.id}
                                                >
                                                    {m.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="fitment-field">
                                        <span>Year</span>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) =>
                                                setSelectedYear(
                                                    e.target.value
                                                )
                                            }
                                            disabled={
                                                !selectedModel ||
                                                loadingYears
                                            }
                                        >
                                            <option value="">
                                                {loadingYears
                                                    ? "Loading..."
                                                    : "Select year"}
                                            </option>
                                            {years.map((y) => (
                                                <option
                                                    key={y.id ?? y.value}
                                                    value={y.value ?? y.id}
                                                >
                                                    {y.label ?? y.value}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <div className="fitment-add-row">
                                    <button
                                        type="button"
                                        className="fitment-add-btn"
                                        onClick={handleAdd}
                                        disabled={!canAdd}
                                    >
                                        <Plus size={14} />
                                        Add
                                    </button>
                                    {isDuplicate && (
                                        <span className="fitment-hint-error">
                                            This variant is already added.
                                        </span>
                                    )}
                                </div>
                            </section>

                            {/* VEHICLE FITS */}
                            <section className="fitment-fits">
                                <h3 className="fitment-section-title">
                                    Vehicle Fits
                                    <span className="fitment-fits-count">
                                        {fits.length}
                                    </span>
                                </h3>

                                {fits.length === 0 ? (
                                    <div className="fitment-empty">
                                        No vehicles added yet. Pick make,
                                        model and year above.
                                    </div>
                                ) : (
                                    <ul className="fitment-fits-list">
                                        {fits.map((fit) => (
                                            <li
                                                key={fit.id}
                                                className="fitment-chip"
                                            >
                                                <span className="fitment-chip-icon">
                                                    <CheckCircle2 size={13} />
                                                </span>
                                                <span className="fitment-chip-text">
                                                    {fit.make} · {fit.model} ·{" "}
                                                    {fit.year}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="fitment-chip-remove"
                                                    onClick={() =>
                                                        handleRemove(fit.id)
                                                    }
                                                    aria-label="Remove"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </>
                    )}
                </div>

                {/* FOOTER */}
                <footer className="fitment-drawer-footer">
                    <button
                        type="button"
                        className="fitment-btn-secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="fitment-btn-primary"
                        onClick={handleSave}
                        disabled={saving || loading}
                    >
                        {saving ? "Saving..." : "Save Fitment"}
                    </button>
                </footer>
            </aside>
        </div>,
        document.body
    );
}

export default FitmentDrawer;