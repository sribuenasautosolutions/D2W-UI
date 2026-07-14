import { useEffect, useMemo, useState } from "react";
import { getBatchReport } from "../../../services/inventoryService";

/* ============================================================
   CONSTANTS
   ============================================================ */

const LOW_STOCK_THRESHOLD = 5; // TODO: replace with real business rule if one exists
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const COLORS = {
    bg: "#f8fafc",
    card: "#ffffff",
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    headerBg: "#0f172a",
    headerBgAlt: "#1e293b",
    primary: "#2563eb",
    primaryDark: "#1d4ed8",
    primaryTint: "#eff6ff",
    textPrimary: "#0f172a",
    textSecondary: "#64748b",
    textMuted: "#94a3b8",
    success: "#16a34a",
    successBg: "#dcfce7",
    successBorder: "#bbf7d0",
    gray: "#475569",
    grayBg: "#f1f5f9",
    grayBorder: "#e2e8f0",
    warning: "#c2410c",
    warningBg: "#ffedd5",
    warningBorder: "#fed7aa",
    danger: "#dc2626",
    dangerBg: "#fef2f2",
    dangerBorder: "#fecaca",
    rowStripe: "#f8fafc",
    rowHover: "#eff6ff",
};

const FONT_STACK =
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/* ============================================================
   STYLE OBJECT
   ============================================================ */

