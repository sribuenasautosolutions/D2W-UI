export const workflowError = error => error?.response?.data?.message || error?.response?.data?.error || error?.message || "Unable to save. Please try again.";
export function prepareCustomerChanges(items, drafts, newRequirements) {
  const changes = items.filter(item => drafts[item.id]?.selected).map(item => {
    const draft = drafts[item.id];
    const quantity = Number(draft.requestedQuantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error(`Enter a positive whole quantity for ${item.partNumber}.`);
    if (!draft.reason?.trim()) throw new Error(`Enter a reason for ${item.partNumber}.`);
    if (draft.changeType === "QUANTITY_CHANGE" && quantity === item.requestedQuantity) throw new Error(`Change the quantity for ${item.partNumber}.`);
    if (draft.changeType === "REQUIREMENT_CHANGE" && !draft.requestedRequirement?.trim()) throw new Error(`Enter the requested requirement for ${item.partNumber}.`);
    return { itemId: item.id, changeType: draft.changeType, requestedQuantity: quantity,
      requestedRequirement: draft.requestedRequirement?.trim() || null, reason: draft.reason.trim() };
  });
  if (changes.length + newRequirements.length === 0 || changes.length + newRequirements.length > 100) throw new Error("Prepare between 1 and 100 changes.");
  return { changes, newRequirements };
}
export function procurementWork(lead) {
  if (lead.status !== "PROCUREMENT") return lead.items || [];
  if (!(lead.customerChanges || []).some(change => change.processingState !== "COMPLETED")) return lead.items || [];
  return (lead.customerChanges || []).filter(change => change.processingState !== "COMPLETED").map(change => {
    const item = (lead.items || []).find(row => row.id === change.itemId);
    return { ...(item || {}), id: item?.id || `new-${change.id}`, changeId: change.id, customerChange: change,
      requirement: change.requestedRequirement || item?.requirement || "",
      requestedQuantity: change.processingState === "READY" ? item?.requestedQuantity : change.requestedQuantity, partNumber: item?.partNumber || "",
      rawRequirement: !change.itemId };
  });
}
