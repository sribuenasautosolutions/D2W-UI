import { useEffect, useState } from "react";

import {
    getYears,
    getMakesByYear,
    getModelsByYearAndMake,
    getVariantsByYearMakeModel
}
from "../../../services/vehicleService";

const sel = {
    width: "100%",
    height: "34px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    background: "#f8fafc",
    color: "#1e293b",
    fontSize: "13px",
    padding: "0 10px",
    boxSizing: "border-box"
};

const lbl = {
    fontSize: "11px",
    color: "#64748b",
    marginBottom: "4px",
    marginTop: "10px",
    display: "block"
};

const showBtn = {
    width: "100%",
    height: "34px",
    marginTop: "12px",
    background: "#2563eb",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: "500"
};

function POSVehicleSelector({
    onVariantSelected,
    onLabelChange
}) {

    const [years, setYears] =
        useState([]);

    const [makes, setMakes] =
        useState([]);

    const [models, setModels] =
        useState([]);

    const [variants, setVariants] =
        useState([]);

    const [selectedYear, setSelectedYear] =
        useState("");

    const [selectedMake, setSelectedMake] =
        useState("");

    const [selectedModel, setSelectedModel] =
        useState("");

    const [selectedVariant, setSelectedVariant] =
        useState("");

    useEffect(() => {

        loadYears();

    }, []);

    const loadYears = async () => {

        try {

           const data = await getYears();

console.log(data);

setYears(data);

        } catch (error) {

            console.error(error);
        }
    };

    const handleYearChange = async (e) => {

        const year =
            e.target.value;

        setSelectedYear(year);

        setSelectedMake("");
        setSelectedModel("");
        setSelectedVariant("");

        setMakes([]);
        setModels([]);
        setVariants([]);

        if (!year) {
            return;
        }

        try {

            const data =
                await getMakesByYear(year);

            setMakes(data);

        } catch (error) {

            console.error(error);
        }
    };

    const handleMakeChange = async (e) => {

        const make =
            e.target.value;

        setSelectedMake(make);

        setSelectedModel("");
        setSelectedVariant("");

        setModels([]);
        setVariants([]);

        if (!make) {
            return;
        }

        try {

            const data =
                await getModelsByYearAndMake(
                    selectedYear,
                    make
                );

            setModels(data);

        } catch (error) {

            console.error(error);
        }
    };

    const handleModelChange = async (e) => {

        const model =
            e.target.value;

        setSelectedModel(model);

        setSelectedVariant("");

        setVariants([]);

        if (!model) {
            return;
        }

        try {

            const data =
                await getVariantsByYearMakeModel(
                    selectedYear,
                    selectedMake,
                    model
                );

            setVariants(data);

        } catch (error) {

            console.error(error);
        }
    };

    const handleVariantChange = (e) => {

        setSelectedVariant(
            e.target.value
        );
    };

    const handleSearch = () => {

        if (!selectedVariant) {

            alert(
                "Please Select Variant"
            );

            return;
        }

        onVariantSelected(
            selectedVariant
        );

        if (onLabelChange) {

            onLabelChange(

                `${selectedYear}
                 ${selectedMake}
                 ${selectedModel}
                 ${selectedVariant}`

            );
        }
    };

    return (

        <div>

            <label style={lbl}>
                Year
            </label>

            <select
                value={selectedYear}
                onChange={handleYearChange}
                style={sel}
            >
                <option value="">
                    Select Year
                </option>

                {years.map(year => (

                    <option
                        key={year}
                        value={year}
                    >
                        {year}
                    </option>

                ))}
            </select>

            <label style={lbl}>
                Make
            </label>

            <select
                value={selectedMake}
                onChange={handleMakeChange}
                style={sel}
                disabled={!selectedYear}
            >
                <option value="">
                    Select Make
                </option>

                {makes.map(make => (

                    <option
                        key={make}
                        value={make}
                    >
                        {make}
                    </option>

                ))}
            </select>

            <label style={lbl}>
                Model
            </label>

            <select
                value={selectedModel}
                onChange={handleModelChange}
                style={sel}
                disabled={!selectedMake}
            >
                <option value="">
                    Select Model
                </option>

                {models.map(model => (

                    <option
                        key={model}
                        value={model}
                    >
                        {model}
                    </option>

                ))}
            </select>

            <label style={lbl}>
                Variant
            </label>

            <select
                value={selectedVariant}
                onChange={handleVariantChange}
                style={sel}
                disabled={!selectedModel}
            >
                <option value="">
                    Select Variant
                </option>

                {variants.map(variant => (

                    <option
                        key={variant.id}
                        value={variant.id}
                    >
                        {variant.fullName}
                    </option>

                ))}
            </select>

            <button
                onClick={handleSearch}
                style={showBtn}
            >
                Show Products
            </button>

        </div>
    );
}

export default POSVehicleSelector;