import apiclient from "./apiclient";

export const getProformas = async (storeId) =>
  (await apiclient.get("/proforma-invoices", { params: storeId ? { storeId } : {} })).data;
export const getProforma = async (id) => (await apiclient.get(`/proforma-invoices/${id}`)).data;
export const saveProforma = async (payload) => (await apiclient.post("/proforma-invoices", payload)).data;
export const updateProforma = async (id, payload) => (await apiclient.put(`/proforma-invoices/${id}`, payload)).data;
export const calculateProformaPreview = async (payload) => (await apiclient.post("/proforma-invoices/calculation-preview", payload)).data;
export const cancelProforma = async (id) => (await apiclient.post(`/proforma-invoices/${id}/cancel`)).data;
export const previewProformaConversion = async (id) => (await apiclient.get(`/proforma-invoices/${id}/conversion-preview`)).data;
export const convertProforma = async (id, payload) => (await apiclient.post(`/proforma-invoices/${id}/convert`, payload)).data;
export const downloadProformaTemplate = async () =>
  (await apiclient.get("/proforma-invoices/import-template", { responseType: "blob" })).data;
export const previewProformaUpload = async (file, storeId) => {
  const form = new FormData();
  form.append("file", file);
  return (await apiclient.post(`/proforma-invoices/import-preview?storeId=${storeId}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })).data;
};

export const toProformaSaleSource = (record, previewMap = null) => ({
  ...record,
  customer: {
    id: record.customerId,
    customerName: record.customerName,
    legalName: record.customerLegalName,
    customerLegalName: record.customerLegalName,
    mobileNumber: record.customerMobile,
    email: record.customerEmail,
    gstin: record.customerGstin,
    gstRegistrationType: record.customerGstRegistrationType,
    state: record.customerState,
    billingAddress: record.billingAddress,
    shippingAddress: record.shippingAddress,
  },
  items: (record.items || []).map((item) => {
    const previewItem = previewMap?.get?.(item.id) || previewMap?.[item.id];
    return {
      ...item,
      proformaItemId: item.id,
      inventoryId: previewItem?.inventoryId || item.inventoryId || null,
      availableQuantity: previewItem?.availableQuantity ?? null,
      stockAvailable: previewItem?.stockAvailable ?? true,
      quantity: Number(item.quantity),
      sellingPrice: item.unitPrice,
      batchId: null,
    };
  }),
  sourceProformaId: record.id,
});

export const getLeadWorkflow = async id => (await apiclient.get(`/proforma-invoices/${id}/lead-workflow`)).data;
export const recordLeadDecision = async (id, payload) => (await apiclient.post(`/proforma-invoices/${id}/customer-decision`, payload)).data;
export const prepareLeadSale = async (id, payload) => (await apiclient.post(`/proforma-invoices/${id}/fulfillments`, payload)).data;
export const approveLeadSale = async (id, fid) => (await apiclient.post(`/proforma-invoices/${id}/fulfillments/${fid}/approve`, {customerApproved:true})).data;
export const convertLeadSale = async (id, fid) => (await apiclient.post(`/proforma-invoices/${id}/fulfillments/${fid}/convert`)).data;
