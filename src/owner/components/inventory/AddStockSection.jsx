import { useState, useEffect } from "react";
import api from "../../../services/api";

const BASE_URL = "http://localhost:8080";

// ── Utility ──────────────────────────────────────────────────────────────────

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldGroup({ label, required, hint, error, children }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.required}> *</span>}
      </label>
      {hint && <p style={styles.hint}>{hint}</p>}
      {children}
      {error && <p style={styles.fieldError}>{error}</p>}
    </div>
  );
}

function PriceInput({ label, required, value, onChange, error, placeholder,readOnly = false }) {
  return (
    <div style={styles.priceCell}>
      <FieldGroup label={label} required={required} error={error}>
        <div style={styles.inputWrapper}>
          <span style={styles.currencySymbol}>₹</span>
          <input
    type="number"
    min="0"
    step="0.01"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    readOnly={readOnly}
    placeholder={placeholder || "0.00"}
    style={{
        ...styles.input,
        paddingLeft: "2rem",
        background: readOnly ? "#f1f5f9" : "#ffffff",
        cursor: readOnly ? "not-allowed" : "text"
    }}
/>
        </div>
      </FieldGroup>
    </div>
  );
}

function StatusBadge({ type, children }) {
  const map = {
    success: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
    error:   { bg: "#fee2e2", color: "#7f1d1d", border: "#fca5a5" },
    info:    { bg: "#dbeafe", color: "#1e3a5f", border: "#93c5fd" },
    warning: { bg: "#fef3c7", color: "#78350f", border: "#fcd34d" },
  };
  const s = map[type] || map.info;
  return (
    <div style={{
      padding: "0.75rem 1rem",
      borderRadius: "0.5rem",
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      fontSize: "0.875rem",
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    }}>
      {type === "success" && "✓"}
      {type === "error"   && "✕"}
      {type === "warning" && "⚠"}
      {type === "info"    && "ℹ"}
      {children}
    </div>
  );
}

