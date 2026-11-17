import api from "./api";

export const getAllStores = async () => {
    const response = await api.get(
        `/stores`
    );

    return response.data;
};
/*
 * Shared, short-lived cache for the "active stores" list.
 */
const ACTIVE_STORES_TTL_MS = 60000;
let activeStoresCache = null; // { key, time, promise }

const currentSessionKey = () => {
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        return user?.token || localStorage.getItem("token") || "anonymous";
    } catch {
        return "anonymous";
    }
};

export const clearStoresCache = () => {
    activeStoresCache = null;
};

export const getActiveStoresCached = () => {
    const key = currentSessionKey();
    const now = Date.now();
    if (!activeStoresCache || activeStoresCache.key !== key || now - activeStoresCache.time > ACTIVE_STORES_TTL_MS) {
        const promise = api
            .get("/stores", { params: { page: 0, size: 100, active: true } })
            .catch((error) => {
                if (activeStoresCache && activeStoresCache.promise === promise) activeStoresCache = null;
                throw error;
            });
        activeStoresCache = { key, time: now, promise };
    }
    return activeStoresCache.promise.then((response) => ({
        ...response,
        data: JSON.parse(JSON.stringify(response.data)),
    }));
};