import Sidebar from "../components/Sidebar";

function DashboardLayout({ children }) {
    return (
        <>
            <style>{`
                html, body, #root {
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                }
                .dashboard-main {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .dashboard-main::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <div
                style={{
                    display: "flex",
                    height: "100vh",
                    width: "100vw",
                    margin: 0,
                    padding: 0,
                    overflow: "hidden",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif",
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
                    <main
                        className="dashboard-main"
                        style={{
                            height: "100vh",
                            width: "100%",
                            padding: 0,           /* ← was 12px 16px 16px */
                            margin: 0,
                            overflow: "auto",
                            boxSizing: "border-box",
                        }}
                    >
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}

export default DashboardLayout;