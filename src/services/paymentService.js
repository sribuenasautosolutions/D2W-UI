import apiClient from "./apiClient";

/**
 * Sales-payment API client.
 *
 * Maps 1:1 to com.Controller.SalesPaymentController (@RequestMapping
 * "/sales-payments"). Uses the shared apiClient so every call carries
 * the Authorization: Bearer <token> header and gets the same
 * 401/403 -> auto-logout handling as orderService.js. No endpoint,
 * field, or response shape here is invented.
 */

/**
 * POST /sales-payments/calculate
 * Live "what-if" calculation — call this every time the payment rows
 * change (debounced). Backend does ALL math: applied amount, change
 * return, remaining balance, whether payment is complete. Performs no
 * persistence.
 *
 * @param {Object} salesPaymentCalculationRequestDTO - must match
 *   SalesPaymentCalculationRequestDTO exactly:
 *   {
 *     orderId: number,
 *     payments: [{ amount, paymentMethod, transactionNumber,
 *       remarks, customerTendered, changeReturn }]
 *   }
 * @returns {Promise<Object>} SalesPaymentCalculationResponseDTO
 *   { invoiceAmount, alreadyPaid, enteredAmount, appliedAmount,
 *     balanceAmount, changeReturn, paymentCompleted }
 */
export const calculatePayment = async (salesPaymentCalculationRequestDTO) => {
  const response = await apiClient.post(
    "/sales-payments/calculate",
    salesPaymentCalculationRequestDTO
  );
  return response.data;
};

/**
 * POST /sales-payments
 * Persists the payment(s) against the order, updates the order's
 * paidAmount/balanceAmount/orderStatus, and returns the new totals.
 *
 * @param {Object} salesPaymentCreateDTO - must match
 *   SalesPaymentCreateDTO exactly:
 *   {
 *     orderId: number,
 *     collectedBy: string,
 *     payments: [{ amount, paymentMethod, transactionNumber,
 *       remarks, customerTendered, changeReturn }]
 *   }
 * @returns {Promise<Object>} SalesPaymentResponseDTO
 *   { id, amount, paymentMethod, transactionNumber, collectedBy,
 *     remarks, paymentDate, invoiceAmount, alreadyPaid, balanceAmount,
 *     changeReturn, orderStatus, success, message }
 */
export const addPayment = async (salesPaymentCreateDTO) => {
  const response = await apiClient.post("/sales-payments", salesPaymentCreateDTO);
  return response.data;
};

/**
 * GET /sales-payments/order/{orderId}
 * Payment history for an order (previously collected payments — e.g.
 * on a partially-paid order).
 *
 * @param {number|string} orderId
 * @returns {Promise<Array>} SalesPaymentResponseDTO[]
 */
export const getPaymentsByOrder = async (orderId) => {
  const response = await apiClient.get(`/sales-payments/order/${orderId}`);
  return response.data;
};
