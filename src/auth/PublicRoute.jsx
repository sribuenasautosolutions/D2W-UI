import { Navigate } from "react-router-dom";

function PublicRoute({ children }) {

    const user = JSON.parse(localStorage.getItem("user"));

    if (user) {

        if (user.role === "OWNER") {
            return <Navigate to="/owner/dashboard" replace />;
        }

        if (user.role === "MAINSTORE_MANAGER") {
            return <Navigate to="/store/dashboard" replace />;
        }

        if (user.role === "Admin") {
            return <Navigate to="/pos" replace />;
        }
    }

    return children;
}

export default PublicRoute;