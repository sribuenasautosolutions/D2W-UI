import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Normalize role name - handles variations like "SUPER_ADMIN", "Super Administrator", "SUPER ADMINISTRATOR"
function normalizeRoleName(role) {
    if (!role) return "";
    const normalized = role.toUpperCase().trim();
    // Map various name formats to standard form
    if (normalized === "SUPER_ADMIN" || normalized === "SUPER ADMINISTRATOR" || normalized === "SUPER ADMINISTRATOR") {
        return "SUPER_ADMIN";
    }
    if (normalized === "STORE_OWNER" || normalized === "STORE MANAGER") {
        return "STORE_OWNER";
    }
    if (normalized === "CASHIER") {
        return "CASHIER";
    }
    if (normalized === "SALESPERSON" || normalized === "STORE SALESPERSON") {
        return "SALESPERSON";
    }
    if (normalized === "PROCUREMENT" || normalized === "PROCUREMENT SPECIALIST") {
        return "PROCUREMENT";
    }
    if (normalized === "USER") {
        return "USER";
    }
    return normalized;
}

function ProtectedRoute({ children, allowedRoles, requiredPermissions }) {

    const { user, hasAnyPermission } = useAuth();

    // Not logged in
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const role = normalizeRoleName(user.role);
    const isSuperAdmin = role === "SUPER_ADMIN";

    // Super Admin has global platform administrative access across all protected routes
    if (isSuperAdmin) {
        return children;
    }

    // USER role (or no role) has minimal access - deny all restricted routes
    if (role === "USER" || !role) {
        return <Navigate to="/unauthorized" replace />;
    }

    const hasRoleRestriction = Array.isArray(allowedRoles) && allowedRoles.length > 0;
    const hasPermissionRestriction =
        Array.isArray(requiredPermissions) && requiredPermissions.length > 0;

    const normalizedAllowedRoles = hasRoleRestriction
        ? allowedRoles.map((r) => normalizeRoleName(r))
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
