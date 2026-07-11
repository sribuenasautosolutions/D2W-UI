import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import OwnerRoutes from "../owner/routes/OwnerRoutes";
import StoreRoutes from "../store/routes/StoreRoutes";
import POSRoutes from "../pos/routes/POSRoutes";

function AppRoutesNew() {
  return (
    <Routes>

      <Route
        path="/"
        element={<Navigate to="/login" />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/owner/*"
        element={<OwnerRoutes />}
      />
      <Route
      path="/store/*"
      element={<StoreRoutes/>}
      />
      <Route
      path="/pos/*"
      element={<POSRoutes/>}
      />

    </Routes>
  );
}

export default AppRoutesNew;