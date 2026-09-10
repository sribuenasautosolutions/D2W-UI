import api from "./api";

export const createLead = async (lead) => {
    const response = await api.post("/api/leads", lead);
    return response.data;
};

export const getLeads = async (
    page = 0,
    size = 10,
    sortBy = "createdAt",
    direction = "DESC"
) => {
    const response = await api.get("/api/leads", {
        params: {
            page,
            size,
            sortBy,
            direction,
        },
    });

    return response.data;
};

export const getLeadById = async (leadId) => {
    const response = await api.get(`/api/leads/${leadId}`);
    return response.data;
};

export const identifyLeadItem = async (
    leadId,
    itemId,
    identification
) => {
    const response = await api.put(
        `/api/leads/${leadId}/items/${itemId}/identification`,
        identification
    );

    return response.data;
};

export const setLeadItemAvailability = async (
    leadId,
    itemId,
    availability
) => {
    const response = await api.put(
        `/api/leads/${leadId}/items/${itemId}/availability`,
        availability
    );

    return response.data;
};

export const lookupLeadItemProduct = async (
    leadId,
    itemId,
    partNumber
) => {
    const response = await api.get(
        `/api/leads/${leadId}/items/${itemId}/product-lookup`,
        {
            params: {
                partNumber,
            },
        }
    );

    return response.data;
};
export const saveLeadItemProcurement = async (
    leadId,
    itemId,
    procurement
) => {
    const response = await api.put(
        `/api/leads/${leadId}/items/${itemId}/procurement`,
        procurement
    );

    return response.data;
};
export const completeLeadProcurement = async (leadId) => {
    const response = await api.put(
        `/api/leads/${leadId}/complete-procurement`
    );

    return response.data;
};