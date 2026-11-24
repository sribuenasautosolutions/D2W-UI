import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
        const storedStoreId = localStorage.getItem("activeStoreId");
        if (storedStoreId) return Number(storedStoreId);
        const initialUser = readStoredUser();
        return initialUser?.storeId ?? null;
    });
    const [permissions, setPermissions] = useState(() =>
        normalizePermissions(readStoredUser()?.permissions)
    );

    const logoutSession = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("activeStoreId");
        setUser(null);
        setPermissions([]);
        setActiveStoreId(null);
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
    }, []);

    const refreshPermissions = useCallback(async (storeIdOverride) => {
        if (!localStorage.getItem("user")) {
            setPermissions([]);
            return [];
        }

        const targetStoreId = storeIdOverride !== undefined ? storeIdOverride : activeStoreId;
        try {
            const response = await api.get("/users/me/permissions", {
                params: targetStoreId != null ? { storeId: targetStoreId } : {},
            });
            const nextPermissions = normalizePermissions(response.data);
            setPermissions(nextPermissions);
            writeStoredPermissions(nextPermissions);
            return nextPermissions;
        } catch (error) {
            setPermissions([]);
            writeStoredPermissions([]);
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
        setPermissions([]);
        writeStoredPermissions([]);
        setActiveStoreId(nextStoreId);

        if (nextStoreId != null) {
            localStorage.setItem("activeStoreId", String(nextStoreId));
        } else {
            localStorage.removeItem("activeStoreId");
        }

        return refreshPermissions(nextStoreId);
    }, [refreshPermissions]);

    const roleUpper = normalizeRoleName(user?.role);
    const isSuperAdmin = roleUpper === "SUPER_ADMIN";

    const hasPermission = useCallback(
        (code) => Boolean(code) && (isSuperAdmin || permissions.includes(code)),
        [isSuperAdmin, permissions]
    );

    const hasAnyPermission = useCallback(
        (codes) => Array.isArray(codes) && (isSuperAdmin || codes.some((code) => permissions.includes(code))),
        [isSuperAdmin, permissions]
    );

    const hasGlobalStoreManagementAuthority = useCallback(() => {
        return Boolean(user && (isSuperAdmin || permissions.includes("STORES.UPDATE")));
    }, [user, isSuperAdmin, permissions]);

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
