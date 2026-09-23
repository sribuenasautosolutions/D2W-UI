import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

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
        element={<POSPage />}
      />
      <Route
        path="/checkout"
        element={<CheckoutPage />}
      />
      <Route path="/invoice/:orderId" element={<InvoicePage />} />
      <Route path="/product/:id" element={<ProductDetailsPage />} />
    
    </Routes>
    </Suspense>

  
  );
}

export default POSRoutes;
