import { useState } from "react";
export default function NewCustomerRequirementDrawer({ onAdd, onClose }) {
  const [requirement, setRequirement] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const submit = event => {
    event.preventDefault();
    if (!requirement.trim() || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      setError("Enter a customer requirement and a positive whole quantity."); return;
    }
    onAdd({ requirement: requirement.trim(), quantity: Number(quantity), reason: reason.trim() || null }); onClose();
  };
  return <div className="lead-secondary-overlay"><aside className="lead-secondary-drawer" role="dialog" aria-modal="true" aria-labelledby="new-requirement-title">
    <header><h2 id="new-requirement-title">Add Customer Requirement</h2><button type="button" onClick={onClose} aria-label="Close requirement drawer">×</button></header>
    <form onSubmit={submit}>
      <label htmlFor="new-requirement">Customer Requirement</label><textarea id="new-requirement" rows={4} required maxLength={10000} value={requirement} onChange={e => setRequirement(e.target.value)} autoFocus />
      <label htmlFor="new-requirement-qty">Quantity</label><input id="new-requirement-qty" type="number" min="1" step="1" required value={quantity} onChange={e => setQuantity(e.target.value)} />
      <label htmlFor="new-requirement-reason">Reason / Details (optional)</label><textarea id="new-requirement-reason" rows={2} maxLength={10000} value={reason} onChange={e => setReason(e.target.value)} />
      {error && <p role="alert">{error}</p>}<p>Procurement will identify the actual part.</p>
      <button className="lead-primary-button" type="submit">Add to Prepared Changes</button>
    </form>
  </aside></div>;
}
