export async function createBatchReportPdf(rows) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const widths = [29, 28, 35, 25, 20, 16, 16, 16, 20, 20, 20, 16];
  const headings = ["Batch / Date", "Store", "Product / Brand", "Part Number", "Category", "Received", "Available", "Consumed", "Cost (INR)", "Sale (INR)", "MRP (INR)", "Rack"];
  let y;
  const pageHeader = () => {
    pdf.setFontSize(15); pdf.text("Batch Report", 8, 12);
    pdf.setFontSize(9); pdf.text(`${rows.length} batches`, 8, 18);
    let x = 8;
    pdf.setFontSize(7);
    headings.forEach((heading, i) => { pdf.text(pdf.splitTextToSize(heading, widths[i]-2), x+1, 24); x += widths[i]; });
    pdf.line(8, 32, 289, 32); y = 36;
  };
  pageHeader();
  for (const batch of rows) {
    const values = [
      `${batch.batchNumber || ""}\n${String(batch.receivedDate || "").slice(0,10)}`,
      batch.storeName, `${batch.itemName || ""}\n${batch.brandName || ""}`,
      batch.partNumber, batch.categoryName, batch.receivedQuantity, batch.availableQuantity,
      batch.consumedQuantity, batch.purchasePrice, batch.sellingPrice, batch.mrp, batch.rackNumber,
    ];
    const lines = values.map((value,i) => pdf.splitTextToSize(String(value ?? ""), widths[i]-2));
    // Render wrapped cells in page-sized chunks, including unusually long part names.
    const lineCount = Math.max(...lines.map(cell => cell.length));
    for (let offset=0; offset<lineCount;) {
      if (y+5 > 198) { pdf.addPage(); pageHeader(); }
      const count = Math.min(lineCount-offset, Math.max(1, Math.floor((198-y)/3.5)));
      let x=8;
      lines.forEach((cell,i) => { const chunk=cell.slice(offset,offset+count); if(chunk.length) pdf.text(chunk,x+1,y); x+=widths[i]; });
      y+=count*3.5+3; offset+=count;
      pdf.setDrawColor(210); pdf.line(8,y-2,289,y-2);
    }
  }
  for(let page=1; page<=pdf.getNumberOfPages(); page++) {
    pdf.setPage(page); pdf.text(`Page ${page} of ${pdf.getNumberOfPages()}`, 263, 205);
  }
  return pdf;
}
