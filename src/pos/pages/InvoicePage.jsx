import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiclient from "../../services/apiclient";
import { useCart } from "../context/CartContext";



const COLORS = {
  ink: "#16283B",          // primary text — deep navy-charcoal, not flat black
  inkSoft: "#5B6B79",      // secondary text
  navy: "#15304D",         // brand / table header
  navyDeep: "#0B2038",     // rules, pressed states
  brass: "#A9791F",        // signature accent — used sparingly (seal, total tab)
  brassSoft: "#F6EEDC",    // pale brass tint for highlight fills
  hairline: "#E1E6EA",     // outer borders
  hairlineSoft: "#EDF1F3", // inner table lines
  slateFill: "#F7F9FA",    // quiet panel fill (replaces old solid pale-blue box)
  paper: "#FFFFFF",
  canvas: "#EEF1F4",       // screen-only backdrop
  danger: "#A93131",
  success: "#1E7145",
  warn: "#8A5A00",
};

const FONT_DISPLAY = "'Space Grotesk', 'Segoe UI', sans-serif";
const FONT_BODY = "'Inter', 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'Consolas', monospace";

/* ----------------------------------------------------------------------------
   Formatting helpers (display-only — no math performed here beyond
   presentation formatting of numbers already computed by the backend)
   -------------------------------------------------------------------------- */

// Formats a BigDecimal-as-number into Indian-grouped currency, e.g. 1,23,456.00
const formatINR = (value) => {
  const num = value === null || value === undefined || value === "" ? 0 : Number(value);
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Splits a line item's combined gstAmount into CGST / SGST for display.
// NOTE: InvoiceItemDTO (backend) does not currently expose a per-item
// gstType, so an inter-state (IGST) line can't be distinguished from an
// intra-state (CGST+SGST) line at the row level — only the invoice-level
// totals (invoice.cgstAmount / sgstAmount / igstAmount) carry that split.
// This assumes the standard intra-state CGST+SGST half/half split, which
// mirrors the backend's own calculateGST() logic for GST_xx types. If you
// also do inter-state sales, add gstType (or separate cgstAmount/
// sgstAmount fields) to InvoiceItemDTO so this can be exact per row.
const splitGst = (item) => {
  const gstAmount = Number(item?.gstAmount ?? 0) || 0;
  const half = gstAmount / 2;
  return { cgst: half, sgst: half };
};

const formatPercent = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  // Trim trailing .00 but keep genuine decimals like 2.5
  return `${Number(num.toFixed(2))}%`;
};

