import tokensCss from "../../../../../styles/tokens.css?inline";
import { printCleanDocument } from "../../../../../utils/cleanPrint";

export const invoiceExportCss = `${tokensCss}\nhtml,body{margin:0;height:auto;overflow:visible;background:white}.invoice-page{padding:0;background:white}.invoice-sheet{box-shadow:none;border:0}`;

// A dedicated document keeps dashboard print rules and scroll containers out.
export function printDisplayedInvoice(node: HTMLElement): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.title = "Invoice print document";
    frame.style.cssText =
      "position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0";
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timer);
      frame.remove();
    };
    frame.onload = async () => {
      try {
        const doc = frame.contentDocument;
        if (!doc || !frame.contentWindow) {
          throw new Error("Unable to access print frame document.");
        }
        if (doc.fonts?.ready) {
          await doc.fonts.ready;
        }
        await Promise.all(
          [...doc.images].map((img) => img.decode().catch(() => {})),
        );
        frame.contentWindow.addEventListener("afterprint", cleanup, {
          once: true,
        });
        frame.contentWindow.focus();
        printCleanDocument(frame.contentWindow);
        timer = setTimeout(cleanup, 60000);
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>${invoiceExportCss}</style></head><body><main class="invoice-page">${node.outerHTML}</main></body></html>`;
    document.body.appendChild(frame);
  });
}
