import apiclient from "./apiclient";
import {
  SalesPaymentCalculationRequestDTO,
  SalesPaymentCreateDTO,
} from "../types/sales";

export const calculatePayment = async (
  salesPaymentCalculationRequestDTO: SalesPaymentCalculationRequestDTO,
): Promise<any> => {
  const response = await apiclient.post(
    "/sales-payments/calculate",
    salesPaymentCalculationRequestDTO,
  );
  return response.data;
};

export const addPayment = async (
  salesPaymentCreateDTO: SalesPaymentCreateDTO,
): Promise<any> => {
  const response = await apiclient.post(
    "/sales-payments",
    salesPaymentCreateDTO,
  );
  return response.data;
};

export const getPaymentsByOrder = async (
  orderId: number | string,
): Promise<any[]> => {
  const response = await apiclient.get(`/sales-payments/order/${orderId}`);
  return response.data;
};

// POS preview is read-only; checkout commits invoice, stock and payment together.
export const previewPosPayment = async (request: any): Promise<any> => {
  const response = await apiclient.post("/orders/pos/payment-preview", request);
  return response.data;
};

export const checkoutPosPayment = async (request: any): Promise<any> => {
  const response = await apiclient.post("/orders/pos/checkout", request);
  return response.data;
};
