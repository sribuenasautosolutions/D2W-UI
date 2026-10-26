import { ProductUnitLabel } from "../../components/ProductUnitFields";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { convertProforma, getProforma, saveProforma, updateProforma } from "../../services/proformaService";

import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Loader2,
    Plus,
    Search,
    Trash2,
    UserRound,
    Pencil,
    Upload,
    X,
} from "lucide-react";

import { getAllStores } from "../../services/storeService";
import { getCurrentStockPage, getManagementBatches } from "../../services/storeInventoryPanelService";

import {
  placeOrder,
  getInvoice,
  amendInvoice,
  previewInvoiceAmendment,
  calculateOrder,
  previewSalesBulkUpload,
  downloadSalesBulkUploadTemplate
} from "../../services/orderService";
import { addPayment } from "../../services/paymentService";

import {
    searchCustomersByStore,
    saveCustomer,
    updateCustomer,
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
const handleDownloadSalesTemplate = async () => {
  try {
    const blob = await downloadSalesBulkUploadTemplate();

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-bulk-upload-template.xlsx";

    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download sales template:", error);
    alert("Unable to download the sample Excel file.");
  }
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

export default function NewSalePage({ documentMode = "SALE" }) {

    const navigate =
        useNavigate();
    const location = useLocation();
    const { id: proformaEditId, orderId: editOrderId } = useParams();
    const isProforma = documentMode === "PROFORMA";
    const isInvoiceEdit = !isProforma && Boolean(editOrderId);
    const [originalInvoice, setOriginalInvoice] = useState(null);
    const [invoiceLoading, setInvoiceLoading] = useState(isInvoiceEdit);
    const [invoiceEditError, setInvoiceEditError] = useState("");
    const [editReason, setEditReason] = useState("");
    const amendmentBusy = useRef(false);


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

            productSearchRequest.current += 1;
            setProductLoading(false);
            setSearchText("");
            setSearchResults([]);
            setShowProductResults(false);
            setProductSearchError("");
            setCalculation(null);
            setCalcError("");
            setSelectedCustomer(null);
            setCustomerSearch("");
            setCustomerResults([]);
            setBulkSalePreview(null);
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


    const productSearchRequest = useRef(0);

    const handleProductSearch =
        async (text) => {

            const requestId = ++productSearchRequest.current;
            setSearchText(text);
            setProductSearchError("");
            setProductLoading(false);


            if (!selectedStoreId) {

                setSearchResults([]);
                setProductSearchError("Select a store before searching for parts.");
                setShowProductResults(true);

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

                // Sales must search stock, including store-local products
                // that do not exist in the global product catalogue.
                const response = await getCurrentStockPage(selectedStoreId, {
                    search: trimmedText,
                    onlyAvailable: true,
                    page: 0,
                    size: 100,
                });

                if (requestId !== productSearchRequest.current) return;

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

                if (requestId !== productSearchRequest.current) return;

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

                if (requestId === productSearchRequest.current) {
                    setProductLoading(false);
                }

            }

        };


    /* =====================================================
       BILL ITEMS
    ===================================================== */

    const [
        items,
        setItems,
    ] = useState([]);

    const bulkSaleInputRef = useRef(null);
    const [bulkSalePreview, setBulkSalePreview] = useState(null);
    const [bulkSaleLoading, setBulkSaleLoading] = useState(false);
    const bulkSaleBusy = useRef(false);
    const bulkSaleStore = useRef(selectedStoreId);
    useEffect(() => { bulkSaleStore.current = selectedStoreId; }, [selectedStoreId]);

    const handleBulkSaleFile = async (event) => {
        if (bulkSaleBusy.current) return;
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!selectedStoreId) {
            alert("Select a store before uploading the sale file.");
            return;
        }
        const receivingStore = selectedStoreId;
        bulkSaleBusy.current = true;
        setBulkSaleLoading(true);
        try {
            const preview = await previewSalesBulkUpload(file, receivingStore);
            if (String(bulkSaleStore.current) !== String(receivingStore)) return;
            setBulkSalePreview(preview);
            const uploadedItems = (preview.items || []).map((item) => ({
                productId: item.inventory?.productId ?? null,
                localProductId: item.inventory?.localProductId ?? null,
                inventoryId: item.inventory?.inventoryId,
                batchId: item.batchId ?? null,
                batchNumber: item.inventory?.batchNumber ?? null,
                partNumber: item.partNumber,
                itemName: item.inventory?.itemName,
                brandName: item.inventory?.brandName,
                hsnCode: item.inventory?.hsncode,
                quantity: Number(item.requestedQuantity || 0),
                availableQuantity: Number(item.batchAvailableQuantity ?? item.inventory?.quantity ?? 0),
                mrp: Number(item.inventory?.mrp || 0),
                sellingPrice: Number(item.inventory?.sellingPrice || 0),
                discountPercentage: 0,
                gstType: defaultGstType === "NONE" ? "NONE" : defaultGstType,
                gstPercentage: defaultGstType === "NONE" ? 0 : Number(item.inventory?.gstPercentage ?? defaultGstPercentage ?? 0),
                gstAmount: 0,
                bulkUploaded: true,
            }));
            setItems((current) => {
                const incomingInventory = new Set(uploadedItems.map(item => String(item.inventoryId)));
                // A corrected file replaces its Excel quantities for the included
                // inventory items. Keep manual quantities and previously accepted
                // items absent from the corrected file. Reuploads do not double them.
                const merged = current.flatMap(item => {
                    if (!incomingInventory.has(String(item.inventoryId))) return [item];
                    const oldExcelQty = Number(item.bulkQuantity ?? (item.bulkUploaded ? item.quantity : 0));
                    const manualQty = Math.max(0, Number(item.quantity || 0) - oldExcelQty);
                    return manualQty ? [{ ...item, quantity: manualQty, bulkQuantity: 0, bulkUploaded: false }] : [];
                });
                uploadedItems.forEach(uploaded => {
                    const index = merged.findIndex(item => String(item.inventoryId) === String(uploaded.inventoryId)
                        && String(item.batchId) === String(uploaded.batchId));
                    if (index < 0) merged.push({ ...uploaded, bulkQuantity: uploaded.quantity });
                    else merged[index] = { ...merged[index], quantity: Number(merged[index].quantity || 0) + uploaded.quantity,
                        bulkQuantity: Number(merged[index].bulkQuantity || 0) + uploaded.quantity, bulkUploaded: true };
                });
                return merged;
            });
        } catch (error) {
            setBulkSalePreview(null);
            alert(error?.response?.data?.message || error?.response?.data || "Unable to preview the sale file.");
        } finally {
            bulkSaleBusy.current = false;
            setBulkSaleLoading(false);
        }
    };


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
    const batchLookupRequest = useRef(0);
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

        const availableQuantity = Number(
            batch?.availableQuantity ?? product?.quantity ?? 0
        );

        if (
            !inventoryId ||
            (!productId && !localProductId) ||
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
                        batch?.batchNumber ??
                        batch?.batchNo ??
                        batch?.number ??
                        null,

                    partNumber:
                        product.partNumber ??
                        "-",

                    itemName:
                        product.itemName ??
                        product.productName ??
                        product.name ??
                        "-",

                    stockUnit: product.stockUnit || "PCS", packSize: product.packSize ?? null, contentsUnit: product.contentsUnit ?? null,
                    quantity: 1,
                    availableQuantity,

                    /*
                     * Price belongs to the selected batch.
                     */
                    mrp: Number(
                        batch?.mrp ??
                        product?.mrp ??
                        0
                    ),

                    sellingPrice:
                        Number(
                            batch?.sellingPrice ??
                            batch?.sellingPriceAmount ??
                            product?.sellingPrice ??
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

        productSearchRequest.current += 1;
        setProductLoading(false);
        setSearchText("");
        setSearchResults([]);
        setShowProductResults(false);
        closeBatchSelector();
    };

    const handleAddProduct = async (product) => {
        if (
            !selectedStoreId ||
            !product?.inventoryId
        ) {
            return;
        }

        if (!isInvoiceEdit) {
            // New sales continue to use backend FIFO allocation.
            addProductWithBatch(product, null);
            return;
        }
        const requestId = ++batchLookupRequest.current;
        const receivingStore = selectedStoreId;
        setBatchLoading(true); setProductSearchError("");
        try {
            const response = await getManagementBatches(product.inventoryId);
            if (requestId !== batchLookupRequest.current || String(bulkSaleStore.current) !== String(receivingStore)) return;
            const batches = (Array.isArray(response) ? response : [])
                .filter(batch => Number(batch.availableQuantity) > 0 && batch.active !== false);
            if (!batches.length) {
                setProductSearchError("No available stock batch exists for this product. Refresh stock before adding it.");
                return;
            }
            if (batches.length === 1) {
                addProductWithBatch(product, batches[0]);
                return;
            }
            setSelectedProductForBatch(product); setAvailableBatches(batches);
            setSelectedBatchId(batches[0].batchId ?? batches[0].id); setBatchModalOpen(true);
        } catch (error) {
            if (requestId === batchLookupRequest.current)
                setProductSearchError(error.response?.data?.message || "Unable to load stock batches. Please retry.");
        } finally {
            if (requestId === batchLookupRequest.current) setBatchLoading(false);
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

            const requestedQuantity = value === "" ? "" : Math.floor(Number(value));


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


                            if (requestedQuantity === "") {
                                return { ...item, quantity: "" };
                            }

                            if (!Number.isFinite(requestedQuantity)) return item;


                            return {
                                ...item,

                                quantity:
                                    Math.min(
                                        Math.max(1, requestedQuantity),
                                        availableQuantity
                                    ),
                            };

                        }
                    )
            );

        };

    const finishItemQuantityEdit = (index) => {
        setItems((current) => current.map((item, itemIndex) => {
            if (itemIndex !== index) return item;

            const availableQuantity = Number(item.availableQuantity ?? 0);
            const quantity = Math.floor(Number(item.quantity));

            return {
                ...item,
                quantity: Number.isFinite(quantity) && quantity >= 1
                    ? Math.min(quantity, availableQuantity)
                    : 1,
            };
        }));
    };

    const updateAllocatedQuantity = (itemIndex, allocatedQuantity, value) => {
        const requestedAllocation = Math.floor(Number(value));
        if (!Number.isFinite(requestedAllocation) || requestedAllocation < 1) return;

        setItems((current) => current.map((item, index) => {
            if (index !== itemIndex) return item;

            const currentTotal = Number(item.quantity ?? 0);
            const availableQuantity = Number(item.availableQuantity ?? 0);
            const requestedTotal = currentTotal - Number(allocatedQuantity ?? 0) + requestedAllocation;

            return {
                ...item,
                quantity: Math.min(Math.max(1, requestedTotal), availableQuantity),
            };
        }));
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


    const buildAmendmentRequest = useCallback((currentItems) => ({
        editToken: originalInvoice?.editToken,
        reason: editReason,
        billDiscountPercent: normalizePercentage(billDiscountPercent),
        items: currentItems.map(item => ({
            orderItemId: item.orderItemId ?? null,
            inventoryId: Number(item.inventoryId), batchId: item.batchId == null ? null : Number(item.batchId),
            quantity: Number(item.quantity), sellingPrice: Number(item.sellingPrice), mrp: Number(item.mrp),
            discountPercentage: normalizePercentage(item.discountPercentage),
            gstType: toBackendGstType(item.gstType, item.gstPercentage),
        })),
    }), [originalInvoice, editReason, billDiscountPercent]);

    const recalculateBill =
        useCallback(
            async (
                currentItems
            ) => {

                if (
                    !selectedStoreId ||
                    (!isInvoiceEdit && currentItems.length === 0)
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
                        await (isInvoiceEdit ? previewInvoiceAmendment(editOrderId, buildAmendmentRequest(currentItems)) : calculateOrder(
                            buildCalculationRequest(
                                currentItems
                            )
                        ));


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
                isInvoiceEdit, editOrderId, buildAmendmentRequest,
            ]
        );


    useEffect(() => {

        if (
            !selectedStoreId ||
            (!isInvoiceEdit && items.length === 0)
        ) {

            setCalculation(null);
            setCalcError("");
            setCalcLoading(false);

            return undefined;
        }

        if (items.some((item) => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 1)) {
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
        isInvoiceEdit,
    ]);


    /*
     * Match backend calculation response with
     * frontend inventory item.
     */

    const displayRows =
        useMemo(
            () => {
                const calculatedLines = calculation?.items ?? [];

                return items.flatMap((item, itemIndex) => {
                    const allocatedLines = isInvoiceEdit ? (calculatedLines[itemIndex] ? [calculatedLines[itemIndex]] : []) : calculatedLines.filter(
                        (line) => String(line.inventoryId) === String(item.inventoryId)
                            && (item.batchId == null || String(line.batchId) === String(item.batchId))
                    );

                    if (allocatedLines.length === 0) {
                        return [{ item, itemIndex, line: null, allocationIndex: 0 }];
                    }

                    return allocatedLines.map((line, allocationIndex) => ({
                        item,
                        itemIndex,
                        line,
                        allocationIndex,
                    }));
                });
            },
            [
                items,
                calculation,
                isInvoiceEdit,
            ]
        );

const totalMrp = useMemo(
    () =>
        items.reduce(
            (sum, item) =>
                sum +
                Number(item.mrp || 0) *
                Number(item.quantity || 0),
            0
        ),
    [items]
);



    /* =====================================================
       CUSTOMER
    ===================================================== */

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

    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [saleSameAsBilling, setSaleSameAsBilling] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState([]);
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
    const [sameAsBilling, setSameAsBilling] = useState(false);
    const [savingCustomer, setSavingCustomer] = useState(false);


    const [
        creatingInvoice,
        setCreatingInvoice,
    ] = useState(false);

    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [paymentStatus, setPaymentStatus] = useState("PAID");
    const [paymentReference, setPaymentReference] = useState("");
    const [createdOrderId, setCreatedOrderId] = useState(null);
    const [createdOrderAmount, setCreatedOrderAmount] = useState(null);


    const customerLookupRequest = useRef(0);

    const loadCustomerOptions = async (query = "") => {
        if (!selectedStoreId) return;
        const requestId = ++customerLookupRequest.current;
        setCustomerLoading(true);
        try {
            const customers = await searchCustomersByStore(selectedStoreId, query);
            if (requestId === customerLookupRequest.current) {
                setCustomerResults(Array.isArray(customers) ? customers : []);
            }
        } catch (error) {
            if (requestId === customerLookupRequest.current) {
                setCustomerResults([]);
                console.error("Customer search failed:", error);
            }
        } finally {
            if (requestId === customerLookupRequest.current) setCustomerLoading(false);
        }
    };

    const selectCustomer = (customer) => {
        const billing = customer.billingAddress ?? "";
        const shipping = customer.shippingAddress ?? "";
        setSelectedCustomer({ ...customer, billingAddress: billing, shippingAddress: shipping });
        setSaleSameAsBilling(Boolean(billing) && billing === shipping);
        setCustomerSearch(customer.customerName ?? "");
        setCustomerDropdownOpen(false);
    };

    const openCustomerModal = (customer = null) => {
        setEditingCustomer(customer);
        setCustomerForm(customer ? {
            customerName: customer.customerName ?? "",
            mobileNumber: customer.mobileNumber ?? "",
            gstRegistrationType: customer.gstRegistrationType ?? "UNREGISTERED",
            gstin: customer.gstin ?? "",
            state: customer.state ?? "",
            email: customer.email ?? "",
            billingAddress: customer.billingAddress ?? "",
            shippingAddress: customer.shippingAddress ?? "",
        } : emptyCustomerForm);
        const billing = customer?.billingAddress ?? "";
        const shipping = customer?.shippingAddress ?? "";
        setSameAsBilling(Boolean(billing) && billing === shipping);
        setCustomerModalOpen(true);
    };

    const handleCustomerFormChange = (field, value) => {
        setCustomerForm((current) => ({
            ...current,
            [field]: value,
            ...(field === "billingAddress" && sameAsBilling ? { shippingAddress: value } : {}),
        }));
    };

    const handleSameAsBilling = (checked) => {
        setSameAsBilling(checked);
        if (checked) setCustomerForm((current) => ({ ...current, shippingAddress: current.billingAddress }));
    };

    const handleSaveB2BCustomer = async () => {
        if (!selectedStoreId) return alert("Select a store first.");
        if (!customerForm.customerName.trim()) return alert("Party name is required.");
        if (!/^\d{10}$/.test(customerForm.mobileNumber)) return alert("Enter a valid 10-digit mobile number.");
        if (customerForm.gstRegistrationType !== "UNREGISTERED"
            && !/^[0-9A-Za-z]{15}$/.test(customerForm.gstin.trim())) {
            return alert("A valid 15-character GSTIN is required.");
        }

        const payload = {
            ...customerForm,
            storeId: Number(selectedStoreId),
            customerType: "B2B",
            gstin: customerForm.gstin.trim().toUpperCase() || null,
        };

        setSavingCustomer(true);
        try {
            const saved = editingCustomer
                ? await updateCustomer(editingCustomer.id, payload)
                : await saveCustomer(payload);
            selectCustomer(saved);
            setCustomerModalOpen(false);
            await loadCustomerOptions("");
        } catch (error) {
            alert(error?.response?.data?.message || error?.response?.data?.error || "Unable to save customer.");
        } finally {
            setSavingCustomer(false);
        }
    };

    const validateCustomer =
        () => {

            if (!selectedCustomer) throw new Error("Please select a B2B customer.");

        };


    /* =====================================================
       PAYMENT
    ===================================================== */

    /* =====================================================
       DATE
    ===================================================== */

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;


    const [
        invoiceDate,
        setInvoiceDate,
    ] = useState(today);

    useEffect(() => {
        const source = location.state?.proforma;
        if (isProforma || !source) return;
        setSelectedStoreId(String(source.storeId || ""));
        setSelectedCustomer(source.customer || null);
        setCustomerSearch(source.customer?.customerName || "");
        setItems(Array.isArray(source.items) ? source.items : []);
        setBillDiscountPercent(source.billDiscountPercent || 0);
        setDefaultGstType(source.defaultGstType || "CGST_SGST");
        setDefaultGstPercentage(source.defaultGstPercentage ?? 18);
    }, [isProforma, location.state]);

    useEffect(() => {
        if (!isProforma || !proformaEditId) return;
        let live = true;
        getProforma(proformaEditId).then((source) => {
            if (!live) return;
            setSelectedStoreId(String(source.storeId || ""));
            setSelectedCustomer({ id: source.customerId, customerName: source.customerName, mobileNumber: source.customerMobile, email: source.customerEmail, gstin: source.customerGstin, gstRegistrationType: source.customerGstRegistrationType, state: source.customerState, billingAddress: source.billingAddress, shippingAddress: source.shippingAddress });
            setCustomerSearch(source.customerName || "");
            setItems((source.items || []).map((item) => ({ ...item, quantity: Number(item.quantity), sellingPrice: Number(item.unitPrice), batchId: null })));
            setBillDiscountPercent(source.billDiscountPercent || 0);
            setDefaultGstType(source.defaultGstType || "CGST_SGST");
            setDefaultGstPercentage(source.defaultGstPercentage ?? 18);
            setInvoiceDate(source.invoiceDate || today);
        }).catch((error) => alert(error?.response?.data?.message || "Unable to load the proforma for editing."));
        return () => { live = false; };
    }, [isProforma, proformaEditId]);


    /* =====================================================
       CREATE INVOICE
    ===================================================== */

    useEffect(() => {
        if (!isInvoiceEdit) return;
        let live = true;
        setInvoiceLoading(true); setInvoiceEditError("");
        getInvoice(editOrderId).then(source => {
            if (!live) return;
            if (["CANCELLED", "RETURNED"].includes(source.orderStatus))
                throw new Error("This invoice can no longer be edited.");
            if (!source.editToken || (source.items || []).some(item => !item.inventoryId || !item.batchId))
                throw new Error("This invoice is missing stock references. Its historical stock must be repaired before editing.");
            setOriginalInvoice(source);
            setSelectedStoreId(String(source.storeId));
            setSelectedCustomer({ customerName: source.customerName, mobileNumber: source.phone,
                gstin: source.customerGstin, gstRegistrationType: source.customerGstRegistrationType || "UNREGISTERED",
                state: source.customerState, email: source.customerEmail,
                billingAddress: source.billingAddress || source.customerAddress || "", shippingAddress: source.shippingAddress || "" });
            setCustomerSearch(source.customerName || "");
            setItems(source.items.map(item => ({ ...item, itemName: item.itemName || item.productName,
                hsnCode: item.hsncode, quantity: Number(item.quantity),
                availableQuantity: Number(item.availableQuantity ?? item.quantity),
                gstType: item.gstType?.startsWith("IGST_") ? "IGST" : item.gstType === "NONE" ? "NONE" : "CGST_SGST",
                discountPercentage: Number(item.discountPercentage || 0), gstPercentage: Number(item.gstPercentage || 0) })));
            setBillDiscountPercent(Number(source.billDiscountPercentage || 0));
            const first = source.items[0];
            setDefaultGstType(first?.gstType?.startsWith("IGST_") ? "IGST" : first?.gstType === "NONE" ? "NONE" : "CGST_SGST");
            setDefaultGstPercentage(Number(first?.gstPercentage ?? 18));
            setInvoiceDate(String(source.orderDate || "").split("T")[0]);
            setPaymentStatus(Number(source.balanceAmount) > 0 ? "UNPAID" : "PAID");
            setPaymentMethod(source.payments?.[0]?.paymentMethod || "CASH");
            setPaymentReference(source.payments?.[0]?.transactionNumber || "");
        }).catch(error => { if (live) setInvoiceEditError(error.response?.data?.message || error.message || "Unable to load invoice."); })
          .finally(() => { if (live) setInvoiceLoading(false); });
        return () => { live = false; };
    }, [isInvoiceEdit, editOrderId]);

    const createInvoice = async () => {
            if (isInvoiceEdit) {
                if (amendmentBusy.current) return;
                if (!editReason.trim()) { setInvoiceEditError("A reason is required to edit this invoice."); return; }
                amendmentBusy.current = true; setCreatingInvoice(true); setInvoiceEditError("");
                try {
                    await amendInvoice(editOrderId, buildAmendmentRequest(items));
                    navigate(`${isSuperAdmin ? "/owner" : "/store"}/sales/invoice/${editOrderId}`, { replace: true });
                } catch (error) {
                    setInvoiceEditError(error.response?.data?.message || "Unable to update invoice. Reload before retrying.");
                } finally { amendmentBusy.current = false; setCreatingInvoice(false); }
                return;
            }

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

            // Rejected Excel rows were never added to items. They do not block
            // saving accepted/corrected rows; server recalculation still validates
            // every item actually included in the sale.
            if (bulkSaleBusy.current) {
                alert("Wait for the Excel preview to finish before saving the sale.");
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

                validateCustomer();

                const payableAmount = Number(
                    createdOrderAmount ?? calculation?.netPayable ?? 0
                );
                if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
                    throw new Error("The payable amount must be greater than zero.");
                }
                if (isProforma) {
                    const proformaPayload = {
                        storeId: Number(selectedStoreId),
                        customerId: selectedCustomer.id,
                        items: items.map((item) => ({
                            inventoryId: item.inventoryId,
                            productId: item.productId ?? null,
                            localProductId: item.localProductId ?? null,
                            quantity: Number(item.quantity),
                            unitPrice: Number(item.sellingPrice ?? 0),
                            discountPercentage: normalizePercentage(item.discountPercentage),
                            gstType: toBackendGstType(item.gstType, item.gstPercentage),
                            gstPercentage: Number(item.gstPercentage ?? 0),
                        })),
                        billDiscountPercent: normalizePercentage(billDiscountPercent),
                        defaultGstType,
                        defaultGstPercentage,
                        invoiceDate,
                    };
                    const saved = proformaEditId
                        ? await updateProforma(proformaEditId, proformaPayload)
                        : await saveProforma(proformaPayload);
                    navigate(`${isSuperAdmin ? "/owner" : "/store"}/sales/proforma/${saved.id}`, { replace: true });
                    return;
                }
                if (
                    paymentStatus === "PAID" &&
                    paymentMethod !== "CASH" &&
                    !paymentReference.trim()
                ) {
                    throw new Error(
                        paymentMethod === "UPI"
                            ? "UPI UTR number is required."
                            : "Card transaction/reference number is required."
                    );
                }


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


                    customerId: selectedCustomer.id,

                    saleType: "B2B",

                    customerName:
                        selectedCustomer.customerName.trim(),


                    phone:
                        selectedCustomer.mobileNumber.trim(),


                    address: (selectedCustomer.billingAddress ?? "").trim(),

                    customerGstin: selectedCustomer.gstin ?? null,
                    customerGstRegistrationType: selectedCustomer.gstRegistrationType ?? "UNREGISTERED",
                    customerState: selectedCustomer.state ?? null,
                    customerEmail: selectedCustomer.email ?? null,
                    billingAddress: selectedCustomer.billingAddress ?? null,
                    shippingAddress: selectedCustomer.shippingAddress ?? null,
                    placeOfSupply: selectedCustomer.state ?? null,


                    paymentMethod: "PENDING",

                    invoiceDate,


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


                const response = createdOrderId ?? (location.state?.proforma?.sourceProformaId
                    ? await convertProforma(location.state.proforma.sourceProformaId, orderData)
                    : await placeOrder(orderData));


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

                setCreatedOrderId(orderId);
                setCreatedOrderAmount(payableAmount);

                if (paymentStatus === "PAID") {
                    await addPayment({
                        orderId: Number(orderId),
                        collectedBy: String(
                            user?.name ?? user?.username ?? user?.email ?? user?.id ?? "Admin"
                        ),
                        payments: [{
                            amount: payableAmount,
                            paymentMethod,
                            transactionNumber:
                                paymentMethod === "CASH" ? null : paymentReference.trim(),
                            remarks: null,
                            customerTendered:
                                paymentMethod === "CASH" ? payableAmount : null,
                            changeReturn: 0,
                        }],
                    });
                }


                // Open the saved invoice; printing remains an explicit invoice action.
                navigate(
                    `${isSuperAdmin ? "/owner" : "/store"}/sales/invoice/${orderId}`,
                    { replace: true }
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
                    (typeof error?.response?.data === "string" ? error.response.data : null) ||
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

    if (isInvoiceEdit && invoiceLoading) return <section className="new-sale-page">Loading invoice for editing...</section>;
    if (isInvoiceEdit && !originalInvoice) return <section className="new-sale-page" role="alert">{invoiceEditError || "Invoice could not be loaded."}<button onClick={() => window.location.reload()}>Retry</button></section>;

    return (

        <section className="new-sale-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="new-sale-header">

                <div>
                    <h1>
                        {isInvoiceEdit ? "Edit Invoice" : isProforma ? (proformaEditId ? "Edit Proforma" : "New Proforma") : "New Sale"}
                    </h1>
                    {invoiceEditError && <div className="new-sale-field-error" role="alert">{invoiceEditError}</div>}

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
                                    storeLoading || isInvoiceEdit
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
                            {isInvoiceEdit ? originalInvoice?.invoiceNumber : "Auto generated"}
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
                                disabled={isInvoiceEdit}
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

                <button
                    type="button"
                    className="new-sale-exit-button"
                    onClick={() => navigate(isSuperAdmin ? "/owner/sales" : "/store/sales")}
                    disabled={creatingInvoice}
                >
                    <ArrowLeft size={15} />
                    Exit
                </button>

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
                            placeholder="Search product by part number, name, brand..."
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
                                                    </strong><ProductUnitLabel product={product}/>

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


                        <div className="new-sale-item-actions">
                        {!isProforma && !isInvoiceEdit && <>
                            <input ref={bulkSaleInputRef} className="new-sale-bulk-file-input" type="file" accept=".csv,.xls,.xlsx" onChange={handleBulkSaleFile}/>
                            <button type="button" className="new-sale-upload-button" disabled={bulkSaleLoading || !selectedStoreId} onClick={() => bulkSaleInputRef.current?.click()}>
                                <Upload size={15}/>{bulkSaleLoading ? "Reading..." : "Upload Excel"}
                            </button>
                            <button type="button" className="new-sale-download-template-button" onClick={handleDownloadSalesTemplate}>
                                Download Sample Excel
                            </button>
                        </>}
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

                    </div>

                    {bulkSalePreview && <div className={`new-sale-bulk-result ${bulkSalePreview.invalidRows > 0 ? "has-errors" : "is-valid"}`}>
                        <div><strong>{bulkSalePreview.totalRows} rows uploaded</strong><span>{bulkSalePreview.validRows} valid · {bulkSalePreview.invalidRows} invalid</span></div>
                        {bulkSalePreview.invalidRows > 0 && <p>Rejected rows are excluded from this bill. Valid rows can be saved. Upload corrections to add them; previously accepted items are kept.</p>}
                        {bulkSalePreview.invalidRows > 0 && <div className="new-sale-bulk-errors">{(bulkSalePreview.rows || []).filter((row) => !row.valid).map((row) => <p key={`${row.rowNumber}-${row.partNumber}`}><strong>Row {row.rowNumber}{row.partNumber ? ` · ${row.partNumber}` : ""}</strong><span>{(row.errors || []).join(". ")}</span></p>)}</div>}
                    </div>}


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

                                    displayRows.map(
                                        ({ item, itemIndex, line, allocationIndex }, index) => {


                                            return (

                                                <tr
                                                    key={
                                                        `${item.inventoryId}-${line?.batchId ?? "pending"}-${allocationIndex}`
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
                                                        }<ProductUnitLabel product={item}/>

                                                    </td>


                                                    <td>

                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={
                                                                item.availableQuantity
                                                            }
                                                            key={`${line?.batchId ?? "pending"}-${line?.quantity ?? item.quantity}`}
                                                            defaultValue={line?.quantity ?? item.quantity}
                                                            onFocus={(event) => event.currentTarget.select()}
                                                            onBlur={(event) => {
                                                                if (line) {
                                                                    updateAllocatedQuantity(
                                                                        itemIndex,
                                                                        line.quantity,
                                                                        event.target.value
                                                                    );
                                                                } else {
                                                                    updateItemQuantity(itemIndex, event.target.value);
                                                                    finishItemQuantityEdit(itemIndex);
                                                                }
                                                            }}
                                                            className="new-sale-quantity-input"
                                                        />

                                                    </td>


                                                    <td>

                                                        {isInvoiceEdit ? <input type="number" min="0.01" step="0.01"
    aria-label={`MRP for ${item.partNumber}`} value={item.mrp}
    className="new-sale-quantity-input" disabled={creatingInvoice}
    onChange={event => setItems(current => current.map((row, index) => index === itemIndex ? { ...row, mrp: event.target.value } : row))} />
    : money(line?.mrp ?? item.mrp)}

                                                    </td>


                                                    <td>

                                                        {isInvoiceEdit ? <input type="number" min="0.01" step="0.01"
    aria-label={`Unit price for ${item.partNumber}`} value={item.sellingPrice}
    className="new-sale-quantity-input" disabled={creatingInvoice}
    onChange={event => setItems(current => current.map((row, index) => index === itemIndex ? { ...row, sellingPrice: event.target.value } : row))} />
    : money(line?.sellingPrice ?? item.sellingPrice)}

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
                                                                        itemIndex,
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
                                                                    itemIndex
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

                    <fieldset disabled={isInvoiceEdit} className="new-sale-card customer-card" style={{ margin: 0, minWidth: 0 }}>

                        <div className="new-sale-card-title">

                            <UserRound
                                size={17}
                            />

                            <h2>
                                Party / Customer
                            </h2>

                        </div>


                        <div className="new-sale-party-row">
                        <div className="new-sale-customer-combobox">
                            <div className="new-sale-customer-search-input">
                                <Search size={14} />
                                <input
                                    type="text"
                                    value={customerSearch}
                                    placeholder={selectedStoreId ? "Search party, mobile or GSTIN" : "Select store first"}
                                    disabled={!selectedStoreId}
                                    onFocus={() => {
                                        setCustomerDropdownOpen(true);
                                        loadCustomerOptions(customerSearch);
                                    }}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setCustomerSearch(value);
                                        setSelectedCustomer(null);
                                        setCustomerDropdownOpen(true);
                                        loadCustomerOptions(value);
                                    }}
                                />
                            </div>

                            {customerDropdownOpen && (
                                <div className="new-sale-customer-options">
                                    <button type="button" className="new-sale-new-customer-option" onClick={() => openCustomerModal()}>
                                        <Plus size={14} /> New Party / Customer
                                    </button>
                                    {customerLoading ? (
                                        <span>Searching...</span>
                                    ) : customerResults.length === 0 ? (
                                        <span>No customers found for this store.</span>
                                    ) : customerResults.map((customer) => (
                                        <button type="button" key={customer.id} onClick={() => selectCustomer(customer)}>
                                            <strong>{customer.customerName}</strong>
                                            <small>{customer.mobileNumber}{customer.gstin ? ` · ${customer.gstin}` : ""}{customer.balanceAmount != null ? ` · Balance ${money(customer.balanceAmount)}` : ""}</small>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <input className="new-sale-party-phone" value={selectedCustomer?.mobileNumber || ""} readOnly placeholder="Phone No." />
                        </div>

                        {selectedCustomer && (
                            <div className="new-sale-selected-customer">
                                <div>
                                    <CheckCircle2 size={13} />
                                    <strong>{selectedCustomer.customerName}</strong>
                                </div>
                                <span>{selectedCustomer.mobileNumber}</span>
                                <span>{selectedCustomer.gstRegistrationType === "UNREGISTERED"
                                    ? "Unregistered" : `${selectedCustomer.gstRegistrationType} · ${selectedCustomer.gstin}`}</span>
                                <label>Billing Address<textarea value={selectedCustomer.billingAddress ?? ""} onChange={(event)=>setSelectedCustomer((current)=>({...current,billingAddress:event.target.value,...(saleSameAsBilling?{shippingAddress:event.target.value}:{})}))} /></label>
                                <label>Shipping Address<textarea disabled={saleSameAsBilling} value={selectedCustomer.shippingAddress ?? ""} onChange={(event)=>setSelectedCustomer((current)=>({...current,shippingAddress:event.target.value}))} /></label>
                                <label className="new-sale-sale-same-address"><input type="checkbox" checked={saleSameAsBilling} onChange={(event)=>{const checked=event.target.checked;setSaleSameAsBilling(checked);if(checked)setSelectedCustomer((current)=>({...current,shippingAddress:current.billingAddress??""}));}} /> Same as Billing Address</label>
                                <button type="button" onClick={() => openCustomerModal(selectedCustomer)}>
                                    <Pencil size={12} /> Edit Customer
                                </button>
                            </div>
                        )}

                    </fieldset>


                    {/* =================================================
                        PAYMENT TYPE
                    ================================================== */}

                    {!isProforma && <fieldset disabled={isInvoiceEdit} className="new-sale-card payment-card" style={{ margin: 0, minWidth: 0 }}>

                        <h2>
                            Payment
                        </h2>

                        <div className="new-sale-payment-status" role="group" aria-label="Payment status">
                            {["PAID", "UNPAID"].map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    className={paymentStatus === status ? "active" : ""}
                                    onClick={() => setPaymentStatus(status)}
                                    disabled={creatingInvoice || Boolean(createdOrderId)}
                                >
                                    {status === "PAID" ? "Paid" : "Unpaid"}
                                </button>
                            ))}
                        </div>

                        {paymentStatus === "PAID" && (
                            <div className="new-sale-payment-methods" role="group" aria-label="Payment method">
                                {["CASH", "UPI", "CARD"].map((method) => (
                                    <button
                                        key={method}
                                        type="button"
                                        className={`new-sale-payment-method ${paymentMethod === method ? "active" : ""}`}
                                        onClick={() => {
                                            setPaymentMethod(method);
                                            setPaymentReference("");
                                        }}
                                        disabled={creatingInvoice || Boolean(createdOrderId)}
                                    >
                                        {method === "CASH" ? "Cash" : method === "UPI" ? "UPI" : "Card"}
                                    </button>
                                ))}
                            </div>
                        )}

                        {paymentStatus === "PAID" && paymentMethod !== "CASH" && (
                            <>
                                <label className="new-sale-payment-label" htmlFor="new-sale-payment-reference">
                                    {paymentMethod === "UPI" ? "UTR number" : "Card transaction/reference number"}
                                </label>
                                <input
                                    id="new-sale-payment-reference"
                                    value={paymentReference}
                                    maxLength={100}
                                    onChange={(event) => setPaymentReference(event.target.value)}
                                    placeholder={paymentMethod === "UPI" ? "Enter UPI UTR number" : "Enter card reference number"}
                                />
                            </>
                        )}

                        {createdOrderId && (
                            <p className="new-sale-payment-retry">
                                Sale #{createdOrderId} was created and stock was deducted. Correct the payment details and save again; a second sale will not be created.
                            </p>
                        )}

                    </fieldset>}


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
        Total MRP
    </span>

    <strong>
        {money(totalMrp)}
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

                    {/* =================================================
                        ACTIONS
                    ================================================== */}

                    <div className="new-sale-action-card">
  {isInvoiceEdit && <>
    <label htmlFor="invoice-edit-reason">Reason for invoice edit <span aria-hidden="true">*</span></label>
    <textarea id="invoice-edit-reason" required maxLength={500} disabled={creatingInvoice}
      value={editReason} onChange={event => { setEditReason(event.target.value); setInvoiceEditError(""); }} />
    <p>Collected: {money(originalInvoice?.paidAmount)}. Existing payments are retained.</p>
    {Number(originalInvoice?.paidAmount || 0) > Number(calculation?.netPayable || 0) &&
      <p>Refund due: {money(Number(originalInvoice.paidAmount) - Number(calculation?.netPayable || 0))}</p>}
  </>}

                        <button
                            type="button"
                            className="new-sale-save-button"
                            onClick={createInvoice}
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

                                isInvoiceEdit ? "Save Invoice Changes" : isProforma ? (proformaEditId ? "Update Proforma" : "Save Proforma") : "Save Sale"

                            )}

                        </button>



                    </div>

                    </div>

                </aside>

            </div>

            {customerModalOpen && (
                <div className="new-sale-customer-modal-overlay" role="dialog" aria-modal="true">
                    <div className="new-sale-customer-modal">
                        <div className="new-sale-customer-modal-header">
                            <div>
                                <h2>{editingCustomer ? "Edit Customer" : "New Party / Customer"}</h2>
                                <p>B2B customer details for the selected store</p>
                            </div>
                            <button type="button" onClick={() => setCustomerModalOpen(false)} aria-label="Close">
                                <X size={17} />
                            </button>
                        </div>

                        <div className="new-sale-customer-form-grid">
                            <label>Party Name *<input value={customerForm.customerName}
                                onChange={(event) => handleCustomerFormChange("customerName", event.target.value)} /></label>
                            <label>Mobile Number *<input value={customerForm.mobileNumber} inputMode="numeric" maxLength={10}
                                onChange={(event) => handleCustomerFormChange("mobileNumber", event.target.value.replace(/\D/g, "").slice(0, 10))} /></label>
                            <label>GST Registration Type<select value={customerForm.gstRegistrationType}
                                onChange={(event) => handleCustomerFormChange("gstRegistrationType", event.target.value)}>
                                <option value="UNREGISTERED">Unregistered</option>
                                <option value="REGISTERED">Registered</option>
                            </select></label>
                            {customerForm.gstRegistrationType !== "UNREGISTERED" && (
                                <label>GSTIN *<input value={customerForm.gstin} maxLength={15}
                                    onChange={(event) => handleCustomerFormChange("gstin", event.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ""))} /></label>
                            )}
                            <label>State<input value={customerForm.state}
                                onChange={(event) => handleCustomerFormChange("state", event.target.value)} /></label>
                            <label>Email ID<input type="email" value={customerForm.email}
                                onChange={(event) => handleCustomerFormChange("email", event.target.value)} /></label>
                            <label className="full">Billing Address<textarea value={customerForm.billingAddress}
                                onChange={(event) => handleCustomerFormChange("billingAddress", event.target.value)} /></label>
                            <label className="full">Shipping Address<textarea value={customerForm.shippingAddress}
                                disabled={sameAsBilling}
                                onChange={(event) => handleCustomerFormChange("shippingAddress", event.target.value)} /></label>
                            <label className="full new-sale-same-address"><input type="checkbox" checked={sameAsBilling}
                                onChange={(event) => handleSameAsBilling(event.target.checked)} /> Same as Billing Address</label>
                        </div>

                        <div className="new-sale-customer-modal-actions">
                            <button type="button" onClick={() => setCustomerModalOpen(false)}>Cancel</button>
                            <button type="button" className="primary" disabled={savingCustomer} onClick={handleSaveB2BCustomer}>
                                {savingCustomer ? "Saving..." : editingCustomer ? "Update Customer" : "Create Customer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}


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
