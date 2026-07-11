import { useState, useEffect }
from "react";

import axios from "axios";

function MastersSection() {

    const [masterName, setMasterName]
        = useState("");

    const [slug, setSlug]
        = useState("");

    const [description, setDescription]
        = useState("");

    const [selectedCategoryId,
        setSelectedCategoryId]
        = useState("");

    const [isActive, setIsActive]
        = useState(true);

    const [featured, setFeatured]
        = useState(false);

    const [categories, setCategories]
        = useState([]);

    const [masters, setMasters]
        = useState([]);

    const [message, setMessage]
        = useState("");

    const loadCategories = async () => {

        try {

            const response =
                await axios.get(
                    "http://localhost:8080/categories"
                );

            setCategories(response.data);

        } catch (error) {

            console.log(error);
        }
    }

    const loadMasters = async () => {

        try {

            const response =
                await axios.get(
                    "http://localhost:8080/product-masters"
                );

            setMasters(response.data);

        } catch (error) {

            console.log(error);
        }
    }

    const saveMaster = async () => {

        try {

            const payload = {

                masterName: masterName,

                slug: slug,

                description: description,

                isActive: isActive,

                featured: featured,

                category: {
                    id: Number(
                        selectedCategoryId
                    )
                }
            };

            const response =
                await axios.post(
                    "http://localhost:8080/product-masters",
                    payload
                );

            setMessage(response.data);

            setMasterName("");

            setSlug("");

            setDescription("");

            setSelectedCategoryId("");

            setIsActive(true);

            setFeatured(false);

            loadMasters();

        } catch (error) {

            console.log(error);

            setMessage(
                "Error saving master"
            );
        }
    }

    useEffect(() => {

        loadCategories();

        loadMasters();

    }, []);

    return (

        <div
            style={{
                marginTop: "50px"
            }}
        >

            <div
                style={{
                    border: "1px solid #ccc",
                    borderRadius: "10px",
                    padding: "20px",
                    maxWidth: "700px"
                }}
            >

                <h2>
                    Product Masters
                </h2>

                <select
                    value={selectedCategoryId}
                    onChange={(e) =>
                        setSelectedCategoryId(
                            e.target.value
                        )
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                >

                    <option value="">
                        Select Category
                    </option>

                    {
                        categories.map((category) => (

                            <option
                                key={category.id}
                                value={category.id}
                            >

                                {
                                    category.categoryName
                                }

                            </option>
                        ))
                    }

                </select>

                <input
                    type="text"
                    placeholder="Master Name"
                    value={masterName}
                    onChange={(e) =>
                        setMasterName(
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
                    placeholder="Slug"
                    value={slug}
                    onChange={(e) =>
                        setSlug(
                            e.target.value
                        )
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <textarea
                    placeholder="Description"
                    value={description}
                    onChange={(e) =>
                        setDescription(
                            e.target.value
                        )
                    }
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px",
                        minHeight: "100px"
                    }}
                />

                <div
                    style={{
                        marginTop: "20px"
                    }}
                >

                    <label>

                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) =>
                                setIsActive(
                                    e.target.checked
                                )
                            }
                        />

                        {" "}

                        Active

                    </label>

                </div>

                <div
                    style={{
                        marginTop: "10px"
                    }}
                >

                    <label>

                        <input
                            type="checkbox"
                            checked={featured}
                            onChange={(e) =>
                                setFeatured(
                                    e.target.checked
                                )
                            }
                        />

                        {" "}

                        Featured

                    </label>

                </div>

                <button
                    onClick={saveMaster}
                    style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        cursor: "pointer"
                    }}
                >

                    Save Master

                </button>

                <p
                    style={{
                        marginTop: "20px"
                    }}
                >

                    {message}

                </p>

            </div>

            <div
                style={{
                    marginTop: "40px",
                    maxWidth: "900px"
                }}
            >

                <h3>
                    Available Product Masters
                </h3>

                {
                    masters.length === 0
                    ?
                    <p>
                        No masters found
                    </p>
                    :
                    masters.map((master) => (

                        <div
                            key={master.id}
                            style={{
                                border:
                                    "1px solid #ccc",

                                borderRadius: "10px",

                                padding: "15px",

                                marginTop: "10px"
                            }}
                        >

                            <strong>

                                {master.masterName}

                            </strong>

                            <br />

                            Category:
                            {" "}

                            {
                                master.category
                                ?.categoryName
                            }

                            <br />

                            Slug:
                            {" "}
                            {master.slug}

                            <br />

                            Featured:
                            {" "}

                            {
                                master.featured
                                ?
                                "Yes"
                                :
                                "No"
                            }

                            <br />

                            Status:
                            {" "}

                            {
                                master.isActive
                                ?
                                "Active"
                                :
                                "Inactive"
                            }

                        </div>
                    ))
                }

            </div>

        </div>
    )
}

export default MastersSection;