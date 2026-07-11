import { useState, useEffect } from "react";
import axios from "axios";

function UsersPage() {

    const [users, setUsers] =
        useState([]);

    const [stores, setStores] =
        useState([]);

    const [name, setName] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [phone, setPhone] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [role, setRole] =
        useState("");

    const [storeId, setStoreId] =
        useState("");

    const loadUsers = async () => {

        try {

            const response =
                await axios.get(
                    "http://localhost:8080/users"
                );

            setUsers(
                response.data
            );

        }
        catch(error) {

            console.log(error);
        }
    };

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

        loadUsers();

        loadStores();

    }, []);

    const saveUser = async () => {

        try {

            await axios.post(
                "http://localhost:8080/users",
                {
                    name,
                    email,
                    phone,
                    password,
                    role,
                    storeId
                }
            );

            alert(
                "User Created Successfully"
            );

            loadUsers();

        }
        catch(error) {

            console.log(error);

            alert(
                "Unable To Create User"
            );
        }
    };

    return (

        <div>

            <h1>
                Users Management
            </h1>

            <input
                placeholder="Name"
                value={name}
                onChange={(e) =>
                    setName(
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
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) =>
                    setPassword(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <select
                value={role}
                onChange={(e) =>
                    setRole(
                        e.target.value
                    )
                }
            >

                <option value="">
                    Select Role
                </option>

                <option value="OWNER">
                    OWNER
                </option>

                <option value="MAINSTORE_MANAGER">
                    MAINSTORE_MANAGER
                </option>

                <option value="Admin">
                    Admin
                </option>

                <option value="INVENTORY_MANAGER">
                    INVENTORY_MANAGER
                </option>

            </select>

            <br /><br />

            <select
                value={storeId}
                onChange={(e) =>
                    setStoreId(
                        e.target.value
                    )
                }
            >

                <option value="">
                    Select Store
                </option>

                {
                    stores.map((store) => (

                        <option
                            key={store.id}
                            value={store.id}
                        >
                            {store.storeName}
                        </option>

                    ))
                }

            </select>

            <br /><br />

            <button
                onClick={saveUser}
            >
                Save User
            </button>

            <hr />

            <h2>
                Users List
            </h2>

            <table
                border="1"
                cellPadding="10"
            >

                <thead>

                    <tr>

                        <th>Name</th>

                        <th>Email</th>

                        <th>Phone</th>

                        <th>Role</th>

                    </tr>

                </thead>

                <tbody>

                    {
                        users.map((user) => (

                            <tr
                                key={user.id}
                            >

                                <td>
                                    {user.name}
                                </td>

                                <td>
                                    {user.email}
                                </td>

                                <td>
                                    {user.phone}
                                </td>

                                <td>
                                    {user.role}
                                </td>

                            </tr>

                        ))
                    }

                </tbody>

            </table>

        </div>
    );
}

export default UsersPage;