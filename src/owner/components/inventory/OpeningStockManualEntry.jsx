import { useCallback, useEffect, useRef, useState } from "react";
import { createLocalProduct, getMyLocalProducts } from "../../../services/localProductService";
import { getAllBrands } from "../../../services/brandService";
import { searchProductByPartNumber } from "../../../services/productFitmentService";

const emptyForm = {
  partNumber: "",
  productName: "",
  brand: "",
  hsnCode: "",
  quantity: "",
  mrp: "",
  purchasePrice: "",
  sellingPrice: "",
};

// Every field is required EXCEPT hsnCode.
const REQUIRED_FIELDS = [
  ["partNumber", "Part Number"],
  ["productName", "Part Name"],
  ["brand", "Brand"],
  ["quantity", "Opening Quantity"],
  ["mrp", "MRP"],
  ["purchasePrice", "Purchase Price"],
  ["sellingPrice", "Selling Price"],
];

const ALL_FIELDS = [
  ["partNumber", "Part Number"],
  ["productName", "Part Name"],
  ["brand", "Brand"],
  ["hsnCode", "HSN Code"],
  ["quantity", "Opening Quantity"],
  ["mrp", "MRP"],
  ["purchasePrice", "Purchase Price"],
  ["sellingPrice", "Selling Price"],
];

function requestError(error, fallback) {
  const body = error?.response?.data;

  if (body?.fieldErrors) return Object.values(body.fieldErrors).join("; ");
  if (error?.response?.status === 403)
    return body?.message || "You are not authorized to manage opening stock for this store.";
  if (error?.response?.status === 401) return "Your session expired. Please sign in again.";

  return body?.message || (typeof body === "string" ? body : "") || error?.message || fallback;
}

