import { useState } from "react";
import api from "../../../services/api";
import "./styles/vehicle-management.css";
import "./styles/VehicleBulkUploadSection.css";

function VehicleBulkUploadSection({ onGoToTab }) {

    // ===== ORIGINAL STATE — unchanged =====
    const [file, setFile] = useState(null);

    const [result, setResult] = useState(null);

    const [loading, setLoading] = useState(false);

    const [isDragOver, setIsDragOver] = useState(false);

    const [error, setError] = useState(null);

    // ===== NEW UI-ONLY STATE (history is derived from this session's own results only) =====
    const [history, setHistory] = useState([]);

    // NEW — separate loading flag so the failed-rows download button
    // doesn't get tangled up with the main upload button's loading state.
    const [downloadingFailedRows, setDownloadingFailedRows] = useState(false);

    // NEW — toggles the full column reference table open/closed so it
    // doesn't force a huge scroll every time this panel renders.
    const [showColumnReference, setShowColumnReference] = useState(false);

    // NEW: mirrors the exact 19-column contract enforced by
    // VehicleBulkUploadService.parseAndValidateRow() on the backend — same
    // column order, same required/optional split. If the backend's
    // TEMPLATE_HEADERS or its require*/optional* calls ever change, this
    // list must be updated to match, or the UI will start lying to users
    // about what the parser actually expects.
    const BULK_UPLOAD_COLUMNS = [
        { name: "Make", required: true, example: "Toyota" },
        { name: "Model", required: true, example: "Corolla" },
        { name: "GenerationName", required: true, example: "Twelfth Generation" },
        { name: "GenerationNumber", required: true, example: "E210" },
        { name: "StartYear", required: true, example: "2019" },
        { name: "EndYear", required: false, example: "2024" },
        { name: "Facelift", required: false, example: "Yes / No" },
        { name: "BodyType", required: false, example: "Sedan" },
        { name: "VariantName", required: true, example: "GLi" },
        { name: "EngineCode", required: true, example: "2ZR-FE" },
        { name: "FuelType", required: true, example: "Petrol" },
        { name: "Transmission", required: true, example: "Automatic" },
        { name: "ChassisCode", required: false, example: "E210-AABDKW" },
        { name: "Region", required: true, example: "Global" },
        { name: "EngineCapacity", required: true, example: "1798cc" },
        { name: "Doors", required: false, example: "4" },
        { name: "EngineType", required: false, example: "Inline-4" },
        { name: "EmissionStandard", required: false, example: "Euro 6" },
        { name: "VinPrefix", required: false, example: "JTD" },
    ];

    // ===== ORIGINAL HANDLER — unchanged =====
    const uploadFile = async () => {

        if (!file) {
            setError("Please select an Excel file first");
            return;
        }

        try {

            setError(null);
            setLoading(true);

            const formData = new FormData();

            formData.append("file", file);

            const response =
                await api.post(
                    "/vehicle-bulk-upload",
                    formData,
                    {
                        headers: {
                            "Content-Type":
                                "multipart/form-data"
                        }
                    }
                );

            // FIX: backend now returns { success, message, data, timestamp } —
            // the bulk-upload result object lives at response.data.data.
            const uploadResult = response.data.data;
            setResult(uploadResult);

            setHistory((prev) => [
                {
                    name: file.name,
                    when: new Date().toLocaleString(),
                    total: uploadResult?.totalRows,
                    success: uploadResult?.successRows,
                    skipped: uploadResult?.skippedRows,
                },
                ...prev,
            ]);

        } catch (error) {

            console.log(error);

            setError(
                error.response?.data?.message ||
                "Upload failed — please check the file and try again"
            );
        }
        finally {

            setLoading(false);
        }
    };

    // NEW (Phase 8 / Known Issue #13): template was previously not downloadable
    // anywhere in the UI, so the Excel column order the backend expects had to
    // be guessed.
    const downloadTemplate = async () => {
        try {
            const response = await api.get("/vehicle-bulk-upload/template", {
                responseType: "blob",
            });
            const blob = new Blob([response.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "vehicle-bulk-upload-template.xlsx";
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.log(error);
            setError("Could not download the template — please try again");
        }
    };

    
    const downloadFailedRows = async () => {

        if (!result || !result.failedRows || result.failedRows.length === 0) {
            return;
        }

        try {
            setDownloadingFailedRows(true);

            const response = await api.post(
                "/vehicle-bulk-upload/failed-rows/download",
                result.failedRows,
                { responseType: "blob" }
            );

            const blob = new Blob([response.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "failed-rows.xlsx";
            a.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            console.log(error);
            setError("Could not download the failed rows report — please try again");
        } finally {
            setDownloadingFailedRows(false);
        }
    };

    // ===== ORIGINAL HANDLER — unchanged =====
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files?.[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div>

            <div className="vm-upload-columns">

                <div className="vm-panel" style={{ padding: 24 }}>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                        <button className="vm-btn vm-btn-secondary" onClick={downloadTemplate}>
                            ⬇ Download template
                        </button>
                    </div>

                    <div
                        className={"vm-dropzone" + (isDragOver ? " is-active" : "")}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                    >
                        <div className="vm-dropzone-icon">📤</div>
                        <div className="vm-dropzone-title">
                            Drag an .xlsx file here, or browse
                        </div>
                        <div className="vm-dropzone-sub">
                            Only .xlsx spreadsheets are supported
                        </div>

                        <input
                            type="file"
                            accept=".xlsx"
                            id="vc-bulk-file-input"
                            style={{ display: "none" }}
                            onChange={(e) => setFile(e.target.files[0])}
                        />
                        <label htmlFor="vc-bulk-file-input" className="vm-btn vm-btn-secondary" style={{ marginTop: 18, cursor: "pointer" }}>
                            Choose file
                        </label>

                        {file && <div className="vm-dropzone-file">📄 {file.name}</div>}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                        <button
                            className="vm-btn vm-btn-primary"
                            onClick={uploadFile}
                            disabled={loading}
                        >
                            {loading ? "Uploading…" : "⬆ Upload spreadsheet"}
                        </button>
                    </div>

                    {error && (
                        <div className="vm-alert vm-alert-error" style={{ marginTop: 18 }}>
                            <span className="vm-alert-icon"><span>!</span></span>
                            <span>{error}</span>
                        </div>
                    )}

                    {result && (
                        <>
                            <div className="vm-alert vm-alert-success" style={{ marginTop: 18 }}>
                                <span className="vm-alert-icon"><span>✓</span></span>
                                <span>Upload complete — results below.</span>
                            </div>

                            <div className="vm-stats-row" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 0 }}>
                                <div className="vm-stat-card">
                                    <div className="vm-stat-card-top">
                                        <span className="vm-stat-card-label">Total rows</span>
                                        <span className="vm-stat-card-icon blue">Σ</span>
                                    </div>
                                    <div className="vm-stat-card-value">{result.totalRows}</div>
                                </div>
                                <div className="vm-stat-card">
                                    <div className="vm-stat-card-top">
                                        <span className="vm-stat-card-label">Success</span>
                                        <span className="vm-stat-card-icon green">✓</span>
                                    </div>
                                    <div className="vm-stat-card-value">{result.successRows}</div>
                                </div>
                                <div className="vm-stat-card">
                                    <div className="vm-stat-card-top">
                                        <span className="vm-stat-card-label">Skipped</span>
                                        <span className="vm-stat-card-icon amber">!</span>
                                    </div>
                                    <div className="vm-stat-card-value">{result.skippedRows}</div>
                                </div>
                            </div>

                            {result.failedRows && result.failedRows.length > 0 && (
                                <>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13 }}>
                                            {result.failedRows.length} row{result.failedRows.length === 1 ? "" : "s"} skipped
                                        </span>
                                        <button
                                            className="vm-btn vm-btn-secondary"
                                            onClick={downloadFailedRows}
                                            disabled={downloadingFailedRows}
                                        >
                                            {downloadingFailedRows ? "Preparing…" : "⬇ Download failed rows"}
                                        </button>
                                    </div>

                                    <div className="vm-table-scroll" style={{ marginTop: 10 }}>
                                        <table className="vm-table">
                                            <thead>
                                                <tr>
                                                    <th>Row</th>
                                                    <th>Reason skipped</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.failedRows.map((fr, idx) => (
                                                    <tr key={idx}>
                                                        <td className="vm-cell-mono">{fr.rowNumber}</td>
                                                        <td>{fr.reason}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                </div>

                <div>
                    <div className="vm-info-card" style={{ marginBottom: 16 }}>
                        <h4>📋 Before you upload</h4>
                        <ul>
                            <li>Download the template below — row 2 is a filled-in sample row showing the exact format, row 1 is the header</li>
                            <li>File must be a single .xlsx spreadsheet</li>
                            <li>One row per make, model, generation, and variant combination</li>
                            <li>Existing Make/Model/Generation records are matched and reused, not duplicated — only the Variant is new per row</li>
                            <li>Every problem on a row is reported together, so a row with 3 issues shows all 3, not just the first</li>
                            <li>Need to add data one record at a time instead? Use the {" "}
                                <a
                                    href="#makes"
                                    onClick={(e) => { e.preventDefault(); onGoToTab && onGoToTab("makes"); }}
                                    style={{ color: "var(--vm-primary)", fontWeight: 700 }}
                                >
                                    Makes
                                </a>, Models, Generations, or Variants tabs
                            </li>
                        </ul>

                        <button
                            className="vm-btn vm-btn-secondary"
                            style={{ marginTop: 10, fontSize: 12.5 }}
                            onClick={() => setShowColumnReference((prev) => !prev)}
                        >
                            {showColumnReference ? "Hide column reference" : "Show column reference (19 columns)"}
                        </button>

                        {showColumnReference && (
                            <div className="vm-table-scroll" style={{ marginTop: 10 }}>
                                <table className="vm-table">
                                    <thead>
                                        <tr>
                                            <th>Column</th>
                                            <th>Required?</th>
                                            <th>Example</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {BULK_UPLOAD_COLUMNS.map((col) => (
                                            <tr key={col.name}>
                                                <td className="vm-cell-mono">{col.name}</td>
                                                <td>
                                                    {col.required ? (
                                                        <span className="vm-badge vm-badge-amber">Required</span>
                                                    ) : (
                                                        <span className="vm-badge vm-badge-green">Optional</span>
                                                    )}
                                                </td>
                                                <td>{col.example}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="vm-info-card">
                        <h4>🕘 Recent uploads (this session)</h4>
                        {history.length === 0 ? (
                            <div style={{ fontSize: 12.5, color: "var(--vm-text-faint)" }}>
                                Nothing uploaded yet this session.
                            </div>
                        ) : (
                            history.map((h, idx) => (
                                <div className="vm-history-row" key={idx}>
                                    <span style={{ fontWeight: 700 }}>📄 {h.name}</span>
                                    <span style={{ color: "var(--vm-text-faint)" }}>{h.when}</span>
                                    <span className="vm-badge vm-badge-green">{h.success} ok</span>
                                    {h.skipped > 0 && <span className="vm-badge vm-badge-amber">{h.skipped} skipped</span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
}

export default VehicleBulkUploadSection;
