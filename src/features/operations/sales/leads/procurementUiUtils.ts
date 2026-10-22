export const formatMrp = (value: number | string | null | undefined): string =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });

export const procurementTotal = (rows: any[]): number =>
  rows.reduce(
    (sum, row) =>
      sum +
      (Math.round((Number(row.quotedMrp || 0) + Number.EPSILON) * 100) *
        Number(row.requestedQuantity || 0)) /
        100,
    0,
  );

export interface ProcurementLookupResult {
  foundInCatalogue?: boolean;
  availableQuantity?: number | string;
  vendorOptions?: Array<{
    availableQuantity?: number | string;
    vendorStockItemId?: number | string;
    [key: string]: any;
  }>;
  productName?: string;
  brandname?: string;
  hsnCode?: string;
  productItemId?: number | null;
  localProductId?: number | null;
  mrp?: number | string;
  [key: string]: any;
}

export function defaultProcurementSource(lookup: ProcurementLookupResult): {
  procurementSource: "LOCAL" | "VENDOR" | "NEW";
  vendorStockItemId: string;
} {
  if (lookup.foundInCatalogue && Number(lookup.availableQuantity) > 0) {
    return { procurementSource: "LOCAL", vendorStockItemId: "" };
  }
  const vendor = (lookup.vendorOptions || []).find(
    (option) => Number(option.availableQuantity) > 0,
  );
  if (vendor) {
    return {
      procurementSource: "VENDOR",
      vendorStockItemId: String(vendor.vendorStockItemId),
    };
  }
  return { procurementSource: "NEW", vendorStockItemId: "" };
}

export function applyProcurementLookup(
  draft: Record<string, any>,
  lookup: ProcurementLookupResult,
): Record<string, any> {
  return {
    ...draft,
    productName: lookup.productName || draft.productName || "",
    brandName: lookup.brandname || draft.brandName || "",
    hsnCode: lookup.hsnCode || draft.hsnCode || "",
    productItemId: lookup.productItemId ?? null,
    localProductId: lookup.localProductId ?? null,
    quotedMrp: lookup.mrp ?? draft.quotedMrp ?? "",
    ...(!draft.procurementSource ? defaultProcurementSource(lookup) : {}),
  };
}

export interface ProcurementSummary {
  items: number;
  d2w: number;
  vendor: number;
  notAvailable: number;
}

export function procurementSummary(rows: any[]): ProcurementSummary {
  return {
    items: rows.length,
    d2w: rows.filter((row) => row.procurementSource === "LOCAL").length,
    vendor: rows.filter((row) => row.procurementSource === "VENDOR").length,
    notAvailable: rows.filter(
      (row) =>
        row.availabilityStatus === "NOT_AVAILABLE" ||
        row.procurementSource === "NOT_AVAILABLE",
    ).length,
  };
}
