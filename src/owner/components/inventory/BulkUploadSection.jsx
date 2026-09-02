import { useEffect, useRef, useState } from "react";
import {
  CirclePlus,
  Download,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import api from "../../../services/api";

import "./BulkUploadSection.css";
import "./BulkUploadPriceSettings.css";

const CHUNK_SIZE = 100;

const editableFields = [
  ["partNumber", "Part Number"],
  ["itemName", "Item Name"],
  ["brandName", "Brand"],
  ["hsnCode", "HSN Code"],
  ["quantity", "Qty"],
  ["purchasePrice", "Purchase Price"],
  ["mrp", "MRP"],
  ["sellingPrice", "Selling Price"],
  ["gstPercentage", "GST %"],
  ["rackNumber", "Rack Number"],
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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(url);
}

/*
 * ===========================================================
 * PRICE INPUT VALIDATION
 * ===========================================================
 *
 * Opening Stock requires exactly ONE of:
 *
 *   Purchase Price
 *   MRP
 *   Selling Price
 *
 * The frontend does NOT calculate the remaining prices.
 *
 * PriceCalculationService in the backend is the source of truth.
 */

function validatePriceSelection(row, errors) {
  const prices = [
    ["purchasePrice", "Purchase Price"],
    ["mrp", "MRP"],
    ["sellingPrice", "Selling Price"],
  ];

  let entered = 0;

  prices.forEach(([field, label]) => {
    const value = row[field];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      entered++;

      const number = Number(value);

      if (!Number.isFinite(number) || number <= 0) {
        errors.push(`${label} must be greater than zero`);
      }
    }
  });

  if (entered === 0) {
    errors.push(
      "Enter exactly one of Purchase Price, MRP or Selling Price"
    );
  } else if (entered > 1) {
    errors.push(
      "Enter only one of Purchase Price, MRP or Selling Price"
    );
  }
}

/*
 * ===========================================================
 * ROW VALIDATION
 * ===========================================================
 */

function validateEditedRow(row) {
  const errors = [];

  if (
    String(row.partNumber || "")
      .trim()
      .toUpperCase()
      .startsWith("SAMPLE-")
  ) {
    errors.push(
      "Template sample row must be replaced with a real product before import"
    );
  }

  if (!row.storeId) {
    errors.push("Valid store is required");
  }

  if (!String(row.partNumber || "").trim()) {
    errors.push("Part Number is required");
  }

  if (!String(row.itemName || "").trim()) {
    errors.push("Item Name is required");
  }

  if (!String(row.brandName || "").trim()) {
    errors.push("Brand is required");
  }

  if (!String(row.hsnCode || "").trim()) {
    errors.push("HSN Code is required");
  }

  const quantity = Number(row.quantity);

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    errors.push(
      "Quantity must be a whole number above zero"
    );
  }

  /*
   * GST Percentage is mandatory.
   */
  if (
    row.gstPercentage === null ||
    row.gstPercentage === undefined ||
    String(row.gstPercentage).trim() === ""
  ) {
    errors.push(
      "GST Percentage is required"
    );
  } else {

    const gst = Number(row.gstPercentage);

    if (
      !Number.isFinite(gst) ||
      gst < 0 ||
      gst > 100
    ) {
      errors.push(
        "GST Percentage must be between 0 and 100"
      );
    }
  }

  /*
   * HSN must contain 4 to 8 digits.
   */
  if (
    row.hsnCode &&
    !/^\d{4,8}$/.test(
      String(row.hsnCode).trim()
    )
  ) {
    errors.push(
      "HSN Code must contain 4 to 8 digits"
    );
  }

  /*
   * Rack Number is optional.
   */
  if (
    row.rackNumber &&
    String(row.rackNumber).trim().length > 80
  ) {
    errors.push(
      "Rack Number cannot exceed 80 characters"
    );
  }

  /*
   * Exactly ONE price must be supplied.
   */
  validatePriceSelection(
    row,
    errors
  );

  return errors;
}

/*
 * ===========================================================
 * CLIENT-SIDE ROW RECHECK
 * ===========================================================
 *
 * IMPORTANT:
 *
 * This function validates the row only.
 *
 * It does NOT calculate prices.
 *
 * The backend PriceCalculationService calculates:
 *
 *   Purchase Price
 *   Selling Price
 *   MRP
 *   Discount
 *   Line Total
 */

