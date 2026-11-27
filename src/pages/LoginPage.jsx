import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { loginUser } from "../services/authService";
import { useAuthActions } from "../auth/AuthContext";
import { resolveLandingRoute } from "../auth/routeResolver";
import "./LoginPage.css";

function extractPermissions(rawPermissions) {
    if (!Array.isArray(rawPermissions)) return [];
    return rawPermissions
        .map((p) => {
            if (typeof p === "string") return p.trim();
            if (p && typeof p === "object") {
                return (p.code || p.permissionCode || p.name || "").trim();
            }
            return "";
        })
        .filter(Boolean);
}

function LoginPage() {
    const navigate = useNavigate();
    const { loginSession } = useAuthActions();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setLoginError("");

            const response = await loginUser({
                email: email.trim().toLowerCase(),
                password
            });

            loginSession(response);

            const responsePermissions = extractPermissions(response.permissions);
            navigate(resolveLandingRoute(responsePermissions, response));
        } catch (error) {
            const data = error.response?.data;

            setLoginError(
                data?.message ||
                data?.error ||
                (Array.isArray(data?.errors)
                    ? data.errors.join(", ")
                    : "") ||
                (typeof data === "string"
                    ? data
                    : "") ||
                "Unable to sign in. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

            <div className="login-card">

                <div className="login-header">

                    <h1 className="login-title">
                        D2W Smart Store
                    </h1>

                    <p className="login-subtitle">
                        Automobile Spare Parts POS System
                    </p>

                </div>

                <form onSubmit={handleLogin}>

                    {loginError && (
                        <div className="login-error">
                            {loginError}
                        </div>
                    )}

                    <div className="login-form-group">

                        <label className="login-label">
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
                            className="login-input"
                        />

                    </div>

                    <div className="login-form-group password-group">

                        <label className="login-label">
                            Password
                        </label>

                        <div className="password-wrapper">

                            <input
                                required
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                className="login-input password-input"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(
                                        (current) => !current
                                    )
                                }
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                                className="password-toggle"
                            >
                                {showPassword ? (
                                    <EyeOff size={19} />
                                ) : (
                                    <Eye size={19} />
                                )}
                            </button>

                        </div>

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="login-button"
                    >
                        {loading
                            ? "Signing In..."
                            : "Login"}
                    </button>

                </form>

                <div className="login-footer">
                    D2W Smart Store ERP © 2026
                </div>

            </div>

        </div>
    );
}

export default LoginPage;
