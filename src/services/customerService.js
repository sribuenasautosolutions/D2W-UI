import api from "./api";

/* =========================
   CUSTOMER MANAGEMENT
========================= */

export const getCustomerByMobile = async (mobile) => {
    const response = await api.get(
        `/customers/mobile/${mobile}`
    );

    return response.data;
};

export const saveCustomer = async (customer) => {
    const response = await api.post(
        `/customers`,
        customer
    );

    return response.data;
};

/* =========================
   CUSTOMER REPORTS
========================= */

export const getCustomerReport = async () => {
    const response = await api.get(
        `/reports/customers`
    );

    return response.data;
};

export const getCustomerList = async () => {
    const response = await api.get(
        `/reports/customers/list`
    );

    return response.data;
};

export const getCustomerDetails = async (customerId) => {
    const response = await api.get(
        `/reports/customers/${customerId}`
    );

    return response.data;
};

export const getCustomerOrders = async (customerId) => {
    const response = await api.get(
        `/reports/customers/${customerId}/orders`
    );

    return response.data;
};

export const searchCustomersByStore = async (storeId, search = "") => {
    const response = await api.get("/customers/search", {
        params: { storeId, search },
    });
    return response.data;
};

export const updateCustomer = async (customerId, customer) => {
    const response = await api.put(`/customers/${customerId}`, customer);
    return response.data;
};
