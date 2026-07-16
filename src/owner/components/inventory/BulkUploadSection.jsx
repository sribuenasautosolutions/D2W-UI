import { useState } from "react";
import axios from "axios";

function BulkUploadSection() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const uploadFile = async () => {
    if (!file) {
      alert("Please Select CSV File");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const formData = new FormData();
      formData.append("file", file);

      // STORE MANAGER MODE: storeId automatically sent
      if (user?.role === "MAINSTORE_MANAGER") {
        formData.append("storeId", user.storeId);
      }

     const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/store-inventory/bulk-upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage(response.data);
      alert("Inventory Uploaded Successfully");
    } catch (error) {
      console.log(error);
      setMessage("Upload Failed");
      alert("Upload Failed");
    }
  };

  const downloadSample = () => {
    const user = JSON.parse(localStorage.getItem("user"));

    let csvContent = "";

    // STORE MANAGER SAMPLE
    if (user?.role === "MAINSTORE_MANAGER") {
      csvContent =
`PartNumber,Quantity,PurchasePrice,SellingPrice
ABC123,10,100,120
XYZ456,5,250,300`;
    }
    // OWNER SAMPLE
    else {
      csvContent =
`StoreCode,PartNumber,Quantity,PurchasePrice,SellingPrice
WH001,ABC123,10,100,120
HYD001,XYZ456,5,250,300`;
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory_sample.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div>
      <h2>Inventory Bulk Upload</h2>

      <br />

      <button onClick={downloadSample}>Download Sample CSV</button>

      <br />
      <br />

      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br />
      <br />

      <button onClick={uploadFile}>Upload Inventory</button>

      <br />
      <br />

      <div
        style={{
          background: "#f3f4f6",
          padding: "15px",
          borderRadius: "8px",
        }}
      >
        {user?.role === "MAINSTORE_MANAGER" ? (
          <>
            <h3>Store Manager CSV Format</h3>
            <p>PartNumber,Quantity,PurchasePrice,SellingPrice</p>
            <p>ABC123,10,100,120</p>
            <p>XYZ456,5,250,300</p>
          </>
        ) : (
          <>
            <h3>Owner CSV Format</h3>
            <p>StoreCode,PartNumber,Quantity,PurchasePrice,SellingPrice</p>
            <p>WH001,ABC123,10,100,120</p>
            <p>HYD001,XYZ456,5,250,300</p>
          </>
        )}
      </div>

      <br />

      <p style={{ fontWeight: "bold" }}>{message}</p>
    </div>
  );
}

export default BulkUploadSection;
