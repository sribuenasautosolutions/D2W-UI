import api from "./api";

// Store Owner: the backend always uses their own store (storeId is ignored).
// Super Admin: storeId is required.
const withStore = (storeId) => (storeId ? { params: { storeId } } : undefined);

export const getWhatsappStatus = async (storeId = null) => {
    const response = await api.get("/api/whatsapp/status", withStore(storeId));
    return response.data;
};

export const connectWhatsapp = async (storeId = null) => {
    const response = await api.post("/api/whatsapp/connect", null, withStore(storeId));
    return response.data;
};

export const disconnectWhatsapp = async (storeId = null) => {
    const response = await api.post("/api/whatsapp/disconnect", null, withStore(storeId));
    return response.data;
};

// Super Admin only: connection state of every store.
export const getWhatsappStores = async () => {
    const response = await api.get("/api/whatsapp/stores");
    return response.data;
};
