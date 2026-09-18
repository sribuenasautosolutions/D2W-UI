import { ProductUnitLabel } from "../../components/ProductUnitFields";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getLeadWorkflow, recordLeadDecision, prepareLeadSale, approveLeadSale, convertLeadSale } from "../../services/proformaService";
import { AvailabilityBadge } from "../../owner/components/leads/LeadItemsTable";
import "../../owner/components/leads/LeadWorkflow.css";

const money = value => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const messageOf = error => error?.response?.data?.message || (error?.message === "INVALID_QUANTITY" ? "Enter a whole sale quantity within the remaining quantity and select matching inventory." : "") || "Unable to complete this operation. Please try again.";

export default function LeadOfferPage() {
  const { id } = useParams();
  const location = useLocation();
  const base = location.pathname.startsWith("/owner/") ? "/owner/sales" : "/store/sales";
  const [state, setState] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState([]), [quantities, setQuantities] = useState({});
  const [prepared, setPrepared] = useState(null), [approved, setApproved] = useState(false);
  const key = useRef(null);
  const applyState = value => {
    setState(value);
    setSelected(value.proforma.items.filter(item => !value.proforma.acceptedAt || item.acceptedQuantity > 0).map(item => item.id));
  };
  useEffect(() => {
    let active = true;
    getLeadWorkflow(id).then(value => { if (active) applyState(value); }).catch(e => { if (active) setError(messageOf(e)); });
    return () => { active = false; };
  }, [id]);
  const run = async action => {
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  const refresh = async () => applyState(await getLeadWorkflow(id));
  const decision = choice => run(async () => {
    if (choice === "CANCEL" && !window.confirm("Cancel this customer's offer?")) return;
    await recordLeadDecision(id, { decision: choice, itemIds: choice === "ACCEPT" ? selected : [] });
    await refresh();
  });
  const change = (itemId, field, value) => {
    key.current = null; setPrepared(null); setApproved(false);
    setQuantities(previous => ({ ...previous, [itemId]: { ...previous[itemId], [field]: value } }));
  };
  const prepare = () => run(async () => {
    const items = state.progress.flatMap(progress => {
      const row = quantities[progress.itemId] || {};
      const quantity = Number(row.quantity || 0);
      if (!quantity) return [];
      const inventoryId = Number(row.inventoryId || progress.inventoryChoices[0]?.inventoryId);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > progress.remainingQuantity || !inventoryId)
        throw new Error("INVALID_QUANTITY");
      return [{ proformaItemId: progress.itemId, inventoryId, quantity }];
    });
    if (!items.length) { setError("Enter a sale quantity for at least one item with stock."); return; }
    key.current ||= crypto.randomUUID();
    setPrepared(await prepareLeadSale(id, { requestKey: key.current, items })); setApproved(false);
  });
  if (!state) return <section className="lead-workflow"><p role={error ? "alert" : "status"}>{error || "Loading Lead offer…"}</p><Link to={`${base}/leads`}>Back to Leads</Link></section>;
  const { proforma: offer, progress, fulfillments } = state;
  const open = offer.status === "SAVED", accepted = Boolean(offer.acceptedAt);
  const hasSales = fulfillments.some(sale => sale.orderId);
  return <section className="lead-workflow">
    <header className="lead-toolbar"><div><Link to={`${base}/leads/${offer.sourceLeadId}`}>← Lead and Procurement</Link><h1>{offer.proformaNumber}</h1><p>{offer.customerName} · {offer.storeName}</p></div>
      <div className="lead-actions"><Link to={`${base}/proforma/${id}`}>Print / save Proforma PDF</Link><button disabled={busy} onClick={() => run(refresh)}>Refresh stock and sales</button></div></header>
    <p><strong>{offer.status === "CONVERTED" ? "All accepted items sold" : offer.status === "CANCELLED" ? "Offer cancelled" : accepted ? "Customer accepted — sell as stock arrives" : "Awaiting customer decision"}</strong></p>
    {error && <p className="lead-message lead-message--error" role="alert">{error}</p>}
    <h2>Customer offer</h2>
    <div className="lead-table-scroll"><table className="lead-items-table"><thead><tr><th>Customer selection</th><th>Part / product</th><th>Availability</th><th>Expected date</th><th>Offered qty</th><th>Quoted price</th><th>Accepted qty</th><th>Sold qty</th><th>Remaining qty</th></tr></thead>
      <tbody>{offer.items.map((item, index) => { const current = progress.find(row => row.itemId === item.id); return <tr key={item.id}>
        <td><input type="checkbox" aria-label={`Customer accepts item ${index + 1}`} disabled={busy || accepted || !open} checked={selected.includes(item.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, item.id] : previous.filter(value => value !== item.id))}/></td>
        <td><strong>{item.partNumber}</strong><small>{item.itemName} · {item.brandName}</small><ProductUnitLabel product={item}/></td><td><AvailabilityBadge value={item.availabilityStatus}/></td><td>{item.estimatedAvailabilityDate || "—"}</td>
        <td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{item.acceptedQuantity || 0}</td><td>{current?.soldQuantity || 0}</td><td>{accepted ? current?.remainingQuantity || 0 : "Awaiting acceptance"}</td>
      </tr>; })}</tbody></table></div>
    <div className="lead-actions">{open && !accepted && <button className="lead-primary" disabled={busy || !selected.length} onClick={() => decision("ACCEPT")}>Record customer acceptance</button>}
      {open && !hasSales && <button disabled={busy} onClick={() => decision("CANCEL")}>Customer cancelled offer</button>}</div>
    {open && accepted && <><h2>Sell items available now</h2><p>Enter only the quantity to sell now. Other accepted items remain pending. Review current batch prices with the customer before creating the sale.</p>
      <div className="lead-table-scroll"><table className="lead-items-table"><thead><tr><th>Part / product</th><th>Remaining qty</th><th>Store inventory</th><th>Current stock</th><th>Sell now qty</th></tr></thead><tbody>
        {progress.filter(row => row.remainingQuantity > 0).map(row => { const item = offer.items.find(value => value.id === row.itemId), input = quantities[row.itemId] || {}, inventory = row.inventoryChoices.find(value => value.inventoryId === Number(input.inventoryId)) || row.inventoryChoices[0]; return <tr key={row.itemId}>
          <td><strong>{item.partNumber}</strong><small>{item.itemName}</small></td><td>{row.remainingQuantity}</td>
          <td>{row.inventoryChoices.length ? <select aria-label={`Inventory for ${item.partNumber}`} disabled={busy} value={input.inventoryId || inventory.inventoryId} onChange={event => change(row.itemId, "inventoryId", event.target.value)}>{row.inventoryChoices.map(choice => <option key={choice.inventoryId} value={choice.inventoryId}>{choice.productName} · {choice.brandName}</option>)}</select> : "Waiting for matching stock"}</td>
          <td>{inventory?.availableQuantity || 0}</td><td><input type="number" aria-label={`Sell quantity for ${item.partNumber}`} min="0" max={Math.min(row.remainingQuantity, inventory?.availableQuantity || 0)} step="1" disabled={busy || !inventory?.availableQuantity} value={input.quantity || ""} onChange={event => change(row.itemId, "quantity", event.target.value)}/></td>
        </tr>; })}</tbody></table></div><button className="lead-primary" disabled={busy} onClick={prepare}>Review current sale prices</button></>}
    {prepared && <div className="lead-workflow-panel"><h2>Sale price review #{prepared.id}</h2>
      <div className="lead-table-scroll"><table className="lead-items-table"><thead><tr><th>Part / product</th><th>Batch</th><th>Qty</th><th>MRP</th><th>Current selling price</th><th>GST</th><th>Amount</th></tr></thead><tbody>{prepared.pricing.items.map((line, index) => <tr key={index}><td>{line.partNumber}<small>{line.productName}</small></td><td>{line.batchNumber || line.batchId}</td><td>{line.quantity} {line.stockUnit || "PCS"}</td><td>{money(line.mrp)}</td><td>{money(line.sellingPrice)}</td><td>{money(line.gstAmount)}</td><td>{money(line.lineTotal)}</td></tr>)}</tbody></table></div>
      <p><strong>Total payable: {money(prepared.pricing.netPayable)}</strong></p>
      {prepared.orderId ? <Link to={`${base}/invoice/${prepared.orderId}`}>Open invoice #{prepared.orderId}</Link> : open && <div className="lead-actions">
        {!prepared.approvedAt ? <><label><input type="checkbox" checked={approved} disabled={busy} onChange={event => setApproved(event.target.checked)}/> Customer approved these displayed prices</label><button disabled={busy || !approved} onClick={() => run(async () => { setPrepared(await approveLeadSale(id, prepared.id)); await refresh(); })}>Record price approval</button></> : <button className="lead-primary" disabled={busy} onClick={() => run(async () => { const orderId = await convertLeadSale(id, prepared.id); setPrepared(previous => ({ ...previous, orderId })); setQuantities({}); key.current = null; await refresh(); })}>Create sale and invoice</button>}
        <button disabled={busy} onClick={() => { setPrepared(null); setApproved(false); key.current = null; }}>Prepare a fresh price review</button>
      </div>}</div>}
    <h2>Sale history and saved price reviews</h2><div className="lead-table-scroll"><table className="lead-items-table"><thead><tr><th>Review</th><th>Created</th><th>Total</th><th>Customer price approval</th><th>Sale / invoice</th></tr></thead><tbody>{fulfillments.map(sale => <tr key={sale.id}><td>#{sale.id}</td><td>{new Date(sale.createdAt).toLocaleString()}</td><td>{money(sale.pricing.netPayable)}</td><td>{sale.approvedAt ? "Recorded" : "Pending"}</td><td>{sale.orderId ? <Link to={`${base}/invoice/${sale.orderId}`}>Open invoice #{sale.orderId}</Link> : open ? <button disabled={busy} onClick={() => { setPrepared(sale); setApproved(false); }}>Open price review</button> : "No sale"}</td></tr>)}{!fulfillments.length && <tr><td colSpan="5">No sales or price reviews yet.</td></tr>}</tbody></table></div>
  </section>;
}
