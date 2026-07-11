import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getInvoice } from "../../services/orderService";
import { calculatePayment, addPayment } from "../../services/paymentService";

/* ============================================================
   CONSTANTS
   ============================================================ */

// Matches com.enumclasses.PaymentMethod exactly:
// CASH, UPI, CARD, IMPS, NEFT, RTGS, CHEQUE
const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "IMPS", label: "IMPS" },
  { value: "NEFT", label: "NEFT" },
  { value: "RTGS", label: "RTGS" },
  { value: "CHEQUE", label: "Cheque" },
];

const CALC_DEBOUNCE_MS = 400;
const ITEMS_PER_PAGE = 5;

// NOTE: OrderListResponseDTO (from GET /orders and /orders/store/{id})
// has no orderStatus field, so the backend has no way to tell us which
// orders are still PENDING_PAYMENT vs already PAID. Until that field is
// added, "Held Payments" is tracked client-side in localStorage — it
// only remembers invoices YOU held from THIS browser. If you add
// orderStatus to OrderListResponseDTO later, this can be swapped for a
// real backend-driven list.
const HELD_PAYMENTS_KEY = "pos_held_payments";

/* ============================================================
   HELPERS (display only — no money math happens here)
   ============================================================ */

const money = (value) => `₹${Number(value ?? 0).toFixed(2)}`;

const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const extractError = (error) => {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (typeof data === "string" && data.trim()) return data;
  return error?.message || "Something went wrong. Please try again.";
};

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

