// import { useCallback, useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   ArrowDown, ArrowUp, ArrowUpDown, Boxes, Car, ChevronLeft, ChevronRight, CircleAlert, History, Layers3,
//   Download, MapPin, Package, PackageSearch, Pencil, Save, Search, SlidersHorizontal, X,
// } from "lucide-react";
// import api from "../../../services/api";
// import { getAllBrands } from "../../../services/brandService";
// import {
//   getCurrentStockPage, getManagementBatches, getProductDetails, getProductLocations,
// } from "../../../services/storeInventoryPanelService";
// import "./CurrentStockSection.css";

// const TABS = [
//   { id: "overview", label: "Overview", icon: PackageSearch },
//   { id: "sale-history", label: "Sale History", icon: History },
//   { id: "batches", label: "Batches", icon: Layers3 },
//   { id: "locations", label: "Locations", icon: MapPin },
//   { id: "fitment", label: "Vehicle Fitment", icon: Car },
// ];

// const STATUS_OPTIONS = [
//   { value: "", label: "All", dot: null },
//   { value: "IN_STOCK", label: "In stock", dot: "bg-green-500" },
//   { value: "LOW_STOCK", label: "Low stock", dot: "bg-amber-500" },
//   { value: "OUT_OF_STOCK", label: "Out of stock", dot: "bg-red-500" },
// ];

// // Shared style so every toolbar button (Filters, Export, etc.) looks identical.
// export const TOOLBAR_BUTTON =
//   "h-10 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
// const TOOLBAR_BUTTON_ACTIVE = "border-blue-400 text-blue-600 bg-blue-50 hover:bg-blue-50";

// export function readUser() { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } }
// export function display(value) { return value === null || value === undefined || value === "" ? "-" : value; }
// export function money(value) { return value == null ? "-" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value)); }
// export function statusOf(item) {
//   const key = item?.stockStatus || (Number(item?.quantity) <= 0 ? "OUT_OF_STOCK" : Number(item?.quantity) <= Number(item?.minimumStock || 0) ? "LOW_STOCK" : "IN_STOCK");
//   return { key: key === "IN_STOCK" ? "in" : key === "LOW_STOCK" ? "low" : "out", label: key.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase()) };
// }
// function errorMessage(error, fallback) { return error.response?.data?.message || fallback; }
// function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

// // Static map so Tailwind's build can see every class name it needs to generate
// // (a template-literal class like `sm:grid-cols-${n}` would be invisible to the compiler).
// const GRID_COLUMN_CLASSES = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" };
// export function InfoGrid({ rows, columns = 4 }) {
//   return <div className={`stock-info-grid grid grid-cols-2 ${GRID_COLUMN_CLASSES[columns] || GRID_COLUMN_CLASSES[4]} gap-4`}>{rows.map(([label, value]) => <div className="stock-field" key={label}><span>{label}</span><strong>{display(value)}</strong></div>)}</div>;
// }

// export function Modal({ title, children, error, saving, onClose, onSave }) {
//   // Renders as a right-side slide-over drawer (Stripe/Linear pattern) rather than a centered
//   // dialog. Same fields, same save/close handlers — layout and motion only.
//   return <div className="stock-modal-backdrop" role="presentation" onClick={onClose}>
//     <div className="stock-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
//       <header><h3>{title}</h3><button title="Close" aria-label="Close" onClick={onClose}><X size={18} /></button></header>
//       <div className="stock-modal-body">{error && <div className="stock-modal-error" role="alert"><CircleAlert size={17} /><span>{error}</span></div>}{children}</div>
//       <footer><button className="stock-secondary-action" onClick={onClose}>Cancel</button><button className="stock-primary-action" disabled={saving} onClick={onSave}><Save size={15} />{saving ? "Saving..." : "Save changes"}</button></footer>
//     </div>
//   </div>;
// }

// export function Field({ label, ...props }) { return <label className="stock-form-field"><span>{label}</span><input {...props} /></label>; }
// export function SelectField({ label, children, ...props }) { return <label className="stock-form-field"><span>{label}</span><select {...props}>{children}</select></label>; }

// // Central place for the route to the dedicated product-management page, so both this file
// // and ProductManagePage.jsx agree on the URL shape. Register this path in your router with
// // <Route path="/inventory/products/:inventoryId/manage" element={<ProductManagePage />} />.
// export const productManageRoute = (inventoryId, storeId) =>
//   `/owner/inventory/products/${inventoryId}/manage${
//     storeId ? `?storeId=${storeId}` : ""
//   }`;

// export default function CurrentStockSection() {
//   const navigate = useNavigate();
//   const [user] = useState(readUser);
//   const isSuperAdmin = user.role === "SUPER_ADMIN";
//   const canManage = isSuperAdmin || user.role === "STORE_OWNER";
//   const [stores, setStores] = useState([]);
//   const [brands, setBrands] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [storeId, setStoreId] = useState(user.storeId ? String(user.storeId) : "");
//   const [view, setView] = useState("table");
//   const [result, setResult] = useState({ content: [], totalElements: 0, totalPages: 1, number: 0, size: 20 });
//   const [selectedId, setSelectedId] = useState(null);
//   const [details, setDetails] = useState(null);
//   const [batches, setBatches] = useState([]);
//   const [locations, setLocations] = useState({ content: [], totalElements: 0 });
//   const [saleHistory, setSaleHistory] = useState([]);
//   const [vehicleFitment, setVehicleFitment] = useState([]);
//   const [search, setSearch] = useState("");
//   const [status, setStatus] = useState("");
//   const [brandFilter, setBrandFilter] = useState("");
//   const [categoryFilter, setCategoryFilter] = useState("");
//   const [filtersOpen, setFiltersOpen] = useState(false);
//   const [page, setPage] = useState(0);
//   const [size, setSize] = useState(20);
//   const [sortBy, setSortBy] = useState("lastStockUpdated");
//   const [sortDirection, setSortDirection] = useState("DESC");
//   const [tab, setTab] = useState("overview");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [exporting, setExporting] = useState(false);

//   const searchInputRef = useRef(null);
//   const filtersRef = useRef(null);

//   useEffect(() => {
//     if (!isSuperAdmin) return;
//     api.get("/stores", { params: { page: 0, size: 100, active: true } }).then(({ data }) => {
//       const active = Array.isArray(data?.content) ? data.content : [];
//       setStores(active);
//     }).catch(() => setError("Unable to load stores."));
//   }, [isSuperAdmin]);

//   useEffect(() => {
//     getAllBrands().then((data) => setBrands(Array.isArray(data) ? data : data?.content || []))
//       .catch(() => setBrands([]));
//   }, []);

//   useEffect(() => {
//     api.get("/categories", { params: { page: 0, size: 100 } }).then(({ data }) => {
//       setCategories(Array.isArray(data) ? data : data?.content || []);
//     }).catch(() => setCategories([]));
//   }, []);

//   // Close the Filters popover when clicking outside of it.
//   useEffect(() => {
//     const handleClick = (event) => {
//       if (filtersOpen && filtersRef.current && !filtersRef.current.contains(event.target)) setFiltersOpen(false);
//     };
//     document.addEventListener("mousedown", handleClick);
//     return () => document.removeEventListener("mousedown", handleClick);
//   }, [filtersOpen]);

