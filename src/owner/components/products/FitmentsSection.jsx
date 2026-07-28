import { useState, useEffect, useMemo, useRef } from "react";
import {
  searchProducts, // partial-match search, e.g. /products/search?text=254&storeId=...
  getVehicleMakes,
  getModelsByMake,
  getYearsByModel,
  getVariants,
  saveFitment,
  getFitments,
  bulkUploadFitments,
  downloadFitmentTemplate,
  downloadFailedReport,
} from "../../../services/productFitmentService";

const ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"];
const PAGE_SIZE = 8;
const SUGGEST_MIN_CHARS = 1;
const SUGGEST_DEBOUNCE_MS = 300;

function hasAllowedExtension(filename) {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function fitmentVehicleLabel(f) {
  return f.vehicleVariant?.variantfullname || f.vehicleVariant?.veachilefullName || "—";
}

function fitmentProductName(f) {
  return f.productItem?.itemName || "—";
}

function fitmentPartNumber(f) {
  return f.productItem?.partNumber || "—";
}

/* Normalizes whatever the search API returns into an array of candidate
   products, so this component works whether the backend replies with a
   single exact match (legacy behavior) or a list of partial matches
   (needed for live suggestions). */
function normalizeSearchResults(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.results)) return raw.results;
  return [raw];
}

/* ------------------------------------------------------------
   Small presentational pieces
   ------------------------------------------------------------ */

