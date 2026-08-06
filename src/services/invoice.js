import api from "./api";

export const getInvoice = async (orderId) => {

    const response =
        await api.get(
            `/orders/${orderId}`
        );

    return response.data;
};
