import { ProductUnitLabel } from "../../../components/ProductUnitFields";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  convertProforma,
  getProforma,
  saveProforma,
  updateProforma,
} from "../../../services/proformaService";

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

import { getAllStores } from "../../../services/storeService";
import { getCurrentStockPage } from "../../../services/storeInventoryPanelService";

import {
  placeOrder,
  calculateOrder,
  previewSalesBulkUpload,
  downloadSalesBulkUploadTemplate,
} from "../../../services/orderService";
import { addPayment } from "../../../services/paymentService";

import {
  searchCustomersByStore,
  saveCustomer,
  updateCustomer,
} from "../../../services/customerService";

/* =========================================================
   HELPERS
========================================================= */

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

const RECALC_DEBOUNCE_MS = 400;

const GST_PERCENTAGES = [0, 5, 12, 18, 28];

const money = (value) => `₹${Number(value ?? 0).toFixed(2)}`;

const normalizePercentage = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(100, Math.max(0, number));
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

  if (GST_PERCENTAGES.includes(number)) {
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

const toBackendGstType = (gstType, gstPercentage) => {
  const percentage = Number(gstPercentage || 0);

  if (gstType === "CGST_SGST") {
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

  if (gstType === "IGST") {
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
  const navigate = useNavigate();
  const location = useLocation();
  const { id: proformaEditId } = useParams();
  const isProforma = documentMode === "PROFORMA";

  const user = useMemo(() => readUser(), []);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  /* =====================================================
       STORE
    ===================================================== */

  const [selectedStoreId, setSelectedStoreId] = useState(
    isSuperAdmin ? "" : String(user?.storeId || ""),
  );

  const [stores, setStores] = useState([]);

  const [storeLoading, setStoreLoading] = useState(false);

  const [storeError, setStoreError] = useState("");

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
          : Array.isArray((response as any)?.content)
            ? (response as any).content
            : [];

        setStores(data);
      } catch (error) {
        console.error("Failed to load stores:", error);

        setStores([]);

        setStoreError(
          error?.response?.data?.message || "Unable to load stores.",
        );
      } finally {
        setStoreLoading(false);
      }
    };

    loadStores();
  }, [isSuperAdmin]);

  const handleStoreChange = (event) => {
    const newStoreId = event.target.value;

    setSelectedStoreId(newStoreId);

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

  const [defaultGstType, setDefaultGstType] = useState("CGST_SGST");

  const [defaultGstPercentage, setDefaultGstPercentage] = useState(18);

  /*
   * GST selection applies to every current item.
   */

  const handleDefaultGstTypeChange = (value) => {
    setDefaultGstType(value);

    if (value === "NONE") {
      setItems((current) =>
        current.map((item) => ({
          ...item,
          gstType: "NONE",
          gstPercentage: 0,
        })),
      );

      return;
    }

    setItems((current) =>
      current.map((item) => ({
        ...item,
        gstType: value,
        gstPercentage: Number(defaultGstPercentage),
      })),
    );
  };

  const handleDefaultGstPercentageChange = (value) => {
    const percentage = normalizeGstPercentage(value);

    setDefaultGstPercentage(percentage);

    if (defaultGstType === "NONE") {
      setItems((current) =>
        current.map((item) => ({
          ...item,
          gstType: "NONE",
          gstPercentage: 0,
        })),
      );

      return;
    }

    setItems((current) =>
      current.map((item) => ({
        ...item,
        gstPercentage: percentage,
      })),
    );
  };

  /* =====================================================
       PRODUCT SEARCH
    ===================================================== */

  const [searchText, setSearchText] = useState("");

  const [searchResults, setSearchResults] = useState([]);

  const [productLoading, setProductLoading] = useState(false);

  const [productSearchError, setProductSearchError] = useState("");

  const [showProductResults, setShowProductResults] = useState(false);

  const productSearchRequest = useRef(0);

  const handleProductSearch = async (text) => {
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

    const trimmedText = text.trim();

    if (trimmedText.length < 2) {
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

      const results = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.content)
          ? (response as any).content
          : [];

      setSearchResults(results);
    } catch (error) {
      if (requestId !== productSearchRequest.current) return;

      console.error("Store inventory search failed:", error);

      setSearchResults([]);

      setProductSearchError(
        error?.response?.data?.message || "Unable to search store inventory.",
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

  const [items, setItems] = useState([]);

  const bulkSaleInputRef = useRef(null);
  const [bulkSalePreview, setBulkSalePreview] = useState(null);
  const [bulkSaleLoading, setBulkSaleLoading] = useState(false);
  const bulkSaleBusy = useRef(false);
  const bulkSaleStore = useRef(selectedStoreId);
  bulkSaleStore.current = selectedStoreId;

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
        availableQuantity: Number(
          item.batchAvailableQuantity ?? item.inventory?.quantity ?? 0,
        ),
        mrp: Number(item.inventory?.mrp || 0),
        sellingPrice: Number(item.inventory?.sellingPrice || 0),
        discountPercentage: 0,
        gstType: defaultGstType === "NONE" ? "NONE" : defaultGstType,
        gstPercentage:
          defaultGstType === "NONE"
            ? 0
            : Number(
                item.inventory?.gstPercentage ?? defaultGstPercentage ?? 0,
              ),
        gstAmount: 0,
        bulkUploaded: true,
      }));
      setItems((current) => {
        const incomingInventory = new Set(
          uploadedItems.map((item) => String(item.inventoryId)),
        );
        // A corrected file replaces its Excel quantities for the included
        // inventory items. Keep manual quantities and previously accepted
        // items absent from the corrected file. Reuploads do not double them.
        const merged = current.flatMap((item) => {
          if (!incomingInventory.has(String(item.inventoryId))) return [item];
          const oldExcelQty = Number(
            item.bulkQuantity ?? (item.bulkUploaded ? item.quantity : 0),
          );
          const manualQty = Math.max(
            0,
            Number(item.quantity || 0) - oldExcelQty,
          );
          return manualQty
            ? [
                {
                  ...item,
                  quantity: manualQty,
                  bulkQuantity: 0,
                  bulkUploaded: false,
                },
              ]
            : [];
        });
        uploadedItems.forEach((uploaded) => {
          const index = merged.findIndex(
            (item) =>
              String(item.inventoryId) === String(uploaded.inventoryId) &&
              String(item.batchId) === String(uploaded.batchId),
          );
          if (index < 0)
            merged.push({ ...uploaded, bulkQuantity: uploaded.quantity });
          else
            merged[index] = {
              ...merged[index],
              quantity: Number(merged[index].quantity || 0) + uploaded.quantity,
              bulkQuantity:
                Number(merged[index].bulkQuantity || 0) + uploaded.quantity,
              bulkUploaded: true,
            };
        });
        return merged;
      });
    } catch (error) {
      setBulkSalePreview(null);
      alert(
        error?.response?.data?.message ||
          error?.response?.data ||
          "Unable to preview the sale file.",
      );
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
  const [batchLoading] = useState(false);
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
    const productId = product.productId ?? null;

    const inventoryId = product.inventoryId;

    const localProductId = product.localProductId ?? null;

    const batchId = batch?.batchId ?? batch?.id ?? null;

    const availableQuantity = Number(
      batch?.availableQuantity ?? product?.quantity ?? 0,
    );

    if (
      !inventoryId ||
      (!productId && !localProductId) ||
      availableQuantity <= 0
    ) {
      console.error("Cannot add product/batch:", {
        product,
        batch,
      });
      return;
    }

    setItems((current) => {
      /*
       * Same product + different batch must remain
       * as separate bill lines.
       */
      const existingIndex = current.findIndex(
        (item) =>
          String(item.inventoryId) === String(inventoryId) &&
          String(item.batchId) === String(batchId),
      );

      if (existingIndex >= 0) {
        const existing = current[existingIndex];

        const currentQuantity = Number(existing.quantity || 0);

        if (currentQuantity >= availableQuantity) {
          return current;
        }

        return current.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity: currentQuantity + 1,
              }
            : item,
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
            batch?.batchNumber ?? batch?.batchNo ?? batch?.number ?? null,

          partNumber: product.partNumber ?? "-",

          itemName:
            product.itemName ?? product.productName ?? product.name ?? "-",

          stockUnit: product.stockUnit || "PCS",
          packSize: product.packSize ?? null,
          contentsUnit: product.contentsUnit ?? null,
          quantity: 1,
          availableQuantity,

          /*
           * Price belongs to the selected batch.
           */
          mrp: Number(batch?.mrp ?? product?.mrp ?? 0),

          sellingPrice: Number(
            batch?.sellingPrice ??
              batch?.sellingPriceAmount ??
              product?.sellingPrice ??
              0,
          ),

          discountPercentage: 0,

          gstType: defaultGstType === "NONE" ? "NONE" : defaultGstType,

          gstPercentage:
            defaultGstType === "NONE" ? 0 : Number(defaultGstPercentage),

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

  const handleAddProduct = (product) => {
    if (!selectedStoreId || !product?.inventoryId) {
      return;
    }

    // A null batch delegates allocation to the existing backend FIFO flow.
    addProductWithBatch(product, null);
  };

  const confirmBatchSelection = () => {
    if (!selectedProductForBatch || !selectedBatchId) {
      return;
    }

    const batch = availableBatches.find(
      (item) => String(item?.batchId ?? item?.id) === String(selectedBatchId),
    );

    if (batch) {
      addProductWithBatch(selectedProductForBatch, batch);
    }
  };

  /* =====================================================
       QUANTITY
    ===================================================== */

  const updateItemQuantity = (index, value) => {
    const requestedQuantity = value === "" ? "" : Math.floor(Number(value));

    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const availableQuantity = Number(item.availableQuantity ?? 0);

        if (requestedQuantity === "") {
          return { ...item, quantity: "" };
        }

        if (!Number.isFinite(requestedQuantity)) return item;

        return {
          ...item,

          quantity: Math.min(Math.max(1, requestedQuantity), availableQuantity),
        };
      }),
    );
  };

  const finishItemQuantityEdit = (index) => {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const availableQuantity = Number(item.availableQuantity ?? 0);
        const quantity = Math.floor(Number(item.quantity));

        return {
          ...item,
          quantity:
            Number.isFinite(quantity) && quantity >= 1
              ? Math.min(quantity, availableQuantity)
              : 1,
        };
      }),
    );
  };

  const updateAllocatedQuantity = (itemIndex, allocatedQuantity, value) => {
    const requestedAllocation = Math.floor(Number(value));
    if (!Number.isFinite(requestedAllocation) || requestedAllocation < 1)
      return;

    setItems((current) =>
      current.map((item, index) => {
        if (index !== itemIndex) return item;

        const currentTotal = Number(item.quantity ?? 0);
        const availableQuantity = Number(item.availableQuantity ?? 0);
        const requestedTotal =
          currentTotal - Number(allocatedQuantity ?? 0) + requestedAllocation;

        return {
          ...item,
          quantity: Math.min(Math.max(1, requestedTotal), availableQuantity),
        };
      }),
    );
  };

  /* =====================================================
       DISCOUNT
    ===================================================== */

  const updateItemDiscount = (index, value) => {
    const discount = normalizePercentage(value);

    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,

              discountPercentage: discount,
            }
          : item,
      ),
    );
  };

  /* =====================================================
       REMOVE ITEM
    ===================================================== */

  const removeItem = (index) => {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  /* =====================================================
       CALCULATION
    ===================================================== */

  const [calculation, setCalculation] = useState(null);

  // Overall bill discount percentage.
  // This value is sent to the backend calculation and final invoice payload.
  const [billDiscountPercent, setBillDiscountPercent] = useState(0);

  const handleBillDiscountChange = (value) => {
    const discount = normalizePercentage(value);
    setBillDiscountPercent(discount);
  };

  const [calcLoading, setCalcLoading] = useState(false);

  const [calcError, setCalcError] = useState("");

  const debounceRef = useRef(null);

  const requestIdRef = useRef(0);

  const buildCalculationRequest = useCallback(
    (currentItems) => {
      return {
        storeId: Number(selectedStoreId),

        billDiscountPercent: normalizePercentage(billDiscountPercent),

        items: currentItems.map((item) => ({
          productId: item.productId ?? null,

          /*
           * Local products do not have a global
           * productId. Preserve localProductId so
           * the backend can identify them correctly.
           */
          localProductId: item.localProductId ?? null,

          /*
           * REQUIRED BY BACKEND
           */

          inventoryId: item.inventoryId,

          batchId: item.batchId ?? null,

          quantity: Number(item.quantity),

          discountPercentage: normalizePercentage(item.discountPercentage),

          gstType: toBackendGstType(item.gstType, item.gstPercentage),
        })),
      };
    },
    [selectedStoreId, billDiscountPercent],
  );

  const recalculateBill = useCallback(
    async (currentItems) => {
      if (!selectedStoreId || currentItems.length === 0) {
        setCalculation(null);
        setCalcError("");
        setCalcLoading(false);

        return;
      }

      const requestId = ++requestIdRef.current;

      setCalcLoading(true);
      setCalcError("");

      try {
        const response = await calculateOrder(
          buildCalculationRequest(currentItems),
        );

        /*
         * Ignore an old response if a newer
         * calculation request has already started.
         */

        if (requestId === requestIdRef.current) {
          setCalculation(response);
        }
      } catch (error) {
        if (requestId === requestIdRef.current) {
          console.error("Order calculation failed:", error);

          setCalculation(null);

          setCalcError(
            error?.response?.data?.message ||
              error?.response?.data?.error ||
              "Unable to calculate bill.",
          );
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setCalcLoading(false);
        }
      }
    },
    [selectedStoreId, buildCalculationRequest],
  );

  useEffect(() => {
    if (!selectedStoreId || items.length === 0) {
      setCalculation(null);
      setCalcError("");
      setCalcLoading(false);

      return undefined;
    }

    if (
      items.some(
        (item) =>
          !Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 1,
      )
    ) {
      setCalcLoading(false);
      return undefined;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      recalculateBill(items);
    }, RECALC_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [items, selectedStoreId, recalculateBill]);

  /*
   * Match backend calculation response with
   * frontend inventory item.
   */

  const displayRows = useMemo(() => {
    const calculatedLines = calculation?.items ?? [];

    return items.flatMap((item, itemIndex) => {
      const allocatedLines = calculatedLines.filter(
        (line) => String(line.inventoryId) === String(item.inventoryId),
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
  }, [items, calculation]);

  const totalMrp = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.mrp || 0) * Number(item.quantity || 0),
        0,
      ),
    [items],
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

  const [creatingInvoice, setCreatingInvoice] = useState(false);

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
      if (requestId === customerLookupRequest.current)
        setCustomerLoading(false);
    }
  };

  const selectCustomer = (customer) => {
    const billing = customer.billingAddress ?? "";
    const shipping = customer.shippingAddress ?? "";
    setSelectedCustomer({
      ...customer,
      billingAddress: billing,
      shippingAddress: shipping,
    });
    setSaleSameAsBilling(Boolean(billing) && billing === shipping);
    setCustomerSearch(customer.customerName ?? "");
    setCustomerDropdownOpen(false);
  };

  const openCustomerModal = (customer = null) => {
    setEditingCustomer(customer);
    setCustomerForm(
      customer
        ? {
            customerName: customer.customerName ?? "",
            mobileNumber: customer.mobileNumber ?? "",
            gstRegistrationType: customer.gstRegistrationType ?? "UNREGISTERED",
            gstin: customer.gstin ?? "",
            state: customer.state ?? "",
            email: customer.email ?? "",
            billingAddress: customer.billingAddress ?? "",
            shippingAddress: customer.shippingAddress ?? "",
          }
        : emptyCustomerForm,
    );
    const billing = customer?.billingAddress ?? "";
    const shipping = customer?.shippingAddress ?? "";
    setSameAsBilling(Boolean(billing) && billing === shipping);
    setCustomerModalOpen(true);
  };

  const handleCustomerFormChange = (field, value) => {
    setCustomerForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "billingAddress" && sameAsBilling
        ? { shippingAddress: value }
        : {}),
    }));
  };

  const handleSameAsBilling = (checked) => {
    setSameAsBilling(checked);
    if (checked)
      setCustomerForm((current) => ({
        ...current,
        shippingAddress: current.billingAddress,
      }));
  };

  const handleSaveB2BCustomer = async () => {
    if (!selectedStoreId) return alert("Select a store first.");
    if (!customerForm.customerName.trim())
      return alert("Party name is required.");
    if (!/^\d{10}$/.test(customerForm.mobileNumber))
      return alert("Enter a valid 10-digit mobile number.");
    if (
      customerForm.gstRegistrationType !== "UNREGISTERED" &&
      !/^[0-9A-Za-z]{15}$/.test(customerForm.gstin.trim())
    ) {
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
      alert(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Unable to save customer.",
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  const validateCustomer = () => {
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

  const [invoiceDate, setInvoiceDate] = useState(today);

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
    getProforma(proformaEditId)
      .then((source) => {
        if (!live) return;
        setSelectedStoreId(String(source.storeId || ""));
        setSelectedCustomer({
          id: source.customerId,
          customerName: source.customerName,
          mobileNumber: source.customerMobile,
          email: source.customerEmail,
          gstin: source.customerGstin,
          gstRegistrationType: source.customerGstRegistrationType,
          state: source.customerState,
          billingAddress: source.billingAddress,
          shippingAddress: source.shippingAddress,
        });
        setCustomerSearch(source.customerName || "");
        setItems(
          (source.items || []).map((item) => ({
            ...item,
            quantity: Number(item.quantity),
            sellingPrice: Number(item.unitPrice),
            batchId: null,
          })),
        );
        setBillDiscountPercent(source.billDiscountPercent || 0);
        setDefaultGstType(source.defaultGstType || "CGST_SGST");
        setDefaultGstPercentage(source.defaultGstPercentage ?? 18);
        setInvoiceDate(source.invoiceDate || today);
      })
      .catch((error) =>
        alert(
          error?.response?.data?.message ||
            "Unable to load the proforma for editing.",
        ),
      );
    return () => {
      live = false;
    };
  }, [isProforma, proformaEditId]);

  /* =====================================================
       CREATE INVOICE
    ===================================================== */

  const createInvoice = async () => {
    if (creatingInvoice) {
      return;
    }

    if (!selectedStoreId) {
      alert("Please select a store first.");

      return;
    }

    if (items.length === 0) {
      alert("Please add at least one product before saving the invoice.");

      return;
    }

    // Rejected Excel rows were never added to items. They do not block
    // saving accepted/corrected rows; server recalculation still validates
    // every item actually included in the sale.
    if (bulkSaleBusy.current) {
      alert("Wait for the Excel preview to finish before saving the sale.");
      return;
    }

    if (customerLoading) {
      alert("Please wait for customer verification to finish.");

      return;
    }

    if (calcLoading) {
      alert("Please wait for the bill calculation to finish.");

      return;
    }

    if (calcError || !calculation) {
      alert(
        calcError ||
          "Bill calculation is not available. Please check the bill before saving.",
      );

      return;
    }

    setCreatingInvoice(true);

    try {
      validateCustomer();

      const payableAmount = Number(
        createdOrderAmount ?? calculation?.netPayable ?? 0,
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
        navigate(
          `${isSuperAdmin ? "/owner" : "/store"}/sales/proforma/${saved.id}`,
          { replace: true },
        );
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
            : "Card transaction/reference number is required.",
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
        storeId: Number(selectedStoreId),

        customerId: selectedCustomer.id,

        saleType: "B2B",

        customerName: selectedCustomer.customerName.trim(),

        phone: selectedCustomer.mobileNumber.trim(),

        address: (selectedCustomer.billingAddress ?? "").trim(),

        customerGstin: selectedCustomer.gstin ?? null,
        customerGstRegistrationType:
          selectedCustomer.gstRegistrationType ?? "UNREGISTERED",
        customerState: selectedCustomer.state ?? null,
        customerEmail: selectedCustomer.email ?? null,
        billingAddress: selectedCustomer.billingAddress ?? null,
        shippingAddress: selectedCustomer.shippingAddress ?? null,
        placeOfSupply: selectedCustomer.state ?? null,

        paymentMethod: "PENDING",

        invoiceDate,

        billDiscountPercent: normalizePercentage(billDiscountPercent),

        items: items.map((item) => ({
          productId: item.productId ?? null,

          /*
           * Local products have productId = null.
           * Send localProductId so the backend can
           * resolve the correct local product.
           */
          localProductId: item.localProductId ?? null,

          /*
           * CRITICAL FIX
           */

          inventoryId: item.inventoryId,

          batchId: item.batchId ?? null,

          quantity: Number(item.quantity),

          discountPercentage: normalizePercentage(item.discountPercentage),

          gstType: toBackendGstType(item.gstType, item.gstPercentage),
        })),
      };

      console.log("Creating invoice with payload:", orderData);

      const response =
        createdOrderId ??
        (location.state?.proforma?.sourceProformaId
          ? await convertProforma(
              location.state.proforma.sourceProformaId,
              orderData,
            )
          : await placeOrder(orderData));

      /*
       * Backend may return:
       *
       * number
       * { id }
       * { orderId }
       */

      const orderId = response?.orderId ?? response?.id ?? response;

      if (!orderId) {
        throw new Error(
          "Invoice was created but no order ID was returned by the server.",
        );
      }

      setCreatedOrderId(orderId);
      setCreatedOrderAmount(payableAmount);

      if (paymentStatus === "PAID") {
        await addPayment({
          orderId: Number(orderId),
          collectedBy: String(
            user?.name ?? user?.username ?? user?.email ?? user?.id ?? "Admin",
          ),
          payments: [
            {
              amount: payableAmount,
              paymentMethod,
              transactionNumber:
                paymentMethod === "CASH" ? null : paymentReference.trim(),
              remarks: null,
              customerTendered: paymentMethod === "CASH" ? payableAmount : null,
              changeReturn: 0,
            },
          ],
        });
      }

      // Open the saved invoice; printing remains an explicit invoice action.
      navigate(
        `${isSuperAdmin ? "/owner" : "/store"}/sales/invoice/${orderId}`,
        { replace: true },
      );
    } catch (error) {
      console.error("Invoice creation failed:", error);

      /*
       * Show backend validation message.
       */

      const backendMessage =
        (typeof error?.response?.data === "string"
          ? error.response.data
          : null) ||
        error?.response?.data?.message ||
        error?.response?.data?.error;

      const validationErrors = error?.response?.data?.errors;

      let message =
        backendMessage || error?.message || "Unable to create invoice.";

      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        message = validationErrors.join("\n");
      }

      alert(message);
    } finally {
      setCreatingInvoice(false);
    }
  };

  /* =====================================================
       RENDER
    ===================================================== */

  return (
    <section className="new-sale-page">
      <style>{`/* =========================================================
   NEW SALE PAGE
========================================================= */

.new-sale-page {
    width: 100%;
    min-width: 0;
    min-height: calc(100vh - 20px);
    padding: var(--sp-5) var(--sp-6) var(--sp-5);
    box-sizing: border-box;
    background: #f5f7fa;
    color: #172033;
    overflow-x: hidden;
}


/* =========================================================
   HEADER
========================================================= */

.new-sale-header {
    width: 100%;
    min-width: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: var(--sp-5);
    margin-bottom: var(--sp-3);
    box-sizing: border-box;
}

.new-sale-eyebrow {
    display: block;
    margin-bottom: var(--sp-1);
    color: #2458d6;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .7px;
}

.new-sale-header h1 {
    margin: 0;
    color: #101828;
    font-size: 25px;
    line-height: 1.2;
    font-weight: 750;
}

.new-sale-header p {
    margin: var(--sp-1) 0 0;
    color: #667085;
    font-size: 12px;
}

.new-sale-header-fields {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(180px, 250px) 145px 150px;
    gap: var(--sp-2);
    align-items: end;
}

.new-sale-exit-button {
    height: 38px;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    padding: 0 var(--sp-4);
    border: 1px solid #fecaca;
    border-radius: 8px;
    background: #fff1f2;
    color: #b42318;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
}

.new-sale-exit-button:hover {
    background: #fee2e2;
}

.new-sale-field {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
}

.new-sale-field label {
    color: #667085;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
}

.new-sale-field select,
.new-sale-field input {
    width: 100%;
    height: 38px;
    padding: 0 var(--sp-3);
    border: 1px solid #d9dee8;
    border-radius: 8px;
    background: #fff;
    color: #172033;
    font-size: 11px;
    outline: none;
    box-sizing: border-box;
}

.new-sale-field select:focus,
.new-sale-field input:focus {
    border-color: #3264d8;
    box-shadow: 0 0 0 3px rgba(50, 100, 216, .07);
}

.new-sale-readonly {
    width: 100%;
    height: 38px;
    display: flex;
    align-items: center;
    padding: 0 var(--sp-3);
    border: 1px solid #d9dee8;
    border-radius: 8px;
    background: #f9fafb;
    color: #475467;
    font-size: 11px;
    box-sizing: border-box;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.new-sale-date {
    height: 38px;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: 0 var(--sp-2);
    border: 1px solid #d9dee8;
    border-radius: 8px;
    background: #fff;
    box-sizing: border-box;
}

.new-sale-date svg {
    color: #667085;
    flex-shrink: 0;
}

.new-sale-date input {
    height: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
}

.new-sale-field-error {
    color: #d92d20;
    font-size: 9px;
}


/* =========================================================
   SEARCH
========================================================= */

.new-sale-product-search {
    width: 100%;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    margin-bottom: var(--sp-3);
    box-sizing: border-box;
}

.new-sale-search-container {
    position: relative;
    min-width: 0;
    width: min(620px, 100%);
    flex: 0 1 620px;
}

.new-sale-search-box {
    width: 100%;
    height: 40px;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: 0 var(--sp-3);
    border: 1px solid #d9dee8;
    border-radius: 8px;
    background: #fff;
    box-sizing: border-box;
}

.new-sale-search-box:focus-within {
    border-color: #3264d8;
    box-shadow: 0 0 0 3px rgba(50, 100, 216, .07);
}

.new-sale-search-box svg {
    color: #667085;
    flex-shrink: 0;
}

.new-sale-search-box input {
    width: 100%;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: none;
    background: transparent;
    color: #172033;
    font-size: 12px;
}

.new-sale-search-box input::placeholder {
    color: #98a2b3;
}

.new-sale-search-results {
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    right: 0;
    z-index: 1000;
    max-height: 350px;
    overflow-y: auto;
    overflow-x: hidden;
    border: 1px solid #d9dee8;
    border-radius: 9px;
    background: #fff;
    box-shadow: 0 14px 30px rgba(16, 24, 40, .14);
}

.new-sale-search-result {
    width: 100%;
    min-width: 0;
    display: flex;
    justify-content: space-between;
    gap: var(--sp-4);
    padding: var(--sp-3) var(--sp-3);
    border: 0;
    border-bottom: 1px solid #eef1f5;
    background: #fff;
    text-align: left;
    cursor: pointer;
    box-sizing: border-box;
}

.new-sale-search-result:hover {
    background: #f5f8ff;
}

.new-sale-search-result > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.new-sale-search-result > div:last-child {
    align-items: flex-end;
    flex-shrink: 0;
}

.new-sale-search-result strong {
    color: #172033;
    font-size: 11px;
}

.new-sale-search-result span {
    color: #667085;
    font-size: 9px;
}

.new-sale-search-message {
    padding: var(--sp-4);
    color: #667085;
    text-align: center;
    font-size: 11px;
}

.new-sale-search-message.error {
    color: #d92d20;
}


/* =========================================================
   MAIN POS LAYOUT
========================================================= */

.new-sale-main {
    width: 100%;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 315px;
    gap: var(--sp-4);
    align-items: stretch;
    box-sizing: border-box;
}

.new-sale-main > * {
    min-width: 0;
}


/* =========================================================
   LEFT BILL ITEMS
========================================================= */

.new-sale-items-panel {
    width: 100%;
    min-width: 0;
    min-height: calc(100vh - 188px);
    background: #fff;
    border: 1px solid #e1e5eb;
    border-radius: 10px;
    overflow: hidden;
    box-sizing: border-box;
}

.new-sale-panel-header {
    min-height: 55px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--sp-3) var(--sp-3);
    border-bottom: 1px solid #edf0f4;
    box-sizing: border-box;
}

.new-sale-panel-header h2,
.new-sale-card h2 {
    margin: 0;
    color: #172033;
    font-size: 13px;
    font-weight: 750;
}

.new-sale-panel-header span {
    display: block;
    margin-top: 3px;
    color: #98a2b3;
    font-size: 9px;
}

.new-sale-add-button {
    height: 32px;
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    padding: 0 var(--sp-3);
    border: 1px solid #d9dee8;
    border-radius: 7px;
    background: #fff;
    color: #344054;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
}

.new-sale-add-button:hover {
    background: #f8fafc;
}


/* =========================================================
   GST CONTROLS
========================================================= */

.new-sale-billing-controls {
    min-height: 47px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-4);
    padding: var(--sp-2) var(--sp-3);
    border-bottom: 1px solid #edf0f4;
    background: #fbfcfe;
    box-sizing: border-box;
}

.new-sale-gst-type-group,
.new-sale-gst-percentage-group {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
}

.new-sale-gst-label,
.new-sale-gst-percentage-group label {
    color: #667085;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    white-space: nowrap;
}

.new-sale-gst-buttons {
    display: flex;
    gap: var(--sp-1);
}

.new-sale-gst-button {
    height: 29px;
    padding: 0 var(--sp-3);
    border: 1px solid #d5dbe5;
    border-radius: 6px;
    background: #fff;
    color: #475467;
    font-size: 9px;
    font-weight: 700;
    cursor: pointer;
    box-sizing: border-box;
}

.new-sale-gst-button:hover {
    border-color: #3264d8;
    color: #2458d6;
}

.new-sale-gst-button.active {
    border-color: #2458d6;
    background: #2458d6;
    color: #fff;
}

.new-sale-gst-percentage-group select {
    height: 29px;
    min-width: 72px;
    padding: 0 var(--sp-2);
    border: 1px solid #d5dbe5;
    border-radius: 6px;
    background: #fff;
    color: #344054;
    font-size: 10px;
    font-weight: 700;
    outline: none;
}

.new-sale-gst-percentage-group select:disabled {
    opacity: .5;
    background: #f2f4f7;
}


/* =========================================================
   TABLE
   IMPORTANT:
   No horizontal scrollbar.
   Table fits the available panel width.
========================================================= */

/* =========================================================
   BILL ITEMS TABLE
   Horizontal scrolling enabled
   ========================================================= */

.new-sale-table-wrapper {
    width: 100%;
    min-width: 0;

    min-height: calc(100vh - 290px);

    /* IMPORTANT */
    overflow-x: auto;
    overflow-y: auto;

    box-sizing: border-box;

    /* Keep vertical scrollbar hidden */
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.new-sale-table-wrapper::-webkit-scrollbar {
    height: 8px;
    width: 0;
}

.new-sale-table-wrapper::-webkit-scrollbar-track {
    background: transparent;
}

.new-sale-table-wrapper::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
}


/* =========================================================
   TABLE
   ========================================================= */

.new-sale-table {
    width: max-content;

    /* This is the important part */
    min-width: 900px;

    table-layout: auto;

    border-collapse: collapse;
}


/* COLUMN WIDTHS */

/* .new-sale-table th:nth-child(1),
.new-sale-table td:nth-child(1) {
    width: 5%;
}

.new-sale-table th:nth-child(2),
.new-sale-table td:nth-child(2) {
    width: 16%;
}

.new-sale-table th:nth-child(3),
.new-sale-table td:nth-child(3) {
    width: 18%;
}

.new-sale-table th:nth-child(4),
.new-sale-table td:nth-child(4) {
    width: 8%;
}

.new-sale-table th:nth-child(5),
.new-sale-table td:nth-child(5) {
    width: 9%;
}

.new-sale-table th:nth-child(6),
.new-sale-table td:nth-child(6) {
    width: 10%;
}

.new-sale-table th:nth-child(7),
.new-sale-table td:nth-child(7) {
    width: 10%;
}

.new-sale-table th:nth-child(8),
.new-sale-table td:nth-child(8) {
    width: 9%;
}

.new-sale-table th:nth-child(9),
.new-sale-table td:nth-child(9) {
    width: 10%;
}

.new-sale-table th:nth-child(10),
.new-sale-table td:nth-child(10) {
    width: 5%;
} */


/* TABLE CELL OVERFLOW */

.new-sale-table th,
.new-sale-table td {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}


/* TABLE HEADER */

.new-sale-table th {
    padding: var(--sp-2) var(--sp-2);
    background: #fafbfc;
    border-bottom: 1px solid #e7ebf0;
    color: #667085;
    text-align: left;
    font-size: 8px;
    font-weight: 800;
    text-transform: uppercase;
    white-space: nowrap;
    box-sizing: border-box;
}


/* TABLE BODY */

.new-sale-table td {
    padding: var(--sp-2) var(--sp-2);
    border-bottom: 1px solid #eef1f4;
    color: #344054;
    font-size: 10px;
    white-space: nowrap;
    vertical-align: middle;
    box-sizing: border-box;
}

.new-sale-table tbody tr:hover {
    background: #fafcff;
}


/* PRODUCT CELLS */

.part-number-cell {
    color: #2458d6 !important;
    font-weight: 650;
}

.product-name-cell {
    max-width: 0;
    color: #172033 !important;
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.line-total-cell {
    color: #172033 !important;
    font-weight: 750;
}


/* EMPTY TABLE */

.new-sale-empty {
    height: calc(100vh - 330px);
    min-height: 260px;
    text-align: center;
    vertical-align: middle;
}

.new-sale-empty-content {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-2);
    color: #98a2b3;
}

.new-sale-empty-content svg {
    color: #c5cad3;
}

.new-sale-empty-content strong {
    color: #667085;
    font-size: 12px;
}

.new-sale-empty-content span {
    font-size: 10px;
}


/* =========================================================
   QUANTITY / DISCOUNT
========================================================= */

.new-sale-quantity-input,
.new-sale-discount-input {
    height: 29px;
    padding: 0 var(--sp-2);
    border: 1px solid #d9dee8;
    border-radius: 6px;
    background: #fff;
    color: #172033;
    text-align: center;
    font-size: 10px;
    outline: none;
    box-sizing: border-box;
}

.new-sale-quantity-input {
    width: 54px;
    max-width: 100%;
}

.new-sale-discount-input {
    width: 58px;
    max-width: 100%;
}

.new-sale-quantity-input:focus,
.new-sale-discount-input:focus {
    border-color: #3264d8;
}


/* =========================================================
   DELETE BUTTON
========================================================= */

.new-sale-delete-button {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e2e6ec;
    border-radius: 6px;
    background: #fff;
    color: #98a2b3;
    cursor: pointer;
}

.new-sale-delete-button:hover {
    border-color: #f04438;
    background: #fff5f4;
    color: #d92d20;
}


/* =========================================================
   RIGHT SIDE
========================================================= */

.new-sale-right-column {
    width: 100%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    position: sticky;
    top: 10px;
    align-self: start;
}


/* =========================================================
   CARDS
========================================================= */

.new-sale-card {
    width: 100%;
    min-width: 0;
    padding: var(--sp-3);
    border: 1px solid #e1e5eb;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 1px 2px rgba(16, 24, 40, .03);
    box-sizing: border-box;
}

.new-sale-card-title {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    margin-bottom: var(--sp-3);
}

.new-sale-card-title svg {
    color: #2458d6;
}

.new-sale-card input,
.new-sale-card select {
    width: 100%;
    height: 36px;
    margin-bottom: var(--sp-2);
    padding: 0 var(--sp-2);
    border: 1px solid #d9dee8;
    border-radius: 7px;
    background: #fff;
    color: #172033;
    font-size: 11px;
    outline: none;
    box-sizing: border-box;
}

.new-sale-card input:focus,
.new-sale-card select:focus {
    border-color: #3264d8;
}

.new-sale-card input::placeholder {
    color: #98a2b3;
}


/* =========================================================
   CUSTOMER
========================================================= */

.new-sale-customer-status {
    min-height: 24px;
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    margin-top: 2px;
    padding: 0 var(--sp-2);
    border: 1px solid #e1eee5;
    border-radius: 5px;
    background: #f4faf6;
    color: #5d806b;
    font-size: 9px;
    font-weight: 600;
}

.new-sale-customer-loading {
    display: block;
    color: #98a2b3;
    font-size: 9px;
}


/* =========================================================
   PAYMENT
========================================================= */

.payment-card h2,
.summary-card h2 {
    margin-bottom: var(--sp-2);
}

.payment-card select {
    margin-bottom: 0;
}

.new-sale-item-actions{display:flex;align-items:center;gap: var(--sp-2)}.new-sale-bulk-file-input{display:none}.new-sale-upload-button{height:34px;display:inline-flex;align-items:center;gap: var(--sp-2);padding: 0 var(--sp-3);border:1px solid #b9cdfc;border-radius:7px;background:#f5f8ff;color:#2458d6;font-size:11px;font-weight:700;cursor:pointer}.new-sale-upload-button:hover:not(:disabled){background:#eaf1ff;border-color:#8eacf5}.new-sale-upload-button:disabled{cursor:not-allowed;opacity:.55}.new-sale-bulk-result{margin: 0 var(--sp-3) var(--sp-2);padding: var(--sp-3) var(--sp-3);border:1px solid #b7e4c7;border-radius:8px;background:#f2fbf5;color:#176b35}.new-sale-bulk-result.has-errors{border-color:#f2c6c2;background:#fff6f5;color:#9f2d26}.new-sale-bulk-result>div:first-child{display:flex;align-items:center;justify-content:space-between;gap: var(--sp-3);font-size:11px}.new-sale-bulk-result>div:first-child span{font-size:10px}.new-sale-bulk-errors{max-height:130px;overflow:auto;margin-top: var(--sp-2);padding-top: var(--sp-2);border-top:1px solid currentColor}.new-sale-bulk-errors p{display:grid;grid-template-columns:160px 1fr;gap: var(--sp-3);margin: 0;padding: var(--sp-1) 0;font-size:10px}.new-sale-bulk-errors p span{color:#7b3530}

.new-sale-customer-combobox {
    position: relative;
}

.new-sale-party-row {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) 180px;
    gap: var(--sp-2);
    align-items: start;
}

.new-sale-card .new-sale-party-phone {
    height: 36px;
    margin: 0;
    background: #f8fafc;
}

.new-sale-customer-search-input {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: 0 var(--sp-2);
    border: 1px solid #d9dee8;
    border-radius: 7px;
    background: #fff;
}

.new-sale-customer-search-input input {
    margin: 0;
    padding: 0;
    border: 0;
}

.new-sale-customer-options {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 1200;
    max-height: 250px;
    overflow-y: auto;
    padding: var(--sp-1);
    border: 1px solid #d9dee8;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 12px 24px rgba(16, 24, 40, .14);
}

.new-sale-customer-options > button {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: var(--sp-2);
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #344054;
    font-size: 10px;
    text-align: left;
    cursor: pointer;
}

.new-sale-customer-options > button:hover {
    background: #f2f6ff;
}

.new-sale-customer-options > span {
    display: block;
    padding: var(--sp-2);
    color: #667085;
    font-size: 9px;
}

.new-sale-new-customer-option {
    flex-direction: row !important;
    align-items: center !important;
    color: #2458d6 !important;
    font-weight: 700;
}

.new-sale-selected-customer {
    display: grid;
    gap: var(--sp-1);
    margin-top: var(--sp-2);
    padding: var(--sp-2);
    border: 1px solid #d9e5ff;
    border-radius: 7px;
    background: #f7f9ff;
    color: #667085;
    font-size: 9px;
}

.new-sale-selected-customer label {
    display: grid;
    gap: 3px;
    color: #667085;
    font-size: 9px;
    font-weight: 700;
}

.new-sale-selected-customer textarea {
    min-height: 46px;
    padding: var(--sp-2) var(--sp-2);
    border: 1px solid #d9e1ec;
    border-radius: 5px;
    background: #fff;
    color: #344054;
    resize: none;
}

.new-sale-selected-customer .new-sale-sale-same-address {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--sp-1);
    white-space: nowrap;
}

.new-sale-selected-customer .new-sale-sale-same-address input {
    width: 14px;
    height: 14px;
    margin: 0;
}

.new-sale-selected-customer > div {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    color: #344054;
}

.new-sale-selected-customer button {
    width: max-content;
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    margin-top: 3px;
    padding: var(--sp-1) var(--sp-2);
    border: 1px solid #b9c9ef;
    border-radius: 5px;
    background: #fff;
    color: #2458d6;
    font-size: 9px;
    cursor: pointer;
}

.new-sale-customer-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--sp-5);
    background: rgba(15, 23, 42, .55);
}

.new-sale-customer-modal {
    width: min(720px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 20px 50px rgba(15, 23, 42, .24);
}

.new-sale-customer-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: var(--sp-4) var(--sp-5);
    border-bottom: 1px solid #e6e9ee;
}

.new-sale-customer-modal-header h2,
.new-sale-customer-modal-header p {
    margin: 0;
}

.new-sale-customer-modal-header p {
    margin-top: var(--sp-1);
    color: #667085;
    font-size: 10px;
}

.new-sale-customer-modal-header button {
    border: 0;
    background: transparent;
    cursor: pointer;
}

.new-sale-customer-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-3);
    padding: var(--sp-5);
}

.new-sale-customer-form-grid label {
    display: grid;
    gap: var(--sp-1);
    color: #475467;
    font-size: 10px;
    font-weight: 700;
}

.new-sale-customer-form-grid label.full {
    grid-column: 1 / -1;
}

.new-sale-customer-form-grid input,
.new-sale-customer-form-grid select,
.new-sale-customer-form-grid textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #d9dee8;
    border-radius: 7px;
    background: #fff;
    font: inherit;
}

.new-sale-customer-form-grid .new-sale-same-address {
    display: flex;
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    gap: var(--sp-2);
}

.new-sale-customer-form-grid .new-sale-same-address input {
    width: 15px;
    height: 15px;
    margin: 0;
}

.new-sale-customer-form-grid input,
.new-sale-customer-form-grid select {
    height: 38px;
    padding: 0 var(--sp-3);
}

.new-sale-customer-form-grid textarea {
    min-height: 70px;
    padding: var(--sp-2) var(--sp-3);
    resize: vertical;
}

.new-sale-customer-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-2);
    padding: var(--sp-3) var(--sp-5);
    border-top: 1px solid #e6e9ee;
}

.new-sale-customer-modal-actions button {
    height: 36px;
    padding: 0 var(--sp-3);
    border: 1px solid #d9dee8;
    border-radius: 7px;
    background: #fff;
    cursor: pointer;
}

.new-sale-customer-modal-actions button.primary {
    border-color: #2458d6;
    background: #2458d6;
    color: #fff;
}

.new-sale-payment-status,
.new-sale-payment-methods {
    display: grid;
    gap: var(--sp-2);
    margin-bottom: var(--sp-3);
}

.new-sale-payment-status {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.new-sale-payment-methods {
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.new-sale-payment-status button,
.new-sale-payment-method {
    height: 34px;
    border: 1px solid #d9dee8;
    border-radius: 7px;
    background: #fff;
    color: #475467;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
}

.new-sale-payment-status button.active,
.new-sale-payment-method.active {
    border-color: #2458d6;
    background: #eef4ff;
    color: #2458d6;
}

.new-sale-payment-label,
.new-sale-payment-retry {
    color: #667085;
    font-size: 9px;
}


/* =========================================================
   BILL SUMMARY
========================================================= */

.new-sale-summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-1) 0;
    font-size: 10px;
}

.new-sale-summary-row span {
    min-width: 0;
    color: #667085;
}

.new-sale-summary-row strong {
    flex-shrink: 0;
    color: #344054;
    font-weight: 650;
}

.new-sale-grand-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-3);
    margin-top: var(--sp-2);
    padding-top: var(--sp-3);
    border-top: 1px solid #e6e9ee;
}

.new-sale-grand-total span {
    color: #344054;
    font-size: 11px;
    font-weight: 750;
}

.new-sale-grand-total strong {
    color: #174ea6;
    font-size: 18px;
    font-weight: 800;
}

.new-sale-calculation-status,
.new-sale-calculation-error {
    margin-top: var(--sp-2);
    padding: var(--sp-2) var(--sp-2);
    border-radius: 5px;
    font-size: 9px;
}

.new-sale-calculation-status {
    background: #f2f6ff;
    color: #2458d6;
}

.new-sale-calculation-error {
    background: #fff4f2;
    color: #d92d20;
}


/* =========================================================
   ACTION BUTTONS
========================================================= */

.new-sale-action-card {
    width: 100%;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--sp-2);
}

.new-sale-cancel-button,
.new-sale-save-button {
    height: 38px;
    min-width: 0;
    padding: 0 var(--sp-3);
    border-radius: 7px;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
    box-sizing: border-box;
}

.new-sale-cancel-button {
    border: 1px solid #d9dee8;
    background: #fff;
    color: #475467;
}

.new-sale-save-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-1);
    border: 0;
    background: #2458d6;
    color: #fff;
}

.new-sale-save-button.secondary {
    border: 1px solid #2458d6;
    background: #fff;
    color: #2458d6;
}

.new-sale-save-button:hover {
    background: #1947bb;
    color: #fff;
}

.new-sale-save-button.secondary:hover {
    background: #f3f6ff;
    color: #2458d6;
}

.new-sale-cancel-button:hover {
    background: #f8fafc;
}

.new-sale-cancel-button:disabled,
.new-sale-save-button:disabled {
    opacity: .55;
    cursor: not-allowed;
}


/* =========================================================
   LOADING SPINNER
========================================================= */

.new-sale-spin {
    animation: new-sale-spin 1s linear infinite;
}

@keyframes new-sale-spin {
    to {
        transform: rotate(360deg);
    }
}


/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1100px) {

    .new-sale-header {
        flex-direction: column;
        align-items: stretch;
    }

    .new-sale-header-fields {
        grid-template-columns: 1fr 1fr 1fr;
    }

}


@media (max-width: 850px) {

    .new-sale-main {
        grid-template-columns: 1fr;
    }

    .new-sale-right-column {
        position: static;
    }

    .new-sale-header-fields {
        grid-template-columns: 1fr;
    }

}


@media (max-width: 600px) {

    .new-sale-page {
        padding: var(--sp-3);
    }

    .new-sale-billing-controls {
        align-items: flex-start;
        flex-direction: column;
    }

    .new-sale-product-search {
        flex-direction: column;
        align-items: stretch;
    }

    .new-sale-search-container {
        width: 100%;
    }

    .new-sale-action-card {
        grid-template-columns: 1fr;
    }

}

/* =========================================================
   BATCH SELECTOR
   ========================================================= */

.new-sale-batch-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--sp-5);
    background: rgba(16, 24, 40, .42);
    box-sizing: border-box;
}

.new-sale-batch-modal {
    width: min(680px, 100%);
    max-height: min(720px, calc(100vh - 40px));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e1e5eb;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 24px 60px rgba(16, 24, 40, .22);
}

.new-sale-batch-modal-header {
    min-height: 66px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-4);
    padding: var(--sp-3) var(--sp-4);
    border-bottom: 1px solid #edf0f4;
    box-sizing: border-box;
}

.new-sale-batch-modal-header h2 {
    margin: 0;
    color: #172033;
    font-size: 15px;
    font-weight: 750;
}

.new-sale-batch-modal-header p {
    margin: var(--sp-1) 0 0;
    color: #667085;
    font-size: 10px;
}

.new-sale-batch-modal-close {
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    border: 1px solid #d9dee8;
    border-radius: 7px;
    background: #fff;
    color: #667085;
    font-size: 19px;
    line-height: 1;
    cursor: pointer;
}

.new-sale-batch-modal-close:hover {
    background: #f8fafc;
    color: #172033;
}

.new-sale-batch-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    padding: var(--sp-3);
    overflow-y: auto;
    box-sizing: border-box;
}

.new-sale-batch-option {
    width: 100%;
    min-height: 62px;
    display: grid;
    grid-template-columns: minmax(150px, 1.6fr) repeat(3, minmax(90px, 1fr));
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-3);
    border: 1px solid #dfe4ec;
    border-radius: 8px;
    background: #fff;
    color: #344054;
    text-align: left;
    cursor: pointer;
    box-sizing: border-box;
}

.new-sale-batch-option:hover {
    border-color: #3264d8;
    background: #f7f9ff;
}

.new-sale-batch-option.selected {
    border-color: #2458d6;
    background: #f2f6ff;
    box-shadow: 0 0 0 2px rgba(36, 88, 214, .08);
}

.new-sale-batch-option > span {
    color: #667085;
    font-size: 10px;
    white-space: nowrap;
}

.new-sale-batch-main {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
}

.new-sale-batch-main strong {
    min-width: 0;
    overflow: hidden;
    color: #172033;
    font-size: 10px;
    font-weight: 750;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.new-sale-fifo-badge {
    flex: 0 0 auto;
    padding: 3px var(--sp-2);
    border-radius: 999px;
    background: #ecfdf3;
    color: #027a48;
    font-size: 8px !important;
    font-weight: 800;
    text-transform: uppercase;
}

.new-sale-batch-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-2);
    padding: var(--sp-3) var(--sp-3);
    border-top: 1px solid #edf0f4;
    background: #fbfcfe;
    box-sizing: border-box;
}

@media (max-width: 650px) {
    .new-sale-batch-option {
        grid-template-columns: 1fr 1fr;
    }

    .new-sale-batch-main {
        grid-column: 1 / -1;
    }
}

/* Accounting-style sale form: party first, full-width item grid, compact totals. */
@media (min-width: 851px) {
    .new-sale-page {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        grid-auto-flow: row;
        gap: var(--sp-3) var(--sp-3);
        padding: var(--sp-4) var(--sp-5) var(--sp-6);
        background: #f8fafc;
    }

    .new-sale-header {
        grid-column: 1 / -1;
        align-items: center;
        margin: 0;
        padding: 2px 0 var(--sp-2);
        border-bottom: 0;
    }

    .new-sale-header h1 { font-size: 23px; letter-spacing: -.3px; }
    .new-sale-header-fields {
        margin-left: auto;
        grid-template-columns: 158px 112px 132px;
    }
    .new-sale-field select,
    .new-sale-field input,
    .new-sale-readonly,
    .new-sale-date { height: 32px; border-radius: 5px; }
    .new-sale-exit-button { height: 32px; border-radius: 5px; }

    .new-sale-main { display: contents; }
    .new-sale-right-column { display: contents; }

    .customer-card {
        grid-column: 1 / 2;
        grid-row: 2;
        width: 100%;
        padding: var(--sp-4) var(--sp-4);
        border-radius: 7px;
        border-color: #dbe3ef;
        box-shadow: 0 1px 2px rgba(15, 23, 42, .03);
    }
    .new-sale-customer-combobox { max-width: none; }
    .new-sale-party-row { grid-template-columns: minmax(280px, 380px) 170px; }
    .new-sale-selected-customer {
        grid-template-columns: 145px 110px minmax(190px, 1fr) minmax(190px, 1fr) auto;
        align-items: center;
        padding: var(--sp-3) 0 0;
        border: 0;
        border-top: 1px solid #edf1f6;
        border-radius: 0;
        background: transparent;
    }
    .new-sale-selected-customer > span:nth-of-type(2) { display: none; }
    .new-sale-selected-customer .new-sale-sale-same-address { grid-column: 4 / 5; }

    .new-sale-product-search {
        grid-column: 1 / 2;
        grid-row: 3;
        margin: 0;
    }
    .new-sale-search-container { width: min(520px, 100%); flex-basis: 520px; }
    .new-sale-search-box { height: 34px; border-radius: 5px; }

    .new-sale-items-panel {
        grid-column: 1 / 2;
        grid-row: 4;
        min-height: 420px;
        border-radius: 7px;
        border-color: #dbe3ef;
        box-shadow: 0 1px 2px rgba(15, 23, 42, .03);
    }
    .new-sale-panel-header { min-height: 42px; padding: var(--sp-2) var(--sp-3); }
    .new-sale-billing-controls { min-height: 40px; padding: var(--sp-1) var(--sp-3); }
    .new-sale-table { width: 100%; min-width: 980px; }
    .new-sale-table-wrapper { min-height: 330px; }

    .payment-card {
        grid-column: 2 / 3;
        grid-row: 2;
        width: 100%;
        border-radius: 7px;
        border-color: #dbe3ef;
        box-shadow: 0 1px 2px rgba(15, 23, 42, .03);
    }
    .payment-card .new-sale-payment-status { width: 250px; }
    .payment-card .new-sale-payment-methods { width: 330px; }
    .payment-card > input { width: 330px; }
    .summary-card {
        grid-column: 2 / 3;
        grid-row: 3 / span 3;
        align-self: start;
        position: sticky;
        top: 12px;
        padding: var(--sp-5);
        border-radius: 7px;
        border-color: #dbe3ef;
        box-shadow: 0 1px 3px rgba(15, 23, 42, .05);
    }
    .summary-card h2 { margin-bottom: var(--sp-4); font-size: 15px; }
    .summary-card .new-sale-summary-row { padding: var(--sp-2) 0; font-size: 11px; }
    .summary-card .new-sale-grand-total {
        margin-top: var(--sp-3);
        padding: var(--sp-4) var(--sp-3);
        border: 1px solid #dbe6fb;
        border-radius: 7px;
        background: #f7faff;
    }
    .summary-card .new-sale-grand-total strong { font-size: 21px; }
    .new-sale-action-card {
        width: 100%;
        margin-top: var(--sp-4);
    }
    .new-sale-save-button { height: 46px; font-size: 13px; border-radius: 7px; }
}
`}</style>

      {/* =================================================
                HEADER
            ================================================= */}

      <div className="new-sale-header">
        <div>
          <h1>
            {isProforma
              ? proformaEditId
                ? "Edit Proforma"
                : "New Proforma"
              : "New Sale"}
          </h1>
        </div>

        <div className="new-sale-header-fields">
          {/* STORE */}

          <div className="new-sale-field">
            <label>Store</label>

            {isSuperAdmin ? (
              <select
                value={selectedStoreId}
                onChange={handleStoreChange}
                disabled={storeLoading}
              >
                <option value="">
                  {storeLoading ? "Loading..." : "Select store"}
                </option>

                {stores.map((store) => {
                  const storeId = store.id ?? store.storeId;

                  const storeName =
                    store.storeName ?? store.name ?? `Store ${storeId}`;

                  const storeCode = store.storeCode ?? store.code;

                  return (
                    <option key={storeId} value={storeId}>
                      {storeName}

                      {storeCode ? ` (${storeCode})` : ""}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="new-sale-readonly">
                {user?.storeName || "Current Store"}
              </div>
            )}

            {storeError && (
              <small className="new-sale-field-error">{storeError}</small>
            )}
          </div>

          {/* INVOICE NUMBER */}

          <div className="new-sale-field">
            <label>Invoice No.</label>

            <div className="new-sale-readonly">Auto generated</div>
          </div>

          {/* DATE */}

          <div className="new-sale-field">
            <label>Date</label>

            <div className="new-sale-date">
              <CalendarDays size={14} />

              <input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          className="new-sale-exit-button"
          onClick={() =>
            navigate(isSuperAdmin ? "/owner/sales" : "/store/sales")
          }
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
            <Search size={17} />

            <input
              type="text"
              value={searchText}
              onChange={(event) => handleProductSearch(event.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowProductResults(true);
                }
              }}
              placeholder="Search product by part number, name, brand..."
            />
          </div>

          {showProductResults && (
            <div className="new-sale-search-results">
              {productLoading ? (
                <div className="new-sale-search-message">Searching...</div>
              ) : productSearchError ? (
                <div className="new-sale-search-message error">
                  {productSearchError}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="new-sale-search-message">
                  No available products found.
                </div>
              ) : (
                searchResults.map((product, index) => {
                  const quantity = Number(product.quantity ?? 0);

                  const mrp = Number(product.mrp ?? 0);

                  const sellingPrice = Number(
                    product.sellingPrice ?? product.price ?? 0,
                  );

                  const productName =
                    product.itemName ??
                    product.productName ??
                    product.name ??
                    "Product";

                  const partNumber = product.partNumber ?? "-";

                  return (
                    <button
                      type="button"
                      className="new-sale-search-result"
                      key={product.inventoryId ?? product.productId ?? index}
                      disabled={quantity <= 0}
                      onClick={() => handleAddProduct(product)}
                    >
                      <div>
                        <strong>{productName}</strong>
                        <ProductUnitLabel product={product} />

                        <span>Part Number: {partNumber}</span>

                        <span>Stock: {quantity}</span>
                      </div>

                      <div>
                        <span>MRP {money(mrp)}</span>

                        <strong>{money(sellingPrice)}</strong>
                      </div>
                    </button>
                  );
                })
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
              <h2>Bill Items</h2>

              <span>{items.length} item(s)</span>
            </div>

            <div className="new-sale-item-actions">
              {!isProforma && (
                <>
                  <input
                    ref={bulkSaleInputRef}
                    className="new-sale-bulk-file-input"
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleBulkSaleFile}
                  />
                  <button
                    type="button"
                    className="new-sale-upload-button"
                    disabled={bulkSaleLoading || !selectedStoreId}
                    onClick={() => bulkSaleInputRef.current?.click()}
                  >
                    <Upload size={15} />
                    {bulkSaleLoading ? "Reading..." : "Upload Excel"}
                  </button>
                  <button
                    type="button"
                    className="new-sale-download-template-button"
                    onClick={handleDownloadSalesTemplate}
                  >
                    Download Sample Excel
                  </button>
                </>
              )}
              <button
                type="button"
                className="new-sale-add-button"
                onClick={() => {
                  (
                    document.querySelector(
                      ".new-sale-search-box input",
                    ) as HTMLElement
                  )?.focus();
                }}
              >
                <Plus size={15} />
                Add Item
              </button>
            </div>
          </div>

          {bulkSalePreview && (
            <div
              className={`new-sale-bulk-result ${bulkSalePreview.invalidRows > 0 ? "has-errors" : "is-valid"}`}
            >
              <div>
                <strong>{bulkSalePreview.totalRows} rows uploaded</strong>
                <span>
                  {bulkSalePreview.validRows} valid ·{" "}
                  {bulkSalePreview.invalidRows} invalid
                </span>
              </div>
              {bulkSalePreview.invalidRows > 0 && (
                <p>
                  Rejected rows are excluded from this bill. Valid rows can be
                  saved. Upload corrections to add them; previously accepted
                  items are kept.
                </p>
              )}
              {bulkSalePreview.invalidRows > 0 && (
                <div className="new-sale-bulk-errors">
                  {(bulkSalePreview.rows || [])
                    .filter((row) => !row.valid)
                    .map((row) => (
                      <p key={`${row.rowNumber}-${row.partNumber}`}>
                        <strong>
                          Row {row.rowNumber}
                          {row.partNumber ? ` · ${row.partNumber}` : ""}
                        </strong>
                        <span>{(row.errors || []).join(". ")}</span>
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================
                        BILL GST
                    ================================================== */}

          <div className="new-sale-billing-controls">
            <div className="new-sale-gst-type-group">
              <span className="new-sale-gst-label">Tax Type</span>

              <div className="new-sale-gst-buttons">
                <button
                  type="button"
                  className={`new-sale-gst-button ${
                    defaultGstType === "CGST_SGST" ? "active" : ""
                  }`}
                  onClick={() => handleDefaultGstTypeChange("CGST_SGST")}
                >
                  GST
                </button>

                <button
                  type="button"
                  className={`new-sale-gst-button ${
                    defaultGstType === "IGST" ? "active" : ""
                  }`}
                  onClick={() => handleDefaultGstTypeChange("IGST")}
                >
                  IGST
                </button>

                <button
                  type="button"
                  className={`new-sale-gst-button ${
                    defaultGstType === "NONE" ? "active" : ""
                  }`}
                  onClick={() => handleDefaultGstTypeChange("NONE")}
                >
                  No Tax
                </button>
              </div>
            </div>

            <div className="new-sale-gst-percentage-group">
              <label htmlFor="new-sale-gst-percentage">GST %</label>

              <select
                id="new-sale-gst-percentage"
                value={defaultGstPercentage}
                disabled={defaultGstType === "NONE"}
                onChange={(event) =>
                  handleDefaultGstPercentageChange(event.target.value)
                }
              >
                {GST_PERCENTAGES.map((percentage) => (
                  <option key={percentage} value={percentage}>
                    {percentage}%
                  </option>
                ))}
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
                  <th>S.No</th>

                  <th>Part Number</th>

                  <th>Part Name</th>

                  <th>Qty</th>

                  <th>MRP</th>

                  <th>Unit Price</th>

                  <th>Discount %</th>

                  <th>GST</th>

                  <th>Taxable Value</th>

                  <th>Total</th>

                  <th></th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="new-sale-empty">
                      <div className="new-sale-empty-content">
                        <Search size={24} />

                        <strong>Search and add products</strong>

                        <span>Available store stock will appear here.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayRows.map(
                    ({ item, itemIndex, line, allocationIndex }, index) => {
                      return (
                        <tr
                          key={`${item.inventoryId}-${line?.batchId ?? "pending"}-${allocationIndex}`}
                        >
                          <td>{index + 1}</td>

                          <td className="part-number-cell">
                            {item.partNumber}
                          </td>

                          <td className="product-name-cell">
                            {item.itemName}
                            <ProductUnitLabel product={item} />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="1"
                              max={item.availableQuantity}
                              key={`${line?.batchId ?? "pending"}-${line?.quantity ?? item.quantity}`}
                              defaultValue={line?.quantity ?? item.quantity}
                              onFocus={(event) => event.currentTarget.select()}
                              onBlur={(event) => {
                                if (line) {
                                  updateAllocatedQuantity(
                                    itemIndex,
                                    line.quantity,
                                    event.target.value,
                                  );
                                } else {
                                  updateItemQuantity(
                                    itemIndex,
                                    event.target.value,
                                  );
                                  finishItemQuantityEdit(itemIndex);
                                }
                              }}
                              className="new-sale-quantity-input"
                            />
                          </td>

                          <td>{money(line?.mrp ?? item.mrp)}</td>

                          <td>
                            {money(line?.sellingPrice ?? item.sellingPrice)}
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.discountPercentage}
                              onChange={(event) =>
                                updateItemDiscount(
                                  itemIndex,
                                  event.target.value,
                                )
                              }
                              className="new-sale-discount-input"
                              aria-label="Discount percentage"
                            />
                          </td>

                          <td>
                            {item.gstType === "NONE"
                              ? "No Tax"
                              : `${item.gstPercentage}%`}
                          </td>

                          <td className="taxable-value-cell">
                            {money(line?.taxableAmount ?? item.taxableAmount)}
                          </td>

                          <td className="line-total-cell">
                            {money(line?.lineTotal ?? item.lineTotal)}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="new-sale-delete-button"
                              onClick={() => removeItem(itemIndex)}
                              aria-label="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    },
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
              <UserRound size={17} />

              <h2>Party / Customer</h2>
            </div>

            <div className="new-sale-party-row">
              <div className="new-sale-customer-combobox">
                <div className="new-sale-customer-search-input">
                  <Search size={14} />
                  <input
                    type="text"
                    value={customerSearch}
                    placeholder={
                      selectedStoreId
                        ? "Search party, mobile or GSTIN"
                        : "Select store first"
                    }
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
                    <button
                      type="button"
                      className="new-sale-new-customer-option"
                      onClick={() => openCustomerModal()}
                    >
                      <Plus size={14} /> New Party / Customer
                    </button>
                    {customerLoading ? (
                      <span>Searching...</span>
                    ) : customerResults.length === 0 ? (
                      <span>No customers found for this store.</span>
                    ) : (
                      customerResults.map((customer) => (
                        <button
                          type="button"
                          key={customer.id}
                          onClick={() => selectCustomer(customer)}
                        >
                          <strong>{customer.customerName}</strong>
                          <small>
                            {customer.mobileNumber}
                            {customer.gstin ? ` · ${customer.gstin}` : ""}
                            {customer.balanceAmount != null
                              ? ` · Balance ${money(customer.balanceAmount)}`
                              : ""}
                          </small>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <input
                className="new-sale-party-phone"
                value={selectedCustomer?.mobileNumber || ""}
                readOnly
                placeholder="Phone No."
              />
            </div>

            {selectedCustomer && (
              <div className="new-sale-selected-customer">
                <div>
                  <CheckCircle2 size={13} />
                  <strong>{selectedCustomer.customerName}</strong>
                </div>
                <span>{selectedCustomer.mobileNumber}</span>
                <span>
                  {selectedCustomer.gstRegistrationType === "UNREGISTERED"
                    ? "Unregistered"
                    : `${selectedCustomer.gstRegistrationType} · ${selectedCustomer.gstin}`}
                </span>
                <label>
                  Billing Address
                  <textarea
                    value={selectedCustomer.billingAddress ?? ""}
                    onChange={(event) =>
                      setSelectedCustomer((current) => ({
                        ...current,
                        billingAddress: event.target.value,
                        ...(saleSameAsBilling
                          ? { shippingAddress: event.target.value }
                          : {}),
                      }))
                    }
                  />
                </label>
                <label>
                  Shipping Address
                  <textarea
                    disabled={saleSameAsBilling}
                    value={selectedCustomer.shippingAddress ?? ""}
                    onChange={(event) =>
                      setSelectedCustomer((current) => ({
                        ...current,
                        shippingAddress: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="new-sale-sale-same-address">
                  <input
                    type="checkbox"
                    checked={saleSameAsBilling}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSaleSameAsBilling(checked);
                      if (checked)
                        setSelectedCustomer((current) => ({
                          ...current,
                          shippingAddress: current.billingAddress ?? "",
                        }));
                    }}
                  />{" "}
                  Same as Billing Address
                </label>
                <button
                  type="button"
                  onClick={() => openCustomerModal(selectedCustomer)}
                >
                  <Pencil size={12} /> Edit Customer
                </button>
              </div>
            )}
          </div>

          {/* =================================================
                        PAYMENT TYPE
                    ================================================== */}

          {!isProforma && (
            <div className="new-sale-card payment-card">
              <h2>Payment</h2>

              <div
                className="new-sale-payment-status"
                role="group"
                aria-label="Payment status"
              >
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
                <div
                  className="new-sale-payment-methods"
                  role="group"
                  aria-label="Payment method"
                >
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
                      {method === "CASH"
                        ? "Cash"
                        : method === "UPI"
                          ? "UPI"
                          : "Card"}
                    </button>
                  ))}
                </div>
              )}

              {paymentStatus === "PAID" && paymentMethod !== "CASH" && (
                <>
                  <label
                    className="new-sale-payment-label"
                    htmlFor="new-sale-payment-reference"
                  >
                    {paymentMethod === "UPI"
                      ? "UTR number"
                      : "Card transaction/reference number"}
                  </label>
                  <input
                    id="new-sale-payment-reference"
                    value={paymentReference}
                    maxLength={100}
                    onChange={(event) =>
                      setPaymentReference(event.target.value)
                    }
                    placeholder={
                      paymentMethod === "UPI"
                        ? "Enter UPI UTR number"
                        : "Enter card reference number"
                    }
                  />
                </>
              )}

              {createdOrderId && (
                <p className="new-sale-payment-retry">
                  Sale #{createdOrderId} was created and stock was deducted.
                  Correct the payment details and save again; a second sale will
                  not be created.
                </p>
              )}
            </div>
          )}

          {/* =================================================
                        BILL SUMMARY
                    ================================================== */}

          <div className="new-sale-card summary-card">
            <h2>Bill Summary</h2>

            <div className="new-sale-overall-discount">
              <div className="new-sale-overall-discount-label">
                <span>Overall Discount</span>
              </div>
              <div className="new-sale-overall-discount-input">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={billDiscountPercent}
                  onChange={(event) =>
                    handleBillDiscountChange(event.target.value)
                  }
                />
                <span>%</span>
              </div>
            </div>

            <div className="new-sale-summary-row">
              <span>Item Count</span>

              <strong>{calculation?.totalItems ?? items.length}</strong>
            </div>

            <div className="new-sale-summary-row">
              <span>Total Quantity</span>

              <strong>
                {calculation?.totalQuantity ??
                  items.reduce(
                    (total, item) => total + Number(item.quantity || 0),
                    0,
                  )}
              </strong>
            </div>

            <div className="new-sale-summary-row">
              <span>Total MRP</span>

              <strong>{money(totalMrp)}</strong>
            </div>

            <div className="new-sale-summary-row">
              <span>Item Discount</span>

              <strong>{money(calculation?.itemDiscount)}</strong>
            </div>

            <div className="new-sale-summary-row">
              <span>Taxable Amount</span>

              <strong>{money(calculation?.taxableAmount)}</strong>
            </div>

            {/* GST SUMMARY */}

            {defaultGstType === "IGST" ? (
              <div className="new-sale-summary-row">
                <span>IGST</span>

                <strong>{money(calculation?.igst)}</strong>
              </div>
            ) : defaultGstType === "CGST_SGST" ? (
              <>
                <div className="new-sale-summary-row">
                  <span>CGST</span>

                  <strong>{money(calculation?.cgst)}</strong>
                </div>

                <div className="new-sale-summary-row">
                  <span>SGST</span>

                  <strong>{money(calculation?.sgst)}</strong>
                </div>
              </>
            ) : null}

            <div className="new-sale-summary-row">
              <span>Bill Discount ({billDiscountPercent}%)</span>

              <strong>{money(calculation?.billDiscount)}</strong>
            </div>

            <div className="new-sale-summary-row">
              <span>Round Off</span>

              <strong>{money(calculation?.roundOff)}</strong>
            </div>

            {calcLoading && (
              <div className="new-sale-calculation-status">Calculating...</div>
            )}

            {calcError && (
              <div className="new-sale-calculation-error">{calcError}</div>
            )}

            <div className="new-sale-grand-total">
              <span>Grand Total</span>

              <strong>{money(calculation?.netPayable)}</strong>
            </div>

            {/* =================================================
                        ACTIONS
                    ================================================== */}

            <div className="new-sale-action-card">
              <button
                type="button"
                className="new-sale-save-button"
                onClick={createInvoice}
                disabled={creatingInvoice}
              >
                {creatingInvoice ? (
                  <Loader2 size={14} className="new-sale-spin" />
                ) : isProforma ? (
                  proformaEditId ? (
                    "Update Proforma"
                  ) : (
                    "Save Proforma"
                  )
                ) : (
                  "Save Sale"
                )}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {customerModalOpen && (
        <div
          className="new-sale-customer-modal-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="new-sale-customer-modal">
            <div className="new-sale-customer-modal-header">
              <div>
                <h2>
                  {editingCustomer ? "Edit Customer" : "New Party / Customer"}
                </h2>
                <p>B2B customer details for the selected store</p>
              </div>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className="new-sale-customer-form-grid">
              <label>
                Party Name *
                <input
                  value={customerForm.customerName}
                  onChange={(event) =>
                    handleCustomerFormChange("customerName", event.target.value)
                  }
                />
              </label>
              <label>
                Mobile Number *
                <input
                  value={customerForm.mobileNumber}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    handleCustomerFormChange(
                      "mobileNumber",
                      event.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                />
              </label>
              <label>
                GST Registration Type
                <select
                  value={customerForm.gstRegistrationType}
                  onChange={(event) =>
                    handleCustomerFormChange(
                      "gstRegistrationType",
                      event.target.value,
                    )
                  }
                >
                  <option value="UNREGISTERED">Unregistered</option>
                  <option value="REGISTERED">Registered</option>
                </select>
              </label>
              {customerForm.gstRegistrationType !== "UNREGISTERED" && (
                <label>
                  GSTIN *
                  <input
                    value={customerForm.gstin}
                    maxLength={15}
                    onChange={(event) =>
                      handleCustomerFormChange(
                        "gstin",
                        event.target.value
                          .toUpperCase()
                          .replace(/[^0-9A-Z]/g, ""),
                      )
                    }
                  />
                </label>
              )}
              <label>
                State
                <input
                  value={customerForm.state}
                  onChange={(event) =>
                    handleCustomerFormChange("state", event.target.value)
                  }
                />
              </label>
              <label>
                Email ID
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(event) =>
                    handleCustomerFormChange("email", event.target.value)
                  }
                />
              </label>
              <label className="full">
                Billing Address
                <textarea
                  value={customerForm.billingAddress}
                  onChange={(event) =>
                    handleCustomerFormChange(
                      "billingAddress",
                      event.target.value,
                    )
                  }
                />
              </label>
              <label className="full">
                Shipping Address
                <textarea
                  value={customerForm.shippingAddress}
                  disabled={sameAsBilling}
                  onChange={(event) =>
                    handleCustomerFormChange(
                      "shippingAddress",
                      event.target.value,
                    )
                  }
                />
              </label>
              <label className="full new-sale-same-address">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(event) =>
                    handleSameAsBilling(event.target.checked)
                  }
                />{" "}
                Same as Billing Address
              </label>
            </div>

            <div className="new-sale-customer-modal-actions">
              <button type="button" onClick={() => setCustomerModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={savingCustomer}
                onClick={handleSaveB2BCustomer}
              >
                {savingCustomer
                  ? "Saving..."
                  : editingCustomer
                    ? "Update Customer"
                    : "Create Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {batchModalOpen && (
        <div className="new-sale-batch-modal-overlay">
          <div className="new-sale-batch-modal">
            <div className="new-sale-batch-modal-header">
              <div>
                <h2>Select Batch</h2>
                <p>{selectedProductForBatch?.itemName ?? "Product"}</p>
              </div>
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
                const selected =
                  String(selectedBatchId) === String(batch.batchId);
                return (
                  <button
                    type="button"
                    key={batch.batchId ?? batch.id}
                    className={`new-sale-batch-option ${selected ? "selected" : ""}`}
                    onClick={() =>
                      setSelectedBatchId(batch.batchId ?? batch.id)
                    }
                  >
                    <div className="new-sale-batch-main">
                      <strong>
                        {batch.batchNumber ?? batch.batchNo ?? batch.id}
                      </strong>

                      {(batch.recommended || batch.fifo || batch.isFifo) && (
                        <span className="new-sale-fifo-badge">FIFO</span>
                      )}
                    </div>

                    <span>
                      Available: {Number(batch.availableQuantity ?? 0)}
                    </span>

                    <span>MRP: {money(batch.mrp)}</span>

                    <span>
                      Selling:{" "}
                      {money(
                        batch.sellingPrice ?? batch.sellingPriceAmount ?? 0,
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
              <button
                type="button"
                className="new-sale-save-button"
                disabled={!selectedBatchId || batchLoading}
                onClick={confirmBatchSelection}
              >
                Select Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
