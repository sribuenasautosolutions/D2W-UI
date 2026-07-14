import api from "./api";

const API = "http://localhost:8080";

export const getAllStores = async () => {
    const response = await api.get(
        `${API}/stores`
    );

    return response.data;
};