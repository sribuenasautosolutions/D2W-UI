import api from "./api";

export const createLead = async (lead) => {
    const response = await api.post("/api/leads", lead);
    return response.data;
};

export const getLeads = async (
    page = 0,
    size = 10,
    sortBy = "createdAt",
    direction = "DESC",
    storeId = null
) => {
    const response = await api.get("/api/leads", {
        params: {
            page,
            size,
            sortBy,
            direction,
            ...(storeId ? { storeId } : {}),
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


/* ============================================================
   ACTIVE PROCUREMENT - LEAD ITEM APIs
   ============================================================ */

export const addProcurementItem = async (
    leadId,
    partNumber
) =>
    (
        await api.post(
            `/api/leads/${leadId}/items`,
            { partNumber }
        )
    ).data;

export const deleteLeadProcurementItem = async (
    leadId,
    itemId
) =>
    (
        await api.delete(
            `/api/leads/${leadId}/items/${itemId}`
        )
    ).data;

export const lookupLeadItemProduct = async (
    leadId,
    itemId,
    partNumber
) =>
    (
        await api.get(
            `/api/leads/${leadId}/items/${itemId}/product-lookup`,
            {
                params: {
                    partNumber,
                },
            }
        )
    ).data;

export const saveLeadItemProcurement = async (
    leadId,
    itemId,
    payload
) =>
    (
        await api.put(
            `/api/leads/${leadId}/items/${itemId}/procurement`,
            payload
        )
    ).data;


/* ============================================================
   LEGACY PROCUREMENT ROW APIs
   ============================================================ */

export const lookupProcurementProduct = async (
    leadId,
    partNumber
) =>
    (
        await api.get(
            `/api/leads/${leadId}/procurement/product-lookup`,
            {
                params: {
                    partNumber,
                },
            }
        )
    ).data;

export const bulkLookupProcurementProducts = async (
    leadId,
    partNumbers
) =>
    (
        await api.post(
            `/api/leads/${leadId}/procurement/bulk-lookup`,
            {
                partNumbers,
            }
        )
    ).data;

export const getProcurementRows = async (
    leadId
) =>
    (
        await api.get(
            `/api/leads/${leadId}/procurement/rows`
        )
    ).data;

export const saveProcurementRow = async (
    leadId,
    payload,
    rowId = null
) => {

    const url =
        `/api/leads/${leadId}/procurement/rows`;

    if (rowId == null) {
        return (
            await api.post(
                url,
                payload
            )
        ).data;
    }

    return (
        await api.put(
            `${url}/${rowId}`,
            payload
        )
    ).data;
};

export const deleteProcurementRow = async (
    leadId,
    rowId
) =>
    api.delete(
        `/api/leads/${leadId}/procurement/rows/${rowId}`
    );


/* ============================================================
   COMPLETE PROCUREMENT
   ============================================================ */

export const completeLeadProcurement = async (
    leadId
) => {

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
    payload
) => {

    const response = await api.put(
        `/api/leads/${leadId}/procurement`,
        payload
    );

    return response.data;
};

export const saveProcurementTable =
    saveLeadProcurementTable;


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

export const getLeadProforma = async (
    leadId
) => {

    const response = await api.get(
        `/api/leads/${leadId}/proforma`
    );

    return response.data;
};


/* ============================================================
   REOPEN PROCUREMENT
   ============================================================ */

export const reopenLeadProcurement = async (
    leadId
) => {

    const response = await api.post(
        `/api/leads/${leadId}/reopen-procurement`
    );

    return response.data;
};


/* ============================================================
   LEGACY MARK LOST
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


/* ============================================================
   FOLLOW-UP ACTIVITIES
   ============================================================ */

export const createLeadFollowUpActivity = async (
    leadId,
    {
        customerResponseReason,
        nextFollowUpAt
    }
) => {

    const response = await api.post(
        `/api/leads/${leadId}/follow-ups`,
        {
            customerResponseReason,
            nextFollowUpAt
        }
    );

    return response.data;
};

export const getLeadFollowUpActivities = async (
    leadId
) => {

    const response = await api.get(
        `/api/leads/${leadId}/follow-ups`
    );

    return response.data;
};


/* ============================================================
   LEAD STATUS - WON / LOST
   ============================================================ */

export const updateLeadStatus = async (
    leadId,
    status,
    lostReason = null
) => {

    const response = await api.put(
        `/api/leads/${leadId}/status`,
        null,
        {
            params: {
                status,
                ...(lostReason
                    ? {
                        lostReason,
                    }
                    : {}),
            },
        }
    );

    return response.data;
};


/* ============================================================
   CUSTOMER CHANGES
   ============================================================ */

export const submitLeadCustomerChanges = async (
    leadId,
    payload
) =>
    (
        await api.post(
            `/api/leads/${leadId}/customer-changes`,
            payload
        )
    ).data;

export const identifyCustomerRequirement = async (
    leadId,
    changeId,
    payload
) =>
    (
        await api.put(
            `/api/leads/${leadId}/customer-changes/${changeId}/procurement`,
            payload
        )
    ).data;


/* ============================================================
   ESTIMATION
   ============================================================ */

export const previewLeadEstimation = async (
    leadId,
    payload
) =>
    (
        await api.post(
            `/api/leads/${leadId}/estimations/preview`,
            payload
        )
    ).data;

export const createLeadEstimation = async (
    leadId,
    payload
) =>
    (
        await api.post(
            `/api/leads/${leadId}/estimations`,
            payload
        )
    ).data;

export const downloadLeadEstimation = async (
    leadId,
    estimationId
) => {

    try {

        return (
            await api.get(
                `/api/leads/${leadId}/estimations/${estimationId}/pdf`,
                {
                    responseType: "blob",
                }
            )
        ).data;

    } catch (error) {

        if (
            error.response?.data instanceof Blob
        ) {

            try {

                error.response.data =
                    JSON.parse(
                        await error.response.data.text()
                    );

            } catch {
                // Keep original error.
            }

        }

        throw error;
    }
};
export const previewLeadEstimationPdf = async (leadId, payload) => {
    try { return (await api.post(`/api/leads/${leadId}/estimations/preview/pdf`, payload, { responseType: "blob" })).data; }
    catch (error) {
        if (error.response?.data instanceof Blob) {
            try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Keep original error. */ }
        }
        throw error;
    }
};

export const getLeadEstimations = async leadId => (await api.get(`/api/leads/${leadId}/estimations`)).data;
