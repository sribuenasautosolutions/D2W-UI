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
