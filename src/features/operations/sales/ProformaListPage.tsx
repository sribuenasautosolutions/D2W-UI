import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Ban,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import {
  cancelProforma,
  getProforma,
  getProformas,
  toProformaSaleSource,
} from "../../../services/proformaService";

const displayDate = (value) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "—";
const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const displayNumber = (record) =>
  record?.proformaNumber?.startsWith("D2W-")
    ? record.proformaNumber
    : `D2W-${String(record?.storeName || "S")
        .trim()
        .charAt(0)
        .toUpperCase()}-${String(record?.id || 0).padStart(5, "0")}`;

export default function ProformaListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith("/owner/")
    ? "/owner/sales"
    : "/store/sales";
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const load = () =>
    getProformas(user?.role === "SUPER_ADMIN" ? null : user?.storeId).then(
      (value) => setRecords(Array.isArray(value) ? value : []),
    );

  useEffect(() => {
    let live = true;
    getProformas(user?.role === "SUPER_ADMIN" ? null : user?.storeId)
      .then((value) => live && setRecords(Array.isArray(value) ? value : []))
      .catch(
        (requestError) =>
          live &&
          setError(
            requestError?.response?.data?.message ||
              "Unable to load proforma invoices.",
          ),
      )
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [user]);

  const cancel = async (id) => {
    if (!window.confirm("Cancel this proforma invoice?")) return;
    setOpenMenuId(null);
    try {
      await cancelProforma(id);
      await load();
    } catch (requestError) {
      alert(
        requestError?.response?.data?.message ||
          "Unable to cancel proforma invoice.",
      );
    }
  };
  const convert = async (id) => {
    setOpenMenuId(null);
    try {
      const record = await getProforma(id);
      navigate(`${base}/new`, {
        state: { proforma: toProformaSaleSource(record) },
      });
    } catch (requestError) {
      alert(
        requestError?.response?.data?.message ||
          "Unable to open this proforma for conversion.",
      );
    }
  };
  const visibleRecords = records.filter(
    (record) =>
      (statusFilter === "ALL" || record.status === statusFilter) &&
      `${record.proformaNumber} ${record.customerName} ${record.customerMobile} ${record.storeName}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const totalValue = records.reduce(
    (sum, record) => sum + Number(record.netPayable || 0),
    0,
  );
  const openRecords = records.filter((record) => record.status === "SAVED");
  const openValue = openRecords.reduce(
    (sum, record) => sum + Number(record.netPayable || 0),
    0,
  );

  return (
    <section
      className="min-h-screen bg-[#f6f8fc] p-6 text-[#172033]"
      onClick={() => setOpenMenuId(null)}
    >
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="my-1 text-2xl font-bold text-slate-900">
            Proforma Invoices
          </h1>
          <span className="text-slate-500 text-xs font-semibold">
            Active quotations and estimation pipeline
          </span>
        </div>
        <button
          className="inline-flex items-center gap-2 border border-[#cbdcff] rounded-lg bg-[#f4f7ff] text-[#1d4ed8] px-4 py-2 font-bold text-sm shadow-sm hover:bg-[#eaf0ff] hover:border-[#a9c2ff] transition-colors cursor-pointer"
          onClick={() => navigate(`${base}/proforma/new`)}
        >
          <Plus size={17} />
          New Proforma
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 p-4 px-5 border border-slate-200 rounded-xl bg-white shadow-sm">
          <span className="col-span-full text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            Total Quotations
          </span>
          <strong className="text-slate-900 text-2xl font-bold">
            {records.length}
          </strong>
          <small className="self-end text-slate-600 text-xs font-semibold">
            {money(totalValue)}
          </small>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 p-4 px-5 border border-slate-200 rounded-xl bg-white shadow-sm">
          <span className="col-span-full text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            Open Balance
          </span>
          <strong className="text-slate-900 text-2xl font-bold">
            {openRecords.length}
          </strong>
          <small className="self-end text-slate-600 text-xs font-semibold">
            {money(openValue)}
          </small>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 p-4 px-5 border border-slate-200 rounded-xl bg-white shadow-sm">
          <span className="col-span-full text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            Converted
          </span>
          <strong className="text-slate-900 text-2xl font-bold">
            {records.filter((record) => record.status === "CONVERTED").length}
          </strong>
          <small className="self-end text-slate-600 text-xs font-semibold">
            Completed sales
          </small>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <label className="w-full sm:max-w-[420px] h-10 flex items-center gap-2 px-3 border border-slate-200 rounded-lg bg-white text-slate-400 focus-within:ring-2 focus-within:ring-blue-600">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search number, party or store"
            className="w-full border-0 outline-none bg-transparent text-slate-900 text-sm"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="ALL">All statuses</option>
          <option value="SAVED">Open</option>
          <option value="CONVERTED">Converted</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:px-5 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            Loading…
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-600 text-sm">{error}</div>
        ) : records.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            No Proforma Invoices created yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="p-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    Number
                  </th>
                  <th className="p-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    Date
                  </th>
                  <th className="p-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    Party
                  </th>
                  <th className="p-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    Store
                  </th>
                  <th className="p-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    Total
                  </th>
                  <th className="p-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    Status
                  </th>
                  <th className="p-3 text-center text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record) => {
                  const statusLower = String(record.status).toLowerCase();
                  const statusBadgeClass =
                    statusLower === "converted"
                      ? "bg-emerald-50 text-emerald-700"
                      : statusLower === "cancelled"
                        ? "bg-red-50 text-red-700"
                        : "bg-blue-50 text-blue-700";

                  return (
                    <tr
                      key={record.id}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="p-3 font-semibold text-slate-900 text-xs">
                        {displayNumber(record)}
                      </td>
                      <td className="p-3 text-slate-700 text-xs">
                        {displayDate(record.invoiceDate)}
                      </td>
                      <td className="p-3 text-slate-700 text-xs">
                        {record.customerName}
                      </td>
                      <td className="p-3 text-slate-700 text-xs">
                        {record.storeName}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 text-xs">
                        {money(record.netPayable)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-wider uppercase ${statusBadgeClass}`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="p-3 w-[70px] text-center">
                        <div className="relative inline-flex">
                          <button
                            className="w-[34px] h-[34px] grid place-items-center rounded-lg border border-transparent hover:border-slate-300 hover:bg-slate-100 text-slate-500 hover:text-blue-700 cursor-pointer transition-colors"
                            aria-label={`Actions for ${record.proformaNumber}`}
                            aria-expanded={openMenuId === record.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuId(
                                openMenuId === record.id ? null : record.id,
                              );
                            }}
                          >
                            <MoreHorizontal size={19} />
                          </button>
                          {openMenuId === record.id && (
                            <div
                              className="absolute right-0 top-10 z-30 w-48 p-2 border border-slate-200 rounded-lg bg-white shadow-xl grid gap-1"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-slate-700 text-xs font-semibold hover:bg-slate-100 text-left cursor-pointer"
                                onClick={() =>
                                  navigate(`${base}/proforma/${record.id}`)
                                }
                              >
                                <FileText size={15} />
                                <span>View invoice</span>
                              </button>
                              {record.sourceLeadId && (
                                <button
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-slate-700 text-xs font-semibold hover:bg-slate-100 text-left cursor-pointer"
                                  onClick={() =>
                                    navigate(
                                      `${base}/proforma/${record.id}/lead`,
                                    )
                                  }
                                >
                                  Customer decision and sales
                                </button>
                              )}
                              {!record.sourceLeadId &&
                                record.status === "SAVED" && (
                                  <>
                                    <button
                                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-slate-700 text-xs font-semibold hover:bg-slate-100 text-left cursor-pointer"
                                      onClick={() =>
                                        navigate(
                                          `${base}/proforma/${record.id}/edit`,
                                        )
                                      }
                                    >
                                      <Pencil size={15} />
                                      <span>Edit proforma</span>
                                    </button>
                                    <button
                                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-slate-700 text-xs font-semibold hover:bg-slate-100 text-left cursor-pointer"
                                      onClick={() => convert(record.id)}
                                    >
                                      <ArrowRight size={15} />
                                      <span>Convert to sale</span>
                                    </button>
                                    <button
                                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-red-600 text-xs font-semibold hover:bg-red-50 text-left cursor-pointer"
                                      onClick={() => cancel(record.id)}
                                    >
                                      <Ban size={15} />
                                      <span>Cancel proforma</span>
                                    </button>
                                  </>
                                )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
