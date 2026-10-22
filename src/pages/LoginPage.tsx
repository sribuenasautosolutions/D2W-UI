// import {
//     useState
// }
// from "react";

// import {
//     useNavigate
// }
// from "react-router-dom";

// import {
//     Eye, EyeOff
// }
// from "lucide-react";

// import {
//     loginUser
// }
// from "../services/authService";

// function LoginPage() {

//     const navigate =
//         useNavigate();

//     const [email, setEmail] =
//         useState("");

//     const [password, setPassword] =
//         useState("");

//     const [showPassword, setShowPassword] =
//         useState(false);

//     const [loading, setLoading] =
//         useState(false);

//     const [loginError, setLoginError] =
//         useState("");

//     const handleLogin =
//         async (e) => {

//             e.preventDefault();

//             try {

//                 setLoading(true);
//                 setLoginError("");

//                 const response =
//                     await loginUser({

//                         email: email.trim().toLowerCase(),
//                         password
//                     });

//                 localStorage.setItem(
//                     "user",
//                     JSON.stringify(response)
//                 );

//                 if (response.role === "SUPER_ADMIN") {

//     navigate("/owner/dashboard");

// }
// else if (response.role === "STORE_OWNER") {

//     navigate("/store/dashboard");

// }
// else if (response.role === "CASHIER") {

//     navigate("/pos");

// }

//             } catch(error) {

//                 const data = error.response?.data;
//                 setLoginError(
//                     data?.message || data?.error ||
//                     (Array.isArray(data?.errors) ? data.errors.join(", ") : "") ||
//                     (typeof data === "string" ? data : "") ||
//                     "Unable to sign in. Please try again."
//                 );

//             } finally {

//                 setLoading(false);
//             }
//         };

//     return (

//         <div
//             style={{
//                 minHeight: "100vh",
//                 display: "flex",
//                 justifyContent: "center",
//                 alignItems: "center",
//                 background:
//                     "linear-gradient(135deg,#0f172a,#111827,#1e293b)",
//                 padding: "20px"
//             }}
//         >

//             <div
//                 style={{
//                     width: "100%",
//                     maxWidth: "430px",
//                     background: "#ffffff",
//                     borderRadius: "24px",
//                     padding: "40px",
//                     boxShadow:
//                         "0 20px 60px rgba(0,0,0,0.35)"
//                 }}
//             >

//                 <div
//                     style={{
//                         textAlign: "center",
//                         marginBottom: "35px"
//                     }}
//                 >

//                     <h1
//                         style={{
//                             fontSize: "34px",
//                             fontWeight: "700",
//                             color: "#111827",
//                             marginBottom: "10px"
//                         }}
//                     >

//                         D2W Smart Store

//                     </h1>

//                     <p
//                         style={{
//                             color: "#6b7280",
//                             fontSize: "15px"
//                         }}
//                     >

//                         Automobile Spare Parts POS System

//                     </p>

//                 </div>

//                 <form onSubmit={handleLogin}>

//                     {loginError && (
//                         <div style={{
//                             marginBottom: "18px",
//                             padding: "12px 14px",
//                             border: "1px solid #fecaca",
//                             borderRadius: "8px",
//                             background: "#fef2f2",
//                             color: "#b91c1c",
//                             fontSize: "14px"
//                         }}>
//                             {loginError}
//                         </div>
//                     )}

//                     <div
//                         style={{
//                             marginBottom: "22px"
//                         }}
//                     >

//                         <label
//                             style={{
//                                 display: "block",
//                                 marginBottom: "8px",
//                                 fontWeight: "600",
//                                 color: "#374151"
//                             }}
//                         >

//                             Email Address

//                         </label>

//                         <input
//                             required
//                             type="email"
//                             placeholder="Enter your email"
//                             value={email}
//                             onChange={(e) =>
//                                 setEmail(e.target.value)
//                             }
//                             style={{
//                                 width: "100%",
//                                 padding: "15px",
//                                 borderRadius: "12px",
//                                 border: "1px solid #d1d5db",
//                                 fontSize: "15px",
//                                 outline: "none",
//                                 boxSizing: "border-box"
//                             }}
//                         />

//                     </div>

//                     <div
//                         style={{
//                             marginBottom: "28px"
//                         }}
//                     >

//                         <label
//                             style={{
//                                 display: "block",
//                                 marginBottom: "8px",
//                                 fontWeight: "600",
//                                 color: "#374151"
//                             }}
//                         >

//                             Password

//                         </label>

//                         <div
//                             style={{
//                                 position: "relative"
//                             }}
//                         >

