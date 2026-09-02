import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Printer, Plus } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import apiclient from "../../services/apiclient";
import { useCart } from "../context/CartContext";
import "./InvoicePage.css";

const money = (value) => Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const date = (value, withTime = false) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  const formatted = parsed.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
  return withTime
    ? `${formatted}, ${parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
    : formatted;
};

const wordsBelowThousand = (number) => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (!number) return "";
  if (number < 20) return ones[number];
  if (number < 100) return `${tens[Math.floor(number / 10)]} ${ones[number % 10]}`.trim();
  return `${ones[Math.floor(number / 100)]} Hundred ${wordsBelowThousand(number % 100)}`.trim();
};

const amountInWords = (value) => {
  let amount = Math.floor(Number(value || 0));
  if (!amount) return "Indian Rupees Zero Only";
  const groups = [
    [10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"],
  ];
  const result = [];
  groups.forEach(([unit, label]) => {
    const count = Math.floor(amount / unit);
    if (count) result.push(`${wordsBelowThousand(count)} ${label}`);
    amount %= unit;
  });
  if (amount) result.push(wordsBelowThousand(amount));
  return `Indian Rupees ${result.join(" ")} Only`;
};

const text = (value) => value === null || value === undefined || value === "" ? "-" : value;

const paymentSummary = (payments) => {
  const methods = [...new Set((payments || []).map((payment) => payment.paymentMethod).filter(Boolean))];
  return methods.length ? methods.map((method) => method.replaceAll("_", " ")).join(" + ") : "Not paid";
};

// Reads the currently logged-in user's name, as stored by LoginPage.jsx
// (localStorage.setItem("user", JSON.stringify(loginResponse))).
const loggedInUserName = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user.name || null;
  } catch {
    return null;
  }
};

// Per-item taxable amount: use the value from the API if present,
// otherwise derive it from rate * qty minus the discount.
const itemTaxable = (item) => {
  if (item.taxableAmount !== undefined && item.taxableAmount !== null) return item.taxableAmount;
  const gross = Number(item.sellingPrice || 0) * Number(item.quantity || 0);
  return gross - Number(item.discountAmount || 0);
};

// The HSN code has shown up under a couple of different field names
// depending on the API response, so check all of them before falling back.
const itemHsn = (item) => item.hsncode ?? item.hsnCode ?? item.hsn_code ?? item.hsn;

function InfoLine({ label, value }) {
  return <div className="invoice-info-line"><span>{label}</span><strong>{text(value)}</strong></div>;
}

function TotalLine({ label, value, subtract = false, strong = false }) {
  return <div className={`invoice-total-line${strong ? " is-strong" : ""}`}>
    <span>{label}</span><strong>{subtract ? "(-) " : ""}{"\u20B9"} {money(value)}</strong>
  </div>;
}

// Column widths for the items table, kept as a single source of truth so the
// <colgroup> always matches however many columns are actually rendered.
// HSN is folded into the Item Description cell rather than given its own
// column, since a dedicated column was too narrow and wrapped the code.
const COLUMN_WIDTHS_WITH_DISCOUNT = [4, 30, 8, 5, 8, 8, 8, 9, 7, 13];
const COLUMN_WIDTHS_NO_DISCOUNT = [4, 35, 8, 5, 9, 9, 10, 7, 13];

export default function InvoicePage({ orderIdOverride, embedded = false, onNewSale }) {
  const { orderId: routeOrderId } = useParams();
  const orderId = orderIdOverride || routeOrderId;
  const navigate = useNavigate();
  const location = useLocation();
  const printedOrder = useRef(null);
  const { clearCart } = useCart();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiclient.get(`/orders/${orderId}`);
      setInvoice(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load this invoice.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  useEffect(() => {
    if (!location.state?.autoPrint || loading || error || !invoice
        || String(invoice.orderId) !== String(orderId)
        || printedOrder.current === orderId) return;
    // Run after the invoice has rendered. Cleanup also avoids duplicate
    // dialogs during React StrictMode's effect setup/cleanup cycle.
    const timer = window.setTimeout(() => {
      printedOrder.current = orderId;
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, autoPrint: false },
      });
      window.print();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [invoice, loading, error, orderId, location.pathname, location.state, navigate]);

  const items = useMemo(() => invoice?.items || [], [invoice]);
  const payments = useMemo(() => invoice?.payments || [], [invoice]);
  const collectedBy = useMemo(() => invoice?.collectedByName || loggedInUserName(), [invoice]);

  // Only show the Discount column if at least one line item actually has a discount.
  const hasDiscount = useMemo(
    () => items.some((item) => Number(item.discountAmount || 0) > 0),
    [items]
  );
  const colWidths = hasDiscount ? COLUMN_WIDTHS_WITH_DISCOUNT : COLUMN_WIDTHS_NO_DISCOUNT;
  const columnCount = colWidths.length;

  const startSale = () => {
    clearCart();
    if (embedded && onNewSale) {
      onNewSale();
      return;
    }
    navigate(location.pathname.startsWith("/owner/") ? "/owner/sales/new"
      : location.pathname.startsWith("/store/") ? "/store/sales/new" : "/pos");
  };

  if (loading) return <div className="invoice-state">Loading invoice...</div>;
  if (error || !invoice) return <div className="invoice-state invoice-state--error">{error || "Invoice not found."}</div>;

  return <main className="invoice-page">
    <nav className="invoice-toolbar">
      {!embedded && <button className="invoice-button invoice-button--quiet" onClick={() => navigate(-1)}><ArrowLeft size={16} />Back</button>}
      <div>
        {invoice.orderStatus === "PENDING_PAYMENT" && Number(invoice.balanceAmount) > 0 && (
          <button className="invoice-button invoice-button--primary" onClick={() => {
            const base = location.pathname.startsWith("/owner/") ? "/owner/sales"
              : location.pathname.startsWith("/store/") ? "/store/sales" : "/pos";
            navigate(`${base}/payment/${orderId}`);
          }}>Collect Payment</button>
        )}
        <button className="invoice-button invoice-button--quiet" onClick={() => window.print()}><Printer size={16} />Print</button>
        <button className="invoice-button invoice-button--quiet" onClick={() => window.print()}><Download size={16} />Save PDF</button>
        <button className="invoice-button invoice-button--primary" onClick={startSale}><Plus size={16} />New Sale</button>
      </div>
    </nav>

    <article className="invoice-sheet">
      <header className="invoice-header">
        <div className="invoice-brand">
          <div className="invoice-logo">D2W</div>
          <div className="invoice-store-copy">
            <h1>{text(invoice.storeName)}</h1>
            <p className="invoice-store-code">Deals 2 Wheels <span>{text(invoice.storeCode)}</span></p>
            <p>{invoice.storePhone && `Phone: ${invoice.storePhone}`}{invoice.storePhone && invoice.storeEmail && "  |  "}{invoice.storeEmail && `Email: ${invoice.storeEmail}`}</p>
            <p className="invoice-gstin"><span>GSTIN:</span> {text(invoice.storeGstno)}</p>
          </div>
        </div>
        <div className="invoice-title-block">
          <h2>TAX INVOICE</h2>
          <InfoLine label="Invoice No." value={invoice.invoiceNumber} />
          <InfoLine label="Invoice Date" value={date(invoice.orderDate)} />
          <InfoLine label="Order No." value={`#${invoice.orderId}`} />
        </div>
      </header>

      <section className="invoice-party-grid">
        <div className="invoice-party">
          <h3>BILL TO</h3>
          <strong className="invoice-customer-name">{text(invoice.customerName)}</strong>
          <p>Mobile: {text(invoice.phone)}</p>
          {invoice.saleType === "B2B" && <>
            <p>GSTIN: {text(invoice.customerGstin)}</p>
            <p>Registration: {text(invoice.customerGstRegistrationType)?.replaceAll?.("_", " ")}</p>
            <p>State / Place of Supply: {text(invoice.placeOfSupply || invoice.customerState)}</p>
            <p>Billing Address: {text(invoice.billingAddress || invoice.customerAddress)}</p>
            {invoice.shippingAddress && <p>Shipping Address: {invoice.shippingAddress}</p>}
            {invoice.customerEmail && <p>Email: {invoice.customerEmail}</p>}
          </>}
        </div>
        <div className="invoice-meta">
          <h3>INVOICE DETAILS</h3>
          <InfoLine label="Order Date" value={date(invoice.orderDate, true)} />
          <InfoLine label="Payment" value={paymentSummary(payments)} />
          <InfoLine label="Status" value={invoice.orderStatus?.replaceAll("_", " ")} />
          <InfoLine label="Collected By" value={collectedBy} />
        </div>
      </section>

      <section className="invoice-items-wrap">
        <table className="invoice-items">
          <colgroup>
            {colWidths.map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}
          </colgroup>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Item Description</th>
              <th>Brand</th>
              <th className="invoice-num">Qty</th>
              <th className="invoice-num">MRP</th>
              <th className="invoice-num">Rate</th>
              {hasDiscount && <th className="invoice-num">Discount</th>}
              <th className="invoice-num">Taxable</th>
              <th className="invoice-num">GST %</th>
              <th className="invoice-num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => <tr key={`${item.batchId || "item"}-${index}`}>
              <td>{index + 1}</td>
              <td>
                <strong>{text(item.itemName || item.productName)}</strong>
                <small className="invoice-partno">Part No: {text(item.partNumber)} &nbsp;|&nbsp; HSN: {text(itemHsn(item))}</small>
              </td>
              <td>{text(item.brandName)}</td>
              <td className="invoice-num">{text(item.quantity)}</td>
              <td className="invoice-num">{money(item.mrp ?? item.sellingPrice)}</td>
              <td className="invoice-num">{money(item.sellingPrice)}</td>
              {hasDiscount && (
                <td className="invoice-num">{Number(item.discountAmount || 0) > 0 ? `${money(item.discountAmount)} (${Number(item.discountPercentage || 0)}%)` : "-"}</td>
              )}
              <td className="invoice-num">{money(itemTaxable(item))}</td>
              <td className="invoice-num">{Number(item.gstPercentage || 0)}%</td>
              <td className="invoice-num"><strong>{money(item.totalPrice)}</strong></td>
            </tr>)}
            {!items.length && <tr><td colSpan={columnCount} className="invoice-empty">No invoice items found.</td></tr>}
          </tbody>
        </table>
        <div className="invoice-items-count">Total Items: {items.length}</div>
      </section>

      <section className="invoice-summary-grid">
        <div className="invoice-lower-left">
          {payments.length > 0 && <div className="invoice-payment-block">
            <h3>PAYMENT DETAILS</h3>
            {payments.map((payment, index) => <div className="invoice-payment-row" key={payment.id || index}>
              <span>{date(payment.paymentDate)} - {text(payment.paymentMethod)?.replaceAll?.("_", " ") || "-"}</span>
              <strong>{"\u20B9"} {money(payment.amount)}</strong>
              {payment.transactionNumber && <small>{payment.transactionNumber}</small>}
            </div>)}
          </div>}
          <div className="invoice-terms"><h3>TERMS &amp; CONDITIONS</h3><ol><li>Goods once sold cannot be returned or exchanged.</li><li>Warranty is subject to the manufacturer or brand policy.</li><li>Disputes are subject to the store's local jurisdiction.</li></ol></div>
        </div>
        <div className="invoice-totals">
          <TotalLine label="Gross Amount" value={invoice.grossAmount} />
          {Number(invoice.itemDiscountAmount) > 0 && <TotalLine label="Item Discount" value={invoice.itemDiscountAmount} subtract />}
          {Number(invoice.billDiscountAmount) > 0 && <TotalLine label={`Bill Discount (${Number(invoice.billDiscountPercentage || 0)}%)`} value={invoice.billDiscountAmount} subtract />}
          <TotalLine label="Taxable Amount" value={invoice.taxableAmount} strong />
          {Number(invoice.cgstAmount) > 0 && <TotalLine label="CGST" value={invoice.cgstAmount} />}
          {Number(invoice.sgstAmount) > 0 && <TotalLine label="SGST" value={invoice.sgstAmount} />}
          {Number(invoice.igstAmount) > 0 && <TotalLine label="IGST" value={invoice.igstAmount} />}
          <TotalLine label="Round Off" value={invoice.roundOffAmount} />
          <div className="invoice-grand-total"><span>GRAND TOTAL</span><strong>{"\u20B9"} {money(invoice.totalAmount)}</strong></div>
          <div className="invoice-words"><h3>AMOUNT IN WORDS</h3><p>{amountInWords(invoice.totalAmount)}</p></div>
          <TotalLine label="Paid Amount" value={invoice.paidAmount} />
          <TotalLine label="Balance Due" value={invoice.balanceAmount} strong />
        </div>
      </section>

      <footer className="invoice-footer">
        <div><span>Customer Signature</span></div>
        <div><span>Authorized Signatory</span></div>
      </footer>
      <p className="invoice-generated">This is a computer-generated invoice.</p>
    </article>
  </main>;
}
