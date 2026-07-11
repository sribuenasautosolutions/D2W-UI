// import React, { useState, useEffect, useCallback } from "react";
// import { useParams, useNavigate } from "react-router-dom";

// // ✅ FIX 1: Correct named imports (no default service objects)
// import { getInvoice } from "../../services/orderService";
// import { addPayment, getPaymentsByOrderId } from "../../services/paymentService";

// // ✅ FIX 3: CARD uppercase to match backend enum (recommend backend uses CARD too)
// const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "IMPS", "NEFT", "RTGS", "CHEQUE"];

// const REQUIRES_TRANSACTION = ["UPI", "CARD", "IMPS", "NEFT", "RTGS"];
// const REQUIRES_CHEQUE = ["CHEQUE"];

// // ✅ NEW: these are exactly the statuses SalesPaymentService.addPayment() rejects.
// // Keeping this list in sync with the backend means the UI never lets a user
// // attempt a payment that the backend is guaranteed to bounce.
// const LOCKED_ORDER_STATUSES = ["PAID", "CANCELLED", "RETURNED"];

// const emptyRow = () => ({
//     paymentMethod: "CASH",

//     amount: "",

//     customerTendered: "",

//     changeReturn: 0,

//     transactionNumber: "",

//     remarks: "",

//     _id: Date.now() + Math.random(),
// });

// // ✅ FIX 9: Read current user from localStorage
// function getCurrentUser() {
//   try {
//     const raw = localStorage.getItem("user");
//     if (!raw) return null;
//     const parsed = JSON.parse(raw);
//     return parsed?.name || parsed?.username || parsed?.email || "Unknown";
//   } catch {
//     return "Unknown";
//   }
// }

