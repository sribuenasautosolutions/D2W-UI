import { useEffect, useState } from "react";
import "./POSVehicleSelector.css";

import {
    getAllMakes,
    getModelsByMake,
    getYearsByModel,
    getVariantsByModelAndYear
} from "../../../services/vehicleService";

function POSVehicleSelector({
    onVariantSelected,
    onLabelChange
}) {

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

            const data =
                await getVariantsByModelAndYear(selectedModel, year);

            setVariants(data || []);

        } catch (err) {

            console.error(err);
            setError("Unable to load variants.");

        } finally {

            setLoading(false);

        }

    };

    const handleVariantChange = (e) => {

        setSelectedVariant(e.target.value);

    };

    const selectedMakeObj =
        makes.find(x => String(x.id) === String(selectedMake));

    const selectedModelObj =
        models.find(x => String(x.id) === String(selectedModel));

    const selectedVariantObj =
        variants.find(x => String(x.id) === String(selectedVariant));

    const handleSearch = () => {

        if (!selectedVariantObj) {

            alert("Please select a vehicle variant.");

            return;

        }

        if (onVariantSelected) {

            onVariantSelected(selectedVariantObj.id);

        }

        if (onLabelChange) {

            onLabelChange(
                `${selectedMakeObj?.makeName || ""}
                 ${selectedModelObj?.modelName || ""}
                 ${selectedYear || ""}
                 ${selectedVariantObj?.variantName || ""}`
            );

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
        setError("");
        onVariantSelected?.("");
        onLabelChange?.("");
    };

    return (

        <div className="vehicle-card">

            <div className="vehicle-header">

                <h3>Select Vehicle</h3>

                <p>
                    Choose Make, Model,
                    Year and Variant
                </p>

            </div>

            {error && (

                <div className="vehicle-error">

                    {error}

                </div>

            )}

            <div className="vehicle-field">

                <label>Make</label>

                <select
                    value={selectedMake}
                    onChange={handleMakeChange}
                >

                    <option value="">
                        Select Make
                    </option>

                    {makes.map(make => (

                        <option
                            key={make.id}
                            value={make.id}
                        >
                            {make.makeName}
                        </option>

                    ))}

                </select>

            </div>

            <div className="vehicle-field">

                <label>Model</label>

                <select
                    value={selectedModel}
                    onChange={handleModelChange}
                    disabled={!selectedMake}
                >

                    <option value="">
                        Select Model
                    </option>

                    {models.map(model => (

                        <option
                            key={model.id}
                            value={model.id}
                        >
                            {model.modelName}
                        </option>

                    ))}

                </select>

            </div>

            <div className="vehicle-field">

               <label>Year</label>

                <select
                    value={selectedYear}
                    onChange={handleYearChange}
                    disabled={!selectedModel}
                >

                    <option value="">
                         Select Year
                    </option>
        {years.map((year) => (

            <option
            key={year}
            value={year}
            >
                {year}
             </option>

            ))}

                </select>

            </div>
                        <div className="vehicle-field">

                <label>Variant</label>

                <select
                    value={selectedVariant}
                    onChange={handleVariantChange}
                    disabled={!selectedYear}
                >

                    <option value="">
                        Select Variant
                    </option>

                    {variants.map((variant) => (

                        <option
                            key={variant.id}
                            value={variant.id}
                        >
                            {variant.vehicleFullName ||
                                variant.variantFullName ||
                                variant.variantName}
                        </option>

                    ))}

                </select>

            </div>

            <div className="vehicle-summary">

                <h4>Selected Vehicle</h4>

                <div className="summary-box">

                    {selectedVariantObj ? (

                        <>
                            <div>
                                <strong>Make :</strong>{" "}
                                {selectedMakeObj?.makeName}
                            </div>

                            <div>
                                <strong>Model :</strong>{" "}
                                {selectedModelObj?.modelName}
                            </div>

                            <div>
                            <strong>Year :</strong>{" "}
                            {selectedYear}
                            </div>

                            <div>
                                <strong>Variant :</strong>{" "}
                                {selectedVariantObj?.variantName}
                            </div>

                            <div className="vehicle-name">

                                {selectedVariantObj?.vehicleFullName ||
                                    selectedVariantObj?.variantFullName}

                            </div>
                        </>

                    ) : (

                        <div className="placeholder">

                            No vehicle selected

                        </div>

                    )}

                </div>

            </div>

            <div className="vehicle-actions">
            <button
                className="vehicle-search-btn"
                onClick={handleSearch}
                disabled={!selectedVariant || loading}
            >

                {loading
                    ? "Loading..."
                    : "Show Products"}

            </button>

            <button
                type="button"
                className="vehicle-clear-btn"
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
