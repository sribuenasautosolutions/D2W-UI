import { useState, useEffect } from "react";
import api from "../../../services/api";

function CurrentStockSection() {

    const [searchText,
        setSearchText] =
            useState("");

    const [selectedBrand,
        setSelectedBrand] =
            useState("");

    const [inventory,
        setInventory] =
            useState([]);
        const [currentPage,
    setCurrentPage] =
        useState(1);

const itemsPerPage = 10;
const user =
    JSON.parse(
        localStorage.getItem("user")
    );
   const loadInventory = async () => {
  try {

    console.log("User =", user);

   let response;

if (user?.role === "OWNER") {

    response = await api.get(
    "/store-inventory"
);

} else {

   response = await api.get(
    `/store-inventory/store/${user.storeId}`
);

}

    console.log("Inventory Data =", response.data);

    setInventory(response.data);

  } catch (error) {
    console.error(error);
  }
};

    useEffect(() => {

        loadInventory();

    }, []);

    const brands = [

        ...new Set(

            inventory.map(
                item => item.brandName
            )

        )

    ];

    const filteredInventory =
        inventory.filter((item) => {

            const matchesSearch =

                item.itemName
                    .toLowerCase()
                    .includes(
                        searchText.toLowerCase()
                    )

                ||

                item.brandName
                    .toLowerCase()
                    .includes(
                        searchText.toLowerCase()
                    )

                ||

                item.partNumber
                    .toLowerCase()
                    .includes(
                        searchText.toLowerCase()
                    );

            const matchesBrand =

                selectedBrand === ""

                ||

                item.brandName === selectedBrand;

            return (
                matchesSearch
                &&
                matchesBrand
            );
        });
        const lastIndex =
    currentPage * itemsPerPage;

const firstIndex =
    lastIndex - itemsPerPage;

const currentItems =
    filteredInventory.slice(
        firstIndex,
        lastIndex
    );

const totalPages =
    Math.ceil(
        filteredInventory.length /
        itemsPerPage
    );

    return (

        <div>

            <h2>
                Current Stock
            </h2>

            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom: "20px",
                    marginTop: "20px"
                }}
            >

                <input
                    type="text"
                    placeholder="Search Item Name / Brand / Part Number"
                    value={searchText}
                    onChange={(e) =>
                        setSearchText(
                            e.target.value
                        )
                    }
                    style={{
                        width: "300px",
                        padding: "10px"
                    }}
                />

                <select
                    value={selectedBrand}
                    onChange={(e) =>
                        setSelectedBrand(
                            e.target.value
                        )
                    }
                    style={{
                        padding: "10px"
                    }}
                >

                    <option value="">
                        All Brands
                    </option>

                    {
                        brands.map((brand) => (

                            <option
                                key={brand}
                                value={brand}
                            >
                                {brand}
                            </option>

                        ))
                    }

                </select>

            </div>

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

                        <th>
                            Item Name
                        </th>

                        <th>
                            Brand
                        </th>

                        <th>
                            Part Number
                        </th>

                        <th>
                            Quantity
                        </th>

                        <th>
    Selling Price
</th>

<th>
    MRP
</th>

<th>
    Status
</th>
                        <th>
                            Minimun Stock
                        </th>

                    </tr>

                </thead>

                <tbody>

                    {
                        currentItems.map((item) => (

                            <tr
                                key={
                                    item.inventoryId
                                }
                            >

                                <td>
                                    {item.itemName}
                                </td>

                                <td>
                                    {item.brandName}
                                </td>

                                <td>
                                    {item.partNumber}
                                </td>

                                <td>
                                    {item.quantity}
                                </td>

                               
    <td>
    {item.sellingPrice}
</td>

<td>
    {item.mrp}
</td>

<td>

    {
        item.quantity === 0
        ?

        "🔴 Out Of Stock"

        :

        item.quantity <= item.minimumStock
        ?

        "🟡 Low Stock"

        :

        "🟢 In Stock"
    }

</td>

<td>
    {item.minimumStock}
</td>

                            </tr>

                        ))
                    }

                </tbody>

            </table>
            <div
    style={{
        marginTop: "20px",
        display: "flex",
        gap: "10px"
    }}
>

    <button
        disabled={currentPage === 1}
        onClick={() =>
            setCurrentPage(
                currentPage - 1
            )
        }
    >
        Previous
    </button>

    <span>
        Page {currentPage} of {totalPages}
    </span>

    <button
        disabled={
            currentPage === totalPages
        }
        onClick={() =>
            setCurrentPage(
                currentPage + 1
            )
        }
    >
        Next
    </button>

</div>

        </div>
    );
}

export default CurrentStockSection; 