// const styles = {
//   page: {
//     minHeight: "100vh",
//     background: "#F0F4F8",
//     fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
//     color: "#1A2332",
//     padding: "0",
//   },
//   header: {
//     background: "#fff",
//     borderBottom: "1px solid #E2E8F0",
//     padding: "0 32px",
//     height: "60px",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "space-between",
//     position: "sticky",
//     top: 0,
//     zIndex: 100,
//     boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
//   },
//   headerLeft: {
//     display: "flex",
//     alignItems: "center",
//     gap: "12px",
//   },
//   headerTitle: {
//     fontSize: "17px",
//     fontWeight: "700",
//     color: "#1A2332",
//     letterSpacing: "-0.3px",
//   },
//   headerBreadcrumb: {
//     fontSize: "13px",
//     color: "#94A3B8",
//     display: "flex",
//     alignItems: "center",
//     gap: "6px",
//   },
//   breadcrumbSep: {
//     color: "#CBD5E1",
//   },
//   body: {
//     maxWidth: "1280px",
//     margin: "0 auto",
//     padding: "28px 24px 40px",
//   },
//   grid: {
//     display: "grid",
//     gridTemplateColumns: "340px 1fr",
//     gap: "20px",
//     marginBottom: "20px",
//   },
//   card: {
//     background: "#fff",
//     borderRadius: "10px",
//     border: "1px solid #E2E8F0",
//     padding: "24px",
//     boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
//   },
//   cardTitle: {
//     fontSize: "13px",
//     fontWeight: "700",
//     color: "#64748B",
//     textTransform: "uppercase",
//     letterSpacing: "0.6px",
//     marginBottom: "18px",
//     display: "flex",
//     alignItems: "center",
//     gap: "8px",
//   },
//   cardTitleDot: {
//     width: "6px",
//     height: "6px",
//     borderRadius: "50%",
//     background: "#3B82F6",
//     display: "inline-block",
//   },
//   summaryRow: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "flex-start",
//     padding: "9px 0",
//     borderBottom: "1px solid #F1F5F9",
//   },
//   summaryLabel: {
//     fontSize: "13px",
//     color: "#64748B",
//     fontWeight: "500",
//   },
//   summaryValue: {
//     fontSize: "13px",
//     color: "#1A2332",
//     fontWeight: "600",
//     textAlign: "right",
//     maxWidth: "180px",
//     wordBreak: "break-word",
//   },
//   statusBadge: (status) => {
//     const map = {
//       PAID: { bg: "#DCFCE7", color: "#16A34A", label: "Paid" },
//       PENDING_PAYMENT: { bg: "#FEF9C3", color: "#CA8A04", label: "Pending" },
//       PARTIALLY_PAID: { bg: "#FEF3C7", color: "#D97706", label: "Partial" },
//       // ✅ NEW: backend can also return these two statuses; without an entry
//       // here they'd silently fall back to the raw enum string.
//       CANCELLED: { bg: "#FEE2E2", color: "#DC2626", label: "Cancelled" },
//       RETURNED: { bg: "#F3E8FF", color: "#7C3AED", label: "Returned" },
//     };
//     const s = map[status] || { bg: "#F1F5F9", color: "#64748B", label: status };
//     return {
//       display: "inline-block",
//       padding: "3px 10px",
//       borderRadius: "20px",
//       fontSize: "11px",
//       fontWeight: "700",
//       background: s.bg,
//       color: s.color,
//       letterSpacing: "0.3px",
//       label: s.label,
//     };
//   },
//   amountHighlight: (color) => ({
//     fontSize: "15px",
//     fontWeight: "700",
//     color: color || "#1A2332",
//   }),
//   table: {
//     width: "100%",
//     borderCollapse: "collapse",
//     fontSize: "13px",
//   },
//   th: {
//     textAlign: "left",
//     padding: "9px 12px",
//     fontSize: "11px",
//     fontWeight: "700",
//     color: "#94A3B8",
//     textTransform: "uppercase",
//     letterSpacing: "0.5px",
//     borderBottom: "2px solid #F1F5F9",
//     background: "#FAFBFC",
//   },
//   thRight: {
//     textAlign: "right",
//     padding: "9px 12px",
//     fontSize: "11px",
//     fontWeight: "700",
//     color: "#94A3B8",
//     textTransform: "uppercase",
//     letterSpacing: "0.5px",
//     borderBottom: "2px solid #F1F5F9",
//     background: "#FAFBFC",
//   },
//   td: {
//     padding: "10px 12px",
//     borderBottom: "1px solid #F1F5F9",
//     color: "#334155",
//     verticalAlign: "middle",
//   },
//   tdRight: {
//     padding: "10px 12px",
//     borderBottom: "1px solid #F1F5F9",
//     color: "#334155",
//     textAlign: "right",
//     verticalAlign: "middle",
//     fontWeight: "600",
//   },
//   methodBadge: {
//     display: "inline-block",
//     padding: "2px 8px",
//     borderRadius: "4px",
//     fontSize: "11px",
//     fontWeight: "700",
//     background: "#EFF6FF",
//     color: "#2563EB",
//     letterSpacing: "0.3px",
//   },
//   emptyState: {
//     textAlign: "center",
//     color: "#94A3B8",
//     fontSize: "13px",
//     padding: "32px 16px",
//   },
//   formGrid: {
//     display: "grid",
//     gridTemplateColumns: "160px 1fr 1fr 1fr 160px auto",
//     gap: "10px",
//     alignItems: "start",
//     marginBottom: "10px",
//   },
//   label: {
//     fontSize: "11px",
//     fontWeight: "700",
//     color: "#64748B",
//     textTransform: "uppercase",
//     letterSpacing: "0.5px",
//     marginBottom: "5px",
//     display: "block",
//   },
//   select: (error) => ({
//     width: "100%",
//     padding: "9px 10px",
//     border: `1.5px solid ${error ? "#EF4444" : "#E2E8F0"}`,
//     borderRadius: "7px",
//     fontSize: "13px",
//     color: "#1A2332",
//     background: "#fff",
//     outline: "none",
//     cursor: "pointer",
//     appearance: "auto",
//     boxSizing: "border-box",
//   }),
//   input: (error, disabled) => ({
//     width: "100%",
//     padding: "9px 10px",
//     border: `1.5px solid ${error ? "#EF4444" : "#E2E8F0"}`,
//     borderRadius: "7px",
//     fontSize: "13px",
//     color: disabled ? "#94A3B8" : "#1A2332",
//     background: disabled ? "#F8FAFC" : "#fff",
//     outline: "none",
//     boxSizing: "border-box",
//     cursor: disabled ? "not-allowed" : "text",
//   }),
//   errorText: {
//     color: "#EF4444",
//     fontSize: "11px",
//     marginTop: "3px",
//   },
//   removeBtn: {
//     background: "none",
//     border: "1.5px solid #FECACA",
//     color: "#EF4444",
//     borderRadius: "7px",
//     padding: "9px 13px",
//     cursor: "pointer",
//     fontSize: "18px",
//     lineHeight: "1",
//     transition: "background 0.15s",
//     marginTop: "19px",
//   },
//   addRowBtn: {
//     display: "inline-flex",
//     alignItems: "center",
//     gap: "6px",
//     background: "none",
//     border: "1.5px dashed #93C5FD",
//     color: "#2563EB",
//     borderRadius: "7px",
//     padding: "8px 16px",
//     cursor: "pointer",
//     fontSize: "13px",
//     fontWeight: "600",
//     marginTop: "6px",
//   },
//   divider: {
//     height: "1px",
//     background: "#F1F5F9",
//     margin: "18px 0",
//   },
//   totalsGrid: {
//     display: "grid",
//     gridTemplateColumns: "repeat(4, 1fr)",
//     gap: "14px",
//     marginTop: "20px",
//   },
//   totalBox: (accent) => ({
//     background: accent ? "#EFF6FF" : "#FAFBFC",
//     border: `1px solid ${accent ? "#BFDBFE" : "#E2E8F0"}`,
//     borderRadius: "8px",
//     padding: "14px 16px",
//   }),
//   totalBoxLabel: {
//     fontSize: "11px",
//     fontWeight: "700",
//     color: "#94A3B8",
//     textTransform: "uppercase",
//     letterSpacing: "0.5px",
//     marginBottom: "4px",
//   },
//   totalBoxValue: (accent) => ({
//     fontSize: "20px",
//     fontWeight: "800",
//     color: accent ? "#2563EB" : "#1A2332",
//     letterSpacing: "-0.5px",
//   }),
//   footerBar: {
//     position: "sticky",
//     bottom: "0",
//     background: "#fff",
//     borderTop: "1px solid #E2E8F0",
//     padding: "14px 32px",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "space-between",
//     zIndex: 99,
//     boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
//   },
//   btnBack: {
//     background: "#fff",
//     border: "1.5px solid #E2E8F0",
//     color: "#475569",
//     borderRadius: "8px",
//     padding: "10px 20px",
//     fontSize: "13px",
//     fontWeight: "600",
//     cursor: "pointer",
//     display: "inline-flex",
//     alignItems: "center",
//     gap: "6px",
//   },
//   btnSave: (disabled) => ({
//     background: disabled ? "#94A3B8" : "#2563EB",
//     border: "none",
//     color: "#fff",
//     borderRadius: "8px",
//     padding: "10px 24px",
//     fontSize: "13px",
//     fontWeight: "700",
//     cursor: disabled ? "not-allowed" : "pointer",
//     display: "inline-flex",
//     alignItems: "center",
//     gap: "6px",
//     transition: "background 0.15s",
//     opacity: disabled ? 0.7 : 1,
//   }),
//   btnInvoice: {
//     background: "#16A34A",
//     border: "none",
//     color: "#fff",
//     borderRadius: "8px",
//     padding: "10px 24px",
//     fontSize: "13px",
//     fontWeight: "700",
//     cursor: "pointer",
//     display: "inline-flex",
//     alignItems: "center",
//     gap: "6px",
//     transition: "background 0.15s",
//   },
//   footerRight: {
//     display: "flex",
//     gap: "10px",
//     alignItems: "center",
//   },
//   toast: (type) => ({
//     position: "fixed",
//     top: "24px",
//     right: "24px",
//     zIndex: 9999,
//     background: type === "error" ? "#FEF2F2" : "#F0FDF4",
//     border: `1.5px solid ${type === "error" ? "#FECACA" : "#BBF7D0"}`,
//     color: type === "error" ? "#DC2626" : "#16A34A",
//     borderRadius: "10px",
//     padding: "14px 20px",
//     fontSize: "13px",
//     fontWeight: "600",
//     boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
//     display: "flex",
//     alignItems: "center",
//     gap: "10px",
//     maxWidth: "420px",
//     animation: "slideIn 0.2s ease",
//   }),
//   spinner: {
//     display: "inline-block",
//     width: "16px",
//     height: "16px",
//     border: "2px solid #BFDBFE",
//     borderTop: "2px solid #2563EB",
//     borderRadius: "50%",
//     animation: "spin 0.7s linear infinite",
//   },
//   loadingOverlay: {
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     minHeight: "300px",
//     color: "#64748B",
//     flexDirection: "column",
//     gap: "12px",
//   },
//   paidBanner: {
//     background: "#F0FDF4",
//     border: "1.5px solid #BBF7D0",
//     borderRadius: "8px",
//     padding: "14px 20px",
//     color: "#16A34A",
//     fontWeight: "600",
//     fontSize: "13px",
//     marginBottom: "20px",
//     display: "flex",
//     alignItems: "center",
//     gap: "10px",
//   },
//   lockedBanner: {
//     background: "#FEF2F2",
//     border: "1.5px solid #FECACA",
//     borderRadius: "8px",
//     padding: "14px 20px",
//     color: "#DC2626",
//     fontWeight: "600",
//     fontSize: "13px",
//     marginBottom: "20px",
//     display: "flex",
//     alignItems: "center",
//     gap: "10px",
//   },
//   payRefBadge: {
//     display: "inline-block",
//     padding: "2px 8px",
//     borderRadius: "4px",
//     fontSize: "11px",
//     fontWeight: "700",
//     background: "#F1F5F9",
//     color: "#475569",
//     letterSpacing: "0.3px",
//     marginLeft: "6px",
//   },
// };

