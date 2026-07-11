import axios from "axios";

const API = "http://localhost:8080";

export const getAllStores = async () => {
    const response = await axios.get(
        `${API}/stores`
    );

    return response.data;
};