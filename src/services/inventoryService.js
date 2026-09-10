import api from "./api";

 

/* =========================
   INVENTORY REPORT
========================= */

export const getInventoryReport = async (storeId) => {
  const url = storeId
    ? `/reports/${storeId}/inventory`
    : `/reports/inventory`;

  const response = await api.get(url);
  return response.data;
};

export const getInventoryItems = async (storeId) => {
  const url = storeId
    ? ` /reports/${storeId}/inventory/items`
   : `/reports/inventory/items`

  const response = await api.get(url);
  return response.data;
};

/* =========================
   LOW STOCK REPORT
========================= */

export const getLowStockReport = async (storeId) => {
  const url = storeId
    ? `/reports/${storeId}/low-stock`
    : `/reports/low-stock`;

  const response = await api.get(url);
  return response.data;
};

export const getLowStockItems = async (storeId) => {
  const url = storeId
    ? ` /reports/${storeId}/low-stock/items`
    : ` /reports/low-stock/items`;

  const response = await api.get(url);
  return response.data;
};

/* =========================
   DEAD STOCK
========================= */

export const getDeadStockProducts = async (storeId) => {
  const url = storeId
    ? `/reports/${storeId}/inventory/dead-stock`
    : `/reports/inventory/dead-stock`;

  const response = await api.get(url);
  return response.data;
};

/* =========================
   STORE PERFORMANCE
========================= */

export const getStorePerformance = async (storeId) => {
  const url = storeId
    ? `/reports/${storeId}/store-performance`
    : `/reports/store-performance`;

  const response = await api.get(url);
  return response.data;
};

/* =========================
   PROFIT REPORT
========================= */

export const getProfitReport = async (storeId) => {
  const url = storeId
    ? ` /reports/${storeId}/profit`
    : ` /reports/profit`;

  const response = await api.get(url);
  return response.data;
};
export const getBatchReport = async (storeId, params = {}) => {
  const url = storeId
    ? `/store-inventory/batches/store/${storeId}`
    : `/store-inventory/batches`;

  const response = await api.get(url, {
    params,
  });

  return response.data;
};
