import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../services/api";

const API_BASE = "http://localhost:8080";

const COLORS = {
    blue: "#2563eb",
    blueDark: "#1e40af",
    blueLight: "#eff6ff",
    blueBorder: "#bfdbfe",
    ink: "#0f172a",
    sub: "#64748b",
    border: "#e5e7eb",
    bg: "#f8fafc",
    white: "#ffffff",
    green: "#16a34a",
    greenBg: "#f0fdf4",
    greenBorder: "#bbf7d0",
    red: "#dc2626",
    redBg: "#fef2f2",
    redBorder: "#fecaca",
};

const S = {
    page: {
        background: COLORS.bg,
        minHeight: "100%",
        padding: "24px",
        boxSizing: "border-box",
        fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: COLORS.ink,
    },
    pageHeader: {
        marginBottom: "24px",
    },
    pageTitle: {
        fontSize: "26px",
        fontWeight: 700,
        margin: 0,
        letterSpacing: "-0.02em",
    },
    pageSubtitle: {
        fontSize: "14px",
        color: COLORS.sub,
        marginTop: "6px",
    },
    card: {
        background: COLORS.white,
        borderRadius: "16px",
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)",
        padding: "24px",
        marginBottom: "24px",
    },
    cardHeadRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "18px",
        gap: "12px",
        flexWrap: "wrap",
    },
    cardTitle: {
        fontSize: "17px",
        fontWeight: 700,
        margin: 0,
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    cardIconDot: {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: COLORS.blue,
        display: "inline-block",
        flexShrink: 0,
    },
    twoColGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "24px",
        alignItems: "start",
    },
    label: {
        fontSize: "13px",
        fontWeight: 600,
        color: COLORS.sub,
        marginBottom: "6px",
        display: "block",
    },
    field: {
        marginBottom: "16px",
    },
    input: {
        width: "100%",
        padding: "11px 14px",
        borderRadius: "10px",
        border: `1px solid ${COLORS.border}`,
        fontSize: "14px",
        boxSizing: "border-box",
        background: COLORS.white,
        color: COLORS.ink,
        outline: "none",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    },
    select: {
        width: "100%",
        padding: "11px 14px",
        borderRadius: "10px",
        border: `1px solid ${COLORS.border}`,
        fontSize: "14px",
        boxSizing: "border-box",
        background: COLORS.white,
        color: COLORS.ink,
        outline: "none",
        cursor: "pointer",
    },
    textarea: {
        width: "100%",
        padding: "11px 14px",
        borderRadius: "10px",
        border: `1px solid ${COLORS.border}`,
        fontSize: "14px",
        minHeight: "96px",
        resize: "vertical",
        boxSizing: "border-box",
        fontFamily: "inherit",
        outline: "none",
    },
    buttonPrimary: {
        background: COLORS.blue,
        color: COLORS.white,
        border: "none",
        borderRadius: "10px",
        padding: "11px 22px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        transition: "background 0.15s ease",
    },
    buttonPrimaryDisabled: {
        background: "#93c5fd",
        cursor: "not-allowed",
    },
    buttonSecondary: {
        background: COLORS.blueLight,
        color: COLORS.blueDark,
        border: `1px solid ${COLORS.blueBorder}`,
        borderRadius: "10px",
        padding: "11px 22px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
    },
    statusBase: {
        marginTop: "14px",
        padding: "12px 14px",
        borderRadius: "10px",
        fontSize: "13.5px",
        fontWeight: 500,
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        lineHeight: 1.4,
    },
    statusSuccess: {
        background: COLORS.greenBg,
        color: "#166534",
        border: `1px solid ${COLORS.greenBorder}`,
    },
    statusError: {
        background: COLORS.redBg,
        color: "#991b1b",
        border: `1px solid ${COLORS.redBorder}`,
    },
    dropZone: {
        border: `2px dashed ${COLORS.blueBorder}`,
        borderRadius: "14px",
        padding: "32px 18px",
        textAlign: "center",
        background: COLORS.blueLight,
        cursor: "pointer",
        transition: "border-color 0.15s ease, background 0.15s ease",
    },
    dropZoneActive: {
        borderColor: COLORS.blue,
        background: "#dbeafe",
    },
    dropZoneIcon: {
        fontSize: "28px",
        marginBottom: "8px",
    },
    dropZoneText: {
        fontSize: "14px",
        fontWeight: 600,
        color: COLORS.ink,
        margin: 0,
    },
    dropZoneSub: {
        fontSize: "12.5px",
        color: COLORS.sub,
        marginTop: "4px",
    },
    fileChip: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "999px",
        padding: "8px 14px",
        fontSize: "13px",
        fontWeight: 600,
        marginTop: "14px",
    },
    templateNote: {
        marginTop: "16px",
        padding: "12px 14px",
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "10px",
        fontSize: "12.5px",
        color: COLORS.sub,
    },
    templateCode: {
        display: "block",
        marginTop: "6px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: "12.5px",
        color: COLORS.blueDark,
        background: COLORS.blueLight,
        padding: "8px 10px",
        borderRadius: "8px",
        overflowX: "auto",
    },
    inlineRow: {
        display: "flex",
        gap: "12px",
        flexWrap: "wrap",
        alignItems: "flex-end",
    },
    inlineRowGrow: {
        flex: "1 1 240px",
        minWidth: "220px",
    },
    productGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
        marginTop: "18px",
    },
    productCard: {
        border: `1px solid ${COLORS.border}`,
        borderRadius: "14px",
        padding: "16px",
        background: COLORS.white,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
    },
    productImageWrap: {
        width: "100%",
        height: "120px",
        borderRadius: "10px",
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        marginBottom: "12px",
    },
    productImage: {
        width: "100%",
        height: "100%",
        objectFit: "contain",
    },
    productImagePlaceholder: {
        fontSize: "12px",
        color: COLORS.sub,
        fontWeight: 600,
    },
    productName: {
        fontSize: "14.5px",
        fontWeight: 700,
        margin: "0 0 4px 0",
    },
    productMeta: {
        fontSize: "12.5px",
        color: COLORS.sub,
        margin: "2px 0",
    },
    productPrice: {
        fontSize: "15px",
        fontWeight: 700,
        color: COLORS.blueDark,
        marginTop: "10px",
    },
    searchInputWrap: {
        position: "relative",
    },
    searchIcon: {
        position: "absolute",
        left: "14px",
        top: "50%",
        transform: "translateY(-50%)",
        color: COLORS.sub,
        fontSize: "14px",
        pointerEvents: "none",
    },
    searchInput: {
        width: "100%",
        padding: "11px 14px 11px 36px",
        borderRadius: "10px",
        border: `1px solid ${COLORS.border}`,
        fontSize: "14px",
        boxSizing: "border-box",
        outline: "none",
    },
    emptyState: {
        textAlign: "center",
        padding: "36px 18px",
        color: COLORS.sub,
        fontSize: "14px",
    },
    emptyStateIcon: {
        fontSize: "28px",
        marginBottom: "8px",
    },
    tableWrap: {
        overflowX: "auto",
        marginTop: "8px",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "13.5px",
        minWidth: "560px",
    },
    th: {
        textAlign: "left",
        padding: "12px 14px",
        background: COLORS.bg,
        color: COLORS.sub,
        fontWeight: 700,
        fontSize: "12px",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        borderBottom: `1px solid ${COLORS.border}`,
    },
    td: {
        padding: "14px",
        borderBottom: `1px solid ${COLORS.border}`,
        verticalAlign: "top",
        color: COLORS.ink,
    },
    pillRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        marginTop: "4px",
    },
    pill: {
        background: COLORS.blueLight,
        color: COLORS.blueDark,
        fontSize: "11.5px",
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: "999px",
        border: `1px solid ${COLORS.blueBorder}`,
    },
    notesText: {
        color: COLORS.sub,
        fontStyle: "italic",
        maxWidth: "260px",
    },
};

