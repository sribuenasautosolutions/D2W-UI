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

// Lead board: return linked WhatsApp conversations and unread counts in one request.
export const getLeadChatLinks = async (leadIds) => {
    if (!leadIds || leadIds.length === 0) return [];
    const response = await api.get(`${BASE}/leads/links`, { params: { leadIds: leadIds.join(",") } });
    return response.data;
};

// Lead workspace: null means the customer has no WhatsApp conversation.
export const getConversationForLead = async (leadId) => {
    const response = await api.get(`${BASE}/leads/${leadId}/conversation`);
    return response.status === 204 || !response.data ? null : response.data;
};
