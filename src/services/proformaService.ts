import apiclient from "./apiclient";
import { ProformaInvoice } from "../types/sales";

export const getProformas = async (
  storeId?: number | string,
): Promise<ProformaInvoice[]> =>
  (
    await apiclient.get("/proforma-invoices", {
      params: storeId ? { storeId } : {},
    })
  ).data;

export const getProforma = async (
  id: number | string,
): Promise<ProformaInvoice> =>
  (await apiclient.get(`/proforma-invoices/${id}`)).data;

export const saveProforma = async (payload: any): Promise<any> =>
  (await apiclient.post("/proforma-invoices", payload)).data;

export const updateProforma = async (
  id: number | string,
  payload: any,
): Promise<any> =>
  (await apiclient.put(`/proforma-invoices/${id}`, payload)).data;

export const cancelProforma = async (id: number | string): Promise<any> =>
  (await apiclient.post(`/proforma-invoices/${id}/cancel`)).data;

export const previewProformaConversion = async (
  id: number | string,
): Promise<any> =>
  (await apiclient.get(`/proforma-invoices/${id}/conversion-preview`)).data;

export const convertProforma = async (
  id: number | string,
  payload: any,
): Promise<any> =>
  (await apiclient.post(`/proforma-invoices/${id}/convert`, payload)).data;

export const toProformaSaleSource = (record: any): any => ({
  ...record,
  customer: {
    id: record.customerId,
    customerName: record.customerName,
    mobileNumber: record.customerMobile,
    email: record.customerEmail,
    gstin: record.customerGstin,
    gstRegistrationType: record.customerGstRegistrationType,
    state: record.customerState,
    billingAddress: record.billingAddress,
    shippingAddress: record.shippingAddress,
  },
  items: (record.items || []).map((item: any) => ({
    ...item,
    quantity: Number(item.quantity),
    sellingPrice: item.unitPrice,
    batchId: null,
  })),
  sourceProformaId: record.id,
});

export const getLeadWorkflow = async (id: number | string): Promise<any> =>
  (await apiclient.get(`/proforma-invoices/${id}/lead-workflow`)).data;

export const recordLeadDecision = async (
  id: number | string,
  payload: any,
): Promise<any> =>
  (await apiclient.post(`/proforma-invoices/${id}/customer-decision`, payload))
    .data;

export const prepareLeadSale = async (
  id: number | string,
  payload: any,
): Promise<any> =>
  (await apiclient.post(`/proforma-invoices/${id}/fulfillments`, payload)).data;

export const approveLeadSale = async (
  id: number | string,
  fid: number | string,
): Promise<any> =>
  (
    await apiclient.post(
      `/proforma-invoices/${id}/fulfillments/${fid}/approve`,
      { customerApproved: true },
    )
  ).data;

export const convertLeadSale = async (
  id: number | string,
  fid: number | string,
): Promise<any> =>
  (await apiclient.post(`/proforma-invoices/${id}/fulfillments/${fid}/convert`))
    .data;
