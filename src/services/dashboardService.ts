import api from "./api";

export const getDashboard = async (): Promise<any> => {
  const response = await api.get("/dashboard");
  return response.data;
};

export const getStorePerformance = async (): Promise<any> => {
  const response = await api.get("/dashboard/store-performance");
  return response.data;
};

export const getStoreDashboard = async (
  storeId: number | string,
): Promise<any> => {
  const response = await api.get(`/dashboard/store/${storeId}`);
  return response.data;
};
