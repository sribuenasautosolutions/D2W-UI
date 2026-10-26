import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { calculateOrder } from "../../services/orderService";
import { getCustomerByMobile } from "../../services/customerService";
import PaymentPageor from "./PaymentPageor";
import { getCalculationLinesForCartItem, sumCalculatedAmount } from "../utils/calculationLines";
import d2wLogo from "./D2W-Logo.png";
import "./CheckoutPage.css";


const RECALC_DEBOUNCE_MS = 400;


const money = (value) => `₹${Number(value ?? 0).toFixed(2)}`;


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


function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    cartItems,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    updateDiscount,
    clearCart,
  } = useCart();

  /* ---------- Customer inputs ---------- */
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [customerExists, setCustomerExists] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  /* ---------- Cashier-editable financial inputs ---------- */
  const [billDiscount, setBillDiscount] = useState("0");

  /* ---------- Backend calculation (single source of truth) ---------- */
  const [calculation, setCalculation] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState("");

  /* ---------- Order placement ---------- */
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState(null);
  const [checkingQuantity, setCheckingQuantity] = useState(false);
  const quantityCheckRef = useRef(false);
  const currentCartRef = useRef(cartItems);
  useEffect(() => { currentCartRef.current = cartItems; }, [cartItems]);
  const [activeOrderId, setActiveOrderId] = useState(searchParams.get("orderId") || "");
  const [activeDraftId] = useState(searchParams.get("draftId") || localStorage.getItem("pos_active_draft_id") || "");

  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const storeId = localStorage.getItem("pos_store_id") || getUser()?.storeId;

  useEffect(() => {
    if (!activeDraftId) return;
    try {
      const drafts = JSON.parse(localStorage.getItem("pos_held_payments") || "[]");
      const draft = drafts.find((entry) => String(entry.draftId) === String(activeDraftId));
      if (!draft) return;
      setCustomerName(draft.customerName || "");
      setPhone(draft.phone || "");
      setAddress(draft.address || "");
      setSelectedCustomer(draft.selectedCustomer || null);
      setBillDiscount(String(draft.billDiscount || 0));
    } catch { /* invalid local draft is ignored */ }
  }, [activeDraftId]);

  /* ============================================================
     BUILD /orders/recalculate REQUEST
     Payload matches OrderCalculationRequestDTO exactly:
     { storeId, billDiscountPercent, items: [{ inventoryId, quantity,
       discountPercentage, gstType }] }
     StoreInventory is the pillar — POS always sells by inventoryId,
     never by productId (which is null for Local Products).
     ============================================================ */

  const effectiveGstType = useCallback((item) => {
    const rate = Number(item.gstPercentage ?? 0);
    return rate === 0 ? "NONE" : `${item.gstType?.startsWith("IGST_") ? "IGST" : "GST"}_${rate}`;
  }, []);

  const buildCalculationRequest = useCallback(
    () => ({
      storeId,
      billDiscountPercent: Number(billDiscount || 0),
      items: cartItems.map((item) => ({
        inventoryId: item.inventoryId,
        batchId: item.batchId,
        productId: item.productId,
        quantity: item.quantity,
        discountPercentage: Number(item.itemDiscount || 0),
        gstType: effectiveGstType(item),
      })),
    }),
    [storeId, billDiscount, cartItems, effectiveGstType]
  );

  /* ============================================================
     AUTO-RECALCULATE (debounced)
     Fires whenever quantity, item discount or bill discount
     changes. Stale responses are ignored via requestId.
     ============================================================ */

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!storeId) {
      navigate("/login");
      return;
    }

    if (cartItems.length === 0) {
      setCalculation(null);
      setCalcLoading(false);
      setCalcError("");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCalculation(null);
    setCalcLoading(true);
    setCalcError("");

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await calculateOrder(buildCalculationRequest());
        if (requestId === requestIdRef.current) {
          setCalculation(response);
        }
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setCalcError(extractError(error)); // e.g. stock validation from backend
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setCalcLoading(false);
        }
      }
    }, RECALC_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [cartItems, billDiscount, storeId, buildCalculationRequest, navigate]);

  /* ============================================================
     Fast lookup: inventoryId -> backend calculation line
     (Handled per-row via getCalculationLinesForCartItem, kept
     from the original implementation.)
     ============================================================ */

  /* ============================================================
     CUSTOMER LOOKUP
     ============================================================ */

  const handleMobileChange = async (mobile) => {
    const digits = mobile.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    setSelectedCustomer(null);

    if (digits.length !== 10) {
      setCustomerExists(false);
      return;
    }
    try {
      const customer = await getCustomerByMobile(digits, storeId);
      if (customer) {
        setCustomerName(customer.customerName);
        setAddress(customer.billingAddress || "");
        setSelectedCustomer(customer);
        setCustomerExists(true);
      } else {
        setCustomerExists(false);
      }
    } catch (error) {
      console.error(error);
      setCustomerExists(false);
    }
  };

  /* ============================================================
     OPEN PAYMENT — no order is persisted until payment confirmation
     Sends ONLY raw inputs. Backend recalculates everything.
     ============================================================ */

  const handlePlaceOrder = async (action = "PAY") => {
    if (creatingInvoice || checkingQuantity || paymentDraft || calcLoading || !calculation) return;

    if (cartItems.length === 0) {
      alert("Cart is empty. Please add at least one item before creating an invoice.");
      return;
    }
    if (!customerName.trim()) {
      alert("Customer name is required.");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (calcError) {
      alert("Please resolve the highlighted issue before creating the invoice:\n" + calcError);
      return;
    }

    if (action === "HOLD") {
      let held = [];
      try { held = JSON.parse(localStorage.getItem("pos_held_payments") || "[]"); } catch { held = []; }
      const draftId = activeDraftId || `draft-${Date.now()}`;
      const record = {
        draftId, customerName: customerName.trim(), phone, address, selectedCustomer,
        cartItems, billDiscount,
        totalAmount: calculation?.netPayable || 0,
        balanceAmount: calculation?.netPayable || 0,
        heldAt: new Date().toISOString(),
      };
      localStorage.setItem("pos_held_payments", JSON.stringify([
        record,
        ...held.filter((entry) => String(entry.draftId) !== String(draftId)),
      ]));
      localStorage.removeItem("pos_active_draft_id");
      clearCart();
      navigate("/pos");
      return;
    }

    setCreatingInvoice(true);
    try {
      const orderData = {
        storeId,
        customerId: selectedCustomer?.id ?? null,
        customerName: customerName.trim(),
        phone,
        address,
        customerGstin: selectedCustomer?.gstin ?? null,
        customerGstRegistrationType: selectedCustomer?.gstRegistrationType ?? "UNREGISTERED",
        customerState: selectedCustomer?.state ?? null,
        customerEmail: selectedCustomer?.email ?? null,
        billingAddress: address || selectedCustomer?.billingAddress || null,
        shippingAddress: selectedCustomer?.shippingAddress || address || null,
        paymentMethod: "PENDING", // committed only with successful payment
        billDiscountPercent: Number(billDiscount || 0),
        items: cartItems.map((item) => ({
          inventoryId: item.inventoryId,
          batchId: item.batchId,
          productId: item.productId,
          quantity: item.quantity,
          discountPercentage: Number(item.itemDiscount || 0),
          gstType: effectiveGstType(item),
        })),
      };

      setPaymentDraft({
        order: orderData,
        calculation: buildCalculationRequest(),
        invoice: {
          customerName: orderData.customerName, phone, address,
          orderStatus: "PENDING_PAYMENT", totalAmount: calculation.netPayable,
          paidAmount: 0, balanceAmount: calculation.netPayable,
          items: calculation.items,
        },
      });
    } catch (error) {
      alert(extractError(error));
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handlePaymentSaved = () => {
      if (activeDraftId) {
        let held = [];
        try { held = JSON.parse(localStorage.getItem("pos_held_payments") || "[]"); } catch { held = []; }
        localStorage.setItem("pos_held_payments", JSON.stringify(held.filter((entry) => String(entry.draftId) !== String(activeDraftId))));
        localStorage.removeItem("pos_active_draft_id");
      }
  };

  const handleIncreaseQuantity = async (item) => {
    if (quantityCheckRef.current) return;
    const snapshot = cartItems;
    quantityCheckRef.current = true;
    setCheckingQuantity(true);
    try {
      const request = buildCalculationRequest();
      request.items = request.items.map((line) =>
        line.inventoryId === item.inventoryId && line.batchId === item.batchId
          ? { ...line, quantity: Number(line.quantity) + 1 } : line);
      // Validate against current server stock BEFORE changing the cart.
      await calculateOrder(request);
      if (currentCartRef.current === snapshot) increaseQuantity(item.inventoryId, item.batchId);
    } catch (error) {
      alert(extractError(error));
    } finally {
      quantityCheckRef.current = false;
      setCheckingQuantity(false);
    }
  };

  /* ============================================================
     RENDER
     ============================================================ */

  const disablePlaceOrder =
    creatingInvoice || checkingQuantity || calcLoading || !calculation || cartItems.length === 0 || !!calcError;

  return (
    <>
      <div className="checkout-page">
        {/* ================= NAVBAR ================= */}
        <header className="checkout-navbar">
          <img src={d2wLogo} alt="Deals2Wheels" className="checkout-navbar-logo" />
          <button type="button" className="checkout-navbar-back" onClick={() => navigate(-1)}>
            ← Back to POS
          </button>
        </header>

        {/* ================= COMPACT CENTERED HEADING ================= */}
        <div className="checkout-heading">
          <h1>Checkout</h1>
          <p>Complete your order and make payment</p>
          {activeDraftId && (
            <button type="button" className="checkout-add-items-btn" onClick={() => navigate("/pos")}>
              + Add Items
            </button>
          )}
        </div>

        {/* ================= STEP INDICATOR (decorative) ================= */}
        <div className="checkout-steps">
          <div className="checkout-step active">
            <span className="checkout-step-badge">1</span>
            <div className="checkout-step-copy">
              <strong>Customer Details</strong>
              <small>Add customer information</small>
            </div>
          </div>
          <div className="checkout-step-line" />
          <div className="checkout-step">
            <span className="checkout-step-badge">2</span>
            <div className="checkout-step-copy">
              <strong>Order Items</strong>
              <small>Review your items</small>
            </div>
          </div>
          <div className="checkout-step-line" />
          <div className="checkout-step">
            <span className="checkout-step-badge">3</span>
            <div className="checkout-step-copy">
              <strong>Payment</strong>
              <small>Complete payment</small>
            </div>
          </div>
        </div>

        {/* ================= MAIN GRID ================= */}
        <div className="checkout-grid">
          {/* -------- LEFT: CUSTOMER DETAILS -------- */}
          <div className="checkout-card">
            <SectionHeader icon="👤" title="Customer Details" subtitle="Enter customer information" />

            <Field label="Mobile Number *">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => handleMobileChange(e.target.value)}
                className="checkout-input"
                maxLength={10}
              />
              {phone.length > 0 && phone.length < 10 && (
                <Hint type="error">Enter all 10 digits</Hint>
              )}
              {customerExists && <Hint type="success">✓ Existing customer found</Hint>}
            </Field>

            <Field label="Customer Name *">
              <input
                type="text"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="checkout-input"
              />
            </Field>

            <Field label="Address (optional)">
              <input
                type="text"
                placeholder="Enter address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="checkout-input"
              />
            </Field>

            <div className="checkout-payment-box">
              <div className="checkout-payment-box-header">
                <span>💳</span>
                <span>Payment Information</span>
              </div>
              <p className="checkout-payment-box-text">
                Invoice will be created only after payment is collected and saved.
              </p>
            </div>
          </div>

          {/* -------- CENTER: ORDER ITEMS TABLE -------- */}
          <div className="checkout-card">
            <SectionHeader icon="🛒" title={`Order Items (${cartItems.length})`} subtitle="All amounts are calculated by the server" />

            {calcError && (
              <div className="checkout-error-banner" role="alert">
                ⚠ {calcError}
              </div>
            )}

            {cartItems.length === 0 ? (
              <div className="checkout-empty-state">
                Cart is empty — go back to POS and add products.
              </div>
            ) : (
              <div className="checkout-table-wrap">
                <table className="checkout-table">
                  <colgroup>
                    <col className="col-product" />
                    <col className="col-part" />
                    <col className="col-hsn" />
                    <col className="col-mrp" />
                    <col className="col-rate" />
                    <col className="col-qty" />
                    <col className="col-disc" />
                    <col className="col-gst" />
                    <col className="col-taxable" />
                    <col className="col-total" />
                    <col className="col-action" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="align-left">Product</th>
                      <th>Part Number</th>
                      <th>HSN</th>
                      <th className="align-right">MRP</th>
                      <th className="align-right">Rate</th>
                      <th>Qty</th>
                      <th>Disc %</th>
                      <th>GST</th>
                      <th className="align-right">Taxable</th>
                      <th className="align-right">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item) => {
                      const lines = getCalculationLinesForCartItem(item, calculation?.items || []);
                      const line = lines[0];
                      const multipleBatches = lines.length > 1;
                      return (
                        <tr key={`${item.inventoryId}_${item.batchId}`}>
                          {/* Product */}
                          <td>
                            <div className="checkout-product-cell">
                              <div className="checkout-product-info">
                                <div className="checkout-product-name">
                                  {line?.productName || item.itemName}
                                </div>
                                {(line?.brandName || item.brandName) && (
                                  <div className="checkout-product-brand">
                                    {line?.brandName || item.brandName}
                                  </div>
                                )}
                                {line && (
                                  <div className="checkout-product-stock">
                                    Stock: {line.stock}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Part number — readonly, from backend */}
                          <td className="align-center">
                            <span className="checkout-part-number">
                              {line?.partNumber || item.partNumber || "—"}
                            </span>
                          </td>

                          {/* HSN — readonly, from backend */}
                          <td className="align-center">
                            <span className="checkout-hsn">{line?.hsnCode || "—"}</span>
                          </td>

                          {/* MRP — readonly, from backend */}
                          <td className="align-right">
                            {line ? (multipleBatches ? "Multiple batches" : money(line.mrp)) : "…"}
                          </td>

                          {/* Rate — readonly, from backend */}
                          <td className="align-right">
                            {line ? (multipleBatches ? "Multiple batches" : money(line.sellingPrice)) : "…"}
                          </td>

                          {/* Qty — cashier input */}
                          <td>
                            <div className="checkout-qty-control">
                              <button
                                type="button"
                                onClick={() => decreaseQuantity(item.inventoryId, item.batchId)}
                                className="checkout-qty-btn"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span className="checkout-qty-value">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleIncreaseQuantity(item)}
                                disabled={checkingQuantity}
                                className="checkout-qty-btn"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Item Discount % — cashier input */}
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.itemDiscount || 0}
                              onChange={(e) => updateDiscount(item.inventoryId, item.batchId, e.target.value)}
                              className="checkout-discount-input"
                              aria-label="Item discount percent"
                            />
                          </td>

                          <td>
                            <span className="checkout-gst-fixed">{Number(item.gstPercentage ?? 0)}%</span>
                          </td>

                          {/* Taxable — readonly, from backend */}
                          <td className="align-right">
                            {line ? money(sumCalculatedAmount(lines, "taxableAmount")) : "…"}
                          </td>

                          {/* Line total — readonly, from backend */}
                          <td className="align-right" style={{ fontWeight: 700 }}>
                            {line ? money(sumCalculatedAmount(lines, "lineTotal")) : "…"}
                          </td>

                          {/* Remove */}
                          <td className="align-center">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.inventoryId, item.batchId)}
                              className="checkout-remove-btn"
                              aria-label="Remove item"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {cartItems.length > 0 && (
              <div className="checkout-items-footer">
                <div className="checkout-items-footer-left">Total Items: {cartItems.length}</div>
                <button
                  type="button"
                  className="checkout-clear-btn"
                  onClick={() => { if (window.confirm("Clear all items from the cart?")) clearCart(); }}
                >
                  🗑 Clear Cart
                </button>
              </div>
            )}
          </div>

          {/* -------- RIGHT: STICKY BILL SUMMARY -------- */}
          <div>
            <div className="checkout-card checkout-bill-summary">
              <SectionHeader icon="🧾" title="Bill Summary" subtitle="Calculated by server" />

              {calcLoading && (
                <div className="checkout-recalc-hint">Recalculating…</div>
              )}

              <div className="checkout-bill-discount-box">
                <label htmlFor="bill-discount" className="checkout-bill-discount-label">
                  🏷️ Bill Discount (%)
                </label>
                <div className="checkout-bill-discount-input-wrap">
                  <input
                    id="bill-discount"
                    type="number"
                    min="0"
                    max="100"
                    value={billDiscount}
                    onChange={(e) => setBillDiscount(e.target.value)}
                    className="checkout-bill-discount-input"
                  />
                  <span className="checkout-bill-discount-suffix">%</span>
                </div>
              </div>

              {/* All values below come straight from the backend response */}
              <SummaryRow label={`Gross Amount (${calculation?.totalItems ?? 0} items, qty ${calculation?.totalQuantity ?? 0})`} value={calculation?.grossAmount} />
              <SummaryRow label="Item Discount" value={calculation?.itemDiscount} negative />
              <SummaryRow label="Taxable Amount" value={calculation?.taxableAmount} />
              <SummaryRow label="CGST" value={calculation?.cgst} />
              <SummaryRow label="SGST" value={calculation?.sgst} />
              <SummaryRow label="IGST" value={calculation?.igst} />
              <SummaryRow label="Bill Discount" value={calculation?.billDiscount} negative />
              <SummaryRow label="Round Off" value={calculation?.roundOff} />

              <div className="checkout-net-payable-row">
                <span className="checkout-net-payable-label">Net Payable</span>
                <span className="checkout-net-payable-value">
                  {calcLoading ? "…" : money(calculation?.netPayable)}
                </span>
              </div>

              <div className="checkout-actions-grid">
                <button
                  type="button"
                  onClick={() => handlePlaceOrder("HOLD")}
                  disabled={disablePlaceOrder}
                  className="checkout-action-btn checkout-hold-btn"
                  style={{ opacity: disablePlaceOrder ? 0.6 : 1 }}
                >
                  {creatingInvoice ? "Creating…" : "Hold Bill"}
                </button>
                <button
                  type="button"
                  onClick={() => handlePlaceOrder("PAY")}
                  disabled={disablePlaceOrder}
                  className="checkout-action-btn checkout-pay-btn"
                  style={{ opacity: disablePlaceOrder ? 0.6 : 1, cursor: disablePlaceOrder ? "not-allowed" : "pointer" }}
                >
                  {creatingInvoice ? "Opening Payment…" : "Make Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(paymentDraft || activeOrderId) && (
        <div className="checkout-payment-overlay">
          <div className="checkout-payment-modal">
            <PaymentPageor
              orderIdOverride={activeOrderId}
              checkoutDraft={paymentDraft}
              onPaymentSaved={handlePaymentSaved}
              embedded
              compact
              onCancel={() => { setPaymentDraft(null); setActiveOrderId(""); }}
              onInvoice={(orderId) => navigate(`/pos/invoice/${orderId}`)}
              onNewSale={() => navigate("/pos")}
            />
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   SMALL PRESENTATIONAL PIECES
   ============================================================ */

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="checkout-section-header">
      <div className="checkout-section-icon">{icon}</div>
      <div>
        <div className="checkout-section-title">{title}</div>
        <div className="checkout-section-subtitle">{subtitle}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="checkout-field">
      <label className="checkout-field-label">{label}</label>
      {children}
    </div>
  );
}

function Hint({ type, children }) {
  return <div className={`checkout-hint checkout-hint--${type}`}>{children}</div>;
}

function SummaryRow({ label, value, negative }) {
  const displayValue = value == null ? "—" : `${negative ? "- " : ""}${money(value)}`;
  return (
    <div className={`checkout-summary-row ${negative ? "checkout-summary-row--negative" : ""}`}>
      <span>{label}</span>
      <span>{displayValue}</span>
    </div>
  );
}

export default CheckoutPage;
