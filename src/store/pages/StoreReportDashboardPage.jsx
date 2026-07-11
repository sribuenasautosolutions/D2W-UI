import { useParams, useNavigate } from "react-router-dom";

export default function StoreDashboardPage() {

    const { storeId } = useParams();

    const navigate = useNavigate();

    const reports = [

        {
            title: "Sales Report",
            icon: "📊",
            path: `/admin/reports/sales?storeId=${storeId}`
        },

        {
            title: "Inventory Report",
            icon: "📦",
            path: `/admin/reports/inventory?storeId=${storeId}`
        },

        {
            title: "Low Stock Report",
            icon: "⚠️",
            path: `/admin/reports/low-stock?storeId=${storeId}`
        },

        {
            title: "Customer Report",
            icon: "👥",
            path: `/admin/reports/customers?storeId=${storeId}`
        },

        {
            title: "Payment Report",
            icon: "💳",
            path: `/admin/reports/payments?storeId=${storeId}`
        }

    ];

    return (

        <div style={{ padding: "30px" }}>

            <button
                onClick={() =>
                    navigate("/admin/reports/store-wise")
                }
            >
                ← Back To Stores
            </button>

            <h1 style={{ marginTop: "20px" }}>
                Store Dashboard
            </h1>

            <br />

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fill,minmax(250px,1fr))",
                    gap: "20px"
                }}
            >

                {reports.map((report) => (

                    <div
                        key={report.title}
                        style={{
                            background: "#fff",
                            padding: "20px",
                            borderRadius: "12px",
                            boxShadow:
                                "0 2px 10px rgba(0,0,0,0.08)"
                        }}
                    >

                        <h2>
                            {report.icon}
                        </h2>

                        <h3>
                            {report.title}
                        </h3>

                        <button
                            onClick={() =>
                                navigate(report.path)
                            }
                        >
                            Open Report
                        </button>

                    </div>

                ))}

            </div>

        </div>
    );
}