// function formatCurrency(val) {
//   const n = parseFloat(val);
//   if (isNaN(n)) return "₹0.00";
//   return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// }

// function formatDate(dateStr) {
//   if (!dateStr) return "—";
//   try {
//     return new Date(dateStr).toLocaleString("en-IN", {
//       day: "2-digit", month: "short", year: "numeric",
//       hour: "2-digit", minute: "2-digit", hour12: true,
//     });
//   } catch {
//     return dateStr;
//   }
// }

// // ✅ FIX 10: Format payment reference as PAY-000001 (used for rows returned
// // by GET /sales-payments/order/{id}, which DO carry a real `id`)
// function formatPayRef(id) {
//   if (!id) return null;
//   return "PAY-" + String(id).padStart(6, "0");
// }

// // ✅ NEW: SalesPaymentService.addPayment() always responds 200 OK with a
// // plain string — for BOTH success ("payment added successfully | ...") and
// // every rejection ("order not found", "payment exceeds invoice amount",
// // "cannot add payment to a cancelled order", "CASH payment requires a
// // customer tendered amount greater than zero", etc). There is no HTTP status
// // or JSON shape to branch on, so success has to be detected from the text
// // itself. Do not "fix" this by guessing at a JSON shape — the backend
// // genuinely returns a bare string here.
// function isPaymentSuccessMessage(message) {
//   return typeof message === "string" && message.toLowerCase().startsWith("payment added successfully");
// }