//                             <input
//                                 required
//                                 type={showPassword ? "text" : "password"}
//                                 placeholder="Enter your password"
//                                 value={password}
//                                 onChange={(e) =>
//                                     setPassword(e.target.value)
//                                 }
//                                 style={{
//                                     width: "100%",
//                                     padding: "15px",
//                                     paddingRight: "46px",
//                                     borderRadius: "12px",
//                                     border: "1px solid #d1d5db",
//                                     fontSize: "15px",
//                                     outline: "none",
//                                     boxSizing: "border-box"
//                                 }}
//                             />

//                             <button
//                                 type="button"
//                                 onClick={() =>
//                                     setShowPassword((current) => !current)
//                                 }
//                                 aria-label={showPassword ? "Hide password" : "Show password"}
//                                 style={{
//                                     position: "absolute",
//                                     right: "12px",
//                                     top: "50%",
//                                     transform: "translateY(-50%)",
//                                     border: "none",
//                                     background: "none",
//                                     padding: "4px",
//                                     display: "flex",
//                                     alignItems: "center",
//                                     justifyContent: "center",
//                                     color: "#6b7280",
//                                     cursor: "pointer"
//                                 }}
//                             >

//                                 {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}

//                             </button>

//                         </div>

//                     </div>

//                     <button
//                         type="submit"
//                         disabled={loading}
//                         style={{
//                             width: "100%",
//                             padding: "15px",
//                             border: "none",
//                             borderRadius: "14px",
//                             background:
//                                 "linear-gradient(135deg,#2563eb,#1d4ed8)",
//                             color: "white",
//                             fontSize: "16px",
//                             fontWeight: "600",
//                             cursor: "pointer",
//                             transition: "0.3s"
//                         }}
//                     >

//                         {
//                             loading
//                                 ? "Signing In..."
//                                 : "Login"
//                         }

//                     </button>

//                 </form>

//                 <div
//                     style={{
//                         marginTop: "30px",
//                         textAlign: "center",
//                         color: "#9ca3af",
//                         fontSize: "13px"
//                     }}
//                 >

//                     D2W Smart Store ERP © 2026

//                 </div>

//             </div>

//         </div>
//     );
// }

// export default LoginPage;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { loginUser } from "../services/authService";
import loginBg from "../assets/login-img.png";

