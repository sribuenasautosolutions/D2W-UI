import Sidebar from "../components/Sidebar";

function DashboardLayout({ children }) {
    return (
        <>
        <style>{`
            html, body, #root {
                height: 100%;
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
                overflow: "hidden",
                background: "#F1F3F5",
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
                <main className="dashboard-main" style={{
                    height: "100vh",
                    padding: "12px 16px 16px",
                    overflow: "auto",
                    boxSizing: "border-box",
                }}>
                    {children}
                </main>
            </div>
        </div>
        </>
    );
}

export default DashboardLayout;
