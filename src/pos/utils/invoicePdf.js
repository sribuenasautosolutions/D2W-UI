// Export the displayed invoice, including its existing styles and sale-time values.
// This does not render a second invoice template or open a print/PDF preview page.
import { invoiceExportCss } from "./printInvoice";

export async function downloadDisplayedInvoicePdf(node, filename, isCurrent = () => true) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"), import("jspdf"),
  ]);
  if (!node?.isConnected || !isCurrent()) throw new Error("Invoice changed. Open it again before saving.");
  if (document.fonts?.ready) await document.fonts.ready;
  const images = [...node.querySelectorAll("img")];
  await Promise.all(images.map(image => image.decode?.().catch(() => {}) ?? Promise.resolve()));
  const bounds = node.getBoundingClientRect();
  if (!bounds.width || !bounds.height) throw new Error("Wait for the invoice to finish loading before saving.");
  const blocks = [...node.querySelectorAll(".invoice-header, .invoice-party-grid, tr, .invoice-summary-grid, .invoice-footer")]
    .map(element => { const rect = element.getBoundingClientRect(); return { top: rect.top - bounds.top, bottom: rect.bottom - bounds.top }; });
  const canvas = await html2canvas(node, {
    scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false,
    scrollX: 0, scrollY: 0,
    onclone: clonedDocument => {
      // Only invoice styles belong in the exported document. Other screens
      // contain global print/visibility rules that can blank this capture.
      clonedDocument.querySelectorAll('style, link[rel="stylesheet"]').forEach(style => style.remove());
      const style = clonedDocument.createElement("style");
      style.textContent = invoiceExportCss;
      clonedDocument.head.appendChild(style);
      const sheet = clonedDocument.getElementById("invoice-export-sheet");
      if (!sheet) return;
      sheet.style.boxShadow = "none";
      sheet.style.borderColor = "transparent";
      sheet.style.minHeight = "0";
      // Prevent enclosing app scroll containers from clipping the invoice capture.
      for (let parent = sheet.parentElement; parent; parent = parent.parentElement) {
        parent.style.overflow = "visible";
        parent.style.maxHeight = "none";
      }
    },
  });
  if (!isCurrent()) throw new Error("Invoice changed. Open it again before saving.");
  if (!canvas.width || !canvas.height) throw new Error("Unable to capture the invoice. Please retry.");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pixelsPerPage = Math.floor(canvas.width * pageHeight / pageWidth);
  const scale = canvas.width / bounds.width;
  let top = 0;
  let page = 0;
  while (top < canvas.height) {
    let bottom = Math.min(top + pixelsPerPage, canvas.height);
    // CSS millimetres and canvas pixels round differently at A4 boundaries.
    if (canvas.height - bottom <= Math.ceil(scale * 2)) bottom = canvas.height;
    // Keep ordinary rows and summary blocks together instead of slicing their text.
    if (bottom < canvas.height) {
      const crossing = blocks.find(block => block.top * scale < bottom && block.bottom * scale > bottom
        && (block.bottom - block.top) * scale < pixelsPerPage && block.top * scale > top + 1);
      if (crossing) bottom = Math.floor(crossing.top * scale);
    }
    if (bottom <= top) bottom = Math.min(top + pixelsPerPage, canvas.height);
    const slice = document.createElement("canvas");
    slice.width = canvas.width; slice.height = bottom - top;
    const context = slice.getContext("2d");
    if (!context) throw new Error("Your browser could not create the PDF image.");
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, slice.width, slice.height);
    context.drawImage(canvas, 0, top, canvas.width, slice.height, 0, 0, slice.width, slice.height);
    if (page++ > 0) pdf.addPage();
    pdf.addImage(slice, "PNG", 0, 0, pageWidth, slice.height * pageWidth / canvas.width, undefined, "FAST");
    top = bottom;
  }
  pdf.save(filename);
}
