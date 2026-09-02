import {
    useState
}
from "react";

import {
    useNavigate
}
from "react-router-dom";

import {
    Eye, EyeOff
}
from "lucide-react";

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

    const [showPassword, setShowPassword] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [loginError, setLoginError] =
        useState("");

    const handleLogin =
        async (e) => {

            e.preventDefault();

            try {

                setLoading(true);
                setLoginError("");

                const response =
                    await loginUser({

                        email: email.trim().toLowerCase(),
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

                const data = error.response?.data;
                setLoginError(
                    data?.message || data?.error ||
                    (Array.isArray(data?.errors) ? data.errors.join(", ") : "") ||
                    (typeof data === "string" ? data : "") ||
                    "Unable to sign in. Please try again."
                );

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

                    {loginError && (
                        <div style={{
                            marginBottom: "18px",
                            padding: "12px 14px",
                            border: "1px solid #fecaca",
                            borderRadius: "8px",
                            background: "#fef2f2",
                            color: "#b91c1c",
                            fontSize: "14px"
                        }}>
                            {loginError}
                        </div>
                    )}

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
                            required
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

                        <div
                            style={{
                                position: "relative"
                            }}
                        >

                            <input
                                required
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                style={{
                                    width: "100%",
                                    padding: "15px",
                                    paddingRight: "46px",
                                    borderRadius: "12px",
                                    border: "1px solid #d1d5db",
                                    fontSize: "15px",
                                    outline: "none",
                                    boxSizing: "border-box"
                                }}
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword((current) => !current)
                                }
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                style={{
                                    position: "absolute",
                                    right: "12px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    border: "none",
                                    background: "none",
                                    padding: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#6b7280",
                                    cursor: "pointer"
                                }}
                            >

                                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}

                            </button>

                        </div>

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
