import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function ProtectedRoute({ children, allowedRoles, requiredPermissions }) {

    const { user, hasAnyPermission } = useAuth();

    // Not logged in
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const role = (user.role || "").toUpperCase();

    // Super Admin has global platform administrative access across all protected routes
    if (role === "SUPER_ADMIN") {
        return children;
    }

    const hasRoleRestriction = Array.isArray(allowedRoles) && allowedRoles.length > 0;
    const hasPermissionRestriction =
        Array.isArray(requiredPermissions) && requiredPermissions.length > 0;

    const normalizedAllowedRoles = hasRoleRestriction
        ? allowedRoles.map((r) => String(r).toUpperCase())
        : [];

    const roleAllowed = hasRoleRestriction && normalizedAllowedRoles.includes(role);
    const permissionAllowed =
        hasPermissionRestriction && hasAnyPermission(requiredPermissions);

    // Configurable RBAC: Permission restriction is primary and mandatory.
    // If permission restriction is present, the user must hold at least one required permission.
    if (hasPermissionRestriction) {
        if (!permissionAllowed) {
            return <Navigate to="/unauthorized" replace />;
        }
    } else if (hasRoleRestriction) {
        if (!roleAllowed) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return children;
}

export default ProtectedRoute;
