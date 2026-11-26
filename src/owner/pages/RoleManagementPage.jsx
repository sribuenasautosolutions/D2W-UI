import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Search,
    Plus,
    ShieldCheck,
    Shield,
    Pencil,
    Power,
    X,
    Check,
    LoaderCircle,
    AlertCircle,
    RefreshCw,
    LockKeyhole,
    SlidersHorizontal,
    Copy,
    ChevronRight,
    ChevronLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../auth/AuthContext";

const emptyForm = {
    name: "",
    scope: "STORE",
    storeId: "",
    permissions: [],
};

function toTitleCase(str) {
    if (!str || typeof str !== "string") return "";
    if (str.includes("_") || str === str.toUpperCase()) {
        return str
            .toLowerCase()
            .split(/[_\s]+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }
    return str;
}

function formatPermissionAction(code) {
    if (!code) return "";
    let action = code;
    if (action.includes(".")) {
        const parts = action.split(".");
        action = parts[parts.length - 1];
    } else if (action.includes(":")) {
        const parts = action.split(":");
        action = parts[parts.length - 1];
    } else if (action.includes("_")) {
        const parts = action.split("_");
        action = parts[parts.length - 1];
    }
    return action.toLowerCase();
}

function getErrorMessage(error, fallback) {
    const data = error?.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data?.message) return data.message;
    if (Array.isArray(data?.errors) && data.errors.length) {
        return data.errors[0];
    }
    return fallback;
}

