import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getLeadById, lookupLeadItemProduct, saveLeadItemProcurement, completeLeadProcurement,
  reopenLeadProcurement, saveLeadProcurementTable, createLeadProforma, getLeadProforma } from "../../../services/leadService";
import LeadItemsTable from "./LeadItemsTable";
import "./LeadWorkflow.css";

const errorText = (error) => error?.response?.data?.message || "The operation failed. Please try again.";
const rowFrom = (item) => ({ ...item, brandName: item.brandName || "", dirty: false, error: "" });
const payload = (row) => ({ stockUnit: row.stockUnit || "PCS", packSize: row.packSize || null, contentsUnit: row.contentsUnit || null, partNumber: row.partNumber?.trim(), productName: row.productName?.trim() || null,
  brandName: row.brandName?.trim() || null, hsnCode: row.hsnCode?.trim() || null,
  quotedMrp: Number(row.quotedMrp), quotedSellingPrice: Number(row.quotedSellingPrice),
  sellingQuantity: Number(row.sellingQuantity), availabilityStatus: row.availabilityStatus,
  estimatedAvailabilityDate: row.availabilityStatus==="ESTIMATED" ? row.estimatedAvailabilityDate || null : null, notes: row.notes || null });
function validate(row) {
  const p=payload(row), qty=p.sellingQuantity, requested=Number(row.requestedQuantity);
  if(!p.partNumber)return "Enter a part number.";
  if(!Number.isFinite(p.quotedMrp)||p.quotedMrp<=0)return "MRP must be greater than zero.";
  if(!Number.isFinite(p.quotedSellingPrice)||p.quotedSellingPrice<=0||p.quotedSellingPrice>p.quotedMrp)return "Selling price must be positive and no higher than MRP.";
  if(row.sellingQuantity===""||row.sellingQuantity==null||!Number.isInteger(qty)||qty<0)return "Enter a whole offer quantity.";
  if(!p.availabilityStatus)return "Choose availability.";
  if(p.availabilityStatus==="AVAILABLE"&&qty!==requested)return "Available quantity must equal required quantity.";
  if(p.availabilityStatus==="PARTIAL"&&(qty<=0||qty>=requested))return "Partial quantity must be between 1 and one less than required quantity.";
  if(p.availabilityStatus==="ESTIMATED"&&(qty<=0||qty>requested||!p.estimatedAvailabilityDate))return "Estimated needs a future date and quantity from 1 to required quantity.";
  if(p.availabilityStatus==="NOT_AVAILABLE"&&qty!==0)return "Not available must have offer quantity 0.";
  if(["AVAILABLE","PARTIAL"].includes(p.availabilityStatus)&&row.lookup&&qty>row.lookup.availableQuantity)return "Offer quantity exceeds current store stock.";
  return "";
}

