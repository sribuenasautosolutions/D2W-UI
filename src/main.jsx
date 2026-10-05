import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";     

import App from "./App";
import { CartProvider } from "./pos/context/CartContext";

ReactDOM.createRoot(
    document.getElementById("root")
).render(
    <React.StrictMode>
        <CartProvider>
            <BrowserRouter>
                <App />

                {/* ← ADD THIS BLOCK (once, at the end) */}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3500,
                        style: {
                            fontFamily:
                                "Inter, ui-sans-serif, system-ui, sans-serif",
                            fontWeight: 700,
                            fontSize: "13px",
                            color: "#000",
                            borderRadius: "10px",
                            padding: "10px 14px",
                            boxShadow:
                                "0 8px 24px rgba(15, 23, 42, 0.12)",
                            maxWidth: "380px",
                        },
                        success: {
                            iconTheme: { primary: "#16a34a", secondary: "#fff" },
                            style: {
                                background: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                            },
                        },
                        error: {
                            iconTheme: { primary: "#dc2626", secondary: "#fff" },
                            style: {
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                            },
                        },
                    }}
                />
            </BrowserRouter>
        </CartProvider>
    </React.StrictMode>
);