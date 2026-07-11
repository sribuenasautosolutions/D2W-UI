import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getInvoice } from "../../services/orderService";

// ─── Utility helpers ────────────────────────────────────────────────────────

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(num);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty",
  "Sixty", "Seventy", "Eighty", "Ninety",
];

function numToWords(n) {
  n = Math.round(n);
  if (n === 0) return "Zero";
  if (n < 0) return "Minus " + numToWords(-n);
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  if (n < 1000)
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numToWords(n % 100) : "");
  if (n < 100000)
    return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numToWords(n % 1000) : "");
  if (n < 10000000)
    return numToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + numToWords(n % 100000) : "");
  return numToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + numToWords(n % 10000000) : "");
}

const amountInWords = (amount) => {
  const num = parseFloat(amount) || 0;
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let words = "Rupees " + numToWords(rupees);
  if (paise > 0) words += " and " + numToWords(paise) + " Paise";
  return words + " Only";
};

const statusColor = (status) => {
  const s = (status || "").toUpperCase();
  if (s === "PAID") return { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" };
  if (s === "PARTIAL" || s === "PARTIALLY_PAID") return { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" };
  if (s === "CANCELLED") return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
  return { bg: "#eff6ff", color: "#1e40af", border: "#93c5fd" };
};

// ─── Print Styles ────────────────────────────────────────────────────────────

const PRINT_CSS = `
  @page {
    size: A4;
    margin: 12mm 14mm;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .invoice-shell {
      box-shadow: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      max-width: 100% !important;
    }
    .page-wrap { background: #fff !important; padding: 0 !important; }
  }
`;

// ─── Sub-components ──────────────────────────────────────────────────────────

const Divider = ({ style }) => (
  <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0", ...style }} />
);

const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: "10px",
    paddingBottom: "6px",
    borderBottom: "2px solid #1e3a5f",
    display: "inline-block",
  }}>
    {children}
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