function RoleManagementPage() {
    const { user: currentUser, hasPermission, hasAnyPermission, hasGlobalStoreManagementAuthority } = useAuth();
    const isSuperAdmin = hasGlobalStoreManagementAuthority();

    // Use proper RBAC permission checks for authorization
    // hasGlobalStoreManagementAuthority checks for STORES.UPDATE permission which indicates platform admin
    const canViewRoles = isSuperAdmin || hasAnyPermission?.(["ROLES.VIEW", "PERMISSIONS.VIEW"]);
    const canCreateRole = isSuperAdmin || hasPermission?.("ROLES.CREATE");
    const canUpdateRole = isSuperAdmin || hasPermission?.("ROLES.UPDATE");

    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [delegatedPermissions, setDelegatedPermissions] = useState([]);
    const [stores, setStores] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [storeLoadError, setStoreLoadError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Drawer state
    const [formOpen, setFormOpen] = useState(false);
    const [drawerExpanded, setDrawerExpanded] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState("");

    // In-drawer permission controls
    const [leftRoleSearch, setLeftRoleSearch] = useState("");
    const [permSearch, setPermSearch] = useState("");
    const [selectedRefRoleName, setSelectedRefRoleName] = useState(null);

    const loadData = useCallback(async (showSpinner = true) => {
        if (showSpinner) setLoading(true);
        setStoreLoadError("");

        try {
            let storeFailed = false;
            let storeFailureMessage = "";
            const requests = [
                api.get("/access-control/roles"),
                api.get("/access-control/permissions"),
                api.get("/access-control/stores").catch((storeRequestError) => {
                    storeFailed = true;
                    storeFailureMessage = getErrorMessage(
                        storeRequestError,
                        "Unable to load authorized stores."
                    );
                    return { data: [] };
                }),
            ];

            const [roleResponse, permissionResponse, storeResponse] =
                await Promise.all(requests);

            setRoles(Array.isArray(roleResponse.data) ? roleResponse.data : []);

            const permissionData = Array.isArray(permissionResponse.data)
                ? permissionResponse.data
                : [];

            const normalizedPermissions = permissionData
                .filter(Boolean)
                .map((p) => ({
                    ...p,
                    active: p.active ?? p.isActive,
                }))
                .filter((p) => p.active !== false);

            setPermissions(normalizedPermissions);

            const storeData = storeResponse.data;
            setStores(
                Array.isArray(storeData)
                    ? storeData
                    : Array.isArray(storeData?.content)
                        ? storeData.content
                        : []
            );

            if (storeFailed) {
                setStoreLoadError(storeFailureMessage);
                toast.error(storeFailureMessage);
            }
        } catch (requestError) {
            toast.error(
                getErrorMessage(
                    requestError,
                    "Unable to load role management data."
                )
            );
        } finally {
            if (showSpinner) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (
            formOpen &&
            !editingRole &&
            !isSuperAdmin &&
            form.scope === "STORE" &&
            stores.length === 1 &&
            !form.storeId
        ) {
            setForm((prev) => ({
                ...prev,
                storeId: String(stores[0].id),
            }));
        }
    }, [formOpen, editingRole, isSuperAdmin, form.scope, form.storeId, stores]);

    useEffect(() => {
        if (!formOpen || form.scope !== "STORE" || !form.storeId) {
            setDelegatedPermissions([]);
            return;
        }

        let cancelled = false;
        api.get(`/access-control/stores/${form.storeId}/delegated-permissions`)
            .then((response) => {
                if (!cancelled) {
                    const data = Array.isArray(response.data) ? response.data : [];
                    setDelegatedPermissions(
                        data
                            .filter(Boolean)
                            .map((p) => ({
                                ...p,
                                active: p.active ?? p.isActive,
                            }))
                            .filter((p) => p.active !== false)
                    );
                }
            })
            .catch((requestError) => {
                if (!cancelled) {
                    setDelegatedPermissions([]);
                    const msg = getErrorMessage(
                        requestError,
                        "Unable to load store permissions."
                    );
                    setFormError(msg);
                    toast.error(msg);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [formOpen, form.scope, form.storeId]);

    const storeName = useCallback(
        (storeId) => {
            const store = stores.find((s) => String(s.id) === String(storeId));
            return store?.storeName || `Store #${storeId}`;
        },
        [stores]
    );

    const filteredRoles = useMemo(() => {
        const query = search.trim().toLowerCase();
        return roles.filter((role) => {
            const matchesSearch =
                !query ||
                role.name?.toLowerCase().includes(query) ||
                role.scope?.toLowerCase().includes(query) ||
                role.permissions?.some((c) => c.toLowerCase().includes(query));

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && role.active) ||
                (statusFilter === "INACTIVE" && !role.active);

            return matchesSearch && matchesStatus;
        });
    }, [roles, search, statusFilter]);

    const availablePermissions = useMemo(() => {
        return form.scope === "STORE"
            ? (form.storeId ? delegatedPermissions : [])
            : permissions;
    }, [form.scope, form.storeId, delegatedPermissions, permissions]);

    const groupedPermissions = useMemo(() => {
        const query = permSearch.trim().toLowerCase();
        const filtered = availablePermissions.filter((p) => {
            return (
                !query ||
                p.code?.toLowerCase().includes(query) ||
                p.module?.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query)
            );
        });

        return filtered.reduce((groups, permission) => {
            const module = permission.module || "Other";
            if (!groups[module]) groups[module] = [];
            groups[module].push(permission);
            return groups;
        }, {});
    }, [availablePermissions, permSearch]);

    const consolidatedReferenceRoles = useMemo(() => {
        const query = leftRoleSearch.trim().toLowerCase();
        const map = new Map();

        roles.forEach((r) => {
            const normalizedName = (r.name || "").trim().toLowerCase();
            if (!normalizedName) return;

            if (!map.has(normalizedName)) {
                map.set(normalizedName, {
                    key: normalizedName,
                    name: r.name,
                    scope: r.scope,
                    stores: [],
                    permissions: r.permissions || [],
                });
            }

            const item = map.get(normalizedName);
            if (r.scope === "STORE" && r.storeId) {
                const sName = storeName(r.storeId);
                if (sName && !item.stores.includes(sName)) {
                    item.stores.push(sName);
                }
            } else if (r.scope === "SYSTEM" && !item.stores.includes("Platform Global")) {
                item.stores.push("Platform Global");
            }

            if ((r.permissions?.length || 0) > item.permissions.length) {
                item.permissions = r.permissions;
            }
        });

        const list = Array.from(map.values());
        return list.filter((r) => {
            return (
                !query ||
                r.name?.toLowerCase().includes(query) ||
                r.scope?.toLowerCase().includes(query) ||
                r.stores.some((s) => s.toLowerCase().includes(query))
            );
        });
    }, [roles, leftRoleSearch, storeName]);

    const activeCount = roles.filter((r) => r.active).length;
    const inactiveCount = roles.length - activeCount;

    const openCreate = () => {
        setEditingRole(null);
        const defaultStoreId = !isSuperAdmin
            ? (stores.length === 1
                ? String(stores[0].id)
                : stores.some((s) => String(s.id) === String(currentUser?.storeId))
                    ? String(currentUser.storeId)
                    : "")
            : "";
        setForm({
            ...emptyForm,
            scope: isSuperAdmin ? "SYSTEM" : "STORE",
            storeId: defaultStoreId,
        });
        setFormError("");
        setSelectedRefRoleName(null);
        setLeftRoleSearch("");
        setPermSearch("");
        setDrawerExpanded(false);
        setFormOpen(true);
    };

    const openEdit = (role) => {
        setEditingRole(role);
        setForm({
            name: role.name || "",
            scope: role.scope,
            storeId: role.storeId ? String(role.storeId) : "",
            permissions: role.permissions || [],
        });
        setFormError("");
        setSelectedRefRoleName((role.name || "").trim().toLowerCase());
        setLeftRoleSearch("");
        setPermSearch("");
        setDrawerExpanded(false);
        setFormOpen(true);
    };

    const closeForm = () => {
        if (saving) return;
        setFormOpen(false);
        setDrawerExpanded(false);
        setEditingRole(null);
        setForm(emptyForm);
    };

    const updateField = (field, value) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const togglePermission = (code) => {
        setForm((prev) => {
            const selected = prev.permissions.includes(code);
            return {
                ...prev,
                permissions: selected
                    ? prev.permissions.filter((item) => item !== code)
                    : [...prev.permissions, code],
            };
        });
    };

    const toggleModuleAll = (modulePermissions) => {
        const moduleCodes = modulePermissions.map((p) => p.code);
        const allSelected = moduleCodes.every((code) =>
            form.permissions.includes(code)
        );

        setForm((prev) => {
            if (allSelected) {
                return {
                    ...prev,
                    permissions: prev.permissions.filter(
                        (c) => !moduleCodes.includes(c)
                    ),
                };
            }
            return {
                ...prev,
                permissions: Array.from(
                    new Set([...prev.permissions, ...moduleCodes])
                ),
            };
        });
    };

    const selectAllPermissions = () => {
        const allCodes = availablePermissions.map((p) => p.code);
        setForm((prev) => ({
            ...prev,
            permissions: Array.from(new Set([...prev.permissions, ...allCodes])),
        }));
        toast.success(`Selected all ${allCodes.length} permissions.`);
    };

    const clearAllPermissions = () => {
        setForm((prev) => ({ ...prev, permissions: [] }));
        toast("Cleared all permissions.", { icon: "🧹" });
    };

    const copyPermissionsFromRole = (role) => {
        if (!role.permissions || !role.permissions.length) {
            toast("This role template has no permissions.", { icon: "ℹ️" });
            return;
        }

        const validCodes = availablePermissions.map((p) => p.code);
        const applicable = role.permissions.filter((c) => validCodes.includes(c));

        setSelectedRefRoleName(role.key || (role.name || "").trim().toLowerCase());
        setForm((prev) => ({
            ...prev,
            permissions: applicable.length ? applicable : [...role.permissions],
        }));

        toast.success(
            `Loaded ${applicable.length || role.permissions.length} permissions from ${toTitleCase(role.name)}`
        );
    };

    const saveRole = async (event) => {
        event.preventDefault();
        setFormError("");

        if (!form.name.trim()) {
            const msg = "Enter a role name.";
            setFormError(msg);
            toast.error(msg);
            return;
        }

        if (form.scope === "STORE" && !form.storeId) {
            const msg = "Select a store for this role.";
            setFormError(msg);
            toast.error(msg);
            return;
        }

        if (
            form.scope === "STORE" &&
            !isSuperAdmin &&
            !stores.some((s) => String(s.id) === String(form.storeId))
        ) {
            const msg = "Select an authorized store for this role.";
            setFormError(msg);
            toast.error(msg);
            return;
        }

        const payload = {
            name: form.name.trim(),
            scope: form.scope,
            storeId: form.scope === "STORE" ? Number(form.storeId) : null,
            permissions: form.permissions,
        };

        setSaving(true);

        try {
            if (editingRole) {
                await api.put(`/access-control/roles/${editingRole.id}`, payload);
            } else {
                await api.post("/access-control/roles", payload);
            }

            setFormOpen(false);
            setDrawerExpanded(false);
            setEditingRole(null);
            setForm(emptyForm);

            const successMsg = editingRole
                ? "Role updated successfully."
                : "Role created successfully.";
            toast.success(successMsg);

            await loadData(false);
        } catch (requestError) {
            const errorMsg = getErrorMessage(
                requestError,
                "Unable to save this role."
            );
            setFormError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const changeRoleStatus = async (role) => {
        const action = role.active ? "deactivate" : "activate";
        const nextStatus = !role.active;

        const confirmed = window.confirm(
            `${role.active ? "Deactivate" : "Activate"} the role "${role.name}"?`
        );
        if (!confirmed) return;

        setRoles((prev) =>
            prev.map((item) =>
                item.id === role.id ? { ...item, active: nextStatus } : item
            )
        );

        try {
            await api.put(`/access-control/roles/${role.id}/${action}`);
            const successMsg = `Role ${toTitleCase(role.name)} ${nextStatus ? "activated" : "deactivated"} successfully.`;
            toast.success(successMsg);
            await loadData(false);
        } catch (requestError) {
            setRoles((prev) =>
                prev.map((item) =>
                    item.id === role.id ? { ...item, active: role.active } : item
                )
            );
            toast.error(
                getErrorMessage(requestError, "Unable to update role status.")
            );
        }
    };

    if (!canViewRoles) {
        return (
            <div className="max-w-md mx-auto my-12 p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <LockKeyhole size={24} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Access restricted</h2>
                <p className="text-sm text-slate-500 mt-1">
                    You do not have access to configurable role management.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 py-6 font-sans text-slate-800 antialiased">
            {/* TOP HEADER: LEFT HEADING + PILL KPI CARDS + CREATE ROLE BUTTON */}
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                <div className="shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                        <ShieldCheck size={14} className="text-blue-600" />
                        <span>Administration</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Roles & Permissions
                    </h1>
                </div>

                {/* KPI CARDS IN PILL SHAPED */}
                <div className="flex flex-wrap items-center gap-3">
                    {[
                        { label: "Total roles", value: roles.length, icon: Shield, bgClass: "bg-emerald-600" },
                        { label: "Active roles", value: activeCount, icon: ShieldCheck, bgClass: "bg-indigo-600" },
                        { label: "Inactive roles", value: inactiveCount, icon: LockKeyhole, bgClass: "bg-orange-500" },
                        { label: "Available permissions", value: permissions.length, icon: Check, bgClass: "bg-blue-600" },
                    ].map((item) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={item.label}
                                className="flex items-center gap-3 bg-white border border-slate-200/90 rounded-full px-3.5 py-1.5 shadow-xs hover:shadow-sm transition-all"
                            >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${item.bgClass}`}>
                                    <Icon size={16} strokeWidth={2.2} />
                                </div>
                                <div className="flex flex-col pr-1">
                                    <span className="text-base font-bold text-slate-900 leading-tight">
                                        {item.value}
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap leading-tight">
                                        {item.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CREATE ROLE BUTTON */}
                {canCreateRole && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            className="create-role-btn"
                            onClick={openCreate}
                        >
                            <Plus size={16} />
                            <span>Create role</span>
                        </button>
                    </div>
                )}
            </header>

            {/* CONFIGURED ROLES SECTION */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 tracking-tight">
                            Configured roles
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Manage role definitions and their permission sets.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="relative">
                            <Search
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                            <input
                                aria-label="Search roles"
                                placeholder="Search roles..."
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="h-9 w-52 sm:w-60 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-all"
                            />
                        </div>

                        <select
                            aria-label="Filter by status"
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer transition-all"
                        >
                            <option value="ALL">All statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>

                        <button
                            type="button"
                            title="Refresh roles"
                            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border-0 bg-white text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                            onClick={() => loadData(true)}
                            disabled={loading}
                        >
                            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-14 text-center text-slate-500">
                        <LoaderCircle
                            size={24}
                            className="animate-spin mx-auto mb-2 text-blue-600"
                        />
                        <span className="text-sm">Loading roles...</span>
                    </div>
                ) : filteredRoles.length === 0 ? (
                    <div className="py-14 text-center text-slate-500 border-t border-slate-200">
                        <Shield size={32} className="mx-auto mb-3 text-slate-300" />
                        <div className="text-slate-800 font-semibold text-sm mb-1">
                            No roles found
                        </div>
                        <p className="text-xs text-slate-500">
                            Create a role or change your search filters.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-slate-200 text-left min-w-[720px]">
                            <thead>
                                <tr>
                                    {["Role", "Scope", "Permissions", "Status", "Actions"].map((heading) => (
                                        <th
                                            key={heading}
                                            className="border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-xs font-semibold text-slate-700"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRoles.map((role) => (
                                    <tr key={role.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="border border-slate-200 px-4 py-3 text-xs align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                                    <ShieldCheck size={16} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900 text-sm">
                                                        {toTitleCase(role.name)}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {role.scope === "STORE" ? "Store Role" : "Global Role"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="border border-slate-200 px-4 py-3 text-xs align-middle">
                                            {role.scope === "STORE" ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100/80 text-slate-700 border border-slate-200/80">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                                    <span>{toTitleCase(storeName(role.storeId))}</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                                    <span>Platform Global</span>
                                                </span>
                                            )}
                                        </td>

                                        <td className="border border-slate-200 px-4 py-3 text-xs align-middle">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                                                {role.permissions?.length || 0} permissions
                                            </span>
                                        </td>

                                        <td className="border border-slate-200 px-4 py-3 text-xs align-middle">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                    role.active
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                                }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        role.active ? "bg-emerald-500" : "bg-slate-400"
                                                    }`}
                                                />
                                                {role.active ? "Active" : "Inactive"}
                                            </span>
                                        </td>

                                        <td className="border border-slate-200 px-4 py-3 text-xs align-middle">
                                            {canUpdateRole ? (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        title="Edit role"
                                                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg border-0 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-xs cursor-pointer"
                                                        onClick={() => openEdit(role)}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title={role.active ? "Deactivate role" : "Activate role"}
                                                        className={`w-8 h-8 inline-flex items-center justify-center rounded-lg border-0 bg-white transition-colors shadow-xs cursor-pointer ${
                                                            role.active
                                                                ? "text-red-600 hover:bg-red-50"
                                                                : "text-emerald-600 hover:bg-emerald-50"
                                                        }`}
                                                        onClick={() => changeRoleStatus(role)}
                                                    >
                                                        <Power size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">View only</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="border-t border-slate-200 px-4 py-3 bg-slate-50/50 text-xs text-slate-500">
                    Showing {filteredRoles.length} of {roles.length} roles
                </div>
            </section>

            {/* EXPANDABLE ROLE DRAWER */}
            {formOpen && (
                <div
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeForm();
                    }}
                    className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end"
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="role-form-title"
                        className={`w-full ${
                            drawerExpanded ? "max-w-7xl" : "max-w-2xl"
                        } h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 transition-all duration-300`}
                    >
                        {/* DRAWER HEADER */}
                        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                {drawerExpanded && (
                                    <button
                                        type="button"
                                        title="Back to compact view"
                                        onClick={() => setDrawerExpanded(false)}
                                        className="w-8 h-8 rounded-lg border-0 bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                )}
                                <div>
                                    <h2
                                        id="role-form-title"
                                        className="text-lg font-bold text-slate-900"
                                    >
                                        {editingRole ? "Edit Role" : "Create Role"}
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {drawerExpanded
                                            ? "Review role settings and assign module permissions."
                                            : "Configure role name, scope, and permissions."}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {drawerExpanded && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                        {form.permissions.length} / {availablePermissions.length} selected
                                    </span>
                                )}

                                <button
                                    type="button"
                                    aria-label="Close"
                                    onClick={closeForm}
                                    className="w-8 h-8 rounded-lg border-0 bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </header>

                        <form
                            onSubmit={saveRole}
                            className="flex flex-col flex-1 min-h-0"
                        >
                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
                                {formError && (
                                    <div
                                        role="alert"
                                        className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
                                    >
                                        <AlertCircle size={15} className="shrink-0" />
                                        <span>{formError}</span>
                                    </div>
                                )}

                                {/* PRIOR DATA CARD (ROLE NAME, ROLE SCOPE, STORE, ASSIGN PERMISSIONS) */}
                                <div className="p-4 sm:p-5 bg-white rounded-2xl space-y-3">
                                    <div className={`grid grid-cols-1 ${drawerExpanded ? "sm:grid-cols-2 lg:grid-cols-3 gap-3" : "sm:grid-cols-2 gap-4"}`}>
                                        {/* 1. Role Name */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Role Name
                                            </label>
                                            <input
                                                required
                                                maxLength={100}
                                                value={form.name}
                                                onChange={(e) => updateField("name", e.target.value)}
                                                placeholder="Example: Commerce Manager"
                                                className={`w-full ${drawerExpanded ? "h-9 text-xs px-3" : "h-9.5 text-xs px-3.5"} bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors`}
                                            />
                                        </div>

                                        {/* 2. Role Scope */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Role Scope
                                            </label>
                                            <select
                                                value={form.scope}
                                                disabled={Boolean(editingRole) || !isSuperAdmin}
                                                onChange={(e) => {
                                                    const nextScope = e.target.value;
                                                    updateField("scope", nextScope);
                                                    updateField(
                                                        "storeId",
                                                        nextScope === "STORE" && !isSuperAdmin && stores.length === 1
                                                            ? String(stores[0].id)
                                                            : ""
                                                    );
                                                }}
                                                className={`w-full ${drawerExpanded ? "h-9 text-xs px-3" : "h-9.5 text-xs px-3.5"} bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-slate-400 transition-colors disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer`}
                                            >
                                                {isSuperAdmin && <option value="SYSTEM">SYSTEM</option>}
                                                <option value="STORE">STORE</option>
                                            </select>
                                        </div>

                                        {/* 3. Store (Beside Scope if STORE) */}
                                        {form.scope === "STORE" ? (
                                            <div className={drawerExpanded ? "" : "sm:col-span-2"}>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                    Store
                                                </label>
                                                <select
                                                    required
                                                    value={form.storeId}
                                                    disabled={Boolean(editingRole) || (!isSuperAdmin && stores.length <= 1)}
                                                    onChange={(e) => updateField("storeId", e.target.value)}
                                                    className={`w-full ${drawerExpanded ? "h-9 text-xs px-3" : "h-9.5 text-xs px-3.5"} bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-slate-400 transition-colors disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer`}
                                                >
                                                    <option value="">{storeLoadError ? "Failed to load stores" : "Select store"}</option>
                                                    {stores.map((s) => (
                                                        <option key={s.id} value={String(s.id)}>
                                                            {s.storeName || `Store #${s.id}`}
                                                        </option>
                                                    ))}
                                                </select>
                                                {storeLoadError && (
                                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                                        <AlertCircle size={12} className="shrink-0" />
                                                        {storeLoadError}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            drawerExpanded && (
                                                <div className="flex items-center text-xs text-slate-500 pt-5">
                                                    <span>Global System scope (All Stores)</span>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {/* COMPACT PERMISSION BAR (WHEN NOT EXPANDED) */}
                                    {!drawerExpanded && (
                                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <span className="text-sm font-bold text-slate-900 block">
                                                    {form.permissions.length} Permissions Assigned
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {form.permissions.length === 0
                                                        ? "No permissions assigned yet. Click to configure access."
                                                        : "Click to widen and configure module permissions."}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                className="create-role-btn shrink-0"
                                                onClick={() => {
                                                    if (form.scope === "STORE" && !form.storeId) {
                                                        toast.error("Please select a store first.");
                                                        return;
                                                    }
                                                    setDrawerExpanded(true);
                                                }}
                                            >
                                                <SlidersHorizontal size={15} />
                                                <span>Assign permissions</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* WIDENED PERMISSIONS TWO-COLUMN VIEW (INSIDE THE DRAWER) */}
                                {drawerExpanded && (
                                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white flex flex-col md:flex-row min-h-[500px]">
                                        {/* LEFT COLUMN: REFERENCE ROLES */}
                                        <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 flex flex-col shrink-0">
                                            <div className="p-3 border-b border-slate-200 bg-white">
                                                <div className="relative">
                                                    <Search
                                                        size={14}
                                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Find a role template..."
                                                        value={leftRoleSearch}
                                                        onChange={(e) => setLeftRoleSearch(e.target.value)}
                                                        className="w-full h-8 pl-8 pr-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                                                    />
                                                </div>
                                                <span className="text-[11px] text-slate-400 block mt-1.5">
                                                    Click to copy role template
                                                </span>
                                            </div>

                                            <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5 max-h-[460px]">
                                                {consolidatedReferenceRoles.length === 0 ? (
                                                    <div className="p-4 text-center text-xs text-slate-400">
                                                        No matching roles
                                                    </div>
                                                ) : (
                                                    consolidatedReferenceRoles.map((r) => {
                                                        const count = r.permissions?.length || 0;
                                                        const isSelected = selectedRefRoleName === r.key;
                                                        const pct = Math.min(
                                                            100,
                                                            Math.round(
                                                                (count /
                                                                    Math.max(1, availablePermissions.length)) *
                                                                    100
                                                            )
                                                        );

                                                        return (
                                                            <div
                                                                key={r.key}
                                                                onClick={() => copyPermissionsFromRole(r)}
                                                                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2.5 group ${
                                                                    isSelected
                                                                        ? "bg-white border-blue-300 shadow-xs"
                                                                        : "bg-transparent border-transparent hover:bg-white hover:border-slate-200 hover:shadow-xs"
                                                                }`}
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="font-bold text-sm text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                                                        {toTitleCase(r.name)}
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                                                        {r.stores.length > 1
                                                                            ? `In ${r.stores.length} stores`
                                                                            : r.stores[0] || (r.scope === "SYSTEM" ? "Global" : "Store Role")}
                                                                        {" • "}
                                                                        <span className="font-medium text-slate-600">{count} perms</span>
                                                                    </div>
                                                                </div>

                                                                <div className="w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden shrink-0">
                                                                    <div
                                                                        className="bg-blue-600 h-full rounded-full transition-all"
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </aside>

                                        {/* RIGHT COLUMN: MODULE CARDS & ACTION PILLS */}
                                        <div className="flex-1 flex flex-col min-h-0 bg-white">
                                            {/* Filter & Quick Actions */}
                                            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
                                                <div className="relative w-56">
                                                    <Search
                                                        size={13}
                                                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Filter permissions..."
                                                        value={permSearch}
                                                        onChange={(e) => setPermSearch(e.target.value)}
                                                        className="w-full h-8 pl-7 pr-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                                                    />
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={selectAllPermissions}
                                                        className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border-0 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                                                    >
                                                        <Check size={12} strokeWidth={2.5} />
                                                        <span>Select all</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={clearAllPermissions}
                                                        className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors border-0 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                                                    >
                                                        <X size={12} strokeWidth={2.5} />
                                                        <span>Clear all</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 2-Column Module Cards Grid */}
                                            <div className="flex-1 overflow-y-auto no-scrollbar p-4 max-h-[460px]">
                                                {Object.keys(groupedPermissions).length === 0 ? (
                                                    <div className="py-12 text-center text-slate-400 text-xs">
                                                        No permissions match your filter.
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                        {Object.entries(groupedPermissions).map(
                                                            ([module, modulePermissions]) => {
                                                                const selectedCount = modulePermissions.filter((p) =>
                                                                    form.permissions.includes(p.code)
                                                                ).length;
                                                                const isAll =
                                                                    modulePermissions.length > 0 &&
                                                                    selectedCount === modulePermissions.length;
                                                                const isPartial =
                                                                    selectedCount > 0 && !isAll;

                                                                return (
                                                                    <div
                                                                        key={module}
                                                                        className={`bg-white rounded-2xl border p-3.5 transition-all flex flex-col justify-between ${
                                                                            isAll
                                                                                ? "border-blue-300 ring-1 ring-blue-500/10 shadow-xs"
                                                                                : "border-slate-200 hover:border-slate-300 shadow-xs"
                                                                        }`}
                                                                    >
                                                                        {/* Card header */}
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isAll}
                                                                                    ref={(el) => {
                                                                                        if (el) el.indeterminate = isPartial;
                                                                                    }}
                                                                                    onChange={() =>
                                                                                        toggleModuleAll(modulePermissions)
                                                                                    }
                                                                                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                                                                                />
                                                                                <span className="font-bold text-xs text-slate-900 lowercase">
                                                                                    {module}
                                                                                </span>
                                                                            </label>

                                                                            <span className="text-xs font-semibold text-slate-400">
                                                                                {selectedCount}/{modulePermissions.length}
                                                                            </span>
                                                                        </div>

                                                                        {/* Action Pills */}
                                                                        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                                                                            {modulePermissions.map((permission) => {
                                                                                const isSelected = form.permissions.includes(
                                                                                    permission.code
                                                                                );
                                                                                const label = formatPermissionAction(
                                                                                    permission.code
                                                                                );

                                                                                return (
                                                                                    <button
                                                                                        key={permission.code}
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            togglePermission(permission.code)
                                                                                        }
                                                                                        title={`${permission.code}: ${
                                                                                            permission.description || ""
                                                                                        }`}
                                                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer transition-all ${
                                                                                            isSelected
                                                                                                ? "bg-blue-600 text-white shadow-xs hover:bg-blue-700"
                                                                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                                                                                        }`}
                                                                                    >
                                                                                        {isSelected && (
                                                                                            <Check size={11} strokeWidth={2.8} />
                                                                                        )}
                                                                                        <span>{label}</span>
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* DRAWER FOOTER: BUTTONS WITHOUT HARSH BLACK BORDERS */}
                            <footer className="border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 bg-white shrink-0">
                                <button
                                    type="button"
                                    onClick={closeForm}
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
                                            : editingRole
                                                ? "Save changes"
                                                : "Create role"}
                                    </span>
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}

            {/* BUTTON & UTILITY CSS: CLEAN NEUMORPHIC PILL STYLING WITHOUT BLACK BORDERS & HIDDEN SCROLLBARS */}
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                .no-scrollbar {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
                }

                .create-role-btn {
                    min-width: 9.5em;
                    padding: 0 1.3em;
                    height: 3em;
                    border-radius: 30em;
                    font-size: 14px;
                    font-family: inherit;
                    border: none !important;
                    outline: none !important;
                    position: relative;
                    overflow: hidden;
                    z-index: 1;
                    box-shadow: 6px 6px 12px #c5c5c5,
                                -6px -6px 12px #ffffff;
                    background: #ffffff;
                    color: #002d74;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: color 0.4s ease, box-shadow 0.3s ease;
                    white-space: nowrap;
                }

                .create-role-btn::before {
                    content: '';
                    width: 0;
                    height: 3em;
                    border-radius: 30em;
                    position: absolute;
                    top: 0;
                    left: 0;
                    background-image: linear-gradient(to right, #002d74 0%, #2563eb 100%);
                    transition: width 0.5s ease;
                    display: block;
                    z-index: -1;
                }

                .create-role-btn:hover::before {
                    width: 100%;
                }

                .create-role-btn:hover {
                    color: #ffffff;
                    box-shadow: 4px 4px 10px #b0c4de, -4px -4px 10px #ffffff;
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
            `}</style>
        </div>
    );
}

export default RoleManagementPage;
