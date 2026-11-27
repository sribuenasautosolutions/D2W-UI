import { useState } from "react";
import { Check, Layers, Palette, RotateCcw, SlidersHorizontal } from "lucide-react";
import toast from "react-hot-toast";
import { usePrintSettings, SaleDocumentSheet } from "../../../components/InvoiceThemeSwitch";
import d2wLogo from "../../../assets/deals2wheels-logo100.png";
import "../../../pos/pages/InvoicePage.css";

const THEMES = [
  { key: "sale", name: "Modern Violet ERP", subtitle: "Default 3-box GST layout", bar: "#5c6bc0", bg: "#eceefa" },
  { key: "charcoal", name: "Charcoal ERP", subtitle: "High-contrast monochrome", bar: "#374151", bg: "#f3f4f6" },
  { key: "navy", name: "Classic Navy", subtitle: "Corporate bordered grid", bar: "#1e3a5f", bg: "#eef2f7" },
  { key: "soft", name: "Minimalist Soft", subtitle: "Ink-friendly light theme", bar: "#94a3b8", bg: "#f8fafc" },
  { key: "landscape", name: "Landscape ERP", subtitle: "Wide horizontal A4 format", bar: "#5c6bc0", bg: "#eceefa" },
];

const ACCENT_COLORS = [
  { label: "Violet (Default)", value: "" },
  { label: "Royal Blue", value: "#2563eb" },
  { label: "Deep Navy", value: "#1e3a5f" },
  { label: "Emerald", value: "#047857" },
  { label: "Slate", value: "#334155" },
  { label: "Crimson", value: "#b91c1c" },
];

const DUMMY_ITEMS = [
  {
    key: "item-1",
    name: "ITEM 1",
    partNo: "PN-00124",
    brand: "Brand A",
    hsn: "84821051",
    qty: 2,
    mrp: 500.00,
    rate: 450.00,
    discountAmount: 50.00,
    discountPct: 10.00,
    taxable: 850.00,
    gst: 153.00,
    gstPct: 18,
    amount: 1003.00,
  },
  {
    key: "item-2",
    name: "ITEM 2",
    partNo: "PN-00582",
    brand: "Brand B",
    hsn: "84822011",
    qty: 1,
    mrp: 1200.00,
    rate: 1000.00,
    discountAmount: 100.00,
    discountPct: 10.00,
    taxable: 900.00,
    gst: 162.00,
    gstPct: 18,
    amount: 1062.00,
  },
  {
    key: "item-3",
    name: "ITEM 3",
    partNo: "PN-00791",
    brand: "Brand A",
    hsn: "84823000",
    qty: 3,
    mrp: 250.00,
    rate: 200.00,
    discountAmount: 30.00,
    discountPct: 15.00,
    taxable: 510.00,
    gst: 91.80,
    gstPct: 18,
    amount: 601.80,
  },
];