const variantLabel = (variant) => {
    if (variant?.fullName) {
        return variant.fullName;
    }

    const make =
        variant?.vehicleGeneration?.vehicleModel?.vehicleMake?.makeName || "";
    const model = variant?.vehicleGeneration?.vehicleModel?.modelName || "";
    const generation = variant?.vehicleGeneration?.generationName || "";
    const variantName = variant?.variantName || variant?.trimName || "";
    const fuel = variant?.fuelType || "";
    const transmission = variant?.transmissionType || "";
    const engineCapacity = variant?.engineCapacity || variant?.engineCC || "";
    const year = variant?.year || "";

    const nameParts = [make, model, generation, variantName].filter(Boolean);
    const specParts = [fuel, transmission, engineCapacity, year].filter(Boolean);

    return [nameParts.join(" "), specParts.join(" | ")]
        .filter(Boolean)
        .join(" | ");
};

const productLabel = (product) =>
    product?.partNumber
        ? `${product.itemName} - ${product.partNumber}`
        : product?.itemName || "Unnamed Product";

function Spinner({ light }) {
    return (
        <span
            style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                border: `2px solid ${light ? "rgba(255,255,255,0.4)" : "rgba(37,99,235,0.25)"}`,
                borderTopColor: light ? "#ffffff" : COLORS.blue,
                display: "inline-block",
                animation: "fitments-spin 0.7s linear infinite",
            }}
        />
    );
}