//   const loadPage = useCallback(async () => {
//     setLoading(true); setError("");
//     try {
//       const data = await getCurrentStockPage(storeId, {
//         search: search.trim() || undefined,
//         status: status || undefined,
//         brandName: brandFilter || undefined,
//         categoryName: categoryFilter || undefined,
//         onlyAvailable: view === "table", page, size,
//         sortBy, direction: sortDirection,
//       });
//       setResult(data);
//       if (view === "detail") setSelectedId((current) => data.content.some((row) => row.inventoryId === current) ? current : data.content[0]?.inventoryId ?? null);
//     } catch (requestError) { setResult({ content: [], totalElements: 0, totalPages: 1, number: 0, size }); setError(errorMessage(requestError, "Unable to load current stock.")); }
//     finally { setLoading(false); }
//   }, [brandFilter, categoryFilter, page, search, size, sortBy, sortDirection, status, storeId, view]);

//   useEffect(() => { const timer = setTimeout(loadPage, 250); return () => clearTimeout(timer); }, [loadPage]);

//   // Ctrl/Cmd+K focuses the unified search field from anywhere on the page.
//   useEffect(() => {
//     const handler = (event) => {
//       if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
//         event.preventDefault();
//         searchInputRef.current?.focus();
//       }
//     };
//     window.addEventListener("keydown", handler);
//     return () => window.removeEventListener("keydown", handler);
//   }, []);

//   const loadDetails = useCallback(async () => {
//     if (!selectedId || view !== "detail") return;
//     const detailStoreId = storeId || result.content.find((item) => item.inventoryId === selectedId)?.storeId;
//     if (!detailStoreId) return;
//     try { setDetails(await getProductDetails(detailStoreId, selectedId)); }
//     catch (requestError) { setError(errorMessage(requestError, "Unable to load product details.")); }
//   }, [result.content, selectedId, storeId, view]);
//   useEffect(() => {
//     // The request synchronizes the selected row with its backend detail resource.
//     loadDetails();
//   }, [loadDetails]);

//   useEffect(() => {
//     if (!selectedId || view !== "detail") return;
//     if (tab === "batches") getManagementBatches(selectedId).then(setBatches).catch((e) => setError(errorMessage(e, "Unable to load batches.")));
//     if (tab === "locations") getProductLocations(selectedId, 0, 100).then(setLocations).catch((e) => setError(errorMessage(e, "Unable to load locations.")));
//     // NOTE: /inventory/:id/sales-history and /inventory/:id/vehicle-fitment are placeholder
//     // endpoints — swap these for whatever your backend actually exposes for these two tabs.
//     if (tab === "sale-history") api.get(`/inventory/${selectedId}/sales-history`, { params: { page: 0, size: 100 } })
//       .then(({ data }) => setSaleHistory(Array.isArray(data) ? data : data?.content || []))
//       .catch((e) => setError(errorMessage(e, "Unable to load sale history.")));
//     if (tab === "fitment") api.get(`/inventory/${selectedId}/vehicle-fitment`, { params: { page: 0, size: 100 } })
//       .then(({ data }) => setVehicleFitment(Array.isArray(data) ? data : data?.content || []))
//       .catch((e) => setError(errorMessage(e, "Unable to load vehicle fitment.")));
//   }, [selectedId, tab, view]);

//   const goToManagePage = () => {
//     const detailStoreId = storeId || result.content.find((item) => item.inventoryId === selectedId)?.storeId;
//     navigate(productManageRoute(selectedId, detailStoreId));
//   };

//   const toggleSort = (field) => {
//     setSortBy((current) => {
//       if (current === field) { setSortDirection((direction) => (direction === "ASC" ? "DESC" : "ASC")); return current; }
//       setSortDirection("ASC");
//       return field;
//     });
//     setPage(0);
//   };

//   const exportStock = async () => {
//     if (exporting) return;
//     setExporting(true); setError("");
//     try {
//       const first = await getCurrentStockPage(storeId, {
//         search: search.trim() || undefined,
//         status: status || undefined,
//         brandName: brandFilter || undefined,
//         categoryName: categoryFilter || undefined,
//         onlyAvailable: view === "table",
//         page: 0, size: 100, sortBy, direction: sortDirection,
//       });
//       const rows = [...(first.content || [])];
//       for (let nextPage = 1; nextPage < first.totalPages; nextPage += 1) {
//         const next = await getCurrentStockPage(storeId, {
//           search: search.trim() || undefined,
//           status: status || undefined,
//           brandName: brandFilter || undefined,
//           categoryName: categoryFilter || undefined,
//           onlyAvailable: view === "table",
//           page: nextPage, size: 100, sortBy, direction: sortDirection,
//         });
//         rows.push(...(next.content || []));
//       }
//       const lines = [
//         ["Part Number", "Item Name", "Available Quantity", "MRP"].map(csvCell).join(","),
//         ...rows.map((item) => [item.partNumber, item.itemName, item.quantity, item.mrp].map(csvCell).join(",")),
//       ];
//       const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
//       const url = URL.createObjectURL(blob);
//       const link = document.createElement("a");
//       link.href = url;
//       link.download = `current-stock-${new Date().toISOString().slice(0, 10)}.csv`;
//       document.body.appendChild(link);
//       link.click();
//       link.remove();
//       URL.revokeObjectURL(url);
//     } catch (requestError) { setError(errorMessage(requestError, "Unable to export current stock.")); }
//     finally { setExporting(false); }
//   };

//   const changeFilter = (setter) => (event) => { setter(event.target.value); setPage(0); };
//   const selectedRow = result.content.find((row) => row.inventoryId === selectedId);
//   const current = details?.inventoryId === selectedId ? details : selectedRow;
//   const currentStatus = statusOf(current);
//   // Store column is a role-based access point: only a super admin sees which store a row belongs to.
//   const showStoreColumn = isSuperAdmin;
//   const columnCount = showStoreColumn ? 9 : 8;
//   const activeFilterCount = [brandFilter, categoryFilter].filter(Boolean).length;
//   const resetFilters = () => { setSearch(""); setStatus(""); setBrandFilter(""); setCategoryFilter(""); setPage(0); };
//   const clearAdvancedFilters = () => { setBrandFilter(""); setCategoryFilter(""); setPage(0); };
//   const badgeClasses = { in: "bg-green-50 text-green-700", low: "bg-amber-50 text-amber-700", out: "bg-red-50 text-red-700" };

//   return <section className="current-stock-shell h-full flex flex-col min-h-0">
//     <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
//       <div className="relative flex-1 min-w-[240px] max-w-md">
//         <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
//         <input
//           ref={searchInputRef}
//           value={search}
//           onChange={changeFilter(setSearch)}
//           placeholder="Search item, part number, brand or SKU"
//           className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-9 pr-16 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
//         />
//         <kbd className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-400">Ctrl K</kbd>
//       </div>

//       <div className="relative" ref={filtersRef}>
//         <button
//           type="button"
//           onClick={() => setFiltersOpen((open) => !open)}
//           aria-expanded={filtersOpen}
//           className={`${TOOLBAR_BUTTON} ${activeFilterCount > 0 || filtersOpen ? TOOLBAR_BUTTON_ACTIVE : ""}`}
//         >
//           <SlidersHorizontal size={16} aria-hidden="true" />
//           Filters
//           {activeFilterCount > 0 && (
//             <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold text-white">
//               {activeFilterCount}
//             </span>
//           )}
//         </button>

