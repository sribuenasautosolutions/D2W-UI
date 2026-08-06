import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Printer, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
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

const fullAddress = (invoice) => [
  invoice.storeAddress,
  invoice.storeCity,
  invoice.storeState,
  invoice.storePincode,
  invoice.storeCountry,
].filter(Boolean).join(", ");

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

function InfoLine({ label, value }) {
  return <div className="invoice-info-line"><span>{label}</span><strong>{text(value)}</strong></div>;
}

function TotalLine({ label, value, subtract = false, strong = false }) {
  return <div className={`invoice-total-line${strong ? " is-strong" : ""}`}>
    <span>{label}</span><strong>{subtract ? "(-) " : ""}{"\u20B9"} {money(value)}</strong>
  </div>;
}

export default function InvoicePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
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

  const items = useMemo(() => invoice?.items || [], [invoice]);
  const payments = useMemo(() => invoice?.payments || [], [invoice]);
  const collectedBy = useMemo(() => invoice?.collectedByName || loggedInUserName(), [invoice]);

  const startSale = () => {
    clearCart();
    navigate("/pos");
  };

  if (loading) return <div className="invoice-state">Loading invoice...</div>;
  if (error || !invoice) return <div className="invoice-state invoice-state--error">{error || "Invoice not found."}</div>;

  return <main className="invoice-page">
    <nav className="invoice-toolbar">
      <button className="invoice-button invoice-button--quiet" onClick={() => navigate(-1)}><ArrowLeft size={16} />Back</button>
      <div>
        <button className="invoice-button invoice-button--quiet" onClick={() => window.print()}><Printer size={16} />Print</button>
        <button className="invoice-button invoice-button--quiet" onClick={() => window.print()}><Download size={16} />Save PDF</button>
        <button className="invoice-button invoice-button--primary" onClick={startSale}><Plus size={16} />New Sale</button>
      </div>
    </nav>

    <article className="invoice-sheet">
      <header className="invoice-header">
        <div className="invoice-brand">
          <div className="invoice-logo"><span>D</span><b>2</b><span>W</span></div>
          <div className="invoice-store-copy">
            <h1>{text(invoice.storeName)}</h1>
            <p className="invoice-store-code">D2W - Deals 2 Wheels <span>{text(invoice.storeCode)}</span></p>
            <p>{text(fullAddress(invoice))}</p>
            <p>{invoice.storePhone && `Phone: ${invoice.storePhone}`}{invoice.storePhone && invoice.storeEmail && "  |  "}{invoice.storeEmail && `Email: ${invoice.storeEmail}`}</p>
            <p className="invoice-gstin"><span>GSTIN</span>{text(invoice.storeGstno)}</p>
          </div>
        </div>
        <div className="invoice-title-block">
          <h2>TAX INVOICE</h2>
          <InfoLine label="Invoice No." value={invoice.invoiceNumber} />
          <InfoLine label="Invoice Date" value={date(invoice.orderDate)} />
          <InfoLine label="Order No." value={`#${invoice.orderId}`} />
          <InfoLine label="Store Type" value={invoice.storeType?.replaceAll("_", " ")} />
        </div>
      </header>

      <section className="invoice-party-grid">
        <div className="invoice-party">
          <h3>BILL TO</h3>
          <strong className="invoice-customer-name">{text(invoice.customerName)}</strong>
          <p>{text(invoice.customerAddress)}</p>
          <p>Mobile: {text(invoice.phone)}</p>
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
          <thead><tr><th>#</th><th>Part No.</th><th>Item Description</th><th>HSN</th><th>Qty</th><th>Rate</th><th>Discount</th><th>GST</th><th>Amount</th></tr></thead>
          <tbody>
            {items.map((item, index) => <tr key={`${item.batchId || "item"}-${index}`}>
              <td>{index + 1}</td>
              <td className="invoice-mono">{text(item.partNumber)}</td>
              <td><strong>{text(item.itemName || item.productName)}</strong>{item.brandName && <small>{item.brandName}</small>}</td>
              <td>{text(item.hsncode)}</td>
              <td>{text(item.quantity)}</td>
              <td>{money(item.sellingPrice)}</td>
              <td>{Number(item.discountAmount || 0) > 0 ? `${money(item.discountAmount)} (${Number(item.discountPercentage || 0)}%)` : "-"}</td>
              <td>{Number(item.gstPercentage || 0)}%</td>
              <td><strong>{money(item.totalPrice)}</strong></td>
            </tr>)}
            {!items.length && <tr><td colSpan="9" className="invoice-empty">No invoice items found.</td></tr>}
          </tbody>
          <tfoot><tr><td colSpan="4">Total Items: {items.length}</td><td>{items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</td><td colSpan="4" /></tr></tfoot>
        </table>
      </section>

      <section className="invoice-summary-grid">
        <div className="invoice-lower-left">
          <div className="invoice-words"><h3>AMOUNT IN WORDS</h3><p>{amountInWords(invoice.totalAmount)}</p></div>
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
          <TotalLine label="Paid Amount" value={invoice.paidAmount} />
          <TotalLine label="Balance Due" value={invoice.balanceAmount} strong />
        </div>
      </section>

      <footer className="invoice-footer">
        <div><span>Customer Signature</span></div>
        <div><p>For {text(invoice.storeName)}</p><span>Authorized Signatory</span></div>
      </footer>
      <p className="invoice-generated">This is a computer-generated invoice.</p>
    </article>
  </main>;
}