function LoginPage() {
  const navigate = useNavigate();

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
        password,
      });

      localStorage.setItem("user", JSON.stringify(response));

      if (response.role === "SUPER_ADMIN") {
        navigate("/owner/dashboard");
      } else if (response.role === "STORE_OWNER") {
        navigate("/store/dashboard");
      } else if (response.role === "CASHIER") {
        navigate("/pos");
      }
    } catch (error) {
      const data = error.response?.data;

      setLoginError(
        data?.message ||
          data?.error ||
          (Array.isArray(data?.errors) ? data.errors.join(", ") : "") ||
          (typeof data === "string" ? data : "") ||
          "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Keyframe animations + pseudo-element styles that cannot be expressed in Tailwind ── */}
      <style>{`
                @keyframes backgroundGlow {
                    from { opacity: 0.65; }
                    to   { opacity: 1; }
                }

                @keyframes loginPanelEnter {
                    from { opacity: 0; transform: translateX(35px); }
                    to   { opacity: 1; transform: translateX(0); }
                }

                @keyframes contentEnter {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                @keyframes errorEnter {
                    from { opacity: 0; transform: translateY(-5px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                /* Background radial glow overlay */
                .lp-page::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background: radial-gradient(
                        circle at 75% 45%,
                        rgba(147, 197, 253, 0.10),
                        transparent 38%
                    );
                    animation: backgroundGlow 8s ease-in-out infinite alternate;
                }

                /* Top accent line on card */
                .lp-card::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(
                        90deg,
                        rgba(147, 197, 253, 0.25),
                        #60a5fa,
                        rgba(147, 197, 253, 0.25)
                    );
                }

                /* Button light-sweep shimmer */
                .lp-button::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: -120%;
                    width: 70%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.25),
                        transparent
                    );
                    transform: skewX(-20deg);
                    transition: left 0.55s ease;
                }

                .lp-button:hover:not(:disabled)::before {
                    left: 150%;
                }

                /* Input placeholder colour */
                .lp-input::placeholder {
                    color: rgba(226, 232, 240, 0.68);
                    transition: color 0.2s ease;
                }
                .lp-input:focus::placeholder {
                    color: rgba(226, 232, 240, 0.38);
                }

                /* Input focus box-shadow (Tailwind can't compose this exact multi-shadow) */
                .lp-input:focus {
                    box-shadow:
                        0 0 0 2px rgba(96, 165, 250, 0.16),
                        0 0 18px rgba(59, 130, 246, 0.12);
                    transform: translateY(-1px);
                }

                /* Password toggle hover needs to keep the translateY(-50%) */
                .lp-pwd-toggle:hover {
                    color: #ffffff;
                    transform: translateY(-50%) scale(1.08);
                }
                .lp-pwd-toggle:focus {
                    outline: none;
                    color: #93c5fd;
                }

                /* Button hover state with exact gradient + lift */
                .lp-button:hover:not(:disabled) {
                    background: linear-gradient(135deg, #60a5fa, #2563eb);
                    box-shadow: 0 12px 28px rgba(37, 99, 235, 0.38);
                    transform: translateY(-2px);
                }

                .lp-button:active:not(:disabled) {
                    transform: translateY(0);
                    box-shadow: 0 5px 15px rgba(37, 99, 235, 0.22);
                }

                /* Reduced-motion overrides */
                @media (prefers-reduced-motion: reduce) {
                    .lp-page::before,
                    .lp-card,
                    .lp-header,
                    .lp-form,
                    .lp-footer,
                    .lp-error { animation: none; }

                    .lp-input,
                    .lp-button,
                    .lp-pwd-toggle { transition: none; }
                }

                /* ── Responsive overrides that use custom breakpoints / clamp ── */

                /* Large desktop ≥ 1440 */
                @media (min-width: 1440px) {
                    .lp-card {
                        width: 420px;
                        margin-right: 6vw;
                    }
                }

                /* Laptop ≤ 1200 */
                @media (max-width: 1200px) {
                    .lp-card {
                        width: 390px;
                        margin-right: 4vw;
                        padding: 28px 32px;
                    }
                    .lp-title { font-size: 32px; }
                }

                /* Tablet ≤ 900 */
                @media (max-width: 900px) {
                    .lp-page {
                        justify-content: center;
                        padding: 24px;
                        background-image:
                            linear-gradient(
                                rgba(15, 23, 42, 0.28),
                                rgba(15, 23, 42, 0.40)
                            ),
                            var(--lp-bg-url);
                        background-position: center;
                    }
                    .lp-card {
                        width: min(430px, 80vw);
                        margin-right: 0;
                        min-height: auto;
                        padding: 32px;
                    }
                }

                /* Mobile ≤ 600 */
                @media (max-width: 600px) {
                    .lp-page  { padding: 16px; }
                    .lp-card  { width: 100%; padding: 28px 24px; }
                    .lp-header { margin-bottom: 24px; }
                    .lp-title  { font-size: 27px; }
                    .lp-subtitle { font-size: 13px; }
                    .lp-input  { height: 46px; }
                    .lp-button { height: 46px; }
                }

                /* Small mobile ≤ 400 */
                @media (max-width: 400px) {
                    .lp-page  { padding: 12px; }
                    .lp-card  { padding: 28px 20px; }
                    .lp-title  { font-size: 24px; }
                    .lp-subtitle { font-size: 12px; }
                    .lp-label  { font-size: 12px; }
                    .lp-input  { height: 44px; font-size: 13px; }
                    .lp-button { height: 44px; font-size: 13px; }
                    .lp-footer { font-size: 11px; }
                }

                /* Short screens */
                @media (max-height: 650px) {
                    .lp-card   { min-height: auto; padding-top: 24px; padding-bottom: 24px; }
                    .lp-header { margin-bottom: 20px; }
                    .lp-title  { font-size: 25px; }
                    .lp-form-group  { margin-bottom: 12px; }
                    .lp-pwd-group   { margin-bottom: 16px; }
                    .lp-input  { height: 42px; }
                    .lp-button { height: 42px; }
                    .lp-footer { margin-top: 16px; }
                }
            `}</style>

      {/* ── LOGIN PAGE ── */}
      <div
        className="lp-page relative w-full flex justify-end items-center overflow-hidden box-border"
        style={
          {
            height: "100vh",
            minHeight: "100vh",
            backgroundImage: `linear-gradient(90deg, rgba(15,23,42,0.05), rgba(15,23,42,0.30)), url(${loginBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            /* expose bg-url for tablet media-query override */
            "--lp-bg-url": `url(${loginBg})`,
          } as React.CSSProperties
        }
      >
        {/* ── LOGIN CARD ── */}
        <div
          className="lp-card relative z-10 flex flex-col justify-center box-border"
          style={{
            width: "min(420px, 36vw)",
            minHeight: "440px",
            marginRight: "clamp(25px, 5vw, 85px)",
            padding: "clamp(32px, 4vw, 46px) clamp(30px, 4vw, 46px)",
            background:
              "linear-gradient(145deg, rgba(55,75,95,0.52), rgba(82,105,126,0.34))",
            border: "none",
            borderRadius: 0,
            boxShadow:
              "0 20px 55px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            animation: "loginPanelEnter 0.7s ease-out both",
          }}
        >
          {/* ── HEADER ── */}
          <div
            className="lp-header w-full mb-7"
            style={{ animation: "contentEnter 0.7s ease-out 0.12s both" }}
          >
            <h1
              className="lp-title text-slate-100 font-bold tracking-tight text-left m-0 mb-2 leading-tight"
              style={{
                fontSize: "clamp(28px, 2.8vw, 38px)",
                letterSpacing: "-0.6px",
                textShadow: "0 2px 10px rgba(0,0,0,0.25)",
              }}
            >
              D2W Smart Store
            </h1>

            <p
              className="lp-subtitle text-left font-normal m-0 leading-normal"
              style={{
                color: "rgba(226, 232, 240, 0.88)",
                fontSize: "clamp(13px, 1.2vw, 15px)",
              }}
            >
              Automobile Spare Parts POS System
            </p>
          </div>

          {/* ── FORM ── */}
          <form
            className="lp-form w-full"
            onSubmit={handleLogin}
            style={{ animation: "contentEnter 0.7s ease-out 0.20s both" }}
          >
            {loginError && (
              <div
                className="lp-error w-full box-border mb-4 py-3 px-3 border text-[13px] leading-snug"
                style={{
                  borderColor: "rgba(248,113,113,0.55)",
                  background: "rgba(127,29,29,0.35)",
                  color: "#fecaca",
                  borderRadius: 0,
                  animation: "errorEnter 0.25s ease-out",
                }}
              >
                {loginError}
              </div>
            )}

            {/* Email */}
            <div className="lp-form-group mb-5">
              <label
                className="lp-label block mb-2 text-slate-200 text-[13px] font-semibold"
                style={{ letterSpacing: "0.15px" }}
              >
                Email Address
              </label>

              <input
                required
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="lp-input w-full h-12 px-4 box-border text-slate-100 text-sm outline-none transition-all duration-200"
                style={{
                  background: "rgba(20,35,50,0.34)",
                  border: "1px solid rgba(214,226,238,0.38)",
                  borderRadius: 0,
                  fontFamily: "inherit",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.12)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(219,234,254,0.65)";
                  e.currentTarget.style.background = "rgba(30,48,66,0.44)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(214,226,238,0.38)";
                  e.currentTarget.style.background = "rgba(20,35,50,0.34)";
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#60a5fa";
                  e.currentTarget.style.background = "rgba(22,40,58,0.54)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(214,226,238,0.38)";
                  e.currentTarget.style.background = "rgba(20,35,50,0.34)";
                }}
              />
            </div>

            {/* Password */}
            <div className="lp-pwd-group lp-form-group mb-6">
              <label
                className="lp-label block mb-2 text-slate-200 text-[13px] font-semibold"
                style={{ letterSpacing: "0.15px" }}
              >
                Password
              </label>

              <div className="relative w-full">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="lp-input w-full h-12 px-4 pr-9 box-border text-slate-100 text-sm outline-none transition-all duration-200"
                  style={{
                    background: "rgba(20,35,50,0.34)",
                    border: "1px solid rgba(214,226,238,0.38)",
                    borderRadius: 0,
                    fontFamily: "inherit",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.12)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(219,234,254,0.65)";
                    e.currentTarget.style.background = "rgba(30,48,66,0.44)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(214,226,238,0.38)";
                    e.currentTarget.style.background = "rgba(20,35,50,0.34)";
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#60a5fa";
                    e.currentTarget.style.background = "rgba(22,40,58,0.54)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(214,226,238,0.38)";
                    e.currentTarget.style.background = "rgba(20,35,50,0.34)";
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="lp-pwd-toggle absolute top-1/2 right-2 w-[34px] h-[34px] flex items-center justify-center p-0 border-none bg-transparent cursor-pointer transition-all duration-200"
                  style={{
                    color: "rgba(226,232,240,0.75)",
                    transform: "translateY(-50%)",
                  }}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="lp-button relative w-full h-12 px-4 overflow-hidden text-white text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
              style={{
                border: "1px solid rgba(147,197,253,0.40)",
                borderRadius: 0,
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.96), rgba(37,99,235,0.96))",
                letterSpacing: "0.2px",
                fontFamily: "inherit",
                boxShadow: "0 8px 22px rgba(37,99,235,0.25)",
              }}
            >
              {loading ? "Signing In..." : "Login"}
            </button>
          </form>

          {/* ── FOOTER ── */}
          <div
            className="lp-footer w-full mt-6 text-xs font-normal text-left"
            style={{
              color: "rgba(203,213,225,0.72)",
              animation: "contentEnter 0.7s ease-out 0.30s both",
            }}
          >
            D2W Smart Store ERP © 2026
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
