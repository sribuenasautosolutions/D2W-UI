import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
    CalendarDays,
    CheckCircle2,
    Loader2,
    Plus,
    Search,
    Trash2,
    UserRound,
} from "lucide-react";

import { getAllStores } from "../../services/storeService";
import {
    getProductBatches,
} from "../../services/storeInventoryPanelService";

import { searchProducts } from "../../services/productService";

import {
    calculateOrder,
    placeOrder,
} from "../../services/orderService";

import {
    getCustomerByMobile,
    saveCustomer,
} from "../../services/customerService";

import "./NewSalePage.css";


/* =========================================================
   HELPERS
========================================================= */

const readUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem("user")
        );
    } catch {
        return null;
    }
};


const RECALC_DEBOUNCE_MS = 400;


const GST_PERCENTAGES = [
    0,
    5,
    12,
    18,
    28,
];


const money = (value) =>
    `₹${Number(value ?? 0).toFixed(2)}`;


const normalizePercentage = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.min(
        100,
        Math.max(0, number)
    );
};


const normalizeGstPercentage = (value) => {
    const number = Number(value);

    if (
        GST_PERCENTAGES.includes(number)
    ) {
        return number;
    }

    return 0;
};


/* =========================================================
   FRONTEND GST TYPE -> BACKEND GST TYPE

   Frontend:
       CGST_SGST
       IGST
       NONE

   Backend:
       GST_5
       GST_12
       GST_18
       GST_28
       IGST_5
       IGST_12
       IGST_18
       IGST_28
       NONE
========================================================= */

const toBackendGstType = (
    gstType,
    gstPercentage
) => {
    const percentage =
        Number(gstPercentage || 0);

    if (
        gstType === "CGST_SGST"
    ) {
        if (percentage === 5) {
            return "GST_5";
        }

        if (percentage === 12) {
            return "GST_12";
        }

        if (percentage === 18) {
            return "GST_18";
        }

        if (percentage === 28) {
            return "GST_28";
        }

        return "NONE";
    }


    if (
        gstType === "IGST"
    ) {
        if (percentage === 5) {
            return "IGST_5";
        }

        if (percentage === 12) {
            return "IGST_12";
        }

        if (percentage === 18) {
            return "IGST_18";
        }

        if (percentage === 28) {
            return "IGST_28";
        }

        return "NONE";
    }


    return "NONE";
};


/* =========================================================
   PAGE
========================================================= */

