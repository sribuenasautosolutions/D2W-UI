import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

function InvoicePage() {

    const { orderId } = useParams();

    const [invoice,
        setInvoice] =
            useState(null);

    const loadInvoice = async () => {

        try {

            const response =
                await axios.get(
                    `http://localhost:8080/orders/${orderId}`
                );

            setInvoice(
                response.data
            );

        }
        catch(error) {

            console.log(error);
        }
    };

    useEffect(() => {

        loadInvoice();

    }, []);

    if(!invoice) {

        return <h2>Loading Invoice...</h2>;
    }

    return (

        <div
            style={{
                padding: "20px"
            }}
        >

            <h1>
                Invoice
            </h1>

            <hr />

            <h3>
                Customer Details
            </h3>

            <p>
                <b>Name:</b> {invoice.customerName}
            </p>

            <p>
                <b>Phone:</b> {invoice.phone}
            </p>

            <p>
                <b>Payment:</b> {invoice.paymentMethod}
            </p>

            <p>
                <b>Order Date:</b> {invoice.orderDate}
            </p>

            <hr />

            <h3>
                Purchased Items
            </h3>

            <table
                border="1"
                cellPadding="10"
                style={{
                    width: "100%",
                    borderCollapse: "collapse"
                }}
            >

                <thead>

                    <tr>

                        <th>
                            Item Name
                        </th>

                        <th>
                            Quantity
                        </th>

                        <th>
                            Selling Price
                        </th>

                        <th>
                            Total
                        </th>

                    </tr>

                </thead>

                <tbody>

                    {
                        invoice.items.map((item, index) => (

                            <tr
                                key={index}
                            >

                                <td>
                                    {item.itemName}
                                </td>

                                <td>
                                    {item.quantity}
                                </td>

                                <td>
                                    ₹ {item.sellingPrice}
                                </td>

                                <td>
                                    ₹ {item.totalPrice}
                                </td>

                            </tr>

                        ))
                    }

                </tbody>

            </table>

            <hr />

            <h2>
                Grand Total :
                ₹ {invoice.totalAmount}
            </h2>

            <button
                onClick={() =>
                    window.print()
                }
                style={{
                    padding: "10px 20px",
                    marginTop: "20px",
                    cursor: "pointer"
                }}
            >
                Print Invoice
            </button>

        </div>
    );
}

export default InvoicePage;