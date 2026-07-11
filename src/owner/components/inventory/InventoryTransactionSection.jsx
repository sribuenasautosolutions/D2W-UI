import { useEffect, useState } from "react";
import { getInventoryTransactions }
from "../../../services/inventoryTransactionService";

function InventoryTransactionsSection() {

    const [transactions,
        setTransactions] =
            useState([]);

    const user =
        JSON.parse(
            localStorage.getItem(
                "user"
            )
        );

    useEffect(() => {

        loadTransactions();

    }, []);

    const loadTransactions =
        async () => {

            try {

                const data =
                    await getInventoryTransactions(
                        user.storeId
                    );

                console.log(data);

                setTransactions(
                    data
                );

            } catch(error) {

                console.error(error);
            }
        };

    return (

        <div>

            <h2>
                Inventory Transactions
            </h2>

            <table
                border="1"
                cellPadding="10"
                style={{
                    width: "100%",
                    marginTop: "20px"
                }}
            >

                <thead>

                    <tr>

                        <th>Date</th>

                        <th>Item Name</th>

                        <th>Part Number</th>

                        <th>Quantity</th>

                        <th>Transaction</th>

                        <th>Remarks</th>

                    </tr>

                </thead>

                <tbody>

                    {
                        transactions.map(
                            (item) => (

                            <tr key={item.id}>

                                <td>
                                    {item.createdAt}
                                </td>

                                <td>
                                    {item.itemName}
                                </td>

                                <td>
                                    {item.partNumber}
                                </td>

                                <td>
                                    {item.quantity}
                                </td>

                                <td>
                                    {item.transactionType}
                                </td>

                                <td>
                                    {item.remarks}
                                </td>

                            </tr>

                        ))
                    }

                </tbody>

            </table>

        </div>
    );
}

export default InventoryTransactionsSection;