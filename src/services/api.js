import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
});

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

    if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
    ) {
        window.location.href = "/login";
    }
};

api.interceptors.request.use((config) => {
    try {
        const user = JSON.parse(localStorage.getItem("user"));

        if (user?.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
        }
    } catch (error) {
        console.error("Failed to read user session:", error);
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;
        const status = error?.response?.status;

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
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            const newAccessToken = refreshResponse?.data?.token;

            if (!newAccessToken) {
                throw new Error("Refresh response did not contain an access token");
            }

            const updatedUser = {
                ...user,
                token: newAccessToken
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

            logoutAndRedirect();

            return Promise.reject(refreshError);

        } finally {
            isRefreshing = false;
        }
    }
);

export default api;