import { useEffect } from "react";
import { printCleanDocument } from "../../../utils/cleanPrint";
import {
  ArrowLeft,
  PackageCheck,
  Pencil,
  Printer,
  Phone,
  Mail,
} from "lucide-react";

// ASSUMPTION: adjust this import to match the actual D2W logo file already
// present in your project's assets folder (e.g. "../../assets/d2w-logo.png"
// or "../../assets/logo/d2w-logo.svg"). Point it at whatever primary D2W
// logo asset is already used elsewhere in the app (e.g. the sidebar/header).
import d2wLogo from "../../../assets/deals2wheels-logo100.png";

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// NEW: line-item amount = quantity * mrp, using the same quantity fallback
// (acceptedQuantity -> receivedQuantity) already used for display elsewhere
// in this component. Guards against null/undefined/0/NaN inputs.
// function computeLineAmount(item) {
//   const qtyRaw = item.acceptedQuantity ?? item.receivedQuantity;
//   const mrpRaw = item.mrp;

//   const qty = Number(qtyRaw);
//   const mrp = Number(mrpRaw);

//   if (!Number.isFinite(qty) || !Number.isFinite(mrp)) return 0;

//   return qty * mrp;
// }
function computeLineAmount(item) {
  const qtyRaw = item.acceptedQuantity ?? item.receivedQuantity;
  const sellingPriceRaw = item.sellingPrice;

  const qty = Number(qtyRaw);
  const sellingPrice = Number(sellingPriceRaw);

  if (!Number.isFinite(qty) || !Number.isFinite(sellingPrice)) return 0;

  return qty * sellingPrice;
}

