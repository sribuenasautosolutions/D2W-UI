import {CheckCircle2,Download,FileSpreadsheet,Upload,UploadCloud,X,} from "lucide-react";

/*
 * Presentational upload block shared by every bulk-upload screen
 * (opening stock, sale items, ...). It owns markup only; each screen
 * passes its own state and handlers, so no business logic lives here.
 *
 * It renders a fragment: place it inside the screen's own
 * <section className="bulk-page-shell"> / <div className="bulk-page-shell__body">
 * so anything the screen renders after it (preview table, modals) stays
 * in the same container.
 */
export default function BulkUploadShell({
  /* heading + sample button */
  title,
  subtitle,
  hideTitle = false,
  sampleLabel = "Sample file",
  onSample,

  /* optional content between the heading and the dropzone (e.g. store select) */
  topSlot = null,

  /* dropzone + file row */
  file,
  fileInputRef,
  onFile,
  busy = false,
  accept = ".csv,.xls,.xlsx",
  dropTitle = "Drop the file here",
  hint = "CSV, XLS or XLSX · maximum 10 MB",
  progress = 0,
  onRemoveFile,

  /* alerts / summaries shown under the file row, and the requirements list */
  notices = null,
  checks = [],

  /* footer */
  onCancel,
  onSubmit,
  submitLabel,
  submitIcon: SubmitIcon = Upload,
  submitDisabled = false,
}) {
  return (
    <>
      {/* ---- Title row ---- */}
      <div className="bulk-page-shell__title-row">
        {!hideTitle && (
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        )}
        <button
          type="button"
          className="bulk-page-shell__sample-btn"
          onClick={onSample}
        >
          <Download size={15} />
          {sampleLabel}
        </button>
      </div>

      {topSlot}

      {/* ---- Dropzone ---- */}
      <label
        className={`bulk-page-shell__dropzone${file ? " has-file" : ""}${busy ? " is-busy" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) onFile(dropped);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          disabled={busy}
          accept={accept}
          style={{ display: "none" }}
          onChange={(event) => onFile(event.target.files?.[0] || null)}
        />

        <div className="bulk-page-shell__dropzone-icon">
          <UploadCloud size={22} />
        </div>

        {file ? (
          <>
            <div className="bulk-page-shell__dropzone-title">
              <FileSpreadsheet size={16} />
              {file.name}
            </div>
            <div className="bulk-page-shell__dropzone-sub">
              Click to choose a different file
            </div>
          </>
        ) : (
          <>
            <div className="bulk-page-shell__dropzone-title">{dropTitle}</div>
            <div className="bulk-page-shell__dropzone-sub">{hint}</div>
          </>
        )}

        <span className="bulk-page-shell__dropzone-browse">Browse file</span>
      </label>

      {/* ---- File row: progress + Remove file ---- */}
      {(file || progress > 0 || busy) && (
        <div className="bulk-file-row">
          {(progress > 0 || busy) && (
            <div
              className="bulk-progress"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Upload progress ${progress}%`}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
          {file && (
            <button
              type="button"
              className="bulk-page-shell__remove-file"
              onClick={onRemoveFile}
              title="Remove file"
            >
              <X size={15} />
              Remove file
            </button>
          )}
        </div>
      )}

      {notices}

      {checks.length > 0 && (
        <ul className="bulk-page-shell__checks">
          {checks.map((text) => (
            <li key={text}>
              <CheckCircle2 size={15} />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      )}

      {/* ---- Footer ---- */}
      <div className="bulk-page-shell__footer">
        <button
          type="button"
          className="bulk-page-shell__cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="bulk-page-shell__primary"
          disabled={submitDisabled}
          onClick={onSubmit}
        >
          <SubmitIcon size={15} />
          {submitLabel}
        </button>
      </div>
    </>
  );
}
