import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function PublicRoute({ children }) {

    const { user } = useAuth();

    if (user) {
        const role = (user.role || "").toUpperCase();

        if (role === "SUPER_ADMIN" || role === "SUPER ADMINISTRATOR") {
            return <Navigate to="/owner/dashboard" replace />;
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

        return <Navigate to="/owner/dashboard" replace />;
    }

    return children;
}

export default PublicRoute;
