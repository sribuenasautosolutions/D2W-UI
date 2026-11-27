import { useCallback, useEffect, useState } from "react";
import { ProductUnitLabel } from "./ProductUnitFields";
import "./InvoiceThemeSwitch.css";

// To add a theme: add an entry here and a matching [data-template="<key>"]
// block of CSS variables in InvoicePage.css and ProformaPage.css.
export const DEFAULT_INVOICE_THEME = "sale";

export const INVOICE_THEMES = [
  { key: "sale", label: "Modern Violet (Default)" },
  { key: "navy", label: "Theme1 (Navy)" },
  { key: "soft", label: "Theme2 (Soft)" },
  { key: "charcoal", label: "Charcoal ERP" },
  { key: "landscape", label: "Landscape ERP" },
];
const _UNUSED_THEMES = [
  { key: "sale", label: "Modern ERP (Default)" },
  { key: "navy", label: "Theme1" },
  { key: "soft", label: "Theme2" },
];

const STORAGE_KEY = "invoiceTheme";
const PRINT_SETTINGS_KEY = "invoicePrintSettings";
const PRINT_SETTINGS_EVENT = "d2w:print-settings-changed";
const isValid = (value) => INVOICE_THEMES.some((theme) => theme.key === value);

export const DEFAULT_PRINT_SETTINGS = {
  themeKey: DEFAULT_INVOICE_THEME,
  accentColor: "", // empty = use theme default (#5c6bc0 / #374151)
  paperSize: "A4",
  orientation: "portrait",
  textSize: "medium",
  showLogo: true,
  showShipTo: true,
  showDiscountCol: true,
  showPayments: true,
  showAmountInWords: true,
  showTerms: true,
  showCustomerSignature: true,
  showFooterNote: true,
};

const readTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isValid(stored) ? stored : DEFAULT_INVOICE_THEME;
  } catch {
    return DEFAULT_INVOICE_THEME;
  }
};

export const readPrintSettings = () => {
  const fallbackTheme = readTheme();
  try {
    const raw = localStorage.getItem(PRINT_SETTINGS_KEY);
    if (!raw) {
      return {
        ...DEFAULT_PRINT_SETTINGS,
        themeKey: fallbackTheme,
        orientation: fallbackTheme === "landscape" ? "landscape" : "portrait",
      };
    }
    const parsed = JSON.parse(raw);
    const themeKey = isValid(parsed?.themeKey) ? parsed.themeKey : fallbackTheme;
    return {
      ...DEFAULT_PRINT_SETTINGS,
      ...parsed,
      themeKey,
    };
  } catch {
    return { ...DEFAULT_PRINT_SETTINGS, themeKey: fallbackTheme };
  }
};

