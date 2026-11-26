import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Normalize role name - handles variations like "SUPER_ADMIN", "Super Administrator", "SUPER ADMINISTRATOR"
function normalizeRoleName(role) {
    if (!role) return "";
    const normalized = role.toUpperCase().trim();
    // Map various name formats to standard form
    if (normalized === "SUPER_ADMIN" || normalized === "SUPER ADMINISTRATOR") {
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

    const { user, hasPermission, hasAnyPermission } = useAuth();

    // Not logged in
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const role = normalizeRoleName(user.role);

    const hasRoleRestriction = Array.isArray(allowedRoles) && allowedRoles.length > 0;
    const hasPermissionRestriction =
        Array.isArray(requiredPermissions) && requiredPermissions.length > 0;

    // If a route has no permission restriction, deny USER or empty role
    if ((role === "USER" || !role) && !hasPermissionRestriction) {
        return <Navigate to="/unauthorized" replace />;
    }

    const normalizedAllowedRoles = hasRoleRestriction
        ? allowedRoles.map((r) => normalizeRoleName(r))
        : [];

    const roleAllowed = hasRoleRestriction && normalizedAllowedRoles.includes(role);

    // Enforce role restriction when specified
    if (hasRoleRestriction && !roleAllowed) {
        return <Navigate to="/unauthorized" replace />;
    }

    // SUPER_ADMIN (or system-level STORES.UPDATE authority) has access to all permitted role routes
    const isSuperAdmin = role === "SUPER_ADMIN" || hasPermission("STORES.UPDATE");
    const permissionAllowed =
        hasPermissionRestriction && hasAnyPermission(requiredPermissions);

    if (hasPermissionRestriction && !isSuperAdmin && !permissionAllowed) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}

export default ProtectedRoute;