// function Toast({ message, type, onClose }) {
//   useEffect(() => {
//     const t = setTimeout(onClose, 5000);
//     return () => clearTimeout(t);
//   }, [onClose]);
//   return (
//     <div style={styles.toast(type)}>
//       <span>{type === "error" ? "✕" : "✓"}</span>
//       <span>{message}</span>
//       <button
//         onClick={onClose}
//         style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto", color: "inherit", fontSize: "16px" }}
//       >×</button>
//     </div>
//   );
// }

// function validateRows(rows, remainingBalance) {
//   const errors = rows.map((row) => {
//     const e = {};
//     if (!row.paymentMethod) e.paymentMethod = "Required";

//     if (row.paymentMethod === "CASH") {
//       // ✅ FIX: for CASH the value the backend actually reads is
//       // customerTendered, not amount (amount is just a local preview of what
//       // the backend will apply). Validate the field that gets sent.
//       const tendered = parseFloat(row.customerTendered);
//       if (!row.customerTendered || isNaN(tendered) || tendered <= 0) {
//         e.amount = "Enter amount received from customer";
//       }
//     } else {
//       const amt = parseFloat(row.amount);
//       if (!row.amount || isNaN(amt) || amt <= 0) {
//         e.amount = "Enter a valid amount";
//       }
//     }

//     if (REQUIRES_TRANSACTION.includes(row.paymentMethod) && !row.transactionNumber.trim()) {
//       e.transactionNumber = "Transaction number required";
//     }
//     if (REQUIRES_CHEQUE.includes(row.paymentMethod) && !row.transactionNumber.trim()) {
//       e.transactionNumber = "Cheque number required";
//     }
//     return e;
//   });

//   // Digital (non-cash) rows can never legitimately exceed the balance since
//   // there's no "change" for them on the backend - it rejects the whole batch
//   // outright. Cash rows are excluded from this pre-check because the backend
//   // is expected to cap the applied amount and return change; a tendered
//   // amount larger than the balance is normal, not an error.
//   const totalNonCash = rows
//     .filter((r) => r.paymentMethod !== "CASH")
//     .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

//   if (totalNonCash > remainingBalance + 0.001) {
//     errors.forEach((e, idx) => {
//       if (rows[idx].paymentMethod !== "CASH" && !e.amount) {
//         e.amount = "Total exceeds balance";
//       }
//     });
//   }

//   const hasError = errors.some((e) => Object.keys(e).length > 0);
//   return { errors, hasError };
// }

// export default function PaymentPage() {
//   const { orderId } = useParams();
//   const navigate = useNavigate();

//   const [order, setOrder] = useState(null);
//   const [payments, setPayments] = useState([]);
//   const [rows, setRows] = useState([emptyRow()]);
//   const [rowErrors, setRowErrors] = useState([{}]);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [toast, setToast] = useState(null);

//   // ✅ FIX 9: Cashier from localStorage
//   const cashier = getCurrentUser();

//   const showToast = (message, type = "success") => setToast({ message, type });
//   const hideToast = () => setToast(null);

//   // ✅ FIX 2: Correct direct function calls (no service object prefix)
//   const fetchOrder = useCallback(async () => {
//     const data = await getInvoice(orderId);
//     setOrder(data);
//   }, [orderId]);

//   const fetchPayments = useCallback(async () => {
//     try {
//       const data = await getPaymentsByOrderId(orderId);
//       setPayments(Array.isArray(data) ? data : []);
//     } catch {
//       setPayments([]);
//     }
//   }, [orderId]);

//   // ✅ FIX 7: Sequential awaits instead of Promise.all so one failure doesn't block both
//   useEffect(() => {
//     const load = async () => {
//       setLoading(true);
//       try {
//         await fetchOrder();
//       } catch {
//         showToast("Failed to load order details.", "error");
//       }
//       try {
//         await fetchPayments();
//       } catch {
//         // payments failure is non-fatal; already defaulted to []
//       }
//       setLoading(false);
//     };
//     load();
//   }, [fetchOrder, fetchPayments]);

//   // ✅ FIX 4: Use backend-provided paidAmount and balanceAmount, never recalculate
//   const alreadyPaid = Number(order?.paidAmount || 0);
//   const remainingBalance = Number(order?.balanceAmount || 0);
//   const totalAmount = Number(order?.totalAmount || 0);

