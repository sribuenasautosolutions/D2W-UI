import { useState, useEffect } from "react";
import api from "../../../services/api";

function CategoriesSection() {

    const [categoryName, setCategoryName] = useState("");
    const [categories, setCategories] = useState([]);
    const [message, setMessage] = useState("");

    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadMessage, setUploadMessage] = useState("");

    const loadCategories = async () => {

        try {

            const response = await api.get(
                "http://localhost:8080/categories"
            );

            setCategories(response.data);

        } catch (error) {

            console.log(error);
        }
    }

    const saveCategory = async () => {

        try {

            const payload = {
                categoryName: categoryName
            };

            const response = await api.post(
                "http://localhost:8080/categories",
                payload
            );

            setMessage(response.data);

            setCategoryName("");

            loadCategories();

        } catch (error) {

            console.log(error);

            setMessage("Error saving category");
        }
    }

    const handleFileChange = (e) => {

        setSelectedFile(e.target.files[0]);
    }

    const uploadCategories = async () => {

        if (!selectedFile) {

            setUploadMessage("Please select a file first");

            return;
        }

        try {

            const formData = new FormData();
            formData.append("file", selectedFile);

            const response = await api.post(
                "http://localhost:8080/categories/bulk-upload",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data"
                    }
                }
            );

            setUploadMessage(response.data);

            setSelectedFile(null);

            loadCategories();

        } catch (error) {

            console.log(error);

            setUploadMessage("Error uploading categories");
        }
    }

    useEffect(() => {

        loadCategories();

    }, []);

    return (

        <div style={{ marginTop: "40px" }}>

            <div
                style={{
                    border: "1px solid #ccc",
                    borderRadius: "10px",
                    padding: "20px",
                    maxWidth: "700px"
                }}
            >

                <h2>Product Categories</h2>

                <input
                    type="text"
                    placeholder="Category Name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "20px"
                    }}
                />

                <button
                    onClick={saveCategory}
                    style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        cursor: "pointer"
                    }}
                >
                    Save Category
                </button>

                <p style={{ marginTop: "20px" }}>
                    {message}
                </p>

            </div>

            <div
                style={{
                    border: "1px solid #ccc",
                    borderRadius: "10px",
                    padding: "20px",
                    marginTop: "40px",
                    maxWidth: "700px"
                }}
            >

                <h2>Bulk Upload Categories</h2>

                <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    style={{
                        marginTop: "20px"
                    }}
                />

                <br />

                <button
                    onClick={uploadCategories}
                    style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        cursor: "pointer"
                    }}
                >
                    Upload Categories
                </button>

                <p style={{ marginTop: "20px" }}>
                    {uploadMessage}
                </p>

            </div>

            <div
                style={{
                    marginTop: "40px",
                    maxWidth: "900px"
                }}
            >

                <h3>Available Categories</h3>

                {
                    categories.length === 0
                    ?
                    <p>No categories found</p>
                    :
                    categories.map((category) => (

                        <div
                            key={category.id}
                            style={{
                                border: "1px solid #ccc",
                                borderRadius: "10px",
                                padding: "15px",
                                marginTop: "10px"
                            }}
                        >

                            <strong>
                                {category.categoryName}
                            </strong>

                        </div>
                    ))
                }

            </div>

        </div>
    )
}

export default CategoriesSection;
