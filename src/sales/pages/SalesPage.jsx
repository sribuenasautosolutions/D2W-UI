import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    FileText,
    RefreshCw,
    Search,
    Plus,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
    getAllOrders,
    getOrdersByStore,
} from "../../services/orderService";

import SalesInvoiceTable from "../components/SalesInvoiceTable";

import apiclient from "../../services/apiclient";

import "./SalesPage.css";

const localDateValue = (value = new Date()) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};


const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
};


const formatMoney = (value) => {
    return `₹ ${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};


export default function SalesPage() {

    const navigate = useNavigate();

    const user = useMemo(
        () => readUser(),
        []
    );

    const isSuperAdmin =
        user?.role === "SUPER_ADMIN";


    const [stores, setStores] = useState([]);

    const [selectedStoreId, setSelectedStoreId] =
        useState(
            isSuperAdmin
                ? ""
                : String(user?.storeId || "")
        );

    const [sales, setSales] = useState([]);

    const [search, setSearch] =
        useState("");

    const [fromDate, setFromDate] = useState(() => localDateValue());
    const [toDate, setToDate] = useState(() => localDateValue());

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");


    /*
     * Load stores only for SUPER_ADMIN.
     */
    useEffect(() => {

        if (!isSuperAdmin) {
            return;
        }

        const loadStores = async () => {

            try {

                const response =
                    await apiclient.get(
                        "/stores",
                        {
                            params: {
                                page: 0,
                                size: 100,
                                active: true,
                            },
                        }
                    );

                const data = response.data;

                if (Array.isArray(data)) {
                    setStores(data);
                } else if (
                    Array.isArray(data?.content)
                ) {
                    setStores(data.content);
                } else {
                    setStores([]);
                }

            } catch (requestError) {

                setError(
                    requestError.response?.data?.message ||
                    "Unable to load stores."
                );

            }

        };

        loadStores();

    }, [isSuperAdmin]);


    /*
     * Load sales according to role/store.
     */
    const loadSales = useCallback(
        async () => {

            setLoading(true);
            setError("");

            try {

                let data;

                if (selectedStoreId) {

                   data = await getOrdersByStore(selectedStoreId);

                } else {

                   data = await getAllOrders();
                        

                }

                setSales(data);

            } catch (requestError) {

                setSales([]);

                setError(
                    requestError.response?.data?.message ||
                    "Unable to load sales invoices."
                );

            } finally {

                setLoading(false);

            }

        },
        [selectedStoreId]
    );


    useEffect(() => {

        /*
         * STORE_OWNER must have a store.
         */
        if (
            !isSuperAdmin &&
            !selectedStoreId
        ) {
            setSales([]);
            return;
        }

        loadSales();

    }, [
        isSuperAdmin,
        selectedStoreId,
        loadSales,
    ]);


    /*
     * Search existing backend response.
     * No backend calculation here.
     */
    const visibleSales = useMemo(() => {

        const query =
            search.trim().toLowerCase();

        return sales.filter((sale) => {
            const saleDate = localDateValue(sale.orderDate);
            const matchesDate = (!fromDate || saleDate >= fromDate)
                && (!toDate || saleDate <= toDate);
            const matchesSearch = !query || [
                sale.orderId,
                sale.customerName,
                sale.phone,
                sale.paymentMethod,
                sale.storeName,
                sale.storeCode,
            ].some((value) =>
                String(value ?? "")
                    .toLowerCase()
                    .includes(query)
            );
            return matchesDate && matchesSearch;

        });

    }, [fromDate, sales, search, toDate]);


    /*
     * Summary values are only for display.
     * They do NOT replace backend financial calculations.
     */
    const totalSalesValue = useMemo(() => {

        return visibleSales.reduce(
            (sum, sale) =>
                sum +
                Number(
                    sale.totalAmount || 0
                ),
            0
        );

    }, [visibleSales]);


    const selectedStore = useMemo(() => {

        return stores.find(
            (store) =>
                String(
                    store.id ??
                    store.storeId
                ) === selectedStoreId
        );

    }, [
        stores,
        selectedStoreId,
    ]);


    const handleViewInvoice = (
        orderId
    ) => {

        navigate(
            `invoice/${orderId}`
        );

    };


    return (

        <section className="sales-page">

            {/* HEADER */}

            <header className="sales-page-header">

                <div>

                    <span className="sales-page-eyebrow">
                        Sales
                    </span>

                    <h1>
                        Sales Invoices
                    </h1>

                    <p>
                        View sales invoices and
                        transaction history.
                    </p>

                </div>


                <div className="sales-header-actions">

                {isSuperAdmin && (

                    <div className="sales-store-selector">

                        <label htmlFor="sales-store">
                            Store
                        </label>

                        <select
                            id="sales-store"
                            value={selectedStoreId}
                            onChange={(event) =>
                                setSelectedStoreId(
                                    event.target.value
                                )
                            }
                        >

                            <option value="">
                                All Stores
                            </option>

                            {stores.map((store) => (

                                <option
                                    key={
                                        store.id ??
                                        store.storeId
                                    }
                                    value={
                                        store.id ??
                                        store.storeId
                                    }
                                >
                                    {store.storeName}
                                    {store.storeCode
                                        ? ` (${store.storeCode})`
                                        : ""}
                                </option>

                            ))}

                        </select>

                    </div>

                )}

                    <button
                        type="button"
                        className="sales-new-sale-button"
                        onClick={() => navigate("new")}
                    >
                        <Plus size={16} />
                        New Sale
                    </button>

                </div>

            </header>


            {/* SUMMARY */}

            <div className="sales-summary">

                <div className="sales-summary-card">

                    <FileText size={20} />

                    <div>

                        <span>
                            Store Scope
                        </span>

                        <strong>
                            {selectedStore?.storeName ||
                                user?.storeName ||
                                "All Stores"}
                        </strong>

                    </div>

                </div>


                <div className="sales-summary-card">

                    <div>

                        <span>
                            Invoices
                        </span>

                        <strong>
                            {visibleSales.length}
                        </strong>

                    </div>

                    <label className="sales-date-filter"><span>From</span><input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} /></label>
                    <label className="sales-date-filter"><span>To</span><input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} /></label>
                    <button type="button" className="sales-refresh-button" onClick={() => { setFromDate(""); setToDate(""); }}>All dates</button>

                </div>


                <div className="sales-summary-card">

                    <div>

                        <span>
                            Sales Value
                        </span>

                        <strong>
                            {formatMoney(
                                totalSalesValue
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            {/* TABLE PANEL */}

            <div className="sales-panel">

                <div className="sales-toolbar">

                    <div className="sales-search">

                        <Search size={17} />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search invoice, customer, phone..."
                        />

                    </div>


                    <button
                        type="button"
                        className="sales-refresh-button"
                        onClick={loadSales}
                        disabled={loading}
                    >

                        <RefreshCw
                            size={16}
                            className={
                                loading
                                    ? "sales-spin"
                                    : ""
                            }
                        />

                        Refresh

                    </button>

                </div>


                {error && (

                    <div className="sales-error">
                        {error}
                    </div>

                )}


                {loading ? (

                    <div className="sales-loading">
                        Loading sales invoices...
                    </div>

                ) : (

                    <SalesInvoiceTable
                        sales={visibleSales}
                        isSuperAdmin={
                            isSuperAdmin
                        }
                        selectedStoreId={
                            selectedStoreId
                        }
                        onViewInvoice={
                            handleViewInvoice
                        }
                    />

                )}

            </div>

        </section>

    );

}
