import api from "./api";

export const createLocalProduct = async (
  product: any,
  storeId?: number | string,
): Promise<any> => {
  const response = await api.post("/local-products", product, {
    params: { storeId },
  });
  return response.data;
};

export const getMyLocalProducts = async (
  storeId?: number | string,
): Promise<any> => {
  const response = await api.get("/local-products/my", { params: { storeId } });
  return response.data;
};

/* =========================
   PENDING APPROVALS
========================= */

export const getPendingApprovalRequests = async (): Promise<any> => {
  const response = await api.get("/local-products/pending");
  return response.data;
};

/* =========================
   APPROVAL REVIEW
========================= */

export const getApprovalReview = async (
  approvalRequestId: number | string,
): Promise<any> => {
  const response = await api.get(`/local-products/${approvalRequestId}`);

  return response.data;
};

/* =========================
   APPROVE AS NEW PRODUCT
========================= */

export const approveLocalProduct = async (
  approvalRequestId: number | string,
  productData: any,
): Promise<any> => {
  const response = await api.post(
    `/local-products/${approvalRequestId}/approve`,
    productData,
  );

  return response.data;
};

/* =========================
   MERGE PRODUCT
========================= */

export const mergeLocalProduct = async (
  approvalRequestId: number | string,
  mergeData: any,
): Promise<any> => {
  const response = await api.post(
    `/local-products/${approvalRequestId}/merge`,
    mergeData,
  );

  return response.data;
};

/* =========================
   REJECT PRODUCT
========================= */

export const rejectLocalProduct = async (
  approvalRequestId: number | string,
  rejectData: any,
): Promise<any> => {
  const response = await api.post(
    `/local-products/${approvalRequestId}/reject`,
    rejectData,
  );

  return response.data;
};
