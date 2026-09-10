import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, CirclePlus, Eye, EyeOff, KeyRound, Mail, Pencil, Phone, Search, ShieldCheck, UserRound, X } from "lucide-react";
import api from "../../services/api";

const emptyForm = {
    name: "",
    email: "",
    confirmEmail: "",
    phone: "",
    password: "",
    role: "CASHIER",
    storeId: "",
};

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
}

function apiErrorMessage(error, fallback) {
    const data = error.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data?.message) return data.message;
    if (Array.isArray(data?.errors) && data.errors.length) return data.errors[0];
    return fallback;
}

function apiFieldErrors(error) {
    const data = error.response?.data;
    return data?.fieldErrors && typeof data.fieldErrors === "object"
        ? data.fieldErrors
        : {};
}

function UsersPage() {
    const currentUser = getStoredUser();
    const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
    const [users, setUsers] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [stores, setStores] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [storeFilter, setStoreFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [error, setError] = useState("");
    const [createError, setCreateError] = useState("");
    const [editError, setEditError] = useState("");
    const [createFieldErrors, setCreateFieldErrors] = useState({});
    const [editFieldErrors, setEditFieldErrors] = useState({});
    const [statusMessage, setStatusMessage] = useState(null);
    const [success, setSuccess] = useState("");
    const [editUser, setEditUser] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [changePassword, setChangePassword] = useState(false);
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const updateField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setCreateFieldErrors((current) => {
            if (!current[field]) return current;
            const next = { ...current };
            delete next[field];
            return next;
        });
    };

    const loadUsers = async () => {
        const response = await api.get("/users");
        const data = Array.isArray(response.data) ? response.data : [];
        setUsers(data);
        setSelectedId((current) =>
            data.some((user) => user.id === current) ? current : null
        );
    };

    useEffect(() => {
        const loadPage = async () => {
            setLoading(true);
            setError("");

            try {
                const requests = [loadUsers()];

                if (isSuperAdmin) {
                    requests.push(
                        api.get("/stores", { params: { page: 0, size: 100, active: true } }).then((response) => {
                            setStores(Array.isArray(response.data?.content) ? response.data.content : []);
                        })
                    );
                }

                await Promise.all(requests);
            } catch (requestError) {
                setError(
                    requestError.response?.data?.message ||
                    "Unable to load employees"
                );
            } finally {
                setLoading(false);
            }
        };

        loadPage();
    }, [isSuperAdmin]);

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();

        return users.filter((user) => {
            const matchesSearch = !query ||
                [user.name, user.email, user.phone, user.storeName, user.role]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(query));
            const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
            const matchesStore = storeFilter === "ALL" ||
                String(user.storeId || "") === storeFilter;
            const matchesStatus = statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" ? user.active : !user.active);

            return matchesSearch && matchesRole && matchesStore && matchesStatus;
        });
    }, [roleFilter, search, statusFilter, storeFilter, users]);
    const selectedUser = users.find((user) => user.id === selectedId) || null;
    const activeUsers = users.filter((user) => user.active).length;
    const ownerUsers = users.filter((user) => user.role === "STORE_OWNER").length;
    const cashierUsers = users.filter((user) => user.role === "CASHIER").length;
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const visibleUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const saveUser = async (event) => {
        event.preventDefault();
        setCreateError("");
        setCreateFieldErrors({});
        setSuccess("");

        if (form.email.trim().toLowerCase() !==
            form.confirmEmail.trim().toLowerCase()) {
            setCreateError("Email and confirm email must match");
            return;
        }

        if (isSuperAdmin &&
            form.role !== "SUPER_ADMIN" &&
            !form.storeId) {
            setCreateError("Select a store for the Store Owner or Cashier");
            return;
        }

        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone,
            password: form.password,
        };

        if (isSuperAdmin) {
            payload.role = form.role;

            if (form.role !== "SUPER_ADMIN") {
                payload.storeId = Number(form.storeId);
            }
        }

        setSaving(true);

        try {
            await api.post("/users", payload);
            setForm(emptyForm);
            setCreateOpen(false);
            setSuccess(
                isSuperAdmin
                    ? "User created successfully"
                    : "Cashier created and assigned to your store"
            );
            await loadUsers();
        } catch (requestError) {
            setCreateFieldErrors(apiFieldErrors(requestError));
            setCreateError(apiErrorMessage(requestError, "Unable to create user"));
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (user) => {
        setEditUser(user);
        setEditForm({
            name: user.name,
            email: user.email,
            confirmEmail: user.email,
            phone: user.phone,
            role: user.role,
            storeId: user.storeId || "",
            newPassword: "",
            confirmPassword: "",
            active: user.active,
        });
        setChangePassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setEditError("");
    };

    const saveEdit = async (event) => {
        event.preventDefault();
        if (editForm.email.trim().toLowerCase() !==
            editForm.confirmEmail.trim().toLowerCase()) {
            setEditError("Email and confirm email must match");
            return;
        }
        if (editForm.newPassword !== editForm.confirmPassword) {
            setEditError("New password and confirm password must match");
            return;
        }
        if (isSuperAdmin && editForm.role !== "SUPER_ADMIN" && !editForm.storeId) {
            setEditError("Select a store for this user");
            return;
        }

        const payload = {
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            phone: editForm.phone,
        };
        if (changePassword) {
            payload.newPassword = editForm.newPassword;
        }
        if (isSuperAdmin) {
            payload.role = editForm.role;
            if (editForm.role !== "SUPER_ADMIN") {
                payload.storeId = Number(editForm.storeId);
            }
        }

        setSaving(true);
        try {
            await api.put(`/users/${editUser.id}`, payload);
            setEditUser(null);
            setEditForm(null);
            setSuccess("User updated successfully");
            await loadUsers();
        } catch (requestError) {
            setEditError(apiErrorMessage(requestError, "Unable to update user"));
        } finally {
            setSaving(false);
        }
    };

    const changeUserStatus = async (user) => {
        const active = !user.active;
        if (!window.confirm(`${active ? "Activate" : "Deactivate"} ${user.name}?`)) return;

        try {
            await api.patch(`/users/${user.id}/status`, { active });
            setStatusMessage({
                type: "success",
                text: `${user.name} ${active ? "activated" : "deactivated"} successfully`,
            });
            await loadUsers();
        } catch (requestError) {
            setStatusMessage({
                type: "error",
                text: apiErrorMessage(requestError, "Unable to update user status"),
            });
        }
    };

    return (
        <div style={S.page}>
            <div style={S.pageHeader}>
                <div>
                    <span style={S.breadcrumb}>Organization / Users</span>
                    <h1 style={S.title}>
                        {isSuperAdmin ? "User Management" : "Store Employees"}
                    </h1>
                </div>
                <label style={S.headerSearch}>
                    <Search size={18} color="#64748B" />
                    <input value={search}
                        onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                        placeholder="Search users by name, email, phone, role or store"
                        style={S.searchInput} />
                </label>
                <div style={S.headerActions}>
                    <button type="button" style={S.addButton}
                        onClick={() => {
                            setForm(emptyForm);
                            setCreateError("");
                            setCreateFieldErrors({});
                            setSuccess("");
                            setShowCreatePassword(false);
                            setCreateOpen(true);
                        }}>
                        <CirclePlus size={17} />
                        {isSuperAdmin ? "Add User" : "Add Cashier"}
                    </button>
                </div>
            </div>

            {(error || success) && !createOpen && !editUser && (
                <div style={error ? S.error : S.success}>
                    {error || success}
                </div>
            )}

            <div style={S.stats}>
                <Stat label="Total Users" value={users.length} />
                <Stat label="Active Users" value={activeUsers} color="#15803D" />
                <Stat label="Inactive Users" value={users.length - activeUsers} color="#B91C1C" />
                <Stat label="Store Owners" value={ownerUsers} color="#7C3AED" />
                <Stat label="Cashiers" value={cashierUsers} color="#0369A1" />
            </div>

            {createOpen && (
                <div style={S.overlay}>
                    <section style={S.createModal}>
                        <div style={S.modalHeader}>
                            <div>
                                <h2 style={S.panelTitle}>
                                    {isSuperAdmin ? "Add User" : "Add Cashier"}
                                </h2>
                                <span style={S.listMeta}>
                                    Create login details and assign access
                                </span>
                            </div>
                            <button type="button" style={S.iconButton}
                                onClick={() => setCreateOpen(false)} title="Close">
                                <X size={17} />
                            </button>
                        </div>
                        {createError && <div style={S.modalError}>{createError}</div>}

                        <form onSubmit={saveUser} style={S.createForm}>
                        <Field label="Full name" error={createFieldErrors.name}>
                            <input
                                required
                                minLength={2}
                                maxLength={80}
                                value={form.name}
                                onChange={(event) =>
                                    updateField("name", event.target.value)}
                                style={S.input}
                            />
                        </Field>

                        <Field label="Email" error={createFieldErrors.email}>
                            <input
                                required
                                type="email"
                                value={form.email}
                                onChange={(event) =>
                                    updateField("email", event.target.value)}
                                style={S.input}
                            />
                        </Field>

                        <Field label="Confirm email">
                            <input
                                required
                                type="email"
                                value={form.confirmEmail}
                                onChange={(event) =>
                                    updateField("confirmEmail", event.target.value)}
                                style={S.input}
                            />
                        </Field>

                        <Field label="Phone number" error={createFieldErrors.phone}>
                            <input
                                required
                                inputMode="numeric"
                                pattern="[0-9]{10}"
                                maxLength={10}
                                value={form.phone}
                                onChange={(event) =>
                                    updateField(
                                        "phone",
                                        event.target.value.replace(/\D/g, "")
                                    )}
                                style={S.input}
                            />
                        </Field>

                        <Field label="Password">
                            <div style={S.passwordWrap}>
                                <input
                                    required
                                    type={showCreatePassword ? "text" : "password"}
                                    minLength={8}
                                    maxLength={72}
                                    value={form.password}
                                    onChange={(event) =>
                                        updateField("password", event.target.value)}
                                    style={{ ...S.input, paddingRight: 42 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCreatePassword((current) => !current)}
                                    style={S.passwordButton}
                                    title={showCreatePassword ? "Hide password" : "Show password"}
                                    aria-label={showCreatePassword ? "Hide password" : "Show password"}
                                >
                                    {showCreatePassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </Field>

                        {isSuperAdmin && (
                            <Field label="Role">
                                <select
                                    value={form.role}
                                    onChange={(event) => {
                                        updateField("role", event.target.value);

                                        if (event.target.value === "SUPER_ADMIN") {
                                            updateField("storeId", "");
                                        }
                                    }}
                                    style={S.input}
                                >
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                    <option value="STORE_OWNER">Store Owner</option>
                                    <option value="CASHIER">Cashier</option>
                                </select>
                            </Field>
                        )}

                        {isSuperAdmin && form.role !== "SUPER_ADMIN" && (
                            <Field label="Assigned store">
                                <select
                                    required
                                    value={form.storeId}
                                    onChange={(event) =>
                                        updateField("storeId", event.target.value)}
                                    style={S.input}
                                >
                                    <option value="">Select store</option>
                                    {stores
                                        .filter((store) => store.isActive !== false)
                                        .map((store) => (
                                            <option key={store.id} value={store.id}>
                                                {store.storeName}
                                            </option>
                                        ))}
                                </select>
                            </Field>
                        )}

                        {!isSuperAdmin && (
                            <Field label="Assigned store">
                                <div style={S.readOnly}>
                                    {currentUser?.storeName || "Store not assigned"}
                                </div>
                            </Field>
                        )}

                            <div style={S.modalActions}>
                                <button type="button" onClick={() => setCreateOpen(false)}
                                    style={S.cancel}>Cancel</button>
                                <button disabled={saving} type="submit" style={S.submit}>
                                    <CirclePlus size={17} />
                                    {saving ? "Creating..." : "Create User"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            <div style={{ ...S.workspace, gridTemplateColumns: selectedUser ? "35fr 65fr" : "1fr" }}>
                <section style={S.listPanel}>
                    <div style={S.userFilters}>
                        <div style={S.listCaption}>
                            <strong>All Users</strong>
                            <span>{filteredUsers.length} records</span>
                        </div>
                        <div style={S.filterGrid}>
                            <select aria-label="Filter by role" value={roleFilter}
                                onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }}
                                style={S.filterSelect}>
                                <option value="ALL">All roles</option>
                                <option value="SUPER_ADMIN">Super Admin</option>
                                <option value="STORE_OWNER">Store Owner</option>
                                <option value="CASHIER">Cashier</option>
                            </select>
                            {isSuperAdmin && (
                                <select aria-label="Filter by store" value={storeFilter}
                                    onChange={(event) => { setStoreFilter(event.target.value); setPage(1); }}
                                    style={S.filterSelect}>
                                    <option value="ALL">All stores</option>
                                    {stores.map((store) => (
                                        <option key={store.id} value={String(store.id)}>
                                            {store.storeName}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <select aria-label="Filter by status" value={statusFilter}
                                onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
                                style={S.filterSelect}>
                                <option value="ALL">All status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div style={S.tableHeader}><span>User</span><span>Role / Store</span><span>Status</span></div>
                    <div style={S.userList}>
                        {!loading && visibleUsers.map((user) => (
                            <button key={user.id} type="button"
                                onClick={() => setSelectedId(user.id)}
                                style={{ ...S.userRow, ...(selectedId === user.id ? S.selectedRow : {}) }}>
                                <div style={S.userText}>
                                    <strong>{user.name}</strong>
                                    <span>{user.email}</span>
                                </div>
                                <span style={S.userAssignment}>{roleLabel(user.role)}<small>{user.storeName || "Organization"}</small></span>
                                <span style={user.active ? S.activeBadge : S.inactiveBadge}>
                                    {user.active ? "Active" : "Inactive"}
                                </span>
                            </button>
                        ))}
                        {loading && <div style={S.empty}>Loading users...</div>}
                        {!loading && filteredUsers.length === 0 && <div style={S.empty}>No users found</div>}
                    </div>
                    <Pagination page={currentPage} totalPages={totalPages} pageSize={pageSize}
                        total={filteredUsers.length} onPage={setPage}
                        onPageSize={(size) => { setPageSize(size); setPage(1); }} />
                </section>

                {selectedUser && <section style={S.detailsPanel}>
                    {selectedUser ? (
                        <>
                            <div style={S.detailHeader}>
                                <div style={S.identity}>
                                    <div style={S.largeAvatar}>{initials(selectedUser.name)}</div>
                                    <div>
                                        <div style={S.nameLine}>
                                            <h2 style={S.detailTitle}>{selectedUser.name}</h2>
                                            <span style={selectedUser.active ? S.activeBadge : S.inactiveBadge}>
                                                {selectedUser.active ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                        <span style={S.email}>{selectedUser.email}</span>
                                    </div>
                                </div>
                                {(isSuperAdmin || selectedUser.role === "CASHIER") && (
                                    <div style={S.userActions}>
                                        <button type="button" onClick={() => setSelectedId(null)} style={S.editButton}>Back to table</button>
                                        <button type="button" onClick={() => openEdit(selectedUser)}
                                            style={S.editButton}>
                                            <Pencil size={15} /> Edit
                                        </button>
                                        <button type="button" onClick={() => changeUserStatus(selectedUser)}
                                            style={selectedUser.active ? S.deactivateButton : S.activateButton}>
                                            {selectedUser.active ? "Deactivate" : "Activate"}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div style={S.detailGrid}>
                                <Detail icon={<Mail size={17} />} label="Email" value={selectedUser.email} />
                                <Detail icon={<Phone size={17} />} label="Phone" value={selectedUser.phone} />
                                <Detail icon={<ShieldCheck size={17} />} label="Role" value={roleLabel(selectedUser.role)} />
                                <Detail icon={<Building2 size={17} />} label="Assigned Store"
                                    value={selectedUser.storeName || "Organization"} />
                                <Detail icon={<UserRound size={17} />} label="Account Status"
                                    value={selectedUser.active ? "Active" : "Inactive"} />
                            </div>
                        </>
                    ) : <div style={S.empty}>Select a user to view details</div>}
                </section>}
            </div>

            {editUser && editForm && (
                <div style={S.overlay}>
                    <div style={S.modal}>
                        <div style={S.modalHeader}>
                            <div>
                                <h2 style={S.panelTitle}>Edit User</h2>
                                <span style={S.listMeta}>{editUser.email}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditUser(null)}
                                style={S.iconButton}
                                title="Close"
                            >
                                <X size={17} />
                            </button>
                        </div>
                        {editError && <div style={S.modalError}>{editError}</div>}
                        <form onSubmit={saveEdit} style={S.modalForm}>
                            <Field label="Full name">
                                <input required style={S.input} value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                            </Field>
                            <Field label="Email">
                                <input required type="email" style={S.input} value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                            </Field>
                            <Field label="Confirm email">
                                <input required type="email" style={S.input} value={editForm.confirmEmail}
                                    onChange={(e) => setEditForm({ ...editForm, confirmEmail: e.target.value })} />
                            </Field>
                            <Field label="Phone">
                                <input required inputMode="numeric" maxLength={10} style={S.input}
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, "") })} />
                            </Field>
                            {!changePassword && (
                                <button
                                    type="button"
                                    onClick={() => setChangePassword(true)}
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
                                                type={showNewPassword ? "text" : "password"}
                                                minLength={8}
                                                maxLength={72}
                                                style={{ ...S.input, paddingRight: 42 }}
                                                value={editForm.newPassword}
                                                onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword((current) => !current)}
                                                style={S.passwordButton}
                                                title={showNewPassword ? "Hide password" : "Show password"}
                                                aria-label={showNewPassword ? "Hide password" : "Show password"}
                                            >
                                                {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                            </button>
                                        </div>
                                    </Field>
                                    <Field label="Confirm new password">
                                        <div style={S.passwordWrap}>
                                            <input
                                                required
                                                type={showConfirmPassword ? "text" : "password"}
                                                minLength={8}
                                                maxLength={72}
                                                style={{ ...S.input, paddingRight: 42 }}
                                                value={editForm.confirmPassword}
                                                onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword((current) => !current)}
                                                style={S.passwordButton}
                                                title={showConfirmPassword ? "Hide password" : "Show password"}
                                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                            >
                                                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                            </button>
                                        </div>
                                    </Field>
                                </>
                            )}
                            {isSuperAdmin && (
                                <Field label="Role">
                                    <select style={S.input} value={editForm.role}
                                        onChange={(e) => setEditForm({
                                            ...editForm,
                                            role: e.target.value,
                                            storeId: e.target.value === "SUPER_ADMIN" ? "" : editForm.storeId,
                                        })}>
                                        <option value="SUPER_ADMIN">Super Admin</option>
                                        <option value="STORE_OWNER">Store Owner</option>
                                        <option value="CASHIER">Cashier</option>
                                    </select>
                                </Field>
                            )}
                            {isSuperAdmin && editForm.role !== "SUPER_ADMIN" && (
                                <Field label="Assigned store">
                                    <select required style={S.input} value={editForm.storeId}
                                        onChange={(e) => setEditForm({ ...editForm, storeId: e.target.value })}>
                                        <option value="">Select store</option>
                                        {stores.filter((store) => store.isActive !== false).map((store) => (
                                            <option key={store.id} value={store.id}>{store.storeName}</option>
                                        ))}
                                    </select>
                                </Field>
                            )}
                            <div style={S.modalActions}>
                                <button type="button" onClick={() => setEditUser(null)} style={S.cancel}>Cancel</button>
                                <button disabled={saving} type="submit" style={S.submit}>
                                    {saving ? "Updating..." : "Update User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {statusMessage && (
                <div style={S.overlay}>
                    <div style={S.messageModal}>
                        <strong>{statusMessage.type === "error" ? "Unable to update status" : "Status updated"}</strong>
                        <span>{statusMessage.text}</span>
                        <button type="button" onClick={() => setStatusMessage(null)} style={S.submit}>OK</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <label style={S.field}>
            <span style={S.label}>{label}</span>
            {children}
            {error && <span style={S.fieldError}>{error}</span>}
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
                <strong style={S.detailValue}>{value || "-"}</strong>
            </div>
        </div>
    );
}

function Pagination({ page, totalPages, pageSize, total, onPage, onPageSize }) {
    return (
        <div style={S.pagination}>
            <span style={S.pageMeta}>
                {total ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}` : "0 records"}
            </span>
            <select aria-label="Rows per page" value={pageSize}
                onChange={(e) => onPageSize(Number(e.target.value))} style={S.pageSize}>
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
            </select>
            <button type="button" title="Previous page" disabled={page === 1}
                onClick={() => onPage(page - 1)} style={S.pageButton}>
                <ChevronLeft size={16} />
            </button>
            <strong style={S.pageNumber}>{page}</strong>
            <button type="button" title="Next page" disabled={page === totalPages}
                onClick={() => onPage(page + 1)} style={S.pageButton}>
                <ChevronRight size={16} />
            </button>
        </div>
    );
}

function initials(name = "") {
    return name.split(/\s+/).filter(Boolean).slice(0, 2)
        .map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function roleLabel(role) {
    return {
        SUPER_ADMIN: "Super Admin",
        STORE_OWNER: "Store Owner",
        CASHIER: "Cashier",
    }[role] || role;
}

const S = {
    page: { display: "grid", gap: 12 },
    pageHeader: {
        display: "grid", gridTemplateColumns: "minmax(220px, auto) minmax(280px, 1fr) auto",
        alignItems: "center", gap: 16,
    },
    breadcrumb: {
        display: "block", marginBottom: 4, color: "#64748B",
        fontSize: 10.5, fontWeight: 700,
    },
    title: { margin: 0, fontSize: 21, letterSpacing: 0 },
    subtitle: { margin: "5px 0 0", color: "#64748B", fontSize: 13 },
    headerSearch: {
        height: 40, display: "flex", alignItems: "center", gap: 9,
        padding: "0 12px", border: "1px solid #CBD5E1", borderRadius: 6,
        background: "#FFFFFF", boxShadow: "0 1px 2px rgba(15,23,42,.04)",
    },
    count: {
        display: "flex", alignItems: "center", gap: 7, minHeight: 40,
        padding: "0 12px", border: "1px solid #E2E8F0", borderRadius: 6,
        background: "#FFFFFF", color: "#475569", fontSize: 12,
    },
    headerActions: { display: "flex", alignItems: "center", gap: 10 },
    addButton: {
        height: 40, padding: "0 14px", border: 0, borderRadius: 5,
        background: "#2563EB", color: "#FFFFFF", display: "flex",
        alignItems: "center", gap: 7, fontWeight: 800, cursor: "pointer",
    },
    error: {
        border: "1px solid #FECACA", background: "#FEF2F2", color: "#B91C1C",
        borderRadius: 6, padding: "10px 12px", fontSize: 13,
    },
    success: {
        border: "1px solid #BBF7D0", background: "#F0FDF4", color: "#15803D",
        borderRadius: 6, padding: "10px 12px", fontSize: 13,
    },
    stats: {
        display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        gap: 9,
    },
    stat: {
        minHeight: 42, padding: "0 13px", border: "1px solid #E2E8F0", borderRadius: 6,
        background: "#FFFFFF", display: "flex", justifyContent: "space-between",
        alignItems: "center", color: "#64748B", fontSize: 11.5,
        boxShadow: "0 1px 2px rgba(15,23,42,.03)",
    },
    workspace: {
        display: "grid", gridTemplateColumns: "35fr 65fr",
        gap: 14, alignItems: "stretch",
        height: "clamp(440px, calc(100vh - 270px), 620px)", minHeight: 0,
    },
    formPanel: {
        background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 7,
        overflow: "hidden",
    },
    listPanel: {
        minWidth: 0, background: "#FFFFFF", border: "1px solid #E2E8F0",
        borderRadius: 7, overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 2px 7px rgba(15,23,42,.04)",
    },
    userFilters: {
        display: "grid", gap: 9, padding: 11, borderBottom: "1px solid #E2E8F0",
    },
    listCaption: {
        display: "flex", justifyContent: "space-between", alignItems: "center",
        color: "#0F172A", fontSize: 12,
    },
    filterGrid: {
        display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 8,
    },
    userList: { overflowY: "auto", flex: 1, minHeight: 0 },
    tableHeader: { display: "grid", gridTemplateColumns: "2fr 1fr 100px", gap: 12, padding: "9px 14px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", color: "#64748B", fontSize: 10, fontWeight: 800, textTransform: "uppercase" },
    userRow: {
        width: "100%", minHeight: 66, padding: "10px 14px", border: 0,
        borderBottom: "1px solid #F1F5F9", background: "#FFFFFF",
        display: "grid", gridTemplateColumns: "2fr 1fr 100px", alignItems: "center", gap: 12, textAlign: "left",
        cursor: "pointer",
    },
    selectedRow: { background: "#EFF6FF", boxShadow: "inset 3px 0 #2563EB" },
    avatar: {
        width: 38, height: 38, flexShrink: 0, borderRadius: "50%",
        display: "grid", placeItems: "center", background: "#DBEAFE",
        color: "#1D4ED8", fontSize: 12, fontWeight: 800,
    },
    largeAvatar: {
        width: 48, height: 48, flexShrink: 0, borderRadius: "50%",
        display: "grid", placeItems: "center", background: "#DBEAFE",
        color: "#1D4ED8", fontSize: 15, fontWeight: 800,
    },
    userText: {
        display: "grid", gap: 4, minWidth: 0, flex: 1, color: "#0F172A",
        fontSize: 13,
    },
    userAssignment: { display: "grid", gap: 3, color: "#334155", fontSize: 12 },
    detailsPanel: {
        minWidth: 0, background: "#FFFFFF", border: "1px solid #E2E8F0",
        borderRadius: 7, overflow: "hidden", alignSelf: "start",
        boxShadow: "0 2px 7px rgba(15,23,42,.04)",
    },
    detailHeader: {
        minHeight: 68, padding: "12px 16px", borderBottom: "1px solid #E2E8F0",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
    },
    identity: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
    nameLine: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
    detailTitle: { margin: 0, color: "#0F172A", fontSize: 18, letterSpacing: 0 },
    detailGrid: {
        display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 1, background: "#E2E8F0",
    },
    tabs: {
        height: 42, padding: "0 12px", display: "flex", alignItems: "end",
        gap: 2, borderBottom: "1px solid #E2E8F0", overflowX: "auto",
        background: "#FFFFFF",
    },
    tab: {
        height: 41, padding: "0 11px", border: 0, borderBottom: "2px solid transparent",
        background: "transparent", color: "#64748B", fontSize: 11.5,
        fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
    },
    activeTab: {
        height: 41, padding: "0 11px", border: 0, borderBottom: "2px solid #2563EB",
        background: "transparent", color: "#1D4ED8", fontSize: 11.5,
        fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap",
    },
    tabEmpty: {
        minHeight: 130, padding: 24, display: "grid", placeContent: "center",
        gap: 6, textAlign: "center", color: "#64748B", fontSize: 12,
    },
    detailItem: {
        minHeight: 82, padding: "13px 14px", background: "#FFFFFF",
        display: "flex", alignItems: "center", gap: 12,
    },
    detailIcon: {
        width: 32, height: 32, borderRadius: 5, display: "grid",
        placeItems: "center", background: "#EFF6FF", color: "#2563EB",
        flexShrink: 0,
    },
    detailLabel: {
        display: "block", marginBottom: 5, color: "#64748B",
        fontSize: 10.5, fontWeight: 700,
    },
    detailValue: {
        display: "block", color: "#0F172A", fontSize: 12.5,
        overflowWrap: "anywhere",
    },
    panelHeader: {
        display: "flex", alignItems: "center", gap: 9, padding: "15px 16px",
        borderBottom: "1px solid #E2E8F0", color: "#1D4ED8",
    },
    panelTitle: { margin: 0, color: "#0F172A", fontSize: 15, letterSpacing: 0 },
    form: { display: "grid", gap: 13, padding: 16 },
    createModal: {
        width: "min(720px, 100%)", maxHeight: "90vh", overflowY: "auto",
        background: "#FFFFFF", borderRadius: 7,
        boxShadow: "0 24px 60px rgba(15,23,42,0.24)",
    },
    createForm: {
        display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14, padding: 18,
    },
    modalError: {
        margin: "14px 18px 0", border: "1px solid #FECACA",
        background: "#FEF2F2", color: "#B91C1C", borderRadius: 5,
        padding: "10px 12px", fontSize: 13,
    },
    field: { display: "grid", gap: 6 },
    label: { color: "#334155", fontSize: 12, fontWeight: 700 },
    input: {
        width: "100%", height: 39, padding: "0 10px", border: "1px solid #CBD5E1",
        borderRadius: 5, background: "#FFFFFF", color: "#0F172A",
        font: "inherit", fontSize: 13, boxSizing: "border-box",
    },
    passwordWrap: {
        position: "relative", width: "100%",
    },
    passwordButton: {
        position: "absolute", right: 1, top: 1, width: 38, height: 37,
        border: 0, background: "transparent", color: "#64748B",
        display: "grid", placeItems: "center", cursor: "pointer",
    },
    fieldError: {
        color: "#B91C1C", fontSize: 11.5, lineHeight: 1.35,
    },
    readOnly: {
        minHeight: 39, padding: "0 10px", display: "flex", alignItems: "center",
        border: "1px solid #E2E8F0", borderRadius: 5, background: "#F8FAFC",
        color: "#475569", fontSize: 13,
    },
    submit: {
        height: 40, border: 0, borderRadius: 5, background: "#2563EB",
        color: "#FFFFFF", display: "flex", alignItems: "center",
        justifyContent: "center", gap: 8, fontWeight: 800, cursor: "pointer",
    },
    listToolbar: {
        minHeight: 66, padding: "12px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 14, borderBottom: "1px solid #E2E8F0",
        flexWrap: "wrap",
    },
    listMeta: { display: "block", marginTop: 3, color: "#64748B", fontSize: 11 },
    search: {
        width: "auto", height: 36, display: "flex", alignItems: "center", gap: 8,
        padding: "0 10px", border: "1px solid #CBD5E1", borderRadius: 5,
    },
    toolbarControls: {
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        gap: 8, flexWrap: "wrap",
    },
    filterIcon: {
        width: 36, height: 36, display: "grid", placeItems: "center",
        border: "1px solid #CBD5E1", borderRadius: 5, color: "#475569",
        background: "#F8FAFC",
    },
    filterSelect: {
        width: "100%", height: 36, minWidth: 0, padding: "0 28px 0 9px",
        border: "1px solid #CBD5E1", borderRadius: 5, background: "#FFFFFF",
        color: "#334155", font: "inherit", fontSize: 12,
    },
    pagination: {
        minHeight: 52, padding: "8px 10px", borderTop: "1px solid #E2E8F0",
        display: "flex", alignItems: "center", gap: 7, background: "#FFFFFF",
    },
    pageMeta: { marginRight: "auto", color: "#64748B", fontSize: 10.5 },
    pageSize: {
        height: 32, border: "1px solid #CBD5E1", borderRadius: 5,
        background: "#FFFFFF", color: "#334155", fontSize: 11,
    },
    pageButton: {
        width: 32, height: 32, border: "1px solid #CBD5E1", borderRadius: 5,
        background: "#FFFFFF", color: "#334155", display: "grid",
        placeItems: "center", cursor: "pointer",
    },
    pageNumber: { minWidth: 20, textAlign: "center", color: "#1D4ED8", fontSize: 12 },
    searchInput: {
        width: "100%", minWidth: 0, border: 0, outline: 0, font: "inherit",
        fontSize: 12.5,
    },
    tableWrap: { overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
    th: {
        padding: "11px 13px", background: "#F8FAFC", color: "#64748B",
        textAlign: "left", fontSize: 10.5, textTransform: "uppercase",
        letterSpacing: "0.6px", borderBottom: "1px solid #E2E8F0",
    },
    td: { padding: "12px 13px", borderBottom: "1px solid #F1F5F9", color: "#334155" },
    userName: { display: "block", color: "#0F172A", fontSize: 13 },
    email: { display: "block", marginTop: 3, color: "#64748B", fontSize: 11.5 },
    activeBadge: {
        display: "inline-block", padding: "4px 7px", borderRadius: 4,
        background: "#DCFCE7", color: "#15803D", fontSize: 10.5, fontWeight: 700,
    },
    inactiveBadge: {
        display: "inline-block", padding: "4px 7px", borderRadius: 4,
        background: "#FEE2E2", color: "#B91C1C", fontSize: 10.5, fontWeight: 700,
    },
    empty: { padding: 32, textAlign: "center", color: "#64748B", fontSize: 13 },
    iconButton: {
        width: 34, height: 34, border: "1px solid #CBD5E1", borderRadius: 5,
        background: "#FFFFFF", color: "#2563EB", display: "grid", placeItems: "center",
        cursor: "pointer",
    },
    editButton: {
        height: 34, padding: "0 10px", border: "1px solid #BFDBFE", borderRadius: 5,
        background: "#EFF6FF", color: "#1D4ED8", display: "flex", alignItems: "center",
        gap: 6, cursor: "pointer", fontWeight: 700,
    },
    userActions: { display: "flex", alignItems: "center", gap: 8 },
    deactivateButton: {
        height: 34, padding: "0 11px", border: "1px solid #FECACA", borderRadius: 5,
        background: "#FEF2F2", color: "#B91C1C", cursor: "pointer", fontWeight: 700,
    },
    activateButton: {
        height: 34, padding: "0 11px", border: "1px solid #BBF7D0", borderRadius: 5,
        background: "#F0FDF4", color: "#15803D", cursor: "pointer", fontWeight: 700,
    },
    changePassword: {
        height: 39, padding: "0 12px", border: "1px solid #BFDBFE", borderRadius: 5,
        background: "#EFF6FF", color: "#1D4ED8", display: "flex", alignItems: "center",
        justifyContent: "center", gap: 7, cursor: "pointer", fontWeight: 700,
    },
    overlay: {
        position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,0.55)",
        display: "grid", placeItems: "center", padding: 20,
    },
    modal: {
        width: "min(680px, 100%)", maxHeight: "90vh", overflowY: "auto",
        background: "#FFFFFF", borderRadius: 7, boxShadow: "0 24px 60px rgba(15,23,42,0.24)",
    },
    messageModal: {
        width: "min(400px, 100%)", display: "grid", gap: 14, padding: 20,
        background: "#FFFFFF", borderRadius: 7, boxShadow: "0 24px 60px rgba(15,23,42,0.24)",
        color: "#0F172A",
    },
    modalHeader: {
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: 16, borderBottom: "1px solid #E2E8F0",
    },
    modalForm: {
        display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14, padding: 16,
    },
    statusToggle: {
        display: "flex", alignItems: "center", gap: 8, fontSize: 13,
        color: "#334155", fontWeight: 700,
    },
    statusField: { display: "grid", gap: 6 },
    segmented: {
        height: 39, display: "grid", gridTemplateColumns: "1fr 1fr",
        border: "1px solid #CBD5E1", borderRadius: 5, overflow: "hidden",
    },
    segment: { border: 0, background: "#FFFFFF", color: "#64748B", cursor: "pointer" },
    segmentActive: { border: 0, background: "#DCFCE7", color: "#15803D", fontWeight: 800, cursor: "pointer" },
    segmentInactive: { border: 0, background: "#FEE2E2", color: "#B91C1C", fontWeight: 800, cursor: "pointer" },
    modalActions: {
        gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 9,
        paddingTop: 6,
    },
    cancel: {
        height: 40, padding: "0 16px", border: "1px solid #CBD5E1",
        borderRadius: 5, background: "#FFFFFF", cursor: "pointer", fontWeight: 700,
    },
};

export default UsersPage;
