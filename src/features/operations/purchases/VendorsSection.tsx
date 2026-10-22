import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CirclePlus,
  Download,
  Filter,
  MoreHorizontal,
  Power,
  Search,
  Store,
  UserRoundCheck,
  X,
} from "lucide-react";
import api from "../../../services/api";
import VendorStockModal from "./VendorStockModal";

const emptyVendor = {
  vendorName: "",
  phone: "",
  contactPerson: "",
  email: "",
  gstNumber: "",
  state: "",
  pincode: "",
  address: "",
};

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function isValidGstValue(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return true;
  return /^[A-Za-z0-9]{1,15}$/.test(trimmed);
}

function csvValue(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export default function VendorsSection() {
  const user = getUser();
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(
    user.storeId ? String(user.storeId) : "",
  );
  const [vendors, setVendors] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyVendor);
  const [modalStoreId, setModalStoreId] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedVendor, setSelectedVendor] = useState(null);
  const filterRef = useRef(null);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let active = true;
    api
      .get("/stores", { params: { page: 0, size: 100, active: true } })
      .then((response) => {
        if (!active) return;
        const content = Array.isArray(response.data?.content)
          ? response.data.content
          : [];
        const operationalStores = content.filter(
          (store) => store.storeType !== "WAREHOUSE",
        );
        setStores(operationalStores);
        setStoreId(
          (current) =>
            current ||
            (operationalStores[0]?.id ? String(operationalStores[0].id) : ""),
        );
      })
      .catch(
        () =>
          active &&
          setMessage({ type: "error", text: "Unable to load stores" }),
      );
    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!filterOpen && !moreMenuOpen) return;
    const handleClick = (event) => {
      if (
        filterOpen &&
        filterRef.current &&
        !filterRef.current.contains(event.target)
      )
        setFilterOpen(false);
      if (
        moreMenuOpen &&
        moreRef.current &&
        !moreRef.current.contains(event.target)
      )
        setMoreMenuOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setFilterOpen(false);
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [filterOpen, moreMenuOpen]);

  const toggleFilter = () => {
    setMoreMenuOpen(false);
    setFilterOpen((open) => !open);
  };
  const toggleMore = () => {
    setFilterOpen(false);
    setMoreMenuOpen((open) => !open);
  };

  const loadVendors = async () => {
    if (isSuperAdmin && !storeId) {
      setVendors([]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get("/vendors", {
        params: {
          ...(storeId ? { storeId: Number(storeId) } : {}),
          activeOnly: false,
        },
      });
      setVendors(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to load vendors",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [storeId]);

  const visibleVendors = useMemo(() => {
    const search = query.trim().toLowerCase();
    return vendors.filter((vendor) => {
      if (statusFilter === "ACTIVE" && !vendor.isActive) return false;
      if (statusFilter === "INACTIVE" && vendor.isActive) return false;
      if (!search) return true;
      return [
        vendor.vendorName,
        vendor.contactPerson,
        vendor.phone,
        vendor.email,
        vendor.gstNumber,
        vendor.state,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search),
      );
    });
  }, [query, vendors, statusFilter]);

  const activeCount = vendors.filter((vendor) => vendor.isActive).length;
  const share = (count) =>
    vendors.length ? `${Math.round((count / vendors.length) * 100)}%` : "0%";

  const openAddVendor = () => {
    setForm(emptyVendor);
    setModalStoreId(storeId || "");
    setMessage(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setMessage(null);
  };

  const saveVendor = async () => {
    if (isSuperAdmin && !modalStoreId)
      return setMessage({ type: "error", text: "Please select a store." });
    if (!form.vendorName.trim())
      return setMessage({ type: "error", text: "Vendor name is required." });
    if (!form.phone.trim())
      return setMessage({ type: "error", text: "Phone number is required." });
    if (form.phone.trim().length !== 10)
      return setMessage({
        type: "error",
        text: "Phone number must be exactly 10 digits.",
      });
    if (!isValidGstValue(form.gstNumber))
      return setMessage({
        type: "error",
        text: "GST number must be letters and numbers only, up to 15 characters.",
      });

    setSaving(true);
    try {
      await api.post("/vendors", {
        storeId: Number(isSuperAdmin ? modalStoreId : user.storeId),
        vendorName: form.vendorName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        gstNumber: form.gstNumber.trim().toUpperCase(),
        contactPerson: form.contactPerson.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim(),
        address: form.address.trim() || null,
      });
      setModalOpen(false);
      setForm(emptyVendor);
      setMessage({ type: "success", text: "Vendor created successfully" });
      await loadVendors();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to create vendor",
      });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (vendor) => {
    try {
      await api.patch(`/vendors/${vendor.id}/active`, null, {
        params: { active: !vendor.isActive },
      });
      setMessage({
        type: "success",
        text: `${vendor.vendorName} ${vendor.isActive ? "inactivated" : "activated"}`,
      });
      await loadVendors();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to update vendor",
      });
    }
  };

  const exportVendors = () => {
    const header = [
      "Vendor Name",
      "Phone",
      "Contact Person",
      "Email",
      "GST Number",
      "State",
      "Pincode",
      "Status",
    ];
    const rows = visibleVendors.map((vendor) => [
      vendor.vendorName,
      vendor.phone,
      vendor.contactPerson || "",
      vendor.email || "",
      vendor.gstNumber || "",
      vendor.state || "",
      vendor.pincode || "",
      vendor.isActive ? "Active" : "Inactive",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvValue).join(","))
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = "vendors.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    setMoreMenuOpen(false);
  };

  return (
    <section className="grid gap-3.5 text-slate-700">
      {message && !modalOpen && (
        <div
          className={`flex items-center justify-between p-3 rounded-md text-xs font-semibold ${
            message.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            className="text-lg leading-none cursor-pointer"
            onClick={() => setMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Summary
          icon={Building2}
          label="Total Vendors"
          value={vendors.length}
          hint="All vendors"
        />
        <Summary
          icon={UserRoundCheck}
          label="Active Vendors"
          value={activeCount}
          accent="#15803D"
          hint={`${share(activeCount)} of total`}
        />
        <Summary
          icon={Store}
          label="Inactive Vendors"
          value={vendors.length - activeCount}
          accent="#B45309"
          hint={`${share(vendors.length - activeCount)} of total`}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 h-10 w-full sm:w-80 px-3 border border-slate-300 rounded-md bg-white text-slate-400 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
            <Search size={16} />
            <input
              className="w-full border-none outline-none text-slate-900 text-xs bg-transparent"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vendors..."
            />
          </label>
          {isSuperAdmin && (
            <select
              className="h-10 px-3 border border-slate-300 rounded-md bg-white text-slate-800 text-xs outline-none focus:border-blue-600"
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
            >
              <option value="">Select store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.storeName}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div ref={filterRef} className="relative">
            <button
              type="button"
              className="w-9 h-9 border border-slate-300 rounded-md bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer"
              title="Filter vendors"
              onClick={toggleFilter}
            >
              <Filter size={16} />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-11 z-30 w-44 p-3 bg-white border border-slate-200 rounded-lg shadow-xl">
                <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-500 uppercase">
                  Status
                  <select
                    className="h-8 px-2 border border-slate-300 rounded bg-white text-slate-800 text-xs"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="ALL">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          <div ref={moreRef} className="relative">
            <button
              type="button"
              className="w-9 h-9 border border-slate-300 rounded-md bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer"
              title="More vendor actions"
              onClick={toggleMore}
            >
              <MoreHorizontal size={16} />
            </button>
            {moreMenuOpen && (
              <div className="absolute right-0 top-11 z-30 w-44 p-1.5 bg-white border border-slate-200 rounded-lg shadow-xl">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded cursor-pointer"
                  onClick={exportVendors}
                >
                  <Download size={15} /> Export Vendors
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="h-10 px-4 inline-flex items-center gap-2 bg-[#3158D4] hover:bg-[#2748B4] text-white rounded-md text-xs font-semibold shadow-sm cursor-pointer transition"
            onClick={openAddVendor}
          >
            <CirclePlus size={16} /> Add Vendor
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <th className="py-2.5 px-3">Vendor</th>
              <th className="py-2.5 px-3">Contact</th>
              <th className="py-2.5 px-3">GST Number</th>
              <th className="py-2.5 px-3">Location</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleVendors.map((vendor) => (
              <tr
                key={vendor.id}
                className="border-b border-slate-100 hover:bg-slate-50/70 cursor-pointer transition-colors"
                onClick={() => setSelectedVendor(vendor)}
              >
                <td className="py-2.5 px-3">
                  <strong className="block text-slate-900 font-bold">
                    {vendor.vendorName}
                  </strong>
                  <small className="block text-slate-500 text-[10.5px]">
                    {vendor.contactPerson || "No contact person"}
                  </small>
                </td>
                <td className="py-2.5 px-3">
                  <span className="block text-slate-800">{vendor.phone}</span>
                  <small className="block text-slate-500 text-[10.5px]">
                    {vendor.email || "No email"}
                  </small>
                </td>
                <td className="py-2.5 px-3 text-slate-700">
                  {vendor.gstNumber || "—"}
                </td>
                <td className="py-2.5 px-3">
                  <span className="block text-slate-800">
                    {vendor.state || "—"}
                  </span>
                  <small className="block text-slate-500 text-[10.5px]">
                    {vendor.pincode || ""}
                  </small>
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      vendor.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {vendor.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                      vendor.isActive
                        ? "text-red-600 hover:bg-red-50"
                        : "text-emerald-600 hover:bg-emerald-50"
                    }`}
                    title={
                      vendor.isActive ? "Inactivate vendor" : "Activate vendor"
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      changeStatus(vendor);
                    }}
                  >
                    <Power size={14} />{" "}
                    {vendor.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !visibleVendors.length && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500">
                  No vendors found for this store.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500">
                  Loading vendors...
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {!loading && (
          <div className="py-2 px-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            Showing <strong>{visibleVendors.length}</strong> of{" "}
            <strong>{vendors.length}</strong>{" "}
            {vendors.length === 1 ? "vendor" : "vendors"}
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onMouseDown={closeModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] p-6 border border-slate-200 my-8"
            role="dialog"
            aria-modal="true"
            aria-label="Add vendor"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="m-0 text-base font-bold text-slate-900">
                  Add Vendor
                </h2>
                <p className="m-0 text-xs text-slate-500">
                  Create a supplier for the selected store.
                </p>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                onClick={closeModal}
              >
                <X size={18} />
              </button>
            </div>

            {message && (
              <div
                className={`flex items-center justify-between p-2.5 rounded-md text-xs font-semibold mb-3 ${
                  message.type === "error"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                <span>{message.text}</span>
                <button
                  type="button"
                  className="text-sm font-bold"
                  onClick={() => setMessage(null)}
                >
                  ×
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              {isSuperAdmin && (
                <label className="col-span-full flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <span>Store *</span>
                  <select
                    className="h-9 px-2.5 border border-slate-300 rounded bg-white text-xs text-slate-900"
                    value={modalStoreId}
                    onChange={(event) => setModalStoreId(event.target.value)}
                  >
                    <option value="">Select Store</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.storeName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Field
                label="Vendor Name *"
                value={form.vendorName}
                onChange={(value) => setForm({ ...form, vendorName: value })}
                autoFocus
              />
              <Field
                label="Phone *"
                value={form.phone}
                maxLength={10}
                onChange={(value) =>
                  setForm({ ...form, phone: value.replace(/\D/g, "") })
                }
              />
              <Field
                label="Contact Person"
                value={form.contactPerson}
                onChange={(value) => setForm({ ...form, contactPerson: value })}
              />
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
              />
              <Field
                label="GST Number"
                value={form.gstNumber}
                maxLength={15}
                onChange={(value) =>
                  setForm({
                    ...form,
                    gstNumber: value
                      .replace(/[^a-zA-Z0-9]/g, "")
                      .toUpperCase()
                      .slice(0, 15),
                  })
                }
              />
              <Field
                label="State"
                value={form.state}
                onChange={(value) => setForm({ ...form, state: value })}
              />
              <Field
                label="Pincode"
                value={form.pincode}
                maxLength={6}
                onChange={(value) =>
                  setForm({ ...form, pincode: value.replace(/\D/g, "") })
                }
              />
              <label className="col-span-full flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <span>Address</span>
                <textarea
                  className="w-full h-16 p-2 border border-slate-300 rounded bg-white text-xs outline-none"
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-[#3158D4] hover:bg-[#2748B4] text-white rounded-md text-xs font-semibold cursor-pointer disabled:opacity-50 transition"
                onClick={saveVendor}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedVendor && (
        <VendorStockModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
        />
      )}
    </section>
  );
}

function Summary({ icon: Icon, label, value, accent = "#3158D4", hint }) {
  return (
    <div className="min-h-[76px] p-3.5 px-4 flex items-center gap-3.5 bg-white border border-slate-300 rounded-lg shadow-sm">
      <span
        className="w-11 h-11 flex-none grid place-items-center rounded-lg text-white"
        style={{ backgroundColor: accent }}
      >
        <Icon size={20} />
      </span>
      <div>
        <small className="block text-slate-600 text-xs font-bold leading-tight">
          <span
            className="inline-block w-1.5 h-1.5 mr-1.5 rounded-full"
            style={{ backgroundColor: accent }}
          />
          {label}
        </small>
        <strong className="block mt-0.5 text-slate-900 text-[22px] font-semibold leading-tight tabular-nums">
          {value}
        </strong>
      </div>
      {hint && (
        <span className="ml-auto self-start px-2 py-0.5 border border-slate-200 rounded-full bg-slate-50 text-slate-600 text-[11px] font-bold whitespace-nowrap">
          {hint}
        </span>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  maxLength = undefined,
  autoFocus = false,
}: any) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
      <span>{label}</span>
      <input
        className="h-9 px-2.5 border border-slate-300 rounded bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
        autoFocus={autoFocus}
        type={type}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
