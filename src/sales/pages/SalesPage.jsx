import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Search,
    Plus,
    Bell,
    ChevronDown,
    FileText,
    Wallet,
    TrendingUp,
    Store,
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


    const displayName =
        user?.fullName ||
        user?.name ||
        user?.username ||
        (isSuperAdmin ? "Super Admin" : "User");

    const initials =
        displayName
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0].toUpperCase())
            .join("") || "U";


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

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

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
     * Called automatically on mount and whenever
     * the selected store changes — React re-renders
     * handle the "refresh" for us.
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
    const completedInvoiceCount = visibleSales.filter(sale => sale.orderStatus !== "DRAFT").length;
    const totalSalesValue = useMemo(() => {

        return visibleSales.filter(sale => sale.orderStatus !== "DRAFT").reduce(
            (sum, sale) =>
                sum +
                Number(
                    sale.totalAmount || 0
                ),
            0
        );

    }, [visibleSales]);


    /*
     * Display-only helper used by the value bar animation.
     * Nothing is recalculated on the backend.
     */
    const allSalesValue = useMemo(() => {

        return sales.filter(sale => sale.orderStatus !== "DRAFT").reduce(
            (sum, sale) =>
                sum +
                Number(
                    sale.totalAmount || 0
                ),
            0
        );

    }, [sales]);


    const valueShare = allSalesValue > 0
        ? Math.min(
            100,
            Math.max(
                0,
                (totalSalesValue / allSalesValue) * 100
            )
        )
        : 0;


    const selectedStore = useMemo(() => {

        return stores.find(
            (store) =>
                String(
                    store.id ??
                    store.storeId
                ) === selectedStoreId
        );

    }, [stores,selectedStoreId,]);


    const handleViewInvoice = (orderId) => {
        navigate(
            `invoice/${orderId}`
        );
    };


   return (
    <section className="sales-page">

        {/* NAVBAR */}
        <header className="sales-navbar">
            <h1 className="sales-navbar-title">Sales Invoices</h1>
            <div className="sales-navbar-right">
                <div className="sales-search">
                    <Search size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search invoice, customer, phone..."
                    />
                </div>
                <button type="button" className="sales-icon-button" aria-label="Notifications">
                    <Bell size={18} />
                    <span className="sales-notification-dot" />
                </button>
                <button type="button" className="sales-profile" aria-label="Profile">
                    <span className="sales-avatar">{initials}</span>
                    <span className="sales-profile-name">{displayName}</span>
                    <ChevronDown size={16} />
                </button>
            </div>
        </header>

        {/* KPI CARDS */}
            <div className="sales-kpis">

                <div className="sales-kpi sales-kpi-blue">
                    <div className="sales-kpi-icon">
                        <FileText size={18} />
                    </div>
                    <div className="sales-kpi-body">
                        <span className="sales-kpi-label">Total Invoices</span>
                        <strong className="sales-kpi-value">{visibleSales.length}</strong>
                    </div>
                </div>

                <div className="sales-kpi sales-kpi-green sales-kpi-wide">
                    <div className="sales-kpi-icon">
                        <Wallet size={18} />
                    </div>
                    <div className="sales-kpi-body">
                        <span className="sales-kpi-label">Total Revenue</span>
                        <strong className="sales-kpi-value">{formatMoney(totalSalesValue)}</strong>
                        <div className="sales-kpi-track">
                            <span
                                className="sales-kpi-fill"
                                style={{ width: `${valueShare}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="sales-kpi sales-kpi-purple">
                    <div className="sales-kpi-icon">
                        <TrendingUp size={18} />
                    </div>
                    <div className="sales-kpi-body">
                        <span className="sales-kpi-label">Avg. Order Value</span>
                        <strong className="sales-kpi-value">
                            {completedInvoiceCount
                                ? formatMoney(totalSalesValue / completedInvoiceCount)
                                : formatMoney(0)}
                        </strong>
                    </div>
                </div>

                {isSuperAdmin && (
                    <div className="sales-kpi sales-kpi-amber">
                        <div className="sales-kpi-icon">
                            <Store size={18} />
                        </div>
                        <div className="sales-kpi-body">
                            <span className="sales-kpi-label">Active Stores</span>
                            <strong className="sales-kpi-value">{stores.length}</strong>
                        </div>
                    </div>
                )}

            </div>

        {/* FILTER BAR */}
        <div className="sales-filterbar">
            <div className="sales-filter-dates">
                <label className="sales-field">
                    <span>From</span>
                    <input
                        type="date"
                        value={fromDate}
                        max={toDate || undefined}
                        onChange={(e) => setFromDate(e.target.value)}
                    />
                </label>

                <label className="sales-field">
                    <span>To</span>
                    <input
                        type="date"
                        value={toDate}
                        min={fromDate || undefined}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                </label>

                <button
                    type="button"
                    className="sales-clear-btn"
                    onClick={() => {
                        setFromDate("");
                        setToDate("");
                    }}
                >
                    All dates
                </button>
            </div>

            <div className="sales-filterbar-right">
                {isSuperAdmin && (
                    <label className="sales-field sales-field-store">
                        <span>Store</span>
                        <select
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                        >
                            <option value="">All Stores</option>
                            {stores.map((store) => (
                                <option
                                    key={store.id ?? store.storeId}
                                    value={store.id ?? store.storeId}
                                >
                                    {store.storeName}
                                    {store.storeCode ? ` (${store.storeCode})` : ""}
                                </option>
                            ))}
                        </select>
                    </label>
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
        </div>

        {/* TABLE PANEL */}
        <div className="sales-panel">
            {loading ? (
                <div className="sales-loading">Loading sales invoices...</div>
            ) : (
                <SalesInvoiceTable
                    sales={visibleSales}
                    isSuperAdmin={isSuperAdmin}
                    selectedStoreId={selectedStoreId}
                    onViewInvoice={handleViewInvoice}
                    onDownloadInvoice={(orderId) => navigate(`invoice/${orderId}?download=1`)}
                    onEditInvoice={(orderId) => navigate(`edit/${orderId}`)}
                />
            )}
        </div>

    </section>
);

}
