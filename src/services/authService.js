import axios from "axios";

const API =
    "http://localhost:8080";

export const loginUser =
    async (loginData) => {

        const response =
            await axios.post(
                `${API}/users/login`,
                loginData
            );

        return response.data;
    };