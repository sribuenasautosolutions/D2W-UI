import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const placeOrder =
    async (orderData) => {

        console.log(
            orderData
        );

        const response =
            await axios.post(

                `${API}/orders`,

                orderData,

                {
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        return response.data;
    };

export const getInvoice =
    async (orderId) => {

        const response =
            await axios.get(

                `${API}/orders/${orderId}`
            );

        return response.data;
    };