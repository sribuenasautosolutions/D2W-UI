import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function PublicRoute({ children }) {

    const { user } = useAuth();

    if (user) {

        if (user.role === "SUPER_ADMIN") {
            return <Navigate to="/owner/dashboard" replace />;
        }

        if (user.role === "STORE_OWNER") {
            return <Navigate to="/store/dashboard" replace />;
        }

        if (user.role === "CASHIER") {
            return <Navigate to="/pos" replace />;
        }

        if (user.role === "SALESPERSON" || user.role === "PROCUREMENT") {
            return <Navigate to="/store/dashboard" replace />;
        }

        return <Navigate to="/store/dashboard" replace />;
    }

    return children;
}

export default PublicRoute;
