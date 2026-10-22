import api from "./api";
import { PaginatedResponse } from "../types/api";
import { InventoryTransaction } from "../types/inventory";

export const getInventoryTransactions = async (
  storeId: number | string,
): Promise<InventoryTransaction[]> => {
  const response = await api.get<InventoryTransaction[]>(
    `/inventory-transactions/store/${storeId}`,
  );

  return response.data;
};

export const createInventoryAdjustment = async (data: any): Promise<any> => {
  const response = await api.post(`/inventory-adjustment`, data);

  return response.data;
};

export const getInventoryTransactionsPage = async (
  storeId?: number | string,
  filters: Record<string, any> = {},
): Promise<PaginatedResponse<InventoryTransaction>> => {
  const url = storeId
    ? `/inventory-transactions/store/${storeId}/paged`
    : `/inventory-transactions/paged`;
  const response = await api.get<PaginatedResponse<InventoryTransaction>>(url, {
    params: filters,
  });
  return response.data;
};
