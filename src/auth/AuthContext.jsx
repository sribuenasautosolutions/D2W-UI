import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

function readStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
}

function normalizePermissions(list) {
    if (!list) return [];
    const items = Array.isArray(list)
        ? list
        : Array.isArray(list?.permissions)
        ? list.permissions
        : [];
    const normalized = items
        .map((p) => {
            if (typeof p === "string") return p.trim();
            if (p && typeof p === "object") {
                return (p.code || p.permissionCode || p.name || "").trim();
            }
            return "";
        })
        .filter(Boolean);
    return [...new Set(normalized)];
}

// Normalize role name - handles variations like "SUPER_ADMIN", "Super Administrator", "SUPER ADMINISTRATOR"
export function normalizeRoleName(role) {
    if (!role) return "";
    const normalized = role.toUpperCase().trim();
    if (normalized === "SUPER_ADMIN" || normalized === "SUPER ADMINISTRATOR") {
        return "SUPER_ADMIN";
    }
    if (normalized === "STORE_OWNER" || normalized === "STORE MANAGER") {
        return "STORE_OWNER";
    }
    if (normalized === "CASHIER") return "CASHIER";
    if (normalized === "SALESPERSON" || normalized === "STORE SALESPERSON") {
        return "SALESPERSON";
    }
    if (normalized === "PROCUREMENT" || normalized === "PROCUREMENT SPECIALIST") {
        return "PROCUREMENT";
    }
    if (normalized === "USER") return "USER";
    return normalized;
}

function writeStoredPermissions(nextPermissions) {
    const currentStored = readStoredUser();
    if (currentStored) {
        localStorage.setItem(
            "user",
            JSON.stringify({ ...currentStored, permissions: nextPermissions })
        );
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => readStoredUser());
    const [activeStoreId, setActiveStoreId] = useState(() => {
        const initialUser = readStoredUser();
        // Only use localStorage activeStoreId if user has an assigned store
        if (initialUser?.storeId != null) {
            const storedStoreId = localStorage.getItem("activeStoreId");
            if (storedStoreId) return Number(storedStoreId);
        }
        return initialUser?.storeId ?? null;
    });
    const [permissions, setPermissions] = useState(() =>
        normalizePermissions(readStoredUser()?.permissions)
    );
    // Use ref for request version to prevent stale async responses
    const refreshRequestId = useRef(0);

    const logoutSession = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("activeStoreId");
        setUser(null);
        setPermissions([]);
        setActiveStoreId(null);
        refreshRequestId.current += 1;
    }, []);

    useEffect(() => {
        const handleForcedLogout = () => {
            logoutSession();
        };
        window.addEventListener("auth:logout", handleForcedLogout);
        return () => window.removeEventListener("auth:logout", handleForcedLogout);
    }, [logoutSession]);

    const loginSession = useCallback((loginResponse) => {
        const nextPermissions = normalizePermissions(loginResponse?.permissions);
        const nextUser = {
            ...loginResponse,
            permissions: nextPermissions,
        };
        const nextStoreId = loginResponse?.storeId ?? null;

        localStorage.setItem("user", JSON.stringify(nextUser));
        if (loginResponse?.token) {
            localStorage.setItem("token", loginResponse.token);
        }
        if (nextStoreId != null) {
            localStorage.setItem("activeStoreId", String(nextStoreId));
        } else {
            localStorage.removeItem("activeStoreId");
        }

        setUser(nextUser);
        setPermissions(nextPermissions);
        setActiveStoreId(nextStoreId);
        // Increment request ID to invalidate any in-flight refresh requests from previous session
        refreshRequestId.current += 1;
    }, []);

    const refreshPermissions = useCallback(async (storeIdOverride) => {
        if (!localStorage.getItem("user")) {
            setPermissions([]);
            return [];
        }

        // Capture the current request ID and identity context
        const currentRequestId = refreshRequestId.current;
        const currentUser = readStoredUser();
        const currentStoreId = storeIdOverride !== undefined ? storeIdOverride : activeStoreId;

        const targetStoreId = currentStoreId;
        try {
            const response = await api.get("/users/me/permissions", {
                params: targetStoreId != null ? { storeId: targetStoreId } : {},
            });
            // Only update state if this request is still the current one
            // and user identity and store context still match
            if (
                refreshRequestId.current === currentRequestId &&
                readStoredUser()?.userId === currentUser?.userId &&
                (storeIdOverride !== undefined ? storeIdOverride : activeStoreId) === currentStoreId
            ) {
                const nextPermissions = normalizePermissions(response.data);
                setPermissions(nextPermissions);
                writeStoredPermissions(nextPermissions);
                return nextPermissions;
            }
            // Stale request - discard response
            return [];
        } catch (error) {
            // Only clear permissions if this request is still the current one
            // AND we don't have valid permissions from login
            if (refreshRequestId.current === currentRequestId) {
                const storedUser = readStoredUser();
                if (!storedUser?.permissions?.length) {
                    setPermissions([]);
                    writeStoredPermissions([]);
                }
            }
            throw error;
        }
    }, [activeStoreId]);

    useEffect(() => {
        if (user) {
            refreshPermissions().catch(() => {});
        }
    }, [user, refreshPermissions]);

    const switchActiveStore = useCallback(async (storeId) => {
        const nextStoreId = storeId != null && storeId !== "" ? Number(storeId) : null;
        const currentUser = readStoredUser();
        const canSwitchAnyStore = permissions.includes("STORES.UPDATE") || permissions.includes("STORES.VIEW");

        // Block store switching only for store-less users without platform store access
        if (currentUser?.storeId == null && !canSwitchAnyStore) {
            setActiveStoreId(null);
            localStorage.removeItem("activeStoreId");
            refreshRequestId.current += 1;
            return refreshPermissions(null);
        }

        setPermissions([]);
        writeStoredPermissions([]);
        setActiveStoreId(nextStoreId);

        if (nextStoreId != null) {
            localStorage.setItem("activeStoreId", String(nextStoreId));
        } else {
            localStorage.removeItem("activeStoreId");
        }

        refreshRequestId.current += 1;
        return refreshPermissions(nextStoreId);
    }, [permissions, refreshPermissions]);

    const hasPermission = useCallback(
        (code) => Boolean(code) && permissions.includes(code),
        [permissions]
    );

    const hasAnyPermission = useCallback(
        (codes) => Array.isArray(codes) && codes.some((code) => permissions.includes(code)),
        [permissions]
    );

    const hasGlobalStoreManagementAuthority = useCallback(() => {
        return Boolean(user && permissions.includes("STORES.UPDATE"));
    }, [user, permissions]);

    const value = useMemo(
        () => ({
            user,
            permissions,
            activeStoreId,
            hasPermission,
            hasAnyPermission,
            hasGlobalStoreManagementAuthority,
            loginSession,
            logoutSession,
            refreshPermissions,
            switchActiveStore,
        }),
        [
            user,
            permissions,
            activeStoreId,
            hasPermission,
            hasAnyPermission,
            hasGlobalStoreManagementAuthority,
            loginSession,
            logoutSession,
            refreshPermissions,
            switchActiveStore,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