const DUMMY_DOC = {
  title: "Tax Invoice",
  notice: "",
  logo: d2wLogo,
  detailsTitle: "Invoice Details",
  invoiceNumber: "INV-000001",
  store: {
    name: "DEALS2WHEELS SMARTSTORE PVT LTD",
    lines: [
      "H No 1-5-67, Main Road, Hyderabad - 500020",
      "Phone: +91 98765 43210  |  Email: contact@deals2wheels.com",
      "GSTIN: 36ABNCS4670D1Z4",
      "State: Telangana, Code: 36",
    ],
  },
  billTo: {
    name: "CUSTOMER / CLIENT NAME",
    lines: [
      "Plot No. 42, Industrial Area, Hyderabad - 500034",
      "Phone: +91 91234 56789",
      "GSTIN: 36BVUPR5072H1ZV",
      "State: Telangana, Code: 36",
    ],
  },
  shipTo: {
    lines: [
      "Plot No. 99, Phase 2, Auto Nagar, Hyderabad - 500070",
      "Vehicle No: TS 09 AB 1234",
    ],
  },
  details: [
    { label: "Invoice No.", value: "INV-000001" },
    { label: "Invoice Date", value: "16 Nov 2026" },
    { label: "Place of Supply", value: "Telangana (36)" },
    { label: "Supply Type", value: "Intra-State (CGST + SGST)" },
    { label: "Total Items", value: "3" },
  ],
  showDiscount: true,
  items: DUMMY_ITEMS,
  totals: {
    qty: 6,
    discount: 180.00,
    taxable: 2260.00,
    gst: 406.80,
    amount: 2666.80,
  },
  payments: [
    { key: "p1", label: "Cash / UPI", amount: 2666.80, ref: "Ref: UPI-983719" },
  ],
  words: "Two Thousand Six Hundred Sixty Six Rupees and Eighty Paise Only",
  terms: [
    "Goods once sold will not be taken back without original invoice.",
    "Warranty claims subject to manufacturer terms.",
    "Subject to Hyderabad Jurisdiction.",
  ],
  bank: [
    "Bank: HDFC Bank",
    "A/C: 50200012345678",
    "IFSC: HDFC0001234",
  ],
  summary: [
    { label: "Total Taxable Amount", value: 2260.00 },
    { label: "CGST (9%)", value: 203.40 },
    { label: "SGST (9%)", value: 203.40 },
    { label: "Total Amount After Tax", value: 2666.80, strong: true, bar: true },
  ],
  customerSignature: true,
  footerNote: "This is a computer-generated invoice.",
};

const formatInr = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer select-none">
      <span className="text-xs text-slate-700 font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        style={{
          backgroundColor: checked ? "#4f46e5" : "#cbd5e1",
          border: "none",
          outline: "none",
        }}
        className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer"
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4.5" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

