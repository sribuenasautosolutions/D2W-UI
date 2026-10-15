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
  MoreVertical,
  Package,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
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

import OpeningStockManualEntry from "./OpeningStockManualEntry";
import BulkUploadSection from "./BulkUploadSection";

import "./CurrentStockSection.css";

const TABS = [
  { id: "overview", label: "Overview", icon: PackageSearch },
  { id: "sale-history", label: "Sale History", icon: History },
  { id: "batches", label: "Batches", icon: Layers3 },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "fitment", label: "Vehicle Fitment", icon: Car },
];

const STATUS_OPTIONS = [
  { value: "", label: "All", dot: "" },
  { value: "IN_STOCK", label: "In stock", dot: "stock-dot-green" },
  { value: "LOW_STOCK", label: "Low stock", dot: "stock-dot-yellow" },
  { value: "OUT_OF_STOCK", label: "Out of stock", dot: "stock-dot-red" },
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
  if (value === null || value === undefined || value === "") return "-";
  return value;
}

export function money(value) {
  if (value === null || value === undefined || value === "") return "-";
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "-";
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

  if (statusKey === "OUT_OF_STOCK") return { key: "out", label: "Out of stock" };
  if (statusKey === "LOW_STOCK") return { key: "low", label: "Low stock" };
  return { key: "in", label: "In stock" };
}

function errorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || fallbackMessage;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

// Fallback price validation used by OpeningStockManualEntry when the parent
// doesn't provide its own. Matches the same rule set the backend expects.
function defaultValidatePrices(row, errors) {
  const p = Number(row.purchasePrice);
  const s = Number(row.sellingPrice);
  const m = Number(row.mrp);

  if (!Number.isFinite(p) || p <= 0) errors.push("Purchase Price must be greater than zero");
  if (!Number.isFinite(s) || s <= 0) errors.push("Selling Price must be greater than zero");
  if (!Number.isFinite(m) || m <= 0) errors.push("MRP must be greater than zero");

  if (Number.isFinite(p) && Number.isFinite(s) && p > s) {
    errors.push("Selling Price must be greater than or equal to Purchase Price");
  }
  if (Number.isFinite(s) && Number.isFinite(m) && s > m) {
    errors.push("MRP must be greater than or equal to Selling Price");
  }
}

function SortIndicator({ active, direction }) {
  return (
    <span className="sort-indicator" aria-hidden="true">
      <ArrowUp size={11} className={active && direction === "ASC" ? "sort-arrow-active" : ""} />
      <ArrowDown size={11} className={active && direction === "DESC" ? "sort-arrow-active" : ""} />
    </span>
  );
}

export function InfoGrid({ rows, columns = 4 }) {
  return (
    <div className={`stock-info-grid stock-info-grid-${columns}`}>
      {rows.map(([label, value]) => (
        <div className="stock-field" key={label}>
          <span>{label}</span>
          <strong>{display(value)}</strong>
        </div>
      ))}
    </div>
  );
}

export const productManageRoute = (inventoryId, storeId, role = "SUPER_ADMIN") => {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  const base = role === "STORE_OWNER" ? "/store" : "/owner";
  return `${base}/inventory/products/${inventoryId}/manage${query}`;
};

