import { useCallback, useEffect, useState } from "react";
import {
  Boxes, ChevronLeft, ChevronRight, CircleAlert, IndianRupee, Layers3,
  Download, LayoutList, MapPin, PackageSearch, Pencil, Save, Search, Table2, X,
} from "lucide-react";
import api from "../../../services/api";
import {
  getCurrentStockPage, getManagementBatches, getProductDetails, getProductLocations,
  updateInventoryBatch, updateInventoryPrices, updateProductBasicInformation,
} from "../../../services/storeInventoryPanelService";
import "./CurrentStockSection.css";

const TABS = [
  { id: "overview", label: "Overview", icon: PackageSearch },
  { id: "pricing", label: "Pricing", icon: IndianRupee },
  { id: "batches", label: "Batches", icon: Layers3 },
  { id: "locations", label: "Locations", icon: MapPin },
];

function readUser() { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } }
function display(value) { return value === null || value === undefined || value === "" ? "-" : value; }
function money(value) { return value == null ? "-" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value)); }
function statusOf(item) {
  const key = item?.stockStatus || (Number(item?.quantity) <= 0 ? "OUT_OF_STOCK" : Number(item?.quantity) <= Number(item?.minimumStock || 0) ? "LOW_STOCK" : "IN_STOCK");
  return { key: key === "IN_STOCK" ? "in" : key === "LOW_STOCK" ? "low" : "out", label: key.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase()) };
}
function errorMessage(error, fallback) { return error.response?.data?.message || fallback; }
function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

function InfoGrid({ rows }) {
  return <div className="stock-info-grid">{rows.map(([label, value]) => <div className="stock-field" key={label}><span>{label}</span><strong>{display(value)}</strong></div>)}</div>;
}

function Modal({ title, children, error, saving, onClose, onSave }) {
  return <div className="stock-modal-backdrop" role="presentation">
    <div className="stock-modal" role="dialog" aria-modal="true" aria-label={title}>
      <header><h3>{title}</h3><button title="Close" onClick={onClose}><X size={18} /></button></header>
      <div className="stock-modal-body">{error && <div className="stock-modal-error" role="alert"><CircleAlert size={17} /><span>{error}</span></div>}{children}</div>
      <footer><button className="stock-secondary-action" onClick={onClose}>Cancel</button><button className="stock-primary-action" disabled={saving} onClick={onSave}><Save size={15} />{saving ? "Saving..." : "Save changes"}</button></footer>
    </div>
  </div>;
}

function Field({ label, ...props }) { return <label className="stock-form-field"><span>{label}</span><input {...props} /></label>; }

