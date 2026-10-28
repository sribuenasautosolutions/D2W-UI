import apiclient from "./apiclient";

/**
 * Order API client.
 *
 * Maps 1:1 to com.Controller.OrderController (@RequestMapping "/orders").
 * Every function below corresponds to an existing backend endpoint —
 * no endpoint, field, or response shape here is invented. Request
 * bodies must be built by the caller to match the backend DTOs
 * exactly (OrderRequestDTO, OrderCalculationRequestDTO); this service
 * performs no field renaming, defaulting, or transformation.
 */

/**
 * POST /orders
 * Places a new order. Backend runs full validation, stock check,
 * GST/discount calculation, inventory deduction, and customer-ledger
 * entry, then returns the new order's numeric id.
 *
 * @param {Object} orderRequestDTO - must match OrderRequestDTO exactly:
 *   {
 *     customerName: string,
 *     phone: string,
 *     address: string,
 *     paymentMethod: string,
 *     billDiscountPercent: number,
 *     items: [{ productId, quantity, discountPercentage, gstType }],
 *     storeId: number
 *   }
 * @returns {Promise<number>} the new orderId
 */
export const placeOrder = async (orderRequestDTO) => {
  const response = await apiclient.post("/orders", orderRequestDTO);
  return response.data;
};

/**
 * GET /orders/{orderId}
 * Returns the full invoice for an order: customer/bill info, every
 * line item, and every payment recorded against it so far.
 *
 * @param {number|string} orderId
 * @returns {Promise<Object>} InvoiceResponseDTO
 */
export const getInvoice = async (orderId) => {
  const response = await apiclient.get(`/orders/${orderId}`);
  return response.data;
};

export const previewInvoiceAmendment = async (orderId, payload) => {
  const response = await apiclient.post(`/orders/${orderId}/amendment-preview`, payload);
  return response.data;
};

export const amendInvoice = async (orderId, payload) => {
  const response = await apiclient.put(`/orders/${orderId}`, payload);
  return response.data;
};

/**
 * GET /orders
 * Returns every order across all stores (list/report row shape).
 *
 * @returns {Promise<Array>} OrderListResponseDTO[]
 */
export const getAllOrders = async () => {
  const response = await apiclient.get("/orders");
  return response.data;
};

/**
 * GET /orders/store/{storeId}
 * Returns every order placed at a specific store.
 *
 * @param {number|string} storeId
 * @returns {Promise<Array>} OrderListResponseDTO[]
 */
export const getOrdersByStore = async (storeId) => {
  const response = await apiclient.get(`/orders/store/${storeId}`);
  return response.data;
};

/**
 * POST /orders/recalculate
 * Live pricing/tax engine preview — used by the checkout screen to
 * show gross amount, discounts, CGST/SGST/IGST, round-off, and net
 * payable before an order is placed. Performs no persistence.
 *
 * @param {Object} orderCalculationRequestDTO - must match
 *   OrderCalculationRequestDTO exactly:
 *   {
 *     storeId: number,
 *     billDiscountPercent: number,
 *     items: [{ productId, quantity, discountPercentage, gstType }]
 *   }
 * @returns {Promise<Object>} OrderCalculationResponseDTO
 */
export const calculateOrder = async (orderCalculationRequestDTO) => {
  const response = await apiclient.post("/orders/recalculate", orderCalculationRequestDTO);
  return response.data;
};

export const previewSalesBulkUpload = async (file, storeId) => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("storeId", storeId);

  const response = await apiclient.post(
    "/orders/bulk-upload-preview",
    formData,
    {
      headers: {
        "Content-Type": undefined,
      },
    }
  );

  return response.data;
};
export const downloadSalesBulkUploadTemplate = async () => {
  const response = await apiclient.get(
    "/orders/bulk-upload-template",
    {
      responseType: "blob",
    }
  );

  return response.data;
};

export const getInvoiceHistory = async (orderId) => {
  const response = await apiclient.get(`/orders/${orderId}/history`);
  return response.data;
};
