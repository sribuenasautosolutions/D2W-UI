import api from "./api";



/* ===========================
   SALES REPORT
=========================== */

export const getSalesReport = async (storeId) => {
  const response = await api.get(
    `/reports/sales?storeId=${storeId}`
  );
  return response.data;
};

export const getSalesOrders = async (storeId) => {
  const response = await api.get(
    `/reports/sales/orders?storeId=${storeId}`
  );
  return response.data;
};

export const getTopProducts = async (storeId) => {
  const response = await api.get(
    `/reports/sales/top-products?storeId=${storeId}`
  );
  return response.data;
};

export const getTopCategories = async (storeId) => {
  const response = await api.get(
    `/reports/sales/top-categories?storeId=${storeId}`
  );
  return response.data;
};

export const getTopBrands = async (storeId) => {
  const response = await api.get(
    `/reports/sales/top-brands?storeId=${storeId}`
  );
  return response.data;
};

export const getTopVehicles = async (storeId) => {
  const response = await api.get(
    `/reports/sales/top-vehicles?storeId=${storeId}`
  );
  return response.data;
};

/* ===========================
   INVENTORY REPORT
=========================== */

export const getInventoryReport = async (storeId) => {
  const response = await api.get(
    `/reports/inventory?storeId=${storeId}`
  );
  return response.data;
};
 
export const getInventoryItems = async (storeId) => {
  const response = await api.get(
    `/reports/inventory/items?storeId=${storeId}`
  );
  return response.data;
};

/* ===========================
   LOW STOCK REPORT
=========================== */

export const getLowStockReport = async (storeId) => {
  const response = await api.get(
    `/reports/low-stock?storeId=${storeId}`
  );
  return response.data;
};

export const getLowStockItems = async (storeId) => {
  const response = await api.get(
    `/reports/low-stock/items?storeId=${storeId}`
  );
  return response.data;
};

/* ===========================
   CUSTOMER REPORT
=========================== */

export const getCustomerReport = async (storeId) => {
  const response = await api.get(
    `/reports/customers?storeId=${storeId}`
  );
  return response.data;
};

export const getCustomerList = async (storeId) => {
  const response = await api.get(
    `/reports/customers/list?storeId=${storeId}`
  );
  return response.data;
};

/* ===========================
   CUSTOMER DETAILS
=========================== */

export const getCustomerDetails = async (id) => {
  const response = await api.get(
    `/reports/customers/${id}`
  );
  return response.data;
};

export const getCustomerOrderHistory = async (id) => {
  const response = await api.get(
    `/reports/customers/${id}/orders`
  );
  return response.data;
};