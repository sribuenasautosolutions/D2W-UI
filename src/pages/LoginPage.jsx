import {
    useState
}
from "react";

import {
    useNavigate
}
from "react-router-dom";

import {
    loginUser
}
from "../services/authService";

function LoginPage() {

    const navigate =
        useNavigate();

    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const handleLogin =
        async (e) => {

            e.preventDefault();

            try {

                setLoading(true);

                const response =
                    await loginUser({

                        email,
                        password
                    });

              

                localStorage.setItem(
                    "user",
                    JSON.stringify(response)
                );


                if (response.role === "SUPER_ADMIN") {

    navigate("/owner/dashboard");

}
else if (response.role === "STORE_OWNER") {

    navigate("/store/dashboard");

}
else if (response.role === "CASHIER") {

    navigate("/pos");

}


            } catch(error) {

                console.error(error);

                alert("Invalid Credentials");

            } finally {

                setLoading(false);
            }
        };

    return (

        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background:
                    "linear-gradient(135deg,#0f172a,#111827,#1e293b)",
                padding: "20px"
            }}
        >

            <div
                style={{
                    width: "100%",
                    maxWidth: "430px",
                    background: "#ffffff",
                    borderRadius: "24px",
                    padding: "40px",
                    boxShadow:
                        "0 20px 60px rgba(0,0,0,0.35)"
                }}
            >

                <div
                    style={{
                        textAlign: "center",
                        marginBottom: "35px"
                    }}
                >

                    <h1
                        style={{
                            fontSize: "34px",
                            fontWeight: "700",
                            color: "#111827",
                            marginBottom: "10px"
                        }}
                    >

                        D2W Smart Store

                    </h1>

                    <p
                        style={{
                            color: "#6b7280",
                            fontSize: "15px"
                        }}
                    >

                        Automobile Spare Parts POS System

                    </p>

                </div>

                <form onSubmit={handleLogin}>

                    <div
                        style={{
                            marginBottom: "22px"
                        }}
                    >

                        <label
                            style={{
                                display: "block",
                                marginBottom: "8px",
                                fontWeight: "600",
                                color: "#374151"
                            }}
                        >

                            Email Address

                        </label>

                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            style={{
                                width: "100%",
                                padding: "15px",
                                borderRadius: "12px",
                                border: "1px solid #d1d5db",
                                fontSize: "15px",
                                outline: "none",
                                boxSizing: "border-box"
                            }}
                        />

                    </div>

                    <div
                        style={{
                            marginBottom: "28px"
                        }}
                    >

                        <label
                            style={{
                                display: "block",
                                marginBottom: "8px",
                                fontWeight: "600",
                                color: "#374151"
                            }}
                        >

                            Password

                        </label>

                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            style={{
                                width: "100%",
                                padding: "15px",
                                borderRadius: "12px",
                                border: "1px solid #d1d5db",
                                fontSize: "15px",
                                outline: "none",
                                boxSizing: "border-box"
                            }}
                        />

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "15px",
                            border: "none",
                            borderRadius: "14px",
                            background:
                                "linear-gradient(135deg,#2563eb,#1d4ed8)",
                            color: "white",
                            fontSize: "16px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "0.3s"
                        }}
                    >

                        {
                            loading
                                ? "Signing In..."
                                : "Login"
                        }

                    </button>

                </form>

                <div
                    style={{
                        marginTop: "30px",
                        textAlign: "center",
                        color: "#9ca3af",
                        fontSize: "13px"
                    }}
                >

                    D2W Smart Store ERP © 2026

                </div>

            </div>

        </div>
    );
}

export default LoginPage;
