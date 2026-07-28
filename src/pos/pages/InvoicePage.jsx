import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiclient from "../../services/apiclient";


const COLORS = {
  ink: "#152B3D",          // primary text
  inkSoft: "#4B5D6B",      // secondary text
  steel: "#1B3A5C",        // primary brand blue (header, buttons)
  steelDeep: "#0F2740",    // pressed/hover state
  accent: "#2E6DA4",       // mid blue accent (rules, badges)
  accentSoft: "#E7EEF5",   // pale blue fills (row bands, boxes)
  line: "#D3DCE3",         // hairline borders
  lineSoft: "#E7ECEF",     // faint borders inside tables
  paper: "#FFFFFF",
  canvas: "#EEF1F4",       // screen-only page backdrop
  danger: "#A22B2B",       // balance due
  success: "#1E6B45",      // paid / success
  warn: "#8A5A00",
};

const FONT_DISPLAY = "'Oswald', 'Arial Narrow', sans-serif";
const FONT_BODY = "'Inter', 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_MONO = "'Roboto Mono', 'Consolas', monospace";

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
      return COLORS.accent;
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
    <span style={{ ...S.summaryLabel, ...(emphasis ? { fontWeight: 700 } : {}) }}>{label}</span>
    <span
      style={{
        ...S.summaryValue,
        ...(emphasis ? { fontSize: 18, fontWeight: 700 } : {}),
        ...(tone ? { color: tone } : {}),
      }}
    >
      {negative ? "(-) " : ""}
      {"\u20B9"} {formatINR(value)}
    </span>
  </div>
);

/* ============================================================================
   Main component
   ============================================================================ */
