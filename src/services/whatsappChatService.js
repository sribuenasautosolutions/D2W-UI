import api from "./api";

const BASE = "/api/whatsapp/chats";

// Store Owner: the backend always uses their own store. Super Admin: storeId is required.
export const getConversations = async (storeId, { q = "", page = 0, size = 50 } = {}) => {
    const response = await api.get(`${BASE}/conversations`, {
        params: { storeId: storeId || undefined, q: q || undefined, page, size },
    });
    return response.data;
};

export const getMessages = async (conversationId, { afterId, beforeId, limit = 50 } = {}) => {
    const response = await api.get(`${BASE}/conversations/${conversationId}/messages`, {
        params: { afterId, beforeId, limit },
    });
    return response.data;
};

export const markConversationRead = async (conversationId) => {
    await api.post(`${BASE}/conversations/${conversationId}/read`);
};

export const sendWhatsappText = async (conversationId, text) => {
    const response = await api.post(`${BASE}/conversations/${conversationId}/messages`, { text });
    return response.data;
};

// Photos / voice notes / files need the login token, so they are loaded as a blob.
export const fetchWhatsappMedia = async (messageId) => {
    const response = await api.get(`${BASE}/messages/${messageId}/media`, { responseType: "blob" });
    return response.data;
};

// "Create Lead" inside a chat. The draft saves nothing; it only gives the form its starting values.
export const getLeadDraft = async (conversationId) => {
    const response = await api.get(`${BASE}/conversations/${conversationId}/lead-draft`);
    return response.data;
};

export const createLeadFromChat = async (conversationId, payload) => {
    const response = await api.post(`${BASE}/conversations/${conversationId}/lead`, payload);
    return response.data;
};
