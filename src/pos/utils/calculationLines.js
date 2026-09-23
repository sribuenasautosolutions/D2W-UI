export function getCalculationLinesForCartItem(item, lines = []) {
  if (item.inventoryId == null) return [];

  return lines.filter((line) =>
    String(line.inventoryId) === String(item.inventoryId) &&
    (item.batchId == null || String(line.batchId) === String(item.batchId))
  );
}

// Sum amounts supplied by the backend for a cart item allocated across batches.
export function sumCalculatedAmount(lines, field) {
  return lines.reduce((total, line) => total + Math.round(Number(line[field] ?? 0) * 100), 0) / 100;
}