function StatusMessage({ type, message }) {
    if (!message) return null;
    const style =
        type === "error"
            ? { ...S.statusBase, ...S.statusError }
            : { ...S.statusBase, ...S.statusSuccess };
    return (
        <div style={style}>
            <span>{type === "error" ? "⚠️" : "✅"}</span>
            <span>{message}</span>
        </div>
    );
}

function FitmentForm({ products, variants, productsLoading, variantsLoading, onSaved }) {
    const [selectedProductId, setSelectedProductId] = useState("");
    const [selectedVariantId, setSelectedVariantId] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });

    const saveFitment = async () => {
        if (!selectedProductId || !selectedVariantId) {
            setStatus({
                type: "error",
                message: "Please select both a product and a vehicle variant.",
            });
            return;
        }

        setSaving(true);
        setStatus({ type: "", message: "" });

        try {
            const payload = {
                productItem: { id: Number(selectedProductId) },
                vehicleVariant: { id: Number(selectedVariantId) },
                notes,
            };

            const response = await api.post(
                `${API_BASE}/product-fitment`,
                payload
            );

            setStatus({
                type: "success",
                message:
                    typeof response.data === "string"
                        ? response.data
                        : "Fitment saved successfully.",
            });

            setSelectedProductId("");
            setSelectedVariantId("");
            setNotes("");

            if (onSaved) onSaved();
        } catch (error) {
            console.log(error);
            setStatus({
                type: "error",
                message:
                    error?.response?.data?.message ||
                    "Error saving fitment. Please try again.",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.card}>
            <div style={S.cardHeadRow}>
                <h2 style={S.cardTitle}>
                    <span style={S.cardIconDot} />
                    Add Product Fitment
                </h2>
            </div>

            <div style={S.field}>
                <label style={S.label}>Product</label>
                <select
                    style={S.select}
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                >
                    <option value="">
                        {productsLoading ? "Loading products..." : "Select Product"}
                    </option>
                    {products.map((product) => (
                        <option key={product.id} value={product.id}>
                            {productLabel(product)}
                        </option>
                    ))}
                </select>
            </div>

            <div style={S.field}>
                <label style={S.label}>Vehicle Variant</label>
                <select
                    style={S.select}
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                >
                    <option value="">
                        {variantsLoading
                            ? "Loading vehicle variants..."
                            : "Select Vehicle Variant"}
                    </option>
                    {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                            {variantLabel(variant)}
                        </option>
                    ))}
                </select>
            </div>

            <div style={S.field}>
                <label style={S.label}>Notes</label>
                <textarea
                    style={S.textarea}
                    placeholder="Optional notes about this fitment"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            <button
                onClick={saveFitment}
                disabled={saving}
                style={{
                    ...S.buttonPrimary,
                    ...(saving ? S.buttonPrimaryDisabled : {}),
                }}
            >
                {saving && <Spinner light />}
                {saving ? "Saving..." : "Save Fitment"}
            </button>

            <StatusMessage type={status.type} message={status.message} />
        </div>
    );
}