//   const currentPayment = rows.reduce((sum, r) => {
//     const value = r.paymentMethod === "CASH" ? r.amount : r.amount;
//     return sum + (parseFloat(value) || 0);
//   }, 0);
//   const afterPayment = Math.max(0, remainingBalance - currentPayment);

//   // ✅ FIX 8 (extended): lock the form for every order status the backend
//   // refuses payments on - PAID, CANCELLED and RETURNED - not just PAID.
//   const isAlreadyPaid = LOCKED_ORDER_STATUSES.includes(order?.orderStatus);

//  const updateRow = (idx, field, value) => {

//     setRows(previous =>

//         previous.map((row, index) => {

//             if(index !== idx)
//                 return row;

//             let updatedRow = {

//                 ...row,

//                 [field]: value
//             };

//             if(updatedRow.paymentMethod === "CASH"){

//                 const tendered =
//                     Number(updatedRow.customerTendered || 0);

//                // Remaining balance before this row
// const backendBalance =
//     Number(order.balanceAmount || 0);

// // Sum of all previous payment rows
// const previousPayments =
//     previous.reduce((total, paymentRow, paymentIndex) => {

//         if (paymentIndex === index) return total;

//         return total + Number(paymentRow.amount || 0);

//     }, 0);

// // Remaining balance after previous rows
// const availableBalance =
//     Math.max(0, backendBalance - previousPayments);

// updatedRow.amount =
//     tendered > 0
//         ? Math.min(tendered, availableBalance).toFixed(2)
//         : "";

// updatedRow.changeReturn =
//     Math.max(0, tendered - availableBalance);
//             }

//             return updatedRow;

//         })

//     );

// };

// const addRow = () => {

//     const backendBalance =
//         Number(order.balanceAmount || 0);

//     const alreadyApplied =
//         rows.reduce(
//             (total, row) =>
//                 total + Number(row.amount || 0),
//             0
//         );

//     const remaining =
//         Math.max(0, backendBalance - alreadyApplied);

//     if (remaining <= 0) {
//         alert("Invoice is fully paid.");
//         return;
//     }

//     setRows(previous => [
//         ...previous,
//         {
//             ...emptyRow(),
//             customerTendered: "",
//             amount: "",
//             changeReturn: 0
//         }
//     ]);
// };

//   const removeRow = (idx) => {

//     if (rows.length === 1) return;

//     const updatedRows =
//         rows.filter((_, i) => i !== idx);

//     const backendBalance =
//         Number(order.balanceAmount || 0);

//     let remainingBalance =
//         backendBalance;

//     const recalculatedRows =
//         updatedRows.map((row) => {

//             if (row.paymentMethod === "CASH") {

//                 const tendered =
//                     Number(row.customerTendered || 0);

//                 const applied =
//                     Math.min(tendered, remainingBalance);

//                 const change =
//                     Math.max(0, tendered - remainingBalance);

//                 remainingBalance -= applied;

//                 return {
//                     ...row,
//                     amount: applied.toFixed(2),
//                     changeReturn: change
//                 };
//             }

//             const applied =
//                 Number(row.amount || 0);

//             remainingBalance -= applied;

//             return row;
//         });

//     setRows(recalculatedRows);
// };

//   const handleSave = async () => {
//     if (isAlreadyPaid) return;

//     const { errors, hasError } = validateRows(rows, remainingBalance);
//     setRowErrors(errors);
//     if (hasError) {
//       showToast("Please fix validation errors before saving.", "error");
//       return;
//     }

//     setSaving(true);
//     try {
//       // ✅ FIX 2: Direct addPayment call; FIX 9: include collectedBy
//       // ✅ FIX: send customerTendered for CASH rows. SalesPaymentService
//       // computes appliedAmount/changeReturn from customerTendered itself -
//       // it must NOT be asked to trust a pre-capped "amount" as if it were the
//       // tendered value. amount is still sent as a harmless preview; the
//       // backend only reads it as a fallback when customerTendered is absent.
//       const result = await addPayment({
//         orderId: Number(orderId),
//         collectedBy: cashier,
//         payments: rows.map((r) => ({
//           amount: parseFloat(r.amount),
//           paymentMethod: r.paymentMethod,
//           transactionNumber: r.transactionNumber.trim(),
//           remarks: r.remarks.trim(),
//           customerTendered:
//             r.paymentMethod === "CASH" ? parseFloat(r.customerTendered) : undefined,
//         })),
//       });

//       // ✅ FIX: SalesPaymentService returns 200 OK with a plain string for
//       // BOTH success and every validation failure (no exception is thrown
//       // for expected cases like "order not found" or "payment exceeds
//       // invoice amount"). A resolved promise here does NOT mean the payment
//       // was accepted - the message text has to be checked.
//       if (!isPaymentSuccessMessage(result)) {
//         showToast(result || "Payment was rejected by the server.", "error");
//         return;
//       }

//       // ✅ FIX 7: Sequential refreshes
//       await fetchOrder();
//       await fetchPayments();

//       setRows([emptyRow()]);
//       setRowErrors([{}]);

