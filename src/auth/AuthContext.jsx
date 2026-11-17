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
    if (!Array.isArray(list)) return [];
    return [...new Set(list.filter((p) => typeof p === "string" && p.trim()))];
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

    const hasPermission = useCallback(
        (code) => Boolean(code) && (user?.role === "SUPER_ADMIN" || permissions.includes(code)),
        [user, permissions]
    );

    const hasAnyPermission = useCallback(
        (codes) => Array.isArray(codes) && (user?.role === "SUPER_ADMIN" || codes.some((code) => permissions.includes(code))),
        [user, permissions]
    );

    const hasGlobalStoreManagementAuthority = useCallback(() => {
        return Boolean(user && (user.role === "SUPER_ADMIN" || permissions.includes("STORES.UPDATE")));
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
