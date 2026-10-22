const units = {
  PCS: "Piece",
  BOTTLE: "Bottle",
  CAN: "Can",
  BOX: "Box",
  SET: "Set",
  PAIR: "Pair",
  PACK: "Pack",
};
const contents = { LITRE: "L", ML: "ml", KG: "kg", G: "g", PCS: "pieces" };

export function ProductUnitLabel({ product }) {
  const unit = units[product?.stockUnit] || "Piece";
  return (
    <small className="flex flex-wrap items-center gap-1.5 text-slate-500 text-[11px] font-normal leading-normal mt-0.5">
      <span>{unit}</span>
      {product?.packSize && product?.contentsUnit ? (
        <span>
          <span className="mr-1 text-slate-400">·</span>
          {product.packSize}{" "}
          {contents[product.contentsUnit] || product.contentsUnit} /{" "}
          {unit.toLowerCase()}
        </span>
      ) : null}
    </small>
  );
}

export default function ProductUnitFields({
  value,
  onChange,
  disabled = false,
  compact = false,
}) {
  const update = (name, next) => onChange({ ...value, [name]: next });

  return (
    <div
      className={`grid w-full box-border min-w-0 ${compact ? "grid-cols-[1.1fr_0.85fr_1fr] gap-2" : "grid-cols-[1.15fr_1fr_1fr] gap-3"}`}
    >
      <label
        className={`flex flex-col min-w-0 m-0 text-slate-600 font-semibold leading-snug ${compact ? "gap-1 text-[10px]" : "gap-2 text-xs"}`}
      >
        Stock unit
        <select
          aria-label="Stock / sale unit"
          value={value.stockUnit || "PCS"}
          disabled={disabled}
          onChange={(e) => update("stockUnit", e.target.value)}
          className={`w-full max-w-full box-border border border-slate-300 rounded-md bg-white text-slate-900 font-inherit outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 ${
            compact ? "h-8 text-xs px-2" : "h-[38px] text-[13px] px-3"
          }`}
        >
          {Object.entries(units).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label
        className={`flex flex-col min-w-0 m-0 text-slate-600 font-semibold leading-snug ${compact ? "gap-1 text-[10px]" : "gap-2 text-xs"}`}
      >
        Pack size
        <input
          aria-label="Pack size"
          placeholder="Optional"
          type="number"
          min="0.001"
          max="999999999.999"
          step="0.001"
          value={value.packSize ?? ""}
          disabled={disabled}
          onChange={(e) =>
            update(
              "packSize",
              e.target.value === "" ? null : Number(e.target.value),
            )
          }
          className={`w-full max-w-full box-border border border-slate-300 rounded-md bg-white text-slate-900 font-inherit outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 ${
            compact ? "h-8 text-xs px-2" : "h-[38px] text-[13px] px-3"
          }`}
        />
      </label>

      <label
        className={`flex flex-col min-w-0 m-0 text-slate-600 font-semibold leading-snug ${compact ? "gap-1 text-[10px]" : "gap-2 text-xs"}`}
      >
        Contents unit
        <select
          aria-label="Contents measured in"
          value={value.contentsUnit || ""}
          disabled={disabled}
          onChange={(e) => update("contentsUnit", e.target.value || null)}
          className={`w-full max-w-full box-border border border-slate-300 rounded-md bg-white text-slate-900 font-inherit outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 ${
            compact ? "h-8 text-xs px-2" : "h-[38px] text-[13px] px-3"
          }`}
        >
          <option value="">None</option>
          {Object.entries(contents).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
