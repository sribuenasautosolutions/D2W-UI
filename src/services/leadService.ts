import api from "./api";
import { PaginatedResponse } from "../types/api";
import { Lead, LeadItem, LeadStatus } from "../types/leads";

export const createLead = async (lead: Partial<Lead>): Promise<Lead> => {
  const response = await api.post<Lead>("/api/leads", lead);
  return response.data;
};

export const getLeads = async (
  page = 0,
  size = 10,
  sortBy = "createdAt",
  direction = "DESC",
  storeId: number | string | null = null,
): Promise<PaginatedResponse<Lead>> => {
  const response = await api.get<PaginatedResponse<Lead>>("/api/leads", {
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

export const getLeadById = async (leadId: number | string): Promise<Lead> => {
  const response = await api.get<Lead>(`/api/leads/${leadId}`);
  return response.data;
};

export const updateLead = async (
  leadId: number | string,
  leadData: Partial<Lead>,
): Promise<Lead> => {
  const response = await api.put<Lead>(`/api/leads/${leadId}`, leadData);

  return response.data;
};

/* ============================================================
   ACTIVE PROCUREMENT - LEAD ITEM APIs
   ============================================================ */

export const addProcurementItem = async (
  leadId: number | string,
  partNumber: string,
): Promise<LeadItem> =>
  (await api.post<LeadItem>(`/api/leads/${leadId}/items`, { partNumber })).data;

export const deleteLeadProcurementItem = async (
  leadId: number | string,
  itemId: number | string,
): Promise<any> =>
  (await api.delete(`/api/leads/${leadId}/items/${itemId}`)).data;

export const lookupLeadItemProduct = async (
  leadId: number | string,
  itemId: number | string,
  partNumber: any,
): Promise<any> =>
  (
    await api.get(`/api/leads/${leadId}/items/${itemId}/product-lookup`, {
      params:
        typeof partNumber === "object"
          ? partNumber
          : {
              partNumber,
            },
    })
  ).data;

export const saveLeadItemProcurement = async (
  leadId: number | string,
  itemIdOrPayload: any,
  payload?: any,
): Promise<any> => {
  const itemId =
    payload !== undefined
      ? itemIdOrPayload
      : itemIdOrPayload?.id ||
        itemIdOrPayload?.itemId ||
        itemIdOrPayload?.leadItemId;
  const body = payload !== undefined ? payload : itemIdOrPayload;
  return (
    await api.put(`/api/leads/${leadId}/items/${itemId}/procurement`, body)
  ).data;
};

/* ============================================================
   LEGACY PROCUREMENT ROW APIs
   ============================================================ */

export const lookupProcurementProduct = async (
  leadId: number | string,
  partNumber: string,
): Promise<any> =>
  (
    await api.get(`/api/leads/${leadId}/procurement/product-lookup`, {
      params: {
        partNumber,
      },
    })
  ).data;

export const bulkLookupProcurementProducts = async (
  leadId: number | string,
  partNumbers: string[],
): Promise<any> =>
  (
    await api.post(`/api/leads/${leadId}/procurement/bulk-lookup`, {
      partNumbers,
    })
  ).data;

export const getProcurementRows = async (
  leadId: number | string,
): Promise<any[]> =>
  (await api.get(`/api/leads/${leadId}/procurement/rows`)).data;

export const saveProcurementRow = async (
  leadId: number | string,
  payload: any,
  rowId: number | string | null = null,
): Promise<any> => {
  const url = `/api/leads/${leadId}/procurement/rows`;

  if (rowId == null) {
    return (await api.post(url, payload)).data;
  }

  return (await api.put(`${url}/${rowId}`, payload)).data;
};

export const deleteProcurementRow = async (
  leadId: number | string,
  rowId: number | string,
): Promise<any> => api.delete(`/api/leads/${leadId}/procurement/rows/${rowId}`);

/* ============================================================
   COMPLETE PROCUREMENT
   ============================================================ */

export const completeLeadProcurement = async (
  leadId: number | string,
): Promise<any> => {
  const response = await api.put(`/api/leads/${leadId}/complete-procurement`);

  return response.data;
};

/* ============================================================
   PROCUREMENT TABLE
   ============================================================ */

export const saveLeadProcurementTable = async (
  leadId: number | string,
  payload: any,
): Promise<any> => {
  const response = await api.put(`/api/leads/${leadId}/procurement`, payload);

  return response.data;
};

export const saveProcurementTable = saveLeadProcurementTable;

/* ============================================================
   PROFORMA
   ============================================================ */

export const createLeadProforma = async (
  leadId: number | string,
  payload: any,
): Promise<any> => {
  const response = await api.post(`/api/leads/${leadId}/proforma`, payload);

  return response.data;
};

export const getLeadProforma = async (
  leadId: number | string,
): Promise<any> => {
  const response = await api.get(`/api/leads/${leadId}/proforma`);

  return response.data;
};

/* ============================================================
   REOPEN PROCUREMENT
   ============================================================ */

export const reopenLeadProcurement = async (
  leadId: number | string,
): Promise<any> => {
  const response = await api.post(`/api/leads/${leadId}/reopen-procurement`);

  return response.data;
};

/* ============================================================
   LEGACY MARK LOST
   ============================================================ */

export const markLeadLost = async (
  leadId: number | string,
  reason?: string,
): Promise<any> => {
  const response = await api.post(`/api/leads/${leadId}/lost`, {
    reason,
  });

  return response.data;
};

/* ============================================================
   FOLLOW-UP ACTIVITIES
   ============================================================ */

export interface FollowUpPayload {
  customerResponseReason?: string;
  nextFollowUpAt?: string;
  [key: string]: any;
}

export const createLeadFollowUpActivity = async (
  leadId: number | string,
  { customerResponseReason, nextFollowUpAt }: FollowUpPayload,
): Promise<any> => {
  const response = await api.post(`/api/leads/${leadId}/follow-ups`, {
    customerResponseReason,
    nextFollowUpAt,
  });

  return response.data;
};

export const getLeadFollowUpActivities = async (
  leadId: number | string,
): Promise<any[]> => {
  const response = await api.get(`/api/leads/${leadId}/follow-ups`);

  return response.data;
};

/* ============================================================
   LEAD STATUS - WON / LOST
   ============================================================ */

export const updateLeadStatus = async (
  leadId: number | string,
  status: LeadStatus,
  lostReason: string | null = null,
): Promise<any> => {
  const response = await api.put(`/api/leads/${leadId}/status`, null, {
    params: {
      status,
      ...(lostReason
        ? {
            lostReason,
          }
        : {}),
    },
  });

  return response.data;
};

/* ============================================================
   CUSTOMER CHANGES
   ============================================================ */

export const submitLeadCustomerChanges = async (
  leadId: number | string,
  payload: any,
): Promise<any> =>
  (await api.post(`/api/leads/${leadId}/customer-changes`, payload)).data;

export const identifyCustomerRequirement = async (
  leadId: number | string,
  changeId: number | string,
  payload: any,
): Promise<any> =>
  (
    await api.put(
      `/api/leads/${leadId}/customer-changes/${changeId}/procurement`,
      payload,
    )
  ).data;

/* ============================================================
   ESTIMATION
   ============================================================ */

export const previewLeadEstimation = async (
  leadId: number | string,
  payload: any,
): Promise<any> =>
  (await api.post(`/api/leads/${leadId}/estimations/preview`, payload)).data;

export const createLeadEstimation = async (
  leadId: number | string,
  payload: any,
): Promise<any> =>
  (await api.post(`/api/leads/${leadId}/estimations`, payload)).data;

export const downloadLeadEstimation = async (
  leadId: number | string,
  estimationId: number | string,
): Promise<Blob> => {
  try {
    return (
      await api.get(`/api/leads/${leadId}/estimations/${estimationId}/pdf`, {
        responseType: "blob",
      })
    ).data;
  } catch (error: any) {
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        // Keep original error.
      }
    }
    throw error;
  }
};

export const previewLeadEstimationPdf = async (
  leadId: number | string,
  payload: any,
): Promise<Blob> => {
  try {
    return (
      await api.post(`/api/leads/${leadId}/estimations/preview/pdf`, payload, {
        responseType: "blob",
      })
    ).data;
  } catch (error: any) {
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        // Keep original error.
      }
    }
    throw error;
  }
};

export const getLeadEstimations = async (
  leadId: number | string,
): Promise<any> => (await api.get(`/api/leads/${leadId}/estimations`)).data;