export default function NewSalePage() {

    const navigate =
        useNavigate();


    const user =
        useMemo(
            () => readUser(),
            []
        );


    const isSuperAdmin =
        user?.role === "SUPER_ADMIN";


    /* =====================================================
       STORE
    ===================================================== */

    const [
        selectedStoreId,
        setSelectedStoreId,
    ] = useState(
        isSuperAdmin
            ? ""
            : String(
                user?.storeId || ""
            )
    );


    const [
        stores,
        setStores,
    ] = useState([]);


    const [
        storeLoading,
        setStoreLoading,
    ] = useState(false);


    const [
        storeError,
        setStoreError,
    ] = useState("");


    useEffect(() => {

        if (!isSuperAdmin) {
            return;
        }


        const loadStores =
            async () => {

                setStoreLoading(true);
                setStoreError("");

                try {

                    const response =
                        await getAllStores();


                    const data =
                        Array.isArray(response)
                            ? response
                            : Array.isArray(
                                response?.content
                            )
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

    }, [
        isSuperAdmin,
    ]);


    const handleStoreChange =
        (event) => {

            const newStoreId =
                event.target.value;


            setSelectedStoreId(
                newStoreId
            );


            /*
             * A bill belongs to one store.
             * Changing store clears current bill.
             */

            setItems([]);

            setSearchText("");
            setSearchResults([]);
            setShowProductResults(false);
            setProductSearchError("");
            setCalculation(null);
            setCalcError("");
        };


    /* =====================================================
       GST DEFAULTS
    ===================================================== */

    const [
        defaultGstType,
        setDefaultGstType,
    ] = useState(
        "CGST_SGST"
    );


    const [
        defaultGstPercentage,
        setDefaultGstPercentage,
    ] = useState(18);


    /*
     * GST selection applies to every current item.
     */

    const handleDefaultGstTypeChange =
        (value) => {

            setDefaultGstType(value);


            if (value === "NONE") {

                setItems(
                    (current) =>
                        current.map(
                            (item) => ({
                                ...item,
                                gstType: "NONE",
                                gstPercentage: 0,
                            })
                        )
                );

                return;
            }


            setItems(
                (current) =>
                    current.map(
                        (item) => ({
                            ...item,
                            gstType: value,
                            gstPercentage:
                                Number(
                                    defaultGstPercentage
                                ),
                        })
                    )
            );

        };


    const handleDefaultGstPercentageChange =
        (value) => {

            const percentage =
                normalizeGstPercentage(
                    value
                );


            setDefaultGstPercentage(
                percentage
            );


            if (
                defaultGstType === "NONE"
            ) {

                setItems(
                    (current) =>
                        current.map(
                            (item) => ({
                                ...item,
                                gstType: "NONE",
                                gstPercentage: 0,
                            })
                        )
                );

                return;
            }


            setItems(
                (current) =>
                    current.map(
                        (item) => ({
                            ...item,
                            gstPercentage:
                                percentage,
                        })
                    )
            );

        };


    /* =====================================================
       PRODUCT SEARCH
    ===================================================== */

    const [
        searchText,
        setSearchText,
    ] = useState("");


    const [
        searchResults,
        setSearchResults,
    ] = useState([]);


    const [
        productLoading,
        setProductLoading,
    ] = useState(false);


    const [
        productSearchError,
        setProductSearchError,
    ] = useState("");


    const [
        showProductResults,
        setShowProductResults,
    ] = useState(false);


    const handleProductSearch =
        async (text) => {

            setSearchText(text);
            setProductSearchError("");


            if (!selectedStoreId) {

                setSearchResults([]);
                setShowProductResults(false);

                return;
            }


            const trimmedText =
                text.trim();


            if (
                trimmedText.length < 2
            ) {

                setSearchResults([]);
                setShowProductResults(false);

                return;
            }


            setProductLoading(true);
            setShowProductResults(true);


            try {

               const response =
    await searchProducts(
        trimmedText,
        selectedStoreId
    
                    );


                const results =
                    Array.isArray(response)
                        ? response
                        : Array.isArray(
                            response?.content
                        )
                            ? response.content
                            : [];


                setSearchResults(results);

            } catch (error) {

                console.error(
                    "Store inventory search failed:",
                    error
                );


                setSearchResults([]);

                setProductSearchError(
                    error?.response?.data?.message ||
                    "Unable to search store inventory."
                );

            } finally {

                setProductLoading(false);

            }

        };


    /* =====================================================
       BILL ITEMS
    ===================================================== */

    const [
        items,
        setItems,
    ] = useState([]);


    /*
     * IMPORTANT:
     *
     * This function intentionally performs the complete
     * duplicate check inside setItems(current => ...).
     *
     * This prevents stale React state from causing the
     * second product to disappear.
     */

    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [batchLoading, setBatchLoading] = useState(false);
    const [availableBatches, setAvailableBatches] = useState([]);
    const [selectedProductForBatch, setSelectedProductForBatch] = useState(null);
    const [selectedBatchId, setSelectedBatchId] = useState(null);

    /*
     * BATCH RULE
     * ----------
     * ONE available batch  -> add immediately.
     * MULTIPLE batches      -> show batch selector.
     * NO available batches  -> do not add.
     *
     * FIFO/recommended batch is preselected when the backend
     * marks one as recommended/FIFO.
     */

    const closeBatchSelector = () => {
        setBatchModalOpen(false);
        setSelectedProductForBatch(null);
        setAvailableBatches([]);
        setSelectedBatchId(null);
    };

    const addProductWithBatch = (product, batch) => {
        const productId =
            product.productId ??
            product.id ??
            null;

        const inventoryId =
            product.inventoryId;

        const localProductId =
            product.localProductId ??
            null;

        const batchId =
            batch?.batchId ??
            batch?.id ??
            null;

        const availableQuantity =
            Number(
                batch?.availableQuantity ??
                0
            );

        if (
            !inventoryId ||
            (!productId && !localProductId) ||
            !batchId ||
            availableQuantity <= 0
        ) {
            console.error(
                "Cannot add product/batch:",
                {
                    product,
                    batch,
                }
            );
            return;
        }

        setItems((current) => {
            /*
             * Same product + different batch must remain
             * as separate bill lines.
             */
            const existingIndex =
                current.findIndex(
                    (item) =>
                        String(
                            item.inventoryId
                        ) ===
                            String(
                                inventoryId
                            ) &&
                        String(
                            item.batchId
                        ) ===
                            String(
                                batchId
                            )
                );

            if (
                existingIndex >= 0
            ) {
                const existing =
                    current[
                        existingIndex
                    ];

                const currentQuantity =
                    Number(
                        existing.quantity ||
                        0
                    );

                if (
                    currentQuantity >=
                    availableQuantity
                ) {
                    return current;
                }

                return current.map(
                    (
                        item,
                        index
                    ) =>
                        index ===
                        existingIndex
                            ? {
                                  ...item,
                                  quantity:
                                      currentQuantity +
                                      1,
                              }
                            : item
                );
            }

            return [
                ...current,
                {
                    productId,
                    localProductId,
                    inventoryId,

                    batchId,
                    batchNumber:
                        batch.batchNumber ??
                        batch.batchNo ??
                        batch.number ??
                        null,

                    partNumber:
                        product.partNumber ??
                        "-",

                    itemName:
                        product.itemName ??
                        product.productName ??
                        product.name ??
                        "-",

                    quantity: 1,
                    availableQuantity,

                    /*
                     * Price belongs to the selected batch.
                     */
                    mrp: Number(
                        batch.mrp ??
                        0
                    ),

                    sellingPrice:
                        Number(
                            batch.sellingPrice ??
                            batch.sellingPriceAmount ??
                            0
                        ),

                    discountPercentage:
                        0,

                    gstType:
                        defaultGstType ===
                        "NONE"
                            ? "NONE"
                            : defaultGstType,

                    gstPercentage:
                        defaultGstType ===
                        "NONE"
                            ? 0
                            : Number(
                                  defaultGstPercentage
                              ),

                    gstAmount: 0,
                    taxableAmount: 0,
                    lineTotal: 0,
                },
            ];
        });

        setSearchText("");
        setSearchResults([]);
        setShowProductResults(false);
        closeBatchSelector();
    };

    const handleAddProduct = async (
        product
    ) => {
        if (
            !selectedStoreId ||
            !product?.inventoryId
        ) {
            return;
        }

        try {
            setBatchLoading(true);

            const response =
                await getProductBatches(
                    Number(
                        selectedStoreId
                    ),
                    Number(
                        product.inventoryId
                    )
                );

            /*
             * Support both:
             *   [...]
             * and:
             *   { content: [...] }
             */
            const rawBatches =
                Array.isArray(response)
                    ? response
                    : Array.isArray(
                          response?.content
                      )
                        ? response.content
                        : [];

            /*
             * Only batches with available
             * quantity can be selected.
             */
            const batches =
                rawBatches.filter(
                    (batch) =>
                        Number(
                            batch?.availableQuantity ??
                            0
                        ) > 0
                );

            if (
                batches.length === 0
            ) {
                alert(
                    "No available batch stock for this product."
                );
                return;
            }

            /*
             * IMPORTANT:
             * ONE BATCH = NO POPUP.
             */
            if (
                batches.length === 1
            ) {
                addProductWithBatch(
                    product,
                    batches[0]
                );
                return;
            }

            /*
             * IMPORTANT:
             * MULTIPLE BATCHES = SHOW POPUP.
             *
             * Preselect FIFO/recommended batch
             * when backend provides that information.
             */
            const recommendedBatch =
                batches.find(
                    (batch) =>
                        batch?.recommended ===
                            true ||
                        batch?.fifo === true ||
                        batch?.isFifo === true
                ) ??
                batches[0];

            setSelectedProductForBatch(
                product
            );

            setAvailableBatches(
                batches
            );

            setSelectedBatchId(
                recommendedBatch?.batchId ??
                recommendedBatch?.id ??
                null
            );

            setBatchModalOpen(
                true
            );
        } catch (error) {
            console.error(
                "Failed to load product batches:",
                error
            );

            alert(
                error?.response?.data
                    ?.message ||
                "Unable to load product batches."
            );
        } finally {
            setBatchLoading(
                false
            );
        }
    };

    const confirmBatchSelection =
        () => {
            if (
                !selectedProductForBatch ||
                !selectedBatchId
            ) {
                return;
            }

            const batch =
                availableBatches.find(
                    (item) =>
                        String(
                            item?.batchId ??
                            item?.id
                        ) ===
                        String(
                            selectedBatchId
                        )
                );

            if (batch) {
                addProductWithBatch(
                    selectedProductForBatch,
                    batch
                );
            }
        };



    /* =====================================================
       QUANTITY
    ===================================================== */

    const updateItemQuantity =
        (
            index,
            value
        ) => {

            const requestedQuantity =
                Number(value);


            setItems(
                (current) =>
                    current.map(
                        (
                            item,
                            itemIndex
                        ) => {

                            if (
                                itemIndex !==
                                index
                            ) {

                                return item;
                            }


                            const availableQuantity =
                                Number(
                                    item.availableQuantity ??
                                    0
                                );


                            if (
                                !Number.isFinite(
                                    requestedQuantity
                                ) ||
                                requestedQuantity < 1
                            ) {

                                return {
                                    ...item,
                                    quantity: 1,
                                };

                            }


                            return {
                                ...item,

                                quantity:
                                    Math.min(
                                        requestedQuantity,
                                        availableQuantity
                                    ),
                            };

                        }
                    )
            );

        };


    /* =====================================================
       DISCOUNT
    ===================================================== */

    const updateItemDiscount =
        (
            index,
            value
        ) => {

            const discount =
                normalizePercentage(
                    value
                );


            setItems(
                (current) =>
                    current.map(
                        (
                            item,
                            itemIndex
                        ) =>
                            itemIndex ===
                            index
                                ? {
                                    ...item,

                                    discountPercentage:
                                        discount,
                                }
                                : item
                    )
            );

        };


    /* =====================================================
       REMOVE ITEM
    ===================================================== */

    const removeItem =
        (index) => {

            setItems(
                (current) =>
                    current.filter(
                        (
                            _,
                            itemIndex
                        ) =>
                            itemIndex !==
                            index
                    )
            );

        };


    /* =====================================================
       CALCULATION
    ===================================================== */

    const [
        calculation,
        setCalculation,
    ] = useState(null);

    // Overall bill discount percentage.
    // This value is sent to the backend calculation and final invoice payload.
    const [
        billDiscountPercent,
        setBillDiscountPercent,
    ] = useState(0);

    const handleBillDiscountChange = (value) => {
        const discount = normalizePercentage(value);
        setBillDiscountPercent(discount);
    };


    const [
        calcLoading,
        setCalcLoading,
    ] = useState(false);


    const [
        calcError,
        setCalcError,
    ] = useState("");


    const debounceRef =
        useRef(null);


    const requestIdRef =
        useRef(0);


    const buildCalculationRequest =
        useCallback(
            (currentItems) => {

                return {

                    storeId:
                        Number(
                            selectedStoreId
                        ),


                    billDiscountPercent: normalizePercentage(billDiscountPercent),


                    items:
                        currentItems.map(
                            (item) => ({

                                productId:
                                    item.productId ?? null,

                                /*
                                 * Local products do not have a global
                                 * productId. Preserve localProductId so
                                 * the backend can identify them correctly.
                                 */
                                localProductId:
                                    item.localProductId ?? null,

                                /*
                                 * REQUIRED BY BACKEND
                                 */

                                inventoryId:
                                    item.inventoryId,

                                batchId:
                                    item.batchId ?? null,


                                quantity:
                                    Number(
                                        item.quantity
                                    ),


                                discountPercentage:
                                    normalizePercentage(
                                        item.discountPercentage
                                    ),


                                gstType:
                                    toBackendGstType(
                                        item.gstType,
                                        item.gstPercentage
                                    ),

                            })
                        ),

                };

            },
            [
                selectedStoreId,
                billDiscountPercent,
            ]
        );


    const recalculateBill =
        useCallback(
            async (
                currentItems
            ) => {

                if (
                    !selectedStoreId ||
                    currentItems.length === 0
                ) {

                    setCalculation(null);
                    setCalcError("");
                    setCalcLoading(false);

                    return;
                }


                const requestId =
                    ++requestIdRef.current;


                setCalcLoading(true);
                setCalcError("");


                try {

                    const response =
                        await calculateOrder(
                            buildCalculationRequest(
                                currentItems
                            )
                        );


                    /*
                     * Ignore an old response if a newer
                     * calculation request has already started.
                     */

                    if (
                        requestId ===
                        requestIdRef.current
                    ) {

                        setCalculation(
                            response
                        );

                    }

                } catch (error) {

                    if (
                        requestId ===
                        requestIdRef.current
                    ) {

                        console.error(
                            "Order calculation failed:",
                            error
                        );


                        setCalculation(null);


                        setCalcError(
                            error?.response?.data?.message ||
                            error?.response?.data?.error ||
                            "Unable to calculate bill."
                        );

                    }

                } finally {

                    if (
                        requestId ===
                        requestIdRef.current
                    ) {

                        setCalcLoading(false);

                    }

                }

            },
            [
                selectedStoreId,
                buildCalculationRequest,
            ]
        );


    useEffect(() => {

        if (
            !selectedStoreId ||
            items.length === 0
        ) {

            setCalculation(null);
            setCalcError("");
            setCalcLoading(false);

            return undefined;
        }


        if (
            debounceRef.current
        ) {

            clearTimeout(
                debounceRef.current
            );

        }


        debounceRef.current =
            setTimeout(
                () => {

                    recalculateBill(
                        items
                    );

                },
                RECALC_DEBOUNCE_MS
            );


        return () => {

            if (
                debounceRef.current
            ) {

                clearTimeout(
                    debounceRef.current
                );

            }

        };

    }, [
        items,
        selectedStoreId,
        recalculateBill,
    ]);


    /*
     * Match backend calculation response with
     * frontend inventory item.
     */

    const lineByInventory =
        useMemo(
            () => {
                const map = {};

                (
                    calculation?.items ||
                    []
                ).forEach(
                    (line) => {
                        const inventoryId =
                            line.inventoryId ??
                            line.productId;

                        const batchId =
                            line.batchId ??
                            null;

                        /*
                         * Multiple batches of the same
                         * inventory can exist on one invoice.
                         */
                        const batchKey =
                            `${String(
                                inventoryId
                            )}-${String(
                                batchId ?? ""
                            )}`;

                        map[batchKey] =
                            line;

                        /*
                         * Fallback for older backend
                         * responses without batchId.
                         */
                        const inventoryOnlyKey =
                            String(
                                inventoryId
                            );

                        if (
                            !map[
                                inventoryOnlyKey
                            ]
                        ) {
                            map[
                                inventoryOnlyKey
                            ] = line;
                        }
                    }
                );

                return map;
            },
            [
                calculation,
            ]
        );





    /* =====================================================
       CUSTOMER
    ===================================================== */

    const [
        customerName,
        setCustomerName,
    ] = useState("");


    const [
        customerPhone,
        setCustomerPhone,
    ] = useState("");


    const [
        customerExists,
        setCustomerExists,
    ] = useState(false);


    const [
        customerLoading,
        setCustomerLoading,
    ] = useState(false);


    const [
        creatingInvoice,
        setCreatingInvoice,
    ] = useState(false);


    /*
     * Existing customer:
     * - Automatically fill name
     * - Show Customer exists
     *
     * New customer:
     * - Keep name editable
     * - No unnecessary message
     */

    const handleCustomerPhoneChange =
        async (
            value
        ) => {

            const mobile =
                String(
                    value ?? ""
                )
                    .replace(
                        /\D/g,
                        ""
                    )
                    .slice(
                        0,
                        10
                    );


            setCustomerPhone(
                mobile
            );


            if (
                mobile.length !== 10
            ) {

                setCustomerName("");
                setCustomerExists(false);

                return;
            }


            setCustomerLoading(true);
            setCustomerExists(false);


            try {

                const customer =
                    await getCustomerByMobile(
                        mobile
                    );


                if (customer) {

                    setCustomerName(
                        customer.customerName ??
                        customer.name ??
                        ""
                    );


                    setCustomerExists(
                        true
                    );

                } else {

                    setCustomerName("");

                }

            } catch (error) {

                /*
                 * 404 means customer does not exist.
                 *
                 * Do not show an error for that case.
                 */

                if (
                    error?.response?.status !==
                    404
                ) {

                    console.error(
                        "Customer lookup failed:",
                        error
                    );

                }


                setCustomerName("");
                setCustomerExists(false);

            } finally {

                setCustomerLoading(false);

            }

        };


    /*
     * Save new customer only during invoice creation.
     */

    const ensureCustomerSaved =
        async () => {

            const mobile =
                customerPhone.trim();


            const name =
                customerName.trim();


            if (
                !/^\d{10}$/.test(
                    mobile
                )
            ) {

                throw new Error(
                    "Please enter a valid 10-digit customer mobile number."
                );

            }


            if (!name) {

                throw new Error(
                    "Customer name is required."
                );

            }


            /*
             * Existing customer:
             * do not create duplicate.
             */

            if (
                customerExists
            ) {

                return;

            }


            /*
             * New customer:
             * create automatically before invoice.
             */

            await saveCustomer({

                customerName:
                    name,

                mobileNumber:
                    mobile,

            });

        };


    /* =====================================================
       PAYMENT
    ===================================================== */

    const [
        paymentMethod,
        setPaymentMethod,
    ] = useState("CASH");


    /* =====================================================
       DATE
    ===================================================== */

    const today =
        new Date()
            .toISOString()
            .split("T")[0];


    const [
        invoiceDate,
        setInvoiceDate,
    ] = useState(today);


    /* =====================================================
       CREATE INVOICE
    ===================================================== */

    const createInvoice =
        async (
            printAfterSave = false
        ) => {

            if (
                creatingInvoice
            ) {

                return;
            }


            if (
                !selectedStoreId
            ) {

                alert(
                    "Please select a store first."
                );

                return;
            }


            if (
                items.length === 0
            ) {

                alert(
                    "Please add at least one product before saving the invoice."
                );

                return;
            }


            if (
                customerLoading
            ) {

                alert(
                    "Please wait for customer verification to finish."
                );

                return;
            }


            if (
                calcLoading
            ) {

                alert(
                    "Please wait for the bill calculation to finish."
                );

                return;
            }


            if (
                calcError ||
                !calculation
            ) {

                alert(
                    calcError ||
                    "Bill calculation is not available. Please check the bill before saving."
                );

                return;
            }


            setCreatingInvoice(true);


            try {

                /*
                 * Save new customer automatically.
                 *
                 * Existing customer will not be duplicated.
                 */

                await ensureCustomerSaved();


                /*
                 * FINAL ORDER REQUEST
                 *
                 * IMPORTANT:
                 * inventoryId MUST be sent here.
                 *
                 * Previously recalculation had inventoryId,
                 * but final invoice creation did not.
                 *
                 * That caused:
                 *
                 * "Inventory ID is required"
                 */

                const orderData = {

                    storeId:
                        Number(
                            selectedStoreId
                        ),


                    customerName:
                        customerName.trim(),


                    phone:
                        customerPhone.trim(),


                    address: "",


                    paymentMethod,


                    billDiscountPercent: normalizePercentage(billDiscountPercent),


                    items:
                        items.map(
                            (item) => ({

                                productId:
                                    item.productId ?? null,

                                /*
                                 * Local products have productId = null.
                                 * Send localProductId so the backend can
                                 * resolve the correct local product.
                                 */
                                localProductId:
                                    item.localProductId ?? null,

                                /*
                                 * CRITICAL FIX
                                 */

                                inventoryId:
                                    item.inventoryId,

                                batchId:
                                    item.batchId ?? null,


                                quantity:
                                    Number(
                                        item.quantity
                                    ),


                                discountPercentage:
                                    normalizePercentage(
                                        item.discountPercentage
                                    ),


                                gstType:
                                    toBackendGstType(
                                        item.gstType,
                                        item.gstPercentage
                                    ),

                            })
                        ),

                };


                console.log(
                    "Creating invoice with payload:",
                    orderData
                );


                const response =
                    await placeOrder(
                        orderData
                    );


                /*
                 * Backend may return:
                 *
                 * number
                 * { id }
                 * { orderId }
                 */

                const orderId =
                    response?.orderId ??
                    response?.id ??
                    response;


                if (!orderId) {

                    throw new Error(
                        "Invoice was created but no order ID was returned by the server."
                    );

                }


                /*
                 * Navigate to invoice page.
                 *
                 * Save & Print:
                 * autoPrint = true
                 *
                 * Save:
                 * autoPrint = false
                 */

                navigate(
                    `/pos/invoice/${orderId}`,
                    {
                        state: {
                            autoPrint:
                                printAfterSave,
                        },
                    }
                );

            } catch (error) {

                console.error(
                    "Invoice creation failed:",
                    error
                );


                /*
                 * Show backend validation message.
                 */

                const backendMessage =
                    error?.response?.data?.message ||
                    error?.response?.data?.error;


                const validationErrors =
                    error?.response?.data?.errors;


                let message =
                    backendMessage ||
                    error?.message ||
                    "Unable to create invoice.";


                if (
                    Array.isArray(
                        validationErrors
                    ) &&
                    validationErrors.length > 0
                ) {

                    message =
                        validationErrors.join(
                            "\n"
                        );

                }


                alert(message);

            } finally {

                setCreatingInvoice(
                    false
                );

            }

        };


    /* =====================================================
       RENDER
    ===================================================== */

    return (

        <section className="new-sale-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="new-sale-header">

                <div>

                    <span className="new-sale-eyebrow">
                        Sales
                    </span>

                    <h1>
                        New Sale
                    </h1>

                    <p>
                        Create a new sales invoice.
                    </p>

                </div>


                <div className="new-sale-header-fields">

                    {/* STORE */}

                    <div className="new-sale-field">

                        <label>
                            Store
                        </label>


                        {isSuperAdmin ? (

                            <select
                                value={
                                    selectedStoreId
                                }
                                onChange={
                                    handleStoreChange
                                }
                                disabled={
                                    storeLoading
                                }
                            >

                                <option value="">

                                    {
                                        storeLoading
                                            ? "Loading..."
                                            : "Select store"
                                    }

                                </option>


                                {stores.map(
                                    (
                                        store
                                    ) => {

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
                                                key={
                                                    storeId
                                                }
                                                value={
                                                    storeId
                                                }
                                            >

                                                {
                                                    storeName
                                                }

                                                {
                                                    storeCode
                                                        ? ` (${storeCode})`
                                                        : ""
                                                }

                                            </option>

                                        );

                                    }
                                )}

                            </select>

                        ) : (

                            <div className="new-sale-readonly">

                                {
                                    user?.storeName ||
                                    "Current Store"
                                }

                            </div>

                        )}


                        {storeError && (

                            <small className="new-sale-field-error">

                                {
                                    storeError
                                }

                            </small>

                        )}

                    </div>


                    {/* INVOICE NUMBER */}

                    <div className="new-sale-field">

                        <label>
                            Invoice No.
                        </label>

                        <div className="new-sale-readonly">
                            Auto generated
                        </div>

                    </div>


                    {/* DATE */}

                    <div className="new-sale-field">

                        <label>
                            Date
                        </label>

                        <div className="new-sale-date">

                            <CalendarDays
                                size={14}
                            />

                            <input
                                type="date"
                                value={
                                    invoiceDate
                                }
                                onChange={
                                    (event) =>
                                        setInvoiceDate(
                                            event.target.value
                                        )
                                }
                            />

                        </div>

                    </div>

                </div>

            </div>


            {/* =================================================
                PRODUCT SEARCH
            ================================================== */}

            <div className="new-sale-product-search">

                <div className="new-sale-search-container">

                    <div className="new-sale-search-box">

                        <Search
                            size={17}
                        />

                        <input
                            type="text"
                            value={
                                searchText
                            }
                            onChange={
                                (event) =>
                                    handleProductSearch(
                                        event.target.value
                                    )
                            }
                            onFocus={() => {

                                if (
                                    searchResults.length >
                                    0
                                ) {

                                    setShowProductResults(
                                        true
                                    );

                                }

                            }}
                            placeholder="Search product by part number, name, SKU..."
                        />

                    </div>


                    {showProductResults && (

                        <div className="new-sale-search-results">

                            {productLoading ? (

                                <div className="new-sale-search-message">
                                    Searching...
                                </div>

                            ) : productSearchError ? (

                                <div className="new-sale-search-message error">

                                    {
                                        productSearchError
                                    }

                                </div>

                            ) : searchResults.length === 0 ? (

                                <div className="new-sale-search-message">
                                    No available products found.
                                </div>

                            ) : (

                                searchResults.map(
                                    (
                                        product,
                                        index
                                    ) => {

                                        const quantity =
                                            Number(
                                                product.quantity ??
                                                0
                                            );


                                        const mrp =
                                            Number(
                                                product.mrp ??
                                                0
                                            );


                                        const sellingPrice =
                                            Number(
                                                product.sellingPrice ??
                                                product.price ??
                                                0
                                            );


                                        const productName =
                                            product.itemName ??
                                            product.productName ??
                                            product.name ??
                                            "Product";


                                        const partNumber =
                                            product.partNumber ??
                                            "-";


                                        return (

                                            <button
                                                type="button"
                                                className="new-sale-search-result"
                                                key={
                                                    product.inventoryId ??
                                                    product.productId ??
                                                    index
                                                }
                                                disabled={
                                                    quantity <= 0
                                                }
                                                onClick={() =>
                                                    handleAddProduct(
                                                        product
                                                    )
                                                }
                                            >

                                                <div>

                                                    <strong>
                                                        {
                                                            productName
                                                        }
                                                    </strong>

                                                    <span>
                                                        Part Number:{" "}
                                                        {
                                                            partNumber
                                                        }
                                                    </span>

                                                    <span>
                                                        Stock:{" "}
                                                        {
                                                            quantity
                                                        }
                                                    </span>

                                                </div>


                                                <div>

                                                    <span>
                                                        MRP{" "}
                                                        {
                                                            money(
                                                                mrp
                                                            )
                                                        }
                                                    </span>

                                                    <strong>
                                                        {
                                                            money(
                                                                sellingPrice
                                                            )
                                                        }
                                                    </strong>

                                                </div>

                                            </button>

                                        );

                                    }
                                )

                            )}

                        </div>

                    )}

                </div>


                {/* SCAN */}

                <button
                    type="button"
                    className="new-sale-scan-button"
                >
                    Scan
                </button>

            </div>


            {/* =================================================
                MAIN POS
            ================================================== */}

            <div className="new-sale-main">


                {/* =================================================
                    LEFT SIDE — BILL ITEMS
                ================================================== */}

                <section className="new-sale-items-panel">

                    <div className="new-sale-panel-header">

                        <div>

                            <h2>
                                Bill Items
                            </h2>

                            <span>
                                {
                                    items.length
                                } item(s)
                            </span>

                        </div>


                        <button
                            type="button"
                            className="new-sale-add-button"
                            onClick={() => {

                                document
                                    .querySelector(
                                        ".new-sale-search-box input"
                                    )
                                    ?.focus();

                            }}
                        >

                            <Plus
                                size={15}
                            />

                            Add Item

                        </button>

                    </div>


                    {/* =================================================
                        BILL GST
                    ================================================== */}

                    <div className="new-sale-billing-controls">

                        <div className="new-sale-gst-type-group">

                            <span className="new-sale-gst-label">
                                Tax Type
                            </span>


                            <div className="new-sale-gst-buttons">

                                <button
                                    type="button"
                                    className={
                                        `new-sale-gst-button ${
                                            defaultGstType ===
                                            "CGST_SGST"
                                                ? "active"
                                                : ""
                                        }`
                                    }
                                    onClick={() =>
                                        handleDefaultGstTypeChange(
                                            "CGST_SGST"
                                        )
                                    }
                                >
                                    GST
                                </button>


                                <button
                                    type="button"
                                    className={
                                        `new-sale-gst-button ${
                                            defaultGstType ===
                                            "IGST"
                                                ? "active"
                                                : ""
                                        }`
                                    }
                                    onClick={() =>
                                        handleDefaultGstTypeChange(
                                            "IGST"
                                        )
                                    }
                                >
                                    IGST
                                </button>


                                <button
                                    type="button"
                                    className={
                                        `new-sale-gst-button ${
                                            defaultGstType ===
                                            "NONE"
                                                ? "active"
                                                : ""
                                        }`
                                    }
                                    onClick={() =>
                                        handleDefaultGstTypeChange(
                                            "NONE"
                                        )
                                    }
                                >
                                    No Tax
                                </button>

                            </div>

                        </div>


                        <div className="new-sale-gst-percentage-group">

                            <label
                                htmlFor="new-sale-gst-percentage"
                            >
                                GST %
                            </label>


                            <select
                                id="new-sale-gst-percentage"
                                value={
                                    defaultGstPercentage
                                }
                                disabled={
                                    defaultGstType ===
                                    "NONE"
                                }
                                onChange={
                                    (event) =>
                                        handleDefaultGstPercentageChange(
                                            event.target.value
                                        )
                                }
                            >

                                {GST_PERCENTAGES.map(
                                    (
                                        percentage
                                    ) => (

                                        <option
                                            key={
                                                percentage
                                            }
                                            value={
                                                percentage
                                            }
                                        >
                                            {
                                                percentage
                                            }%
                                        </option>

                                    )
                                )}

                            </select>

                        </div>

                    </div>


                    {/* =================================================
                        ITEMS TABLE
                    ================================================== */}

                    <div className="new-sale-table-wrapper">

                        <table className="new-sale-table">

                            <thead>

                                <tr>

                                    <th>
                                        S.No
                                    </th>

                                    <th>
                                        Part Number
                                    </th>

                                    <th>
                                        Part Name
                                    </th>

                                    <th>
                                        Qty
                                    </th>

                                    <th>
                                        MRP
                                    </th>

                                    <th>
                                        Unit Price
                                    </th>

                                    <th>
                                        Discount %
                                    </th>

                                    <th>
                                        GST
                                    </th>

                                    <th>
                                        Taxable Value
                                    </th>

                                    <th>
                                        Total
                                    </th>

                                    <th>
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {items.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="11"
                                            className="new-sale-empty"
                                        >

                                            <div className="new-sale-empty-content">

                                                <Search
                                                    size={24}
                                                />

                                                <strong>
                                                    Search and add products
                                                </strong>

                                                <span>
                                                    Available store stock
                                                    will appear here.
                                                </span>

                                            </div>

                                        </td>

                                    </tr>

                                ) : (

                                    items.map(
                                        (
                                            item,
                                            index
                                        ) => {

                                            const batchLine =
                                                lineByInventory[
                                                    `${String(item.inventoryId)}-${String(item.batchId ?? "")}`
                                                ];

                                            const line =
                                                batchLine ??
                                                lineByInventory[
                                                    String(item.inventoryId)
                                                ];


                                            return (

                                                <tr
                                                    key={
                                                        `${item.inventoryId}-${index}`
                                                    }
                                                >

                                                    <td>
                                                        {
                                                            index + 1
                                                        }
                                                    </td>


                                                    <td className="part-number-cell">

                                                        {
                                                            item.partNumber
                                                        }

                                                    </td>


                                                    <td className="product-name-cell">

                                                        {
                                                            item.itemName
                                                        }

                                                    </td>


                                                    <td>

                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={
                                                                item.availableQuantity
                                                            }
                                                            value={
                                                                item.quantity
                                                            }
                                                            onChange={
                                                                (event) =>
                                                                    updateItemQuantity(
                                                                        index,
                                                                        event.target.value
                                                                    )
                                                            }
                                                            className="new-sale-quantity-input"
                                                        />

                                                    </td>


                                                    <td>

                                                        {
                                                            money(
                                                                line?.mrp ??
                                                                item.mrp
                                                            )
                                                        }

                                                    </td>


                                                    <td>

                                                        {
                                                            money(
                                                                line?.sellingPrice ??
                                                                item.sellingPrice
                                                            )
                                                        }

                                                    </td>


                                                    <td>

                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                            value={
                                                                item.discountPercentage
                                                            }
                                                            onChange={
                                                                (event) =>
                                                                    updateItemDiscount(
                                                                        index,
                                                                        event.target.value
                                                                    )
                                                            }
                                                            className="new-sale-discount-input"
                                                            aria-label="Discount percentage"
                                                        />

                                                    </td>


                                                    <td>

                                                        {
                                                            item.gstType ===
                                                            "NONE"
                                                                ? "No Tax"
                                                                : `${item.gstPercentage}%`
                                                        }

                                                    </td>


                                                    <td className="taxable-value-cell">
                                                        {money(line?.taxableAmount ?? item.taxableAmount)}
                                                    </td>

                                                    <td className="line-total-cell">

                                                        {
                                                            money(
                                                                line?.lineTotal ??
                                                                item.lineTotal
                                                            )
                                                        }

                                                    </td>


                                                    <td>

                                                        <button
                                                            type="button"
                                                            className="new-sale-delete-button"
                                                            onClick={() =>
                                                                removeItem(
                                                                    index
                                                                )
                                                            }
                                                            aria-label="Remove item"
                                                        >

                                                            <Trash2
                                                                size={14}
                                                            />

                                                        </button>

                                                    </td>

                                                </tr>

                                            );

                                        }
                                    )

                                )}

                            </tbody>

                        </table>

                    </div>

                </section>


                {/* =================================================
                    RIGHT SIDE
                ================================================== */}

                <aside className="new-sale-right-column">


                    {/* =================================================
                        CUSTOMER
                    ================================================== */}

                    <div className="new-sale-card customer-card">

                        <div className="new-sale-card-title">

                            <UserRound
                                size={17}
                            />

                            <h2>
                                Customer
                            </h2>

                        </div>


                        <input
                            type="tel"
                            value={
                                customerPhone
                            }
                            onChange={
                                (event) =>
                                    handleCustomerPhoneChange(
                                        event.target.value
                                    )
                            }
                            placeholder="Customer mobile"
                            inputMode="numeric"
                            maxLength={10}
                        />


                        <input
                            type="text"
                            value={
                                customerName
                            }
                            onChange={
                                (event) =>
                                    setCustomerName(
                                        event.target.value
                                    )
                            }
                            placeholder="Customer name"
                        />


                        {customerExists && (

                            <div className="new-sale-customer-status">

                                <CheckCircle2
                                    size={12}
                                />

                                Customer exists

                            </div>

                        )}


                        {customerLoading && (

                            <span className="new-sale-customer-loading">
                                Checking...
                            </span>

                        )}

                    </div>


                    {/* =================================================
                        PAYMENT TYPE
                    ================================================== */}

                    <div className="new-sale-card payment-card">

                        <h2>
                            Payment Type
                        </h2>


                        <select
                            value={
                                paymentMethod
                            }
                            onChange={
                                (event) =>
                                    setPaymentMethod(
                                        event.target.value
                                    )
                            }
                        >

                            <option value="CASH">
                                Cash
                            </option>

                            <option value="CARD">
                                Card
                            </option>

                            <option value="UPI">
                                UPI
                            </option>

                        </select>

                    </div>


                    {/* =================================================
                        BILL SUMMARY
                    ================================================== */}

                    <div className="new-sale-card summary-card">

                        <h2>
                            Bill Summary
                        </h2>

                        <div className="new-sale-overall-discount">
                            <div className="new-sale-overall-discount-label">
                                <span>Overall Discount</span>
                               
                            </div>
                            <div className="new-sale-overall-discount-input">
                                <input type="number" min="0" max="100" step="0.01" value={billDiscountPercent}
                                    onChange={(event) => handleBillDiscountChange(event.target.value)} />
                                <span>%</span>
                            </div>
                        </div>

                        <div className="new-sale-summary-row">

                            <span>
                                Item Count
                            </span>

                            <strong>
                                {
                                    calculation?.totalItems ??
                                    items.length
                                }
                            </strong>

                        </div>


                        <div className="new-sale-summary-row">

                            <span>
                                Total Quantity
                            </span>

                            <strong>

                                {
                                    calculation?.totalQuantity ??
                                    items.reduce(
                                        (
                                            total,
                                            item
                                        ) =>
                                            total +
                                            Number(
                                                item.quantity ||
                                                0
                                            ),
                                        0
                                    )
                                }

                            </strong>

                        </div>


                        <div className="new-sale-summary-row">

                            <span>
                                Gross Amount
                            </span>

                            <strong>
                                {
                                    money(
                                        calculation?.grossAmount
                                    )
                                }
                            </strong>

                        </div>


                        <div className="new-sale-summary-row">

                            <span>
                                Item Discount
                            </span>

                            <strong>
                                {
                                    money(
                                        calculation?.itemDiscount
                                    )
                                }
                            </strong>

                        </div>


                        <div className="new-sale-summary-row">

                            <span>
                                Taxable Amount
                            </span>

                            <strong>
                                {
                                    money(
                                        calculation?.taxableAmount
                                    )
                                }
                            </strong>

                        </div>


                        {/* GST SUMMARY */}

                        {defaultGstType ===
                        "IGST" ? (

                            <div className="new-sale-summary-row">

                                <span>
                                    IGST
                                </span>

                                <strong>
                                    {
                                        money(
                                            calculation?.igst
                                        )
                                    }
                                </strong>

                            </div>

                        ) : defaultGstType ===
                          "CGST_SGST" ? (

                            <>

                                <div className="new-sale-summary-row">

                                    <span>
                                        CGST
                                    </span>

                                    <strong>
                                        {
                                            money(
                                                calculation?.cgst
                                            )
                                        }
                                    </strong>

                                </div>


                                <div className="new-sale-summary-row">

                                    <span>
                                        SGST
                                    </span>

                                    <strong>
                                        {
                                            money(
                                                calculation?.sgst
                                            )
                                        }
                                    </strong>

                                </div>

                            </>

                        ) : null}


                        <div className="new-sale-summary-row">

                            <span>
                                Bill Discount ({billDiscountPercent}%)
                            </span>

                            <strong>
                                {
                                    money(
                                        calculation?.billDiscount
                                    )
                                }
                            </strong>

                        </div>


                        <div className="new-sale-summary-row">

                            <span>
                                Round Off
                            </span>

                            <strong>
                                {
                                    money(
                                        calculation?.roundOff
                                    )
                                }
                            </strong>

                        </div>


                        {calcLoading && (

                            <div className="new-sale-calculation-status">
                                Calculating...
                            </div>

                        )}


                        {calcError && (

                            <div className="new-sale-calculation-error">

                                {
                                    calcError
                                }

                            </div>

                        )}


                        <div className="new-sale-grand-total">

                            <span>
                                Grand Total
                            </span>

                            <strong>
                                {
                                    money(
                                        calculation?.netPayable
                                    )
                                }
                            </strong>

                        </div>

                    </div>


                    {/* =================================================
                        ACTIONS
                    ================================================== */}

                    <div className="new-sale-action-card">

                        <button
                            type="button"
                            className="new-sale-cancel-button"
                            onClick={() =>
                                navigate(-1)
                            }
                            disabled={
                                creatingInvoice
                            }
                        >
                            Cancel
                        </button>


                        <button
                            type="button"
                            className="new-sale-save-button secondary"
                            onClick={() =>
                                createInvoice(false)
                            }
                            disabled={
                                creatingInvoice
                            }
                        >

                            {creatingInvoice ? (

                                <Loader2
                                    size={14}
                                    className="new-sale-spin"
                                />

                            ) : (

                                "Save"

                            )}

                        </button>


                        <button
                            type="button"
                            className="new-sale-save-button"
                            onClick={() =>
                                createInvoice(true)
                            }
                            disabled={
                                creatingInvoice
                            }
                        >

                            {creatingInvoice ? (

                                <>
                                    <Loader2
                                        size={14}
                                        className="new-sale-spin"
                                    />

                                    Creating...
                                </>

                            ) : (

                                "Save & Print"

                            )}

                        </button>

                    </div>

                </aside>

            </div>


            {batchModalOpen && (
                <div className="new-sale-batch-modal-overlay">
                    <div className="new-sale-batch-modal">
                        <div className="new-sale-batch-modal-header">
                            <div><h2>Select Batch</h2><p>{selectedProductForBatch?.itemName ?? "Product"}</p></div>
                            <button
                                type="button"
                                className="new-sale-batch-modal-close"
                                onClick={closeBatchSelector}
                                aria-label="Close batch selector"
                            >
                                ×
                            </button>
                        </div>
                        <div className="new-sale-batch-list">
                            {availableBatches.map((batch) => {
                                const selected = String(selectedBatchId) === String(batch.batchId);
                                return (
                                    <button
                                        type="button"
                                        key={batch.batchId ?? batch.id}
                                        className={`new-sale-batch-option ${selected ? "selected" : ""}`}
                                        onClick={() =>
                                            setSelectedBatchId(
                                                batch.batchId ?? batch.id
                                            )
                                        }
                                    >
                                        <div className="new-sale-batch-main">
                                            <strong>
                                                {batch.batchNumber ??
                                                    batch.batchNo ??
                                                    batch.id}
                                            </strong>

                                            {(batch.recommended ||
                                                batch.fifo ||
                                                batch.isFifo) && (
                                                <span className="new-sale-fifo-badge">
                                                    FIFO
                                                </span>
                                            )}
                                        </div>

                                        <span>
                                            Available:{" "}
                                            {Number(
                                                batch.availableQuantity ?? 0
                                            )}
                                        </span>

                                        <span>
                                            MRP: {money(batch.mrp)}
                                        </span>

                                        <span>
                                            Selling:{" "}
                                            {money(
                                                batch.sellingPrice ??
                                                batch.sellingPriceAmount ??
                                                0
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="new-sale-batch-modal-footer">
                            <button
                                type="button"
                                className="new-sale-cancel-button"
                                onClick={closeBatchSelector}
                            >
                                Cancel
                            </button>
                            <button type="button" className="new-sale-save-button" disabled={!selectedBatchId || batchLoading} onClick={confirmBatchSelection}>Select Batch</button>
                        </div>
                    </div>
                </div>
            )}
        </section>

    );

}