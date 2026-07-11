import {
useEffect,
useState
}
from "react";

import {
getAllMakes,
getModelsByMake,
getGenerationsByModel,
getVariantsByGeneration
}
from "../../services/vehicleService";

function POSVehicleSelector({
onVariantSelected
}) {


const [makes,
    setMakes] =
        useState([]);

const [models,
    setModels] =
        useState([]);

const [generations,
    setGenerations] =
        useState([]);

const [variants,
    setVariants] =
        useState([]);

const [selectedMake,
    setSelectedMake] =
        useState("");

const [selectedModel,
    setSelectedModel] =
        useState("");

const [selectedGeneration,
    setSelectedGeneration] =
        useState("");

const [selectedVariant,
    setSelectedVariant] =
        useState("");

useEffect(() => {

    loadMakes();

}, []);

const loadMakes =
    async () => {

        try {

            const data =
                await getAllMakes();

            setMakes(data);

        } catch(error) {

            console.error(error);
        }
    };

const handleMakeChange =
    async (e) => {

        const makeId =
            e.target.value;

        setSelectedMake(makeId);

        setSelectedModel("");
        setSelectedGeneration("");
        setSelectedVariant("");

        setModels([]);
        setGenerations([]);
        setVariants([]);

        try {

            const data =
                await getModelsByMake(
                    makeId
                );

            setModels(data);

        } catch(error) {

            console.error(error);
        }
    };

const handleModelChange =
    async (e) => {

        const modelId =
            e.target.value;

        setSelectedModel(modelId);

        setSelectedGeneration("");
        setSelectedVariant("");

        setGenerations([]);
        setVariants([]);

        try {

            const data =
                await getGenerationsByModel(
                    modelId
                );

            setGenerations(data);

        } catch(error) {

            console.error(error);
        }
    };

const handleGenerationChange =
    async (e) => {

        const generationId =
            e.target.value;

        setSelectedGeneration(
            generationId
        );

        setSelectedVariant("");

        setVariants([]);

        try {

            const data =
                await getVariantsByGeneration(
                    generationId
                );

            setVariants(data);

        } catch(error) {

            console.error(error);
        }
    };

const handleSearch =
    () => {

        if(!selectedVariant)
        {
            alert(
                "Please Select Variant"
            );

            return;
        }

        onVariantSelected(
            selectedVariant
        );
    };

return (

    <div
        style={{
            display: "grid",
            gridTemplateColumns:
                "repeat(5,1fr)",
            gap: "12px"
        }}
    >

        <select
            value={selectedMake}
            onChange={handleMakeChange}
            style={{
                padding: "12px",
                borderRadius: "8px"
            }}
        >
            <option value="">
                Make
            </option>

            {
                makes.map((make) => (

                    <option
                        key={make.id}
                        value={make.id}
                    >
                        {make.makeName}
                    </option>

                ))
            }

        </select>

        <select
            value={selectedModel}
            onChange={handleModelChange}
            style={{
                padding: "12px",
                borderRadius: "8px"
            }}
        >
            <option value="">
                Model
            </option>

            {
                models.map((model) => (

                    <option
                        key={model.id}
                        value={model.id}
                    >
                        {model.modelName}
                    </option>

                ))
            }

        </select>

        <select
            value={selectedGeneration}
            onChange={handleGenerationChange}
            style={{
                padding: "12px",
                borderRadius: "8px"
            }}
        >
            <option value="">
                Generation
            </option>

            {
                generations.map((generation) => (

                    <option
                        key={generation.id}
                        value={generation.id}
                    >
                        {generation.generationName}
                    </option>

                ))
            }

        </select>

        <select
            value={selectedVariant}
            onChange={(e) =>
                setSelectedVariant(
                    e.target.value
                )
            }
            style={{
                padding: "12px",
                borderRadius: "8px"
            }}
        >
            <option value="">
                Variant
            </option>

            {
                variants.map((variant) => (

                    <option
                        key={variant.id}
                        value={variant.id}
                    >
                        {variant.fullName}
                    </option>

                ))
            }

        </select>

        <button
            onClick={handleSearch}
            style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px"
            }}
        >
            View Products
        </button>

    </div>

);


}

export default POSVehicleSelector;