//       // ✅ FIX 10: the backend has no payment-id to hand back from this
//       // endpoint, so show its own message directly - it already reports the
//       // applied balance and any change to return.
//       showToast(result);
//     } catch (err) {
//       // ✅ FIX 5: Backend returns plain string, not {message:...}. This
//       // branch only fires for actual transport/server errors (network
//       // failure, 5xx, auth) since the backend never rejects with a non-2xx
//       // status for ordinary validation failures.
//       const msg =
//         typeof err?.response?.data === "string"
//           ? err.response.data
//           : err?.response?.data?.message || err?.message || "Payment failed.";
//       showToast(msg, "error");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const { hasError: isInvalid } = validateRows(rows, remainingBalance);
//   const statusStyle = styles.statusBadge(order?.orderStatus);
//   const isCancelledOrReturned = order?.orderStatus === "CANCELLED" || order?.orderStatus === "RETURNED";

//   if (loading) {
//     return (
//       <div style={styles.page}>
//         <div style={styles.loadingOverlay}>
//           <div style={styles.spinner} />
//           <span>Loading payment details…</span>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div style={styles.page}>
//       <style>{`
//         @keyframes spin { to { transform: rotate(360deg); } }
//         @keyframes slideIn { from { opacity:0; transform: translateX(20px); } to { opacity:1; transform: translateX(0); } }
//         input:focus, select:focus { outline: none; border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
//         button:focus-visible { outline: 2px solid #3B82F6; outline-offset: 2px; }
//         input:disabled, select:disabled { cursor: not-allowed; }
//       `}</style>

//       {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

//       {/* Header */}
//       <div style={styles.header}>
//         <div style={styles.headerLeft}>
//           <div style={styles.headerTitle}>Automobile ERP</div>
//           <div style={styles.headerBreadcrumb}>
//             <span>POS</span>
//             <span style={styles.breadcrumbSep}>›</span>
//             <span>Checkout</span>
//             <span style={styles.breadcrumbSep}>›</span>
//             <span style={{ color: "#2563EB" }}>Payment</span>
//           </div>
//         </div>
//         <div style={{ fontSize: "13px", color: "#94A3B8", display: "flex", alignItems: "center", gap: "12px" }}>
//           {/* ✅ FIX 9: Show cashier in header */}
//           {cashier && (
//             <span style={{ color: "#64748B", fontWeight: "500" }}>
//               Cashier: <strong>{cashier}</strong>
//             </span>
//           )}
//           <span>Order #{orderId}</span>
//         </div>
//       </div>

//       <div style={styles.body}>

//         {/* ✅ FIX 8: Paid banner when order is fully paid */}
//         {order?.orderStatus === "PAID" && (
//           <div style={styles.paidBanner}>
//             <span>✓</span>
//             <span>This invoice is fully paid. No further payments can be recorded.</span>
//           </div>
//         )}

//         {/* ✅ NEW: backend also refuses payments on cancelled/returned orders */}
//         {isCancelledOrReturned && (
//           <div style={styles.lockedBanner}>
//             <span>✕</span>
//             <span>
//               This invoice is {order.orderStatus === "CANCELLED" ? "cancelled" : "returned"} and can no longer accept payments.
//             </span>
//           </div>
//         )}

//         {/* Top grid: Invoice Summary + Payment History */}
//         <div style={styles.grid}>
//           {/* LEFT: Invoice Summary */}
//           <div style={styles.card}>
//             <div style={styles.cardTitle}>
//               <span style={styles.cardTitleDot} />
//               Invoice Summary
//             </div>

//             {[
//               { label: "Invoice Number", value: `INV-${String(orderId).padStart(6, "0")}` },
//               { label: "Customer Name", value: order?.customerName || "—" },
//               { label: "Phone", value: order?.phone || "—" },
//               { label: "Invoice Date", value: formatDate(order?.orderDate) },
//             ].map((row) => (
//               <div key={row.label} style={styles.summaryRow}>
//                 <span style={styles.summaryLabel}>{row.label}</span>
//                 <span style={styles.summaryValue}>{row.value}</span>
//               </div>
//             ))}

//             <div style={styles.summaryRow}>
//               <span style={styles.summaryLabel}>Status</span>
//               <span style={{ ...statusStyle, fontSize: "11px" }}>
//                 {statusStyle.label}
//               </span>
//             </div>

//             <div style={{ ...styles.summaryRow, marginTop: "6px" }}>
//               <span style={styles.summaryLabel}>Total Amount</span>
//               <span style={styles.amountHighlight()}>{formatCurrency(totalAmount)}</span>
//             </div>
//             {/* ✅ FIX 4: Use order.paidAmount directly */}
//             <div style={styles.summaryRow}>
//               <span style={styles.summaryLabel}>Paid Amount</span>
//               <span style={styles.amountHighlight("#16A34A")}>{formatCurrency(alreadyPaid)}</span>
//             </div>
//             {/* ✅ FIX 4: Use order.balanceAmount directly */}
//             <div style={{ ...styles.summaryRow, borderBottom: "none" }}>
//               <span style={styles.summaryLabel}>Balance Amount</span>
//               <span style={styles.amountHighlight(remainingBalance > 0 ? "#DC2626" : "#16A34A")}>
//                 {formatCurrency(remainingBalance)}
//               </span>
//             </div>
//           </div>

