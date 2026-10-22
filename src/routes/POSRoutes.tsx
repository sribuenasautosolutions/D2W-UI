import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

const POSPage = lazy(() => import("../features/operations/sales/pos/POSPage"));
const CheckoutPage = lazy(
  () => import("../features/operations/sales/pos/CheckoutPage"),
);
const InvoicePage = lazy(
  () => import("../features/operations/sales/pos/InvoicePage"),
);
const ProductDetailsPage = lazy(
  () => import("../features/operations/sales/pos/ProductDetailsPage"),
);
function POSRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<POSPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/invoice/:orderId" element={<InvoicePage />} />
        <Route path="/product/:id" element={<ProductDetailsPage />} />
      </Routes>
    </Suspense>
  );
}

export default POSRoutes;
