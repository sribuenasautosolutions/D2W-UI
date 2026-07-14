
import { useState, useEffect } from "react";
import api from "../../../services/api";

function BrandsSection() {

    const [brandName, setBrandName] =
        useState("");

    const [selectedFile, setSelectedFile] =
        useState(null);

    const [brands, setBrands] =
        useState([]);

    const [message, setMessage] =
        useState("");

    const loadBrands = async () => {

        try {

            const response =
                await api.get(
                    "http://localhost:8080/brands"
                );

            setBrands(response.data);

        } catch (error) {

            console.log(error);
        }
    };

    const saveBrand = async () => {

        if (!brandName.trim()) {

            setMessage(
                "Brand Name Required"
            );

            return;
        }

        try {

            const response =
                await api.post(
                    "http://localhost:8080/brands",
                    {
                        brandName
                    }
                );

            setMessage(
                response.data
            );

            setBrandName("");

            loadBrands();

        } catch (error) {

            console.log(error);

            setMessage(
                "Error saving brand"
            );
        }
    };

    const uploadBrands = async () => {

        if (!selectedFile) {

            setMessage(
                "Please select a file"
            );

            return;
        }

        try {

            const formData =
                new FormData();

            formData.append(
                "file",
                selectedFile
            );

            const response =
                await api.post(
                    "http://localhost:8080/brands/bulk-upload",
                    formData,
                    {
                        headers: {
                            "Content-Type":
                                "multipart/form-data"
                        }
                    }
                );

            setMessage(
                response.data
            );

            setSelectedFile(null);

            loadBrands();

        } catch (error) {

            console.log(error);

            setMessage(
                "Bulk upload failed"
            );
        }
    };

    useEffect(() => {

        loadBrands();

    }, []);

    return (

        <div
            style={{
                marginTop: "40px"
            }}
        >

            <div
                style={{
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                    padding: "20px",
                    maxWidth: "700px"
                }}
            >

                <h2>
                    Product Brands
                </h2>

                <input
                    type="text"
                    placeholder="Brand Name"
                    value={brandName}
                    onChange={(e) =>
                        setBrandName(
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
                    onClick={saveBrand}
                    style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        cursor: "pointer"
                    }}
                >

                    Save Brand

                </button>

                <hr
                    style={{
                        marginTop: "30px",
                        marginBottom: "20px"
                    }}
                />

                <h3>
                    Bulk Upload Brands
                </h3>

                <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) =>
                        setSelectedFile(
                            e.target.files[0]
                        )
                    }
                />

                <br />

                <button
                    onClick={uploadBrands}
                    style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        cursor: "pointer"
                    }}
                >

                    Upload Brands

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
                    Available Brands
                </h3>

                {
                    brands.length === 0
                    ?
                    <p>
                        No brands found
                    </p>
                    :
                    brands.map(
                        (brand) => (

                        <div
                            key={brand.id}
                            style={{
                                border:
                                    "1px solid #ccc",

                                borderRadius:
                                    "10px",

                                padding:
                                    "15px",

                                marginTop:
                                    "10px"
                            }}
                        >

                            <strong>

                                {
                                    brand.brandName
                                }

                            </strong>

                        </div>
                    ))
                }

            </div>

        </div>
    );
}

export default BrandsSection;

