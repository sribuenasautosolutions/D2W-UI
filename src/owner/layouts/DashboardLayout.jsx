import { Building2 } from "lucide-react";
import Sidebar from "../components/Sidebar";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
}

function getRoleLabel(role) {
    const labels = {
        SUPER_ADMIN: "Super Admin",
        STORE_OWNER: "Store Owner",
        CASHIER: "Cashier",
    };

    return labels[role] || role || "User";
}

function DashboardLayout({ children }) {
    const user = getStoredUser();
    const isOwner = user?.role === "SUPER_ADMIN";
    const storeName = user?.storeName ||
        (isOwner ? "All Stores" : "Store not assigned");
    const displayName = user?.name || "D2W User";
    const email = user?.email || "Email not available";
    const initials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "DU";

    return (
        <div
            style={{
                display: "flex",
                height: "100vh",
                overflow: "hidden",
                background: "#F6F8FC",
                color: "#0F172A",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif",
            }}
        >
            <Sidebar />

            <div
                style={{
                    flex: 1,
                    minWidth: 0,
                    height: "100vh",
                    overflow: "hidden",
                }}
            >
                <header
                    style={{
                        height: "72px",
                        padding: "0 24px",
                        background: "#FFFFFF",
                        borderBottom: "1px solid #E2E8F0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "24px",
                        position: "sticky",
                        top: 0,
                        zIndex: 20,
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "11px",
                            minWidth: 0,
                        }}
                    >
                        <div
                            style={{
                                width: "38px",
                                height: "38px",
                                display: "grid",
                                placeItems: "center",
                                borderRadius: "6px",
                                color: "#1D4ED8",
                                background: "#EFF6FF",
                                flexShrink: 0,
                            }}
                        >
                            <Building2 size={20} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div
                                style={{
                                    color: "#64748B",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    marginBottom: "3px",
                                }}
                            >
                                {isOwner ? "Organization View" : "Current Store"}
                            </div>
                            <div
                                title={storeName}
                                style={{
                                    color: "#0F172A",
                                    fontSize: "15px",
                                    fontWeight: 800,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: "320px",
                                }}
                            >
                                {storeName}
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "11px",
                            minWidth: 0,
                        }}
                    >
                        <div
                            aria-hidden="true"
                            style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "50%",
                                background: "#0F172A",
                                color: "#FFFFFF",
                                display: "grid",
                                placeItems: "center",
                                fontSize: "12px",
                                fontWeight: 800,
                                flexShrink: 0,
                            }}
                        >
                            {initials}
                        </div>
                        <div style={{ minWidth: 0, textAlign: "left" }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "7px",
                                }}
                            >
                                <span
                                    style={{
                                        color: "#0F172A",
                                        fontSize: "13.5px",
                                        fontWeight: 800,
                                    }}
                                >
                                    {displayName}
                                </span>
                                <span
                                    style={{
                                        padding: "3px 7px",
                                        borderRadius: "4px",
                                        color: "#1D4ED8",
                                        background: "#EFF6FF",
                                        fontSize: "10px",
                                        fontWeight: 700,
                                    }}
                                >
                                    {getRoleLabel(user?.role)}
                                </span>
                            </div>
                            <div
                                title={email}
                                style={{
                                    maxWidth: "260px",
                                    marginTop: "3px",
                                    color: "#64748B",
                                    fontSize: "11.5px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {email}
                            </div>
                        </div>
                    </div>
                </header>

                <main style={{
                    height: "calc(100vh - 72px)",
                    padding: "20px 24px 32px",
                    overflow: "auto",
                    boxSizing: "border-box",
                }}>
                    {children}
                </main>
            </div>
        </div>
    );
}

export default DashboardLayout;
