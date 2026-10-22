import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FilterX,
  Search,
  Calendar,
  Store,
  AlertCircle,
  RefreshCw,
  PackageSearch,
  X,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import api from "../../../services/api";
import { getInventoryTransactionsPage } from "../../../services/inventoryTransactionService";
import { Button } from "@/components/ui/button";

const transactionTypes = [
  { value: "STOCK_IN", label: "Stock In" },
  { value: "STOCK_OUT", label: "Stock Out" },
  { value: "SALE", label: "Customer Sale" },
  { value: "RETURN", label: "Return" },
  { value: "ADJUSTMENT", label: "Audit Adjustment" },
  { value: "DAMAGED", label: "Damaged / Scrap" },
];

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function formatDate(value) {
  if (!value) return { date: "—", time: "" };
  const d = new Date(value);
  return {
    date: d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function InventoryTransactionsSection() {
  const user = getUser();
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(
    user.storeId ? String(user.storeId) : "",
  );
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [type, setType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [result, setResult] = useState<any>({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSuperAdmin) return;
    api
      .get("/stores", { params: { page: 0, size: 100, active: true } })
      .then((response) => {
        const active = Array.isArray(response.data?.content)
          ? response.data.content
          : [];
        setStores(active);
        if (!storeId && active.length > 0) {
          setStoreId(String(active[0].id));
        }
      })
      .catch(() => setError("Unable to load stores list."));
  }, [isSuperAdmin]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getInventoryTransactionsPage(storeId, {
        page,
        size,
        search: appliedSearch || undefined,
        type: type || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setResult(data || { content: [], totalElements: 0, totalPages: 0 });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "No transaction records found for this store.",
      );
    } finally {
      setLoading(false);
    }
  }, [storeId, page, size, appliedSearch, type, fromDate, toDate]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const hasActiveFilters = Boolean(appliedSearch || type || fromDate || toDate);

  const clearFilters = () => {
    setSearchText("");
    setAppliedSearch("");
    setType("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setAppliedSearch(searchText.trim());
    setPage(0);
  };

  const pageNumbers = useMemo(() => {
    const total = result.totalPages || 0;
    if (!total) return [];
    const start = Math.max(0, Math.min(page - 2, total - 5));
    return Array.from(
      { length: Math.min(5, total) },
      (_, index) => start + index,
    );
  }, [page, result.totalPages]);

  const firstRecord = result.totalElements ? page * size + 1 : 0;
  const lastRecord = Math.min((page + 1) * size, result.totalElements || 0);

  return (
    <div className="space-y-3 antialiased text-slate-900">
      {/* 1. FILTER TOOLBAR WITH TALLER H-8 INPUTS & REFINED PADDING */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-3.5 sm:p-4">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-white font-bold text-xs shadow-xs">
              <SlidersHorizontal size={14} />
            </span>
            <span className="text-xs font-black text-slate-950 uppercase tracking-wider">
              Filter Records
            </span>
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Filters Applied
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 rounded-lg border border-rose-200 transition-colors"
              >
                <FilterX size={13} /> Clear Filters
              </button>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <span className="font-semibold text-slate-500">Total Count:</span>
              <strong className="text-slate-950 font-mono font-black text-sm">
                {Number(result.totalElements || 0).toLocaleString("en-IN")}
              </strong>
            </div>
          </div>
        </div>

        {/* Filter Inputs Grid — All Height 11 (44px) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Store Location */}
          {isSuperAdmin && (
            <div className="lg:col-span-3 relative">
              <Store
                size={16}
                className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none"
              />
              <select
                className="w-full h-8 pl-10 pr-8 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 outline-none transition-all hover:border-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10 cursor-pointer shadow-2xs"
                value={storeId}
                onChange={(e) => {
                  setStoreId(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All Stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.storeName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Bar */}
          <div
            className={`${isSuperAdmin ? "lg:col-span-4" : "lg:col-span-5"}`}
          >
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center"
            >
              <Search
                size={16}
                className="absolute left-3.5 text-slate-400 pointer-events-none"
              />
              <input
                className="w-full h-8 pl-10 pr-22 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:border-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10 shadow-2xs"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search part no, name, remarks..."
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchText("");
                    setAppliedSearch("");
                    setPage(0);
                  }}
                  className="absolute right-18 text-slate-400 hover:text-slate-700 p-1 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
              <Button
                type="submit"
                className="absolute right-1.5 h-8 px-3.5 rounded-md bg-slate-950 hover:bg-black text-white text-xs font-bold shadow-xs transition-all"
              >
                Search
              </Button>
            </form>
          </div>

          {/* Movement Type */}
          <div className="lg:col-span-2">
            <select
              className="w-full h-8 px-3.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 outline-none transition-all hover:border-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10 cursor-pointer shadow-2xs"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All Movement Types</option>
              {transactionTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: From / To */}
          <div
            className={`${isSuperAdmin ? "lg:col-span-3" : "lg:col-span-4"} flex items-center gap-2`}
          >
            <div className="relative w-1/2">
              <input
                type="date"
                className="w-full h-8 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 outline-none transition-all hover:border-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10 shadow-2xs cursor-pointer"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(0);
                }}
                title="Start date"
              />
            </div>
            <span className="text-slate-400 font-bold text-sm">→</span>
            <div className="relative w-1/2">
              <input
                type="date"
                className="w-full h-8 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 outline-none transition-all hover:border-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10 shadow-2xs cursor-pointer"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(0);
                }}
                title="End date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. REFINED COMPACT ALERT (No harsh full-page push) */}
      {error && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-amber-300 bg-amber-50/80 text-amber-950 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="text-amber-700 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <Button
            size="xs"
            variant="outline"
            className="border-amber-400 bg-white hover:bg-amber-100 text-amber-950 text-xs font-bold gap-1 shadow-2xs"
            onClick={loadTransactions}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />{" "}
            Retry
          </Button>
        </div>
      )}

      {/* 3. TIGHT, HIGH-CONTRAST DATA TABLE */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead>
              {/* Pitch-Black, Bold, High-Contrast Headers */}
              <tr className="border-b-2 border-slate-300 bg-slate-100/90 text-slate-950 font-black text-[11px] uppercase tracking-wider select-none">
                <th className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 text-slate-950">
                    <span>Timestamp</span>
                    <ArrowUpDown size={12} className="text-slate-600" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-slate-950">Product Details</th>
                <th className="px-4 py-3.5 text-slate-950">Part Number</th>
                <th className="px-4 py-3.5 text-right text-slate-950">
                  Quantity Delta
                </th>
                <th className="px-4 py-3.5 text-center text-slate-950">
                  Movement Type
                </th>
                <th className="px-4 py-3.5 text-slate-950">Notes / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="inline-flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-900/20 border-t-slate-950 animate-spin" />
                      <span className="text-xs font-bold text-slate-700">
                        Loading audit history...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : result.content.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="inline-flex flex-col items-center gap-2 max-w-sm mx-auto">
                      <div className="w-11 h-8 rounded-xl bg-slate-100 border border-slate-200 grid place-items-center text-slate-500 shadow-2xs">
                        <PackageSearch size={22} />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-950">
                          No Records Available
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {hasActiveFilters
                            ? "No movements match your current search or date filters."
                            : "Select a store location above to review inventory movement logs."}
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={clearFilters}
                          className="mt-1 font-bold text-slate-900 border-slate-300 hover:bg-slate-50"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                result.content.map((item) => {
                  const formatted = formatDate(item.createdAt);
                  const isPositive =
                    item.transactionType === "STOCK_IN" ||
                    item.transactionType === "RETURN";

                  return (
                    <tr
                      key={item.id}
                      className="group hover:bg-slate-50/90 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-slate-950">
                          {formatted.date}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {formatted.time}
                        </div>
                      </td>

                      {/* Product Details */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-950 group-hover:text-blue-600 transition-colors">
                          {item.itemName || "Unknown Item"}
                        </div>
                      </td>

                      {/* Part Number */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-0.5 rounded font-mono text-[11px] font-black bg-slate-100 text-slate-900 border border-slate-300">
                          {item.partNumber || "—"}
                        </span>
                      </td>

                      {/* Quantity Delta */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded font-mono font-black text-xs ${
                            isPositive
                              ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                              : "bg-slate-100 text-slate-950 border border-slate-300"
                          }`}
                        >
                          {isPositive
                            ? `+${item.quantity}`
                            : `-${item.quantity}`}
                        </span>
                      </td>

                      {/* Movement Badge */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <TransactionBadge type={item.transactionType} />
                      </td>

                      {/* Remarks */}
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                        {item.remarks || (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. COMPACT PAGINATION FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 bg-slate-50/70 text-xs">
          <div className="text-slate-600 font-medium">
            Showing{" "}
            <strong className="text-slate-950 font-black font-mono">
              {firstRecord}
            </strong>
            –
            <strong className="text-slate-950 font-black font-mono">
              {lastRecord}
            </strong>{" "}
            of{" "}
            <strong className="text-slate-950 font-black font-mono">
              {Number(result.totalElements || 0).toLocaleString("en-IN")}
            </strong>{" "}
            records
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <span className="text-[11px]">Rows:</span>
              <select
                className="h-8 px-2 rounded-md border border-slate-300 bg-white text-xs font-black text-slate-950 outline-none hover:border-slate-400 focus:ring-2 focus:ring-slate-950/10 cursor-pointer shadow-2xs"
                value={size}
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  setPage(0);
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md border-slate-300 bg-white hover:bg-slate-100 text-slate-950 shadow-2xs"
              disabled={page === 0 || loading}
              onClick={() => setPage((value) => value - 1)}
              title="Previous page"
            >
              <ArrowLeft size={14} />
            </Button>

            <div className="flex items-center gap-1">
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  className={`h-8 min-w-[32px] px-2 rounded-md text-xs font-black transition-all ${
                    number === page
                      ? "bg-slate-950 text-white shadow-xs"
                      : "bg-white text-slate-900 border border-slate-300 hover:bg-slate-100"
                  }`}
                  onClick={() => setPage(number)}
                >
                  {number + 1}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md border-slate-300 bg-white hover:bg-slate-100 text-slate-950 shadow-2xs"
              disabled={page + 1 >= result.totalPages || loading}
              onClick={() => setPage((value) => value + 1)}
              title="Next page"
            >
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionBadge({ type }) {
  const badgeMap = {
    STOCK_IN: {
      label: "Stock In",
      style: "bg-emerald-100 text-emerald-950 border-emerald-300",
    },
    RETURN: {
      label: "Return",
      style: "bg-teal-100 text-teal-950 border-teal-300",
    },
    STOCK_OUT: {
      label: "Stock Out",
      style: "bg-amber-100 text-amber-950 border-amber-300",
    },
    SALE: { label: "Sale", style: "bg-blue-100 text-blue-950 border-blue-300" },
    DAMAGED: {
      label: "Damaged",
      style: "bg-rose-100 text-rose-950 border-rose-300",
    },
    ADJUSTMENT: {
      label: "Adjustment",
      style: "bg-purple-100 text-purple-950 border-purple-300",
    },
  };

  const current = badgeMap[type] || {
    label: type?.replaceAll("_", " ") || "Movement",
    style: "bg-slate-100 text-slate-900 border-slate-300",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-black border tracking-wide ${current.style}`}
    >
      {current.label}
    </span>
  );
}