export default function VendorPurchaseInvoiceView({
  bill,
  onBack,
  onEdit,
  onOpenDraft,
  saving,
}) {
  const billNumber = bill?.vendorInvoiceNumber;
  useEffect(() => {
    const previousTitle = document.title;
    document.title = billNumber ? `Invoice · ${billNumber}` : "Invoice";
    return () => {
      document.title = previousTitle;
    };
  }, [billNumber]);

  if (!bill) return null;

  const items = bill.items || [];
  const handlePrint = () => {
    const invoice = document.querySelector(".bill-print-area");
    if (!invoice) {
      console.error("Invoice print area not found");
      return;
    }
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) {
      alert("Please allow pop-ups to print the invoice.");
      return;
    }
    const invoiceHtml = invoice.outerHTML;
    printWindow.document.open();
    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>
          Invoice - ${bill.vendorInvoiceNumber || ""}
        </title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
          }
          * {
            box-sizing: border-box;
          }
          .bill-print-area {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .bill-print-area > div {
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
          }
          table {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            height: auto !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }
          thead {
            display: table-header-group !important;
          }
          tbody {
            display: table-row-group !important;
          }
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          th,
          td {
            break-inside: avoid;
            page-break-inside: avoid;
            overflow: visible !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
          }
          img {
            max-width: 100% !important;
          }
          .d2w-noscroll {
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            height: auto !important;
            max-height: none !important;
          }
        </style>
      </head>
      <body>
        ${invoiceHtml}
      </body>
    </html>
  `);
    printWindow.document.close();
    // Wait until the invoice is actually rendered.
    setTimeout(() => {
      const printedRows = printWindow.document.querySelectorAll(
        ".bill-print-area tbody tr",
      ).length;
      console.log("Rows sent to print window:", printedRows);
      if (printedRows === 0) {
        console.error("No invoice rows found in print window");
        return;
      }
      printWindow.focus();
      setTimeout(() => {
        printCleanDocument(printWindow);
      }, 300);
    }, 500);
  };

  const isIgst = bill.gstMode === "IGST";

  const totalItemDiscount = items.reduce(
    (total, item) =>
      total +
      Number(item.discountAmount || 0) * Number(item.acceptedQuantity || 0),
    0,
  );

  return (
    <div style={S.detailPage}>
      <style>{`
  .d2w-noscroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .d2w-noscroll::-webkit-scrollbar {
    display: none;
  }

  .d2w-row:hover {
    background: #F8FAFC;
  }
`}</style>

      <header style={S.detailHeader}>
        <div style={S.headerTitleGroup}>
          <button type="button" onClick={onBack} style={S.backButton}>
            <ArrowLeft size={17} />
          </button>
          <div>
            {/* CHANGED: "PERFORMA INVOICE" is now the prominent title,
                bill number moved below it as a secondary line. */}
            <h1 style={S.headerTitle}>Invoice</h1>
            <span style={S.headerSubtitle}>{bill.vendorInvoiceNumber}</span>
          </div>
        </div>
        <div style={S.headerActions}>
          <button type="button" style={S.plainAction} onClick={onEdit}>
            <Pencil size={14} /> Edit
          </button>
          <button type="button" style={S.plainAction} onClick={handlePrint}>
            <Printer size={14} /> PDF / Print
          </button>
          {bill.status === "DRAFT" && (
            <button
              type="button"
              disabled={saving}
              style={S.primaryAction}
              onClick={() => onOpenDraft(bill.receiptId)}
            >
              <PackageCheck size={14} /> Open &amp; receive stock
            </button>
          )}
        </div>
      </header>

      <div className="bill-print-area d2w-noscroll" style={S.sheet}>
        <h1 style={S.invoiceTitle}>INVOICE</h1>
        {/* ============ LETTERHEAD: vendor identity (left) + logo (top-right) ============ */}
        <div style={S.letterhead}>
          <div style={S.vendorMain}>
            <span style={S.sectionLabel}>Bill from</span>
            <strong style={S.entityNameLg}>{bill.vendorName}</strong>
            {bill.vendorAddress && (
              <span style={S.metaLine}>{bill.vendorAddress}</span>
            )}
            {bill.vendorGstNumber && (
              <span style={S.metaLine}>GSTIN {bill.vendorGstNumber}</span>
            )}
            {bill.vendorPhone && (
              <span style={S.metaLine}>
                <Phone size={11} style={S.inlineIcon} />
                {bill.vendorPhone}
              </span>
            )}
            {bill.vendorEmail && (
              <span style={S.metaLine}>
                <Mail size={11} style={S.inlineIcon} />
                {bill.vendorEmail}
              </span>
            )}
          </div>
          <div style={S.logoInvoiceBox}>
            <div style={S.logoBox}>
              {bill.vendorLogoUrl ? (
                <img
                  src={bill.vendorLogoUrl}
                  alt={`${bill.vendorName || "Vendor"} logo`}
                  style={S.logoImg}
                />
              ) : (
                <img src={d2wLogo} alt="D2W" style={S.logoImg} />
              )}
            </div>

            <div style={S.invoiceMeta}>
              <div style={S.invoiceMetaRow}>
                <span>Invoice Number</span>
                <strong>{bill.vendorInvoiceNumber || "—"}</strong>
              </div>

              <div style={S.invoiceMetaRow}>
                <span>Invoice Date</span>
                <strong>{formatDate(bill.invoiceDate)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ============ RECEIVER (bill to) ============ */}
        <div style={S.topRow}>
          <div style={S.receiverBlock}>
            <span style={S.sectionLabel}>Bill to</span>
            <strong style={S.entityName}>{bill.storeName}</strong>
            {bill.storeAddress && (
              <span style={S.metaLine}>{bill.storeAddress}</span>
            )}
            {bill.storeGstNumber && (
              <span style={S.metaLine}>GSTIN {bill.storeGstNumber}</span>
            )}
          </div>
        </div>

        {/* ============ MAIN ITEM TABLE ============ */}
        <div className="d2w-noscroll" style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>S.No</th>
                <th style={{ ...S.th, textAlign: "left" }}>Item description</th>
                <th style={S.th}>HSN</th>
                <th style={{ ...S.th, textAlign: "right" }}>Qty</th>
                <th style={{ ...S.th, textAlign: "right" }}>Rate</th>
                <th style={{ ...S.th, textAlign: "right" }}>MRP</th>
                <th style={{ ...S.th, textAlign: "right" }}>GST amount</th>
                {/* NEW */}
                <th style={{ ...S.th, textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.itemId || index} className="d2w-row" style={S.tr}>
                  <td style={S.tdCenter}>{index + 1}</td>
                  <td style={S.tdPart}>
                    {<strong style={S.partNumber}>{item.partNumber}</strong>}
                    <span style={S.partName}>{item.itemName}</span>
                  </td>
                  <td style={S.tdCenter}>{item.hsnCode || "—"}</td>
                  <td style={S.tdRight}>
                    {item.acceptedQuantity ?? item.receivedQuantity}
                  </td>
                  <td style={S.tdRight}>{formatMoney(item.sellingPrice)}</td>
                  <td style={S.tdRight}>{formatMoney(item.mrp)}</td>
                  <td style={S.tdRight}>
                    <span>{Number(item.gstPercentage || 0)}%</span>
                    <span style={S.subValue}>
                      {formatMoney(item.gstAmount)}
                    </span>
                  </td>
                  {/* NEW: quantity * mrp, independent of GST */}
                  <td style={S.tdRight}>
                    {formatMoney(computeLineAmount(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ============ PAYMENT SUMMARY ============ */}
        <div style={S.summaryRow}>
          <div style={S.summaryCard}>
            <span style={S.summaryCardTitle}>Payment summary</span>
            <div style={S.summaryLine}>
              <span>Taxable amount</span>
              <strong>{formatMoney(bill.taxableAmount)}</strong>
            </div>
            <div style={S.summaryLine}>
              <span>Total discount</span>
              <strong>{formatMoney(totalItemDiscount)}</strong>
            </div>
            {isIgst ? (
              <div style={S.summaryLine}>
                <span>IGST</span>
                <strong>{formatMoney(bill.igstAmount)}</strong>
              </div>
            ) : (
              <>
                <div style={S.summaryLine}>
                  <span>CGST</span>
                  <strong>{formatMoney(bill.cgstAmount)}</strong>
                </div>
                <div style={S.summaryLine}>
                  <span>SGST</span>
                  <strong>{formatMoney(bill.sgstAmount)}</strong>
                </div>
              </>
            )}
            <div style={S.summaryLine}>
              <span>Total GST</span>
              <strong>{formatMoney(bill.totalGstAmount)}</strong>
            </div>
            <div style={S.summaryLine}>
              <span>Round off</span>
              <strong>{formatMoney(bill.roundOffAmount)}</strong>
            </div>
            <div style={S.summaryLineTotal}>
              <span>Grand total</span>
              <strong>{formatMoney(bill.totalAmount)}</strong>
            </div>
            <div style={S.summaryLine}>
              <span>Amount paid</span>
              <strong>{formatMoney(bill.amountPaid)}</strong>
            </div>
            <div style={S.summaryLine}>
              <span>Balance due</span>
              <strong>{formatMoney(bill.balanceDue)}</strong>
            </div>
            {bill.paymentReference && (
              <div style={S.summaryLine}>
                <span>Payment reference</span>
                <strong>{bill.paymentReference}</strong>
              </div>
            )}
          </div>
        </div>

        {/* ============ NOTES / REMARKS ============ */}
        {bill.remarks && (
          <div style={S.notes}>
            <span style={S.sectionLabel}>Notes / remarks</span>
            <span style={S.notesText}>{bill.remarks}</span>
          </div>
        )}

        {/* ============ AUDIT INFORMATION ============ */}
        {bill.lastEditReason && (
          <div style={S.auditNote}>
            Last edited
            {bill.editedAt ? ` on ${formatDateTime(bill.editedAt)}` : ""}:{" "}
            {bill.lastEditReason}
          </div>
        )}
      </div>
    </div>
  );
}

const COLOR = {
  bg: "#FFFFFF",
  bgMuted: "#F8FAFC",
  // NEW: light tint used for the invoice sheet itself. Deliberately a shade
  // darker than near-white (not #FBFCFE) so a white/transparent-white logo
  // in the letterhead stays visible against it instead of disappearing.
  sheetBg: "#EEF2F7",
  border: "#E5E7EB",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9297A1",
  accent: "#2563EB",
  accentSoft: "#EFF4FE",
  success: "#0F6E3F",
  successSoft: "#E7F7EF",
  warning: "#93630B",
  warningSoft: "#FFF4DD",
  danger: "#B23030",
  dangerSoft: "#FDECEC",
};

const S: Record<string, any> = {
  detailPage: {
    minHeight: "calc(100vh - 28px)",
    paddingBottom: 48,
    background: COLOR.bgMuted,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  detailHeader: {
    minHeight: 64,
    padding: "0 24px",
    borderBottom: `1px solid ${COLOR.border}`,
    background: COLOR.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    position: "sticky",
    top: 0,
    zIndex: 5,
  },
  headerTitleGroup: { display: "flex", alignItems: "center", gap: 14 },
  backButton: {
    width: 34,
    height: 34,
    border: `1px solid ${COLOR.border}`,
    borderRadius: 8,
    background: COLOR.bg,
    color: COLOR.textSecondary,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  headerEyebrow: {
    color: COLOR.textMuted,
    fontSize: 10.5,
    fontWeight: 500,
    letterSpacing: ".03em",
    textTransform: "uppercase",
  },
  headerTitle: {
    margin: 0,
    color: COLOR.textPrimary,
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: "-.1px",
    textTransform: "uppercase",
  },
  // NEW: secondary line under the "Performa Invoice" title, for the bill number
  headerSubtitle: {
    display: "block",
    marginTop: 2,
    color: COLOR.textSecondary,
    fontSize: 12.5,
    fontWeight: 500,
  },
  headerActions: { display: "flex", alignItems: "center", gap: 8 },
  plainAction: {
    height: 36,
    padding: "0 13px",
    border: `1px solid ${COLOR.border}`,
    borderRadius: 8,
    background: COLOR.bg,
    color: COLOR.textSecondary,
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer",
  },
  primaryAction: {
    height: 36,
    padding: "0 15px",
    border: "none",
    borderRadius: 8,
    background: COLOR.accent,
    color: "#FFFFFF",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer",
  },
  invoiceTitle: {
    margin: "0 0 24px",
    color: COLOR.textPrimary,
    fontSize: 24,
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  // CHANGED: background switched from pure white (COLOR.bg) to a light tint (COLOR.sheetBg)
  sheet: {
    width: "min(1020px, calc(100% - 56px))",
    margin: "28px auto",
    padding: "38px 44px 42px",
    borderRadius: 12,
    border: `1px solid ${COLOR.border}`,
    background: COLOR.sheetBg,
    boxSizing: "border-box",
    overflowX: "auto",
  },

  sectionLabel: {
    display: "block",
    marginBottom: 8,
    color: COLOR.textMuted,
    fontSize: 10,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: ".04em",
  },
  entityName: {
    display: "block",
    marginBottom: 4,
    color: COLOR.textPrimary,
    fontSize: 14.5,
    fontWeight: 500,
  },
  entityNameLg: {
    display: "block",
    marginBottom: 4,
    color: COLOR.textPrimary,
    fontSize: 17,
    fontWeight: 500,
    letterSpacing: "-.2px",
  },
  metaLine: {
    display: "block",
    marginTop: 2,
    color: COLOR.textSecondary,
    fontSize: 12.5,
  },
  inlineIcon: {
    color: COLOR.textMuted,
    flexShrink: 0,
    marginRight: 4,
    verticalAlign: "middle",
  },

  letterhead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 24,
    paddingBottom: 22,
    borderBottom: `1px solid ${COLOR.border}`,
  },
  vendorMain: { flex: 1, minWidth: 0 },

  logoBox: {
    width: 110,
    height: 64,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
  },
  logoInvoiceBox: {
    width: 280,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 10,
  },

  invoiceMeta: {
    width: "100%",
    display: "grid",
    gap: 6,
  },

  invoiceMetaRow: {
    display: "grid",
    gridTemplateColumns: "110px 1fr",
    gap: 10,
    alignItems: "center",
    fontSize: 11.5,
    color: COLOR.textSecondary,
  },

  invoiceMetaValue: {
    color: COLOR.textPrimary,
    fontWeight: 500,
    textAlign: "right",
  },
  logoImg: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  logoPlaceholder: {
    width: "100%",
    height: "100%",
    border: `1px dashed ${COLOR.border}`,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    color: COLOR.textMuted,
    fontSize: 11,
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 40,
    marginTop: 22,
    paddingBottom: 26,
    borderBottom: `1px solid ${COLOR.border}`,
  },
  receiverBlock: { display: "grid", gap: 2, minWidth: 220 },

  tableWrap: {
    marginTop: 28,
    overflowX: "auto",
    borderRadius: 10,
    border: `1px solid ${COLOR.border}`,
  },
  // CHANGED: minWidth bumped from 640 -> 720 to comfortably fit the new Amount column
  table: {
    width: "100%",
    minWidth: 720,
    borderCollapse: "collapse",
    fontSize: 11.5,
  },
  th: {
    padding: "11px 10px",
    background: COLOR.bgMuted,
    color: COLOR.textSecondary,
    textAlign: "center",
    fontSize: 9.5,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: ".03em",
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${COLOR.border}`,
  },
  tr: { borderBottom: `1px solid ${COLOR.border}` },
  tdCenter: {
    padding: "11px 8px",
    textAlign: "center",
    color: COLOR.textSecondary,
    verticalAlign: "top",
  },
  tdRight: {
    padding: "11px 8px",
    textAlign: "right",
    color: COLOR.textPrimary,
    verticalAlign: "top",
    whiteSpace: "nowrap",
  },
  tdPart: { padding: "11px 8px", textAlign: "left", verticalAlign: "top" },
  partNumber: { display: "block", color: COLOR.textPrimary, fontSize: 12 },
  partName: {
    display: "block",
    marginTop: 2,
    color: COLOR.textMuted,
    fontSize: 11,
  },
  subValue: {
    display: "block",
    marginTop: 2,
    color: COLOR.textMuted,
    fontSize: 10,
  },

  summaryRow: { marginTop: 28, display: "flex", justifyContent: "flex-end" },
  summaryCard: {
    width: "min(360px, 100%)",
    border: `1px solid ${COLOR.border}`,
    borderRadius: 10,
    overflow: "hidden",
  },
  summaryCardTitle: {
    display: "block",
    padding: "11px 16px",
    background: COLOR.bgMuted,
    borderBottom: `1px solid ${COLOR.border}`,
    color: COLOR.textSecondary,
    fontSize: 11,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: ".03em",
  },
  summaryLine: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 16px",
    borderBottom: `1px solid ${COLOR.bgMuted}`,
    color: COLOR.textSecondary,
    fontSize: 12.5,
  },
  summaryLineTotal: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: COLOR.accentSoft,
    color: COLOR.accent,
    fontSize: 14,
    fontWeight: 500,
  },

  notes: {
    marginTop: 26,
    paddingTop: 18,
    borderTop: `1px solid ${COLOR.border}`,
    display: "grid",
    gap: 6,
  },
  notesText: { color: COLOR.textSecondary, fontSize: 12.5, lineHeight: 1.6 },
  auditNote: {
    marginTop: 16,
    padding: "11px 14px",
    borderRadius: 8,
    border: `1px solid ${COLOR.warningSoft}`,
    background: COLOR.warningSoft,
    color: COLOR.warning,
    fontSize: 11.5,
  },
};
