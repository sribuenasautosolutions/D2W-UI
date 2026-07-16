export const getInvoice = async (orderId) => {

    const response =
        await axios.get(
            `/orders/${orderId}`
        );

    return response.data;
};