const formatDate = (isoString) => {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (isoString) => {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}, ${d.toLocaleTimeString(
    "en-IN",
    { hour: "2-digit", minute: "2-digit" }
  )}`;
};

// Enterprise pattern: the invoice/order header must never claim to know
// "how" an invoice was paid — that fact only exists in the payment ledger,
// because a single invoice can be paid in one shot, in installments, or via
// more than one method (e.g. part cash + part UPI). orders.paymentMethod is
// written once at invoice-creation time (before any money has moved) and is
// never updated afterward, so it is not a trustworthy source for this field.
// This derives the displayed value from the actual payment records instead.
const summarizePaymentMethod = (payments) => {
  if (!payments || payments.length === 0) {
    return "Not yet paid";
  }
  const distinctMethods = [
    ...new Set(
      payments
        .map((p) => p.paymentMethod)
        .filter(Boolean)
    ),
  ];
  if (distinctMethods.length === 0) return "Not yet paid";
  if (distinctMethods.length === 1) return distinctMethods[0].replace(/_/g, " ");
  return distinctMethods.map((m) => m.replace(/_/g, " ")).join(" + ");
};

const orderStatusLabel = (status) => {
  if (!status) return "—";
  return status.replace(/_/g, " ");
};

const orderStatusTone = (status) => {
  switch (status) {
    case "COMPLETED":
    case "PAID":
      return COLORS.success;
    case "PENDING_PAYMENT":
      return COLORS.warn;
    case "CANCELLED":
      return COLORS.danger;
    default:
      return COLORS.brass;
  }
};

// Indian numbering system (lakh/crore) amount-in-words converter.
// Pure presentation utility — converts the backend's totalAmount into words,
// it does not recompute or alter the amount itself.
const NUM_WORDS = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS_WORDS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function threeDigitsToWords(n) {
  let str = "";
  if (n >= 100) {
    str += `${NUM_WORDS[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n >= 20) {
    str += `${TENS_WORDS[Math.floor(n / 10)]} `;
    n %= 10;
  }
  if (n > 0) {
    str += `${NUM_WORDS[n]} `;
  }
  return str.trim();
}

function numberToIndianWords(num) {
  const whole = Math.floor(Math.abs(num));
  if (whole === 0) return "Zero";

  const crore = Math.floor(whole / 10000000);
  const lakh = Math.floor((whole % 10000000) / 100000);
  const thousand = Math.floor((whole % 100000) / 1000);
  const hundred = whole % 1000;

  const parts = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  return parts.join(" ").trim();
}

function amountInWords(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let words = `Rupees ${numberToIndianWords(rupees)} Only`;
  if (paise > 0) {
    words = `Rupees ${numberToIndianWords(rupees)} and ${threeDigitsToWords(paise)} Paise Only`;
  }
  return words;
}

/* ----------------------------------------------------------------------------
   Small presentational atoms
   -------------------------------------------------------------------------- */

const FieldRow = ({ label, value, mono }) => (
  <div style={S.fieldRow}>
    <span style={S.fieldLabel}>{label}</span>
    <span style={{ ...S.fieldValue, ...(mono ? { fontFamily: FONT_MONO } : {}) }}>
      {value ?? "—"}
    </span>
  </div>
);

const SummaryRow = ({ label, value, emphasis, negative, tone }) => (
  <div
    style={{
      ...S.summaryRow,
      ...(emphasis ? S.summaryRowEmphasis : {}),
    }}
  >
    <span style={{ ...S.summaryLabel, ...(emphasis ? { fontWeight: 700, color: COLORS.ink } : {}) }}>{label}</span>
    <span
      style={{
        ...S.summaryValue,
        ...(emphasis ? { fontSize: 19, fontWeight: 700 } : {}),
        ...(tone ? { color: tone } : {}),
      }}
    >
      {negative ? "(-) " : ""}
      {"\u20B9"} {formatINR(value)}
    </span>
  </div>
);

// The signature element of this page: a calibration-seal badge standing in
// for "genuine, verified invoice" — the same instinct an auto-parts buyer
// applies to a hologram sticker on a genuine part, applied to the paperwork.
// Pure decoration built from primitives (no external assets), so it always
// renders identically on screen and in print.
const AuthenticitySeal = () => {
  const ticks = Array.from({ length: 28 }, (_, i) => {
    const angle = (i * 360) / 28;
    return (
      <line
        key={i}
        x1="60"
        y1="8"
        x2="60"
        y2="15"
        stroke={COLORS.brass}
        strokeWidth="1.4"
        transform={`rotate(${angle} 60 60)`}
      />
    );
  });
  return (
    <svg width="86" height="86" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      <circle cx="60" cy="60" r="52" fill={COLORS.brassSoft} stroke={COLORS.brass} strokeWidth="1.5" />
      <circle cx="60" cy="60" r="40" fill="none" stroke={COLORS.brass} strokeWidth="1" strokeDasharray="2 3" />
      {ticks}
      <text
        x="60"
        y="54"
        textAnchor="middle"
        fontFamily={FONT_DISPLAY}
        fontWeight="700"
        fontSize="12.5"
        letterSpacing="1"
        fill={COLORS.navy}
      >
        TAX
      </text>
      <text
        x="60"
        y="70"
        textAnchor="middle"
        fontFamily={FONT_DISPLAY}
        fontWeight="700"
        fontSize="12.5"
        letterSpacing="1"
        fill={COLORS.navy}
      >
        INVOICE
      </text>
    </svg>
  );
};

/* ============================================================================
   Main component
   ============================================================================ */
export default function InvoicePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiclient.get(`/orders/${orderId}`);
      setInvoice(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Could not load this invoice. Please check the order id and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handlePrint = () => window.print();
  const handleNewSale = () => {
    clearCart();
    navigate("/pos");
  };

  if (loading) {
    return (
      <div style={S.stateScreen}>
        <div style={S.stateCard}>Loading invoice…</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={S.stateScreen}>
        <div style={{ ...S.stateCard, color: COLORS.danger }}>
          {error || "Invoice not found."}
        </div>
      </div>
    );
  }

  const items = invoice.items || [];
  const payments = invoice.payments || [];
  const paymentMethodSummary = summarizePaymentMethod(payments);

  return (
    <div style={S.pageBackdrop}>
      {/* Typefaces + print stylesheet */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        @media print {
          .d2w-toolbar { display: none !important; }
          .d2w-backdrop { background: #fff !important; padding: 0 !important; }
          .d2w-sheet { box-shadow: none !important; margin: 0 !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      {/* ===================== TOOLBAR (screen only) ===================== */}
      <div className="d2w-toolbar" style={S.toolbar}>
        <button style={S.btnPrimary} onClick={handleNewSale}>
          + Start New Sale
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={S.btnSecondary} onClick={handlePrint}>
            Print Invoice
          </button>
          <button style={S.btnSecondary} title="Coming soon">
            Download PDF
          </button>
        </div>
      </div>

      {/* ===================== INVOICE SHEET (A4) ===================== */}
      <div className="d2w-sheet" style={S.sheet}>
        {/* ---------- Header ---------- */}
        <div style={S.headerBlock}>
          <div style={S.brandBlock}>
            <div style={S.logoMark}>D2W</div>
            <div>
              <div style={S.brandName}>Deals2Wheels</div>
              <div style={S.brandTagline}>One Stop Solution For All Automobile Needs</div>
              {/* NOTE: store name / address / GSTIN / phone / email / website are
                  franchise-specific fields not yet present on InvoiceResponseDTO.
                  Rendered as placeholders until the backend DTO exposes them —
                  no fabricated store data is shown. */}
              <div style={S.storeMeta}>
                <div>Store: —</div>
                <div>GSTIN: —</div>
              </div>
            </div>
          </div>

          <div style={S.invoiceBadgeBlock}>
            <AuthenticitySeal />
            <div style={{ marginTop: 10 }}>
              <div style={S.invoiceNumberLine}>
                <span style={S.fieldLabel}>Invoice No.</span>
                <span style={S.invoiceNumberValue}>{invoice.invoiceNumber || "—"}</span>
              </div>
              <div style={S.invoiceNumberLine}>
                <span style={S.fieldLabel}>Order ID</span>
                <span style={{ fontFamily: FONT_MONO, color: COLORS.ink }}>#{invoice.orderId ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={S.hairlineDouble}>
          <div style={S.hairlineMain} />
          <div style={S.hairlineAccent} />
        </div>

        {/* ---------- Invoice + Customer details ---------- */}
        <div style={S.detailsGrid}>
          <div style={S.detailsCol}>
            <div style={S.sectionLabel}>Invoice Details</div>
            <FieldRow label="Invoice Date" value={formatDate(invoice.orderDate)} />
            <FieldRow label="Order Date" value={formatDateTime(invoice.orderDate)} />
            <FieldRow label="Payment Method" value={paymentMethodSummary} />
            <FieldRow
              label="Order Status"
              value={
                <span
                  style={{
                    ...S.statusPill,
                    color: orderStatusTone(invoice.orderStatus),
                    borderColor: orderStatusTone(invoice.orderStatus),
                    background: `${orderStatusTone(invoice.orderStatus)}12`,
                  }}
                >
                  {orderStatusLabel(invoice.orderStatus)}
                </span>
              }
            />
          </div>

          <div style={S.detailsDivider} />

          <div style={S.detailsCol}>
            <div style={S.sectionLabel}>Bill To</div>
            <FieldRow label="Customer Name" value={invoice.customerName} />
            <FieldRow label="Mobile Number" value={invoice.phone} mono />
            <FieldRow label="Address" value={invoice.customerAddress} />
            <FieldRow label="GSTIN" value="—" />
          </div>
        </div>

        {/* ---------- Product Table ---------- */}
        <div style={S.sectionLabel}>Items</div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: "26%", textAlign: "left" }}>Item Name</th>
              <th style={{ ...S.th, width: "6%" }}>Qty</th>
              <th style={{ ...S.th, width: "10%" }}>MRP</th>
              <th style={{ ...S.th, width: "10%" }}>Disc</th>
              <th style={{ ...S.th, width: "13%" }}>Taxable Amt</th>
              <th style={{ ...S.th, width: "10%" }}>CGST</th>
              <th style={{ ...S.th, width: "10%" }}>SGST</th>
              <th style={{ ...S.th, width: "15%", ...S.thAccent }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td style={S.tdEmpty} colSpan={8}>
                  No items on this invoice.
                </td>
              </tr>
            )}
            {items.map((item, idx) => {
              const hasDiscount = Number(item.discountAmount) > 0;
              const { cgst, sgst } = splitGst(item);
              return (
                <tr key={item.batchId ? `${item.batchId}-${idx}` : idx} style={idx % 2 === 1 ? S.trBand : undefined}>
                  <td style={S.tdLeft}>
                    <div style={{ fontWeight: 600, color: COLORS.ink }}>{item.itemName || item.productName || "—"}</div>
                    <div style={{ fontSize: 10, color: COLORS.inkSoft, fontFamily: FONT_MONO, marginTop: 2 }}>
                      HSN: {item.hsncode || "—"}
                    </div>
                    <div style={{ fontSize: 10, color: COLORS.inkSoft, fontFamily: FONT_MONO }}>
                      Part No: {item.partNumber || "—"}
                    </div>
                  </td>
                  <td style={S.tdCenter}>{item.quantity ?? "—"}</td>
                  <td style={S.tdNum}>{formatINR(item.mrp)}</td>
                  <td style={S.tdNum}>{hasDiscount ? formatPercent(item.discountPercentage) : "—"}</td>
                  <td style={S.tdNum}>{formatINR(item.taxableAmount)}</td>
                  <td style={S.tdNum}>{formatINR(cgst)}</td>
                  <td style={S.tdNum}>{formatINR(sgst)}</td>
                  <td style={{ ...S.tdNum, fontWeight: 700, color: COLORS.ink, background: COLORS.brassSoft }}>
                    {formatINR(item.totalPrice)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ---------- Payment History ---------- */}
        {payments.length > 0 && (
          <>
            <div style={{ ...S.sectionLabel, marginTop: 24 }}>Payment History</div>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: "18%" }}>Date</th>
                  <th style={{ ...S.th, width: "16%" }}>Payment Method</th>
                  <th style={{ ...S.th, width: "20%" }}>Transaction No.</th>
                  <th style={{ ...S.th, width: "16%" }}>Collected By</th>
                  <th style={{ ...S.th, width: "18%", textAlign: "left" }}>Remarks</th>
                  <th style={{ ...S.th, width: "12%" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => (
                  <tr key={p.id ?? idx} style={idx % 2 === 1 ? S.trBand : undefined}>
                    <td style={{ ...S.tdCenter, fontFamily: FONT_MONO }}>{formatDateTime(p.paymentDate)}</td>
                    <td style={S.tdCenter}>{p.paymentMethod || "—"}</td>
                    <td style={{ ...S.tdCenter, fontFamily: FONT_MONO }}>{p.transactionNumber || "—"}</td>
                    <td style={S.tdCenter}>{p.collectedBy || "—"}</td>
                    <td style={S.tdLeft}>{p.remarks || "—"}</td>
                    <td style={{ ...S.tdNum, fontWeight: 600, color: COLORS.ink }}>{formatINR(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ---------- Financial Summary + Amount in Words ---------- */}
        <div style={S.summaryGrid}>
          <div style={S.wordsBlock}>
            <div style={S.sectionLabel}>Amount In Words</div>
            <div style={S.wordsText}>{amountInWords(invoice.totalAmount)}</div>

            <div style={{ ...S.sectionLabel, marginTop: 28 }}>Terms &amp; Conditions</div>
            <ul style={S.termsList}>
              <li>Warranty as per manufacturer / brand policy only; D2W does not extend a separate warranty.</li>
              <li>Goods once sold cannot be returned or exchanged.</li>
              <li>Any dispute is subject to the jurisdiction of the store's registered local courts only.</li>
              <li>This is a computer-generated invoice and does not require a physical signature to be valid.</li>
            </ul>
          </div>

          <div style={S.ledgerBlock}>
            <SummaryRow label="Gross Amount" value={invoice.grossAmount} />
            {Number(invoice.itemDiscountAmount) > 0 && (
              <SummaryRow label="Item Discount" value={invoice.itemDiscountAmount} negative />
            )}
            {Number(invoice.billDiscountAmount) > 0 && (
              <SummaryRow
                label={`Bill Discount ${
                  invoice.billDiscountPercentage != null ? `(${formatPercent(invoice.billDiscountPercentage)})` : ""
                }`}
                value={invoice.billDiscountAmount}
                negative
              />
            )}
            <SummaryRow label="Taxable Amount" value={invoice.taxableAmount} />
            <SummaryRow label="CGST" value={invoice.cgstAmount} />
            <SummaryRow label="SGST" value={invoice.sgstAmount} />
            <SummaryRow label="IGST" value={invoice.igstAmount} />
            <SummaryRow label="Round Off" value={invoice.roundOffAmount} />

            <div style={S.ledgerDivider} />

            <div style={S.grandTotalTab}>
              <SummaryRow label="Grand Total" value={invoice.totalAmount} emphasis />
            </div>
            <SummaryRow label="Paid Amount" value={invoice.paidAmount} tone={COLORS.success} />
            <SummaryRow
              label="Balance Due"
              value={invoice.balanceAmount}
              tone={Number(invoice.balanceAmount) > 0 ? COLORS.danger : COLORS.success}
              emphasis
            />
          </div>
        </div>

        {/* ---------- Signatures ---------- */}
        <div style={S.signatureRow}>
          <div style={S.signatureBox}>
            <div style={S.signatureLine} />
            <div style={S.signatureLabel}>Customer Signature</div>
          </div>
          <div style={S.signatureBox}>
            <div style={S.signatureLine} />
            <div style={S.signatureLabel}>Authorised Signatory — Deals2Wheels</div>
          </div>
        </div>

        <div style={S.footerNote}>This is a computer-generated invoice.</div>
      </div>
    </div>
  );
}

/* ============================================================================
   Inline style objects
   ============================================================================ */
const S = {
  pageBackdrop: {
    fontFamily: FONT_BODY,
    background: COLORS.canvas,
    minHeight: "100vh",
    padding: "28px 0 60px",
    color: COLORS.ink,
  },
  toolbar: {
    maxWidth: 960,
    margin: "0 auto 18px",
    padding: "0 4px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btnPrimary: {
    background: COLORS.navy,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "11px 20px",
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(11,32,56,0.18)",
  },
  btnSecondary: {
    background: "#fff",
    color: COLORS.navy,
    border: `1px solid ${COLORS.hairline}`,
    borderRadius: 6,
    padding: "11px 20px",
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  sheet: {
    width: "210mm",
    minHeight: "297mm",
    margin: "0 auto",
    background: COLORS.paper,
    boxShadow: "0 4px 24px rgba(21,48,77,0.10)",
    borderRadius: 8,
    padding: "17mm 15mm",
    boxSizing: "border-box",
  },
  headerBlock: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
  },
  brandBlock: { display: "flex", gap: 14, alignItems: "flex-start" },
  logoMark: {
    width: 50,
    height: 50,
    borderRadius: 8,
    background: COLORS.navy,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT_DISPLAY,
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  brandName: {
    fontFamily: FONT_DISPLAY,
    fontSize: 23,
    fontWeight: 700,
    letterSpacing: 0.2,
    color: COLORS.navy,
    lineHeight: 1.15,
  },
  brandTagline: {
    fontSize: 11.5,
    color: COLORS.inkSoft,
    marginTop: 3,
  },
  storeMeta: {
    marginTop: 9,
    fontSize: 11,
    color: COLORS.inkSoft,
    display: "flex",
    gap: 14,
  },
  invoiceBadgeBlock: { textAlign: "right", minWidth: 210, display: "flex", flexDirection: "column", alignItems: "flex-end" },
  invoiceNumberLine: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    fontSize: 12.5,
    marginTop: 3,
  },
  invoiceNumberValue: { fontFamily: FONT_MONO, fontWeight: 600, color: COLORS.ink },
  hairlineDouble: { margin: "18px 0 20px" },
  hairlineMain: { height: 2, background: COLORS.navy },
  hairlineAccent: { height: 1, background: COLORS.brass, marginTop: 3, width: "100%" },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: 24,
    marginBottom: 24,
    padding: "4px 2px 18px",
  },
  detailsCol: {},
  detailsDivider: { width: 1, background: COLORS.hairline },
  sectionLabel: {
    fontFamily: FONT_DISPLAY,
    fontSize: 11.5,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: COLORS.navy,
    fontWeight: 600,
    marginBottom: 10,
    position: "relative",
    paddingBottom: 6,
  },
  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 12.5,
    padding: "4px 0",
  },
  fieldLabel: { color: COLORS.inkSoft },
  fieldValue: { color: COLORS.ink, fontWeight: 500, textAlign: "right" },
  statusPill: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 0.6,
    border: "1px solid",
    borderRadius: 20,
    padding: "2px 10px",
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 11,
    tableLayout: "fixed",
  },
  th: {
    background: COLORS.navy,
    color: "#fff",
    fontFamily: FONT_BODY,
    fontWeight: 600,
    fontSize: 10.5,
    textAlign: "center",
    padding: "8px 4px",
    border: `1px solid ${COLORS.navyDeep}`,
  },
  thAccent: {
    boxShadow: `inset 0 -3px 0 ${COLORS.brass}`,
  },
  trBand: { background: COLORS.slateFill },
  tdCenter: {
    textAlign: "center",
    padding: "7px 4px",
    border: `1px solid ${COLORS.hairlineSoft}`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: COLORS.inkSoft,
  },
  tdLeft: {
    textAlign: "left",
    padding: "7px 6px",
    border: `1px solid ${COLORS.hairlineSoft}`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tdNum: {
    textAlign: "right",
    padding: "7px 6px",
    border: `1px solid ${COLORS.hairlineSoft}`,
    fontFamily: FONT_MONO,
    whiteSpace: "nowrap",
    color: COLORS.ink,
  },
  tdEmpty: {
    textAlign: "center",
    padding: "20px 4px",
    border: `1px solid ${COLORS.hairlineSoft}`,
    color: COLORS.inkSoft,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 0.85fr",
    gap: 28,
    marginTop: 26,
    alignItems: "start",
  },
  wordsBlock: {},
  wordsText: {
    fontSize: 12.5,
    fontWeight: 600,
    color: COLORS.ink,
    background: COLORS.slateFill,
    borderLeft: `3px solid ${COLORS.brass}`,
    borderRadius: 4,
    padding: "11px 14px",
  },
  termsList: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 10.5,
    color: COLORS.inkSoft,
    lineHeight: 1.7,
  },
  ledgerBlock: {
    border: `1px solid ${COLORS.hairline}`,
    borderRadius: 8,
    padding: "16px 18px",
    background: "#fff",
    boxShadow: "0 1px 6px rgba(21,48,77,0.05)",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12.5,
    padding: "4px 0",
  },
  summaryRowEmphasis: { padding: "2px 0" },
  summaryLabel: { color: COLORS.inkSoft },
  summaryValue: { fontFamily: FONT_MONO, color: COLORS.ink },
  ledgerDivider: { height: 1, background: COLORS.hairline, margin: "9px 0" },
  grandTotalTab: {
    background: COLORS.brassSoft,
    borderRadius: 6,
    padding: "6px 10px",
    margin: "2px 0 8px",
  },
  signatureRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 64,
    padding: "0 20px",
  },
  signatureBox: { width: 220, textAlign: "center" },
  signatureLine: { borderTop: `1px solid ${COLORS.ink}`, marginBottom: 6 },
  signatureLabel: { fontSize: 11, color: COLORS.inkSoft },
  footerNote: {
    textAlign: "center",
    fontSize: 10.5,
    color: COLORS.inkSoft,
    marginTop: 32,
    fontStyle: "italic",
  },
  stateScreen: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: COLORS.canvas,
    fontFamily: FONT_BODY,
  },
  stateCard: {
    background: "#fff",
    padding: "24px 32px",
    borderRadius: 8,
    border: `1px solid ${COLORS.hairline}`,
    fontSize: 14,
  },
};
