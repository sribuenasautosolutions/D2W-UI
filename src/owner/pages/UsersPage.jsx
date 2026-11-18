import { useEffect, useMemo, useState } from "react";
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    CirclePlus,
    Eye,
    EyeOff,
    KeyRound,
    Mail,
    Pencil,
    Phone,
    Search,
    ShieldCheck,
    UserRound,
    X,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../auth/AuthContext";
import { getActiveStoresCached } from "../../services/storeService";

const emptyForm = {
    name: "",
    email: "",
    confirmEmail: "",
    phone: "",
    password: "",
    role: "CASHIER",
    roleId: "",
    storeId: "",
};


function apiErrorMessage(error, fallback) {
    const data = error.response?.data;

    if (typeof data === "string" && data.trim()) return data;
    if (data?.message) return data.message;
    if (Array.isArray(data?.errors) && data.errors.length) {
        return data.errors[0];
    }

    return fallback;
}

function apiFieldErrors(error) {
    const fieldErrors = error.response?.data?.fieldErrors;

    return fieldErrors && typeof fieldErrors === "object"
        ? fieldErrors
        : {};
}

function UsersPage() {
    const { user: currentUser, hasPermission } = useAuth();
    const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
    const isStoreOwner = currentUser?.role === "STORE_OWNER";
    const canCreateUser = isSuperAdmin || isStoreOwner || Boolean(hasPermission?.("EMPLOYEES.CREATE"));
    const canUpdateUser = isSuperAdmin || isStoreOwner || Boolean(hasPermission?.("EMPLOYEES.UPDATE"));
    const canManageStoreAccess = isSuperAdmin || Boolean(hasPermission?.("STORE_ACCESS.MANAGE"));
    const canAssignRoles = isSuperAdmin || isStoreOwner || Boolean(hasPermission?.("ROLES.ASSIGN"));

    const [users, setUsers] = useState([]);
    const [stores, setStores] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

    const [form, setForm] = useState(emptyForm);
    const [editForm, setEditForm] = useState(null);
    const [editUser, setEditUser] = useState(null);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [storeFilter, setStoreFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [createOpen, setCreateOpen] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createFieldErrors, setCreateFieldErrors] = useState({});

    const [editError, setEditError] = useState("");
    const [editFieldErrors, setEditFieldErrors] = useState({});

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [statusMessage, setStatusMessage] = useState(null);

    const [changePassword, setChangePassword] = useState(false);
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Store access management
    const [accessOpen, setAccessOpen] = useState(false);
    const [accessUser, setAccessUser] = useState(null);
    const [accessRecords, setAccessRecords] = useState([]);
    const [accessStoreId, setAccessStoreId] = useState("");
    const [accessLoading, setAccessLoading] = useState(false);
    const [accessSaving, setAccessSaving] = useState(false);
    const [accessError, setAccessError] = useState("");

    // Configurable role assignments
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignUser, setAssignUser] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [allRoles, setAllRoles] = useState([]);
    const [availableRoles, setAvailableRoles] = useState([]);
    const [assignUserStores, setAssignUserStores] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState("");
    const [selectedAssignStoreId, setSelectedAssignStoreId] = useState("");
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignSaving, setAssignSaving] = useState(false);
    const [assignError, setAssignError] = useState("");
    const [assignSuccess, setAssignSuccess] = useState("");

    const updateField = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));

        setCreateFieldErrors((current) => {
            if (!current[field]) return current;

            const next = { ...current };
            delete next[field];
            return next;
        });
    };

    const loadUsers = async () => {
        const response = await api.get("/users");

        const data = Array.isArray(response.data)
            ? response.data
            : [];

        setUsers(data);

        setSelectedId((current) =>
            data.some((user) => user.id === current)
                ? current
                : null
        );

        return data;
    };

    const loadStores = async () => {
        try {
            const response = await getActiveStoresCached();
            const data = Array.isArray(response.data?.content)
                ? response.data.content
                : Array.isArray(response.data)
                ? response.data
                : [];
            setStores(data);
            return data;
        } catch {
            const response = await api.get("/stores", {
                params: {
                    page: 0,
                    size: 20,
                    active: true,
                },
            });
            const data = Array.isArray(response.data?.content)
                ? response.data.content
                : Array.isArray(response.data)
                ? response.data
                : [];
            setStores(data);
            return data;
        }
    };

    const loadConfigurableRoles = async () => {
        try {
            const res = await api.get("/access-control/roles");
            const fetchedRoles = Array.isArray(res.data) ? res.data : [];
            setAllRoles(fetchedRoles);
            setAvailableRoles(
                fetchedRoles.filter(
                    (r) => r.active && (isSuperAdmin || r.scope === "STORE")
                )
            );
        } catch (err) {
            console.error("Failed to load configurable roles:", err);
            setError("Unable to load configurable roles from catalogue. Please ensure RBAC migration V28 is applied.");
        }
    };

    const loadPage = async () => {
        setLoading(true);
        setError("");

        try {
            const requests = [loadUsers(), loadConfigurableRoles()];

            if (isSuperAdmin) {
                requests.push(loadStores());
            }

            await Promise.all(requests);
        } catch (requestError) {
            setError(
                apiErrorMessage(
                    requestError,
                    "Unable to load employees"
                )
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPage();
        // Initial load is intentionally tied to the authenticated role.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuperAdmin]);

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();

        return users.filter((user) => {
            const searchableValues = [
                user.name,
                user.email,
                user.phone,
                user.storeName,
                user.role,
            ];

            const matchesSearch =
                !query ||
                searchableValues
                    .filter(Boolean)
                    .some((value) =>
                        String(value).toLowerCase().includes(query)
                    );

            const matchesRole =
                roleFilter === "ALL" ||
                user.role === roleFilter;

            const matchesStore =
                storeFilter === "ALL" ||
                String(user.storeId || "") === storeFilter;

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE"
                    ? user.active
                    : !user.active);

            return (
                matchesSearch &&
                matchesRole &&
                matchesStore &&
                matchesStatus
            );
        });
    }, [
        users,
        search,
        roleFilter,
        storeFilter,
        statusFilter,
    ]);

    const selectedUser =
        users.find((user) => user.id === selectedId) || null;

    const activeUsers = users.filter((user) => user.active).length;
    const ownerUsers = users.filter(
        (user) => user.role === "STORE_OWNER"
    ).length;
    const cashierUsers = users.filter(
        (user) => user.role === "CASHIER"
    ).length;

    const totalPages = Math.max(
        1,
        Math.ceil(filteredUsers.length / pageSize)
    );

    const currentPage = Math.min(page, totalPages);

    const visibleUsers = filteredUsers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const openCreate = () => {
        const defaultRole = availableRoles.find((r) => r.scope === "STORE") || availableRoles[0];
        setForm({
            ...emptyForm,
            roleId: defaultRole ? String(defaultRole.id) : "",
            role: defaultRole && defaultRole.scope === "SYSTEM" ? "SUPER_ADMIN" : "CASHIER",
        });
        setCreateError("");
        setCreateFieldErrors({});
        setSuccess("");
        setShowCreatePassword(false);
        setCreateOpen(true);
    };

    const closeCreate = () => {
        if (saving) return;

        setCreateOpen(false);
        setCreateError("");
        setCreateFieldErrors({});
    };

    const saveUser = async (event) => {
        event.preventDefault();

        setCreateError("");
        setCreateFieldErrors({});
        setSuccess("");

        if (
            form.email.trim().toLowerCase() !==
            form.confirmEmail.trim().toLowerCase()
        ) {
            setCreateError("Email and confirm email must match");
            return;
        }

        if (
            isSuperAdmin &&
            form.role !== "SUPER_ADMIN" &&
            !form.storeId
        ) {
            setCreateError("Select a store for this user");
            return;
        }

        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone,
            password: form.password,
            role: form.role || "CASHIER",
        };

        if (form.roleId) {
            payload.roleId = Number(form.roleId);
        }

        if (isSuperAdmin && form.role !== "SUPER_ADMIN") {
            payload.storeId = Number(form.storeId);
        }

        setSaving(true);

        try {
            await api.post("/users", payload);

            setForm(emptyForm);
            setCreateOpen(false);

            setSuccess(
                isSuperAdmin
                    ? "User created successfully"
                    : `${roleLabel(form.role)} created and assigned to your store`
            );

            await loadUsers();
        } catch (requestError) {
            setCreateFieldErrors(apiFieldErrors(requestError));
            setCreateError(
                apiErrorMessage(
                    requestError,
                    "Unable to create user"
                )
            );
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (user) => {
        setEditUser(user);

        const matchingRole = availableRoles.find((r) => String(r.id) === String(user.roleId));
        setEditForm({
            name: user.name || "",
            email: user.email || "",
            confirmEmail: user.email || "",
            phone: user.phone || "",
            role: user.role || "CASHIER",
            roleId: user.roleId ? String(user.roleId) : (matchingRole ? String(matchingRole.id) : ""),
            storeId: user.storeId || "",
            newPassword: "",
            confirmPassword: "",
        });

        setChangePassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setEditError("");
        setEditFieldErrors({});
    };

    const closeEdit = () => {
        if (saving) return;

        setEditUser(null);
        setEditForm(null);
        setEditError("");
        setEditFieldErrors({});
        setChangePassword(false);
    };

    const saveEdit = async (event) => {
        event.preventDefault();

        if (!editUser || !editForm) return;

        setEditError("");
        setEditFieldErrors({});

        if (
            editForm.email.trim().toLowerCase() !==
            editForm.confirmEmail.trim().toLowerCase()
        ) {
            setEditError("Email and confirm email must match");
            return;
        }

        if (
            changePassword &&
            editForm.newPassword !== editForm.confirmPassword
        ) {
            setEditError(
                "New password and confirm password must match"
            );
            return;
        }

        if (
            isSuperAdmin &&
            editForm.role !== "SUPER_ADMIN" &&
            !editForm.storeId
        ) {
            setEditError("Select a store for this user");
            return;
        }

        const payload = {
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            phone: editForm.phone,
            role: editForm.role,
        };

        if (editForm.roleId) {
            payload.roleId = Number(editForm.roleId);
        }

        if (changePassword) {
            payload.newPassword = editForm.newPassword;
        }

        if (isSuperAdmin && editForm.role !== "SUPER_ADMIN") {
            payload.storeId = Number(editForm.storeId);
        }

        setSaving(true);

        try {
            await api.put(`/users/${editUser.id}`, payload);

            setEditUser(null);
            setEditForm(null);
            setSuccess("User updated successfully");

            await loadUsers();
        } catch (requestError) {
            setEditFieldErrors(apiFieldErrors(requestError));
            setEditError(
                apiErrorMessage(
                    requestError,
                    "Unable to update user"
                )
            );
        } finally {
            setSaving(false);
        }
    };

    const changeUserStatus = async (user) => {
        const active = !user.active;

        const confirmed = window.confirm(
            `${active ? "Activate" : "Deactivate"} ${user.name}?`
        );

        if (!confirmed) return;

        try {
            await api.patch(`/users/${user.id}/status`, {
                active,
            });

            setStatusMessage({
                type: "success",
                text: `${user.name} ${
                    active ? "activated" : "deactivated"
                } successfully`,
            });

            await loadUsers();
        } catch (requestError) {
            setStatusMessage({
                type: "error",
                text: apiErrorMessage(
                    requestError,
                    "Unable to update user status"
                ),
            });
        }
    };

    // -----------------------------------------------------------------
    // Store access
    // -----------------------------------------------------------------

    const loadStoreAccess = async (userId) => {
        setAccessLoading(true);
        setAccessError("");

        try {
            const response = await api.get(
                `/access-control/users/${userId}/stores`
            );

            setAccessRecords(
                Array.isArray(response.data)
                    ? response.data
                    : []
            );
        } catch (requestError) {
            setAccessError(
                apiErrorMessage(
                    requestError,
                    "Unable to load store access"
                )
            );
        } finally {
            setAccessLoading(false);
        }
    };

    const openStoreAccess = async (user) => {
        if (!canManageStoreAccess) return;

        setAccessUser(user);
        setAccessOpen(true);
        setAccessStoreId("");
        setAccessRecords([]);
        setAccessError("");

        await loadStoreAccess(user.id);
    };

    const closeStoreAccess = () => {
        if (accessSaving) return;

        setAccessOpen(false);
        setAccessUser(null);
        setAccessRecords([]);
        setAccessStoreId("");
        setAccessError("");
    };

    const grantStoreAccess = async () => {
        if (!accessUser || !accessStoreId) {
            setAccessError("Select a store first");
            return;
        }

        setAccessSaving(true);
        setAccessError("");

        try {
            await api.put(
                `/access-control/users/${accessUser.id}/stores/${accessStoreId}`
            );

            setAccessStoreId("");
            await loadStoreAccess(accessUser.id);
        } catch (requestError) {
            setAccessError(
                apiErrorMessage(
                    requestError,
                    "Unable to grant store access"
                )
            );
        } finally {
            setAccessSaving(false);
        }
    };

    const revokeStoreAccess = async (storeId) => {
        if (!accessUser) return;

        const confirmed = window.confirm(
            "Revoke access to this store?"
        );

        if (!confirmed) return;

        setAccessSaving(true);
        setAccessError("");

        try {
            await api.delete(
                `/access-control/users/${accessUser.id}/stores/${storeId}`
            );

            await loadStoreAccess(accessUser.id);
        } catch (requestError) {
            setAccessError(
                apiErrorMessage(
                    requestError,
                    "Unable to revoke store access"
                )
            );
        } finally {
            setAccessSaving(false);
        }
    };

    const storeName = (storeId) => {
        const store = stores.find(
            (item) => String(item.id) === String(storeId)
        );

        return store?.storeName || `Store #${storeId}`;
    };

    const activeAccessStoreIds = new Set(
        accessRecords
            .filter((record) => record.active)
            .map((record) => String(record.storeId))
    );

    // -----------------------------------------------------------------
    // Configurable role assignments
    // -----------------------------------------------------------------

    const loadRoleAssignmentData = async (userId) => {
        setAssignLoading(true);
        setAssignError("");

        try {
            const [assignmentRes, rolesRes, storesRes] = await Promise.all([
                api.get(`/access-control/users/${userId}/assignments`),
                api.get("/access-control/roles"),
                api.get(`/access-control/users/${userId}/stores`),
            ]);

            setAssignments(Array.isArray(assignmentRes.data) ? assignmentRes.data : []);
            const fetchedRoles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
            setAllRoles(fetchedRoles);
            setAvailableRoles(
                fetchedRoles.filter(
                    (r) =>
                        r.active &&
                        (isSuperAdmin || r.scope === "STORE")
                )
            );
            setAssignUserStores(Array.isArray(storesRes.data) ? storesRes.data : []);
        } catch (requestError) {
            setAssignError(
                apiErrorMessage(
                    requestError,
                    "Unable to load role assignments"
                )
            );
        } finally {
            setAssignLoading(false);
        }
    };

    const openRoleAssignments = async (user) => {
        if (!canAssignRoles) return;

        setAssignUser(user);
        setAssignOpen(true);
        setSelectedRoleId("");
        setSelectedAssignStoreId("");
        setAssignments([]);
        setAvailableRoles([]);
        setAssignUserStores([]);
        setAssignError("");
        setAssignSuccess("");

        await loadRoleAssignmentData(user.id);
    };

    const closeRoleAssignments = () => {
        if (assignSaving) return;

        setAssignOpen(false);
        setAssignUser(null);
        setAssignments([]);
        setSelectedRoleId("");
        setSelectedAssignStoreId("");
        setAssignError("");
        setAssignSuccess("");
    };

    const selectedRoleObj = useMemo(
        () => availableRoles.find((r) => String(r.id) === String(selectedRoleId)) || null,
        [availableRoles, selectedRoleId]
    );

    const handleRoleSelectChange = (roleIdValue) => {
        setSelectedRoleId(roleIdValue);
        setAssignError("");
        setAssignSuccess("");
        const roleObj = availableRoles.find((r) => String(r.id) === String(roleIdValue));
        if (roleObj?.scope === "STORE" && roleObj.storeId != null) {
            setSelectedAssignStoreId(String(roleObj.storeId));
        } else {
            setSelectedAssignStoreId("");
        }
    };

    const activeAssignStoreIds = useMemo(
        () =>
            new Set(
                assignUserStores
                    .filter((s) => s.active)
                    .map((s) => String(s.storeId))
            ),
        [assignUserStores]
    );

    const activeAssignedRoleIds = useMemo(
        () =>
            new Set(
                assignments
                    .filter((a) => a.active)
                    .map((a) => String(a.roleId))
            ),
        [assignments]
    );

    const assignableRoles = useMemo(() => {
        return availableRoles.filter((role) => {
            // Exclude roles the employee already actively holds (prevents duplicate assignment)
            if (activeAssignedRoleIds.has(String(role.id))) {
                return false;
            }
            // For store roles, only show roles for stores the employee actively has access to
            if (role.scope === "STORE") {
                return activeAssignStoreIds.has(String(role.storeId));
            }
            // System roles only available if Super Admin
            return isSuperAdmin;
        });
    }, [availableRoles, activeAssignedRoleIds, activeAssignStoreIds, isSuperAdmin]);

    const assignConfigurableRole = async () => {
        if (!assignUser || !selectedRoleObj) {
            setAssignError("Select a role first");
            return;
        }

        if (selectedRoleObj.scope === "STORE") {
            if (!selectedAssignStoreId) {
                setAssignError("Select a store for a STORE role assignment");
                return;
            }
            if (!activeAssignStoreIds.has(String(selectedAssignStoreId))) {
                setAssignError(
                    "Employee does not have active store access for the selected store"
                );
                return;
            }
        }

        setAssignSaving(true);
        setAssignError("");
        setAssignSuccess("");

        try {
            await api.post("/access-control/assignments", {
                userId: assignUser.id,
                roleId: selectedRoleObj.id,
                storeId:
                    selectedRoleObj.scope === "STORE"
                        ? Number(selectedAssignStoreId)
                        : null,
            });

            setSelectedRoleId("");
            setSelectedAssignStoreId("");
            setAssignSuccess("Role assigned successfully.");
            await loadRoleAssignmentData(assignUser.id);
        } catch (requestError) {
            setAssignError(
                apiErrorMessage(requestError, "Unable to assign role")
            );
        } finally {
            setAssignSaving(false);
        }
    };

    const deactivateRoleAssignment = async (assignmentId) => {
        if (!assignUser) return;

        setAssignSaving(true);
        setAssignError("");
        setAssignSuccess("");

        try {
            await api.put(`/access-control/assignments/${assignmentId}/deactivate`);
            setAssignSuccess("Role assignment deactivated.");
            await loadRoleAssignmentData(assignUser.id);
        } catch (requestError) {
            setAssignError(
                apiErrorMessage(requestError, "Unable to deactivate assignment")
            );
        } finally {
            setAssignSaving(false);
        }
    };

    const reactivateRoleAssignment = async (assignmentId) => {
        if (!assignUser) return;

        setAssignSaving(true);
        setAssignError("");
        setAssignSuccess("");

        try {
            await api.put(`/access-control/assignments/${assignmentId}/reactivate`);
            setAssignSuccess("Role assignment reactivated.");
            await loadRoleAssignmentData(assignUser.id);
        } catch (requestError) {
            setAssignError(
                apiErrorMessage(requestError, "Unable to reactivate assignment")
            );
        } finally {
            setAssignSaving(false);
        }
    };

    const roleMeta = (roleId) => {
        const match = allRoles.find((r) => String(r.id) === String(roleId));
        if (match) return match;
        return null;
    };

    const availableStores = stores.filter(
        (store) => !activeAccessStoreIds.has(String(store.id))
    );

    // -----------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------

    return (
        <div style={S.page}>
            <div style={S.pageHeader}>
                <div>
                    <span style={S.breadcrumb}>
                        Organization / Users
                    </span>

                    <h1 style={S.title}>
                        {isSuperAdmin
                            ? "User Management"
                            : "Store Employees"}
                    </h1>
                </div>

                <label style={S.headerSearch}>
                    <Search size={18} color="#64748B" />

                    <input
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Search users by name, email, phone, role or store"
                        style={S.searchInput}
                    />
                </label>

                <div style={S.headerActions}>
                    {canCreateUser && (
                        <button
                            type="button"
                            style={S.addButton}
                            onClick={openCreate}
                        >
                            <CirclePlus size={17} />
                            {isSuperAdmin ? "Add User" : "Add Employee"}
                        </button>
                    )}
                </div>
            </div>

            {(error || success) && !createOpen && !editUser && (
                <div style={error ? S.error : S.success}>
                    {error || success}
                </div>
            )}

            <div style={S.stats}>
                <Stat label="Total Users" value={users.length} />
                <Stat
                    label="Active Users"
                    value={activeUsers}
                    color="#15803D"
                />
                <Stat
                    label="Inactive Users"
                    value={users.length - activeUsers}
                    color="#B91C1C"
                />
                <Stat
                    label="Store Owners"
                    value={ownerUsers}
                    color="#7C3AED"
                />
                <Stat
                    label="Cashiers"
                    value={cashierUsers}
                    color="#0369A1"
                />
            </div>

            {/* Create user modal */}
            {createOpen && (
                <div style={S.overlay}>
                    <section style={S.createModal}>
                        <div style={S.modalHeader}>
                            <div>
                                <h2 style={S.panelTitle}>
                                    {isSuperAdmin
                                        ? "Add User"
                                        : "Add Employee"}
                                </h2>

                                <span style={S.listMeta}>
                                    Create login details and assign access
                                </span>
                            </div>

                            <button
                                type="button"
                                style={S.iconButton}
                                onClick={closeCreate}
                                title="Close"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        {createError && (
                            <div style={S.modalError}>
                                {createError}
                            </div>
                        )}

                        <form
                            onSubmit={saveUser}
                            style={S.createForm}
                        >
                            <Field
                                label="Full name"
                                error={createFieldErrors.name}
                            >
                                <input
                                    required
                                    minLength={2}
                                    maxLength={80}
                                    value={form.name}
                                    onChange={(event) =>
                                        updateField(
                                            "name",
                                            event.target.value
                                        )
                                    }
                                    style={S.input}
                                />
                            </Field>

                            <Field
                                label="Email"
                                error={createFieldErrors.email}
                            >
                                <input
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={(event) =>
                                        updateField(
                                            "email",
                                            event.target.value
                                        )
                                    }
                                    style={S.input}
                                />
                            </Field>

                            <Field label="Confirm email">
                                <input
                                    required
                                    type="email"
                                    value={form.confirmEmail}
                                    onChange={(event) =>
                                        updateField(
                                            "confirmEmail",
                                            event.target.value
                                        )
                                    }
                                    style={S.input}
                                />
                            </Field>

                            <Field
                                label="Phone number"
                                error={createFieldErrors.phone}
                            >
                                <input
                                    required
                                    inputMode="numeric"
                                    pattern="[0-9]{10}"
                                    maxLength={10}
                                    value={form.phone}
                                    onChange={(event) =>
                                        updateField(
                                            "phone",
                                            event.target.value.replace(
                                                /\D/g,
                                                ""
                                            )
                                        )
                                    }
                                    style={S.input}
                                />
                            </Field>

                            <Field label="Password">
                                <div style={S.passwordWrap}>
                                    <input
                                        required
                                        type={
                                            showCreatePassword
                                                ? "text"
                                                : "password"
                                        }
                                        minLength={8}
                                        maxLength={72}
                                        value={form.password}
                                        onChange={(event) =>
                                            updateField(
                                                "password",
                                                event.target.value
                                            )
                                        }
                                        style={{
                                            ...S.input,
                                            paddingRight: 42,
                                        }}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowCreatePassword(
                                                (current) => !current
                                            )
                                        }
                                        style={S.passwordButton}
                                        title={
                                            showCreatePassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                        aria-label={
                                            showCreatePassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >
                                        {showCreatePassword ? (
                                            <EyeOff size={17} />
                                        ) : (
                                            <Eye size={17} />
                                        )}
                                    </button>
                                </div>
                            </Field>

                            <Field label="Role">
                                <select
                                    value={availableRoles.length > 0 ? (form.roleId || "") : form.role}
                                    onChange={(event) => {
                                        const val = event.target.value;
                                        if (availableRoles.length > 0) {
                                            const selectedRole = availableRoles.find((r) => String(r.id) === String(val));
                                            updateField("roleId", val);
                                            if (selectedRole) {
                                                const fallbackRole = selectedRole.scope === "SYSTEM" ? "SUPER_ADMIN" : "CASHIER";
                                                updateField("role", fallbackRole);
                                                if (selectedRole.scope === "SYSTEM") {
                                                    updateField("storeId", "");
                                                }
                                            }
                                        } else {
                                            updateField("role", val);
                                            if (val === "SUPER_ADMIN") {
                                                updateField("storeId", "");
                                            }
                                        }
                                    }}
                                    style={S.input}
                                >
                                    {availableRoles.length > 0 ? (
                                        <>
                                            <option value="">Select configurable role</option>
                                            {availableRoles.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name} ({r.scope}{r.storeId ? ` · ${storeName(r.storeId)}` : ""})
                                                </option>
                                            ))}
                                        </>
                                    ) : (
                                        <option value="" disabled>
                                            No configurable roles loaded (apply V28 migration)
                                        </option>
                                    )}
                                </select>
                            </Field>

                            {isSuperAdmin &&
                                form.role !== "SUPER_ADMIN" && (
                                    <Field label="Assigned store">
                                        <select
                                            required
                                            value={form.storeId}
                                            onChange={(event) =>
                                                updateField(
                                                    "storeId",
                                                    event.target.value
                                                )
                                            }
                                            style={S.input}
                                        >
                                            <option value="">
                                                Select store
                                            </option>

                                            {stores
                                                .filter(
                                                    (store) =>
                                                        store.isActive !==
                                                        false
                                                )
                                                .map((store) => (
                                                    <option
                                                        key={store.id}
                                                        value={store.id}
                                                    >
                                                        {store.storeName}
                                                    </option>
                                                ))}
                                        </select>
                                    </Field>
                                )}

                            {!isSuperAdmin && (
                                <Field label="Assigned store">
                                    <div style={S.readOnly}>
                                        {currentUser?.storeName ||
                                            "Current store"}
                                    </div>
                                </Field>
                            )}

                            <div style={S.modalActions}>
                                <button
                                    type="button"
                                    onClick={closeCreate}
                                    style={S.cancel}
                                >
                                    Cancel
                                </button>

                                <button
                                    disabled={saving}
                                    type="submit"
                                    style={S.submit}
                                >
                                    <CirclePlus size={17} />
                                    {saving
                                        ? "Creating..."
                                        : "Create User"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {/* User list and details */}
            <div
                style={{
                    ...S.workspace,
                    gridTemplateColumns: selectedUser
                        ? "35fr 65fr"
                        : "1fr",
                }}
            >
                <section style={S.listPanel}>
                    <div style={S.userFilters}>
                        <div style={S.listCaption}>
                            <strong>All Users</strong>
                            <span>{filteredUsers.length} records</span>
                        </div>

                        <div style={S.filterGrid}>
                            <select
                                aria-label="Filter by role"
                                value={roleFilter}
                                onChange={(event) => {
                                    setRoleFilter(event.target.value);
                                    setPage(1);
                                }}
                                style={S.filterSelect}
                            >
                                <option value="ALL">All roles</option>
                                <option value="SUPER_ADMIN">
                                    Super Admin
                                </option>
                                <option value="STORE_OWNER">
                                    Store Owner
                                </option>
                                <option value="CASHIER">Cashier</option>
                                <option value="SALESPERSON">
                                    Salesperson
                                </option>
                                <option value="PROCUREMENT">
                                    Procurement
                                </option>
                            </select>

                            {isSuperAdmin && (
                                <select
                                    aria-label="Filter by store"
                                    value={storeFilter}
                                    onChange={(event) => {
                                        setStoreFilter(event.target.value);
                                        setPage(1);
                                    }}
                                    style={S.filterSelect}
                                >
                                    <option value="ALL">All stores</option>

                                    {stores.map((store) => (
                                        <option
                                            key={store.id}
                                            value={String(store.id)}
                                        >
                                            {store.storeName}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <select
                                aria-label="Filter by status"
                                value={statusFilter}
                                onChange={(event) => {
                                    setStatusFilter(event.target.value);
                                    setPage(1);
                                }}
                                style={S.filterSelect}
                            >
                                <option value="ALL">All status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div style={S.tableHeader}>
                        <span>User</span>
                        <span>Role / Store</span>
                        <span>Status</span>
                    </div>

                    <div style={S.userList}>
                        {!loading &&
                            visibleUsers.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() =>
                                        setSelectedId(user.id)
                                    }
                                    style={{
                                        ...S.userRow,
                                        ...(selectedId === user.id
                                            ? S.selectedRow
                                            : {}),
                                    }}
                                >
                                    <div style={S.userText}>
                                        <strong>{user.name}</strong>
                                        <span>{user.email}</span>
                                    </div>

                                    <span style={S.userAssignment}>
                                        {user.roleName || roleLabel(user.role)}
                                        <small>
                                            {user.storeName ||
                                                "Organization"}
                                        </small>
                                    </span>

                                    <span
                                        style={
                                            user.active
                                                ? S.activeBadge
                                                : S.inactiveBadge
                                        }
                                    >
                                        {user.active
                                            ? "Active"
                                            : "Inactive"}
                                    </span>
                                </button>
                            ))}

                        {loading && (
                            <div style={S.empty}>
                                Loading users...
                            </div>
                        )}

                        {!loading &&
                            filteredUsers.length === 0 && (
                                <div style={S.empty}>
                                    No users found
                                </div>
                            )}
                    </div>

                    <Pagination
                        page={currentPage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        total={filteredUsers.length}
                        onPage={setPage}
                        onPageSize={(size) => {
                            setPageSize(size);
                            setPage(1);
                        }}
                    />
                </section>

                {selectedUser && (
                    <section style={S.detailsPanel}>
                        <div style={S.detailHeader}>
                            <div style={S.identity}>
                                <div style={S.largeAvatar}>
                                    {initials(selectedUser.name)}
                                </div>

                                <div>
                                    <div style={S.nameLine}>
                                        <h2 style={S.detailTitle}>
                                            {selectedUser.name}
                                        </h2>

                                        <span
                                            style={
                                                selectedUser.active
                                                    ? S.activeBadge
                                                    : S.inactiveBadge
                                            }
                                        >
                                            {selectedUser.active
                                                ? "Active"
                                                : "Inactive"}
                                        </span>
                                    </div>

                                    <span style={S.email}>
                                        {selectedUser.email}
                                    </span>
                                </div>
                            </div>

                            <div style={S.userActions}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedId(null)}
                                    style={S.editButton}
                                >
                                    Back to table
                                </button>

                                {canUpdateUser && (isSuperAdmin ||
                                    ![
                                        "SUPER_ADMIN",
                                        "STORE_OWNER",
                                    ].includes(selectedUser.role)) && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openEdit(selectedUser)
                                            }
                                            style={S.editButton}
                                        >
                                            <Pencil size={15} />
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                changeUserStatus(
                                                    selectedUser
                                                )
                                            }
                                            style={
                                                selectedUser.active
                                                    ? S.deactivateButton
                                                    : S.activateButton
                                            }
                                        >
                                            {selectedUser.active
                                                ? "Deactivate"
                                                : "Activate"}
                                        </button>
                                    </>
                                )}

                                {canManageStoreAccess && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openStoreAccess(selectedUser)
                                        }
                                        style={S.accessButton}
                                    >
                                        <ShieldCheck size={15} />
                                        Store Access
                                    </button>
                                )}

                                {canAssignRoles && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openRoleAssignments(selectedUser)
                                        }
                                        style={S.accessButton}
                                    >
                                        <KeyRound size={15} />
                                        Role Assignments
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={S.detailGrid}>
                            <Detail
                                icon={<Mail size={17} />}
                                label="Email"
                                value={selectedUser.email}
                            />

                            <Detail
                                icon={<Phone size={17} />}
                                label="Phone"
                                value={selectedUser.phone}
                            />

                            <Detail
                                icon={<ShieldCheck size={17} />}
                                label="Role"
                                value={selectedUser.roleName || roleLabel(selectedUser.role)}
                            />

                            <Detail
                                icon={<Building2 size={17} />}
                                label="Assigned Store"
                                value={
                                    selectedUser.storeName ||
                                    "Organization"
                                }
                            />

                            <Detail
                                icon={<UserRound size={17} />}
                                label="Account Status"
                                value={
                                    selectedUser.active
                                        ? "Active"
                                        : "Inactive"
                                }
                            />
                        </div>
                    </section>
                )}
            </div>

            {/* Edit user modal */}
            {editUser && editForm && (
                <div style={S.overlay}>
                    <div style={S.modal}>
                        <div style={S.modalHeader}>
                            <div>
                                <h2 style={S.panelTitle}>
                                    Edit User
                                </h2>

                                <span style={S.listMeta}>
                                    {editUser.email}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={closeEdit}
                                style={S.iconButton}
                                title="Close"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        {editError && (
                            <div style={S.modalError}>
                                {editError}
                            </div>
                        )}

                        <form
                            onSubmit={saveEdit}
                            style={S.modalForm}
                        >
                            <Field
                                label="Full name"
                                error={editFieldErrors.name}
                            >
                                <input
                                    required
                                    minLength={2}
                                    maxLength={80}
                                    style={S.input}
                                    value={editForm.name}
                                    onChange={(event) =>
                                        setEditForm({
                                            ...editForm,
                                            name: event.target.value,
                                        })
                                    }
                                />
                            </Field>

                            <Field
                                label="Email"
                                error={editFieldErrors.email}
                            >
                                <input
                                    required
                                    type="email"
                                    style={S.input}
                                    value={editForm.email}
                                    onChange={(event) =>
                                        setEditForm({
                                            ...editForm,
                                            email: event.target.value,
                                        })
                                    }
                                />
                            </Field>

                            <Field label="Confirm email">
                                <input
                                    required
                                    type="email"
                                    style={S.input}
                                    value={editForm.confirmEmail}
                                    onChange={(event) =>
                                        setEditForm({
                                            ...editForm,
                                            confirmEmail:
                                                event.target.value,
                                        })
                                    }
                                />
                            </Field>

                            <Field
                                label="Phone"
                                error={editFieldErrors.phone}
                            >
                                <input
                                    required
                                    inputMode="numeric"
                                    pattern="[0-9]{10}"
                                    maxLength={10}
                                    style={S.input}
                                    value={editForm.phone}
                                    onChange={(event) =>
                                        setEditForm({
                                            ...editForm,
                                            phone: event.target.value.replace(
                                                /\D/g,
                                                ""
                                            ),
                                        })
                                    }
                                />
                            </Field>

                            {!changePassword && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setChangePassword(true)
                                    }
                                    style={S.changePassword}
                                >
                                    <KeyRound size={16} />
                                    Change Password
                                </button>
                            )}

                            {changePassword && (
                                <>
                                    <Field label="New password">
                                        <div style={S.passwordWrap}>
                                            <input
                                                required
                                                type={
                                                    showNewPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                minLength={8}
                                                maxLength={72}
                                                style={{
                                                    ...S.input,
                                                    paddingRight: 42,
                                                }}
                                                value={
                                                    editForm.newPassword
                                                }
                                                onChange={(event) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        newPassword:
                                                            event.target
                                                                .value,
                                                    })
                                                }
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowNewPassword(
                                                        (current) => !current
                                                    )
                                                }
                                                style={S.passwordButton}
                                                title={
                                                    showNewPassword
                                                        ? "Hide password"
                                                        : "Show password"
                                                }
                                                aria-label={
                                                    showNewPassword
                                                        ? "Hide password"
                                                        : "Show password"
                                                }
                                            >
                                                {showNewPassword ? (
                                                    <EyeOff size={17} />
                                                ) : (
                                                    <Eye size={17} />
                                                )}
                                            </button>
                                        </div>
                                    </Field>

                                    <Field label="Confirm new password">
                                        <div style={S.passwordWrap}>
                                            <input
                                                required
                                                type={
                                                    showConfirmPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                minLength={8}
                                                maxLength={72}
                                                style={{
                                                    ...S.input,
                                                    paddingRight: 42,
                                                }}
                                                value={
                                                    editForm.confirmPassword
                                                }
                                                onChange={(event) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        confirmPassword:
                                                            event.target
                                                                .value,
                                                    })
                                                }
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowConfirmPassword(
                                                        (current) => !current
                                                    )
                                                }
                                                style={S.passwordButton}
                                                title={
                                                    showConfirmPassword
                                                        ? "Hide password"
                                                        : "Show password"
                                                }
                                                aria-label={
                                                    showConfirmPassword
                                                        ? "Hide password"
                                                        : "Show password"
                                                }
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff size={17} />
                                                ) : (
                                                    <Eye size={17} />
                                                )}
                                            </button>
                                        </div>
                                    </Field>
                                </>
                            )}

                            <Field label="Role">
                                <select
                                    style={S.input}
                                    value={availableRoles.length > 0 ? (editForm.roleId || "") : editForm.role}
                                    onChange={(event) => {
                                        const val = event.target.value;
                                        if (availableRoles.length > 0) {
                                            const selectedRole = availableRoles.find((r) => String(r.id) === String(val));
                                            setEditForm({
                                                ...editForm,
                                                roleId: val,
                                                role: selectedRole?.scope === "SYSTEM" ? "SUPER_ADMIN" : "CASHIER",
                                                storeId: selectedRole?.scope === "SYSTEM" ? "" : editForm.storeId,
                                            });
                                        } else {
                                            setEditForm({
                                                ...editForm,
                                                role: val,
                                                storeId: val === "SUPER_ADMIN" ? "" : editForm.storeId,
                                            });
                                        }
                                    }}
                                >
                                    {availableRoles.length > 0 ? (
                                        <>
                                            <option value="">Select configurable role</option>
                                            {availableRoles.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name} ({r.scope}{r.storeId ? ` · ${storeName(r.storeId)}` : ""})
                                                </option>
                                            ))}
                                        </>
                                    ) : (
                                        <option value="" disabled>
                                            No configurable roles loaded (apply V28 migration)
                                        </option>
                                    )}
                                </select>
                            </Field>

                            {isSuperAdmin &&
                                editForm.role !== "SUPER_ADMIN" && (
                                    <Field label="Assigned store">
                                        <select
                                            required
                                            style={S.input}
                                            value={editForm.storeId}
                                            onChange={(event) =>
                                                setEditForm({
                                                    ...editForm,
                                                    storeId:
                                                        event.target.value,
                                                })
                                            }
                                        >
                                            <option value="">
                                                Select store
                                            </option>

                                            {stores
                                                .filter(
                                                    (store) =>
                                                        store.isActive !==
                                                        false
                                                )
                                                .map((store) => (
                                                    <option
                                                        key={store.id}
                                                        value={store.id}
                                                    >
                                                        {store.storeName}
                                                    </option>
                                                ))}
                                        </select>
                                    </Field>
                                )}

                            <div style={S.modalActions}>
                                <button
                                    type="button"
                                    onClick={closeEdit}
                                    style={S.cancel}
                                >
                                    Cancel
                                </button>

                                <button
                                    disabled={saving}
                                    type="submit"
                                    style={S.submit}
                                >
                                    {saving
                                        ? "Updating..."
                                        : "Update User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Store access modal */}
            {accessOpen && accessUser && (
                <div style={S.overlay}>
                    <section style={S.accessModal}>
                        <div style={S.modalHeader}>
                            <div>
                                <h2 style={S.panelTitle}>
                                    Manage Store Access
                                </h2>

                                <span style={S.listMeta}>
                                    {accessUser.name} · {accessUser.email}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={closeStoreAccess}
                                style={S.iconButton}
                                title="Close"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        {accessError && (
                            <div style={S.modalError}>
                                {accessError}
                            </div>
                        )}

                        <div style={S.accessContent}>
                            <div style={S.accessGrant}>
                                <Field label="Grant access to store">
                                    <select
                                        value={accessStoreId}
                                        onChange={(event) =>
                                            setAccessStoreId(
                                                event.target.value
                                            )
                                        }
                                        style={S.input}
                                        disabled={
                                            accessLoading ||
                                            accessSaving
                                        }
                                    >
                                        <option value="">
                                            Select a store
                                        </option>

                                        {availableStores.map((store) => (
                                            <option
                                                key={store.id}
                                                value={store.id}
                                            >
                                                {store.storeName}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <button
                                    type="button"
                                    disabled={
                                        !accessStoreId ||
                                        accessSaving ||
                                        accessLoading
                                    }
                                    onClick={grantStoreAccess}
                                    style={S.submit}
                                >
                                    <CirclePlus size={16} />
                                    {accessSaving
                                        ? "Saving..."
                                        : "Grant Access"}
                                </button>
                            </div>

                            <div style={S.accessSectionHeader}>
                                <strong>Store access records</strong>
                                <span>
                                    {accessRecords.length} records
                                </span>
                            </div>

                            {accessLoading ? (
                                <div style={S.empty}>
                                    Loading store access...
                                </div>
                            ) : accessRecords.length === 0 ? (
                                <div style={S.empty}>
                                    No store access records found.
                                </div>
                            ) : (
                                <div style={S.accessList}>
                                    {accessRecords.map((record) => (
                                        <div
                                            key={
                                                record.id ??
                                                `${record.userId}-${record.storeId}`
                                            }
                                            style={S.accessRow}
                                        >
                                            <div style={S.accessStoreInfo}>
                                                <div
                                                    style={
                                                        S.accessStoreIcon
                                                    }
                                                >
                                                    <Building2 size={17} />
                                                </div>

                                                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                    <strong style={{ fontSize: 13, color: "#0F172A" }}>
                                                        {storeName(
                                                            record.storeId
                                                        )}
                                                    </strong>

                                                    <span style={{ fontSize: 12, color: "#64748B" }}>
                                                        Authorized Store Access
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={S.accessRowActions}>
                                                <span
                                                    style={
                                                        record.active
                                                            ? S.activeBadge
                                                            : S.inactiveBadge
                                                    }
                                                >
                                                    {record.active
                                                        ? "Active"
                                                        : "Revoked"}
                                                </span>

                                                {record.active && (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            accessSaving
                                                        }
                                                        onClick={() =>
                                                            revokeStoreAccess(
                                                                record.storeId
                                                            )
                                                        }
                                                        style={
                                                            S.revokeButton
                                                        }
                                                    >
                                                        Revoke
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={S.accessNote}>
                                Revoking store access does not delete the
                                employee or change their assigned role.
                            </div>
                        </div>

                        <div style={S.accessFooter}>
                            <button
                                type="button"
                                onClick={closeStoreAccess}
                                style={S.cancel}
                                disabled={accessSaving}
                            >
                                Close
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {/* Configurable role assignments modal */}
            {assignOpen && assignUser && (
                <div style={S.overlay}>
                    <section style={S.accessModal}>
                        <div style={S.modalHeader}>
                            <div>
                                <h2 style={S.panelTitle}>
                                    Manage Role Assignments
                                </h2>

                                <span style={S.listMeta}>
                                    {assignUser.name} · {assignUser.email}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={closeRoleAssignments}
                                style={S.iconButton}
                                title="Close"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        {assignError && (
                            <div style={S.modalError}>
                                {assignError}
                            </div>
                        )}

                        {assignSuccess && (
                            <div
                                style={{
                                    ...S.accessNote,
                                    margin: "10px 18px 0",
                                    background: "#F0FDF4",
                                    color: "#15803D",
                                    border: "1px solid #BBF7D0",
                                }}
                            >
                                {assignSuccess}
                            </div>
                        )}

                        <div style={S.accessContent}>
                            <div style={S.accessGrantRow}>
                                <select
                                    value={selectedRoleId}
                                    onChange={(e) => handleRoleSelectChange(e.target.value)}
                                    style={S.input}
                                    disabled={assignSaving || assignLoading}
                                >
                                    <option value="">Select configurable role</option>
                                    {assignableRoles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}{role.storeId ? ` — ${storeName(role.storeId)}` : " — Global System"}
                                        </option>
                                    ))}
                                </select>

                                {selectedRoleObj?.scope === "STORE" && (
                                    <select
                                        value={selectedAssignStoreId}
                                        onChange={(e) => setSelectedAssignStoreId(e.target.value)}
                                        style={S.input}
                                        disabled
                                    >
                                        <option value={selectedAssignStoreId}>
                                            {storeName(selectedAssignStoreId)}
                                        </option>
                                    </select>
                                )}

                                <button
                                    type="button"
                                    onClick={assignConfigurableRole}
                                    disabled={assignSaving || assignLoading || !selectedRoleId}
                                    style={S.grantButton}
                                >
                                    {assignSaving ? "Saving..." : "Assign"}
                                </button>
                            </div>

                            {assignLoading ? (
                                <div style={S.empty}>Loading role assignments...</div>
                            ) : assignments.length === 0 ? (
                                <div style={S.empty}>
                                    No configurable role assignments found.
                                </div>
                            ) : (
                                <div style={S.accessList}>
                                    {assignments.map((assignment) => {
                                        const meta = roleMeta(assignment.roleId);
                                        const scopeLabel = assignment.storeId
                                            ? "STORE"
                                            : meta?.scope || "SYSTEM";

                                        return (
                                            <div key={assignment.id} style={S.accessRow}>
                                                <div style={S.accessStoreInfo}>
                                                    <div style={S.accessStoreIcon}>
                                                        <KeyRound size={17} />
                                                    </div>

                                                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                        <strong style={{ fontSize: 13, color: "#0F172A" }}>
                                                            {meta?.name || "Configured Role"}
                                                        </strong>

                                                        <span style={{ fontSize: 12, color: "#64748B" }}>
                                                            {assignment.storeId
                                                                ? storeName(assignment.storeId)
                                                                : "Global System"}
                                                            {assignment.assignedAt
                                                                ? ` · Assigned ${String(assignment.assignedAt).replace("T", " ").slice(0, 16)}`
                                                                : ""}
                                                            {assignment.revokedAt
                                                                ? ` · Revoked ${String(assignment.revokedAt).replace("T", " ").slice(0, 16)}`
                                                                : ""}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={S.accessRowActions}>
                                                    <span
                                                        style={
                                                            assignment.active
                                                                ? S.activeBadge
                                                                : S.inactiveBadge
                                                        }
                                                    >
                                                        {assignment.active ? "Active" : "Inactive"}
                                                    </span>

                                                    {assignment.active ? (
                                                        <button
                                                            type="button"
                                                            disabled={assignSaving}
                                                            onClick={() =>
                                                                deactivateRoleAssignment(assignment.id)
                                                            }
                                                            style={S.revokeButton}
                                                        >
                                                            Deactivate
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={assignSaving}
                                                            onClick={() =>
                                                                reactivateRoleAssignment(assignment.id)
                                                            }
                                                            style={S.grantButton}
                                                        >
                                                            Reactivate
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div style={S.accessNote}>
                                STORE role assignments require active store access for the target store.
                                SYSTEM roles apply globally and cannot be assigned by Store Owners.
                            </div>
                        </div>

                        <div style={S.accessFooter}>
                            <button
                                type="button"
                                onClick={closeRoleAssignments}
                                style={S.cancel}
                                disabled={assignSaving}
                            >
                                Close
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {/* Status feedback */}
            {statusMessage && (
                <div style={S.overlay}>
                    <div style={S.messageModal}>
                        <strong>
                            {statusMessage.type === "error"
                                ? "Unable to update status"
                                : "Status updated"}
                        </strong>

                        <span>{statusMessage.text}</span>

                        <button
                            type="button"
                            onClick={() => setStatusMessage(null)}
                            style={S.submit}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------
// Reusable components
// ---------------------------------------------------------------------

function Field({ label, error, children }) {
    return (
        <label style={S.field}>
            <span style={S.label}>{label}</span>
            {children}
            {error && (
                <span style={S.fieldError}>
                    {typeof error === "string"
                        ? error
                        : JSON.stringify(error)}
                </span>
            )}
        </label>
    );
}

function Stat({ label, value, color = "#1D4ED8" }) {
    return (
        <div style={S.stat}>
            <span>{label}</span>
            <strong style={{ color }}>{value}</strong>
        </div>
    );
}

function Detail({ icon, label, value }) {
    return (
        <div style={S.detailItem}>
            <div style={S.detailIcon}>{icon}</div>

            <div>
                <span style={S.detailLabel}>{label}</span>
                <strong style={S.detailValue}>
                    {value || "-"}
                </strong>
            </div>
        </div>
    );
}

function Pagination({
    page,
    totalPages,
    pageSize,
    total,
    onPage,
    onPageSize,
}) {
    return (
        <div style={S.pagination}>
            <span style={S.pageMeta}>
                {total
                    ? `${(page - 1) * pageSize + 1}-${Math.min(
                          page * pageSize,
                          total
                      )} of ${total}`
                    : "0 records"}
            </span>

            <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(event) =>
                    onPageSize(Number(event.target.value))
                }
                style={S.pageSize}
            >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
            </select>

            <button
                type="button"
                title="Previous page"
                disabled={page === 1}
                onClick={() => onPage(page - 1)}
                style={S.pageButton}
            >
                <ChevronLeft size={16} />
            </button>

            <strong style={S.pageNumber}>{page}</strong>

            <button
                type="button"
                title="Next page"
                disabled={page === totalPages}
                onClick={() => onPage(page + 1)}
                style={S.pageButton}
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
}

function initials(name = "") {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "U"
    );
}

function roleLabel(role) {
    return (
        {
            SUPER_ADMIN: "Super Admin",
            STORE_OWNER: "Store Owner",
            CASHIER: "Cashier",
            SALESPERSON: "Salesperson",
            PROCUREMENT: "Procurement",
        }[role] || role
    );
}

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------

const S = {
    page: {
        display: "grid",
        gap: 12,
    },

    pageHeader: {
        display: "grid",
        gridTemplateColumns: "minmax(220px, auto) minmax(280px, 1fr) auto",
        alignItems: "center",
        gap: 16,
    },

    breadcrumb: {
        display: "block",
        marginBottom: 4,
        color: "#64748B",
        fontSize: 10.5,
        fontWeight: 700,
    },

    title: {
        margin: 0,
        fontSize: 21,
        letterSpacing: 0,
    },

    headerSearch: {
        height: 40,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "0 12px",
        border: "1px solid #CBD5E1",
        borderRadius: 6,
        background: "#FFFFFF",
        boxShadow: "0 1px 2px rgba(15,23,42,.04)",
    },

    headerActions: {
        display: "flex",
        alignItems: "center",
        gap: 10,
    },

    addButton: {
        height: 40,
        padding: "0 14px",
        border: 0,
        borderRadius: 5,
        background: "#2563EB",
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        gap: 7,
        fontWeight: 800,
        cursor: "pointer",
    },

    error: {
        border: "1px solid #FECACA",
        background: "#FEF2F2",
        color: "#B91C1C",
        borderRadius: 6,
        padding: "10px 12px",
        fontSize: 13,
    },

    success: {
        border: "1px solid #BBF7D0",
        background: "#F0FDF4",
        color: "#15803D",
        borderRadius: 6,
        padding: "10px 12px",
        fontSize: 13,
    },

    stats: {
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        gap: 9,
    },

    stat: {
        minHeight: 42,
        padding: "0 13px",
        border: "1px solid #E2E8F0",
        borderRadius: 6,
        background: "#FFFFFF",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: "#64748B",
        fontSize: 11.5,
        boxShadow: "0 1px 2px rgba(15,23,42,.03)",
    },

    workspace: {
        display: "grid",
        gridTemplateColumns: "35fr 65fr",
        gap: 14,
        alignItems: "stretch",
        height: "clamp(440px, calc(100vh - 270px), 620px)",
        minHeight: 0,
    },

    listPanel: {
        minWidth: 0,
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 7,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 2px 7px rgba(15,23,42,.04)",
    },

    userFilters: {
        display: "grid",
        gap: 9,
        padding: 11,
        borderBottom: "1px solid #E2E8F0",
    },

    listCaption: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: "#0F172A",
        fontSize: 12,
    },

    filterGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 8,
    },

    filterSelect: {
        width: "100%",
        height: 36,
        minWidth: 0,
        padding: "0 28px 0 9px",
        border: "1px solid #CBD5E1",
        borderRadius: 5,
        background: "#FFFFFF",
        color: "#334155",
        font: "inherit",
        fontSize: 12,
    },

    tableHeader: {
        display: "grid",
        gridTemplateColumns: "2fr 1fr 100px",
        gap: 12,
        padding: "9px 14px",
        borderBottom: "1px solid #E2E8F0",
        background: "#F8FAFC",
        color: "#64748B",
        fontSize: 10,
        fontWeight: 800,
        textTransform: "uppercase",
    },

    userList: {
        overflowY: "auto",
        flex: 1,
        minHeight: 0,
    },

    userRow: {
        width: "100%",
        minHeight: 66,
        padding: "10px 14px",
        border: 0,
        borderBottom: "1px solid #F1F5F9",
        background: "#FFFFFF",
        display: "grid",
        gridTemplateColumns: "2fr 1fr 100px",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        cursor: "pointer",
    },

    selectedRow: {
        background: "#EFF6FF",
        boxShadow: "inset 3px 0 #2563EB",
    },

    userText: {
        display: "grid",
        gap: 4,
        minWidth: 0,
        color: "#0F172A",
        fontSize: 13,
    },

    userAssignment: {
        display: "grid",
        gap: 3,
        color: "#334155",
        fontSize: 12,
    },

    detailsPanel: {
        minWidth: 0,
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 7,
        overflow: "hidden",
        alignSelf: "start",
        boxShadow: "0 2px 7px rgba(15,23,42,.04)",
    },

    detailHeader: {
        minHeight: 68,
        padding: "12px 16px",
        borderBottom: "1px solid #E2E8F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
    },

    identity: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        minWidth: 0,
    },

    largeAvatar: {
        width: 48,
        height: 48,
        flexShrink: 0,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: "#DBEAFE",
        color: "#1D4ED8",
        fontSize: 15,
        fontWeight: 800,
    },

    nameLine: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
    },

    detailTitle: {
        margin: 0,
        color: "#0F172A",
        fontSize: 18,
        letterSpacing: 0,
    },

    userActions: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
    },

    detailGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 1,
        background: "#E2E8F0",
    },

    detailItem: {
        minHeight: 82,
        padding: "13px 14px",
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        gap: 12,
    },

    detailIcon: {
        width: 32,
        height: 32,
        borderRadius: 5,
        display: "grid",
        placeItems: "center",
        background: "#EFF6FF",
        color: "#2563EB",
        flexShrink: 0,
    },

    detailLabel: {
        display: "block",
        marginBottom: 5,
        color: "#64748B",
        fontSize: 10.5,
        fontWeight: 700,
    },

    detailValue: {
        display: "block",
        color: "#0F172A",
        fontSize: 12.5,
        overflowWrap: "anywhere",
    },

    panelTitle: {
        margin: 0,
        color: "#0F172A",
        fontSize: 15,
        letterSpacing: 0,
    },

    createModal: {
        width: "min(720px, 100%)",
        maxHeight: "90vh",
        overflowY: "auto",
        background: "#FFFFFF",
        borderRadius: 7,
        boxShadow: "0 24px 60px rgba(15,23,42,0.24)",
    },

    modal: {
        width: "min(680px, 100%)",
        maxHeight: "90vh",
        overflowY: "auto",
        background: "#FFFFFF",
        borderRadius: 7,
        boxShadow: "0 24px 60px rgba(15,23,42,0.24)",
    },

    accessModal: {
        width: "min(650px, 100%)",
        maxHeight: "90vh",
        overflowY: "auto",
        background: "#FFFFFF",
        borderRadius: 7,
        boxShadow: "0 24px 60px rgba(15,23,42,0.24)",
    },

    createForm: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14,
        padding: 18,
    },

    modalForm: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14,
        padding: 16,
    },

    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottom: "1px solid #E2E8F0",
    },

    modalError: {
        margin: "14px 18px 0",
        border: "1px solid #FECACA",
        background: "#FEF2F2",
        color: "#B91C1C",
        borderRadius: 5,
        padding: "10px 12px",
        fontSize: 13,
    },

    field: {
        display: "grid",
        gap: 6,
        minWidth: 0,
    },

    label: {
        color: "#334155",
        fontSize: 12,
        fontWeight: 700,
    },

    input: {
        width: "100%",
        height: 39,
        padding: "0 10px",
        border: "1px solid #CBD5E1",
        borderRadius: 5,
        background: "#FFFFFF",
        color: "#0F172A",
        font: "inherit",
        fontSize: 13,
        boxSizing: "border-box",
    },

    passwordWrap: {
        position: "relative",
        width: "100%",
    },

    passwordButton: {
        position: "absolute",
        right: 1,
        top: 1,
        width: 38,
        height: 37,
        border: 0,
        background: "transparent",
        color: "#64748B",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
    },

    fieldError: {
        color: "#B91C1C",
        fontSize: 11.5,
        lineHeight: 1.35,
    },

    readOnly: {
        minHeight: 39,
        padding: "0 10px",
        display: "flex",
        alignItems: "center",
        border: "1px solid #E2E8F0",
        borderRadius: 5,
        background: "#F8FAFC",
        color: "#475569",
        fontSize: 13,
    },

    submit: {
        minHeight: 40,
        padding: "0 14px",
        border: 0,
        borderRadius: 5,
        background: "#2563EB",
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontWeight: 800,
        cursor: "pointer",
    },

    cancel: {
        height: 40,
        padding: "0 16px",
        border: "1px solid #CBD5E1",
        borderRadius: 5,
        background: "#FFFFFF",
        cursor: "pointer",
        fontWeight: 700,
    },

    modalActions: {
        gridColumn: "1 / -1",
        display: "flex",
        justifyContent: "flex-end",
        gap: 9,
        paddingTop: 6,
    },

    pagination: {
        minHeight: 52,
        padding: "8px 10px",
        borderTop: "1px solid #E2E8F0",
        display: "flex",
        alignItems: "center",
        gap: 7,
        background: "#FFFFFF",
    },

    pageMeta: {
        marginRight: "auto",
        color: "#64748B",
        fontSize: 10.5,
    },

    pageSize: {
        height: 32,
        border: "1px solid #CBD5E1",
        borderRadius: 5,
        background: "#FFFFFF",
        color: "#334155",
        fontSize: 11,
    },

    pageButton: {
        width: 32,
        height: 32,
        border: "1px solid #CBD5E1",
        borderRadius: 5,
        background: "#FFFFFF",
        color: "#334155",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
    },

    pageNumber: {
        minWidth: 20,
        textAlign: "center",
        color: "#1D4ED8",
        fontSize: 12,
    },

    searchInput: {
        width: "100%",
        minWidth: 0,
        border: 0,
        outline: 0,
        font: "inherit",
        fontSize: 12.5,
    },

    email: {
        display: "block",
        marginTop: 3,
        color: "#64748B",
        fontSize: 11.5,
    },

    activeBadge: {
        display: "inline-block",
        padding: "4px 7px",
        borderRadius: 4,
        background: "#DCFCE7",
        color: "#15803D",
        fontSize: 10.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
    },

    inactiveBadge: {
        display: "inline-block",
        padding: "4px 7px",
        borderRadius: 4,
        background: "#FEE2E2",
        color: "#B91C1C",
        fontSize: 10.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
    },

    empty: {
        padding: 32,
        textAlign: "center",
        color: "#64748B",
        fontSize: 13,
    },

    iconButton: {
        width: 34,
        height: 34,
        border: "1px solid #CBD5E1",
        borderRadius: 5,
        background: "#FFFFFF",
        color: "#2563EB",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
    },

    editButton: {
        height: 34,
        padding: "0 10px",
        border: "1px solid #BFDBFE",
        borderRadius: 5,
        background: "#EFF6FF",
        color: "#1D4ED8",
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        fontWeight: 700,
    },

    accessButton: {
        height: 34,
        padding: "0 10px",
        border: "1px solid #C7D2FE",
        borderRadius: 5,
        background: "#EEF2FF",
        color: "#4338CA",
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        fontWeight: 700,
    },

    deactivateButton: {
        height: 34,
        padding: "0 11px",
        border: "1px solid #FECACA",
        borderRadius: 5,
        background: "#FEF2F2",
        color: "#B91C1C",
        cursor: "pointer",
        fontWeight: 700,
    },

    activateButton: {
        height: 34,
        padding: "0 11px",
        border: "1px solid #BBF7D0",
        borderRadius: 5,
        background: "#F0FDF4",
        color: "#15803D",
        cursor: "pointer",
        fontWeight: 700,
    },

    changePassword: {
        minHeight: 39,
        padding: "0 12px",
        border: "1px solid #BFDBFE",
        borderRadius: 5,
        background: "#EFF6FF",
        color: "#1D4ED8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        cursor: "pointer",
        fontWeight: 700,
    },

    overlay: {
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15,23,42,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 20,
    },

    messageModal: {
        width: "min(400px, 100%)",
        display: "grid",
        gap: 14,
        padding: 20,
        background: "#FFFFFF",
        borderRadius: 7,
        boxShadow: "0 24px 60px rgba(15,23,42,0.24)",
        color: "#0F172A",
    },

    // Store access styles
    accessContent: {
        display: "grid",
        gap: 16,
        padding: 18,
    },

    accessGrant: {
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "end",
        gap: 10,
    },

    accessSectionHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "#0F172A",
        fontSize: 12,
        paddingBottom: 9,
        borderBottom: "1px solid #E2E8F0",
    },

    accessList: {
        display: "grid",
        gap: 8,
        maxHeight: 300,
        overflowY: "auto",
    },

    accessRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: 11,
        border: "1px solid #E2E8F0",
        borderRadius: 6,
        background: "#FFFFFF",
    },

    accessStoreInfo: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
    },

    accessStoreIcon: {
        width: 34,
        height: 34,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        borderRadius: 5,
        background: "#EFF6FF",
        color: "#2563EB",
    },

    accessRowActions: {
        display: "flex",
        alignItems: "center",
        gap: 9,
    },

    revokeButton: {
        height: 30,
        padding: "0 10px",
        border: "1px solid #FECACA",
        borderRadius: 5,
        background: "#FEF2F2",
        color: "#B91C1C",
        fontWeight: 700,
        cursor: "pointer",
    },

    accessNote: {
        padding: 10,
        borderRadius: 5,
        background: "#F8FAFC",
        color: "#64748B",
        fontSize: 11.5,
        lineHeight: 1.5,
    },

    accessFooter: {
        display: "flex",
        justifyContent: "flex-end",
        padding: 14,
        borderTop: "1px solid #E2E8F0",
    },
};

export default UsersPage;