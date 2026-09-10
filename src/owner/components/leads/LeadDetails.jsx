import React, { useEffect, useState } from "react";
import {
    ArrowLeft,
    Search,
    CheckCircle,
    AlertCircle,
    Save,
    Loader2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import {
    getLeadById,
    lookupLeadItemProduct,
    saveLeadItemProcurement,
    completeLeadProcurement,
} from "../../../services/leadService";

function LeadDetails() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(false);

    const [partNumbers, setPartNumbers] = useState({});
    const [lookupResults, setLookupResults] = useState({});
    const [lookupLoadingItemId, setLookupLoadingItemId] =
        useState(null);

    const [procurementForms, setProcurementForms] = useState({});
    const [savingItemId, setSavingItemId] = useState(null);

    /*
     * =========================================================
     * LOAD LEAD
     * =========================================================
     */

    const loadLead = async () => {
        setLoading(true);

        try {
            const response = await getLeadById(id);

            setLead(response);

            const initialPartNumbers = {};
            const initialForms = {};

            response?.items?.forEach((item) => {
                if (item.partNumber) {
                    initialPartNumbers[item.id] =
                        item.partNumber;
                }

                initialForms[item.id] = {
                    partNumber: item.partNumber || "",
                    productName: item.productName || "",
                    brandname: item.brandname || "",
                    hsnCode: item.hsnCode || "",
                    quotedMrp:
                        item.quotedMrp !== null &&
                        item.quotedMrp !== undefined
                            ? item.quotedMrp
                            : "",
                    quotedSellingPrice:
                        item.quotedSellingPrice !== null &&
                        item.quotedSellingPrice !== undefined
                            ? item.quotedSellingPrice
                            : "",
                    sellingQuantity:
                        item.sellingQuantity !== null &&
                        item.sellingQuantity !== undefined
                            ? item.sellingQuantity
                            : "",
                    availabilityStatus:
                        item.availabilityStatus || "",
                    estimatedAvailabilityDate:
                        item.estimatedAvailabilityDate || "",
                    notes: item.notes || "",
                };
            });

            setPartNumbers(initialPartNumbers);
            setProcurementForms(initialForms);
        } catch (error) {
            console.error(
                "Unable to load lead:",
                error
            );

            alert(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to load lead."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadLead();
        }
    }, [id]);

    /*
     * =========================================================
     * FORM HELPERS
     * =========================================================
     */

    const updateProcurementForm = (
        itemId,
        field,
        value
    ) => {
        setProcurementForms((previous) => ({
            ...previous,
            [itemId]: {
                ...(previous[itemId] || {}),
                [field]: value,
            },
        }));
    };

    /*
     * =========================================================
     * PART NUMBER CHANGE
     * =========================================================
     */

    const handlePartNumberChange = (
        itemId,
        value
    ) => {
        setPartNumbers((previous) => ({
            ...previous,
            [itemId]: value,
        }));

        updateProcurementForm(
            itemId,
            "partNumber",
            value
        );

        /*
         * Clear previous lookup whenever the user
         * changes the part number.
         */
        setLookupResults((previous) => ({
            ...previous,
            [itemId]: null,
        }));

        /*
         * Clear automatically populated product
         * fields because the part number changed.
         */
        setProcurementForms((previous) => ({
            ...previous,
            [itemId]: {
                ...(previous[itemId] || {}),
                partNumber: value,
                productName: "",
                brandname: "",
                hsnCode: "",
                quotedMrp: "",
                quotedSellingPrice: "",
                sellingQuantity: "",
                availabilityStatus: "",
                estimatedAvailabilityDate: "",
            },
        }));
    };

    /*
     * =========================================================
     * PRODUCT LOOKUP
     * =========================================================
     */

    const lookupProduct = async (
        item,
        suppliedPartNumber = null
    ) => {
        const partNumber = (
            suppliedPartNumber !== null
                ? suppliedPartNumber
                : partNumbers[item.id] || ""
        ).trim();

        if (!partNumber) {
            return;
        }

        setLookupLoadingItemId(item.id);

        try {
            const response =
                await lookupLeadItemProduct(
                    id,
                    item.id,
                    partNumber
                );

            setLookupResults((previous) => ({
                ...previous,
                [item.id]: response,
            }));

            /*
             * If product is found in store,
             * populate product master information.
             */
            if (response?.foundInStore) {
                setProcurementForms((previous) => ({
                    ...previous,
                    [item.id]: {
                        ...(previous[item.id] || {}),
                        partNumber:
                            response.partNumber ||
                            partNumber,
                        productName:
                            response.productName || "",
                        brandname:
                            response.brandname || "",
                        hsnCode:
                            response.hsnCode || "",
                        quotedMrp:
                            response.mrp !== null &&
                            response.mrp !== undefined
                                ? response.mrp
                                : "",
                        quotedSellingPrice:
                            response.sellingPrice !== null &&
                            response.sellingPrice !== undefined
                                ? response.sellingPrice
                                : "",
                    },
                }));
            } else {
                /*
                 * Not found in store.
                 *
                 * Do not assume it is permanently a
                 * new catalogue product. Backend will
                 * make the final decision during save.
                 */
                setProcurementForms((previous) => ({
                    ...previous,
                    [item.id]: {
                        ...(previous[item.id] || {}),
                        partNumber: partNumber,
                    },
                }));
            }
        } catch (error) {
            console.error(
                "Unable to lookup product:",
                error
            );

            alert(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to lookup product."
            );
        } finally {
            setLookupLoadingItemId(null);
        }
    };

    /*
     * =========================================================
     * AUTOMATIC LOOKUP
     *
     * Wait 600ms after typing before calling backend.
     * Enter key also performs immediate lookup.
     * =========================================================
     */

    useEffect(() => {
        if (!lead?.items?.length) {
            return;
        }

        const timers = [];

        lead.items.forEach((item) => {
            const value = (
                partNumbers[item.id] || ""
            ).trim();

            if (!value) {
                return;
            }

            const timer = setTimeout(() => {
                lookupProduct(item, value);
            }, 600);

            timers.push(timer);
        });

        return () => {
            timers.forEach((timer) =>
                clearTimeout(timer)
            );
        };
    }, [partNumbers]);

    /*
     * =========================================================
     * ENTER KEY LOOKUP
     * =========================================================
     */

    const handlePartNumberKeyDown = (
        event,
        item
    ) => {
        if (event.key === "Enter") {
            event.preventDefault();

            lookupProduct(item);
        }
    };

    /*
     * =========================================================
     * SAVE PROCUREMENT
     * =========================================================
     */

    const saveProcurement = async (item) => {
        const form =
            procurementForms[item.id] || {};

        const partNumber = (
            form.partNumber || ""
        ).trim();

        const productName = (
            form.productName || ""
        ).trim();

        const brandname = (
            form.brandname || ""
        ).trim();

        const hsnCode = (
            form.hsnCode || ""
        ).trim();

        const quotedMrp =
            form.quotedMrp === ""
                ? null
                : Number(form.quotedMrp);

        const quotedSellingPrice =
            form.quotedSellingPrice === ""
                ? null
                : Number(
                      form.quotedSellingPrice
                  );

        const sellingQuantity =
            form.sellingQuantity === ""
                ? null
                : Number(
                      form.sellingQuantity
                  );

        const availabilityStatus =
            (
                form.availabilityStatus || ""
            )
                .trim()
                .toUpperCase();

        const estimatedAvailabilityDate =
            form.estimatedAvailabilityDate ||
            null;

        /*
         * Frontend validation.
         *
         * Backend remains the final authority.
         */

        if (!partNumber) {
            alert("Part Number is required.");
            return;
        }

        if (
            quotedMrp === null ||
            Number.isNaN(quotedMrp) ||
            quotedMrp <= 0
        ) {
            alert("MRP must be greater than zero.");
            return;
        }

        if (
            quotedSellingPrice === null ||
            Number.isNaN(quotedSellingPrice) ||
            quotedSellingPrice <= 0
        ) {
            alert(
                "Selling Price must be greater than zero."
            );
            return;
        }

        if (
            quotedSellingPrice > quotedMrp
        ) {
            alert(
                "Selling Price cannot be greater than MRP."
            );
            return;
        }

        if (
            sellingQuantity === null ||
            Number.isNaN(sellingQuantity) ||
            sellingQuantity < 0
        ) {
            alert(
                "Selling Quantity cannot be negative."
            );
            return;
        }

        if (!availabilityStatus) {
            alert(
                "Please select Availability."
            );
            return;
        }

        if (
            availabilityStatus ===
                "ESTIMATED" &&
            !estimatedAvailabilityDate
        ) {
            alert(
                "Estimated availability date is required."
            );
            return;
        }

        if (
            availabilityStatus ===
                "NOT_AVAILABLE" &&
            estimatedAvailabilityDate
        ) {
            alert(
                "Estimated date is not required for Not Available."
            );
            return;
        }

        setSavingItemId(item.id);

        try {
            const request = {
                partNumber,
                productName:
                    productName || null,
                brandName: brandname || null,
                hsnCode:
                    hsnCode || null,
                sellingQuantity,
                quotedMrp,
                quotedSellingPrice,
                availabilityStatus,
                estimatedAvailabilityDate:
                    availabilityStatus ===
                    "ESTIMATED"
                        ? estimatedAvailabilityDate
                        : null,
                notes:
                    form.notes?.trim() || null,
            };

            const updatedLead =
                await saveLeadItemProcurement(
                    id,
                    item.id,
                    request
                );

            setLead(updatedLead);

            /*
             * Rebuild the forms from the updated
             * backend response so the UI reflects
             * the backend's final values.
             */
            const updatedForms = {};

            updatedLead?.items?.forEach(
                (updatedItem) => {
                    updatedForms[
                        updatedItem.id
                    ] = {
                        partNumber:
                            updatedItem.partNumber ||
                            "",
                        productName:
                            updatedItem.productName ||
                            "",
                        brandname:
                            updatedItem.brandname ||
                            "",
                        hsnCode:
                            updatedItem.hsnCode ||
                            "",
                        quotedMrp:
                            updatedItem.quotedMrp ??
                            "",
                        quotedSellingPrice:
                            updatedItem.quotedSellingPrice ??
                            "",
                        sellingQuantity:
                            updatedItem.sellingQuantity ??
                            "",
                        availabilityStatus:
                            updatedItem.availabilityStatus ||
                            "",
                        estimatedAvailabilityDate:
                            updatedItem.estimatedAvailabilityDate ||
                            "",
                        notes:
                            updatedItem.notes ||
                            "",
                    };
                }
            );

            setProcurementForms(
                updatedForms
            );

            setPartNumbers((previous) => ({
                ...previous,
                [item.id]:
                    updatedLead?.items?.find(
                        (updatedItem) =>
                            updatedItem.id ===
                            item.id
                    )?.partNumber ||
                    partNumber,
            }));

            alert(
                "Procurement details saved successfully."
            );
        } catch (error) {
            console.error(
                "Unable to save procurement details:",
                error
            );

            alert(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to save procurement details."
            );
        } finally {
            setSavingItemId(null);
        }
    };
/*
 * =========================================================
 * COMPLETE PROCUREMENT
 * =========================================================
 */
const completeProcurement = async () => {
    if (!lead?.id) {
        alert("Lead ID is missing.");
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to complete procurement for this lead?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await completeLeadProcurement(
            lead.id
        );

        setLead(response);

        alert("Procurement completed successfully.");
    } catch (error) {
        console.error(
            "Failed to complete procurement:",
            error
        );

        const message =
            error?.response?.data?.message ||
            error?.response?.data ||
            "Failed to complete procurement.";

        alert(message);
    }
};
    /*
     * =========================================================
     * AVAILABILITY DISPLAY
     * =========================================================
     */

    const getAvailabilityType = (
        status
    ) => {
        switch (
            status?.toUpperCase()
        ) {
            case "AVAILABLE":
                return "available";

            case "PARTIAL":
                return "partial";

            case "ESTIMATED":
                return "estimated";

            case "NOT_AVAILABLE":
                return "notAvailable";

            default:
                return "pending";
        }
    };

    /*
     * =========================================================
     * LOADING
     * =========================================================
     */

    if (loading) {
        return (
            <div style={loadingContainerStyle}>
                <Loader2
                    size={20}
                    style={{
                        animation:
                            "leadDetailsSpin 1s linear infinite",
                    }}
                />
                <span>
                    Loading lead...
                </span>

                <style>
                    {`
                        @keyframes leadDetailsSpin {
                            from {
                                transform: rotate(0deg);
                            }
                            to {
                                transform: rotate(360deg);
                            }
                        }
                    `}
                </style>
            </div>
        );
    }

    /*
     * =========================================================
     * LEAD NOT FOUND
     * =========================================================
     */

    if (!lead) {
        return (
            <div style={{ padding: "24px" }}>
                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            "/owner/sales/leads"
                        )
                    }
                    style={backButtonStyle}
                >
                    <ArrowLeft size={15} />
                    Back to Leads
                </button>

                <div
                    style={{
                        marginTop: "20px",
                    }}
                >
                    Lead not found.
                </div>
            </div>
        );
    }

    /*
     * =========================================================
     * MAIN PAGE
     * =========================================================
     */

    return (
        <section style={pageStyle}>
            {/* =================================================
                HEADER
            ================================================= */}

            <div style={headerStyle}>
                <div>
                    <div
                        style={
                            eyebrowStyle
                        }
                    >
                        SALES / PROCUREMENT
                    </div>

                    <h1
                        style={
                            pageTitleStyle
                        }
                    >
                        Lead Details
                    </h1>

                    <p
                        style={
                            leadNumberStyle
                        }
                    >
                        {lead.leadNumber}
                    </p>
                </div>
<div
    style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
    }}
