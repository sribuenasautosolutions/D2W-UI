import api from "./api";

export async function getSalespersons(storeId) {
    const response = await api.get("/salespersons", { params: { storeId } });
    return Array.isArray(response.data) ? response.data : [];
}

export async function createSalesperson(salesperson) {
    const response = await api.post("/salespersons", salesperson);
    return response.data;
}
