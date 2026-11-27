import invoiceCss from "../pages/InvoicePage.css?inline";
import tokensCss from "../../styles/tokens.css?inline";
import unitCss from "../../components/ProductUnitFields.css?inline";
import { printCleanDocument } from "../../utils/cleanPrint";
import { readPrintSettings } from "../../components/InvoiceThemeSwitch";
import themeCss from "../../components/InvoiceThemeSwitch.css?inline";



export const invoiceExportCss = `${tokensCss}\n${unitCss}\n${invoiceCss}\n${themeCss}\nhtml,body{margin:0;padding:0;height:auto;overflow:visible;background:white}.invoice-page{padding:0;margin:0;background:white}.invoice-sheet{box-shadow:none;border:0;padding:0!important;margin:0!important;width:100%!important}`;
// A dedicated document keeps dashboard print rules and scroll containers out.
export function printDisplayedInvoice(node) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.title = "Invoice print document";
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0";
    let timer;
    const cleanup = () => { clearTimeout(timer); frame.remove(); };
    frame.onload = async () => {
      try {
        const doc = frame.contentDocument;
        await doc.fonts.ready;
        await Promise.all([...doc.images].map(img => img.decode().catch(() => {})));
        frame.contentWindow.addEventListener("afterprint", cleanup, { once: true });
        frame.contentWindow.focus();
        printCleanDocument(frame.contentWindow);
        timer = setTimeout(cleanup, 60000);
        resolve();
      } catch (error) { cleanup(); reject(error); }
    };
    const invMatch = (node.innerText || node.textContent || "").match(/INV-[\w\d-]+/i);
    const invNo = invMatch ? invMatch[0] : "";
    const { paperSize, orientation } = readPrintSettings();
    const pageRule = `@page { size: ${paperSize || "A4"} ${orientation || "portrait"}; }`;
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>:root { --inv-no: '${invNo}'; }\n${pageRule}\n${invoiceExportCss}</style></head><body><main class="invoice-page">${node.outerHTML}</main></body></html>`;
    document.body.appendChild(frame);
  });
}
