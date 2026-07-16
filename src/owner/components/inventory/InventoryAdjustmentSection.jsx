import { useEffect, useState } from "react";
import api from "../../../services/api";
import { createInventoryAdjustment }
from "../../../services/inventoryTransactionService";

function InventoryAdjustmentSection() {

    const [products,
        setProducts] =
            useState([]);

    const [productId,
        setProductId] =
            useState("");

    const [adjustedQty,
        setAdjustedQty] =
            useState("");

    const [reason,
        setReason] =
            useState("DAMAGED");

    const [remarks,
        setRemarks] =
            useState("");

    const [message,
        setMessage] =
            useState("");

    useEffect(() => {

        loadProducts();

    }, []);

    const loadProducts =
        async () => {

            try {

                const response = await api.get(
    "/products"
);

                setProducts(
                    response.data
                );

            } catch(error) {

                console.error(error);
            }
        };

    const handleSave =
        async () => {

            try {

                const user =
                    JSON.parse(
                        localStorage.getItem(
                            "user"
                        )
                    );

                const dto = {

                    storeId:
                        user.storeId,

                    productId:
                        productId,

                    adjustedQty:
                        Number(
                            adjustedQty
                        ),

                    reason:
                        reason,

                    remarks:
                        remarks
                };

                const response =
                    await createInventoryAdjustment(
                        dto
                    );

                setMessage(
                    response
                );

                alert(
                    "Inventory Adjusted Successfully"
                );

            } catch(error) {

                console.error(error);

                alert(
                    "Adjustment Failed"
                );
            }
        };

    return (

        <div>

            <h2>
                Inventory Adjustment
            </h2>

            <br />

            <select
                value={productId}
                onChange={(e) =>
                    setProductId(
                        e.target.value
                    )
                }
            >

                <option value="">
                    Select Product
                </option>

                {
                    products.map(
                        (product) => (

                        <option
                            key={product.id}
                            value={product.id}
                        >
                            {product.itemName}
                        </option>

                    ))
                }

            </select>

            <br /><br />

            <input
                type="number"
                placeholder="Adjustment Quantity"
                value={adjustedQty}
                onChange={(e) =>
                    setAdjustedQty(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <select
                value={reason}
                onChange={(e) =>
                    setReason(
                        e.target.value
                    )
                }
            >

                <option value="DAMAGED">
                    DAMAGED
                </option>

                <option value="LOST">
                    LOST
                </option>

                <option value="PHYSICAL_COUNT">
                    PHYSICAL_COUNT
                </option>

                <option value="MANUAL_CORRECTION">
                    MANUAL_CORRECTION
                </option>

            </select>

            <br /><br />

            <textarea
                placeholder="Remarks"
                value={remarks}
                onChange={(e) =>
                    setRemarks(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <button
                onClick={handleSave}
            >
                Save Adjustment
            </button>

            <p>
                {message}
            </p>

        </div>
    );
}

export default InventoryAdjustmentSection;