function Spinner({ size = 16, color = COLORS.primary }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid ${color}33`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "pf-spin 0.7s linear infinite",
        verticalAlign: "middle",
      }}
    />
  );
}

function Banner({ tone, children }) {
  if (!children) return null;
  const palette = {
    error: { bg: COLORS.errorBg, text: COLORS.errorText, border: COLORS.errorText },
    success: { bg: COLORS.successBg, text: COLORS.successText, border: COLORS.successText },
    info: { bg: COLORS.infoBg, text: COLORS.infoText, border: COLORS.infoText },
  }[tone];

  return (
    <div
      style={{
        background: palette.bg,
        color: palette.text,
        border: `1px solid ${palette.border}33`,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12.5,
        fontWeight: 500,
        marginTop: 8,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function ReadOnlyValue({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={styles.readOnlyLabel}>{label}</span>
      <span style={styles.readOnlyValue}>{value || "—"}</span>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const toneColor = {
    neutral: COLORS.primary,
    success: COLORS.successText,
    warning: COLORS.warningText,
    error: COLORS.errorText,
  }[tone || "neutral"];

  return (
    <div style={styles.statCard}>
      <div style={{ fontSize: 11.5, color: COLORS.textSecondary, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: toneColor, marginTop: 3 }}>{value}</div>
    </div>
  );
}

/* ============================================================
   Main component
   ============================================================ */

export default function ProductFitmentEnterprise() {
  const [activeTab, setActiveTab] = useState("manual");

  /* ---------------- Product search + live suggestions ---------------- */
  const [partNumberInput, setPartNumberInput] = useState("");
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchError, setProductSearchError] = useState("");
  const [foundProduct, setFoundProduct] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestIndex, setActiveSuggestIndex] = useState(-1);

  const suggestDebounceRef = useRef(null);
  const suggestRequestRef = useRef(0);
  const searchBoxRef = useRef(null);

  /* ---------------- Vehicle cascade ---------------- */
  const [makes, setMakes] = useState([]);
  const [makesLoading, setMakesLoading] = useState(false);
  const [makesError, setMakesError] = useState("");

  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");

  const [years, setYears] = useState([]);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [yearsError, setYearsError] = useState("");

  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsError, setVariantsError] = useState("");

  const [selectedMakeId, setSelectedMakeId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const modelsRequestRef = useRef(0);
  const yearsRequestRef = useRef(0);
  const variantsRequestRef = useRef(0);

  /* ---------------- Notes + save ---------------- */
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");

  /* ---------------- Bulk upload ---------------- */
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [downloadingFailedReport, setDownloadingFailedReport] = useState(false);
  const fileInputRef = useRef(null);

  /* ---------------- Existing fitments ---------------- */
  const [fitments, setFitments] = useState([]);
  const [fitmentsLoading, setFitmentsLoading] = useState(false);
  const [fitmentsError, setFitmentsError] = useState("");
  const [fitmentSearchTerm, setFitmentSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* ---------------- Load makes + fitments on mount ---------------- */

  useEffect(() => {
    loadMakes();
    loadFitments();
  }, []);

  async function loadMakes() {
    setMakesLoading(true);
    setMakesError("");
    try {
      const data = await getVehicleMakes();
      setMakes(data || []);
    } catch (error) {
      setMakesError(error.message);
    } finally {
      setMakesLoading(false);
    }
  }

  async function loadModels(makeId) {
    const requestId = ++modelsRequestRef.current;
    setModelsLoading(true);
    setModelsError("");
    try {
      const data = await getModelsByMake(makeId);
      if (requestId !== modelsRequestRef.current) return;
      setModels(data || []);
    } catch (error) {
      if (requestId !== modelsRequestRef.current) return;
      setModelsError(error.message);
    } finally {
      if (requestId === modelsRequestRef.current) setModelsLoading(false);
    }
  }

  async function loadYears(modelId) {
    const requestId = ++yearsRequestRef.current;
    setYearsLoading(true);
    setYearsError("");
    try {
      const data = await getYearsByModel(modelId);
      if (requestId !== yearsRequestRef.current) return;
      setYears(data || []);
    } catch (error) {
      if (requestId !== yearsRequestRef.current) return;
      setYearsError(error.message);
    } finally {
      if (requestId === yearsRequestRef.current) setYearsLoading(false);
    }
  }

  async function loadVariants(modelId, year) {
    const requestId = ++variantsRequestRef.current;
    setVariantsLoading(true);
    setVariantsError("");
    try {
      const data = await getVariants(modelId, year);
      if (requestId !== variantsRequestRef.current) return;
      setVariants(data || []);
    } catch (error) {
      if (requestId !== variantsRequestRef.current) return;
      setVariantsError(error.message);
    } finally {
      if (requestId === variantsRequestRef.current) setVariantsLoading(false);
    }
  }

  async function loadFitments() {
    setFitmentsLoading(true);
    setFitmentsError("");
    try {
      const data = await getFitments();
      setFitments(data || []);
    } catch (error) {
      setFitmentsError(error.message);
    } finally {
      setFitmentsLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedMakeId) return;
    loadModels(selectedMakeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMakeId]);

  useEffect(() => {
    if (!selectedModelId) return;
    loadYears(selectedModelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId]);

  useEffect(() => {
    if (!selectedModelId || !selectedYear) return;
    loadVariants(selectedModelId, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId, selectedYear]);

  /* ---------------- Cascade change handlers ---------------- */

  function handleMakeChange(event) {
    setSelectedMakeId(event.target.value);
    setSelectedModelId("");
    setSelectedYear("");
    setSelectedVariantId("");
    setModels([]);
    setYears([]);
    setVariants([]);
  }

  function handleModelChange(event) {
    setSelectedModelId(event.target.value);
    setSelectedYear("");
    setSelectedVariantId("");
    setYears([]);
    setVariants([]);
  }

  function handleYearChange(event) {
    setSelectedYear(event.target.value);
    setSelectedVariantId("");
    setVariants([]);
  }

  function handleVariantChange(event) {
    setSelectedVariantId(event.target.value);
  }

  /* ---------------- Product search (button / Enter) ---------------- */

  async function runSearch(partNumber) {
    if (!partNumber) {
      setProductSearchError("Enter a part number to search.");
      return;
    }
    setProductSearchLoading(true);
    setProductSearchError("");
    setFoundProduct(null);
    try {
      const raw = await searchProducts(partNumber);
      const list = normalizeSearchResults(raw);
      if (list.length === 0) {
        setProductSearchError(`No product found for part number "${partNumber}".`);
        return;
      }
      if (list.length === 1) {
        selectProduct(list[0]);
      } else {
        // Multiple matches for an exact-ish search: let the user pick.
        setSuggestions(list);
        setShowSuggestions(true);
      }
    } catch (error) {
      setProductSearchError(error.message);
    } finally {
      setProductSearchLoading(false);
    }
  }

  function handleSearchProduct() {
    setShowSuggestions(false);
    runSearch(partNumberInput.trim());
  }

  function handlePartNumberKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeSuggestIndex >= 0 && suggestions[activeSuggestIndex]) {
        selectProduct(suggestions[activeSuggestIndex]);
      } else {
        handleSearchProduct();
      }
      return;
    }
    if (event.key === "ArrowDown" && showSuggestions) {
      event.preventDefault();
      setActiveSuggestIndex((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (event.key === "ArrowUp" && showSuggestions) {
      event.preventDefault();
      setActiveSuggestIndex((i) => Math.max(i - 1, -1));
      return;
    }
    if (event.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestIndex(-1);
    }
  }

  function selectProduct(product) {
    setFoundProduct(product);
    setPartNumberInput(product.partNumber || "");
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestIndex(-1);
    setProductSearchError("");
  }

  function handlePartNumberChange(event) {
    const value = event.target.value;
    setPartNumberInput(value);
    setFoundProduct(null);
    setActiveSuggestIndex(-1);
    setProductSearchError("");

    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);

    const query = value.trim();
    if (query.length < SUGGEST_MIN_CHARS) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestLoading(false);
      return;
    }

    suggestDebounceRef.current = setTimeout(async () => {
      const requestId = ++suggestRequestRef.current;
      setSuggestLoading(true);
      try {
        const raw = await searchProducts(query);
        if (requestId !== suggestRequestRef.current) return;
        const list = normalizeSearchResults(raw);
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch (error) {
        if (requestId !== suggestRequestRef.current) return;
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        if (requestId === suggestRequestRef.current) setSuggestLoading(false);
      }
    }, SUGGEST_DEBOUNCE_MS);
  }

  // Close the suggestions dropdown on outside click.
  useEffect(() => {
    function handleOutsideClick(event) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* ---------------- Save manual fitment ---------------- */

  const canSave = Boolean(foundProduct) && Boolean(selectedVariantId) && !saving;

  function resetManualForm() {
    setPartNumberInput("");
    setFoundProduct(null);
    setSelectedMakeId("");
    setSelectedModelId("");
    setSelectedYear("");
    setSelectedVariantId("");
    setModels([]);
    setYears([]);
    setVariants([]);
    setNotes("");
  }

  async function handleSaveFitment() {
    setSaveError("");
    setSaveSuccessMessage("");

    if (!foundProduct) {
      setSaveError("Search and select a product before saving.");
      return;
    }
    if (!selectedVariantId) {
      setSaveError("Complete the vehicle selection (Make, Model, Year, Variant) before saving.");
      return;
    }

    setSaving(true);
    try {
      await saveFitment(foundProduct.id, selectedVariantId, notes.trim());
      setSaveSuccessMessage("Fitment saved successfully.");
      resetManualForm();
      loadFitments();
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- Bulk upload ---------------- */

  function handleFileSelect(event) {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    setUploadResult(null);
    setUploadError("");

    if (!file) {
      setSelectedFile(null);
      setFileError("");
      return;
    }
    if (!hasAllowedExtension(file.name)) {
      setSelectedFile(null);
      setFileError("Unsupported file type. Please choose a .csv, .xls, or .xlsx file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFileError("");
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setFileError("Choose a file before uploading.");
      return;
    }
    setUploading(true);
    setUploadError("");
    setUploadResult(null);
    try {
      const result = await bulkUploadFitments(selectedFile);
      setUploadResult(result);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadFitments();
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    setUploadError("");
    try {
      const blob = await downloadFitmentTemplate();
      triggerBlobDownload(blob, "product-fitment-template.xlsx");
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function handleDownloadFailedReport() {
    if (!uploadResult || (uploadResult.failedRows || []).length === 0) return;
    setDownloadingFailedReport(true);
    setUploadError("");
    try {
      const blob = await downloadFailedReport(uploadResult);
      triggerBlobDownload(blob, "product-fitment-failed-rows.xlsx");
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setDownloadingFailedReport(false);
    }
  }

  /* ---------------- Existing fitments: search + pagination ---------------- */

  useEffect(() => {
    setCurrentPage(1);
  }, [fitmentSearchTerm]);

  const filteredFitments = useMemo(() => {
    const term = fitmentSearchTerm.trim().toLowerCase();
    if (!term) return fitments;
    return fitments.filter((f) => {
      const haystack = [
        fitmentProductName(f),
        fitmentPartNumber(f),
        fitmentVehicleLabel(f),
        f.notes || "—",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [fitments, fitmentSearchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredFitments.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedFitments = filteredFitments.slice(
    (currentPageSafe - 1) * PAGE_SIZE,
    currentPageSafe * PAGE_SIZE
  );

  /* ============================================================
     Render
     ============================================================ */

  return (
    <div style={styles.appShell}>
      <style>{`
        @keyframes pf-spin { to { transform: rotate(360deg); } }
        .pf-select:disabled, .pf-input:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
        .pf-select:focus, .pf-input:focus, .pf-textarea:focus { outline: none; border-color: ${COLORS.primary} !important; box-shadow: 0 0 0 3px ${COLORS.primary}22; }
        .pf-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .pf-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
        .pf-scroll::-webkit-scrollbar-track { background: transparent; }
        .pf-suggest-item:hover, .pf-suggest-item.active { background: #eff6ff !important; }
      `}</style>

      {/* ---------------- Fixed header ---------------- */}
      <div style={styles.headerBlock}>
        <div>
          <h1 style={styles.pageTitle}>Product Fitment Management</h1>
          <p style={styles.pageSubtitle}>Link products to the vehicles they fit, one at a time or in bulk.</p>
        </div>
        <div style={styles.tabBar}>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            style={activeTab === "manual" ? styles.tabButtonActive : styles.tabButton}
          >
            Manual Fitment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bulk")}
            style={activeTab === "bulk" ? styles.tabButtonActive : styles.tabButton}
          >
            Bulk Upload
          </button>
        </div>
      </div>

      {/* ---------------- Scrollable body (only this area scrolls) ---------------- */}
      <div className="pf-scroll" style={styles.bodyScroll}>
        {/* ================= MANUAL FITMENT ================= */}
        {activeTab === "manual" && (
          <div style={styles.manualGrid}>
            {/* Left column: product */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Step 1 · Find Product</h2>
              <div style={styles.searchBoxWrapper} ref={searchBoxRef}>
                <div style={styles.searchRow}>
                  <div style={{ position: "relative", flex: "1 1 auto" }}>
                    <input
                      type="text"
                      className="pf-input"
                      placeholder="Start typing a part number…"
                      value={partNumberInput}
                      onChange={handlePartNumberChange}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      onKeyDown={handlePartNumberKeyDown}
                      style={styles.input}
                      autoComplete="off"
                    />
                    {suggestLoading && (
                      <span style={styles.inlineSpinner}>
                        <Spinner size={14} />
                      </span>
                    )}

                    {showSuggestions && suggestions.length > 0 && (
                      <div style={styles.suggestDropdown}>
                        {suggestions.map((product, index) => (
                          <div
                            key={product.id ?? `${product.partNumber}-${index}`}
                            className={`pf-suggest-item${index === activeSuggestIndex ? " active" : ""}`}
                            style={styles.suggestItem}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectProduct(product);
                            }}
                            onMouseEnter={() => setActiveSuggestIndex(index)}
                          >
                            <div style={styles.suggestPart}>{product.partNumber}</div>
                            <div style={styles.suggestName}>{product.itemName}</div>
                            {product.partBrand?.brandName && (
                              <div style={styles.suggestBrand}>{product.partBrand.brandName}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchProduct}
                    disabled={productSearchLoading}
                    style={styles.primaryButton}
                  >
                    {productSearchLoading ? <Spinner size={14} color="#ffffff" /> : "Search"}
                  </button>
                </div>
                <Banner tone="error">{productSearchError}</Banner>
              </div>

              {foundProduct ? (
                <div style={styles.productCard}>
                  <div style={styles.productDetailGrid}>
                    <ReadOnlyValue label="Part Number" value={foundProduct.partNumber} />
                    <ReadOnlyValue label="Product Name" value={foundProduct.itemName} />
                    <ReadOnlyValue label="Brand" value={foundProduct.partBrand?.brandName} />
                    <ReadOnlyValue label="OEM Number" value={foundProduct.oemNumber} />
                    <ReadOnlyValue label="Master" value={foundProduct.partMaster?.masterName} />
                    <ReadOnlyValue label="EAN" value={foundProduct.ean} />
                    <ReadOnlyValue label="HSN" value={foundProduct.hsnCode} />
                    <ReadOnlyValue label="GST" value={foundProduct.gstPercentage} />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <ReadOnlyValue label="Description" value={foundProduct.description} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.productPlaceholder}>
                  Type a part number to see live matches, or press Search.
                </div>
              )}
            </div>

            {/* Right column: vehicle + notes + save */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Step 2 · Vehicle Selection</h2>
                <div style={styles.dropdownGrid}>
                  <Field label={makesLoading ? "Make (loading…)" : "Make"}>
                    <select
                      className="pf-select"
                      value={selectedMakeId}
                      onChange={handleMakeChange}
                      disabled={makesLoading}
                      style={styles.select}
                    >
                      <option value="">Select Make</option>
                      {makes.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.makeName}
                        </option>
                      ))}
                    </select>
                    <Banner tone="error">{makesError}</Banner>
                  </Field>

                  <Field label={modelsLoading ? "Model (loading…)" : "Model"}>
                    <select
                      className="pf-select"
                      value={selectedModelId}
                      onChange={handleModelChange}
                      disabled={!selectedMakeId || modelsLoading}
                      style={styles.select}
                    >
                      <option value="">Select Model</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.modelName}
                        </option>
                      ))}
                    </select>
                    <Banner tone="error">{modelsError}</Banner>
                  </Field>

                  <Field label={yearsLoading ? "Year (loading…)" : "Year"}>
                    <select
                      className="pf-select"
                      value={selectedYear}
                      onChange={handleYearChange}
                      disabled={!selectedModelId || yearsLoading}
                      style={styles.select}
                    >
                      <option value="">Select Year</option>
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <Banner tone="error">{yearsError}</Banner>
                  </Field>

                  <Field label={variantsLoading ? "Variant (loading…)" : "Variant"}>
                    <select
                      className="pf-select"
                      value={selectedVariantId}
                      onChange={handleVariantChange}
                      disabled={!selectedYear || variantsLoading}
                      style={styles.select}
                    >
                      <option value="">Select Variant</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.variantfullname || v.veachilefullName}
                        </option>
                      ))}
                    </select>
                    <Banner tone="error">{variantsError}</Banner>
                  </Field>
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Step 3 · Notes &amp; Save</h2>
                <textarea
                  className="pf-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this fitment…"
                  rows={3}
                  style={styles.textarea}
                />
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={handleSaveFitment}
                    disabled={!canSave}
                    style={canSave ? styles.primaryButton : styles.disabledButton}
                  >
                    {saving ? <Spinner size={14} color="#ffffff" /> : "Save Fitment"}
                  </button>
                </div>
                <Banner tone="error">{saveError}</Banner>
                <Banner tone="success">{saveSuccessMessage}</Banner>
              </div>
            </div>
          </div>
        )}

        {/* ================= BULK UPLOAD ================= */}
        {activeTab === "bulk" && (
          <div style={styles.tabContent}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Bulk Upload</h2>
              <p style={styles.cardSubtitle}>
                Upload multiple product fitments at once. Supported formats: CSV, XLS, XLSX.
              </p>

              <div style={styles.bulkActionsRow}>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  style={styles.secondaryButton}
                >
                  {downloadingTemplate ? <Spinner size={14} color={COLORS.primary} /> : "Download Template"}
                </button>

                <label style={styles.chooseFileButton}>
                  Choose File
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  style={selectedFile && !uploading ? styles.primaryButton : styles.disabledButton}
                >
                  {uploading ? <Spinner size={14} color="#ffffff" /> : "Upload"}
                </button>
              </div>

              {selectedFile && !fileError && (
                <div style={styles.selectedFileLabel}>Selected: {selectedFile.name}</div>
              )}

              <Banner tone="error">{fileError}</Banner>
              <Banner tone="error">{uploadError}</Banner>
            </div>

            {uploadResult && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Upload Result</h2>
                <div style={styles.statGrid}>
                  <StatCard label="Total Rows" value={uploadResult.totalRows ?? 0} tone="neutral" />
                  <StatCard label="Success Rows" value={uploadResult.successRows ?? 0} tone="success" />
                  <StatCard label="Skipped Rows" value={uploadResult.skippedRows ?? 0} tone="warning" />
                  <StatCard
                    label="Failed Rows"
                    value={(uploadResult.failedRows || []).length}
                    tone={(uploadResult.failedRows || []).length > 0 ? "error" : "neutral"}
                  />
                </div>

                {(uploadResult.failedRows || []).length > 0 && (
                  <>
                    <div style={styles.tableWrapper} className="pf-scroll">
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Row Number</th>
                            <th style={styles.th}>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.failedRows.map((row, index) => (
                            <tr key={`${row.rowNumber}-${index}`} style={styles.tr}>
                              <td style={styles.td}>{row.rowNumber}</td>
                              <td style={styles.td}>{row.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadFailedReport}
                      disabled={downloadingFailedReport}
                      style={{ ...styles.secondaryButton, marginTop: 14 }}
                    >
                      {downloadingFailedReport ? (
                        <Spinner size={14} color={COLORS.primary} />
                      ) : (
                        "Download Failed Report"
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= EXISTING FITMENTS ================= */}
        <div style={styles.card}>
          <div style={styles.existingHeaderRow}>
            <h2 style={styles.cardTitle}>Existing Fitments</h2>
            <input
              type="text"
              className="pf-input"
              placeholder="Search by product, part number, or vehicle…"
              value={fitmentSearchTerm}
              onChange={(e) => setFitmentSearchTerm(e.target.value)}
              style={{ ...styles.input, maxWidth: 320 }}
            />
          </div>

          <Banner tone="error">{fitmentsError}</Banner>

          {fitmentsLoading ? (
            <div style={styles.centeredRow}>
              <Spinner size={20} />
            </div>
          ) : filteredFitments.length === 0 ? (
            <div style={styles.emptyState}>No fitments found.</div>
          ) : (
            <>
              <div style={styles.fitmentsTableWrapper} className="pf-scroll">
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Part Number</th>
                      <th style={styles.th}>Vehicle</th>
                      <th style={styles.th}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedFitments.map((f) => (
                      <tr key={f.id} style={styles.tr}>
                        <td style={styles.td}>{fitmentProductName(f)}</td>
                        <td style={styles.td}>{fitmentPartNumber(f)}</td>
                        <td style={styles.td}>{fitmentVehicleLabel(f)}</td>
                        <td style={styles.td}>{f.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.paginationRow}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPageSafe === 1}
                  style={currentPageSafe === 1 ? styles.disabledPageButton : styles.pageButton}
                >
                  Previous
                </button>
                <span style={styles.pageInfo}>
                  Page {currentPageSafe} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPageSafe === totalPages}
                  style={currentPageSafe === totalPages ? styles.disabledPageButton : styles.pageButton}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Design tokens + inline style objects
   ============================================================ */

const COLORS = {
  primary: "#2563eb",
  primaryDark: "#1e40af",
  background: "#eef2f9",
  cardBg: "#ffffff",
  border: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  successBg: "#ecfdf5",
  successText: "#15803d",
  errorBg: "#fef2f2",
  errorText: "#b91c1c",
  warningText: "#b45309",
  infoBg: "#eff6ff",
  infoText: "#1d4ed8",
};

const styles = {
  /* The whole widget lives in a fixed-height shell: header stays put,
     only the body area below it scrolls. This avoids the "endless page"
     feeling of everything being stacked in one long scrolling document. */
  appShell: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxHeight: "100vh",
    background: COLORS.background,
    fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
    color: COLORS.textPrimary,
    boxSizing: "border-box",
    overflow: "hidden",
  },
  headerBlock: {
    flex: "0 0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 14,
    padding: "20px 24px 14px",
    borderBottom: `1px solid ${COLORS.border}`,
    background: COLORS.cardBg,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    color: COLORS.textPrimary,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    margin: "4px 0 0",
  },
  tabBar: {
    display: "flex",
    gap: 6,
    background: COLORS.background,
    padding: 5,
    borderRadius: 10,
  },
  tabButton: {
    padding: "8px 18px",
    borderRadius: 7,
    border: "none",
    background: "transparent",
    color: COLORS.textSecondary,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  tabButtonActive: {
    padding: "8px 18px",
    borderRadius: 7,
    border: "none",
    background: COLORS.primary,
    color: "#ffffff",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(37,99,235,0.35)",
  },
  bodyScroll: {
    flex: "1 1 auto",
    overflowY: "auto",
    padding: "18px 24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  manualGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1.1fr)",
    gap: 16,
    alignItems: "start",
  },
  tabContent: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  card: {
    background: COLORS.cardBg,
    borderRadius: 14,
    padding: 18,
    boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
    border: `1px solid ${COLORS.border}`,
    boxSizing: "border-box",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    margin: "0 0 12px",
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    margin: "-6px 0 14px",
  },
  searchBoxWrapper: {
    position: "relative",
  },
  searchRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    boxSizing: "border-box",
  },
  inlineSpinner: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
  },
  suggestDropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "#ffffff",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    boxShadow: "0 10px 28px rgba(15,23,42,0.14)",
    maxHeight: 260,
    overflowY: "auto",
    zIndex: 30,
  },
  suggestItem: {
    padding: "8px 12px",
    cursor: "pointer",
    borderBottom: `1px solid ${COLORS.border}`,
  },
  suggestPart: {
    fontSize: 13,
    fontWeight: 700,
    color: COLORS.primary,
  },
  suggestName: {
    fontSize: 12.5,
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  suggestBrand: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  select: {
    padding: "9px 10px",
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    background: "#ffffff",
    boxSizing: "border-box",
    width: "100%",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    fontFamily: "inherit",
    resize: "vertical",
    boxSizing: "border-box",
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: 600,
    color: COLORS.textSecondary,
  },
  dropdownGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  },
  primaryButton: {
    padding: "9px 18px",
    borderRadius: 8,
    border: "none",
    background: COLORS.primary,
    color: "#ffffff",
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "pointer",
    minWidth: 88,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  secondaryButton: {
    padding: "9px 16px",
    borderRadius: 8,
    border: `1px solid ${COLORS.primary}`,
    background: "#ffffff",
    color: COLORS.primary,
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    padding: "9px 18px",
    borderRadius: 8,
    border: "none",
    background: "#cbd5e1",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "not-allowed",
    minWidth: 88,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  productPlaceholder: {
    marginTop: 14,
    padding: "18px 14px",
    borderRadius: 10,
    background: "#f8fafc",
    border: `1px dashed ${COLORS.border}`,
    color: COLORS.textSecondary,
    fontSize: 12.5,
    textAlign: "center",
  },
  productCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 10,
    background: "#f8fafc",
    border: `1px solid ${COLORS.border}`,
  },
  productDetailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 12,
  },
  readOnlyLabel: {
    fontSize: 10.5,
    fontWeight: 600,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  readOnlyValue: {
    fontSize: 13,
    fontWeight: 500,
    color: COLORS.textPrimary,
  },
  bulkActionsRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  chooseFileButton: {
    padding: "9px 16px",
    borderRadius: 8,
    border: `1px dashed ${COLORS.primary}`,
    background: COLORS.infoBg,
    color: COLORS.primary,
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  selectedFileLabel: {
    marginTop: 10,
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    background: "#f8fafc",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "12px 14px",
  },
  tableWrapper: {
    overflowX: "auto",
    overflowY: "auto",
    maxHeight: 220,
    borderRadius: 10,
    border: `1px solid ${COLORS.border}`,
  },
  fitmentsTableWrapper: {
    overflowX: "auto",
    overflowY: "auto",
    maxHeight: 320,
    borderRadius: 10,
    border: `1px solid ${COLORS.border}`,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    background: "#f8fafc",
    color: COLORS.textSecondary,
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    borderBottom: `1px solid ${COLORS.border}`,
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
  },
  tr: {
    borderBottom: `1px solid ${COLORS.border}`,
  },
  td: {
    padding: "10px 12px",
    color: COLORS.textPrimary,
  },
  existingHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  centeredRow: {
    display: "flex",
    justifyContent: "center",
    padding: "26px 0",
  },
  emptyState: {
    textAlign: "center",
    padding: "26px 0",
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  paginationRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 14,
  },
  pageButton: {
    padding: "7px 14px",
    borderRadius: 7,
    border: `1px solid ${COLORS.border}`,
    background: "#ffffff",
    color: COLORS.textPrimary,
    fontWeight: 600,
    fontSize: 12.5,
    cursor: "pointer",
  },
  disabledPageButton: {
    padding: "7px 14px",
    borderRadius: 7,
    border: `1px solid ${COLORS.border}`,
    background: "#f1f5f9",
    color: "#94a3b8",
    fontWeight: 600,
    fontSize: 12.5,
    cursor: "not-allowed",
  },
  pageInfo: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
};