export default function InvoiceTemplateSettings() {
  const { settings, updateSettings, resetSettings } = usePrintSettings();
  const [activeTab, setActiveTab] = useState("layout");
  const [zoomLevel, setZoomLevel] = useState(80);

  const selectedTheme = settings.themeKey || "sale";
  const isLandscape = selectedTheme === "landscape" || settings.orientation === "landscape";

  const handleSelectTheme = (key, name) => {
    updateSettings({
      themeKey: key,
      orientation: key === "landscape" ? "landscape" : "portrait",
    });
    toast.success(`Template set to "${name}"`, {
      style: { borderRadius: "10px", background: "#1e293b", color: "#fff", fontSize: "12px" },
    });
  };

  const handleReset = () => {
    resetSettings();
    toast.success("Print settings reset to defaults");
  };

  const toggleOption = (field) => {
    updateSettings((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const tabs = [
    { id: "layout", label: "Layout", icon: Layers },
    { id: "colors", label: "Colors", icon: Palette },
    { id: "options", label: "Customize", icon: SlidersHorizontal },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left: Clean 3-Tab Controls Panel */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Clean White Header + Segmented Pill Tabs */}
        <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100/80">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    backgroundColor: active ? "#ffffff" : "transparent",
                    border: "none",
                    outline: "none",
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    active
                      ? "text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleReset}
            title="Reset to defaults"
            style={{ backgroundColor: "#ffffff", outline: "none" }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 bg-white">
          {activeTab === "layout" && (
            <div className="space-y-2.5">
              {THEMES.map((theme) => {
                const isActive = selectedTheme === theme.key;
                return (
                  <button
                    key={theme.key}
                    type="button"
                    onClick={() => handleSelectTheme(theme.key, theme.name)}
                    style={{
                      backgroundColor: isActive ? "#f5f7ff" : "#ffffff",
                      outline: "none",
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isActive
                        ? "border-indigo-500"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Mini wireframe */}
                    <div
                      className="w-14 h-11 rounded-md border border-slate-200 p-1.5 flex flex-col justify-between flex-shrink-0"
                      style={{ backgroundColor: theme.bg }}
                    >
                      <div className="h-1.5 w-6 rounded-sm" style={{ backgroundColor: theme.bar }} />
                      <div className="space-y-0.5">
                        <div className="h-1 w-full rounded-sm" style={{ backgroundColor: theme.bar, opacity: 0.7 }} />
                        <div className="h-1 w-4/5 rounded-sm bg-slate-300" />
                      </div>
                      <div className="h-1 w-4 self-end rounded-sm" style={{ backgroundColor: theme.bar }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{theme.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{theme.subtitle}</div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                        isActive
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isActive && <Check size={11} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === "colors" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Choose an accent color for Modern Violet &amp; Landscape ERP layouts:
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {ACCENT_COLORS.map((color) => {
                  const isActive = (settings.accentColor || "") === color.value;
                  return (
                    <button
                      key={color.label}
                      type="button"
                      onClick={() => updateSettings({ accentColor: color.value })}
                      style={{
                        backgroundColor: isActive ? "#f5f7ff" : "#ffffff",
                        outline: "none",
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isActive
                          ? "border-indigo-500 text-indigo-700"
                          : "border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/15 flex-shrink-0"
                        style={{ backgroundColor: color.value || "#5c6bc0" }}
                      />
                      <span className="truncate">{color.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "options" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Page &amp; Typography
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className="text-[11px] text-slate-600 font-medium">Paper</span>
                    <select
                      value={settings.paperSize}
                      onChange={(e) => updateSettings({ paperSize: e.target.value })}
                      className="mt-1 w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800"
                    >
                      <option value="A4">A4</option>
                      <option value="A5">A5</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-slate-600 font-medium">Orientation</span>
                    <select
                      value={settings.orientation}
                      onChange={(e) => updateSettings({ orientation: e.target.value })}
                      className="mt-1 w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-slate-600 font-medium">Text Size</span>
                    <select
                      value={settings.textSize}
                      onChange={(e) => updateSettings({ textSize: e.target.value })}
                      className="mt-1 w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-0.5">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Visible Sections
                </h3>
                {[
                  ["showLogo", "Store Logo"],
                  ["showShipTo", "Shipping Address Box"],
                  ["showDiscountCol", "Discount Column"],
                  ["showPayments", "Payment Details"],
                  ["showAmountInWords", "Amount in Words"],
                  ["showTerms", "Terms & Conditions"],
                  ["showCustomerSignature", "Customer Signature Box"],
                  ["showFooterNote", "Computer-Generated Note"],
                ].map(([field, label]) => (
                  <ToggleRow
                    key={field}
                    label={label}
                    checked={settings[field] !== false}
                    onChange={() => toggleOption(field)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Sticky Live Template Preview */}
      <div className="lg:col-span-8 space-y-3 lg:sticky lg:top-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-slate-700">
              Preview &mdash; {THEMES.find((t) => t.key === selectedTheme)?.name || "Invoice"}
              {isLandscape ? " (Landscape)" : ""}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {[75, 80, 90, 100].map((zoom) => {
              const active = zoomLevel === zoom;
              return (
                <button
                  key={zoom}
                  type="button"
                  onClick={() => setZoomLevel(zoom)}
                  style={{
                    backgroundColor: active ? "#ffffff" : "transparent",
                    border: "none",
                    outline: "none",
                  }}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md cursor-pointer transition-all ${
                    active
                      ? "text-indigo-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {zoom}%
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-100/90 p-4 sm:p-6 rounded-2xl border border-slate-200/80 overflow-x-auto min-h-[600px] flex justify-center items-start">
          <div
            style={{
              width: isLandscape ? "1060px" : "760px",
              minHeight: isLandscape ? "680px" : "980px",
              transform: `scale(${(isLandscape ? Math.min(zoomLevel, 72) : zoomLevel) / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out, width 0.2s ease",
              flexShrink: 0,
            }}
          >
            {(selectedTheme === "sale" || selectedTheme === "landscape" || selectedTheme === "charcoal") && (
              <div
                className="bg-white shadow-xl rounded-sm border border-slate-300 p-6 text-slate-900"
                style={{ minHeight: isLandscape ? "680px" : "980px" }}
              >
                <SaleDocumentSheet
                  doc={{
                    ...DUMMY_DOC,
                    landscape: isLandscape,
                    charcoal: selectedTheme === "charcoal",
                  }}
                  settings={settings}
                  className={isLandscape ? "invoice-preview-sheet vy-sheet--landscape" : "invoice-preview-sheet"}
                />
              </div>
            )}

            {(selectedTheme === "navy" || selectedTheme === "soft") && (
              <article
                className="invoice-sheet shadow-xl rounded-sm border border-slate-300"
                data-template={selectedTheme}
              >
                <table className="invoice-page-container">
                  <thead>
                    <tr>
                      <td>
                        <header className="invoice-header">
                          <div className="invoice-store-copy">
                            <h1>{DUMMY_DOC.store.name}</h1>
                            <p>H No 1-5-67, Main Road, Hyderabad - 500020</p>
                            <p>Phone: +91 98765 43210  |  Email: contact@deals2wheels.com</p>
                            <p className="invoice-gstin"><span>GSTIN:</span> 36ABNCS4670D1Z4</p>
                            <p><span>State:</span> Telangana, Code: 36</p>
                          </div>
                          {settings.showLogo !== false && (
                            <img className="invoice-brand-logo" src={d2wLogo} alt="Deals2Wheels" />
                          )}
                        </header>
                        <div className="invoice-titlebox">
                          <h2 className="invoice-title">TAX INVOICE</h2>
                        </div>
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <section className={`invoice-party-grid ${settings.showShipTo !== false && DUMMY_DOC.shipTo?.lines?.length > 0 ? "invoice-party-grid--three" : "invoice-party-grid--two"}`}>
                          <div className="invoice-party">
                            <h3>BILL TO</h3>
                            <strong className="invoice-customer-name">{DUMMY_DOC.billTo.name}</strong>
                            <p>Plot No. 42, Industrial Area, Hyderabad - 500034</p>
                            <p>Phone: +91 91234 56789</p>
                            <p>GSTIN: 36BVUPR5072H1ZV</p>
                            <p>State / Place of Supply: Telangana (36)</p>
                          </div>
                          {settings.showShipTo !== false && DUMMY_DOC.shipTo?.lines?.length > 0 && (
                            <div className="invoice-party">
                              <h3>SHIP TO</h3>
                              {DUMMY_DOC.shipTo.lines.map((line, idx) => (
                                <p key={idx}>{line}</p>
                              ))}
                            </div>
                          )}
                          <div className="invoice-meta">
                            <h3>INVOICE DETAILS</h3>
                            <div className="invoice-info-line"><span>Invoice No.:</span> <strong>INV-000001</strong></div>
                            <div className="invoice-info-line"><span>Invoice Date:</span> <strong>16 Nov 2026</strong></div>
                            <div className="invoice-info-line"><span>Order No.:</span> <strong>#ORD-1001</strong></div>
                            <div className="invoice-info-line"><span>Payment:</span> <strong>Cash / UPI</strong></div>
                            <div className="invoice-info-line"><span>Status:</span> <strong>COMPLETED</strong></div>
                          </div>
                        </section>

                        <section className="invoice-items-wrap">
                          <table className="invoice-items">
                            <colgroup>
                              <col style={{ width: "5%" }} />
                              <col style={{ width: "26%" }} />
                              <col style={{ width: "13%" }} />
                              <col style={{ width: "6%" }} />
                              <col style={{ width: "9%" }} />
                              <col style={{ width: "9%" }} />
                              {settings.showDiscountCol !== false && <col style={{ width: "10%" }} />}
                              <col style={{ width: "8%" }} />
                              <col style={{ width: "6%" }} />
                              <col style={{ width: "8%" }} />
                            </colgroup>
                            <thead>
                              <tr>
                                <th>Sl No</th>
                                <th>Item Description</th>
                                <th>Part No</th>
                                <th className="invoice-num">Qty</th>
                                <th className="invoice-num">MRP</th>
                                <th className="invoice-num">Rate</th>
                                {settings.showDiscountCol !== false && <th className="invoice-num">Discount</th>}
                                <th className="invoice-num">Taxable</th>
                                <th className="invoice-num">GST %</th>
                                <th className="invoice-num">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {DUMMY_ITEMS.map((item, index) => (
                                <tr key={item.key}>
                                  <td>{index + 1}</td>
                                  <td>
                                    <strong>{item.name}</strong>
                                    <small className="invoice-partno">
                                      <span>Brand: {item.brand}</span>
                                      <span>HSN: {item.hsn}</span>
                                    </small>
                                  </td>
                                  <td className="vy-partno-col">{item.partNo}</td>
                                  <td className="invoice-num">{item.qty}</td>
                                  <td className="invoice-num">{formatInr(item.mrp)}</td>
                                  <td className="invoice-num">{formatInr(item.rate)}</td>
                                  {settings.showDiscountCol !== false && <td className="invoice-num">{formatInr(item.discountAmount)}</td>}
                                  <td className="invoice-num">{formatInr(item.taxable)}</td>
                                  <td className="invoice-num">{item.gstPct}%</td>
                                  <td className="invoice-num"><strong>{formatInr(item.amount)}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td></td>
                                <td>Total</td>
                                <td></td>
                                <td className="invoice-num">{DUMMY_DOC.totals.qty}</td>
                                <td></td>
                                <td></td>
                                {settings.showDiscountCol !== false && <td className="invoice-num">{formatInr(DUMMY_DOC.totals.discount)}</td>}
                                <td className="invoice-num">{formatInr(DUMMY_DOC.totals.taxable)}</td>
                                <td></td>
                                <td className="invoice-num">{formatInr(DUMMY_DOC.totals.amount)}</td>
                              </tr>
                            </tfoot>
                          </table>
                          <div className="invoice-items-count">Total Items: {DUMMY_ITEMS.length}</div>
                        </section>

                        <section className="invoice-summary-grid">
                          <div className="invoice-lower-left">
                            {settings.showAmountInWords !== false && (
                              <div className="invoice-words">
                                <h3>AMOUNT IN WORDS</h3>
                                <p>{DUMMY_DOC.words}</p>
                              </div>
                            )}
                            {settings.showTerms !== false && (
                              <div className="invoice-terms">
                                <h3>TERMS &amp; CONDITIONS</h3>
                                <ol>
                                  <li>Goods once sold will not be taken back without original invoice.</li>
                                  <li>Warranty claims subject to manufacturer terms.</li>
                                  <li>Subject to Hyderabad Jurisdiction.</li>
                                </ol>
                              </div>
                            )}
                          </div>
                          <div className="invoice-lower-right">
                            <div className="invoice-totals-box">
                              <div className="invoice-tot-row">
                                <span>Total Taxable Amount</span>
                                <strong>&#8377; {formatInr(DUMMY_DOC.totals.taxable)}</strong>
                              </div>
                              <div className="invoice-tot-row">
                                <span>CGST (9%)</span>
                                <strong>&#8377; {formatInr(203.40)}</strong>
                              </div>
                              <div className="invoice-tot-row">
                                <span>SGST (9%)</span>
                                <strong>&#8377; {formatInr(203.40)}</strong>
                              </div>
                              <div className="invoice-tot-row invoice-grand-total">
                                <span>Total Amount After Tax</span>
                                <strong>&#8377; {formatInr(DUMMY_DOC.totals.amount)}</strong>
                              </div>
                            </div>
                            <div className="invoice-signatures">
                              {settings.showCustomerSignature !== false && (
                                <div className="invoice-sign-box">
                                  <p>Customer Signature</p>
                                </div>
                              )}
                              <div className="invoice-sign-box">
                                <p>For {DUMMY_DOC.store.name}</p>
                                <p className="invoice-sign-auth">Authorized Signatory</p>
                              </div>
                            </div>
                          </div>
                        </section>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </article>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
