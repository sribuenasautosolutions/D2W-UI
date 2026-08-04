import api from "./api";

export const getAllStores = async () => {
    const response = await api.get(
        `/stores`
    );

    return response.data;
};
