import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function resolveOwnerRoute(permissions = []) {
    if (permissions.includes("DASHBOARD.VIEW") || permissions.includes("STORES.UPDATE")) {
        return "/owner/dashboard";
    }
    if (permissions.some((p) => p.startsWith("STORES."))) {
        return "/owner/stores";
    }
    if (permissions.some((p) => p.startsWith("EMPLOYEES."))) {
        return "/owner/users";
    }
    if (permissions.some((p) => p.startsWith("ROLES.") || p.startsWith("PERMISSIONS."))) {
        return "/owner/roles";
    }
    return "/unauthorized";
}

function PublicRoute({ children }) {

    const { user, permissions } = useAuth();

    if (user) {
        const role = (user.role || "").toUpperCase();

        if (role === "SUPER_ADMIN" || role === "SUPER ADMINISTRATOR") {
            return <Navigate to={resolveOwnerRoute(permissions)} replace />;
        }

        if (role === "STORE_OWNER" || role === "STORE MANAGER") {
            return <Navigate to="/store/dashboard" replace />;
        }

        if (role === "CASHIER" || role === "STORE CASHIER") {
            return <Navigate to="/pos" replace />;
        }

        if (role === "SALESPERSON" || role === "STORE SALESPERSON" || role === "PROCUREMENT" || role === "PROCUREMENT SPECIALIST") {
            return <Navigate to="/store/dashboard" replace />;
        }

        return <Navigate to={resolveOwnerRoute(permissions)} replace />;
    }

    return children;
}

export default PublicRoute;
