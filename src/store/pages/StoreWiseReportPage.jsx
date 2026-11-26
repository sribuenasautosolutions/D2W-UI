import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAllStores } from "../../services/storeService";

export default function StoreWiseReportPage() {

    const navigate = useNavigate();
    const location = useLocation();
    const reportsBase = location.pathname.startsWith("/owner/") ? "/owner/reports" : "/store/reports";

    const [stores, setStores] = useState([]);

    useEffect(() => {

        loadStores();

    }, []);

    const loadStores = async () => {

        try {

            const data =
                await getAllStores();

            setStores(Array.isArray(data) ? data : (data?.content || []));

        } catch (error) {

            console.log(error);
            setStores([]);
        }
    };

    return (

        <div style={{ padding: "30px" }}>

            <h1>
                Store Wise Report
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

                {stores.map((store) => (

                    <div
                        key={store.id}
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            padding: "20px",
                            boxShadow:
                                "0 2px 10px rgba(0,0,0,0.08)"
                        }}
                    >

                        <h3>
                            {store.storeName}
                        </h3>

                        <p>
                            Store Code:
                            {store.storeCode}
                        </p>

                        <button
                            onClick={() =>
                                navigate(
                                    `${reportsBase}/sales?storeId=${store.id}`
                                )
                            }
                        >
                            View Reports
                        </button>

                    </div>

                ))}

            </div>

        </div>
    );
}