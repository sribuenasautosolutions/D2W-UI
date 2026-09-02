import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Ban, FileText, MoreHorizontal, Pencil, Plus, Search } from "lucide-react";
import { cancelProforma, getProforma, getProformas, toProformaSaleSource } from "../../services/proformaService";
import "./ProformaPage.css";

const displayDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "—";
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const displayNumber = (record) => record?.proformaNumber?.startsWith("D2W-") ? record.proformaNumber : `D2W-${String(record?.storeName || "S").trim().charAt(0).toUpperCase()}-${String(record?.id || 0).padStart(5, "0")}`;

export default function ProformaListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith("/owner/") ? "/owner/sales" : "/store/sales";
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } }, []);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const load = () => getProformas(user?.role === "SUPER_ADMIN" ? null : user?.storeId).then((value) => setRecords(Array.isArray(value) ? value : []));

  useEffect(() => {
    let live = true;
    getProformas(user?.role === "SUPER_ADMIN" ? null : user?.storeId)
      .then((value) => live && setRecords(Array.isArray(value) ? value : []))
      .catch((requestError) => live && setError(requestError?.response?.data?.message || "Unable to load proforma invoices."))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [user]);

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
  const visibleRecords = records.filter((record) => (statusFilter === "ALL" || record.status === statusFilter) && `${record.proformaNumber} ${record.customerName} ${record.customerMobile} ${record.storeName}`.toLowerCase().includes(query.trim().toLowerCase()));
  const totalValue = records.reduce((sum, record) => sum + Number(record.netPayable || 0), 0);
  const openRecords = records.filter((record) => record.status === "SAVED");
  const openValue = openRecords.reduce((sum, record) => sum + Number(record.netPayable || 0), 0);

  return <section className="proforma-page" onClick={() => setOpenMenuId(null)}>
    <header><div><h1>Proforma Invoices</h1></div><button className="proforma-new-button" onClick={() => navigate(`${base}/proforma/new`)}><Plus size={17}/>New Proforma</button></header>
    <div className="proforma-kpis"><div><span>Total Quotations</span><strong>{records.length}</strong><small>{money(totalValue)}</small></div><div><span>Open Balance</span><strong>{openRecords.length}</strong><small>{money(openValue)}</small></div><div><span>Converted</span><strong>{records.filter((record) => record.status === "CONVERTED").length}</strong><small>Completed sales</small></div></div>
    <div className="proforma-filters"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search number, party or store"/></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option><option value="SAVED">Open</option><option value="CONVERTED">Converted</option><option value="CANCELLED">Cancelled</option></select></div>
    <div className="proforma-card">
      {loading ? <div className="proforma-empty">Loading…</div> : error ? <div className="proforma-empty">{error}</div> : records.length === 0 ? <div className="proforma-empty">No Proforma Invoices created yet.</div> : <table>
        <thead><tr><th>Number</th><th>Date</th><th>Party</th><th>Store</th><th>Total</th><th>Status</th><th className="action-heading">Actions</th></tr></thead>
        <tbody>{visibleRecords.map((record) => <tr key={record.id}>
          <td><strong>{displayNumber(record)}</strong></td><td>{displayDate(record.invoiceDate)}</td><td>{record.customerName}</td><td>{record.storeName}</td><td>{money(record.netPayable)}</td><td><span className={`proforma-status ${String(record.status).toLowerCase()}`}>{record.status}</span></td>
          <td className="proforma-actions-cell"><div className="proforma-row-actions"><button className="proforma-kebab" aria-label={`Actions for ${record.proformaNumber}`} aria-expanded={openMenuId === record.id} onClick={(event) => { event.stopPropagation(); setOpenMenuId(openMenuId === record.id ? null : record.id); }}><MoreHorizontal size={19}/></button>{openMenuId === record.id && <div className="proforma-action-menu" onClick={(event) => event.stopPropagation()}><button onClick={() => navigate(`${base}/proforma/${record.id}`)}><FileText size={15}/><span>View invoice</span></button>{record.status === "SAVED" && <><button onClick={() => navigate(`${base}/proforma/${record.id}/edit`)}><Pencil size={15}/><span>Edit proforma</span></button><button onClick={() => convert(record.id)}><ArrowRight size={15}/><span>Convert to sale</span></button><button className="danger" onClick={() => cancel(record.id)}><Ban size={15}/><span>Cancel proforma</span></button></>}</div>}</div></td>
        </tr>)}</tbody>
      </table>}
    </div>
  </section>;
}
