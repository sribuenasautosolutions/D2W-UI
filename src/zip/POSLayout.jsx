import { useState } from "react";

import { useCart } from "../context/CartContext";

function POSLayout({
    children,
    customerName,
    setCustomerName,
    phone,
    setPhone,
    paymentMethod,
    setPaymentMethod,
    handleCreateInvoice
}) {

    const [showCart, setShowCart] =
        useState(false);

    const {
        cartItems,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart
    } = useCart();

    const user =
        JSON.parse(
            localStorage.getItem("user")
        );

    const subTotal =
        cartItems.reduce(

            (total, item) =>

                total +
                (
                    item.sellingPrice *
                    item.quantity
                ),

            0
        );

    return (

        <div
            style={{
                minHeight: "100vh",
                background: "#f4f7fc"
            }}
        >

            {/* HEADER */}

            <div
                style={{
                    background:
                        "linear-gradient(90deg,#08152d,#0b2458)",
                    color: "white",
                    padding: "18px 30px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom:
                        "3px solid #2563eb"
                }}
            >

                <div>

                    <h1
                        style={{
                            margin: 0
                        }}
                    >
                        Deals2Wheels POS
                    </h1>

                    <p
                        style={{
                            margin: 0,
                            opacity: 0.8
                        }}
                    >
                        {user?.storeName}
                    </p>

                </div>

                <div
    style={{
        display: "flex",
        alignItems: "center",
        gap: "15px",
        width: "60%"
    }}
>

    <input
        type="text"
        placeholder="Search Parts, SKU, Brands..."
        style={{
            flex: 1,
            padding: "12px 15px",
            borderRadius: "8px",
            border: "none",
            outline: "none"
        }}
    />

    <div
        style={{
            fontWeight: "600"
        }}
    >
        Welcome, {user?.name}
    </div>

</div>

            </div>

            {/* MAIN CONTENT */}
<div
    style={{
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fill,minmax(220px,1fr))",
        gap: "20px",
        marginTop: "20px"
    }}
>

    <div
        style={{
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            height: "fit-content",
            boxShadow:
                "0 2px 10px rgba(0,0,0,0.08)"
        }}
    >

        <h3>

            Customer Details

        </h3>

        <input
            type="text"
            value={customerName}
            onChange={(e) =>
                setCustomerName(
                    e.target.value
                )
            }
            placeholder="Customer Name"
            style={{
                width: "100%",
                padding: "12px",
                marginBottom: "10px"
            }}
        />

        <input
            type="text"
            value={phone}
            onChange={(e) =>
                setPhone(
                    e.target.value
                )
            }
            placeholder="Mobile Number"
            style={{
                width: "100%",
                padding: "12px",
                marginBottom: "10px"
            }}
        />

        <select
            value={paymentMethod}
            onChange={(e) =>
                setPaymentMethod(
                    e.target.value
                )
            }
            style={{
                width: "100%",
                padding: "12px"
            }}
        >

            <option value="Cash">
                Cash
            </option>

            <option value="UPI">
                UPI
            </option>

            <option value="Card">
                Card
            </option>

            <option value="Bank Transfer">
                Bank Transfer
            </option>

        </select>

    </div>

    <div>

        {children}

    </div>

</div>

            {/* FLOATING CART BUTTON */}

            <button
                onClick={() =>
                    setShowCart(true)
                }
                style={{
                    position: "fixed",
                    right: "25px",
                    bottom: "25px",
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "50px",
                    padding: "15px 25px",
                    fontWeight: "600",
                    cursor: "pointer",
                    zIndex: 9999,
                    boxShadow:
                        "0 6px 18px rgba(0,0,0,0.25)"
                }}
            >

                🛒 Cart ({cartItems.length})

            </button>

            {/* CART DRAWER */}

            {
                showCart && (

                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            right: 0,
                            width: "420px",
                            height: "100vh",
                            background: "white",
                            boxShadow:
                                "-5px 0 20px rgba(0,0,0,0.15)",
                            padding: "20px",
                            overflowY: "auto",
                            zIndex: 10000
                        }}
                    >

                        {/* CART HEADER */}

                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "space-between",
                                alignItems:
                                    "center"
                            }}
                        >

                            <h2>

                                Cart

                            </h2>

                            <button
                                onClick={() =>
                                    setShowCart(false)
                                }
                                style={{
                                    border: "none",
                                    background:
                                        "transparent",
                                    fontSize: "24px",
                                    cursor: "pointer"
                                }}
                            >

                                ✕

                            </button>

                        </div>

                        <hr />

                        {/* CUSTOMER DETAILS */}

                        <h3>

                            Customer Details

                        </h3>

                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) =>
                                setCustomerName(
                                    e.target.value
                                )
                            }
                            placeholder="Customer Name"
                            style={{
                                width: "100%",
                                padding: "10px",
                                marginBottom: "10px",
                                border:
                                    "1px solid #d1d5db",
                                borderRadius: "8px"
                            }}
                        />

                        <input
                            type="text"
                            value={phone}
                            onChange={(e) =>
                                setPhone(
                                    e.target.value
                                )
                            }
                            placeholder="Mobile Number"
                            style={{
                                width: "100%",
                                padding: "10px",
                                marginBottom: "10px",
                                border:
                                    "1px solid #d1d5db",
                                borderRadius: "8px"
                            }}
                        />

                        <select
                            value={paymentMethod}
                            onChange={(e) =>
                                setPaymentMethod(
                                    e.target.value
                                )
                            }
                            style={{
                                width: "100%",
                                padding: "10px",
                                marginBottom: "20px",
                                border:
                                    "1px solid #d1d5db",
                                borderRadius: "8px"
                            }}
                        >

                            <option value="Cash">
                                Cash
                            </option>

                            <option value="UPI">
                                UPI
                            </option>

                            <option value="Card">
                                Card
                            </option>

                            <option value="Bank Transfer">
                                Bank Transfer
                            </option>

                        </select>

                        <hr />

                        {
                            cartItems.length === 0 && (

                                <p>

                                    No Items In Cart

                                </p>

                            )
                        }

                        {
                            cartItems.map((item) => (

                                <div
                                    key={item.productId}
                                    style={{
                                        border:
                                            "1px solid #e5e7eb",
                                        borderRadius:
                                            "10px",
                                        padding:
                                            "12px",
                                        marginBottom:
                                            "12px"
                                    }}
                                >

                                    <strong>
                                        {item.itemName}
                                    </strong>

                                    <p>
                                        ₹{item.sellingPrice}
                                    </p>

                                    <div
                                        style={{
                                            display:
                                                "flex",
                                            gap: "10px",
                                            alignItems:
                                                "center"
                                        }}
                                    >

                                        <button
                                            onClick={() =>
                                                decreaseQuantity(
                                                    item.productId
                                                )
                                            }
                                        >
                                            -
                                        </button>

                                        <span>
                                            {item.quantity}
                                        </span>

                                        <button
                                            onClick={() =>
                                                increaseQuantity(
                                                    item.productId
                                                )
                                            }
                                        >
                                            +
                                        </button>

                                    </div>

                                    <button
                                        onClick={() =>
                                            removeFromCart(
                                                item.productId
                                            )
                                        }
                                        style={{
                                            marginTop:
                                                "10px",
                                            background:
                                                "red",
                                            color:
                                                "white",
                                            border:
                                                "none",
                                            padding:
                                                "8px 12px",
                                            borderRadius:
                                                "6px",
                                            cursor:
                                                "pointer"
                                        }}
                                    >

                                        Remove

                                    </button>

                                </div>

                            ))
                        }

                        <hr />

                        <p>
                            Sub Total : ₹{subTotal}
                        </p>

                        <p>
                            GST : ₹0
                        </p>

                        <h3>
                            Total : ₹{subTotal}
                        </h3>

                        <button
                            onClick={
                                handleCreateInvoice
                            }
                            style={{
                                width: "100%",
                                padding: "14px",
                                background:
                                    "#16a34a",
                                color: "white",
                                border: "none",
                                borderRadius:
                                    "8px",
                                cursor: "pointer",
                                fontWeight: "600"
                            }}
                        >

                            Create Invoice

                        </button>

                    </div>

                )
            }

        </div>

    );
}

export default POSLayout;