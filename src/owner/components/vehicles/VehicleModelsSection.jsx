import { useState, useEffect } from "react";

import axios from "axios";

function VehicleModelsSection() {

    const [modelName, setModelName] = useState("");

    const [selectedMakeId, setSelectedMakeId] = useState("");

    const [makes, setMakes] = useState([]);

    const [models, setModels] = useState([]);

    const [message, setMessage] = useState("");

    const loadMakes = async () => {

        try {

            const response =
                await axios.get(
                    "http://localhost:8080/vehicle-makes"
                );

            setMakes(response.data);

        } catch (error) {

            console.log(error);
        }
    }

    const loadAllModels = async () => {

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

    const loadModels = async (makeId) => {

        try {

            if (!makeId) {

                loadAllModels();

                return;
            }

            const response =
               await axios.get(
    `http://localhost:8080/vehicle-models/by-make/${makeId}`
);

            setModels(response.data);

        } catch (error) {

            console.log(error);
        }
    }

    const saveModel = async () => {
        if (!selectedMakeId) {
    setMessage("Please select make");
    return;
}

if (!modelName.trim()) {
    setMessage("Model name is required");
    return;
}
        try {

            const response =
                await axios.post(
    "http://localhost:8080/vehicle-models",
                    {
                        modelName: modelName,
                        vehicleMake: {
                            id: selectedMakeId
                        }
                    }
                );

            setMessage(response.data);

            setModelName("");

            loadModels(selectedMakeId);

        } catch (error) {

            console.log(error);

            setMessage("Error saving model");
        }
    }

    useEffect(() => {

        loadMakes();

        loadAllModels();

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
                    maxWidth: "500px"
                }}
            >

                <h3>Add Vehicle Model</h3>

                <select
                    value={selectedMakeId}
                    onChange={(e) => {

                        setSelectedMakeId(e.target.value);

                        loadModels(e.target.value);
                    }}
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                >

                    <option value="">
                        Select Make
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

                <input
                    type="text"
                    placeholder="Enter Model Name"
                    value={modelName}
                    onChange={(e) =>
                        setModelName(e.target.value)
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <button
                    onClick={saveModel}
                    style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        cursor: "pointer"
                    }}
                >
                    Save Model
                </button>

                <p style={{ marginTop: "20px" }}>
                    {message}
                </p>

            </div>

            <div
                style={{
                    marginTop: "40px",
                    maxWidth: "500px"
                }}
            >

                <h3>Available Models</h3>

                {
                    models.length === 0
                    ?
                    <p>No models found</p>
                    :
                    models.map((model) => (

                        <div
                            key={model.id}
                            style={{
                                padding: "15px",
                                border: "1px solid #ccc",
                                borderRadius: "10px",
                                marginTop: "10px"
                            }}
                        >

                            <strong>
                                {model.vehicleMake?.makeName}
                            </strong>

                            {" → "}

                            {model.modelName}

                        </div>
                    ))
                }

            </div>

        </div>
    )
}

export default VehicleModelsSection;