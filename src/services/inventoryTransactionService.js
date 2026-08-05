import api from "./api";

export const getInventoryTransactions = async (storeId) => {

    const response = await api.get(
        `/inventory-transactions/store/${storeId}`
    );

    return response.data;
};

export const createInventoryAdjustment = async (data) => {

    const response = await api.post(
        `/inventory-adjustment`,
        data
    );

    return response.data;
};

export const getInventoryTransactionsPage = async (storeId, filters = {}) => {
    const url = storeId ? `/inventory-transactions/store/${storeId}/paged` : `/inventory-transactions/paged`;
    const response = await api.get(
        url,
        { params: filters }
    );
    return response.data;
};
