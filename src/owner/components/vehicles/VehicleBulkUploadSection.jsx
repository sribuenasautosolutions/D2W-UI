import { useState } from "react";
import axios from "axios";

function VehicleBulkUploadSection() {

    const [file, setFile] = useState(null);

    const [result, setResult] = useState(null);

    const [loading, setLoading] = useState(false);

    const uploadFile = async () => {

        if (!file) {

            alert("Please select Excel file");

            return;
        }

        try {

            setLoading(true);

            const formData = new FormData();

            formData.append("file", file);

            const response =
                await axios.post(
                    "http://localhost:8080/vehicle-bulk-upload",
                    formData,
                    {
                        headers: {
                            "Content-Type":
                                "multipart/form-data"
                        }
                    }
                );

            setResult(response.data);

        } catch (error) {

            console.log(error);

            alert("Upload failed");
        }
        finally {

            setLoading(false);
        }
    };

    return (

        <div>

            <h3>Vehicle Bulk Upload</h3>

            <input
                type="file"
                accept=".xlsx"
                onChange={(e) =>
                    setFile(
                        e.target.files[0]
                    )
                }
            />

            <br />
            <br />

            <button
                onClick={uploadFile}
                disabled={loading}
                style={{
                    padding: "10px 20px",
                    cursor: "pointer"
                }}
            >
                {
                    loading
                        ? "Uploading..."
                        : "Upload Excel"
                }
            </button>

            {
                result && (

                    <div
                        style={{
                            marginTop: "25px",
                            padding: "15px",
                            border: "1px solid #ddd",
                            borderRadius: "10px"
                        }}
                    >
                        <h4>Upload Result</h4>

                        <p>
                            Total Rows :
                            {" "}
                            {result.totalRows}
                        </p>

                        <p>
                            Success Rows :
                            {" "}
                            {result.successRows}
                        </p>

                        <p>
                            Skipped Rows :
                            {" "}
                            {result.skippedRows}
                        </p>

                    </div>
                )
            }

        </div>
    );
}

export default VehicleBulkUploadSection;