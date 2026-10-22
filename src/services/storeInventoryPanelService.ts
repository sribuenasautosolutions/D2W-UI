import api from "./api";

/* ==========================================================================
   Store Manager — Inventory Management screen
   Every call here maps 1:1 to a real, already-existing backend endpoint
   (StoreInventoryController / InventoryTransactionController /
   InventoryAdjustmentController). Nothing here is speculative.
   ========================================================================== */

// Stats cards: totalProducts, lowStockItems, outOfStockItems, inventoryValue, etc.
export const getStoreDashboard = async (
  storeId: number | string,
): Promise<any> => {
  const response = await api.get(`/store-inventory/dashboard/store/${storeId}`);
  return response.data;
};

// Left-panel product list, scoped to this store only.
export const getStoreInventory = async (
  storeId: number | string,
): Promise<any> => {
  const response = await api.get(`/store-inventory/store/${storeId}`);
  return response.data;
};

export const getCurrentStockPage = async (
  storeId?: number | string,
  filters: Record<string, any> = {},
): Promise<any> => {
  const url = storeId
    ? `/store-inventory/store/${storeId}/paged`
    : `/store-inventory/paged`;
  const response = await api.get(url, {
    params: filters,
  });
  return response.data;
};

// Overview tab — full detail for one inventory row.
export const getProductDetails = async (
  storeId: number | string,
  inventoryId: number | string,
): Promise<any> => {
  const response = await api.get(`/store-inventory/product-details`, {
    params: { storeId, inventoryId },
  });
  return response.data;
};

// Batches tab.
export const getProductBatches = async (
  storeId: number | string,
  inventoryId: number | string,
): Promise<any> => {
  const response = await api.get(`/store-inventory/product-batches`, {
    params: { storeId, inventoryId },
  });
  return response.data;
};

export const getManagementBatches = async (
  inventoryId: number | string,
): Promise<any> => {
  const response = await api.get(
    `/store-inventory/${inventoryId}/management-batches`,
  );
  return response.data;
};

export const getProductLocations = async (
  inventoryId: number | string,
  page = 0,
  size = 20,
): Promise<any> => {
  const response = await api.get(`/store-inventory/${inventoryId}/locations`, {
    params: { page, size },
  });
  return response.data;
};

export const updateProductBasicInformation = async (
  inventoryId: number | string,
  payload: any,
): Promise<any> => {
  const response = await api.patch(
    `/store-inventory/${inventoryId}/basic-information`,
    payload,
  );
  return response.data;
};

export const updateInventoryPrices = async (
  inventoryId: number | string,
  payload: any,
): Promise<any> => {
  const response = await api.patch(
    `/store-inventory/${inventoryId}/prices`,
    payload,
  );
  return response.data;
};

export const updateInventoryBatch = async (
  batchId: number | string,
  payload: any,
): Promise<any> => {
  const response = await api.patch(
    `/store-inventory/batches/${batchId}`,
    payload,
  );
  return response.data;
};

// Transactions tab — history of stock movement for this product.
export const getTransactionsByProduct = async (
  productId: number | string,
): Promise<any> => {
  const response = await api.get(
    `/inventory-transactions/product/${productId}`,
  );
  return response.data;
};

// Adjust Stock action.
export const createInventoryAdjustment = async (dto: any): Promise<any> => {
  const response = await api.post(`/inventory-adjustment`, dto);
  return response.data;
};

export const printBarcodes = async (
  storeId: number | string,
  items: any[],
): Promise<Blob> => {
  const response = await api.post(
    "/barcodes/print",
    {
      storeId,
      items,
    },
    {
      responseType: "blob",
    },
  );

  return response.data;
};
