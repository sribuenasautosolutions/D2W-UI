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
export const saveLeadProcurementTable = async (id, payload) => (await api.put(`/api/leads/${id}/procurement`, payload)).data;
export const createLeadProforma = async (id, payload) => (await api.post(`/api/leads/${id}/proforma`, payload)).data;
export const getLeadProforma = async id => (await api.get(`/api/leads/${id}/proforma`)).data;

export const reopenLeadProcurement = async id => api.post(`/api/leads/${id}/reopen-procurement`);
export const markLeadLost = async (id, reason) => (await api.post(`/api/leads/${id}/lost`, { reason })).data;
export const updateLead = async (leadId, leadData) => {
  const response = await api.put(`/api/leads/${leadId}`, leadData);
  return response.data;
};

export const getLeadBoard = async (params, signal) => (await api.get("/api/leads/board", { params, signal })).data;
export const getLeadBoardOptions = async signal => (await api.get("/api/leads/board/options", { signal })).data;
export const updateLeadBoard = async (id, payload) => (await api.patch(`/api/leads/board/${id}`, payload)).data;
