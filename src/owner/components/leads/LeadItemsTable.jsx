import ProductUnitFields, { ProductUnitLabel } from "../../../components/ProductUnitFields";
import "./LeadWorkflow.css";

const availabilityText = (value) => ({ AVAILABLE: "Available", PARTIAL: "Partial", ESTIMATED: "Estimated", NOT_AVAILABLE: "Not available" }[value] || "Not checked");
export function AvailabilityBadge({ value }) {
  return <span className={`lead-status lead-status--${value || "NEW"}`}>{availabilityText(value)}</span>;
}

/** Shared row-based entry for customer requirements and Procurement. */
export default function LeadItemsTable({ rows, procurement = false, readOnly = false, busy = false,
  onChange, onRemove, onLookup, onSave, selection, onSelect }) {
  const field = (row, index, name, label, options = {}) => <input
    aria-label={`${label} ${index + 1}`} value={row[name] ?? ""}
    onChange={(event) => onChange(row.id ?? index, name, event.target.value)}
    {...options} disabled={busy} readOnly={readOnly || options.readOnly} />;
  return <div className="lead-table-scroll" tabIndex={0} role="region" aria-label={procurement ? "Procurement items" : "Customer requirement items"}>
    <table className={`lead-items-table ${procurement ? "lead-items-table--procurement" : ""}`}>
      <caption>{procurement ? "One row per customer requirement. Store stock and required quantity cannot be edited." : "Enter every requirement in this table. Use a new row for another part or vehicle."}</caption>
      <thead>
        {procurement && <tr className="lead-column-groups"><th colSpan={3}>Customer requirement</th><th colSpan={13}>Procurement result</th>{selection && <th>Offer</th>}</tr>}
        <tr><th>#</th><th>Requirement</th>
          {!procurement && <><th>Vehicle / year</th><th>VIN</th></>}
          <th>Required qty</th>
          {procurement && <><th>Part number</th><th>Product</th><th>Unit / Pack size</th><th>Brand</th><th>HSN</th><th>Store stock</th><th>MRP</th><th>Selling price</th><th>Offer qty</th><th>Availability</th><th>Expected date</th></>}
          <th>Notes</th><th>Action</th>{selection && <th>Select</th>}
        </tr>
      </thead>
      <tbody>{rows.map((row, index) => {
        const catalogue = Boolean(row.productItemId || row.localProductId || row.lookup?.foundInCatalogue);
        return <tr key={row.id ?? index} className={row.error ? "lead-row-error" : ""}>
          <td>{index + 1}</td>
          <td>{procurement ? <><strong>{row.requirement}</strong><ProductUnitLabel product={row}/><small>{row.vehicleDescription || "No vehicle specified"}</small>{row.vin && <small>VIN: {row.vin}</small>}</> : field(row,index,"requirement","Requirement",{required:true,placeholder:"Brake pad"})}</td>
          {!procurement && <><td>{field(row,index,"vehicleDescription","Vehicle",{placeholder:"Swift 2014"})}</td><td>{field(row,index,"vin","VIN",{placeholder:"Optional"})}</td></>}
          <td>{procurement ? <strong className="lead-readonly-number">{row.requestedQuantity}</strong> : field(row,index,"requestedQuantity","Required quantity",{type:"number",min:1,step:1,required:true})}</td>
          {procurement && <>
            <td><div className="lead-part-lookup">{field(row,index,"partNumber","Part number",{onKeyDown:(event)=>{if(event.key==="Enter"&&!readOnly){event.preventDefault();onLookup(row.id);}}})}
              {!readOnly && <button type="button" disabled={busy || !row.partNumber?.trim()} onClick={()=>onLookup(row.id)} aria-label={`Find part ${index+1}`}>Find</button>}</div>
              <small>{catalogue ? "Catalogue product" : row.lookup ? "Manual entry · Lead only" : "Enter part and find"}</small></td>
            <td>{field(row,index,"productName","Product",{readOnly:catalogue})}</td><td className="product-unit-table-cell">{catalogue || readOnly ? <ProductUnitLabel product={row}/> : procurement && !catalogue && !readOnly && <ProductUnitFields compact value={row} disabled={busy} onChange={next=>{onChange(row.id,"stockUnit",next.stockUnit);onChange(row.id,"packSize",next.packSize);onChange(row.id,"contentsUnit",next.contentsUnit);}}/>}</td>
            <td>{field(row,index,"brandName","Brand",{readOnly:catalogue})}</td>
            <td>{field(row,index,"hsnCode","HSN",{readOnly:catalogue})}</td>
            <td><strong className="lead-readonly-number">{row.lookup?.availableQuantity ?? "—"}</strong><small>{row.lookup ? "Read-only" : "Find to refresh"}</small></td>
            <td>{field(row,index,"quotedMrp","MRP",{type:"number",min:0,step:"0.01"})}</td>
            <td>{field(row,index,"quotedSellingPrice","Selling price",{type:"number",min:0,step:"0.01"})}</td>
            <td>{field(row,index,"sellingQuantity","Offer quantity",{type:"number",min:0,max:row.requestedQuantity,step:1})}</td>
            <td>{readOnly ? <AvailabilityBadge value={row.availabilityStatus}/> : <select aria-label={`Availability ${index+1}`} value={row.availabilityStatus || ""} disabled={busy}
              onChange={(event)=>onChange(row.id,"availabilityStatus",event.target.value)}>
              <option value="">Choose</option>{["AVAILABLE","PARTIAL","ESTIMATED","NOT_AVAILABLE"].map(value=><option key={value} value={value}>{availabilityText(value)}</option>)}</select>}</td>
            <td>{row.availabilityStatus === "ESTIMATED" ? field(row,index,"estimatedAvailabilityDate","Expected date",{type:"date"}) : "—"}</td>
          </>}
          <td>{field(row,index,"notes","Item notes",{placeholder:"Optional"})}</td>
          <td>{procurement ? <>{!readOnly && <button type="button" disabled={busy || !row.dirty} onClick={()=>onSave(row.id)}>Save row</button>}<small>{row.dirty ? "Unsaved changes" : row.availabilityStatus ? "Saved" : "Not saved"}</small></>
            : <button type="button" disabled={busy || rows.length===1} onClick={()=>onRemove(index)} aria-label={`Remove item ${index+1}`}>Remove</button>}
            {row.error && <small role="alert" className="lead-field-error">{row.error}</small>}</td>
          {selection && <td><input type="checkbox" aria-label={`Offer item ${index+1}`} disabled={busy || !row.availabilityStatus || row.availabilityStatus==="NOT_AVAILABLE" || Number(row.sellingQuantity)<=0}
            checked={selection.includes(row.id)} onChange={(event)=>onSelect(row.id,event.target.checked)}/></td>}
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
