import { ArrowLeft, PackageCheck, Pencil, Printer, Building2, Phone, Mail } from "lucide-react";


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
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function displayBillStatus(bill) {
  return bill?.status === "DRAFT" ? "DRAFT" : (bill?.paymentStatus || "UNPAID");
}

function statusStyle(status) {
  if (status === "PAID") return S.paidBadge;
  if (status === "DRAFT") return S.draftBadge;
  return S.unpaidBadge;
}

function statusDotStyle(status) {
  if (status === "PAID") return { ...S.statusDot, background: "#12805C" };
  if (status === "DRAFT") return { ...S.statusDot, background: "#B7791F" };
  return { ...S.statusDot, background: "#C23B3B" };
}


export default function VendorPurchaseInvoiceView({ bill, onBack, onEdit, onPrint, onOpenDraft, saving }) {
  if (!bill) return null;

  const items = bill.items || [];
  const isIgst = bill.gstMode === "IGST";
  const status = displayBillStatus(bill);

  const totalItemDiscount = items.reduce(
    (total, item) => total + Number(item.discountAmount || 0) * Number(item.acceptedQuantity || 0), 0
  );

  return (
    <div style={S.detailPage}>
      <style>{`
        .d2w-noscroll{scrollbar-width:none;-ms-overflow-style:none;}
        .d2w-noscroll::-webkit-scrollbar{display:none;}
        .d2w-row:hover{background:#FAFBFC;}
      `}</style>

      <header style={S.detailHeader}>
        <div style={S.headerTitleGroup}>
          <button type="button" onClick={onBack} style={S.backButton}><ArrowLeft size={17} /></button>
          <div>
            <span style={S.headerEyebrow}>All Bills</span>
            <h1 style={S.headerTitle}>{bill.vendorInvoiceNumber}</h1>
          </div>
        </div>
        <div style={S.headerActions}>
          <button type="button" style={S.plainAction} onClick={onEdit}><Pencil size={14} /> Edit</button>
          <button type="button" style={S.plainAction} onClick={onPrint}><Printer size={14} /> PDF / Print</button>
          {bill.status === "DRAFT" && (
            <button type="button" disabled={saving} style={S.primaryAction} onClick={() => onOpenDraft(bill.receiptId)}>
              <PackageCheck size={14} /> Open &amp; Receive Stock
            </button>
          )}
        </div>
      </header>

      <div className="bill-print-area d2w-noscroll" style={S.sheet}>
        {/* ============ TOP: vendor (sender) identity ============ */}
        <div style={S.vendorTop}>
          <div style={S.vendorIconWrap}><Building2 size={18} /></div>
          <div style={S.vendorMain}>
            <span style={S.sectionLabel}>Bill from</span>
            <strong style={S.entityNameLg}>{bill.vendorName}</strong>
            {bill.vendorAddress && <span style={S.metaLine}>{bill.vendorAddress}</span>}
          </div>
          <div style={S.vendorSide}>
            {bill.vendorGstNumber && <span style={S.metaLineRight}>GSTIN {bill.vendorGstNumber}</span>}
            {bill.vendorPhone && <span style={S.metaLineRight}><Phone size={11} style={S.inlineIcon} />{bill.vendorPhone}</span>}
            {bill.vendorEmail && <span style={S.metaLineRight}><Mail size={11} style={S.inlineIcon} />{bill.vendorEmail}</span>}
          </div>
        </div>

        {/* ============ RECEIVER (left) + INVOICE DETAILS (right) ============ */}
        <div style={S.topRow}>
          <div style={S.receiverBlock}>
            <span style={S.sectionLabel}>Bill to</span>
            <strong style={S.entityName}>{bill.storeName}</strong>
            {bill.storeAddress && <span style={S.metaLine}>{bill.storeAddress}</span>}
            {bill.storeGstNumber && <span style={S.metaLine}>GSTIN {bill.storeGstNumber}</span>}
          </div>

          <div style={S.invoiceDetailsBlock}>
            <span style={S.sectionLabel}>Invoice details</span>
            <div style={S.detailsGrid}>
              <div style={S.factCell}>
                <span style={S.factLabel}>Receipt #</span>
                <strong style={S.factValue}>{bill.receiptNumber || "—"}</strong>
              </div>
              <div style={S.factCell}>
                <span style={S.factLabel}>Vendor invoice #</span>
                <strong style={S.factValue}>{bill.vendorInvoiceNumber}</strong>
              </div>
              <div style={S.factCell}>
                <span style={S.factLabel}>Invoice date</span>
                <strong style={S.factValue}>{formatDate(bill.invoiceDate)}</strong>
              </div>
              <div style={S.factCell}>
                <span style={S.factLabel}>Due date</span>
                <strong style={S.factValue}>{formatDate(bill.dueDate)}</strong>
              </div>
              {bill.paymentMethod && (
                <div style={S.factCell}>
                  <span style={S.factLabel}>Payment method</span>
                  <strong style={S.factValue}>{bill.paymentMethod}</strong>
                </div>
              )}
              <div style={S.factCell}>
                <span style={S.factLabel}>Status</span>
                <span style={statusStyle(status)}><i style={statusDotStyle(status)} />{status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ MAIN ITEM TABLE ============ */}
        <div className="d2w-noscroll" style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>S.No</th>
                <th style={{ ...S.th, textAlign: "left" }}>Part No / Part Name</th>
                <th style={S.th}>HSN</th>
                <th style={{ ...S.th, textAlign: "right" }}>Qty</th>
                <th style={{ ...S.th, textAlign: "right" }}>MRP</th>
                <th style={{ ...S.th, textAlign: "right" }}>Purchase Price</th>
                <th style={{ ...S.th, textAlign: "right" }}>Selling Price</th>
                <th style={{ ...S.th, textAlign: "right" }}>Discount</th>
                <th style={{ ...S.th, textAlign: "right" }}>Taxable Value</th>
                <th style={{ ...S.th, textAlign: "right" }}>GST</th>
                <th style={{ ...S.th, textAlign: "right" }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.itemId || index} className="d2w-row" style={S.tr}>
                  <td style={S.tdCenter}>{index + 1}</td>
                  <td style={S.tdPart}>
                    <strong style={S.partNumber}>{item.partNumber}</strong>
                    <span style={S.partName}>{item.itemName}</span>
                  </td>
                  <td style={S.tdCenter}>{item.hsnCode || "—"}</td>
                  <td style={S.tdRight}>{item.acceptedQuantity ?? item.receivedQuantity}</td>
                  <td style={S.tdRight}>{formatMoney(item.mrp)}</td>
                  <td style={S.tdRight}>{formatMoney(item.purchasePrice)}</td>
                  <td style={S.tdRight}>{formatMoney(item.sellingPrice)}</td>
                  <td style={S.tdRight}>
                    <span>{Number(item.discountPercentage || 0)}%</span>
                    <span style={S.subValue}>{formatMoney(item.discountAmount)}</span>
                  </td>
                  <td style={S.tdRight}>{formatMoney(item.taxableValue)}</td>
                  <td style={S.tdRight}>
                    <span>{Number(item.gstPercentage || 0)}%</span>
                    <span style={S.subValue}>{formatMoney(item.gstAmount)}</span>
                  </td>
                  <td style={S.tdRightStrong}>{formatMoney(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ============ PAYMENT SUMMARY ============ */}
        <div style={S.summaryRow}>
          <div style={S.summaryCard}>
            <span style={S.summaryCardTitle}>Payment summary</span>
            <div style={S.summaryLine}><span>Taxable amount</span><strong>{formatMoney(bill.taxableAmount)}</strong></div>
            <div style={S.summaryLine}><span>Total discount</span><strong>{formatMoney(totalItemDiscount)}</strong></div>
            {isIgst ? (
              <div style={S.summaryLine}><span>IGST</span><strong>{formatMoney(bill.igstAmount)}</strong></div>
            ) : (
              <>
                <div style={S.summaryLine}><span>CGST</span><strong>{formatMoney(bill.cgstAmount)}</strong></div>
                <div style={S.summaryLine}><span>SGST</span><strong>{formatMoney(bill.sgstAmount)}</strong></div>
              </>
            )}
            <div style={S.summaryLine}><span>Total GST</span><strong>{formatMoney(bill.totalGstAmount)}</strong></div>
            <div style={S.summaryLine}><span>Round off</span><strong>{formatMoney(bill.roundOffAmount)}</strong></div>
            <div style={S.summaryLineTotal}><span>Grand total</span><strong>{formatMoney(bill.totalAmount)}</strong></div>
            <div style={S.summaryLine}><span>Amount paid</span><strong>{formatMoney(bill.amountPaid)}</strong></div>
            <div style={S.summaryLine}><span>Balance due</span><strong>{formatMoney(bill.balanceDue)}</strong></div>
            {bill.paymentReference && <div style={S.summaryLine}><span>Payment reference</span><strong>{bill.paymentReference}</strong></div>}
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
            Last edited{bill.editedAt ? ` on ${formatDateTime(bill.editedAt)}` : ""}: {bill.lastEditReason}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  detailPage: { minHeight: "calc(100vh - 28px)", paddingBottom: 48, background: "#F6F7F9", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },

  detailHeader: { minHeight: 64, padding: "0 24px", borderBottom: "1px solid #E7E9EE", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, position: "sticky", top: 0, zIndex: 5 },
  headerTitleGroup: { display: "flex", alignItems: "center", gap: 14 },
  backButton: { width: 34, height: 34, border: "1px solid #E1E4EA", borderRadius: 8, background: "#FFFFFF", color: "#40454E", display: "grid", placeItems: "center", cursor: "pointer", transition: "background .15s, border-color .15s" },
  headerEyebrow: { color: "#8A8F98", fontSize: 10.5, fontWeight: 600, letterSpacing: ".3px", textTransform: "uppercase" },
  headerTitle: { margin: "2px 0 0", color: "#14161A", fontSize: 17, fontWeight: 600, letterSpacing: "-.1px" },
  headerActions: { display: "flex", alignItems: "center", gap: 8 },
  plainAction: { height: 36, padding: "0 13px", border: "1px solid #E1E4EA", borderRadius: 8, background: "#FFFFFF", color: "#40454E", display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 500, cursor: "pointer" },
  primaryAction: { height: 36, padding: "0 15px", border: "1px solid #1E4FD6", borderRadius: 8, background: "#2451D6", color: "#FFFFFF", display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(36,81,214,.25)" },

  sheet: { width: "min(1020px, calc(100% - 56px))", margin: "28px auto", padding: "38px 44px 42px", borderRadius: 14, border: "1px solid #EAEBEF", background: "#FFFFFF", boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.05)", boxSizing: "border-box", overflowX: "auto" },

  sectionLabel: { display: "block", marginBottom: 8, color: "#9297A1", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" },
  entityName: { display: "block", marginBottom: 4, color: "#14161A", fontSize: 14.5, fontWeight: 700 },
  entityNameLg: { display: "block", marginBottom: 4, color: "#14161A", fontSize: 17, fontWeight: 700, letterSpacing: "-.2px" },
  metaLine: { display: "block", marginTop: 2, color: "#6B7280", fontSize: 12.5 },
  metaLineRight: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, color: "#565C68", fontSize: 12 },
  inlineIcon: { color: "#9297A1", flexShrink: 0 },

  vendorTop: { display: "flex", alignItems: "flex-start", gap: 14, paddingBottom: 22, borderBottom: "1px solid #EEF0F3" },
  vendorIconWrap: { width: 40, height: 40, borderRadius: 9, background: "#EAF0FF", color: "#2451D6", display: "grid", placeItems: "center", flexShrink: 0 },
  vendorMain: { flex: 1, minWidth: 0 },
  vendorSide: { display: "grid", gap: 5, justifyItems: "end", textAlign: "right", paddingTop: 24 },

  topRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 40, marginTop: 22, paddingBottom: 26, borderBottom: "1px solid #EEF0F3" },
  receiverBlock: { display: "grid", gap: 2, minWidth: 220 },
  invoiceDetailsBlock: { minWidth: 280 },
  detailsGrid: { display: "grid", gridTemplateColumns: "repeat(2, auto)", columnGap: 32, rowGap: 14 },
  factCell: { display: "grid", gap: 6, justifyItems: "start" },
  factLabel: { color: "#9297A1", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" },
  factValue: { color: "#20232A", fontSize: 13.5 },
  statusDot: { width: 6, height: 6, borderRadius: "50%", display: "inline-block" },

  tableWrap: { marginTop: 28, overflowX: "auto", borderRadius: 10, border: "1px solid #EAEBEF" },
  table: { width: "100%", minWidth: 920, borderCollapse: "collapse", fontSize: 11.5 },
  th: { padding: "11px 10px", background: "#F7F8FA", color: "#5C616B", textAlign: "center", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px", whiteSpace: "nowrap", borderBottom: "1px solid #EAEBEF" },
  tr: { borderBottom: "1px solid #F1F2F5", transition: "background .1s" },
  tdCenter: { padding: "11px 8px", textAlign: "center", color: "#40454E", verticalAlign: "top" },
  tdRight: { padding: "11px 8px", textAlign: "right", color: "#14161A", verticalAlign: "top", whiteSpace: "nowrap" },
  tdRightStrong: { padding: "11px 8px", textAlign: "right", color: "#14161A", fontWeight: 700, verticalAlign: "top", whiteSpace: "nowrap" },
  tdPart: { padding: "11px 8px", textAlign: "left", verticalAlign: "top" },
  partNumber: { display: "block", color: "#14161A", fontSize: 12 },
  partName: { display: "block", marginTop: 2, color: "#8A8F98", fontSize: 11 },
  subValue: { display: "block", marginTop: 2, color: "#A3A8B1", fontSize: 10 },

  summaryRow: { marginTop: 28, display: "flex", justifyContent: "flex-end" },
  summaryCard: { width: "min(360px, 100%)", border: "1px solid #EAEBEF", borderRadius: 10, overflow: "hidden" },
  summaryCardTitle: { display: "block", padding: "11px 16px", background: "#F7F8FA", borderBottom: "1px solid #EAEBEF", color: "#40454E", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" },
  summaryLine: { display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #F5F6F8", color: "#565C68", fontSize: 12.5 },
  summaryLineTotal: { display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#EAF0FF", color: "#1E3FA8", fontSize: 14, fontWeight: 700 },

  notes: { marginTop: 26, paddingTop: 18, borderTop: "1px solid #EEF0F3", display: "grid", gap: 6 },
  notesText: { color: "#40454E", fontSize: 12.5, lineHeight: 1.6 },
  auditNote: { marginTop: 16, padding: "11px 14px", borderLeft: "3px solid #E4A94F", borderRadius: "0 8px 8px 0", background: "#FFF9EE", color: "#7A5416", fontSize: 11.5 },

  paidBadge: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: "#E7F7EF", color: "#0F6E3F", fontSize: 11.5, fontWeight: 600 },
  draftBadge: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: "#FFF4DD", color: "#93630B", fontSize: 11.5, fontWeight: 600 },
  unpaidBadge: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: "#FDECEC", color: "#B23030", fontSize: 11.5, fontWeight: 600 },
};