>
    <button
        type="button"
        onClick={completeProcurement}
        style={backButtonStyle}
    >
        Complete Procurement
    </button>

    <button
        type="button"
        onClick={() =>
            navigate(
                "/owner/sales/leads"
            )
        }
        style={backButtonStyle}
    >
        <ArrowLeft size={15} />
        Back to Leads
    </button>
</div>
            </div>

            {/* =================================================
                CUSTOMER / LEAD INFORMATION
            ================================================= */}

            <div style={sectionStyle}>
                <div
                    style={
                        sectionHeaderRowStyle
                    }
                >
                    <div>
                        <h2
                            style={
                                sectionTitleStyle
                            }
                        >
                            Customer & Lead
                            Information
                        </h2>

                        <p
                            style={
                                helperTextStyle
                            }
                        >
                            Basic information
                            associated with this
                            lead.
                        </p>
                    </div>

                    <StatusPill
                        status={
                            lead.status
                        }
                    />
                </div>

                <div style={infoGrid}>
                    <InfoItem
                        label="Lead Number"
                        value={
                            lead.leadNumber
                        }
                    />

                    <InfoItem
                        label="Customer"
                        value={
                            lead.customerName
                        }
                    />

                    <InfoItem
                        label="Store"
                        value={
                            lead.storeName
                        }
                    />

                    <InfoItem
                        label="Status"
                        value={
                            lead.status
                        }
                    />

                    <InfoItem
                        label="Created By"
                        value={
                            lead.createdByName
                        }
                    />

                    <InfoItem
                        label="Created"
                        value={
                            lead.createdAt
                                ? new Date(
                                      lead.createdAt
                                  ).toLocaleString()
                                : "-"
                        }
                    />
                </div>
            </div>

            {/* =================================================
                CUSTOMER REQUIREMENT
            ================================================= */}

            <div style={sectionStyle}>
                <h2
                    style={
                        sectionTitleStyle
                    }
                >
                    Customer Requirement
                </h2>

                <div
                    style={
                        requirementBox
                    }
                >
                    {lead.customerRequirement ||
                        "-"}
                </div>

                {lead.notes && (
                    <div
                        style={{
                            marginTop:
                                "16px",
                        }}
                    >
                        <InfoItem
                            label="Lead Notes"
                            value={
                                lead.notes
                            }
                        />
                    </div>
                )}
            </div>

            {/* =================================================
                PROCUREMENT TABLE
            ================================================= */}

            <div style={sectionStyle}>
                <div
                    style={
                        procurementHeaderStyle
                    }
                >
                    <div>
                        <div
                            style={
                                procurementTitleRowStyle
                            }
                        >
                            <h2
                                style={
                                    sectionTitleStyle
                                }
                            >
                                Procurement
                            </h2>

                            <span
                                style={
                                    procurementBadgeStyle
                                }
                            >
                                Purchase
                                Details
                            </span>
                        </div>

                        <p
                            style={
                                helperTextStyle
                            }
                        >
                            Enter the exact part
                            number. Product
                            information is looked
                            up automatically.
                            Review pricing,
                            quantity and
                            availability before
                            saving.
                        </p>
                    </div>
                </div>

                {lead.items?.length >
                0 ? (
                    <div
                        style={
                            tableWrapperStyle
                        }
                    >
                        <table
                            style={
                                tableStyle
                            }
                        >
                            <thead>
                                <tr>
                                    <th
                                        style={
                                            stickyFirstHeaderStyle
                                        }
                                    >
                                        #
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        Customer
                                        Requirement
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        Required
                                        Qty
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        Part
                                        Number
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        Product
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        Brand
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        HSN
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        Store
                                        Available
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        MRP
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        Selling
                                        Price
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        Selling
                                        Qty
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        Availability
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        Estimated
                                        Date
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        Notes
                                    </th>

                                    <th
                                        style={
                                            tableHeaderStyle
                                        }
                                    >
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {lead.items.map(
                                    (
                                        item,
                                        index
                                    ) => {
                                        const result =
                                            lookupResults[
                                                item.id
                                            ];

                                        const form =
                                            procurementForms[
                                                item.id
                                            ] ||
                                            {};

                                        const lookupLoading =
                                            lookupLoadingItemId ===
                                            item.id;

                                        const saving =
                                            savingItemId ===
                                            item.id;

                                        const requiredQuantity =
                                            item.requestedQuantity ??
                                            0;

                                        const isFound =
                                            result?.foundInStore ===
                                            true;

                                        const availableQuantity =
                                            isFound
                                                ? result?.availableQuantity ??
                                                  0
                                                : 0;

                                        const isNotFound =
                                            result &&
                                            result.foundInStore ===
                                                false;

                                        const availabilityStatus =
                                            (
                                                form.availabilityStatus ||
                                                ""
                                            ).toUpperCase();

                                        return (
                                            <tr
                                                key={
                                                    item.id ??
                                                    index
                                                }
                                                style={
                                                    tableRowStyle
                                                }
                                            >
                                                {/* =====================
                                                    ROW
                                                ====================== */}

                                                <td
                                                    style={
                                                        stickyFirstCellStyle
                                                    }
                                                >
                                                    <div
                                                        style={
                                                            rowNumberStyle
                                                        }
                                                    >
                                                        {index +
                                                            1}
                                                    </div>
                                                </td>

                                                {/* =====================
                                                    REQUIREMENT
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    <div
                                                        style={
                                                            requiredPartStyle
                                                        }
                                                    >
                                                        {
                                                            item.requirement
                                                        }
                                                    </div>

                                                    {item.vehicleDescription && (
                                                        <div
                                                            style={
                                                                secondaryTextStyle
                                                            }
                                                        >
                                                            Vehicle:{" "}
                                                            {
                                                                item.vehicleDescription
                                                            }
                                                        </div>
                                                    )}

                                                    {item.vin && (
                                                        <div
                                                            style={
                                                                secondaryTextStyle
                                                            }
                                                        >
                                                            VIN:{" "}
                                                            {
                                                                item.vin
                                                            }
                                                        </div>
                                                    )}
                                                </td>

                                                {/* =====================
                                                    REQUIRED QTY
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    <div
                                                        style={
                                                            requiredQuantityBoxStyle
                                                        }
                                                    >
                                                        {
                                                            requiredQuantity
                                                        }
                                                    </div>

                                                    <div
                                                        style={
                                                            quantityLabelStyle
                                                        }
                                                    >
                                                        Required
                                                    </div>
                                                </td>

                                                {/* =====================
                                                    PART NUMBER
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    <div
                                                        style={
                                                            partNumberCellStyle
                                                        }
                                                    >
                                                        <input
                                                            type="text"
                                                            value={
                                                                partNumbers[
                                                                    item.id
                                                                ] ||
                                                                ""
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                handlePartNumberChange(
                                                                    item.id,
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                            onKeyDown={(
                                                                event
                                                            ) =>
                                                                handlePartNumberKeyDown(
                                                                    event,
                                                                    item
                                                                )
                                                            }
                                                            placeholder="Enter part no."
                                                            style={
                                                                inputStyle
                                                            }
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                lookupProduct(
                                                                    item
                                                                )
                                                            }
                                                            disabled={
                                                                lookupLoading
                                                            }
                                                            style={
                                                                lookupIconButtonStyle
                                                            }
                                                            title="Lookup product"
                                                        >
                                                            {lookupLoading ? (
                                                                <Loader2
                                                                    size={
                                                                        14
                                                                    }
                                                                    style={{
                                                                        animation:
                                                                            "leadDetailsSpin 1s linear infinite",
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Search
                                                                    size={
                                                                        14
                                                                    }
                                                                />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {lookupLoading && (
                                                        <div
                                                            style={
                                                                lookupMessageStyle
                                                            }
                                                        >
                                                            Looking up
                                                            product...
                                                        </div>
                                                    )}

                                                    {isFound && (
                                                        <div
                                                            style={
                                                                foundMessageStyle
                                                            }
                                                        >
                                                            <CheckCircle
                                                                size={
                                                                    12
                                                                }
                                                            />
                                                            Product
                                                            found
                                                        </div>
                                                    )}

                                                    {isNotFound && (
                                                        <div
                                                            style={
                                                                notFoundMessageStyle
                                                            }
                                                        >
                                                            <AlertCircle
                                                                size={
                                                                    12
                                                                }
                                                            />
                                                            Not found
                                                            in this
                                                            store
                                                        </div>
                                                    )}
                                                </td>

                                                {/* =====================
                                                    PRODUCT
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    <input
                                                        type="text"
                                                        value={
                                                            form.productName ||
                                                            ""
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateProcurementForm(
                                                                item.id,
                                                                "productName",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        readOnly={
                                                            isFound
                                                        }
                                                        placeholder={
                                                            isFound
                                                                ? "Product"
                                                                : "Product name"
                                                        }
                                                        style={
                                                            isFound
                                                                ? readOnlyInputStyle
                                                                : inputStyle
                                                        }
                                                    />

                                                    {isFound && (
                                                        <div
                                                            style={
                                                                sourceLabelStyle
                                                            }
                                                        >
                                                            Catalogue
                                                            product
                                                        </div>
                                                    )}
                                                </td>

                                                {/* =====================
                                                    BRAND
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    <input
                                                        type="text"
                                                        value={
                                                            form.brandname ||
                                                            ""
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateProcurementForm(
                                                                item.id,
                                                                "brandname",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        readOnly={
                                                            isFound
                                                        }
                                                        placeholder={
                                                            isFound
                                                                ? "Brand"
                                                                : "Brand name"
                                                        }
                                                        style={
                                                            isFound
                                                                ? readOnlyInputStyle
                                                                : inputStyle
                                                        }
                                                    />
                                                </td>

                                                {/* =====================
                                                    HSN
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    <input
                                                        type="text"
                                                        value={
                                                            form.hsnCode ||
                                                            ""
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateProcurementForm(
                                                                item.id,
                                                                "hsnCode",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        readOnly={
                                                            isFound
                                                        }
                                                        placeholder={
                                                            isFound
                                                                ? "HSN"
                                                                : "HSN code"
                                                        }
                                                        style={
                                                            isFound
                                                                ? readOnlyInputStyle
                                                                : inputStyle
                                                        }
                                                    />
                                                </td>

                                                {/* =====================
                                                    STORE AVAILABLE
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    {isFound ? (
                                                        <div>
                                                            <div
                                                                style={
                                                                    stockNumberStyle
                                                                }
                                                            >
                                                                {
                                                                    availableQuantity
                                                                }
                                                            </div>

                                                            <div
                                                                style={
                                                                    secondaryTextStyle
                                                                }
                                                            >
                                                                Available
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div
                                                                style={
                                                                    stockZeroStyle
                                                                }
                                                            >
                                                                0
                                                            </div>

                                                            <div
                                                                style={
                                                                    secondaryTextStyle
                                                                }
                                                            >
                                                                Store
                                                                stock
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* =====================
                                                    MRP
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    <MoneyInput
                                                        value={
                                                            form.quotedMrp
                                                        }
                                                        onChange={(
                                                            value
                                                        ) =>
                                                            updateProcurementForm(
                                                                item.id,
                                                                "quotedMrp",
                                                                value
                                                            )
                                                        }
                                                    />
                                                </td>

                                                {/* =====================
                                                    SELLING PRICE
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    <MoneyInput
                                                        value={
                                                            form.quotedSellingPrice
                                                        }
                                                        onChange={(
                                                            value
                                                        ) =>
                                                            updateProcurementForm(
                                                                item.id,
                                                                "quotedSellingPrice",
                                                                value
                                                            )
                                                        }
                                                    />
                                                </td>

                                                {/* =====================
                                                    SELLING QTY
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={
                                                            form.sellingQuantity ??
                                                            ""
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateProcurementForm(
                                                                item.id,
                                                                "sellingQuantity",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        placeholder="Qty"
                                                        style={
                                                            quantityInputStyle
                                                        }
                                                    />

                                                    {isFound && (
                                                        <div
                                                            style={
                                                                quantityHintStyle
                                                            }
                                                        >
                                                            Max store:
                                                            {" "}
                                                            {
                                                                availableQuantity
                                                            }
                                                        </div>
                                                    )}
                                                </td>

                                                {/* =====================
                                                    AVAILABILITY
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    <select
                                                        value={
                                                            form.availabilityStatus ||
                                                            ""
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateProcurementForm(
                                                                item.id,
                                                                "availabilityStatus",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        style={
                                                            availabilitySelectStyle
                                                        }
                                                    >
                                                        <option value="">
                                                            Select
                                                        </option>

                                                        <option value="AVAILABLE">
                                                            Available
                                                        </option>

                                                        <option value="PARTIAL">
                                                            Partial
                                                        </option>

                                                        <option value="ESTIMATED">
                                                            Estimated
                                                        </option>

                                                        <option value="NOT_AVAILABLE">
                                                            Not
                                                            Available
                                                        </option>
                                                    </select>

                                                    {availabilityStatus && (
                                                        <div
                                                            style={{
                                                                marginTop:
                                                                    "7px",
                                                            }}
                                                        >
                                                            <AvailabilityBadge
                                                                status={
                                                                    availabilityStatus
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </td>

                                                {/* =====================
                                                    ESTIMATED DATE
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    {availabilityStatus ===
                                                    "ESTIMATED" ? (
                                                        <input
                                                            type="date"
                                                            value={
                                                                form.estimatedAvailabilityDate ||
                                                                ""
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateProcurementForm(
                                                                    item.id,
                                                                    "estimatedAvailabilityDate",
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                            style={
                                                                inputStyle
                                                            }
                                                        />
                                                    ) : (
                                                        <span
                                                            style={
                                                                mutedTextStyle
                                                            }
                                                        >
                                                            —
                                                        </span>
                                                    )}
                                                </td>

                                                {/* =====================
                                                    NOTES
                                                ====================== */}

                                                <td
                                                    style={
                                                        tableCellStyle
                                                    }
                                                >
                                                    <textarea
                                                        value={
                                                            form.notes ||
                                                            ""
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateProcurementForm(
                                                                item.id,
                                                                "notes",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        placeholder="Procurement notes"
                                                        rows={
                                                            2
                                                        }
                                                        style={
                                                            notesInputStyle
                                                        }
                                                    />
                                                </td>

                                                {/* =====================
                                                    SAVE
                                                ====================== */}

                                                <td
                                                    style={{
                                                        ...tableCellStyle,
                                                        minWidth:
                                                            "170px",
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            saveProcurement(
                                                                item
                                                            )
                                                        }
                                                        disabled={
                                                            saving
                                                        }
                                                        style={
                                                            saveProcurementButtonStyle
                                                        }
                                                    >
                                                        {saving ? (
                                                            <>
                                                                <Loader2
                                                                    size={
                                                                        14
                                                                    }
                                                                    style={{
                                                                        animation:
                                                                            "leadDetailsSpin 1s linear infinite",
                                                                    }}
                                                                />
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save
                                                                    size={
                                                                        14
                                                                    }
                                                                />
                                                                Save
                                                                Procurement
                                                            </>
                                                        )}
                                                    </button>

                                                    {item.availabilityStatus && (
                                                        <div
                                                            style={
                                                                savedStatusTextStyle
                                                            }
                                                        >
                                                            Current:
                                                            {" "}
                                                            {
                                                                item.availabilityStatus
                                                            }
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div
                        style={
                            emptyStateStyle
                        }
                    >
                        <div
                            style={
                                emptyStateTitleStyle
                            }
                        >
                            No required items
                        </div>

                        <div
                            style={
                                emptyStateTextStyle
                            }
                        >
                            This lead does not
                            contain any customer
                            requirements yet.
                        </div>
                    </div>
                )}
            </div>

            {/* =================================================
                STATUS LEGEND
            ================================================= */}

            <div
                style={
                    statusLegendContainerStyle
                }
            >
                <div
                    style={
                        statusLegendTitleStyle
                    }
                >
                    Availability
                </div>

                <div
                    style={
                        statusLegendItemsStyle
                    }
                >
                    <AvailabilityBadge
                        status="AVAILABLE"
                    />

                    <AvailabilityBadge
                        status="PARTIAL"
                    />

                    <AvailabilityBadge
                        status="ESTIMATED"
                    />

                    <AvailabilityBadge
                        status="NOT_AVAILABLE"
                    />
                </div>
            </div>

            <style>
                {`
                    @keyframes leadDetailsSpin {
                        from {
                            transform: rotate(0deg);
                        }
                        to {
                            transform: rotate(360deg);
                        }
                    }

                    .lead-details-table-row:hover {
                        background: #FAFCFF;
                    }

                    .lead-details-table-input:focus {
                        border-color: #2563EB;
                        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
                    }

                    @media (max-width: 900px) {
                        .lead-details-info-grid {
                            grid-template-columns: 1fr 1fr !important;
                        }
                    }

                    @media (max-width: 600px) {
                        .lead-details-info-grid {
                            grid-template-columns: 1fr !important;
                        }
                    }
                `}
            </style>
        </section>
    );
}

/*
 * =========================================================
 * SMALL COMPONENTS
 * =========================================================
 */

function InfoItem({
    label,
    value,
}) {
    return (
        <div>
            <div
                style={
                    infoLabelStyle
                }
            >
                {label}
            </div>

            <div
                style={
                    infoValueStyle
                }
            >
                {value || "-"}
            </div>
        </div>
    );
}

function MoneyInput({
    value,
    onChange,
}) {
    return (
        <div
            style={
                moneyInputWrapperStyle
            }
        >
            <span
                style={
                    currencyPrefixStyle
                }
            >
                ₹
            </span>

            <input
                type="number"
                min="0"
                step="0.01"
                value={
                    value ?? ""
                }
                onChange={(
                    event
                ) =>
                    onChange(
                        event.target
                            .value
                    )
                }
                placeholder="0.00"
                style={
                    moneyInputStyle
                }
            />
        </div>
    );
}

function AvailabilityBadge({
    status,
}) {
    const normalizedStatus =
        status?.toUpperCase();

    const config = {
        AVAILABLE: {
            text: "Available",
            background:
                "#ECFDF5",
            color: "#047857",
            border:
                "#A7F3D0",
            icon: (
                <CheckCircle
                    size={12}
                />
            ),
        },

        PARTIAL: {
            text: "Partial",
            background:
                "#FFF7ED",
            color: "#C2410C",
            border:
                "#FED7AA",
            icon: (
                <AlertCircle
                    size={12}
                />
            ),
        },

        ESTIMATED: {
            text: "Estimated",
            background:
                "#EFF6FF",
            color: "#1D4ED8",
            border:
                "#BFDBFE",
            icon: (
                <AlertCircle
                    size={12}
                />
            ),
        },

        NOT_AVAILABLE: {
            text: "Not Available",
            background:
                "#FEF2F2",
            color: "#B91C1C",
            border:
                "#FECACA",
            icon: (
                <AlertCircle
                    size={12}
                />
            ),
        },
    };

    const current =
        config[
            normalizedStatus
        ];

    if (!current) {
        return null;
    }

    return (
        <span
            style={{
                display:
                    "inline-flex",
                alignItems:
                    "center",
                gap: "5px",
                padding:
                    "5px 8px",
                borderRadius:
                    "999px",
                background:
                    current.background,
                color:
                    current.color,
                border: `1px solid ${current.border}`,
                fontSize: "11px",
                fontWeight: 700,
                whiteSpace:
                    "nowrap",
            }}
        >
            {current.icon}
            {current.text}
        </span>
    );
}

function StatusPill({
    status,
}) {
    return (
        <AvailabilityBadge
            status={status}
        />
    );
}

/*
 * =========================================================
 * PAGE STYLES
 * =========================================================
 */

const pageStyle = {
    padding: "24px",
    background: "#F8FAFC",
    minHeight: "100%",
    boxSizing: "border-box",
};

const loadingContainerStyle = {
    minHeight: "300px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    color: "#475569",
    fontSize: "14px",
};

const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "24px",
};

const eyebrowStyle = {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "#64748B",
    marginBottom: "5px",
};

const pageTitleStyle = {
    margin: 0,
    fontSize: "25px",
    fontWeight: 750,
    color: "#0F172A",
    letterSpacing: "-0.02em",
};

const leadNumberStyle = {
    margin: "6px 0 0",
    color: "#64748B",
    fontSize: "14px",
    fontWeight: 500,
};

const backButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 14px",
    border: "1px solid #CBD5E1",
    borderRadius: "8px",
    background: "#FFFFFF",
    color: "#334155",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
};

const sectionStyle = {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "22px",
    marginBottom: "20px",
    boxShadow:
        "0 1px 2px rgba(15, 23, 42, 0.03)",
};

const sectionHeaderRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "20px",
};

const sectionTitleStyle = {
    margin: "0 0 6px",
    fontSize: "17px",
    fontWeight: 700,
    color: "#0F172A",
};

const helperTextStyle = {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.5,
    color: "#64748B",
};

const infoGrid = {
    display: "grid",
    gridTemplateColumns:
        "repeat(3, minmax(0, 1fr))",
    gap: "20px 26px",
};

const infoLabelStyle = {
    marginBottom: "5px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
};

const infoValueStyle = {
    fontSize: "14px",
    color: "#0F172A",
    fontWeight: 600,
    wordBreak: "break-word",
};

const requirementBox = {
    padding: "15px",
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    color: "#334155",
    fontSize: "14px",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
};

/*
 * =========================================================
 * PROCUREMENT HEADER
 * =========================================================
 */

const procurementHeaderStyle = {
    marginBottom: "18px",
};

const procurementTitleRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "2px",
};

const procurementBadgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    color: "#1D4ED8",
    fontSize: "10px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
};

/*
 * =========================================================
 * TABLE
 * =========================================================
 */

const tableWrapperStyle = {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    border: "1px solid #E2E8F0",
    borderRadius: "10px",
};

const tableStyle = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    minWidth: "2200px",
    background: "#FFFFFF",
};

const tableHeaderStyle = {
    textAlign: "left",
    padding: "12px 10px",
    borderBottom: "1px solid #CBD5E1",
    background: "#F8FAFC",
    fontSize: "11px",
    fontWeight: 800,
    color: "#475569",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    letterSpacing: "0.025em",
    position: "sticky",
    top: 0,
    zIndex: 2,
};

const stickyFirstHeaderStyle = {
    ...tableHeaderStyle,
    position: "sticky",
    left: 0,
    zIndex: 4,
    width: "45px",
    minWidth: "45px",
    textAlign: "center",
};

const tableCellStyle = {
    padding: "13px 10px",
    borderBottom: "1px solid #E2E8F0",
    verticalAlign: "top",
    fontSize: "12px",
    color: "#334155",
    background: "#FFFFFF",
};

const stickyFirstCellStyle = {
    ...tableCellStyle,
    position: "sticky",
    left: 0,
    zIndex: 1,
    width: "45px",
    minWidth: "45px",
    textAlign: "center",
};

const tableRowStyle = {
    transition: "background 0.15s ease",
};

const rowNumberStyle = {
    width: "26px",
    height: "26px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "7px",
    background: "#F1F5F9",
    color: "#475569",
    fontSize: "11px",
    fontWeight: 800,
};

const requiredPartStyle = {
    fontWeight: 700,
    color: "#0F172A",
    lineHeight: 1.4,
    minWidth: "145px",
};

const secondaryTextStyle = {
    marginTop: "4px",
    fontSize: "10px",
    color: "#64748B",
    lineHeight: 1.4,
};

const requiredQuantityBoxStyle = {
    fontSize: "17px",
    fontWeight: 800,
    color: "#0F172A",
};

const quantityLabelStyle = {
    marginTop: "2px",
    fontSize: "10px",
    color: "#94A3B8",
};

const stockNumberStyle = {
    fontSize: "17px",
    fontWeight: 800,
    color: "#047857",
};

const stockZeroStyle = {
    fontSize: "17px",
    fontWeight: 800,
    color: "#94A3B8",
};

const mutedTextStyle = {
    color: "#94A3B8",
    fontSize: "12px",
};

const sourceLabelStyle = {
    marginTop: "4px",
    fontSize: "10px",
    color: "#059669",
    fontWeight: 600,
};

const inputStyle = {
    width: "145px",
    minWidth: "145px",
    boxSizing: "border-box",
    padding: "8px 9px",
    border: "1px solid #CBD5E1",
    borderRadius: "7px",
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: "12px",
    outline: "none",
};

const readOnlyInputStyle = {
    ...inputStyle,
    background: "#F8FAFC",
    color: "#334155",
    cursor: "default",
};

const quantityInputStyle = {
    ...inputStyle,
    width: "85px",
    minWidth: "85px",
    textAlign: "center",
};

const notesInputStyle = {
    width: "145px",
    minWidth: "145px",
    boxSizing: "border-box",
    padding: "8px 9px",
    border: "1px solid #CBD5E1",
    borderRadius: "7px",
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: "12px",
    lineHeight: 1.4,
    outline: "none",
    resize: "vertical",
};

const partNumberCellStyle = {
    display: "flex",
    alignItems: "center",
    gap: "5px",
};

const lookupIconButtonStyle = {
    width: "32px",
    height: "32px",
    minWidth: "32px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #CBD5E1",
    borderRadius: "7px",
    background: "#0F172A",
    color: "#FFFFFF",
    cursor: "pointer",
};

const lookupMessageStyle = {
    marginTop: "5px",
    fontSize: "10px",
    color: "#64748B",
    whiteSpace: "nowrap",
};

const foundMessageStyle = {
    marginTop: "5px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "10px",
    fontWeight: 700,
    color: "#047857",
};

const notFoundMessageStyle = {
    marginTop: "5px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "10px",
    fontWeight: 700,
    color: "#C2410C",
};

const moneyInputWrapperStyle = {
    position: "relative",
    width: "115px",
    minWidth: "115px",
};

const currencyPrefixStyle = {
    position: "absolute",
    left: "9px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748B",
    fontSize: "12px",
    fontWeight: 700,
    pointerEvents: "none",
};

const moneyInputStyle = {
    width: "115px",
    minWidth: "115px",
    boxSizing: "border-box",
    padding: "8px 8px 8px 23px",
    border: "1px solid #CBD5E1",
    borderRadius: "7px",
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: "12px",
    outline: "none",
};

const availabilitySelectStyle = {
    width: "135px",
    minWidth: "135px",
    boxSizing: "border-box",
    padding: "8px 8px",
    border: "1px solid #CBD5E1",
    borderRadius: "7px",
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: "12px",
    outline: "none",
    cursor: "pointer",
};

const quantityHintStyle = {
    marginTop: "5px",
    fontSize: "9px",
    color: "#64748B",
    whiteSpace: "nowrap",
};

const saveProcurementButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    width: "160px",
    minHeight: "36px",
    padding: "8px 10px",
    border: "none",
    borderRadius: "7px",
    background: "#2563EB",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 700,
    boxShadow:
        "0 1px 2px rgba(37, 99, 235, 0.18)",
};

const savedStatusTextStyle = {
    marginTop: "7px",
    fontSize: "10px",
    color: "#64748B",
    fontWeight: 600,
};

/*
 * =========================================================
 * EMPTY STATE
 * =========================================================
 */

const emptyStateStyle = {
    padding: "42px 20px",
    textAlign: "center",
    border: "1px dashed #CBD5E1",
    borderRadius: "9px",
    background: "#F8FAFC",
};

const emptyStateTitleStyle = {
    fontSize: "14px",
    fontWeight: 700,
    color: "#334155",
};

const emptyStateTextStyle = {
    marginTop: "5px",
    fontSize: "12px",
    color: "#64748B",
};

/*
 * =========================================================
 * STATUS LEGEND
 * =========================================================
 */

const statusLegendContainerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    padding: "14px 17px",
    marginBottom: "20px",
    border: "1px solid #E2E8F0",
    borderRadius: "10px",
    background: "#FFFFFF",
};

const statusLegendTitleStyle = {
    fontSize: "12px",
    fontWeight: 800,
    color: "#475569",
};

const statusLegendItemsStyle = {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    flexWrap: "wrap",
};

export default LeadDetails;