const S = {
    page: {
        fontFamily: FONT_STACK,
        background: COLORS.bg,
        minHeight: "100vh",
        padding: "24px",
        color: COLORS.textPrimary,
        boxSizing: "border-box",
    },
    headerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "12px",
        marginBottom: "20px",
    },
    eyebrow: {
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: COLORS.textSecondary,
        marginBottom: "4px",
    },
    title: {
        fontSize: "24px",
        fontWeight: 700,
        margin: 0,
        color: COLORS.textPrimary,
        letterSpacing: "-0.01em",
    },
    headerActions: {
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
    },

    /* KPI cards */
    kpiGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: "14px",
        marginBottom: "22px",
    },
    kpiCard: {
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "12px",
        padding: "16px 18px",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        transition: "box-shadow 0.15s ease, transform 0.15s ease",
        cursor: "default",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    kpiIconWrap: (bg, fg) => ({
        width: "36px",
        height: "36px",
        borderRadius: "9px",
        background: bg,
        color: fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "17px",
        flexShrink: 0,
    }),
    kpiValue: {
        fontSize: "24px",
        fontWeight: 700,
        color: COLORS.textPrimary,
        lineHeight: 1.1,
    },
    kpiLabel: {
        fontSize: "12.5px",
        color: COLORS.textSecondary,
        fontWeight: 500,
    },

    /* Filter toolbar */
    toolbar: {
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "18px",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
    },
    toolbarGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "10px",
        marginBottom: "12px",
    },
    fieldLabel: {
        fontSize: "11px",
        fontWeight: 600,
        color: COLORS.textSecondary,
        marginBottom: "5px",
        display: "block",
        textTransform: "uppercase",
        letterSpacing: "0.03em",
    },
    input: {
        width: "100%",
        padding: "9px 11px",
        border: `1px solid ${COLORS.borderStrong}`,
        borderRadius: "8px",
        outline: "none",
        fontSize: "13.5px",
        fontFamily: FONT_STACK,
        color: COLORS.textPrimary,
        background: "#fff",
        boxSizing: "border-box",
    },
    select: {
        width: "100%",
        padding: "9px 11px",
        border: `1px solid ${COLORS.borderStrong}`,
        borderRadius: "8px",
        outline: "none",
        fontSize: "13.5px",
        fontFamily: FONT_STACK,
        color: COLORS.textPrimary,
        background: "#fff",
        boxSizing: "border-box",
        cursor: "pointer",
    },
    toolbarActions: {
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        borderTop: `1px solid ${COLORS.border}`,
        paddingTop: "12px",
    },
    btn: {
        padding: "9px 14px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        border: "1px solid transparent",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: FONT_STACK,
        transition: "filter 0.15s ease, background 0.15s ease",
    },
    btnPrimary: {
        background: COLORS.primary,
        color: "#fff",
    },
    btnGhost: {
        background: "#fff",
        color: COLORS.textPrimary,
        border: `1px solid ${COLORS.borderStrong}`,
    },
    btnSubtle: {
        background: COLORS.grayBg,
        color: COLORS.textPrimary,
        border: `1px solid ${COLORS.border}`,
    },

    /* Table card */
    tableCard: {
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "12px",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        overflow: "hidden",
    },
    tableScroll: {
        overflowX: "auto",
        maxWidth: "100%",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        minWidth: "1180px",
        fontSize: "13px",
    },
    th: {
        position: "sticky",
        top: 0,
        background: COLORS.headerBg,
        color: "#e2e8f0",
        fontWeight: 600,
        fontSize: "11.5px",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        padding: "12px 14px",
        whiteSpace: "nowrap",
        userSelect: "none",
        zIndex: 1,
    },
    thSortable: { cursor: "pointer" },
    td: {
        padding: "11px 14px",
        borderBottom: `1px solid ${COLORS.border}`,
        color: COLORS.textPrimary,
        whiteSpace: "nowrap",
    },
    tableFooter: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 16px",
        borderTop: `1px solid ${COLORS.border}`,
        flexWrap: "wrap",
        gap: "10px",
    },

    badge: (bg, fg, border) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "11.5px",
        fontWeight: 600,
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
    }),

    iconBtn: {
        width: "28px",
        height: "28px",
        borderRadius: "7px",
        border: `1px solid ${COLORS.border}`,
        background: "#fff",
        color: COLORS.textSecondary,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        marginRight: "6px",
        fontSize: "13px",
    },

    /* Empty / loading / error */
    centerState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        textAlign: "center",
        gap: "10px",
    },

    /* Modal */
    modalOverlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "20px",
    },
    modalBox: {
        background: "#fff",
        borderRadius: "14px",
        width: "560px",
        maxWidth: "100%",
        maxHeight: "88vh",
        overflowY: "auto",
        boxShadow: "0 20px 50px rgba(15,23,42,0.35)",
    },
    modalHeader: {
        padding: "18px 22px",
        borderBottom: `1px solid ${COLORS.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        background: "#fff",
    },
    modalBody: {
        padding: "20px 22px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "14px",
    },
    modalField: {
        display: "flex",
        flexDirection: "column",
        gap: "3px",
    },
    modalFooter: {
        padding: "16px 22px",
        borderTop: `1px solid ${COLORS.border}`,
        display: "flex",
        justifyContent: "flex-end",
        gap: "8px",
    },
};

/* ============================================================
   HELPERS
   ============================================================ */

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
        return {};
    }
}

function formatCurrency(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return "₹0.00";
    return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getBatchStatus(batch) {
    const available = Number(batch.availableQuantity) || 0;
    if (!batch.active || available <= 0) {
        return { key: "CONSUMED", label: "Consumed" };
    }
    if (available <= LOW_STOCK_THRESHOLD) {
        return { key: "LOW", label: "Low Quantity" };
    }
    return { key: "ACTIVE", label: "Active" };
}

function StatusBadge({ batch }) {
    const status = getBatchStatus(batch);
    if (status.key === "ACTIVE") {
        return <span style={S.badge(COLORS.successBg, COLORS.success, COLORS.successBorder)}>● Active</span>;
    }
    if (status.key === "LOW") {
        return <span style={S.badge(COLORS.warningBg, COLORS.warning, COLORS.warningBorder)}>● Low Quantity</span>;
    }
    return <span style={S.badge(COLORS.grayBg, COLORS.gray, COLORS.grayBorder)}>● Consumed</span>;
}

function uniqueValues(list, key) {
    const set = new Set();
    list.forEach((item) => {
        if (item[key]) set.add(item[key]);
    });
    return Array.from(set).sort();
}

function toCsv(rows) {
    const headers = [
        "Batch Number", "Store", "Brand", "Category", "Product", "Part Number",
        "Received Qty", "Available Qty", "Consumed Qty", "Purchase Price",
        "Selling Price", "MRP", "Received Date", "Status",
    ];
    const lines = [headers.join(",")];
    rows.forEach((b) => {
        const status = getBatchStatus(b).label;
        const line = [
            b.batchNumber, b.storeName || "", b.brandName, b.categoryName || "", b.itemName,
            b.partNumber, b.receivedQuantity, b.availableQuantity, b.consumedQuantity,
            b.purchasePrice, b.sellingPrice, b.mrp, b.receivedDate, status,
        ].map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`);
        lines.push(line.join(","));
    });
    return lines.join("\n");
}

