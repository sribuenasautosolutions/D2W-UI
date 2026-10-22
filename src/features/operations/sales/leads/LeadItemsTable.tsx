import ProductUnitFields, {
  ProductUnitLabel,
} from "../../../../components/ProductUnitFields";

const availabilityText = (value) =>
  ({
    AVAILABLE: "Available",
    PARTIAL: "Partial",
    ESTIMATED: "Estimated",
    NOT_AVAILABLE: "Not available",
  })[value] || "Not checked";

export function AvailabilityBadge({ value }) {
  const tone =
    value === "AVAILABLE" || value === "PARTIAL"
      ? "bg-emerald-50 text-emerald-700"
      : value === "NOT_AVAILABLE"
        ? "bg-red-50 text-red-700"
        : "bg-blue-50 text-blue-700";
  return (
    <span
      className={`inline-flex items-center justify-center min-h-[26px] px-2.5 rounded-full text-xs font-bold uppercase tracking-wider ${tone}`}
    >
      {availabilityText(value)}
    </span>
  );
}

/** Shared row-based entry for customer requirements and Procurement. */
export default function LeadItemsTable({
  rows,
  procurement = false,
  readOnly = false,
  busy = false,
  onChange,
  onRemove,
  onLookup,
  onSave,
  selection,
  onSelect,
}: any) {
  const field = (
    row: any,
    index: any,
    name: any,
    label: any,
    options: any = {},
  ) => (
    <input
      aria-label={`${label} ${index + 1}`}
      value={row[name] ?? ""}
      onChange={(event) => onChange(row.id ?? index, name, event.target.value)}
      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 read-only:bg-gray-50"
      {...options}
      disabled={busy}
      readOnly={readOnly || options.readOnly}
    />
  );
  return (
    <div
      className="overflow-x-auto border border-gray-200 rounded-lg"
      tabIndex={0}
      role="region"
      aria-label={
        procurement ? "Procurement items" : "Customer requirement items"
      }
    >
      <table className="w-full text-left text-xs border-collapse">
        <caption className="p-2 text-left text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
          {procurement
            ? "One row per customer requirement. Store stock and required quantity cannot be edited."
            : "Enter every requirement in this table. Use a new row for another part or vehicle."}
        </caption>
        <thead>
          {procurement && (
            <tr className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider text-[11px] border-b border-gray-200">
              <th colSpan={3} className="p-2">
                Customer requirement
              </th>
              <th colSpan={13} className="p-2">
                Procurement result
              </th>
              {selection && <th className="p-2">Offer</th>}
            </tr>
          )}
          <tr className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-[11px] border-b border-gray-200">
            <th className="p-2">#</th>
            <th className="p-2">Requirement</th>
            {!procurement && (
              <>
                <th className="p-2">Vehicle / year</th>
                <th className="p-2">VIN</th>
              </>
            )}
            <th className="p-2">Required qty</th>
            {procurement && (
              <>
                <th className="p-2">Part number</th>
                <th className="p-2">Product</th>
                <th className="p-2">Unit / Pack size</th>
                <th className="p-2">Brand</th>
                <th className="p-2">HSN</th>
                <th className="p-2">Store stock</th>
                <th className="p-2">MRP</th>
                <th className="p-2">Selling price</th>
                <th className="p-2">Offer qty</th>
                <th className="p-2">Availability</th>
                <th className="p-2">Expected date</th>
              </>
            )}
            <th className="p-2">Notes</th>
            <th className="p-2">Action</th>
            {selection && <th className="p-2">Select</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const catalogue = Boolean(
              row.productItemId ||
              row.localProductId ||
              row.lookup?.foundInCatalogue,
            );
            return (
              <tr
                key={row.id ?? index}
                className={`border-b border-gray-100 hover:bg-gray-50/60 ${row.error ? "bg-red-50/40" : ""}`}
              >
                <td className="p-2 text-center text-gray-500">{index + 1}</td>
                <td className="p-2">
                  {procurement ? (
                    <>
                      <strong>{row.requirement}</strong>
                      <ProductUnitLabel product={row} />
                      <small className="block text-gray-500">
                        {row.vehicleDescription || "No vehicle specified"}
                      </small>
                      {row.vin && (
                        <small className="block text-gray-500">
                          VIN: {row.vin}
                        </small>
                      )}
                    </>
                  ) : (
                    field(row, index, "requirement", "Requirement", {
                      required: true,
                      placeholder: "Brake pad",
                    })
                  )}
                </td>
                {!procurement && (
                  <>
                    <td className="p-2">
                      {field(row, index, "vehicleDescription", "Vehicle", {
                        placeholder: "Swift 2014",
                      })}
                    </td>
                    <td className="p-2">
                      {field(row, index, "vin", "VIN", {
                        placeholder: "Optional",
                      })}
                    </td>
                  </>
                )}
                <td className="p-2">
                  {procurement ? (
                    <strong className="font-bold text-gray-900">
                      {row.requestedQuantity}
                    </strong>
                  ) : (
                    field(
                      row,
                      index,
                      "requestedQuantity",
                      "Required quantity",
                      { type: "number", min: 1, step: 1, required: true },
                    )
                  )}
                </td>
                {procurement && (
                  <>
                    <td className="p-2">
                      <div className="flex gap-1">
                        {field(row, index, "partNumber", "Part number", {
                          onKeyDown: (event) => {
                            if (event.key === "Enter" && !readOnly) {
                              event.preventDefault();
                              onLookup(row.id);
                            }
                          },
                        })}
                        {!readOnly && (
                          <button
                            type="button"
                            disabled={busy || !row.partNumber?.trim()}
                            onClick={() => onLookup(row.id)}
                            aria-label={`Find part ${index + 1}`}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                          >
                            Find
                          </button>
                        )}
                      </div>
                      <small className="block text-[11px] text-gray-500 mt-0.5">
                        {catalogue
                          ? "Catalogue product"
                          : row.lookup
                            ? "Manual entry · Lead only"
                            : "Enter part and find"}
                      </small>
                    </td>
                    <td className="p-2">
                      {field(row, index, "productName", "Product", {
                        readOnly: catalogue,
                      })}
                    </td>
                    <td className="p-2">
                      {catalogue || readOnly ? (
                        <ProductUnitLabel product={row} />
                      ) : (
                        procurement &&
                        !catalogue &&
                        !readOnly && (
                          <ProductUnitFields
                            compact
                            value={row}
                            disabled={busy}
                            onChange={(next) => {
                              onChange(row.id, "stockUnit", next.stockUnit);
                              onChange(row.id, "packSize", next.packSize);
                              onChange(
                                row.id,
                                "contentsUnit",
                                next.contentsUnit,
                              );
                            }}
                          />
                        )
                      )}
                    </td>
                    <td className="p-2">
                      {field(row, index, "brandName", "Brand", {
                        readOnly: catalogue,
                      })}
                    </td>
                    <td className="p-2">
                      {field(row, index, "hsnCode", "HSN", {
                        readOnly: catalogue,
                      })}
                    </td>
                    <td className="p-2">
                      <strong className="font-bold text-gray-900">
                        {row.lookup?.availableQuantity ?? "—"}
                      </strong>
                      <small className="block text-[11px] text-gray-500">
                        {row.lookup ? "Read-only" : "Find to refresh"}
                      </small>
                    </td>
                    <td className="p-2">
                      {field(row, index, "quotedMrp", "MRP", {
                        type: "number",
                        min: 0,
                        step: "0.01",
                      })}
                    </td>
                    <td className="p-2">
                      {field(
                        row,
                        index,
                        "quotedSellingPrice",
                        "Selling price",
                        { type: "number", min: 0, step: "0.01" },
                      )}
                    </td>
                    <td className="p-2">
                      {field(row, index, "sellingQuantity", "Offer quantity", {
                        type: "number",
                        min: 0,
                        max: row.requestedQuantity,
                        step: 1,
                      })}
                    </td>
                    <td className="p-2">
                      {readOnly ? (
                        <AvailabilityBadge value={row.availabilityStatus} />
                      ) : (
                        <select
                          aria-label={`Availability ${index + 1}`}
                          value={row.availabilityStatus || ""}
                          disabled={busy}
                          onChange={(event) =>
                            onChange(
                              row.id,
                              "availabilityStatus",
                              event.target.value,
                            )
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                        >
                          <option value="">Choose</option>
                          {[
                            "AVAILABLE",
                            "PARTIAL",
                            "ESTIMATED",
                            "NOT_AVAILABLE",
                          ].map((value) => (
                            <option key={value} value={value}>
                              {availabilityText(value)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-2">
                      {row.availabilityStatus === "ESTIMATED"
                        ? field(
                            row,
                            index,
                            "estimatedAvailabilityDate",
                            "Expected date",
                            { type: "date" },
                          )
                        : "—"}
                    </td>
                  </>
                )}
                <td className="p-2">
                  {field(row, index, "notes", "Item notes", {
                    placeholder: "Optional",
                  })}
                </td>
                <td className="p-2">
                  {procurement ? (
                    <>
                      {!readOnly && (
                        <button
                          type="button"
                          disabled={busy || !row.dirty}
                          onClick={() => onSave(row.id)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save row
                        </button>
                      )}
                      <small className="block text-[11px] text-gray-500 mt-0.5">
                        {row.dirty
                          ? "Unsaved changes"
                          : row.availabilityStatus
                            ? "Saved"
                            : "Not saved"}
                      </small>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || rows.length === 1}
                      onClick={() => onRemove(index)}
                      aria-label={`Remove item ${index + 1}`}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded font-semibold disabled:opacity-40"
                    >
                      Remove
                    </button>
                  )}
                  {row.error && (
                    <small
                      role="alert"
                      className="block text-[11px] text-red-600"
                    >
                      {row.error}
                    </small>
                  )}
                </td>
                {selection && (
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Offer item ${index + 1}`}
                      disabled={
                        busy ||
                        !row.availabilityStatus ||
                        row.availabilityStatus === "NOT_AVAILABLE" ||
                        Number(row.sellingQuantity) <= 0
                      }
                      checked={selection.includes(row.id)}
                      onChange={(event) =>
                        onSelect(row.id, event.target.checked)
                      }
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