export default function InvoicePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getInvoice(orderId)
      .then((data) => { if (!cancelled) { setInvoice(data); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err?.message || "Failed to load invoice."); setLoading(false); } });
    return () => { cancelled = true; };
  }, [orderId]);

  // ── Loading ──
  if (loading) return (
    <div style={styles.centeredScreen}>
      <style>{PRINT_CSS}</style>
      <div style={styles.spinnerWrap}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading Invoice…</p>
      </div>
    </div>
  );

  // ── Error ──
  if (error) return (
    <div style={styles.centeredScreen}>
      <style>{PRINT_CSS}</style>
      <div style={styles.errorCard}>
        <div style={styles.errorIcon}>⚠</div>
        <h2 style={styles.errorHeading}>Unable to Load Invoice</h2>
        <p style={styles.errorMsg}>{error}</p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button style={styles.btnSecondary} onClick={() => navigate(-1)}>← Back</button>
          <button style={styles.btnPrimary} onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    </div>
  );

  const inv = invoice;
  const sc = statusColor(inv.orderStatus);

  // ── Invoice ──
  return (
    <div style={styles.pageWrap} className="page-wrap">
      <style>{PRINT_CSS}</style>
      <style>{SPINNER_KEYFRAMES}</style>

      {/* ── Toolbar ── */}
      <div style={styles.toolbar} className="no-print">
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button style={styles.btnSecondary} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <button style={styles.btnOutline} onClick={() => navigate("/sales/new")}>
            + New Sale
          </button>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button style={styles.btnOutline} onClick={() => alert("PDF download coming soon.")}>
            ⬇ Download PDF
          </button>
          <button style={styles.btnPrimary} onClick={() => window.print()}>
            🖨 Print Invoice
          </button>
        </div>
      </div>

      {/* ── Invoice Shell ── */}
      <div style={styles.shell} className="invoice-shell">

        {/* 1 ── Company Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.companyLogo}>
              <span style={styles.logoMark}>⚙</span>
            </div>
            <div>
              <div style={styles.companyName}>Delas2Wheels</div>
              <div style={styles.companyTagline}>Authorised Automobile Dealer</div>
              <div style={styles.companyMeta}>
               adress
              </div>
              <div style={styles.companyMeta}>
                GST: 36AABCA1234F1ZV &nbsp;|&nbsp; PAN: AABCA1234F &nbsp;|&nbsp;
                Ph: +91 40 2222 3333 &nbsp;|&nbsp; sales@autodrivemotors.in
              </div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.invoiceBadge}>TAX INVOICE</div>
          </div>
        </div>

        <Divider style={{ borderTopWidth: "2px", borderTopColor: "#1e3a5f" }} />

        {/* 2 ── Invoice Details + Customer Details */}
        <div style={styles.twoCol}>

          {/* Invoice Meta */}
          <div style={styles.metaBlock}>
            <SectionTitle>Invoice Details</SectionTitle>
            <table style={styles.metaTable}>
              <tbody>
                <MetaRow label="Invoice No." value={inv.invoiceNumber} highlight />
                <MetaRow label="Order ID" value={`#${inv.orderId}`} />
                <MetaRow label="Order Date" value={formatDate(inv.orderDate)} />
                <MetaRow label="Status">
                  <span style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: sc.bg,
                    color: sc.color,
                    border: `1px solid ${sc.border}`,
                  }}>
                    {inv.orderStatus}
                  </span>
                </MetaRow>
              </tbody>
            </table>
          </div>

          {/* 3 ── Customer Details */}
          <div style={styles.metaBlock}>
            <SectionTitle>Bill To</SectionTitle>
            <div style={styles.customerName}>{inv.customerName}</div>
            <div style={styles.customerDetail}>{inv.customerAddress}</div>
            <div style={styles.customerDetail}>📞 {inv.phone}</div>
          </div>
        </div>

        <Divider />

        {/* 4 ── Product Table */}
        <div style={styles.section}>
          <SectionTitle>Items</SectionTitle>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["#", "Part No.", "Brand", "Item Description", "HSN", "Qty",
                    "MRP", "Disc %", "GST %", "Total"].map((h, i) => (
                    <th key={i} style={{ ...styles.th, textAlign: i >= 5 ? "right" : "left" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(inv.items || []).map((item, idx) => (
                  <tr key={idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={{ ...styles.td, fontFamily: "'Courier New', monospace", fontSize: "11px" }}>
                      {item.partNumber}
                    </td>
                    <td style={styles.td}>{item.brandName}</td>
                    <td style={{ ...styles.td, fontWeight: 500 }}>{item.itemName}</td>
                    <td style={styles.td}>{item.hsncode}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>{item.quantity}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>{formatCurrency(item.mrp)}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>{item.discountPercentage}%</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>{item.gstPercentage}%</td>
                    <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Divider />

        {/* 5 + 7 ── Payment Summary & Grand Total */}
        <div style={styles.summaryRow}>

          {/* 6 ── Payment History */}
          <div style={styles.payHistSection}>
            <SectionTitle>Payment History</SectionTitle>
            {(inv.payments || []).length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "12px" }}>No payments recorded.</p>
            ) : (
              <table style={{ ...styles.table, fontSize: "12px" }}>
                <thead>
                  <tr>
                    {["Date", "Method", "Txn Ref", "Remarks", "Amount"].map((h, i) => (
                      <th key={i} style={{ ...styles.th, fontSize: "10px", textAlign: i === 4 ? "right" : "left" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inv.payments.map((p, idx) => (
                    <tr key={p.id || idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{formatDate(p.paymentDate)}</td>
                      <td style={styles.td}>{p.paymentMethod}</td>
                      <td style={{ ...styles.td, fontFamily: "'Courier New', monospace", fontSize: "10px" }}>
                        {p.transactionNumber || "—"}
                      </td>
                      <td style={styles.td}>{p.remarks || "—"}</td>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals box */}
          <div style={styles.totalsBox}>
            <SectionTitle>Payment Summary</SectionTitle>
            <TotalRow label="Total Amount" value={formatCurrency(inv.totalAmount)} />
            <TotalRow label="Amount Paid" value={formatCurrency(inv.paidAmount)} positive />
            <Divider style={{ margin: "8px 0" }} />
            <TotalRow
              label="Balance Due"
              value={formatCurrency(inv.balanceAmount)}
              accent={parseFloat(inv.balanceAmount) > 0}
              large
            />
          </div>
        </div>

        <Divider />

        {/* 8 ── Amount in Words */}
        <div style={styles.section}>
          <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>
            Total Amount (in words):&nbsp;
          </span>
          <span style={{ fontSize: "12px", fontStyle: "italic", color: "#1e3a5f", fontWeight: 600 }}>
            {amountInWords(inv.totalAmount)}
          </span>
        </div>

        <Divider />

        {/* 9 ── Terms & Conditions */}
        <div style={styles.termsRow}>
          <div style={styles.termsBlock}>
            <SectionTitle>Terms &amp; Conditions</SectionTitle>
            <ol style={styles.termsList}>
              <li>Goods once sold will not be taken back or exchanged.</li>
              <li>All disputes are subject to Hyderabad jurisdiction only.</li>
              <li>Payment should be made as per the agreed terms.</li>
              <li>Warranty as per manufacturer's policy. Please retain this invoice.</li>
              <li>E. &amp; O.E. — Errors and Omissions Excepted.</li>
            </ol>
          </div>

          {/* 10 ── Authorized Signature */}
          <div style={styles.signatureBlock}>
            <div style={styles.signatureArea}>
              <div style={styles.signatureLine} />
            </div>
            <div style={styles.signatureLabel}>For AutoDrive Motors Pvt. Ltd.</div>
            <div style={styles.signatureSub}>Authorised Signatory</div>
          </div>
        </div>

        {/* Footer strip */}
        <div style={styles.footerStrip}>
          <span>This is a computer-generated invoice and does not require a physical signature.</span>
          <span>Thank you for your business!</span>
        </div>
      </div>
    </div>
  );
}

// ─── Small helper row components ─────────────────────────────────────────────

function MetaRow({ label, value, highlight, children }) {
  return (
    <tr>
      <td style={styles.metaLabel}>{label}</td>
      <td style={styles.metaColon}>:</td>
      <td style={highlight ? styles.metaValueHL : styles.metaValue}>
        {children || value}
      </td>
    </tr>
  );
}

function TotalRow({ label, value, positive, accent, large }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "5px 0",
      fontSize: large ? "14px" : "12px",
      fontWeight: large ? 700 : 500,
      color: accent ? "#dc2626" : positive ? "#065f46" : "#111827",
    }}>
      <span>{label}</span>
      <span style={{ fontFamily: "inherit" }}>{value}</span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SPINNER_KEYFRAMES = `
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const styles = {
  pageWrap: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "24px 16px 48px",
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
  },
  centeredScreen: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f3f4f6",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  spinnerWrap: { textAlign: "center" },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e5e7eb",
    borderTopColor: "#1e3a5f",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto 16px",
  },
  loadingText: { color: "#6b7280", fontSize: "14px", margin: 0 },
  errorCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "40px",
    maxWidth: "400px",
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
  errorIcon: { fontSize: "40px", marginBottom: "12px" },
  errorHeading: { margin: "0 0 8px", fontSize: "18px", color: "#111827" },
  errorMsg: { color: "#6b7280", fontSize: "14px", marginBottom: "24px" },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: "860px",
    margin: "0 auto 16px",
    flexWrap: "wrap",
    gap: "10px",
  },
  btnPrimary: {
    padding: "8px 18px",
    background: "#1e3a5f",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.02em",
  },
  btnSecondary: {
    padding: "8px 18px",
    background: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  btnOutline: {
    padding: "8px 18px",
    background: "#fff",
    color: "#1e3a5f",
    border: "1.5px solid #1e3a5f",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  shell: {
    background: "#fff",
    maxWidth: "860px",
    margin: "0 auto",
    borderRadius: "4px",
    boxShadow: "0 2px 24px rgba(0,0,0,0.10)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "28px 32px 20px",
    background: "#fff",
  },
  headerLeft: { display: "flex", alignItems: "flex-start", gap: "16px" },
  companyLogo: {
    width: "52px",
    height: "52px",
    background: "#1e3a5f",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoMark: { fontSize: "26px", color: "#fff" },
  companyName: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#1e3a5f",
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
  },
  companyTagline: {
    fontSize: "11px",
    color: "#c9a84c",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  companyMeta: {
    fontSize: "11px",
    color: "#6b7280",
    lineHeight: 1.7,
  },
  headerRight: { flexShrink: 0 },
  invoiceBadge: {
    fontSize: "13px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#1e3a5f",
    border: "2px solid #1e3a5f",
    padding: "8px 18px",
    borderRadius: "4px",
    textTransform: "uppercase",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    padding: "20px 32px",
  },
  metaBlock: {},
  metaTable: {
    borderCollapse: "collapse",
    width: "100%",
    fontSize: "12px",
  },
  metaLabel: {
    color: "#6b7280",
    fontWeight: 500,
    padding: "3px 0",
    whiteSpace: "nowrap",
    verticalAlign: "top",
    width: "90px",
  },
  metaColon: {
    color: "#9ca3af",
    padding: "3px 8px",
    verticalAlign: "top",
  },
  metaValue: {
    color: "#111827",
    fontWeight: 500,
    padding: "3px 0",
    verticalAlign: "top",
  },
  metaValueHL: {
    color: "#1e3a5f",
    fontWeight: 700,
    fontSize: "13px",
    padding: "3px 0",
    verticalAlign: "top",
    fontFamily: "'Courier New', monospace",
  },
  customerName: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
    marginBottom: "4px",
  },
  customerDetail: {
    fontSize: "12px",
    color: "#4b5563",
    lineHeight: 1.8,
  },
  section: { padding: "16px 32px" },
  tableWrap: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  th: {
    background: "#1e3a5f",
    color: "#fff",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "8px 10px",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "7px 10px",
    color: "#374151",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "middle",
    fontSize: "12px",
  },
  trEven: { background: "#fff" },
  trOdd: { background: "#f9fafb" },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "24px",
    padding: "16px 32px",
    alignItems: "start",
  },
  payHistSection: { minWidth: 0 },
  totalsBox: {
    minWidth: "240px",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "14px 18px",
  },
  termsRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "24px",
    padding: "16px 32px",
    alignItems: "end",
  },
  termsBlock: {},
  termsList: {
    margin: "0",
    paddingLeft: "16px",
    fontSize: "11px",
    color: "#6b7280",
    lineHeight: 2,
  },
  signatureBlock: { textAlign: "center", minWidth: "180px" },
  signatureArea: {
    height: "56px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    marginBottom: "6px",
  },
  signatureLine: {
    width: "160px",
    borderBottom: "1.5px solid #374151",
  },
  signatureLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#111827",
    marginBottom: "2px",
  },
  signatureSub: {
    fontSize: "10px",
    color: "#9ca3af",
    letterSpacing: "0.05em",
  },
  footerStrip: {
    background: "#1e3a5f",
    color: "#93c5fd",
    fontSize: "10px",
    padding: "8px 32px",
    display: "flex",
    justifyContent: "space-between",
    letterSpacing: "0.02em",
  },
};