export function usePrintSettings() {
  const [settings, setSettings] = useState(readPrintSettings);

  const persist = useCallback((next) => {
    setSettings(next);
    try {
      localStorage.setItem(PRINT_SETTINGS_KEY, JSON.stringify(next));
      localStorage.setItem(STORAGE_KEY, next.themeKey);
      window.dispatchEvent(new CustomEvent(PRINT_SETTINGS_EVENT, { detail: next }));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const updateSettings = useCallback(
    (patch) => {
      const current = readPrintSettings();
      const merged = typeof patch === "function" ? patch(current) : { ...current, ...patch };
      if (!isValid(merged.themeKey)) merged.themeKey = DEFAULT_INVOICE_THEME;
      persist(merged);
    },
    [persist]
  );

  const resetSettings = useCallback(() => {
    persist({ ...DEFAULT_PRINT_SETTINGS });
  }, [persist]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === PRINT_SETTINGS_KEY || event.key === STORAGE_KEY) {
        setSettings(readPrintSettings());
      }
    };
    const onCustom = (event) => {
      if (event.detail) setSettings(event.detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(PRINT_SETTINGS_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PRINT_SETTINGS_EVENT, onCustom);
    };
  }, []);

  return { settings, updateSettings, resetSettings };
}

// One shared choice for the tax invoice and the proforma, remembered in this browser.
export function useInvoiceTheme() {
  const { settings, updateSettings } = usePrintSettings();

  const setTheme = useCallback(
    (key) => {
      if (!isValid(key)) return;
      updateSettings({
        themeKey: key,
        orientation: key === "landscape" ? "landscape" : "portrait",
      });
    },
    [updateSettings]
  );

  return { themeKey: settings.themeKey, setTheme };
}

export default function InvoiceThemeSwitch({ themeKey, onChange, themes = INVOICE_THEMES }) {
  return (
    <div className="invoice-theme-switch" role="radiogroup" aria-label="Invoice layout">
      {themes.map((theme) => (
        <button
          key={theme.key}
          type="button"
          role="radio"
          aria-checked={themeKey === theme.key}
          className={`invoice-theme-switch__btn${themeKey === theme.key ? " is-active" : ""}`}
          onClick={() => onChange(theme.key)}
        >
          {theme.label}
        </button>
      ))}
    </div>
  );
}

/* ================================================================== */
/* The "Sale" layout, shared by the tax invoice and the proforma.        */
/* ================================================================== */
// One "Sale" layout used by BOTH the tax invoice and the proforma.
// Each page converts its own API data into the `doc` object below, so every
// field of the other themes can be shown here without duplicating markup.
//
// doc = {
//   title, notice, logo, detailsTitle,
//   store: { name, lines: [string] },
//   billTo: { name, lines: [string] },
//   shipTo: { lines: [string] },
//   details: [{ label, value, tone? }],          // tone => status badge
//   showDiscount,
//   items: [{ key, raw, name, showUnit, partNo, hsn, brand, qty, mrp, rate,
//             discountAmount, discountPct, taxable, gst, gstPct, amount, extras? }],
//   totals: { qty, discount, taxable, gst, amount },
//   payments: [{ key, label, amount, ref }],
//   description, words, dueDate, terms: [string], bank: [string],
//   summary: [{ label, value, subtract?, strong?, bar? }],
//   customerSignature, footerNote
// }

const saleMoney = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const saleDash = (value) => value === null || value === undefined || value === "" ? "-" : value;
const SALE_RUPEE = "\u20B9";

// Column widths (percent). Each array adds up to 100.
// Tax invoice: #, Item Description, Brand, Qty, MRP, Rate, [Discount], Taxable, GST, Amount
const SALE_WIDTHS_WITH_DISCOUNT = [5, 21, 10, 6, 9, 9, 11, 9, 10, 10];
const SALE_WIDTHS_NO_DISCOUNT = [5, 28, 11, 6, 10, 10, 10, 10, 10];
// Proforma: S.No, Part Details, Brand, HSN, Qty, Rate, MRP, [Discount], GST, Amount
const SALE_WIDTHS_PROFORMA_WITH_DISCOUNT = [4, 24, 10, 8, 6, 10, 10, 9, 8, 11];
const SALE_WIDTHS_PROFORMA_NO_DISCOUNT = [4, 29, 11, 9, 7, 11, 11, 8, 10];

export function SaleDocumentSheet({ doc, className = "", id, sheetRef, settings: settingsOverride }) {
  const { settings: storedSettings } = usePrintSettings();
  const s = settingsOverride || storedSettings;

  const isLandscape = doc.landscape || doc.tableVariant === "landscape";
  const isProforma = doc.tableVariant === "proforma";
  const showDiscount = Boolean(doc.showDiscount) && s.showDiscountCol !== false;
  const widths = isProforma
    ? (showDiscount ? SALE_WIDTHS_PROFORMA_WITH_DISCOUNT : SALE_WIDTHS_PROFORMA_NO_DISCOUNT)
    : (showDiscount ? SALE_WIDTHS_WITH_DISCOUNT : SALE_WIDTHS_NO_DISCOUNT);
  const hasItems = doc.items.length > 0;
  const hasShipTo = Boolean(doc.shipTo?.lines?.length) && s.showShipTo !== false;
  const textSizeClass = s.textSize === "small" ? " vy-sheet--text-sm" : s.textSize === "large" ? " vy-sheet--text-lg" : "";
  const customStyle = !doc.charcoal && s.accentColor ? { "--vy": s.accentColor } : undefined;

  return <article className={`${className} vy-sheet${isLandscape ? " vy-sheet--landscape" : ""}${doc.charcoal ? " vy-sheet--charcoal" : ""}${textSizeClass}`} style={customStyle} id={id} data-template={isLandscape ? "landscape" : "sale"} ref={sheetRef}>
    <table className="vy-page-container">
      <thead>
        <tr>
          <td>
            <header className="vy-header">
              <div className="vy-store">
                <h1>{saleDash(doc.store.name)}</h1>
                {doc.store.lines.map((line, index) => <p key={index}>{line}</p>)}
              </div>
              {doc.logo && s.showLogo !== false && <img className="vy-logo" src={doc.logo} alt="Deals2Wheels" />}
            </header>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div className="vy-titlebox">
              <h2 className="vy-title">{doc.title}</h2>
              {doc.notice && <p className="vy-notice">{doc.notice}</p>}
            </div>

            <section className={`vy-parties ${hasShipTo ? "vy-parties--three" : "vy-parties--two"}`}>
      <div className="vy-party">
        <h3>Bill To</h3>
        <strong className="vy-name">{saleDash(doc.billTo.name)}</strong>
        {doc.billTo.lines.map((line, index) => <p key={index}>{line}</p>)}
      </div>
      {hasShipTo && <div className="vy-party">
        <h3>Ship To</h3>
        {doc.shipTo.lines.map((line, index) => <p key={index}>{line}</p>)}
      </div>}
      <div className="vy-party">
        <h3>{doc.detailsTitle}</h3>
        {doc.details.map((row) => <div className="vy-detail-row" key={row.label}>
          <span>{row.label}</span>
          <strong>{row.tone ? <span className={`doc-badge doc-badge--${row.tone}`}>{row.value}</span> : row.value}</strong>
        </div>)}
      </div>
    </section>

    {isProforma ? (
    <table className="vy-table vy-table--proforma">
      <colgroup>
        {widths.map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}
      </colgroup>
      <thead>
        <tr>
          <th className="ctr">Sl No</th><th>Part Details</th><th>Part No</th><th className="ctr">HSN</th><th className="ctr">Qty</th>
          <th className="num">Rate</th><th className="num">MRP</th>
          {showDiscount && <th className="num">Discount</th>}
          <th className="num">GST</th><th className="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        {doc.items.map((item, index) => <tr key={item.key}>
          <td className="ctr">{index + 1}</td>
          <td>
                        <strong>{saleDash(item.name)}</strong>
            {item.showUnit && <ProductUnitLabel product={item.raw} />}
            <small className="vy-partno"><span>Brand: {saleDash(item.brand)}</span><span>HSN: {saleDash(item.hsn)}</span></small>
            {item.extras?.map((line, extraIndex) => line ? <small className="vy-extra" key={extraIndex}>{line}</small> : null)}
          </td>
          <td className="vy-partno-col">{saleDash(item.partNo)}</td>
          <td className="ctr">{saleDash(item.hsn)}</td>
          <td className="ctr">{item.qty}</td>
          <td className="num">{SALE_RUPEE}{saleMoney(item.rate)}</td>
          <td className="num">{SALE_RUPEE}{saleMoney(item.mrp)}</td>
          {showDiscount && <td className="num"><span>{item.discountPct}%</span><small>{SALE_RUPEE}{saleMoney(item.discountAmount)}</small></td>}
          <td className="num"><span>{item.gstPct}%</span><small>{SALE_RUPEE}{saleMoney(item.gst)}</small></td>
          <td className="num">{SALE_RUPEE}{saleMoney(item.amount)}</td>
        </tr>)}
        {!hasItems && <tr><td colSpan={widths.length} style={{ textAlign: "center" }}>No items found.</td></tr>}
      </tbody>
    </table>
    ) : (
    <>
    <table className="vy-table">
      <colgroup>
        {widths.map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}
      </colgroup>
      <thead>
        <tr>
          <th>Sl No</th><th>Item Description</th><th>Part No</th>
          <th className="num">Qty</th><th className="num">MRP</th><th className="num">Rate</th>
          {showDiscount && <th className="num">Discount</th>}
          <th className="num">Taxable</th><th className="num">GST</th><th className="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        {doc.items.map((item, index) => <tr key={item.key}>
          <td>{index + 1}</td>
          <td>
            <strong>{saleDash(item.name)}</strong>
            {item.showUnit && <ProductUnitLabel product={item.raw} />}
            <small className="vy-partno"><span>Brand: {saleDash(item.brand)}</span><span>HSN: {saleDash(item.hsn)}</span></small>
            {item.extras?.map((line, extraIndex) => line ? <small className="vy-extra" key={extraIndex}>{line}</small> : null)}
          </td>
          <td className="vy-partno-col">{saleDash(item.partNo)}</td>
          <td className="num">{item.qty}</td>
          <td className="num">{saleMoney(item.mrp)}</td>
          <td className="num">{saleMoney(item.rate)}</td>
          {showDiscount && <td className="num">{item.discountAmount > 0 ? <><span>{saleMoney(item.discountAmount)}</span><small>({item.discountPct}%)</small></> : "-"}</td>}
          <td className="num">{saleMoney(item.taxable)}</td>
          <td className="num"><span>{saleMoney(item.gst)}</span><small>({item.gstPct}%)</small></td>
          <td className="num"><strong>{saleMoney(item.amount)}</strong></td>
        </tr>)}
        {!hasItems && <tr><td colSpan={widths.length} style={{ textAlign: "center" }}>No items found.</td></tr>}
      </tbody>
      {hasItems && <tfoot>
        <tr>
          <td></td><td>Total</td><td></td>
          <td className="num">{doc.totals.qty}</td><td></td><td></td>
          {showDiscount && <td className="num">{saleMoney(doc.totals.discount)}</td>}
          <td className="num">{saleMoney(doc.totals.taxable)}</td>
          <td className="num">{saleMoney(doc.totals.gst)}</td>
          <td className="num">{saleMoney(doc.totals.amount)}</td>
        </tr>
      </tfoot>}
    </table>
    <div className="vy-count">Total Items: {doc.items.length}</div>
    </>
    )}

    <section className="vy-bottom">
      <div className="vy-left">
        {doc.payments?.length > 0 && s.showPayments !== false && <div className="vy-block">
          <h3>Payment details</h3>
          {doc.payments.map((payment) => <div className="vy-pay-row" key={payment.key}>
            <span>{payment.label}</span><strong>{SALE_RUPEE} {saleMoney(payment.amount)}</strong>
            {payment.ref && <small>{payment.ref}</small>}
          </div>)}
        </div>}
        {doc.description && <div className="vy-block"><h3>Description</h3><p>{doc.description}</p></div>}
        {doc.words && s.showAmountInWords !== false && <div className="vy-block"><h3>Invoice amount in words</h3><p className="vy-words">{doc.words}</p></div>}
        {doc.dueDate && <div className="vy-block"><h3>Due date</h3><p>{doc.dueDate}</p></div>}
        {doc.terms?.length > 0 && s.showTerms !== false && <div className="vy-block">
          <h3>Terms and conditions</h3>
          <ol>{doc.terms.map((term, index) => <li key={index}>{term}</li>)}</ol>
        </div>}
        {doc.bank?.length > 0 && <div className="vy-block">
          <h3>Pay to</h3>
          {doc.bank.map((line, index) => <p key={index}>{line}</p>)}
        </div>}
        {doc.customerSignature && s.showCustomerSignature !== false && <div className="vy-sign">
          <div className="vy-sign-box" />
          <p className="vy-sign-label">Customer Signature</p>
        </div>}
      </div>
      <div className="vy-right">
        <div className="vy-summary">
          {doc.summary.map((row) => <div className={`vy-sum-row${row.bar ? " is-bar" : ""}${row.strong ? " is-strong" : ""}`} key={row.label}>
            <span>{row.label}</span>
            <strong>{row.subtract ? "- " : ""}{SALE_RUPEE} {saleMoney(row.value)}</strong>
          </div>)}
        </div>
        <div className="vy-sign">
          <p>For : {saleDash(doc.store.name)}</p>
          <div className="vy-sign-box" />
          <p className="vy-sign-label">Authorized Signatory</p>
        </div>
      </div>
    </section>

            {doc.footerNote && s.showFooterNote !== false && <p className="vy-note">{doc.footerNote}</p>}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td>
            <div className="vy-page-footer">
              <span className="vy-footer-left">This is a computer-generated invoice</span>
              <span className="vy-footer-right">
                {doc.invoiceNumber ? `Invoice ${doc.invoiceNumber}` : (doc.title || "Invoice")} | Page <span className="vy-page-num">1 of 1</span>
              </span>
            </div>
          </td>
        </tr>
      </tfoot>
    </table>
  </article>;
}
