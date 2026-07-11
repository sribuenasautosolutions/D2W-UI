import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { placeOrder, calculateOrder } from "../../services/orderService";
import { getCustomerByMobile, saveCustomer } from "../../services/customerService";

/* ============================================================
   CONSTANTS
   ============================================================ */

const GST_TYPE_OPTIONS = [
  { value: "NONE", label: "None" },
  { value: "GST_5", label: "GST 5%" },
  { value: "GST_12", label: "GST 12%" },
  { value: "GST_18", label: "GST 18%" },
  { value: "GST_28", label: "GST 28%" },
  { value: "IGST_5", label: "IGST 5%" },
  { value: "IGST_12", label: "IGST 12%" },
  { value: "IGST_18", label: "IGST 18%" },
  { value: "IGST_28", label: "IGST 28%" },
];

const RECALC_DEBOUNCE_MS = 400;

/* ============================================================
   HELPERS (no money math — display/formatting only)
   ============================================================ */

// Format a backend-supplied number for display. Never computes money.
const money = (value) => `₹${Number(value ?? 0).toFixed(2)}`;

// Default GST type for a cart item that has no explicit gstType yet.
// This only picks an enum value — the backend does all tax math.
const deriveGstType = (item) => {
  if (item.gstType) return item.gstType;
  const pct = Number(item.gstPercentage || 0);
  return [5, 12, 18, 28].includes(pct) ? `GST_${pct}` : "NONE";
};

// Extract a readable message from an axios / Spring error.
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

/* ============================================================
   COMPONENT
   ============================================================ */

