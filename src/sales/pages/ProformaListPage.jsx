import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Ban, CheckCircle2, Clock, FileText, IndianRupee, MoreHorizontal, Pencil, Plus, Search, XCircle } from "lucide-react";
import { cancelProforma, getProforma, getProformas, toProformaSaleSource } from "../../services/proformaService";
import { useAuth } from "../../auth/AuthContext";
import "./ProformaPage.css";

const displayDate = (record) => {
  if (!record) return "—";

  // 1) If we have invoiceDate + invoiceTime
  if (record.invoiceDate && record.invoiceTime) {
    const timeStr = String(record.invoiceTime).slice(0, 8);
    const date = new Date(`${record.invoiceDate}T${timeStr}`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  // 2) If we have createdAt timestamp
  if (record.createdAt) {
    const date = new Date(record.createdAt);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  // 3) Fallback: Plain date only (never show artificial 12:00 AM)
  const val = record.invoiceDate || record;
  if (val && typeof val === "string") {
    const date = new Date(`${val.split("T")[0]}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB");
    }
    return val;
  }

  return "—";
};
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const displayNumber = (record) => record?.proformaNumber?.startsWith("D2W-") ? record.proformaNumber : `D2W-${String(record?.storeName || "S").trim().charAt(0).toUpperCase()}-${String(record?.id || 0).padStart(5, "0")}`;

export default function ProformaListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith("/owner/") ? "/owner/sales" : "/store/sales";
  const { user: authUser, hasPermission } = useAuth();
  const fallbackUser = useMemo(() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } }, []);
  const user = authUser || fallbackUser;
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isStoreOwner = user?.role === "STORE_OWNER";
  const canCreateProforma = isSuperAdmin || isStoreOwner || hasPermission?.("PROFORMA.CREATE");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const load = () => getProformas(user?.role === "SUPER_ADMIN" ? null : user?.storeId).then((value) => setRecords(Array.isArray(value) ? value : []));

  useEffect(() => {
    let live = true;
    getProformas(user?.role === "SUPER_ADMIN" ? null : user?.storeId)
      .then((value) => live && setRecords(Array.isArray(value) ? value : []))
      .catch((requestError) => live && setError(requestError?.response?.data?.message || "Unable to load proforma invoices."))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [user]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const cancel = async (id) => {
    if (!window.confirm("Cancel this proforma invoice?")) return;
    setOpenMenuId(null);
    try { await cancelProforma(id); await load(); }
    catch (requestError) { alert(requestError?.response?.data?.message || "Unable to cancel proforma invoice."); }
  };
  const convert = async (id) => {
    setOpenMenuId(null);
    try { const record = await getProforma(id); navigate(`${base}/new`, { state: { proforma: toProformaSaleSource(record) } }); }
    catch (requestError) { alert(requestError?.response?.data?.message || "Unable to open this proforma for conversion."); }
  };
  const visibleRecords = useMemo(() => {
    return records
      .filter((record) => (statusFilter === "ALL" || record.status === statusFilter) && `${record.proformaNumber} ${record.customerName} ${record.customerMobile} ${record.storeName}`.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || (a.invoiceDate ? `${a.invoiceDate}T00:00:00` : 0)).getTime() || 0;
        const timeB = new Date(b.createdAt || (b.invoiceDate ? `${b.invoiceDate}T00:00:00` : 0)).getTime() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || 0) - (a.id || 0);
      });
  }, [records, statusFilter, query]);
  const totalValue = records.reduce((sum, record) => sum + Number(record.netPayable || 0), 0);
  const openRecords = records.filter((record) => record.status === "SAVED" || record.status === "DRAFT");
  const openValue = openRecords.reduce((sum, record) => sum + Number(record.netPayable || 0), 0);
  const convertedCount = records.filter((record) => record.status === "CONVERTED").length;
  const cancelledCount = records.filter((record) => record.status === "CANCELLED").length;

  const kpiList = [
    {
      label: "Total Quotations",
      value: records.length,
      subtext: money(totalValue),
      icon: FileText,
      iconBg: "kpi-bg-blue",
      iconColor: "kpi-text-blue",
    },
    {
      label: "Open Balance",
      value: openRecords.length,
      subtext: money(openValue),
      icon: Clock,
      iconBg: "kpi-bg-amber",
      iconColor: "kpi-text-amber",
    },
    {
      label: "Converted",
      value: convertedCount,
      icon: CheckCircle2,
      iconBg: "kpi-bg-emerald",
      iconColor: "kpi-text-emerald",
    },
    {
      label: "Cancelled",
      value: cancelledCount,
      icon: XCircle,
      iconBg: "kpi-bg-rose",
      iconColor: "kpi-text-rose",
    },
    {
      label: "Total Value",
      value: money(totalValue),
      icon: IndianRupee,
      iconBg: "kpi-bg-indigo",
      iconColor: "kpi-text-indigo",
    },
  ];

  const totalPages = Math.max(1, Math.ceil(visibleRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRecords = useMemo(
    () => visibleRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visibleRecords, currentPage, pageSize]
  );

  return <section className="proforma-page" onClick={() => setOpenMenuId(null)}>
    <div className="proforma-header-row">
      <div className="proforma-title-col">
        <h1>Proforma Invoices</h1>
      </div>

      {canCreateProforma && (
        <div className="proforma-btn-col">
          <button className="proforma-new-button" onClick={() => navigate(`${base}/proforma/new`)}>
            <Plus size={16}/>
            <span>New Proforma</span>
          </button>
        </div>
      )}
    </div>

    <div className="proforma-kpi-grid">
      {kpiList.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.label} className="kpi-metric-card">
            <div className="kpi-metric-top">
              <span className="kpi-metric-label">
                {kpi.label}
              </span>
              <div className={`kpi-metric-icon-box ${kpi.iconBg} ${kpi.iconColor}`}>
                <Icon size={15} strokeWidth={2.5} />
              </div>
            </div>
            <div className="kpi-metric-bottom">
              <span className="kpi-metric-value">{kpi.value}</span>
              {kpi.subtext && (
                <span className="kpi-metric-subtext">{kpi.subtext}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>

    <div className="proforma-filters">
      <label>
        <Search size={16}/>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search number, party or store"/>
      </label>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
        <option value="ALL">All statuses</option>
        <option value="SAVED">Open</option>
        <option value="CONVERTED">Converted</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
    </div>

    <div className="proforma-card">
      {loading ? <div className="proforma-empty">Loading…</div> : error ? <div className="proforma-empty">{error}</div> : records.length === 0 ? <div className="proforma-empty">No Proforma Invoices created yet.</div> : <>
        <table>
          <thead><tr><th>Number</th><th>Date</th><th>Party</th><th>Store</th><th>Total</th><th>Status</th><th className="action-heading">Actions</th></tr></thead>
          <tbody>{pagedRecords.map((record) => <tr key={record.id} onClick={() => navigate(`${base}/proforma/${record.id}`)} style={{ cursor: "pointer" }}>
            <td><strong>{displayNumber(record)}</strong></td><td>{displayDate(record)}</td><td>{record.customerName}</td><td>{record.storeName}</td><td>{money(record.netPayable)}</td><td><span className={`proforma-status ${String(record.status).toLowerCase()}`}>{record.status}</span></td>
            <td className="proforma-actions-cell"><div className="proforma-row-actions"><button className="proforma-kebab" aria-label={`Actions for ${record.proformaNumber}`} aria-expanded={openMenuId === record.id} onClick={(event) => { event.stopPropagation(); setOpenMenuId(openMenuId === record.id ? null : record.id); }}><MoreHorizontal size={19}/></button>{openMenuId === record.id && <div className="proforma-action-menu" onClick={(event) => event.stopPropagation()}><button onClick={() => navigate(`${base}/proforma/${record.id}`)}><FileText size={15}/><span>View invoice</span></button>{record.sourceLeadId && <button onClick={() => navigate(`${base}/proforma/${record.id}/lead`)}>Customer decision and sales</button>}{!record.sourceLeadId && record.status === "SAVED" && <><button onClick={() => navigate(`${base}/proforma/${record.id}/edit`)}><Pencil size={15}/><span>Edit proforma</span></button><button onClick={() => convert(record.id)}><ArrowRight size={15}/><span>Convert to sale</span></button><button className="danger" onClick={() => cancel(record.id)}><Ban size={15}/><span>Cancel proforma</span></button></>}</div>}</div></td>
          </tr>)}</tbody>
        </table>
        {visibleRecords.length > 0 && (
          <div className="proforma-pagination">
            <div className="proforma-pagination-info">
              Showing <strong>{((currentPage - 1) * pageSize) + 1}</strong> to <strong>{Math.min(currentPage * pageSize, visibleRecords.length)}</strong> of <strong>{visibleRecords.length}</strong> invoices
            </div>
            <div className="proforma-pagination-controls">
              <select
                className="proforma-page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10 / page</option>
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <button
                type="button"
                className="proforma-pager-btn"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </button>
              <span className="proforma-page-indicator">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>
              <button
                type="button"
                className="proforma-pager-btn"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </>}
    </div>
  </section>;
}
