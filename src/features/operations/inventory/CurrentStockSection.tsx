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

  if (statusKey === "OUT_OF_STOCK")
    return { key: "out", label: "Out of stock" };
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

  if (!Number.isFinite(p) || p <= 0)
    errors.push("Purchase Price must be greater than zero");
  if (!Number.isFinite(s) || s <= 0)
    errors.push("Selling Price must be greater than zero");
  if (!Number.isFinite(m) || m <= 0)
    errors.push("MRP must be greater than zero");

  if (Number.isFinite(p) && Number.isFinite(s) && p > s) {
    errors.push(
      "Selling Price must be greater than or equal to Purchase Price",
    );
  }
  if (Number.isFinite(s) && Number.isFinite(m) && s > m) {
    errors.push("MRP must be greater than or equal to Selling Price");
  }
}

function SortIndicator({ active, direction }) {
  return (
    <span className="sort-indicator" aria-hidden="true">
      <ArrowUp
        size={11}
        className={active && direction === "ASC" ? "sort-arrow-active" : ""}
      />
      <ArrowDown
        size={11}
        className={active && direction === "DESC" ? "sort-arrow-active" : ""}
      />
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

export const productManageRoute = (
  inventoryId,
  storeId,
  role = "SUPER_ADMIN",
) => {
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
    user.storeId ? String(user.storeId) : "",
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
        setStores(
          Array.isArray(data?.content)
            ? data.content
            : Array.isArray(data)
              ? data
              : [],
        );
      })
      .catch((e) => setError(errorMessage(e, "Unable to load stores.")));
  }, [isSuperAdmin]);

  /* Load brands */
  useEffect(() => {
    getAllBrands()
      .then((data: any) =>
        setBrands(Array.isArray(data) ? data : data?.content || []),
      )
      .catch(() => setBrands([]));
  }, []);

  /* Load categories */
  useEffect(() => {
    api
      .get("/categories", { params: { page: 0, size: 100 } })
      .then(({ data }) =>
        setCategories(Array.isArray(data) ? data : data?.content || []),
      )
      .catch(() => setCategories([]));
  }, []);

  /* Click outside filters */
  useEffect(() => {
    const h = (event) => {
      if (
        filtersOpen &&
        filtersRef.current &&
        !filtersRef.current.contains(event.target)
      ) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [filtersOpen]);

  /* Click outside kebab */
  useEffect(() => {
    const h = (event) => {
      if (
        importExportOpen &&
        importExportRef.current &&
        !importExportRef.current.contains(event.target)
      ) {
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
      setResult({
        content: [],
        totalElements: 0,
        totalPages: 1,
        number: 0,
        size,
      });
      setError(errorMessage(requestError, "Unable to load current stock."));
    } finally {
      setLoading(false);
    }
  }, [
    storeId,
    search,
    status,
    brandFilter,
    categoryFilter,
    page,
    size,
    sortBy,
    sortDirection,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => loadPage(), 250);
    return () => clearTimeout(timer);
  }, [loadPage]);

  const loadDetails = useCallback(async () => {
    if (!selectedId || view !== "detail") return;
    const selectedRow = result.content.find(
      (item) => item.inventoryId === selectedId,
    );
    const detailStoreId = storeId || selectedRow?.storeId;
    if (!detailStoreId) return;
    try {
      const data = await getProductDetails(detailStoreId, selectedId);
      if (data?.inventoryId === selectedId) setDetails(data);
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to load product details."));
    }
  }, [selectedId, view, storeId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

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
      api
        .get(`/inventory-transactions/${selectedId}/sales-history`, {
          params: { page: 0, size: 100 },
        })
        .then(({ data }) =>
          setSaleHistory(Array.isArray(data) ? data : data?.content || []),
        )
        .catch((e) =>
          setError(errorMessage(e, "Unable to load sale history.")),
        );
    }
    if (tab === "fitment") {
      const selectedRow = result.content.find(
        (item) => item.inventoryId === selectedId,
      );
      const partNumber = selectedRow?.partNumber?.trim();
      if (!partNumber) {
        setVehicleFitment([]);
        setError("Part number is not available for this product.");
        return;
      }
      api
        .get("/fitment/product-by-part-number", { params: { partNumber } })
        .then(({ data }) =>
          setVehicleFitment(Array.isArray(data) ? data : data?.content || []),
        )
        .catch((e) =>
          setError(errorMessage(e, "Unable to load vehicle fitment.")),
        );
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
    const selectedRow = result.content.find(
      (row) => row.inventoryId === selectedId,
    );
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
        search: search.trim() || undefined,
        status: status || undefined,
        brandName: brandFilter || undefined,
        categoryName: categoryFilter || undefined,
        onlyAvailable: status !== "OUT_OF_STOCK",
        page: 0,
        size: 100,
        sortBy,
        direction: sortDirection,
      });
      const rows = [...(firstPage?.content || [])];
      for (
        let nextPage = 1;
        nextPage < (firstPage?.totalPages || 1);
        nextPage += 1
      ) {
        const nextResult = await getCurrentStockPage(storeId, {
          search: search.trim() || undefined,
          status: status || undefined,
          brandName: brandFilter || undefined,
          categoryName: categoryFilter || undefined,
          onlyAvailable: status !== "OUT_OF_STOCK",
          page: nextPage,
          size: 100,
          sortBy,
          direction: sortDirection,
        });
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
            .join(","),
        ),
      ];
      const blob = new Blob([`\uFEFF${csvLines.join("\r\n")}`], {
        type: "text/csv;charset=utf-8",
      });
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

  const selectedRow = result.content.find(
    (row) => row.inventoryId === selectedId,
  );
  const current = details?.inventoryId === selectedId ? details : selectedRow;
  const currentStatus = statusOf(current);

  const showStoreColumn = isSuperAdmin;
  const columnCount = showStoreColumn ? 9 : 8;
  const activeFilterCount = [brandFilter, categoryFilter].filter(
    Boolean,
  ).length;

  const badgeClasses = {
    in: "stock-badge stock-badge-in",
    low: "stock-badge stock-badge-low",
    out: "stock-badge stock-badge-out",
  };

  return (
    <section
      className={
        "current-stock-shell" + (view === "bulk-upload" ? " is-bulk-view" : "")
      }
    >
      <style>{`/* ==========================================================================
   CURRENT STOCK + MANAGE + ADD ITEM DRAWER + BULK UPLOAD
   Single consolidated stylesheet. No duplicates, no dead selectors.
   ========================================================================== */

:root {
  --cs-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto,
    Helvetica, Arial, sans-serif;
}

/* ==========================================================================
   1. BASE LAYOUT
   ========================================================================== */

.current-stock-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #ffffff;
  color: #1e293b;
  font-family: var(--cs-font);
}

/* ==========================================================================
   2. TOOLBAR
   ========================================================================== */

.stock-toolbar {
  width: 100%;
  min-width: 0;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
  margin-bottom: 16px;
}

/* ---- 2.1 Search ---- */

.stock-search-wrapper {
  flex: 1 1 300px;
  min-width: 240px;
  max-width: 430px;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  box-sizing: border-box;
}

.stock-search-icon { flex: 0 0 auto; color: #64748b; }

.stock-search-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #1e293b;
  font-size: 13px;
}

.stock-search-input::placeholder { color: #94a3b8; }

.stock-search-shortcut {
  flex: 0 0 auto;
  padding: 3px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 10px;
  white-space: nowrap;
}

/* ---- 2.2 Filters button + menu ---- */

.stock-filter-wrapper {
  position: relative;
  flex: 0 0 auto;
}

.stock-toolbar > .stock-filter-wrapper > button,
.stock-toolbar-right > button {
  min-width: 100px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #ffffff;
  color: #000000;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  box-sizing: border-box;
  transition: background 0.15s ease;
}

.stock-toolbar > .stock-filter-wrapper > button:hover,
.stock-toolbar-right > button:hover { background: #f8fafc; }

.stock-filter-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 100;
  width: 260px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
}

.stock-filter-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.stock-filter-menu-header h4 {
  margin: 0;
  color: #1e293b;
  font-size: 14px;
  font-weight: 700;
}

.stock-filter-menu-header button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}
.stock-filter-menu-header button:hover { background: #f1f5f9; }

.stock-filter-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.stock-filter-field span {
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.stock-filter-field select {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #ffffff;
  color: #334155;
  font-size: 12px;
  outline: none;
}
.stock-filter-field select:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 10%);
}

.stock-filter-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.stock-clear-button,
.stock-done-button {
  height: 34px;
  padding: 0 12px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.stock-clear-button {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
}
.stock-clear-button:hover { background: #f8fafc; color: #0a0a0a; }

.stock-done-button {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
}
.stock-done-button:hover { background: #1d4ed8; }

.stock-filter-count {
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #2563eb;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
}

/* ---- 2.3 Status chips ---- */

.stock-status-filter {
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  overflow-x: auto;
}

.stock-status-option {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.stock-status-option:hover { background: #e2e8f0; }
.stock-status-option.active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.stock-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.stock-dot-green  { background: #22c55e; }
.stock-dot-yellow { background: #eab308; }
.stock-dot-red    { background: #ef4444; }

/* ---- 2.4 Store select ---- */

.stock-store-select {
  height: 40px;
  min-width: 130px;
  max-width: 180px;
  padding: 0 32px 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #ffffff;
  color: #000000;
  font-size: 13px;
  font-weight: 700;
  outline: none;
  cursor: pointer;
}
.stock-store-select:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 10%);
}

/* ---- 2.5 Toolbar right cluster ---- */

.stock-toolbar-right {
  flex: 0 0 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}

/* ---- 2.6 Kebab menu ---- */

.stock-menu-wrapper { position: relative; display: inline-flex; }

.stock-kebab-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.stock-kebab-button:hover {
  background: #f8fafc;
  color: #0f172a;
  border-color: #cbd5e1;
}

.stock-menu-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 120;
  min-width: 180px;
  padding: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
}

.stock-menu-dropdown button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #334155;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}
.stock-menu-dropdown button:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
.stock-menu-dropdown button:disabled { opacity: 0.55; cursor: not-allowed; }

/* ---- 2.7 Add Item button ---- */

.stock-add-item-btn {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  color: #ffffff !important;
  border: 1px solid #2563eb !important;
  font-weight: 600 !important;
  padding: 0 18px !important;
  height: 40px !important;
  border-radius: 9px !important;
  box-shadow:
    0 1px 2px rgba(37, 99, 235, 0.20),
    0 4px 12px -2px rgba(37, 99, 235, 0.25) !important;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease !important;
}

.stock-add-item-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%);
  transition: left 0.5s ease;
  pointer-events: none;
}

.stock-add-item-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  border-color: #1d4ed8 !important;
  transform: translateY(-1px);
  box-shadow:
    0 2px 4px rgba(37, 99, 235, 0.25),
    0 10px 22px -6px rgba(37, 99, 235, 0.40) !important;
}
.stock-add-item-btn:hover::before { left: 100%; }

.stock-add-item-btn:active {
  transform: translateY(0) scale(0.98);
  box-shadow:
    0 1px 2px rgba(37, 99, 235, 0.25),
    0 2px 6px -2px rgba(37, 99, 235, 0.30) !important;
}

.stock-add-item-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px #dbeafe,
    0 4px 12px -2px rgba(37, 99, 235, 0.35) !important;
}

.stock-add-item-btn svg { transition: transform 0.18s ease; }
.stock-add-item-btn:hover svg { transform: scale(1.1); }

.stock-add-item-btn:disabled {
  opacity: 0.55 !important;
  cursor: not-allowed !important;
  transform: none !important;
  box-shadow: none !important;
}

/* ==========================================================================
   3. ALERTS
   ========================================================================== */

.stock-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 12px;
  padding: 12px 16px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
}
.stock-alert span { flex: 1; }
.stock-alert button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: #b91c1c;
  cursor: pointer;
}

/* ==========================================================================
   4. SCROLLBARS (shared)
   ========================================================================== */

.stock-table-scroll,
.stock-list-scroll,
.stock-detail-panel,
.stock-inner-table-wrapper,
.manage-main-content,
.manage-side-panel,
.manage-table-wrapper {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.stock-table-scroll::-webkit-scrollbar,
.stock-list-scroll::-webkit-scrollbar,
.stock-detail-panel::-webkit-scrollbar,
.stock-inner-table-wrapper::-webkit-scrollbar,
.manage-main-content::-webkit-scrollbar,
.manage-side-panel::-webkit-scrollbar,
.manage-table-wrapper::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.stock-table-scroll::-webkit-scrollbar-track,
.stock-list-scroll::-webkit-scrollbar-track,
.stock-detail-panel::-webkit-scrollbar-track,
.stock-inner-table-wrapper::-webkit-scrollbar-track,
.manage-main-content::-webkit-scrollbar-track,
.manage-side-panel::-webkit-scrollbar-track,
.manage-table-wrapper::-webkit-scrollbar-track { background: transparent; }
.stock-table-scroll::-webkit-scrollbar-thumb,
.stock-list-scroll::-webkit-scrollbar-thumb,
.stock-detail-panel::-webkit-scrollbar-thumb,
.stock-inner-table-wrapper::-webkit-scrollbar-thumb,
.manage-main-content::-webkit-scrollbar-thumb,
.manage-side-panel::-webkit-scrollbar-thumb,
.manage-table-wrapper::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}
.stock-table-scroll::-webkit-scrollbar-thumb:hover,
.stock-list-scroll::-webkit-scrollbar-thumb:hover,
.stock-detail-panel::-webkit-scrollbar-thumb:hover,
.stock-inner-table-wrapper::-webkit-scrollbar-thumb:hover,
.manage-main-content::-webkit-scrollbar-thumb:hover,
.manage-side-panel::-webkit-scrollbar-thumb:hover,
.manage-table-wrapper::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

/* ==========================================================================
   5. MAIN STOCK TABLE
   ========================================================================== */

.stock-table-card {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}

.stock-table-scroll {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: auto;
}

.stock-main-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
}

.stock-main-table col:nth-child(1) { width: 13%; }
.stock-main-table col:nth-child(2) { width: 20%; }
.stock-main-table col:nth-child(3) { width: 10%; }
.stock-main-table col:nth-child(4) { width: 6%;  }
.stock-main-table col:nth-child(5) { width: 10%; }
.stock-main-table col:nth-child(6) { width: 10%; }
.stock-main-table col:nth-child(7) { width: 9%;  }
.stock-main-table col:nth-child(8):not(:last-child) { width: 12%; }

.stock-main-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}

.stock-main-table td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: middle;
}
.stock-main-table td:nth-child(1) {
  font-weight: 700;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
}
.stock-main-table td:nth-child(2) {
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
}
.stock-main-table td:nth-child(n+3) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stock-main-table tbody tr { cursor: pointer; transition: background 0.15s ease; }
.stock-main-table tbody tr:hover { background: #f8fafc; }
.stock-main-table tbody tr:last-child td { border-bottom: 0; }

.stock-main-table th:last-child,
.stock-main-table td:last-child {
  min-width: 125px;
  width: 125px;
  white-space: nowrap;
}

.stock-sort-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #334155;
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}
.stock-sort-button:hover { color: #0f172a; }

.sort-indicator {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  color: #94a3b8;
  line-height: 0;
}
.sort-indicator svg { display: block; height: 10px; }
.sort-arrow-active { color: #2563eb; }

.stock-item-name-cell {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.stock-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 7px;
  background: #f1f5f9;
  color: #64748b;
}

.stock-item-name {
  min-width: 0;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  color: #1e293b;
  font-weight: 500;
}

.stock-quantity-cell { color: #1e293b !important; font-weight: 700; }

.stock-store-name {
  overflow: hidden;
  color: #111112;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-store-code {
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
}

.stock-table-empty {
  height: 180px !important;
  color: #64748b !important;
  text-align: center !important;
}

/* ==========================================================================
   6. STATUS BADGES
   ========================================================================== */

.stock-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  min-height: 26px;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  box-sizing: border-box;
}
.stock-badge-in  { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.stock-badge-low { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.stock-badge-out { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

/* ==========================================================================
   7. PAGINATION
   ========================================================================== */

.stock-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  min-height: 54px;
  padding: 0 16px;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
}

.stock-pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stock-pagination-controls select {
  height: 32px;
  padding: 0 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
}

.stock-pagination-controls button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
}
.stock-pagination-controls button:hover:not(:disabled) { background: #f8fafc; }
.stock-pagination-controls button:disabled { cursor: not-allowed; opacity: 0.45; }

.stock-pagination-controls strong {
  min-width: 24px;
  color: #1e293b;
  text-align: center;
}

/* ==========================================================================
   8. DETAIL WORKSPACE
   ========================================================================== */

.stock-workspace {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 16px;
  width: 100%;
  min-width: 0;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

/* ---- 8.1 Left sidebar ---- */

.stock-browser {
  min-width: 0;
  height: calc(100vh - 220px);
  min-height: 450px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-sizing: border-box;
}

.stock-list-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  box-sizing: border-box;
}

.stock-list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  min-height: 74px;
  padding: 12px 16px;
  border: 0;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition: background 0.15s ease;
}
.stock-list-row:hover { background: #f8fafc; }
.stock-list-row.selected {
  background: #dbeafe;
  box-shadow: inset 3px 0 0 #2563eb;
}
.stock-list-row.selected .stock-row-copy strong { color: #1d4ed8; }
.stock-list-row.selected .stock-row-icon { background: #bfdbfe; color: #1d4ed8; }

.stock-row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
}

.stock-row-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  gap: 4px;
  overflow: hidden;
}
.stock-row-copy strong {
  display: block;
  overflow: hidden;
  color: #1e293b;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stock-row-copy small {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: #94a3b8;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-row-meta {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: 88px;
}
.stock-row-meta strong { color: #475569; font-size: 11px; font-weight: 600; }

.stock-message {
  padding: 32px 16px;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

/* ---- 8.2 Right detail panel ---- */

.stock-detail-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: calc(100vh - 220px);
  min-height: 450px;
  overflow-y: auto;
  overflow-x: hidden;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-sizing: border-box;
}

.stock-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
}

.stock-product-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
  min-height: 88px;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.stock-product-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.stock-product-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
}

.stock-product-heading { min-width: 0; }

.stock-title-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.stock-title-line h2 {
  max-width: 520px;
  margin: 0;
  overflow: hidden;
  color: #0f172a;
  font-size: 17px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-product-heading p {
  margin: 8px 0 0;
  overflow: hidden;
  color: #475569;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.stock-edit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.stock-edit-button:hover { background: #1d4ed8; }

.stock-close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #dc2626;
  cursor: pointer;
}
.stock-close-button:hover { background: #fef2f2; }

/* ---- 8.3 Tabs ---- */

.stock-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-height: 52px;
  padding: 0 20px;
  overflow-x: auto;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.stock-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.stock-tabs button:hover { color: #1e293b; }
.stock-tabs button.active { border-bottom-color: #2563eb; color: #2563eb; }

.stock-tab-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.stock-overview-content,
.stock-tab-content {
  height: 100%;
  padding: 20px;
  overflow: hidden;
}

.stock-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.stock-section-heading h3 {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
}
.stock-section-heading p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}

.stock-info-grid {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}
.stock-info-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.stock-info-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.stock-info-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

.stock-field {
  min-width: 0;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #f8fafc;
}
.stock-field span {
  display: block;
  margin-bottom: 8px;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}
.stock-field strong {
  display: block;
  overflow: hidden;
  color: #1e293b;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-summary-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.stock-summary-card {
  min-width: 170px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #ffffff;
}
.stock-summary-card span {
  display: block;
  margin-bottom: 8px;
  color: #475569;
  font-size: 12px;
}
.stock-summary-card strong {
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
}

/* ---- 8.4 Inner tables ---- */

.stock-inner-table-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.stock-inner-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 12px;
}
.stock-inner-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.stock-inner-table td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  white-space: normal;
  overflow-wrap: break-word;
}
.stock-inner-table td strong { color: #0f172a; }
.stock-inner-table tr:last-child td { border-bottom: 0; }

.stock-table-action {
  margin-left: 8px;
  padding: 3px;
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  vertical-align: middle;
}

/* ==========================================================================
   9. MANAGE PAGE
   ========================================================================== */

.manage-page-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #f8fafc;
  color: #1e293b;
  font-family: var(--cs-font);
}

.manage-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-shrink: 0;
  margin-bottom: 16px;
}
.manage-breadcrumb { margin-bottom: 8px; color: #64748b; font-size: 12px; }
.manage-page-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  font-weight: 700;
}
.manage-page-header p { margin: 8px 0 0; color: #64748b; font-size: 13px; }

.manage-close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
}
.manage-close-button:hover { background: #fef2f2; color: #dc2626; }

.manage-layout {
  display: flex;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  gap: 20px;
  overflow: hidden;
}

.manage-main-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding-right: 4px;
  overflow-y: auto;
}

.manage-side-panel {
  display: flex;
  flex-direction: column;
  width: 290px;
  flex-shrink: 0;
  min-height: 0;
  overflow-y: auto;
  gap: 16px;
}

.manage-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  padding: 24px;
  margin-bottom: 20px;
}
.manage-details-card { padding: 0; overflow: hidden; }

.manage-card-heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
}
.manage-card-heading h2 { margin: 0; color: #0f172a; font-size: 16px; font-weight: 700; }
.manage-card-heading p { margin: 0; color: #64748b; font-size: 12px; }

/* ---- 9.1 Section tabs ---- */

.manage-section-tabs {
  display: flex;
  align-items: center;
  gap: 24px;
  min-height: 46px;
  padding: 0 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
  overflow-x: auto;
}

.manage-section-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 46px;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #475569;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.manage-section-tab::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: transparent;
}
.manage-section-tab-active { color: #2563eb; }
.manage-section-tab-active::after { background: #2563eb; }
.manage-section-tab:hover { color: #1e293b; }

.manage-tab-panel { padding: 20px; background: #ffffff; }

.manage-panel-heading { margin-bottom: 16px; }
.manage-panel-heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
}
.manage-panel-heading p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.manage-three-column-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

/* ---- 9.2 Form fields ---- */

.manage-form-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 8px;
}
.manage-form-field label {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}
.manage-form-field input,
.manage-form-field select,
.manage-form-field textarea {
  box-sizing: border-box;
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  outline: none;
  background: #ffffff;
  color: #1e293b;
  font-family: inherit;
  font-size: 13px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.manage-form-field textarea {
  height: auto;
  min-height: 90px;
  padding: 12px;
  resize: vertical;
}
.manage-form-field input:focus,
.manage-form-field select:focus,
.manage-form-field textarea:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.manage-form-field input:disabled,
.manage-form-field select:disabled,
.manage-form-field textarea:disabled {
  background: #f8fafc;
  color: #64748b;
  cursor: not-allowed;
}
.manage-form-field input::placeholder { color: #94a3b8; }

/* ---- 9.3 Transactions table ---- */

.manage-table-wrapper {
  width: 100%;
  max-height: 50vh;
  overflow: auto;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
}

.manage-table {
  width: 100%;
  min-width: 480px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
}
.manage-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.manage-table td {
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  font-size: 13px;
  text-align: left;
  vertical-align: middle;
  white-space: normal;
  overflow-wrap: break-word;
}
.manage-table tbody tr:last-child td { border-bottom: none; }
.manage-table tbody tr:hover { background: #f8fafc; }

.manage-transaction-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
}

.manage-table-empty {
  padding: 32px 12px !important;
  color: #64748b !important;
  text-align: center !important;
}

/* ---- 9.4 Stock adjustment ---- */

.manage-adjustment-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.manage-adjustment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.manage-adjustment-notice {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
}
.manage-adjustment-notice strong { color: #0f172a; }

.manage-adjustment-button {
  align-self: flex-start;
  min-height: 38px;
  padding: 8px 16px;
  border: 1px solid #d92d20;
  border-radius: 7px;
  background: #d92d20;
  color: #ffffff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.manage-adjustment-button:hover { background: #b42318; border-color: #b42318; }

/* ---- 9.5 Right summary panel ---- */

.manage-summary-card {
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}
.manage-summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 20px;
}
.manage-summary-card h2 {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.manage-summary-card p { margin: 4px 0 0; color: #64748b; font-size: 12px; line-height: 1.4; }

.manage-summary-status {
  display: inline-flex;
  margin-top: 12px;
  padding: 4px 12px;
  border-radius: 999px;
  background: #fff4e5;
  color: #b54708;
  font-size: 11px;
  font-weight: 700;
}

.manage-summary-divider { height: 1px; margin: 16px 0; background: #f1f5f9; }

.manage-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.manage-summary-row:last-child { margin-bottom: 0; }
.manage-summary-row span { color: #64748b; font-size: 12px; }
.manage-summary-row strong {
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
  text-align: right;
}

/* ---- 9.6 Action area ---- */

.manage-actions-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}

.manage-save-button {
  width: 100%;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.manage-save-button:hover { background: #1d4ed8; border-color: #1d4ed8; }
.manage-save-button:disabled { opacity: 0.6; cursor: not-allowed; }

.manage-save-message { color: #15803d; font-size: 12px; line-height: 1.4; }

/* ---- 9.7 Alerts / loading / errors ---- */

.manage-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
}
.manage-alert button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.manage-alert-error { border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; }
.manage-alert-error button { color: #b91c1c; }
.manage-alert-success { justify-content: flex-start; border: 1px solid #bbf7d0; background: #f0fdf4; color: #15803d; }

.manage-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #475569;
  font-size: 14px;
}

.manage-error-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #ffffff;
  color: #b91c1c;
}

/* ==========================================================================
   10. ADD ITEM DRAWER + OPENING STOCK MANUAL ENTRY
   ========================================================================== */

/* ---- 10.1 Overlay + panel ---- */

.stock-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  animation: stockDrawerFade 0.2s ease both;
}
@keyframes stockDrawerFade { from { opacity: 0; } to { opacity: 1; } }

.stock-drawer {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  z-index: 201;
  width: 560px;
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
  box-shadow: -16px 0 40px rgba(15, 23, 42, 0.18);
  animation: stockDrawerSlide 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes stockDrawerSlide {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

.stock-drawer--wide { width: 440px; max-width: 100vw; }

/* ---- 10.2 Header ---- */

.stock-drawer-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
  flex-shrink: 0;
}

.stock-drawer-eyebrow {
  display: block;
  margin-bottom: 4px;
  color: #1d4ed8;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.9px;
  text-transform: uppercase;
}

.stock-drawer-title {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.4px;
  line-height: 1.15;
}

.stock-drawer-desc {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12.5px;
  line-height: 1.45;
  max-width: 460px;
}

.stock-drawer-close {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.stock-drawer-close:hover { background: #f1f5f9; color: #0f172a; }

/* ---- 10.3 Body — no scrollbar, white background ---- */

.stock-drawer-body,
.stock-drawer-body--embedded {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 20px 18px;
  background: #ffffff;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.stock-drawer-body::-webkit-scrollbar,
.stock-drawer-body--embedded::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.stock-drawer * { scrollbar-width: none; }
.stock-drawer *::-webkit-scrollbar { width: 0; height: 0; display: none; }

/* ---- 10.4 Manual entry panel ---- */

.opening-manual-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
}
.opening-manual-panel--compact {
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
}

.opening-manual-panel h3 {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
}

.opening-manual-panel > p {
  margin: 0;
  color: #64748b;
  font-size: 12.5px;
  line-height: 1.5;
}

.opening-manual-panel form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.opening-manual-panel--compact form { gap: 14px; }

/* ---- 10.5 Fields grid ---- */

.opening-manual-fields {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 14px !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
}
.opening-manual-fields--compact {
  grid-template-columns: 1fr !important;
  gap: 12px !important;
}

.opening-manual-fields label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}
.opening-manual-panel--compact .opening-manual-fields label {
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.01em;
}

/* ---- 10.6 Inputs ---- */

.opening-manual-fields input {
  height: 38px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.opening-manual-fields input::placeholder { color: #9ca3af; font-weight: 400; }
.opening-manual-fields input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px #dbeafe;
}

/* ---- 10.7 Submit button ---- */

.opening-manual-panel .bulk-button,
.opening-manual-panel .bulk-button--primary {
  align-self: flex-start;
  height: 40px;
  padding: 0 20px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.2);
}
.opening-manual-panel .bulk-button:hover:not(:disabled),
.opening-manual-panel .bulk-button--primary:hover:not(:disabled) {
  background: #1d4ed8;
  border-color: #1d4ed8;
}
.opening-manual-panel .bulk-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ---- 10.8 Alerts ---- */

.opening-manual-panel .bulk-alert {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
}
.opening-manual-panel .bulk-alert--error {
  background: #fee2e2;
  color: #991b1b;
  border-left: 3px solid #dc2626;
}
.opening-manual-panel .bulk-alert--success {
  background: #dcfce7;
  color: #166534;
  border-left: 3px solid #16a34a;
}

/* ---- 10.9 Approval-requests section (non-compact only) ---- */

.bulk-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}
.bulk-preview-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}
.bulk-preview-head .bulk-button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #ffffff;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.bulk-table-wrap {
  max-width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: auto;
  background: #ffffff;
}

.bulk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.bulk-table th {
  position: sticky;
  top: 0;
  padding: 10px 12px;
  background: #f8fafc;
  color: #475569;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}
.bulk-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: middle;
}
.bulk-table tr:last-child td { border-bottom: 0; }

/* ==========================================================================
   11. BULK UPLOAD SHELL (Import stock)
   ========================================================================== */

.stock-bulk-view {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0;
  width: 100%;
  max-width: 100%;
  margin: 0;
}

.bulk-page-shell {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
  max-width: 100%;
  margin: 0;
  background: #ffffff;
  color: #0f172a;
  font-family: var(--cs-font);
}

.bulk-page-shell__body {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 24px 32px 28px;
  overflow-y: auto;
  box-sizing: border-box;
}

/* ---- 11.1 Title row ---- */

.bulk-page-shell__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
  width: 100%;
}
.bulk-page-shell__title-row h2 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.2px;
}
.bulk-page-shell__title-row p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  max-width: 620px;
}

.bulk-page-shell__sample-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, border-color 0.15s ease;
  
}
.bulk-page-shell__sample-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

/* ---- 11.2 Store select ---- */

.bulk-page-shell__store {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 320px;
  margin-bottom: 16px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}
.bulk-page-shell__store select {
  height: 38px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  font-size: 13px;
  color: #0f172a;
  outline: none;
}
.bulk-page-shell__store select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px #dbeafe;
}

/* ---- 11.3 Dropzone ---- */

.bulk-page-shell__dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-height: 320px;
  padding: 56px 24px;
  margin: 0;
  box-sizing: border-box;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.bulk-page-shell__dropzone:hover {
  border-color: #93c5fd;
  background: #f8fafc;
}
.bulk-page-shell__dropzone.has-file {
  border-color: #93c5fd;
  background: #eff6ff;
}
.bulk-page-shell__dropzone.is-busy {
  opacity: 0.7;
  cursor: wait;
}

.bulk-page-shell__dropzone-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 10px;
  background: #dbeafe;
  color: #2563eb;
  margin-bottom: 6px;
}

.bulk-page-shell__dropzone-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

.bulk-page-shell__dropzone-sub {
  font-size: 12.5px;
  color: #64748b;
  margin-bottom: 8px;
}

.bulk-page-shell__dropzone-browse {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 16px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  font-size: 12.5px;
  font-weight: 600;
  pointer-events: none;
}

/* ---- 11.4 Remove-file button ---- */

.bulk-page-shell__remove-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #ffffff;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.bulk-page-shell__remove-file:hover {
  background: #fef2f2;
  border-color: #fecaca;
}

/* ---- 11.5 Footer ---- */

.bulk-page-shell__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
  margin-top: 22px;
  padding-top: 22px;
  border-top: 1px solid #e2e8f0;
  box-sizing: border-box;
}

.bulk-page-shell__cancel {
  height: 40px;
  padding: 0 20px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.bulk-page-shell__cancel:hover { background: #f8fafc; }

.bulk-page-shell__primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 20px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
}
.bulk-page-shell__primary:hover:not(:disabled) { background: #1d4ed8; }
.bulk-page-shell__primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---- 11.6 Preview blocks that appear after upload ---- */

.bulk-filebar,
.bulk-preview-head,
.bulk-table-wrap,
.bulk-kpis,
.bulk-discount-control {
  max-width: 100% !important;
}

/* ==========================================================================
   12. HIDE PARENT PAGE TITLE WHEN BULK VIEW IS ACTIVE
   ========================================================================== */

*:has(> .current-stock-shell.is-bulk-view) > h1,
*:has(> .current-stock-shell.is-bulk-view) > h2,
*:has(> .current-stock-shell.is-bulk-view) > h3,
*:has(> .current-stock-shell.is-bulk-view) > .page-title,
*:has(> .current-stock-shell.is-bulk-view) > .page-header,
*:has(> .current-stock-shell.is-bulk-view) > .inventory-header,
*:has(> .current-stock-shell.is-bulk-view) > header:not(.stock-drawer-header) {
  display: none !important;
}

body:has(.current-stock-shell.is-bulk-view) .inventory-page > h1,
body:has(.current-stock-shell.is-bulk-view) .inventory-page > h2,
body:has(.current-stock-shell.is-bulk-view) .inventory-page > p,
body:has(.current-stock-shell.is-bulk-view) .page-title,
body:has(.current-stock-shell.is-bulk-view) .page-subtitle {
  display: none !important;
}

/* ==========================================================================
   13. RESPONSIVE
   ========================================================================== */

@media (max-width: 1250px) {
  .stock-toolbar { align-items: flex-start; }
  .stock-search-wrapper { flex: 1 1 280px; }
  .stock-status-filter { order: 4; flex: 1 1 100%; width: 100%; }
  .stock-toolbar-right { margin-left: auto; }
}

@media (max-width: 1200px) {
  .stock-workspace { grid-template-columns: 340px minmax(0, 1fr); }
}

@media (max-width: 1000px) {
  .stock-workspace { grid-template-columns: 310px minmax(0, 1fr); }
  .manage-three-column-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .manage-side-panel { width: 260px; }
}

@media (max-width: 900px) {
  .manage-layout { flex-direction: column; overflow-y: auto; }
  .manage-main-content { overflow: visible; padding-right: 0; }
  .manage-side-panel { width: 100%; overflow: visible; }
}

@media (max-width: 760px) {
  .stock-toolbar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: stretch;
    gap: 12px;
  }
  .stock-search-wrapper { grid-column: 1 / -1; width: 100%; max-width: none; }
  .stock-filter-wrapper { width: 100%; }
  .stock-filter-wrapper > button { width: 100%; }
  .stock-toolbar-right { width: 100%; margin-left: 0; }
  .stock-toolbar-right > button,
  .stock-store-select { width: 100%; max-width: none; }
  .stock-status-filter { grid-column: 1 / -1; width: 100%; overflow-x: auto; }

  .stock-workspace {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .stock-browser { width: 100%; height: 320px; min-height: 260px; }
  .stock-detail-panel { width: 100%; height: auto; min-height: 450px; }
}

@media (max-width: 720px) {
  .stock-drawer,
  .stock-drawer--wide {
    width: 100vw !important;
    border-left: 0;
  }
  .opening-manual-fields,
  .opening-manual-fields--compact {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 700px) {
  .stock-tabs { overflow-x: auto; }
  .stock-product-header { align-items: flex-start; }
  .stock-title-line h2 { max-width: 220px; }
  .stock-header-actions { flex-direction: column; }

  .stock-overview-content,
  .stock-tab-content { padding: 16px; }

  .stock-info-grid-4,
  .stock-info-grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  .manage-card { padding: 16px; }
  .manage-tab-panel { padding: 16px; }
  .manage-section-tabs { gap: 20px; }
  .manage-section-tab { flex: 0 0 auto; }
  .manage-adjustment-grid { grid-template-columns: 1fr; }

  .bulk-page-shell__body { padding: 18px 16px 22px; }
  .bulk-page-shell__title-row { flex-direction: column; align-items: stretch; }
  .bulk-page-shell__dropzone { padding: 40px 16px; min-height: 240px; }
}

@media (max-width: 500px) {
  .stock-product-header { flex-direction: column; }
  .stock-header-actions { flex-direction: row; width: 100%; }
  .stock-edit-button { flex: 1; }

  .stock-info-grid-4,
  .stock-info-grid-3,
  .stock-info-grid-2 { grid-template-columns: 1fr; }

  .stock-toolbar { grid-template-columns: 1fr; }
  .stock-search-wrapper,
  .stock-filter-wrapper,
  .stock-toolbar-right,
  .stock-status-filter { grid-column: auto; width: 100%; }
  .stock-toolbar-right { display: grid; grid-template-columns: 1fr; }

  .stock-filter-menu { width: min(260px, calc(100vw - 40px)); }

  .manage-page-header h1 { font-size: 21px; }
  .manage-three-column-grid { grid-template-columns: 1fr; }
  .manage-tab-panel { padding: 12px; }
}
/* ================================================================
   Add Item drawer — inline asterisk, compact, minimal, no scroll
   ================================================================ */

/* ---- 1. Label as block so text + * stay inline, input drops below ---- */
.opening-manual-panel--compact .opening-manual-fields label,
.opening-manual-fields--compact label {
  display: block !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  line-height: 1.3 !important;
}

/* The asterisk renders inline right after the label text */
.opening-manual-panel--compact .opening-manual-fields label .stock-req,
.opening-manual-fields--compact label .stock-req {
  display: inline !important;
  margin-left: 3px;
  color: #dc2626 !important;
  font-weight: 800 !important;
  font-size: 13px !important;
}

/* Input drops to its own row, takes full width of the label */
.opening-manual-panel--compact .opening-manual-fields label input,
.opening-manual-fields--compact label input {
  display: block !important;
  width: 100% !important;
  margin-top: 6px;
  box-sizing: border-box;
}

/* ---- 2. Compact vertical rhythm — pulls everything tighter ---- */
.opening-manual-fields--compact {
  gap: 10px !important;
}

.opening-manual-panel--compact form {
  gap: 12px !important;
}

.opening-manual-panel--compact .opening-manual-fields input {
  height: 34px !important;
  padding: 0 10px !important;
  font-size: 12.5px !important;
}

.opening-manual-panel--compact .bulk-button,
.opening-manual-panel--compact .bulk-button--primary {
  height: 36px !important;
  padding: 0 16px !important;
  font-size: 13px !important;
}

/* ---- 3. Rounded border radius for inputs ---- */
.opening-manual-panel--compact .opening-manual-fields input,
.opening-manual-fields--compact label input {
  border-radius: 8px !important;
  border: 1px solid #d1d5db !important;
}

.opening-manual-panel--compact .bulk-button,
.opening-manual-panel--compact .bulk-button--primary {
  border-radius: 8px !important;
}

/* ---- 4. Soft bottom shadow on inputs + focus lift ---- */
.opening-manual-panel--compact .opening-manual-fields input,
.opening-manual-fields--compact label input {
  box-shadow:
    0 1px 0 rgba(15, 23, 42, 0.04),
    0 2px 3px -1px rgba(15, 23, 42, 0.05) !important;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease !important;
}

.opening-manual-panel--compact .opening-manual-fields input:hover,
.opening-manual-fields--compact label input:hover {
  border-color: #94a3b8 !important;
  box-shadow:
    0 1px 0 rgba(15, 23, 42, 0.05),
    0 3px 5px -1px rgba(15, 23, 42, 0.07) !important;
}

.opening-manual-panel--compact .opening-manual-fields input:focus,
.opening-manual-fields--compact label input:focus {
  border-color: #2563eb !important;
  box-shadow:
    0 0 0 3px #dbeafe,
    0 2px 4px -1px rgba(37, 99, 235, 0.10) !important;
}

/* ---- 5. Tighten the drawer header so more fields fit ---- */
.stock-drawer-header {
  padding: 14px 20px 10px !important;
}

.stock-drawer-title {
  font-size: 22px !important;
}

.stock-drawer-body,
.stock-drawer-body--embedded {
  padding: 12px 20px 16px !important;
}

/* ---- 6. Even with everything above, hide any scrollbar that slips in ---- */
.stock-drawer-body,
.stock-drawer-body--embedded,
.stock-drawer .stock-drawer-body,
.stock-drawer * {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.stock-drawer-body::-webkit-scrollbar,
.stock-drawer-body--embedded::-webkit-scrollbar,
.stock-drawer *::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}
.bulk-page-shell__title-row:has(> button:only-child) {
  justify-content: flex-end;
}

`}</style>
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
              {activeFilterCount > 0 && (
                <span className="stock-filter-count">{activeFilterCount}</span>
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
                      const name = brand.brandName || brand.name;
                      return (
                        <option
                          key={brand.id || brand.brandId || name}
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
                    onChange={changeFilter(setCategoryFilter)}
                  >
                    <option value="">All categories</option>
                    {categories.map((category) => {
                      const name = category.categoryName || category.name;
                      return (
                        <option
                          key={category.id || category.categoryId || name}
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
                      <span className={`stock-status-dot ${option.dot}`} />
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
                  <option key={store.id} value={store.id}>
                    {store.storeName}
                  </option>
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
                      onClick={() => {
                        setImportExportOpen(false);
                        exportStock();
                      }}
                    >
                      <Download size={15} />
                      {exporting ? "Exporting..." : "Export stock"}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setImportExportOpen(false);
                        setView("bulk-upload");
                      }}
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
                      onClick={() => toggleSort("partNumber")}
                    >
                      <span>Part number</span>
                      <SortIndicator
                        active={sortBy === "partNumber"}
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
                      <td title={item.partNumber}>
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
                      <td title={item.brandName}>{display(item.brandName)}</td>
                      <td className="stock-quantity-cell">
                        {display(item.quantity)}
                      </td>
                      <td>{money(item.purchasePrice)}</td>
                      <td>{money(item.sellingPrice)}</td>
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
                        <span className={badgeClasses[itemStatus.key]}>
                          {itemStatus.label}
                        </span>
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
                      <span className={badgeClasses[itemStatus.key]}>
                        {itemStatus.label}
                      </span>
                      <strong>Qty {display(item.quantity)}</strong>
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
                    <div className="stock-product-avatar">
                      <Boxes size={24} />
                    </div>
                    <div className="stock-product-heading">
                      <div className="stock-title-line">
                        <h2>{display(current.itemName)}</h2>
                        <span className={badgeClasses[currentStatus.key]}>
                          {currentStatus.label}
                        </span>
                      </div>
                      <p>
                        {display(current.brandName)} · Part No.{" "}
                        {display(current.partNumber)}
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
                  {tab === "sale-history" && (
                    <div className="stock-tab-content">
                      <SaleHistoryTable sales={saleHistory} />
                    </div>
                  )}
                  {tab === "batches" && (
                    <div className="stock-tab-content">
                      <BatchTable batches={batches} />
                    </div>
                  )}
                  {tab === "locations" && (
                    <div className="stock-tab-content">
                      <LocationTable locations={locations?.content || []} />
                    </div>
                  )}
                  {tab === "fitment" && (
                    <div className="stock-tab-content">
                      <VehicleFitmentTable fitments={vehicleFitment} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Item drawer — renders OpeningStockManualEntry inside a slide-over */}
      {addItemOpen && (
        <>
          <div
            className="stock-drawer-overlay"
            onClick={() => setAddItemOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="stock-drawer stock-drawer--wide"
            role="dialog"
            aria-modal="true"
            aria-label="Add Item"
          >
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
      <span>
        {totalElements
          ? `${firstItem}-${lastItem} of ${totalElements}`
          : "0 items"}
      </span>
      <div className="stock-pagination-controls">
        {!compact && (
          <select
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
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
                <strong>{display(batch.batchNumber)}</strong>
              </td>
              <td>
                {batch.receivedDate
                  ? new Date(batch.receivedDate).toLocaleDateString("en-IN")
                  : "-"}
              </td>
              <td>{display(batch.availableQuantity)}</td>
              <td>{money(batch.purchasePrice)}</td>
              <td>{money(batch.sellingPrice)}</td>
              <td>{money(batch.mrp)}</td>
              <td>{display(batch.rackNumber)}</td>
            </tr>
          ))}
          {!batches.length && (
            <tr>
              <td colSpan={7} className="stock-table-empty">
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
                <strong>{display(location.storeName)}</strong>
              </td>
              <td>{display(location.storeLocation || location.address)}</td>
              <td>{display(location.availableQuantity)}</td>
              <td>{money(location.mrp)}</td>
            </tr>
          ))}
          {!locations.length && (
            <tr>
              <td colSpan={4} className="stock-table-empty">
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
            <tr key={sale.id || index}>
              <td>
                <strong>{display(sale.remarks)}</strong>
              </td>
              <td>
                {sale.createdAt
                  ? new Date(sale.createdAt).toLocaleDateString("en-IN")
                  : "-"}
              </td>
              <td>{display(sale.quantity)}</td>
              <td>{money(sale.salePrice)}</td>
              <td>{money(sale.totalAmount)}</td>
            </tr>
          ))}
          {!sales.length && (
            <tr>
              <td colSpan={5} className="stock-table-empty">
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
            <tr key={fitment.id || index}>
              <td>
                <strong>{display(fitment.make)}</strong>
              </td>
              <td>{display(fitment.model)}</td>
              <td>{display(fitment.variantFullName)}</td>
              <td>
                {fitment.year || fitment.toYear
                  ? `${fitment.year || "-"} - ${fitment.year || "-"}`
                  : "-"}
              </td>
            </tr>
          ))}
          {!fitments.length && (
            <tr>
              <td colSpan={4} className="stock-table-empty">
                No vehicle fitment found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
