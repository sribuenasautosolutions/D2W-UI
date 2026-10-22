import apiclient from "./apiclient";
import {
  OrderRequestDTO,
  OrderCalculationRequestDTO,
  OrderCalculationResponseDTO,
  InvoiceResponseDTO,
} from "../types/sales";

/**
 * Order API client.
 *
 * Maps 1:1 to com.Controller.OrderController (@RequestMapping "/orders").
 */

export const placeOrder = async (
  orderRequestDTO: OrderRequestDTO,
): Promise<number> => {
  const response = await apiclient.post<number>("/orders", orderRequestDTO);
  return response.data;
};

export const getInvoice = async (
  orderId: number | string,
): Promise<InvoiceResponseDTO> => {
  const response = await apiclient.get<InvoiceResponseDTO>(
    `/orders/${orderId}`,
  );
  return response.data;
};

export const getAllOrders = async (): Promise<any[]> => {
  const response = await apiclient.get("/orders");
  return response.data;
};

export const getOrdersByStore = async (
  storeId: number | string,
): Promise<any[]> => {
  const response = await apiclient.get(`/orders/store/${storeId}`);
  return response.data;
};

export const calculateOrder = async (
  orderCalculationRequestDTO: OrderCalculationRequestDTO,
): Promise<OrderCalculationResponseDTO> => {
  const response = await apiclient.post<OrderCalculationResponseDTO>(
    "/orders/recalculate",
    orderCalculationRequestDTO,
  );
  return response.data;
};

export const previewSalesBulkUpload = async (
  file: File,
  storeId: number | string,
): Promise<any> => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("storeId", String(storeId));

  const response = await apiclient.post(
    "/orders/bulk-upload-preview",
    formData,
    {
      headers: {
        "Content-Type": undefined,
      },
    },
  );

  return response.data;
};

export const downloadSalesBulkUploadTemplate = async (): Promise<Blob> => {
  const response = await apiclient.get("/orders/bulk-upload-template", {
    responseType: "blob",
  });

  return response.data;
};
