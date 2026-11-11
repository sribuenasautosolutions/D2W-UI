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

                /* ---- Mobile sidebar overlay ---- */
                @media (max-width: 768px) {
                    .dashboard-layout-root {
                        position: relative;
                    }
                    .dashboard-sidebar-wrap {
                        position: absolute !important;
                        top: 0;
                        left: 0;
                        height: 100vh;
                        z-index: 200;
                    }
                    .dashboard-sidebar-wrap--collapsed {
                        position: relative !important;
                        z-index: auto;
                    }
                    .dashboard-content-wrap {
                        width: 100% !important;
                        flex: 1 !important;
                    }
                }
            `}</style>
            <div
                className="dashboard-layout-root"
                style={{
                    display: "flex",
                    height: "100vh",
                    width: "100vw",
                    margin: 0,
                    padding: 0,
                    overflow: "hidden",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    position: "relative",
                }}
            >
                <Sidebar />

                <div
                    className="dashboard-content-wrap"
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
                            padding: "24px 28px", // layout baseline padding — pages use negative margin to escape if needed
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