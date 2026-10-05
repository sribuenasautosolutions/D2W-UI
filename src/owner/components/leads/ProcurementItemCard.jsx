import { Search, Store, Truck } from "lucide-react";
import { ProductUnitLabel } from "../../../components/ProductUnitFields";
import { AvailabilityBadge } from "./LeadItemsTable";

const input = (row, name, onChange, options = {}) => <input
  value={row[name] ?? ""} onChange={event => onChange(row.id, name, event.target.value)} {...options} />;

export default function ProcurementItemCard({ row, index, readOnly, busy, onChange, onLookup, onSave }) {
  const lookup = row.lookup;
  const vendors = lookup?.vendorOptions || [];
  const chosen = vendors.find(option => String(option.vendorStockItemId) === String(row.vendorStockItemId));
  const source = row.procurementSource || "";
  return <article className={`procurement-card ${row.error ? "procurement-card--error" : ""}`}>
    <header className="procurement-card__header">
      <div><span className="procurement-card__number">Requirement {index + 1}</span><h3>{row.requirement}</h3>
        <p>{row.vehicleDescription || "Vehicle not specified"}{row.vin ? ` · VIN ${row.vin}` : ""} · Required {row.requestedQuantity}</p></div>
      {readOnly && <AvailabilityBadge value={row.availabilityStatus}/>} 
    </header>

    <div className="procurement-card__lookup">
      <label><span>Part number</span><div className="lead-part-lookup">{input(row,"partNumber",onChange,{readOnly,placeholder:"Enter part number",onKeyDown:event=>{if(event.key==="Enter"&&!readOnly){event.preventDefault();onLookup(row.id);}}})}
        {!readOnly && <button type="button" disabled={busy || !row.partNumber?.trim()} onClick={()=>onLookup(row.id)}><Search size={15}/> Find</button>}</div></label>
      <label><span>Product</span>{input(row,"productName",onChange,{readOnly:readOnly || Boolean(row.productItemId || row.localProductId || lookup?.foundInCatalogue)})}</label>
      <label><span>Brand</span>{input(row,"brandName",onChange,{readOnly:readOnly || Boolean(row.productItemId || row.localProductId || lookup?.foundInCatalogue)})}</label>
      <label><span>HSN</span>{input(row,"hsnCode",onChange,{readOnly:readOnly || Boolean(row.productItemId || row.localProductId || lookup?.foundInCatalogue)})}</label>
    </div>
    <ProductUnitLabel product={row}/>

    <div className="procurement-source-grid">
      <button type="button" disabled={readOnly || busy || !lookup} className={source==="LOCAL"?"selected":""}
        onClick={()=>onChange(row.id,"procurementSource","LOCAL")}><Store size={18}/><strong>D2W Store Stock</strong><span>{lookup ? `${lookup.availableQuantity || 0} available` : "Find the part first"}</span></button>
      <button type="button" disabled={readOnly || busy || !vendors.length} className={source==="VENDOR"?"selected":""}
        onClick={()=>onChange(row.id,"procurementSource","VENDOR")}><Truck size={18}/><strong>Vendor Stock</strong><span>{vendors.length ? `${vendors.length} current vendor${vendors.length>1?"s":""}` : "No valid vendor stock"}</span></button>
      <button type="button" disabled={readOnly || busy} className={source==="NOT_AVAILABLE"?"selected danger":"danger"}
        onClick={()=>onChange(row.id,"procurementSource","NOT_AVAILABLE")}><strong>Not Available</strong><span>Neither source can supply</span></button>
    </div>

    {source === "VENDOR" && <div className="procurement-vendor-box"><label><span>Selected vendor</span><select disabled={readOnly || busy} value={row.vendorStockItemId || ""} onChange={event=>onChange(row.id,"vendorStockItemId",event.target.value)}>
      <option value="">Choose vendor</option>{vendors.map(option=><option key={option.vendorStockItemId} value={option.vendorStockItemId}>{option.vendorName} · Qty {option.availableQuantity} · Valid to {option.validUntil}</option>)}</select></label>
      {chosen && <p><strong>{chosen.vendorName}</strong> has {chosen.availableQuantity} of {chosen.partNumber}{chosen.mrp ? ` · MRP ₹${chosen.mrp}` : ""}</p>}</div>}

    <div className="procurement-card__fields">
      <label><span>MRP</span>{input(row,"quotedMrp",onChange,{type:"number",min:0,step:"0.01",readOnly})}</label>
      <label><span>Selling price</span>{input(row,"quotedSellingPrice",onChange,{type:"number",min:0,step:"0.01",readOnly})}</label>
      <label><span>Offer quantity</span>{input(row,"sellingQuantity",onChange,{type:"number",min:0,max:row.requestedQuantity,step:1,readOnly})}</label>
      <label><span>Availability</span><select disabled={readOnly || busy} value={row.availabilityStatus || ""} onChange={event=>onChange(row.id,"availabilityStatus",event.target.value)}>
        <option value="">Choose</option><option value="AVAILABLE">Available</option><option value="PARTIAL">Partial</option><option value="ESTIMATED">Estimated</option><option value="NOT_AVAILABLE">Not available</option></select></label>
      <label><span>Expected date</span>{input(row,"estimatedAvailabilityDate",onChange,{type:"date",readOnly:readOnly || row.availabilityStatus!=="ESTIMATED"})}</label>
      <label className="procurement-card__notes"><span>Notes</span>{input(row,"notes",onChange,{placeholder:"Optional",readOnly})}</label>
    </div>
    {row.error && <p className="lead-field-error" role="alert">{row.error}</p>}
    {!readOnly && <footer><span>{row.dirty ? "Unsaved changes" : row.availabilityStatus ? "Saved" : "Not saved"}</span><button type="button" className="lead-primary" disabled={busy || !row.dirty} onClick={()=>onSave(row.id)}>Save requirement</button></footer>}
  </article>;
}
