export const formatMrp = value => Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
export const procurementTotal = rows => rows.reduce((sum, row) => sum + Math.round((Number(row.quotedMrp || 0) + Number.EPSILON) * 100) * Number(row.requestedQuantity || 0) / 100, 0);
export function defaultProcurementSource(lookup) {
  if (lookup.foundInCatalogue && Number(lookup.availableQuantity) > 0) return { procurementSource: "LOCAL", vendorStockItemId: "" };
  const vendor = (lookup.vendorOptions || []).find(option => Number(option.availableQuantity) > 0);
  if (vendor) return { procurementSource: "VENDOR", vendorStockItemId: String(vendor.vendorStockItemId) };
  return { procurementSource: "NEW", vendorStockItemId: "" };
}
export function applyProcurementLookup(draft, lookup) {
  return { ...draft, productName: lookup.productName || draft.productName || "", brandName: lookup.brandname || draft.brandName || "",
    hsnCode: lookup.hsnCode || draft.hsnCode || "", productItemId: lookup.productItemId ?? null, localProductId: lookup.localProductId ?? null,
    quotedMrp: lookup.mrp ?? draft.quotedMrp ?? "",
    ...(!draft.procurementSource ? defaultProcurementSource(lookup) : {}) };
}
export function procurementSummary(rows) {
  return { items: rows.length, d2w: rows.filter(row => row.procurementSource === "LOCAL").length,
    vendor: rows.filter(row => row.procurementSource === "VENDOR").length,
    notAvailable: rows.filter(row => row.availabilityStatus === "NOT_AVAILABLE" || row.procurementSource === "NOT_AVAILABLE").length };
}
