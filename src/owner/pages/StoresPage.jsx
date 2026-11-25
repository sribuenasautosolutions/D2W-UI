import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
    ChevronLeft,
    ChevronRight,
    MapPin,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
    Store,
    Building2,
    Warehouse,
    CheckCircle2,
    XCircle,
    Eye,
    EyeOff,
    Power,
    Check,
    LoaderCircle,
    RefreshCw,
    MoreVertical,
} from "lucide-react";
import api from "../../services/api";
import { clearStoresCache } from "../../services/storeService";
import toast from "react-hot-toast";

const emptyStore = {
    storeName: "",
    storeCode: "",
    ownerName: "",
    phone: "",
    email: "",
    ownerPassword: "",
    confirmOwnerPassword: "",
    address: "",
    district: "",
    state: "",
    country: "India",
    pincode: "",
    storeType: "MAIN_STORE",
    gstno: "",
};

function StoresPage() {
    const { user: currentUser, hasPermission, hasGlobalStoreManagementAuthority } = useAuth();
    const canCreateStore = hasPermission?.("STORES.CREATE");
    const canUpdateStore = hasPermission?.("STORES.UPDATE");
    const canDelegatePermissions = hasPermission?.("STORE_PERMISSIONS.DELEGATE") ||
        hasPermission?.("PERMISSIONS.MANAGE") ||
        hasPermission?.("PERMISSIONS.VIEW") ||
        (typeof hasGlobalStoreManagementAuthority === "function" && hasGlobalStoreManagementAuthority());
    const canDeleteStore = typeof hasGlobalStoreManagementAuthority === "function"
        ? hasGlobalStoreManagementAuthority()
        : false;

    const [stores, setStores] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [summary, setSummary] = useState({
        active: 0,
        inactive: 0,
        main: 0,
        warehouse: 0,
    });

    // Drawer state for Create / Edit
    const [modal, setModal] = useState(null); // "create" | "edit" | null
    const [form, setForm] = useState(emptyStore);
    const originalEditFormRef = useRef(null);
    const lastPincodeLookupRef = useRef(null);
    const pincodeRequestRef = useRef(0);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [showInitialPassword, setShowInitialPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // 3-dots action menu popover
    const [actionMenuStoreId, setActionMenuStoreId] = useState(null);

    // Details drawer state
    const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("Overview");

    // Store-level permission delegation
    const [storePermissions, setStorePermissions] = useState([]);
    const [storeDelegations, setStoreDelegations] = useState([]);
    const [permissionsLoading, setPermissionsLoading] = useState(false);
    const [permissionError, setPermissionError] = useState("");
    const [updatingPermissionCode, setUpdatingPermissionCode] = useState("");

    const [message, setMessage] = useState({
        type: "",
        text: "",
    });

    // Close 3-dots menu on window click
    useEffect(() => {
        const handleOutsideClick = () => setActionMenuStoreId(null);
        window.addEventListener("click", handleOutsideClick);
        return () => window.removeEventListener("click", handleOutsideClick);
    }, []);

    /*
     * ---------------------------------------------------------
     * LOAD STORES
     * ---------------------------------------------------------
     */
    const loadStores = useCallback(async () => {
        clearStoresCache();
        const active =
            statusFilter === "ALL"
                ? undefined
                : statusFilter === "ACTIVE";

        const response = await api.get("/stores", {
            params: {
                page: page - 1,
                size: pageSize,
                search: search.trim() || undefined,
                active,
            },
        });

        const data = Array.isArray(response.data?.content)
            ? response.data.content
            : [];

        setStores(data);

        const returnedTotalPages = Math.max(1, response.data?.totalPages || 1);
        setTotalElements(response.data?.totalElements || 0);
        setTotalPages(returnedTotalPages);

        if (page > returnedTotalPages) {
            setPage(returnedTotalPages);
        }

        setSummary({
            active: response.data?.activeStores || 0,
            inactive: response.data?.inactiveStores || 0,
            main: response.data?.mainStores || 0,
            warehouse: response.data?.warehouses || 0,
        });
    }, [page, pageSize, search, statusFilter]);

    useEffect(() => {
        const timer = window.setTimeout(async () => {
            try {
                await loadStores();
            } catch (error) {
                const msg = error.response?.data?.message || "Unable to load stores";
                setMessage({ type: "error", text: msg });
                toast.error(msg);
            }
        }, 250);

        return () => window.clearTimeout(timer);
    }, [loadStores]);

    const selected = stores.find((s) => s.id === selectedId) || null;

    /*
     * ---------------------------------------------------------
     * PINCODE LOOKUP
     * ---------------------------------------------------------
     */
    const fetchPincodeDetails = async (pincode) => {
        if (!/^\d{6}$/.test(pincode)) return;

        const requestId = ++pincodeRequestRef.current;
        lastPincodeLookupRef.current = pincode;

        try {
            const response = await api.get(`/api/pincode/${pincode}`);

            if (requestId !== pincodeRequestRef.current) return;

            updateField("district", response.data?.district || "");
            updateField("state", response.data?.state || "");
        } catch (error) {
            if (requestId !== pincodeRequestRef.current) return;

            lastPincodeLookupRef.current = null;
            setFieldErrors((current) => ({
                ...current,
                pincode: "Unable to verify this pincode",
                district: "District could not be fetched",
                state: "State could not be fetched",
            }));

            const errorMsg =
                error.response?.data?.message ||
                "Unable to fetch pincode details. Please check the pincode and try again.";
            setMessage({ type: "error", text: errorMsg });
            toast.error(errorMsg);
        }
    };

    /*
     * ---------------------------------------------------------
     * STORE PERMISSIONS DELEGATION
     * ---------------------------------------------------------
     */
    const loadStorePermissions = async (storeId) => {
        if (!storeId) return;

        setPermissionsLoading(true);
        setPermissionError("");

        try {
            const [permissionResponse, delegationResponse] = await Promise.all([
                api.get("/access-control/permissions"),
                api.get(`/stores/${storeId}/permissions`),
            ]);

            const permissionData = Array.isArray(permissionResponse.data)
                ? permissionResponse.data
                : [];

            const delegationData = Array.isArray(delegationResponse.data)
                ? delegationResponse.data
                : [];

            setStorePermissions(
                permissionData
                    .filter((p) => p && typeof p === "object")
                    .filter((p) => (p.active ?? p.isActive) !== false)
                    .filter((p) => p.scope !== "SYSTEM")
                    .sort((a, b) => {
                        const moduleCompare = (a.module || "").localeCompare(b.module || "");
                        return moduleCompare || (a.action || "").localeCompare(b.action || "");
                    })
            );

            setStoreDelegations(delegationData);
        } catch (error) {
            const errorMsg =
                error.response?.data?.message ||
                "Unable to load store permissions. Please try again.";
            setPermissionError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setPermissionsLoading(false);
        }
    };

    const toggleStorePermission = async (permission) => {
        if (!selected || !permission?.code || updatingPermissionCode) return;

        const delegation = storeDelegations.find(
            (item) => item.permissionCode === permission.code
        );
        const currentlyDelegated = delegation?.delegated === true;
        const action = currentlyDelegated ? "revoke" : "grant";

        setUpdatingPermissionCode(permission.code);
        setPermissionError("");

        try {
            await api.put(
                `/stores/${selected.id}/permissions/${encodeURIComponent(permission.code)}/${action}`
            );

            const response = await api.get(`/stores/${selected.id}/permissions`);
            setStoreDelegations(Array.isArray(response.data) ? response.data : []);
            toast.success(`Permission ${permission.code} ${currentlyDelegated ? "revoked" : "granted"}.`);
        } catch (error) {
            const errorMsg =
                error.response?.data?.message ||
                `Unable to ${action} ${permission.code}.`;
            setPermissionError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setUpdatingPermissionCode("");
        }
    };

    /*
     * ---------------------------------------------------------
     * FORM HANDLERS
     * ---------------------------------------------------------
     */
    const openCreate = () => {
        setForm({ ...emptyStore });
        originalEditFormRef.current = null;
        lastPincodeLookupRef.current = null;
        pincodeRequestRef.current += 1;
        setModal("create");
        setFieldErrors({});
        setShowInitialPassword(false);
        setShowConfirmPassword(false);
        setMessage({ type: "", text: "" });
    };

    const openEdit = (storeToEdit) => {
        const target = storeToEdit || selected;
        if (!target) return;

        const editForm = {
            storeName: target.storeName || "",
            storeCode: target.storeCode || "",
            ownerName: target.ownerName || "",
            phone: target.phone || "",
            email: target.email || "",
            ownerPassword: "",
            confirmOwnerPassword: "",
            address: target.address || "",
            district: target.district || "",
            state: target.state || "",
            country: "India",
            pincode: target.pincode || "",
            storeType: target.storeType || "MAIN_STORE",
            gstno: target.gstno || "",
        };

        setSelectedId(target.id);
        originalEditFormRef.current = editForm;
        lastPincodeLookupRef.current = editForm.pincode;
        pincodeRequestRef.current += 1;
        setForm(editForm);
        setModal("edit");
        setFieldErrors({});
        setShowInitialPassword(false);
        setShowConfirmPassword(false);
        setMessage({ type: "", text: "" });
    };

    const openDetails = (store) => {
        setSelectedId(store.id);
        setActiveTab("Overview");
        setStorePermissions([]);
        setStoreDelegations([]);
        setPermissionError("");
        setDetailsDrawerOpen(true);
    };

    const updateField = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
        setFieldErrors((current) => ({
            ...current,
            [field]: "",
        }));
    };

    const saveStore = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage({ type: "", text: "" });
        setFieldErrors({});

        const payload = {
            ...form,
            storeName: form.storeName.trim(),
            ownerName: form.ownerName.trim(),
            email: form.email.trim(),
            gstno: form.gstno.trim().toUpperCase(),
            address: form.address.trim(),
            district: form.district?.trim() || "",
            state: form.state?.trim() || "",
            pincode: form.pincode.trim(),
            country: "India",
        };

        delete payload.storeCode;

        try {
            if (modal === "create") {
                await api.post("/stores", payload);
                toast.success("Store created successfully!");
            } else {
                delete payload.country;
                delete payload.ownerPassword;
                delete payload.confirmOwnerPassword;

                const original = originalEditFormRef.current || {};
                const changedPayload = Object.fromEntries(
                    Object.entries(payload).filter(
                        ([key, value]) => value !== original[key]
                    )
                );

                const targetId = selectedId || selected?.id;
                if (Object.keys(changedPayload).length > 0 && targetId) {
                    await api.patch(`/stores/${targetId}`, changedPayload);
                }
                toast.success("Store updated successfully!");
            }

            setModal(null);
            await loadStores();
        } catch (error) {
            const data = error.response?.data;
            setFieldErrors(data?.fieldErrors || {});

            const errorMessages = Array.isArray(data?.errors)
                ? data.errors.filter(Boolean)
                : [];

            const errorText =
                errorMessages.length > 0
                    ? errorMessages.join(" • ")
                    : data?.message || "Unable to save store";

            setMessage({ type: "error", text: errorText });
            toast.error(errorText);
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (storeToToggle) => {
        const target = storeToToggle || selected;
        if (!target) return;

        const active = target.isActive === false;
        if (!window.confirm(`${active ? "Activate" : "Deactivate"} ${target.storeName}?`)) {
            return;
        }

        try {
            await api.patch(`/stores/${target.id}/status`, { active });
            const successMsg = `Store ${active ? "activated" : "deactivated"} successfully.`;
            toast.success(successMsg);
            await loadStores();
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Unable to update store status";
            toast.error(errorMsg);
        }
    };

    const deleteStore = async (storeToDelete) => {
        const target = storeToDelete || selected;
        if (!target || deleting) return;

        const confirmed = window.confirm(
            `Permanently delete ${target.storeName} (${target.storeCode}) and all data owned by this store?\n\n` +
            `This includes invoices, payments, inventory and transactions, local products, customers, users, suppliers, purchasing, leads, requests, and store communications. This cannot be undone.`
        );
        if (!confirmed) return;

        setDeleting(true);
        try {
            const response = await api.delete(`/stores/${target.id}`);
            const deletedRecords = response.data?.deletedRecords || response.data;
            const summaryText =
                deletedRecords && typeof deletedRecords === "object"
                    ? Object.entries(deletedRecords)
                          .map(([name, count]) => `${name}: ${count}`)
                          .join(", ")
                    : response.data?.message || "Store was deleted.";

            if (selectedId === target.id) {
                setSelectedId(null);
                setDetailsDrawerOpen(false);
            }
            toast.success(`Store deleted. ${summaryText}`);
            await loadStores();
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Unable to delete store";
            toast.error(errorMsg);
        } finally {
            setDeleting(false);
        }
    };

    const kpiList = [
        {
            label: "Total Stores",
            value: summary.active + summary.inactive,
            icon: Store,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
        },
        {
            label: "Active Stores",
            value: summary.active,
            icon: CheckCircle2,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
        },
        {
            label: "Inactive Stores",
            value: summary.inactive,
            icon: XCircle,
            iconBg: "bg-rose-50",
            iconColor: "text-rose-600",
        },
        {
            label: "Main Stores",
            value: summary.main,
            icon: Building2,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
        },
        {
            label: "Warehouses",
            value: summary.warehouse,
            icon: Warehouse,
            iconBg: "bg-indigo-50",
            iconColor: "text-indigo-600",
        },
    ];

    return (
        <div className="w-full max-w-[1580px] mx-auto px-4 sm:px-6 py-6 font-sans text-slate-800 antialiased">
            {/* -------------------------------------------------
                TOP HEADER:
                - TOP LEFT: STORE MANAGEMENT HEADING
                - TOP RIGHT: ADD STORE BUTTON (create-role-btn style)
            ------------------------------------------------- */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Organization / Stores
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Store Management
                    </h1>
                </div>

                {canCreateStore && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            className="create-role-btn"
                            onClick={openCreate}
                        >
                            <Plus size={16} />
                            <span>Add Store</span>
                        </button>
                    </div>
                )}
            </header>

            {/* -------------------------------------------------
                BELOW HEADING: KPI CARDS (Compact, streamlined metric cards)
            ------------------------------------------------- */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
                {kpiList.map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <div
                            key={kpi.label}
                            className="kpi-metric-card group"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider group-hover:text-black transition-colors">
                                    {kpi.label}
                                </span>
                                <div
                                    className={`w-7 h-7 rounded-lg ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs`}
                                >
                                    <Icon size={15} strokeWidth={2.75} />
                                </div>
                            </div>
                            <div className="mt-1 text-xl font-bold text-slate-900 tracking-tight">
                                {kpi.value}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* -------------------------------------------------
                BANNER MESSAGE (IF ANY)
            ------------------------------------------------- */}
            {message.text && !modal && (
                <div
                    className={`mb-4 px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between ${
                        message.type === "error"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                >
                    <span>{message.text}</span>
                    <button
                        type="button"
                        onClick={() => setMessage({ type: "", text: "" })}
                        className="text-slate-400 hover:text-slate-600 ml-3"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* -------------------------------------------------
                MAIN SECTION:
                - ALL STORES
                - BESIDE: SEARCH BAR
                - BESIDE: STATUS DROPDOWN
                - BELOW: TABLE IN TABLE FORMAT
            ------------------------------------------------- */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                {/* TOOLBAR */}
                <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                            All Stores
                        </h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/70">
                            {totalElements} records
                        </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                        {/* SEARCH BAR (CLEAN, NO TRUNCATED PLACEHOLDER) */}
                        <div className="relative w-full sm:w-80">
                            <Search
                                size={15}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search by name, code, or owner..."
                                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
                            />
                        </div>

                        {/* STATUS DROPDOWN */}
                        <select
                            aria-label="Filter stores by status"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 px-3.5 py-2 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer shadow-2xs"
                        >
                            <option value="ALL">All status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* TABLE IN TABLE FORMAT (Row Click opens Overview drawer) */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200 bg-white text-black text-xs font-bold uppercase tracking-wider">
                                <th className="py-3 px-5 sm:px-6 text-black border-r border-slate-200/80">Store & Owner</th>
                                <th className="py-3 px-4 text-black border-r border-slate-200/80">Code</th>
                                <th className="py-3 px-4 text-black border-r border-slate-200/80">District / State</th>
                                <th className="py-3 px-4 text-black border-r border-slate-200/80">Type</th>
                                <th className="py-3 px-4 text-black border-r border-slate-200/80">Status</th>
                                <th className="py-3 px-5 sm:px-6 text-black text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 text-sm">
                            {stores.map((store) => {
                                const isActive = store.isActive !== false;
                                const isMenuOpen = actionMenuStoreId === store.id;
                                const isSelected = selectedId === store.id && detailsDrawerOpen;

                                return (
                                    <tr
                                        key={store.id}
                                        onClick={() => openDetails(store)}
                                        className={`transition-colors cursor-pointer group ${
                                            isSelected
                                                ? "bg-blue-50/50"
                                                : "hover:bg-slate-50/80"
                                        }`}
                                    >
                                        {/* STORE NAME & OWNER */}
                                        <td className="py-3.5 px-5 sm:px-6 border-r border-slate-200/60">
                                            <div className="font-semibold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                                                {store.storeName}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {store.ownerName || "No owner"}
                                            </div>
                                        </td>

                                        {/* CODE (SUBTLE MONOSPACE PILL, DOES NOT DOMINATE STORE NAME) */}
                                        <td className="py-3.5 px-4 border-r border-slate-200/60">
                                            <span className="font-mono text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70 tracking-tight">
                                                {store.storeCode}
                                            </span>
                                        </td>

                                        {/* DISTRICT / STATE (NO FLOATING HYPHENS) */}
                                        <td className="py-3.5 px-4 border-r border-slate-200/60">
                                            {store.district ? (
                                                <div>
                                                    <div className="text-sm font-medium text-slate-800">
                                                        {store.district}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        {store.state || store.country || "India"}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-slate-500">
                                                    {store.state || store.country || "India"}
                                                </div>
                                            )}
                                        </td>

                                        {/* TYPE */}
                                        <td className="py-3.5 px-4 border-r border-slate-200/60">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    store.storeType === "WAREHOUSE"
                                                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                                                        : "bg-blue-50 text-blue-700 border border-blue-200/80"
                                                }`}
                                            >
                                                {store.storeType === "WAREHOUSE" ? "Warehouse" : "Main Store"}
                                            </span>
                                        </td>

                                        {/* STATUS BADGE */}
                                        <td className="py-3.5 px-4 border-r border-slate-200/60">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    isActive
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                                        : "bg-slate-100 text-slate-600 border border-slate-200/80"
                                                }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        isActive ? "bg-emerald-500" : "bg-slate-400"
                                                    }`}
                                                />
                                                {isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>

                                        {/* 3-DOTS ACTION MENU */}
                                        <td
                                            className="py-3.5 px-4 sm:px-6 text-right relative"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                                <button
                                                    type="button"
                                                    title="Store options"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActionMenuStoreId((prev) =>
                                                            prev === store.id ? null : store.id
                                                        );
                                                    }}
                                                    className="w-8 h-8 rounded-lg border-0 bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>

                                                {/* DROPDOWN MENU (CLEAN MODERN DROPDOWN NO HARSH BORDERS) */}
                                                {isMenuOpen && (
                                                    <div
                                                        className="store-action-menu absolute right-4 top-11 z-30 text-left animate-in fade-in zoom-in-95 duration-150"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setActionMenuStoreId(null);
                                                                openDetails(store);
                                                            }}
                                                            className="store-action-item text-slate-700"
                                                        >
                                                            <Eye size={15} className="text-slate-400" />
                                                            <span>View Details</span>
                                                        </button>

                                                        {canUpdateStore && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActionMenuStoreId(null);
                                                                    openEdit(store);
                                                                }}
                                                                className="store-action-item text-blue-600 hover:bg-blue-50/70"
                                                            >
                                                                <Pencil size={15} />
                                                                <span>Edit Store</span>
                                                            </button>
                                                        )}

                                                        {canUpdateStore && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActionMenuStoreId(null);
                                                                    toggleStatus(store);
                                                                }}
                                                                className={`store-action-item ${
                                                                    isActive
                                                                        ? "text-amber-600 hover:bg-amber-50/70"
                                                                        : "text-emerald-600 hover:bg-emerald-50/70"
                                                                }`}
                                                            >
                                                                <Power size={15} />
                                                                <span>
                                                                    {isActive ? "Deactivate Store" : "Activate Store"}
                                                                </span>
                                                            </button>
                                                        )}

                                                        {canDeleteStore && (
                                                            <>
                                                                <div className="my-1 border-t border-slate-100" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                      setActionMenuStoreId(null);
                                                                      deleteStore(store);
                                                                  }}
                                                                  className="store-action-item text-rose-600 hover:bg-rose-50/80"
                                                              >
                                                                  <Trash2 size={15} />
                                                                  <span>Delete Store</span>
                                                              </button>
                                                          </>
                                                      )}
                                                  </div>
                                              )}
                                          </td>
                                    </tr>
                                );
                            })}

                            {stores.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="py-12 text-center text-slate-400 text-sm font-medium"
                                    >
                                        No stores found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* TABLE FOOTER / PAGINATION */}
                <div className="p-4 sm:px-6 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <div>
                        {totalElements
                            ? `${(page - 1) * pageSize + 1}-${Math.min(
                                  page * pageSize,
                                  totalElements
                              )} of ${totalElements} records`
                            : "0 records"}
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            aria-label="Rows per page"
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                            <option value={5}>5 / page</option>
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                        </select>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={page === 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="px-2 font-semibold text-slate-800">
                                {page}
                            </span>
                            <button
                                type="button"
                                disabled={page === totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* -------------------------------------------------
                CREATE / EDIT STORE DRAWER:
                - Increased width: max-w-2xl sm:max-w-3xl
                - White background
                - Field names are bold black
                - Eye icon for password toggling (no text "Show")
                - Sticky footer with Cancel and Create Store (create-role-btn style)
            ------------------------------------------------- */}
            {modal && (
                <div
                    role="presentation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setModal(null);
                    }}
                    className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="store-form-title"
                        className="w-full max-w-2xl lg:max-w-3xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 transition-all duration-300"
                    >
                        {/* DRAWER HEADER */}
                        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h2
                                    id="store-form-title"
                                    className="text-lg font-semibold text-slate-900"
                                >
                                    {modal === "create" ? "Create Store" : "Edit Store"}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {modal === "create"
                                        ? "Add store identity, owner contact and address details."
                                        : `Update information for ${form.storeName || "store"}.`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModal(null)}
                                className="drawer-close-btn"
                                aria-label="Close drawer"
                            >
                                <X size={18} />
                            </button>
                        </header>

                        {/* DRAWER BODY (SCROLLABLE, WHITE BG, BLACK FIELD NAMES) */}
                        <form
                            onSubmit={saveStore}
                            className="flex-1 flex flex-col overflow-hidden bg-white"
                            noValidate
                        >
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 bg-white">
                                {/* ERROR BANNER IN DRAWER */}
                                {message.text && (
                                    <div
                                        className={`p-3.5 rounded-xl border text-xs font-medium ${
                                            message.type === "error"
                                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        }`}
                                    >
                                        {message.text}
                                    </div>
                                )}

                                {/* ROW 1: STORE NAME & STORE CODE */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Store Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Example: Hyderabad Store"
                                            value={form.storeName}
                                            onChange={(e) => updateField("storeName", e.target.value)}
                                            className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ${
                                                fieldErrors.storeName ? "border-rose-500! bg-rose-50/20" : ""
                                            }`}
                                        />
                                        {fieldErrors.storeName && (
                                            <p className="text-xs text-rose-600 mt-1">{fieldErrors.storeName}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Store Code
                                        </label>
                                        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600 font-mono">
                                            {modal === "create"
                                                ? storeCodePreview(form.storeName)
                                                : form.storeCode}
                                        </div>
                                    </div>
                                </div>

                                {/* ROW 2: STORE OWNER & OWNER EMAIL */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Store Owner *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Example: Ravi Kumar"
                                            value={form.ownerName}
                                            onChange={(e) => updateField("ownerName", e.target.value)}
                                            className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ${
                                                fieldErrors.ownerName ? "border-rose-500! bg-rose-50/20" : ""
                                            }`}
                                        />
                                        {fieldErrors.ownerName && (
                                            <p className="text-xs text-rose-600 mt-1">{fieldErrors.ownerName}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Owner Email *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="Example: ravi@gmail.com"
                                            value={form.email}
                                            onChange={(e) => updateField("email", e.target.value)}
                                            className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ${
                                                fieldErrors.email ? "border-rose-500! bg-rose-50/20" : ""
                                            }`}
                                        />
                                        {fieldErrors.email && (
                                            <p className="text-xs text-rose-600 mt-1">{fieldErrors.email}</p>
                                        )}
                                    </div>
                                </div>

                                {/* PASSWORD (FOR CREATE STORE ONLY) WITH EYE ICON TOGGLE */}
                                {modal === "create" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-black mb-1.5">
                                                Initial Password *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showInitialPassword ? "text" : "password"}
                                                    placeholder="Min 8 characters"
                                                    value={form.ownerPassword}
                                                    onChange={(e) => updateField("ownerPassword", e.target.value)}
                                                    className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 pr-11 ${
                                                        fieldErrors.ownerPassword ? "border-rose-500!" : ""
                                                    }`}
                                                />
                                                <button
                                                    type="button"
                                                    title={showInitialPassword ? "Hide password" : "Show password"}
                                                    onClick={() => setShowInitialPassword((s) => !s)}
                                                    className="password-eye-btn absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                                >
                                                    {showInitialPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            {fieldErrors.ownerPassword && (
                                                <p className="text-xs text-rose-600 mt-1">{fieldErrors.ownerPassword}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-black mb-1.5">
                                                Confirm Password *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Repeat password"
                                                    value={form.confirmOwnerPassword}
                                                    onChange={(e) => updateField("confirmOwnerPassword", e.target.value)}
                                                    className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 pr-11 ${
                                                        fieldErrors.confirmOwnerPassword ? "border-rose-500!" : ""
                                                    }`}
                                                />
                                                <button
                                                    type="button"
                                                    title={showConfirmPassword ? "Hide password" : "Show password"}
                                                    onClick={() => setShowConfirmPassword((s) => !s)}
                                                    className="password-eye-btn absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                                >
                                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            {fieldErrors.confirmOwnerPassword && (
                                                <p className="text-xs text-rose-600 mt-1">{fieldErrors.confirmOwnerPassword}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ROW 3: PHONE & GSTIN */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Phone *
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={10}
                                            inputMode="numeric"
                                            placeholder="10 digit mobile"
                                            value={form.phone}
                                            onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, ""))}
                                            className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 ${
                                                fieldErrors.phone ? "border-rose-500!" : ""
                                            }`}
                                        />
                                        {fieldErrors.phone && (
                                            <p className="text-xs text-rose-600 mt-1">{fieldErrors.phone}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            GSTIN
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={15}
                                            placeholder="15 alphanumeric characters"
                                            value={form.gstno}
                                            onChange={(e) =>
                                                updateField(
                                                    "gstno",
                                                    e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
                                                )
                                            }
                                            className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 uppercase ${
                                                fieldErrors.gstno ? "border-rose-500!" : ""
                                            }`}
                                        />
                                        {fieldErrors.gstno && (
                                            <p className="text-xs text-rose-600 mt-1">{fieldErrors.gstno}</p>
                                        )}
                                    </div>
                                </div>

                                {/* ADDRESS */}
                                <div>
                                    <label className="block text-sm font-semibold text-black mb-1.5">
                                        Address *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Example: 12-3 Main Road, Hanamkonda"
                                        value={form.address}
                                        onChange={(e) => updateField("address", e.target.value)}
                                        className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 ${
                                            fieldErrors.address ? "border-rose-500!" : ""
                                        }`}
                                    />
                                    {fieldErrors.address && (
                                        <p className="text-xs text-rose-600 mt-1">{fieldErrors.address}</p>
                                    )}
                                </div>

                                {/* PINCODE, DISTRICT, STATE */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Pincode *
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            inputMode="numeric"
                                            placeholder="6 digits"
                                            value={form.pincode}
                                            onChange={(e) => {
                                                const pincode = e.target.value.replace(/\D/g, "").slice(0, 6);
                                                updateField("pincode", pincode);

                                                const original = originalEditFormRef.current;
                                                if (modal === "edit" && pincode === original?.pincode) {
                                                    pincodeRequestRef.current += 1;
                                                    lastPincodeLookupRef.current = pincode;
                                                    updateField("district", original.district);
                                                    updateField("state", original.state);
                                                } else if (
                                                    pincode.length === 6 &&
                                                    pincode !== lastPincodeLookupRef.current
                                                ) {
                                                    fetchPincodeDetails(pincode);
                                                }
                                            }}
                                            className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 ${
                                                fieldErrors.pincode ? "border-rose-500!" : ""
                                            }`}
                                        />
                                        {fieldErrors.pincode && (
                                            <p className="text-xs text-rose-600 mt-1">{fieldErrors.pincode}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            District
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            placeholder="Auto-fetched"
                                            value={form.district}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            State
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            placeholder="Auto-fetched"
                                            value={form.state}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600"
                                        />
                                    </div>
                                </div>

                                {/* STORE TYPE & COUNTRY */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Store Type *
                                        </label>
                                        <select
                                            value={form.storeType}
                                            onChange={(e) => updateField("storeType", e.target.value)}
                                            className="store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 cursor-pointer"
                                        >
                                            <option value="MAIN_STORE">Main Store</option>
                                            <option value="WAREHOUSE">Warehouse</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Country
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            value="India"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* STICKY DRAWER FOOTER: CANCEL & CREATE STORE (CREATE-ROLE-BTN STYLING) */}
                            <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                                <button
                                    type="button"
                                    onClick={() => setModal(null)}
                                    disabled={saving}
                                    className="create-role-btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="create-role-btn"
                                >
                                    {saving ? (
                                        <LoaderCircle size={15} className="animate-spin" />
                                    ) : (
                                        <Check size={15} />
                                    )}
                                    <span>
                                        {saving
                                            ? "Saving..."
                                            : modal === "create"
                                                ? "Create Store"
                                                : "Save Changes"}
                                    </span>
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            {/* -------------------------------------------------
                STORE DETAILS DRAWER (OVERVIEW & PERMISSIONS):
                - Stylings exactly matching the reference screenshot:
                  * Clean underline tabs
                  * Grouped module cards with grey headers
                  * Soft DELEGATED / NOT DELEGATED badges
                  * Soft pink/red Revoke button & soft blue Grant button
                  * Clean delete button with no border
            ------------------------------------------------- */}
            {detailsDrawerOpen && selected && (
                <div
                    role="presentation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setDetailsDrawerOpen(false);
                    }}
                    className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="store-details-title"
                        className="w-full max-w-2xl lg:max-w-3xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 transition-all duration-300"
                    >
                        {/* HEADER */}
                        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 id="store-details-title" className="text-lg font-semibold text-slate-900">
                                        {selected.storeName}
                                    </h2>
                                    <span
                                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                            selected.isActive !== false ? "text-emerald-600" : "text-slate-500"
                                        }`}
                                    >
                                        <span
                                            className={`w-2 h-2 rounded-full ${
                                                selected.isActive !== false ? "bg-emerald-500" : "bg-slate-400"
                                            }`}
                                        />
                                        {selected.isActive !== false ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <span className="font-mono text-xs text-slate-500 mt-0.5 block">
                                    {selected.storeCode}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailsDrawerOpen(false)}
                                className="drawer-close-btn"
                                aria-label="Close drawer"
                            >
                                <X size={18} />
                            </button>
                        </header>

                        {/* TABS (CLEAN UNDERLINE TABS WITH NO FOCUS BOX OR GREY BACKGROUND) */}
                        <div className="flex items-center border-b border-slate-200 px-6 bg-white shrink-0 gap-6">
                            <button
                                type="button"
                                onClick={() => setActiveTab("Overview")}
                                className={`store-tab-btn ${activeTab === "Overview" ? "active" : ""}`}
                            >
                                Overview
                            </button>
                            {canDelegatePermissions && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab("Permissions");
                                        loadStorePermissions(selected.id);
                                    }}
                                    className={`store-tab-btn ${activeTab === "Permissions" ? "active" : ""}`}
                                >
                                    Permissions
                                </button>
                            )}
                        </div>

                        {/* TAB CONTENT (PURE WHITE BACKGROUND) */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
                            {/* OVERVIEW TAB */}
                            {activeTab === "Overview" ? (
                                <div className="space-y-5 bg-white">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                                            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                                                Store Owner
                                            </span>
                                            <span className="text-sm font-semibold text-slate-900 block">
                                                {selected.ownerName || "—"}
                                            </span>
                                        </div>

                                        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                                            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                                                Owner Email
                                            </span>
                                            <span className="text-sm font-semibold text-slate-900 block truncate">
                                                {selected.email || "—"}
                                            </span>
                                        </div>

                                        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                                            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                                                Phone
                                            </span>
                                            <span className="text-sm font-semibold font-mono text-slate-900 block">
                                                {selected.phone || "—"}
                                            </span>
                                        </div>

                                        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                                            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                                                Store Type
                                            </span>
                                            <span className="text-sm font-semibold text-slate-900 block">
                                                {selected.storeType === "WAREHOUSE" ? "Warehouse" : "Main Store"}
                                            </span>
                                        </div>

                                        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs sm:col-span-2">
                                            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                                                GSTIN
                                            </span>
                                            <span className="text-sm font-semibold font-mono text-slate-900 block">
                                                {selected.gstno || "—"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* ADDRESS */}
                                    <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex items-start gap-3">
                                        <MapPin size={18} className="text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                                                Full Address
                                            </span>
                                            <p className="text-sm text-slate-800 font-medium leading-relaxed">
                                                {[
                                                    selected.address,
                                                    selected.district,
                                                    selected.state,
                                                    selected.pincode,
                                                    "India",
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ")}
                                            </p>
                                        </div>
                                    </div>

                                    {/* ACTION BUTTONS (INCREASED WIDTH DELETE BUTTON) */}
                                    <div className="flex items-center gap-3 pt-4 border-t border-slate-200 bg-white">
                                        {canUpdateStore && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDetailsDrawerOpen(false);
                                                    openEdit(selected);
                                                }}
                                                className="create-role-btn"
                                            >
                                                <Pencil size={15} />
                                                <span>Edit Store</span>
                                            </button>
                                        )}

                                        {canUpdateStore && (
                                            <button
                                                type="button"
                                                onClick={() => toggleStatus(selected)}
                                                className="create-role-btn-secondary"
                                            >
                                                <Power size={15} />
                                                <span>
                                                    {selected.isActive !== false ? "Deactivate" : "Activate"}
                                                </span>
                                            </button>
                                        )}

                                        {canDeleteStore && (
                                            <button
                                                type="button"
                                                onClick={() => deleteStore(selected)}
                                                disabled={deleting}
                                                className="min-w-[160px] px-6 py-2.5 rounded-full text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors ml-auto cursor-pointer border-0 outline-none flex items-center justify-center gap-2 shadow-2xs"
                                            >
                                                <Trash2 size={15} />
                                                <span>{deleting ? "Deleting..." : "Delete Store"}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : activeTab === "Permissions" && canDelegatePermissions ? (
                                /* PERMISSIONS TAB (MATCHING USER'S SCREENSHOT EXACTLY) */
                                <div className="space-y-4 bg-white">
                                    {/* HEADING & REFRESH */}
                                    <div className="flex items-start justify-between gap-4 bg-white">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 tracking-tight">
                                                Store Permission Delegation
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Control which permissions this store may use when its Store Owner creates store roles.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => loadStorePermissions(selected.id)}
                                            disabled={permissionsLoading || Boolean(updatingPermissionCode)}
                                            className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                                        >
                                            <RefreshCw
                                                size={13}
                                                className={permissionsLoading ? "animate-spin text-blue-600" : "text-slate-500"}
                                            />
                                            Refresh
                                        </button>
                                    </div>

                                    {permissionError && (
                                        <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">
                                            {permissionError}
                                        </div>
                                    )}

                                    {/* SUMMARY PILL BAR */}
                                    <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-600 shadow-2xs">
                                        <span>
                                            {storeDelegations.filter((item) => item.delegated === true).length} delegated permissions
                                        </span>
                                        <span>{storePermissions.length} active catalogue permissions</span>
                                    </div>

                                    {/* PERMISSION CARDS GROUPED BY MODULE */}
                                    {permissionsLoading ? (
                                        <div className="py-12 text-center text-slate-400 text-xs">
                                            Loading permissions catalogue...
                                        </div>
                                    ) : storePermissions.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 text-xs">
                                            No active permissions found.
                                        </div>
                                    ) : (
                                        <div className="space-y-4 bg-white">
                                            {Object.entries(
                                                storePermissions.reduce((groups, permission) => {
                                                    const moduleName = permission.module || "Other";
                                                    if (!groups[moduleName]) groups[moduleName] = [];
                                                    groups[moduleName].push(permission);
                                                    return groups;
                                                }, {})
                                            ).map(([moduleName, perms]) => (
                                                <div
                                                    key={moduleName}
                                                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
                                                >
                                                    {/* MODULE HEADER */}
                                                    <div className="px-4 py-2.5 bg-white border-b border-slate-200 text-xs font-bold text-slate-800 uppercase tracking-wider">
                                                        {moduleName}
                                                    </div>

                                                    {/* PERMISSION ROWS */}
                                                    <div className="divide-y divide-slate-100">
                                                        {perms.map((permission) => {
                                                            const delegation = storeDelegations.find(
                                                                (item) => item.permissionCode === permission.code
                                                            );
                                                            const delegated = delegation?.delegated === true;
                                                            const updating = updatingPermissionCode === permission.code;

                                                            return (
                                                                <div
                                                                    key={permission.code}
                                                                    className="px-4 py-3.5 flex items-center justify-between gap-4"
                                                                >
                                                                    {/* LEFT: ACTION, DESCRIPTION & CODE */}
                                                                    <div className="space-y-0.5">
                                                                        <div className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                                                                            {permission.action || permission.code}
                                                                        </div>
                                                                        <div className="text-xs text-slate-600 font-normal">
                                                                            {permission.description || permission.code}
                                                                        </div>
                                                                        <div className="text-[10px] font-mono text-slate-400 font-semibold tracking-wider uppercase">
                                                                            {permission.code}
                                                                        </div>
                                                                    </div>

                                                                    {/* RIGHT: BADGE & TOGGLE BUTTON */}
                                                                    <div className="flex items-center gap-2.5 shrink-0">
                                                                        <span
                                                                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase ${
                                                                                delegated
                                                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                                    : "bg-slate-50 text-slate-500 border border-slate-200"
                                                                            }`}
                                                                        >
                                                                            {delegated ? "DELEGATED" : "NOT DELEGATED"}
                                                                        </span>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleStorePermission(permission)}
                                                                            disabled={Boolean(updatingPermissionCode)}
                                                                            className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 border ${
                                                                                delegated
                                                                                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                                                                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                                                            }`}
                                                                        >
                                                                            {updating
                                                                                ? "Saving..."
                                                                                : delegated
                                                                                    ? "Revoke"
                                                                                    : "Grant"}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        {/* STICKY FOOTER */}
                        <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end shrink-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                            <button
                                type="button"
                                onClick={() => setDetailsDrawerOpen(false)}
                                className="create-role-btn-secondary"
                            >
                                Close
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* -------------------------------------------------
                BUTTON STYLES (MATCHING CREATE ROLE EXACTLY)
            ------------------------------------------------- */}
            <style>{`
                .create-role-btn {
                    min-width: 9.5em;
                    padding: 0 1.4em;
                    height: 2.9em;
                    border-radius: 30em;
                    font-size: 13.5px;
                    font-family: inherit;
                    border: none !important;
                    outline: none !important;
                    background: linear-gradient(to right, #002d74 0%, #2563eb 100%) !important;
                    color: #ffffff !important;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 4px 14px -1px rgba(37, 99, 235, 0.4), 0 2px 6px -1px rgba(0, 45, 116, 0.2) !important;
                    transition: all 0.25s ease !important;
                    white-space: nowrap;
                }

                .create-role-btn:hover {
                    background: linear-gradient(to right, #001f52 0%, #1d4ed8 100%) !important;
                    box-shadow: 0 6px 20px -2px rgba(37, 99, 235, 0.5), 0 3px 8px -1px rgba(0, 45, 116, 0.3) !important;
                    transform: translateY(-1px);
                    color: #ffffff !important;
                }

                .create-role-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 8px -1px rgba(37, 99, 235, 0.3) !important;
                }

                .create-role-btn-secondary {
                    min-width: 7.5em;
                    padding: 0 1.25em;
                    height: 3em;
                    border-radius: 30em;
                    font-size: 14px;
                    font-family: inherit;
                    border: none !important;
                    outline: none !important;
                    background: #f1f5f9;
                    color: #475569;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 4px 4px 10px #e2e8f0, -4px -4px 10px #ffffff;
                    transition: all 0.3s ease;
                    white-space: nowrap;
                }

                .create-role-btn-secondary:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }

                .store-action-menu {
                    background: #ffffff !important;
                    border-radius: 16px !important;
                    box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.08) !important;
                    border: 1px solid #f1f5f9 !important;
                    padding: 6px !important;
                    min-width: 180px !important;
                }

                .store-action-item {
                    width: 100% !important;
                    padding: 8px 12px !important;
                    border: none !important;
                    outline: none !important;
                    background: transparent !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 10px !important;
                    font-size: 13px !important;
                    font-weight: 500 !important;
                    border-radius: 10px !important;
                    cursor: pointer !important;
                    transition: background 0.15s ease, color 0.15s ease !important;
                    text-align: left !important;
                }

                .store-action-item:hover {
                    background: #f8fafc !important;
                }

                /* INPUT STYLING: SOFT LIGHT BORDER (NO HARSH BLACK BORDER), CLEAN FOCUS */
                .store-input {
                    border: 1px solid #e2e8f0 !important;
                    background-color: #ffffff !important;
                    outline: none !important;
                    outline-offset: 0 !important;
                    box-shadow: none !important;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
                }

                .store-input:hover {
                    border-color: #cbd5e1 !important;
                }

                .store-input:focus,
                .store-input:focus-visible {
                    outline: none !important;
                    outline-offset: 0 !important;
                    box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.25) !important;
                    border-color: #93c5fd !important;
                }

                .store-input.border-rose-500,
                .store-input[class*="border-rose-500"] {
                    border-color: #f43f5e !important;
                }

                input,
                select,
                textarea {
                    outline: none !important;
                    outline-offset: 0 !important;
                }

                /* PASSWORD EYE TOGGLE: ZERO BOX BORDER, TRANSPARENT BACKGROUND */
                .password-eye-btn {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    border: none !important;
                    outline: none !important;
                    outline-offset: 0 !important;
                    background: transparent !important;
                    background-color: transparent !important;
                    box-shadow: none !important;
                    padding: 4px !important;
                    margin: 0 !important;
                    cursor: pointer !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

                /* DRAWER CLOSE CROSS MARK: RED HOVER HIGHLIGHT */
                .drawer-close-btn {
                    width: 32px !important;
                    height: 32px !important;
                    border-radius: 8px !important;
                    border: none !important;
                    outline: none !important;
                    background: #f1f5f9 !important;
                    color: #64748b !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                }

                .drawer-close-btn:hover {
                    background: #ffe4e6 !important;
                    color: #e11d48 !important;
                }

                /* TABS: ZERO BUTTONFACE GREY BOX, CLEAN UNDERLINE HIGHLIGHT */
                .store-tab-btn {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    background: transparent !important;
                    background-color: transparent !important;
                    border: none !important;
                    border-bottom: 2px solid transparent !important;
                    outline: none !important;
                    outline-offset: 0 !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                    padding: 14px 18px !important;
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    color: #64748b !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                }

                .store-tab-btn.active {
                    background: transparent !important;
                    background-color: transparent !important;
                    border-bottom: 2px solid #d97706 !important;
                    color: #0f172a !important;
                    font-weight: 700 !important;
                }

                .store-tab-btn:hover:not(.active) {
                    background: transparent !important;
                    background-color: transparent !important;
                    color: #1e293b !important;
                }

                /* KPI CARDS: COMPACT LENGTH, PADDING & SUBTLE SHADOW */
                .kpi-metric-card {
                    background: #ffffff !important;
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 12px !important;
                    padding: 8px 12px !important;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03) !important;
                    transition: all 0.2s ease !important;
                    cursor: default !important;
                }

                .kpi-metric-card:hover {
                    border-color: #cbd5e1 !important;
                    box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.03) !important;
                    transform: translateY(-1px) !important;
                }
            `}</style>
        </div>
    );
}

function storeCodePreview(storeName) {
    const slug = (storeName || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z]+/g, "_")
        .replace(/^_+|_+$/g, "");

    return slug ? `D2W_${slug}_###` : "Generated automatically";
}

export default StoresPage;
