import { Routes, Route } from "react-router-dom";
import POSPage from "../pages/POSPage";
import CheckoutPage from "../pages/CheckoutPage";
import InvoicePage from "../pages/InvoicePage";
import ProductDetailsPage from "../pages/ProductDetailsPage";

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