export default function CurrentStockSection() {
  const [user] = useState(readUser);
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const canManage = isSuperAdmin || user.role === "STORE_OWNER";
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(user.storeId ? String(user.storeId) : "");
  const [view, setView] = useState("detail");
  const [result, setResult] = useState({ content: [], totalElements: 0, totalPages: 1, number: 0, size: 20 });
  const [selectedId, setSelectedId] = useState(null);
  const [details, setDetails] = useState(null);
  const [batches, setBatches] = useState([]);
  const [locations, setLocations] = useState({ content: [], totalElements: 0 });
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [modalError, setModalError] = useState("");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get("/stores", { params: { page: 0, size: 100, active: true } }).then(({ data }) => {
      const active = Array.isArray(data?.content) ? data.content : [];
      setStores(active);
    }).catch(() => setError("Unable to load stores."));
  }, [isSuperAdmin]);

  const loadPage = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await getCurrentStockPage(storeId, {
        search: search.trim() || undefined, brand: brand.trim() || undefined,
        status: status || undefined, onlyAvailable: view === "table", page, size,
        sortBy: "lastStockUpdated", direction: "DESC",
      });
      setResult(data);
      if (view === "detail") setSelectedId((current) => data.content.some((row) => row.inventoryId === current) ? current : data.content[0]?.inventoryId ?? null);
    } catch (requestError) { setResult({ content: [], totalElements: 0, totalPages: 1, number: 0, size }); setError(errorMessage(requestError, "Unable to load current stock.")); }
    finally { setLoading(false); }
  }, [brand, page, search, size, status, storeId, view]);

  useEffect(() => { const timer = setTimeout(loadPage, 250); return () => clearTimeout(timer); }, [loadPage]);

  const loadDetails = useCallback(async () => {
    if (!selectedId || view !== "detail") return;
    const detailStoreId = storeId || result.content.find((item) => item.inventoryId === selectedId)?.storeId;
    if (!detailStoreId) return;
    try { setDetails(await getProductDetails(detailStoreId, selectedId)); }
    catch (requestError) { setError(errorMessage(requestError, "Unable to load product details.")); }
  }, [result.content, selectedId, storeId, view]);
  useEffect(() => {
    // The request synchronizes the selected row with its backend detail resource.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    if (!selectedId || view !== "detail") return;
    if (tab === "batches") getManagementBatches(selectedId).then(setBatches).catch((e) => setError(errorMessage(e, "Unable to load batches.")));
    if (tab === "locations") getProductLocations(selectedId, 0, 100).then(setLocations).catch((e) => setError(errorMessage(e, "Unable to load locations.")));
  }, [selectedId, tab, view]);

  const openBasic = () => { setModalError(""); setForm({ itemName: details.itemName || "", partNumber: details.partNumber || "", description: details.description || "", hsnCode: details.hsncode || "", gstPercentage: details.gstPercentage ?? "", brandName: details.brandName || "", categoryName: details.categoryName || "" }); setModal("basic"); };
  const openPrices = () => { setModalError(""); setForm({ sellingPrice: details.sellingPrice ?? "", mrp: details.mrp ?? "" }); setModal("prices"); };
  const openBatch = (batch) => { setModalError(""); setForm({ batchId: batch.batchId, purchasePrice: batch.purchasePrice ?? "", sellingPrice: batch.sellingPrice ?? "", mrp: batch.mrp ?? "", rackNumber: batch.rackNumber || "" }); setModal("batch"); };

  const saveModal = async () => {
    setSaving(true); setModalError("");
    try {
      if (modal === "basic") await updateProductBasicInformation(selectedId, { ...form, gstPercentage: form.gstPercentage === "" ? null : Number(form.gstPercentage) });
      if (modal === "prices") await updateInventoryPrices(selectedId, { sellingPrice: Number(form.sellingPrice), mrp: Number(form.mrp) });
      if (modal === "batch") await updateInventoryBatch(form.batchId, { purchasePrice: Number(form.purchasePrice), sellingPrice: Number(form.sellingPrice), mrp: Number(form.mrp), rackNumber: form.rackNumber });
      setModal(null); await loadPage(); await loadDetails();
      if (tab === "batches") setBatches(await getManagementBatches(selectedId));
    } catch (requestError) { setModalError(errorMessage(requestError, "Unable to save changes.")); }
    finally { setSaving(false); }
  };

  const exportStock = async () => {
    if (exporting) return;
    setExporting(true); setError("");
    try {
      const first = await getCurrentStockPage(storeId, {
        search: search.trim() || undefined, brand: brand.trim() || undefined,
        status: status || undefined, onlyAvailable: view === "table",
        page: 0, size: 100, sortBy: "lastStockUpdated", direction: "DESC",
      });
      const rows = [...(first.content || [])];
      for (let nextPage = 1; nextPage < first.totalPages; nextPage += 1) {
        const next = await getCurrentStockPage(storeId, {
          search: search.trim() || undefined, brand: brand.trim() || undefined,
          status: status || undefined, onlyAvailable: view === "table",
          page: nextPage, size: 100, sortBy: "lastStockUpdated", direction: "DESC",
        });
        rows.push(...(next.content || []));
      }
      const lines = [
        ["Part Number", "Item Name", "Available Quantity", "MRP"].map(csvCell).join(","),
        ...rows.map((item) => [item.partNumber, item.itemName, item.quantity, item.mrp].map(csvCell).join(",")),
      ];
      const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `current-stock-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) { setError(errorMessage(requestError, "Unable to export current stock.")); }
    finally { setExporting(false); }
  };

  const changeFilter = (setter) => (event) => { setter(event.target.value); setPage(0); };
  const selectedRow = result.content.find((row) => row.inventoryId === selectedId);
  const current = details?.inventoryId === selectedId ? details : selectedRow;
  const currentStatus = statusOf(current);
  const canEditBasic = details && (isSuperAdmin || details.productSource === "LOCAL");

  return <section className="current-stock-shell">
    <div className="stock-toolbar">
      <div className="stock-view-switch" aria-label="Inventory view">
        <button className={view === "detail" ? "active" : ""} onClick={() => { setView("detail"); setPage(0); }}><LayoutList size={16} />Detail view</button>
        <button className={view === "table" ? "active" : ""} onClick={() => { setView("table"); setPage(0); }}><Table2 size={16} />Available stock</button>
      </div>
      <div className="stock-toolbar-actions">
        {isSuperAdmin && <select className="stock-store-select" value={storeId} onChange={(e) => { setStoreId(e.target.value); setPage(0); }}><option value="">All Stores</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.storeName}</option>)}</select>}
        <button className="stock-export-action" disabled={exporting} onClick={exportStock}><Download size={16} />{exporting ? "Exporting..." : "Export stock"}</button>
      </div>
    </div>
    <div className="stock-global-filters">
      <div className="stock-search"><Search size={17} /><input value={search} onChange={changeFilter(setSearch)} placeholder="Search item, part number or brand" /></div>
      <input className="stock-filter-input" value={brand} onChange={changeFilter(setBrand)} placeholder="Brand" />
      <select value={status} onChange={changeFilter(setStatus)}><option value="">All status</option><option value="IN_STOCK">In stock</option><option value="LOW_STOCK">Low stock</option><option value="OUT_OF_STOCK">Out of stock</option></select>
    </div>
    {error && <div className="stock-alert"><CircleAlert size={17} />{error}<button title="Dismiss" onClick={() => setError("")}><X size={15} /></button></div>}

    {view === "table" ? <div className="stock-table-view">
      <div className="stock-table-wrap"><table><thead><tr>{isSuperAdmin && !storeId && <th>Store</th>}<th>Item</th><th>Part number</th><th>Brand</th><th>Quantity</th><th>Minimum</th><th>Purchase</th><th>Selling</th><th>MRP</th><th>Status</th></tr></thead>
        <tbody>{result.content.map((item) => { const itemStatus = statusOf(item); return <tr key={item.inventoryId} onClick={() => { setSelectedId(item.inventoryId); setView("detail"); }}>{isSuperAdmin && !storeId && <td><strong>{display(item.storeName)}</strong><br /><small>{display(item.storeCode)}</small></td>}<td><strong>{display(item.itemName)}</strong></td><td>{display(item.partNumber)}</td><td>{display(item.brandName)}</td><td><strong>{item.quantity}</strong></td><td>{item.minimumStock}</td><td>{money(item.purchasePrice)}</td><td>{money(item.sellingPrice)}</td><td>{money(item.mrp)}</td><td><span className={`stock-badge ${itemStatus.key}`}>{itemStatus.label}</span></td></tr>; })}{!loading && !result.content.length && <tr><td className="stock-table-empty" colSpan={isSuperAdmin && !storeId ? 10 : 9}>No available stock matches these filters.</td></tr>}</tbody>
      </table></div>
      <Pagination result={result} page={page} size={size} setPage={setPage} setSize={setSize} />
    </div> : <div className="stock-workspace">
      <aside className="stock-browser"><div className="stock-list">{result.content.map((item) => { const rowStatus = statusOf(item); return <button className={`stock-list-row ${selectedId === item.inventoryId ? "selected" : ""}`} key={item.inventoryId} onClick={() => { setSelectedId(item.inventoryId); setDetails(null); setTab("overview"); }}><span className="stock-row-icon"><Boxes size={18} /></span><span className="stock-row-copy"><strong>{display(item.itemName)}</strong><small>{display(item.brandName)} · {display(item.partNumber)}</small></span><span className="stock-row-meta"><span className={`stock-badge ${rowStatus.key}`}>{rowStatus.label}</span><strong>Qty {item.quantity}</strong></span></button>; })}{!loading && !result.content.length && <div className="stock-message">No inventory matches these filters.</div>}</div><Pagination result={result} page={page} size={size} setPage={setPage} setSize={setSize} compact /></aside>
      <div className="stock-detail-panel">{!current ? <div className="stock-empty"><PackageSearch size={30} /><strong>Select an inventory item</strong></div> : <>
        <header className="stock-product-header"><div><div className="stock-title-line"><h2>{display(current.itemName)}</h2><span className={`stock-badge ${currentStatus.key}`}>{currentStatus.label}</span></div><p>{display(current.brandName)} · Part No. {display(current.partNumber)}</p></div><div className="stock-header-actions">{canEditBasic && <button className="stock-secondary-action" onClick={openBasic}><Pencil size={15} />Edit information</button>}{canManage && <button className="stock-primary-action" onClick={openPrices}><IndianRupee size={15} />Edit prices</button>}</div></header>
        <nav className="stock-tabs">{TABS.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={16} />{label}</button>)}</nav>
        <div className="stock-tab-body">
          {tab === "overview" && <div className="stock-section-stack"><div className="stock-section-heading"><div><h3>Product information</h3><p>Catalogue and inventory details</p></div></div><InfoGrid rows={[["Item name", current.itemName], ["Brand", current.brandName], ["Part number", current.partNumber], ["Source", current.productSource], ["Category", current.categoryName], ["Product group", current.productMasterName], ["HSN code", current.hsncode], ["GST rate", current.gstPercentage == null ? "-" : `${current.gstPercentage}%`]]} /><div className="stock-description"><span>Description</span><p>{display(current.description)}</p></div><InfoGrid rows={[["Available quantity", current.quantity || 0], ["Reserved quantity", current.reservedQuantity || 0], ["Damaged quantity", current.damagedQuantity || 0], ["Minimum stock", current.minimumStock || 0]]} /></div>}
          {tab === "pricing" && <div className="stock-price-grid"><div><span>Purchase price</span><strong>{money(current.purchasePrice)}</strong></div><div><span>Selling price</span><strong>{money(current.sellingPrice)}</strong></div><div><span>MRP</span><strong>{money(current.mrp)}</strong></div><div><span>GST rate</span><strong>{current.gstPercentage == null ? "-" : `${current.gstPercentage}%`}</strong></div></div>}
          {tab === "batches" && <BatchTable batches={batches} canManage={canManage} onEdit={openBatch} />}
          {tab === "locations" && <LocationTable locations={locations.content || []} />}
        </div></>}
      </div>
    </div>}

    {modal === "basic" && <Modal title="Edit basic information" error={modalError} saving={saving} onClose={() => { setModal(null); setModalError(""); }} onSave={saveModal}><div className="stock-form-grid"><Field label="Item name" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} /><Field label="Part number" value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} />{details.productSource === "LOCAL" && <><Field label="Brand" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} /><Field label="Category" value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })} /></>}<Field label="HSN code" value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} /><Field label="GST %" type="number" value={form.gstPercentage} disabled={details.productSource === "LOCAL"} onChange={(e) => setForm({ ...form, gstPercentage: e.target.value })} /><label className="stock-form-field full"><span>Description</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label></div></Modal>}
    {modal === "prices" && <Modal title="Edit current FIFO prices" error={modalError} saving={saving} onClose={() => { setModal(null); setModalError(""); }} onSave={saveModal}><div className="stock-form-grid"><Field label="Selling price" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} /><Field label="MRP" type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} /></div></Modal>}
    {modal === "batch" && <Modal title="Edit batch" error={modalError} saving={saving} onClose={() => { setModal(null); setModalError(""); }} onSave={saveModal}><div className="stock-form-grid"><Field label="Purchase price" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} /><Field label="Selling price" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} /><Field label="MRP" type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} /><Field label="Rack number" value={form.rackNumber} onChange={(e) => setForm({ ...form, rackNumber: e.target.value })} /></div></Modal>}
  </section>;
}

function Pagination({ result, page, size, setPage, setSize, compact = false }) { return <footer className="stock-pagination"><span>{result.totalElements ? `${page * size + 1}-${Math.min((page + 1) * size, result.totalElements)} of ${result.totalElements}` : "0 items"}</span><div>{!compact && <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}><option value="10">10 / page</option><option value="20">20 / page</option><option value="50">50 / page</option></select>}<button title="Previous page" disabled={page <= 0} onClick={() => setPage(page - 1)}><ChevronLeft size={17} /></button><strong>{page + 1}</strong><button title="Next page" disabled={page + 1 >= result.totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={17} /></button></div></footer>; }
function BatchTable({ batches, canManage, onEdit }) { return <div className="stock-table-wrap"><table><thead><tr><th>Batch</th><th>Received</th><th>Available</th><th>Purchase</th><th>Selling</th><th>MRP</th><th>Rack</th>{canManage && <th>Action</th>}</tr></thead><tbody>{batches.map((batch) => <tr key={batch.batchId}><td><strong>{batch.batchNumber}</strong></td><td>{batch.receivedDate ? new Date(batch.receivedDate).toLocaleDateString("en-IN") : "-"}</td><td>{batch.availableQuantity}</td><td>{money(batch.purchasePrice)}</td><td>{money(batch.sellingPrice)}</td><td>{money(batch.mrp)}</td><td>{display(batch.rackNumber)}</td>{canManage && <td><button className="stock-icon-action" title="Edit batch" onClick={() => onEdit(batch)}><Pencil size={15} /></button></td>}</tr>)}{!batches.length && <tr><td className="stock-table-empty" colSpan={canManage ? 8 : 7}>No batches found.</td></tr>}</tbody></table></div>; }
function LocationTable({ locations }) { return <div className="stock-table-wrap"><table><thead><tr><th>Store</th><th>Store code</th><th>Quantity</th><th>Minimum</th><th>Selling</th><th>MRP</th><th>Status</th></tr></thead><tbody>{locations.map((location) => { const state = statusOf({ quantity: location.availableQuantity, minimumStock: location.minimumStock, stockStatus: location.stockStatus }); return <tr key={location.inventoryId}><td><strong>{location.storeName}</strong></td><td>{location.storeCode}</td><td>{location.availableQuantity}</td><td>{location.minimumStock}</td><td>{money(location.sellingPrice)}</td><td>{money(location.mrp)}</td><td><span className={`stock-badge ${state.key}`}>{state.label}</span></td></tr>; })}{!locations.length && <tr><td className="stock-table-empty" colSpan="7">No locations found.</td></tr>}</tbody></table></div>; }