function recheckRows(rows) {
  const keys = new Map();

  return rows.map((source) => {
    const row = {
      ...source,
      sampleRow: false,
    };

    const errors =
      validateEditedRow(row);

    const key =
      `${row.storeId || ""}:${
        String(row.partNumber || "")
          .trim()
          .toUpperCase()
      }`;

    if (
      row.storeId &&
      row.partNumber &&
      keys.has(key)
    ) {
      errors.push(
        "Duplicate store and part number in this file"
      );
    } else if (
      row.storeId &&
      row.partNumber
    ) {
      keys.set(
        key,
        row.rowNumber
      );
    }

    let status = "VALID";

    if (
      errors.some(
        (item) =>
          item.startsWith("Duplicate")
      )
    ) {
      status =
        "DUPLICATE_IN_FILE";
    } else if (
      errors.length
    ) {
      status =
        "INVALID";
    }

    return {
      ...row,
      errors,
      status,
    };
  });
}

/*
 * ===========================================================
 * OPENING STOCK BULK UPLOAD
 * ===========================================================
 */

export default function BulkUploadSection() {

  const user = currentUser();

  const isSuperAdmin =
    user.role === "SUPER_ADMIN";

  const [
    stores,
    setStores,
  ] = useState([]);

  const [
    selectedStoreId,
    setSelectedStoreId,
  ] = useState(
    user.storeId
      ? String(user.storeId)
      : ""
  );

  const fixedStoreId =
    selectedStoreId || null;

  const fileInputRef =
    useRef(null);

  const [
    file,
    setFile,
  ] = useState(null);

  const [
    preview,
    setPreview,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    filter,
    setFilter,
  ] = useState("ALL");

  const [
    editing,
    setEditing,
  ] = useState(null);

  const [
    confirming,
    setConfirming,
  ] = useState(false);

  const [
    importSummary,
    setImportSummary,
  ] = useState(null);

  const [
    lastRejectedRows,
    setLastRejectedRows,
  ] = useState([]);

  /*
   * ===========================================================
   * LOAD STORES
   * ===========================================================
   */

  useEffect(() => {

    if (!isSuperAdmin) {
      return;
    }

    api
      .get(
        "/stores",
        {
          params: {
            page: 0,
            size: 100,
            active: true,
          },
        }
      )
      .then(({ data }) => {

        setStores(
          Array.isArray(data?.content)
            ? data.content
            : []
        );
      })
      .catch(() => {

        setError(
          "Unable to load stores."
        );
      });

  }, [isSuperAdmin]);

  /*
   * ===========================================================
   * DERIVED ROW DATA
   * ===========================================================
   */

  const rows =
    preview?.rows || [];

  const visibleRows =
    filter === "ALL"
      ? rows
      : rows.filter(
          (row) =>
            row.status === filter
        );

  const validRows =
    rows.filter(
      (row) =>
        row.status === "VALID"
    );

  const rejectedRows =
    rows.filter(
      (row) =>
        ![
          "VALID",
          "IMPORTED",
        ].includes(
          row.status
        )
    );

  /*
   * ===========================================================
   * REFRESH COUNTS
   * ===========================================================
   */

  const refreshCounts = (
    nextRows
  ) => {

    setPreview(
      (current) => ({
        ...(current || {}),

        rows: nextRows,

        totalRows:
          nextRows.length,

        validRows:
          nextRows.filter(
            (row) =>
              row.status === "VALID"
          ).length,

        invalidRows:
          nextRows.filter(
            (row) =>
              row.status !== "VALID"
          ).length,

        duplicateRows:
          nextRows.filter(
            (row) =>
              row.status ===
              "DUPLICATE_IN_FILE"
          ).length,
      })
    );
  };

  /*
   * ===========================================================
   * PREVIEW FILE
   * ===========================================================
   */

  const previewFile =
    async () => {

      if (!file) {

        setError(
          "Choose a CSV, XLS, or XLSX file first."
        );

        return;
      }

      if (!fixedStoreId) {

        setError(
          "Select the store that will receive this opening stock."
        );

        return;
      }

      setBusy(true);

      setError("");

      setPreview(null);

      setImportSummary(null);

      setLastRejectedRows([]);

      setProgress(2);

      try {

        const data =
          new FormData();

        data.append(
          "file",
          file
        );

        data.append(
          "storeId",
          fixedStoreId
        );

        const response =
          await api.post(
            "/store-inventory/bulk-upload/preview",
            data,
            {
              headers: {
                "Content-Type":
                  "multipart/form-data",
              },

              onUploadProgress:
                ({
                  loaded,
                  total,
                }) => {

                  if (total) {

                    setProgress(
                      Math.max(
                        2,
                        Math.round(
                          (loaded / total) *
                            25
                        )
                      )
                    );
                  }
                },
            }
          );

        /*
         * Backend is responsible for:
         *
         * - validation
         * - product matching
         * - price calculation
         * - GST/tax calculation
         */
        setPreview(
          response.data
        );

        setProgress(30);

      } catch (
        requestError
      ) {

        setProgress(0);

        setError(
          errorMessage(
            requestError,
            "The file could not be previewed."
          )
        );

      } finally {

        setBusy(false);
      }
    };

  /*
   * ===========================================================
   * CLEAR FILE
   * ===========================================================
   */

  const clearFile =
    () => {

      setFile(null);

      setPreview(null);

      setProgress(0);

      setError("");

      setImportSummary(null);

      setLastRejectedRows([]);

      setFilter("ALL");

      setEditing(null);

      setConfirming(false);

      if (
        fileInputRef.current
      ) {

        fileInputRef.current.value =
          "";
      }
    };

  /*
   * ===========================================================
   * ADD MANUAL ROW
   * ===========================================================
   */

  const addRow =
    () => {

      const nextRowNumber =
        rows.length
          ? Math.max(
              ...rows.map(
                (row) =>
                  row.rowNumber
              )
            ) + 1
          : 2;

      const selectedStore =
        stores.find(
          (store) =>
            String(store.id) ===
            String(fixedStoreId)
        );

      const newRow = {

        rowNumber:
          nextRowNumber,

        partNumber:
          "",

        itemName:
          "",

        brandName:
          "",

        quantity:
          "",

        purchasePrice:
          "",

        sellingPrice:
          "",

        mrp:
          "",

        hsnCode:
          "",

        gstPercentage:
          "",

        rackNumber:
          "",

        storeId:
          fixedStoreId || null,

        storeName:
          selectedStore?.storeName ||
          user.storeName ||
          "",

        storeCode:
          selectedStore?.storeCode ||
          null,

        productMatch:
          null,

        status:
          "INVALID",

        errors:
          [
            "Complete the row before import",
          ],
      };

      const nextRows =
        recheckRows([
          ...rows,
          newRow,
        ]);

      refreshCounts(
        nextRows
      );

      setEditing(
        newRow
      );
    };

  /*
   * ===========================================================
   * REMOVE ROW
   * ===========================================================
   */

  const removeRow =
    (rowNumber) => {

      const nextRows =
        rows.filter(
          (row) =>
            row.rowNumber !==
            rowNumber
        );

      refreshCounts(
        recheckRows(
          nextRows
        )
      );
    };

  /*
   * ===========================================================
   * EDIT PRICE FIELD
   * ===========================================================
   *
   * When the user changes one pricing input:
   *
   * - The other calculated values are cleared.
   * - We do NOT perform our own price mathematics.
   * - Backend PriceCalculationService calculates them during
   *   import.
   */

  const updateEditingField =
    (
      field,
      value
    ) => {

      setEditing(
        (current) => {

          if (!current) {
            return current;
          }

          const next = {
            ...current,
            [field]: value,
          };

          /*
           * If a pricing input is changed,
           * exactly that price becomes the source.
           *
           * The other two are cleared because they
           * must not be treated as manually entered values.
           */
          if (
            [
              "purchasePrice",
              "sellingPrice",
              "mrp",
            ].includes(field)
          ) {

            next.purchasePrice =
              "";

            next.sellingPrice =
              "";

            next.mrp =
              "";

            next[field] =
              value;
          }

          return next;
        }
      );
    };

  /*
   * ===========================================================
   * SAVE EDITED ROW
   * ===========================================================
   */

  const saveEditedRow =
    () => {

      if (!editing) {
        return;
      }

      const editedRow =
        {
          ...editing,
        };

      const nextRows =
        rows.map(
          (row) =>
            row.rowNumber ===
            editing.rowNumber
              ? {
                  ...row,
                  ...editedRow,
                }
              : row
        );

      const checkedRows =
        recheckRows(
          nextRows
        );

      refreshCounts(
        checkedRows
      );

      setEditing(
        null
      );
    };

  /*
   * ===========================================================
   * IMPORT
   * ===========================================================
   */

  const importRows =
    async () => {

      setConfirming(
        false
      );

      setBusy(true);

      setError("");

      setProgress(30);

      let processed = 0;

      const summary = {

        importedRows:
          0,

        failedRows:
          0,

        createdRows:
          0,

        updatedRows:
          0,
      };

      let nextRows =
        [...rows];

      /*
       * Take a fresh list so we do not rely on a stale
       * closure if rows have been edited.
       */
      const rowsToImport =
        nextRows.filter(
          (row) =>
            row.status ===
            "VALID"
        );

      try {

        for (
          let offset = 0;
          offset <
          rowsToImport.length;
          offset +=
            CHUNK_SIZE
        ) {

          const chunk =
            rowsToImport.slice(
              offset,
              offset +
                CHUNK_SIZE
            );

          const response =
            await api.post(
              "/store-inventory/bulk-upload/import",
              {
                rows: chunk,
              }
            );

          Object.keys(
            summary
          ).forEach(
            (key) => {

              summary[key] +=
                Number(
                  response.data?.[key] ||
                    0
                );
            }
          );

          const imported =
            new Map(
              (
                response.data
                  ?.rows || []
              ).map(
                (row) => [
                  row.rowNumber,
                  row,
                ]
              )
            );

          nextRows =
            nextRows.map(
              (row) =>
                imported.get(
                  row.rowNumber
                ) || row
            );

          processed +=
            chunk.length;

          setProgress(
            rowsToImport.length
              ? 30 +
                  Math.round(
                    (processed /
                      rowsToImport.length) *
                      70
                  )
              : 100
          );

          setPreview(
            (current) => ({
              ...(current || {}),
              rows: nextRows,
            })
          );
        }

        const remainingRejected =
          nextRows.filter(
            (row) =>
              row.status !==
              "IMPORTED"
          );

        summary.failedRows =
          Math.max(
            summary.failedRows,
            remainingRejected.length
          );

        setImportSummary(
          summary
        );

        setProgress(
          100
        );

        /*
         * Only clear the active upload when at least
         * one row was actually imported.
         */
        if (
          summary.importedRows >
          0
        ) {

          setLastRejectedRows(
            remainingRejected
          );

          setFile(null);

          setPreview(null);

          setFilter("ALL");

          setEditing(null);

          setProgress(0);

          if (
            fileInputRef.current
          ) {

            fileInputRef.current.value =
              "";
          }
        }

      } catch (
        requestError
      ) {

        setError(
          `${errorMessage(
            requestError,
            "Import stopped."
          )} ${processed} row(s) were completed before it stopped.`
        );

      } finally {

        setBusy(false);
      }
    };

  /*
   * ===========================================================
   * DOWNLOAD TEMPLATE
   * ===========================================================
   */

  const downloadTemplate =
    async () => {

      try {

        const response =
          await api.get(
            "/store-inventory/template",
            {
              responseType:
                "blob",
            }
          );

        downloadBlob(
          response.data,
          "inventory-bulk-upload-template.xlsx"
        );

      } catch (
        requestError
      ) {

        setError(
          errorMessage(
            requestError,
            "Could not download the template."
          )
        );
      }
    };

  /*
   * ===========================================================
   * DOWNLOAD REJECTED ROWS
   * ===========================================================
   */

  const downloadRejected =
    async () => {

      try {

        const rowsToDownload =
          preview
            ? rejectedRows
            : lastRejectedRows;

        if (
          !rowsToDownload.length
        ) {

          setError(
            "There are no rejected rows to download."
          );

          return;
        }

        const response =
          await api.post(
            "/store-inventory/bulk-upload/rejected/download",
            rowsToDownload,
            {
              responseType:
                "blob",
            }
          );

        downloadBlob(
          response.data,
          "inventory-rejected-rows.xlsx"
        );

      } catch (
        requestError
      ) {

        setError(
          errorMessage(
            requestError,
            "Could not download rejected rows."
          )
        );
      }
    };

  /*
   * ===========================================================
   * RENDER
   * ===========================================================
   */

  return (
    <section className="bulk-workflow">

      <div className="bulk-workflow__toolbar">

        <div>
          <h2>
            Opening Stock
          </h2>

          <p>
            Select one receiving store, then upload stock without vendor or invoice details.
          </p>
        </div>

        {isSuperAdmin && (
          <label className="bulk-header-setting">

            <span>
              Receiving store
            </span>

            <select
              value={
                selectedStoreId
              }
              onChange={(
                event
              ) => {

                setSelectedStoreId(
                  event.target.value
                );

                clearFile();
              }}
            >

              <option value="">
                Select store
              </option>

              {stores.map(
                (store) => (
                  <option
                    key={
                      store.id
                    }
                    value={
                      store.id
                    }
                  >
                    {store.storeName} (
                    {store.storeCode}
                    )
                  </option>
                )
              )}

            </select>

          </label>
        )}

        <button
          className="bulk-button bulk-button--secondary"
          type="button"
          onClick={
            downloadTemplate
          }
        >
          <Download
            size={15}
          />

          Sample file
        </button>

      </div>

      <div className="bulk-filebar">

        <label className="bulk-filepicker">

          <FileSpreadsheet
            size={19}
          />

          <span>
            {file?.name ||
              "Choose CSV, XLS, or XLSX"}
          </span>

          <input
            ref={
              fileInputRef
            }
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={(
              event
            ) => {

              setFile(
                event.target
                  .files?.[0] ||
                  null
              );

              setPreview(
                null
              );

              setImportSummary(
                null
              );

              setLastRejectedRows(
                []
              );

              setProgress(
                0
              );

              setError(
                ""
              );
            }}
          />

        </label>

        {file && (
          <button
            type="button"
            className="bulk-icon"
            title="Remove file"
            onClick={
              clearFile
            }
          >
            <X
              size={16}
            />
          </button>
        )}

        <button
          className="bulk-button bulk-button--primary"
          type="button"
          disabled={
            !file ||
            !fixedStoreId ||
            busy
          }
          onClick={
            previewFile
          }
        >

          <Upload
            size={15}
          />

          {busy && !preview
            ? "Reading..."
            : "Preview file"}

        </button>

      </div>

      {(progress > 0 ||
        busy) && (
        <div
          className="bulk-progress"
          aria-label={`Upload progress ${progress}%`}
        >
          <span
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      )}

      {error && (
        <div className="bulk-alert bulk-alert--error">
          {error}
        </div>
      )}

      {importSummary && (
        <div className="bulk-alert bulk-alert--success">

          Imported{" "}
          {
            importSummary.importedRows
          }{" "}
          row(s):{" "}
          {
            importSummary.createdRows
          }{" "}
          created and{" "}
          {
            importSummary.updatedRows
          }{" "}
          updated. Failed:{" "}
          {
            importSummary.failedRows
          }.

          {lastRejectedRows.length >
            0 && (
            <button
              type="button"
              className="bulk-button bulk-button--secondary"
              onClick={
                downloadRejected
              }
            >
              <Download
                size={14}
              />

              Download rejected rows
            </button>
          )}

        </div>
      )}

      {preview && (
        <>

          <div className="bulk-kpis">

            <button
              className={
                filter === "ALL"
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                setFilter(
                  "ALL"
                )
              }
            >
              <strong>
                {rows.length}
              </strong>

              <span>
                Total rows
              </span>
            </button>

            <button
              className={
                filter === "VALID"
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                setFilter(
                  "VALID"
                )
              }
            >
              <strong className="text-success">
                {
                  validRows.length
                }
              </strong>

              <span>
                Ready
              </span>
            </button>

            <button
              className={
                filter === "INVALID"
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                setFilter(
                  "INVALID"
                )
              }
            >
              <strong className="text-danger">
                {
                  rows.filter(
                    (row) =>
                      row.status ===
                      "INVALID"
                  ).length
                }
              </strong>

              <span>
                Invalid
              </span>
            </button>

            <button
              className={
                filter ===
                "DUPLICATE_IN_FILE"
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                setFilter(
                  "DUPLICATE_IN_FILE"
                )
              }
            >
              <strong className="text-warning">
                {
                  rows.filter(
                    (row) =>
                      row.status ===
                      "DUPLICATE_IN_FILE"
                  ).length
                }
              </strong>

              <span>
                Duplicates
              </span>
            </button>

            <button
              className={
                filter === "IMPORTED"
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                setFilter(
                  "IMPORTED"
                )
              }
            >
              <strong>
                {
                  rows.filter(
                    (row) =>
                      row.status ===
                      "IMPORTED"
                  ).length
                }
              </strong>

              <span>
                Imported
              </span>
            </button>

          </div>

          <div className="bulk-preview-head">

            <div>
              <h3>
                Import Preview
              </h3>

              <span>
                Click the pencil to edit a row. Changes are revalidated before import.
              </span>
            </div>

            <div className="bulk-preview-actions">

              <button
                className="bulk-button bulk-button--secondary"
                type="button"
                onClick={
                  addRow
                }
              >
                <CirclePlus
                  size={14}
                />

                Add row
              </button>

              {rejectedRows.length >
                0 && (
                <button
                  className="bulk-button bulk-button--secondary"
                  onClick={
                    downloadRejected
                  }
                >
                  <Download
                    size={14}
                  />

                  Rejected rows
                </button>
              )}

              <button
                className="bulk-button bulk-button--primary"
                disabled={
                  !validRows.length ||
                  busy
                }
                onClick={() =>
                  setConfirming(
                    true
                  )
                }
              >
                Import{" "}
                {
                  validRows.length
                }{" "}
                valid rows
              </button>

            </div>

          </div>

          <div className="bulk-table-wrap">

            <table className="bulk-table">

              <thead>

                <tr>
                  <th>
                    Row
                  </th>

                  <th>
                    Product
                  </th>

                  <th>
                    Store
                  </th>

                  <th>
                    Qty
                  </th>

                  <th>
                    Purchase
                  </th>

                  <th>
                    Selling
                  </th>

                  <th>
                    MRP
                  </th>

                  <th>
                    GST
                  </th>

                  <th>
                    Match
                  </th>

                  <th>
                    Status / reason
                  </th>

                  <th />
                </tr>

              </thead>

              <tbody>

                {visibleRows.map(
                  (row) => (
                    <tr
                      key={
                        row.rowNumber
                      }
                    >

                      <td>
                        {
                          row.rowNumber
                        }
                      </td>

                      <td>
                        <strong>
                          {
                            row.itemName ||
                            "-"
                          }
                        </strong>

                        <span>
                          {
                            row.partNumber ||
                            "No part number"
                          }{" "}
                          |{" "}
                          {
                            row.brandName ||
                            "No brand"
                          }
                        </span>
                      </td>

                      <td>
                        {
                          row.storeName ||
                          row.storeCode ||
                          "-"
                        }
                      </td>

                      <td>
                        {
                          row.quantity ??
                          "-"
                        }
                      </td>

                      <td>
                        {
                          row.purchasePrice ??
                          "-"
                        }
                      </td>

                      <td>
                        {
                          row.sellingPrice ??
                          "-"
                        }
                      </td>

                      <td>
                        {
                          row.mrp ??
                          "-"
                        }
                      </td>

                      <td>
                        {
                          row.gstPercentage ??
                          "-"
                        }%
                      </td>

                      <td>
                        <span className="bulk-tag">
                          {
                            row.productMatch ||
                            "-"
                          }
                        </span>
                      </td>

                      <td>

                        <span
                          className={`bulk-status bulk-status--${row.status?.toLowerCase()}`}
                        >
                          {
                            row.status
                              ?.replaceAll(
                                "_",
                                " "
                              )
                          }
                        </span>

                        {row.errors
                          ?.length >
                          0 && (
                          <small
                            title={row.errors.join(
                              "; "
                            )}
                          >
                            {
                              row.errors.join(
                                "; "
                              )
                            }
                          </small>
                        )}

                      </td>

                      <td
                        style={{
                          display:
                            "flex",
                          gap: 6,
                        }}
                      >

                        <button
                          className="bulk-icon"
                          title="Edit row"
                          onClick={() =>
                            setEditing(
                              row
                            )
                          }
                        >
                          <Pencil
                            size={14}
                          />
                        </button>

                        <button
                          className="bulk-icon"
                          title="Remove row"
                          onClick={() =>
                            removeRow(
                              row.rowNumber
                            )
                          }
                        >
                          <Trash2
                            size={14}
                          />
                        </button>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

            {visibleRows.length ===
              0 && (
              <div className="bulk-empty">
                No rows match this filter.
              </div>
            )}

          </div>

        </>
      )}

      {editing && (
        <div className="bulk-modal-backdrop">

          <div
            className="bulk-modal"
            role="dialog"
            aria-modal="true"
          >

            <div className="bulk-modal__head">

              <div>

                <h3>
                  Edit row{" "}
                  {
                    editing.rowNumber
                  }
                </h3>

                <span>
                  Enter exactly one price. The other prices are calculated by the backend.
                </span>

              </div>

              <button
                className="bulk-icon"
                onClick={() =>
                  setEditing(
                    null
                  )
                }
              >
                <X
                  size={18}
                />
              </button>

            </div>

            <div className="bulk-edit-grid">

              {editableFields.map(
                ([
                  field,
                  label,
                ]) => (

                  <label
                    key={
                      field
                    }
                  >

                    <span>
                      {
                        label
                      }
                    </span>

                    <input
                      type={[
                        "quantity",
                        "purchasePrice",
                        "sellingPrice",
                        "mrp",
                        "gstPercentage",
                      ].includes(
                        field
                      )
                        ? "number"
                        : "text"
                      }
                      min={
                        [
                          "quantity",
                          "purchasePrice",
                          "sellingPrice",
                          "mrp",
                          "gstPercentage",
                        ].includes(
                          field
                        )
                          ? "0"
                          : undefined
                      }
                      step={
                        [
                          "purchasePrice",
                          "sellingPrice",
                          "mrp",
                          "gstPercentage",
                        ].includes(
                          field
                        )
                          ? "0.01"
                          : undefined
                      }
                      value={
                        editing[
                          field
                        ] ?? ""
                      }
                      onChange={(
                        event
                      ) => {

                        updateEditingField(
                          field,
                          event.target
                            .value
                        );
                      }}
                    />

                  </label>

                )
              )}

            </div>

            <div className="bulk-modal__actions">

              <button
                className="bulk-button bulk-button--danger"
                onClick={() => {

                  removeRow(
                    editing.rowNumber
                  );

                  setEditing(
                    null
                  );
                }}
              >
                Remove row
              </button>

              <button
                className="bulk-button bulk-button--secondary"
                onClick={() =>
                  setEditing(
                    null
                  )
                }
              >
                Cancel
              </button>

              <button
                className="bulk-button bulk-button--primary"
                onClick={
                  saveEditedRow
                }
              >
                Save row
              </button>

            </div>

          </div>

        </div>
      )}

      {confirming && (
        <div className="bulk-modal-backdrop">

          <div
            className="bulk-modal bulk-modal--confirm"
            role="dialog"
            aria-modal="true"
          >

            <h3>
              Import{" "}
              {
                validRows.length
              }{" "}
              validated rows?
            </h3>

            <p>
              This will create or update inventory and batches. Invalid and duplicate rows will remain unimported.
            </p>

            <div className="bulk-modal__actions">

              <button
                className="bulk-button bulk-button--secondary"
                onClick={() =>
                  setConfirming(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                className="bulk-button bulk-button--primary"
                onClick={
                  importRows
                }
              >
                Confirm import
              </button>

            </div>

          </div>

        </div>
      )}

    </section>
  );
}