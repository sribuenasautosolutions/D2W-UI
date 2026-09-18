import "./ProductUnitFields.css";
const units = {PCS:"Piece",BOTTLE:"Bottle",CAN:"Can",BOX:"Box",SET:"Set",PAIR:"Pair",PACK:"Pack"};
const contents = {LITRE:"L",ML:"ml",KG:"kg",G:"g",PCS:"pieces"};
export function ProductUnitLabel({product}) {
  const unit=units[product?.stockUnit] || "Piece";
  return <small className="product-unit-label"><span>{unit}</span>{product?.packSize && product?.contentsUnit ? <span>{product.packSize} {contents[product.contentsUnit] || product.contentsUnit} / {unit.toLowerCase()}</span> : null}</small>;
}
export default function ProductUnitFields({value,onChange,disabled=false,compact=false}) {
  const update=(name,next)=>onChange({...value,[name]:next});
  return <div className={`product-unit-fields${compact ? " product-unit-fields--compact" : ""}`}>
    <label>Stock unit<select aria-label="Stock / sale unit" value={value.stockUnit || "PCS"} disabled={disabled} onChange={e=>update("stockUnit",e.target.value)}>{Object.entries(units).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    <label>Pack size<input aria-label="Pack size" placeholder="Optional" type="number" min="0.001" max="999999999.999" step="0.001" value={value.packSize ?? ""} disabled={disabled} onChange={e=>update("packSize",e.target.value===""?null:Number(e.target.value))}/></label>
    <label>Contents unit<select aria-label="Contents measured in" value={value.contentsUnit || ""} disabled={disabled} onChange={e=>update("contentsUnit",e.target.value || null)}><option value="">None</option>{Object.entries(contents).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
  </div>;
}
