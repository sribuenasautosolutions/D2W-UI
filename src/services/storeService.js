import api from "./api";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const getAllStores = async () => {
    const response = await api.get(
        `/stores`
    );

    return response.data;
};