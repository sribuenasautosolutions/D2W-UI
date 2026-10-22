import api from "./api";
import { Customer } from "../types/sales";

/* =========================
   CUSTOMER MANAGEMENT
========================= */

export const getCustomerByMobile = async (
  mobile: string,
  storeId?: number | string,
): Promise<Customer> => {
  const response = await api.get<Customer>(`/customers/mobile/${mobile}`, {
    params: { storeId },
  });

  return response.data;
};

export const saveCustomer = async (
  customer: Partial<Customer>,
): Promise<Customer> => {
  const response = await api.post<Customer>(`/customers`, customer);

  return response.data;
};

/* =========================
   CUSTOMER REPORTS
========================= */

export const getCustomerReport = async (): Promise<any> => {
  const response = await api.get(`/reports/customers`);

  return response.data;
};

export const getCustomerList = async (): Promise<Customer[]> => {
  const response = await api.get<Customer[]>(`/reports/customers/list`);

  return response.data;
};

export const getCustomerDetails = async (
  customerId: number | string,
): Promise<any> => {
  const response = await api.get(`/reports/customers/${customerId}`);

  return response.data;
};

export const getCustomerOrders = async (
  customerId: number | string,
): Promise<any[]> => {
  const response = await api.get(`/reports/customers/${customerId}/orders`);

  return response.data;
};

export const searchCustomersByStore = async (
  storeId: number | string,
  search = "",
): Promise<Customer[]> => {
  const response = await api.get<Customer[]>("/customers/search", {
    params: { storeId, search },
  });
  return response.data;
};

export const updateCustomer = async (
  customerId: number | string,
  customer: Partial<Customer>,
): Promise<Customer> => {
  const response = await api.put<Customer>(
    `/customers/${customerId}`,
    customer,
  );
  return response.data;
};
