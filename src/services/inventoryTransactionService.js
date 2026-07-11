import axios from "axios";

const API = "http://localhost:8080";

export const getInventoryTransactions =
async (storeId) => {

    const response =
        await axios.get(
            `${API}/inventory-transactions/store/${storeId}`
        );

    return response.data;
};
export const createInventoryAdjustment =
async (data) => {

    const response =
        await axios.post(
            `${API}/inventory-adjustment`,
            data
        );

    return response.data;
};