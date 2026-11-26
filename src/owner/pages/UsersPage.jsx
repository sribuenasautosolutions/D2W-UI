import { useEffect, useMemo, useState } from "react";
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    KeyRound,
    Mail,
    Pencil,
    Phone,
    Plus,
    Search,
    ShieldCheck,
    UserRound,
    Users,
    X,
    CheckCircle2,
    XCircle,
    Check,
    LoaderCircle,
    Power,
    MoreVertical,
    Lock,
} from "lucide-react";
import api from "../../services/api";
import { normalizeRoleName, useAuth } from "../../auth/AuthContext";
import { getActiveStoresCached } from "../../services/storeService";
import toast from "react-hot-toast";

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
    return fieldErrors && typeof fieldErrors === "object" ? fieldErrors : {};
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

function normalizeRoleType(role = "", roleName = "") {
    const raw = `${roleName || ""} ${role || ""}`.toLowerCase();
    if (raw.includes("super admin") || raw.includes("super_admin") || raw.includes("admin")) {
        return "SUPER_ADMIN";
    }
    if (raw.includes("manager") || raw.includes("store_owner") || raw.includes("owner")) {
        return "STORE_MANAGER";
    }
    if (raw.includes("cashier") || raw.includes("billing") || raw.includes("staff")) {
        return "STORE_CASHIER";
    }
    if (raw.includes("sales") || raw.includes("salesperson")) {
        return "SALESPERSON";
    }
    if (raw.includes("procurement") || raw.includes("inventory")) {
        return "PROCUREMENT";
    }
    return "OTHER";
}

function getRoleBadge(role = "", roleName = "") {
    const norm = normalizeRoleType(role, roleName);
    switch (norm) {
        case "SUPER_ADMIN":
            return "bg-purple-50 text-purple-700 border-purple-200/80";
        case "STORE_MANAGER":
            return "bg-amber-50 text-amber-700 border-amber-200/80";
        case "STORE_CASHIER":
            return "bg-blue-50 text-blue-700 border-blue-200/80";
        case "SALESPERSON":
            return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
        case "PROCUREMENT":
            return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
        default:
            return "bg-slate-100 text-slate-700 border-slate-200/80";
    }
}

function getAvatarStyle(role = "", roleName = "") {
    const norm = normalizeRoleType(role, roleName);
    switch (norm) {
        case "SUPER_ADMIN":
            return "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xs";
        case "STORE_MANAGER":
            return "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-xs";
        case "STORE_CASHIER":
            return "bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-xs";
        case "SALESPERSON":
            return "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs";
        case "PROCUREMENT":
            return "bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xs";
        default:
            return "bg-gradient-to-tr from-slate-600 to-slate-700 text-white shadow-xs";
    }
}

function getRoleIcon(role = "", roleName = "") {
    const norm = normalizeRoleType(role, roleName);
    switch (norm) {
        case "SUPER_ADMIN":
            return ShieldCheck;
        case "STORE_MANAGER":
            return Building2;
        case "STORE_CASHIER":
            return KeyRound;
        case "SALESPERSON":
            return UserRound;
        case "PROCUREMENT":
            return Building2;
        default:
            return UserRound;
    }
}

function getRoleDisplay(role = "", roleName = "") {
    if (roleName && roleName.trim()) {
        return roleName.trim();
    }
    const norm = normalizeRoleType(role, roleName);
    switch (norm) {
        case "SUPER_ADMIN":
            return "Super Admin";
        case "STORE_MANAGER":
            return "Store Manager";
        case "STORE_CASHIER":
            return "Store Cashier";
        case "SALESPERSON":
            return "Salesperson";
        case "PROCUREMENT":
            return "Procurement";
        default:
            return roleLabel(role);
    }
}

