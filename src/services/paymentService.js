import apiclient from "./apiclient";

export const calculatePayment = async (salesPaymentCalculationRequestDTO) => {
  const response = await apiclient.post(
    "/sales-payments/calculate",
    salesPaymentCalculationRequestDTO
  );
  return response.data;
};

export const addPayment = async (salesPaymentCreateDTO) => {
  const response = await apiclient.post("/sales-payments", salesPaymentCreateDTO);
  return response.data;
};

export const getPaymentsByOrder = async (orderId) => {
  const response = await apiclient.get(`/sales-payments/order/${orderId}`);
  return response.data;
};
// POS preview is read-only; checkout commits invoice, stock and payment together.
export const previewPosPayment = async (request) => {
  const response = await apiclient.post("/orders/pos/payment-preview", request);
  return response.data;
};
export const checkoutPosPayment = async (request) => {
  const response = await apiclient.post("/orders/pos/checkout", request);
  return response.data;
};