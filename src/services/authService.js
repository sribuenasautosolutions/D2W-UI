import api from "./api";

const API =
    "http://localhost:8080";

export const loginUser =
    async (loginData) => {

        const response = await api.post(
    "/users/login",
    loginData
);

        return response.data;
    };