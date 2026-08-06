import { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Plus,
  Search,
  Download,
  UploadCloud,
  Loader2,
  X,
} from "lucide-react";
import apiclient from "../../../services/apiclient";

const EMPTY_FORM = {
  itemName: "",
  description: "",
  partNumber: "",
  oemNumber: "",
  ean: "",
  hsnCode: "",
  brandName: "",
  categoryName: "",
  masterName: "",
};

function ItemsSection() {
  const [items, setItems] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [masters, setMasters] = useState([]);

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const [toast, setToast] = useState(null); // { type: 'success' | 'error', msg }

  const loadData = async () => {
    setLoading(true);

    try {
      const [itemResponse, brandResponse, categoryResponse, masterResponse] = await Promise.all([
        apiclient.get("/products"),
        apiclient.get("/brands"),
        apiclient.get("/categories"),
        apiclient.get("/product-masters"),
      ]);
      setItems(itemResponse.data || []);
      setBrands(brandResponse.data || []);
      setCategories(categoryResponse.data || []);
      setMasters(masterResponse.data || []);
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((it) =>
      [it.itemName, it.partNumber, it.oemNumber, it.brandName, it.categoryName, it.masterName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [items, query]);

  const brandOptions = useMemo(
    () => brands.map((brand) => brand.brandName).filter(Boolean),
    [brands]
  );
  const categoryOptions = useMemo(
    () => categories.map((category) => category.categoryName).filter(Boolean),
    [categories]
  );
  const masterOptions = useMemo(
    () => masters
      .filter((master) => !formData.categoryName || master.categoryName === formData.categoryName)
      .map((master) => master.masterName)
      .filter(Boolean),
    [formData.categoryName, masters]
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "masterName") {
        const selectedMaster = masters.find((master) => master.masterName === value);
        return { ...prev, masterName: value, categoryName: selectedMaster?.categoryName || prev.categoryName };
      }
      if (name === "categoryName") {
        const currentMaster = masters.find((master) => master.masterName === prev.masterName);
        return { ...prev, categoryName: value, masterName: currentMaster?.categoryName === value ? prev.masterName : "" };
      }
      return { ...prev, [name]: value };
    });
  };

  const resetAddModal = () => {
    setFormData(EMPTY_FORM);
    setShowAddModal(false);
    setShowMoreFields(false);
  };

  const saveItem = async () => {
    if (
      !formData.itemName.trim() ||
      !formData.partNumber.trim() ||
      !formData.brandName.trim() ||
      !formData.categoryName.trim() ||
      !formData.masterName.trim()
    ) {
      setToast({ type: "error", msg: "Item name, part number, brand, category and master are required." });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        itemName: formData.itemName.trim(),
        description: formData.description.trim() || null,
        partNumber: formData.partNumber.trim(),
        oemNumber: formData.oemNumber.trim() || null,
        ean: formData.ean.trim() || null,
        hsnCode: formData.hsnCode.trim() || null,
        brandName: formData.brandName.trim(),
        categoryName: formData.categoryName.trim(),
        masterName: formData.masterName.trim(),
      };

      const response = await apiclient.post("/products", payload);
      setToast({ type: "success", msg: response.data });
      resetAddModal();
      loadData();
    } catch (error) {
      console.error("Failed to save item", error);
      setToast({ type: "error", msg: "Error saving item." });
    }
    setSaving(false);
  };

  const downloadTemplate = async () => {
    try {
      const response = await apiclient.get("/products/bulk-upload/template", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement("a");
      link.href = url;
      link.download = "product_bulk_upload_template.xlsx";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download template", error);
      setToast({ type: "error", msg: "Could not download template." });
    }
  };

  const uploadItems = async () => {
    if (!selectedFile) {
      setToast({ type: "error", msg: "Please select a file first." });
      return;
    }

    setUploading(true);
    setBulkResult(null);
    try {
      const data = new FormData();
      data.append("file", selectedFile);

      const response = await apiclient.post("/products/bulk-upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data;
      setBulkResult(result);
      setToast({
        type: result.skippedRows > 0 ? "error" : "success",
        msg: `Processed ${result.totalRows} rows — ${result.successRows} saved, ${result.skippedRows} skipped.`,
      });
      setSelectedFile(null);
      loadData();
    } catch (error) {
      console.error("Bulk upload failed", error);
      setToast({ type: "error", msg: "Bulk upload failed." });
    }
    setUploading(false);
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.headerRow}>
        <div>
          <div style={S.title}>
            <Boxes size={20} style={{ color: "#2563EB" }} /> Product Items
          </div>
          <p style={S.subtitle}>Manage individual parts — brand, category, master and identifiers.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.secondaryBtn} onClick={() => setShowBulkModal(true)}>
            <UploadCloud size={15} /> Bulk Upload
          </button>
          <button style={S.primaryBtn} onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={S.toolbarRow}>
        <div style={S.searchWrap}>
          <Search size={15} style={{ color: "#9CA3AF" }} />
          <input
            style={S.searchInput}
            placeholder="Search items, part numbers, brands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div style={S.tableCard}>
        {loading ? (
          <div style={S.emptyState}>
            <Loader2 size={18} className="pc-spin" /> Loading items…
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={S.emptyState}>No items found.</div>
        ) : (
          <>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Item</th>
                  <th style={S.th}>Part #</th>
                  <th style={S.th}>Brand</th>
                  <th style={S.th}>Category</th>
                  <th style={S.th}>Master</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} style={S.tr}>
                    <td style={S.tdStrong}>{item.itemName}</td>
                    <td style={S.td}>{item.partNumber}</td>
                    <td style={S.td}>{item.brandName || "—"}</td>
                    <td style={S.td}>{item.categoryName || "—"}</td>
                    <td style={S.td}>{item.masterName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={S.tableFooter}>
              {filteredItems.length} of {items.length} items
            </div>
          </>
        )}
      </div>

      {/* Add Item modal */}
      {showAddModal && (
        <div style={S.overlay} onClick={resetAddModal}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>Add Item</span>
              <button style={S.iconBtn} onClick={resetAddModal}>
                <X size={16} />
              </button>
            </div>

            <label style={S.label}>Item Name</label>
            <input
              style={S.input}
              autoFocus
              placeholder="e.g. Brake Pad Set — Front"
              name="itemName"
              value={formData.itemName}
              onChange={handleInputChange}
            />

            <label style={{ ...S.label, marginTop: 12 }}>Part Number</label>
            <input
              style={S.input}
              placeholder="PN-00123"
              name="partNumber"
              value={formData.partNumber}
              onChange={handleInputChange}
            />

            <div style={S.fieldRow}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Brand</label>
                <input
                  style={S.input}
                  list="brand-options"
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleInputChange}
                  placeholder="Type or pick"
                  autoComplete="off"
                />
                <datalist id="brand-options">
                  {brandOptions.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Category</label>
                <input
                  style={S.input}
                  list="category-options"
                  name="categoryName"
                  value={formData.categoryName}
                  onChange={handleInputChange}
                  placeholder="Type or pick"
                  autoComplete="off"
                />
                <datalist id="category-options">
                  {categoryOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <label style={{ ...S.label, marginTop: 12 }}>Master</label>
            <input
              style={S.input}
              list="master-options"
              name="masterName"
              value={formData.masterName}
              onChange={handleInputChange}
              placeholder="Type or pick"
              autoComplete="off"
            />
            <datalist id="master-options">
              {masterOptions.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>

            <button
              type="button"
              style={S.moreToggle}
              onClick={() => setShowMoreFields((v) => !v)}
            >
              {showMoreFields ? "Hide optional details" : "+ Add optional details"}
            </button>

            {showMoreFields && (
              <div style={S.moreFieldsBox}>
                <label style={S.labelSm}>Description</label>
                <textarea
                  style={{ ...S.inputSm, minHeight: 50, resize: "vertical" }}
                  placeholder="Optional"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />

                <div style={S.fieldRow}>
                  <div style={{ flex: 1 }}>
                    <label style={S.labelSm}>OEM Number</label>
                    <input style={S.inputSm} placeholder="Optional" name="oemNumber" value={formData.oemNumber} onChange={handleInputChange} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={S.labelSm}>EAN / Barcode</label>
                    <input style={S.inputSm} placeholder="Optional" name="ean" value={formData.ean} onChange={handleInputChange} />
                  </div>
                </div>

                <label style={{ ...S.labelSm, marginTop: 10 }}>HSN Code</label>
                <input style={S.inputSm} placeholder="Optional" name="hsnCode" value={formData.hsnCode} onChange={handleInputChange} />
              </div>
            )}

            <div style={S.modalActions}>
              <button style={S.ghostBtn} onClick={resetAddModal}>
                Cancel
              </button>
              <button style={S.primaryBtn} onClick={saveItem} disabled={saving}>
                {saving ? <Loader2 size={15} className="pc-spin" /> : <Boxes size={15} />}
                {saving ? "Saving…" : "Save Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload modal */}
      {showBulkModal && (
        <div style={S.overlay} onClick={() => setShowBulkModal(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>Bulk Upload Items</span>
              <button style={S.iconBtn} onClick={() => setShowBulkModal(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={S.hint}>
              Accepts .csv or .xlsx/.xls files with 9 columns: Brand, Category, Master, Product
              Name, Description, Part Number, OEM Number, EAN, HSN Code. Only Brand, Category,
              Master, Product Name and Part Number are required — Brand/Category/Master are
              created automatically if they don't exist yet. Pricing isn't supported in bulk
              upload.
            </p>

            <button style={S.linkBtn} onClick={downloadTemplate}>
              <Download size={14} /> Download Excel Template
            </button>

            <div style={S.fileRow}>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              />
            </div>

            {selectedFile && (
              <p style={S.selectedFileLabel}>Selected: {selectedFile.name}</p>
            )}

            <div style={S.modalActions}>
              <button style={S.ghostBtn} onClick={() => setShowBulkModal(false)}>
                Close
              </button>
              <button style={S.primaryBtn} onClick={uploadItems} disabled={uploading}>
                {uploading ? <Loader2 size={15} className="pc-spin" /> : <UploadCloud size={15} />}
                {uploading ? "Uploading…" : "Upload File"}
              </button>
            </div>

            {bulkResult && bulkResult.failedRows && bulkResult.failedRows.length > 0 && (
              <div style={S.failedBox}>
                <p style={S.label}>Skipped rows</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {bulkResult.failedRows.map((f, idx) => (
                    <li key={idx} style={{ fontSize: 13, color: "#B91C1C" }}>
                      Row {f.rowNumber}: {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ ...S.toast, ...(toast.type === "error" ? S.toastError : S.toastSuccess) }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, tint, iconColor, small }) {
  return (
    <div style={S.statCard}>
      <div style={S.statLabelRow}>
        <span style={S.statLabel}>{label}</span>
        <span style={{ ...S.statIconWrap, background: tint, color: iconColor }}>{icon}</span>
      </div>
      <div style={small ? S.statValueSmall : S.statValue}>{value}</div>
    </div>
  );
}

const S = {
  page: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: "#1F2937",
    maxWidth: 1100,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 22,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 13.5,
    color: "#6B7280",
    marginTop: 4,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
    marginBottom: 18,
  },
  statCard: {
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    padding: "14px 16px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  },
  statLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12.5,
    color: "#6B7280",
    fontWeight: 500,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    marginTop: 8,
  },
  statValueSmall: {
    fontSize: 17,
    fontWeight: 700,
    marginTop: 10,
  },
  toolbarRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    padding: "8px 12px",
    width: 320,
  },
  searchInput: {
    border: "none",
    outline: "none",
    fontSize: 14,
    width: "100%",
  },
  tableCard: {
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    fontSize: 11.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#9CA3AF",
    padding: "12px 18px",
    borderBottom: "1px solid #F3F4F6",
    background: "#FAFAFA",
  },
  tr: {
    borderBottom: "1px solid #F3F4F6",
  },
  td: {
    padding: "12px 18px",
    fontSize: 14,
    color: "#374151",
  },
  tdStrong: {
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
  },
  tableFooter: {
    padding: "10px 18px",
    fontSize: 12.5,
    color: "#9CA3AF",
    borderTop: "1px solid #F3F4F6",
  },
  emptyState: {
    padding: "40px 0",
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#2563EB",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#fff",
    color: "#374151",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  ghostBtn: {
    background: "transparent",
    color: "#6B7280",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  linkBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "none",
    color: "#2563EB",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    marginBottom: 14,
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#9CA3AF",
  },
  hint: {
    fontSize: 12.5,
    color: "#6B7280",
    marginTop: -6,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  selectedFileLabel: {
    fontSize: 12.5,
    color: "#374151",
    marginTop: 6,
    marginBottom: 0,
  },
  fieldRow: {
    display: "flex",
    gap: 10,
    marginTop: 12,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17,24,39,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    width: 340,
    maxHeight: "82vh",
    overflowY: "auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#111827",
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: "#6B7280",
    marginBottom: 5,
    display: "block",
  },
  labelSm: {
    fontSize: 11.5,
    fontWeight: 500,
    color: "#9CA3AF",
    marginBottom: 4,
    display: "block",
  },
  input: {
    width: "100%",
    border: "1px solid #E5E7EB",
    borderRadius: 7,
    padding: "8px 10px",
    fontSize: 13.5,
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    color: "#111827",
  },
  inputSm: {
    width: "100%",
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    padding: "6px 9px",
    fontSize: 12.5,
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    color: "#374151",
  },
  moreToggle: {
    display: "block",
    background: "transparent",
    border: "none",
    color: "#2563EB",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    marginTop: 14,
  },
  moreFieldsBox: {
    marginTop: 10,
    padding: 12,
    background: "#F9FAFB",
    border: "1px solid #F3F4F6",
    borderRadius: 8,
  },
  fileRow: {
    marginBottom: 8,
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  failedBox: {
    marginTop: 16,
    padding: 12,
    background: "#FEF2F2",
    border: "1px solid #FEE2E2",
    borderRadius: 8,
    maxHeight: 140,
    overflowY: "auto",
  },
  toast: {
    position: "fixed",
    bottom: 24,
    right: 24,
    padding: "12px 18px",
    borderRadius: 8,
    fontSize: 13.5,
    fontWeight: 500,
    boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
    zIndex: 60,
  },
  toastSuccess: { background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" },
  toastError: { background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA" },
};

export default ItemsSection;
