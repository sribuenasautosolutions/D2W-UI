import { useState, useEffect } from "react";

import axios from "axios";

function VehicleGenerationsSection() {

    const [generationName, setGenerationName] = useState("");

    const [startYear, setStartYear] = useState("");

    const [endYear, setEndYear] = useState("");

    const [selectedModelId, setSelectedModelId] = useState("");

    const [models, setModels] = useState([]);

    const [generations, setGenerations] = useState([]);

    const [message, setMessage] = useState("");

    const loadModels = async () => {

        try {

            const response =
                await axios.get(
    "http://localhost:8080/vehicle-models"
);

            setModels(response.data);

        } catch (error) {

            console.log(error);
        }
    }

    const loadAllGenerations = async () => {

        try {

            const response =
               await axios.get(
    "http://localhost:8080/vehicle-generations"
);

            setGenerations(response.data);

        } catch (error) {

            console.log(error);
        }
    }

    const loadGenerationsByModel = async (modelId) => {

        try {

            if (!modelId) {

                loadAllGenerations();

                return;
            }

            const response =
                await axios.get(
    `http://localhost:8080/vehicle-generations/by-model/${modelId}`
);

            setGenerations(response.data);

        } catch (error) {

            console.log(error);
        }
    }

    const saveGeneration = async () => {
        if (!selectedModelId) {
    setMessage("Please select model");
    return;
}

if (!generationName.trim()) {
    setMessage("Generation name is required");
    return;
}

if (!startYear) {
    setMessage("Start year required");
    return;
}

if (!endYear) {
    setMessage("End year required");
    return;
}

if (Number(startYear) > Number(endYear)) {
    setMessage(
        "Start year cannot be greater than end year"
    );
    return;
}
        try {

            const response =
                await axios.post(
                    "http://localhost:8080/vehicle-generations",
                    {
                        generationName: generationName,
                        startYear: startYear,
                        endYear: endYear,
                        vehicleModel: {
                            id: selectedModelId
                        }
                    }
                );

            setMessage(response.data);

            setGenerationName("");

            setStartYear("");

            setEndYear("");

            loadGenerationsByModel(selectedModelId);

        } catch (error) {

            console.log(error);

            setMessage("Error saving generation");
        }
    }

    useEffect(() => {

        loadModels();

        loadAllGenerations();

    }, []);

    return (

        <div
            style={{
                marginTop: "50px"
            }}
        >

            <div
                style={{
                    padding: "20px",
                    border: "1px solid #ccc",
                    borderRadius: "10px",
                    maxWidth: "600px"
                }}
            >

                <h3>Add Vehicle Generation</h3>

                <select
                    value={selectedModelId}
                    onChange={(e) => {

                        setSelectedModelId(e.target.value);

                        loadGenerationsByModel(
                            e.target.value
                        );
                    }}
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                >

                    <option value="">
                        Select Model
                    </option>

                    {
                        models.map((model) => (

                            <option
                                key={model.id}
                                value={model.id}
                            >
                                {model.vehicleMake?.makeName}
                                {" → "}
                                {model.modelName}
                            </option>
                        ))
                    }

                </select>

                <input
                    type="text"
                    placeholder="Generation Name"
                    value={generationName}
                    onChange={(e) =>
                        setGenerationName(e.target.value)
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <input
                    type="number"
                    placeholder="Start Year"
                    value={startYear}
                    onChange={(e) =>
                        setStartYear(e.target.value)
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <input
                    type="number"
                    placeholder="End Year"
                    value={endYear}
                    onChange={(e) =>
                        setEndYear(e.target.value)
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <button
                    onClick={saveGeneration}
                    style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        cursor: "pointer"
                    }}
                >
                    Save Generation
                </button>

                <p style={{ marginTop: "20px" }}>
                    {message}
                </p>

            </div>

            <div
                style={{
                    marginTop: "40px",
                    maxWidth: "700px"
                }}
            >

                <h3>Available Generations</h3>

                {
                    generations.length === 0
                    ?
                    <p>No generations found</p>
                    :
                    generations.map((generation) => (

                        <div
                            key={generation.id}
                            style={{
                                padding: "15px",
                                border: "1px solid #ccc",
                                borderRadius: "10px",
                                marginTop: "10px"
                            }}
                        >

                            <strong>
                                {generation.vehicleModel
                                    ?.vehicleMake
                                    ?.makeName}
                            </strong>

                            {" → "}

                            {generation.vehicleModel
                                ?.modelName}

                            {" → "}

                            {generation.generationName}

                            {" ("}

                            {generation.startYear}

                            {" - "}

                            {generation.endYear}

                            {")"}

                        </div>
                    ))
                }

            </div>

        </div>
    )
}

export default VehicleGenerationsSection;