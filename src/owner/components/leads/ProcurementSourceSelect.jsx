export default function ProcurementSourceSelect({ draft, vendors = [], savedVendorName, index, onChange }) {
  const selectedVendor = String(draft.vendorStockItemId || "");
  return <div>
    <select className="procurement-table-subselect" aria-label={`Source ${index + 1}`}
      value={draft.procurementSource || ""} onChange={event => onChange(event.target.value)}>
      <option value="">Select source</option><option value="LOCAL">D2W</option>
      <option value="VENDOR">Vendor</option><option value="NEW">NEW</option><option value="NOT_AVAILABLE">Not Available</option>
    </select>
    {draft.procurementSource === "VENDOR" && <label>Vendor
      <select className="procurement-table-subselect" aria-label={`Vendor ${index + 1}`}
        value={selectedVendor} onChange={event => onChange(`vendor:${event.target.value}`)}>
        <option value="">Select vendor</option>
        {selectedVendor && !vendors.some(vendor => String(vendor.vendorStockItemId) === selectedVendor) &&
          <option value={selectedVendor}>{savedVendorName || "Saved vendor"}</option>}
        {vendors.map(vendor => <option key={vendor.vendorStockItemId} value={vendor.vendorStockItemId}>
          {vendor.vendorName || "Vendor"} — Available: {vendor.availableQuantity}</option>)}
      </select>
    </label>}
  </div>;
}
