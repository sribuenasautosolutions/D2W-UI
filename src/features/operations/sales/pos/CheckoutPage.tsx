import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "./context/CartContext";
import { calculateOrder } from "../../../../services/orderService";
import { getCustomerByMobile } from "../../../../services/customerService";
import PaymentPageor from "./PaymentPageor";
import {
  getCalculationLinesForCartItem,
  sumCalculatedAmount,
} from "./utils/calculationLines";
import d2wLogo from "../../../../assets/d2w-logo.png";

const FIXED_GST_TYPE = "GST_18";
const FIXED_GST_LABEL = "18%";

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
  currentCartRef.current = cartItems;
  const [activeOrderId, setActiveOrderId] = useState(
    searchParams.get("orderId") || "",
  );
  const [activeDraftId] = useState(
    searchParams.get("draftId") ||
      localStorage.getItem("pos_active_draft_id") ||
      "",
  );

  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const storeId = localStorage.getItem("pos_store_id") || getUser()?.storeId;

  useEffect(() => {
    if (!activeDraftId) return;
    try {
      const drafts = JSON.parse(
        localStorage.getItem("pos_held_payments") || "[]",
      );
      const draft = drafts.find(
        (entry) => String(entry.draftId) === String(activeDraftId),
      );
      if (!draft) return;
      setCustomerName(draft.customerName || "");
      setPhone(draft.phone || "");
      setAddress(draft.address || "");
      setSelectedCustomer(draft.selectedCustomer || null);
      setBillDiscount(String(draft.billDiscount || 0));
    } catch {
      /* invalid local draft is ignored */
    }
  }, [activeDraftId]);

  /* ============================================================
     BUILD /orders/recalculate REQUEST
     Payload matches OrderCalculationRequestDTO exactly:
     { storeId, billDiscountPercent, items: [{ inventoryId, quantity,
       discountPercentage, gstType }] }
     StoreInventory is the pillar — POS always sells by inventoryId,
     never by productId (which is null for Local Products). GST is
     always FIXED_GST_TYPE now — no per-item or per-invoice override.
     ============================================================ */

  const effectiveGstType = useCallback((_item?: any) => FIXED_GST_TYPE, []);

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
    [storeId, billDiscount, cartItems, effectiveGstType],
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
    if (
      creatingInvoice ||
      checkingQuantity ||
      paymentDraft ||
      calcLoading ||
      !calculation
    )
      return;

    if (cartItems.length === 0) {
      alert(
        "Cart is empty. Please add at least one item before creating an invoice.",
      );
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
      alert(
        "Please resolve the highlighted issue before creating the invoice:\n" +
          calcError,
      );
      return;
    }

    if (action === "HOLD") {
      let held = [];
      try {
        held = JSON.parse(localStorage.getItem("pos_held_payments") || "[]");
      } catch {
        held = [];
      }
      const draftId = activeDraftId || `draft-${Date.now()}`;
      const record = {
        draftId,
        customerName: customerName.trim(),
        phone,
        address,
        selectedCustomer,
        cartItems,
        billDiscount,
        totalAmount: calculation?.netPayable || 0,
        balanceAmount: calculation?.netPayable || 0,
        heldAt: new Date().toISOString(),
      };
      localStorage.setItem(
        "pos_held_payments",
        JSON.stringify([
          record,
          ...held.filter((entry) => String(entry.draftId) !== String(draftId)),
        ]),
      );
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
        customerGstRegistrationType:
          selectedCustomer?.gstRegistrationType ?? "UNREGISTERED",
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
          customerName: orderData.customerName,
          phone,
          address,
          orderStatus: "PENDING_PAYMENT",
          totalAmount: calculation.netPayable,
          paidAmount: 0,
          balanceAmount: calculation.netPayable,
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
      try {
        held = JSON.parse(localStorage.getItem("pos_held_payments") || "[]");
      } catch {
        held = [];
      }
      localStorage.setItem(
        "pos_held_payments",
        JSON.stringify(
          held.filter(
            (entry) => String(entry.draftId) !== String(activeDraftId),
          ),
        ),
      );
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
          ? { ...line, quantity: Number(line.quantity) + 1 }
          : line,
      );
      // Validate against current server stock BEFORE changing the cart.
      await calculateOrder(request);
      if (currentCartRef.current === snapshot)
        increaseQuantity(item.inventoryId, item.batchId);
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
    creatingInvoice ||
    checkingQuantity ||
    calcLoading ||
    !calculation ||
    cartItems.length === 0 ||
    !!calcError;

  return (
    <>
      <div className="checkout-page">
        <style>{`
/* =========================================================
   Font
   ========================================================= */

@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");

.checkout-page {
  min-height: 100vh;
  background: #f1f5f9;

  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* =========================================================
   Navbar — logo + Back to POS only, per spec
   ========================================================= */

.checkout-navbar {
  height: 56px;
  background: #062d83;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-5);
}

.checkout-navbar-logo {
  height: 30px;
  width: auto;
  display: block;
}

.checkout-navbar-back {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  height: 34px;
  padding: 0 var(--sp-4);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
}

.checkout-navbar-back:hover {
  background: rgba(255, 255, 255, 0.18);
}

/* =========================================================
   Compact centered heading
   ========================================================= */

.checkout-heading {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--sp-4) var(--sp-5) var(--sp-3);
}

.checkout-heading h1 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.checkout-heading p {
  margin: 2px 0 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
}

.checkout-add-items-btn {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 var(--sp-4);
  border: 1px solid #93c5fd;
  border-radius: 7px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

/* =========================================================
   Step indicator (decorative progress tracker — non-interactive,
   the page below always shows every section at once regardless
   of "step")
   ========================================================= */

.checkout-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  max-width: 900px;
  margin: 0 auto var(--sp-4);
  padding: 0 var(--sp-5);
}

.checkout-step {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-shrink: 0;
}

.checkout-step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.checkout-step.active .checkout-step-badge {
  background: #2563eb;
  color: #ffffff;
}

.checkout-step-copy {
  text-align: left;
  white-space: nowrap;
}

.checkout-step-copy strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.checkout-step-copy small {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
}

.checkout-step-line {
  flex: 1;
  min-width: 40px;
  height: 2px;
  background: #e2e8f0;
}

/* =========================================================
   Main grid — Order Items gets the most space
   ========================================================= */

.checkout-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 300px;
  gap: var(--sp-4);
  align-items: start;
  padding: 0 var(--sp-5) var(--sp-5);
}

.checkout-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: var(--sp-4);
  box-sizing: border-box;
}

.checkout-bill-summary {
  position: sticky;
  top: 14px;
}

.checkout-section-header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-4);
  padding-bottom: var(--sp-3);
  border-bottom: 1px solid #f1f5f9;
}

.checkout-section-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
}

.checkout-section-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.checkout-section-subtitle {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
}

/* =========================================================
   Customer details
   ========================================================= */

.checkout-field {
  margin-bottom: var(--sp-3);
}

.checkout-field-label {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  display: block;
  margin-bottom: var(--sp-1);
}

.checkout-input {
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  font-size: 13px;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
}

.checkout-input:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.checkout-hint {
  font-size: 11px;
  font-weight: 600;
  margin-top: 3px;
}

.checkout-hint--error { color: #ef4444; }
.checkout-hint--success { color: #16a34a; }

.checkout-payment-box {
  margin-top: var(--sp-3);
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: var(--sp-3) var(--sp-4);
  background: #eff6ff;
}

.checkout-payment-box-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-1);
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
}

.checkout-payment-box-text {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: #3b82f6;
  line-height: 1.5;
}

/* =========================================================
   Order items table
   Columns: Product | Part Number | HSN | MRP | Rate | Qty |
            Disc % | GST (fixed 18%) | Taxable | Total | delete
   ========================================================= */

.checkout-error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
  padding: var(--sp-2) var(--sp-3);
  margin-bottom: var(--sp-3);
}

.checkout-empty-state {
  text-align: center;
  padding: var(--sp-8) 0;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}

.checkout-table-wrap {
  width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.checkout-table-wrap::-webkit-scrollbar {
  height: 6px;
}

.checkout-table-wrap::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.checkout-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.checkout-table col.col-product { width: 21%; }
.checkout-table col.col-part { width: 11%; }
.checkout-table col.col-hsn { width: 8%; }
.checkout-table col.col-mrp { width: 8%; }
.checkout-table col.col-rate { width: 8%; }
.checkout-table col.col-qty { width: 10%; }
.checkout-table col.col-disc { width: 7%; }
.checkout-table col.col-gst { width: 7%; }
.checkout-table col.col-taxable { width: 9%; }
.checkout-table col.col-total { width: 9%; }
.checkout-table col.col-action { width: 32px; }

.checkout-table th {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-align: center;
  padding: var(--sp-2) var(--sp-2);
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
}

.checkout-table th.align-left { text-align: left; }
.checkout-table th.align-right { text-align: right; }

.checkout-table td {
  padding: var(--sp-3) var(--sp-2);
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  vertical-align: middle;
  border-bottom: 1px solid #f8fafc;
}

.checkout-table td.align-right { text-align: right; }
.checkout-table td.align-center { text-align: center; }

.checkout-product-cell {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.checkout-product-info {
  min-width: 0;
}

.checkout-product-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: normal;
  overflow-wrap: break-word;
}

.checkout-product-brand {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.checkout-product-stock {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
}

.checkout-part-number {
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
}

.checkout-hsn {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.checkout-gst-fixed {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 3px 0;
  border-radius: 6px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}

.checkout-remove-btn {
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
  line-height: 1;
}

.checkout-qty-control {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  justify-content: center;
}

.checkout-qty-btn {
  width: 22px;
  height: 22px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
}

.checkout-qty-value {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  min-width: 18px;
  text-align: center;
}

.checkout-discount-input {
  width: 100%;
  max-width: 56px;
  padding: var(--sp-1) var(--sp-2);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  text-align: center;
  outline: none;
  margin: 0 auto;
  display: block;
  box-sizing: border-box;
  font-family: inherit;
}

.checkout-items-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--sp-3);
  padding-top: var(--sp-3);
  border-top: 1px solid #f1f5f9;
}

.checkout-items-footer-left {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

.checkout-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
  padding: var(--sp-2) var(--sp-4);
  cursor: pointer;
  border: 1px solid #fecaca;
  background: #fff;
  color: #b91c1c;
}

.checkout-clear-btn:hover { background: #fef2f2; }

/* =========================================================
   Bill summary
   ========================================================= */

.checkout-recalc-hint {
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: var(--sp-2);
}

.checkout-bill-discount-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: var(--sp-3) var(--sp-3);
  margin-bottom: var(--sp-3);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.checkout-bill-discount-label {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.checkout-bill-discount-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.checkout-bill-discount-input {
  width: 60px;
  padding: var(--sp-1) var(--sp-2);
  font-size: 13px;
  font-weight: 700;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  text-align: right;
  outline: none;
  font-family: inherit;
}

.checkout-bill-discount-suffix {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.checkout-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  padding: var(--sp-1) 0;
}

.checkout-summary-row span:last-child {
  font-weight: 700;
  color: #0f172a;
}

.checkout-summary-row--negative span:last-child {
  color: #ef4444;
}

.checkout-net-payable-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--sp-3) 0 var(--sp-3);
  border-top: 1px solid #e2e8f0;
  margin-top: var(--sp-2);
}

.checkout-net-payable-label {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.checkout-net-payable-value {
  font-size: 22px;
  font-weight: 800;
  color: #16a34a;
}

.checkout-actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}

.checkout-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  border: none;
  border-radius: 8px;
  padding: var(--sp-3) var(--sp-4);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  color: #fff;
  font-family: inherit;
}

.checkout-action-btn:disabled { cursor: not-allowed; }

.checkout-hold-btn { background: #f59e0b; }
.checkout-pay-btn { background: #1e293b; }

/* =========================================================
   Payment modal overlay
   ========================================================= */

.checkout-payment-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(15, 23, 42, 0.7);
  padding: 5vh var(--sp-4);
  overflow: auto;
}

.checkout-payment-modal {
  max-width: 760px;
  margin: 0 auto;
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}

/* =========================================================
   Responsive
   ========================================================= */

@media (max-width: 1100px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }
  .checkout-bill-summary {
    position: static;
  }
  .checkout-steps {
    flex-wrap: wrap;
  }
  .checkout-step-line {
    display: none;
  }
}

@media (max-width: 640px) {
  .checkout-navbar {
    padding: 0 var(--sp-4);
  }
  .checkout-grid {
    padding: 0 var(--sp-3) var(--sp-4);
  }
  .checkout-step-copy small {
    display: none;
  }
}
`}</style>
        {/* ================= NAVBAR ================= */}
        <header className="checkout-navbar">
          <img
            src={d2wLogo}
            alt="Deals2Wheels"
            className="checkout-navbar-logo"
          />
          <button
            type="button"
            className="checkout-navbar-back"
            onClick={() => navigate(-1)}
          >
            ← Back to POS
          </button>
        </header>

        {/* ================= COMPACT CENTERED HEADING ================= */}
        <div className="checkout-heading">
          <h1>Checkout</h1>
          <p>Complete your order and make payment</p>
          {activeDraftId && (
            <button
              type="button"
              className="checkout-add-items-btn"
              onClick={() => navigate("/pos")}
            >
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
            <SectionHeader
              icon="👤"
              title="Customer Details"
              subtitle="Enter customer information"
            />

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
              {customerExists && (
                <Hint type="success">✓ Existing customer found</Hint>
              )}
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
                Invoice will be created only after payment is collected and
                saved.
              </p>
            </div>
          </div>

          {/* -------- CENTER: ORDER ITEMS TABLE -------- */}
          <div className="checkout-card">
            <SectionHeader
              icon="🛒"
              title={`Order Items (${cartItems.length})`}
              subtitle="All amounts are calculated by the server"
            />

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
                      const lines = getCalculationLinesForCartItem(
                        item,
                        calculation?.items || [],
                      );
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
                            <span className="checkout-hsn">
                              {line?.hsnCode || "—"}
                            </span>
                          </td>

                          {/* MRP — readonly, from backend */}
                          <td className="align-right">
                            {line
                              ? multipleBatches
                                ? "Multiple batches"
                                : money(line.mrp)
                              : "…"}
                          </td>

                          {/* Rate — readonly, from backend */}
                          <td className="align-right">
                            {line
                              ? multipleBatches
                                ? "Multiple batches"
                                : money(line.sellingPrice)
                              : "…"}
                          </td>

                          {/* Qty — cashier input */}
                          <td>
                            <div className="checkout-qty-control">
                              <button
                                type="button"
                                onClick={() =>
                                  decreaseQuantity(
                                    item.inventoryId,
                                    item.batchId,
                                  )
                                }
                                className="checkout-qty-btn"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span className="checkout-qty-value">
                                {item.quantity}
                              </span>
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
                              onChange={(e) =>
                                updateDiscount(
                                  item.inventoryId,
                                  item.batchId,
                                  e.target.value,
                                )
                              }
                              className="checkout-discount-input"
                              aria-label="Item discount percent"
                            />
                          </td>

                          {/* GST — fixed at 18%, no longer editable */}
                          <td>
                            <span className="checkout-gst-fixed">
                              {FIXED_GST_LABEL}
                            </span>
                          </td>

                          {/* Taxable — readonly, from backend */}
                          <td className="align-right">
                            {line
                              ? money(
                                  sumCalculatedAmount(lines, "taxableAmount"),
                                )
                              : "…"}
                          </td>

                          {/* Line total — readonly, from backend */}
                          <td
                            className="align-right"
                            style={{ fontWeight: 700 }}
                          >
                            {line
                              ? money(sumCalculatedAmount(lines, "lineTotal"))
                              : "…"}
                          </td>

                          {/* Remove */}
                          <td className="align-center">
                            <button
                              type="button"
                              onClick={() =>
                                removeFromCart(item.inventoryId, item.batchId)
                              }
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
                <div className="checkout-items-footer-left">
                  Total Items: {cartItems.length}
                </div>
                <button
                  type="button"
                  className="checkout-clear-btn"
                  onClick={() => {
                    if (window.confirm("Clear all items from the cart?"))
                      clearCart();
                  }}
                >
                  🗑 Clear Cart
                </button>
              </div>
            )}
          </div>

          {/* -------- RIGHT: STICKY BILL SUMMARY -------- */}
          <div>
            <div className="checkout-card checkout-bill-summary">
              <SectionHeader
                icon="🧾"
                title="Bill Summary"
                subtitle="Calculated by server"
              />

              {calcLoading && (
                <div className="checkout-recalc-hint">Recalculating…</div>
              )}

              <div className="checkout-bill-discount-box">
                <label
                  htmlFor="bill-discount"
                  className="checkout-bill-discount-label"
                >
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
              <SummaryRow
                label={`Gross Amount (${calculation?.totalItems ?? 0} items, qty ${calculation?.totalQuantity ?? 0})`}
                value={calculation?.grossAmount}
              />
              <SummaryRow
                label="Item Discount"
                value={calculation?.itemDiscount}
                negative
              />
              <SummaryRow
                label="Taxable Amount"
                value={calculation?.taxableAmount}
              />
              <SummaryRow label="CGST" value={calculation?.cgst} />
              <SummaryRow label="SGST" value={calculation?.sgst} />
              <SummaryRow label="IGST" value={calculation?.igst} />
              <SummaryRow
                label="Bill Discount"
                value={calculation?.billDiscount}
                negative
              />
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
                  style={{
                    opacity: disablePlaceOrder ? 0.6 : 1,
                    cursor: disablePlaceOrder ? "not-allowed" : "pointer",
                  }}
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
              onCancel={() => {
                setPaymentDraft(null);
                setActiveOrderId("");
              }}
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
  return (
    <div className={`checkout-hint checkout-hint--${type}`}>{children}</div>
  );
}

function SummaryRow({ label, value, negative = false }: any) {
  const displayValue =
    value == null ? "—" : `${negative ? "- " : ""}${money(value)}`;
  return (
    <div
      className={`checkout-summary-row ${negative ? "checkout-summary-row--negative" : ""}`}
    >
      <span>{label}</span>
      <span>{displayValue}</span>
    </div>
  );
}

export default CheckoutPage;