export default function OpeningStockManualEntry({
  storeId,
  validatePrices,
  onSelectApproved,
  compact = false,
}) {
  const [form, setForm] = useState(emptyForm);
  const [brands, setBrands] = useState([]);
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submitting = useRef(false);
  const context = useRef(storeId);

  useEffect(() => {
    context.current = storeId;
    setRequests([]);
    setError("");
    setSuccess("");
  }, [storeId]);

  const refresh = useCallback(async () => {
    if (!storeId) {
      setRequests([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getMyLocalProducts(storeId);
      if (context.current === storeId) setRequests(data || []);
    } catch (err) {
      if (context.current === storeId) {
        setError(requestError(err, "Unable to load approval requests. Please retry."));
      }
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  // Only load approval requests when the full (non-compact) view is active
  useEffect(() => {
    if (!compact) refresh();
  }, [refresh, compact]);

  useEffect(() => {
    getAllBrands()
      .then(setBrands)
      .catch((err) => setError(requestError(err, "Unable to load brands. Please retry.")));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;

    setError("");
    setSuccess("");

    const errors = [];

    REQUIRED_FIELDS.forEach(([key, label]) => {
      if (!String(form[key]).trim()) errors.push(`${label} is required`);
    });

    if (!storeId) errors.push("Select a receiving store");

    // HSN is optional, but if entered it must be 4–8 digits
    const hsn = form.hsnCode.trim();
    if (hsn && !/^\d{4,8}$/.test(hsn)) {
      errors.push("HSN Code must contain 4 to 8 digits");
    }

    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.push("Opening Quantity must be a positive whole number");
    }

    validatePrices({ ...form, priceSource: "MANUAL" }, errors);

    if (errors.length) {
      setError(errors.join("; "));
      return;
    }

    const submittedStore = storeId;
    submitting.current = true;
    setBusy(true);

    try {
      const result = await createLocalProduct(
        {
          partNumber: form.partNumber.trim(),
          productName: form.productName.trim(),
          brand: form.brand.trim(),
          hsnCode: hsn || null,
          quantity,
          mrp: Number(form.mrp),
          purchasePrice: Number(form.purchasePrice),
          sellingPrice: Number(form.sellingPrice),
        },
        submittedStore
      );

      if (result?.success === false) throw new Error(result.message || "Unable to add opening stock.");
      if (result?.success !== true) {
        throw new Error(
          "The server response did not confirm successful inventory creation. Please refresh inventory before retrying."
        );
      }

      if (context.current === submittedStore) {
        const approvalMessage = result.approvalRequestId
          ? ` Approval Request ID: #${result.approvalRequestId}.`
          : "";
        setSuccess(
          `${result.message || "Opening stock processed successfully."} Quantity: ${quantity}.${approvalMessage}`
        );
        setForm(emptyForm);
        if (!compact) await refresh();
      }
    } catch (err) {
      setError(requestError(err, "Submission failed. Check your connection and retry."));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const selectApproved = async (request) => {
    if (submitting.current || request.approvalStatus !== "APPROVED" || !request.globalProductId) return;

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      const product = await searchProductByPartNumber(request.partNumber);
      if (!product || Number(product.id) !== Number(request.globalProductId)) {
        throw new Error("Approved product is no longer available. Refresh requests.");
      }
      onSelectApproved({
        ...request,
        ...product,
        mrp: request.mrp,
        purchasePrice: request.purchasePrice,
        sellingPrice: request.sellingPrice,
      });
    } catch (err) {
      setError(requestError(err, "Unable to select the approved product."));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  console.log("OpeningStockManualEntry → storeId:", storeId, "| busy:", busy);
  return (
    <div className={`opening-manual-panel${compact ? " opening-manual-panel--compact" : ""}`}>
      {!compact && (
        <>
          <h3>Manual Entry — Opening Stock</h3>
          <p>
            Enter the product details and opening quantity. The backend processes the inventory entry
            and returns the result along with an approval request ID when available.
          </p>
        </>
      )}

      <form onSubmit={submit}>
        <fieldset
          disabled={busy}
          className={`bulk-edit-grid opening-manual-fields${
            compact ? " opening-manual-fields--compact" : ""
          }`}
        >
          {ALL_FIELDS.map(([key, label]) => {
            const isPrice = ["mrp", "purchasePrice", "sellingPrice"].includes(key);
            const isQuantity = key === "quantity";
            const isOptional = key === "hsnCode";

            return (
              <label key={key} htmlFor={`opening-manual-${key}`}>
                {label} {!isOptional && <span className="stock-req">*</span>}


                <input
                  id={`opening-manual-${key}`}
                  name={key}
                  required={!isOptional}
                  value={form[key]}
                  type={isPrice || isQuantity ? "number" : "text"}
                  min={isPrice ? "0.01" : isQuantity ? "1" : undefined}
                  step={isPrice ? "0.01" : isQuantity ? "1" : undefined}
                  maxLength={
                    { partNumber: 100, productName: 200, brand: 150, hsnCode: 8 }[key]
                  }
                  list={key === "brand" ? "opening-manual-brands" : undefined}
                  placeholder={isOptional ? "Optional" : undefined}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [key]: event.target.value }))
                  }
                />
              </label>
            );
          })}

          <datalist id="opening-manual-brands">
            {brands.map((brand) => (
              <option key={brand.id} value={brand.brandName} />
            ))}
          </datalist>
        </fieldset>

        <button
          type="submit"
          className="bulk-button bulk-button--primary"
          disabled={busy || !storeId}
        >
          {busy ? "Processing…" : "Submit Opening Stock"}
        </button>
      </form>

      {error && <div role="alert" className="bulk-alert bulk-alert--error">{error}</div>}
      {success && <div role="status" className="bulk-alert bulk-alert--success">{success}</div>}

      {!compact && (
        <>
          <div className="bulk-preview-head">
            <h3>Product Approval Requests</h3>
            <button
              type="button"
              className="bulk-button"
              onClick={refresh}
              disabled={loading || busy || !storeId}
            >
              Refresh Requests
            </button>
          </div>

          {loading && <p>Loading approval requests…</p>}

          <div className="bulk-table-wrap">
            <table className="bulk-table opening-manual-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Part Number</th>
                  <th>Part Name</th>
                  <th>Brand</th>
                  <th>Status</th>
                  <th>Review / Opening Stock</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const status =
                    request.approvalStatus ||
                    (request.status === "MERGED" ? "APPROVED" : request.status);

                  return (
                    <tr key={request.id}>
                      <td>#{request.approvalRequestId || "—"}</td>
                      <td>{request.partNumber}</td>
                      <td>{request.productName}</td>
                      <td>{request.brand}</td>
                      <td>
                        <span
                          className={`bulk-status bulk-status--${
                            status === "APPROVED" ? "valid" : status === "REJECTED" ? "invalid" : "duplicate_in_file"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td>
                        {request.remarks && <span>{request.remarks}</span>}
                        <button
                          type="button"
                          className="bulk-button"
                          disabled={busy || status !== "APPROVED" || !request.globalProductId}
                          onClick={() => selectApproved(request)}
                        >
                          Add to Opening Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!requests.length && !loading && (
                  <tr>
                    <td colSpan="6">No approval requests for this store.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}