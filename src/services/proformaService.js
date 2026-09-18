import apiclient from "./apiclient";

export const getProformas = async (storeId) =>
  (await apiclient.get("/proforma-invoices", { params: storeId ? { storeId } : {} })).data;
export const getProforma = async (id) => (await apiclient.get(`/proforma-invoices/${id}`)).data;
export const saveProforma = async (payload) => (await apiclient.post("/proforma-invoices", payload)).data;
export const updateProforma = async (id, payload) => (await apiclient.put(`/proforma-invoices/${id}`, payload)).data;
export const cancelProforma = async (id) => (await apiclient.post(`/proforma-invoices/${id}/cancel`)).data;
export const previewProformaConversion = async (id) => (await apiclient.get(`/proforma-invoices/${id}/conversion-preview`)).data;
export const convertProforma = async (id, payload) => (await apiclient.post(`/proforma-invoices/${id}/convert`, payload)).data;

export const toProformaSaleSource = (record) => ({
  ...record,
  customer: {
    id: record.customerId, customerName: record.customerName,
    mobileNumber: record.customerMobile, email: record.customerEmail,
    gstin: record.customerGstin, gstRegistrationType: record.customerGstRegistrationType,
    state: record.customerState, billingAddress: record.billingAddress,
    shippingAddress: record.shippingAddress,
  },
  items: (record.items || []).map((item) => ({
    ...item, quantity: Number(item.quantity), sellingPrice: item.unitPrice, batchId: null,
  })),
  sourceProformaId: record.id,
});

export const getLeadWorkflow = async id => (await apiclient.get(`/proforma-invoices/${id}/lead-workflow`)).data;
export const recordLeadDecision = async (id, payload) => (await apiclient.post(`/proforma-invoices/${id}/customer-decision`, payload)).data;
export const prepareLeadSale = async (id, payload) => (await apiclient.post(`/proforma-invoices/${id}/fulfillments`, payload)).data;
export const approveLeadSale = async (id, fid) => (await apiclient.post(`/proforma-invoices/${id}/fulfillments/${fid}/approve`, {customerApproved:true})).data;
export const convertLeadSale = async (id, fid) => (await apiclient.post(`/proforma-invoices/${id}/fulfillments/${fid}/convert`)).data;
