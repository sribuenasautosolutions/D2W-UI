import { useState } from "react";
import api from "../../../services/api"; // shared instance — attaches auth token, same as the rest of the app
import "./BulkUploadSection.css";

function BulkUploadSection() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [downloadingFailedRows, setDownloadingFailedRows] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const isStoreManager = user?.role === "MAINSTORE_MANAGER";

  const uploadFile = async () => {
    if (!file) {
      alert("Please Select CSV File");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // STORE MANAGER MODE: storeId automatically sent
      if (isStoreManager) {
        formData.append("storeId", user.storeId);
      }
      // OWNER MODE: storeId omitted, backend reads StoreCode per row instead

      const response = await api.post(
        "/store-inventory/bulk-upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(response.data);
    } catch (err) {
      console.log(err);
      setError("Upload Failed");
      alert("Upload Failed");
    } finally {
      setUploading(false);
    }
  };

  const triggerBlobDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const downloadSample = async () => {
    setDownloadingTemplate(true);
    try {
      const response = await api.get("/store-inventory/template", {
        params: { storeManager: isStoreManager },
        responseType: "blob",
      });
      triggerBlobDownload(response.data, "inventory-bulk-upload-template.xlsx");
    } catch (err) {
      console.log(err);
      alert("Could not download template");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const downloadFailedRows = async () => {
    if (!result?.rowErrors?.length) {
      return;
    }

    setDownloadingFailedRows(true);
    try {
      const response = await api.post(
        "/store-inventory/failed-rows/download",
        result.rowErrors,
        { responseType: "blob" }
      );
      triggerBlobDownload(response.data, "inventory-failed-rows.xlsx");
    } catch (err) {
      console.log(err);
      alert("Could not download failed rows report");
    } finally {
      setDownloadingFailedRows(false);
    }
  };

  return (
    <div className="bulk-upload">
      <div className="bulk-upload__header">
        <h2>Inventory Bulk Upload</h2>
        <p className="bulk-upload__subtitle">
          Upload a CSV, XLS, or XLSX file to add or update stock in bulk. Every
          row is processed through the same engine as manual stock entry.
        </p>
      </div>

      <div className="bulk-upload__actions">
        <button
          className="btn btn--ghost"
          onClick={downloadSample}
          disabled={downloadingTemplate}
        >
          {downloadingTemplate ? "Preparing..." : "Download Sample Template"}
        </button>

        <label className="file-picker">
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <span>{file ? file.name : "Choose file"}</span>
        </label>

        <button
          className="btn btn--primary"
          onClick={uploadFile}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload Inventory"}
        </button>
      </div>

      <div className="format-card">
        {isStoreManager ? (
          <>
            <h3>Store Manager CSV Format</h3>
            <code>PartNumber,ItemName,Quantity,PurchasePrice,SellingPrice,MRP</code>
            <code>ABC123,Brake Pad Set,10,100,120,140</code>
            <code>XYZ456,Oil Filter,5,250,300,340</code>
          </>
        ) : (
          <>
            <h3>Owner CSV Format</h3>
            <code>
              StoreCode,PartNumber,ItemName,Quantity,PurchasePrice,SellingPrice,MRP
            </code>
            <code>WH001,ABC123,Brake Pad Set,10,100,120,140</code>
            <code>HYD001,XYZ456,Oil Filter,5,250,300,340</code>
          </>
        )}
      </div>

      {error && <p className="bulk-upload__error">{error}</p>}

      {result && (
        <div className="result">
          <div className="result__summary">
            <div className="stat">
              <span className="stat__value">{result.totalRows}</span>
              <span className="stat__label">Total Rows</span>
            </div>
            <div className="stat">
              <span className="stat__value">{result.processedRows}</span>
              <span className="stat__label">Processed</span>
            </div>
            <div className="stat stat--success">
              <span className="stat__value">{result.successCount}</span>
              <span className="stat__label">Success</span>
            </div>
            <div className="stat stat--fail">
              <span className="stat__value">{result.failedCount}</span>
              <span className="stat__label">Failed</span>
            </div>
            <div className="stat">
              <span className="stat__value">{result.createdCount}</span>
              <span className="stat__label">Created</span>
            </div>
            <div className="stat">
              <span className="stat__value">{result.updatedCount}</span>
              <span className="stat__label">Updated</span>
            </div>
          </div>

          {result.rowErrors?.length > 0 && (
            <div className="result__errors">
              <div className="result__errors-header">
                <h3>Row Errors ({result.rowErrors.length})</h3>
                <button
                  className="btn btn--ghost"
                  onClick={downloadFailedRows}
                  disabled={downloadingFailedRows}
                >
                  {downloadingFailedRows ? "Preparing..." : "Download Failed Rows"}
                </button>
              </div>

              <table className="error-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Part Number</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rowErrors.map((row, index) => (
                    <tr key={index}>
                      <td>{row.rowNumber}</td>
                      <td>{row.partNumber || "-"}</td>
                      <td>{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BulkUploadSection;
