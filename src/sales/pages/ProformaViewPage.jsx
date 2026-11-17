import { ProductUnitLabel } from "../../components/ProductUnitFields";
import InvoiceThemeSwitch, { useInvoiceTheme, SaleDocumentSheet } from "../../components/InvoiceThemeSwitch";
import { printCleanDocument } from "../../utils/cleanPrint";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Pencil, Phone, Printer } from "lucide-react";
import { getProforma, toProformaSaleSource } from "../../services/proformaService";
import d2wLogo from "../../assets/deals2wheels-logo100.png";
import "./ProformaPage.css";

/* ------------------------------------------------------------------ */
/* 1. Helpers (formats are the original ones)                          */
/* ------------------------------------------------------------------ */
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const date = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "—";

const displayNumber = (record) => record?.proformaNumber?.startsWith("D2W-") ? record.proformaNumber : `D2W-${String(record?.storeName || "S").trim().charAt(0).toUpperCase()}-${String(record?.id || 0).padStart(5, "0")}`;
const maskPartNo = (value) => {
  const part = String(value ?? "").trim();
  if (!part) return "—";
  if (part.length <= 4) return "*".repeat(part.length);
  return part.slice(0, 2) + "*".repeat(part.length - 4) + part.slice(-2);
};

// GST charged on one line (shown under the GST % in the GST column).
const lineGstAmount = (item) => Number(item.cgstAmount || 0) + Number(item.sgstAmount || 0) + Number(item.igstAmount || 0);

// Colour name for the status badge (styles: .doc-badge--* in ProformaPage.css).
const statusTone = (s) => { const v = String(s || "").toUpperCase(); return v.includes("CANCEL") ? "danger" : v.includes("CONVERT") ? "ok" : "neutral"; };

// Column widths (percent). Each array adds up to 100.
// S.No | Part Details | Brand | HSN | Qty | Rate | MRP | [Discount] | GST | Amount
const COLUMN_WIDTHS_WITH_DISCOUNT = [4, 24, 10, 8, 6, 10, 10, 9, 8, 11];
const COLUMN_WIDTHS_NO_DISCOUNT = [4, 29, 11, 9, 7, 11, 11, 8, 10];

// The unit label (e.g. "Piece") is only shown for units other than PCS; the Qty column already carries the unit.

const showUnitLabel = (item) => Boolean(item.stockUnit && item.stockUnit !== "PCS");
const qtyText = (qty, unit) => (unit && unit !== "PCS" ? `${qty} ${unit}` : `${qty}`);

/* ------------------------------------------------------------------ */
/* 2. Data for the "Sale" layout (drawn by SaleDocumentSheet)          */
/* ------------------------------------------------------------------ */
const buildProformaSaleDoc = ({ record, items, maskPartNos, showDiscount, totalMrp, totalItemDiscount, grandTotal }) => {
  const gstin = String(record.customerGstin || "").trim();
  const gstType = String(record.customerGstRegistrationType || "").trim();
  const hasCustomerGst = Boolean(gstin) && !/^unregistered/i.test(gstin) && !/^unregistered/i.test(gstType);

  return {
    tableVariant: "proforma", // keeps the proforma's own columns inside the Sale layout
    title: "Proforma Invoice",
    notice: "NOT A TAX INVOICE",
    logo: d2wLogo,
    detailsTitle: "Proforma Details",
    store: {
      name: record.storeName,
      lines: [record.storeAddress || "Address not available", `GSTIN: ${record.storeGstin || "—"}`],
    },
    billTo: {
      name: record.customerName,
      lines: [
        record.billingAddress,
        record.customerMobile && `Mobile: ${record.customerMobile}`,
        record.customerEmail && `Email: ${record.customerEmail}`,
        hasCustomerGst && `GSTIN: ${gstin}`,
        hasCustomerGst && gstType && `GST Type: ${gstType}`,
        record.placeOfSupply && `Place of Supply: ${record.placeOfSupply}`,
      ].filter(Boolean),
    },
    shipTo: { lines: record.shippingAddress ? [String(record.shippingAddress)] : [] },
    details: [
      { label: "Proforma No.", value: displayNumber(record) },
      { label: "Proforma Date", value: date(record.invoiceDate) },
      { label: "Status", value: record.status ? String(record.status).replaceAll("_", " ") : "—", tone: statusTone(record.status) },
      { label: "Total Items", value: String(items.length) },
    ],
    showDiscount,
    items: items.map((item, index) => ({
      key: `${item.id || item.inventoryId}-${index}`,
      raw: item,
      name: item.itemName,
      showUnit: showUnitLabel(item),
      partNo: maskPartNos ? maskPartNo(item.partNumber) : (item.partNumber || "—"),
      hsn: item.hsnCode || "—",
      brand: item.brandName,
      qty: qtyText(Number(item.quantity || 0), item.stockUnit),
      rate: item.unitPrice,
      mrp: item.mrp,
      discountAmount: Number(item.discountAmount || 0),
      discountPct: Number(item.discountPercentage || 0),
      gst: lineGstAmount(item),
      gstPct: Number(item.gstPercentage || 0),
      amount: item.lineTotal,
      extras: record.sourceLeadId ? [
        item.description,
        `${item.availabilityStatus?.replaceAll("_", " ") || ""}${item.estimatedAvailabilityDate ? ` · Expected ${date(item.estimatedAvailabilityDate)}` : ""}`.trim(),
      ] : [],
    })),
    payments: [],
    description: "",
    words: "",
    dueDate: "",
    terms: ["This is a proforma invoice and does not create a tax liability or deduct stock."],
    bank: [],
    summary: [
      { label: "Total MRP", value: totalMrp },
      { label: "Item Discount", value: totalItemDiscount, subtract: true },
      Number(record.billDiscountAmount || 0) > 0 && { label: "Bill Discount", value: record.billDiscountAmount, subtract: true },
      { label: "Taxable Amount", value: record.taxableAmount, strong: true },
      Number(record.cgstAmount || 0) > 0 && { label: "CGST", value: record.cgstAmount },
      Number(record.sgstAmount || 0) > 0 && { label: "SGST", value: record.sgstAmount },
      Number(record.igstAmount || 0) > 0 && { label: "IGST", value: record.igstAmount },
      { label: "Round Off", value: record.roundOffAmount },
      { label: "Grand Total", value: grandTotal, bar: true },
    ].filter(Boolean),
    customerSignature: false,
    footerNote: "",
  };
};

