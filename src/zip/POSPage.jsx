import { useState, useEffect } from "react";

import POSLayout from "../layouts/POSLayout";

import POSVehicleSelector from "../components/vehicle/POSVehicleSelector";

import ProductCard from "../components/product/ProductCard";

import {
    getProductsByVariant,
    searchProducts
} from "../services/productService";

import { useNavigate } from "react-router-dom";

import { useCart } from "../context/CartContext";

import { placeOrder } from "../services/orderService";

function POSPage() {

    const navigate = useNavigate();

    const [selectedVariant, setSelectedVariant] =
        useState("");

    const [products, setProducts] =
        useState([]);

    const [searchText, setSearchText] =
        useState("");

    const [searchResults, setSearchResults] =
        useState([]);

    const [customerName, setCustomerName] =
        useState("");

    const [phone, setPhone] =
        useState("");

    const [paymentMethod, setPaymentMethod] =
        useState("Cash");

    const {
        cartItems,
        clearCart
    } = useCart();



    useEffect(() => {

        const user =
            JSON.parse(
                localStorage.getItem("user")
            );

        if (!user) {

            navigate("/login");
        }

    }, [navigate]);



    useEffect(() => {

        if (selectedVariant) {

            loadProducts();
        }

    }, [selectedVariant]);



    const loadProducts =
        async () => {

            try {

                const data =
                    await getProductsByVariant(
                        selectedVariant
                    );

                console.log(
                    "PRODUCTS:",
                    data
                );

                setProducts(data);

            } catch (error) {

                console.error(error);
            }
        };



    const handleProductSearch =
        async (text) => {

            setSearchText(text);

            if (text.trim() === "") {

                setSearchResults([]);

                return;
            }

            try {

                const user =
                    JSON.parse(
                        localStorage.getItem("user")
                    );

                const data =
                    await searchProducts(
                        text,
                        user.storeId
                    );

                setSearchResults(data);

            } catch (error) {

                console.error(error);
            }
        };



    const handleCreateInvoice =
        async () => {

            try {

                const totalAmount =
                    cartItems.reduce(

                        (total, item) =>

                            total +
                            (
                                item.sellingPrice *
                                item.quantity
                            ),

                        0
                    );

                const user =
                    JSON.parse(
                        localStorage.getItem("user")
                    );

                const orderData = {

                    storeId:
                        user.storeId,

                    customerName,

                    phone,

                    address: "",

                    paymentMethod,

                    totalAmount,

                    items:
                        cartItems.map((item) => {

                            return {

                                productId:
                                    item.productId ||
                                    item.id,

                                quantity:
                                    item.quantity,

                                sellingPrice:
                                    Number(
                                        item.sellingPrice
                                    ),

                                totalPrice:
                                    Number(
                                        item.sellingPrice *
                                        item.quantity
                                    )
                            };
                        })
                };

                const orderId =
                    await placeOrder(
                        orderData
                    );

                clearCart();

                console.log(
                    "ORDER ID:",
                    orderId
                );

                navigate(
                    `/invoice/${orderId}`
                );

            } catch (error) {

                console.error(error);

                alert(
                    "Invoice Creation Failed"
                );
            }
        };



    return (

    <POSLayout
        customerName={customerName}
        setCustomerName={setCustomerName}
        phone={phone}
        setPhone={setPhone}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        handleCreateInvoice={
            handleCreateInvoice
        }
    >

        {/* SEARCH SECTION */}

        <div
            style={{
                background: "white",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "20px",
                boxShadow:
                    "0 2px 12px rgba(0,0,0,0.08)"
            }}
        >

            <h2
                style={{
                    marginBottom: "15px",
                    color: "#111827"
                }}
            >
                Product Search
            </h2>

            <input
                type="text"
                placeholder="Search By Part Number, Brand, Product Name..."
                value={searchText}
                onChange={(e) =>
                    handleProductSearch(
                        e.target.value
                    )
                }
                style={{
                    width: "100%",
                    padding: "14px",
                    border:
                        "1px solid #d1d5db",
                    borderRadius: "10px",
                    fontSize: "15px"
                }}
            />

        </div>

        {/* VEHICLE SECTION */}

        <div
            style={{
                background: "white",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "20px",
                boxShadow:
                    "0 2px 12px rgba(0,0,0,0.08)"
            }}
        >

            <h2
                style={{
                    marginBottom: "15px",
                    color: "#111827"
                }}
            >
                Vehicle Selection
            </h2>

            <POSVehicleSelector
                onVariantSelected={
                    setSelectedVariant
                }
            />

        </div>

        {/* PRODUCT RESULTS */}

        <div
            style={{
                background: "white",
                borderRadius: "16px",
                padding: "20px",
                boxShadow:
                    "0 2px 12px rgba(0,0,0,0.08)"
            }}
        >

            <div
                style={{
                    display: "flex",
                    justifyContent:
                        "space-between",
                    alignItems:
                        "center",
                    marginBottom: "20px"
                }}
            >

                <h2
                    style={{
                        margin: 0,
                        color: "#111827"
                    }}
                >
                    Products
                </h2>

                <span
                    style={{
                        background: "#dbeafe",
                        color: "#2563eb",
                        padding:
                            "6px 12px",
                        borderRadius:
                            "20px",
                        fontWeight: "600",
                        fontSize: "14px"
                    }}
                >

                    {
                        searchResults.length > 0
                            ? searchResults.length
                            : products.length
                    }
                    {" "}
                    Items

                </span>

            </div>

            {
                (
                    searchResults.length === 0 &&
                    products.length === 0
                ) && (

                    <div
                        style={{
                            textAlign: "center",
                            padding: "60px",
                            color: "#6b7280"
                        }}
                    >

                        Select Vehicle Or Search Products

                    </div>
                )
            }

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fill,minmax(280px,1fr))",
                    gap: "20px"
                }}
            >

                {
                    (
                        searchResults.length > 0
                            ? searchResults
                            : products
                    ).map((product) => (

                        <ProductCard
                            key={product.id}
                            product={product}
                        />

                    ))
                }

            </div>

        </div>

    </POSLayout>

);
}

export default POSPage;