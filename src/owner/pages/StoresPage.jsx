import { useEffect, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    MapPin,
    Pencil,
    Plus,
    Search,
    X
} from "lucide-react";
import api from "../../services/api";


const COLORS = {
    ink: "#16283B",
    inkSoft: "#5B6B79",
    navy: "#15304D",
    navyDeep: "#0B2038",
    brass: "#A9791F",
    brassSoft: "#F6EEDC",
    hairline: "#E1E6EA",
    hairlineSoft: "#EDF1F3",
    slateFill: "#F7F9FA",
    paper: "#FFFFFF",
    canvas: "#EEF1F4",
    danger: "#A93131",
    dangerSoft: "#FBEBEB",
    success: "#1E7145",
    successSoft: "#E9F5EE",
};

const FONT_DISPLAY = "'Space Grotesk', 'Segoe UI', sans-serif";
const FONT_BODY = "'Inter', 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'Consolas', monospace";


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
        warehouse: 0
    });

    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(emptyStore);
    const [saving, setSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [showInitialPassword, setShowInitialPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [message, setMessage] = useState({
        type: "",
        text: ""
    });

    const [activeTab, setActiveTab] = useState("Overview");


    /*
     * ---------------------------------------------------------
     * LOAD STORES
     * ---------------------------------------------------------
     */

    const loadStores = async () => {

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

        const returnedTotalPages =
            Math.max(1, response.data?.totalPages || 1);

        setTotalElements(
            response.data?.totalElements || 0
        );

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

        setSelectedId((current) =>
            data.some((store) => store.id === current)
                ? current
                : null
        );
    };


    /*
     * ---------------------------------------------------------
     * FETCH PINCODE DETAILS
     * ---------------------------------------------------------
     *
     * User enters 6 digit pincode
     *
     * React
     *    ↓
     * GET /pincode/{pincode}
     *    ↓
     * Spring Boot PincodeController
     *    ↓
     * PincodeService
     *    ↓
     * External Pincode API
     *    ↓
     * district + state
     *
     */

    const fetchPincodeDetails = async (pincode) => {

        // Only call API when exactly 6 digits are entered
        if (!/^\d{6}$/.test(pincode)) {
            return;
        }

        try {

           const response = await api.get(`/api/pincode/${pincode}`);

            /*
             * Backend response expected:
             *
             * {
             *     "district": "Medak",
             *     "state": "Telangana"
             * }
             */

            updateField(
                "district",
                response.data?.district || ""
            );

            updateField(
                "state",
                response.data?.state || ""
            );

        } catch (error) {

            // Do not clear existing district/state when pincode lookup fails.
            // This prevents existing store address data from disappearing.
            setFieldErrors((current) => ({
                ...current,
                pincode: "Unable to verify this pincode",
                district: "District could not be fetched",
                state: "State could not be fetched",
            }));

            setMessage({
                type: "error",
                text:
                    error.response?.data?.message ||
                    "Unable to fetch pincode details. Please check the pincode and try again.",
            });
        }
    };


    /*
     * ---------------------------------------------------------
     * LOAD STORES WHEN SEARCH / PAGE / FILTER CHANGES
     * ---------------------------------------------------------
     */

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {

        const timer = window.setTimeout(async () => {

            try {

                await loadStores();

            } catch (error) {

                setMessage({
                    type: "error",
                    text:
                        error.response?.data?.message ||
                        "Unable to load stores",
                });
            }

        }, 250);

        return () => window.clearTimeout(timer);

    }, [
        page,
        pageSize,
        search,
        statusFilter
    ]);


    const selected =
        stores.find(
            (store) => store.id === selectedId
        ) || null;

    const currentPage =
        Math.min(page, totalPages);


    /*
     * ---------------------------------------------------------
     * CREATE STORE
     * ---------------------------------------------------------
     */

    const openCreate = () => {

        setForm({
            ...emptyStore
        });

        setModal("create");
        setFieldErrors({});
        setShowInitialPassword(false);
        setShowConfirmPassword(false);

        setMessage({
            type: "",
            text: ""
        });
    };


    /*
     * ---------------------------------------------------------
     * EDIT STORE
     * ---------------------------------------------------------
     */

    const openEdit = () => {

        if (!selected) {
            return;
        }

        setForm({

            storeName: selected.storeName || "",

            storeCode: selected.storeCode || "",

            ownerName: selected.ownerName || "",

            phone: selected.phone || "",

            email: selected.email || "",

            ownerPassword: "",

            confirmOwnerPassword: "",

            address: selected.address || "",

            district: selected.district || "",

            state: selected.state || "",

            country: "India",

            pincode: selected.pincode || "",

            storeType:
                selected.storeType || "MAIN_STORE",

            gstno: selected.gstno || "",
        });

        setModal("edit");
        setFieldErrors({});
        setShowInitialPassword(false);
        setShowConfirmPassword(false);

        setMessage({
            type: "",
            text: ""
        });
    };


    /*
     * ---------------------------------------------------------
     * UPDATE FORM FIELD
     * ---------------------------------------------------------
     */

    const updateField = (field, value) => {

        setForm((current) => ({
            ...current,
            [field]: value
        }));

        setFieldErrors((current) => ({
            ...current,
            [field]: ""
        }));
    };


    /*
     * ---------------------------------------------------------
     * SAVE STORE
     * ---------------------------------------------------------
     */

    const saveStore = async (event) => {

        event.preventDefault();

        setSaving(true);

        setMessage({
            type: "",
            text: ""
        });
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

            /*
             * Country is always India
             */
            country: "India",
        };


        /*
         * Store code is generated by backend.
         */
        delete payload.storeCode;


        try {

            /*
             * CREATE
             */
            if (modal === "create") {

                await api.post(
                    "/stores",
                    payload
                );

            }

            /*
             * UPDATE
             */
            else {

                /*
                 * Country should not be sent
                 * during update.
                 */
                delete payload.country;

                /*
                 * Password fields are not part
                 * of update request.
                 */
                delete payload.ownerPassword;

                delete payload.confirmOwnerPassword;

                await api.put(
                    `/stores/${selected.id}`,
                    payload
                );
            }


            setModal(null);

            setMessage({
                type: "success",
                text:
                    modal === "create"
                        ? "Store created successfully"
                        : "Store updated successfully",
            });


            await loadStores();

        } catch (error) {

            const data = error.response?.data;

            setFieldErrors(data?.fieldErrors || {});

            const errorMessages = Array.isArray(data?.errors)
                ? data.errors.filter(Boolean)
                : [];

            setMessage({
                type: "error",
                text:
                    errorMessages.length > 0
                        ? errorMessages.join(" • ")
                        : data?.message || "Unable to save store",
            });

        } finally {

            setSaving(false);
        }
    };


    /*
     * ---------------------------------------------------------
     * ACTIVATE / DEACTIVATE STORE
     * ---------------------------------------------------------
     */

    const toggleStatus = async () => {

        if (!selected) {
            return;
        }

        const active =
            selected.isActive === false;

        if (
            !window.confirm(
                `${active ? "Activate" : "Deactivate"} ${selected.storeName}?`
            )
        ) {
            return;
        }

        try {

            await api.patch(
                `/stores/${selected.id}/status`,
                { active }
            );

            setMessage({
                type: "success",
                text:
                    `Store ${active ? "activated" : "deactivated"}`
            });

            await loadStores();

        } catch (error) {

            setMessage({
                type: "error",
                text:
                    error.response?.data?.message ||
                    "Unable to update status",
            });
        }
    };


    return (

        <div style={S.page}>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
            `}</style>


            {/* -------------------------------------------------
                HEADER
            ------------------------------------------------- */}

            <div style={S.header}>

                <div>

                    <span style={S.breadcrumb}>
                        Organization / Stores
                    </span>

                    <h1 style={S.title}>
                        Store Management
                    </h1>

                </div>


                <label style={S.headerSearch}>

                    <Search
                        size={17}
                        color={COLORS.inkSoft}
                    />

                    <input
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search stores by name, code, district or owner"
                        style={S.searchInput}
                    />

                </label>


                <button
                    type="button"
                    onClick={openCreate}
                    style={S.primary}
                >

                    <Plus size={16} />

                    Add Store

                </button>

            </div>


            {/* -------------------------------------------------
                MESSAGE
            ------------------------------------------------- */}

            {message.text && !modal && (

                <div
                    style={
                        message.type === "error"
                            ? S.error
                            : S.success
                    }
                >
                    {message.text}
                </div>

            )}


            {/* -------------------------------------------------
                STATS
            ------------------------------------------------- */}

            <div style={S.stats}>

                <Stat
                    label="Total Stores"
                    value={
                        summary.active +
                        summary.inactive
                    }
                />

                <Stat
                    label="Active Stores"
                    value={summary.active}
                    color={COLORS.success}
                />

                <Stat
                    label="Inactive Stores"
                    value={summary.inactive}
                    color={COLORS.danger}
                />

                <Stat
                    label="Main Stores"
                    value={summary.main}
                    color={COLORS.brass}
                />

                <Stat
                    label="Warehouses"
                    value={summary.warehouse}
                    color={COLORS.navy}
                />

            </div>


            {/* -------------------------------------------------
                WORKSPACE
            ------------------------------------------------- */}

            <div
                style={{
                    ...S.workspace,
                    gridTemplateColumns:
                        selected
                            ? "35fr 65fr"
                            : "1fr"
                }}
            >


                {/* -------------------------------------------------
                    STORE LIST
                ------------------------------------------------- */}

                <section style={S.list}>

                    <div style={S.listTools}>

                        <div style={S.listCaption}>

                            <strong>
                                All Stores
                            </strong>

                            <span>
                                {totalElements} records
                            </span>

                        </div>


                        <select
                            aria-label="Filter stores by status"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(
                                    e.target.value
                                );
                                setPage(1);
                            }}
                            style={S.filterSelect}
                        >

                            <option value="ALL">
                                All status
                            </option>

                            <option value="ACTIVE">
                                Active
                            </option>

                            <option value="INACTIVE">
                                Inactive
                            </option>

                        </select>

                    </div>


                    <div style={S.tableHeader}>

                        <span>
                            Store
                        </span>

                        <span>
                            Code / District
                        </span>

                        <span>
                            Status
                        </span>

                    </div>


                    <div style={S.storeList}>

                        {stores.map((store) => (

                            <button
                                key={store.id}
                                type="button"
                                onClick={() => {
                                    setSelectedId(
                                        store.id
                                    );
                                    setActiveTab(
                                        "Overview"
                                    );
                                }}
                                style={{
                                    ...S.storeRow,
                                    ...(selectedId === store.id
                                        ? S.selectedRow
                                        : {})
                                }}
                            >

                                <div style={S.storeText}>

                                    <strong>
                                        {store.storeName}
                                    </strong>

                                    <span>
                                        {store.ownerName ||
                                            "No owner"}
                                    </span>

                                </div>


                                <span
                                    style={S.storeLocation}
                                >

                                    {store.storeCode}

                                    <small>
                                        {store.district || "-"}
                                    </small>

                                </span>


                                <span
                                    style={
                                        store.isActive === false
                                            ? S.inactive
                                            : S.active
                                    }
                                >

                                    {store.isActive === false
                                        ? "Inactive"
                                        : "Active"}

                                </span>

                            </button>

                        ))}


                        {stores.length === 0 && (

                            <div style={S.empty}>
                                No stores found
                            </div>

                        )}

                    </div>


                    <Pagination
                        page={currentPage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        total={totalElements}
                        onPage={setPage}
                        onPageSize={(size) => {
                            setPageSize(size);
                            setPage(1);
                        }}
                    />

                </section>


                {/* -------------------------------------------------
                    STORE DETAILS
                ------------------------------------------------- */}

                {selected && (

                    <section style={S.details}>

                        <div style={S.detailHeader}>

                            <div>

                                <div style={S.nameLine}>

                                    <h2
                                        style={S.detailTitle}
                                    >
                                        {selected.storeName}
                                    </h2>

                                    <span
                                        style={
                                            selected.isActive === false
                                                ? S.inactive
                                                : S.active
                                        }
                                    >
                                        {selected.isActive === false
                                            ? "Inactive"
                                            : "Active"}
                                    </span>

                                </div>


                                <span style={S.code}>
                                    {selected.storeCode}
                                </span>

                            </div>


                            <div style={S.actions}>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedId(null)
                                    }
                                    style={S.secondary}
                                >
                                    Back to table
                                </button>


                                <button
                                    type="button"
                                    onClick={openEdit}
                                    style={S.secondary}
                                >

                                    <Pencil size={14} />

                                    Edit

                                </button>


                                <button
                                    type="button"
                                    onClick={toggleStatus}
                                    style={
                                        selected.isActive === false
                                            ? S.activate
                                            : S.deactivate
                                    }
                                >

                                    {selected.isActive === false
                                        ? "Activate"
                                        : "Deactivate"}

                                </button>

                            </div>

                        </div>


                        <Tabs
                            active={activeTab}
                            onChange={setActiveTab}
                            items={["Overview"]}
                        />


                        {activeTab === "Overview" ? (

                            <>

                                <div style={S.detailGrid}>

                                    <Info
                                        label="Store Owner"
                                        value={
                                            selected.ownerName
                                        }
                                    />

                                    <Info
                                        label="GSTIN"
                                        value={selected.gstno}
                                        mono
                                    />

                                    <Info
                                        label="Owner Email"
                                        value={selected.email}
                                    />

                                    <Info
                                        label="Phone"
                                        value={selected.phone}
                                        mono
                                    />

                                    <Info
                                        label="Store Type"
                                        value={
                                            selected.storeType
                                                ?.replaceAll(
                                                    "_",
                                                    " "
                                                )
                                        }
                                    />

                                    <Info
                                        label="Country"
                                        value="India"
                                    />

                                </div>


                                <div style={S.address}>

                                    <MapPin
                                        size={16}
                                        color={COLORS.brass}
                                    />

                                    <div>

                                        <span
                                            style={S.infoLabel}
                                        >
                                            Full Address
                                        </span>


                                        <strong
                                            style={
                                                S.addressText
                                            }
                                        >

                                            {[
                                                selected.address,
                                                selected.district,
                                                selected.state,
                                                selected.pincode,
                                                "India"
                                            ]
                                                .filter(Boolean)
                                                .join(", ")}

                                        </strong>

                                    </div>

                                </div>

                            </>

                        ) : (

                            <div style={S.tabEmpty}>

                                <strong>
                                    {activeTab}
                                </strong>

                                <span>
                                    No{" "}
                                    {activeTab.toLowerCase()}
                                    data is available for this store.
                                </span>

                            </div>

                        )}

                    </section>

                )}

            </div>


            {/* -------------------------------------------------
                CREATE / EDIT MODAL
            ------------------------------------------------- */}

            {modal && (

                <div style={S.overlay}>

                    <div style={S.modal}>

                        <div style={S.modalHeader}>

                            <div>

                                <h2
                                    style={S.detailTitle}
                                >
                                    {modal === "create"
                                        ? "Create Store"
                                        : "Edit Store"}
                                </h2>

                                <span
                                    style={S.modalSubtitle}
                                >

                                    {modal === "create"
                                        ? "Add store identity, owner contact and address"
                                        : `Update ${form.storeName}`}

                                </span>

                            </div>


                            <button
                                type="button"
                                onClick={() =>
                                    setModal(null)
                                }
                                style={S.iconButton}
                            >
                                <X size={17} />
                            </button>

                        </div>


                        {message.text && (

                            <div
                                style={
                                    message.type === "error"
                                        ? S.modalError
                                        : S.modalSuccess
                                }
                            >
                                {message.text}
                            </div>

                        )}


                        <form
                            onSubmit={saveStore}
                            style={S.form}
                            noValidate
                        >


                            {/* STORE NAME */}

                            <Field
                                label="Store Name"
                                placeholder="Example: Hyderabad Store"
                                value={form.storeName}
                                error={fieldErrors.storeName}
                                onChange={(v) =>
                                    updateField(
                                        "storeName",
                                        v
                                    )
                                }
                            />


                            {/* STORE CODE */}

                            {modal === "create" && (

                                <ReadOnly
                                    label="Store Code"
                                    value={storeCodePreview(
                                        form.storeName
                                    )}
                                />

                            )}


                            {modal === "edit" && (

                                <ReadOnly
                                    label="Store Code"
                                    value={form.storeCode}
                                />

                            )}


                            {/* OWNER */}

                            <Field
                                label="Store Owner"
                                placeholder="Example: Ravi Kumar"
                                value={form.ownerName}
                                error={fieldErrors.ownerName}
                                onChange={(v) =>
                                    updateField(
                                        "ownerName",
                                        v
                                    )
                                }
                            />


                            {/* EMAIL */}

                            <Field
                                label="Owner Email"
                                type="email"
                                placeholder="Example: ravi@gmail.com"
                                value={form.email}
                                error={fieldErrors.email}
                                onChange={(v) =>
                                    updateField(
                                        "email",
                                        v
                                    )
                                }
                            />


                            {/* PASSWORD */}

                            {modal === "create" && (

                                <>

                                    <div style={S.passwordField}>

                                        <Field
                                            label="Initial Password"
                                            type={
                                                showInitialPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Minimum 8 characters"
                                            value={form.ownerPassword}
                                            error={fieldErrors.ownerPassword}
                                            onChange={(v) =>
                                                updateField(
                                                    "ownerPassword",
                                                    v
                                                )
                                            }
                                        />

                                        <button
                                            type="button"
                                            style={S.passwordToggle}
                                            onClick={() =>
                                                setShowInitialPassword(
                                                    (current) => !current
                                                )
                                            }
                                        >
                                            {showInitialPassword
                                                ? "Hide"
                                                : "Show"}
                                        </button>

                                    </div>


                                    <div style={S.passwordField}>

                                        <Field
                                            label="Confirm Password"
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Enter password again"
                                            value={
                                                form.confirmOwnerPassword
                                            }
                                            error={
                                                fieldErrors.confirmOwnerPassword
                                            }
                                            onChange={(v) =>
                                                updateField(
                                                    "confirmOwnerPassword",
                                                    v
                                                )
                                            }
                                        />

                                        <button
                                            type="button"
                                            style={S.passwordToggle}
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    (current) => !current
                                                )
                                            }
                                        >
                                            {showConfirmPassword
                                                ? "Hide"
                                                : "Show"}
                                        </button>

                                    </div>

                                </>

                            )}


                            {/* PHONE */}

                            <Field
                                label="Phone"
                                placeholder="Example: 9876543210"
                                value={form.phone}
                                maxLength={10}
                                error={fieldErrors.phone}
                                inputMode="numeric"
                                onChange={(v) =>
                                    updateField(
                                        "phone",
                                        v.replace(
                                            /\D/g,
                                            ""
                                        )
                                    )
                                }
                            />


                            {/* GSTIN */}

                            <Field
                                label="GSTIN"
                                placeholder="15 letters and numbers"
                                value={form.gstno}
                                maxLength={15}
                                error={fieldErrors.gstno}
                                pattern="[A-Za-z0-9]{15}"
                                title="GSTIN must be exactly 15 letters and numbers without spaces or special characters"
                                onChange={(v) =>
                                    updateField(
                                        "gstno",
                                        v
                                            .replace(
                                                /[^A-Za-z0-9]/g,
                                                ""
                                            )
                                            .toUpperCase()
                                    )
                                }
                            />


                            {/* ADDRESS */}

                            <Field
                                label="Address"
                                placeholder="Example: 12-3 Main Road, Hanamkonda"
                                value={form.address}
                                error={fieldErrors.address}
                                onChange={(v) =>
                                    updateField(
                                        "address",
                                        v
                                    )
                                }
                            />


                            {/* PINCODE */}

                            <Field
                                label="Pincode"
                                placeholder="Enter 6-digit pincode"
                                value={form.pincode}
                                maxLength={6}
                                inputMode="numeric"
                                error={fieldErrors.pincode}
                                onChange={(v) => {

                                    const pincode =
                                        v
                                            .replace(
                                                /\D/g,
                                                ""
                                            )
                                            .slice(
                                                0,
                                                6
                                            );

                                    updateField(
                                        "pincode",
                                        pincode
                                    );

                                    if (
                                        pincode.length ===
                                        6
                                    ) {

                                        fetchPincodeDetails(
                                            pincode
                                        );
                                    }
                                }}
                            />


                            {/* DISTRICT */}

                            <Field
                                label="District"
                                placeholder="Automatically fetched from pincode"
                                value={form.district}
                                readOnly
                                error={fieldErrors.district}
                            />


                            {/* STATE */}

                            <Field
                                label="State"
                                placeholder="Automatically fetched from pincode"
                                value={form.state}
                                readOnly
                                error={fieldErrors.state}
                            />


                            {/* COUNTRY */}

                            <ReadOnly
                                label="Country"
                                value="India"
                            />


                            {/* STORE TYPE */}

                            <label style={S.field}>

                                <span
                                    style={S.infoLabel}
                                >
                                    Store Type
                                </span>


                                <select
                                    style={{
                                        ...S.input,
                                        ...(fieldErrors.storeType
                                            ? S.inputError
                                            : {})
                                    }}
                                    value={
                                        form.storeType
                                    }
                                    onChange={(e) =>
                                        updateField(
                                            "storeType",
                                            e.target.value
                                        )
                                    }
                                >

                                    <option value="MAIN_STORE">
                                        Main Store
                                    </option>

                                    <option value="WAREHOUSE">
                                        Warehouse
                                    </option>

                                </select>

                                {fieldErrors.storeType && (
                                    <span style={S.fieldError}>
                                        {fieldErrors.storeType}
                                    </span>
                                )}

                            </label>


                            {/* ACTIONS */}

                            <div style={S.modalActions}>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setModal(null)
                                    }
                                    style={S.secondary}
                                >
                                    Cancel
                                </button>


                                <button
                                    disabled={saving}
                                    type="submit"
                                    style={S.primary}
                                >

                                    {saving
                                        ? "Saving…"
                                        : modal === "create"
                                            ? "Create Store"
                                            : "Update Store"}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}


/*
 * ---------------------------------------------------------
 * STAT COMPONENT
 * ---------------------------------------------------------
 */

function Stat({
    label,
    value,
    color = COLORS.navy
}) {

    return (

        <div style={S.stat}>

            <span>
                {label}
            </span>

            <strong
                style={{ color }}
            >
                {value}
            </strong>

        </div>
    );
}


/*
 * ---------------------------------------------------------
 * INFO COMPONENT
 * ---------------------------------------------------------
 */

function Info({
    label,
    value,
    mono
}) {

    return (

        <div style={S.info}>

            <span style={S.infoLabel}>
                {label}
            </span>

            <strong
                style={
                    mono
                        ? {
                            fontFamily: FONT_MONO,
                            fontWeight: 600
                        }
                        : undefined
                }
            >
                {value || "—"}
            </strong>

        </div>
    );
}


/*
 * ---------------------------------------------------------
 * TABS
 * ---------------------------------------------------------
 */

function Tabs({
    active,
    onChange,
    items
}) {

    return (

        <div style={S.tabs}>

            {items.map((item) => (

                <button
                    key={item}
                    type="button"
                    onClick={() =>
                        onChange(item)
                    }
                    style={
                        active === item
                            ? S.activeTab
                            : S.tab
                    }
                >
                    {item}
                </button>

            ))}

        </div>
    );
}


/*
 * ---------------------------------------------------------
 * FIELD COMPONENT
 * ---------------------------------------------------------
 */

function Field({
    label,
    value,
    onChange,
    type = "text",
    maxLength,
    placeholder,
    pattern,
    title,
    readOnly = false,
    error,
    inputMode
}) {

    return (

        <label style={S.field}>

            <span style={S.infoLabel}>
                {label}
            </span>

            <input
                required
                type={type}
                maxLength={maxLength}
                placeholder={placeholder}
                pattern={pattern}
                title={title}
                readOnly={readOnly}
                inputMode={inputMode}
                style={{
                    ...S.input,
                    ...(error ? S.inputError : {})
                }}
                value={value}
                onChange={(e) =>
                    onChange?.(e.target.value)
                }
            />

            {error && (
                <span style={S.fieldError}>
                    {error}
                </span>
            )}

        </label>
    );
}


/*
 * ---------------------------------------------------------
 * READ ONLY FIELD
 * ---------------------------------------------------------
 */

function ReadOnly({
    label,
    value
}) {

    return (

        <label style={S.field}>

            <span style={S.infoLabel}>
                {label}
            </span>

            <div style={S.readOnly}>
                {value}
            </div>

        </label>
    );
}


/*
 * ---------------------------------------------------------
 * PAGINATION
 * ---------------------------------------------------------
 */

function Pagination({
    page,
    totalPages,
    pageSize,
    total,
    onPage,
    onPageSize
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
                onChange={(e) =>
                    onPageSize(
                        Number(e.target.value)
                    )
                }
                style={S.pageSize}
            >

                <option value={5}>
                    5 / page
                </option>

                <option value={10}>
                    10 / page
                </option>

                <option value={20}>
                    20 / page
                </option>

            </select>


            <button
                type="button"
                title="Previous page"
                disabled={page === 1}
                onClick={() =>
                    onPage(page - 1)
                }
                style={S.pageButton}
            >
                <ChevronLeft size={15} />
            </button>


            <strong style={S.pageNumber}>
                {page}
            </strong>


            <button
                type="button"
                title="Next page"
                disabled={
                    page === totalPages
                }
                onClick={() =>
                    onPage(page + 1)
                }
                style={S.pageButton}
            >
                <ChevronRight size={15} />
            </button>

        </div>
    );
}


/*
 * ---------------------------------------------------------
 * STORE CODE PREVIEW
 * ---------------------------------------------------------
 */

function storeCodePreview(storeName) {

    const slug =
        storeName
            .trim()
            .toUpperCase()
            .replace(/[^A-Z]+/g, "_")
            .replace(/^_+|_+$/g, "");

    return slug
        ? `D2W_${slug}_###`
        : "Generated automatically";
}


