import api from "./api";

export const getProductsByVariant =
    async (variantId) => {

        const response =
            await api.get(
                `/fitment/products?variantId=${variantId}`
            );

        return response.data;
    };