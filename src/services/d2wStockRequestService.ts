import api from "./api";

export async function createD2WStockRequest(payload: any): Promise<any> {
  const response = await api.post("/purchase-orders", payload);
  return response.data;
}

export async function getD2WStockRequests(
  storeId?: number | string,
): Promise<any[]> {
  const response = await api.get("/purchase-orders", {
    params: storeId ? { storeId } : {},
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function searchD2WRequestProducts(
  text: string,
  storeId?: number | string,
): Promise<any[]> {
  const response = await api.get("/products/search", {
    params: { text, storeId },
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function getD2WSourceWarehouse(): Promise<any> {
  const response = await api.get("/purchase-orders/source-warehouse");
  return response.data;
}
