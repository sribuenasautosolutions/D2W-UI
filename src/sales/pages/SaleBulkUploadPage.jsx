import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, UploadCloud } from "lucide-react";

import BulkUploadShell from "../../owner/components/inventory/BulkUploadShell";
import "../../owner/components/inventory/BulkUploadSection.css";
import "../../owner/components/inventory/BulkUploadPriceSettings.css";
import "../../owner/components/inventory/CurrentStockSection.css";
import {
  downloadSalesBulkUploadTemplate,
  previewSalesBulkUpload,
} from "../../services/orderService";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = /\.(csv|xls|xlsx)$/i;

const CHECKS = [
  "Part Number and Quantity are required.",
  "Quantities are checked against the store's available stock.",
  "Rejected rows are listed on the sale page and left out of the bill.",
  "Uploading does not deduct stock. Stock changes only when the sale is saved.",
];

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function errorMessage(error, fallback) {
  const body = error?.response?.data;
  return (
    body?.message ||
    body?.error ||
    (typeof body === "string" ? body : "") ||
    fallback
  );
}

/*
 * Upload step for a sale. It only reads and validates the file; the accepted
 * rows are handed back to New Sale through router state and merged there.
 */
export default function SalesBulkUploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = currentUser();
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  /* Handed over by New Sale; sensible fallbacks for a direct visit. */
  const storeId = location.state?.storeId || (isSuperAdmin ? "" : user.storeId);
  const returnTo =
    location.state?.returnTo || `${isSuperAdmin ? "/owner" : "/store"}/sales`;
  const returnState = location.state?.returnState;

  const fileInputRef = useRef(null);
  const workInProgress = useRef(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const goBack = () => {
    if (workInProgress.current) return;
    navigate(returnTo, { replace: true, state: returnState });
  };

  const chooseFile = (chosen) => {
    if (workInProgress.current) return;
    setError("");
    if (!chosen) {
      setFile(null);
      return;
    }
    if (!ACCEPTED.test(chosen.name)) {
      setError("Choose a CSV, XLS or XLSX file.");
      return;
    }
    if (chosen.size > MAX_FILE_BYTES) {
      setError("The file is larger than 10 MB.");
      return;
    }
    setFile(chosen);
  };

  const clearFile = () => {
    if (workInProgress.current) return;
    setFile(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadSample = async () => {
    try {
      const blob = await downloadSalesBulkUploadTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sales-bulk-upload-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      console.error("Failed to download sales template:", requestError);
      setError("Unable to download the sample Excel file.");
    }
  };

  const uploadAndContinue = async () => {
    if (workInProgress.current) return;
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (!storeId) {
      setError("No store selected. Go back and select a store first.");
      return;
    }
    workInProgress.current = true;
    setBusy(true);
    setError("");
    try {
      const preview = await previewSalesBulkUpload(file, storeId);
      navigate(returnTo, {
        replace: true,
        state: { ...(returnState || {}), salesBulk: { preview } },
      });
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to read the sale file."));
    } finally {
      workInProgress.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="bulk-page-shell">
      <header className="bulk-page-head">
        <div className="bulk-page-head__left">
          <button
            type="button"
            className="bulk-icon"
            onClick={goBack}
            disabled={busy}
            aria-label="Back to sale"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <nav className="bulk-page-head__crumbs" aria-label="Breadcrumb">
              Sales › New Sale › Import
            </nav>
            <h1>Import sale items</h1>
          </div>
        </div>
        <button
          type="button"
          className="bulk-button"
          onClick={goBack}
          disabled={busy}
        >
          Cancel
        </button>
      </header>

      <div className="bulk-page-shell__body">
        <BulkUploadShell
          title="Upload only the item list"
          subtitle="Customer, invoice date, payment and GST settings are completed on the sale page after upload."
          sampleLabel="Download sample"
          onSample={downloadSample}
          file={file}
          fileInputRef={fileInputRef}
          onFile={chooseFile}
          busy={busy}
          dropTitle="Drop the item file here"
          onRemoveFile={clearFile}
          notices={
            error && <div className="bulk-alert bulk-alert--error">{error}</div>
          }
          checks={CHECKS}
          onCancel={goBack}
          onSubmit={uploadAndContinue}
          submitDisabled={!file || busy}
          submitIcon={UploadCloud}
          submitLabel={busy ? "Reading file..." : "Upload and continue"}
        />
      </div>
    </section>
  );
}