function CheckoutPage() {
  const navigate = useNavigate();
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

  /* ---------- Cashier-editable financial inputs ---------- */
  const [billDiscount, setBillDiscount] = useState("0");
  const [gstTypes, setGstTypes] = useState({}); // productId -> gstType

  /* ---------- Backend calculation (single source of truth) ---------- */
  const [calculation, setCalculation] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState("");

  /* ---------- Order placement ---------- */
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const storeId = getUser()?.storeId;

  /* ============================================================
     BUILD /orders/recalculate REQUEST
     Payload matches OrderCalculationRequestDTO exactly:
     { storeId, billDiscountPercent, items: [{ productId, quantity,
       discountPercentage, gstType }] }
     ============================================================ */

  const effectiveGstType = useCallback(
    (item) => gstTypes[item.productId] ?? deriveGstType(item),
    [gstTypes]
  );

  const buildCalculationRequest = useCallback(
    () => ({
      storeId,
      billDiscountPercent: Number(billDiscount || 0),
      items: cartItems.map((item) => ({
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
     Fires whenever quantity, item discount, GST type or bill
     discount changes. Stale responses are ignored via requestId.
     ============================================================ */

  useEffect(() => {
    if (!storeId) {
      navigate("/login");
      return;
    }

    if (cartItems.length === 0) {
      setCalculation(null);
      setCalcError("");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setCalcLoading(true);
      setCalcError("");
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
  }, [cartItems, billDiscount, gstTypes, storeId, buildCalculationRequest, navigate]);

  /* ============================================================
     Fast lookup: productId -> backend calculation line
     ============================================================ */

  const lineByProduct = useMemo(() => {
    const map = {};
    (calculation?.items || []).forEach((line) => {
      map[line.productId] = line;
    });
    return map;
  }, [calculation]);

  /* ============================================================
     CUSTOMER LOOKUP / SAVE
     ============================================================ */

  const handleMobileChange = async (mobile) => {
    const digits = mobile.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);

    if (digits.length !== 10) {
      setCustomerExists(false);
      return;
    }
    try {
      const customer = await getCustomerByMobile(digits);
      if (customer) {
        setCustomerName(customer.customerName);
        setCustomerExists(true);
      } else {
        setCustomerExists(false);
      }
    } catch (error) {
      console.error(error);
      setCustomerExists(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!customerName.trim()) {
      alert("Please enter a customer name before saving.");
      return;
    }
    try {
      await saveCustomer({ customerName, mobileNumber: phone });
      setCustomerExists(true);
      alert("Customer saved successfully");
    } catch (error) {
      alert(extractError(error));
    }
  };

  /* ============================================================
     GST TYPE CHANGE (triggers auto-recalculate via effect)
     ============================================================ */

  const handleGstTypeChange = (productId, gstType) => {
    setGstTypes((prev) => ({ ...prev, [productId]: gstType }));
  };

  /* ============================================================
     PLACE ORDER — POST /orders
     Sends ONLY raw inputs. Backend recalculates everything.
     ============================================================ */

  const handlePlaceOrder = async () => {
    if (creatingInvoice) return;

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

    setCreatingInvoice(true);
    try {
      const orderData = {
        storeId,
        customerName: customerName.trim(),
        phone,
        address,
        paymentMethod: "PENDING", // payment is collected on the Payment page
        billDiscountPercent: Number(billDiscount || 0),
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          discountPercentage: Number(item.itemDiscount || 0),
          gstType: effectiveGstType(item),
        })),
      };

      const orderId = await placeOrder(orderData);
      // clearCart();
      navigate(`/pos/payment/${orderId}`);
    } catch (error) {
      alert(extractError(error));
    } finally {
      setCreatingInvoice(false);
    }
  };

  /* ============================================================
     RENDER
     ============================================================ */

  const disablePlaceOrder =
    creatingInvoice || calcLoading || cartItems.length === 0 || !!calcError;

  return (
    <div style={pageStyle}>
      {/* ================= TOP BAR ================= */}
      <div style={topBarStyle}>
        <button onClick={() => navigate(-1)} style={backBtnStyle}>
          ← Back to POS
        </button>
        <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#0f172a", margin: 0 }}>
          Checkout
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={brandIconStyle}>🚗</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
              Smart Auto Parts
            </div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Automobile Spare Parts Store
            </div>
          </div>
        </div>
      </div>

      {/* ================= MAIN GRID ================= */}
      <div style={mainGridStyle}>
        {/* -------- LEFT: CUSTOMER DETAILS -------- */}
        <div style={cardStyle}>
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
              style={inputStyle}
              maxLength={10}
            />
            {phone.length > 0 && phone.length < 10 && (
              <Hint color="#ef4444">Enter all 10 digits</Hint>
            )}
            {customerExists && <Hint color="#16a34a">✓ Existing customer found</Hint>}
          </Field>

          <Field label="Customer Name *">
            <input
              type="text"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Address (optional)">
            <input
              type="text"
              placeholder="Enter address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={inputStyle}
            />
          </Field>

          {!customerExists && /^\d{10}$/.test(phone) && customerName.trim() !== "" && (
            <button onClick={handleSaveCustomer} style={saveCustomerBtnStyle}>
              Save Customer
            </button>
          )}

          <div style={paymentInfoBoxStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "18px" }}>💳</span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#1d4ed8" }}>
                Payment Information
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "#3b82f6", lineHeight: 1.5 }}>
              Payment will be collected after invoice creation.
            </p>
          </div>
        </div>

        {/* -------- CENTER: ORDER ITEMS TABLE -------- */}
        <div style={cardStyle}>
          <SectionHeader icon="🛒" title="Order Items" subtitle="All amounts are calculated by the server" />

          {calcError && (
            <div style={errorBannerStyle} role="alert">
              ⚠ {calcError}
            </div>
          )}

          {cartItems.length === 0 ? (
            <div style={emptyStateStyle}>
              Cart is empty — go back to POS and add products.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: "left", minWidth: "160px" }}>Product</th>
                    <th style={thStyle}>Part Number</th>
                    <th style={thStyle}>HSN</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>MRP</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Rate</th>
                    <th style={thStyle}>Qty</th>
                    <th style={thStyle}>Disc %</th>
                    <th style={thStyle}>GST Type</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Taxable</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>GST</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item) => {
                    const line = lineByProduct[item.productId];
                    return (
                      <tr key={item.productId} style={{ borderBottom: "1px solid #f8fafc" }}>
                        {/* Product */}
                        <td style={tdStyle}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                            {line?.productName || item.itemName}
                          </div>
                          {(line?.brandName || item.brandName) && (
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              {line?.brandName || item.brandName}
                            </div>
                          )}
                          {line && (
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                              Stock: {line.stock}
                            </div>
                          )}
                        </td>

                        {/* Part number — readonly, from backend */}
                        <td style={{ ...tdStyle, fontSize: "12px", color: "#3b82f6" }}>
                          {line?.partNumber || item.partNumber || "—"}
                        </td>

                        {/* HSN — readonly, from backend */}
                        <td style={{ ...tdStyle, fontSize: "12px", color: "#64748b" }}>
                          {line?.hsnCode || "—"}
                        </td>

                        {/* MRP — readonly, from backend */}
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {line ? money(line.mrp) : "…"}
                        </td>

                        {/* Rate — readonly, from backend */}
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {line ? money(line.sellingPrice) : "…"}
                        </td>

                        {/* Qty — cashier input */}
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>
                            <button
                              onClick={() => decreaseQuantity(item.productId)}
                              style={qtyBtnStyle}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span style={qtyValueStyle}>{item.quantity}</span>
                            <button
                              onClick={() => increaseQuantity(item.productId)}
                              style={qtyBtnStyle}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Item Discount % — cashier input */}
                        <td style={tdStyle}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.itemDiscount || 0}
                            onChange={(e) => updateDiscount(item.productId, e.target.value)}
                            style={discountInputStyle}
                            aria-label="Item discount percent"
                          />
                        </td>

                        {/* GST Type — cashier input */}
                        <td style={tdStyle}>
                          <select
                            value={effectiveGstType(item)}
                            onChange={(e) => handleGstTypeChange(item.productId, e.target.value)}
                            style={gstSelectStyle}
                            aria-label="GST type"
                          >
                            {GST_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Taxable — readonly, from backend */}
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {line ? money(line.taxableAmount) : "…"}
                        </td>

                        {/* GST amount — readonly, from backend */}
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {line ? money(line.gstAmount) : "…"}
                        </td>

                        {/* Line total — readonly, from backend */}
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                          {line ? money(line.lineTotal) : "…"}
                        </td>

                        {/* Remove */}
                        <td style={tdStyle}>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            style={removeBtnStyle}
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
        </div>

        {/* -------- RIGHT: STICKY BILL SUMMARY -------- */}
        <div>
          <div style={billSummaryCardStyle}>
            <SectionHeader icon="🧾" title="Bill Summary" subtitle="Calculated by server" />

            {calcLoading && (
              <div style={{ fontSize: "12px", color: "#3b82f6", marginBottom: "8px" }}>
                Recalculating…
              </div>
            )}

            {/* Bill discount — cashier input */}
            <div style={billDiscountBoxStyle}>
              <label
                htmlFor="bill-discount"
                style={{ fontSize: "13px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}
              >
                🏷️ Bill Discount (%)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  id="bill-discount"
                  type="number"
                  min="0"
                  max="100"
                  value={billDiscount}
                  onChange={(e) => setBillDiscount(e.target.value)}
                  style={billDiscountInputStyle}
                />
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>%</span>
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

            <div style={netPayableRowStyle}>
              <span style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                Net Payable
              </span>
              <span style={{ fontSize: "24px", fontWeight: 700, color: "#16a34a" }}>
                {calcLoading ? "…" : money(calculation?.netPayable)}
              </span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={disablePlaceOrder}
              style={{
                ...placeOrderBtnStyle,
                opacity: disablePlaceOrder ? 0.6 : 1,
                cursor: disablePlaceOrder ? "not-allowed" : "pointer",
              }}
            >
              {creatingInvoice ? "Creating Invoice…" : "🧾 Check Out & Create Invoice"}
            </button>
          </div>
        </div>
      </div>
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
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>{title}</div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>{subtitle}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Hint({ color, children }) {
  return <div style={{ fontSize: "11px", color, marginTop: "4px" }}>{children}</div>;
}

function SummaryRow({ label, value, negative }) {
  const display = value == null ? "—" : `${negative ? "- " : ""}${money(value)}`;
  return (
    <div style={summaryRowStyle}>
      <span>{label}</span>
      <span style={negative ? { color: "#ef4444", fontWeight: 600 } : undefined}>{display}</span>
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const pageStyle = {
  minHeight: "100vh",
  background: "#f1f5f9",
  padding: "16px",
  fontFamily: "sans-serif",
};

const topBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "16px",
};

const backBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "13px",
  color: "#64748b",
  cursor: "pointer",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "6px 14px",
  background: "#fff",
};

const brandIconStyle = {
  width: "36px",
  height: "36px",
  background: "#fee2e2",
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
};

const mainGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 300px) minmax(0, 1fr) minmax(280px, 320px)",
  gap: "16px",
  alignItems: "start",
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "18px",
};

const billSummaryCardStyle = {
  ...cardStyle,
  position: "sticky",
  top: "16px",
};

const sectionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "16px",
  paddingBottom: "12px",
  borderBottom: "1px solid #f1f5f9",
};

const sectionIconStyle = {
  width: "36px",
  height: "36px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
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

const labelStyle = {
  fontSize: "12px",
  fontWeight: 500,
  color: "#64748b",
  display: "block",
  marginBottom: "5px",
};

const saveCustomerBtnStyle = {
  width: "100%",
  marginTop: "10px",
  padding: "10px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
};

const paymentInfoBoxStyle = {
  marginTop: "18px",
  border: "1px solid #bfdbfe",
  borderRadius: "10px",
  padding: "14px 16px",
  background: "#eff6ff",
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

const emptyStateStyle = {
  textAlign: "center",
  padding: "48px 0",
  color: "#94a3b8",
  fontSize: "13px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  fontSize: "11px",
  fontWeight: 500,
  color: "#94a3b8",
  textAlign: "center",
  padding: "8px 6px",
  borderBottom: "1px solid #f1f5f9",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 6px",
  fontSize: "13px",
  color: "#0f172a",
  verticalAlign: "middle",
};

const qtyBtnStyle = {
  width: "22px",
  height: "22px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  background: "#f8fafc",
  fontSize: "13px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#0f172a",
};

const qtyValueStyle = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#0f172a",
  minWidth: "18px",
  textAlign: "center",
};

const discountInputStyle = {
  width: "52px",
  padding: "4px 6px",
  fontSize: "12px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  textAlign: "center",
  outline: "none",
};

const gstSelectStyle = {
  fontSize: "12px",
  padding: "5px 6px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  background: "#fff",
  color: "#0f172a",
  outline: "none",
  cursor: "pointer",
};

const removeBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#ef4444",
  fontSize: "15px",
  padding: "2px",
};

const billDiscountBoxStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "10px 12px",
  margin: "4px 0 10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const billDiscountInputStyle = {
  width: "64px",
  padding: "5px 8px",
  fontSize: "13px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  textAlign: "right",
  outline: "none",
};

const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "13px",
  color: "#64748b",
  padding: "5px 0",
};

const netPayableRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 0 14px",
  borderTop: "1px solid #e2e8f0",
  marginTop: "8px",
};

const placeOrderBtnStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  background: "#1e293b",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  padding: "13px 20px",
  fontSize: "14px",
  fontWeight: 600,
};

export default CheckoutPage;
 