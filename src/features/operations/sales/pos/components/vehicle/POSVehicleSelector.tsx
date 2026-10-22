import { useEffect, useState } from "react";
import {
  getAllMakes,
  getModelsByMake,
  getYearsByModel,
  getVariantsByModelAndYear,
} from "../../../../../../services/vehicleService";

function POSVehicleSelector({ onVariantSelected, onLabelChange }) {
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);
  const [variants, setVariants] = useState([]);

  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMakes();
  }, []);

  const loadMakes = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAllMakes();
      setMakes(data || []);
    } catch (err) {
      console.error(err);
      setError("Unable to load vehicle makes.");
    } finally {
      setLoading(false);
    }
  };

  const handleMakeChange = async (e) => {
    const makeId = e.target.value;

    setSelectedMake(makeId);

    setSelectedModel("");
    setSelectedYear("");
    setSelectedVariant("");

    setModels([]);
    setYears([]);
    setVariants([]);

    if (!makeId) return;

    try {
      setLoading(true);

      const data = await getModelsByMake(makeId);

      setModels(data || []);
    } catch (err) {
      console.error(err);
      setError("Unable to load vehicle models.");
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = async (e) => {
    const modelId = e.target.value;

    setSelectedModel(modelId);

    setSelectedYear("");
    setSelectedVariant("");

    setYears([]);
    setVariants([]);

    if (!modelId) return;

    try {
      setLoading(true);

      const data = await getYearsByModel(modelId);

      setYears(data || []);
    } catch (err) {
      console.error(err);
      setError("Unable to load vehicle years.");
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = async (e) => {
    const year = e.target.value;

    setSelectedYear(year);

    setSelectedVariant("");

    setVariants([]);

    if (!year) return;

    try {
      setLoading(true);

      const data = await getVariantsByModelAndYear(selectedModel, year);

      setVariants(data || []);
    } catch (err) {
      console.error(err);
      setError("Unable to load vehicle variants.");
    } finally {
      setLoading(false);
    }
  };

  const handleVariantChange = (e) => {
    setSelectedVariant(e.target.value);
  };

  const handleSearch = () => {
    if (!selectedVariant) return;

    const variant = variants.find(
      (v) => String(v.variantId) === String(selectedVariant),
    );

    const make = makes.find((m) => String(m.makeId) === String(selectedMake));

    const model = models.find(
      (m) => String(m.modelId) === String(selectedModel),
    );

    if (onVariantSelected) {
      onVariantSelected(selectedVariant, {
        variant,
        make,
        model,
        year: selectedYear,
      });
    }

    const fullName =
      variant?.vehicleFullName ||
      variant?.variantFullName ||
      `${make?.makeName || ""} ${model?.modelName || ""} ${selectedYear || ""} ${variant?.variantName || ""}`.trim();

    if (onLabelChange) {
      onLabelChange(fullName);
    }
  };

  const handleClear = () => {
    setSelectedMake("");
    setSelectedModel("");
    setSelectedYear("");
    setSelectedVariant("");

    setModels([]);
    setYears([]);
    setVariants([]);

    if (onVariantSelected) {
      onVariantSelected(null, null);
    }

    if (onLabelChange) {
      onLabelChange("");
    }
  };

  const selectedMakeObj = makes.find(
    (m) => String(m.makeId) === String(selectedMake),
  );

  const selectedModelObj = models.find(
    (m) => String(m.modelId) === String(selectedModel),
  );

  const selectedVariantObj = variants.find(
    (v) => String(v.variantId) === String(selectedVariant),
  );

  return (
    <div className="w-full bg-transparent border-0 p-0 m-0 shadow-none">
      {error && (
        <div className="bg-[#fff1f2] text-[#dc2626] border border-[#fecdd3] rounded-md p-2 mb-3 text-xs">
          {error}
        </div>
      )}

      <div className="mb-3">
        <label className="block text-[11px] text-[#64748b] mb-1 font-medium">
          Make
        </label>

        <select
          value={selectedMake}
          onChange={handleMakeChange}
          disabled={loading}
          className="w-full h-[34px] border border-[#d1d5db] rounded-md bg-white px-3 text-[13px] outline-none transition focus:border-[#2563eb] disabled:bg-[#f8fafc] disabled:text-[#94a3b8] disabled:cursor-not-allowed"
        >
          <option value="">Select Make</option>

          {makes.map((m) => (
            <option key={m.makeId} value={m.makeId}>
              {m.makeName}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-[11px] text-[#64748b] mb-1 font-medium">
          Model
        </label>

        <select
          value={selectedModel}
          onChange={handleModelChange}
          disabled={!selectedMake || loading}
          className="w-full h-[34px] border border-[#d1d5db] rounded-md bg-white px-3 text-[13px] outline-none transition focus:border-[#2563eb] disabled:bg-[#f8fafc] disabled:text-[#94a3b8] disabled:cursor-not-allowed"
        >
          <option value="">Select Model</option>

          {models.map((m) => (
            <option key={m.modelId} value={m.modelId}>
              {m.modelName}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-[11px] text-[#64748b] mb-1 font-medium">
          Year
        </label>

        <select
          value={selectedYear}
          onChange={handleYearChange}
          disabled={!selectedModel || loading}
          className="w-full h-[34px] border border-[#d1d5db] rounded-md bg-white px-3 text-[13px] outline-none transition focus:border-[#2563eb] disabled:bg-[#f8fafc] disabled:text-[#94a3b8] disabled:cursor-not-allowed"
        >
          <option value="">Select Year</option>

          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-[11px] text-[#64748b] mb-1 font-medium">
          Variant
        </label>

        <select
          value={selectedVariant}
          onChange={handleVariantChange}
          disabled={!selectedYear || loading}
          className="w-full h-[34px] border border-[#d1d5db] rounded-md bg-white px-3 text-[13px] outline-none transition focus:border-[#2563eb] disabled:bg-[#f8fafc] disabled:text-[#94a3b8] disabled:cursor-not-allowed"
        >
          <option value="">Select Variant</option>

          {variants.map((v) => (
            <option key={v.variantId} value={v.variantId}>
              {v.variantName}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 p-2 border border-[#e5e7eb] rounded-md bg-[#f8fafc]">
        <h4 className="m-0 mb-2 text-xs text-[#475569] font-medium">
          Selected Vehicle
        </h4>

        <div className="text-xs text-[#334155] leading-[18px]">
          {selectedVariantObj ? (
            <>
              <div>
                <strong>Make :</strong> {selectedMakeObj?.makeName}
              </div>

              <div>
                <strong>Model :</strong> {selectedModelObj?.modelName}
              </div>

              <div>
                <strong>Year :</strong> {selectedYear}
              </div>

              <div>
                <strong>Variant :</strong> {selectedVariantObj?.variantName}
              </div>

              <div className="mt-2 font-semibold text-[#2563eb]">
                {selectedVariantObj?.vehicleFullName ||
                  selectedVariantObj?.variantFullName}
              </div>
            </>
          ) : (
            <div className="text-[#94a3b8] italic">No vehicle selected</div>
          )}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <button
          className="flex-1 h-[34px] mt-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white border-none rounded-md text-[13px] cursor-pointer font-medium disabled:bg-[#94a3b8] disabled:cursor-not-allowed transition"
          onClick={handleSearch}
          disabled={!selectedVariant || loading}
        >
          {loading ? "Loading..." : "Show Products"}
        </button>

        <button
          type="button"
          className="h-[34px] mt-3 px-3 border border-[#cbd5e1] rounded-md bg-white text-[#475569] text-[13px] cursor-pointer whitespace-nowrap hover:bg-[#f8fafc] hover:border-[#94a3b8] transition"
          onClick={handleClear}
          disabled={loading && makes.length === 0}
        >
          Clear Vehicle
        </button>
      </div>
    </div>
  );
}

export default POSVehicleSelector;
