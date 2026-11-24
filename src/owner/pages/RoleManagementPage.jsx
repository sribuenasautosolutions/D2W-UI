
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
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../auth/AuthContext";

const COLORS = {
    ink: "#172B42",
    muted: "#64748B",
    primary: "#245BDB",
    primarySoft: "#EFF4FF",
    border: "#E2E8F0",
    borderSoft: "#EDF1F5",
    surface: "#FFFFFF",
    canvas: "#F7F9FC",
    success: "#15803D",
    successSoft: "#F0FDF4",
    danger: "#B42318",
    dangerSoft: "#FEF3F2",
};

const emptyForm = {
    name: "",
    scope: "STORE",
    storeId: "",
    permissions: [],
};

const styles = {
    page: {
        maxWidth: 1440,
        margin: "0 auto",
        color: COLORS.ink,
        fontFamily: "var(--app-font)",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 24,
    },
    title: {
        fontSize: 25,
        fontWeight: 700,
        letterSpacing: "-0.5px",
    },
    subtitle: {
        color: COLORS.muted,
        fontSize: 13,
        marginTop: 5,
    },
    button: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 38,
        padding: "0 14px",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        background: "#fff",
        color: COLORS.ink,
        fontWeight: 600,
        cursor: "pointer",
    },
    primaryButton: {
        background: COLORS.primary,
        borderColor: COLORS.primary,
        color: "#fff",
    },
    panel: {
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
    },
    input: {
        width: "100%",
        minHeight: 40,
        padding: "8px 11px",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 7,
        background: "#fff",
        color: COLORS.ink,
        outlineOffset: 1,
    },
    label: {
        display: "block",
        fontSize: 12,
        fontWeight: 650,
        color: "#475569",
        marginBottom: 7,
    },
    tableHead: {
        background: "#F8FAFC",
        color: COLORS.muted,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.45px",
    },
    tableCell: {
        padding: "14px 16px",
        borderTop: `1px solid ${COLORS.borderSoft}`,
        verticalAlign: "middle",
    },
};

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

    // Use proper RBAC permission checks for authorization
    // hasGlobalStoreManagementAuthority checks for STORES.UPDATE permission which indicates platform admin
    const canViewRoles = hasGlobalStoreManagementAuthority() || hasAnyPermission?.(["ROLES.VIEW", "PERMISSIONS.VIEW"]);
    const canCreateRole = hasGlobalStoreManagementAuthority() || hasPermission?.("ROLES.CREATE");
    const canUpdateRole = hasGlobalStoreManagementAuthority() || hasPermission?.("ROLES.UPDATE");

    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [delegatedPermissions, setDelegatedPermissions] = useState([]);
    const [stores, setStores] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [storeLoadError, setStoreLoadError] = useState("");
    const [success, setSuccess] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [formOpen, setFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [permissionSearch, setPermissionSearch] = useState("");
    const [formError, setFormError] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");
        setStoreLoadError("");

        try {
            let storeFailed = false;
            let storeFailureMessage = "";
            const requests = [
                api.get("/access-control/roles"),
                api.get("/access-control/permissions"),
                api.get("/access-control/stores").catch((storeRequestError) => {
                    console.error("Failed to load stores:", storeRequestError);
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

            setRoles(
                Array.isArray(roleResponse.data)
                    ? roleResponse.data
                    : []
            );

            const permissionData = Array.isArray(permissionResponse.data)
                ? permissionResponse.data
                : [];

            // /access-control/permissions returns PermissionDefinition entities
            // (isActive), while /permissions returns PermissionResponseDTO (active).
            // Normalize both shapes so the page has one consistent permission model.
            const normalizedPermissions = permissionData
                .filter(Boolean)
                .map((permission) => ({
                    ...permission,
                    active: permission.active ?? permission.isActive,
                }))
                .filter((permission) => permission.active !== false);

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
                setError(storeFailureMessage);
            }
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError,
                    "Unable to load role management data."
                )
            );
        } finally {
            setLoading(false);
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
            setForm((previous) => ({
                ...previous,
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
                            .map((permission) => ({
                                ...permission,
                                active: permission.active ?? permission.isActive,
                            }))
                            .filter((permission) => permission.active !== false)
                    );
                }
            })
            .catch((requestError) => {
                if (!cancelled) {
                    setDelegatedPermissions([]);
                    setFormError(
                        getErrorMessage(
                            requestError,
                            "Unable to load delegated permissions for this store."
                        )
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [formOpen, form.scope, form.storeId]);

    const storeName = useCallback(
        (storeId) => {
            const store = stores.find(
                (item) => String(item.id) === String(storeId)
            );

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
                role.permissions?.some((code) =>
                    code.toLowerCase().includes(query)
                );

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && role.active) ||
                (statusFilter === "INACTIVE" && !role.active);

            return matchesSearch && matchesStatus;
        });
    }, [roles, search, statusFilter]);

    const groupedPermissions = useMemo(() => {
        const query = permissionSearch.trim().toLowerCase();
        const sourcePermissions =
            form.scope === "STORE"
                ? (form.storeId ? delegatedPermissions : [])
                : permissions;

        const filtered = sourcePermissions.filter((permission) => {
            return (
                !query ||
                permission.code?.toLowerCase().includes(query) ||
                permission.module?.toLowerCase().includes(query) ||
                permission.description?.toLowerCase().includes(query)
            );
        });

        return filtered.reduce((groups, permission) => {
            const module = permission.module || "Other";

            if (!groups[module]) groups[module] = [];
            groups[module].push(permission);

            return groups;
        }, {});
    }, [permissions, delegatedPermissions, form.scope, form.storeId, permissionSearch]);

    const activeCount = roles.filter((role) => role.active).length;
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
        setPermissionSearch("");
        setFormError("");
        setError("");
        setSuccess("");
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
        setPermissionSearch("");
        setFormError("");
        setError("");
        setSuccess("");
        setFormOpen(true);
    };

    const closeForm = () => {
        if (saving) return;
        setFormOpen(false);
        setEditingRole(null);
        setForm(emptyForm);
    };

    const updateField = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const togglePermission = (code) => {
        setForm((previous) => {
            const selected = previous.permissions.includes(code);

            return {
                ...previous,
                permissions: selected
                    ? previous.permissions.filter((item) => item !== code)
                    : [...previous.permissions, code],
            };
        });
    };

    const saveRole = async (event) => {
        event.preventDefault();
        setFormError("");
        setSuccess("");

        if (!form.name.trim()) {
            setFormError("Enter a role name.");
            return;
        }

        if (form.scope === "STORE" && !form.storeId) {
            setFormError("Select a store for this role.");
            return;
        }

        if (
            form.scope === "STORE" &&
            !isSuperAdmin &&
            !stores.some((store) => String(store.id) === String(form.storeId))
        ) {
            setFormError("Select an authorized store for this role.");
            return;
        }

        const payload = {
            name: form.name.trim(),
            scope: form.scope,
            storeId:
                form.scope === "STORE"
                    ? Number(form.storeId)
                    : null,
            permissions: form.permissions,
        };

        setSaving(true);

        try {
            if (editingRole) {
                await api.put(
                    `/access-control/roles/${editingRole.id}`,
                    payload
                );
            } else {
                await api.post("/access-control/roles", payload);
            }

            setFormOpen(false);
            setEditingRole(null);
            setForm(emptyForm);

            setSuccess(
                editingRole
                    ? "Role updated successfully."
                    : "Role created successfully."
            );

            await loadData();
        } catch (requestError) {
            setFormError(
                getErrorMessage(
                    requestError,
                    "Unable to save this role."
                )
            );
        } finally {
            setSaving(false);
        }
    };

    const changeRoleStatus = async (role) => {
        const action = role.active ? "deactivate" : "activate";

        const confirmed = window.confirm(
            `${role.active ? "Deactivate" : "Activate"} the role "${role.name}"?`
        );

        if (!confirmed) return;

        setError("");
        setSuccess("");

        try {
            await api.put(
                `/access-control/roles/${role.id}/${action}`
            );

            setSuccess(
                `Role ${role.active ? "deactivated" : "activated"} successfully.`
            );

            await loadData();
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError,
                    "Unable to update role status."
                )
            );
        }
    };

    if (!canViewRoles) {
        return (
            <div style={{ ...styles.panel, padding: 32, textAlign: "center" }}>
                <LockKeyhole size={30} color={COLORS.muted} />
                <h2 style={{ marginTop: 12, fontSize: 18 }}>
                    Access restricted
                </h2>
                <p style={{ color: COLORS.muted, marginTop: 6 }}>
                    You do not have access to configurable role management.
                </p>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <div>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: COLORS.muted,
                        fontSize: 12,
                        marginBottom: 7,
                    }}>
                        <ShieldCheck size={15} />
                        Administration / Access control
                    </div>

                    <h1 style={styles.title}>Roles & permissions</h1>

                    <p style={styles.subtitle}>
                        Define employee access by assigning permissions to roles.
                    </p>
                </div>

                {canCreateRole && (
                    <button
                        type="button"
                        style={{ ...styles.button, ...styles.primaryButton }}
                        onClick={openCreate}
                    >
                        <Plus size={17} />
                        Create role
                    </button>
                )}
            </header>

            {error && (
                <div role="alert" style={{
                    padding: 12,
                    marginBottom: 16,
                    border: `1px solid #FECACA`,
                    background: COLORS.dangerSoft,
                    color: COLORS.danger,
                    borderRadius: 8,
                    display: "flex",
                    gap: 9,
                    alignItems: "center",
                }}>
                    <AlertCircle size={17} />
                    {error}
                </div>
            )}

            {success && (
                <div role="status" style={{
                    padding: 12,
                    marginBottom: 16,
                    border: "1px solid #BBF7D0",
                    background: COLORS.successSoft,
                    color: COLORS.success,
                    borderRadius: 8,
                    display: "flex",
                    gap: 9,
                    alignItems: "center",
                }}>
                    <Check size={17} />
                    {success}
                </div>
            )}

            <section style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: 14,
                marginBottom: 20,
            }}>
                {[
                    {
                        label: "Total roles",
                        value: roles.length,
                        icon: Shield,
                    },
                    {
                        label: "Active roles",
                        value: activeCount,
                        icon: ShieldCheck,
                    },
                    {
                        label: "Inactive roles",
                        value: inactiveCount,
                        icon: LockKeyhole,
                    },
                    {
                        label: "Available permissions",
                        value: permissions.length,
                        icon: Check,
                    },
                ].map((item) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={item.label}
                            style={{
                                ...styles.panel,
                                padding: 17,
                                display: "flex",
                                alignItems: "center",
                                gap: 13,
                            }}
                        >
                            <div style={{
                                width: 39,
                                height: 39,
                                borderRadius: 9,
                                background: COLORS.primarySoft,
                                color: COLORS.primary,
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                            }}>
                                <Icon size={19} />
                            </div>

                            <div>
                                <div style={{
                                    fontSize: 22,
                                    fontWeight: 700,
                                    lineHeight: 1.2,
                                }}>
                                    {item.value}
                                </div>
                                <div style={{
                                    fontSize: 12,
                                    color: COLORS.muted,
                                    marginTop: 3,
                                }}>
                                    {item.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </section>

            <section style={styles.panel}>
                <div style={{
                    padding: 17,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                }}>
                    <div>
                        <h2 style={{ fontSize: 15, fontWeight: 700 }}>
                            Configured roles
                        </h2>
                        <p style={{
                            color: COLORS.muted,
                            fontSize: 12,
                            marginTop: 4,
                        }}>
                            Manage role definitions and their permission sets.
                        </p>
                    </div>

                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        flexWrap: "wrap",
                    }}>
                        <div style={{ position: "relative" }}>
                            <Search
                                size={16}
                                color={COLORS.muted}
                                style={{
                                    position: "absolute",
                                    left: 10,
                                    top: 11,
                                }}
                            />
                            <input
                                aria-label="Search roles"
                                placeholder="Search roles..."
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                style={{
                                    ...styles.input,
                                    width: 220,
                                    paddingLeft: 34,
                                }}
                            />
                        </div>

                        <select
                            aria-label="Filter by status"
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            style={{ ...styles.input, width: 135 }}
                        >
                            <option value="ALL">All statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>

                        <button
                            type="button"
                            title="Refresh roles"
                            style={{ ...styles.button, padding: "0 11px" }}
                            onClick={loadData}
                            disabled={loading}
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{
                        padding: 55,
                        textAlign: "center",
                        color: COLORS.muted,
                    }}>
                        <LoaderCircle
                            size={23}
                            className="rbac-spin"
                            style={{ margin: "0 auto 10px" }}
                        />
                        Loading roles...
                    </div>
                ) : filteredRoles.length === 0 ? (
                    <div style={{
                        padding: 55,
                        textAlign: "center",
                        color: COLORS.muted,
                        borderTop: `1px solid ${COLORS.borderSoft}`,
                    }}>
                        <Shield size={30} style={{ margin: "0 auto 12px" }} />
                        <div style={{
                            color: COLORS.ink,
                            fontWeight: 650,
                            marginBottom: 5,
                        }}>
                            No roles found
                        </div>
                        <p style={{ fontSize: 13 }}>
                            Create a role or change your search filters.
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            minWidth: 720,
                        }}>
                            <thead>
                                <tr style={styles.tableHead}>
                                    {["Role", "Scope", "Permissions", "Status", "Actions"].map((heading) => (
                                        <th
                                            key={heading}
                                            style={{
                                                textAlign: "left",
                                                padding: "12px 16px",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRoles.map((role) => (
                                    <tr key={role.id}>
                                        <td style={styles.tableCell}>
                                            <div style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                            }}>
                                                <div style={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: 8,
                                                    background: COLORS.primarySoft,
                                                    color: COLORS.primary,
                                                    display: "grid",
                                                    placeItems: "center",
                                                    flexShrink: 0,
                                                }}>
                                                    <ShieldCheck size={17} />
                                                </div>
                                                <div>
                                                    <div style={{
                                                        fontWeight: 650,
                                                        fontSize: 13,
                                                    }}>
                                                        {role.name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td style={styles.tableCell}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>
                                                {role.scope === "STORE" ? storeName(role.storeId) : "Platform Global"}
                                            </div>
                                        </td>

                                        <td style={styles.tableCell}>
                                            <span style={{
                                                display: "inline-flex",
                                                padding: "4px 9px",
                                                borderRadius: 20,
                                                background: "#F1F5F9",
                                                color: "#475569",
                                                fontSize: 11,
                                                fontWeight: 650,
                                            }}>
                                                {role.permissions?.length || 0} permissions
                                            </span>
                                        </td>

                                        <td style={styles.tableCell}>
                                            <span style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 6,
                                                fontSize: 12,
                                                fontWeight: 650,
                                                color: role.active
                                                    ? COLORS.success
                                                    : COLORS.muted,
                                            }}>
                                                <span style={{
                                                    width: 7,
                                                    height: 7,
                                                    borderRadius: "50%",
                                                    background: role.active
                                                        ? "#16A34A"
                                                        : "#94A3B8",
                                                }} />
                                                {role.active ? "Active" : "Inactive"}
                                            </span>
                                        </td>

                                        <td style={styles.tableCell}>
                                            {canUpdateRole ? (
                                                <div style={{
                                                    display: "flex",
                                                    gap: 7,
                                                }}>
                                                    <button
                                                        type="button"
                                                        title="Edit role"
                                                        style={{
                                                            ...styles.button,
                                                            minHeight: 33,
                                                            padding: "0 9px",
                                                        }}
                                                        onClick={() => openEdit(role)}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title={role.active ? "Deactivate role" : "Activate role"}
                                                        style={{
                                                            ...styles.button,
                                                            minHeight: 33,
                                                            padding: "0 9px",
                                                            color: role.active
                                                                ? COLORS.danger
                                                                : COLORS.success,
                                                        }}
                                                        onClick={() => changeRoleStatus(role)}
                                                    >
                                                        <Power size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: 12, color: COLORS.muted }}>View only</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{
                    borderTop: `1px solid ${COLORS.borderSoft}`,
                    padding: "12px 16px",
                    color: COLORS.muted,
                    fontSize: 12,
                }}>
                    Showing {filteredRoles.length} of {roles.length} roles
                </div>
            </section>

            {formOpen && (
                <div
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeForm();
                    }}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 1000,
                        background: "rgba(15, 23, 42, 0.38)",
                        display: "flex",
                        justifyContent: "flex-end",
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="role-form-title"
                        style={{
                            width: "min(680px, 100%)",
                            height: "100%",
                            background: "#fff",
                            display: "flex",
                            flexDirection: "column",
                            boxShadow: "-12px 0 40px rgba(15,23,42,0.12)",
                        }}
                    >
                        <header style={{
                            padding: "20px 24px",
                            borderBottom: `1px solid ${COLORS.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}>
                            <div>
                                <h2
                                    id="role-form-title"
                                    style={{ fontSize: 18, fontWeight: 700 }}
                                >
                                    {editingRole ? "Edit role" : "Create role"}
                                </h2>
                                <p style={{
                                    color: COLORS.muted,
                                    fontSize: 12,
                                    marginTop: 4,
                                }}>
                                    Configure the role scope and permissions.
                                </p>
                            </div>

                            <button
                                type="button"
                                aria-label="Close"
                                onClick={closeForm}
                                style={{
                                    ...styles.button,
                                    width: 36,
                                    padding: 0,
                                }}
                            >
                                <X size={17} />
                            </button>
                        </header>

                        <form
                            onSubmit={saveRole}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                flex: 1,
                                minHeight: 0,
                            }}
                        >
                            <div style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: 24,
                            }}>
                                {formError && (
                                    <div role="alert" style={{
                                        padding: 11,
                                        marginBottom: 17,
                                        borderRadius: 7,
                                        color: COLORS.danger,
                                        background: COLORS.dangerSoft,
                                        fontSize: 12,
                                    }}>
                                        {formError}
                                    </div>
                                )}

                                <div style={{ marginBottom: 18 }}>
                                    <label style={styles.label}>Role name</label>
                                    <input
                                        required
                                        maxLength={100}
                                        value={form.name}
                                        onChange={(event) =>
                                            updateField("name", event.target.value)
                                        }
                                        placeholder="Example: Inventory Supervisor"
                                        style={styles.input}
                                    />
                                </div>

                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                    gap: 14,
                                    marginBottom: 22,
                                }}>
                                    <div>
                                        <label style={styles.label}>Role scope</label>
                                        <select
                                            value={form.scope}
                                            disabled={Boolean(editingRole) || !isSuperAdmin}
                                            onChange={(event) => {
                                                const nextScope = event.target.value;
                                                updateField("scope", nextScope);
                                                updateField(
                                                    "storeId",
                                                    nextScope === "STORE" && !isSuperAdmin && stores.length === 1
                                                        ? String(stores[0].id)
                                                        : ""
                                                );
                                            }}
                                            style={styles.input}
                                        >
                                            {isSuperAdmin && (
                                                <option value="SYSTEM">SYSTEM</option>
                                            )}
                                            <option value="STORE">STORE</option>
                                        </select>
                                        {editingRole && (
                                            <p style={{
                                                fontSize: 11,
                                                color: COLORS.muted,
                                                marginTop: 5,
                                            }}>
                                                Role scope cannot be changed after creation.
                                            </p>
                                        )}
                                    </div>

                                    {form.scope === "STORE" && (
                                        <div>
                                            <label style={styles.label}>Store</label>
                                            <select
                                                required
                                                value={form.storeId}
                                                disabled={Boolean(editingRole) || (!isSuperAdmin && stores.length <= 1)}
                                                onChange={(event) =>
                                                    updateField("storeId", event.target.value)
                                                }
                                                style={styles.input}
                                            >
                                                <option value="">
                                                    {!isSuperAdmin && stores.length === 0
                                                        ? "No authorized store assigned"
                                                        : "Select store"}
                                                    {storeLoadError
                                                        ? "Failed to load stores"
                                                        : !isSuperAdmin && stores.length === 0
                                                            ? "No authorized store assigned"
                                                            : "Select store"}
                                                </option>
                                                {stores.map((store) => (
                                                    <option key={store.id} value={String(store.id)}>
                                                        {store.storeName || `Store #${store.id}`}
                                                    </option>
                                                ))}
                                            </select>
                                            {!isSuperAdmin && (
                                                <p style={{
                                                    fontSize: 11,
                                                    color: COLORS.muted,
                                                    marginTop: 5,
                                                }}>
                                                    Store context comes from your assigned access.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    marginBottom: 12,
                                }}>
                                    <div>
                                        <h3 style={{ fontSize: 14, fontWeight: 700 }}>
                                            Permissions
                                        </h3>
                                        <p style={{
                                            fontSize: 11,
                                            color: COLORS.muted,
                                            marginTop: 3,
                                        }}>
                                            {form.permissions.length} selected
                                        </p>
                                    </div>

                                    <div style={{ position: "relative", width: 210 }}>
                                        <Search
                                            size={15}
                                            color={COLORS.muted}
                                            style={{
                                                position: "absolute",
                                                left: 9,
                                                top: 10,
                                            }}
                                        />
                                        <input
                                            aria-label="Search permissions"
                                            value={permissionSearch}
                                            onChange={(event) =>
                                                setPermissionSearch(event.target.value)
                                            }
                                            placeholder="Search permissions"
                                            style={{
                                                ...styles.input,
                                                minHeight: 36,
                                                paddingLeft: 31,
                                                fontSize: 12,
                                            }}
                                        />
                                    </div>
                                </div>

                                {Object.keys(groupedPermissions).length === 0 ? (
                                    <p style={{
                                        padding: 24,
                                        color: COLORS.muted,
                                        textAlign: "center",
                                        fontSize: 12,
                                    }}>
                                        No matching permissions.
                                    </p>
                                ) : (
                                    Object.entries(groupedPermissions).map(
                                        ([module, modulePermissions]) => (
                                            <div
                                                key={module}
                                                style={{
                                                    border: `1px solid ${COLORS.border}`,
                                                    borderRadius: 8,
                                                    marginBottom: 12,
                                                    overflow: "hidden",
                                                }}
                                            >
                                                <div style={{
                                                    padding: "10px 13px",
                                                    background: "#F8FAFC",
                                                    borderBottom: `1px solid ${COLORS.border}`,
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                }}>
                                                    <span style={{
                                                        fontWeight: 700,
                                                        fontSize: 12,
                                                    }}>
                                                        {module}
                                                    </span>
                                                    <span style={{
                                                        color: COLORS.muted,
                                                        fontSize: 11,
                                                    }}>
                                                        {modulePermissions.length} permissions
                                                    </span>
                                                </div>

                                                <div style={{ padding: "4px 13px" }}>
                                                    {modulePermissions.map((permission) => (
                                                        <label
                                                            key={permission.code}
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "flex-start",
                                                                gap: 10,
                                                                padding: "10px 0",
                                                                borderBottom: `1px solid ${COLORS.borderSoft}`,
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={form.permissions.includes(permission.code)}
                                                                onChange={() => togglePermission(permission.code)}
                                                                style={{
                                                                    marginTop: 3,
                                                                    accentColor: COLORS.primary,
                                                                }}
                                                            />
                                                            <span style={{ minWidth: 0 }}>
                                                                <span style={{
                                                                    display: "block",
                                                                    fontSize: 12,
                                                                    fontWeight: 650,
                                                                }}>
                                                                    {permission.code}
                                                                </span>
                                                                {permission.description && (
                                                                    <span style={{
                                                                        display: "block",
                                                                        color: COLORS.muted,
                                                                        fontSize: 11,
                                                                        marginTop: 3,
                                                                    }}>
                                                                        {permission.description}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    )
                                )}
                            </div>

                            <footer style={{
                                borderTop: `1px solid ${COLORS.border}`,
                                padding: "15px 24px",
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 9,
                                background: "#fff",
                            }}>
                                <button
                                    type="button"
                                    style={styles.button}
                                    onClick={closeForm}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        ...styles.button,
                                        ...styles.primaryButton,
                                        minWidth: 125,
                                        opacity: saving ? 0.7 : 1,
                                    }}
                                >
                                    {saving ? (
                                        <LoaderCircle size={16} />
                                    ) : (
                                        <Check size={16} />
                                    )}
                                    {saving
                                        ? "Saving..."
                                        : editingRole
                                            ? "Save changes"
                                            : "Create role"}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}

            <style>{`
                @keyframes rbac-spin {
                    to { transform: rotate(360deg); }
                }
                .rbac-spin {
                    animation: rbac-spin 1s linear infinite;
                }
                @media (max-width: 640px) {
                    .rbac-role-page {
                        padding: 0;
                    }
                }
            `}</style>
        </div>
    );
}

export default RoleManagementPage;
