import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Pencil, Phone, Printer } from "lucide-react";
import { getProforma, toProformaSaleSource } from "../../services/proformaService";
import d2wLogo from "../../assets/deals2wheels-logo100.png";
import "./ProformaPage.css";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "—";
const displayNumber = (record) => record?.proformaNumber?.startsWith("D2W-") ? record.proformaNumber : `D2W-${String(record?.storeName || "S").trim().charAt(0).toUpperCase()}-${String(record?.id || 0).padStart(5, "0")}`;

export default function ProformaViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith("/owner/") ? "/owner/sales" : "/store/sales";
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProforma(id).then(setRecord)
      .catch((e) => setError(e?.response?.data?.message || "Proforma Invoice not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="proforma-page"><div className="proforma-empty">Loading invoice…</div></div>;
  if (!record) return <div className="proforma-page"><div className="proforma-empty">{error}</div></div>;

  const convert = () => navigate(`${base}/new`, { state: { proforma: toProformaSaleSource(record) } });
  const gstin = String(record.customerGstin || "").trim();
  const gstType = String(record.customerGstRegistrationType || "").trim();
  const hasCustomerGst = Boolean(gstin) && !/^unregistered/i.test(gstin) && !/^unregistered/i.test(gstType);
  const showDiscount = (record.items || []).some((item) => Number(item.discountPercentage || 0) > 0 || Number(item.discountAmount || 0) > 0);

  const totalMrp = (record.items || []).reduce(
  (sum, item) => sum + Number(item.mrp || 0) * Number(item.quantity || 0),
  0
);

const totalItemDiscount = (record.items || []).reduce(
  (sum, item) => sum + Number(item.discountAmount || 0),
  0
);



const grandTotal = Number(record.netPayable || 0);
  return <div className="proforma-invoice-page">
    <header className="proforma-view-header">
      <div className="proforma-view-heading">
        <button className="proforma-icon-button" onClick={() => navigate(`${base}/proforma`)}><ArrowLeft size={17}/></button>
        <div><h1>Proforma Invoice</h1><span>{displayNumber(record)}</span></div>
      </div>
      <div className="proforma-view-actions">
        <button className="quiet" onClick={() => window.print()}><Printer size={15}/> PDF / Print</button>
        {record.status === "SAVED" && <button className="quiet" onClick={() => navigate(`${base}/proforma/${record.id}/edit`)}><Pencil size={15}/> Edit</button>}
        {record.status === "SAVED" && <button onClick={convert}>Convert to Sale</button>}
      </div>
    </header>

    <article className="proforma-invoice-sheet">
      <h1 className="proforma-invoice-title">PROFORMA INVOICE</h1>
      <p className="proforma-not-tax">NOT A TAX INVOICE</p>

      <section className="proforma-letterhead">
        <div className="proforma-entity">
          <small>BILL FROM</small>
          <strong>{record.storeName}</strong>
          <span><MapPin size={12}/>{record.storeAddress || "Address not available"}</span>
          <span>GSTIN {record.storeGstin || "—"}</span>
        </div>
        <div className="proforma-logo-meta">
          <img src={d2wLogo} alt="Deals2Wheels"/>
          <dl><div><dt>Proforma Number</dt><dd>{displayNumber(record)}</dd></div><div><dt>Proforma Date</dt><dd>{date(record.invoiceDate)}</dd></div></dl>
        </div>
      </section>

      <section className="proforma-bill-to">
        <small>BILL TO</small>
        <strong>{record.customerName}</strong>
        {record.billingAddress && <span><MapPin size={12}/>{record.billingAddress}</span>}
        {record.customerMobile && <span><Phone size={12}/>{record.customerMobile}</span>}
        {record.customerEmail && <span><Mail size={12}/>{record.customerEmail}</span>}
        {hasCustomerGst && <span>GSTIN {gstin}</span>}
        {hasCustomerGst && gstType && <span>GST Type {gstType}</span>}
        {record.shippingAddress && <span>Shipping Address: {record.shippingAddress}</span>}
        {record.placeOfSupply && <span>Place of Supply: {record.placeOfSupply}</span>}
      </section>

      <div className="proforma-items-wrap"><table className="proforma-invoice-table">
        <thead><tr><th>S.No</th><th>Part Details</th><th>HSN</th><th>Qty</th><th>Rate</th><th>MRP</th>{showDiscount && <th>Discount</th>}<th>GST</th><th>Amount</th></tr></thead>
        <tbody>{(record.items || []).map((item, index) => <tr key={`${item.id || item.inventoryId}-${index}`}>
          <td>{index + 1}</td><td className="item-description"><strong>{item.partNumber || "—"}</strong><span>{item.itemName}</span><small>{item.brandName}</small></td>
          <td>{item.hsnCode || "—"}</td><td>{Number(item.quantity || 0)}</td><td>{money(item.unitPrice)}</td><td>{money(item.mrp)}</td>
          {showDiscount && <td><span>{Number(item.discountPercentage || 0)}%</span><small>{money(item.discountAmount)}</small></td>}
          <td><span>{Number(item.gstPercentage || 0)}%</span><small>{money(Number(item.cgstAmount || 0)+Number(item.sgstAmount || 0)+Number(item.igstAmount || 0))}</small></td>
          <td>{money(item.lineTotal)}</td>
        </tr>)}</tbody>
      </table></div>

<section className="proforma-summary-row">
  <div className="proforma-summary-card">
    <h2>Bill Summary</h2>

    <div>
      <span>Total MRP</span>
      <strong>{money(totalMrp)}</strong>
    </div>

    <div>
      <span>Item Discount</span>
      <strong>- {money(totalItemDiscount)}</strong>
    </div>

    {Number(record.billDiscountAmount || 0) > 0 && (
      <div>
        <span>Bill Discount</span>
        <strong>- {money(record.billDiscountAmount)}</strong>
      </div>
    )}

    <div>
      <span>Taxable Amount</span>
      <strong>{money(record.taxableAmount)}</strong>
    </div>

    {Number(record.cgstAmount || 0) > 0 && (
      <div>
        <span>CGST</span>
        <strong>{money(record.cgstAmount)}</strong>
      </div>
    )}

    {Number(record.sgstAmount || 0) > 0 && (
      <div>
        <span>SGST</span>
        <strong>{money(record.sgstAmount)}</strong>
      </div>
    )}

    {Number(record.igstAmount || 0) > 0 && (
      <div>
        <span>IGST</span>
        <strong>{money(record.igstAmount)}</strong>
      </div>
    )}

    <div>
      <span>Round Off</span>
      <strong>{money(record.roundOffAmount)}</strong>
    </div>

    <div className="grand-total">
      <span>Grand Total</span>
      <strong>{money(grandTotal)}</strong>
    </div>
  </div>
</section>

      <footer className="proforma-footer"><strong>Terms</strong><span>This is a proforma invoice and does not create a tax liability or deduct stock.</span></footer>
    </article>
  </div>;
}
