import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { resolveLandingRoute } from "./routeResolver";

function PublicRoute({ children }) {
    const { user, permissions } = useAuth();

    if (user) {
        return <Navigate to={resolveLandingRoute(permissions, user)} replace />;
    }

    return children;
}

export default PublicRoute;
