import { Navigate } from "react-router-dom";

function PublicRoute({ children }) {

    const user = JSON.parse(localStorage.getItem("user"));

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
    }

    return children;
}

export default PublicRoute;
