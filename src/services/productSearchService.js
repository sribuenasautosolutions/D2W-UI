import api from "./api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function searchProducts(text, storeId) {
    const response = await api.get(`${BASE_URL}/products/search`, {
        params: {
            text,
            storeId
        }
    });

    return response.data;
}