function BulkUpload({ onUploaded }) {
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState({ type: "", message: "" });
    const inputRef = useRef(null);

    const handleFiles = (fileList) => {
        const picked = fileList?.[0];
        if (!picked) return;
        if (!picked.name.toLowerCase().endsWith(".csv")) {
            setResult({ type: "error", message: "Only .csv files are supported." });
            return;
        }
        setFile(picked);
        setResult({ type: "", message: "" });
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
    };

    const uploadFile = async () => {
        if (!file) {
            setResult({ type: "error", message: "Please select a CSV file first." });
            return;
        }

        setUploading(true);
        setResult({ type: "", message: "" });

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await api.post(
                `${API_BASE}/fitment/bulk-upload`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            setResult({
                type: "success",
                message:
                    typeof response.data === "string"
                        ? response.data
                        : "Bulk upload completed successfully.",
            });
            setFile(null);

            if (onUploaded) onUploaded();
        } catch (error) {
            console.log(error);
            setResult({
                type: "error",
                message:
                    error?.response?.data?.message ||
                    "Bulk upload failed. Please check the file and try again.",
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={S.card}>
            <div style={S.cardHeadRow}>
                <h2 style={S.cardTitle}>
                    <span style={S.cardIconDot} />
                    Bulk Upload Fitments
                </h2>
            </div>

            <div
                style={{
                    ...S.dropZone,
                    ...(dragActive ? S.dropZoneActive : {}),
                }}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
            >
                <div style={S.dropZoneIcon}>📄</div>
                <p style={S.dropZoneText}>Drag and drop your CSV file here</p>
                <p style={S.dropZoneSub}>or click to browse · .csv files only</p>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </div>

            {file && (
                <div style={S.fileChip}>
                    <span>📎</span>
                    <span>{file.name}</span>
                </div>
            )}

            <div style={{ marginTop: "18px" }}>
                <button
                    onClick={uploadFile}
                    disabled={uploading}
                    style={{
                        ...S.buttonPrimary,
                        ...(uploading ? S.buttonPrimaryDisabled : {}),
                    }}
                >
                    {uploading && <Spinner light />}
                    {uploading ? "Uploading..." : "Upload Fitments"}
                </button>
            </div>

            <StatusMessage type={result.type} message={result.message} />

            <div style={S.templateNote}>
                CSV template — each row should follow this format:
                <code style={S.templateCode}>partNumber,variantFullName</code>
            </div>
        </div>
    );
}

function VehicleProductSearch({ variants, variantsLoading }) {
    const user =
    JSON.parse(
        localStorage.getItem("user")
    );
    const [variantId, setVariantId] = useState("");
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [searched, setSearched] = useState(false);

    const loadProducts = async () => {
        if (!variantId) {
            setError("Please select a vehicle variant first.");
            return;
        }

        setLoading(true);
        setError("");
        setSearched(true);

        try {
            const response = await api.get(
    `${API_BASE}/fitment/products`,
    {
        params: {
            storeId: user.storeId,
            variantId: variantId
        }
    }
);
            setProducts(response.data || []);
        } catch (err) {
            console.log(err);
            setError("Unable to load products for this vehicle.");
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={S.card}>
            <div style={S.cardHeadRow}>
                <h2 style={S.cardTitle}>
                    <span style={S.cardIconDot} />
                    Vehicle Based Product Search
                </h2>
            </div>

            <div style={S.inlineRow}>
                <div style={S.inlineRowGrow}>
                    <label style={S.label}>Vehicle Variant</label>
                    <select
                        style={S.select}
                        value={variantId}
                        onChange={(e) => setVariantId(e.target.value)}
                    >
                        <option value="">
                            {variantsLoading ? "Loading variants..." : "Select Vehicle Variant"}
                        </option>
                        {variants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                                {variantLabel(variant)}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={loadProducts}
                    disabled={loading}
                    style={{
                        ...S.buttonPrimary,
                        ...(loading ? S.buttonPrimaryDisabled : {}),
                    }}
                >
                    {loading && <Spinner light />}
                    {loading ? "Loading..." : "Load Products"}
                </button>
            </div>

            {error && <StatusMessage type="error" message={error} />}

            {searched && !loading && !error && products.length === 0 && (
                <div style={S.emptyState}>
                    <div style={S.emptyStateIcon}>🔍</div>
                    No products found for this vehicle.
                </div>
            )}

            {products.length > 0 && (
                <div style={S.productGrid}>
                    {products.map((product) => (
                        <div key={product.id} style={S.productCard}>
                            <div style={S.productImageWrap}>
                                {product.imageUrl ? (
                                    <img
                                        src={product.imageUrl}
                                        alt={product.itemName}
                                        style={S.productImage}
                                    />
                                ) : (
                                    <span style={S.productImagePlaceholder}>No Image</span>
                                )}
                            </div>
                            <p style={S.productName}>{product.itemName}</p>
                            <p style={S.productMeta}>
                                Part No: {product.partNumber || "—"}
                            </p>
                            <p style={S.productMeta}>
                                Brand: {product.brandName || product.brand?.brandName || "—"}
                            </p>
                            <p style={S.productMeta}>
                                Master: {product.masterName || product.master?.masterName || "—"}
                            </p>
                            <p style={S.productPrice}>
                                {product.sellingPrice != null
                                    ? `₹${product.sellingPrice}`
                                    : "Price unavailable"}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SmartSearch({ variants, variantsLoading }) {
    const user =
    JSON.parse(
        localStorage.getItem("user")
    );
    const [variantId, setVariantId] = useState("");
    const [text, setText] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!variantId || !text.trim()) {
            setResults([]);
            setError("");
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            setError("");
            try {
                const response = await api.get(
    `${API_BASE}/fitment/search`,
    {
        params: {
            storeId: user.storeId,
            variantId: variantId,
            text: text.trim()
        }
    }
);
                setResults(response.data || []);
            } catch (err) {
                console.log(err);
                setError("Search failed. Please try again.");
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [variantId, text]);

    return (
        <div style={S.card}>
            <div style={S.cardHeadRow}>
                <h2 style={S.cardTitle}>
                    <span style={S.cardIconDot} />
                    Smart Search
                </h2>
            </div>

            <div style={S.inlineRow}>
                <div style={S.inlineRowGrow}>
                    <label style={S.label}>Vehicle Variant</label>
                    <select
                        style={S.select}
                        value={variantId}
                        onChange={(e) => setVariantId(e.target.value)}
                    >
                        <option value="">
                            {variantsLoading ? "Loading variants..." : "Select Vehicle Variant"}
                        </option>
                        {variants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                                {variantLabel(variant)}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ ...S.inlineRowGrow, flex: "2 1 320px" }}>
                    <label style={S.label}>Search</label>
                    <div style={S.searchInputWrap}>
                        <span style={S.searchIcon}>🔎</span>
                        <input
                            style={S.searchInput}
                            placeholder="Search by Part Number, Brand, OEM, Product Name"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {!variantId && text.trim() && (
                <StatusMessage
                    type="error"
                    message="Select a vehicle variant to search within."
                />
            )}

            {error && <StatusMessage type="error" message={error} />}

            {loading && (
                <div style={{ marginTop: "16px", color: COLORS.sub, fontSize: "13.5px" }}>
                    <Spinner /> &nbsp;Searching...
                </div>
            )}

            {!loading && variantId && text.trim() && results.length === 0 && !error && (
                <div style={S.emptyState}>
                    <div style={S.emptyStateIcon}>🗂️</div>
                    No matching products found.
                </div>
            )}

            {results.length > 0 && (
                <div style={S.productGrid}>
                    {results.map((product) => (
                        <div key={product.id} style={S.productCard}>
                            <div style={S.productImageWrap}>
                                {product.imageUrl ? (
                                    <img
                                        src={product.imageUrl}
                                        alt={product.itemName}
                                        style={S.productImage}
                                    />
                                ) : (
                                    <span style={S.productImagePlaceholder}>No Image</span>
                                )}
                            </div>
                            <p style={S.productName}>{product.itemName}</p>
                            <p style={S.productMeta}>
                                Part No: {product.partNumber || "—"}
                            </p>
                            <p style={S.productMeta}>
                                Brand: {product.brandName || product.brand?.brandName || "—"}
                            </p>
                            <p style={S.productMeta}>
                                Master: {product.masterName || product.master?.masterName || "—"}
                            </p>
                            <p style={S.productPrice}>
                                {product.sellingPrice != null
                                    ? `₹${product.sellingPrice}`
                                    : "Price unavailable"}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function FitmentsTable({ fitments, loading }) {
    return (
        <div style={S.card}>
            <div style={S.cardHeadRow}>
                <h2 style={S.cardTitle}>
                    <span style={S.cardIconDot} />
                    Existing Fitments
                </h2>
            </div>

            {loading && (
                <div style={{ color: COLORS.sub, fontSize: "13.5px" }}>
                    <Spinner /> &nbsp;Loading fitments...
                </div>
            )}

            {!loading && fitments.length === 0 && (
                <div style={S.emptyState}>
                    <div style={S.emptyStateIcon}>🧾</div>
                    No fitments found. Add your first fitment above.
                </div>
            )}

            {!loading && fitments.length > 0 && (
                <div style={S.tableWrap}>
                    <table style={S.table}>
                        <thead>
                            <tr>
                                <th style={S.th}>Product</th>
                                <th style={S.th}>Vehicle</th>
                                <th style={S.th}>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fitments.map((fitment) => {
                                const make =
                                    fitment.vehicleVariant?.vehicleGeneration?.vehicleModel
                                        ?.vehicleMake?.makeName;
                                const model =
                                    fitment.vehicleVariant?.vehicleGeneration?.vehicleModel
                                        ?.modelName;
                                return (
                                    <tr key={fitment.id}>
                                        <td style={S.td}>
                                            <strong>{fitment.productItem?.itemName || "—"}</strong>
                                            {fitment.productItem?.partNumber && (
                                                <div style={S.productMeta}>
                                                    Part No: {fitment.productItem.partNumber}
                                                </div>
                                            )}
                                        </td>
                                        <td style={S.td}>
                                            <div>
                                                {[make, model].filter(Boolean).join(" ") || "—"}
                                            </div>
                                            <div style={S.pillRow}>
                                                {fitment.vehicleVariant?.fuelType && (
                                                    <span style={S.pill}>
                                                        {fitment.vehicleVariant.fuelType}
                                                    </span>
                                                )}
                                                {fitment.vehicleVariant?.transmissionType && (
                                                    <span style={S.pill}>
                                                        {fitment.vehicleVariant.transmissionType}
                                                    </span>
                                                )}
                                                {fitment.vehicleVariant?.year && (
                                                    <span style={S.pill}>
                                                        {fitment.vehicleVariant.year}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ ...S.td, ...S.notesText }}>
                                            {fitment.notes || "No notes added"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function FitmentsSection() {
    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    const [fitments, setFitments] = useState([]);

    const [productsLoading, setProductsLoading] = useState(false);
    const [variantsLoading, setVariantsLoading] = useState(false);
    const [fitmentsLoading, setFitmentsLoading] = useState(false);

    const loadProducts = useCallback(async () => {
        setProductsLoading(true);
        try {
            const response = await api.get(`${API_BASE}/products`);
            setProducts(response.data || []);
        } catch (error) {
            console.log(error);
        } finally {
            setProductsLoading(false);
        }
    }, []);

    const loadVariants = useCallback(async () => {
        setVariantsLoading(true);
        try {
            const response = await api.get(`${API_BASE}/vehicle-variants`);
            setVariants(response.data || []);
        } catch (error) {
            console.log(error);
        } finally {
            setVariantsLoading(false);
        }
    }, []);

    const loadFitments = useCallback(async () => {
        setFitmentsLoading(true);
        try {
            const response = await api.get(`${API_BASE}/product-fitments`);
            setFitments(response.data || []);
        } catch (error) {
            console.log(error);
        } finally {
            setFitmentsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
        loadVariants();
        loadFitments();
    }, [loadProducts, loadVariants, loadFitments]);

    return (
        <div style={S.page}>
            <style>{`
                @keyframes fitments-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                input:focus, select:focus, textarea:focus {
                    border-color: ${COLORS.blue} !important;
                    box-shadow: 0 0 0 3px ${COLORS.blueLight};
                }
            `}</style>

            <div style={S.pageHeader}>
                <h1 style={S.pageTitle}>Fitment Management</h1>
                <p style={S.pageSubtitle}>
                    Map spare parts to vehicle variants, bulk import data, and search
                    fitments across your catalog.
                </p>
            </div>

            <div style={S.twoColGrid}>
                <FitmentForm
                    products={products}
                    variants={variants}
                    productsLoading={productsLoading}
                    variantsLoading={variantsLoading}
                    onSaved={loadFitments}
                />
                <BulkUpload onUploaded={loadFitments} />
            </div>

            <VehicleProductSearch
                variants={variants}
                variantsLoading={variantsLoading}
            />

            <SmartSearch variants={variants} variantsLoading={variantsLoading} />

            <FitmentsTable fitments={fitments} loading={fitmentsLoading} />
        </div>
    );
}

export default FitmentsSection;
