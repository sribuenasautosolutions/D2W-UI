import api from "./api";
import { InvoiceResponseDTO } from "../types/sales";

export const getInvoice = async (
  orderId: number | string,
): Promise<InvoiceResponseDTO> => {
  const response = await api.get<InvoiceResponseDTO>(`/orders/${orderId}`);

  return response.data;
};