function ProductInfoCard({ product }) {
  if (!product) return null;
  return (
    <div style={styles.infoCard}>
      <div style={styles.infoCardHeader}>Selected Product Details</div>
      <div style={styles.infoCardGrid}>
        {[
          ["Part Number",  product.partNumber],
          ["Brand",        product.brandName],
          ["Category",     product.categoryName],
          ["SKU",          product.sku],
          ["HSN Code",     product.hsncode],
          ["GST %",        product.gstPercentage != null ? `${product.gstPercentage}%` : "—"],
        ].map(([k, v]) => (
          <div key={k} style={styles.infoRow}>
            <span style={styles.infoKey}>{k}</span>
            <span style={styles.infoVal}>{v || "—"}</span>
          </div>
        ))}
      </div>
      {product.inStock != null && (
        <div style={{
          marginTop: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: product.inStock ? "#065f46" : "#991b1b",
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: product.inStock ? "#10b981" : "#ef4444",
            display: "inline-block",
          }} />
          {product.inStock
            ? `In Stock — ${product.quantity} unit(s) available`
            : "Out of Stock — this will add new stock"}
        </div>
      )}
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(form) {
  const errors = {};
  if (!form.productId)                           errors.productId     = "Select a product.";
  if (!form.quantity || Number(form.quantity) <= 0) errors.quantity   = "Quantity must be greater than zero.";
  if (!form.purchasePrice || Number(form.purchasePrice) <= 0)
                                                  errors.purchasePrice = "Enter a valid purchase price.";
  if (!form.sellingPrice || Number(form.sellingPrice) <= 0)
                                                  errors.sellingPrice  = "Enter a valid selling price.";
  if (!form.mrp || Number(form.mrp) <= 0)         errors.mrp           = "Enter a valid MRP.";
  if (form.mrp && form.sellingPrice && Number(form.sellingPrice) > Number(form.mrp))
                                                  errors.sellingPrice  = "Selling price cannot exceed MRP.";
  if (form.purchasePrice && form.sellingPrice && Number(form.purchasePrice) > Number(form.sellingPrice))
                                                  errors.purchasePrice = "Purchase price should not exceed selling price.";
  return errors;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AddStockSection() {
  const user = getUser();

  const [products,    setProducts]    = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    productId:     "",
    quantity:      "",
    purchasePrice: "",
    sellingPrice:  "",
    mrp:           "",
  });
  const [errors,     setErrors]     = useState({});
  const [status,     setStatus]     = useState(null); // { type, message }
  const [loading,    setLoading]    = useState(false);
  const [fetching,   setFetching]   = useState(true);

  // Selected product enriched from store inventory (if it exists)
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ── Load all products from store inventory (includes brand, category, etc.)
  useEffect(() => {
    (async () => {
      try {
        // Try fetching store-specific inventory first for richer data
        const storeId = user.storeId;
        const res = await api.get(`${BASE_URL}/products`);

setProducts(res.data);
      } catch {
        // Fallback to flat product list
        try {
          const res = await api.get(`${BASE_URL}/products`);
          console.log(res.data);
          setProducts(res.data);
          console.log(res.data);
        } catch (err) {
          console.error("Failed to load products", err);
        }
      } finally {
        setFetching(false);
      }
    })();
  }, []);

  // ── When product selection changes, enrich form with existing prices
  function handleProductSelect(productId) {
    setForm(f => ({ ...f, productId, quantity: "", purchasePrice: "", sellingPrice: "", mrp: "" }));
    setErrors({});
    setStatus(null);

    if (!productId) { setSelectedProduct(null); return; }

    const found = products.find(p =>
      String(p.productId || p.id) === String(productId)
    );
    setSelectedProduct(found || null);

    // Pre-fill prices from existing inventory entry
   if (found) {
    setForm(f => ({
        ...f,
        productId,
        purchasePrice: "",
        sellingPrice: "",
        mrp: ""
    }));
} 
  }

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => { const ne = { ...e }; delete ne[key]; return ne; });
  }

  // ── Filtered product list
  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      (p.itemName    || "").toLowerCase().includes(q) ||
      (p.partNumber  || "").toLowerCase().includes(q) ||
      (p.brandName   || "").toLowerCase().includes(q) ||
      (p.sku         || "").toLowerCase().includes(q)
    );
  });

  // ── Submit
  async function handleSave() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setStatus(null);

    try {
      const payload = {
        storeId:       user.storeId,
        productId:     Number(form.productId),
        quantity:      Number(form.quantity),
        purchasePrice: Number(form.purchasePrice),
        sellingPrice:  Number(form.sellingPrice),
        mrp:           Number(form.mrp),
      };

      const res = await api.post(
        `${BASE_URL}/store-inventory/add-product`,
        payload
      );

      const msg    = typeof res.data === "string" ? res.data : "Stock saved successfully.";
      const isNew  = msg.toLowerCase().includes("added");
      setStatus({ type: "success", message: msg });

      // Reset form on success
      setForm({ productId: "", quantity: "", purchasePrice: "", sellingPrice: "", mrp: "" });
      setSearchQuery("");
      setSelectedProduct(null);

      // Refresh product list to reflect updated quantities
      try {
        const storeId = user.storeId;
        const endpoint = storeId
          ? `${BASE_URL}/store-inventory/store/${storeId}`
          : `${BASE_URL}/store-inventory`;
        const refreshed = await api.get(endpoint);
        setProducts(refreshed.data);
      } catch { /* non-critical */ }

    } catch (err) {
      const serverMsg = err?.response?.data;
      setStatus({
        type: "error",
        message: typeof serverMsg === "string"
          ? serverMsg
          : "Failed to save stock. Check your inputs and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setForm({ productId: "", quantity: "", purchasePrice: "", sellingPrice: "", mrp: "" });
    setSearchQuery("");
    setSelectedProduct(null);
    setErrors({});
    setStatus(null);
  }

 const isExistingProduct =
    selectedProduct && selectedProduct.quantity != null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
    Receive Stock
</h2>
          <p style={styles.subtitle}>
    Receive new stock into inventory. Every stock receipt creates a new inventory batch.
</p>
          </div>
          <div style={styles.modeBadge}>
    <span
        style={{
            ...styles.modeDot,
            background: "#10b981"
        }}
    />
    Batch Receive Mode
</div>
        </div>

        <div style={styles.divider} />

        {/* Body */}
        <div style={styles.body}>

          {/* Product Search + Select */}
          <FieldGroup
            label="Product"
            required
            hint="Search by name, part number, brand, or SKU."
            error={errors.productId}
          >
            <input
              type="text"
              placeholder="Search products…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setField("productId", ""); setSelectedProduct(null); }}
              style={{ ...styles.input, marginBottom: "0.5rem" }}
            />
            <select
              value={form.productId}
              onChange={e => handleProductSelect(e.target.value)}
              style={{
                ...styles.input,
                borderColor: errors.productId ? "#ef4444" : "#cbd5e1",
              }}
              disabled={fetching}
            >
              <option value="">
                {fetching ? "Loading products…" : `— Select a product (${filteredProducts.length} found) —`}
              </option>
              {filteredProducts.map(p => {
                const id    = p.productId ?? p.id;
                const name  = p.itemName  ?? p.name ?? `Product #${id}`;
                const brand = p.brandName ? ` · ${p.brandName}` : "";
                const pn    = p.partNumber ? ` [${p.partNumber}]` : "";
                return (
                  <option key={id} value={id}>
                    {name}{brand}{pn}
                  </option>
                );
              })} 
            </select>
          </FieldGroup>

          {/* Selected product info card */}
          <ProductInfoCard product={selectedProduct} />

          {/* Quantity */}
          <FieldGroup
            label="Quantity to Add"
            required
           hint={isExistingProduct
    ? `Current stock: ${selectedProduct.quantity} unit(s). This receipt will create a new batch and increase total stock.`
    : undefined}
            error={errors.quantity}
          >
            <input
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              onChange={e => setField("quantity", e.target.value)}
              placeholder="Enter quantity"
              style={{
                ...styles.input,
                borderColor: errors.quantity ? "#ef4444" : "#cbd5e1",
              }}
            />
            {isExistingProduct && form.quantity && Number(form.quantity) > 0 && (
              <p style={styles.calcHint}>
                New total will be: <strong>{selectedProduct.quantity + Number(form.quantity)}</strong> units
              </p>
            )}
          </FieldGroup>

          {/* Prices — 3-column grid */}
          <div style={styles.priceGrid}>
            <PriceInput
              label="Purchase Price"
              required
              value={form.purchasePrice}
              onChange={v => setField("purchasePrice", v)}
              error={errors.purchasePrice}
              placeholder="Cost per unit"
            />
            <PriceInput
              label="Selling Price"
              required
              value={form.sellingPrice}
              onChange={v => setField("sellingPrice", v)}
              error={errors.sellingPrice}
              placeholder="Price to customer"
            />
           <PriceInput
    label="MRP"
    required
    value={form.mrp}
    onChange={v => setField("mrp", v)}
    readOnly={false}
    error={errors.mrp}
    placeholder="Maximum retail price"
/>
          </div>

          {/* Margin summary */}
          {form.purchasePrice && form.sellingPrice && Number(form.purchasePrice) > 0 && Number(form.sellingPrice) > 0 && (
            <div style={styles.marginBar}>
              <span style={styles.marginLabel}>Margin</span>
              <span style={styles.marginValue}>
                {(
                  ((Number(form.sellingPrice) - Number(form.purchasePrice)) /
                    Number(form.purchasePrice)) * 100
                ).toFixed(1)}%
              </span>
              {form.mrp && Number(form.mrp) > 0 && (
                <>
                  <span style={styles.marginLabel}>Discount off MRP</span>
                  <span style={styles.marginValue}>
                    {(
                      ((Number(form.mrp) - Number(form.sellingPrice)) /
                        Number(form.mrp)) * 100
                    ).toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          )}

          {/* Status */}
          {status && (
            <StatusBadge type={status.type}>{status.message}</StatusBadge>
          )}

          {/* Actions */}
          <div style={styles.actions}>
            <button
              onClick={handleReset}
              style={styles.btnSecondary}
              disabled={loading}
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading
    ? "Saving..."
    : "Receive Stock"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    padding: "1.5rem",
    background: "#f1f5f9",
    minHeight: "100vh",
  },
  card: {
    background: "#ffffff",
    borderRadius: "0.75rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)",
    maxWidth: 760,
    margin: "0 auto",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "1.5rem 1.75rem 1.25rem",
    background: "#0f172a",
  },
  title: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#f8fafc",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: "0.25rem 0 0",
    fontSize: "0.8rem",
    color: "#94a3b8",
  },
  modeBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#cbd5e1",
    background: "rgba(255,255,255,0.08)",
    padding: "0.35rem 0.7rem",
    borderRadius: "999px",
    whiteSpace: "nowrap",
  },
  modeDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
  },
  divider: {
    height: 1,
    background: "#e2e8f0",
  },
  body: {
    padding: "1.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  required: {
    color: "#ef4444",
  },
  hint: {
    margin: 0,
    fontSize: "0.75rem",
    color: "#6b7280",
  },
  input: {
    width: "100%",
    padding: "0.6rem 0.75rem",
    fontSize: "0.9rem",
    border: "1.5px solid #cbd5e1",
    borderRadius: "0.4rem",
    outline: "none",
    color: "#1e293b",
    background: "#f8fafc",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  currencySymbol: {
    position: "absolute",
    left: "0.65rem",
    color: "#64748b",
    fontSize: "0.875rem",
    pointerEvents: "none",
    userSelect: "none",
  },
  fieldError: {
    margin: 0,
    fontSize: "0.75rem",
    color: "#ef4444",
    fontWeight: 500,
  },
  infoCard: {
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "0.5rem",
    padding: "1rem",
  },
  infoCardHeader: {
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#94a3b8",
    marginBottom: "0.6rem",
  },
  infoCardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "0.5rem 1rem",
  },
  infoRow: {
    display: "flex",
    flexDirection: "column",
    gap: "0.1rem",
  },
  infoKey: {
    fontSize: "0.7rem",
    color: "#94a3b8",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  infoVal: {
    fontSize: "0.82rem",
    color: "#1e293b",
    fontWeight: 600,
  },
  calcHint: {
    margin: "0.25rem 0 0",
    fontSize: "0.78rem",
    color: "#0284c7",
  },
  priceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem",
  },
  priceCell: {
    minWidth: 0,
  },
  marginBar: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    background: "#f0fdf4",
    border: "1.5px solid #bbf7d0",
    borderRadius: "0.4rem",
    padding: "0.6rem 1rem",
    flexWrap: "wrap",
  },
  marginLabel: {
    fontSize: "0.75rem",
    color: "#166534",
    fontWeight: 500,
  },
  marginValue: {
    fontSize: "0.85rem",
    color: "#15803d",
    fontWeight: 700,
    marginRight: "0.75rem",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    paddingTop: "0.5rem",
  },
  btnPrimary: {
    padding: "0.6rem 1.5rem",
    background: "#0f172a",
    color: "#f8fafc",
    border: "none",
    borderRadius: "0.4rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.01em",
    transition: "background 0.15s",
  },
  btnSecondary: {
    padding: "0.6rem 1.25rem",
    background: "transparent",
    color: "#475569",
    border: "1.5px solid #cbd5e1",
    borderRadius: "0.4rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};
