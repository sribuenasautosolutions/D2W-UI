import { useState, useEffect, useMemo } from "react";
import {
  FolderTree,
  Plus,
  Search,
  Download,
  UploadCloud,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react";
import api from "../../../services/api";

function CategoriesSection() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const [toast, setToast] = useState(null); // { type: 'success' | 'error', msg }

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get("/categories");
      setCategories(response.data || []);
    } catch (error) {
      console.error("Failed to load categories", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.trim().toLowerCase();
    return categories.filter((c) => c.categoryName?.toLowerCase().includes(q));
  }, [categories, query]);

  const activeCount = useMemo(() => categories.filter((c) => c.active).length, [categories]);
  const latestCategory = categories.length ? categories[categories.length - 1].categoryName : "—";

  const resetAddModal = () => {
    setCategoryName("");
    setParentCategoryId("");
    setShowAddModal(false);
  };

  const saveCategory = async () => {
    if (!categoryName.trim()) {
      setToast({ type: "error", msg: "Category name is required." });
      return;
    }

    setSaving(true);
    try {
      // Backend only strictly needs categoryName — slug, status and
      // timestamps are generated server-side. parentCategoryId is optional.
      const response = await api.post("/categories", {
        categoryName: categoryName.trim(),
        parentCategoryId: parentCategoryId || null,
      });

      setToast({ type: "success", msg: response.data });
      resetAddModal();
      loadCategories();
    } catch (error) {
      console.error("Failed to save category", error);
      setToast({ type: "error", msg: "Error saving category." });
    }
    setSaving(false);
  };

  const downloadSampleFile = () => {
    // Bulk upload only reads column 1 (category name); header row is
    // skipped. Bulk-imported categories always land as top-level —
    // there's no parent-category column support server-side.
    const csvContent = ["Category Name", "Engine Parts", "Brake System", "Electricals", "Suspension"].join(
      "\n"
    );
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "category_bulk_upload_sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const uploadCategories = async () => {
    if (!selectedFile) {
      setToast({ type: "error", msg: "Please select a file first." });
      return;
    }

    setUploading(true);
    setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await api.post("/categories/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data;
      setBulkResult(result);
      setToast({
        type: result.skippedRows > 0 ? "error" : "success",
        msg: `Processed ${result.totalRows} rows — ${result.successRows} saved, ${result.skippedRows} skipped.`,
      });
      setSelectedFile(null);
      loadCategories();
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
            <FolderTree size={20} style={{ color: "#2563EB" }} /> Product Categories
          </div>
          <p style={S.subtitle}>Manage category hierarchy — parents and sub-categories.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.secondaryBtn} onClick={() => setShowBulkModal(true)}>
            <UploadCloud size={15} /> Bulk Upload
          </button>
          <button style={S.primaryBtn} onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Category
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={S.statsGrid}>
        <StatCard label="Total Categories" value={categories.length} icon={<FolderTree size={16} />} tint="#EEF2FF" iconColor="#4F46E5" />
        <StatCard label="Active" value={activeCount} icon={<CheckCircle2 size={16} />} tint="#ECFDF5" iconColor="#059669" />
        <StatCard label="Latest Added" value={latestCategory} icon={<FolderTree size={16} />} tint="#F5F3FF" iconColor="#7C3AED" small />
      </div>

      {/* Toolbar */}
      <div style={S.toolbarRow}>
        <div style={S.searchWrap}>
          <Search size={15} style={{ color: "#9CA3AF" }} />
          <input
            style={S.searchInput}
            placeholder="Search categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div style={S.tableCard}>
        {loading ? (
          <div style={S.emptyState}>
            <Loader2 size={18} className="pc-spin" /> Loading categories…
          </div>
        ) : filteredCategories.length === 0 ? (
          <div style={S.emptyState}>No categories found.</div>
        ) : (
          <>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Category</th>
                  <th style={S.th}>Slug</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category.id} style={S.tr}>
                    <td style={S.tdStrong}>{category.categoryName}</td>
                    <td style={S.td}>{category.slug}</td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, ...(category.active ? S.badgeActive : S.badgeInactive) }}>
                        {category.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={S.tableFooter}>
              {filteredCategories.length} of {categories.length} categories
            </div>
          </>
        )}
      </div>

      {/* Add Category modal */}
      {showAddModal && (
        <div style={S.overlay} onClick={resetAddModal}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>Add Category</span>
              <button style={S.iconBtn} onClick={resetAddModal}>
                <X size={16} />
              </button>
            </div>

            <label style={S.label}>Category Name *</label>
            <input
              style={S.input}
              autoFocus
              placeholder="e.g. Engine Parts"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveCategory()}
            />

            <label style={{ ...S.label, marginTop: 14 }}>Parent Category</label>
            <select
              style={S.input}
              value={parentCategoryId}
              onChange={(e) => setParentCategoryId(e.target.value)}
            >
              <option value="">None — top-level category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.categoryName}
                </option>
              ))}
            </select>

            <div style={S.modalActions}>
              <button style={S.ghostBtn} onClick={resetAddModal}>
                Cancel
              </button>
              <button style={S.primaryBtn} onClick={saveCategory} disabled={saving}>
                {saving ? <Loader2 size={15} className="pc-spin" /> : <FolderTree size={15} />}
                {saving ? "Saving…" : "Save Category"}
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
              <span style={S.modalTitle}>Bulk Upload Categories</span>
              <button style={S.iconBtn} onClick={() => setShowBulkModal(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={S.hint}>
              Bulk import creates top-level categories only — assign parents individually afterward.
            </p>

            <button style={S.linkBtn} onClick={downloadSampleFile}>
              <Download size={14} /> Download Sample CSV
            </button>

            <div style={S.fileRow}>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              />
            </div>

            <div style={S.modalActions}>
              <button style={S.ghostBtn} onClick={() => setShowBulkModal(false)}>
                Close
              </button>
              <button style={S.primaryBtn} onClick={uploadCategories} disabled={uploading}>
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
    width: 280,
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
  badge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 999,
  },
  badgeActive: { background: "#ECFDF5", color: "#059669" },
  badgeInactive: { background: "#F3F4F6", color: "#6B7280" },
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
    padding: 22,
    width: 380,
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
  },
  label: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
    display: "block",
  },
  input: {
    width: "100%",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
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

export default CategoriesSection;