//         {filtersOpen && (
//           <div className="absolute left-0 z-20 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
//             <div className="flex items-center justify-between mb-3">
//               <h4 className="text-sm font-semibold text-slate-800">Filters</h4>
//               <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="text-slate-400 hover:text-slate-600">
//                 <X size={16} />
//               </button>
//             </div>

//             <div className="space-y-3">
//               <label className="block">
//                 <span className="mb-1 block text-xs font-medium text-slate-500">Brand</span>
//                 <select
//                   value={brandFilter}
//                   onChange={changeFilter(setBrandFilter)}
//                   className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//                 >
//                   <option value="">All brands</option>
//                   {brands.map((brand) => (
//                     <option key={brand.id ?? brand.brandId ?? brand.brandName} value={brand.brandName || brand.name}>
//                       {brand.brandName || brand.name}
//                     </option>
//                   ))}
//                 </select>
//               </label>

//               <label className="block">
//                 <span className="mb-1 block text-xs font-medium text-slate-500">Category</span>
//                 <select
//                   value={categoryFilter}
//                   onChange={changeFilter(setCategoryFilter)}
//                   className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//                 >
//                   <option value="">All categories</option>
//                   {categories.map((category) => (
//                     <option key={category.id ?? category.categoryId ?? category.categoryName} value={category.categoryName || category.name}>
//                       {category.categoryName || category.name}
//                     </option>
//                   ))}
//                 </select>
//               </label>
//             </div>