//           {/* RIGHT: Payment History */}
//           <div style={styles.card}>
//             <div style={styles.cardTitle}>
//               <span style={styles.cardTitleDot} />
//               Payment History
//             </div>
//             {payments.length === 0 ? (
//               <div style={styles.emptyState}>No payments recorded yet.</div>
//             ) : (
//               <div style={{ overflowX: "auto" }}>
//                 <table style={styles.table}>
//                   <thead>
//                     <tr>
//                       {/* ✅ FIX 10: Show payment reference column */}
//                       <th style={styles.th}>Ref</th>
//                       <th style={styles.th}>Date</th>
//                       <th style={styles.th}>Method</th>
//                       <th style={styles.th}>Transaction No.</th>
//                       <th style={styles.th}>Collected By</th>
//                       <th style={styles.th}>Remarks</th>
//                       <th style={styles.thRight}>Amount</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {payments.map((p) => (
//                       <tr
//                         key={p.id}
//                         style={{ transition: "background 0.1s" }}
//                         onMouseEnter={(e) => e.currentTarget.style.background = "#F8FAFC"}
//                         onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
//                       >
//                         {/* ✅ FIX 10: PAY-000001 reference - this comes from
//                             GET /sales-payments/order/{orderId}, which does
//                             return a real persisted id per payment */}
//                         <td style={styles.td}>
//                           <span style={styles.payRefBadge}>{formatPayRef(p.id)}</span>
//                         </td>
//                         <td style={styles.td}>{formatDate(p.paymentDate)}</td>
//                         <td style={styles.td}>
//                           <span style={styles.methodBadge}>{p.paymentMethod}</span>
//                         </td>
//                         <td style={styles.td}>{p.transactionNumber || <span style={{ color: "#CBD5E1" }}>—</span>}</td>
//                         {/* ✅ FIX 9: Show collectedBy from payment record */}
//                         <td style={styles.td}>{p.collectedBy || <span style={{ color: "#CBD5E1" }}>—</span>}</td>
//                         <td style={styles.td}>{p.remarks || <span style={{ color: "#CBD5E1" }}>—</span>}</td>
//                         <td style={styles.tdRight}>{formatCurrency(p.amount)}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Add Payment Card — hidden/disabled when locked */}
//         {/* ✅ FIX 8: Entire form section disabled when order can't take payments */}
//         <div style={{ ...styles.card, opacity: isAlreadyPaid ? 0.5 : 1, pointerEvents: isAlreadyPaid ? "none" : "auto" }}>
//           <div style={styles.cardTitle}>
//             <span style={styles.cardTitleDot} />
//             Add Payment
//             {/* ✅ FIX 9: Cashier label inside form */}
//             {cashier && (
//               <span style={{ marginLeft: "auto", fontSize: "12px", color: "#94A3B8", fontWeight: "500", textTransform: "none", letterSpacing: 0 }}>
//                 Collected by: <strong style={{ color: "#475569" }}>{cashier}</strong>
//               </span>
//             )}
//           </div>

//           {/* Column Headers */}
//           <div style={{ ...styles.formGrid, marginBottom: "4px" }}>
//             <span style={styles.label}>Method</span>
//             <span style={styles.label}>Amount (₹)</span>
//             <span style={styles.label}>Transaction / Cheque No.</span>
//             <span style={styles.label}>Remarks</span>
//             <span style={styles.label}>Collected By</span>
//             <span style={{ width: "38px" }} />
//           </div>

//           {rows.map((row, idx) => {
//             const err = rowErrors[idx] || {};
//             const needsTxn = REQUIRES_TRANSACTION.includes(row.paymentMethod);
//             const needsCheque = REQUIRES_CHEQUE.includes(row.paymentMethod);
//             const txnPlaceholder = needsCheque ? "Cheque No." : needsTxn ? "Transaction No." : "N/A for Cash";

//             return (
//               <div key={row._id}>
//                 <div style={styles.formGrid}>
//                   {/* Method */}
//                   <div>
//                     <select
//                       value={row.paymentMethod}
//                       onChange={(e) => updateRow(idx, "paymentMethod", e.target.value)}
//                       style={styles.select(err.paymentMethod)}
//                       disabled={isAlreadyPaid}
//                     >
//                       {PAYMENT_METHODS.map((m) => (
//                         <option key={m} value={m}>{m}</option>
//                       ))}
//                     </select>
//                     {err.paymentMethod && <div style={styles.errorText}>{err.paymentMethod}</div>}
//                   </div>

//                   {/* Amount */}
//                  {/* Amount */}

// <div>

// {

// row.paymentMethod === "CASH"

// ?

// <>