const statusColor = (status) => {
  const s = (status || "").toUpperCase();
  if (s === "PAID") return { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" };
  if (s === "PARTIALLY_PAID") return { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" };
  if (s === "CANCELLED" || s === "RETURNED") return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
  return { bg: "#eff6ff", color: "#1e40af", border: "#93c5fd" }; // PENDING_PAYMENT
};

let rowCounter = 0;
const newRow = (prefillAmount = "") => ({
  rowId: `row-${++rowCounter}`,
  method: "CASH",
  amount: prefillAmount,
  transactionNumber: "",
  remarks: "",
});

/* ---------- held-payments localStorage helpers ---------- */

const getHeldPayments = () => {
  try {
    return JSON.parse(localStorage.getItem(HELD_PAYMENTS_KEY)) || [];
  } catch {
    return [];
  }
};

const saveHeldPayments = (list) => {
  localStorage.setItem(HELD_PAYMENTS_KEY, JSON.stringify(list));
};

const addHeldPayment = (entry) => {
  const list = getHeldPayments().filter((x) => String(x.orderId) !== String(entry.orderId));
  list.unshift(entry);
  saveHeldPayments(list);
};

const removeHeldPayment = (orderId) => {
  saveHeldPayments(getHeldPayments().filter((x) => String(x.orderId) !== String(orderId)));
};

/* ============================================================
   COMPONENT
   ============================================================ */

function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  /* ---------- Invoice header (loaded from backend) ---------- */
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  /* ---------- Payment rows (cashier inputs only) ---------- */
  const [rows, setRows] = useState([newRow()]);
  const [collectedBy] = useState(user?.username || user?.name || "");

  /* ---------- Live backend calculation (source of truth) ---------- */
  const [calc, setCalc] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState("");

  /* ---------- Save state ---------- */
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ---------- Change-return confirmation ----------
     Only relevant when the entered payment(s) exceed the balance
     (backend returns calc.changeReturn > 0). The cashier must tick
     this to confirm the change was physically handed back before
     Save Payment is allowed to fire. Resets any time the rows change
     so a new amount always needs re-confirming. ---------- */
  const [changeConfirmed, setChangeConfirmed] = useState(false);

  /* ---------- Items panel (replaces "Order Notes") ---------- */
  const [itemsPage, setItemsPage] = useState(1);

  /* ---------- Transaction-number popup (for non-cash methods) ---------- */
  const [txnModal, setTxnModal] = useState(null); // { rowId, method, value, previousMethod }

  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  /* ============================================================
     LOAD INVOICE HEADER — GET /orders/{orderId}
     ============================================================ */

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getInvoice(orderId)
      .then((data) => {
        if (cancelled) return;
        setInvoice(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(extractError(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  /* ============================================================
     BUILD /sales-payments/calculate + /sales-payments REQUEST
     Payload matches SalesPaymentItemDTO exactly:
     { amount, paymentMethod, transactionNumber, remarks, customerTendered }

     CASH: the cashier just types in whatever the customer physically
     handed over into the Amount field. That raw amount is sent as both
     `amount` and `customerTendered` — the backend decides on its own
     whether that's exactly the balance, short, or more than the balance
     (in which case it returns changeReturn). No client-side branching
     needed here.
     ============================================================ */

  const buildPaymentsPayload = useCallback(() => {
    return rows
      .filter((r) => {
        if (r.method === "CASH") return Number(r.amount) > 0;
        return Number(r.amount) > 0 && r.transactionNumber.trim() !== "";
      })
      .map((r) => {
        if (r.method === "CASH") {
          const cashValue = Number(r.amount);
          return {
            amount: cashValue,
            paymentMethod: "CASH",
            transactionNumber: null,
            remarks: r.remarks || null,
            customerTendered: cashValue,
          };
        }
        return {
          amount: Number(r.amount),
          paymentMethod: r.method,
          transactionNumber: r.transactionNumber.trim(),
          remarks: r.remarks || null,
          customerTendered: null,
        };
      });
  }, [rows]);

  // A row still needs attention before it can be included (missing
  // reference number for a non-cash method) — used to block saving.
  const hasIncompleteRow = rows.some((r) => {
    if (r.method === "CASH") return false;
    const enteredAmount = Number(r.amount) > 0;
    return enteredAmount && r.transactionNumber.trim() === "";
  });

  /* ============================================================
     AUTO-RECALCULATE (debounced) — every time rows change
     ============================================================ */

  useEffect(() => {
    if (!invoice || saved) return;

    // Any edit to the rows invalidates a previous change-return
    // confirmation — force the cashier to re-confirm against the new
    // amount.
    setChangeConfirmed(false);

    const payments = buildPaymentsPayload();
    if (payments.length === 0) {
      setCalc(null);
      setCalcError("");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setCalcLoading(true);
      setCalcError("");
      try {
        const response = await calculatePayment({ orderId, payments });
        if (requestId === requestIdRef.current) setCalc(response);
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setCalc(null);
          setCalcError(extractError(error));
        }
      } finally {
        if (requestId === requestIdRef.current) setCalcLoading(false);
      }
    }, CALC_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [rows, orderId, invoice, saved, buildPaymentsPayload]);

  /* ============================================================
     ROW HANDLERS
     ============================================================ */

  const updateRow = (rowId, patch) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  };

  const removeRow = (rowId) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  const addRow = () => {
    const remaining = Number(remainingBalance) || 0;
    setRows((prev) => [...prev, newRow(remaining > 0 ? String(remaining) : "")]);
  };

  const handleMethodChange = (row, nextMethod) => {
    if (nextMethod === "CASH") {
      updateRow(row.rowId, { method: "CASH", transactionNumber: "" });
      return;
    }
    // Non-cash methods (UPI, Card, IMPS, NEFT, RTGS, Cheque) always
    // collect the reference number through the popup rather than an
    // inline field.
    setTxnModal({
      rowId: row.rowId,
      method: nextMethod,
      value: row.method === nextMethod ? row.transactionNumber : "",
      previousMethod: row.method,
    });
  };

  const confirmTxnModal = () => {
    if (!txnModal.value.trim()) {
      alert("Please enter a transaction / reference number.");
      return;
    }
    updateRow(txnModal.rowId, {
      method: txnModal.method,
      transactionNumber: txnModal.value.trim(),
    });
    setTxnModal(null);
  };

  const cancelTxnModal = () => {
    // Revert the dropdown back to whatever it was before, since no
    // reference number was confirmed.
    setTxnModal(null);
  };

  // Once the backend says the balance is fully covered, stop letting the
  // cashier add more payment methods.
  const canAddAnotherMethod = !saved && !(calc?.paymentCompleted === true);

  const fullyCovered = calc?.paymentCompleted === true;

  // True only when the entered payment(s) add up to MORE than the
  // balance (backend returns a changeReturn amount). In that case the
  // cashier must tick the confirmation checkbox — acknowledging the
  // change was handed back to the customer — before Save/View Invoice
  // become available. When payments land exactly on the balance (no
  // change involved), this is skipped entirely.
  const needsChangeConfirmation = Number(calc?.changeReturn ?? 0) > 0;

  const canSave = fullyCovered && (!needsChangeConfirmation || changeConfirmed);

  /* ============================================================
     SAVE PAYMENT — POST /sales-payments
     Partial payments are not allowed: the entered payments must add
     up to the exact remaining balance before this is allowed to fire.
     ============================================================ */

  const handleSavePayment = async () => {
    if (saving || saved) return;

    const payments = buildPaymentsPayload();
    if (payments.length === 0) {
      alert("Enter at least one payment amount before saving.");
      return;
    }
    if (hasIncompleteRow) {
      alert("One of your payment rows is missing a transaction / reference number.");
      return;
    }
    if (!collectedBy.trim()) {
      alert("Please enter who is collecting this payment.");
      return;
    }
    if (calcError) {
      alert("Please resolve the highlighted issue before saving payment:\n" + calcError);
      return;
    }
    if (!fullyCovered) {
      alert(
        "Partial payments are not allowed. Please collect the full remaining balance " +
          money(calc?.balanceAmount ?? invoice?.balanceAmount) +
          " before saving payment."
      );
      return;
    }
    if (needsChangeConfirmation && !changeConfirmed) {
      alert("Please confirm the change return checkbox before saving this payment.");
      return;
    }

    setSaving(true);
    try {
      const response = await addPayment({
        orderId,
        collectedBy: collectedBy.trim(),
        payments,
      });

      setInvoice((prev) => ({
        ...prev,
        totalAmount: response.invoiceAmount,
        paidAmount: response.alreadyPaid,
        balanceAmount: response.balanceAmount,
        orderStatus: response.orderStatus,
      }));
      setCalc((prev) => ({
        ...prev,
        changeReturn: response.changeReturn,
        balanceAmount: response.balanceAmount,
        paymentCompleted: Number(response.balanceAmount) <= 0,
      }));
      setSaved(true);
      removeHeldPayment(orderId);
    } catch (error) {
      alert(extractError(error));
    } finally {
      setSaving(false);
    }
  };

  /* ============================================================
     HOLD PAYMENT
     There is no backend "hold" endpoint / status in the code you
     shared, and OrderListResponseDTO doesn't expose orderStatus, so
     there's no way to ask the backend "which orders are pending?".
     A freshly placed order already sits at PENDING_PAYMENT until a
     payment is saved, so functionally the invoice IS already held —
     we just remember it locally (localStorage) so you can find your
     way back to it from the "Held Payments" panel.
     ============================================================ */

  const handleHoldPayment = () => {
    const hasEnteredAmount = rows.some((r) => Number(r.amount) > 0);
    if (hasEnteredAmount) {
      const confirmHold = window.confirm(
        "Any amounts you've entered will not be saved. Hold this invoice and go back?"
      );
      if (!confirmHold) return;
    }
    addHeldPayment({
      orderId,
      customerName: invoice?.customerName,
      totalAmount: invoice?.totalAmount,
      balanceAmount: invoice?.balanceAmount,
      heldAt: new Date().toISOString(),
    });
    navigate(`/pos`);
  };

  /* ============================================================
     VIEW INVOICE
     ============================================================ */

  const handleViewInvoice = () => {
    navigate(`/pos/invoice/${orderId}`);
  };

  /* ============================================================
     DERIVED DISPLAY VALUES — all sourced from backend responses
     ============================================================ */

  const invoiceTotal = calc?.invoiceAmount ?? invoice?.totalAmount;
  const alreadyPaid = calc?.alreadyPaid ?? invoice?.paidAmount;
  const currentPayment = calc?.appliedAmount ?? 0;
  const remainingBalance = calc?.balanceAmount ?? invoice?.balanceAmount;
  const changeReturn = calc?.changeReturn ?? 0;

  const items = invoice?.items || [];
  const totalItemPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const pagedItems = items.slice((itemsPage - 1) * ITEMS_PER_PAGE, itemsPage * ITEMS_PER_PAGE);

  /* ============================================================
     RENDER
     ============================================================ */

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading invoice…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={pageStyle}>
        <div style={errorBannerStyle}>⚠ {loadError}</div>
        <button style={backBtnStyle} onClick={() => navigate(-1)}>← Back</button>
      </div>
    );
  }

  const sc = statusColor(invoice?.orderStatus);

  return (
    <div style={pageStyle}>
      {/* ================= TOP BAR ================= */}
      <div style={topBarStyle}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Automobile ERP</div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            POS <span style={{ margin: "0 4px" }}>›</span> Checkout{" "}
            <span style={{ margin: "0 4px" }}>›</span>{" "}
            <span style={{ color: "#2563eb", fontWeight: 600 }}>Payment</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ fontSize: "13px", color: "#64748b" }}>
            Cashier: <b style={{ color: "#0f172a" }}>{user?.username || user?.name || "—"}</b>
            &nbsp;&nbsp;Order #{orderId}
          </div>
        </div>
      </div>

      {/* ================= MAIN GRID ================= */}
      <div style={mainGridStyle}>
        {/* -------- LEFT: INVOICE SUMMARY -------- */}
        <div style={cardStyle}>
          <SectionHeader icon="🧾" title="Invoice Summary" subtitle="From server" />

          <SummaryLine label="Invoice Date" value={formatDateTime(invoice?.orderDate)} />
          <div style={statusRowStyle}>
            <span style={{ fontSize: "13px", color: "#64748b" }}>Status</span>
            <span style={{
              padding: "3px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 700,
              background: sc.bg,
              color: sc.color,
              border: `1px solid ${sc.border}`,
            }}>
              {invoice?.orderStatus}
            </span>
          </div>
          <Divider />
          <SummaryLine label="Total Amount" value={money(invoice?.totalAmount)} bold />
          <SummaryLine label="Paid Amount" value={money(invoice?.paidAmount)} color="#16a34a" />
          <SummaryLine label="Balance Amount" value={money(invoice?.balanceAmount)} color="#ef4444" bold />

          <Divider />
          <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.8 }}>
            <div><b style={{ color: "#0f172a" }}>{invoice?.customerName}</b></div>
            <div>📞 {invoice?.phone}</div>
          </div>
        </div>

        {/* -------- RIGHT: ORDER ITEMS (paginated) -------- */}
        <div style={cardStyle}>
          <SectionHeader icon="📦" title="Order Items" subtitle={`${items.length} item${items.length === 1 ? "" : "s"}`} />

          {items.length === 0 ? (
            <div style={{ fontSize: "12px", color: "#94a3b8", padding: "12px 0" }}>No items found for this order.</div>
          ) : (
            <>
              <table style={itemsTableStyle}>
                <thead>
                  <tr>
                    <th style={itemsThStyle}>Item</th>
                    <th style={{ ...itemsThStyle, textAlign: "center" }}>Qty</th>
                    <th style={{ ...itemsThStyle, textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={itemsTdStyle}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.itemName}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>{item.partNumber}</div>
                      </td>
                      <td style={{ ...itemsTdStyle, textAlign: "center" }}>{item.quantity}</td>
                      <td style={{ ...itemsTdStyle, textAlign: "right", fontWeight: 600 }}>
                        {money(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalItemPages > 1 && (
                <div style={paginationRowStyle}>
                  <button
                    style={pageBtnStyle}
                    disabled={itemsPage === 1}
                    onClick={() => setItemsPage((p) => Math.max(1, p - 1))}
                  >
                    ‹ Prev
                  </button>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Page {itemsPage} of {totalItemPages}
                  </span>
                  <button
                    style={pageBtnStyle}
                    disabled={itemsPage === totalItemPages}
                    onClick={() => setItemsPage((p) => Math.min(totalItemPages, p + 1))}
                  >
                    Next ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ================= ADD PAYMENT ================= */}
      <div style={{ ...cardStyle, marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb", display: "inline-block" }} />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>ADD PAYMENT</span>
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            Collected by:&nbsp;
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
              {collectedBy || "—"}
            </span>
          </div>
        </div>

        {calcError && <div style={errorBannerStyle}>⚠ {calcError}</div>}
        {saved && (
          <div style={successBannerStyle}>
            ✓ Payment recorded successfully. This invoice's payment methods are now locked.
          </div>
        )}
        {!saved && !fullyCovered && (
          <div style={infoBannerStyle}>
            ℹ Partial payments aren't allowed — entered payments must add up to the full balance before you can save.
          </div>
        )}
        {!saved && fullyCovered && needsChangeConfirmation && !changeConfirmed && (
          <div style={infoBannerStyle}>
            ℹ Confirm the change return checkbox below before you can save this payment.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr 32px", gap: "12px", marginBottom: "6px" }}>
          <div style={colLabelStyle}>METHOD</div>
          <div style={colLabelStyle}>AMOUNT (₹)</div>
          <div style={colLabelStyle}>TRANSACTION / CHEQUE NO.</div>
          <div style={colLabelStyle}>REMARKS</div>
          <div />
        </div>

        {rows.map((row) => (
          <div key={row.rowId} style={{ marginBottom: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr 32px", gap: "12px", alignItems: "start" }}>
              <select
                value={row.method}
                disabled={saved}
                onChange={(e) => handleMethodChange(row, e.target.value)}
                style={inputStyle}
              >
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                placeholder={row.method === "CASH" ? "Amount received" : "Amount"}
                value={row.amount}
                disabled={saved}
                onChange={(e) => updateRow(row.rowId, { amount: e.target.value })}
                style={inputStyle}
              />

              {row.method === "CASH" ? (
                <div style={{ fontSize: "12px", color: "#94a3b8", padding: "9px 0" }}>N/A for Cash</div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ ...inputStyle, background: "#f8fafc", color: row.transactionNumber ? "#0f172a" : "#94a3b8" }}>
                    {row.transactionNumber || "Not entered"}
                  </div>
                  <button
                    type="button"
                    disabled={saved}
                    onClick={() =>
                      setTxnModal({ rowId: row.rowId, method: row.method, value: row.transactionNumber, previousMethod: row.method })
                    }
                    style={editTxnBtnStyle}
                  >
                    ✎
                  </button>
                </div>
              )}

              <input
                type="text"
                placeholder="Optional remarks"
                value={row.remarks}
                disabled={saved}
                onChange={(e) => updateRow(row.rowId, { remarks: e.target.value })}
                style={inputStyle}
              />

              {!saved && rows.length > 1 && (
                <button onClick={() => removeRow(row.rowId)} style={removeRowBtnStyle} aria-label="Remove payment row">✕</button>
              )}
            </div>
          </div>
        ))}

        {needsChangeConfirmation && (
          <div style={changeReturnBoxStyle}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a", marginBottom: "8px" }}>
              Change Return: {money(changeReturn)}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#166534", cursor: saved ? "default" : "pointer" }}>
              <input
                type="checkbox"
                checked={changeConfirmed}
                disabled={saved}
                onChange={(e) => setChangeConfirmed(e.target.checked)}
              />
              I've handed {money(changeReturn)} change back to the customer
            </label>
          </div>
        )}

        {canAddAnotherMethod && (
          <button onClick={addRow} style={addRowBtnStyle}>+ Add Another Payment Method</button>
        )}

        <Divider style={{ margin: "18px 0" }} />

        {/* -------- STAT BOXES -------- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          <StatBox label="Invoice Total" value={money(invoiceTotal)} />
          <StatBox label="Already Paid" value={money(alreadyPaid)} />
          <StatBox label="Current Payment" value={money(currentPayment)} highlight />
          <StatBox label="Remaining Balance" value={money(remainingBalance)} color={Number(remainingBalance) > 0 ? "#ef4444" : "#16a34a"} />
        </div>
      </div>

      {/* ================= FOOTER ACTIONS ================= */}
      <div style={footerBarStyle}>
        <button style={backFooterBtnStyle} onClick={() => navigate(-1)}>← Back</button>
        <div style={{ display: "flex", gap: "10px" }}>
          {!saved && <button style={holdBtnStyle} onClick={handleHoldPayment}>Hold Payment</button>}
          <button
            style={{
              ...saveBtnStyle,
              opacity: saving || saved || !canSave ? 0.6 : 1,
              cursor: saving || saved || !canSave ? "not-allowed" : "pointer",
            }}
            onClick={handleSavePayment}
            disabled={saving || saved || !canSave}
            title={
              !fullyCovered
                ? "Full payment is required before saving"
                : needsChangeConfirmation && !changeConfirmed
                ? "Confirm the change return checkbox before saving"
                : undefined
            }
          >
            {saving ? "Saving…" : saved ? "✓ Payment Saved" : "Save Payment"}
          </button>
          <button
            style={{ ...invoiceBtnStyle, opacity: saved ? 1 : 0.5, cursor: saved ? "pointer" : "not-allowed" }}
            onClick={handleViewInvoice}
            disabled={!saved}
          >
            View Invoice →
          </button>
        </div>
      </div>

      {/* ================= TRANSACTION NUMBER POPUP ================= */}
      {txnModal && (
        <div style={modalOverlayStyle} onClick={cancelTxnModal}>
          <div style={{ ...modalCardStyle, maxWidth: "360px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
              {PAYMENT_METHOD_OPTIONS.find((o) => o.value === txnModal.method)?.label} Reference
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>
              Enter the transaction / reference / cheque number for this payment.
            </div>
            <input
              type="text"
              autoFocus
              placeholder="Transaction / Reference No."
              value={txnModal.value}
              onChange={(e) => setTxnModal((m) => ({ ...m, value: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && confirmTxnModal()}
              style={inputStyle}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button style={backFooterBtnStyle} onClick={cancelTxnModal}>Cancel</button>
              <button style={saveBtnStyle} onClick={confirmTxnModal}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SMALL PRESENTATIONAL PIECES
   ============================================================ */

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={sectionHeaderStyle}>
      <div style={sectionIconStyle}>{icon}</div>
      <div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>{title}</div>
        <div style={{ fontSize: "11px", color: "#94a3b8" }}>{subtitle}</div>
      </div>
    </div>
  );
}

function SummaryLine({ label, value, bold, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px" }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: color || "#0f172a" }}>{value}</span>
    </div>
  );
}

function StatBox({ label, value, highlight, color }) {
  return (
    <div style={{ ...statBoxStyle, ...(highlight ? { background: "#eff6ff", borderColor: "#bfdbfe" } : {}) }}>
      <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", color: "#94a3b8", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: "17px", fontWeight: 700, color: color || (highlight ? "#2563eb" : "#0f172a"), marginTop: "4px" }}>
        {value}
      </div>
    </div>
  );
}

function Divider({ style }) {
  return <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "10px 0", ...style }} />;
}

/* ============================================================
   STYLES
   ============================================================ */

const pageStyle = {
  minHeight: "100vh",
  background: "#f1f5f9",
  padding: "16px 16px 90px",
  fontFamily: "sans-serif",
};

const topBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
};

const mainGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "18px",
};

const sectionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "12px",
  paddingBottom: "10px",
  borderBottom: "1px solid #f1f5f9",
};

const sectionIconStyle = {
  width: "34px",
  height: "34px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
};

const statusRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "6px 0",
};

const colLabelStyle = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.05em",
  color: "#94a3b8",
  textTransform: "uppercase",
};

const inputStyle = {
  width: "100%",
  padding: "9px 11px",
  fontSize: "13px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  background: "#fff",
  color: "#0f172a",
  outline: "none",
  fontFamily: "sans-serif",
  boxSizing: "border-box",
};

const editTxnBtnStyle = {
  width: "34px",
  height: "36px",
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#2563eb",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
  flexShrink: 0,
};

const removeRowBtnStyle = {
  width: "32px",
  height: "36px",
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#ef4444",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
};

const addRowBtnStyle = {
  border: "1.5px dashed #93c5fd",
  background: "#fff",
  color: "#2563eb",
  fontSize: "13px",
  fontWeight: 600,
  padding: "9px 16px",
  borderRadius: "8px",
  cursor: "pointer",
};

const statBoxStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "12px 14px",
  background: "#f8fafc",
};

const errorBannerStyle = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#b91c1c",
  fontSize: "13px",
  borderRadius: "8px",
  padding: "10px 12px",
  marginBottom: "12px",
};

const successBannerStyle = {
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontSize: "13px",
  borderRadius: "8px",
  padding: "10px 12px",
  marginBottom: "12px",
};

const infoBannerStyle = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e40af",
  fontSize: "12px",
  borderRadius: "8px",
  padding: "9px 12px",
  marginBottom: "12px",
};

const changeReturnBoxStyle = {
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "10px 12px",
  marginBottom: "12px",
};

const backBtnStyle = {
  fontSize: "13px",
  color: "#64748b",
  cursor: "pointer",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "8px 16px",
  background: "#fff",
};

const footerBarStyle = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  background: "#fff",
  borderTop: "1px solid #e2e8f0",
  padding: "14px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const backFooterBtnStyle = {
  fontSize: "13px",
  color: "#64748b",
  cursor: "pointer",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "10px 18px",
  background: "#fff",
};

const holdBtnStyle = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#92400e",
  cursor: "pointer",
  border: "1px solid #fcd34d",
  borderRadius: "8px",
  padding: "10px 18px",
  background: "#fffbeb",
};

const saveBtnStyle = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  padding: "10px 22px",
  background: "#2563eb",
};

const invoiceBtnStyle = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  padding: "10px 22px",
  background: "#16a34a",
};

/* ---------- items panel ---------- */

const itemsTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const itemsThStyle = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.05em",
  color: "#94a3b8",
  textTransform: "uppercase",
  textAlign: "left",
  padding: "6px 4px",
  borderBottom: "1px solid #f1f5f9",
};

const itemsTdStyle = {
  fontSize: "13px",
  padding: "8px 4px",
  borderBottom: "1px solid #f8fafc",
  verticalAlign: "top",
};

const paginationRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "12px",
};

const pageBtnStyle = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#2563eb",
  border: "1px solid #bfdbfe",
  background: "#fff",
  borderRadius: "6px",
  padding: "5px 12px",
  cursor: "pointer",
};

/* ---------- modals ---------- */

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalCardStyle = {
  background: "#fff",
  borderRadius: "12px",
  padding: "20px",
  width: "90%",
  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
};

export default PaymentPage;