function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/* ============================================================
   ICONS (inline SVG, no icon library dependency)
   ============================================================ */

const Icon = {
    Boxes: (p) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" />
        </svg>
    ),
    Check: (p) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
        </svg>
    ),
    Archive: (p) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <rect x="3" y="3" width="18" height="5" rx="1" /><path d="M4 8v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8" /><path d="M10 12h4" />
        </svg>
    ),
    Layers: (p) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
    ),
    Rupee: (p) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M6 3h12" /><path d="M6 8h12" /><path d="M6 3c0 6 8 6 8 12l-8-6h8" />
        </svg>
    ),
    Tag: (p) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M20.6 12.6 12.4 20.8a2 2 0 0 1-2.8 0l-6.4-6.4a2 2 0 0 1 0-2.8l8.2-8.2a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v6.2a2 2 0 0 1-.4 1.4z" />
            <circle cx="15.5" cy="7.5" r="1.5" />
        </svg>
    ),
    Search: (p) => (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
    ),
    Refresh: (p) => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        </svg>
    ),
    Excel: (p) => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
            <path d="M9 13l6 6" /><path d="M15 13l-6 6" />
        </svg>
    ),
    Pdf: (p) => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
        </svg>
    ),
    Printer: (p) => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M6 9V2h12v7" /><rect x="6" y="14" width="12" height="8" /><path d="M6 18H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3" />
        </svg>
    ),
    Eye: (p) => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
        </svg>
    ),
    Sort: (p) => (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M8 9l4-4 4 4" /><path d="M16 15l-4 4-4-4" />
        </svg>
    ),
    Close: (p) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M18 6 6 18" /><path d="M6 6l12 12" />
        </svg>
    ),
    Inbox: (p) => (
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
            <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
    ),
    Alert: (p) => (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4" /><path d="M12 17h.01" />
        </svg>
    ),
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

