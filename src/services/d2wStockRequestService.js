import api from "./api";

export async function createD2WStockRequest(payload) {
  const response = await api.post("/purchase-orders", payload);
  return response.data;
}

export async function getD2WStockRequests(storeId) {
  const response = await api.get("/purchase-orders", {
    params: storeId ? { storeId } : {},
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function searchD2WRequestProducts(text, storeId) {
  const response = await api.get("/products/search", {
    params: { text, storeId },
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function getD2WSourceWarehouse() {
  const response = await api.get("/purchase-orders/source-warehouse");
  return response.data;
}
