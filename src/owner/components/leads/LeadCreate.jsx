import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search,
    UserRound,
    Plus,
    ArrowLeft,
} from "lucide-react";
import { createLead } from "../../../services/leadService";

import { getAllStores } from "../../../services/storeService";

import {
    searchCustomersByStore,
    saveCustomer,
} from "../../../services/customerService";


const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
};


const emptyCustomerForm = {
    customerName: "",
    mobileNumber: "",
    gstRegistrationType: "UNREGISTERED",
    gstin: "",
    state: "",
    email: "",
    billingAddress: "",
    shippingAddress: "",
};


export default function LeadCreate() {

    const navigate = useNavigate();

    const user = useMemo(() => readUser(), []);

    const isSuperAdmin = user?.role === "SUPER_ADMIN";


    /*
     * =========================================================
     * STORE
     * =========================================================
     */

    const [selectedStoreId, setSelectedStoreId] = useState(
        isSuperAdmin
            ? ""
            : String(user?.storeId || "")
    );

    const [stores, setStores] = useState([]);

    const [storeLoading, setStoreLoading] = useState(false);

    const [storeError, setStoreError] = useState("");


    /*
     * =========================================================
     * CUSTOMER
     * =========================================================
     */

    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [customerSearch, setCustomerSearch] = useState("");

    const [customerResults, setCustomerResults] = useState([]);

    const [customerLoading, setCustomerLoading] = useState(false);

    const [customerDropdownOpen, setCustomerDropdownOpen] =
        useState(false);

    const [customerModalOpen, setCustomerModalOpen] =
        useState(false);

    const [customerForm, setCustomerForm] =
        useState(emptyCustomerForm);

    const [savingCustomer, setSavingCustomer] =
        useState(false);

    const [sameAsBilling, setSameAsBilling] =
        useState(false);


    const customerLookupRequest = useRef(0);

    const emptyLeadItem = {
    requirement: "",
    vehicleDescription: "",
    vin: "",
    requestedQuantity: 1,
    notes: "",
};

const [customerRequirement, setCustomerRequirement] = useState("");

const [leadItems, setLeadItems] = useState([
    { ...emptyLeadItem },
]);

const [leadNotes, setLeadNotes] = useState("");

const [creatingLead, setCreatingLead] = useState(false);
    /*
     * =========================================================
     * LOAD STORES
     * SUPER_ADMIN ONLY
     * =========================================================
     */

    useEffect(() => {

        if (!isSuperAdmin) {
            return;
        }

        const loadStores = async () => {

            setStoreLoading(true);
            setStoreError("");

            try {

                const response = await getAllStores();

                const data = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.content)
                        ? response.content
                        : [];

                setStores(data);

            } catch (error) {

                console.error(
                    "Failed to load stores:",
                    error
                );

                setStores([]);

                setStoreError(
                    error?.response?.data?.message ||
                    "Unable to load stores."
                );

            } finally {

                setStoreLoading(false);

            }
        };

        loadStores();

    }, [isSuperAdmin]);


    /*
     * =========================================================
     * STORE CHANGE
     * =========================================================
     */

    const handleStoreChange = (event) => {

        const newStoreId = event.target.value;

        setSelectedStoreId(newStoreId);

        /*
         * Customer belongs to the selected store.
         * Therefore changing the store clears
         * the currently selected customer.
         */

        setSelectedCustomer(null);

        setCustomerSearch("");

        setCustomerResults([]);

        setCustomerDropdownOpen(false);
    };


    /*
     * =========================================================
     * CUSTOMER SEARCH
     * =========================================================
     */

    const loadCustomerOptions = async (query = "") => {

        if (!selectedStoreId) {
            return;
        }

        const requestId =
            ++customerLookupRequest.current;

        setCustomerLoading(true);

        try {

            const customers =
                await searchCustomersByStore(
                    selectedStoreId,
                    query
                );

            if (
                requestId ===
                customerLookupRequest.current
            ) {

                setCustomerResults(
                    Array.isArray(customers)
                        ? customers
                        : []
                );

            }

        } catch (error) {

            if (
                requestId ===
                customerLookupRequest.current
            ) {

                console.error(
                    "Customer search failed:",
                    error
                );

                setCustomerResults([]);
            }

        } finally {

            if (
                requestId ===
                customerLookupRequest.current
            ) {

                setCustomerLoading(false);
            }
        }
    };


    /*
     * =========================================================
     * CUSTOMER SEARCH INPUT
     * =========================================================
     */

    const handleCustomerSearchChange = async (
        event
    ) => {

        const value = event.target.value;

        setCustomerSearch(value);

        setSelectedCustomer(null);

        if (!selectedStoreId) {
            return;
        }

        setCustomerDropdownOpen(true);

        await loadCustomerOptions(value);
    };


    /*
     * =========================================================
     * SELECT EXISTING CUSTOMER
     * =========================================================
     */

    const selectCustomer = (customer) => {

        const billing =
            customer.billingAddress ??
            customer.address ??
            "";

        const shipping =
            customer.shippingAddress ??
            "";

        setSelectedCustomer({
            ...customer,
            billingAddress: billing,
            shippingAddress: shipping,
        });

        setCustomerSearch(
            customer.customerName ?? ""
        );

        setCustomerDropdownOpen(false);

        setCustomerResults([]);
    };


    /*
     * =========================================================
     * OPEN NEW CUSTOMER MODAL
     * =========================================================
     */

    const openNewCustomerModal = () => {

        setCustomerForm({
            ...emptyCustomerForm,
            mobileNumber:
                customerSearch.trim(),
        });

        setSameAsBilling(false);

        setCustomerModalOpen(true);
    };


    /*
     * =========================================================
     * CUSTOMER FORM CHANGE
     * =========================================================
     */

    const handleCustomerFormChange = (
        field,
        value
    ) => {

        setCustomerForm((current) => ({
            ...current,

            [field]: value,

            ...(field === "billingAddress" &&
            sameAsBilling
                ? {
                    shippingAddress: value,
                }
                : {}),
        }));
    };


    /*
     * =========================================================
     * SAME AS BILLING
     * =========================================================
     */

    const handleSameAsBilling = (checked) => {

        setSameAsBilling(checked);

        if (checked) {

            setCustomerForm((current) => ({
                ...current,

                shippingAddress:
                    current.billingAddress,
            }));
        }
    };


    /*
     * =========================================================
     * SAVE NEW CUSTOMER
     * =========================================================
     */

    const handleSaveCustomer = async () => {

        if (!selectedStoreId) {

            alert("Select a store first.");

            return;
        }

        if (!customerForm.customerName.trim()) {

            alert("Customer name is required.");

            return;
        }

        if (
            !/^\d{10}$/.test(
                customerForm.mobileNumber
            )
        ) {

            alert(
                "Enter a valid 10-digit mobile number."
            );

            return;
        }

        if (
            customerForm.gstRegistrationType !==
                "UNREGISTERED" &&
            !/^[0-9A-Za-z]{15}$/.test(
                customerForm.gstin.trim()
            )
        ) {

            alert(
                "A valid 15-character GSTIN is required."
            );

            return;
        }


        const payload = {

            ...customerForm,

            storeId:
                Number(selectedStoreId),

            customerType:
                "B2B",

            gstin:
                customerForm.gstin
                    .trim()
                    .toUpperCase() || null,

            address:
                customerForm.billingAddress,
        };


        setSavingCustomer(true);

        try {

            const saved =
                await saveCustomer(payload);

            /*
             * Immediately select the newly
             * created customer.
             */

            selectCustomer(saved);

            setCustomerModalOpen(false);

            await loadCustomerOptions("");

        } catch (error) {

            console.error(
                "Unable to save customer:",
                error
            );

            alert(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Unable to save customer."
            );

        } finally {

            setSavingCustomer(false);
        }
    };


    /*
     * =========================================================
     * SELECTED CUSTOMER DETAILS
     * =========================================================
     */

    const customerBillingAddress =
        selectedCustomer?.billingAddress ??
        selectedCustomer?.address ??
        "";

    const customerShippingAddress =
        selectedCustomer?.shippingAddress ??
        "";
        const handleLeadItemChange = (index, field, value) => {
    setLeadItems((current) =>
        current.map((item, itemIndex) =>
            itemIndex === index
                ? {
                    ...item,
                    [field]: value,
                }
                : item
        )
    );
};

