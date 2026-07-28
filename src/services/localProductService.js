import api from "./api";

/* =========================
   PENDING APPROVALS
========================= */

export const getPendingApprovalRequests = async () => {
    const response = await api.get("/local-products/pending");
    return response.data;
};

/* =========================
   APPROVAL REVIEW
========================= */

export const getApprovalReview = async (approvalRequestId) => {
    const response = await api.get(
        `/local-products/${approvalRequestId}`
    );

    return response.data;
};

/* =========================
   APPROVE AS NEW PRODUCT
========================= */

export const approveLocalProduct = async (
    approvalRequestId,
    productData
) => {

    const response = await api.post(
        `/local-products/${approvalRequestId}/approve`,
        productData
    );

    return response.data;

};

/* =========================
   MERGE PRODUCT
========================= */

export const mergeLocalProduct = async (
    approvalRequestId,
    mergeData
) => {

    const response = await api.post(
        `/local-products/${approvalRequestId}/merge`,
        mergeData
    );

    return response.data;

};

/* =========================
   REJECT PRODUCT
========================= */

export const rejectLocalProduct = async (
    approvalRequestId,
    rejectData
) => {

    const response = await api.post(
        `/local-products/${approvalRequestId}/reject`,
        rejectData
    );

    return response.data;

};