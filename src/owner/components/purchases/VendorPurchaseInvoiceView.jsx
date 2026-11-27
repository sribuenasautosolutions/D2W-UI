import { useEffect, useRef } from "react";
import { ArrowLeft, PackageCheck, Pencil, Printer } from "lucide-react";
import { useInvoiceTheme, SaleDocumentSheet } from "../../../components/InvoiceThemeSwitch";
import { printDisplayedInvoice } from "../../../pos/utils/printInvoice";
import "../../../pos/pages/InvoicePage.css";

import d2wLogo from "../../../assets/deals2wheels-logo100.png";

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function computeLineAmount(item) {
  if (item.lineTotal != null && Number.isFinite(Number(item.lineTotal))) {
    return Number(item.lineTotal);
  }
  const qty = Number((item.acceptedQuantity ?? item.receivedQuantity) || 0);
  const price = Number(item.purchasePrice || 0);
  return qty * price;
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s.includes("PAID") || s.includes("COMPLETE")) return "ok";
  if (s.includes("DRAFT") || s.includes("PARTIAL") || s.includes("PENDING")) return "warn";
  if (s.includes("UNPAID") || s.includes("DUE") || s.includes("CANCEL")) return "danger";
  return "neutral";
}

// Build a `doc` object compatible with SaleDocumentSheet (used for sale / charcoal / landscape themes)
function buildPurchaseBillDoc(bill, items, logo) {
  const isIgst = bill.gstMode === "IGST";

  const docItems = items.map((item, index) => ({
    key: item.itemId || index,
    raw: item,
    name: item.itemName || "—",
    showUnit: false,
    partNo: item.partNumber || "—",
    hsn: item.hsnCode || "—",
    brand: item.brand || "—",
    qty: item.acceptedQuantity ?? item.receivedQuantity ?? 0,
    mrp: Number(item.mrp || 0),
    rate: Number(item.purchasePrice || 0),
    discountAmount: Number(item.discountAmount || 0) * Number(item.acceptedQuantity || 0),
    discountPct: Number(item.discountPercentage || 0),
    taxable: Number(item.taxableAmount || 0),
    gst: Number(item.gstAmount || 0),
    gstPct: Number(item.gstPercentage || 0),
    amount: computeLineAmount(item),
    extras: [],
  }));

  const totalDiscount = items.reduce(
    (sum, item) => sum + Number(item.discountAmount || 0) * Number(item.acceptedQuantity || 0),
    0
  );

  const summary = [
    { label: "Taxable Amount", value: Number(bill.taxableAmount || 0) },
    ...(totalDiscount > 0 ? [{ label: "Total Discount", value: totalDiscount, subtract: true }] : []),
    ...(isIgst
      ? [{ label: "IGST", value: Number(bill.igstAmount || 0) }]
      : [
          { label: "CGST", value: Number(bill.cgstAmount || 0) },
          { label: "SGST", value: Number(bill.sgstAmount || 0) },
        ]),
    { label: "Total GST", value: Number(bill.totalGstAmount || 0) },
    ...(Number(bill.roundOffAmount || 0) !== 0
      ? [{ label: "Round Off", value: Number(bill.roundOffAmount || 0) }]
      : []),
    { label: "Grand Total", value: Number(bill.totalAmount || 0), strong: true, bar: true },
    { label: "Amount Paid", value: Number(bill.amountPaid || 0) },
    { label: "Balance Due", value: Number(bill.balanceDue || 0) },
  ];

  const totals = {
    qty: docItems.reduce((s, i) => s + Number(i.qty || 0), 0),
    discount: totalDiscount,
    taxable: docItems.reduce((s, i) => s + i.taxable, 0),
    gst: docItems.reduce((s, i) => s + i.gst, 0),
    amount: docItems.reduce((s, i) => s + i.amount, 0),
  };

  const storeLines = [
    bill.storeAddress,
    bill.storeGstNumber ? `GSTIN: ${bill.storeGstNumber}` : null,
  ].filter(Boolean);

  const vendorLines = [
    bill.vendorAddress,
    bill.vendorGstNumber ? `GSTIN: ${bill.vendorGstNumber}` : null,
    bill.vendorPhone ? `Ph: ${bill.vendorPhone}` : null,
    bill.vendorEmail || null,
  ].filter(Boolean);

  return {
    title: "Purchase Invoice",
    // In a purchase bill: vendor = supplier (store field = "from"), D2W store = receiver (billTo = "to")
    store: { name: bill.vendorName || "Vendor", lines: vendorLines },
    billTo: { name: bill.storeName || "—", lines: storeLines },
    shipTo: null,
    detailsTitle: "Invoice Details",
    details: [
      { label: "Invoice No", value: bill.vendorInvoiceNumber || "—" },
      { label: "Date", value: formatDate(bill.invoiceDate) },
      { label: "Due Date", value: formatDate(bill.dueDate) },
      {
        label: "Status",
        value: bill.status || "—",
        tone: statusTone(bill.status),
      },
    ],
    logo: bill.vendorLogoUrl || logo,
    invoiceNumber: bill.vendorInvoiceNumber,
    showDiscount: totalDiscount > 0,
    items: docItems,
    totals,
    summary,
    payments: bill.paymentReference
      ? [{ key: "1", label: "Payment Reference", amount: Number(bill.amountPaid || 0), ref: bill.paymentReference }]
      : [],
    description: bill.remarks || null,
    words: null,
    dueDate: formatDate(bill.dueDate) !== "—" ? formatDate(bill.dueDate) : null,
    terms: [],
    bank: [],
    customerSignature: false,
    footerNote: bill.lastEditReason
      ? `Last edited${bill.editedAt ? ` on ${formatDateTime(bill.editedAt)}` : ""}: ${bill.lastEditReason}`
      : "This is a computer-generated purchase invoice.",
    tableVariant: "proforma",
  };
}

