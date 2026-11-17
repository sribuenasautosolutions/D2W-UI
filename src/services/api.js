import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const DEFAULT_TIMEOUT_MS = 30000;
const REFRESH_TIMEOUT_MS = 15000;
const MAX_GET_RETRIES = 2;
const LONG_TIMEOUT_MS = 180000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isTimeoutError = (error) =>
    error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT";
export const isNetworkError = (error) =>
    !error?.response && error?.code === "ERR_NETWORK";

const isRetryableGet = (error) =>
    (error?.config?.method || "get").toLowerCase() === "get" &&
    (error?.config?.timeout ?? 0) <= DEFAULT_TIMEOUT_MS &&
    (isNetworkError(error) ||
        [502, 503, 504].includes(error?.response?.status));

const isHeavyRequest = (config) =>
    (typeof FormData !== "undefined" && config.data instanceof FormData) ||
    config.responseType === "blob" ||
    /bulk-upload|import|preview|export|confirm|pdf|template/i.test(config.url || "");
const api = axios.create({
    baseURL: BASE_URL,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
        "Content-Type": "application/json"
    }
});
if (!BASE_URL && import.meta.env.PROD) {
    console.error(
        "VITE_API_BASE_URL is not set. API calls will hit the frontend host."
    );
}
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });

    failedQueue = [];
};

const logoutAndRedirect = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeStoreId");

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:logout"));
        if (window.location.pathname !== "/login") {
            window.location.href = "/login";
        }
    }
};

api.interceptors.request.use((config) => {
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        // Keep requests authenticated even when the access token was persisted
        // separately by the refresh flow or an older login session.
        const token = user?.token || localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error("Failed to read user session:", error);
    }
        if (isHeavyRequest(config) && config.timeout === DEFAULT_TIMEOUT_MS) {
        config.timeout = LONG_TIMEOUT_MS;
    }
    return config;
});

api.interceptors.response.use(
        (response) => {
        const type = response.headers?.["content-type"] || "";
        if (type.includes("text/html") && typeof response.data === "string") {
            return Promise.reject(
                new Error(
                    "API returned HTML instead of JSON. Check VITE_API_BASE_URL."
                )
            );
        }
        return response;
    },

    async (error) => {
        const originalRequest = error.config;
        const status = error?.response?.status;
                if (originalRequest && isRetryableGet(error)) {
            originalRequest._retryCount = originalRequest._retryCount || 0;

            if (originalRequest._retryCount < MAX_GET_RETRIES) {
                originalRequest._retryCount += 1;
                await sleep(500 * originalRequest._retryCount);
                return api(originalRequest);
            }
        }
        if (
            status !== 401 ||
            !originalRequest ||
            originalRequest.url?.includes("/users/login") ||
            originalRequest.url?.includes("/users/refresh") ||
            originalRequest._retry
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        let user;

        try {
            user = JSON.parse(localStorage.getItem("user"));
        } catch (parseError) {
            logoutAndRedirect();
            return Promise.reject(error);
        }

        const refreshToken = user?.refreshToken;

        if (!refreshToken) {
            logoutAndRedirect();
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({
                    resolve,
                    reject
                });
            }).then((newAccessToken) => {
                originalRequest.headers.Authorization =
                    `Bearer ${newAccessToken}`;

                return api(originalRequest);
            });
        }

        isRefreshing = true;

        try {
            const refreshResponse = await axios.post(
                `${BASE_URL}/users/refresh`,
                {
                    refreshToken
                },
                {
                    timeout: REFRESH_TIMEOUT_MS, 
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
const newAccessToken = refreshResponse?.data?.token;
const newRefreshToken = refreshResponse?.data?.refreshToken;

if (!newAccessToken) {
    throw new Error("Refresh response did not contain an access token");
}

if (!newRefreshToken) {
    throw new Error("Refresh response did not contain a refresh token");
}

const updatedUser = {
    ...user,
    token: newAccessToken,
    refreshToken: newRefreshToken
};

localStorage.setItem(
    "user",
    JSON.stringify(updatedUser)
);

localStorage.setItem(
    "token",
    newAccessToken
);

            processQueue(null, newAccessToken);

            originalRequest.headers.Authorization =
                `Bearer ${newAccessToken}`;

            return api(originalRequest);

                } catch (refreshError) {
            processQueue(refreshError);
            
            if (!isTimeoutError(refreshError) && !isNetworkError(refreshError)) {
                logoutAndRedirect();
            }
            return Promise.reject(refreshError);

        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