// <input
//     type="number"

//     placeholder="Customer Gives"

//     value={row.customerTendered}

//     onChange={(e)=>

//         updateRow(

//             idx,

//             "customerTendered",

//             e.target.value

//         )

//     }

//     style={styles.input(err.amount,isAlreadyPaid)}

//     disabled={isAlreadyPaid}
// />

// <input

//     readOnly

//     value={row.amount}

//     placeholder="Payment Applied"

//     style={styles.input(false,true)}
// />

// <div
// style={{
//     marginTop:"6px",
//     fontWeight:"600",
//     color:"#16A34A"
// }}
// >

// Change Return :

// {formatCurrency(row.changeReturn)}

// </div>

// </>

// :

// <>

// <input

//     type="number"

//     min="0.01"

//     step="0.01"

//     placeholder="Amount"

//     value={row.amount}

//     onChange={(e)=>

//         updateRow(

//             idx,

//             "amount",

//             e.target.value

//         )

//     }

//     style={styles.input(err.amount,isAlreadyPaid)}

//     disabled={isAlreadyPaid}
// />

// </>

// }

// {

// err.amount &&

// <div style={styles.errorText}>

// {err.amount}

// </div>

// }

// </div>

//                   {/* Transaction Number */}
//                   <div>
//                     <input
//                       type="text"
//                       placeholder={txnPlaceholder}
//                       value={row.transactionNumber}
//                       disabled={row.paymentMethod === "CASH" || isAlreadyPaid}
//                       onChange={(e) => updateRow(idx, "transactionNumber", e.target.value)}
//                       style={styles.input(err.transactionNumber, row.paymentMethod === "CASH" || isAlreadyPaid)}
//                     />
//                     {err.transactionNumber && <div style={styles.errorText}>{err.transactionNumber}</div>}
//                   </div>

//                   {/* Remarks */}
//                   <div>
//                     <input
//                       type="text"
//                       placeholder="Optional remarks"
//                       value={row.remarks}
//                       onChange={(e) => updateRow(idx, "remarks", e.target.value)}
//                       style={styles.input(false, isAlreadyPaid)}
//                       disabled={isAlreadyPaid}
//                     />
//                   </div>

//                   {/* ✅ FIX 9: Collected By (read-only, per row) */}
//                   <div>
//                     <input
//                       type="text"
//                       value={cashier || ""}
//                       readOnly
//                       style={styles.input(false, true)}
//                     />
//                   </div>

//                   {/* Remove */}
//                   <button
//                     onClick={() => removeRow(idx)}
//                     style={styles.removeBtn}
//                     disabled={rows.length === 1 || isAlreadyPaid}
//                     title="Remove row"
//                   >
//                     ×
//                   </button>
//                 </div>
//               </div>
//             );
//           })}

//           <button onClick={addRow} style={styles.addRowBtn} disabled={isAlreadyPaid}>
//             <span style={{ fontSize: "16px" }}>+</span>
//             Add Another Payment Method
//           </button>

//           <div style={styles.divider} />

//           {/* Live Totals */}
//           <div style={styles.totalsGrid}>
//             <div style={styles.totalBox(false)}>
//               <div style={styles.totalBoxLabel}>Invoice Total</div>
//               <div style={styles.totalBoxValue(false)}>{formatCurrency(totalAmount)}</div>
//             </div>
//             <div style={styles.totalBox(false)}>
//               <div style={styles.totalBoxLabel}>Already Paid</div>
//               <div style={styles.totalBoxValue(false)}>{formatCurrency(alreadyPaid)}</div>
//             </div>
//             <div style={styles.totalBox(true)}>
//               <div style={styles.totalBoxLabel}>Current Payment</div>
//               <div style={styles.totalBoxValue(true)}>{formatCurrency(currentPayment)}</div>
//             </div>
//             <div style={styles.totalBox(false)}>
//               <div style={styles.totalBoxLabel}>Remaining Balance</div>
//               <div style={{
//                 ...styles.totalBoxValue(false),
//                 color: afterPayment > 0 ? "#DC2626" : "#16A34A",
//               }}>
//                 {formatCurrency(afterPayment)}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Footer */}
//       <div style={styles.footerBar}>
//         <button style={styles.btnBack} onClick={() => navigate(-1)}>
//           ← Back
//         </button>

//         <div style={styles.footerRight}>
//           {/* Save button: hidden when locked */}
//           {!isAlreadyPaid && (
//             <button
//               style={styles.btnSave(isInvalid || saving)}
//               onClick={handleSave}
//               disabled={isInvalid || saving}
//             >
//               {saving ? (
//                 <>
//                   <div style={styles.spinner} />
//                   Saving…
//                 </>
//               ) : (
//                 "Save Payment"
//               )}
//             </button>
//           )}

//           {/* ✅ FIX 6: Invoice button always enabled — every status can print */}
//           <button
//             style={styles.btnInvoice}
//             onClick={() => navigate(`/pos/invoice/${orderId}`)}
//           >
//             View Invoice →
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
 