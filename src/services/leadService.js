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

export const updateLead = async (leadId, leadData) => {
    const response = await api.put(
        `/api/leads/${leadId}`,
        leadData
    );

    return response.data;
};


/* Active Procurement uses LeadItem IDs. Legacy row IDs remain separate below. */
export const addProcurementItem = async (leadId, partNumber) =>
    (await api.post(`/api/leads/${leadId}/items`, { partNumber })).data;
export const lookupLeadItemProduct = async (leadId, itemId, partNumber) =>
    (await api.get(`/api/leads/${leadId}/items/${itemId}/product-lookup`, { params: { partNumber } })).data;
export const saveLeadItemProcurement = async (leadId, itemId, payload) =>
    (await api.put(`/api/leads/${leadId}/items/${itemId}/procurement`, payload)).data;

/* Legacy compatibility APIs: rowId always identifies a LeadProcurementRow. */
export const lookupProcurementProduct = async (leadId, partNumber) =>
    (await api.get(`/api/leads/${leadId}/procurement/product-lookup`, { params: { partNumber } })).data;
export const bulkLookupProcurementProducts = async (leadId, partNumbers) =>
    (await api.post(`/api/leads/${leadId}/procurement/bulk-lookup`, { partNumbers })).data;
export const getProcurementRows = async leadId => (await api.get(`/api/leads/${leadId}/procurement/rows`)).data;
export const saveProcurementRow = async (leadId, payload, rowId = null) => {
    const url = `/api/leads/${leadId}/procurement/rows`;
    return rowId == null ? (await api.post(url, payload)).data : (await api.put(`${url}/${rowId}`, payload)).data;
};
export const deleteProcurementRow = async (leadId, rowId) => api.delete(`/api/leads/${leadId}/procurement/rows/${rowId}`);

/*
 * Complete procurement for the complete lead.
 */
export const completeLeadProcurement = async (leadId) => {
    const response = await api.put(
        `/api/leads/${leadId}/complete-procurement`
    );

    return response.data;
};


/* ============================================================
   PROCUREMENT TABLE
   ============================================================ */

export const saveLeadProcurementTable = async (
    leadId,
    // Legacy compatibility only. LeadOfferDTO.ProcurementTable: { rows: [{ itemId, procurement }] }
    payload
) => {
    const response = await api.put(
        `/api/leads/${leadId}/procurement`,
        payload
    );

    return response.data;
};


/* ============================================================
   PROFORMA
   ============================================================ */

export const createLeadProforma = async (
    leadId,
    payload
) => {
    const response = await api.post(
        `/api/leads/${leadId}/proforma`,
        payload
    );

    return response.data;
};

export const getLeadProforma = async (leadId) => {
    const response = await api.get(
        `/api/leads/${leadId}/proforma`
    );

    return response.data;
};


/* ============================================================
   REOPEN PROCUREMENT
   ============================================================ */

export const reopenLeadProcurement = async (leadId) => {
    const response = await api.post(
        `/api/leads/${leadId}/reopen-procurement`
    );

    return response.data;
};


/* ============================================================
   MARK LEAD LOST
   ============================================================ */

export const markLeadLost = async (
    leadId,
    reason
) => {
    const response = await api.post(
        `/api/leads/${leadId}/lost`,
        {
            reason,
        }
    );

    return response.data;
};


// Preserve the existing compatibility export and expose the backend method name.
export const saveProcurementTable = saveLeadProcurementTable;