function UsersPage() {
    const { user: currentUser, hasPermission, hasGlobalStoreManagementAuthority } = useAuth();
    const normalizedCurrentRole = normalizeRoleName(currentUser?.role);
    const isSuperAdmin = Boolean(hasGlobalStoreManagementAuthority?.()) || normalizedCurrentRole === "SUPER_ADMIN";
    const isStoreOwner = normalizedCurrentRole === "STORE_OWNER";
    const canCreateUser = isSuperAdmin || isStoreOwner || Boolean(hasPermission?.("EMPLOYEES.CREATE"));
    const canUpdateUser = isSuperAdmin || isStoreOwner || Boolean(hasPermission?.("EMPLOYEES.UPDATE"));
    const canManageStoreAccess = isSuperAdmin || Boolean(hasPermission?.("STORE_ACCESS.MANAGE"));
    const canAssignRoles = isSuperAdmin || isStoreOwner || Boolean(hasPermission?.("ROLES.ASSIGN"));

    const [users, setUsers] = useState([]);
    const [stores, setStores] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
    const [actionMenuUserId, setActionMenuUserId] = useState(null);

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

    // Close 3-dots menu on window click
    useEffect(() => {
        const handleOutsideClick = () => setActionMenuUserId(null);
        window.addEventListener("click", handleOutsideClick);
        return () => window.removeEventListener("click", handleOutsideClick);
    }, []);

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
        const data = Array.isArray(response.data) ? response.data : [];
        setUsers(data);
        setSelectedId((current) =>
            data.some((user) => user.id === current) ? current : null
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
                roleFilter === "ALL" || user.role === roleFilter;

            const matchesStore =
                storeFilter === "ALL" ||
                String(user.storeId || "") === storeFilter;

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" ? user.active : !user.active);

            return (
                matchesSearch &&
                matchesRole &&
                matchesStore &&
                matchesStatus
            );
        });
    }, [users, search, roleFilter, storeFilter, statusFilter]);

    const selectedUser = users.find((user) => user.id === selectedId) || null;

    const activeUsers = users.filter((user) => user.active).length;
    const ownerUsers = users.filter((user) => user.role === "STORE_OWNER").length;
    const cashierUsers = users.filter((user) => user.role === "CASHIER").length;

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const currentPage = Math.min(page, totalPages);

    const visibleUsers = filteredUsers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const openDetails = (user) => {
        setSelectedId(user.id);
        setDetailsDrawerOpen(true);
    };

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

            const msg = isSuperAdmin
                ? "User created successfully"
                : `${roleLabel(form.role)} created and assigned to your store`;
            setSuccess(msg);
            toast.success(msg);

            await loadUsers();
        } catch (requestError) {
            setCreateFieldErrors(apiFieldErrors(requestError));
            const msg = apiErrorMessage(requestError, "Unable to create user");
            setCreateError(msg);
            toast.error(msg);
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
            setEditError("New password and confirm password must match");
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
            toast.success("User updated successfully");

            await loadUsers();
        } catch (requestError) {
            setEditFieldErrors(apiFieldErrors(requestError));
            const msg = apiErrorMessage(requestError, "Unable to update user");
            setEditError(msg);
            toast.error(msg);
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
            await api.patch(`/users/${user.id}/status`, { active });
            const msg = `${user.name} ${active ? "activated" : "deactivated"} successfully`;
            toast.success(msg);
            await loadUsers();
        } catch (requestError) {
            const msg = apiErrorMessage(requestError, "Unable to update user status");
            toast.error(msg);
        }
    };

    // Store access
    const loadStoreAccess = async (userId) => {
        setAccessLoading(true);
        setAccessError("");

        try {
            const response = await api.get(`/access-control/users/${userId}/stores`);
            setAccessRecords(Array.isArray(response.data) ? response.data : []);
        } catch (requestError) {
            setAccessError(apiErrorMessage(requestError, "Unable to load store access"));
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
            await api.put(`/access-control/users/${accessUser.id}/stores/${accessStoreId}`);
            setAccessStoreId("");
            toast.success("Store access granted");
            await loadStoreAccess(accessUser.id);
        } catch (requestError) {
            setAccessError(apiErrorMessage(requestError, "Unable to grant store access"));
        } finally {
            setAccessSaving(false);
        }
    };

    const revokeStoreAccess = async (storeId) => {
        if (!accessUser) return;
        const confirmed = window.confirm("Revoke access to this store?");
        if (!confirmed) return;

        setAccessSaving(true);
        setAccessError("");

        try {
            await api.delete(`/access-control/users/${accessUser.id}/stores/${storeId}`);
            toast.success("Store access revoked");
            await loadStoreAccess(accessUser.id);
        } catch (requestError) {
            setAccessError(apiErrorMessage(requestError, "Unable to revoke store access"));
        } finally {
            setAccessSaving(false);
        }
    };

    const storeName = (storeId) => {
        const store = stores.find((item) => String(item.id) === String(storeId));
        return store?.storeName || `Store #${storeId}`;
    };

    const activeAccessStoreIds = new Set(
        accessRecords.filter((record) => record.active).map((record) => String(record.storeId))
    );

    // Configurable role assignments
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
                fetchedRoles.filter((r) => r.active && (isSuperAdmin || r.scope === "STORE"))
            );
            setAssignUserStores(Array.isArray(storesRes.data) ? storesRes.data : []);
        } catch (requestError) {
            setAssignError(apiErrorMessage(requestError, "Unable to load role assignments"));
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
            if (activeAssignedRoleIds.has(String(role.id))) {
                return false;
            }
            if (role.scope === "STORE") {
                return activeAssignStoreIds.has(String(role.storeId));
            }
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
                setAssignError("Employee does not have active store access for the selected store");
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
            toast.success("Role assigned successfully.");
            await loadRoleAssignmentData(assignUser.id);
        } catch (requestError) {
            setAssignError(apiErrorMessage(requestError, "Unable to assign role"));
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
            toast.success("Role assignment deactivated.");
            await loadRoleAssignmentData(assignUser.id);
        } catch (requestError) {
            setAssignError(apiErrorMessage(requestError, "Unable to deactivate assignment"));
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
            toast.success("Role assignment reactivated.");
            await loadRoleAssignmentData(assignUser.id);
        } catch (requestError) {
            setAssignError(apiErrorMessage(requestError, "Unable to reactivate assignment"));
        } finally {
            setAssignSaving(false);
        }
    };

    const roleMeta = (roleId) => {
        return allRoles.find((r) => String(r.id) === String(roleId)) || null;
    };

    const availableStores = stores.filter(
        (store) => !activeAccessStoreIds.has(String(store.id))
    );

    const kpiList = [
        {
            label: "Total Members",
            value: users.length,
            icon: Users,
            iconBg: "bg-indigo-50",
            iconColor: "text-indigo-600",
            accentBorder: "border-t-[3px] border-t-indigo-500",
        },
        {
            label: "Active Users",
            value: activeUsers,
            icon: CheckCircle2,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            accentBorder: "border-t-[3px] border-t-emerald-500",
        },
        {
            label: "Inactive Users",
            value: users.length - activeUsers,
            icon: XCircle,
            iconBg: "bg-rose-50",
            iconColor: "text-rose-600",
            accentBorder: "border-t-[3px] border-t-rose-500",
        },
        {
            label: "Store Owners",
            value: ownerUsers,
            icon: Building2,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
            accentBorder: "border-t-[3px] border-t-amber-500",
        },
        {
            label: "Cashiers & Staff",
            value: cashierUsers,
            icon: KeyRound,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            accentBorder: "border-t-[3px] border-t-blue-500",
        },
    ];

    const statusTabs = [
        { id: "ALL", label: "All Users", count: users.length },
        { id: "ACTIVE", label: "Active", count: activeUsers },
        { id: "INACTIVE", label: "Inactive", count: users.length - activeUsers },
    ];

    return (
        <div className="w-full max-w-[1580px] mx-auto px-4 sm:px-6 py-6 font-sans text-slate-800 antialiased bg-white min-h-screen">
            {/* -------------------------------------------------
                TOP HEADER:
                - TOP LEFT: USER MANAGEMENT HEADING
                - TOP RIGHT: ADD USER BUTTON (signature team indigo gradient pill)
            ------------------------------------------------- */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Organization / Users
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {isSuperAdmin ? "User Management" : "Store Employees"}
                    </h1>
                </div>

                {canCreateUser && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            className="create-role-btn"
                            onClick={openCreate}
                        >
                            <Plus size={16} />
                            <span>{isSuperAdmin ? "Add User" : "Add Employee"}</span>
                        </button>
                    </div>
                )}
            </header>

            {/* -------------------------------------------------
                BELOW HEADING: KPI CARDS (Compact metric cards with top accent strips)
            ------------------------------------------------- */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
                {kpiList.map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <div
                            key={kpi.label}
                            className={`kpi-metric-card group ${kpi.accentBorder}`}
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
                FEEDBACK BANNER (IF ANY)
            ------------------------------------------------- */}
            {(error || success) && !createOpen && !editUser && (
                <div
                    className={`mb-4 px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between ${
                        error
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                >
                    <span>{error || success}</span>
                    <button
                        type="button"
                        onClick={() => {
                            setError("");
                            setSuccess("");
                        }}
                        className="text-slate-400 hover:text-slate-600 ml-3"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* -------------------------------------------------
                MAIN SECTION:
                - ROLE SEGMENTED TAB BAR
                - ALL USERS TOOLBAR
                - TABLE WITH BOLD BLACK HEADERS & MINIMAL LIGHT BORDERS
            ------------------------------------------------- */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                {/* STATUS TABS (Pure white background, clean border underline, no box-shaped container) */}
                <div
                    style={{ background: "#ffffff", backgroundColor: "#ffffff" }}
                    className="flex items-center gap-6 border-b border-slate-200 px-4 sm:px-6 overflow-x-auto"
                >
                    {statusTabs.map((tab) => {
                        const isActive = statusFilter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(tab.id);
                                    setPage(1);
                                }}
                                style={{
                                    background: "transparent",
                                    backgroundColor: "transparent",
                                    borderTop: "none",
                                    borderLeft: "none",
                                    borderRight: "none",
                                    borderBottom: isActive ? "2px solid #4f46e5" : "2px solid transparent",
                                    outline: "none",
                                    boxShadow: "none",
                                }}
                                className={`user-tab-btn flex items-center gap-2 py-3 px-1 text-xs font-semibold -mb-px transition-all whitespace-nowrap cursor-pointer ${
                                    isActive
                                        ? "text-indigo-600 font-bold"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span
                                    style={{
                                        backgroundColor: isActive ? "#eef2ff" : "#f1f5f9",
                                        color: isActive ? "#4338ca" : "#64748b",
                                    }}
                                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                >
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* TOOLBAR */}
                <div className="p-4 sm:px-6 sm:py-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                            All Users
                        </h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/70">
                            {filteredUsers.length} records
                        </span>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                        {/* SEARCH BAR */}
                        <div className="relative w-full sm:w-72 md:w-80">
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
                                placeholder="Search by name, email, phone..."
                                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                            />
                        </div>

                        {/* ROLE FILTER */}
                        <select
                            aria-label="Filter by role"
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value);
                                setPage(1);
                            }}
                            className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer shadow-2xs"
                        >
                            <option value="ALL">All roles</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                            <option value="STORE_OWNER">Store Manager</option>
                            <option value="CASHIER">Store Cashier</option>
                            <option value="SALESPERSON">Salesperson</option>
                            <option value="PROCUREMENT">Procurement</option>
                        </select>

                        {/* STORE FILTER (SUPER ADMIN ONLY) */}
                        {isSuperAdmin && (
                            <select
                                aria-label="Filter by store"
                                value={storeFilter}
                                onChange={(e) => {
                                    setStoreFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer shadow-2xs max-w-[140px] truncate"
                            >
                                <option value="ALL">All stores</option>
                                {stores.map((store) => (
                                    <option key={store.id} value={String(store.id)}>
                                        {store.storeName}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* TABLE IN TABLE FORMAT (Row Click opens details drawer) */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200 bg-white text-black text-xs font-bold uppercase tracking-wider">
                                <th className="py-3 px-5 sm:px-6 text-black border-r border-slate-200/80">Team Member & Contact</th>
                                <th className="py-3 px-4 text-black border-r border-slate-200/80">Role & Access</th>
                                <th className="py-3 px-4 text-black border-r border-slate-200/80">Assigned Store</th>
                                <th className="py-3 px-4 text-black border-r border-slate-200/80">Account Status</th>
                                <th className="py-3 px-5 sm:px-6 text-black text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 text-sm font-medium">
                                        <div className="flex items-center justify-center gap-2">
                                            <LoaderCircle size={18} className="animate-spin text-indigo-600" />
                                            <span>Loading users...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : visibleUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 text-sm font-medium">
                                        No users found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                visibleUsers.map((user) => {
                                    const isSelected = selectedId === user.id && detailsDrawerOpen;
                                    const isMenuOpen = actionMenuUserId === user.id;

                                    return (
                                        <tr
                                            key={user.id}
                                            onClick={() => openDetails(user)}
                                            className={`transition-colors cursor-pointer group ${
                                                isSelected ? "bg-slate-50" : "hover:bg-slate-50/80"
                                            }`}
                                        >
                                            {/* USER & CONTACT */}
                                            <td className="py-3.5 px-5 sm:px-6 border-r border-slate-200/60">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-9 h-9 rounded-xl ${getAvatarStyle(
                                                            user.role,
                                                            user.roleName
                                                        )} font-bold text-xs flex items-center justify-center shrink-0 tracking-wide`}
                                                    >
                                                        {initials(user.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-slate-900 text-sm">
                                                            {user.name}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                            <span
                                                                title={user.email}
                                                                className="flex items-center gap-1.5 truncate max-w-[190px] sm:max-w-[240px]"
                                                            >
                                                                <Mail size={12} className="text-slate-400 shrink-0" />
                                                                <span className="truncate">{user.email}</span>
                                                            </span>
                                                            {user.phone && (
                                                                <>
                                                                    <span className="text-slate-300">·</span>
                                                                    <span className="font-mono text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
                                                                        <Phone size={11} className="text-slate-400 shrink-0" />
                                                                        <span>{user.phone}</span>
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* ROLE */}
                                            <td className="py-3.5 px-4 border-r border-slate-200/60">
                                                {(() => {
                                                    const RoleIcon = getRoleIcon(user.role, user.roleName);
                                                    return (
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getRoleBadge(
                                                                user.role,
                                                                user.roleName
                                                            )}`}
                                                        >
                                                            <RoleIcon size={12} strokeWidth={2.4} />
                                                            <span>{getRoleDisplay(user.role, user.roleName)}</span>
                                                        </span>
                                                    );
                                                })()}
                                            </td>

                                            {/* ASSIGNED STORE */}
                                            <td className="py-3.5 px-4 border-r border-slate-200/60">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200/80 text-slate-700">
                                                    <Building2 size={13} className="text-slate-400 shrink-0" />
                                                    <span>{user.storeName || "Organization"}</span>
                                                </div>
                                            </td>

                                            {/* STATUS */}
                                            <td className="py-3.5 px-4 border-r border-slate-200/60">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        user.active
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                                            : "bg-slate-100 text-slate-600 border border-slate-200/80"
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full ${
                                                            user.active ? "bg-emerald-500" : "bg-slate-400"
                                                        }`}
                                                    />
                                                    {user.active ? "Active" : "Inactive"}
                                                </span>
                                            </td>

                                            {/* 3-DOTS ACTION MENU */}
                                            <td
                                                className="py-3.5 px-4 sm:px-6 text-right relative"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    title="User options"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActionMenuUserId((prev) =>
                                                            prev === user.id ? null : user.id
                                                        );
                                                    }}
                                                    className="w-8 h-8 rounded-lg border-0 bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>

                                                {/* ACTION POPOVER MENU */}
                                                {isMenuOpen && (
                                                    <div
                                                        className="user-action-menu absolute right-4 top-11 z-30 text-left animate-in fade-in zoom-in-95 duration-150"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setActionMenuUserId(null);
                                                                openDetails(user);
                                                            }}
                                                            className="user-action-item text-slate-700"
                                                        >
                                                            <Eye size={15} className="text-slate-400" />
                                                            <span>View Details</span>
                                                        </button>

                                                        {canUpdateUser && (isSuperAdmin || !["SUPER_ADMIN", "STORE_OWNER"].includes(user.role)) && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setActionMenuUserId(null);
                                                                        openEdit(user);
                                                                    }}
                                                                    className="user-action-item text-blue-600 hover:text-blue-700"
                                                                >
                                                                    <Pencil size={15} />
                                                                    <span>Edit User</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setActionMenuUserId(null);
                                                                        changeUserStatus(user);
                                                                    }}
                                                                    className={`user-action-item ${
                                                                        user.active
                                                                            ? "text-amber-600 hover:text-amber-700"
                                                                            : "text-emerald-600 hover:text-emerald-700"
                                                                    }`}
                                                                >
                                                                    <Power size={15} />
                                                                    <span>{user.active ? "Deactivate" : "Activate"}</span>
                                                                </button>
                                                            </>
                                                        )}

                                                        {canManageStoreAccess && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActionMenuUserId(null);
                                                                    openStoreAccess(user);
                                                                }}
                                                                className="user-action-item text-indigo-600 hover:text-indigo-700"
                                                            >
                                                                <ShieldCheck size={15} />
                                                                <span>Store Access</span>
                                                            </button>
                                                        )}

                                                        {canAssignRoles && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActionMenuUserId(null);
                                                                    openRoleAssignments(user);
                                                                }}
                                                                className="user-action-item text-purple-600 hover:text-purple-700"
                                                            >
                                                                <KeyRound size={15} />
                                                                <span>Role Assignments</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* TABLE FOOTER / PAGINATION */}
                <div className="p-4 sm:px-6 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <div>
                        {filteredUsers.length
                            ? `${(currentPage - 1) * pageSize + 1}-${Math.min(
                                  currentPage * pageSize,
                                  filteredUsers.length
                              )} of ${filteredUsers.length} records`
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
                            className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                        >
                            <option value={5}>5 / page</option>
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                            <option value={50}>50 / page</option>
                        </select>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="px-2 font-semibold text-slate-800">
                                {currentPage}
                            </span>
                            <button
                                type="button"
                                disabled={currentPage === totalPages}
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
                USER DETAILS DRAWER (Slide-over from right)
            ------------------------------------------------- */}
            {detailsDrawerOpen && selectedUser && (
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
                        className="w-full max-w-xl lg:max-w-2xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 transition-all duration-300"
                    >
                        {/* DRAWER HEADER */}
                        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center shrink-0">
                                    {initials(selectedUser.name)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            {selectedUser.name}
                                        </h2>
                                        <span
                                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                                selectedUser.active ? "text-emerald-600" : "text-slate-500"
                                            }`}
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-full ${
                                                    selectedUser.active ? "bg-emerald-500" : "bg-slate-400"
                                                }`}
                                            />
                                            {selectedUser.active ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-500 mt-0.5 block">
                                        {selectedUser.email}
                                    </span>
                                </div>
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

                        {/* DRAWER CONTENT */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
                            {/* OVERVIEW DETAILS GRID */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                                        Email
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900 block truncate">
                                        {selectedUser.email || "—"}
                                    </span>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                                        Phone Number
                                    </span>
                                    <span className="text-sm font-semibold font-mono text-slate-900 block">
                                        {selectedUser.phone || "—"}
                                    </span>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                                        Primary Role
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900 block">
                                        {selectedUser.roleName || roleLabel(selectedUser.role)}
                                    </span>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                                        Assigned Store
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900 block">
                                        {selectedUser.storeName || "Organization"}
                                    </span>
                                </div>
                            </div>

                            {/* USER ACTIONS SECTION */}
                            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white space-y-3">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    Management Actions
                                </h3>
                                <div className="flex flex-wrap gap-2.5">
                                    {canUpdateUser && (isSuperAdmin || !["SUPER_ADMIN", "STORE_OWNER"].includes(selectedUser.role)) && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDetailsDrawerOpen(false);
                                                    openEdit(selectedUser);
                                                }}
                                                className="create-role-btn-secondary"
                                            >
                                                <Pencil size={15} />
                                                <span>Edit Information</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => changeUserStatus(selectedUser)}
                                                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                                                    selectedUser.active
                                                        ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                                        : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                                }`}
                                            >
                                                <Power size={14} className="inline mr-1.5" />
                                                <span>{selectedUser.active ? "Deactivate User" : "Activate User"}</span>
                                            </button>
                                        </>
                                    )}

                                    {canManageStoreAccess && (
                                        <button
                                            type="button"
                                            onClick={() => openStoreAccess(selectedUser)}
                                            className="px-4 py-2 rounded-full text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                        >
                                            <ShieldCheck size={14} className="inline mr-1.5" />
                                            <span>Manage Store Access</span>
                                        </button>
                                    )}

                                    {canAssignRoles && (
                                        <button
                                            type="button"
                                            onClick={() => openRoleAssignments(selectedUser)}
                                            className="px-4 py-2 rounded-full text-xs font-semibold border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                                        >
                                            <KeyRound size={14} className="inline mr-1.5" />
                                            <span>Role Assignments</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* DRAWER FOOTER */}
                        <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end shrink-0">
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
                CREATE USER DRAWER (Slide-over from right)
            ------------------------------------------------- */}
            {createOpen && (
                <div
                    role="presentation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeCreate();
                    }}
                    className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-2xl lg:max-w-3xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 transition-all duration-300"
                    >
                        {/* HEADER */}
                        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    {isSuperAdmin ? "Add User" : "Add Employee"}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Create login details and assign store access.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeCreate}
                                className="drawer-close-btn"
                                aria-label="Close drawer"
                            >
                                <X size={18} />
                            </button>
                        </header>

                        {/* BODY */}
                        <form
                            onSubmit={saveUser}
                            className="flex-1 flex flex-col overflow-hidden bg-white"
                            noValidate
                        >
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 bg-white">
                                {createError && (
                                    <div className="p-3.5 rounded-xl border text-xs font-medium bg-rose-50 text-rose-800 border-rose-200">
                                        {createError}
                                    </div>
                                )}

                                {/* ROW 1: FULL NAME & PHONE */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Full Name *
                                        </label>
                                        <input
                                            required
                                            minLength={2}
                                            maxLength={80}
                                            placeholder="Example: Rajesh Kumar"
                                            value={form.name}
                                            onChange={(e) => updateField("name", e.target.value)}
                                            className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ${
                                                createFieldErrors.name ? "border-rose-500! bg-rose-50/20" : ""
                                            }`}
                                        />
                                        {createFieldErrors.name && (
                                            <p className="text-xs text-rose-600 mt-1">{createFieldErrors.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Phone Number *
                                        </label>
                                        <input
                                            required
                                            inputMode="numeric"
                                            maxLength={10}
                                            placeholder="10 digit mobile"
                                            value={form.phone}
                                            onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, ""))}
                                            className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ${
                                                createFieldErrors.phone ? "border-rose-500! bg-rose-50/20" : ""
                                            }`}
                                        />
                                        {createFieldErrors.phone && (
                                            <p className="text-xs text-rose-600 mt-1">{createFieldErrors.phone}</p>
                                        )}
                                    </div>
                                </div>

                                {/* ROW 2: EMAIL & CONFIRM EMAIL */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Email *
                                        </label>
                                        <input
                                            required
                                            type="email"
                                            placeholder="user@example.com"
                                            value={form.email}
                                            onChange={(e) => updateField("email", e.target.value)}
                                            className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ${
                                                createFieldErrors.email ? "border-rose-500! bg-rose-50/20" : ""
                                            }`}
                                        />
                                        {createFieldErrors.email && (
                                            <p className="text-xs text-rose-600 mt-1">{createFieldErrors.email}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Confirm Email *
                                        </label>
                                        <input
                                            required
                                            type="email"
                                            placeholder="Repeat email address"
                                            value={form.confirmEmail}
                                            onChange={(e) => updateField("confirmEmail", e.target.value)}
                                            className="store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>

                                {/* ROW 3: PASSWORD */}
                                <div>
                                    <label className="block text-sm font-semibold text-black mb-1.5">
                                        Initial Password *
                                    </label>
                                    <div className="relative">
                                        <input
                                            required
                                            type={showCreatePassword ? "text" : "password"}
                                            minLength={8}
                                            maxLength={72}
                                            placeholder="Min 8 characters"
                                            value={form.password}
                                            onChange={(e) => updateField("password", e.target.value)}
                                            className="store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 pr-11"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCreatePassword((s) => !s)}
                                            className="password-eye-btn absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                        >
                                            {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* ROW 4: ROLE & ASSIGNED STORE */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Role *
                                        </label>
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
                                            className="store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 cursor-pointer"
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
                                                    No configurable roles loaded
                                                </option>
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Assigned Store
                                        </label>
                                        {isSuperAdmin && form.role !== "SUPER_ADMIN" ? (
                                            <select
                                                required
                                                value={form.storeId}
                                                onChange={(e) => updateField("storeId", e.target.value)}
                                                className="store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 cursor-pointer"
                                            >
                                                <option value="">Select store</option>
                                                {stores
                                                    .filter((s) => s.isActive !== false)
                                                    .map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.storeName}
                                                        </option>
                                                    ))}
                                            </select>
                                        ) : (
                                            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600">
                                                {isSuperAdmin ? "Global Organization" : currentUser?.storeName || "Current Store"}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* STICKY FOOTER */}
                            <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                                <button
                                    type="button"
                                    onClick={closeCreate}
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
                                    <span>{saving ? "Creating..." : "Create User"}</span>
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            {/* -------------------------------------------------
                EDIT USER DRAWER (Slide-over from right)
            ------------------------------------------------- */}
            {editUser && editForm && (
                <div
                    role="presentation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeEdit();
                    }}
                    className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-2xl lg:max-w-3xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 transition-all duration-300"
                    >
                        {/* HEADER */}
                        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Edit User
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {editUser.email}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeEdit}
                                className="drawer-close-btn"
                                aria-label="Close drawer"
                            >
                                <X size={18} />
                            </button>
                        </header>

                        {/* FORM */}
                        <form
                            onSubmit={saveEdit}
                            className="flex-1 flex flex-col overflow-hidden bg-white"
                            noValidate
                        >
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 bg-white">
                                {editError && (
                                    <div className="p-3.5 rounded-xl border text-xs font-medium bg-rose-50 text-rose-800 border-rose-200">
                                        {editError}
                                    </div>
                                )}

                                {/* ROW 1: NAME & PHONE */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Full Name *
                                        </label>
                                        <input
                                            required
                                            minLength={2}
                                            maxLength={80}
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 ${
                                                editFieldErrors.name ? "border-rose-500! bg-rose-50/20" : ""
                                            }`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Phone Number *
                                        </label>
                                        <input
                                            required
                                            inputMode="numeric"
                                            maxLength={10}
                                            value={editForm.phone}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    phone: e.target.value.replace(/\D/g, ""),
                                                })
                                            }
                                            className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 ${
                                                editFieldErrors.phone ? "border-rose-500! bg-rose-50/20" : ""
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* ROW 2: EMAIL & CONFIRM EMAIL */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Email *
                                        </label>
                                        <input
                                            required
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                            className={`store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 ${
                                                editFieldErrors.email ? "border-rose-500! bg-rose-50/20" : ""
                                            }`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Confirm Email *
                                        </label>
                                        <input
                                            required
                                            type="email"
                                            value={editForm.confirmEmail}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, confirmEmail: e.target.value })
                                            }
                                            className="store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
                                        />
                                    </div>
                                </div>

                                {/* CHANGE PASSWORD TOGGLE */}
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                                    {!changePassword ? (
                                        <button
                                            type="button"
                                            onClick={() => setChangePassword(true)}
                                            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                            <KeyRound size={16} />
                                            <span>Change User Password</span>
                                        </button>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Lock size={14} />
                                                    Set New Password
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setChangePassword(false)}
                                                    className="text-xs text-slate-500 hover:text-slate-700"
                                                >
                                                    Cancel Password Change
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                        New Password
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            required
                                                            type={showNewPassword ? "text" : "password"}
                                                            minLength={8}
                                                            maxLength={72}
                                                            placeholder="Min 8 characters"
                                                            value={editForm.newPassword}
                                                            onChange={(e) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    newPassword: e.target.value,
                                                                })
                                                            }
                                                            className="store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-sm pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowNewPassword((s) => !s)}
                                                            className="password-eye-btn absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                                        >
                                                            {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                        Confirm New Password
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            required
                                                            type={showConfirmPassword ? "text" : "password"}
                                                            minLength={8}
                                                            maxLength={72}
                                                            placeholder="Repeat password"
                                                            value={editForm.confirmPassword}
                                                            onChange={(e) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    confirmPassword: e.target.value,
                                                                })
                                                            }
                                                            className="store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-sm pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword((s) => !s)}
                                                            className="password-eye-btn absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                                        >
                                                            {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ROLE & ASSIGNED STORE */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Role *
                                        </label>
                                        <select
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
                                            className="store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 cursor-pointer"
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
                                                    No configurable roles loaded
                                                </option>
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1.5">
                                            Assigned Store
                                        </label>
                                        {isSuperAdmin && editForm.role !== "SUPER_ADMIN" ? (
                                            <select
                                                required
                                                value={editForm.storeId}
                                                onChange={(e) =>
                                                    setEditForm({ ...editForm, storeId: e.target.value })
                                                }
                                                className="store-input w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 cursor-pointer"
                                            >
                                                <option value="">Select store</option>
                                                {stores
                                                    .filter((s) => s.isActive !== false)
                                                    .map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.storeName}
                                                        </option>
                                                    ))}
                                            </select>
                                        ) : (
                                            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600">
                                                {isSuperAdmin ? "Global Organization" : currentUser?.storeName || "Current Store"}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* STICKY FOOTER */}
                            <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                                <button
                                    type="button"
                                    onClick={closeEdit}
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
                                    <span>{saving ? "Updating..." : "Update User"}</span>
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            {/* -------------------------------------------------
                MANAGE STORE ACCESS DRAWER / MODAL
            ------------------------------------------------- */}
            {accessOpen && accessUser && (
                <div
                    role="presentation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeStoreAccess();
                    }}
                    className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-xl lg:max-w-2xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 transition-all duration-300"
                    >
                        {/* HEADER */}
                        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Manage Store Access
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {accessUser.name} · {accessUser.email}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeStoreAccess}
                                className="drawer-close-btn"
                                aria-label="Close drawer"
                            >
                                <X size={18} />
                            </button>
                        </header>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
                            {accessError && (
                                <div className="p-3.5 rounded-xl border text-xs font-medium bg-rose-50 text-rose-800 border-rose-200">
                                    {accessError}
                                </div>
                            )}

                            {/* GRANT ACCESS CARD */}
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    Grant Store Access
                                </label>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={accessStoreId}
                                        onChange={(e) => setAccessStoreId(e.target.value)}
                                        disabled={accessLoading || accessSaving}
                                        className="store-input flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                                    >
                                        <option value="">Select a store to grant access</option>
                                        {availableStores.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.storeName}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        disabled={!accessStoreId || accessSaving || accessLoading}
                                        onClick={grantStoreAccess}
                                        className="create-role-btn text-xs py-2 px-4 h-9"
                                    >
                                        <Plus size={14} />
                                        <span>Grant</span>
                                    </button>
                                </div>
                            </div>

                            {/* ACCESS RECORDS LIST */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        Authorized Store Access Records
                                    </h3>
                                    <span className="text-xs text-slate-500">
                                        {accessRecords.length} records
                                    </span>
                                </div>

                                {accessLoading ? (
                                    <div className="py-8 text-center text-slate-400 text-xs">
                                        Loading store access...
                                    </div>
                                ) : accessRecords.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                                        No store access records found.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {accessRecords.map((record) => (
                                            <div
                                                key={record.id ?? `${record.userId}-${record.storeId}`}
                                                className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                        <Building2 size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-900">
                                                            {storeName(record.storeId)}
                                                        </div>
                                                        <span className="text-xs text-slate-500">
                                                            Authorized Access
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                                            record.active
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : "bg-slate-100 text-slate-600 border-slate-200"
                                                        }`}
                                                    >
                                                        {record.active ? "Active" : "Revoked"}
                                                    </span>

                                                    {record.active && (
                                                        <button
                                                            type="button"
                                                            disabled={accessSaving}
                                                            onClick={() => revokeStoreAccess(record.storeId)}
                                                            className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                                                        >
                                                            Revoke
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-slate-400 italic">
                                Note: Revoking store access does not delete the user account or alter their primary role.
                            </p>
                        </div>

                        {/* FOOTER */}
                        <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end shrink-0">
                            <button
                                type="button"
                                onClick={closeStoreAccess}
                                disabled={accessSaving}
                                className="create-role-btn-secondary"
                            >
                                Close
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* -------------------------------------------------
                MANAGE ROLE ASSIGNMENTS DRAWER / MODAL
            ------------------------------------------------- */}
            {assignOpen && assignUser && (
                <div
                    role="presentation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeRoleAssignments();
                    }}
                    className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-xl lg:max-w-2xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 transition-all duration-300"
                    >
                        {/* HEADER */}
                        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Manage Role Assignments
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {assignUser.name} · {assignUser.email}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeRoleAssignments}
                                className="drawer-close-btn"
                                aria-label="Close drawer"
                            >
                                <X size={18} />
                            </button>
                        </header>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
                            {assignError && (
                                <div className="p-3.5 rounded-xl border text-xs font-medium bg-rose-50 text-rose-800 border-rose-200">
                                    {assignError}
                                </div>
                            )}

                            {assignSuccess && (
                                <div className="p-3.5 rounded-xl border text-xs font-medium bg-emerald-50 text-emerald-800 border-emerald-200">
                                    {assignSuccess}
                                </div>
                            )}

                            {/* ASSIGN ROLE CARD */}
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    Assign Configurable Role
                                </label>
                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                    <select
                                        value={selectedRoleId}
                                        onChange={(e) => handleRoleSelectChange(e.target.value)}
                                        disabled={assignSaving || assignLoading}
                                        className="store-input flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
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
                                            disabled
                                            className="store-input w-40 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600"
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
                                        className="create-role-btn text-xs py-2 px-4 h-9"
                                    >
                                        <Plus size={14} />
                                        <span>Assign</span>
                                    </button>
                                </div>
                            </div>

                            {/* ASSIGNMENTS LIST */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        Assigned Roles
                                    </h3>
                                    <span className="text-xs text-slate-500">
                                        {assignments.length} assignments
                                    </span>
                                </div>

                                {assignLoading ? (
                                    <div className="py-8 text-center text-slate-400 text-xs">
                                        Loading role assignments...
                                    </div>
                                ) : assignments.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                                        No configurable role assignments found.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {assignments.map((assignment) => {
                                            const meta = roleMeta(assignment.roleId);

                                            return (
                                                <div
                                                    key={assignment.id}
                                                    className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                                            <KeyRound size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-900">
                                                                {meta?.name || "Configured Role"}
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-0.5">
                                                                <span>{assignment.storeId ? storeName(assignment.storeId) : "Global System"}</span>
                                                                {assignment.assignedAt && (
                                                                    <>
                                                                        <span className="text-slate-300 mx-1">·</span>
                                                                        <span>Assigned {String(assignment.assignedAt).slice(0, 10)}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                                                assignment.active
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                                            }`}
                                                        >
                                                            {assignment.active ? "Active" : "Inactive"}
                                                        </span>

                                                        {assignment.active ? (
                                                            <button
                                                                type="button"
                                                                disabled={assignSaving}
                                                                onClick={() => deactivateRoleAssignment(assignment.id)}
                                                                className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                                                            >
                                                                Deactivate
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                disabled={assignSaving}
                                                                onClick={() => reactivateRoleAssignment(assignment.id)}
                                                                className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
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
                            </div>

                            <p className="text-xs text-slate-400 italic">
                                STORE role assignments require active store access for the target store.
                            </p>
                        </div>

                        {/* FOOTER */}
                        <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end shrink-0">
                            <button
                                type="button"
                                onClick={closeRoleAssignments}
                                disabled={assignSaving}
                                className="create-role-btn-secondary"
                            >
                                Close
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* -------------------------------------------------
                GLOBAL & COMPONENT STYLES (MATCHING STORE MANAGEMENT)
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
                    background: linear-gradient(to right, #3730a3 0%, #4f46e5 100%) !important;
                    color: #ffffff !important;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 4px 14px -1px rgba(79, 70, 229, 0.4), 0 2px 6px -1px rgba(55, 48, 163, 0.2) !important;
                    transition: all 0.25s ease !important;
                    white-space: nowrap;
                }

                .create-role-btn:hover {
                    background: linear-gradient(to right, #312e81 0%, #4338ca 100%) !important;
                    box-shadow: 0 6px 20px -2px rgba(79, 70, 229, 0.5), 0 3px 8px -1px rgba(55, 48, 163, 0.3) !important;
                    transform: translateY(-1px);
                    color: #ffffff !important;
                }

                .create-role-btn-secondary {
                    min-width: 7.5em;
                    padding: 0 1.25em;
                    height: 2.9em;
                    border-radius: 30em;
                    font-size: 13.5px;
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
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .create-role-btn-secondary:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }

                .user-action-menu {
                    background: #ffffff !important;
                    border-radius: 16px !important;
                    box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.08) !important;
                    border: 1px solid #f1f5f9 !important;
                    padding: 6px !important;
                    min-width: 190px !important;
                }

                .user-action-item {
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

                .user-action-item:hover {
                    background: #f8fafc !important;
                }

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
                    box-shadow: 0 0 0 2px rgba(165, 180, 252, 0.35) !important;
                    border-color: #818cf8 !important;
                }

                .user-tab-btn {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    background: transparent !important;
                    background-color: transparent !important;
                    border-top: none !important;
                    border-left: none !important;
                    border-right: none !important;
                    outline: none !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                }

                .user-tab-btn:hover {
                    background: transparent !important;
                    background-color: transparent !important;
                }

                .user-tab-btn:focus,
                .user-tab-btn:focus-visible {
                    outline: none !important;
                    box-shadow: none !important;
                    border-top: none !important;
                    border-left: none !important;
                    border-right: none !important;
                }

                .password-eye-btn {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    border: none !important;
                    outline: none !important;
                    background: transparent !important;
                    box-shadow: none !important;
                    padding: 4px !important;
                    cursor: pointer !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

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

export default UsersPage;
