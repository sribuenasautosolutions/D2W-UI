import { ProductUnitLabel } from "../../../../components/ProductUnitFields";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import apiclient from "../../../../services/apiclient";
import { printDisplayedInvoice } from "./utils/printInvoice";
import { downloadDisplayedInvoicePdf } from "./utils/invoicePdf";

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const date = (value, withTime = false) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  const formatted = parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return withTime
    ? `${formatted}, ${parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
    : formatted;
};

const wordsBelowThousand = (number) => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  if (!number) return "";
  if (number < 20) return ones[number];
  if (number < 100)
    return `${tens[Math.floor(number / 10)]} ${ones[number % 10]}`.trim();
  return `${ones[Math.floor(number / 100)]} Hundred ${wordsBelowThousand(number % 100)}`.trim();
};

const amountInWords = (value) => {
  let amount = Math.floor(Number(value || 0));
  if (!amount) return "Indian Rupees Zero Only";
  const groups: [number, string][] = [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
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

const text = (value) =>
  value === null || value === undefined || value === "" ? "-" : value;

const paymentSummary = (payments) => {
  const methods = [
    ...new Set<string>(
      (payments || [])
        .map((payment: any) => String(payment.paymentMethod || ""))
        .filter(Boolean),
    ),
  ];
  return methods.length
    ? methods.map((method) => method.replaceAll("_", " ")).join(" + ")
    : "Not paid";
};

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

const itemTaxable = (item) => {
  if (item.taxableAmount !== undefined && item.taxableAmount !== null)
    return item.taxableAmount;
  const gross = Number(item.sellingPrice || 0) * Number(item.quantity || 0);
  return gross - Number(item.discountAmount || 0);
};

const itemHsn = (item) =>
  item.hsncode ?? item.hsnCode ?? item.hsn_code ?? item.hsn;

function InfoLine({ label, value }) {
  return (
    <div className="grid grid-cols-[1fr_1.25fr] gap-2 text-[10.5px] py-0.5">
      <span className="text-slate-500">{label}</span>
      <strong className="text-right font-bold text-slate-900">
        {text(value)}
      </strong>
    </div>
  );
}

function TotalLine({ label, value, subtract = false, strong = false }) {
  return (
    <div
      className={`flex justify-between gap-5 text-[10.5px] py-1 text-slate-900 ${strong ? "border-t border-slate-300 mt-1 pt-2 font-bold" : ""}`}
    >
      <span className="text-slate-600">{label}</span>
      <strong className="font-bold">
        {subtract ? "(-) " : ""}
        {"\u20B9"} {money(value)}
      </strong>
    </div>
  );
}

const COLUMN_WIDTHS_WITH_DISCOUNT = [4, 30, 8, 5, 8, 8, 8, 9, 7, 13];
const COLUMN_WIDTHS_NO_DISCOUNT = [4, 35, 8, 5, 9, 9, 10, 7, 13];

export default function InvoicePage({
  orderIdOverride = undefined,
  embedded = false,
}: any = {}) {
  const { orderId: routeOrderId } = useParams();
  const orderId = orderIdOverride || routeOrderId;
  const navigate = useNavigate();
  const location = useLocation();
  const printedOrder = useRef(null);
  const invoiceSheet = useRef(null);
  const printInProgress = useRef(false);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const invoiceRequest = useRef(0);
  const pdfInProgress = useRef(false);
  const currentOrder = useRef(orderId);

  const loadInvoice = useCallback(async () => {
    const version = ++invoiceRequest.current;
    setLoading(true);
    setInvoice(null);
    setError("");
    try {
      if (!orderId) throw new Error("Invoice identifier is missing.");
      const response = await apiclient.get(`/orders/${orderId}`, {
        timeout: 20000,
      });
      if (invoiceRequest.current === version) setInvoice(response.data);
    } catch (requestError) {
      if (invoiceRequest.current === version)
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Unable to load this invoice.",
        );
    } finally {
      if (invoiceRequest.current === version) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadInvoice();
    setPdfError("");
    setPdfLoading(false);
    return () => {
      invoiceRequest.current += 1;
    };
  }, [loadInvoice]);
  useEffect(() => {
    currentOrder.current = orderId;
    return () => {
      currentOrder.current = null;
    };
  }, [orderId]);

  const handlePrint = useCallback(async () => {
    if (!invoiceSheet.current || printInProgress.current) return;
    printInProgress.current = true;
    setPdfError("");
    try {
      await printDisplayedInvoice(invoiceSheet.current);
    } catch (error) {
      setPdfError(error.message || "Unable to print invoice. Please retry.");
    } finally {
      printInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    if (
      !location.state?.autoPrint ||
      loading ||
      error ||
      !invoice ||
      String(invoice.orderId) !== String(orderId) ||
      printedOrder.current === orderId
    )
      return;
    const timer = window.setTimeout(() => {
      printedOrder.current = orderId;
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, autoPrint: false },
      });
      handlePrint();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [
    invoice,
    loading,
    error,
    orderId,
    location.pathname,
    location.state,
    navigate,
    handlePrint,
  ]);

  const items = useMemo(() => invoice?.items || [], [invoice]);
  const payments = useMemo(() => invoice?.payments || [], [invoice]);
  const collectedBy = useMemo(
    () => invoice?.collectedByName || loggedInUserName(),
    [invoice],
  );

  const hasDiscount = useMemo(
    () => items.some((item) => Number(item.discountAmount || 0) > 0),
    [items],
  );
  const colWidths = hasDiscount
    ? COLUMN_WIDTHS_WITH_DISCOUNT
    : COLUMN_WIDTHS_NO_DISCOUNT;
  const columnCount = colWidths.length;

  const handleSavePdf = async () => {
    if (pdfInProgress.current || !invoiceSheet.current) return;
    const id = orderId;
    const node = invoiceSheet.current;
    pdfInProgress.current = true;
    setPdfLoading(true);
    setPdfError("");
    try {
      const filename =
        (invoice.invoiceNumber || "invoice-" + orderId).replace(
          /[^a-zA-Z0-9_-]/g,
          "_",
        ) + ".pdf";
      await downloadDisplayedInvoicePdf(
        node,
        filename,
        () => currentOrder.current === id,
      );
    } catch (requestError) {
      if (currentOrder.current === id)
        setPdfError(requestError.message || "Unable to save the invoice PDF.");
    } finally {
      pdfInProgress.current = false;
      if (currentOrder.current === id) setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100 font-bold text-slate-700">
        Loading invoice...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100 text-red-700 font-bold">
        <div className="text-center">
          <p className="mb-2">{error || "Invoice not found."}</p>
          <button
            className="h-[38px] border border-slate-400 rounded bg-white text-slate-900 px-4 inline-flex items-center gap-2 font-bold cursor-pointer hover:bg-slate-50"
            onClick={loadInvoice}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef0f2] p-4 sm:px-6 sm:py-5 pb-9 text-[#1a1a1a] font-sans print:bg-white print:p-0">
      {/* Action Toolbar */}
      <nav className="w-full max-w-[210mm] mx-auto mb-3 flex items-center justify-between gap-2 print:hidden">
        {!embedded && (
          <button
            className="h-[38px] border border-[#b7b7b7] rounded bg-white text-[#1a1a1a] px-4 inline-flex items-center gap-2 font-bold text-sm cursor-pointer hover:bg-slate-50"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {invoice.orderStatus === "PENDING_PAYMENT" &&
            Number(invoice.balanceAmount) > 0 && (
              <button
                className="h-[38px] border border-[#1a1a1a] rounded bg-[#1a1a1a] text-white px-4 inline-flex items-center gap-2 font-bold text-sm cursor-pointer hover:bg-slate-800"
                onClick={() => {
                  const base = location.pathname.startsWith("/owner/")
                    ? "/owner/sales"
                    : location.pathname.startsWith("/store/")
                      ? "/store/sales"
                      : "/pos";
                  navigate(`${base}/payment/${orderId}`);
                }}
              >
                Collect Payment
              </button>
            )}
          <button
            className="h-[38px] border border-[#b7b7b7] rounded bg-white text-[#1a1a1a] px-4 inline-flex items-center gap-2 font-bold text-sm cursor-pointer hover:bg-slate-50"
            onClick={handlePrint}
          >
            <Printer size={16} />
            Print
          </button>
          <button
            className="h-[38px] border border-[#b7b7b7] rounded bg-white text-[#1a1a1a] px-4 inline-flex items-center gap-2 font-bold text-sm cursor-pointer hover:bg-slate-50 disabled:opacity-50"
            disabled={pdfLoading}
            onClick={handleSavePdf}
          >
            <Download size={16} />
            {pdfLoading ? "Saving PDF…" : "Save PDF"}
          </button>
        </div>
      </nav>

      {pdfError && (
        <div
          className="max-w-[210mm] mx-auto mb-3 text-red-700 p-2.5 bg-red-50 border border-red-200 text-xs font-semibold print:hidden"
          role="alert"
        >
          {pdfError}
        </div>
      )}

      {/* Invoice Sheet */}
      <article
        id="invoice-export-sheet"
        ref={invoiceSheet}
        className="w-full max-w-[210mm] min-h-[297mm] mx-auto p-[13mm_13mm_11mm] bg-white border border-[#d7d7d7] shadow-[0_2px_10px_rgba(0,0,0,0.12)] print:border-none print:shadow-none print:m-0 print:w-full print:min-h-0 print:p-0"
      >
        <header className="grid grid-cols-[1.45fr_0.75fr] gap-6 pb-4 border-b-2 border-[#1a1a1a]">
          <div className="flex gap-4 items-start">
            <div className="text-[26px] font-extrabold leading-none text-[#1a1a1a] tracking-[0.02em] pt-1">
              D2W
            </div>
            <div>
              <h1 className="text-[19px] font-bold text-[#1a1a1a] m-0 mb-1">
                {text(invoice.storeName)}
              </h1>
              <p className="text-[10.5px] font-bold text-[#1a1a1a] my-0.5">
                Deals 2 Wheels
              </p>
              <p className="text-[10.5px] text-[#333] my-0.5">
                {invoice.storePhone && `Phone: ${invoice.storePhone}`}
                {invoice.storePhone && invoice.storeEmail && "  |  "}
                {invoice.storeEmail && `Email: ${invoice.storeEmail}`}
              </p>
              <p className="text-[10.5px] font-bold text-[#1a1a1a] my-0.5">
                <span className="font-extrabold">GSTIN:</span>{" "}
                {text(invoice.storeGstno)}
              </p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-[0.03em] text-right text-[#1a1a1a] m-0 mb-2">
              TAX INVOICE
            </h2>
            <InfoLine label="Invoice No." value={invoice.invoiceNumber} />
            <InfoLine label="Invoice Date" value={date(invoice.orderDate)} />
            <InfoLine label="Order No." value={`#${invoice.orderId}`} />
          </div>
        </header>

        <section className="grid grid-cols-2 border-b border-[#b7b7b7]">
          <div className="py-3 pr-6 pb-4">
            <h3 className="text-[10px] tracking-[0.09em] font-extrabold text-[#1a1a1a] m-0 mb-2 uppercase">
              BILL TO
            </h3>
            <strong className="text-xs font-bold text-[#1a1a1a] block">
              {text(invoice.customerName)}
            </strong>
            <p className="text-[10.5px] text-[#333] my-1">
              Mobile: {text(invoice.phone)}
            </p>
            {invoice.saleType === "B2B" && (
              <>
                <p className="text-[10.5px] text-[#333] my-1">
                  GSTIN: {text(invoice.customerGstin)}
                </p>
                <p className="text-[10.5px] text-[#333] my-1">
                  Registration:{" "}
                  {text(invoice.customerGstRegistrationType)?.replaceAll?.(
                    "_",
                    " ",
                  )}
                </p>
                <p className="text-[10.5px] text-[#333] my-1">
                  State / Place of Supply:{" "}
                  {text(invoice.placeOfSupply || invoice.customerState)}
                </p>
                <p className="text-[10.5px] text-[#333] my-1">
                  Billing Address:{" "}
                  {text(invoice.billingAddress || invoice.customerAddress)}
                </p>
                {invoice.shippingAddress && (
                  <p className="text-[10.5px] text-[#333] my-1">
                    Shipping Address: {invoice.shippingAddress}
                  </p>
                )}
                {invoice.customerEmail && (
                  <p className="text-[10.5px] text-[#333] my-1">
                    Email: {invoice.customerEmail}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="py-3 pl-6 pb-4 border-l border-[#b7b7b7]">
            <h3 className="text-[10px] tracking-[0.09em] font-extrabold text-[#1a1a1a] m-0 mb-2 uppercase">
              INVOICE DETAILS
            </h3>
            <InfoLine
              label="Order Date"
              value={date(invoice.orderDate, true)}
            />
            <InfoLine label="Payment" value={paymentSummary(payments)} />
            <InfoLine
              label="Status"
              value={invoice.orderStatus?.replaceAll("_", " ")}
            />
            <InfoLine label="Collected By" value={collectedBy} />
          </div>
        </section>

        <section className="mt-4">
          <table className="table-fixed w-full border-collapse text-[10.5px]">
            <colgroup>
              {colWidths.map((width, index) => (
                <col key={index} style={{ width: `${width}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-[#1a1a1a] text-white">
                <th className="py-2 px-1 text-left font-bold uppercase text-[9px] tracking-[0.02em] whitespace-nowrap">
                  S.No
                </th>
                <th className="py-2 px-1 text-left font-bold uppercase text-[9px] tracking-[0.02em]">
                  Item Description
                </th>
                <th className="py-2 px-1 text-left font-bold uppercase text-[9px] tracking-[0.02em] whitespace-nowrap">
                  Brand
                </th>
                <th className="py-2 px-1 text-right font-bold uppercase text-[9px] tracking-[0.02em] whitespace-nowrap">
                  Qty
                </th>
                <th className="py-2 px-1 text-right font-bold uppercase text-[9px] tracking-[0.02em] whitespace-nowrap">
                  MRP
                </th>
                <th className="py-2 px-1 text-right font-bold uppercase text-[9px] tracking-[0.02em] whitespace-nowrap">
                  Rate
                </th>
                {hasDiscount && (
                  <th className="py-2 px-1 text-right font-bold uppercase text-[9px] tracking-[0.02em] whitespace-nowrap">
                    Discount
                  </th>
                )}
                <th className="py-2 px-1 text-right font-bold uppercase text-[9px] tracking-[0.02em] whitespace-nowrap">
                  Taxable
                </th>
                <th className="py-2 px-1 text-right font-bold uppercase text-[9px] tracking-[0.02em] whitespace-nowrap">
                  GST %
                </th>
                <th className="py-2 px-1 text-right font-bold uppercase text-[9px] tracking-[0.02em] whitespace-nowrap">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={`${item.batchId || "item"}-${index}`}
                  className="border-b border-[#d7d7d7] text-[#1a1a1a]"
                >
                  <td className="p-2 align-top">{index + 1}</td>
                  <td className="p-2 align-top break-words">
                    <strong className="font-bold text-[#1a1a1a]">
                      {text(item.itemName || item.productName)}
                    </strong>
                    {item.stockUnit && item.stockUnit !== "PCS" && (
                      <ProductUnitLabel product={item} />
                    )}
                    <small className="block mt-0.5 text-[#555] font-normal text-[9.5px]">
                      Part No: {text(item.partNumber)} &nbsp;|&nbsp; HSN:{" "}
                      {text(itemHsn(item))}
                    </small>
                  </td>
                  <td className="p-2 align-top">{text(item.brandName)}</td>
                  <td className="p-2 align-top text-right whitespace-nowrap">
                    {text(item.quantity)} {item.stockUnit || "PCS"}
                  </td>
                  <td className="p-2 align-top text-right whitespace-nowrap">
                    {money(item.mrp ?? item.sellingPrice)}
                  </td>
                  <td className="p-2 align-top text-right whitespace-nowrap">
                    {money(item.sellingPrice)}
                  </td>
                  {hasDiscount && (
                    <td className="p-2 align-top text-right whitespace-nowrap">
                      {Number(item.discountAmount || 0) > 0
                        ? `${money(item.discountAmount)} (${Number(item.discountPercentage || 0)}%)`
                        : "-"}
                    </td>
                  )}
                  <td className="p-2 align-top text-right whitespace-nowrap">
                    {money(itemTaxable(item))}
                  </td>
                  <td className="p-2 align-top text-right whitespace-nowrap">
                    {Number(item.gstPercentage || 0)}%
                  </td>
                  <td className="p-2 align-top text-right whitespace-nowrap">
                    <strong>{money(item.totalPrice)}</strong>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="p-4 text-center text-[#555]"
                  >
                    No invoice items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="text-[11px] font-normal text-[#1a1a1a] pt-2 border-t-2 border-[#1a1a1a]">
            Total Items: {items.length}
          </div>
        </section>

        <section className="grid grid-cols-[1.1fr_0.9fr] border-t border-[#999] mt-4">
          <div className="pt-3 pr-6">
            {payments.length > 0 && (
              <div className="mt-0.5">
                <h3 className="text-[10px] tracking-[0.09em] font-extrabold text-[#1a1a1a] m-0 mb-2 uppercase">
                  PAYMENT DETAILS
                </h3>
                {payments.map((payment, index) => (
                  <div
                    key={payment.id || index}
                    className="grid grid-cols-[1fr_auto] gap-1 text-[9.5px] py-1 border-b border-[#e2e2e2] text-[#1a1a1a]"
                  >
                    <span className="text-[#333]">
                      {date(payment.paymentDate)} -{" "}
                      {text(payment.paymentMethod)?.replaceAll?.("_", " ") ||
                        "-"}
                    </span>
                    <strong className="font-bold text-[#1a1a1a]">
                      {"\u20B9"} {money(payment.amount)}
                    </strong>
                    {payment.transactionNumber && (
                      <small className="col-span-full text-[#555]">
                        {payment.transactionNumber}
                      </small>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3">
              <h3 className="text-[10px] tracking-[0.09em] font-extrabold text-[#1a1a1a] m-0 mb-2 uppercase">
                TERMS &amp; CONDITIONS
              </h3>
              <ol className="pl-4 m-0 text-[9px] leading-relaxed text-[#444] list-decimal">
                <li>Goods once sold cannot be returned or exchanged.</li>
                <li>
                  Warranty is subject to the manufacturer or brand policy.
                </li>
                <li>Disputes are subject to the store's local jurisdiction.</li>
              </ol>
            </div>
          </div>

          <div className="pt-3 pl-4 border-l border-[#999]">
            <TotalLine label="Gross Amount" value={invoice.grossAmount} />
            {Number(invoice.itemDiscountAmount) > 0 && (
              <TotalLine
                label="Item Discount"
                value={invoice.itemDiscountAmount}
                subtract
              />
            )}
            {Number(invoice.billDiscountAmount) > 0 && (
              <TotalLine
                label={`Bill Discount (${Number(invoice.billDiscountPercentage || 0)}%)`}
                value={invoice.billDiscountAmount}
                subtract
              />
            )}
            <TotalLine
              label="Taxable Amount"
              value={invoice.taxableAmount}
              strong
            />
            {Number(invoice.cgstAmount) > 0 && (
              <TotalLine label="CGST" value={invoice.cgstAmount} />
            )}
            {Number(invoice.sgstAmount) > 0 && (
              <TotalLine label="SGST" value={invoice.sgstAmount} />
            )}
            {Number(invoice.igstAmount) > 0 && (
              <TotalLine label="IGST" value={invoice.igstAmount} />
            )}
            <TotalLine label="Round Off" value={invoice.roundOffAmount} />
            <div className="flex justify-between items-center bg-[#f6f6f6] border-y-2 border-[#1a1a1a] p-3 my-2 text-[#1a1a1a] font-black">
              <span>GRAND TOTAL</span>
              <strong className="text-base text-[#c0392b]">
                {"\u20B9"} {money(invoice.totalAmount)}
              </strong>
            </div>
            <div className="py-2 pb-3 border-b border-dashed border-[#d7d7d7] mb-2">
              <h3 className="text-[10px] tracking-[0.09em] font-extrabold text-[#1a1a1a] m-0 mb-1 uppercase">
                AMOUNT IN WORDS
              </h3>
              <p className="text-[10.5px] font-bold m-0 text-[#1a1a1a]">
                {amountInWords(invoice.totalAmount)}
              </p>
            </div>
            <TotalLine label="Paid Amount" value={invoice.paidAmount} />
            <TotalLine
              label="Balance Due"
              value={invoice.balanceAmount}
              strong
            />
          </div>
        </section>

        <footer className="grid grid-cols-2 gap-10 mt-9">
          <div className="border-t border-dashed border-[#666] pt-1 text-center text-[9.5px] text-[#333]">
            <span>Customer Signature</span>
          </div>
          <div className="border-t border-dashed border-[#666] pt-1 text-center text-[9.5px] text-[#333]">
            <span>Authorized Signatory</span>
          </div>
        </footer>
        <p className="text-center text-[8.5px] text-[#666] mt-7">
          This is a computer-generated invoice.
        </p>
      </article>
    </main>
  );
}