const addLeadItem = () => {
    setLeadItems((current) => [
        ...current,
        { ...emptyLeadItem },
    ]);
};

const removeLeadItem = (index) => {
    setLeadItems((current) =>
        current.filter(
            (_, itemIndex) => itemIndex !== index
        )
    );
};

const handleCreateLead = async () => {
    if (!selectedStoreId) {
        alert("Select a store first.");
        return;
    }

    if (!selectedCustomer) {
        alert("Select a customer.");
        return;
    }

    if (!customerRequirement.trim()) {
        alert("Customer requirement is required.");
        return;
    }

    if (leadItems.length === 0) {
        alert("At least one lead item is required.");
        return;
    }

    const invalidItem = leadItems.find(
        (item) =>
            !item.requirement.trim() ||
            !item.requestedQuantity ||
            Number(item.requestedQuantity) <= 0
    );

    if (invalidItem) {
        alert(
            "Each lead item must have a requirement and valid quantity."
        );
        return;
    }

    const payload = {
        customerId: Number(selectedCustomer.id),
        storeId: isSuperAdmin
            ? Number(selectedStoreId)
            : null,

        customerRequirement:
            customerRequirement.trim(),

        notes: leadNotes.trim() || null,

        items: leadItems.map((item) => ({
            requirement: item.requirement.trim(),
            vehicleDescription:
                item.vehicleDescription.trim() || null,
            vin: item.vin.trim() || null,
            requestedQuantity:
                Number(item.requestedQuantity),
            notes: item.notes.trim() || null,
        })),
    };

    setCreatingLead(true);

    try {
        const createdLead = await createLead(payload);

        alert(
            `Lead ${createdLead.leadNumber} created successfully.`
        );

        console.log(
            "Created Lead:",
            createdLead
        );

       navigate(isSuperAdmin ? "/owner/sales" : "/store/sales");
    } catch (error) {
        console.error(
            "Unable to create lead:",
            error
        );

        alert(
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Unable to create lead."
        );
    } finally {
        setCreatingLead(false);
    }
};


    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (

        <section
            style={{
                padding: "24px",
                background: "#F8FAFC",
                minHeight: "100%",
            }}
        >

            {/* HEADER */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "24px",
                }}
            >

                <div>

                    <h1
                        style={{
                            margin: 0,
                            fontSize: "24px",
                            fontWeight: 700,
                            color: "#0F172A",
                        }}
                    >
                        Create Lead
                    </h1>

                    <p
                        style={{
                            margin:
                                "6px 0 0",
                            color: "#64748B",
                            fontSize: "14px",
                        }}
                    >
                        Create a new customer requirement
                    </p>

                </div>


                <button
                    type="button"
                    onClick={() =>
                        navigate("/owner/sales")
                    }
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                        padding: "9px 14px",
                        border:
                            "1px solid #CBD5E1",
                        borderRadius: "7px",
                        background: "#FFFFFF",
                        cursor: "pointer",
                    }}
                >
                    <ArrowLeft size={15} />
                    Back
                </button>

            </div>


            {/* MAIN CARD */}

            <div
                style={{
                    background: "#FFFFFF",
                    border:
                        "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "24px",
                }}
            >

                {/* STORE */}

                <div
                    style={{
                        maxWidth: "500px",
                        marginBottom: "28px",
                    }}
                >

                    <label
                        style={{
                            display: "block",
                            marginBottom: "7px",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#334155",
                        }}
                    >
                        Store
                    </label>


                    {isSuperAdmin ? (

                        <select
                            value={selectedStoreId}
                            onChange={
                                handleStoreChange
                            }
                            disabled={storeLoading}
                            style={{
                                width: "100%",
                                height: "42px",
                                padding:
                                    "0 12px",
                                border:
                                    "1px solid #CBD5E1",
                                borderRadius: "7px",
                                background:
                                    "#FFFFFF",
                                fontSize: "14px",
                            }}
                        >

                            <option value="">

                                {storeLoading
                                    ? "Loading..."
                                    : "Select store"}

                            </option>


                            {stores.map(
                                (store) => {

                                    const storeId =
                                        store.id ??
                                        store.storeId;

                                    const storeName =
                                        store.storeName ??
                                        store.name ??
                                        `Store ${storeId}`;

                                    const storeCode =
                                        store.storeCode ??
                                        store.code;

                                    return (

                                        <option
                                            key={storeId}
                                            value={storeId}
                                        >

                                            {storeName}

                                            {storeCode
                                                ? ` (${storeCode})`
                                                : ""}

                                        </option>
                                    );
                                }
                            )}

                        </select>

                    ) : (

                        <div
                            style={{
                                height: "42px",
                                display: "flex",
                                alignItems:
                                    "center",
                                padding:
                                    "0 12px",
                                border:
                                    "1px solid #E2E8F0",
                                borderRadius: "7px",
                                background:
                                    "#F8FAFC",
                                color:
                                    "#334155",
                                fontSize: "14px",
                            }}
                        >

                            {user?.storeName ||
                                "Current Store"}

                        </div>

                    )}


                    {storeError && (

                        <div
                            style={{
                                marginTop: "6px",
                                color: "#DC2626",
                                fontSize: "12px",
                            }}
                        >
                            {storeError}
                        </div>

                    )}

                </div>


                {/* CUSTOMER */}

                <div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            alignItems:
                                "center",
                            marginBottom: "8px",
                        }}
                    >

                        <label
                            style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#334155",
                            }}
                        >
                            Customer
                        </label>


                        <button
                            type="button"
                            onClick={
                                openNewCustomerModal
                            }
                            disabled={
                                !selectedStoreId
                            }
                            style={{
                                display: "flex",
                                alignItems:
                                    "center",
                                gap: "5px",
                                border: 0,
                                background:
                                    "transparent",
                                color:
                                    selectedStoreId
                                        ? "#2563EB"
                                        : "#94A3B8",
                                cursor:
                                    selectedStoreId
                                        ? "pointer"
                                        : "not-allowed",
                                fontWeight: 600,
                                fontSize: "13px",
                            }}
                        >

                            <Plus size={15} />

                            New Customer

                        </button>

                    </div>


                    {/* CUSTOMER SEARCH */}

                    <div
                        style={{
                            position: "relative",
                            maxWidth: "600px",
                        }}
                    >

                        <div
                            style={{
                                display: "flex",
                                alignItems:
                                    "center",
                                gap: "9px",
                                height: "44px",
                                padding:
                                    "0 12px",
                                border:
                                    "1px solid #CBD5E1",
                                borderRadius: "7px",
                                background:
                                    "#FFFFFF",
                            }}
                        >

                            <Search
                                size={17}
                                color="#64748B"
                            />


                            <input
                                type="text"
                                value={
                                    customerSearch
                                }
                                disabled={
                                    !selectedStoreId
                                }
                                onChange={
                                    handleCustomerSearchChange
                                }
                                onFocus={() => {

                                    if (
                                        selectedStoreId
                                    ) {

                                        setCustomerDropdownOpen(
                                            true
                                        );

                                        loadCustomerOptions(
                                            customerSearch
                                        );
                                    }

                                }}
                                placeholder={
                                    selectedStoreId
                                        ? "Enter customer mobile or name..."
                                        : "Select a store first..."
                                }
                                style={{
                                    flex: 1,
                                    border: 0,
                                    outline: 0,
                                    fontSize:
                                        "14px",
                                }}
                            />

                        </div>


                        {/* SEARCH RESULTS */}

                        {customerDropdownOpen &&
                            selectedStoreId && (

                                <div
                                    style={{
                                        position:
                                            "absolute",
                                        zIndex: 20,
                                        top: "49px",
                                        left: 0,
                                        right: 0,
                                        background:
                                            "#FFFFFF",
                                        border:
                                            "1px solid #E2E8F0",
                                        borderRadius:
                                            "8px",
                                        boxShadow:
                                            "0 8px 24px rgba(15,23,42,0.12)",
                                        overflow:
                                            "hidden",
                                    }}
                                >

                                    {customerLoading ? (

                                        <div
                                            style={{
                                                padding:
                                                    "14px",
                                                color:
                                                    "#64748B",
                                                fontSize:
                                                    "13px",
                                            }}
                                        >
                                            Searching customers...
                                        </div>

                                    ) : customerResults.length >
                                      0 ? (

                                        customerResults.map(
                                            (customer) => (

                                                <button
                                                    key={
                                                        customer.id
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        selectCustomer(
                                                            customer
                                                        )
                                                    }
                                                    style={{
                                                        width:
                                                            "100%",
                                                        display:
                                                            "flex",
                                                        alignItems:
                                                            "center",
                                                        gap:
                                                            "12px",
                                                        padding:
                                                            "12px 14px",
                                                        border:
                                                            0,
                                                        borderBottom:
                                                            "1px solid #F1F5F9",
                                                        background:
                                                            "#FFFFFF",
                                                        textAlign:
                                                            "left",
                                                        cursor:
                                                            "pointer",
                                                    }}
                                                >

                                                    <UserRound
                                                        size={
                                                            17
                                                        }
                                                        color="#64748B"
                                                    />


                                                    <div>

                                                        <div
                                                            style={{
                                                                fontWeight:
                                                                    600,
                                                                color:
                                                                    "#0F172A",
                                                                fontSize:
                                                                    "13px",
                                                            }}
                                                        >
                                                            {
                                                                customer.customerName
                                                            }
                                                        </div>


                                                        <div
                                                            style={{
                                                                marginTop:
                                                                    "3px",
                                                                color:
                                                                    "#64748B",
                                                                fontSize:
                                                                    "12px",
                                                            }}
                                                        >
                                                            {
                                                                customer.mobileNumber
                                                            }
                                                        </div>

                                                    </div>

                                                </button>

                                            )
                                        )

                                    ) : (

                                        <div
                                            style={{
                                                padding:
                                                    "14px",
                                            }}
                                        >

                                            <div
                                                style={{
                                                    color:
                                                        "#64748B",
                                                    fontSize:
                                                        "13px",
                                                    marginBottom:
                                                        "10px",
                                                }}
                                            >
                                                No customer found.
                                            </div>


                                            <button
                                                type="button"
                                                onClick={
                                                    openNewCustomerModal
                                                }
                                                style={{
                                                    display:
                                                        "flex",
                                                    alignItems:
                                                        "center",
                                                    gap:
                                                        "6px",
                                                    padding:
                                                        "8px 11px",
                                                    border: 0,
                                                    borderRadius:
                                                        "6px",
                                                    background:
                                                        "#2563EB",
                                                    color:
                                                        "#FFFFFF",
                                                    cursor:
                                                        "pointer",
                                                    fontSize:
                                                        "12px",
                                                    fontWeight:
                                                        600,
                                                }}
                                            >

                                                <Plus
                                                    size={14}
                                                />

                                                Create New Customer

                                            </button>

                                        </div>

                                    )}

                                </div>
                            )}

                    </div>


                    {/* SELECTED CUSTOMER DETAILS */}

                    {selectedCustomer && (

                        <div
                            style={{
                                marginTop: "18px",
                                maxWidth: "700px",
                                border:
                                    "1px solid #BFDBFE",
                                borderRadius: "8px",
                                padding: "18px",
                                background:
                                    "#EFF6FF",
                            }}
                        >

                            <div
                                style={{
                                    display: "flex",
                                    alignItems:
                                        "center",
                                    gap: "10px",
                                    marginBottom:
                                        "14px",
                                }}
                            >

                                <UserRound
                                    size={19}
                                    color="#2563EB"
                                />

                                <strong
                                    style={{
                                        color:
                                            "#0F172A",
                                        fontSize:
                                            "15px",
                                    }}
                                >
                                    Customer Details
                                </strong>

                            </div>


                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(2, minmax(0, 1fr))",
                                    gap:
                                        "12px 24px",
                                }}
                            >

                                <div>
                                    <small>
                                        Customer Name
                                    </small>

                                    <div>
                                        {
                                            selectedCustomer.customerName ||
                                            "-"
                                        }
                                    </div>
                                </div>


                                <div>
                                    <small>
                                        Mobile
                                    </small>

                                    <div>
                                        {
                                            selectedCustomer.mobileNumber ||
                                            "-"
                                        }
                                    </div>
                                </div>


                                <div>
                                    <small>
                                        Email
                                    </small>

                                    <div>
                                        {
                                            selectedCustomer.email ||
                                            "-"
                                        }
                                    </div>
                                </div>


                                <div>
                                    <small>
                                        GSTIN
                                    </small>

                                    <div>
                                        {
                                            selectedCustomer.gstin ||
                                            "-"
                                        }
                                    </div>
                                </div>


                                <div>
                                    <small>
                                        State
                                    </small>

                                    <div>
                                        {
                                            selectedCustomer.state ||
                                            "-"
                                        }
                                    </div>
                                </div>


                                <div>
                                    <small>
                                        Billing Address
                                    </small>

                                    <div>
                                        {
                                            customerBillingAddress ||
                                            "-"
                                        }
                                    </div>
                                </div>


                                <div>
                                    <small>
                                        Shipping Address
                                    </small>

                                    <div>
                                        {
                                            customerShippingAddress ||
                                            "-"
                                        }
                                    </div>
                                </div>

                            </div>

                        </div>

                    )}

                </div>

            </div>


                {/* =====================================================
                    CUSTOMER REQUIREMENT
                ===================================================== */}

                <div style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1px solid #E2E8F0" }}>
                    <div style={{ marginBottom: "16px" }}>
                        <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>
                            Customer Requirement
                        </h2>
                        <p style={{ margin: "5px 0 0", fontSize: "13px", color: "#64748B" }}>
                            Capture exactly what the customer requested.
                        </p>
                    </div>
                    <textarea
                        value={customerRequirement}
                        onChange={(event) => setCustomerRequirement(event.target.value)}
                        placeholder="Example: Customer needs Maruti Swift brake pad"
                        rows={3}
                        style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #CBD5E1", borderRadius: "7px", outline: "none", fontSize: "14px", resize: "vertical" }}
                    />
                </div>

                {/* =====================================================
                    LEAD ITEMS
                ===================================================== */}

                <div style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1px solid #E2E8F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>Required Items</h2>
                            <p style={{ margin: "5px 0 0", fontSize: "13px", color: "#64748B" }}>
                                Add each part or requirement separately.
                            </p>
                        </div>
                        <button type="button" onClick={addLeadItem} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 13px", border: "1px solid #2563EB", borderRadius: "7px", background: "#FFFFFF", color: "#2563EB", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                            <Plus size={15} />
                            Add Item
                        </button>
                    </div>

                    <div style={{ display: "grid", gap: "16px" }}>
                        {leadItems.map((item, index) => (
                            <div key={index} style={{ border: "1px solid #E2E8F0", borderRadius: "9px", padding: "18px", background: "#F8FAFC" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                                    <strong style={{ fontSize: "14px", color: "#0F172A" }}>Item {index + 1}</strong>
                                    {leadItems.length > 1 && (
                                        <button type="button" onClick={() => removeLeadItem(index)} style={{ border: 0, background: "transparent", color: "#DC2626", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                                            Remove
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.5fr) minmax(0, 120px)", gap: "12px" }}>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>Requirement *</label>
                                        <input type="text" value={item.requirement} onChange={(event) => handleLeadItemChange(index, "requirement", event.target.value)} placeholder="Brake pad" style={{ width: "100%", boxSizing: "border-box", height: "40px", padding: "0 10px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", outline: "none" }} />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>Vehicle</label>
                                        <input type="text" value={item.vehicleDescription} onChange={(event) => handleLeadItemChange(index, "vehicleDescription", event.target.value)} placeholder="Maruti Swift" style={{ width: "100%", boxSizing: "border-box", height: "40px", padding: "0 10px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", outline: "none" }} />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>Quantity *</label>
                                        <input type="number" min="1" value={item.requestedQuantity} onChange={(event) => handleLeadItemChange(index, "requestedQuantity", event.target.value)} style={{ width: "100%", boxSizing: "border-box", height: "40px", padding: "0 10px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", outline: "none" }} />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "12px", marginTop: "12px" }}>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>VIN</label>
                                        <input type="text" value={item.vin} onChange={(event) => handleLeadItemChange(index, "vin", event.target.value)} placeholder="Optional" style={{ width: "100%", boxSizing: "border-box", height: "40px", padding: "0 10px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", outline: "none" }} />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>Item Notes</label>
                                        <input type="text" value={item.notes} onChange={(event) => handleLeadItemChange(index, "notes", event.target.value)} placeholder="Optional" style={{ width: "100%", boxSizing: "border-box", height: "40px", padding: "0 10px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", outline: "none" }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* =====================================================
                    LEAD NOTES
                ===================================================== */}

                <div style={{ marginTop: "24px" }}>
                    <label style={{ display: "block", marginBottom: "7px", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Lead Notes</label>
                    <textarea value={leadNotes} onChange={(event) => setLeadNotes(event.target.value)} placeholder="Optional internal notes..." rows={3} style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #CBD5E1", borderRadius: "7px", outline: "none", fontSize: "14px", resize: "vertical" }} />
                </div>

                {/* =====================================================
                    CREATE LEAD
                ===================================================== */}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #E2E8F0" }}>
                    <button type="button" onClick={handleCreateLead} disabled={creatingLead} style={{ padding: "11px 20px", border: 0, borderRadius: "7px", background: "#2563EB", color: "#FFFFFF", cursor: creatingLead ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 600, opacity: creatingLead ? 0.7 : 1 }}>
                        {creatingLead ? "Creating Lead..." : "Create Lead"}
                    </button>
                </div>

            {/* =====================================================
                NEW CUSTOMER MODAL
            ===================================================== */}

            {customerModalOpen && (

                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 100,
                        background:
                            "rgba(15,23,42,0.45)",
                        display: "flex",
                        alignItems:
                            "center",
                        justifyContent:
                            "center",
                        padding: "24px",
                    }}
                >

                    <div
                        style={{
                            width: "100%",
                            maxWidth: "650px",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            background:
                                "#FFFFFF",
                            borderRadius:
                                "10px",
                            padding: "24px",
                            boxShadow:
                                "0 20px 50px rgba(15,23,42,0.2)",
                        }}
                    >

                        <h2
                            style={{
                                margin:
                                    "0 0 20px",
                                fontSize:
                                    "20px",
                                color:
                                    "#0F172A",
                            }}
                        >
                            Create New Customer
                        </h2>


                        <div
                            style={{
                                display: "grid",
                                gap: "14px",
                            }}
                        >

                            <div>

                                <label>
                                    Customer Name
                                </label>

                                <input
                                    value={
                                        customerForm.customerName
                                    }
                                    onChange={(event) =>
                                        handleCustomerFormChange(
                                            "customerName",
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            <div>

                                <label>
                                    Mobile Number
                                </label>

                                <input
                                    value={
                                        customerForm.mobileNumber
                                    }
                                    maxLength={10}
                                    onChange={(event) =>
                                        handleCustomerFormChange(
                                            "mobileNumber",
                                            event.target.value.replace(
                                                /\D/g,
                                                ""
                                            )
                                        )
                                    }
                                />

                            </div>


                            <div>

                                <label>
                                    GST Registration Type
                                </label>

                                <select
                                    value={
                                        customerForm.gstRegistrationType
                                    }
                                    onChange={(event) =>
                                        handleCustomerFormChange(
                                            "gstRegistrationType",
                                            event.target.value
                                        )
                                    }
                                >

                                    <option value="UNREGISTERED">
                                        Unregistered
                                    </option>

                                    <option value="REGISTERED">
                                        Registered
                                    </option>

                                </select>

                            </div>


                            {customerForm.gstRegistrationType !==
                                "UNREGISTERED" && (

                                <div>

                                    <label>
                                        GSTIN
                                    </label>

                                    <input
                                        value={
                                            customerForm.gstin
                                        }
                                        maxLength={15}
                                        onChange={(event) =>
                                            handleCustomerFormChange(
                                                "gstin",
                                                event.target.value
                                            )
                                        }
                                    />

                                </div>

                            )}


                            <div>

                                <label>
                                    State
                                </label>

                                <input
                                    value={
                                        customerForm.state
                                    }
                                    onChange={(event) =>
                                        handleCustomerFormChange(
                                            "state",
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            <div>

                                <label>
                                    Email
                                </label>

                                <input
                                    value={
                                        customerForm.email
                                    }
                                    onChange={(event) =>
                                        handleCustomerFormChange(
                                            "email",
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            <div>

                                <label>
                                    Billing Address
                                </label>

                                <textarea
                                    value={
                                        customerForm.billingAddress
                                    }
                                    onChange={(event) =>
                                        handleCustomerFormChange(
                                            "billingAddress",
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            <label
                                style={{
                                    display: "flex",
                                    alignItems:
                                        "center",
                                    gap: "7px",
                                }}
                            >

                                <input
                                    type="checkbox"
                                    checked={
                                        sameAsBilling
                                    }
                                    onChange={(event) =>
                                        handleSameAsBilling(
                                            event.target.checked
                                        )
                                    }
                                />

                                Shipping address same as billing

                            </label>


                            <div>

                                <label>
                                    Shipping Address
                                </label>

                                <textarea
                                    value={
                                        customerForm.shippingAddress
                                    }
                                    onChange={(event) =>
                                        handleCustomerFormChange(
                                            "shippingAddress",
                                            event.target.value
                                        )
                                    }
                                />

                            </div>

                        </div>


                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "flex-end",
                                gap: "10px",
                                marginTop:
                                    "22px",
                            }}
                        >

                            <button
                                type="button"
                                onClick={() =>
                                    setCustomerModalOpen(
                                        false
                                    )
                                }
                                disabled={
                                    savingCustomer
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                onClick={
                                    handleSaveCustomer
                                }
                                disabled={
                                    savingCustomer
                                }
                            >
                                {savingCustomer
                                    ? "Saving..."
                                    : "Save Customer"}
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </section>
    );
}