export default function CurrentStockSection() {
  const navigate = useNavigate();
  const [user] = useState(readUser);

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const canManage = isSuperAdmin || user.role === "STORE_OWNER";

  const [stores, setStores] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  const [storeId, setStoreId] = useState(
    user.storeId ? String(user.storeId) : ""
  );

  const [view, setView] = useState("table"); // "table" | "detail" | "bulk-upload"

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
  const [locations, setLocations] = useState({ content: [], totalElements: 0 });
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

  const [importExportOpen, setImportExportOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);

  const searchInputRef = useRef(null);
  const filtersRef = useRef(null);
  const importExportRef = useRef(null);

  /* Load stores for SUPER_ADMIN */
  useEffect(() => {
    if (!isSuperAdmin) return;
    api
      .get("/stores", { params: { page: 0, size: 100, active: true } })
      .then(({ data }) => {
        setStores(Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []);
      })
      .catch((e) => setError(errorMessage(e, "Unable to load stores.")));
  }, [isSuperAdmin]);

  /* Load brands */
  useEffect(() => {
    getAllBrands()
      .then((data) => setBrands(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setBrands([]));
  }, []);

  /* Load categories */
  useEffect(() => {
    api
      .get("/categories", { params: { page: 0, size: 100 } })
      .then(({ data }) => setCategories(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setCategories([]));
  }, []);

  /* Click outside filters */
  useEffect(() => {
    const h = (event) => {
      if (filtersOpen && filtersRef.current && !filtersRef.current.contains(event.target)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [filtersOpen]);

  /* Click outside kebab */
  useEffect(() => {
    const h = (event) => {
      if (importExportOpen && importExportRef.current && !importExportRef.current.contains(event.target)) {
        setImportExportOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [importExportOpen]);

  /* Ctrl+K focuses search */
  useEffect(() => {
    const h = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getCurrentStockPage(storeId, {
        search: search.trim() || undefined,
        status: status || undefined,
        brandName: brandFilter || undefined,
        categoryName: categoryFilter || undefined,
        onlyAvailable: status !== "OUT_OF_STOCK",
        page,
        size,
        sortBy,
        direction: sortDirection,
      });
      const safeData = {
        content: Array.isArray(data?.content) ? data.content : [],
        totalElements: data?.totalElements || 0,
        totalPages: data?.totalPages || 1,
        number: data?.number || 0,
        size: data?.size || size,
      };
      setResult(safeData);
      if (!selectedId && safeData.content.length > 0) {
        setSelectedId(safeData.content[0].inventoryId);
      }
    } catch (requestError) {
      setResult({ content: [], totalElements: 0, totalPages: 1, number: 0, size });
      setError(errorMessage(requestError, "Unable to load current stock."));
    } finally {
      setLoading(false);
    }
  }, [storeId, search, status, brandFilter, categoryFilter, page, size, sortBy, sortDirection]);

  useEffect(() => {
    const timer = setTimeout(() => loadPage(), 250);
    return () => clearTimeout(timer);
  }, [loadPage]);

  const loadDetails = useCallback(async () => {
    if (!selectedId || view !== "detail") return;
    const selectedRow = result.content.find((item) => item.inventoryId === selectedId);
    const detailStoreId = storeId || selectedRow?.storeId;
    if (!detailStoreId) return;
    try {
      const data = await getProductDetails(detailStoreId, selectedId);
      if (data?.inventoryId === selectedId) setDetails(data);
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to load product details."));
    }
  }, [selectedId, view, storeId]);

  useEffect(() => { loadDetails(); }, [loadDetails]);

  useEffect(() => {
    if (!selectedId || view !== "detail") return;
    const el = document.querySelector(`[data-inventory-id="${selectedId}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId, view]);

  useEffect(() => {
    if (!selectedId || view !== "detail") return;

    if (tab === "batches") {
      getManagementBatches(selectedId)
        .then((data) => setBatches(Array.isArray(data) ? data : []))
        .catch((e) => setError(errorMessage(e, "Unable to load batches.")));
    }
    if (tab === "locations") {
      getProductLocations(selectedId, 0, 100)
        .then((data) => setLocations(data || { content: [], totalElements: 0 }))
        .catch((e) => setError(errorMessage(e, "Unable to load locations.")));
    }
    if (tab === "sale-history") {
      api.get(`/inventory-transactions/${selectedId}/sales-history`, { params: { page: 0, size: 100 } })
        .then(({ data }) => setSaleHistory(Array.isArray(data) ? data : data?.content || []))
        .catch((e) => setError(errorMessage(e, "Unable to load sale history.")));
    }
    if (tab === "fitment") {
      const selectedRow = result.content.find((item) => item.inventoryId === selectedId);
      const partNumber = selectedRow?.partNumber?.trim();
      if (!partNumber) { setVehicleFitment([]); setError("Part number is not available for this product."); return; }
      api.get("/fitment/product-by-part-number", { params: { partNumber } })
        .then(({ data }) => setVehicleFitment(Array.isArray(data) ? data : data?.content || []))
        .catch((e) => setError(errorMessage(e, "Unable to load vehicle fitment.")));
    }
  }, [selectedId, tab, view]);

  const toggleSort = (field) => {
    setSortBy((current) => {
      if (current === field) {
        setSortDirection((d) => (d === "ASC" ? "DESC" : "ASC"));
        return current;
      }
      setSortDirection("ASC");
      return field;
    });
    setPage(0);
  };

  const goToManagePage = () => {
    if (!selectedId) return;
    const selectedRow = result.content.find((row) => row.inventoryId === selectedId);
    const detailStoreId = storeId || selectedRow?.storeId;
    navigate(productManageRoute(selectedId, detailStoreId, user.role));
  };

  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(0);
  };

  const clearAdvancedFilters = () => {
    setBrandFilter("");
    setCategoryFilter("");
    setPage(0);
  };

  const exportStock = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      setError("");
      const firstPage = await getCurrentStockPage(storeId, {
        search: search.trim() || undefined, status: status || undefined,
        brandName: brandFilter || undefined, categoryName: categoryFilter || undefined,
        onlyAvailable: status !== "OUT_OF_STOCK", page: 0, size: 100, sortBy, direction: sortDirection,
      });
      const rows = [...(firstPage?.content || [])];
      for (let nextPage = 1; nextPage < (firstPage?.totalPages || 1); nextPage += 1) {
        const nextResult = await getCurrentStockPage(storeId, {
          search: search.trim() || undefined, status: status || undefined,
          brandName: brandFilter || undefined, categoryName: categoryFilter || undefined,
          onlyAvailable: status !== "OUT_OF_STOCK", page: nextPage, size: 100, sortBy, direction: sortDirection,
        });
        rows.push(...(nextResult?.content || []));
      }
      const csvLines = [
        ["Part Number", "Item Name", "Brand", "Quantity", "Purchase Price", "Selling Price", "MRP", "Store", "Status"].map(csvCell).join(","),
        ...rows.map((item) => [
          item.partNumber, item.itemName, item.brandName, item.quantity,
          item.purchasePrice, item.sellingPrice, item.mrp, item.storeName, statusOf(item).label,
        ].map(csvCell).join(",")),
      ];
      const blob = new Blob([`\uFEFF${csvLines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `current-stock-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to export current stock."));
    } finally {
      setExporting(false);
    }
  };

  const selectedRow = result.content.find((row) => row.inventoryId === selectedId);
  const current = details?.inventoryId === selectedId ? details : selectedRow;
  const currentStatus = statusOf(current);

  const showStoreColumn = isSuperAdmin;
  const columnCount = showStoreColumn ? 9 : 8;
  const activeFilterCount = [brandFilter, categoryFilter].filter(Boolean).length;

  const badgeClasses = {
    in: "stock-badge stock-badge-in",
    low: "stock-badge stock-badge-low",
    out: "stock-badge stock-badge-out",
  };

  return (
    <section className={
      "current-stock-shell" +
      (view === "bulk-upload" ? " is-bulk-view" : "")
    }>
      {/* Toolbar */}
      {view !== "bulk-upload" && (
      <div className="stock-toolbar">
        <div className="stock-search-wrapper">
          <Search size={16} className="stock-search-icon" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={changeFilter(setSearch)}
            placeholder="Search item, part number, brand or SKU"
            className="stock-search-input"
          />
          <kbd className="stock-search-shortcut">Ctrl K</kbd>
        </div>

        <div className="stock-filter-wrapper" ref={filtersRef}>
          <button
            type="button"
            onClick={() => setFiltersOpen((c) => !c)}
            aria-expanded={filtersOpen}
            className={`${TOOLBAR_BUTTON} ${activeFilterCount > 0 || filtersOpen ? TOOLBAR_BUTTON_ACTIVE : ""}`}
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && <span className="stock-filter-count">{activeFilterCount}</span>}
          </button>

          {filtersOpen && (
            <div className="stock-filter-menu">
              <div className="stock-filter-menu-header">
                <h4>Filters</h4>
                <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                  <X size={16} />
                </button>
              </div>
              <label className="stock-filter-field">
                <span>Brand</span>
                <select value={brandFilter} onChange={changeFilter(setBrandFilter)}>
                  <option value="">All brands</option>
                  {brands.map((brand) => {
                    const name = brand.brandName || brand.name;
                    return <option key={brand.id || brand.brandId || name} value={name}>{name}</option>;
                  })}
                </select>
              </label>
              <label className="stock-filter-field">
                <span>Category</span>
                <select value={categoryFilter} onChange={changeFilter(setCategoryFilter)}>
                  <option value="">All categories</option>
                  {categories.map((category) => {
                    const name = category.categoryName || category.name;
                    return <option key={category.id || category.categoryId || name} value={name}>{name}</option>;
                  })}
                </select>
              </label>
              <div className="stock-filter-footer">
                <button type="button" onClick={clearAdvancedFilters} className="stock-clear-button">Clear filters</button>
                <button type="button" onClick={() => setFiltersOpen(false)} className="stock-done-button">Done</button>
              </div>
            </div>
          )}
        </div>

        {view === "table" && (
          <div className="stock-status-filter" role="group" aria-label="Filter by status">
            {STATUS_OPTIONS.map((option) => {
              const active = status === option.value;
              return (
                <button
                  key={option.value || "all"}
                  type="button"
                  onClick={() => { setStatus(option.value); setPage(0); }}
                  aria-pressed={active}
                  className={active ? "stock-status-option active" : "stock-status-option"}
                >
                  {option.dot && <span className={`stock-status-dot ${option.dot}`} />}
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
              onChange={(event) => { setStoreId(event.target.value); setPage(0); }}
              className="stock-store-select"
            >
              <option value="">All stores</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.storeName}</option>
              ))}
            </select>
          )}

          {view === "table" && (
            <button
              type="button"
              onClick={() => setAddItemOpen(true)}
              disabled={!storeId}
              title={!storeId ? "Select a specific store first" : undefined}
              className={`${TOOLBAR_BUTTON} stock-add-item-btn`}
            >
              <Plus size={15} />
              Add Item
            </button>
          )}

          {view === "table" && (
            <div className="stock-menu-wrapper" ref={importExportRef}>
              <button
                type="button"
                className="stock-kebab-button"
                onClick={() => setImportExportOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={importExportOpen}
                aria-label="More actions"
              >
                <MoreVertical size={16} />
              </button>

              {importExportOpen && (
                <div className="stock-menu-dropdown" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={exporting}
                    onClick={() => { setImportExportOpen(false); exportStock(); }}
                  >
                    <Download size={15} />
                    {exporting ? "Exporting..." : "Export stock"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setImportExportOpen(false); setView("bulk-upload"); }}
                  >
                    <Upload size={15} />
                    Import stock
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {error && (
        <div className="stock-alert" role="alert">
          <CircleAlert size={17} />
          <span>{error}</span>
          <button type="button" title="Dismiss" aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Bulk upload view — replaces the table entirely */}
      {view === "bulk-upload" && (
        <div className="stock-bulk-view">
          <BulkUploadSection onClose={() => setView("table")} />
        </div>
      )}

      {/* Table view */}
      {view === "table" && (
        <div className="stock-table-card">
          <div className="stock-table-scroll">
            <table className="stock-main-table">
              <colgroup>
                <col /><col /><col /><col /><col /><col /><col />
                {showStoreColumn && <col />}
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <button type="button" className="stock-sort-button" onClick={() => toggleSort("partNumber")}>
                      <span>Part number</span>
                      <SortIndicator active={sortBy === "partNumber"} direction={sortDirection} />
                    </button>
                  </th>
                  <th>Item name</th>
                  <th>Brand</th>
                  <th>Quantity</th>
                  <th>Purchase price</th>
                  <th>Selling price</th>
                  <th>
                    <button type="button" className="stock-sort-button" onClick={() => toggleSort("mrp")}>
                      <span>MRP</span>
                      <SortIndicator active={sortBy === "mrp"} direction={sortDirection} />
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
                      <td title={item.partNumber}>{display(item.partNumber)}</td>
                      <td>
                        <div className="stock-item-name-cell">
                          <span className="stock-item-icon"><Package size={16} /></span>
                          <span className="stock-item-name" title={item.itemName}>{display(item.itemName)}</span>
                        </div>
                      </td>
                      <td title={item.brandName}>{display(item.brandName)}</td>
                      <td className="stock-quantity-cell">{display(item.quantity)}</td>
                      <td>{money(item.purchasePrice)}</td>
                      <td>{money(item.sellingPrice)}</td>
                      <td>{money(item.mrp)}</td>
                      {showStoreColumn && (
                        <td>
                          <div className="stock-store-name">{display(item.storeName)}</div>
                          <div className="stock-store-code">{display(item.storeCode)}</div>
                        </td>
                      )}
                      <td>
                        <span className={badgeClasses[itemStatus.key]}>{itemStatus.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {!loading && !result.content.length && (
                  <tr>
                    <td colSpan={columnCount} className="stock-table-empty">
                      No available stock matches these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination result={result} page={page} size={size} setPage={setPage} setSize={setSize} />
        </div>
      )}

      {/* Detail view */}
      {view === "detail" && (
        <div className="stock-workspace">
          <aside className="stock-browser">
            <div className="stock-list-scroll">
              {result.content.map((item) => {
                const itemStatus = statusOf(item);
                const isSelected = selectedId === item.inventoryId;
                return (
                  <button
                    type="button"
                    key={item.inventoryId}
                    data-inventory-id={item.inventoryId}
                    className={`stock-list-row ${isSelected ? "selected" : ""}`}
                    onClick={() => { setSelectedId(item.inventoryId); setDetails(null); setTab("overview"); }}
                  >
                    <span className="stock-row-icon"><Boxes size={18} /></span>
                    <span className="stock-row-copy">
                      <strong title={item.partNumber}>{display(item.partNumber)}</strong>
                      <small title={item.itemName}>{display(item.itemName)}</small>
                    </span>
                    <span className="stock-row-meta">
                      <span className={badgeClasses[itemStatus.key]}>{itemStatus.label}</span>
                      <strong>Qty {display(item.quantity)}</strong>
                    </span>
                  </button>
                );
              })}
              {!loading && !result.content.length && (
                <div className="stock-message">No inventory matches these filters.</div>
              )}
            </div>
          </aside>

          <div className="stock-detail-panel">
            {!current ? (
              <div className="stock-empty">
                <PackageSearch size={30} />
                <strong>Select an inventory item</strong>
              </div>
            ) : (
              <>
                <header className="stock-product-header">
                  <div className="stock-product-identity">
                    <div className="stock-product-avatar"><Boxes size={24} /></div>
                    <div className="stock-product-heading">
                      <div className="stock-title-line">
                        <h2>{display(current.itemName)}</h2>
                        <span className={badgeClasses[currentStatus.key]}>{currentStatus.label}</span>
                      </div>
                      <p>{display(current.brandName)} · Part No. {display(current.partNumber)}</p>
                    </div>
                  </div>
                  <div className="stock-header-actions">
                    {canManage && (
                      <button type="button" onClick={goToManagePage} className="stock-edit-button">
                        <Pencil size={15} />
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      title="Close"
                      aria-label="Close"
                      onClick={() => { setView("table"); setTab("overview"); }}
                      className="stock-close-button"
                    >
                      <X size={17} />
                    </button>
                  </div>
                </header>

                <nav className="stock-tabs" role="tablist">
                  {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                      type="button"
                      key={id}
                      role="tab"
                      aria-selected={tab === id}
                      className={tab === id ? "active" : ""}
                      onClick={() => setTab(id)}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </nav>

                <div className="stock-tab-body">
                  {tab === "overview" && (
                    <div className="stock-overview-content">
                      <div className="stock-section-heading">
                        <div>
                          <h3>Product information</h3>
                          <p>Catalogue and inventory details</p>
                        </div>
                      </div>
                      <InfoGrid
                        columns={4}
                        rows={[
                          ["Item name", current.itemName],
                          ["Brand", current.brandName],
                          ["Part number", current.partNumber],
                          ["HSN code", current.hsncode],
                        ]}
                      />
                      <div className="stock-summary-cards">
                        <div className="stock-summary-card">
                          <span>Available quantity</span>
                          <strong>{current.quantity || 0}</strong>
                        </div>
                        <div className="stock-summary-card">
                          <span>Damaged quantity</span>
                          <strong>{current.damagedQuantity || 0}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                  {tab === "sale-history" && <div className="stock-tab-content"><SaleHistoryTable sales={saleHistory} /></div>}
                  {tab === "batches" && <div className="stock-tab-content"><BatchTable batches={batches} /></div>}
                  {tab === "locations" && <div className="stock-tab-content"><LocationTable locations={locations?.content || []} /></div>}
                  {tab === "fitment" && <div className="stock-tab-content"><VehicleFitmentTable fitments={vehicleFitment} /></div>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Item drawer — renders OpeningStockManualEntry inside a slide-over */}
      {addItemOpen && (
        <>
          <div className="stock-drawer-overlay" onClick={() => setAddItemOpen(false)} aria-hidden="true" />
          <aside className="stock-drawer stock-drawer--wide" role="dialog" aria-modal="true" aria-label="Add Item">
            <header className="stock-drawer-header">
              <div>
                <span className="stock-drawer-eyebrow">Inventory</span>
                <h2 className="stock-drawer-title">Add Item</h2>
              </div>
              <button
                type="button"
                className="stock-drawer-close"
                onClick={() => setAddItemOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <div className="stock-drawer-body stock-drawer-body--embedded">
              <OpeningStockManualEntry
              compact
              storeId={storeId || user.storeId || null}
              validatePrices={defaultValidatePrices}
              onSelectApproved={() => {
                setAddItemOpen(false);
                loadPage();
              }}
            />
            </div>
          </aside>
        </>
      )}
    </section>
  );
}

/* ================================================================
   Sub-components — unchanged
   ================================================================ */

function Pagination({ result, page, size, setPage, setSize, compact = false }) {
  const totalElements = result?.totalElements || 0;
  const totalPages = result?.totalPages || 1;
  const firstItem = totalElements === 0 ? 0 : page * size + 1;
  const lastItem = Math.min((page + 1) * size, totalElements);

  return (
    <footer className="stock-pagination">
      <span>{totalElements ? `${firstItem}-${lastItem} of ${totalElements}` : "0 items"}</span>
      <div className="stock-pagination-controls">
        {!compact && (
          <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} aria-label="Rows per page">
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        )}
        <button type="button" title="Previous page" aria-label="Previous page" disabled={page <= 0} onClick={() => setPage(page - 1)}>
          <ChevronLeft size={17} />
        </button>
        <strong>{page + 1}</strong>
        <button type="button" title="Next page" aria-label="Next page" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>
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
          <tr><th>Batch</th><th>Received</th><th>Available</th><th>Purchase</th><th>Selling</th><th>MRP</th><th>Rack</th></tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr key={batch.batchId}>
              <td><strong>{display(batch.batchNumber)}</strong></td>
              <td>{batch.receivedDate ? new Date(batch.receivedDate).toLocaleDateString("en-IN") : "-"}</td>
              <td>{display(batch.availableQuantity)}</td>
              <td>{money(batch.purchasePrice)}</td>
              <td>{money(batch.sellingPrice)}</td>
              <td>{money(batch.mrp)}</td>
              <td>{display(batch.rackNumber)}</td>
            </tr>
          ))}
          {!batches.length && <tr><td colSpan={7} className="stock-table-empty">No batches found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function LocationTable({ locations }) {
  return (
    <div className="stock-inner-table-wrapper">
      <table className="stock-inner-table">
        <thead><tr><th>Store</th><th>Store location</th><th>Quantity</th><th>MRP</th></tr></thead>
        <tbody>
          {locations.map((location) => (
            <tr key={location.inventoryId}>
              <td><strong>{display(location.storeName)}</strong></td>
              <td>{display(location.storeLocation || location.address)}</td>
              <td>{display(location.availableQuantity)}</td>
              <td>{money(location.mrp)}</td>
            </tr>
          ))}
          {!locations.length && <tr><td colSpan={4} className="stock-table-empty">No locations found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SaleHistoryTable({ sales }) {
  return (
    <div className="stock-inner-table-wrapper">
      <table className="stock-inner-table">
        <thead><tr><th>Invoice</th><th>Date</th><th>Qty sold</th><th>Sale price</th><th>Total</th></tr></thead>
        <tbody>
          {sales.map((sale, index) => (
            <tr key={sale.id || index}>
              <td><strong>{display(sale.remarks)}</strong></td>
              <td>{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString("en-IN") : "-"}</td>
              <td>{display(sale.quantity)}</td>
              <td>{money(sale.salePrice)}</td>
              <td>{money(sale.totalAmount)}</td>
            </tr>
          ))}
          {!sales.length && <tr><td colSpan={5} className="stock-table-empty">No sale history found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function VehicleFitmentTable({ fitments }) {
  return (
    <div className="stock-inner-table-wrapper">
      <table className="stock-inner-table">
        <thead><tr><th>Make</th><th>Model</th><th>Variant</th><th>Year</th></tr></thead>
        <tbody>
          {fitments.map((fitment, index) => (
            <tr key={fitment.id || index}>
              <td><strong>{display(fitment.make)}</strong></td>
              <td>{display(fitment.model)}</td>
              <td>{display(fitment.variantFullName)}</td>
              <td>{fitment.year || fitment.toYear ? `${fitment.year || "-"} - ${fitment.year || "-"}` : "-"}</td>
            </tr>
          ))}
          {!fitments.length && <tr><td colSpan={4} className="stock-table-empty">No vehicle fitment found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
