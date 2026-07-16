import api from "./api";
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const loginUser =
    async (loginData) => {

        const response = await api.post(
    "/users/login",
    loginData
);

        return response.data;
    };