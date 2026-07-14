import { useState, useEffect } from "react";

import api from "../../../services/api";

function VehicleVariantsSection() {

    const [variantName, setVariantName] = useState("");

    const [startYear, setStartYear] = useState("");

    const [endYear, setEndYear] = useState("");

    const [engineCode, setEngineCode] = useState("");

    const [fuelType, setFuelType] = useState("");

    const [transmission, setTransmission] = useState("");

    const [chassisCode, setChassisCode] = useState("");

    const [region, setRegion] = useState("");

    const [selectedGenerationId, setSelectedGenerationId]
        = useState("");

    const [generations, setGenerations]
        = useState([]);

    const [variants, setVariants]
        = useState([]);

    const [message, setMessage]
        = useState("");

    const loadGenerations = async () => {

        try {

            const response =
               await api.get(
    "/vehicle-generations"
);

            setGenerations(response.data);

        } catch (error) {

            console.log(error);
        }
    }

    const loadAllVariants = async () => {

        try {

            const response =
               await api.get(
    "/vehicle-variants"
);

            setVariants(response.data);

        } catch (error) {

            console.log(error);
        }
    }

    const loadVariantsByGeneration = async (
        generationId
    ) => {

        try {

            if (!generationId) {

                loadAllVariants();

                return;
            }

            const response =
                await api.get(
    `/vehicle-variants/by-generation/${generationId}`
);

            setVariants(response.data);

        } catch (error) {

            console.log(error);
        }
    }

    const saveVariant = async () => {
        if (!selectedGenerationId) {
    setMessage("Please select generation");
    return;
}

if (!variantName.trim()) {
    setMessage("Variant name required");
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

if (!engineCode.trim()) {
    setMessage("Engine code required");
    return;
}

if (!fuelType.trim()) {
    setMessage("Fuel type required");
    return;
}

if (!transmission.trim()) {
    setMessage("Transmission required");
    return;
}

if (!region.trim()) {
    setMessage("Region required");
    return;
}

        try {

            const response =
                await api.post(
                    "/vehicle-variants",
                    {
                        variantName: variantName,

                        startYear: Number(startYear),

                        endYear: Number(endYear),

                        engineCode: engineCode,

                        fuelType: fuelType,

                        transmission: transmission,

                        chassisCode: chassisCode,

                        region: region,

                        vehicleGeneration: {
                            id: Number(
                                selectedGenerationId
                            )
                        }
                    }
                );

            setMessage(response.data);

            setVariantName("");

            setStartYear("");

            setEndYear("");

            setEngineCode("");

            setFuelType("");

            setTransmission("");

            setChassisCode("");

            setRegion("");

            loadVariantsByGeneration(
                selectedGenerationId
            );

        } catch (error) {

            console.log(error);

            setMessage(
                "Error saving variant"
            );
        }
    }

    useEffect(() => {

        loadGenerations();

        loadAllVariants();

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
                    maxWidth: "700px"
                }}
            >

                <h3>Add Vehicle Variant</h3>

                <select
                    value={selectedGenerationId}
                    onChange={(e) => {

                        setSelectedGenerationId(
                            e.target.value
                        );

                        loadVariantsByGeneration(
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
                        Select Generation
                    </option>

                    {
                        generations.map(
                            (generation) => (

                           <option
    key={generation.id}
    value={generation.id}
>
    {generation.vehicleModel?.vehicleMake?.makeName}
    {" → "}
    {generation.vehicleModel?.modelName}
    {" → "}
    {generation.generationName}
</option> 
                        ))
                    }

                </select>

                <input
                    type="text"
                    placeholder="Variant Name"
                    value={variantName}
                    onChange={(e) =>
                        setVariantName(
                            e.target.value
                        )
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
                        setStartYear(
                            e.target.value
                        )
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
                        setEndYear(
                            e.target.value
                        )
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <input
                    type="text"
                    placeholder="Engine Code"
                    value={engineCode}
                    onChange={(e) =>
                        setEngineCode(
                            e.target.value
                        )
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <input
                    type="text"
                    placeholder="Fuel Type"
                    value={fuelType}
                    onChange={(e) =>
                        setFuelType(
                            e.target.value
                        )
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <input
                    type="text"
                    placeholder="Transmission"
                    value={transmission}
                    onChange={(e) =>
                        setTransmission(
                            e.target.value
                        )
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <input
                    type="text"
                    placeholder="Chassis Code"
                    value={chassisCode}
                    onChange={(e) =>
                        setChassisCode(
                            e.target.value
                        )
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <input
                    type="text"
                    placeholder="Region"
                    value={region}
                    onChange={(e) =>
                        setRegion(
                            e.target.value
                        )
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <button
                    onClick={saveVariant}
                    style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        cursor: "pointer"
                    }}
                >
                    Save Variant
                </button>

               <p
    style={{
        marginTop: "20px"
    }}
>
    {message}
</p>

</div>

{/* Available Variants Section */}

<div
    style={{
        marginTop: "40px"
    }}
>
    <h3>Available Variants</h3>

    {
        variants.length === 0
        ?
        <p>No variants found</p>
        :
        variants.map((variant) => (

            <div
                key={variant.id}
                style={{
                    padding: "15px",
                    border: "1px solid #ccc",
                    borderRadius: "10px",
                    marginTop: "10px"
                }}
            >

                <strong>
                    {
                        variant.vehicleGeneration
                            ?.vehicleModel
                            ?.vehicleMake
                            ?.makeName
                    }
                </strong>

                {" → "}

                {
                    variant.vehicleGeneration
                        ?.vehicleModel
                        ?.modelName
                }

                {" → "}

                {
                    variant.vehicleGeneration
                        ?.generationName
                }

                {" → "}

                {variant.variantName}

                <br />

                Engine: {variant.engineCode}

                <br />

                Fuel: {variant.fuelType}

                <br />

                Transmission: {variant.transmission}

                <br />

                Region: {variant.region}

            </div>
        ))
    }

</div>

</div>
)

           
}

export default VehicleVariantsSection;
