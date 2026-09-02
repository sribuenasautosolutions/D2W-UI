import axios from "axios";

/**
 * Centralized Axios client for all authenticated backend calls.
 *
 * -------------------------------------------------------------------
 * Base URL
 * -------------------------------------------------------------------
 * Read from VITE_API_BASE_URL at build time (Vite exposes env vars via
 * import.meta.env). Falls back to the local Spring Boot default port
 * for local development — this matches the backend's
 * @CrossOrigin(origins = "http://localhost:5173") setting, i.e. a Vite
 * dev server on 5173 talking to Spring Boot on 8080.
 *
 * -------------------------------------------------------------------
 * Auth (JWT)
 * -------------------------------------------------------------------
 * Every request made through this client attaches
 *   Authorization: Bearer <token>
 * whenever a token is available. Token lookup checks, in order:
 *   1. localStorage "token"       — dedicated auth token key
 *   2. localStorage "user".token  — token embedded in the session user object
 *
 * If your login flow stores the JWT under a different key, update
 * getStoredToken() below — it is the single place that needs to change.
 *
 * This client must never be imported by the Login screen. Login calls
 * the authentication endpoint before any token exists, so it needs its
 * own unauthenticated request (plain axios.post, not this client).
 *
 * A 401 means the session is invalid or expired. A 403 is an access
 * restriction and must not log out an otherwise authenticated user.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function getStoredToken() {
  const directToken = localStorage.getItem("token");
  if (directToken) return directToken;

  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.token || null;
  } catch {
    return null;
  }
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
