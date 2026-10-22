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
} from "../../../services/fitmentService";

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
        fits.map((f) => `${f.make}::${f.model}::${f.year}`.toUpperCase()),
      ),
    [fits],
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
      toast.error(error?.response?.data?.message || "Unable to save fitments.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- render ---------------- */
  return createPortal(
    <div
      className="fixed inset-0 z-[1200] bg-slate-900/40 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-[460px] h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <header className="flex-none flex justify-between items-start gap-3 p-4 px-5 pb-3 border-b border-slate-200 bg-white">
          <div>
            <div className="text-[#0063cc] text-[10px] font-extrabold tracking-widest uppercase mb-1">
              FITMENT
            </div>
            <h2 className="m-0 text-lg font-extrabold tracking-tight text-slate-900">
              Vehicle Fitment
            </h2>
          </div>
          <button
            type="button"
            className="w-[30px] h-[30px] inline-flex items-center justify-center bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-red-50 hover:border-red-600 hover:text-red-600 transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </header>

        {/* STICKY PART NUMBER */}
        <div className="flex-none p-3 px-5 bg-slate-50 border-b border-slate-200 sticky top-0 z-[5]">
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-900 uppercase tracking-wider">
            Part Number
            <input
              type="text"
              value={partNumber}
              readOnly
              placeholder="—"
              className="w-full h-[38px] px-3 bg-white border border-slate-300 rounded-md font-sans text-sm font-bold text-slate-900 outline-none"
            />
          </label>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 px-5 flex flex-col gap-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              Loading fitment data...
            </div>
          ) : (
            <>
              {/* SELECTOR */}
              <section className="bg-slate-50/60 p-4 border border-slate-200 rounded-lg">
                <h3 className="m-0 mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                  Add Vehicle Variant
                </h3>

                <div className="grid grid-cols-1 gap-2.5">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                    <span>Make</span>
                    <select
                      value={selectedMake}
                      onChange={(e) => setSelectedMake(e.target.value)}
                      className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="">Select make</option>
                      {makes.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                    <span>Model</span>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      disabled={!selectedMake || loadingModels}
                      className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">
                        {loadingModels ? "Loading..." : "Select model"}
                      </option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                    <span>Year</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      disabled={!selectedModel || loadingYears}
                      className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">
                        {loadingYears ? "Loading..." : "Select year"}
                      </option>
                      {years.map((y) => (
                        <option key={y.id ?? y.value} value={y.value ?? y.id}>
                          {y.label ?? y.value}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0063cc] hover:bg-[#0069d9] text-white rounded-md text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
                    onClick={handleAdd}
                    disabled={!canAdd}
                  >
                    <Plus size={14} />
                    Add
                  </button>
                  {isDuplicate && (
                    <span className="text-xs text-red-600 font-semibold">
                      This variant is already added.
                    </span>
                  )}
                </div>
              </section>

              {/* VEHICLE FITS */}
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-slate-700">
                    Vehicle Fits
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700">
                    {fits.length}
                  </span>
                </div>

                {fits.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                    No vehicles added yet. Pick make, model and year above.
                  </div>
                ) : (
                  <ul className="flex flex-col gap-1.5 m-0 p-0 list-none">
                    {fits.map((fit) => (
                      <li
                        key={fit.id}
                        className="flex items-center justify-between gap-2 p-2 px-3 bg-white border border-slate-200 rounded-md hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-emerald-600 flex-shrink-0">
                            <CheckCircle2 size={13} />
                          </span>
                          <span className="text-xs font-medium text-slate-800 truncate">
                            {fit.make} · {fit.model} · {fit.year}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="w-6 h-6 inline-flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                          onClick={() => handleRemove(fit.id)}
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
        <footer className="flex-none p-4 px-5 border-t border-slate-200 bg-white flex items-center justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-[#0063cc] hover:bg-[#0069d9] text-white rounded-md text-xs font-semibold cursor-pointer disabled:opacity-50 transition"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save Fitment"}
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

export default FitmentDrawer;
