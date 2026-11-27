import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { resolveLandingRoute } from "./routeResolver";

function AccessDeniedRedirect({ to, message }) {
    useEffect(() => {
        toast.error(message, { id: "access-denied" });
    }, [message]);

    return <Navigate to={to} replace />;
}

function ProtectedRoute({ children, requiredPermissions }) {
    const location = useLocation();
    const {
        user,
        permissions,
        permissionsLoading,
        hasAnyPermission,
        hasGlobalStoreManagementAuthority,
    } = useAuth();

    // Not logged in
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Wait for initial permission fetch before denying access
    if (permissionsLoading && (!Array.isArray(permissions) || permissions.length === 0)) {
        return <div role="status">Loading permissions…</div>;
    }

    // Deny users who have no active permissions assigned in the database
    if (!Array.isArray(permissions) || permissions.length === 0) {
        return (
            <AccessDeniedRedirect
                to="/unauthorized"
                message="You don't have access to this page."
            />
        );
    }

    const hasPermissionRestriction =
        Array.isArray(requiredPermissions) && requiredPermissions.length > 0;

    // Database-driven RBAC: global platform authority (STORES.UPDATE) or matching DB permission
    const hasGlobalAccess = hasGlobalStoreManagementAuthority();
    const permissionAllowed =
        hasPermissionRestriction && hasAnyPermission(requiredPermissions);

    if (hasPermissionRestriction && !hasGlobalAccess && !permissionAllowed) {
        const fallbackRoute = resolveLandingRoute(permissions, user);
        const redirectTarget =
            fallbackRoute !== location.pathname ? fallbackRoute : "/unauthorized";

        return (
            <AccessDeniedRedirect
                to={redirectTarget}
                message="You don't have access to this page."
            />
        );
    }

    return children;
}

export default ProtectedRoute;