//             <div className="mt-4 flex items-center justify-between">
//               <button type="button" onClick={clearAdvancedFilters} className="text-xs font-medium text-slate-500 hover:text-slate-700">
//                 Clear filters
//               </button>
//               <button type="button" onClick={() => setFiltersOpen(false)} className={`${TOOLBAR_BUTTON} h-9 px-3`}>
//                 Done
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {view === "table" && (
//       <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label="Filter by status">
//         {STATUS_OPTIONS.map((option) => {
//           const active = status === option.value;
//           return (
//             <button
//               key={option.value || "all"}
//               type="button"
//               onClick={() => { setStatus(option.value); setPage(0); }}
//               aria-pressed={active}
//               className={`h-8 inline-flex items-center gap-1.5 rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors ${active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
//             >
//               {option.dot && <span className={`h-1.5 w-1.5 rounded-full ${option.dot}`} aria-hidden="true" />}
//               {option.label}
//             </button>
//           );
//         })}
//       </div>
//       )}

//       {view === "table" && (
//       <div className="flex items-center gap-2 ml-auto">
//         {isSuperAdmin && (
//           <select
//             aria-label="Filter by store"
//             value={storeId}
//             onChange={(e) => { setStoreId(e.target.value); setPage(0); }}
//             className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//           >
//             <option value="">All stores</option>
//             {stores.map((store) => <option key={store.id} value={store.id}>{store.storeName}</option>)}
//           </select>
//         )}
//         <button
//           type="button"
//           disabled={exporting}
//           onClick={exportStock}
//           className={TOOLBAR_BUTTON}
//         >
//           <Download size={15} aria-hidden="true" />
//           {exporting ? "Exporting…" : "Export stock"}
//         </button>
//       </div>
//       )}
//     </div>

//     {error && <div className="stock-alert shrink-0" role="alert"><CircleAlert size={17} />{error}<button title="Dismiss" aria-label="Dismiss error" onClick={() => setError("")}><X size={15} /></button></div>}

//     {view === "table" ? <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col flex-1 min-h-0">
//       <div className="flex-1 min-h-0 overflow-y-auto">
//       <table className="w-full table-fixed text-sm">
//         <colgroup>
//           <col style={{ width: showStoreColumn ? "13%" : "14%" }} />
//           <col style={{ width: showStoreColumn ? "19%" : "22%" }} />
//           <col style={{ width: showStoreColumn ? "11%" : "12%" }} />
//           <col style={{ width: "8%" }} />
//           <col style={{ width: showStoreColumn ? "10%" : "11%" }} />
//           <col style={{ width: showStoreColumn ? "10%" : "11%" }} />
//           <col style={{ width: showStoreColumn ? "10%" : "11%" }} />
//           {showStoreColumn && <col style={{ width: "11%" }} />}
//           <col style={{ width: showStoreColumn ? "8%" : "9%" }} />
//         </colgroup>
//         <thead className="sticky top-0 z-10">
//           <tr className="bg-slate-50 border-b border-slate-200">
//             <th className="text-left font-medium text-slate-600 px-4 py-3">
//               <button type="button" onClick={() => toggleSort("partNumber")} className="inline-flex items-center gap-1 hover:text-slate-800">
//                 Part number
//                 {sortBy === "partNumber" ? (sortDirection === "ASC" ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} className="text-slate-300" />}
//               </button>
//             </th>
//             <th className="text-left font-medium text-slate-600 px-4 py-3">Item name</th>
//             <th className="text-left font-medium text-slate-600 px-4 py-3">Brand</th>
//             <th className="text-left font-medium text-slate-600 px-4 py-3">Quantity</th>
//             <th className="text-left font-medium text-slate-600 px-4 py-3">Purchase price</th>
//             <th className="text-left font-medium text-slate-600 px-4 py-3">Selling price</th>
//             <th className="text-left font-medium text-slate-600 px-4 py-3">
//               <button type="button" onClick={() => toggleSort("mrp")} className="inline-flex items-center gap-1 hover:text-slate-800">
//                 MRP
//                 {sortBy === "mrp" ? (sortDirection === "ASC" ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} className="text-slate-300" />}
//               </button>
//             </th>
//             {showStoreColumn && <th className="text-left font-medium text-slate-600 px-4 py-3">Store</th>}
//             <th className="text-left font-medium text-slate-600 px-4 py-3">Status</th>
//           </tr>
//         </thead>
//         <tbody>
//           {result.content.map((item) => {
//             const itemStatus = statusOf(item);
//             return (
//               <tr
//                 key={item.inventoryId}
//                 onClick={() => { setSelectedId(item.inventoryId); setView("detail"); }}
//                 className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer"
//               >
//                 <td className="px-4 py-3 align-middle text-slate-600 truncate" title={item.partNumber}>{display(item.partNumber)}</td>
//                 <td className="px-4 py-3 align-middle">
//                   <div className="flex items-center gap-2.5 min-w-0">
//                     <span className="shrink-0 h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
//                       <Package size={16} aria-hidden="true" />
//                     </span>
//                     <span className="truncate font-medium text-slate-800" title={item.itemName}>{display(item.itemName)}</span>
//                   </div>
//                 </td>
//                 <td className="px-4 py-3 align-middle text-slate-600 truncate" title={item.brandName}>{display(item.brandName)}</td>
//                 <td className="px-4 py-3 align-middle font-medium text-slate-800">{item.quantity}</td>
//                 <td className="px-4 py-3 align-middle text-slate-600 truncate">{money(item.purchasePrice)}</td>
//                 <td className="px-4 py-3 align-middle text-slate-600 truncate">{money(item.sellingPrice)}</td>
//                 <td className="px-4 py-3 align-middle text-slate-600 truncate">{money(item.mrp)}</td>
//                 {showStoreColumn && (
//                   <td className="px-4 py-3 align-middle">
//                     <div className="truncate font-medium text-slate-800" title={item.storeName}>{display(item.storeName)}</div>
//                     <div className="truncate text-xs text-slate-400">{display(item.storeCode)}</div>
//                   </td>
//                 )}
//                 <td className="px-4 py-3 align-middle">
//                   <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${badgeClasses[itemStatus.key]}`}>{itemStatus.label}</span>
//                 </td>
//               </tr>
//             );
//           })}
//           {!loading && !result.content.length && (
//             <tr>
//               <td className="px-4 py-10 text-center text-sm text-slate-400" colSpan={columnCount}>No available stock matches these filters.</td>
//             </tr>
//           )}
//         </tbody>
//       </table>
//       </div>
//       <div className="shrink-0">
//         <Pagination result={result} page={page} size={size} setPage={setPage} setSize={setSize} />
//       </div>
//     </div> : <div className="stock-workspace flex-1 min-h-0 flex gap-4 overflow-hidden">
//       <aside className="stock-browser h-full min-h-0 flex flex-col overflow-hidden"><div className="stock-list flex-1 min-h-0 overflow-y-auto">{result.content.map((item) => { const rowStatus = statusOf(item); return <button className={`stock-list-row ${selectedId === item.inventoryId ? "selected" : ""}`} key={item.inventoryId} onClick={() => { setSelectedId(item.inventoryId); setDetails(null); setTab("overview"); }}><span className="stock-row-icon"><Boxes size={18} /></span><span className="stock-row-copy"><strong>{display(item.itemName)}</strong><small>{display(item.brandName)} · {display(item.partNumber)}</small></span><span className="stock-row-meta"><span className={`stock-badge ${rowStatus.key}`}>{rowStatus.label}</span><strong>Qty {item.quantity}</strong></span></button>; })}{!loading && !result.content.length && <div className="stock-message">No inventory matches these filters.</div>}</div><div className="shrink-0"><Pagination result={result} page={page} size={size} setPage={setPage} setSize={setSize} compact /></div></aside>
//       <div className="stock-detail-panel h-full min-h-0 flex-1 flex flex-col overflow-hidden">{!current ? <div className="stock-empty"><PackageSearch size={30} /><strong>Select an inventory item</strong></div> : <>
//         <header className="stock-product-header shrink-0">
//           <div className="stock-product-identity">
//             <div className="stock-product-avatar" aria-hidden="true"><Boxes size={24} /></div>
//             <div><div className="stock-title-line"><h2>{display(current.itemName)}</h2><span className={`stock-badge ${currentStatus.key}`}>{currentStatus.label}</span></div><p>{display(current.brandName)} · Part No. {display(current.partNumber)}</p></div>
//           </div>
//           <div className="stock-header-actions flex items-center gap-2 shrink-0">
//             {canManage && <button className="h-10 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" onClick={goToManagePage}><Pencil size={15} />Edit</button>}
//             <button
//               type="button"
//               title="Close"
//               aria-label="Close"
//               onClick={() => { setView("table"); setTab("overview"); }}
//               className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-red-50 transition-colors"
//             >
//               <X size={16} className="text-red-600" />
//             </button>
//           </div>
//         </header>
//         <nav className="stock-tabs shrink-0" role="tablist">{TABS.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={16} />{label}</button>)}</nav>
//         <div className="stock-tab-body flex-1 min-h-0 overflow-y-auto" key={tab} role="tabpanel">
//           {tab === "overview" && <div className="stock-section-stack"><div className="stock-section-heading"><div><h3>Product information</h3><p>Catalogue and inventory details</p></div></div><InfoGrid columns={4} rows={[["Item name", current.itemName], ["Brand", current.brandName], ["Part number", current.partNumber], ["HSN code", current.hsncode]]} /><div className="flex flex-wrap gap-3"><div className="rounded-lg border border-slate-200 bg-white px-4 py-3"><div className="text-xs font-medium text-slate-500">Available quantity</div><div className="mt-1 text-lg font-semibold text-slate-800">{current.quantity || 0}</div></div><div className="rounded-lg border border-slate-200 bg-white px-4 py-3"><div className="text-xs font-medium text-slate-500">Damaged quantity</div><div className="mt-1 text-lg font-semibold text-slate-800">{current.damagedQuantity || 0}</div></div></div></div>}
//           {tab === "sale-history" && <SaleHistoryTable sales={saleHistory} />}
//           {tab === "batches" && <BatchTable batches={batches} />}
//           {tab === "locations" && <LocationTable locations={locations.content || []} />}
//           {tab === "fitment" && <VehicleFitmentTable fitments={vehicleFitment} />}
//         </div></>}
//       </div>
//     </div>}
//   </section>;
// }

// function Pagination({ result, page, size, setPage, setSize, compact = false }) { return <footer className="stock-pagination"><span>{result.totalElements ? `${page * size + 1}-${Math.min((page + 1) * size, result.totalElements)} of ${result.totalElements}` : "0 items"}</span><div>{!compact && <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} aria-label="Rows per page"><option value="10">10 / page</option><option value="20">20 / page</option><option value="50">50 / page</option></select>}<button title="Previous page" aria-label="Previous page" disabled={page <= 0} onClick={() => setPage(page - 1)}><ChevronLeft size={17} /></button><strong>{page + 1}</strong><button title="Next page" aria-label="Next page" disabled={page + 1 >= result.totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={17} /></button></div></footer>; }
// function BatchTable({ batches }) { return <div className="stock-table-wrap"><table><thead><tr><th>Batch</th><th>Received</th><th>Available</th><th>Purchase</th><th>Selling</th><th>MRP</th><th>Rack</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.batchId}><td><strong>{batch.batchNumber}</strong></td><td>{batch.receivedDate ? new Date(batch.receivedDate).toLocaleDateString("en-IN") : "-"}</td><td>{batch.availableQuantity}</td><td>{money(batch.purchasePrice)}</td><td>{money(batch.sellingPrice)}</td><td>{money(batch.mrp)}</td><td>{display(batch.rackNumber)}</td></tr>)}{!batches.length && <tr><td className="stock-table-empty" colSpan={7}>No batches found.</td></tr>}</tbody></table></div>; }
// // NOTE: "storeLocation" is a placeholder field name — point it at whatever your API returns
// // for a store's physical location/address if the key differs.
// function LocationTable({ locations }) { return <div className="stock-table-wrap"><table><thead><tr><th>Store</th><th>Store location</th><th>Quantity</th><th>MRP</th></tr></thead><tbody>{locations.map((location) => <tr key={location.inventoryId}><td><strong>{location.storeName}</strong></td><td>{display(location.storeLocation || location.address)}</td><td>{location.availableQuantity}</td><td>{money(location.mrp)}</td></tr>)}{!locations.length && <tr><td className="stock-table-empty" colSpan={4}>No locations found.</td></tr>}</tbody></table></div>; }
// // NOTE: sale-history fields (invoiceNumber, saleDate, quantitySold, salePrice, totalAmount) are
// // placeholders — line these up with your actual sales/transactions response shape.
// function SaleHistoryTable({ sales }) { return <div className="stock-table-wrap"><table><thead><tr><th>Invoice</th><th>Date</th><th>Qty sold</th><th>Sale price</th><th>Total</th></tr></thead><tbody>{sales.map((sale, index) => <tr key={sale.id ?? sale.invoiceNumber ?? index}><td><strong>{display(sale.invoiceNumber)}</strong></td><td>{sale.saleDate ? new Date(sale.saleDate).toLocaleDateString("en-IN") : "-"}</td><td>{display(sale.quantitySold)}</td><td>{money(sale.salePrice)}</td><td>{money(sale.totalAmount)}</td></tr>)}{!sales.length && <tr><td className="stock-table-empty" colSpan={5}>No sale history found.</td></tr>}</tbody></table></div>; }
// // NOTE: vehicle-fitment fields (make, model, variant, fromYear, toYear) are placeholders —
// // line these up with your actual fitment response shape.
// function VehicleFitmentTable({ fitments }) { return <div className="stock-table-wrap"><table><thead><tr><th>Make</th><th>Model</th><th>Variant</th><th>Year</th></tr></thead><tbody>{fitments.map((fitment, index) => <tr key={fitment.id ?? index}><td><strong>{display(fitment.make)}</strong></td><td>{display(fitment.model)}</td><td>{display(fitment.variant)}</td><td>{fitment.fromYear || fitment.toYear ? `${fitment.fromYear ?? "-"} - ${fitment.toYear ?? "-"}` : "-"}</td></tr>)}{!fitments.length && <tr><td className="stock-table-empty" colSpan={4}>No vehicle fitment found.</td></tr>}</tbody></table></div>; }


import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Car,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  History,
  Layers3,
  MapPin,
  Package,
  PackageSearch,
  Pencil,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import api from "../../../services/api";
import { getAllBrands } from "../../../services/brandService";
import {
  getCurrentStockPage,
  getManagementBatches,
  getProductDetails,
  getProductLocations,
} from "../../../services/storeInventoryPanelService";

import "./CurrentStockSection.css";

const TABS = [
  {
    id: "overview",
    label: "Overview",
    icon: PackageSearch,
  },
  {
    id: "sale-history",
    label: "Sale History",
    icon: History,
  },
  {
    id: "batches",
    label: "Batches",
    icon: Layers3,
  },
  {
    id: "locations",
    label: "Locations",
    icon: MapPin,
  },
  {
    id: "fitment",
    label: "Vehicle Fitment",
    icon: Car,
  },
];

const STATUS_OPTIONS = [
  {
    value: "",
    label: "All",
    dot: "",
  },
  {
    value: "IN_STOCK",
    label: "In stock",
    dot: "stock-dot-green",
  },
  {
    value: "LOW_STOCK",
    label: "Low stock",
    dot: "stock-dot-yellow",
  },
  {
    value: "OUT_OF_STOCK",
    label: "Out of stock",
    dot: "stock-dot-red",
  },
];

export const TOOLBAR_BUTTON =
  "h-10 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

const TOOLBAR_BUTTON_ACTIVE =
  "border-blue-400 bg-blue-50 text-blue-600 hover:bg-blue-50";

export function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

export function display(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

export function money(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "-";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numericValue);
}

export function statusOf(item) {
  const quantity = Number(item?.quantity || 0);
  const minimumStock = Number(item?.minimumStock || 0);

  const statusKey =
    item?.stockStatus ||
    (quantity <= 0
      ? "OUT_OF_STOCK"
      : quantity <= minimumStock
        ? "LOW_STOCK"
        : "IN_STOCK");

  if (statusKey === "OUT_OF_STOCK") {
    return {
      key: "out",
      label: "Out of stock",
    };
  }

  if (statusKey === "LOW_STOCK") {
    return {
      key: "low",
      label: "Low stock",
    };
  }

  return {
    key: "in",
    label: "In stock",
  };
}

function errorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || fallbackMessage;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function SortIndicator({ active, direction }) {
  return (
    <span className="sort-indicator" aria-hidden="true">
      <ArrowUp
        size={11}
        className={
          active && direction === "ASC" ? "sort-arrow-active" : ""
        }
      />

      <ArrowDown
        size={11}
        className={
          active && direction === "DESC" ? "sort-arrow-active" : ""
        }
      />
    </span>
  );
}

export function InfoGrid({ rows, columns = 4 }) {
  return (
    <div
      className={`stock-info-grid stock-info-grid-${columns}`}
    >
      {rows.map(([label, value]) => (
        <div className="stock-field" key={label}>
          <span>{label}</span>
          <strong>{display(value)}</strong>
        </div>
      ))}
    </div>
  );
}

export const productManageRoute = (inventoryId, storeId) => {
  const query = storeId
    ? `?storeId=${encodeURIComponent(storeId)}`
    : "";

  return `/owner/inventory/products/${inventoryId}/manage${query}`;
};

export default function CurrentStockSection() {
  const navigate = useNavigate();

  const [user] = useState(readUser);

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const canManage =
    isSuperAdmin || user.role === "STORE_OWNER";

  const [stores, setStores] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  const [storeId, setStoreId] = useState(
    user.storeId ? String(user.storeId) : ""
  );

  const [view, setView] = useState("table");

  const [result, setResult] = useState({
    content: [],
    totalElements: 0,
    totalPages: 1,
    number: 0,
    size: 20,
  });

  const [selectedId, setSelectedId] = useState(null);
  const [details, setDetails] = useState(null);

  const [batches, setBatches] = useState([]);
  const [locations, setLocations] = useState({
    content: [],
    totalElements: 0,
  });
  const [saleHistory, setSaleHistory] = useState([]);
  const [vehicleFitment, setVehicleFitment] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [sortBy, setSortBy] = useState("lastStockUpdated");
  const [sortDirection, setSortDirection] = useState("DESC");

  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const searchInputRef = useRef(null);
  const filtersRef = useRef(null);

  /*
   * Load stores for SUPER_ADMIN.
   */
  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    api
      .get("/stores", {
        params: {
          page: 0,
          size: 100,
          active: true,
        },
      })
      .then(({ data }) => {
        setStores(
          Array.isArray(data?.content)
            ? data.content
            : Array.isArray(data)
              ? data
              : []
        );
      })
      .catch((requestError) => {
        setError(
          errorMessage(requestError, "Unable to load stores.")
        );
      });
  }, [isSuperAdmin]);

  /*
   * Load brands.
   */
  useEffect(() => {
    getAllBrands()
      .then((data) => {
        setBrands(
          Array.isArray(data)
            ? data
            : data?.content || []
        );
      })
      .catch(() => {
        setBrands([]);
      });
  }, []);

  /*
   * Load categories.
   */
  useEffect(() => {
    api
      .get("/categories", {
        params: {
          page: 0,
          size: 100,
        },
      })
      .then(({ data }) => {
        setCategories(
          Array.isArray(data)
            ? data
            : data?.content || []
        );
      })
      .catch(() => {
        setCategories([]);
      });
  }, []);

  /*
   * Close filters when clicking outside.
   */
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        filtersOpen &&
        filtersRef.current &&
        !filtersRef.current.contains(event.target)
      ) {
        setFiltersOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [filtersOpen]);

  /*
   * Ctrl + K focuses the search field.
   */
  useEffect(() => {
    const handleKeyboardShortcut = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyboardShortcut
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboardShortcut
      );
    };
  }, []);

  /*
   * Load current stock.
   */
  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getCurrentStockPage(storeId, {
        search: search.trim() || undefined,
        status: status || undefined,
        brandName: brandFilter || undefined,
        categoryName: categoryFilter || undefined,
        onlyAvailable: view === "table",
        page,
        size,
        sortBy,
        direction: sortDirection,
      });

      const safeData = {
        content: Array.isArray(data?.content)
          ? data.content
          : [],
        totalElements: data?.totalElements || 0,
        totalPages: data?.totalPages || 1,
        number: data?.number || 0,
        size: data?.size || size,
      };

      setResult(safeData);

      if (view === "detail") {
        setSelectedId((currentSelectedId) => {
          const selectedStillExists = safeData.content.some(
            (row) =>
              row.inventoryId === currentSelectedId
          );

          return selectedStillExists
            ? currentSelectedId
            : safeData.content[0]?.inventoryId || null;
        });
      }
    } catch (requestError) {
      setResult({
        content: [],
        totalElements: 0,
        totalPages: 1,
        number: 0,
        size,
      });

      setError(
        errorMessage(
          requestError,
          "Unable to load current stock."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [
    storeId,
    search,
    status,
    brandFilter,
    categoryFilter,
    view,
    page,
    size,
    sortBy,
    sortDirection,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPage();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadPage]);

  /*
   * Load selected product details.
   */
  const loadDetails = useCallback(async () => {
    if (!selectedId || view !== "detail") {
      return;
    }

    const selectedRow = result.content.find(
      (item) => item.inventoryId === selectedId
    );

    const detailStoreId =
      storeId || selectedRow?.storeId;

    if (!detailStoreId) {
      return;
    }

    try {
      const data = await getProductDetails(
        detailStoreId,
        selectedId
      );

      setDetails(data);
    } catch (requestError) {
      setError(
        errorMessage(
          requestError,
          "Unable to load product details."
        )
      );
    }
  }, [selectedId, view, result.content, storeId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  /*
   * Load tab-specific data.
   */
  useEffect(() => {
    if (!selectedId || view !== "detail") {
      return;
    }

    if (tab === "batches") {
      getManagementBatches(selectedId)
        .then((data) => {
          setBatches(Array.isArray(data) ? data : []);
        })
        .catch((requestError) => {
          setError(
            errorMessage(
              requestError,
              "Unable to load batches."
            )
          );
        });
    }

    if (tab === "locations") {
      getProductLocations(selectedId, 0, 100)
        .then((data) => {
          setLocations(
            data || {
              content: [],
              totalElements: 0,
            }
          );
        })
        .catch((requestError) => {
          setError(
            errorMessage(
              requestError,
              "Unable to load locations."
            )
          );
        });
    }

    if (tab === "sale-history") {
      api
        .get(`/inventory/${selectedId}/sales-history`, {
          params: {
            page: 0,
            size: 100,
          },
        })
        .then(({ data }) => {
          setSaleHistory(
            Array.isArray(data)
              ? data
              : data?.content || []
          );
        })
        .catch((requestError) => {
          setError(
            errorMessage(
              requestError,
              "Unable to load sale history."
            )
          );
        });
    }

    if (tab === "fitment") {
      api
        .get(`/inventory/${selectedId}/vehicle-fitment`, {
          params: {
            page: 0,
            size: 100,
          },
        })
        .then(({ data }) => {
          setVehicleFitment(
            Array.isArray(data)
              ? data
              : data?.content || []
          );
        })
        .catch((requestError) => {
          setError(
            errorMessage(
              requestError,
              "Unable to load vehicle fitment."
            )
          );
        });
    }
  }, [selectedId, tab, view]);

  const toggleSort = (field) => {
    setSortBy((currentField) => {
      if (currentField === field) {
        setSortDirection((currentDirection) =>
          currentDirection === "ASC"
            ? "DESC"
            : "ASC"
        );

        return currentField;
      }

      setSortDirection("ASC");
      return field;
    });

    setPage(0);
  };

  const goToManagePage = () => {
    if (!selectedId) {
      return;
    }

    const selectedRow = result.content.find(
      (row) => row.inventoryId === selectedId
    );

    const detailStoreId =
      storeId || selectedRow?.storeId;

    navigate(
      productManageRoute(selectedId, detailStoreId)
    );
  };

  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(0);
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setBrandFilter("");
    setCategoryFilter("");
    setPage(0);
  };

  const clearAdvancedFilters = () => {
    setBrandFilter("");
    setCategoryFilter("");
    setPage(0);
  };

  const exportStock = async () => {
    if (exporting) {
      return;
    }

    try {
      setExporting(true);
      setError("");

      const firstPage = await getCurrentStockPage(storeId, {
        search: search.trim() || undefined,
        status: status || undefined,
        brandName: brandFilter || undefined,
        categoryName: categoryFilter || undefined,
        onlyAvailable: view === "table",
        page: 0,
        size: 100,
        sortBy,
        direction: sortDirection,
      });

      const rows = [
        ...(firstPage?.content || []),
      ];

      for (
        let nextPage = 1;
        nextPage < (firstPage?.totalPages || 1);
        nextPage += 1
      ) {
        const nextResult = await getCurrentStockPage(
          storeId,
          {
            search: search.trim() || undefined,
            status: status || undefined,
            brandName: brandFilter || undefined,
            categoryName: categoryFilter || undefined,
            onlyAvailable: view === "table",
            page: nextPage,
            size: 100,
            sortBy,
            direction: sortDirection,
          }
        );

        rows.push(...(nextResult?.content || []));
      }

      const csvLines = [
        [
          "Part Number",
          "Item Name",
          "Brand",
          "Quantity",
          "Purchase Price",
          "Selling Price",
          "MRP",
          "Store",
          "Status",
        ]
          .map(csvCell)
          .join(","),
        ...rows.map((item) =>
          [
            item.partNumber,
            item.itemName,
            item.brandName,
            item.quantity,
            item.purchasePrice,
            item.sellingPrice,
            item.mrp,
            item.storeName,
            statusOf(item).label,
          ]
            .map(csvCell)
            .join(",")
        ),
      ];

      const blob = new Blob(
        [`\uFEFF${csvLines.join("\r\n")}`],
        {
          type: "text/csv;charset=utf-8",
        }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `current-stock-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(
        errorMessage(
          requestError,
          "Unable to export current stock."
        )
      );
    } finally {
      setExporting(false);
    }
  };

  const selectedRow = result.content.find(
    (row) => row.inventoryId === selectedId
  );

  const current =
    details?.inventoryId === selectedId
      ? details
      : selectedRow;

  const currentStatus = statusOf(current);

  const showStoreColumn = isSuperAdmin;
  const columnCount = showStoreColumn ? 9 : 8;

  const activeFilterCount = [
    brandFilter,
    categoryFilter,
  ].filter(Boolean).length;

  const badgeClasses = {
    in: "stock-badge stock-badge-in",
    low: "stock-badge stock-badge-low",
    out: "stock-badge stock-badge-out",
  };

  return (
    <section className="current-stock-shell">
      {/* Toolbar */}
      <div className="stock-toolbar">
        <div className="stock-search-wrapper">
          <Search
            size={16}
            className="stock-search-icon"
          />

          <input
            ref={searchInputRef}
            value={search}
            onChange={changeFilter(setSearch)}
            placeholder="Search item, part number, brand or SKU"
            className="stock-search-input"
          />

          <kbd className="stock-search-shortcut">
            Ctrl K
          </kbd>
        </div>

        <div
          className="stock-filter-wrapper"
          ref={filtersRef}
        >
          <button
            type="button"
            onClick={() =>
              setFiltersOpen((current) => !current)
            }
            aria-expanded={filtersOpen}
            className={`${TOOLBAR_BUTTON} ${
              activeFilterCount > 0 || filtersOpen
                ? TOOLBAR_BUTTON_ACTIVE
                : ""
            }`}
          >
            <SlidersHorizontal size={16} />
            Filters

            {activeFilterCount > 0 && (
              <span className="stock-filter-count">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filtersOpen && (
            <div className="stock-filter-menu">
              <div className="stock-filter-menu-header">
                <h4>Filters</h4>

                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close filters"
                >
                  <X size={16} />
                </button>
              </div>

              <label className="stock-filter-field">
                <span>Brand</span>

                <select
                  value={brandFilter}
                  onChange={changeFilter(setBrandFilter)}
                >
                  <option value="">All brands</option>

                  {brands.map((brand) => {
                    const name =
                      brand.brandName || brand.name;

                    return (
                      <option
                        key={
                          brand.id ||
                          brand.brandId ||
                          name
                        }
                        value={name}
                      >
                        {name}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="stock-filter-field">
                <span>Category</span>

                <select
                  value={categoryFilter}
                  onChange={changeFilter(
                    setCategoryFilter
                  )}
                >
                  <option value="">All categories</option>

                  {categories.map((category) => {
                    const name =
                      category.categoryName ||
                      category.name;

                    return (
                      <option
                        key={
                          category.id ||
                          category.categoryId ||
                          name
                        }
                        value={name}
                      >
                        {name}
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="stock-filter-footer">
                <button
                  type="button"
                  onClick={clearAdvancedFilters}
                  className="stock-clear-button"
                >
                  Clear filters
                </button>

                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="stock-done-button"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {view === "table" && (
          <div
            className="stock-status-filter"
            role="group"
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((option) => {
              const active = status === option.value;

              return (
                <button
                  key={option.value || "all"}
                  type="button"
                  onClick={() => {
                    setStatus(option.value);
                    setPage(0);
                  }}
                  aria-pressed={active}
                  className={
                    active
                      ? "stock-status-option active"
                      : "stock-status-option"
                  }
                >
                  {option.dot && (
                    <span
                      className={`stock-status-dot ${option.dot}`}
                    />
                  )}

                  {option.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="stock-toolbar-right">
          {isSuperAdmin && view === "table" && (
            <select
              aria-label="Filter by store"
              value={storeId}
              onChange={(event) => {
                setStoreId(event.target.value);
                setPage(0);
              }}
              className="stock-store-select"
            >
              <option value="">All stores</option>

              {stores.map((store) => (
                <option
                  key={store.id}
                  value={store.id}
                >
                  {store.storeName}
                </option>
              ))}
            </select>
          )}

          {view === "table" && (
            <button
              type="button"
              disabled={exporting}
              onClick={exportStock}
              className={TOOLBAR_BUTTON}
            >
              <Download size={15} />
              {exporting
                ? "Exporting..."
                : "Export stock"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="stock-alert" role="alert">
          <CircleAlert size={17} />
          <span>{error}</span>

          <button
            type="button"
            title="Dismiss"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Table view */}
      {view === "table" && (
        <div className="stock-table-card">
          <div className="stock-table-scroll">
            <table className="stock-main-table">
              <colgroup>
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />

                {showStoreColumn && <col />}

                <col />
              </colgroup>

              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="stock-sort-button"
                      onClick={() =>
                        toggleSort("partNumber")
                      }
                    >
                      <span>Part number</span>

                      <SortIndicator
                        active={
                          sortBy === "partNumber"
                        }
                        direction={sortDirection}
                      />
                    </button>
                  </th>

                  <th>Item name</th>
                  <th>Brand</th>
                  <th>Quantity</th>
                  <th>Purchase price</th>
                  <th>Selling price</th>

                  <th>
                    <button
                      type="button"
                      className="stock-sort-button"
                      onClick={() => toggleSort("mrp")}
                    >
                      <span>MRP</span>

                      <SortIndicator
                        active={sortBy === "mrp"}
                        direction={sortDirection}
                      />
                    </button>
                  </th>

                  {showStoreColumn && <th>Store</th>}

                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {result.content.map((item) => {
                  const itemStatus = statusOf(item);

                  return (
                    <tr
                      key={item.inventoryId}
                      onClick={() => {
                        setSelectedId(item.inventoryId);
                        setDetails(null);
                        setTab("overview");
                        setView("detail");
                      }}
                    >
                      <td
                        title={item.partNumber}
                      >
                        {display(item.partNumber)}
                      </td>

                      <td>
                        <div className="stock-item-name-cell">
                          <span className="stock-item-icon">
                            <Package size={16} />
                          </span>

                          <span
                            className="stock-item-name"
                            title={item.itemName}
                          >
                            {display(item.itemName)}
                          </span>
                        </div>
                      </td>

                      <td title={item.brandName}>
                        {display(item.brandName)}
                      </td>

                      <td className="stock-quantity-cell">
                        {display(item.quantity)}
                      </td>

                      <td>
                        {money(item.purchasePrice)}
                      </td>

                      <td>
                        {money(item.sellingPrice)}
                      </td>

                      <td>{money(item.mrp)}</td>

                      {showStoreColumn && (
                        <td>
                          <div className="stock-store-name">
                            {display(item.storeName)}
                          </div>

                          <div className="stock-store-code">
                            {display(item.storeCode)}
                          </div>
                        </td>
                      )}

                      <td>
                        <span
                          className={
                            badgeClasses[itemStatus.key]
                          }
                        >
                          {itemStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {!loading && !result.content.length && (
                  <tr>
                    <td
                      colSpan={columnCount}
                      className="stock-table-empty"
                    >
                      No available stock matches these
                      filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            result={result}
            page={page}
            size={size}
            setPage={setPage}
            setSize={setSize}
          />
        </div>
      )}

      {/* Detail view */}
      {view === "detail" && (
        <div className="stock-workspace">
          {/* Left side: scrollable list */}
          <aside className="stock-browser">
            <div className="stock-list-scroll">
              {result.content.map((item) => {
                const itemStatus = statusOf(item);

                return (
                  <button
                    type="button"
                    key={item.inventoryId}
                    className={`stock-list-row ${
                      selectedId === item.inventoryId
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedId(item.inventoryId);
                      setDetails(null);
                      setTab("overview");
                    }}
                  >
                    <span className="stock-row-icon">
                      <Boxes size={18} />
                    </span>

                    <span className="stock-row-copy">
                      <strong title={item.partNumber}>
                        {display(item.partNumber)}
                      </strong>

                      <small title={item.itemName}>
                        {display(item.itemName)}
                      </small>
                    </span>

                    <span className="stock-row-meta">
                      <span
                        className={
                          badgeClasses[itemStatus.key]
                        }
                      >
                        {itemStatus.label}
                      </span>

                      <strong>
                        Qty {display(item.quantity)}
                      </strong>
                    </span>
                  </button>
                );
              })}

              {!loading && !result.content.length && (
                <div className="stock-message">
                  No inventory matches these filters.
                </div>
              )}
            </div>
          </aside>

          {/* Right side: fixed product panel */}
          <div className="stock-detail-panel">
            {!current ? (
              <div className="stock-empty">
                <PackageSearch size={30} />
                <strong>
                  Select an inventory item
                </strong>
              </div>
            ) : (
              <>
                <header className="stock-product-header">
                  <div className="stock-product-identity">
                    <div className="stock-product-avatar">
                      <Boxes size={24} />
                    </div>

                    <div className="stock-product-heading">
                      <div className="stock-title-line">
                        <h2>
                          {display(current.itemName)}
                        </h2>

                        <span
                          className={
                            badgeClasses[currentStatus.key]
                          }
                        >
                          {currentStatus.label}
                        </span>
                      </div>

                      <p>
                        {display(current.brandName)} · Part
                        No. {display(current.partNumber)}
                      </p>
                    </div>
                  </div>

                  <div className="stock-header-actions">
                    {canManage && (
                      <button
                        type="button"
                        onClick={goToManagePage}
                        className="stock-edit-button"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>
                    )}

                    <button
                      type="button"
                      title="Close"
                      aria-label="Close"
                      onClick={() => {
                        setView("table");
                        setTab("overview");
                      }}
                      className="stock-close-button"
                    >
                      <X size={17} />
                    </button>
                  </div>
                </header>

                {/* Tabs stay fixed and do not scroll */}
                <nav
                  className="stock-tabs"
                  role="tablist"
                >
                  {TABS.map(
                    ({ id, label, icon: Icon }) => (
                      <button
                        type="button"
                        key={id}
                        role="tab"
                        aria-selected={tab === id}
                        className={
                          tab === id ? "active" : ""
                        }
                        onClick={() => setTab(id)}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    )
                  )}
                </nav>

                {/* Content has no scrollbar beside the tabs */}
                <div className="stock-tab-body">
                  {tab === "overview" && (
                    <div className="stock-overview-content">
                      <div className="stock-section-heading">
                        <div>
                          <h3>Product information</h3>
                          <p>
                            Catalogue and inventory details
                          </p>
                        </div>
                      </div>

                      <InfoGrid
                        columns={4}
                        rows={[
                          [
                            "Item name",
                            current.itemName,
                          ],
                          ["Brand", current.brandName],
                          [
                            "Part number",
                            current.partNumber,
                          ],
                          [
                            "HSN code",
                            current.hsncode,
                          ],
                        ]}
                      />

                      <div className="stock-summary-cards">
                        <div className="stock-summary-card">
                          <span>
                            Available quantity
                          </span>

                          <strong>
                            {current.quantity || 0}
                          </strong>
                        </div>

                        <div className="stock-summary-card">
                          <span>
                            Damaged quantity
                          </span>

                          <strong>
                            {current.damagedQuantity || 0}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === "sale-history" && (
                    <div className="stock-tab-content">
                      <SaleHistoryTable
                        sales={saleHistory}
                      />
                    </div>
                  )}

                  {tab === "batches" && (
                    <div className="stock-tab-content">
                      <BatchTable batches={batches} />
                    </div>
                  )}

                  {tab === "locations" && (
                    <div className="stock-tab-content">
                      <LocationTable
                        locations={
                          locations?.content || []
                        }
                      />
                    </div>
                  )}

                  {tab === "fitment" && (
                    <div className="stock-tab-content">
                      <VehicleFitmentTable
                        fitments={vehicleFitment}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Pagination({
  result,
  page,
  size,
  setPage,
  setSize,
  compact = false,
}) {
  const totalElements = result?.totalElements || 0;
  const totalPages = result?.totalPages || 1;

  const firstItem =
    totalElements === 0 ? 0 : page * size + 1;

  const lastItem = Math.min(
    (page + 1) * size,
    totalElements
  );

  return (
    <footer className="stock-pagination">
      <span>
        {totalElements
          ? `${firstItem}-${lastItem} of ${totalElements}`
          : "0 items"}
      </span>

      <div className="stock-pagination-controls">
        {!compact && (
          <select
            value={size}
            onChange={(event) => {
              setSize(Number(event.target.value));
              setPage(0);
            }}
            aria-label="Rows per page"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        )}

        <button
          type="button"
          title="Previous page"
          aria-label="Previous page"
          disabled={page <= 0}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={17} />
        </button>

        <strong>{page + 1}</strong>

        <button
          type="button"
          title="Next page"
          aria-label="Next page"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </footer>
  );
}

function BatchTable({ batches }) {
  return (
    <div className="stock-inner-table-wrapper">
      <table className="stock-inner-table">
        <thead>
          <tr>
            <th>Batch</th>
            <th>Received</th>
            <th>Available</th>
            <th>Purchase</th>
            <th>Selling</th>
            <th>MRP</th>
            <th>Rack</th>
          </tr>
        </thead>

        <tbody>
          {batches.map((batch) => (
            <tr key={batch.batchId}>
              <td>
                <strong>
                  {display(batch.batchNumber)}
                </strong>
              </td>

              <td>
                {batch.receivedDate
                  ? new Date(
                      batch.receivedDate
                    ).toLocaleDateString("en-IN")
                  : "-"}
              </td>

              <td>
                {display(batch.availableQuantity)}
              </td>

              <td>{money(batch.purchasePrice)}</td>
              <td>{money(batch.sellingPrice)}</td>
              <td>{money(batch.mrp)}</td>

              <td>{display(batch.rackNumber)}</td>
            </tr>
          ))}

          {!batches.length && (
            <tr>
              <td
                colSpan={7}
                className="stock-table-empty"
              >
                No batches found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LocationTable({ locations }) {
  return (
    <div className="stock-inner-table-wrapper">
      <table className="stock-inner-table">
        <thead>
          <tr>
            <th>Store</th>
            <th>Store location</th>
            <th>Quantity</th>
            <th>MRP</th>
          </tr>
        </thead>

        <tbody>
          {locations.map((location) => (
            <tr key={location.inventoryId}>
              <td>
                <strong>
                  {display(location.storeName)}
                </strong>
              </td>

              <td>
                {display(
                  location.storeLocation ||
                    location.address
                )}
              </td>

              <td>
                {display(location.availableQuantity)}
              </td>

              <td>{money(location.mrp)}</td>
            </tr>
          ))}

          {!locations.length && (
            <tr>
              <td
                colSpan={4}
                className="stock-table-empty"
              >
                No locations found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SaleHistoryTable({ sales }) {
  return (
    <div className="stock-inner-table-wrapper">
      <table className="stock-inner-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Date</th>
            <th>Qty sold</th>
            <th>Sale price</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {sales.map((sale, index) => (
            <tr
              key={
                sale.id ||
                sale.invoiceNumber ||
                index
              }
            >
              <td>
                <strong>
                  {display(sale.invoiceNumber)}
                </strong>
              </td>

              <td>
                {sale.saleDate
                  ? new Date(
                      sale.saleDate
                    ).toLocaleDateString("en-IN")
                  : "-"}
              </td>

              <td>
                {display(sale.quantitySold)}
              </td>

              <td>{money(sale.salePrice)}</td>
              <td>{money(sale.totalAmount)}</td>
            </tr>
          ))}

          {!sales.length && (
            <tr>
              <td
                colSpan={5}
                className="stock-table-empty"
              >
                No sale history found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function VehicleFitmentTable({ fitments }) {
  return (
    <div className="stock-inner-table-wrapper">
      <table className="stock-inner-table">
        <thead>
          <tr>
            <th>Make</th>
            <th>Model</th>
            <th>Variant</th>
            <th>Year</th>
          </tr>
        </thead>

        <tbody>
          {fitments.map((fitment, index) => (
            <tr
              key={fitment.id || index}
            >
              <td>
                <strong>
                  {display(fitment.make)}
                </strong>
              </td>

              <td>{display(fitment.model)}</td>
              <td>{display(fitment.variant)}</td>

              <td>
                {fitment.fromYear ||
                fitment.toYear
                  ? `${fitment.fromYear || "-"} - ${
                      fitment.toYear || "-"
                    }`
                  : "-"}
              </td>
            </tr>
          ))}

          {!fitments.length && (
            <tr>
              <td
                colSpan={4}
                className="stock-table-empty"
              >
                No vehicle fitment found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}