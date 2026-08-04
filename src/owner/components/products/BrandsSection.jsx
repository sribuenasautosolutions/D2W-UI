import { useState, useEffect, useMemo } from "react";
import {
  Tag,
  Plus,
  Search,
  Download,
  UploadCloud,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react";
import api from "../../../services/api";

function BrandsSection() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const [toast, setToast] = useState(null); // { type: 'success' | 'error', msg }

  const loadBrands = async () => {
    setLoading(true);
    try {
      const response = await api.get("/brands");
      setBrands(response.data || []);
    } catch (error) {
      console.error("Failed to load brands", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredBrands = useMemo(() => {
    if (!query.trim()) return brands;
    const q = query.trim().toLowerCase();
    return brands.filter((b) => b.brandName?.toLowerCase().includes(q));
  }, [brands, query]);

  const activeCount = useMemo(() => brands.filter((b) => b.active).length, [brands]);
  const latestBrand = brands.length ? brands[brands.length - 1].brandName : "—";

  const resetAddModal = () => {
    setBrandName("");
    setShowAddModal(false);
  };

  const saveBrand = async () => {
    if (!brandName.trim()) {
      setToast({ type: "error", msg: "Brand name is required." });
      return;
    }

    setSaving(true);
    try {
      // Backend only needs brandName — slug, status and everything
      // else is generated server-side.
      const response = await api.post("/brands", {
        brandName: brandName.trim(),
      });

      setToast({ type: "success", msg: response.data });
      resetAddModal();
      loadBrands();
    } catch (error) {
      console.error("Failed to save brand", error);
      setToast({ type: "error", msg: "Error saving brand." });
    }
    setSaving(false);
  };

  const downloadSampleFile = () => {
    // Bulk upload only reads column 1 (brand name); header row is skipped.
    const csvContent = ["Brand Name", "Bosch", "Bajaj", "TVS", "Mahindra"].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "brand_bulk_upload_sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const uploadBrands = async () => {
    if (!selectedFile) {
      setToast({ type: "error", msg: "Please select a file first." });
      return;
    }

    setUploading(true);
    setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await api.post("/brands/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data;
      setBulkResult(result);
      setToast({
        type: result.skippedRows > 0 ? "error" : "success",
        msg: `Processed ${result.totalRows} rows — ${result.successRows} saved, ${result.skippedRows} skipped.`,
      });
      setSelectedFile(null);
      loadBrands();
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
            <Tag size={20} style={{ color: "#2563EB" }} /> Product Brands
          </div>
          <p style={S.subtitle}>Manage brand master data — Bosch, Bajaj, TVS, and more.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.secondaryBtn} onClick={() => setShowBulkModal(true)}>
            <UploadCloud size={15} /> Bulk Upload
          </button>
          <button style={S.primaryBtn} onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Brand
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={S.statsGrid}>
        <StatCard label="Total Brands" value={brands.length} icon={<Tag size={16} />} tint="#EEF2FF" iconColor="#4F46E5" />
        <StatCard label="Active" value={activeCount} icon={<CheckCircle2 size={16} />} tint="#ECFDF5" iconColor="#059669" />
        <StatCard label="Latest Added" value={latestBrand} icon={<Tag size={16} />} tint="#F5F3FF" iconColor="#7C3AED" small />
      </div>

      {/* Toolbar */}
      <div style={S.toolbarRow}>
        <div style={S.searchWrap}>
          <Search size={15} style={{ color: "#9CA3AF" }} />
          <input
            style={S.searchInput}
            placeholder="Search brands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div style={S.tableCard}>
        {loading ? (
          <div style={S.emptyState}>
            <Loader2 size={18} className="pc-spin" /> Loading brands…
          </div>
        ) : filteredBrands.length === 0 ? (
          <div style={S.emptyState}>No brands found.</div>
        ) : (
          <>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Brand</th>
                  <th style={S.th}>Slug</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBrands.map((brand) => (
                  <tr key={brand.id} style={S.tr}>
                    <td style={S.tdStrong}>{brand.brandName}</td>
                    <td style={S.td}>{brand.slug}</td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, ...(brand.active ? S.badgeActive : S.badgeInactive) }}>
                        {brand.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={S.tableFooter}>
              {filteredBrands.length} of {brands.length} brands
            </div>
          </>
        )}
      </div>

      {/* Add Brand modal */}
      {showAddModal && (
        <div style={S.overlay} onClick={resetAddModal}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>Add Brand</span>
              <button style={S.iconBtn} onClick={resetAddModal}>
                <X size={16} />
              </button>
            </div>

            <label style={S.label}>Brand Name *</label>
            <input
              style={S.input}
              autoFocus
              placeholder="e.g. Bosch"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveBrand()}
            />

            <div style={S.modalActions}>
              <button style={S.ghostBtn} onClick={resetAddModal}>
                Cancel
              </button>
              <button style={S.primaryBtn} onClick={saveBrand} disabled={saving}>
                {saving ? <Loader2 size={15} className="pc-spin" /> : <Tag size={15} />}
                {saving ? "Saving…" : "Save Brand"}
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
              <span style={S.modalTitle}>Bulk Upload Brands</span>
              <button style={S.iconBtn} onClick={() => setShowBulkModal(false)}>
                <X size={16} />
              </button>
            </div>

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
              <button style={S.primaryBtn} onClick={uploadBrands} disabled={uploading}>
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
  badgeFeatured: { background: "#FFFBEB", color: "#D97706" },
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

export default BrandsSection;
