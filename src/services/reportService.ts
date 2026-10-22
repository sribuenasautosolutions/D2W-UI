import api from "./api";

/* ===========================
   SALES REPORT
=========================== */

export const getSalesReport = async (
  storeId: number | string,
): Promise<any> => {
  const response = await api.get(`/reports/sales?storeId=${storeId}`);
  return response.data;
};

export const getSalesOrders = async (
  storeId: number | string,
): Promise<any> => {
  const response = await api.get(`/reports/sales/orders?storeId=${storeId}`);
  return response.data;
};

export const getTopProducts = async (
  storeId: number | string,
): Promise<any> => {
  const response = await api.get(
    `/reports/sales/top-products?storeId=${storeId}`,
  );
  return response.data;
};

export const getTopCategories = async (
  storeId: number | string,
): Promise<any> => {
  const response = await api.get(
    `/reports/sales/top-categories?storeId=${storeId}`,
  );
  return response.data;
};

export const getTopBrands = async (storeId: number | string): Promise<any> => {
  const response = await api.get(
    `/reports/sales/top-brands?storeId=${storeId}`,
  );
  return response.data;
};

export const getTopVehicles = async (
  storeId: number | string,
): Promise<any> => {
  const response = await api.get(
    `/reports/sales/top-vehicles?storeId=${storeId}`,
  );
  return response.data;
};

/* ===========================
   INVENTORY REPORT
=========================== */

export const getInventoryReport = async (
  storeId: number | string,
): Promise<any> => {
  const response = await api.get(`/reports/inventory?storeId=${storeId}`);
  return response.data;
};

export const getInventoryItems = async (
  storeId: number | string,
): Promise<any> => {
  const response = await api.get(`/reports/inventory/items?storeId=${storeId}`);
  return response.data;
};

/* ===========================
   LOW STOCK REPORT
=========================== */

export const getLowStockReport = async (
  storeId?: number | string,
): Promise<any> => {
  const response = await api.get(
    `/reports/low-stock${storeId != null ? `?storeId=${storeId}` : ""}`,
  );
  return response.data;
};

export const getLowStockItems = async (
  storeId?: number | string,
): Promise<any> => {
  const response = await api.get(
    `/reports/low-stock/items${storeId != null ? `?storeId=${storeId}` : ""}`,
  );
  return response.data;
};

/* ===========================
   CUSTOMER REPORT
=========================== */

export const getCustomerReport = async (
  storeId: number | string,
): Promise<any> => {
  const response = await api.get(`/reports/customers?storeId=${storeId}`);
  return response.data;
};

export const getCustomerList = async (
  storeId: number | string,
): Promise<any> => {
  const response = await api.get(`/reports/customers/list?storeId=${storeId}`);
  return response.data;
};

/* ===========================
   CUSTOMER DETAILS
=========================== */

export const getCustomerDetails = async (id: number | string): Promise<any> => {
  const response = await api.get(`/reports/customers/${id}`);
  return response.data;
};

export const getCustomerOrderHistory = async (
  id: number | string,
): Promise<any> => {
  const response = await api.get(`/reports/customers/${id}/orders`);
  return response.data;
};
