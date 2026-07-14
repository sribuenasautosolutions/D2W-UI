import { useState, useEffect } from "react";

import api from "../../../services/api";

function VehicleMakesSection() {

    const [makeName, setMakeName] = useState("");

    const [message, setMessage] = useState("");

    const [makes, setMakes] = useState([]);

    useEffect(() => {

        loadMakes();

    }, []);

    const loadMakes = async () => {

        try {

            const response =
                await api.get(
                    "/vehicle-makes"
                );

            setMakes(response.data);

        } catch (error) {

            console.log(error);
        }
    }

    const saveMake = async () => {

        if (!makeName.trim()) {
    setMessage("Make name is required");
    return;
}
        try {

            const response =
                await api.post(
                    "/vehicle-makes",
                    {
                        makeName: makeName
                    }
                );

            setMessage(response.data);

            setMakeName("");

            loadMakes();

        } catch (error) {

            console.log(error);

            setMessage("Error saving make");
        }
    }

    return (

        <div
            style={{
                marginTop: "30px"
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

                <h3>Add Vehicle Make</h3>

                <input
                    type="text"
                    placeholder="Enter Make Name"
                    value={makeName}
                    onChange={(e) =>
                        setMakeName(e.target.value)
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <button
                    onClick={saveMake}
                    style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        cursor: "pointer"
                    }}
                >
                    Save Make
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

                <h3>Available Makes</h3>

                {
                    makes.length === 0
                    ?
                    <p>No makes found</p>
                    :
                    makes.map((make) => (

                        <div
                            key={make.id}
                            style={{
                                padding: "15px",
                                border: "1px solid #ccc",
                                borderRadius: "10px",
                                marginTop: "10px"
                            }}
                        >

                           <div>
    <strong>{make.makeName}</strong>

    <br />

    Slug : {make.slug}
</div>

                        </div>
                    ))
                }

            </div>

        </div>
    )
}

export default VehicleMakesSection;
