import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
const POSPage = lazy(() => import("../pages/POSPage"));
const CheckoutPage = lazy(() => import("../pages/CheckoutPage"));
const InvoicePage = lazy(() => import("../pages/InvoicePage"));
const ProductDetailsPage = lazy(() => import("../pages/ProductDetailsPage"));

function POSRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={<POSPage />}
      />
      <Route
        path="/checkout"
        element={<CheckoutPage />}
      />
      <Route path="/invoice/:orderId" element={<InvoicePage />} />
      <Route path="/product/:id" element={<ProductDetailsPage />} />
    

    </Routes>
  );
}

export default POSRoutes;
