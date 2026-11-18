import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function PublicRoute({ children }) {

    const { user } = useAuth();

    if (user) {
        const role = (user.role || "").toUpperCase();

        if (role === "SUPER_ADMIN") {
            return <Navigate to="/owner/dashboard" replace />;
        }

        if (role === "STORE_OWNER") {
            return <Navigate to="/store/dashboard" replace />;
        }

        if (role === "CASHIER") {
            return <Navigate to="/pos" replace />;
        }

        if (role === "SALESPERSON" || role === "PROCUREMENT") {
            return <Navigate to="/store/dashboard" replace />;
        }

        return <Navigate to="/store/dashboard" replace />;
    }

    return children;
}

export default PublicRoute;
