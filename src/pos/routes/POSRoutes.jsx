import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "../../auth/ProtectedRoute";

const POSPage = lazy(() => import("../pages/POSPage"));
const CheckoutPage = lazy(() => import("../pages/CheckoutPage"));
const InvoicePage = lazy(() => import("../pages/InvoicePage"));
const ProductDetailsPage = lazy(
  () => import("../pages/ProductDetailsPage")
);

function POSRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute
              requiredPermissions={["SALES.CREATE", "SALES.VIEW"]}
            >
              <POSPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute
              requiredPermissions={["SALES.CREATE", "SALES.PAYMENT"]}
            >
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoice/:orderId"
          element={
            <ProtectedRoute
              requiredPermissions={["SALES.VIEW"]}
            >
              <InvoicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/product/:id"
          element={
            <ProtectedRoute
              requiredPermissions={["SALES.VIEW"]}
            >
              <ProductDetailsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default POSRoutes;
