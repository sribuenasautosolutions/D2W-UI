import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {

    const user = JSON.parse(localStorage.getItem("user"));

    // Not logged in
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Wrong role
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}

export default ProtectedRoute;