import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import api from "../../../services/api";
import VehicleDrawer from "./VehicleDrawer";
import { showToast } from "./VehicleToast";

/* ---- Option lists ---- */
const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "LPG"];
const TRANSMISSIONS = ["Manual", "Automatic", "AMT", "CVT", "DCT", "iMT"];
const REGIONS = ["India", "Global", "Europe", "Middle East", "USA"];
const EMISSION_STANDARDS = ["BS3", "BS4", "BS6 Phase 1", "BS6 Phase 2", "Euro 5", "Euro 6"];
const DOOR_OPTIONS = [2, 3, 4, 5];
const MIN_YEAR = 1900;
const MAX_YEAR = 2099;

/* ------------------------------------------------------------------
   Combo — typeahead that picks an existing item OR creates a new one.
   ------------------------------------------------------------------ */
function Combo({
    id,
    label,
    placeholder,
    value,
    onChange,
    items = [],
    loading = false,
    disabled = false,
    required = false,
    allowCreate = false,
    emptyText = "No matches",
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [hi, setHi] = useState(0);
    const wrapRef = useRef(null);

    useEffect(() => {
        setQuery(value ? value.name : "");
    }, [value]);

    useEffect(() => {
        const onDocClick = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
                setQuery(value ? value.name : "");
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [value]);

    const trimmed = query.trim().toLowerCase();
    const selectedName = (value?.name || "").toLowerCase();
    const queryMatchesSelected = trimmed === selectedName;

    const matches = trimmed
        ? items.filter((it) => it.name.toLowerCase().includes(trimmed))
        : [];

    const exactMatch = items.find((it) => it.name.toLowerCase() === trimmed);
    const showCreate = allowCreate && trimmed.length > 0 && !exactMatch;

    const options = showCreate
        ? [...matches, { id: "__new__", name: query.trim(), __new: true }]
        : matches;

    const showMenu = open && !disabled && trimmed.length > 0 && !queryMatchesSelected;

    const pick = (item) => {
        onChange(item);
        setOpen(false);
    };

    const onKeyDown = (e) => {
        if (!showMenu) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, options.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const picked = options[hi];
            if (picked) pick(picked);
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    const handleInput = (e) => {
        const text = e.target.value;
        setQuery(text);
        setOpen(true);
        setHi(0);

        const lower = text.trim().toLowerCase();
        if (!lower) {
            onChange(null);
            return;
        }
        const exact = items.find((it) => it.name.toLowerCase() === lower);
        if (exact) onChange(exact);
        else onChange(null);
    };

    return (
        <div className="vm-field vm-ac" ref={wrapRef}>
            <label className="vm-label" htmlFor={id}>
                {label} {required && <span className="vm-req">*</span>}
            </label>

            <div className="vm-ac__wrap">
                <input
                    id={id}
                    type="text"
                    autoComplete="off"
                    className="vm-input vm-ac__input"
                    placeholder={placeholder}
                    value={query}
                    disabled={disabled}
                    onChange={handleInput}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                />

                {loading ? (
                    <Loader2 size={14} className="vm-ac__spin" />
                ) : (
                    !disabled && <ChevronDown size={14} className="vm-ac__caret" />
                )}

                {showMenu && (
                    <div className="vm-ac__menu" role="listbox">
                        {loading ? (
                            <div className="vm-ac__empty">Loading…</div>
                        ) : options.length === 0 ? (
                            <div className="vm-ac__empty">{emptyText}</div>
                        ) : (
                            options.slice(0, 60).map((item, i) => (
                                <button
                                    key={`${item.id}_${i}`}
                                    type="button"
                                    role="option"
                                    aria-selected={i === hi}
                                    className={
                                        "vm-ac__item" +
                                        (i === hi ? " is-hi" : "") +
                                        (item.__new ? " is-new" : "")
                                    }
                                    onMouseEnter={() => setHi(i)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => pick(item)}
                                >
                                    {item.__new ? (
                                        <>
                                            <Plus size={12} />
                                            <span>Create new: "{item.name}"</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{item.name}</span>
                                            {value?.id === item.id && <Check size={13} />}
                                        </>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {value?.__new && (
                <span className="vm-ac__hint">New — will be created when you save</span>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------
   Quick Add Vehicle drawer — full form, 3-column layout
   ------------------------------------------------------------------ */
function VehicleQuickAddDrawer({ open, onClose, onSaved }) {
    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [generations, setGenerations] = useState([]);
    const [variants, setVariants] = useState([]);

    const [makesLoading, setMakesLoading] = useState(false);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [generationsLoading, setGenerationsLoading] = useState(false);
    const [variantsLoading, setVariantsLoading] = useState(false);

    const [make, setMake] = useState(null);
    const [model, setModel] = useState(null);
    const [generation, setGeneration] = useState(null);

    // Generation details
    const [generationNumber, setGenerationNumber] = useState("");
    const [bodyType, setBodyType] = useState("");
    const [productionStartYear, setProductionStartYear] = useState("");
    const [productionEndYear, setProductionEndYear] = useState("");
    const [facelift, setFacelift] = useState(false);

    // Variant details
    const [variantName, setVariantName] = useState("");
    const [doors, setDoors] = useState("");
    const [variantStartYear, setVariantStartYear] = useState("");
    const [variantEndYear, setVariantEndYear] = useState("");
    const [fuelType, setFuelType] = useState("");
    const [transmission, setTransmission] = useState("");
    const [engineType, setEngineType] = useState("");
    const [engineCode, setEngineCode] = useState("");
    const [engineCapacity, setEngineCapacity] = useState("");
    const [emissionStandard, setEmissionStandard] = useState("");
    const [chassisCode, setChassisCode] = useState("");
    const [vinPrefix, setVinPrefix] = useState("");
    const [region, setRegion] = useState("");

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    /* ---------- Reset ---------- */
    useEffect(() => {
        if (!open) return;
        setMake(null);
        setModel(null);
        setGeneration(null);
        setModels([]);
        setGenerations([]);
        setVariants([]);
        setGenerationNumber("");
        setBodyType("");
        setProductionStartYear("");
        setProductionEndYear("");
        setFacelift(false);
        setVariantName("");
        setDoors("");
        setVariantStartYear("");
        setVariantEndYear("");
        setFuelType("");
        setTransmission("");
        setEngineType("");
        setEngineCode("");
        setEngineCapacity("");
        setEmissionStandard("");
        setChassisCode("");
        setVinPrefix("");
        setRegion("");
        setSaveError("");
    }, [open]);

    /* ---------- Loads ---------- */
    useEffect(() => {
        if (!open) return;
        setMakesLoading(true);
        api
            .get("/vehicle-makes")
            .then((r) => {
                const raw = r.data?.data ?? r.data?.content ?? r.data ?? [];
                setMakes(
                    raw.map((m) => ({
                        id: m.id,
                        name: m.makeName ?? m.name ?? `Make ${m.id}`,
                    }))
                );
            })
            .catch(() => showToast("Failed to load makes", "error"))
            .finally(() => setMakesLoading(false));
    }, [open]);

    useEffect(() => {
        if (!make || make.__new) {
            setModels([]);
            return;
        }
        setModelsLoading(true);
        api
            .get(`/vehicle-models/by-make/${make.id}`)
            .then((r) => {
                const raw = r.data?.data ?? r.data?.content ?? r.data ?? [];
                setModels(
                    raw.map((m) => ({
                        id: m.id,
                        name: m.modelName ?? m.name ?? `Model ${m.id}`,
                    }))
                );
            })
            .catch(() => showToast("Failed to load models", "error"))
            .finally(() => setModelsLoading(false));
    }, [make]);

    useEffect(() => {
        if (!model || model.__new) {
            setGenerations([]);
            return;
        }
        setGenerationsLoading(true);
        api
            .get(`/vehicle-generations/by-model/${model.id}`)
            .then((r) => {
                const raw = r.data?.data ?? r.data?.content ?? r.data ?? [];
                setGenerations(
                    raw.map((g) => ({
                        id: g.id,
                        name:
                            g.generationName ??
                            g.name ??
                            g.title ??
                            `Generation ${g.id}`,
                    }))
                );
            })
            .catch(() => showToast("Failed to load generations", "error"))
            .finally(() => setGenerationsLoading(false));
    }, [model]);

    useEffect(() => {
        if (!generation || generation.__new) {
            setVariants([]);
            return;
        }
        setVariantsLoading(true);
        api
            .get(`/vehicle-variants/by-generation/${generation.id}`)
            .then((r) => {
                const raw = r.data?.data ?? r.data?.content ?? r.data ?? [];
                setVariants(
                    raw.map((v) => ({
                        id: v.id,
                        name: v.variantName ?? v.name ?? `Variant ${v.id}`,
                    }))
                );
            })
            .catch(() => setVariants([]))
            .finally(() => setVariantsLoading(false));
    }, [generation]);

    const isNewGeneration = generation?.__new === true;

    /* ---------- Save ---------- */
    const canSave = Boolean(make && model && generation && variantName.trim()) && !saving;

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        setSaveError("");

        try {
            /* 1. Make */
            let makeId = make.id;
            if (make.__new) {
                const r = await api.post("/vehicle-makes", { makeName: make.name });
                makeId = r.data?.data?.id ?? r.data?.id;
            }

            /* 2. Model */
            let modelId = model.id;
            if (model.__new) {
                const r = await api.post("/vehicle-models", {
                    modelName: model.name,
                    vehicleMake: { id: String(makeId) },
                });
                modelId = r.data?.data?.id ?? r.data?.id;
            }

            /* 3. Generation */
            let generationId = generation.id;
            if (generation.__new) {
                const genPayload = {
                    generationName: generation.name,
                    vehicleModel: { id: String(modelId) },
                };
                if (generationNumber.trim()) genPayload.generationNumber = generationNumber.trim();
                if (bodyType.trim()) genPayload.bodyType = bodyType.trim();
                if (productionStartYear) genPayload.productionStartYear = String(productionStartYear);
                if (productionEndYear) genPayload.productionEndYear = String(productionEndYear);
                genPayload.facelift = facelift;

                const r = await api.post("/vehicle-generations", genPayload);
                generationId = r.data?.data?.id ?? r.data?.id;
            }

            /* 4. Variant */
            const variantPayload = {
                variantName: variantName.trim(),
                vehicleGeneration: { id: String(generationId) },
            };
            if (doors) variantPayload.doors = doors;
            if (variantStartYear) variantPayload.variantStartYear = String(variantStartYear);
            if (variantEndYear) variantPayload.variantEndYear = String(variantEndYear);
            if (fuelType) variantPayload.fuelType = fuelType;
            if (transmission) variantPayload.transmission = transmission;
            if (engineType.trim()) variantPayload.engineType = engineType.trim();
            if (engineCode.trim()) variantPayload.engineCode = engineCode.trim();
            if (engineCapacity.trim()) variantPayload.engineCapacity = engineCapacity.trim();
            if (emissionStandard) variantPayload.emissionStandard = emissionStandard;
            if (chassisCode.trim()) variantPayload.chassisCode = chassisCode.trim();
            if (vinPrefix.trim()) variantPayload.vinPrefix = vinPrefix.trim();
            if (region) variantPayload.region = region;

            await api.post("/vehicle-variants", variantPayload);

            showToast("Vehicle added", "success");
            onSaved?.();
            onClose();
        } catch (error) {
            const message =
                error.response?.data?.errors?.join(", ") ||
                error.response?.data?.message ||
                error.message ||
                "Error adding vehicle";
            setSaveError(message);
            showToast(message, "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <VehicleDrawer
            open={open}
            size="wide"
            eyebrow="Quick Add"
            onClose={onClose}
            title="Add Vehicle"
            description="Fill only what you know. Required: Make, Model, Generation, Variant name."
            footer={
                <>
                    <button
                        className="vm-btn vm-btn-secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        className="vm-btn vm-btn-primary"
                        onClick={handleSave}
                        disabled={!canSave}
                    >
                        {saving ? "Adding…" : "Add Vehicle"}
                    </button>
                </>
            }
        >
            <div className="vm-grid-1">

                {/* ================= HIERARCHY ================= */}
                <div className="vm-divider">Vehicle hierarchy</div>

                <div className="vm-grid-3">
                    <Combo
                        id="quick-make"
                        label="Make"
                        required
                        allowCreate
                        placeholder="Type or create…"
                        value={make}
                        onChange={(v) => {
                            setMake(v);
                            setModel(null);
                            setGeneration(null);
                        }}
                        items={makes}
                        loading={makesLoading}
                        emptyText="No makes"
                    />

                    <Combo
                        id="quick-model"
                        label="Model"
                        required
                        allowCreate
                        placeholder={make ? "Type or create…" : "Pick make first"}
                        value={model}
                        onChange={(v) => {
                            setModel(v);
                            setGeneration(null);
                        }}
                        items={models}
                        loading={modelsLoading}
                        disabled={!make}
                        emptyText="No models"
                    />

                    <Combo
                        id="quick-generation"
                        label="Generation"
                        required
                        allowCreate
                        placeholder={model ? "Type or create…" : "Pick model first"}
                        value={generation}
                        onChange={(v) => {
                            setGeneration(v);
                            setVariantName("");
                        }}
                        items={generations}
                        loading={generationsLoading}
                        disabled={!model}
                        emptyText="No generations"
                    />
                </div>

                {/* ================= GENERATION DETAILS ================= */}
                <div className="vm-divider">
                    Generation details
                    {generation && !isNewGeneration && (
                        <span className="vm-divider__note">— editing existing</span>
                    )}
                </div>

                <div className="vm-grid-3">
                    <div className="vm-field">
                        <label className="vm-label" htmlFor="gen-number">
                            Generation number
                        </label>
                        <input
                            id="gen-number"
                            type="text"
                            className="vm-input vm-mono"
                            placeholder="e.g. 5"
                            value={generationNumber}
                            onChange={(e) => setGenerationNumber(e.target.value)}
                            disabled={!isNewGeneration}
                        />
                    </div>

                    <div className="vm-field">
                        <label className="vm-label" htmlFor="gen-body">
                            Body type
                        </label>
                        <input
                            id="gen-body"
                            type="text"
                            className="vm-input"
                            placeholder="e.g. Hatchback"
                            value={bodyType}
                            onChange={(e) => setBodyType(e.target.value)}
                            disabled={!isNewGeneration}
                        />
                    </div>

                    <div className="vm-field">
                        <label className="vm-label" htmlFor="gen-facelift">
                            Facelift
                        </label>
                        <label className="vm-checkbox-row vm-checkbox-row--inline">
                            <input
                                id="gen-facelift"
                                type="checkbox"
                                checked={facelift}
                                onChange={(e) => setFacelift(e.target.checked)}
                                disabled={!isNewGeneration}
                            />
                            Facelift version
                        </label>
                    </div>
                </div>

                <div className="vm-grid-3">
                    <div className="vm-field">
                        <label className="vm-label" htmlFor="gen-start">
                            Production start year
                        </label>
                        <input
                            id="gen-start"
                            type="number"
                            min={MIN_YEAR}
                            max={MAX_YEAR}
                            className="vm-input vm-mono"
                            placeholder="e.g. 2020"
                            value={productionStartYear}
                            onChange={(e) => setProductionStartYear(e.target.value)}
                            disabled={!isNewGeneration}
                        />
                    </div>

                    <div className="vm-field">
                        <label className="vm-label" htmlFor="gen-end">
                            Production end year
                        </label>
                        <input
                            id="gen-end"
                            type="number"
                            min={MIN_YEAR}
                            max={MAX_YEAR}
                            className="vm-input vm-mono"
                            placeholder="e.g. 2024"
                            value={productionEndYear}
                            onChange={(e) => setProductionEndYear(e.target.value)}
                            disabled={!isNewGeneration}
                        />
                    </div>

                    <div />
                </div>

                {/* ================= VARIANT DETAILS ================= */}
                <div className="vm-divider">Variant details</div>

                <div className="vm-grid-3">
                    <div className="vm-field vm-ac">
                        <label className="vm-label" htmlFor="variant-name">
                            Variant name <span className="vm-req">*</span>
                        </label>
                        <input
                            id="variant-name"
                            type="text"
                            className="vm-input"
                            placeholder="e.g. ZXI+ AMT"
                            value={variantName}
                            onChange={(e) => setVariantName(e.target.value)}
                            disabled={!generation}
                        />
                        {generation && variants.length > 0 && (
                            <div className="vm-ac__chips">
                                {variants.slice(0, 6).map((v) => (
                                    <button
                                        key={v.id}
                                        type="button"
                                        className="vm-ac__chip"
                                        onClick={() => setVariantName(v.name)}
                                    >
                                        {v.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="vm-field">
                        <label className="vm-label" htmlFor="doors">Doors</label>
                        <select
                            id="doors"
                            className="vm-select"
                            value={doors}
                            onChange={(e) => setDoors(e.target.value)}
                        >
                            <option value="">Select</option>
                            {DOOR_OPTIONS.map((d) => (
                                <option key={d} value={d}>{d} doors</option>
                            ))}
                        </select>
                    </div>

                    <div className="vm-field">
                        <label className="vm-label" htmlFor="region">Region</label>
                        <select
                            id="region"
                            className="vm-select"
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                        >
                            <option value="">Select</option>
                            {REGIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="vm-grid-3">
                    <div className="vm-field">
                        <label className="vm-label" htmlFor="variant-start">
                            Start year
                        </label>
                        <input
                            id="variant-start"
                            type="number"
                            min={MIN_YEAR}
                            max={MAX_YEAR}
                            className="vm-input vm-mono"
                            placeholder="e.g. 2021"
                            value={variantStartYear}
                            onChange={(e) => setVariantStartYear(e.target.value)}
                        />
                    </div>

                    <div className="vm-field">
                        <label className="vm-label" htmlFor="variant-end">
                            End year
                        </label>
                        <input
                            id="variant-end"
                            type="number"
                            min={MIN_YEAR}
                            max={MAX_YEAR}
                            className="vm-input vm-mono"
                            placeholder="e.g. 2024"
                            value={variantEndYear}
                            onChange={(e) => setVariantEndYear(e.target.value)}
                        />
                    </div>

                    <div className="vm-field">
                        <label className="vm-label" htmlFor="fuel">Fuel type</label>
                        <select
                            id="fuel"
                            className="vm-select"
                            value={fuelType}
                            onChange={(e) => setFuelType(e.target.value)}
                        >
                            <option value="">Select</option>
                            {FUEL_TYPES.map((f) => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="vm-grid-3">
                    <div className="vm-field">
                        <label className="vm-label" htmlFor="transmission">Transmission</label>
                        <select
                            id="transmission"
                            className="vm-select"
                            value={transmission}
                            onChange={(e) => setTransmission(e.target.value)}
                        >
                            <option value="">Select</option>
                            {TRANSMISSIONS.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div className="vm-field">
                        <label className="vm-label" htmlFor="engine-type">Engine type</label>
                        <input
                            id="engine-type"
                            type="text"
                            className="vm-input"
                            placeholder="e.g. K-Series"
                            value={engineType}
                            onChange={(e) => setEngineType(e.target.value)}
                        />
                    </div>

                    <div className="vm-field">
                        <label className="vm-label" htmlFor="engine-code">Engine code</label>
                        <input
                            id="engine-code"
                            type="text"
                            className="vm-input vm-mono"
                            placeholder="e.g. K12N"
                            value={engineCode}
                            onChange={(e) => setEngineCode(e.target.value)}
                        />
                    </div>
                </div>

                <div className="vm-grid-3">
                    <div className="vm-field">
                        <label className="vm-label" htmlFor="engine-capacity">Engine capacity</label>
                        <input
                            id="engine-capacity"
                            type="text"
                            className="vm-input vm-mono"
                            placeholder="e.g. 1197cc"
                            value={engineCapacity}
                            onChange={(e) => setEngineCapacity(e.target.value)}
                        />
                    </div>

                    <div className="vm-field">
                        <label className="vm-label" htmlFor="emission">Emission standard</label>
                        <select
                            id="emission"
                            className="vm-select"
                            value={emissionStandard}
                            onChange={(e) => setEmissionStandard(e.target.value)}
                        >
                            <option value="">Select</option>
                            {EMISSION_STANDARDS.map((e) => (
                                <option key={e} value={e}>{e}</option>
                            ))}
                        </select>
                    </div>

                    <div className="vm-field">
                        <label className="vm-label" htmlFor="chassis">Chassis code</label>
                        <input
                            id="chassis"
                            type="text"
                            className="vm-input vm-mono"
                            placeholder="e.g. E210-AABDKW"
                            value={chassisCode}
                            onChange={(e) => setChassisCode(e.target.value)}
                        />
                    </div>
                </div>

                <div className="vm-grid-3">
                    <div className="vm-field">
                        <label className="vm-label" htmlFor="vin">VIN prefix</label>
                        <input
                            id="vin"
                            type="text"
                            className="vm-input vm-mono"
                            placeholder="e.g. MA3EJKD1S"
                            value={vinPrefix}
                            onChange={(e) => setVinPrefix(e.target.value)}
                        />
                    </div>

                    <div />
                    <div />
                </div>

            </div>

            {saveError && (
                <div className="vm-alert vm-alert-error" style={{ margin: "12px 0 0" }}>
                    <span className="vm-alert-icon"><span>!</span></span>
                    <span>{saveError}</span>
                </div>
            )}
        </VehicleDrawer>
    );
}

export default VehicleQuickAddDrawer;