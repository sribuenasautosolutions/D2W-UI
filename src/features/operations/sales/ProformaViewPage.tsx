import { ProductUnitLabel } from "../../../components/ProductUnitFields";
import { printCleanDocument } from "../../../utils/cleanPrint";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Pencil, Phone, Printer } from "lucide-react";
import {
  getProforma,
  toProformaSaleSource,
} from "../../../services/proformaService";
import d2wLogo from "../../../assets/deals2wheels-logo100.png";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "—";
const displayNumber = (record) =>
  record?.proformaNumber?.startsWith("D2W-")
    ? record.proformaNumber
    : `D2W-${String(record?.storeName || "S")
        .trim()
        .charAt(0)
        .toUpperCase()}-${String(record?.id || 0).padStart(5, "0")}`;

export default function ProformaViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith("/owner/")
    ? "/owner/sales"
    : "/store/sales";
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProforma(id)
      .then(setRecord)
      .catch((e) =>
        setError(e?.response?.data?.message || "Proforma Invoice not found."),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] grid place-items-center text-slate-500 text-sm">
        Loading invoice…
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] grid place-items-center text-red-600 text-sm">
        {error}
      </div>
    );
  }

  const convert = () =>
    navigate(`${base}/new`, {
      state: { proforma: toProformaSaleSource(record) },
    });
  const gstin = String(record.customerGstin || "").trim();
  const gstType = String(record.customerGstRegistrationType || "").trim();
  const hasCustomerGst =
    Boolean(gstin) &&
    !/^unregistered/i.test(gstin) &&
    !/^unregistered/i.test(gstType);
  const showDiscount = (record.items || []).some(
    (item) =>
      Number(item.discountPercentage || 0) > 0 ||
      Number(item.discountAmount || 0) > 0,
  );

  const totalMrp = (record.items || []).reduce(
    (sum, item) => sum + Number(item.mrp || 0) * Number(item.quantity || 0),
    0,
  );

  const totalItemDiscount = (record.items || []).reduce(
    (sum, item) => sum + Number(item.discountAmount || 0),
    0,
  );

  const grandTotal = Number(record.netPayable || 0);

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#111827] pb-8 print:bg-white print:p-0">
      {/* Sticky top action header */}
      <header className="min-h-[66px] sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 px-6 border-b border-slate-200 bg-white print:hidden">
        <div className="flex items-center gap-3">
          <button
            className="w-9 h-9 grid place-items-center border border-slate-200 rounded-lg bg-white text-slate-500 hover:bg-slate-50 cursor-pointer"
            onClick={() => navigate(`${base}/proforma`)}
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="m-0 text-lg font-bold text-slate-900">
              Proforma Invoice
            </h1>
            <span className="block text-xs text-slate-500">
              {displayNumber(record)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {record.sourceLeadId && (
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm cursor-pointer hover:bg-blue-700"
              onClick={() => navigate(`${base}/proforma/${record.id}/lead`)}
            >
              Customer decision and sales
            </button>
          )}
          <button
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-50 inline-flex items-center gap-2"
            onClick={() => printCleanDocument()}
          >
            <Printer size={15} /> PDF / Print
          </button>
          {!record.sourceLeadId && record.status === "SAVED" && (
            <button
              className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-50 inline-flex items-center gap-2"
              onClick={() => navigate(`${base}/proforma/${record.id}/edit`)}
            >
              <Pencil size={15} /> Edit
            </button>
          )}
          {!record.sourceLeadId && record.status === "SAVED" && (
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm cursor-pointer hover:bg-blue-700 inline-flex items-center gap-2"
              onClick={convert}
            >
              Convert to Sale
            </button>
          )}
        </div>
      </header>

      {/* Invoice Sheet */}
      <article className="w-[min(1050px,calc(100%-48px))] mx-auto my-6 p-8 border border-slate-200 rounded-xl bg-white shadow-sm print:w-full print:m-0 print:p-5 print:border-none print:shadow-none">
        <h1 className="m-0 text-center font-serif text-3xl tracking-wide text-slate-900">
          PROFORMA INVOICE
        </h1>
        <p className="mt-1 mb-7 text-center text-red-700 text-[10px] font-extrabold tracking-widest print:text-black">
          NOT A TAX INVOICE
        </p>

        {/* Letterhead */}
        <section className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="grid content-start gap-1 min-w-0">
            <small className="mb-1 text-slate-500 text-[10px] font-bold tracking-wider uppercase">
              BILL FROM
            </small>
            <strong className="font-serif text-xl font-semibold text-slate-900">
              {record.storeName}
            </strong>
            <span className="flex items-start gap-2 text-slate-600 text-xs">
              <MapPin size={12} className="mt-0.5 flex-shrink-0" />
              {record.storeAddress || "Address not available"}
            </span>
            <span className="text-slate-600 text-xs">
              GSTIN {record.storeGstin || "—"}
            </span>
          </div>

          <div className="w-full sm:w-[330px] flex flex-col items-start sm:items-end gap-3">
            <img
              src={d2wLogo}
              alt="Deals2Wheels"
              className="block w-[170px] h-16 object-contain self-start sm:self-end"
            />
            <dl className="w-full grid gap-1.5 m-0 text-xs">
              <div className="grid grid-cols-[125px_1fr] gap-3">
                <dt className="text-slate-500">Proforma Number</dt>
                <dd className="m-0 text-right font-bold text-slate-900 break-all">
                  {displayNumber(record)}
                </dd>
              </div>
              <div className="grid grid-cols-[125px_1fr] gap-3">
                <dt className="text-slate-500">Proforma Date</dt>
                <dd className="m-0 text-right font-bold text-slate-900">
                  {date(record.invoiceDate)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Bill To */}
        <section className="mt-6 pb-6 border-b border-slate-200 grid content-start gap-1">
          <small className="mb-1 text-slate-500 text-[10px] font-bold tracking-wider uppercase">
            BILL TO
          </small>
          <strong className="font-serif text-lg font-semibold text-slate-900">
            {record.customerName}
          </strong>
          {record.billingAddress && (
            <span className="flex items-start gap-2 text-slate-600 text-xs">
              <MapPin size={12} className="mt-0.5 flex-shrink-0" />
              {record.billingAddress}
            </span>
          )}
          {record.customerMobile && (
            <span className="flex items-center gap-2 text-slate-600 text-xs">
              <Phone size={12} />
              {record.customerMobile}
            </span>
          )}
          {record.customerEmail && (
            <span className="flex items-center gap-2 text-slate-600 text-xs">
              <Mail size={12} />
              {record.customerEmail}
            </span>
          )}
          {hasCustomerGst && (
            <span className="text-slate-600 text-xs">GSTIN {gstin}</span>
          )}
          {hasCustomerGst && gstType && (
            <span className="text-slate-600 text-xs">GST Type {gstType}</span>
          )}
          {record.shippingAddress && (
            <span className="text-slate-600 text-xs">
              Shipping Address: {record.shippingAddress}
            </span>
          )}
          {record.placeOfSupply && (
            <span className="text-slate-600 text-xs">
              Place of Supply: {record.placeOfSupply}
            </span>
          )}
        </section>

        {/* Items Table */}
        <div className="mt-6 overflow-x-auto border border-slate-200 rounded-lg print:overflow-visible">
          <table className="w-full min-w-[850px] border-collapse font-sans text-xs print:min-w-0">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-2.5 text-center font-bold text-[9.5px] uppercase tracking-wider text-slate-600">
                  S.No
                </th>
                <th className="p-2.5 text-left font-bold text-[9.5px] uppercase tracking-wider text-slate-600">
                  Part Details
                </th>
                <th className="p-2.5 text-center font-bold text-[9.5px] uppercase tracking-wider text-slate-600">
                  HSN
                </th>
                <th className="p-2.5 text-center font-bold text-[9.5px] uppercase tracking-wider text-slate-600">
                  Qty
                </th>
                <th className="p-2.5 text-right font-bold text-[9.5px] uppercase tracking-wider text-slate-600">
                  Rate
                </th>
                <th className="p-2.5 text-right font-bold text-[9.5px] uppercase tracking-wider text-slate-600">
                  MRP
                </th>
                {showDiscount && (
                  <th className="p-2.5 text-right font-bold text-[9.5px] uppercase tracking-wider text-slate-600">
                    Discount
                  </th>
                )}
                <th className="p-2.5 text-right font-bold text-[9.5px] uppercase tracking-wider text-slate-600">
                  GST
                </th>
                <th className="p-2.5 text-right font-bold text-[9.5px] uppercase tracking-wider text-slate-600">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {(record.items || []).map((item, index) => (
                <tr
                  key={`${item.id || item.inventoryId}-${index}`}
                  className="border-b border-slate-100 text-[#111827] print:break-inside-avoid"
                >
                  <td className="p-2.5 text-center align-top">{index + 1}</td>
                  <td className="p-2.5 text-left align-top">
                    <strong className="block text-xs font-bold text-slate-900">
                      {item.partNumber || "—"}
                    </strong>
                    <span className="block text-[11px] text-slate-600 mt-0.5">
                      {item.itemName}
                    </span>
                    <ProductUnitLabel product={item} />
                    <small className="block text-slate-500 text-[10px] mt-0.5">
                      {item.brandName}
                    </small>
                    {record.sourceLeadId && (
                      <>
                        <small className="block text-slate-500 text-[10px]">
                          {item.description}
                        </small>
                        <small className="block text-slate-500 text-[10px]">
                          {item.availabilityStatus?.replaceAll("_", " ")}
                          {item.estimatedAvailabilityDate
                            ? ` · Expected ${date(item.estimatedAvailabilityDate)}`
                            : ""}
                        </small>
                      </>
                    )}
                  </td>
                  <td className="p-2.5 text-center align-top">
                    {item.hsnCode || "—"}
                  </td>
                  <td className="p-2.5 text-center align-top whitespace-nowrap">
                    {Number(item.quantity || 0)} {item.stockUnit || "PCS"}
                  </td>
                  <td className="p-2.5 text-right align-top whitespace-nowrap">
                    {money(item.unitPrice)}
                  </td>
                  <td className="p-2.5 text-right align-top whitespace-nowrap">
                    {money(item.mrp)}
                  </td>
                  {showDiscount && (
                    <td className="p-2.5 text-right align-top whitespace-nowrap">
                      <span>{Number(item.discountPercentage || 0)}%</span>
                      <small className="block text-slate-500 text-[10px]">
                        {money(item.discountAmount)}
                      </small>
                    </td>
                  )}
                  <td className="p-2.5 text-right align-top whitespace-nowrap">
                    <span>{Number(item.gstPercentage || 0)}%</span>
                    <small className="block text-slate-500 text-[10px]">
                      {money(
                        Number(item.cgstAmount || 0) +
                          Number(item.sgstAmount || 0) +
                          Number(item.igstAmount || 0),
                      )}
                    </small>
                  </td>
                  <td className="p-2.5 text-right align-top whitespace-nowrap font-semibold">
                    {money(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Row */}
        <section className="flex justify-end mt-6 print:break-inside-avoid">
          <div className="w-full sm:w-[390px] border border-slate-200 rounded-lg overflow-hidden">
            <h2 className="m-0 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
              Bill Summary
            </h2>
            <div className="flex justify-between gap-4 px-4 py-2 border-b border-slate-100 text-xs text-slate-600">
              <span>Total MRP</span>
              <strong className="text-slate-900">{money(totalMrp)}</strong>
            </div>
            <div className="flex justify-between gap-4 px-4 py-2 border-b border-slate-100 text-xs text-slate-600">
              <span>Item Discount</span>
              <strong className="text-slate-900">
                - {money(totalItemDiscount)}
              </strong>
            </div>
            {Number(record.billDiscountAmount || 0) > 0 && (
              <div className="flex justify-between gap-4 px-4 py-2 border-b border-slate-100 text-xs text-slate-600">
                <span>Bill Discount</span>
                <strong className="text-slate-900">
                  - {money(record.billDiscountAmount)}
                </strong>
              </div>
            )}
            <div className="flex justify-between gap-4 px-4 py-2 border-b border-slate-100 text-xs text-slate-600">
              <span>Taxable Amount</span>
              <strong className="text-slate-900">
                {money(record.taxableAmount)}
              </strong>
            </div>
            {Number(record.cgstAmount || 0) > 0 && (
              <div className="flex justify-between gap-4 px-4 py-2 border-b border-slate-100 text-xs text-slate-600">
                <span>CGST</span>
                <strong className="text-slate-900">
                  {money(record.cgstAmount)}
                </strong>
              </div>
            )}
            {Number(record.sgstAmount || 0) > 0 && (
              <div className="flex justify-between gap-4 px-4 py-2 border-b border-slate-100 text-xs text-slate-600">
                <span>SGST</span>
                <strong className="text-slate-900">
                  {money(record.sgstAmount)}
                </strong>
              </div>
            )}
            {Number(record.igstAmount || 0) > 0 && (
              <div className="flex justify-between gap-4 px-4 py-2 border-b border-slate-100 text-xs text-slate-600">
                <span>IGST</span>
                <strong className="text-slate-900">
                  {money(record.igstAmount)}
                </strong>
              </div>
            )}
            <div className="flex justify-between gap-4 px-4 py-2 border-b border-slate-100 text-xs text-slate-600">
              <span>Round Off</span>
              <strong className="text-slate-900">
                {money(record.roundOffAmount)}
              </strong>
            </div>
            <div className="flex justify-between items-center px-4 py-3 bg-[#eef4ff] text-[#1d4ed8] font-bold text-sm">
              <span>Grand Total</span>
              <strong className="text-base">{money(grandTotal)}</strong>
            </div>
          </div>
        </section>

        <footer className="grid gap-1 mt-6 pt-4 border-t border-slate-200 text-slate-500 text-[11px]">
          <strong className="text-slate-700">Terms</strong>
          <span>
            This is a proforma invoice and does not create a tax liability or
            deduct stock.
          </span>
        </footer>
      </article>
    </div>
  );
}
