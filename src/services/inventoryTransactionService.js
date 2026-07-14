import api from "./api";

const API = "http://localhost:8080";

export const getInventoryTransactions =
async (storeId) => {

    const response =
        await api.get(
            `${API}/inventory-transactions/store/${storeId}`
        );

    return response.data;
};
export const createInventoryAdjustment =
async (data) => {

    const response =
        await api.post(
            `${API}/inventory-adjustment`,
            data
        );

    return response.data;
};