/* ------------------------------------------------------------------ */
/* 3. The page                                                         */
/* ------------------------------------------------------------------ */
export default function ProformaViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith("/owner/") ? "/owner/sales" : "/store/sales";
  const { themeKey, setTheme } = useInvoiceTheme();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [maskPartNos, setMaskPartNos] = useState(false);

  useEffect(() => {
    getProforma(id).then(setRecord)
      .catch((e) => setError(e?.response?.data?.message || "Proforma Invoice not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="proforma-page"><div className="proforma-empty">Loading invoice…</div></div>;
  if (!record) return <div className="proforma-page"><div className="proforma-empty">{error}</div></div>;

  const convert = () => navigate(`${base}/new`, { state: { proforma: toProformaSaleSource(record) } });
  const items = record.items || [];
  const gstin = String(record.customerGstin || "").trim();
  const gstType = String(record.customerGstRegistrationType || "").trim();
  const hasCustomerGst = Boolean(gstin) && !/^unregistered/i.test(gstin) && !/^unregistered/i.test(gstType);
  const showDiscount = items.some((item) => Number(item.discountPercentage || 0) > 0 || Number(item.discountAmount || 0) > 0);
  const colWidths = showDiscount ? COLUMN_WIDTHS_WITH_DISCOUNT : COLUMN_WIDTHS_NO_DISCOUNT;

  const totalMrp = items.reduce((sum, item) => sum + Number(item.mrp || 0) * Number(item.quantity || 0), 0);
  const totalItemDiscount = items.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
  const grandTotal = Number(record.netPayable || 0);

  return <div className="proforma-invoice-page">
    <header className="proforma-view-header">
      <div className="proforma-view-heading">
        <button className="proforma-icon-button" onClick={() => navigate(`${base}/proforma`)}><ArrowLeft size={17}/></button>
        <div><h1>Proforma Invoice</h1><span>{displayNumber(record)}</span></div>
      </div>
      <div className="proforma-view-actions">
        {record.sourceLeadId && <button onClick={() => navigate(`${base}/proforma/${record.id}/lead`)}>Customer decision and sales</button>}
        <InvoiceThemeSwitch themeKey={themeKey} onChange={setTheme} />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={maskPartNos} onChange={(event) => setMaskPartNos(event.target.checked)} />
          Mask part numbers
        </label>
        <button className="quiet" onClick={() => printCleanDocument()}><Printer size={15}/> PDF / Print</button>
        {!record.sourceLeadId && record.status === "SAVED" && <button className="quiet" onClick={() => navigate(`${base}/proforma/${record.id}/edit`)}><Pencil size={15}/> Edit</button>}
        {!record.sourceLeadId && record.status === "SAVED" && <button onClick={convert}>Convert to Sale</button>}
      </div>
    </header>

    {themeKey === "sale" && <SaleDocumentSheet
      className="proforma-invoice-sheet"
      doc={buildProformaSaleDoc({ record, items, maskPartNos, showDiscount, totalMrp, totalItemDiscount, grandTotal })}
    />}

    {themeKey !== "sale" && <article className="proforma-invoice-sheet" data-template={themeKey}>
      <header className="proforma-letterhead">
        <div className="proforma-brand">
          <img className="proforma-brand-logo" src={d2wLogo} alt="Deals2Wheels"/>
          <div className="proforma-entity">
            <strong>{record.storeName}</strong>
            <span><MapPin size={12}/>{record.storeAddress || "Address not available"}</span>
            <span>GSTIN {record.storeGstin || "—"}</span>
          </div>
        </div>
        <div className="proforma-title-block">
          <h1 className="proforma-invoice-title">PROFORMA INVOICE</h1>
          <p className="proforma-not-tax">NOT A TAX INVOICE</p>
          <div className="proforma-info-line"><span>Proforma No.</span><strong>{displayNumber(record)}</strong></div>
          <div className="proforma-info-line"><span>Proforma Date</span><strong>{date(record.invoiceDate)}</strong></div>
        </div>
      </header>

      <section className="proforma-party-grid">
        <div className="proforma-bill-to">
          <small>BILL TO</small>
          <strong>{record.customerName}</strong>
          {record.billingAddress && <span><MapPin size={12}/>{record.billingAddress}</span>}
          {record.customerMobile && <span><Phone size={12}/>{record.customerMobile}</span>}
          {record.customerEmail && <span><Mail size={12}/>{record.customerEmail}</span>}
          {hasCustomerGst && <span>GSTIN {gstin}</span>}
          {hasCustomerGst && gstType && <span>GST Type {gstType}</span>}
          {record.shippingAddress && <span>Shipping Address: {record.shippingAddress}</span>}
          {record.placeOfSupply && <span>Place of Supply: {record.placeOfSupply}</span>}
        </div>
        <div className="proforma-meta">
          <small>PROFORMA DETAILS</small>
          <div className="proforma-info-line"><span>Status</span><strong><span className={`doc-badge doc-badge--${statusTone(record.status)}`}>{record.status ? String(record.status).replaceAll("_", " ") : "—"}</span></strong></div>
          <div className="proforma-info-line"><span>Total Items</span><strong>{items.length}</strong></div>
        </div>
      </section>

      <div className="proforma-items-wrap">
        <table className="proforma-invoice-table">
          <colgroup>{colWidths.map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
          <thead>
  <tr>
    <th className="ctr">S.No</th><th>Part Details</th><th>Brand</th><th className="ctr">HSN</th><th className="ctr">Qty</th>
    <th className="num">Rate</th><th className="num">MRP</th>
    {showDiscount && <th className="num">Discount</th>}
    <th className="num">GST</th><th className="num">Amount</th>
  </tr>
</thead>
          <tbody>
            {items.map((item, index) => <tr key={`${item.id || item.inventoryId}-${index}`}>
  <td className="ctr">{index + 1}</td>
  <td className="item-description">
    <strong>{item.itemName}</strong>
    {showUnitLabel(item) && <ProductUnitLabel product={item}/>}
     <small className="proforma-partno">
      <span>Part No: {maskPartNos ? maskPartNo(item.partNumber) : (item.partNumber || "—")}</span>
    </small>
    {record.sourceLeadId && <>
      <small>{item.description}</small>
      <small>{item.availabilityStatus?.replaceAll("_", " ")}{item.estimatedAvailabilityDate ? ` · Expected ${date(item.estimatedAvailabilityDate)}` : ""}</small>
    </>}
  </td>
 <td className="item-description">{item.brandName || "—"}</td>
  <td className="ctr">{item.hsnCode || "—"}</td>
  <td className="ctr">{qtyText(Number(item.quantity || 0), item.stockUnit)}</td>
  <td className="num">{money(item.unitPrice)}</td>
  <td className="num">{money(item.mrp)}</td>
  {showDiscount && <td className="num"><span>{Number(item.discountPercentage || 0)}%</span><small>{money(item.discountAmount)}</small></td>}
  <td className="num"><span>{Number(item.gstPercentage || 0)}%</span><small>{money(lineGstAmount(item))}</small></td>
  <td className="num">{money(item.lineTotal)}</td>
</tr>)}
          </tbody>
        </table>
      </div>

      <section className="proforma-summary-row">
        <div className="proforma-summary-card">
          <h2>BILL SUMMARY</h2>
          <div><span>Total MRP</span><strong>{money(totalMrp)}</strong></div>
          <div><span>Item Discount</span><strong>- {money(totalItemDiscount)}</strong></div>
          {Number(record.billDiscountAmount || 0) > 0 && <div><span>Bill Discount</span><strong>- {money(record.billDiscountAmount)}</strong></div>}
          <div><span>Taxable Amount</span><strong>{money(record.taxableAmount)}</strong></div>
          {Number(record.cgstAmount || 0) > 0 && <div><span>CGST</span><strong>{money(record.cgstAmount)}</strong></div>}
          {Number(record.sgstAmount || 0) > 0 && <div><span>SGST</span><strong>{money(record.sgstAmount)}</strong></div>}
          {Number(record.igstAmount || 0) > 0 && <div><span>IGST</span><strong>{money(record.igstAmount)}</strong></div>}
          <div><span>Round Off</span><strong>{money(record.roundOffAmount)}</strong></div>
          <div className="grand-total"><span>GRAND TOTAL</span><strong>{money(grandTotal)}</strong></div>
        </div>
      </section>

      <footer className="proforma-footer"><strong>Terms</strong><span>This is a proforma invoice and does not create a tax liability or deduct stock.</span></footer>
    </article>}
  </div>;
}
