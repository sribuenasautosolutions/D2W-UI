import { useState, useEffect } from "react";
import axios from "axios";

function StoresPage() {

    const [stores,
        setStores] =
            useState([]);

    const [storeName,
        setStoreName] =
            useState("");

    const [storeCode,
        setStoreCode] =
            useState("");

    const [ownerName,
        setOwnerName] =
            useState("");

    const [phone,
        setPhone] =
            useState("");

    const [email,
        setEmail] =
            useState("");

    const [address,
        setAddress] =
            useState("");

    const [city,
        setCity] =
            useState("");

    const [state,
        setState] =
            useState("");

    const [country,
        setCountry] =
            useState("");

    const [pincode,
        setPincode] =
            useState("");

    const [storeType,
        setStoreType] =
            useState("");

    const loadStores = async () => {

        try {

            const response =
                await axios.get(
                    "http://localhost:8080/stores"
                );

            setStores(
                response.data
            );

        }
        catch(error) {

            console.log(error);
        }
    };

    useEffect(() => {

        loadStores();

    }, []);

    const saveStore = async () => {

    try {

        await axios.post(
            "http://localhost:8080/stores",
            {
                storeName,
                storeCode,
                ownerName,
                phone,
                email,
                address,
                city,
                state,
                country,
                pincode,
                storeType
            }
        );

        loadStores();

    }
    catch(error) {

        console.log(error);

        console.log(error.response);

        console.log(error.response?.data);

        alert(
            JSON.stringify(
                error.response?.data
            )
        );
    }
};

    return (

        <div>

            <h1>
                Stores Management
            </h1>

            <input
                placeholder="Store Name"
                value={storeName}
                onChange={(e) =>
                    setStoreName(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <input
                placeholder="Store Code"
                value={storeCode}
                onChange={(e) =>
                    setStoreCode(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <input
                placeholder="Owner Name"
                value={ownerName}
                onChange={(e) =>
                    setOwnerName(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <input
                placeholder="Phone"
                value={phone}
                onChange={(e) =>
                    setPhone(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <input
                placeholder="Email"
                value={email}
                onChange={(e) =>
                    setEmail(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <input
                placeholder="Address"
                value={address}
                onChange={(e) =>
                    setAddress(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <input
                placeholder="City"
                value={city}
                onChange={(e) =>
                    setCity(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <input
                placeholder="State"
                value={state}
                onChange={(e) =>
                    setState(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <input
                placeholder="Country"
                value={country}
                onChange={(e) =>
                    setCountry(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <input
                placeholder="Pincode"
                value={pincode}
                onChange={(e) =>
                    setPincode(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <select
                value={storeType}
                onChange={(e) =>
                    setStoreType(
                        e.target.value
                    )
                }
            >

                <option value="">
                    Select Store Type
                </option>

                <option value="MAIN_STORE">
    Main Store
</option>

<option value="WAREHOUSE">
    Warehouse
</option>

            </select>

            <br /><br />

            <button
                onClick={saveStore}
            >
                Save Store
            </button>

            <hr />

            <h2>
                Store List
            </h2>

            <table
                border="1"
                cellPadding="10"
            >

                <thead>

                    <tr>

                        <th>
                            Store Name
                        </th>

                        <th>
                            City
                        </th>

                        <th>
                            Store Type
                        </th>

                    </tr>

                </thead>

                <tbody>

                    {
                        stores.map((store) => (

                            <tr
                                key={store.id}
                            >

                                <td>
                                    {store.storeName}
                                </td>

                                <td>
                                    {store.city}
                                </td>

                                <td>
                                    {store.storeType}
                                </td>

                            </tr>

                        ))
                    }

                </tbody>

            </table>

        </div>
    );
}

export default StoresPage;