export default function InvoicePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

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
  const handleNewSale = () => navigate("/pos");

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

  return (
    <div style={S.pageBackdrop}>
      {/* Print stylesheet: hides toolbar, strips shadows/backdrop for A4 print */}
      <style>{`
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
            <div style={S.invoiceBadge}>TAX INVOICE</div>
            <div style={S.invoiceNumberLine}>
              <span style={S.fieldLabel}>Invoice No.</span>
              <span style={S.invoiceNumberValue}>{invoice.invoiceNumber || "—"}</span>
            </div>
            <div style={S.invoiceNumberLine}>
              <span style={S.fieldLabel}>Order ID</span>
              <span style={{ fontFamily: FONT_MONO }}>#{invoice.orderId ?? "—"}</span>
            </div>
          </div>
        </div>

        <div style={S.hairline} />

        {/* ---------- Invoice + Customer details ---------- */}
        <div style={S.detailsGrid}>
          <div style={S.detailsCol}>
            <div style={S.sectionLabel}>Invoice Details</div>
            <FieldRow label="Invoice Date" value={formatDate(invoice.orderDate)} />
            <FieldRow label="Order Date" value={formatDateTime(invoice.orderDate)} />
            <FieldRow label="Payment Method" value={invoice.paymentMethod} />
            <FieldRow
              label="Order Status"
              value={
                <span
                  style={{
                    ...S.statusPill,
                    color: orderStatusTone(invoice.orderStatus),
                    borderColor: orderStatusTone(invoice.orderStatus),
                  }}
                >
                  {orderStatusLabel(invoice.orderStatus)}
                </span>
              }
            />
          </div>

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
              <th style={{ ...S.th, width: "3%" }}>#</th>
              <th style={{ ...S.th, width: "9%" }}>Part No.</th>
              <th style={{ ...S.th, width: "8%" }}>Brand</th>
              <th style={{ ...S.th, width: "14%", textAlign: "left" }}>Item Name</th>
              <th style={{ ...S.th, width: "6%" }}>HSN</th>
              <th style={{ ...S.th, width: "8%" }}>Batch No.</th>
              <th style={{ ...S.th, width: "5%" }}>Qty</th>
              <th style={{ ...S.th, width: "7%" }}>MRP</th>
              <th style={{ ...S.th, width: "7%" }}>Selling Price</th>
              <th style={{ ...S.th, width: "7%" }}>Gross Amt</th>
              <th style={{ ...S.th, width: "5%" }}>Disc %</th>
              <th style={{ ...S.th, width: "7%" }}>Disc Amt</th>
              <th style={{ ...S.th, width: "7%" }}>Taxable Amt</th>
              <th style={{ ...S.th, width: "5%" }}>GST %</th>
              <th style={{ ...S.th, width: "7%" }}>GST Amt</th>
              <th style={{ ...S.th, width: "8%" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td style={S.tdEmpty} colSpan={16}>
                  No items on this invoice.
                </td>
              </tr>
            )}
            {items.map((item, idx) => (
              <tr key={item.batchId ? `${item.batchId}-${idx}` : idx} style={idx % 2 === 1 ? S.trBand : undefined}>
                <td style={S.tdCenter}>{idx + 1}</td>
                <td style={{ ...S.tdCenter, fontFamily: FONT_MONO }}>{item.partNumber || "—"}</td>
                <td style={S.tdCenter}>{item.brandName || "—"}</td>
                <td style={S.tdLeft}>{item.itemName || item.productName || "—"}</td>
                <td style={{ ...S.tdCenter, fontFamily: FONT_MONO }}>{item.hsncode || "—"}</td>
                <td style={{ ...S.tdCenter, fontFamily: FONT_MONO }}>{item.batchNumber || "—"}</td>
                <td style={S.tdCenter}>{item.quantity ?? "—"}</td>
                <td style={S.tdNum}>{formatINR(item.mrp)}</td>
                <td style={S.tdNum}>{formatINR(item.sellingPrice)}</td>
                <td style={S.tdNum}>{formatINR(item.grossAmount)}</td>
                <td style={S.tdNum}>{formatPercent(item.discountPercentage)}</td>
                <td style={S.tdNum}>{formatINR(item.discountAmount)}</td>
                <td style={S.tdNum}>{formatINR(item.taxableAmount)}</td>
                <td style={S.tdNum}>{formatPercent(item.gstPercentage)}</td>
                <td style={S.tdNum}>{formatINR(item.gstAmount)}</td>
                <td style={{ ...S.tdNum, fontWeight: 600 }}>{formatINR(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ---------- Payment History ---------- */}
        {payments.length > 0 && (
          <>
            <div style={{ ...S.sectionLabel, marginTop: 22 }}>Payment History</div>
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
                    <td style={{ ...S.tdNum, fontWeight: 600 }}>{formatINR(p.amount)}</td>
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

            <div style={{ ...S.sectionLabel, marginTop: 26 }}>Terms &amp; Conditions</div>
            <ul style={S.termsList}>
              <li>Warranty as per manufacturer / brand policy only; D2W does not extend a separate warranty.</li>
              <li>Goods once sold cannot be returned or exchanged.</li>
              <li>Any dispute is subject to the jurisdiction of the store's registered local courts only.</li>
              <li>This is a computer-generated invoice and does not require a physical signature to be valid.</li>
            </ul>
          </div>

          <div style={S.ledgerBlock}>
            <SummaryRow label="Gross Amount" value={invoice.grossAmount} />
            <SummaryRow label="Item Discount" value={invoice.itemDiscountAmount} negative />
            <SummaryRow label="Subtotal" value={invoice.subTotal} />
            <SummaryRow
              label={`Bill Discount ${
                invoice.billDiscountPercentage != null ? `(${formatPercent(invoice.billDiscountPercentage)})` : ""
              }`}
              value={invoice.billDiscountAmount}
              negative
            />
            <SummaryRow label="Taxable Amount" value={invoice.taxableAmount} />
            <SummaryRow label="CGST" value={invoice.cgstAmount} />
            <SummaryRow label="SGST" value={invoice.sgstAmount} />
            <SummaryRow label="IGST" value={invoice.igstAmount} />
            <SummaryRow label="Round Off" value={invoice.roundOffAmount} />

            <div style={S.ledgerDivider} />

            <SummaryRow label="Grand Total" value={invoice.totalAmount} emphasis />
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
    padding: "24px 0 60px",
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
    background: COLORS.steel,
    color: "#fff",
    border: "none",
    borderRadius: 4,
    padding: "10px 18px",
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    background: "#fff",
    color: COLORS.steel,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 4,
    padding: "10px 18px",
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
    boxShadow: "0 2px 14px rgba(21,43,61,0.12)",
    padding: "16mm 14mm",
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
    width: 52,
    height: 52,
    borderRadius: 6,
    background: COLORS.steel,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT_DISPLAY,
    fontWeight: 600,
    fontSize: 18,
    letterSpacing: 1,
    flexShrink: 0,
  },
  brandName: {
    fontFamily: FONT_DISPLAY,
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: COLORS.steel,
    lineHeight: 1.1,
  },
  brandTagline: {
    fontSize: 11.5,
    color: COLORS.inkSoft,
    marginTop: 3,
    fontStyle: "italic",
  },
  storeMeta: {
    marginTop: 8,
    fontSize: 11,
    color: COLORS.inkSoft,
    display: "flex",
    gap: 14,
  },
  invoiceBadgeBlock: { textAlign: "right", minWidth: 210 },
  invoiceBadge: {
    display: "inline-block",
    fontFamily: FONT_DISPLAY,
    fontSize: 15,
    letterSpacing: 2,
    color: "#fff",
    background: COLORS.steel,
    padding: "6px 14px",
    borderRadius: 3,
    marginBottom: 10,
  },
  invoiceNumberLine: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    fontSize: 12.5,
    marginTop: 4,
  },
  invoiceNumberValue: { fontFamily: FONT_MONO, fontWeight: 600, color: COLORS.ink },
  hairline: { height: 2, background: COLORS.steel, margin: "16px 0 18px" },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 28,
    marginBottom: 22,
    background: COLORS.accentSoft,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 4,
    padding: "14px 18px",
  },
  detailsCol: {},
  sectionLabel: {
    fontFamily: FONT_DISPLAY,
    fontSize: 12.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: COLORS.accent,
    borderBottom: `1px solid ${COLORS.line}`,
    paddingBottom: 5,
    marginBottom: 8,
  },
  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 12.5,
    padding: "3px 0",
  },
  fieldLabel: { color: COLORS.inkSoft },
  fieldValue: { color: COLORS.ink, fontWeight: 500, textAlign: "right" },
  statusPill: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    border: "1px solid",
    borderRadius: 3,
    padding: "1px 8px",
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 11,
    tableLayout: "fixed",
  },
  th: {
    background: COLORS.steel,
    color: "#fff",
    fontFamily: FONT_BODY,
    fontWeight: 600,
    fontSize: 10.5,
    textAlign: "center",
    padding: "7px 4px",
    border: `1px solid ${COLORS.steelDeep}`,
  },
  trBand: { background: COLORS.accentSoft },
  tdCenter: {
    textAlign: "center",
    padding: "6px 4px",
    border: `1px solid ${COLORS.lineSoft}`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tdLeft: {
    textAlign: "left",
    padding: "6px 4px",
    border: `1px solid ${COLORS.lineSoft}`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tdNum: {
    textAlign: "right",
    padding: "6px 6px",
    border: `1px solid ${COLORS.lineSoft}`,
    fontFamily: FONT_MONO,
    whiteSpace: "nowrap",
  },
  tdEmpty: {
    textAlign: "center",
    padding: "18px 4px",
    border: `1px solid ${COLORS.lineSoft}`,
    color: COLORS.inkSoft,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 0.85fr",
    gap: 26,
    marginTop: 24,
    alignItems: "start",
  },
  wordsBlock: {},
  wordsText: {
    fontSize: 12.5,
    fontWeight: 600,
    color: COLORS.ink,
    background: COLORS.accentSoft,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 4,
    padding: "10px 12px",
  },
  termsList: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 10.5,
    color: COLORS.inkSoft,
    lineHeight: 1.6,
  },
  ledgerBlock: {
    border: `1px solid ${COLORS.line}`,
    borderRadius: 4,
    padding: "14px 16px",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12.5,
    padding: "4px 0",
  },
  summaryRowEmphasis: { padding: "8px 0" },
  summaryLabel: { color: COLORS.inkSoft },
  summaryValue: { fontFamily: FONT_MONO, color: COLORS.ink },
  ledgerDivider: { height: 1, background: COLORS.line, margin: "8px 0" },
  signatureRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 60,
    padding: "0 20px",
  },
  signatureBox: { width: 220, textAlign: "center" },
  signatureLine: { borderTop: `1px solid ${COLORS.ink}`, marginBottom: 6 },
  signatureLabel: { fontSize: 11, color: COLORS.inkSoft },
  footerNote: {
    textAlign: "center",
    fontSize: 10.5,
    color: COLORS.inkSoft,
    marginTop: 30,
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
    borderRadius: 6,
    border: `1px solid ${COLORS.line}`,
    fontSize: 14,
  },
};
