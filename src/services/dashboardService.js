import api from "./api";

export const getDashboard = async () => {

    const response = await api.get("/dashboard");

    return response.data;
};

export const getStorePerformance = async () => {
    const response = await api.get("/dashboard/store-performance");
    return response.data;
};

export const getStoreDashboard = async (storeId) => {
    const response = await api.get(`/dashboard/store/${storeId}`);
    return response.data;
};
