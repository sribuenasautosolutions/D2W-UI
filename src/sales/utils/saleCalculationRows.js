// Each cart item is one displayed row. Batch allocation remains a stock concern.
export function saleCalculationRows(items, calculation, isInvoiceEdit = false) {
    const lines = calculation?.items || [];
    const used = new Set();
    return items.map((item, itemIndex) => {
        const allocations = [];
        let quantity = 0;
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            if (used.has(index)) continue;
            const matches = isInvoiceEdit ? index === itemIndex
                : line.requestLineIndex != null ? line.requestLineIndex === itemIndex
                : String(line.inventoryId) === String(item.inventoryId)
                    && (item.batchId == null || String(line.batchId) === String(item.batchId));
            if (!matches) continue;
            used.add(index);
            allocations.push(line);
            quantity += Number(line.quantity);
            if (isInvoiceEdit || quantity >= Number(item.quantity)) break;
        }
        if (!allocations.length) return { item, itemIndex, line: null };
        const sum = field => Math.round(allocations.reduce((total, row) => total + Number(row[field] || 0), 0) * 100) / 100;
        const prices = field => allocations.map(row => Number(row[field] ?? item[field] ?? 0));
        return { item, itemIndex, line: {
            ...allocations[0], quantity,
            taxableAmount: sum('taxableAmount'), gstAmount: sum('gstAmount'), lineTotal: sum('lineTotal'),
            mrp: Math.min(...prices('mrp')), maxMrp: Math.max(...prices('mrp')),
            sellingPrice: Math.min(...prices('sellingPrice')), maxSellingPrice: Math.max(...prices('sellingPrice')),
            totalMrp: allocations.reduce((total, row) => total + Number(row.mrp ?? item.mrp ?? 0) * Number(row.quantity), 0),
        } };
    });
}