function BatchReportPage() {
    /* ---- existing state (unchanged) ---- */
    const [batches, setBatches] = useState([]);
    const [searchText, setSearchText] = useState("");

    /* ---- new UI-only state ---- */
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [brandFilter, setBrandFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [productFilter, setProductFilter] = useState("");
    const [storeFilter, setStoreFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const [sortConfig, setSortConfig] = useState({ key: "receivedDate", direction: "desc" });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [viewBatch, setViewBatch] = useState(null);

    const user = getUser();
    const isOwner = (user.role || "").toUpperCase() === "OWNER";

    useEffect(() => {
        loadBatches();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---- existing data load logic (unchanged, only wrapped with loading/error UI state) ---- */
    const loadBatches = async () => {
        try {
            setLoading(true);
            setError(null);

            const user = JSON.parse(localStorage.getItem("user"));
            const data = await getBatchReport(user.storeId);

            setBatches(data);
        } catch (e) {
            console.error(e);
            setError("We couldn't load the batch report. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    /* ---- filter dropdown option lists, derived from loaded data ---- */
    const brandOptions = useMemo(() => uniqueValues(batches, "brandName"), [batches]);
    const categoryOptions = useMemo(() => uniqueValues(batches, "categoryName"), [batches]);
    const productOptions = useMemo(() => uniqueValues(batches, "itemName"), [batches]);
    const storeOptions = useMemo(() => uniqueValues(batches, "storeName"), [batches]);

    const hasCategoryData = categoryOptions.length > 0;
    const hasStoreData = isOwner && storeOptions.length > 0;

    /* ---- existing search logic, extended with the additional filters ---- */
    const filteredBatches = useMemo(() => {
        const search = searchText.toLowerCase();

        return batches.filter((batch) => {
            const matchesSearch =
                !search ||
                batch.batchNumber?.toLowerCase().includes(search) ||
                batch.itemName?.toLowerCase().includes(search) ||
                batch.partNumber?.toLowerCase().includes(search) ||
                batch.brandName?.toLowerCase().includes(search) ||
                batch.sku?.toLowerCase().includes(search);

            const matchesBrand = !brandFilter || batch.brandName === brandFilter;
            const matchesCategory = !categoryFilter || batch.categoryName === categoryFilter;
            const matchesProduct = !productFilter || batch.itemName === productFilter;
            const matchesStore = !storeFilter || batch.storeName === storeFilter;

            const status = getBatchStatus(batch).key;
            const matchesStatus =
                !statusFilter ||
                (statusFilter === "ACTIVE" && (status === "ACTIVE" || status === "LOW")) ||
                (statusFilter === "CONSUMED" && status === "CONSUMED");

            const receivedDate = batch.receivedDate ? new Date(batch.receivedDate) : null;
            const matchesFrom = !dateFrom || (receivedDate && receivedDate >= new Date(dateFrom));
            const matchesTo = !dateTo || (receivedDate && receivedDate <= new Date(dateTo));

            return (
                matchesSearch &&
                matchesBrand &&
                matchesCategory &&
                matchesProduct &&
                matchesStore &&
                matchesStatus &&
                matchesFrom &&
                matchesTo
            );
        });
    }, [batches, searchText, brandFilter, categoryFilter, productFilter, storeFilter, statusFilter, dateFrom, dateTo]);

    /* ---- sorting ---- */
    const sortedBatches = useMemo(() => {
        const list = [...filteredBatches];
        const { key, direction } = sortConfig;
        if (!key) return list;

        list.sort((a, b) => {
            let av = a[key];
            let bv = b[key];

            if (key === "receivedDate") {
                av = av ? new Date(av).getTime() : 0;
                bv = bv ? new Date(bv).getTime() : 0;
            } else if (["receivedQuantity", "availableQuantity", "consumedQuantity", "purchasePrice", "sellingPrice", "mrp"].includes(key)) {
                av = Number(av) || 0;
                bv = Number(bv) || 0;
            } else {
                av = (av ?? "").toString().toLowerCase();
                bv = (bv ?? "").toString().toLowerCase();
            }

            if (av < bv) return direction === "asc" ? -1 : 1;
            if (av > bv) return direction === "asc" ? 1 : -1;
            return 0;
        });
        return list;
    }, [filteredBatches, sortConfig]);

    /* ---- pagination ---- */
    const totalPages = Math.max(1, Math.ceil(sortedBatches.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pagedBatches = sortedBatches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    /* ---- KPI calculations (unchanged math, just organized) ---- */
    const kpis = useMemo(() => {
        const totalBatches = batches.length;
        const activeBatches = batches.filter((b) => getBatchStatus(b).key !== "CONSUMED").length;
        const consumedBatches = batches.filter((b) => getBatchStatus(b).key === "CONSUMED").length;
        const availableQty = batches.reduce((a, b) => a + (Number(b.availableQuantity) || 0), 0);
        const inventoryValue = batches.reduce(
            (a, b) => a + (Number(b.availableQuantity) || 0) * (Number(b.purchasePrice) || 0),
            0
        );
        const purchaseValue = batches.reduce(
            (a, b) => a + (Number(b.receivedQuantity) || 0) * (Number(b.purchasePrice) || 0),
            0
        );
        return { totalBatches, activeBatches, consumedBatches, availableQty, inventoryValue, purchaseValue };
    }, [batches]);

    /* ---- handlers ---- */
    const handleSort = (key) => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
            }
            return { key, direction: "asc" };
        });
    };

    const handleReset = () => {
        setSearchText("");
        setBrandFilter("");
        setCategoryFilter("");
        setProductFilter("");
        setStoreFilter("");
        setStatusFilter("");
        setDateFrom("");
        setDateTo("");
        setPage(1);
    };

    const handleExportExcel = () => {
        downloadFile(toCsv(sortedBatches), "batch-report.csv", "text/csv;charset=utf-8;");
    };

    const handleExportPdf = () => {
        window.print();
    };

    const handlePrint = () => {
        window.print();
    };

    const sortIndicator = (key) =>
        sortConfig.key === key ? (
            <Icon.Sort style={{ transform: sortConfig.direction === "desc" ? "rotate(180deg)" : "none", marginLeft: "4px", opacity: 0.85 }} />
        ) : (
            <Icon.Sort style={{ marginLeft: "4px", opacity: 0.25 }} />
        );

    /* ============================================================
       RENDER
       ============================================================ */

    return (
        <div style={S.page}>
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .batch-table-card { box-shadow: none !important; border: none !important; }
                }
                .kpi-card-hover:hover {
                    box-shadow: 0 6px 18px rgba(15,23,42,0.10);
                    transform: translateY(-1px);
                }
                .batch-row:hover {
                    background: ${COLORS.rowHover} !important;
                }
                .btn-hover:hover { filter: brightness(0.96); }
                ::-webkit-scrollbar { height: 8px; width: 8px; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
            `}</style>

            {/* Header */}
            <div style={S.headerRow}>
                <div>
                    <div style={S.eyebrow}>Inventory Management</div>
                    <h1 style={S.title}>Batch Report</h1>
                </div>
                <div style={{ ...S.headerActions }} className="no-print">
                    <button style={{ ...S.btn, ...S.btnGhost }} className="btn-hover" onClick={loadBatches}>
                        <Icon.Refresh /> Refresh
                    </button>
                </div>
            </div>

            {/* KPI Dashboard */}
            <div style={S.kpiGrid}>
                <div style={S.kpiCard} className="kpi-card-hover">
                    <div style={S.kpiIconWrap(COLORS.primaryTint, COLORS.primary)}><Icon.Boxes /></div>
                    <div style={S.kpiValue}>{kpis.totalBatches}</div>
                    <div style={S.kpiLabel}>Total Batches</div>
                </div>
                <div style={S.kpiCard} className="kpi-card-hover">
                    <div style={S.kpiIconWrap(COLORS.successBg, COLORS.success)}><Icon.Check /></div>
                    <div style={S.kpiValue}>{kpis.activeBatches}</div>
                    <div style={S.kpiLabel}>Active Batches</div>
                </div>
                <div style={S.kpiCard} className="kpi-card-hover">
                    <div style={S.kpiIconWrap(COLORS.grayBg, COLORS.gray)}><Icon.Archive /></div>
                    <div style={S.kpiValue}>{kpis.consumedBatches}</div>
                    <div style={S.kpiLabel}>Consumed Batches</div>
                </div>
                <div style={S.kpiCard} className="kpi-card-hover">
                    <div style={S.kpiIconWrap(COLORS.primaryTint, COLORS.primary)}><Icon.Layers /></div>
                    <div style={S.kpiValue}>{kpis.availableQty.toLocaleString("en-IN")}</div>
                    <div style={S.kpiLabel}>Available Stock Qty</div>
                </div>
                <div style={S.kpiCard} className="kpi-card-hover">
                    <div style={S.kpiIconWrap(COLORS.warningBg, COLORS.warning)}><Icon.Rupee /></div>
                    <div style={S.kpiValue}>{formatCurrency(kpis.inventoryValue)}</div>
                    <div style={S.kpiLabel}>Total Inventory Value</div>
                </div>
                <div style={S.kpiCard} className="kpi-card-hover">
                    <div style={S.kpiIconWrap(COLORS.successBg, COLORS.success)}><Icon.Tag /></div>
                    <div style={S.kpiValue}>{formatCurrency(kpis.purchaseValue)}</div>
                    <div style={S.kpiLabel}>Total Batch Purchase Value</div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div style={S.toolbar} className="no-print">
                <div style={S.toolbarGrid}>
                    <div style={{ gridColumn: "span 2" }}>
                        <label style={S.fieldLabel}>Search</label>
                        <div style={{ position: "relative" }}>
                            <Icon.Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: COLORS.textMuted }} />
                            <input
                                type="text"
                                placeholder="Batch no, product, part no, SKU..."
                                value={searchText}
                                onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
                                style={{ ...S.input, paddingLeft: "32px" }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={S.fieldLabel}>Brand</label>
                        <select style={S.select} value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }}>
                            <option value="">All Brands</option>
                            {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>

                    {hasCategoryData && (
                        <div>
                            <label style={S.fieldLabel}>Category</label>
                            <select style={S.select} value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
                                <option value="">All Categories</option>
                                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label style={S.fieldLabel}>Product</label>
                        <select style={S.select} value={productFilter} onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}>
                            <option value="">All Products</option>
                            {productOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    {hasStoreData && (
                        <div>
                            <label style={S.fieldLabel}>Store</label>
                            <select style={S.select} value={storeFilter} onChange={(e) => { setStoreFilter(e.target.value); setPage(1); }}>
                                <option value="">All Stores</option>
                                {storeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label style={S.fieldLabel}>Status</label>
                        <select style={S.select} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                            <option value="">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="CONSUMED">Fully Consumed</option>
                        </select>
                    </div>

                    <div>
                        <label style={S.fieldLabel}>From Date</label>
                        <input type="date" style={S.input} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
                    </div>
                    <div>
                        <label style={S.fieldLabel}>To Date</label>
                        <input type="date" style={S.input} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
                    </div>
                </div>

                <div style={S.toolbarActions}>
                    <button style={{ ...S.btn, ...S.btnPrimary }} className="btn-hover" onClick={() => setPage(1)}>
                        <Icon.Search /> Search
                    </button>
                    <button style={{ ...S.btn, ...S.btnGhost }} className="btn-hover" onClick={handleReset}>
                        Reset
                    </button>
                    <button style={{ ...S.btn, ...S.btnGhost }} className="btn-hover" onClick={loadBatches}>
                        <Icon.Refresh /> Refresh
                    </button>
                    <div style={{ flex: 1 }} />
                    <button style={{ ...S.btn, ...S.btnSubtle }} className="btn-hover" onClick={handleExportExcel}>
                        <Icon.Excel /> Export Excel
                    </button>
                    <button style={{ ...S.btn, ...S.btnSubtle }} className="btn-hover" onClick={handleExportPdf}>
                        <Icon.Pdf /> Export PDF
                    </button>
                    <button style={{ ...S.btn, ...S.btnSubtle }} className="btn-hover" onClick={handlePrint}>
                        <Icon.Printer /> Print
                    </button>
                </div>
            </div>

            {/* Table / states */}
            <div style={S.tableCard} className="batch-table-card">
                {loading ? (
                    <SkeletonLoader />
                ) : error ? (
                    <ErrorCard message={error} onRetry={loadBatches} />
                ) : sortedBatches.length === 0 ? (
                    <EmptyState hasFilters={!!(searchText || brandFilter || categoryFilter || productFilter || storeFilter || statusFilter || dateFrom || dateTo)} onReset={handleReset} />
                ) : (
                    <>
                        <div style={S.tableScroll}>
                            <table style={S.table}>
                                <thead>
                                    <tr>
                                        <Th label="Batch Number" sortKey="batchNumber" sortConfig={sortConfig} onSort={handleSort} />
                                        {hasStoreData && <Th label="Store" sortKey="storeName" sortConfig={sortConfig} onSort={handleSort} />}
                                        <Th label="Brand" sortKey="brandName" sortConfig={sortConfig} onSort={handleSort} />
                                        {hasCategoryData && <Th label="Category" sortKey="categoryName" sortConfig={sortConfig} onSort={handleSort} />}
                                        <Th label="Product" sortKey="itemName" sortConfig={sortConfig} onSort={handleSort} />
                                        <Th label="Part Number" sortKey="partNumber" sortConfig={sortConfig} onSort={handleSort} />
                                        <Th label="Received Qty" sortKey="receivedQuantity" sortConfig={sortConfig} onSort={handleSort} align="center" />
                                        <Th label="Available Qty" sortKey="availableQuantity" sortConfig={sortConfig} onSort={handleSort} align="center" />
                                        <Th label="Consumed Qty" sortKey="consumedQuantity" sortConfig={sortConfig} onSort={handleSort} align="center" />
                                        <Th label="Purchase Price" sortKey="purchasePrice" sortConfig={sortConfig} onSort={handleSort} align="right" />
                                        <Th label="Selling Price" sortKey="sellingPrice" sortConfig={sortConfig} onSort={handleSort} align="right" />
                                        <Th label="MRP" sortKey="mrp" sortConfig={sortConfig} onSort={handleSort} align="right" />
                                        <Th label="Received Date" sortKey="receivedDate" sortConfig={sortConfig} onSort={handleSort} />
                                        <Th label="Status" sortKey={null} sortConfig={sortConfig} onSort={handleSort} align="center" />
                                        <Th label="Actions" sortKey={null} sortConfig={sortConfig} onSort={handleSort} align="center" noPrint />
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedBatches.map((batch, idx) => (
                                        <tr
                                            key={batch.batchId}
                                            className="batch-row"
                                            style={{ background: idx % 2 === 1 ? COLORS.rowStripe : "#fff" }}
                                        >
                                            <td style={{ ...S.td, fontWeight: 600 }}>{batch.batchNumber}</td>
                                            {hasStoreData && <td style={S.td}>{batch.storeName || "—"}</td>}
                                            <td style={S.td}>{batch.brandName}</td>
                                            {hasCategoryData && <td style={S.td}>{batch.categoryName || "—"}</td>}
                                            <td style={S.td}>{batch.itemName}</td>
                                            <td style={{ ...S.td, color: COLORS.textSecondary }}>{batch.partNumber}</td>
                                            <td style={{ ...S.td, textAlign: "center" }}>{batch.receivedQuantity}</td>
                                            <td style={{ ...S.td, textAlign: "center", fontWeight: 600 }}>{batch.availableQuantity}</td>
                                            <td style={{ ...S.td, textAlign: "center", color: COLORS.textSecondary }}>{batch.consumedQuantity}</td>
                                            <td style={{ ...S.td, textAlign: "right" }}>{formatCurrency(batch.purchasePrice)}</td>
                                            <td style={{ ...S.td, textAlign: "right" }}>{formatCurrency(batch.sellingPrice)}</td>
                                            <td style={{ ...S.td, textAlign: "right" }}>{formatCurrency(batch.mrp)}</td>
                                            <td style={S.td}>{batch.receivedDate}</td>
                                            <td style={{ ...S.td, textAlign: "center" }}><StatusBadge batch={batch} /></td>
                                            <td style={{ ...S.td, textAlign: "center" }} className="no-print">
                                                <button style={S.iconBtn} title="View Batch Details" onClick={() => setViewBatch(batch)}>
                                                    <Icon.Eye />
                                                </button>
                                                <button style={S.iconBtn} title="Print Batch" onClick={() => window.print()}>
                                                    <Icon.Printer />
                                                </button>
                                                <button style={{ ...S.iconBtn, marginRight: 0 }} title="Download PDF" onClick={() => window.print()}>
                                                    <Icon.Pdf />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={S.tableFooter} className="no-print">
                            <div style={{ fontSize: "13px", color: COLORS.textSecondary, display: "flex", alignItems: "center", gap: "10px" }}>
                                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedBatches.length)} of {sortedBatches.length}
                                <select
                                    style={{ ...S.select, width: "auto", padding: "5px 8px" }}
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                >
                                    {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
                                </select>
                            </div>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <button
                                    style={{ ...S.btn, ...S.btnGhost, padding: "6px 12px" }}
                                    disabled={currentPage === 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    Prev
                                </button>
                                <span style={{ fontSize: "13px", color: COLORS.textSecondary, padding: "0 6px" }}>
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    style={{ ...S.btn, ...S.btnGhost, padding: "6px 12px" }}
                                    disabled={currentPage === totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {viewBatch && <ViewDetailsModal batch={viewBatch} hasStoreData={hasStoreData} hasCategoryData={hasCategoryData} onClose={() => setViewBatch(null)} />}
        </div>
    );
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

function Th({ label, sortKey, sortConfig, onSort, align = "left", noPrint }) {
    return (
        <th
            style={{
                ...S.th,
                textAlign: align,
                ...(sortKey ? S.thSortable : {}),
            }}
            className={noPrint ? "no-print" : undefined}
            onClick={sortKey ? () => onSort(sortKey) : undefined}
        >
            <span style={{ display: "inline-flex", alignItems: "center" }}>
                {label}
                {sortKey && (
                    <Icon.Sort
                        style={{
                            marginLeft: "4px",
                            opacity: sortConfig.key === sortKey ? 0.9 : 0.3,
                            transform: sortConfig.key === sortKey && sortConfig.direction === "desc" ? "rotate(180deg)" : "none",
                        }}
                    />
                )}
            </span>
        </th>
    );
}

function SkeletonLoader() {
    const rows = new Array(8).fill(0);
    const shimmer = {
        height: "14px",
        borderRadius: "5px",
        background: "linear-gradient(90deg, #eef1f5 25%, #f6f8fa 37%, #eef1f5 63%)",
        backgroundSize: "400% 100%",
        animation: "shimmer 1.4s ease infinite",
    };
    return (
        <div style={{ padding: "20px" }}>
            <style>{`@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }`}</style>
            {rows.map((_, i) => (
                <div key={i} style={{ display: "flex", gap: "16px", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                    <div style={{ ...shimmer, width: "12%" }} />
                    <div style={{ ...shimmer, width: "18%" }} />
                    <div style={{ ...shimmer, width: "14%" }} />
                    <div style={{ ...shimmer, width: "10%" }} />
                    <div style={{ ...shimmer, width: "10%" }} />
                    <div style={{ ...shimmer, width: "10%" }} />
                    <div style={{ ...shimmer, width: "10%" }} />
                </div>
            ))}
        </div>
    );
}

function ErrorCard({ message, onRetry }) {
    return (
        <div style={S.centerState}>
            <div style={{ color: COLORS.danger }}><Icon.Alert /></div>
            <div style={{ fontWeight: 600, fontSize: "15px" }}>Something went wrong</div>
            <div style={{ color: COLORS.textSecondary, fontSize: "13.5px", maxWidth: "360px" }}>{message}</div>
            <button style={{ ...S.btn, ...S.btnPrimary, marginTop: "8px" }} onClick={onRetry}>
                Retry
            </button>
        </div>
    );
}

function EmptyState({ hasFilters, onReset }) {
    return (
        <div style={S.centerState}>
            <div style={{ color: COLORS.textMuted }}><Icon.Inbox /></div>
            <div style={{ fontWeight: 600, fontSize: "15px" }}>No Batch Records Found</div>
            <div style={{ color: COLORS.textSecondary, fontSize: "13.5px", maxWidth: "360px" }}>
                {hasFilters
                    ? "No batches match your current filters. Try adjusting or clearing them."
                    : "Stock batches you receive will show up here."}
            </div>
            {hasFilters ? (
                <button style={{ ...S.btn, ...S.btnGhost, marginTop: "8px" }} onClick={onReset}>
                    Clear Filters
                </button>
            ) : (
                <button style={{ ...S.btn, ...S.btnPrimary, marginTop: "8px" }} onClick={() => (window.location.href = "/store/receive-stock")}>
                    Receive Stock
                </button>
            )}
        </div>
    );
}

function ViewDetailsModal({ batch, hasStoreData, hasCategoryData, onClose }) {
    const status = getBatchStatus(batch);
    const badgeStyle =
        status.key === "ACTIVE"
            ? S.badge(COLORS.successBg, COLORS.success, COLORS.successBorder)
            : status.key === "LOW"
            ? S.badge(COLORS.warningBg, COLORS.warning, COLORS.warningBorder)
            : S.badge(COLORS.grayBg, COLORS.gray, COLORS.grayBorder);

    const Field = ({ label, value }) => (
        <div style={S.modalField}>
            <span style={{ fontSize: "11px", color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: COLORS.textPrimary }}>{value ?? "—"}</span>
        </div>
    );

    return (
        <div style={S.modalOverlay} onClick={onClose}>
            <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <div>
                        <div style={{ fontSize: "12px", color: COLORS.textSecondary, fontWeight: 600 }}>Batch Information</div>
                        <div style={{ fontSize: "17px", fontWeight: 700 }}>{batch.batchNumber}</div>
                    </div>
                    <button style={{ ...S.iconBtn, marginRight: 0 }} onClick={onClose}><Icon.Close /></button>
                </div>
                <div style={S.modalBody}>
                    {hasStoreData && <Field label="Store" value={batch.storeName} />}
                    <Field label="Received Date" value={batch.receivedDate} />
                    <Field label="Product" value={batch.itemName} />
                    <Field label="Brand" value={batch.brandName} />
                    {hasCategoryData && <Field label="Category" value={batch.categoryName} />}
                    <Field label="Part Number" value={batch.partNumber} />
                    <Field label="Purchase Price" value={formatCurrency(batch.purchasePrice)} />
                    <Field label="Selling Price" value={formatCurrency(batch.sellingPrice)} />
                    <Field label="MRP" value={formatCurrency(batch.mrp)} />
                    <Field label="Received Quantity" value={batch.receivedQuantity} />
                    <Field label="Available Quantity" value={batch.availableQuantity} />
                    <Field label="Consumed Quantity" value={batch.consumedQuantity} />
                    <div style={S.modalField}>
                        <span style={{ fontSize: "11px", color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.03em" }}>Batch Status</span>
                        <span style={{ marginTop: "2px" }}><span style={badgeStyle}>{status.label}</span></span>
                    </div>
                </div>
                <div style={S.modalFooter}>
                    <button style={{ ...S.btn, ...S.btnGhost }} onClick={() => window.print()}>
                        <Icon.Printer /> Print Batch
                    </button>
                    <button style={{ ...S.btn, ...S.btnPrimary }} onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BatchReportPage;
