import { Link } from "react-router-dom";

function Sidebar() {

    const user =
        JSON.parse(
            localStorage.getItem(
                "user"
            )
        );

    const menuStyle = {
        color: "white",
        textDecoration: "none",
        display: "block",
        padding: "12px 0",
        cursor: "pointer"
    };

    const isOwner =
        user?.role === "OWNER";

    const isStoreManager =
        user?.role === "MAINSTORE_MANAGER";

    return (

        <div
            style={{
                width: "250px",
                background: "#111827",
                color: "white",
                minHeight: "100vh",
                padding: "20px"
            }}
        >

            <h2>
                Deals2Wheels
            </h2>

            {/* Dashboard */}

            <Link
                to={
                    isOwner
                        ? "/owner/dashboard"
                        : "/store/dashboard"
                }
                style={menuStyle}
            >
                Dashboard
            </Link>

            {/* OWNER ONLY */}

            {
                isOwner && (

                    <Link
                        to="/owner/products"
                        style={menuStyle}
                    >
                        Products
                    </Link>
                )
            }

            {
                isOwner && (

                    <Link
                        to="/owner/vehicles"
                        style={menuStyle}
                    >
                        Vehicles
                    </Link>
                )
            }

            {/* COMMON MENU */}

            <Link
                to={
                    isOwner
                        ? "/owner/inventory"
                        : "/store/inventory"
                }
                style={menuStyle}
            >
                Inventory
            </Link>

            <Link
                to={
                    isOwner
                        ? "/owner/orders"
                        : "/store/orders"
                }
                style={menuStyle}
            >
                Orders
            </Link>

            <Link
                to={
                    isOwner
                        ? "/owner/reports"
                        : "/store/reports"
                }
                style={menuStyle}
            >
                Reports
            </Link>

            {/* OWNER ONLY */}

            {
                isOwner && (

                    <Link
                        to="/owner/stores"
                        style={menuStyle}
                    >
                        Stores
                    </Link>
                )
            }

            {
                isOwner && (

                    <Link
                        to="/owner/users"
                        style={menuStyle}
                    >
                        Users
                    </Link>
                )
            }

            {/* LOGOUT */}

            <Link
                to="/login"
                style={{
                    ...menuStyle,
                    marginTop: "30px",
                    color: "#f87171"
                }}
                onClick={() =>
                    localStorage.removeItem(
                        "user"
                    )
                }
            >
                Logout
            </Link>

        </div>
    );
}

export default Sidebar;