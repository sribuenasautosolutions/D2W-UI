import cleanPrintCss from "../styles/cleanPrint.css?inline";

// Apply last, including in standalone invoice frames and vendor bill popups.
export function prepareCleanPrint(doc) {
  let style = doc.getElementById("d2w-clean-print");
  if (!style) {
    style = doc.createElement("style");
    style.id = "d2w-clean-print";
  }
  style.textContent = cleanPrintCss;
  doc.head.appendChild(style);
}

export function printCleanDocument(target = window) {
  prepareCleanPrint(target.document);
  target.print();
}
