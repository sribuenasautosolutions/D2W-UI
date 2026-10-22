import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { User } from "../types/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface QueuedPromise {
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: QueuedPromise[] = [];

const processQueue = (error: any, token: string | null = null) => {
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

  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const rawUser = localStorage.getItem("user");
    const user: User | null = rawUser ? JSON.parse(rawUser) : null;

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

  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
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

    let user: User | null = null;

    try {
      const rawUser = localStorage.getItem("user");
      user = rawUser ? JSON.parse(rawUser) : null;
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
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
        });
      }).then((newAccessToken) => {
        if (newAccessToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const refreshResponse = await axios.post<{
        token?: string;
        refreshToken?: string;
      }>(
        `${BASE_URL}/users/refresh`,
        {
          refreshToken,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const newAccessToken = refreshResponse?.data?.token;
      const newRefreshToken = refreshResponse?.data?.refreshToken;

      if (!newAccessToken) {
        throw new Error("Refresh response did not contain an access token");
      }

      if (!newRefreshToken) {
        throw new Error("Refresh response did not contain a refresh token");
      }

      const updatedUser: User = {
        ...user,
        token: newAccessToken,
        refreshToken: newRefreshToken,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));

      localStorage.setItem("token", newAccessToken);

      processQueue(null, newAccessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);

      logoutAndRedirect();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
