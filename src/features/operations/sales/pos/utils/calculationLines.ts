export interface CartLineItem {
  inventoryId?: number | string | null;
  batchId?: number | string | null;
  [key: string]: any;
}

export interface CalculationLine {
  inventoryId?: number | string | null;
  batchId?: number | string | null;
  taxableAmount?: number;
  gstAmount?: number;
  lineTotal?: number;
  [key: string]: any;
}

export function getCalculationLinesForCartItem(
  item: CartLineItem,
  lines: CalculationLine[] = [],
): CalculationLine[] {
  if (item.inventoryId == null) return [];

  return lines.filter(
    (line) =>
      String(line.inventoryId) === String(item.inventoryId) &&
      (item.batchId == null || String(line.batchId) === String(item.batchId)),
  );
}

// Sum amounts supplied by the backend for a cart item allocated across batches.
export function sumCalculatedAmount(
  lines: CalculationLine[],
  field: string,
): number {
  return (
    lines.reduce(
      (total, line) => total + Math.round(Number(line[field] ?? 0) * 100),
      0,
    ) / 100
  );
}
