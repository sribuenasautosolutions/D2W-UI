import { useRef, useState } from "react";
import {
  AlertCircle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, UploadCloud, X,
} from "lucide-react";
import api from "../../../services/api";

const ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

function fileExtension(fileName = "") {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot).toLowerCase();
}

function downloadBlob(content, fileName) {
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function VendorBillBulkUploader({ storeId, onBack, onParsed }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const chooseFile = (selected) => {
    if (!selected) return;
    if (!ALLOWED_EXTENSIONS.includes(fileExtension(selected.name))) {
      setFile(null);
      setError("Choose a CSV, XLS or XLSX file.");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setFile(null);
      setError("The upload file must not exceed 10 MB.");
      return;
    }
    setFile(selected);
    setError("");
  };

  const upload = async () => {
    if (!storeId) {
      setError("Select a store before importing a vendor bill.");
      return;
    }
    if (!file) {
      setError("Choose a CSV, XLS or XLSX file first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/vendor-purchases/import/parse", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await onParsed(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message
        || requestError.response?.data?.error
        || requestError.message
        || "Unable to read the import file."
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = async () => {
    setDownloading(true);
    setError("");
    try {
      const response = await api.get("/vendor-purchases/import/template", {
        params: { format: "xlsx" },
        responseType: "blob",
      });
      downloadBlob(response.data, "vendor-bill-items-sample.xlsx");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to download the sample file.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerLeft}>
          <button type="button" style={S.backButton} onClick={onBack} aria-label="Back to bills">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={S.breadcrumb}>Purchases <span>›</span> Bills <span>›</span> Import</div>
            <h1 style={S.title}>Import bill items</h1>
          </div>
        </div>
        <button type="button" style={S.cancelButton} onClick={onBack}>Cancel</button>
      </header>

      <main style={S.main}>
        <section style={S.intro}>
          <div>
            <h2 style={S.sectionTitle}>Upload only the item list</h2>
            <p style={S.copy}>
              Vendor, invoice dates, payment and GST settings are completed in the existing bill editor after upload.
            </p>
          </div>
          <div style={S.sampleActions}>
            <button type="button" style={S.secondaryButton} onClick={downloadSample} disabled={downloading}>
              <Download size={15} /> {downloading ? "Downloading..." : "Download sample"}
            </button>
          </div>
        </section>

        <section
          style={{ ...S.dropZone, ...(dragging ? S.dropZoneActive : {}) }}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            chooseFile(event.dataTransfer.files?.[0]);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            hidden
            onChange={(event) => chooseFile(event.target.files?.[0])}
          />
          <div style={S.uploadIcon}><UploadCloud size={27} /></div>
          <h3 style={S.dropTitle}>Drop the item file here</h3>
          <p style={S.dropCopy}>CSV, XLS or XLSX · maximum 10 MB </p>
          <button type="button" style={S.browseButton} onClick={() => inputRef.current?.click()}>
            Browse file
          </button>
        </section>

        {file && (
          <section style={S.fileRow}>
            <div style={S.fileIdentity}>
              <FileSpreadsheet size={20} color="#2563eb" />
              <div style={S.fileMeta}>
                <strong style={S.fileName}>{file.name}</strong>
                <span style={S.fileDetails}>
                  {(file.size / 1024).toFixed(1)} KB · {fileExtension(file.name) === ".csv" ? "CSV detected" : "Excel detected"}
                </span>
              </div>
            </div>
            <button type="button" style={S.removeButton} onClick={() => { setFile(null); setError(""); }} aria-label="Remove file">
              <X size={17} />
            </button>
          </section>
        )}

        {error && (
          <div style={S.error} role="alert" aria-live="assertive">
            <AlertCircle size={19} />
            <div style={S.errorCopy}>
              <strong style={S.errorTitle}>File could not be prepared</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        <section style={S.rules}>
          <div style={S.rule}><CheckCircle2 size={16} /><span>Part Number and Quantity are required.</span></div>
          <div style={S.rule}><CheckCircle2 size={16} /><span>Enter one of Purchase Price, MRP or Selling Price.</span></div>
          <div style={S.rule}><CheckCircle2 size={16} /><span>Existing products are filled automatically; new products stay editable in the bill table.</span></div>
          <div style={S.rule}><CheckCircle2 size={16} /><span>Uploading does not create stock. Stock changes only after Receive Stock.</span></div>
        </section>

        <footer style={S.footer}>
          <button type="button" style={S.cancelButton} onClick={onBack}>Cancel</button>
          <button type="button" style={{ ...S.primaryButton, ...((!file || loading) ? S.disabled : {}) }} disabled={!file || loading} onClick={upload}>
            <UploadCloud size={16} /> {loading ? "Preparing bill..." : "Upload and continue"}
          </button>
        </footer>
      </main>
    </div>
  );
}

const S = {
  page: { minHeight: "100%", background: "#fff", color: "#172033", fontFamily: 'Inter, "Segoe UI", Arial, sans-serif' },
  header: { minHeight: 74, padding: "0 28px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  backButton: { width: 36, height: 36, border: "1px solid #d7dce5", borderRadius: 7, background: "#fff", color: "#344054", display: "grid", placeItems: "center", cursor: "pointer" },
  breadcrumb: { color: "#7a8599", fontSize: 11.5, display: "flex", gap: 7, marginBottom: 3 },
  title: { margin: 0, fontSize: 21, fontWeight: 650, letterSpacing: "-0.02em" },
  main: { maxWidth: 980, margin: "0 auto", padding: "34px 28px 28px" },
  intro: { display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", marginBottom: 22 },
  sectionTitle: { margin: "0 0 6px", fontSize: 17, fontWeight: 650 },
  copy: { margin: 0, color: "#667085", fontSize: 13, lineHeight: 1.55, maxWidth: 610 },
  sampleActions: { display: "flex", gap: 8, flexShrink: 0 },
  dropZone: { minHeight: 255, border: "1.5px dashed #c6ceda", background: "#fafbfc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", transition: "160ms ease", borderRadius: 8 },
  dropZoneActive: { borderColor: "#2563eb", background: "#eff6ff" },
  uploadIcon: { width: 50, height: 50, borderRadius: 10, display: "grid", placeItems: "center", color: "#2563eb", background: "#eaf1ff", marginBottom: 13 },
  dropTitle: { margin: 0, fontSize: 16, fontWeight: 650 },
  dropCopy: { margin: "7px 0 16px", color: "#7a8599", fontSize: 12.5 },
  browseButton: { border: "1px solid #b9c6dc", background: "#fff", color: "#2256a6", borderRadius: 6, padding: "9px 17px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  fileRow: { marginTop: 14, minHeight: 58, borderBottom: "1px solid #e6e9ef", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" },
  fileIdentity: { display: "flex", alignItems: "center", gap: 11 },
  fileMeta: { display: "grid", gap: 3 },
  fileName: { color: "#273142", fontSize: 12.5, fontWeight: 600 },
  fileDetails: { color: "#7A8599", fontSize: 11 },
  removeButton: { border: 0, background: "transparent", color: "#667085", cursor: "pointer", padding: 8 },
  error: { marginTop: 14, padding: "13px 15px", background: "#FFF1F0", color: "#A61B1B", border: "1px solid #F4A7A3", borderLeft: "4px solid #D92D20", borderRadius: 6, display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12.5 },
  errorCopy: { display: "grid", gap: 3 },
  errorTitle: { fontWeight: 600 },
  rules: { marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 26px", padding: "17px 0", borderTop: "1px solid #eceff3", borderBottom: "1px solid #eceff3" },
  rule: { display: "flex", alignItems: "flex-start", gap: 8, color: "#475467", fontSize: 12.5, lineHeight: 1.45 },
  footer: { marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 9 },
  secondaryButton: { height: 36, border: "1px solid #d5dae3", borderRadius: 6, background: "#fff", color: "#344054", padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  cancelButton: { height: 38, border: "1px solid #d5dae3", borderRadius: 6, background: "#fff", color: "#344054", padding: "0 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  primaryButton: { height: 38, border: 0, borderRadius: 6, background: "#2563eb", color: "#fff", padding: "0 17px", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 650, cursor: "pointer" },
  disabled: { opacity: 0.55, cursor: "not-allowed" },
};
