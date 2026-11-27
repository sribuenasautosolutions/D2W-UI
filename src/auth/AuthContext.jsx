import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

const AuthStateContext = createContext(null);
const AuthLoadingContext = createContext(false);
const AuthActionsContext = createContext(null);

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

function arePermissionsEqual(a, b) {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function readInitialAuthState() {
    const initialUser = readStoredUser();
    let initialStoreId = initialUser?.storeId ?? null;
    if (initialUser?.storeId != null) {
        const storedStoreId = localStorage.getItem("activeStoreId");
        if (storedStoreId) {
            initialStoreId = Number(storedStoreId);
        }
    }
    return {
        user: initialUser,
        activeStoreId: initialStoreId,
        permissions: normalizePermissions(initialUser?.permissions),
    };
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
    const [initialAuth] = useState(readInitialAuthState);
    const [user, setUser] = useState(initialAuth.user);
    const [activeStoreId, setActiveStoreId] = useState(initialAuth.activeStoreId);
    const [permissions, setPermissions] = useState(initialAuth.permissions);
    const [permissionsLoading, setPermissionsLoading] = useState(false);

    // Refs keep callbacks stable and prevent stale closures across async boundaries
    const refreshRequestId = useRef(0);
    const userRef = useRef(user);
    const activeStoreIdRef = useRef(activeStoreId);
    const permissionsRef = useRef(permissions);
    const seededUserIdRef = useRef(null);

    useEffect(() => {
        userRef.current = user;
        activeStoreIdRef.current = activeStoreId;
        permissionsRef.current = permissions;
    }, [user, activeStoreId, permissions]);

    const logoutSession = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("activeStoreId");
        refreshRequestId.current += 1;
        seededUserIdRef.current = null;
        userRef.current = null;
        activeStoreIdRef.current = null;
        permissionsRef.current = [];
        setUser(null);
        setPermissions([]);
        setPermissionsLoading(false);
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

        // Invalidate any in-flight permission fetch from a previous session
        refreshRequestId.current += 1;
        // Skip the automatic post-login fetch when login already returned valid permissions
        seededUserIdRef.current = nextPermissions.length > 0 ? nextUser?.userId ?? "__logged_in__" : null;

        userRef.current = nextUser;
        activeStoreIdRef.current = nextStoreId;
        permissionsRef.current = nextPermissions;

        setUser(nextUser);
        setPermissions(nextPermissions);
        setPermissionsLoading(false);
        setActiveStoreId(nextStoreId);
    }, []);

    const refreshPermissions = useCallback(async (storeIdOverride, options = {}) => {
        const currentUser = userRef.current ?? readStoredUser();
        if (!currentUser) {
            permissionsRef.current = [];
            setPermissions((prev) => (prev.length === 0 ? prev : []));
            return [];
        }

        const currentRequestId = ++refreshRequestId.current;
        const targetStoreId =
            storeIdOverride !== undefined ? storeIdOverride : activeStoreIdRef.current;
        const shouldShowLoading =
            Boolean(options.forceLoading) || permissionsRef.current.length === 0;

        if (shouldShowLoading) {
            setPermissionsLoading(true);
        }

        try {
            const response = await api.get("/users/me/permissions", {
                params: targetStoreId != null ? { storeId: targetStoreId } : {},
            });

            const latestStoreId = activeStoreIdRef.current ?? null;
            const requestedStoreId = targetStoreId ?? null;

            if (
                refreshRequestId.current === currentRequestId &&
                userRef.current?.userId === currentUser?.userId &&
                latestStoreId === requestedStoreId
            ) {
                const nextPermissions = normalizePermissions(response.data);
                if (!arePermissionsEqual(permissionsRef.current, nextPermissions)) {
                    permissionsRef.current = nextPermissions;
                    setPermissions(nextPermissions);
                    writeStoredPermissions(nextPermissions);
                }
                return nextPermissions;
            }
            return [];
        } catch (error) {
            if (refreshRequestId.current === currentRequestId) {
                if (options.forceLoading || !currentUser?.permissions?.length) {
                    permissionsRef.current = [];
                    setPermissions((prev) => (prev.length === 0 ? prev : []));
                    writeStoredPermissions([]);
                }
            }
            throw error;
        } finally {
            if (refreshRequestId.current === currentRequestId) {
                setPermissionsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (!user?.userId) return;
        if (seededUserIdRef.current === (user.userId ?? "__logged_in__")) {
            return;
        }
        refreshPermissions().catch(() => {});
    }, [user?.userId, refreshPermissions]);

    const switchActiveStore = useCallback(
        async (storeId) => {
            const nextStoreId =
                storeId != null && storeId !== "" ? Number(storeId) : null;
            const currentUser = userRef.current ?? readStoredUser();
            const currentPermissions = permissionsRef.current;
            const canSwitchAnyStore =
                currentPermissions.includes("STORES.UPDATE") ||
                currentPermissions.includes("STORES.VIEW");

            // Block store switching only for store-less users without platform store access
            if (currentUser?.storeId == null && !canSwitchAnyStore) {
                const storeChanged = activeStoreIdRef.current !== null;
                activeStoreIdRef.current = null;
                setActiveStoreId(null);
                localStorage.removeItem("activeStoreId");
                if (storeChanged) {
                    permissionsRef.current = [];
                    setPermissions([]);
                    writeStoredPermissions([]);
                }
                return refreshPermissions(null, { forceLoading: storeChanged });
            }

            const storeChanged = (activeStoreIdRef.current ?? null) !== (nextStoreId ?? null);
            activeStoreIdRef.current = nextStoreId;
            setActiveStoreId(nextStoreId);

            if (nextStoreId != null) {
                localStorage.setItem("activeStoreId", String(nextStoreId));
            } else {
                localStorage.removeItem("activeStoreId");
            }

            // Never authorize a newly selected store using the previous store's permissions
            if (storeChanged) {
                permissionsRef.current = [];
                setPermissions([]);
                setPermissionsLoading(true);
                writeStoredPermissions([]);
            }

            return refreshPermissions(nextStoreId, { forceLoading: storeChanged });
        },
        [refreshPermissions]
    );

    const actionsValue = useMemo(
        () => ({
            loginSession,
            logoutSession,
            refreshPermissions,
            switchActiveStore,
        }),
        [loginSession, logoutSession, refreshPermissions, switchActiveStore]
    );

    const stateValue = useMemo(
        () => ({
            user,
            permissions,
            activeStoreId,
            hasPermission: (code) => Boolean(code) && permissions.includes(code),
            hasAnyPermission: (codes) =>
                Array.isArray(codes) && codes.some((code) => permissions.includes(code)),
            hasGlobalStoreManagementAuthority: () =>
                Boolean(user && permissions.includes("STORES.UPDATE")),
        }),
        [user, permissions, activeStoreId]
    );

    return (
        <AuthActionsContext.Provider value={actionsValue}>
            <AuthStateContext.Provider value={stateValue}>
                <AuthLoadingContext.Provider value={permissionsLoading}>
                    {children}
                </AuthLoadingContext.Provider>
            </AuthStateContext.Provider>
        </AuthActionsContext.Provider>
    );
}

export function useAuthActions() {
    const context = useContext(AuthActionsContext);
    if (!context) {
        throw new Error("useAuthActions must be used within an AuthProvider");
    }
    return context;
}

export function useAuthState() {
    const context = useContext(AuthStateContext);
    if (!context) {
        throw new Error("useAuthState must be used within an AuthProvider");
    }
    return context;
}

export function useAuth() {
    const state = useAuthState();
    const permissionsLoading = useContext(AuthLoadingContext);
    const actions = useAuthActions();
    return useMemo(
        () => ({
            ...state,
            permissionsLoading,
            ...actions,
        }),
        [state, permissionsLoading, actions]
    );
}
