import React, { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import {
  getCurrentStockPage,
  printBarcodes,
} from "../../../services/storeInventoryPanelService";
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function BarcodeGeneratePage() {
  const user = useMemo(() => readUser(), []);

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  /*
   * ---------------------------------------------------------
   * STORE
   * ---------------------------------------------------------
   *
   * STORE_OWNER:
   *     storeId comes from login.
   *
   * SUPER_ADMIN:
   *     storeId starts empty because SUPER_ADMIN
   *     does not have an assigned store.
   *
   *     The Super Admin selects a store from the
   *     dropdown below.
   */
  const [stores, setStores] = useState([]);

  const [storeId, setStoreId] = useState(
    user.storeId ? String(user.storeId) : "",
  );

  const [storesLoading, setStoresLoading] = useState(false);

  /*
   * ---------------------------------------------------------
   * INVENTORY
   * ---------------------------------------------------------
   */
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /*
   * ---------------------------------------------------------
   * FILTERS
   * ---------------------------------------------------------
   */
  const [searchText, setSearchText] = useState("");

  const [selectedBrand, setSelectedBrand] = useState("");

  /*
   * ---------------------------------------------------------
   * PAGINATION
   * ---------------------------------------------------------
   */
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  const [currentPage, setCurrentPage] = useState(1);

  /*
   * ---------------------------------------------------------
   * SELECTION
   * ---------------------------------------------------------
   */
  const [selectedIds, setSelectedIds] = useState([]);

  /*
   * ---------------------------------------------------------
   * BARCODE IMAGE PREVIEW
   * ---------------------------------------------------------
   *
   * Backend generates the actual barcode PNG.
   *
   * We only store the returned image URL here.
   */
  const [barcodeImages, setBarcodeImages] = useState({});

  /*
   * ---------------------------------------------------------
   * PRINTING
   * ---------------------------------------------------------
   */
  const [printing, setPrinting] = useState(false);

  /*
   * ---------------------------------------------------------
   * LOAD STORES FOR SUPER ADMIN
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    const loadStores = async () => {
      try {
        setStoresLoading(true);
        setError("");

        const response = await api.get("/stores", {
          params: {
            page: 0,
            size: 100,
            active: true,
          },
        });

        const activeStores = Array.isArray(response?.data?.content)
          ? response.data.content
          : [];

        setStores(activeStores);
      } catch (requestError) {
        console.error("Unable to load stores:", requestError);

        setError(
          requestError?.response?.data?.message || "Unable to load stores.",
        );
      } finally {
        setStoresLoading(false);
      }
    };

    loadStores();
  }, [isSuperAdmin]);

  /*
   * ---------------------------------------------------------
   * LOAD STORE INVENTORY
   * ---------------------------------------------------------
   *
   * This is the important part.
   *
   * When Super Admin selects:
   *
   *     Store 1
   *
   * frontend calls:
   *
   *     GET /store-inventory/store/1/paged
   *
   * When Super Admin changes to:
   *
   *     Store 2
   *
   * frontend calls:
   *
   *     GET /store-inventory/store/2/paged
   */
  useEffect(() => {
    if (!storeId) {
      setItems([]);
      setSelectedIds([]);
      setBarcodeImages({});
      setError("");
      return;
    }

    const loadBarcodeItems = async () => {
      try {
        setLoading(true);
        setError("");
        setSelectedIds([]);
        setBarcodeImages({});

        const response = await getCurrentStockPage(storeId, {
          page: 0,
          size: 2147483647,
          onlyAvailable: false,
          sortBy: "id",
          direction: "ASC",
        });

        const stockItems = Array.isArray(response?.content)
          ? response.content
          : [];

        /*
         * Barcode belongs to StoreInventory.
         *
         * Every StoreInventory has either:
         *
         *     ProductItem
         *
         * OR
         *
         *     LocalProduct
         *
         * The response already gives us the
         * resolved partNumber.
         */
        const formattedItems = stockItems
          .filter((item) => item?.inventoryId != null)
          .map((item) => {
            const partNumber = String(item.partNumber || "").trim();

            return {
              id: item.inventoryId,

              inventoryId: item.inventoryId,

              partNumber,

              partName: item.itemName || item.productName || "",

              brand: item.brandName || item.brand || "",
            };
          })
          .filter((item) => item.partNumber);

        setItems(formattedItems);
      } catch (requestError) {
        console.error("Unable to load barcode inventory:", requestError);

        setItems([]);
        setBarcodeImages({});

        setError(
          requestError?.response?.data?.message ||
            "Unable to load inventory products.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadBarcodeItems();
  }, [storeId]);

  /*
   * ---------------------------------------------------------
   * LOAD BARCODE IMAGES FROM BACKEND
   * ---------------------------------------------------------
   *
   * Backend endpoint:
   *
   *     GET /barcodes/{partNumber}
   *
   * Backend BarcodeService uses ZXing Code128.
   *
   * Example:
   *
   *     /barcodes/13766M75J00
   *
   * returns:
   *
   *     image/png
   *
   * The frontend does NOT generate the barcode.
   */

  /*
   * ---------------------------------------------------------
   * BRANDS
   * ---------------------------------------------------------
   */
  const brands = useMemo(() => {
    return [...new Set(items.map((item) => item.brand).filter(Boolean))];
  }, [items]);

  /*
   * ---------------------------------------------------------
   * FILTER INVENTORY
   * ---------------------------------------------------------
   */
  const filteredItems = useMemo(() => {
    const searchValue = searchText.trim().toLowerCase();

    return items.filter((item) => {
      const matchesBrand = selectedBrand === "" || item.brand === selectedBrand;

      const matchesSearch =
        searchValue === "" ||
        item.partNumber.toLowerCase().includes(searchValue) ||
        item.partName.toLowerCase().includes(searchValue) ||
        item.brand.toLowerCase().includes(searchValue);

      return matchesBrand && matchesSearch;
    });
  }, [items, searchText, selectedBrand]);

  /*
   * ---------------------------------------------------------
   * PAGINATION
   * ---------------------------------------------------------
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / entriesPerPage),
  );

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;

    const endIndex = startIndex + entriesPerPage;

    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, entriesPerPage]);
  useEffect(() => {
    if (!storeId || paginatedItems.length === 0) {
      setBarcodeImages({});
      return;
    }

    let cancelled = false;
    const createdUrls = new Set<string>();

    setBarcodeImages((currentImages) => {
      Object.values(currentImages).forEach((url: any) => {
        window.URL.revokeObjectURL(url);
      });

      return {};
    });

    const loadBarcode = async (item) => {
      if (!item.partNumber) return;

      try {
        const response = await api.get("/barcodes", {
          params: {
            storeId: Number(storeId),
            partNumber: item.partNumber,
          },
          responseType: "blob",
        });

        if (cancelled) return;

        const imageUrl = window.URL.createObjectURL(response.data);

        createdUrls.add(imageUrl);

        setBarcodeImages((currentImages) => ({
          ...currentImages,
          [item.id]: imageUrl,
        }));
      } catch (requestError) {
        if (!cancelled) {
          console.error(
            `Unable to load barcode for ${item.partNumber}:`,
            requestError,
          );
        }
      }
    };

    paginatedItems
      .filter((item) => item.partNumber)
      .forEach((item) => {
        loadBarcode(item);
      });

    return () => {
      cancelled = true;

      createdUrls.forEach((url: any) => {
        window.URL.revokeObjectURL(url);
      });

      createdUrls.clear();
    };
  }, [paginatedItems, storeId]);

  const firstEntry =
    filteredItems.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;

  const lastEntry = Math.min(
    currentPage * entriesPerPage,
    filteredItems.length,
  );

  /*
   * ---------------------------------------------------------
   * SELECT ALL
   * ---------------------------------------------------------
   */
  const allVisibleSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedIds.includes(item.id));

  /*
   * ---------------------------------------------------------
   * RESET PAGE WHEN FILTER CHANGES
   * ---------------------------------------------------------
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedBrand, entriesPerPage, storeId]);

  /*
   * ---------------------------------------------------------
   * STORE CHANGE
   * ---------------------------------------------------------
   */
  const handleStoreChange = (event) => {
    const newStoreId = event.target.value;

    setStoreId(newStoreId);

    setSelectedIds([]);
    setSearchText("");
    setSelectedIds([]);
    setSelectedBrand("");
    setCurrentPage(1);
    setError("");
    setBarcodeImages({});
  };

  /*
   * ---------------------------------------------------------
   * CLEAR FILTERS
   * ---------------------------------------------------------
   */
  const handleClear = () => {
    setSearchText("");
    setSelectedBrand("");
    setCurrentPage(1);
  };

  /*
   * ---------------------------------------------------------
   * ROW SELECTION
   * ---------------------------------------------------------
   */
  const handleRowSelection = (itemId) => {
    setSelectedIds((previousIds) => {
      if (previousIds.includes(itemId)) {
        return previousIds.filter((id) => id !== itemId);
      }

      return [...previousIds, itemId];
    });
  };

  /*
   * ---------------------------------------------------------
   * SELECT / UNSELECT ALL VISIBLE
   * ---------------------------------------------------------
   */
  const handleSelectAll = () => {
    const visibleIds = paginatedItems.map((item) => item.id);

    if (allVisibleSelected) {
      setSelectedIds((previousIds) =>
        previousIds.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedIds((previousIds) => [
        ...new Set([...previousIds, ...visibleIds]),
      ]);
    }
  };

  /*
   * ---------------------------------------------------------
   * PRINT THROUGH BACKEND
   * ---------------------------------------------------------
   */
  const printInventoryItems = async (inventoryItems) => {
    if (!storeId) {
      window.alert("Please select a store first.");
      return;
    }

    if (!inventoryItems || inventoryItems.length === 0) {
      window.alert("No items available to print.");
      return;
    }

    try {
      setPrinting(true);
      setError("");

      /*
       * Exact backend DTO:
       *
       * BarcodePrintRequestDTO
       *
       * {
       *     storeId,
       *     items: [
       *         {
       *             inventoryId,
       *             printQuantity
       *         }
       *     ]
       * }
       */
      const printItems = inventoryItems.map((item) => ({
        inventoryId: item.inventoryId,

        /*
         * One barcode label per
         * selected inventory item.
         */
        printQuantity: 1,
      }));

      const pdfBlob = await printBarcodes(Number(storeId), printItems);

      const blob =
        pdfBlob instanceof Blob
          ? pdfBlob
          : new Blob([pdfBlob], {
              type: "application/pdf",
            });

      const pdfUrl = window.URL.createObjectURL(blob);

      /*
       * Open the PDF generated by
       * the Spring Boot backend.
       */
      window.open(pdfUrl, "_blank", "noopener,noreferrer");

      /*
       * Release temporary URL.
       */
      setTimeout(() => {
        window.URL.revokeObjectURL(pdfUrl);
      }, 60000);
    } catch (requestError) {
      console.error("Unable to print barcodes:", requestError);

      setError(
        requestError?.response?.data?.message ||
          "Unable to generate barcode PDF.",
      );
    } finally {
      setPrinting(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * PRINT SELECTED
   * ---------------------------------------------------------
   */
  const handlePrintSelected = async () => {
    if (selectedIds.length === 0) {
      window.alert("Please select at least one item to print.");
      return;
    }

    const selectedItems = items.filter((item) => selectedIds.includes(item.id));

    await printInventoryItems(selectedItems);
  };

  /*
   * ---------------------------------------------------------
   * PRINT BRAND
   * ---------------------------------------------------------
   */
  const handlePrintBrand = async () => {
    if (!selectedBrand) {
      window.alert("Please select a brand first.");
      return;
    }

    const brandItems = items.filter((item) => item.brand === selectedBrand);

    if (brandItems.length === 0) {
      window.alert("No items found for this brand.");
      return;
    }

    await printInventoryItems(brandItems);
  };

  /*
   * ---------------------------------------------------------
   * PRINT ONE BARCODE
   * ---------------------------------------------------------
   */
  const handleBarcodeClick = async (item) => {
    await printInventoryItems([item]);
  };

  /*
   * ---------------------------------------------------------
   * PAGE NUMBERS
   * ---------------------------------------------------------
   */
  const getPageNumbers = () => {
    const pages = [];

    if (totalPages <= 5) {
      for (let page = 1; page <= totalPages; page += 1) {
        pages.push(page);
      }

      return pages;
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push("...");
    }

    const startPage = Math.max(2, currentPage - 1);

    const endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let page = startPage; page <= endPage; page += 1) {
      pages.push(page);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  };

  return (
    <main className="barcode-page">
      <style>{`/* =========================================================
   Main page
   - Background is now plain white (was #f7f9fc).
   - Padding reduced for a more compact page.
========================================================= */

.barcode-page {
  width: 100%;
  min-height: 100vh;
  padding: var(--sp-4) var(--sp-5) var(--sp-5);
  background: #ffffff;
  color: #172033;
  box-sizing: border-box;

}

/* =========================================================
   Breadcrumb
   Hidden per request ("remove home > inventory > barcode
   generate"). Left in the CSS (rather than deleted) so the
   markup in the component doesn't need to change — this
   purely visual element has no logic attached to it.
========================================================= */

.barcode-breadcrumb {
  display: none;
}

/* =========================================================
   Page heading
   - Icon and subtitle paragraph hidden (same reasoning as
     the breadcrumb above) — just the "Inventory Barcodes"
     title remains, at a smaller size to keep things compact.
========================================================= */

.barcode-page-heading {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin-bottom: var(--sp-4);
}

.barcode-heading-icon {
  display: none;
}

.barcode-icon-line {
  display: block;
  height: 36px;
  background: #1267b4;
  border-radius: 1px;
}

.line-one { width: 4px; }
.line-two { width: 7px; }
.line-three { width: 3px; }
.line-four { width: 6px; }
.line-five { width: 4px; }

.barcode-page-heading h1 {
  margin: 0;
  color: #15213b;
  font-size: 21px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.barcode-page-heading p {
  display: none;
}

/* =========================================================
   Toolbar
   Slightly shorter controls (38px instead of 42px) for a
   more compact strip; font-weight 600 kept/applied on every
   button.
========================================================= */

.barcode-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  margin-bottom: var(--sp-5);
  flex-wrap: wrap;
}

.brand-select {
  width: 180px;
  height: 38px;
  padding: 0 var(--sp-7) 0 var(--sp-3);
  border: 1px solid #d5dce5;
  border-radius: 5px;
  background-color: #ffffff;
  color: #354154;
  font-size: 13px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
}

.brand-select:focus {
  border-color: #2387df;
  box-shadow: 0 0 0 2px rgba(35, 135, 223, 0.12);
}

.barcode-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 180px;
  height: 38px;
  border: 1px solid #d5dce5;
  border-radius: 5px;
  background: #ffffff;
}

.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  color: #758092;
  font-size: 22px;
  line-height: 1;
  transform: rotate(-20deg);
}

.barcode-search-wrapper input {
  width: 100%;
  height: 100%;
  padding: 0 var(--sp-3) 0 0;
  border: 0;
  outline: none;
  background: transparent;
  color: #283447;
  font-size: 13px;
  font-weight: 600;
}

.barcode-search-wrapper input::placeholder {
  color: #a0a9b7;
  font-weight: 400;
}

.toolbar-button {
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-4);
  border: 0;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.toolbar-button:active {
  transform: translateY(1px);
}

.toolbar-button span {
  font-size: 18px;
  line-height: 1;
}

.search-button {
  min-width: 96px;
  background: #2189e6;
  color: #ffffff;
}

.search-button:hover {
  background: #0875d4;
}

.clear-button {
  min-width: 88px;
  background: #e9eef5;
  border: 1px solid #d2dbe7;
  color: #334258;
}

.clear-button:hover {
  background: #dde5ef;
}

.toolbar-spacer {
  flex: 1;
}

.print-selected-button {
  min-width: 150px;
  background: #0c9b45;
  color: #ffffff;
}

.print-selected-button:hover {
  background: #087d38;
}

.print-brand-button {
  min-width: 128px;
  background: #2189e6;
  color: #ffffff;
}

.print-brand-button:hover {
  background: #0875d4;
}

/* =========================================================
   Table top bar
========================================================= */

.table-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-3);
  color: #4d5869;
  font-size: 13px;
  font-weight: 600;
}

.entries-control {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.entries-control select {
  width: 62px;
  height: 30px;
  padding: 0 var(--sp-2);
  border: 1px solid #d4dce7;
  border-radius: 5px;
  background: #ffffff;
  color: #354154;
  font-size: 13px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
}

.total-items {
  color: #4e5969;
  font-size: 13px;
  font-weight: 600;
}

.total-items strong {
  font-weight: 700;
}

/* =========================================================
   Table card
   - Narrower forced min-width (was 930px) to match the
     smaller columns below, so tablets need less horizontal
     scroll.
========================================================= */

.barcode-table-card {
  width: 100%;
  overflow: hidden;
  border: 1px solid #e0e5ec;
  border-radius: 7px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(20, 42, 72, 0.03);
}

.barcode-table-scroll {
  width: 100%;
  overflow-x: auto;
}

.barcode-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  table-layout: fixed;
}

.barcode-table thead {
  background: #f2f6fb;
}

.barcode-table th {
  height: 38px;
  padding: 0 var(--sp-3);
  border-bottom: 1px solid #dfe5ed;
  color: #3d4759;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}

/* Rows made noticeably smaller/more compact than the original
   72px — the barcode image itself is capped in size below so
   it still fits comfortably at this row height. */
.barcode-table td {
  height: 50px;
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid #e8edf3;
  color: #3c4655;
  font-size: 13px;
  font-weight: 600;
  vertical-align: middle;
}

.barcode-table tbody tr:last-child td {
  border-bottom: 0;
}

.barcode-table tbody tr:hover {
  background: #fbfdff;
}

/* Column widths — narrower than the original for a tighter,
   less sprawling table. */

.checkbox-column {
  width: 42px;
  text-align: center !important;
}

.part-number-column {
  width: 150px;
}

.part-name-column {
  width: 190px;
}

.brand-column {
  width: 110px;
}

.barcode-column {
  width: auto;
  text-align: center !important;
}

/* Checkbox */

.barcode-table input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #1684dd;
  cursor: pointer;
}

/* Header sorting icon */

.sort-icon {
  float: right;
  color: #a7b0bd;
  font-size: 13px;
  font-weight: 400;
}

/* Cell styling — font-weight bumped to 600 as requested */

.part-number-cell {
  color: #424c5d;
  font-weight: 600;
  letter-spacing: 0.1px;
}

.part-name-cell {
  color: #424c5d;
  font-weight: 600;
}

.brand-cell {
  color: #414b5a;
  font-weight: 600;
}

.barcode-cell {
  padding-top: var(--sp-1) !important;
  padding-bottom: var(--sp-1) !important;
  text-align: center;
  font-weight: 600;
}

.barcode-click-area {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 150px;
  min-height: 40px;
  padding: 2px var(--sp-3);
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.barcode-click-area:hover {
  background: #eef6ff;
}

.barcode-click-area:active {
  transform: scale(0.98);
}

.barcode-click-area svg {
  display: block;
  max-width: 100%;
  height: auto;
}

/* The barcode <img> is given its size via an inline style in
   the component (style={{ maxWidth: "100%", height: "auto" }}),
   which a plain external rule can't override — !important is
   the correct, deliberate tool here since this is a CSS-only
   change and the component isn't being touched. This is what
   actually lets the smaller 50px row height work without the
   barcode image overflowing it. */
.barcode-click-area img {
  max-height: 40px !important;
  width: auto !important;
}

.empty-table-message {
  height: 120px !important;
  color: #7e8998 !important;
  text-align: center !important;
  font-weight: 600;
}

/* =========================================================
   Table footer
========================================================= */

.barcode-table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  padding: var(--sp-2) var(--sp-3) var(--sp-2) var(--sp-4);
  border-top: 1px solid #e5eaf0;
  background: #ffffff;
}

.showing-information {
  color: #687384;
  font-size: 12px;
  font-weight: 600;
}

.pagination {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.pagination-button {
  min-width: 34px;
  height: 32px;
  padding: 0 var(--sp-3);
  border: 1px solid #e0e5ec;
  border-radius: 5px;
  background: #ffffff;
  color: #3d4859;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.pagination-button:hover:not(:disabled) {
  border-color: #b9cce0;
  background: #f3f8fd;
}

.pagination-button:disabled {
  background: #f7f9fc;
  color: #b4bdc9;
  cursor: not-allowed;
}

.pagination-button.active {
  border-color: #2387df;
  background: #2189e6;
  color: #ffffff;
}

.previous-button,
.next-button {
  padding: 0 var(--sp-3);
}

.pagination-ellipsis {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 32px;
  color: #677386;
  font-size: 13px;
  font-weight: 600;
}

/* =========================================================
   Print layout
   (unchanged — this only affects the physical printed sheet,
   not the on-screen page)
========================================================= */

.barcode-print-sheet {
  display: none;
}

.print-barcode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 250px;
  padding: var(--sp-6);
  box-sizing: border-box;
  page-break-inside: avoid;
  text-align: center;
  background: #ffffff;
}

.print-barcode-card h2 {
  margin: 0 0 var(--sp-3);
  color: #000000;
  font-size: 20px;
}

.print-part-number,
.print-brand,
.print-barcode-value {
  margin: var(--sp-1) 0;
  color: #000000;
  font-size: 14px;
}

.print-barcode-card svg {
  width: 360px;
  max-width: 100%;
  height: auto;
  margin-top: var(--sp-4);
}

/* =========================================================
   Responsive styles
   Reworked around three clear tiers:
     - Desktop:  > 1024px  (default styles above)
     - Tablet:   641px – 1024px
     - Mobile:   <= 640px
========================================================= */

@media (max-width: 1024px) {
  .barcode-toolbar {
    flex-wrap: wrap;
  }

  .toolbar-spacer {
    display: none;
  }

  .barcode-search-wrapper {
    min-width: 220px;
  }

  .part-name-column {
    width: 160px;
  }

  .brand-column {
    width: 96px;
  }
}

@media (max-width: 640px) {
  .barcode-page {
    padding: var(--sp-4) var(--sp-3) var(--sp-5);
  }

  .barcode-page-heading h1 {
    font-size: 18px;
  }

  .barcode-toolbar {
    align-items: stretch;
  }

  .brand-select,
  .barcode-search-wrapper,
  .toolbar-button {
    width: 100%;
    min-width: 0;
  }

  .barcode-search-wrapper {
    flex: auto;
  }

  .table-top-bar {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .total-items {
    align-self: flex-end;
  }

  .barcode-table-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .pagination {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .pagination-button {
    min-width: 30px;
    padding: 0 var(--sp-2);
  }

  .previous-button,
  .next-button {
    padding: 0 var(--sp-3);
  }
}

/* =========================================================
   Browser print rules
   (unchanged)
========================================================= */

@media print {
  @page {
    size: auto;
    margin: 12mm;
  }

  body {
    margin: 0;
    padding: 0;
    background: #ffffff !important;
  }

  body * {
    visibility: hidden;
  }

  .barcode-print-sheet,
  .barcode-print-sheet * {
    visibility: visible;
  }

  .barcode-print-sheet {
    display: block;
    width: 100%;
    background: #ffffff;
  }

  .print-barcode-card {
    display: flex;
  }
}
`}</style>

      {/* -------------------------------------------------
          BREADCRUMB
      ------------------------------------------------- */}
      <div className="barcode-breadcrumb">
        <span>Home</span>

        <span className="breadcrumb-arrow">›</span>

        <span>Inventory</span>

        <span className="breadcrumb-arrow">›</span>

        <strong>Barcode Generate</strong>
      </div>

      {/* -------------------------------------------------
          PAGE HEADING
      ------------------------------------------------- */}
      <div className="barcode-page-heading">
        <div className="barcode-heading-icon">
          <span className="barcode-icon-line line-one"></span>
          <span className="barcode-icon-line line-two"></span>
          <span className="barcode-icon-line line-three"></span>
          <span className="barcode-icon-line line-four"></span>
          <span className="barcode-icon-line line-five"></span>
        </div>

        <div>
          <h1>Inventory Barcodes</h1>

          <p>Select items and print barcodes for your inventory</p>
        </div>
      </div>

      {/* -------------------------------------------------
          TOOLBAR
      ------------------------------------------------- */}
      <div className="barcode-toolbar">
        {/* SUPER ADMIN STORE */}
        {isSuperAdmin && (
          <select
            className="brand-select"
            value={storeId}
            onChange={handleStoreChange}
            disabled={storesLoading}
            aria-label="Select store"
          >
            <option value="">
              {storesLoading ? "Loading Stores..." : "Select Store"}
            </option>

            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.storeName}
              </option>
            ))}
          </select>
        )}

        {/* BRAND */}
        <select
          className="brand-select"
          value={selectedBrand}
          onChange={(event) => setSelectedBrand(event.target.value)}
          disabled={!storeId}
        >
          <option value="">Select Brand</option>

          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>

        {/* SEARCH */}
        <div className="barcode-search-wrapper">
          <span className="search-icon">⌕</span>

          <input
            type="text"
            placeholder="Search by Part Number, Product Name, SKU..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            disabled={!storeId}
          />
        </div>

        {/* SEARCH BUTTON */}
        <button
          type="button"
          className="toolbar-button search-button"
          onClick={() => setCurrentPage(1)}
          disabled={!storeId}
        >
          <span>⌕</span>
          Search
        </button>

        {/* CLEAR */}
        <button
          type="button"
          className="toolbar-button clear-button"
          onClick={handleClear}
          disabled={!storeId}
        >
          <span>⟳</span>
          Clear
        </button>

        <div className="toolbar-spacer"></div>

        {/* PRINT SELECTED */}
        <button
          type="button"
          className="toolbar-button print-selected-button"
          onClick={handlePrintSelected}
          disabled={!storeId || selectedIds.length === 0 || printing}
        >
          <span>▣</span>

          {printing ? "Generating..." : "Print Selected"}
        </button>

        {/* PRINT BRAND */}
        <button
          type="button"
          className="toolbar-button print-brand-button"
          onClick={handlePrintBrand}
          disabled={!storeId || !selectedBrand || printing}
        >
          <span>▣</span>
          Print Brand
        </button>
      </div>

      {/* -------------------------------------------------
          ERROR
      ------------------------------------------------- */}
      {error && (
        <div className="empty-table-message" role="alert">
          {error}
        </div>
      )}

      {/* -------------------------------------------------
          TABLE TOP BAR
      ------------------------------------------------- */}
      <div className="table-top-bar">
        <div className="entries-control">
          <span>Show</span>

          <select
            value={entriesPerPage}
            onChange={(event) => setEntriesPerPage(Number(event.target.value))}
          >
            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <span>entries</span>
        </div>

        <div className="total-items">
          Total Items: <strong>{filteredItems.length}</strong>
        </div>
      </div>

      {/* -------------------------------------------------
          TABLE
      ------------------------------------------------- */}
      <div className="barcode-table-card">
        <div className="barcode-table-scroll">
          <table className="barcode-table">
            <thead>
              <tr>
                <th className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleSelectAll}
                    disabled={!storeId || paginatedItems.length === 0}
                    aria-label="Select all visible items"
                  />
                </th>

                <th className="part-number-column">
                  Part Number
                  <span className="sort-icon">↕</span>
                </th>

                <th className="part-name-column">
                  Part Name
                  <span className="sort-icon">↕</span>
                </th>

                <th className="brand-column">
                  Brand
                  <span className="sort-icon">↕</span>
                </th>

                <th className="barcode-column">
                  Barcode
                  <span className="sort-icon">↕</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {/* NO STORE */}
              {!storeId ? (
                <tr>
                  <td colSpan={5} className="empty-table-message">
                    {isSuperAdmin
                      ? "Please select a store to view inventory barcodes."
                      : "Store is not assigned to this user."}
                  </td>
                </tr>
              ) : loading ? (
                /* LOADING */
                <tr>
                  <td colSpan={5} className="empty-table-message">
                    Loading inventory products...
                  </td>
                </tr>
              ) : paginatedItems.length > 0 ? (
                /* INVENTORY ROWS */
                paginatedItems.map((item) => (
                  <tr key={item.id}>
                    {/* CHECKBOX */}
                    <td className="checkbox-column">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleRowSelection(item.id)}
                        aria-label={`Select ${item.partName}`}
                      />
                    </td>

                    {/* PART NUMBER */}
                    <td className="part-number-column">
                      {item.partNumber || "-"}
                    </td>

                    {/* PART NAME */}
                    <td className="part-name-column">{item.partName || "-"}</td>

                    {/* BRAND */}
                    <td className="brand-column">{item.brand || "-"}</td>
                    {/* BACKEND BARCODE IMAGE */}
                    <td
                      className="barcode-column barcode-clickable"
                      onClick={() => handleBarcodeClick(item)}
                      title="Click to print this barcode"
                    >
                      {barcodeImages[item.id] ? (
                        <img
                          src={barcodeImages[item.id]}
                          alt={`Barcode ${item.partNumber}`}
                          style={{
                            maxWidth: "100%",
                            height: "auto",
                            display: "block",
                            margin: "0 auto",
                          }}
                        />
                      ) : (
                        <span>Loading barcode...</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                /* EMPTY */
                <tr>
                  <td colSpan={5} className="empty-table-message">
                    No barcode items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* -------------------------------------------------
            TABLE FOOTER
        ------------------------------------------------- */}
        <div className="barcode-table-footer">
          <div className="showing-information">
            Showing {firstEntry} to {lastEntry} of {filteredItems.length}{" "}
            entries
          </div>

          <div className="pagination">
            {/* PREVIOUS */}
            <button
              type="button"
              className="pagination-button previous-button"
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((previousPage) => Math.max(1, previousPage - 1))
              }
            >
              Previous
            </button>

            {/* PAGE NUMBERS */}
            {getPageNumbers().map((page, index) => {
              if (page === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="pagination-ellipsis"
                  >
                    ...
                  </span>
                );
              }

              return (
                <button
                  type="button"
                  key={page}
                  className={`pagination-button page-number ${
                    currentPage === page ? "active" : ""
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              );
            })}

            {/* NEXT */}
            <button
              type="button"
              className="pagination-button next-button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((previousPage) =>
                  Math.min(totalPages, previousPage + 1),
                )
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default BarcodeGeneratePage;