/*
 * ---------------------------------------------------------
 * STYLES
 * ---------------------------------------------------------
 */

const S = {

    page: {
        display: "grid",
        gap: 14,
        fontFamily: FONT_BODY,
        color: COLORS.ink
    },

    header: {
        display: "grid",
        gridTemplateColumns:
            "minmax(220px, auto) minmax(280px, 1fr) auto",
        alignItems: "center",
        gap: 16
    },

    breadcrumb: {
        display: "block",
        marginBottom: 4,
        color: COLORS.inkSoft,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: "uppercase"
    },

    title: {
        margin: 0,
        fontFamily: FONT_DISPLAY,
        fontSize: 22,
        fontWeight: 700,
        color: COLORS.navy,
        letterSpacing: 0.2
    },

    headerSearch: {
        height: 40,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "0 12px",
        border: `1px solid ${COLORS.hairline}`,
        borderRadius: 8,
        background: COLORS.paper,
        boxShadow:
            "0 1px 3px rgba(21,48,77,0.05)"
    },

    searchInput: {
        width: "100%",
        border: 0,
        outline: 0,
        font: "inherit",
        fontSize: 13,
        color: COLORS.ink,
        background: "transparent"
    },

    primary: {
        height: 40,
        padding: "0 16px",
        border: 0,
        borderRadius: 7,
        background: COLORS.navy,
        color: "#FFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        fontWeight: 600,
        fontSize: 13.5,
        cursor: "pointer",
        boxShadow:
            "0 1px 3px rgba(11,32,56,0.2)"
    },

    secondary: {
        height: 34,
        padding: "0 13px",
        border:
            `1px solid ${COLORS.hairline}`,
        borderRadius: 6,
        background: COLORS.paper,
        color: COLORS.navy,
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontWeight: 600,
        fontSize: 12.5,
        cursor: "pointer"
    },

    activate: {
        height: 34,
        padding: "0 13px",
        border:
            `1px solid ${COLORS.success}55`,
        borderRadius: 6,
        background: COLORS.successSoft,
        color: COLORS.success,
        fontWeight: 600,
        fontSize: 12.5,
        cursor: "pointer"
    },

    deactivate: {
        height: 34,
        padding: "0 13px",
        border:
            `1px solid ${COLORS.danger}55`,
        borderRadius: 6,
        background: COLORS.dangerSoft,
        color: COLORS.danger,
        fontWeight: 600,
        fontSize: 12.5,
        cursor: "pointer"
    },

    error: {
        padding: 11,
        border:
            `1px solid ${COLORS.danger}44`,
        borderRadius: 7,
        background: COLORS.dangerSoft,
        color: COLORS.danger,
        fontSize: 13
    },

    success: {
        padding: 11,
        border:
            `1px solid ${COLORS.success}44`,
        borderRadius: 7,
        background: COLORS.successSoft,
        color: COLORS.success,
        fontSize: 13
    },

    stats: {
        display: "grid",
        gridTemplateColumns:
            "repeat(5, minmax(0, 1fr))",
        gap: 10
    },

    stat: {
        minHeight: 46,
        padding: "0 15px",
        border:
            `1px solid ${COLORS.hairline}`,
        borderRadius: 8,
        background: COLORS.paper,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: COLORS.inkSoft,
        fontSize: 11.5,
        fontWeight: 500,
        boxShadow:
            "0 1px 3px rgba(21,48,77,0.04)"
    },

    workspace: {
        display: "grid",
        gridTemplateColumns:
            "35fr 65fr",
        gap: 16,
        height:
            "clamp(440px, calc(100vh - 270px), 620px)",
        minHeight: 0
    },

    list: {
        border:
            `1px solid ${COLORS.hairline}`,
        borderRadius: 10,
        background: COLORS.paper,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow:
            "0 1px 6px rgba(21,48,77,0.05)"
    },

    listTools: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 9,
        padding: 13,
        borderBottom:
            `1px solid ${COLORS.hairline}`
    },

    listCaption: {
        display: "grid",
        gap: 2,
        color: COLORS.navy,
        fontSize: 12.5,
        fontFamily: FONT_DISPLAY,
        fontWeight: 700
    },

    filterSelect: {
        height: 34,
        minWidth: 112,
        padding: "0 26px 0 9px",
        border:
            `1px solid ${COLORS.hairline}`,
        borderRadius: 6,
        background: COLORS.paper,
        color: COLORS.ink,
        fontSize: 11.5,
        fontFamily: FONT_BODY
    },

    tableHeader: {
        display: "grid",
        gridTemplateColumns:
            "2fr 1fr 110px",
        gap: 12,
        padding: "9px 18px",
        borderBottom:
            `1px solid ${COLORS.hairline}`,
        background: COLORS.slateFill,
        color: COLORS.inkSoft,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase"
    },

    storeList: {
        overflowY: "auto",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column"
    },

    storeRow: {
        width: "100%",
        minHeight: 62,
        border: 0,
        borderBottom:
            `1px solid ${COLORS.hairline}`,
        background: "transparent",
        display: "grid",
        gridTemplateColumns:
            "2fr 1fr 110px",
        alignItems: "center",
        gap: 12,
        padding: "9px 18px",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: FONT_BODY
    },

    selectedRow: {
        background: COLORS.brassSoft,
        border:
            `1px solid ${COLORS.brass}`
    },

    storeIcon: {
        width: 36,
        height: 36,
        borderRadius: 7,
        background: COLORS.slateFill,
        color: COLORS.navy,
        display: "grid",
        placeItems: "center",
        flexShrink: 0
    },

    storeText: {
        display: "grid",
        gap: 3,
        minWidth: 0,
        flex: 1,
        fontSize: 13,
        color: COLORS.ink
    },

    storeLocation: {
        display: "grid",
        gap: 3,
        color: COLORS.ink,
        fontSize: 12,
        fontFamily: FONT_MONO
    },

    active: {
        padding: "3px 8px",
        borderRadius: 20,
        background: COLORS.successSoft,
        color: COLORS.success,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: "uppercase"
    },

    inactive: {
        padding: "3px 8px",
        borderRadius: 20,
        background: COLORS.dangerSoft,
        color: COLORS.danger,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: "uppercase"
    },

    details: {
        border:
            `1px solid ${COLORS.hairline}`,
        borderRadius: 10,
        background: COLORS.paper,
        overflow: "hidden",
        alignSelf: "start",
        boxShadow:
            "0 1px 6px rgba(21,48,77,0.05)"
    },

    detailHeader: {
        minHeight: 68,
        padding: "14px 18px",
        borderBottom:
            `1px solid ${COLORS.hairline}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16
    },

    detailTitle: {
        margin: 0,
        fontFamily: FONT_DISPLAY,
        fontSize: 18,
        fontWeight: 700,
        color: COLORS.navy,
        letterSpacing: 0.2
    },

    nameLine: {
        display: "flex",
        alignItems: "center",
        gap: 9
    },

    code: {
        display: "block",
        marginTop: 5,
        color: COLORS.inkSoft,
        fontSize: 12,
        fontFamily: FONT_MONO
    },

    actions: {
        display: "flex",
        gap: 8
    },

    detailGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
        gap: 1,
        background: COLORS.hairline,
        borderBottom:
            `1px solid ${COLORS.hairline}`
    },

    info: {
        minHeight: 72,
        padding: "12px 16px",
        background: COLORS.paper,
        display: "grid",
        alignContent: "center",
        gap: 5,
        fontSize: 12.5,
        overflowWrap: "anywhere",
        color: COLORS.ink
    },

    infoLabel: {
        color: COLORS.inkSoft,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2
    },

    address: {
        margin: 14,
        padding: "12px 14px",
        border:
            `1px solid ${COLORS.brass}33`,
        borderRadius: 8,
        background: COLORS.brassSoft,
        display: "flex",
        gap: 10
    },

    addressText: {
        display: "block",
        marginTop: 6,
        color: COLORS.ink,
        fontSize: 13
    },

    empty: {
        padding: 34,
        textAlign: "center",
        color: COLORS.inkSoft,
        fontSize: 13
    },

    overlay: {
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(11,32,56,.55)",
        display: "grid",
        placeItems: "center",
        padding: 20
    },

    modal: {
        width: "min(880px, 100%)",
        maxHeight: "90vh",
        overflowY: "auto",
        background: COLORS.paper,
        borderRadius: 12,
        boxShadow:
            "0 24px 60px rgba(11,32,56,.28)"
    },

    modalHeader: {
        padding: "18px 22px",
        borderBottom:
            `1px solid ${COLORS.hairline}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
    },

    modalSubtitle: {
        display: "block",
        marginTop: 5,
        color: COLORS.inkSoft,
        fontSize: 12
    },

    modalError: {
        margin: "14px 18px 0",
        padding: "10px 12px",
        border:
            `1px solid ${COLORS.danger}44`,
        borderRadius: 6,
        background: COLORS.dangerSoft,
        color: COLORS.danger,
        fontSize: 12.5
    },

    modalSuccess: {
        margin: "14px 18px 0",
        padding: "10px 12px",
        border:
            `1px solid ${COLORS.success}44`,
        borderRadius: 6,
        background: COLORS.successSoft,
        color: COLORS.success,
        fontSize: 12.5
    },

    iconButton: {
        width: 34,
        height: 34,
        border:
            `1px solid ${COLORS.hairline}`,
        borderRadius: 7,
        background: COLORS.paper,
        color: COLORS.inkSoft,
        display: "grid",
        placeItems: "center",
        cursor: "pointer"
    },

    form: {
        padding: 22,
        display: "grid",
        gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
        gap: "16px 18px",
        background: COLORS.slateFill
    },

    field: {
        display: "grid",
        gap: 6
    },

    input: {
        width: "100%",
        height: 39,
        padding: "0 10px",
        border:
            `1px solid ${COLORS.hairline}`,
        borderRadius: 6,
        boxSizing: "border-box",
        font: "inherit",
        fontSize: 13,
        color: COLORS.ink,
        background: COLORS.paper
    },

    inputError: {
        border:
            `1px solid ${COLORS.danger}`,
        background: COLORS.dangerSoft
    },

    fieldError: {
        color: COLORS.danger,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.3
    },

    passwordField: {
        position: "relative"
    },

    passwordToggle: {
        position: "absolute",
        right: 8,
        top: 28,
        height: 28,
        padding: "0 8px",
        border: 0,
        background: "transparent",
        color: COLORS.navy,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer"
    },

    readOnly: {
        height: 39,
        padding: "0 10px",
        border:
            `1px solid ${COLORS.hairline}`,
        borderRadius: 6,
        background: COLORS.hairlineSoft,
        display: "flex",
        alignItems: "center",
        color: COLORS.inkSoft,
        fontSize: 13,
        fontFamily: FONT_MONO
    },

    modalActions: {
        gridColumn: "1 / -1",
        position: "sticky",
        bottom: -22,
        zIndex: 2,
        display: "flex",
        justifyContent: "flex-end",
        gap: 9,
        margin: "0 -22px -22px",
        padding: "14px 22px",
        borderTop:
            `1px solid ${COLORS.hairline}`,
        background: COLORS.paper
    },

    pagination: {
        minHeight: 52,
        padding: "8px 10px",
        borderTop:
            `1px solid ${COLORS.hairline}`,
        display: "flex",
        alignItems: "center",
        gap: 7,
        background: COLORS.paper
    },

    pageMeta: {
        marginRight: "auto",
        color: COLORS.inkSoft,
        fontSize: 10.5,
        fontFamily: FONT_MONO
    },

    pageSize: {
        height: 32,
        border:
            `1px solid ${COLORS.hairline}`,
        borderRadius: 6,
        background: COLORS.paper,
        color: COLORS.ink,
        fontSize: 11
    },

    pageButton: {
        width: 32,
        height: 32,
        border:
            `1px solid ${COLORS.hairline}`,
        borderRadius: 6,
        background: COLORS.paper,
        color: COLORS.ink,
        display: "grid",
        placeItems: "center",
        cursor: "pointer"
    },

    pageNumber: {
        minWidth: 20,
        textAlign: "center",
        color: COLORS.brass,
        fontSize: 12,
        fontFamily: FONT_MONO
    },

    tabs: {
        height: 44,
        padding: "0 14px",
        display: "flex",
        alignItems: "end",
        gap: 4,
        borderBottom:
            `1px solid ${COLORS.hairline}`,
        overflowX: "auto",
        background: COLORS.paper
    },

    tab: {
        height: 43,
        padding: "0 12px",
        border: 0,
        borderBottom:
            "2px solid transparent",
        background: "transparent",
        color: COLORS.inkSoft,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: FONT_BODY
    },

    activeTab: {
        height: 43,
        padding: "0 12px",
        border: 0,
        borderBottom:
            `2px solid ${COLORS.brass}`,
        background: "transparent",
        color: COLORS.navy,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: FONT_BODY
    },

    tabEmpty: {
        minHeight: 130,
        padding: 24,
        display: "grid",
        placeContent: "center",
        gap: 6,
        textAlign: "center",
        color: COLORS.inkSoft,
        fontSize: 12
    },
};


export default StoresPage;