export default function LeadDetails() {
  const { id }=useParams(), location=useLocation();
  const base=location.pathname.startsWith("/owner/")?"/owner/sales":"/store/sales";
  const [lead,setLead]=useState(null),[rows,setRows]=useState([]),[offer,setOffer]=useState(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  const [selected,setSelected]=useState([]),[gst,setGst]=useState("");
  const lookupVersions=useRef({}),requestKey=useRef(null);
  useEffect(()=>{
    let active=true;
    Promise.all([getLeadById(id),getLeadProforma(id)]).then(([value,existing])=>{
      if(!active)return;
      setLead(value);setRows((value.items||[]).map(rowFrom));setOffer(existing||null);
      Promise.all((value.items || []).filter(item => item.partNumber).map(async item => {
        try { const lookup = await lookupLeadItemProduct(id, item.id, item.partNumber);
          if(active) setRows(previous => previous.map(row => row.id === item.id && !row.dirty ? {...row, lookup} : row));
        } catch { /* Saved Procurement remains usable if a stock refresh fails. */ }
      }));
      setSelected((value.items||[]).filter(i=>i.availabilityStatus&&i.availabilityStatus!=="NOT_AVAILABLE"&&i.sellingQuantity>0).map(i=>i.id));
    }).catch(e=>{if(active)setError(errorText(e));}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[id]);
  const completed=lead?.status==="PROCUREMENT_COMPLETED",dirty=rows.some(row=>row.dirty);
  const change=(rowId,field,value)=>{
    if(completed)return;
    if(field==="partNumber")lookupVersions.current[rowId]=(lookupVersions.current[rowId]||0)+1;
    setRows(previous=>previous.map(row=>{
      if(row.id!==rowId)return row;
      const next={...row,[field]:value,dirty:true,error:""};
      if(field==="partNumber")Object.assign(next,{stockUnit:"PCS",packSize:null,contentsUnit:null,lookup:null,productItemId:null,localProductId:null,productName:"",brandName:"",hsnCode:"",quotedMrp:"",quotedSellingPrice:"",sellingQuantity:"",availabilityStatus:"",estimatedAvailabilityDate:""});
      if(field==="availabilityStatus"){
        if(value!=="ESTIMATED")next.estimatedAvailabilityDate="";
        if(value==="NOT_AVAILABLE")next.sellingQuantity=0;
        if(value==="AVAILABLE")next.sellingQuantity=row.requestedQuantity;
      }
      return next;
    }));
  };
  const lookup=async(rowId)=>{
    const row=rows.find(i=>i.id===rowId);if(!row?.partNumber?.trim())return;
    const version=(lookupVersions.current[rowId]||0)+1;lookupVersions.current[rowId]=version;
    try{
      const found=await lookupLeadItemProduct(id,rowId,row.partNumber.trim());
      if(lookupVersions.current[rowId]!==version)return;
      setRows(previous=>previous.map(current=>current.id!==rowId?current:{...current,lookup:found,error:"",dirty:true, stockUnit:found.stockUnit || "PCS", packSize:found.packSize ?? null, contentsUnit:found.contentsUnit ?? null,
        productItemId:found.productItemId,localProductId:found.localProductId,
        productName:found.foundInCatalogue?found.productName||"":current.productName,
        brandName:found.foundInCatalogue?found.brandname||"":current.brandName,
        hsnCode:found.foundInCatalogue?found.hsnCode||"":current.hsnCode,
        quotedMrp:current.quotedMrp==null||current.quotedMrp===""?found.mrp??"":current.quotedMrp,
        quotedSellingPrice:current.quotedSellingPrice==null||current.quotedSellingPrice===""?found.sellingPrice??"":current.quotedSellingPrice}));
    }catch(e){setRows(previous=>previous.map(current=>current.id===rowId?{...current,error:errorText(e)}:current));}
  };
  const save=async(rowId)=>{
    const changed=rows.filter(row=>rowId?row.id===rowId:row.dirty);
    const errors=new Map(changed.map(row=>[row.id,validate(row)]));
    setRows(previous=>previous.map(row=>errors.has(row.id)?{...row,error:errors.get(row.id)}:row));
    if([...errors.values()].some(Boolean)||!changed.length)return;
    setBusy(true);setError("");setMessage("");
    try{
      const updated=rowId?await saveLeadItemProcurement(id,rowId,payload(changed[0])):
        await saveLeadProcurementTable(id,{rows:changed.map(row=>({itemId:row.id,procurement:payload(row)}))});
      setLead(updated);const savedIds=new Set(changed.map(row=>row.id));
      setRows(previous=>previous.map(row=>savedIds.has(row.id)?{...rowFrom(updated.items.find(item=>item.id===row.id)),lookup:row.lookup}:row));
      setMessage(rowId?"Row saved.":"Procurement table saved.");
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  };
  const complete=async()=>{
    setBusy(true);setError("");setMessage("");
    try{const value=await completeLeadProcurement(id);setLead(value);setRows(value.items.map(rowFrom));
      setSelected(value.items.filter(row=>row.availabilityStatus!=="NOT_AVAILABLE"&&row.sellingQuantity>0).map(row=>row.id));
      setMessage("Procurement complete. Select the items to offer below.");
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  };
  const reopen=async()=>{
    setBusy(true);setError("");
    try { await reopenLeadProcurement(id); const value=await getLeadById(id); setLead(value);setRows(value.items.map(rowFrom));setMessage("Procurement reopened. Update and save the table, then complete Procurement again."); }
    catch(e){setError(errorText(e));}finally{setBusy(false);}
  };
  const createOffer=async()=>{
    if(!selected.length||!gst){setError("Select offer items and choose the GST treatment.");return;}
    setBusy(true);setError("");
    if(!requestKey.current)requestKey.current=crypto.randomUUID();
    try{const value=await createLeadProforma(id,{requestKey:requestKey.current,itemIds:selected,gstType:gst});setOffer(value);setMessage("Proforma saved. Open it to record the customer's selection.");}
    catch(e){setError(errorText(e));}finally{setBusy(false);}
  };
  if(loading)return <section className="lead-workflow">Loading Lead…</section>;
  if(!lead)return <section className="lead-workflow"><p role="alert">{error||"Lead not found."}</p><Link to={`${base}/leads`}>Back to Leads</Link></section>;
  return <section className="lead-workflow">
    <header className="lead-toolbar"><div><Link className="lead-link" to={`${base}/leads`}>← Leads</Link><h1>{lead.leadNumber}</h1><p>Customer requirements and Procurement</p></div>
      <div className="lead-actions">{!completed&&<><button disabled={busy||!dirty} onClick={()=>save()}>Save table</button><button className="lead-primary" disabled={busy||dirty} onClick={complete}>Complete Procurement</button></>}
        {completed&&!offer&&<button disabled={busy} onClick={reopen}>Reopen Procurement to make corrections</button>}{offer&&<Link className="lead-link" to={`${base}/proforma/${offer.id}/lead`}>Open Proforma and customer decision →</Link>}</div></header>
    <div className="lead-summary"><div><small>Customer</small><strong>{lead.customerName}</strong></div><div><small>Store</small><strong>{lead.storeName}</strong></div>
      <div><small>Status</small><strong>{completed?"Procurement completed":"Procurement in progress"}</strong></div><div><small>Created</small><strong>{lead.createdAt?new Date(lead.createdAt).toLocaleDateString():"—"}</strong></div></div>
    {lead.customerRequirement&&<p><strong>Customer request:</strong> {lead.customerRequirement}</p>}
    {error&&<div className="lead-message lead-message--error" role="alert">{error}</div>}{message&&<div className="lead-message" role="status">{message}</div>}
    {dirty&&<p className="lead-note">Save your table changes before completing Procurement.</p>}
    {completed&&!offer&&<h2>Items available for Proforma</h2>}
    <LeadItemsTable rows={rows} procurement readOnly={completed} busy={busy} onChange={change} onLookup={lookup} onSave={save}
      selection={completed&&!offer?selected:null} onSelect={(rowId,checked)=>setSelected(previous=>checked?[...previous,rowId]:previous.filter(value=>value!==rowId))}/>
    {completed&&!offer&&<div className="lead-workflow-panel"><p>Available, partial and estimated items can be offered. Not available items cannot be selected. Creating this Proforma will not deduct stock.</p>
      <div className="lead-actions"><label className="lead-gst-choice">GST treatment<select aria-label="Offer GST treatment" value={gst} onChange={event=>setGst(event.target.value)}><option value="">Choose GST</option><option value="NONE">No GST</option>{[5,12,18,28].flatMap(rate=>[<option key={`GST_${rate}`} value={`GST_${rate}`}>CGST + SGST {rate}%</option>,<option key={`IGST_${rate}`} value={`IGST_${rate}`}>IGST {rate}%</option>])}</select></label>
        <button className="lead-primary" disabled={busy||!selected.length||!gst} onClick={createOffer}>Create Proforma ({selected.length} items)</button></div></div>}
  </section>;
}
