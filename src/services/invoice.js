export const getInvoice = async (orderId) => {

    const response =
        await axios.get(
            `${API}/orders/${orderId}`
        );

    return response.data;
};