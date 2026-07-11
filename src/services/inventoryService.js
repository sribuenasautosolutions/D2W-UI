import axios from "axios";

const API = "http://localhost:8080";

/* =========================
   INVENTORY REPORT
========================= */

export const getInventoryReport = async (storeId) => {
  const url = storeId
    ? `${API}/reports/${storeId}/inventory`
    : `${API}/reports/inventory`;

  const response = await axios.get(url);
  return response.data;
};

export const getInventoryItems = async (storeId) => {
  const url = storeId
    ? `${API}/reports/${storeId}/inventory/items`
    : `${API}/reports/inventory/items`;

  const response = await axios.get(url);
  return response.data;
};

/* =========================
   LOW STOCK REPORT
========================= */

export const getLowStockReport = async (storeId) => {
  const url = storeId
    ? `${API}/reports/${storeId}/low-stock`
    : `${API}/reports/low-stock`;

  const response = await axios.get(url);
  return response.data;
};

export const getLowStockItems = async (storeId) => {
  const url = storeId
    ? `${API}/reports/${storeId}/low-stock/items`
    : `${API}/reports/low-stock/items`;

  const response = await axios.get(url);
  return response.data;
};

/* =========================
   DEAD STOCK
========================= */

export const getDeadStockProducts = async (storeId) => {
  const url = storeId
    ? `${API}/reports/${storeId}/inventory/dead-stock`
    : `${API}/reports/inventory/dead-stock`;

  const response = await axios.get(url);
  return response.data;
};

/* =========================
   STORE PERFORMANCE
========================= */

export const getStorePerformance = async (storeId) => {
  const url = storeId
    ? `${API}/reports/${storeId}/store-performance`
    : `${API}/reports/store-performance`;

  const response = await axios.get(url);
  return response.data;
};

/* =========================
   PROFIT REPORT
========================= */

export const getProfitReport = async (storeId) => {
  const url = storeId
    ? `${API}/reports/${storeId}/profit`
    : `${API}/reports/profit`;

  const response = await axios.get(url);
  return response.data;
};