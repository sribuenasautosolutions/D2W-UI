import { useEffect, useState } from "react";
import apiclient from "../../services/apiclient";
import { useNavigate } from "react-router-dom";

function OrdersPage() {

    const navigate = useNavigate();

    const [orders,
        setOrders] =
            useState([]);

    const loadOrders = async () => {

        try {

            const user =
                JSON.parse(
                    localStorage.getItem(
                        "user"
                    )
                );
let response;

if (user.role === "SUPER_ADMIN") {

   response = await apiclient.get("/orders");

} else {

   response = await apiclient.get(
    `/orders/store/${user.storeId}`
);

}

setOrders(response.data);

        }
        catch(error) {

            console.log(error);
        }
    };

    useEffect(() => {

        loadOrders();

    }, []);

    return (

        <div>

            <h1>
                Orders Management
            </h1>

            <table
                border="1"
                cellPadding="10"
                style={{
                    width: "100%",
                    marginTop: "20px",
                    borderCollapse: "collapse"
                }}
            >

                <thead>

                    <tr>

                        <th>
                            Order ID
                        </th>

                        <th>
                            Customer Name
                        </th>

                        <th>
                            Phone
                        </th>

                        <th>
                            Total Items
                        </th>

                        <th>
                            Payment Method
                        </th>

                        <th>
                            Total Amount
                        </th>

                        <th>
                            Order Date
                        </th>

                        <th>
                            Action
                        </th>

                    </tr>

                </thead>

                <tbody>

                    {
                        orders.length === 0 ?

                        (

                            <tr>

                                <td
                                    colSpan="8"
                                    style={{
                                        textAlign: "center"
                                    }}
                                >
                                    No Orders Found
                                </td>

                            </tr>

                        )

                        :

                        (

                            orders.map((order) => (

                                <tr
                                    key={order.orderId}
                                >

                                    <td>
                                        {order.orderId}
                                    </td>

                                    <td>
                                        {order.customerName}
                                    </td>

                                    <td>
                                        {order.phone}
                                    </td>

                                    <td>
                                        {order.totalItems}
                                    </td>

                                    <td>
                                        {order.paymentMethod}
                                    </td>

                                    <td>
                                        ₹ {order.totalAmount}
                                    </td>

                                    <td>
                                        {order.orderDate}
                                    </td>

                                    <td>

                                        <button
                                            onClick={() =>
                                               
                                                navigate(
                                                    `invoice/${order.orderId}`
                                                )
                                            }
                                        >
                                            View Invoice
                                        </button>

                                    </td>

                                </tr>

                            ))

                        )
                    }

                </tbody>

            </table>

        </div>
    );
}

export default OrdersPage;
