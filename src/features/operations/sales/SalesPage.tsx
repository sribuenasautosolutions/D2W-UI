import { useCallback, useEffect, useMemo, useState } from "react";

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

import { getAllOrders, getOrdersByStore } from "../../../services/orderService";

import SalesInvoiceTable from "./SalesInvoiceTable";

import apiclient from "../../../services/apiclient";

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

  const user = useMemo(() => readUser(), []);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

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

  const [selectedStoreId, setSelectedStoreId] = useState(
    isSuperAdmin ? "" : String(user?.storeId || ""),
  );

  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");

  const [fromDate, setFromDate] = useState(() => localDateValue());
  const [toDate, setToDate] = useState(() => localDateValue());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    const loadStores = async () => {
      try {
        const response = await apiclient.get("/stores", {
          params: {
            page: 0,
            size: 100,
            active: true,
          },
        });

        const data = response.data;

        if (Array.isArray(data)) {
          setStores(data);
        } else if (Array.isArray(data?.content)) {
          setStores(data.content);
        } else {
          setStores([]);
        }
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Unable to load stores.",
        );
      }
    };

    loadStores();
  }, [isSuperAdmin]);

  const loadSales = useCallback(async () => {
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
          "Unable to load sales invoices.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    if (!isSuperAdmin && !selectedStoreId) {
      setSales([]);
      return;
    }

    loadSales();
  }, [isSuperAdmin, selectedStoreId, loadSales]);

  const visibleSales = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const saleDate = localDateValue(sale.orderDate);
      const matchesDate =
        (!fromDate || saleDate >= fromDate) && (!toDate || saleDate <= toDate);
      const matchesSearch =
        !query ||
        [
          sale.orderId,
          sale.customerName,
          sale.phone,
          sale.paymentMethod,
          sale.storeName,
          sale.storeCode,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
        );
      return matchesDate && matchesSearch;
    });
  }, [fromDate, sales, search, toDate]);

  const totalSalesValue = useMemo(() => {
    return visibleSales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount || 0),
      0,
    );
  }, [visibleSales]);

  const allSalesValue = useMemo(() => {
    return sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  }, [sales]);

  const valueShare =
    allSalesValue > 0
      ? Math.min(100, Math.max(0, (totalSalesValue / allSalesValue) * 100))
      : 0;

  const handleViewInvoice = (orderId) => {
    navigate(`invoice/${orderId}`);
  };

  return (
    <section className="w-full bg-white">
      {/* NAVBAR */}
      <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-5 h-auto md:h-[52px] px-6 py-3 md:py-0 bg-white border-b border-gray-100 shadow-sm">
        <h1 className="m-0 text-lg font-extrabold text-black tracking-tight">
          Sales Invoices
        </h1>
        <div className="flex items-center gap-3 justify-end">
          <div className="flex items-center gap-2 w-full md:w-[300px] h-[34px] px-4 bg-slate-100 border border-transparent rounded-full text-slate-400 transition-all duration-150 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-600">
            <Search size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, customer, phone..."
              className="w-full border-0 outline-none bg-transparent text-[12.5px] text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            className="relative w-[34px] h-[34px] inline-flex items-center justify-center rounded-full bg-transparent text-slate-700 cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-600"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-2 w-[7px] h-[7px] rounded-full bg-red-500 border-[1.5px] border-white" />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 h-[34px] pl-1 pr-2 rounded-full bg-transparent cursor-pointer text-slate-700 transition-colors hover:bg-blue-50"
            aria-label="Profile"
          >
            <span className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">
              {initials}
            </span>
            <span className="hidden md:inline text-[12.5px] font-bold text-black">
              {displayName}
            </span>
            <ChevronDown size={16} />
          </button>
        </div>
      </header>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-6 pt-4">
        <div className="relative flex flex-row items-center gap-3 p-3.5 px-4 rounded-xl border border-blue-200 border-l-4 border-l-blue-600 bg-blue-50/60 overflow-hidden shadow-xs hover:shadow-md transition-all duration-150">
          <div className="w-[34px] h-[34px] inline-flex items-center justify-center rounded-lg flex-shrink-0 bg-blue-100 text-blue-600">
            <FileText size={18} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-700 leading-tight">
              Total Invoices
            </span>
            <strong className="text-[22px] font-extrabold text-black tracking-tight leading-tight">
              {visibleSales.length}
            </strong>
          </div>
        </div>

        <div className="relative flex flex-row items-center gap-3 p-3.5 px-4 rounded-xl border border-emerald-200 border-l-4 border-l-emerald-600 bg-emerald-50/60 overflow-hidden shadow-xs hover:shadow-md transition-all duration-150">
          <div className="w-[34px] h-[34px] inline-flex items-center justify-center rounded-lg flex-shrink-0 bg-emerald-100 text-emerald-600">
            <Wallet size={18} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-700 leading-tight">
              Total Revenue
            </span>
            <strong className="text-[22px] font-extrabold text-black tracking-tight leading-tight">
              {formatMoney(totalSalesValue)}
            </strong>
            <div className="mt-2 w-full h-1 rounded-full bg-gray-200 overflow-hidden">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-700"
                style={{ width: `${valueShare}%` }}
              />
            </div>
          </div>
        </div>

        <div className="relative flex flex-row items-center gap-3 p-3.5 px-4 rounded-xl border border-purple-200 border-l-4 border-l-purple-600 bg-purple-50/60 overflow-hidden shadow-xs hover:shadow-md transition-all duration-150">
          <div className="w-[34px] h-[34px] inline-flex items-center justify-center rounded-lg flex-shrink-0 bg-purple-100 text-purple-600">
            <TrendingUp size={18} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-700 leading-tight">
              Avg. Order Value
            </span>
            <strong className="text-[22px] font-extrabold text-black tracking-tight leading-tight">
              {visibleSales.length
                ? formatMoney(totalSalesValue / visibleSales.length)
                : formatMoney(0)}
            </strong>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="relative flex flex-row items-center gap-3 p-3.5 px-4 rounded-xl border border-amber-200 border-l-4 border-l-amber-600 bg-amber-50/60 overflow-hidden shadow-xs hover:shadow-md transition-all duration-150">
            <div className="w-[34px] h-[34px] inline-flex items-center justify-center rounded-lg flex-shrink-0 bg-amber-100 text-amber-600">
              <Store size={18} />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-700 leading-tight">
                Active Stores
              </span>
              <strong className="text-[22px] font-extrabold text-black tracking-tight leading-tight">
                {stores.length}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 px-6 py-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="inline-flex items-center gap-2 h-10 px-3 border border-gray-200 rounded-xl bg-white text-[10.5px] font-bold tracking-wider uppercase text-slate-500 transition-colors focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
            <span>From</span>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="border-0 outline-none bg-transparent text-[12.5px] font-semibold text-slate-900 cursor-pointer"
            />
          </label>

          <label className="inline-flex items-center gap-2 h-10 px-3 border border-gray-200 rounded-xl bg-white text-[10.5px] font-bold tracking-wider uppercase text-slate-500 transition-colors focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
            <span>To</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="border-0 outline-none bg-transparent text-[12.5px] font-semibold text-slate-900 cursor-pointer"
            />
          </label>

          <button
            type="button"
            className="h-10 px-4 border border-gray-300 rounded-xl bg-white text-xs font-bold text-blue-600 cursor-pointer whitespace-nowrap transition-colors hover:bg-blue-50 hover:border-blue-200"
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
          >
            All dates
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isSuperAdmin && (
            <label className="inline-flex items-center gap-2 h-10 px-3 border border-gray-200 rounded-xl bg-white text-[10.5px] font-bold tracking-wider uppercase text-slate-500 min-w-[200px] transition-colors focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
              <span>Store</span>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full border-0 outline-none bg-transparent text-[12.5px] font-semibold text-slate-900 cursor-pointer"
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
            className="h-10 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer whitespace-nowrap shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:translate-y-px"
            onClick={() => navigate("new")}
          >
            <Plus size={16} />
            New Sale
          </button>
        </div>
      </div>

      {/* TABLE PANEL */}
      <div className="mx-6 mb-6 border border-gray-200 rounded-xl bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-10 text-center text-[13.5px] font-medium text-slate-500">
            Loading sales invoices...
          </div>
        ) : (
          <SalesInvoiceTable
            sales={visibleSales}
            isSuperAdmin={isSuperAdmin}
            selectedStoreId={selectedStoreId}
            onViewInvoice={handleViewInvoice}
          />
        )}
      </div>
    </section>
  );
}