export default function VendorPurchaseInvoiceView({
  bill,
  onBack,
  onEdit,
  onOpenDraft,
  saving,
}) {
  // Theme is read solely from Settings (no theme switcher in this view)
  const { themeKey } = useInvoiceTheme();
  const invoiceSheetRef = useRef(null);
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
  const isIgst = bill.gstMode === "IGST";

  const totalItemDiscount = items.reduce(
    (total, item) => total + Number(item.discountAmount || 0) * Number(item.acceptedQuantity || 0),
    0
  );
  const hasDiscount = totalItemDiscount > 0;
  const totalQty = items.reduce(
    (sum, item) => sum + Number((item.acceptedQuantity ?? item.receivedQuantity) || 0),
    0
  );

  const doc = buildPurchaseBillDoc(bill, items, d2wLogo);

  const handlePrint = async () => {
    if (!invoiceSheetRef.current) return;
    await printDisplayedInvoice(invoiceSheetRef.current);
  };

  return (
    <div style={S.detailPage}>
      <header style={S.detailHeader}>
        <div style={S.headerTitleGroup}>
          <button type="button" onClick={onBack} style={S.backButton} aria-label="Back">
            <ArrowLeft size={17} />
          </button>
          <div>
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

      <div style={S.sheetViewport}>
        {/* ── Settings theme: sale / landscape / charcoal ── */}
        {(themeKey === "sale" || themeKey === "landscape" || themeKey === "charcoal") && (
          <SaleDocumentSheet
            className={themeKey === "landscape" ? "invoice-sheet vy-sheet--landscape" : "invoice-sheet"}
            id="invoice-export-sheet"
            sheetRef={invoiceSheetRef}
            doc={{
              ...doc,
              landscape: themeKey === "landscape",
              charcoal: themeKey === "charcoal",
            }}
          />
        )}

        {/* ── Settings theme: navy / soft ── */}
        {(themeKey === "navy" || themeKey === "soft") && (
          <article
            className="invoice-sheet"
            id="invoice-export-sheet"
            ref={invoiceSheetRef}
            data-template={themeKey}
          >
            <table className="invoice-page-container">
              <thead>
                <tr>
                  <td>
                    <header className="invoice-header">
                      <div className="invoice-store-copy">
                        <h1>{bill.vendorName || "Vendor"}</h1>
                        {bill.vendorAddress && <p>{bill.vendorAddress}</p>}
                        {(bill.vendorPhone || bill.vendorEmail) && (
                          <p>
                            {bill.vendorPhone && `Phone: ${bill.vendorPhone}`}
                            {bill.vendorPhone && bill.vendorEmail && "  |  "}
                            {bill.vendorEmail && `Email: ${bill.vendorEmail}`}
                          </p>
                        )}
                        {bill.vendorGstNumber && (
                          <p className="invoice-gstin">
                            <span>GSTIN:</span> {bill.vendorGstNumber}
                          </p>
                        )}
                      </div>
                      <img
                        className="invoice-brand-logo"
                        src={bill.vendorLogoUrl || d2wLogo}
                        alt={bill.vendorName || "Deals2Wheels"}
                      />
                    </header>
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="invoice-titlebox">
                      <h2 className="invoice-title">PURCHASE INVOICE</h2>
                    </div>

                    <section className="invoice-party-grid invoice-party-grid--two">
                      <div className="invoice-party">
                        <h3>BILL TO</h3>
                        <strong className="invoice-customer-name">{bill.storeName || "—"}</strong>
                        {bill.storeAddress && <p>{bill.storeAddress}</p>}
                        {bill.storeGstNumber && <p>GSTIN: {bill.storeGstNumber}</p>}
                      </div>
                      <div className="invoice-meta">
                        <h3>INVOICE DETAILS</h3>
                        <div className="invoice-info-line">
                          <span>Invoice No.</span>
                          <strong>{bill.vendorInvoiceNumber || "—"}</strong>
                        </div>
                        <div className="invoice-info-line">
                          <span>Invoice Date</span>
                          <strong>{formatDate(bill.invoiceDate)}</strong>
                        </div>
                        <div className="invoice-info-line">
                          <span>Due Date</span>
                          <strong>{formatDate(bill.dueDate)}</strong>
                        </div>
                        <div className="invoice-info-line">
                          <span>Status</span>
                          <strong>
                            <span className={`doc-badge doc-badge--${statusTone(bill.status)}`}>
                              {bill.status || "—"}
                            </span>
                          </strong>
                        </div>
                      </div>
                    </section>

                    <section className="invoice-items-wrap">
                      <table className="invoice-items">
                        <thead>
                          <tr>
                            <th>Sl No</th>
                            <th>Item Description</th>
                            <th>Part No</th>
                            <th>HSN</th>
                            <th className="invoice-num">Qty</th>
                            <th className="invoice-num">Rate</th>
                            <th className="invoice-num">MRP</th>
                            {hasDiscount && <th className="invoice-num">Discount</th>}
                            <th className="invoice-num">GST %</th>
                            <th className="invoice-num">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => {
                            const discAmt =
                              Number(item.discountAmount || 0) * Number(item.acceptedQuantity || 0);
                            return (
                              <tr key={item.itemId || index}>
                                <td>{index + 1}</td>
                                <td>
                                  <strong>{item.itemName || "—"}</strong>
                                  {item.brand && (
                                    <small className="invoice-partno">
                                      <span>Brand: {item.brand}</span>
                                    </small>
                                  )}
                                </td>
                                <td className="vy-partno-col">{item.partNumber || "—"}</td>
                                <td>{item.hsnCode || "—"}</td>
                                <td className="invoice-num">
                                  {item.acceptedQuantity ?? item.receivedQuantity}
                                </td>
                                <td className="invoice-num">{formatMoney(item.purchasePrice)}</td>
                                <td className="invoice-num">{formatMoney(item.mrp)}</td>
                                {hasDiscount && (
                                  <td className="invoice-num">
                                    {discAmt > 0 ? (
                                      <>
                                        <span>{formatMoney(discAmt)}</span>
                                        <small className="invoice-sub">
                                          ({Number(item.discountPercentage || 0)}%)
                                        </small>
                                      </>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                )}
                                <td className="invoice-num">
                                  <span>{Number(item.gstPercentage || 0)}%</span>
                                  <small className="invoice-sub">{formatMoney(item.gstAmount)}</small>
                                </td>
                                <td className="invoice-num">
                                  <strong>{formatMoney(computeLineAmount(item))}</strong>
                                </td>
                              </tr>
                            );
                          })}
                          {!items.length && (
                            <tr>
                              <td colSpan={hasDiscount ? 10 : 9} className="invoice-empty">
                                No invoice items found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {items.length > 0 && (
                          <tfoot>
                            <tr>
                              <td></td>
                              <td>Total</td>
                              <td></td>
                              <td></td>
                              <td className="invoice-num">{totalQty}</td>
                              <td></td>
                              <td></td>
                              {hasDiscount && (
                                <td className="invoice-num">{formatMoney(totalItemDiscount)}</td>
                              )}
                              <td className="invoice-num">{formatMoney(bill.totalGstAmount)}</td>
                              <td className="invoice-num">{formatMoney(bill.totalAmount)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                      <div className="invoice-items-count">Total Items: {items.length}</div>
                    </section>

                    <section className="invoice-summary-grid">
                      <div className="invoice-lower-left">
                        {bill.paymentReference && (
                          <div className="invoice-payment-block">
                            <h3>PAYMENT DETAILS</h3>
                            <div className="invoice-payment-row">
                              <span>Reference</span>
                              <strong>{bill.paymentReference}</strong>
                            </div>
                          </div>
                        )}
                        {bill.remarks && (
                          <div className="invoice-words">
                            <h3>NOTES / REMARKS</h3>
                            <p>{bill.remarks}</p>
                          </div>
                        )}
                        {bill.lastEditReason && (
                          <div className="invoice-words">
                            <h3>AUDIT NOTE</h3>
                            <p>
                              Last edited{bill.editedAt ? ` on ${formatDateTime(bill.editedAt)}` : ""}:{" "}
                              {bill.lastEditReason}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="invoice-totals">
                        <h3>PAYMENT SUMMARY</h3>
                        <div className="invoice-total-line">
                          <span>Taxable Amount</span>
                          <strong>{"\u20B9"} {formatMoney(bill.taxableAmount)}</strong>
                        </div>
                        {hasDiscount && (
                          <div className="invoice-total-line">
                            <span>Total Discount</span>
                            <strong>(-) {"\u20B9"} {formatMoney(totalItemDiscount)}</strong>
                          </div>
                        )}
                        {isIgst ? (
                          <div className="invoice-total-line">
                            <span>IGST</span>
                            <strong>{"\u20B9"} {formatMoney(bill.igstAmount)}</strong>
                          </div>
                        ) : (
                          <>
                            <div className="invoice-total-line">
                              <span>CGST</span>
                              <strong>{"\u20B9"} {formatMoney(bill.cgstAmount)}</strong>
                            </div>
                            <div className="invoice-total-line">
                              <span>SGST</span>
                              <strong>{"\u20B9"} {formatMoney(bill.sgstAmount)}</strong>
                            </div>
                          </>
                        )}
                        <div className="invoice-total-line">
                          <span>Total GST</span>
                          <strong>{"\u20B9"} {formatMoney(bill.totalGstAmount)}</strong>
                        </div>
                        {Number(bill.roundOffAmount || 0) !== 0 && (
                          <div className="invoice-total-line">
                            <span>Round Off</span>
                            <strong>{"\u20B9"} {formatMoney(bill.roundOffAmount)}</strong>
                          </div>
                        )}
                        <div className="invoice-grand-total">
                          <span>GRAND TOTAL</span>
                          <strong>{"\u20B9"} {formatMoney(bill.totalAmount)}</strong>
                        </div>
                        <div className="invoice-total-line">
                          <span>Amount Paid</span>
                          <strong>{"\u20B9"} {formatMoney(bill.amountPaid)}</strong>
                        </div>
                        <div className="invoice-total-line is-strong">
                          <span>Balance Due</span>
                          <strong>{"\u20B9"} {formatMoney(bill.balanceDue)}</strong>
                        </div>
                      </div>
                    </section>

                    <footer className="invoice-footer">
                      <div><span>Prepared By</span></div>
                      <div><span>Authorized Signatory</span></div>
                    </footer>
                    <p className="invoice-generated">This is a computer-generated purchase invoice.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </article>
        )}
      </div>
    </div>
  );
}

const COLOR = {
  bg: "#FFFFFF",
  bgMuted: "#F4F4F4",
  border: "#E5E7EB",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  accent: "#2563EB",
};

const S = {
  detailPage: {
    margin: "-24px -28px",
    width: "calc(100% + 56px)",
    minHeight: "100vh",
    background: COLOR.bgMuted,
    boxSizing: "border-box",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
  headerTitle: {
    margin: 0,
    color: COLOR.textPrimary,
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: "-.1px",
    textTransform: "uppercase",
  },
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
  sheetViewport: {
    width: "100%",
    padding: "24px 16px 48px",
    boxSizing: "border-box",
    overflowX: "auto",
  },
};
