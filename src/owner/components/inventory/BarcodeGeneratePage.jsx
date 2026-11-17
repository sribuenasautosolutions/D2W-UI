import React, { useEffect, useMemo, useState,useRef} from "react";
import api from "../../../services/api";
import { getActiveStoresCached } from "../../../services/storeService";
import {getCurrentStockPage,getLocalStockFilterOptions,printBarcodes,} from "../../../services/storeInventoryPanelService";
import "./BarcodeGeneratePage.css";
const ITEMS_PER_PAGE_OPTIONS = [10,25,50,100,];
function readUser() {
  try {
    return (
      JSON.parse(
        localStorage.getItem("user")
      ) || {}
    );
  } catch {
    return {};
  }
}


const isCanceled = (error) =>
  error?.code === "ERR_CANCELED" || error?.name === "CanceledError";

const toBarcodeItems = (stockItems) =>
  (Array.isArray(stockItems) ? stockItems : [])
    .filter((item) => item?.inventoryId != null)
    .map((item) => ({
      id: item.inventoryId,
      inventoryId: item.inventoryId,
      partNumber: String(item.partNumber || "").trim(),
      partName: item.itemName || item.productName || "",
      brand: item.brandName || item.brand || "",
    }))
    .filter((item) => item.partNumber);

function BarcodeGeneratePage() {
  const user = useMemo(() => readUser(), []);
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  /* STORE */
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(user.storeId ? String(user.storeId) : "");
  const [storesLoading, setStoresLoading] = useState(false);

  /* INVENTORY: only the rows of the CURRENT page are kept in memory */
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* FILTERS (searched and filtered by the server) */
  const [brands, setBrands] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");

  /* PAGINATION */
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  /* SELECTION (kept across pages; the Map remembers the row objects) */
  const [selectedIds, setSelectedIds] = useState([]);
  const selectedItemsRef = useRef(new Map());

  /* BARCODE IMAGES */
  const [barcodeImages, setBarcodeImages] = useState({});
  const [barcodeFailed, setBarcodeFailed] = useState({});
  const barcodeCacheRef = useRef(new Map());

  /* PRINTING */
  const [printing, setPrinting] = useState(false);

  /* SEARCH DEBOUNCE: wait for a pause in typing, then go back to page 1 */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  /* LOAD STORES FOR SUPER ADMIN */
  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    const loadStores = async () => {
      try {
        setStoresLoading(true);
        setError("");

        const response = await getActiveStoresCached();

        setStores(
          Array.isArray(response?.data?.content) ? response.data.content : []
        );
      } catch (requestError) {
        console.error("Unable to load stores:", requestError);
        setError(
          requestError?.response?.data?.message || "Unable to load stores."
        );
      } finally {
        setStoresLoading(false);
      }
    };

    loadStores();
  }, [isSuperAdmin]);

  /* BRANDS: small separate call, so the brand list does not need every row */
  useEffect(() => {
    if (!storeId) {
      return;
    }

    let active = true;

    getLocalStockFilterOptions(storeId)
      .then((options) => {
        if (active) {
          setBrands(Array.isArray(options?.brands) ? options.brands : []);
        }
      })
      .catch((requestError) => {
        console.error("Unable to load brands:", requestError);
      });

    return () => {
      active = false;
    };
  }, [storeId]);

  /* LOAD ONE PAGE OF INVENTORY (older request is cancelled when anything changes) */
  useEffect(() => {
    if (!storeId) {
      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
      setError("");
      return;
    }

    const controller = new AbortController();

    const loadPage = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getCurrentStockPage(
          storeId,
          {
            search: debouncedSearch || undefined,
            brand: selectedBrand || undefined,
            onlyAvailable: false,
            page: currentPage - 1,
            size: entriesPerPage,
            sortBy: "id",
            direction: "ASC",
          },
          controller.signal
        );

        if (controller.signal.aborted) {
          return;
        }

        setItems(toBarcodeItems(response?.content));
        setTotalItems(Number(response?.totalElements) || 0);
        setTotalPages(Math.max(1, Number(response?.totalPages) || 1));
      } catch (requestError) {
        if (isCanceled(requestError)) {
          return;
        }

        console.error("Unable to load barcode inventory:", requestError);

        setItems([]);
        setTotalItems(0);
        setTotalPages(1);
        setError(
          requestError?.response?.data?.message ||
            "Unable to load inventory products."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadPage();

    return () => controller.abort();
  }, [storeId, currentPage, entriesPerPage, debouncedSearch, selectedBrand]);

  /* The rows shown on screen are exactly the rows the server returned */
  const paginatedItems = items;

  /* BARCODE IMAGES: show cached ones at once, download only the missing ones, 4 at a time */
  useEffect(() => {
    if (!storeId || paginatedItems.length === 0) {
      setBarcodeImages({});
      return;
    }

    const controller = new AbortController();
    const cache = barcodeCacheRef.current;
    const keyOf = (item) => `${storeId}|${item.partNumber}`;

    const ready = {};
    const missing = [];
    paginatedItems.forEach((item) => {
      const cachedUrl = cache.get(keyOf(item));
      if (cachedUrl) ready[item.id] = cachedUrl;
      else missing.push(item);
    });
    setBarcodeImages(ready);
    setBarcodeFailed((current) => {
      const next = { ...current };
      missing.forEach((item) => delete next[item.id]);
      return next;
    });

    const loadBarcode = async (item) => {
      try {
        const response = await api.get("/barcodes", {
          params: { storeId: Number(storeId), partNumber: item.partNumber },
          responseType: "blob",
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const key = keyOf(item);
        let imageUrl = cache.get(key);
        if (!imageUrl) {
          imageUrl = window.URL.createObjectURL(response.data);
          cache.set(key, imageUrl);
        }

        setBarcodeImages((currentImages) => ({
          ...currentImages,
          [item.id]: imageUrl,
        }));
      } catch (requestError) {
        if (isCanceled(requestError)) {
          return;
        }
        console.error(`Unable to load barcode for ${item.partNumber}:`, requestError);
        setBarcodeFailed((current) => ({ ...current, [item.id]: true }));
      }
    };

    let nextIndex = 0;
    const worker = async () => {
      while (!controller.signal.aborted && nextIndex < missing.length) {
        const item = missing[nextIndex++];
        await loadBarcode(item);
      }
    };
    for (let i = 0; i < Math.min(4, missing.length); i++) worker();

    return () => controller.abort();
  }, [paginatedItems, storeId]);

  /* Free the cached barcode images when the store changes or the page closes */
  useEffect(() => {
    const cache = barcodeCacheRef.current;
    return () => {
      cache.forEach((url) => window.URL.revokeObjectURL(url));
      cache.clear();
    };
  }, [storeId]);

  const firstEntry =
    totalItems === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;

  const lastEntry = Math.min(currentPage * entriesPerPage, totalItems);

  const allVisibleSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedIds.includes(item.id));

  /* HANDLERS */
  const handleStoreChange = (event) => {
    setStoreId(event.target.value);

    selectedItemsRef.current.clear();
    setSelectedIds([]);
    setSearchText("");
    setDebouncedSearch("");
    setSelectedBrand("");
    setBrands([]);
    setItems([]);
    setTotalItems(0);
    setTotalPages(1);
    setCurrentPage(1);
    setError("");
    setBarcodeImages({});
    setBarcodeFailed({});
  };

  const handleBrandChange = (value) => {
    setSelectedBrand(value);
    setCurrentPage(1);
  };

  const handleEntriesChange = (value) => {
    setEntriesPerPage(value);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setSearchText("");
    setDebouncedSearch("");
    setSelectedBrand("");
    setCurrentPage(1);
  };

  const handleRowSelection = (itemId) => {
    const selectedMap = selectedItemsRef.current;

    if (selectedIds.includes(itemId)) {
      selectedMap.delete(itemId);
      setSelectedIds(selectedIds.filter((id) => id !== itemId));
      return;
    }

    const item = items.find((row) => row.id === itemId);
    if (item) selectedMap.set(itemId, item);
    setSelectedIds([...selectedIds, itemId]);
  };

  const handleSelectAll = () => {
    const selectedMap = selectedItemsRef.current;
    const visibleIds = paginatedItems.map((item) => item.id);

    if (allVisibleSelected) {
      visibleIds.forEach((id) => selectedMap.delete(id));
      setSelectedIds(selectedIds.filter((id) => !visibleIds.includes(id)));
    } else {
      paginatedItems.forEach((item) => selectedMap.set(item.id, item));
      setSelectedIds([...new Set([...selectedIds, ...visibleIds])]);
    }
  };

  /* PRINT THROUGH BACKEND */
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

      const printItems = inventoryItems.map((item) => ({
        inventoryId: item.inventoryId,
        printQuantity: 1,
      }));

      const pdfBlob = await printBarcodes(Number(storeId), printItems);

      const blob =
        pdfBlob instanceof Blob
          ? pdfBlob
          : new Blob([pdfBlob], { type: "application/pdf" });

      const pdfUrl = window.URL.createObjectURL(blob);

      window.open(pdfUrl, "_blank", "noopener,noreferrer");

      setTimeout(() => {
        window.URL.revokeObjectURL(pdfUrl);
      }, 60000);
    } catch (requestError) {
      console.error("Unable to print barcodes:", requestError);
      setError(
        requestError?.response?.data?.message ||
          "Unable to generate barcode PDF."
      );
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintSelected = async () => {
    if (selectedIds.length === 0) {
      window.alert("Please select at least one item to print.");
      return;
    }

    const selectedItems = selectedIds
      .map((id) => selectedItemsRef.current.get(id))
      .filter(Boolean);

    await printInventoryItems(selectedItems);
  };

  /* PRINT BRAND: fetch every item of the brand, 100 at a time, only when clicked */
  const handlePrintBrand = async () => {
    if (!selectedBrand) {
      window.alert("Please select a brand first.");
      return;
    }

    let brandItems = [];

    try {
      setPrinting(true);
      setError("");

      let page = 0;
      let pages = 1;

      while (page < pages) {
        const response = await getCurrentStockPage(storeId, {
          brand: selectedBrand,
          onlyAvailable: false,
          page,
          size: 100,
          sortBy: "id",
          direction: "ASC",
        });

        brandItems = brandItems.concat(toBarcodeItems(response?.content));
        pages = Number(response?.totalPages) || 1;
        page += 1;
      }
    } catch (requestError) {
      console.error("Unable to load brand items:", requestError);
      setError(
        requestError?.response?.data?.message ||
          "Unable to load items for this brand."
      );
      setPrinting(false);
      return;
    }

    setPrinting(false);

    if (brandItems.length === 0) {
      window.alert("No items found for this brand.");
      return;
    }

    await printInventoryItems(brandItems);
  };

  const handleBarcodeClick = async (item) => {
    await printInventoryItems([item]);
  };

  /* PAGE NUMBERS */
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

      {/* -------------------------------------------------
          BREADCRUMB
      ------------------------------------------------- */}
      <div className="barcode-breadcrumb">
        <span>Home</span>

        <span className="breadcrumb-arrow">
          ›
        </span>

        <span>
          Inventory
        </span>

        <span className="breadcrumb-arrow">
          ›
        </span>

        <strong>
          Barcode Generate
        </strong>
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
          <h1>
            Inventory Barcodes
          </h1>

          <p>
            Select items and print barcodes for your inventory
          </p>
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
            onChange={
              handleStoreChange
            }
            disabled={
              storesLoading
            }
            aria-label="Select store"
          >
            <option value="">
              {storesLoading
                ? "Loading Stores..."
                : "Select Store"}
            </option>

            {stores.map(
              (store) => (
                <option
                  key={store.id}
                  value={store.id}
                >
                  {
                    store.storeName
                  }
                </option>
              )
            )}
          </select>
        )}

        {/* BRAND */}
        <select
          className="brand-select"
          value={selectedBrand}
          onChange={(event) =>
  handleBrandChange(event.target.value)
}
          disabled={!storeId}
        >
          <option value="">
            Select Brand
          </option>

          {brands.map(
            (brand) => (
              <option
                key={brand}
                value={brand}
              >
                {brand}
              </option>
            )
          )}
        </select>

        {/* SEARCH */}
        <div className="barcode-search-wrapper">

          <span className="search-icon">
            ⌕
          </span>

          <input
            type="text"
            placeholder="Search by Part Number, Product Name, SKU..."
            value={searchText}
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
            disabled={!storeId}
          />

        </div>

        {/* SEARCH BUTTON */}
        <button
          type="button"
          className="toolbar-button search-button"
          onClick={() => {
            setDebouncedSearch(searchText.trim());
            setCurrentPage(1);
          }}
          disabled={!storeId}
        >
          <span>
            ⌕
          </span>

          Search
        </button>

        {/* CLEAR */}
        <button
          type="button"
          className="toolbar-button clear-button"
          onClick={
            handleClear
          }
          disabled={!storeId}
        >
          <span>
            ⟳
          </span>

          Clear
        </button>

        <div className="toolbar-spacer"></div>

        {/* PRINT SELECTED */}
        <button
          type="button"
          className="toolbar-button print-selected-button"
          onClick={
            handlePrintSelected
          }
          disabled={
            !storeId ||
            selectedIds.length ===
              0 ||
            printing
          }
        >
          <span>
            ▣
          </span>

          {printing
            ? "Generating..."
            : "Print Selected"}
        </button>

        {/* PRINT BRAND */}
        <button
          type="button"
          className="toolbar-button print-brand-button"
          onClick={
            handlePrintBrand
          }
          disabled={
            !storeId ||
            !selectedBrand ||
            printing
          }
        >
          <span>
            ▣
          </span>

          Print Brand
        </button>

      </div>

      {/* -------------------------------------------------
          ERROR
      ------------------------------------------------- */}
      {error && (
        <div
          className="empty-table-message"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* -------------------------------------------------
          TABLE TOP BAR
      ------------------------------------------------- */}
      <div className="table-top-bar">

        <div className="entries-control">

          <span>
            Show
          </span>

          <select
            value={
              entriesPerPage
            }
            onChange={(event) =>
                handleEntriesChange(
                  Number(event.target.value)
                )
              }
            >
            {ITEMS_PER_PAGE_OPTIONS.map(
              (option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option}
                </option>
              )
            )}
          </select>

          <span>
            entries
          </span>

        </div>

        <div className="total-items">
          Total Items:{" "}
          <strong>
            {totalItems}
          </strong>
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
                    checked={
                      allVisibleSelected
                    }
                    onChange={
                      handleSelectAll
                    }
                    disabled={
                      !storeId ||
                      paginatedItems.length ===
                        0
                    }
                    aria-label="Select all visible items"
                  />

                </th>

                <th className="part-number-column">
                  Part Number

                  <span className="sort-icon">
                    ↕
                  </span>
                </th>

                <th className="part-name-column">
                  Part Name

                  <span className="sort-icon">
                    ↕
                  </span>
                </th>

                <th className="brand-column">
                  Brand

                  <span className="sort-icon">
                    ↕
                  </span>
                </th>

                <th className="barcode-column">
                  Barcode

                  <span className="sort-icon">
                    ↕
                  </span>
                </th>

              </tr>
            </thead>

            <tbody>

              {/* NO STORE */}
              {!storeId ? (
                <tr>
                  <td
                    colSpan="5"
                    className="empty-table-message"
                  >
                    {isSuperAdmin
                      ? "Please select a store to view inventory barcodes."
                      : "Store is not assigned to this user."}
                  </td>
                </tr>
              ) : loading ? (
                /* LOADING */
                <tr>
                  <td
                    colSpan="5"
                    className="empty-table-message"
                  >
                    Loading inventory products...
                  </td>
                </tr>
              ) : paginatedItems.length >
                0 ? (

                /* INVENTORY ROWS */
                paginatedItems.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                    >

                      {/* CHECKBOX */}
                      <td className="checkbox-column">

                        <input
                          type="checkbox"
                          checked={selectedIds.includes(
                            item.id
                          )}
                          onChange={() =>
                            handleRowSelection(
                              item.id
                            )
                          }
                          aria-label={`Select ${item.partName}`}
                        />

                      </td>

                      {/* PART NUMBER */}
                      <td className="part-number-column">
                        {
                          item.partNumber ||
                          "-"
                        }
                      </td>

                      {/* PART NAME */}
                      <td className="part-name-column">
                        {
                          item.partName ||
                          "-"
                        }
                      </td>

                      {/* BRAND */}
                      <td className="brand-column">
                        {
                          item.brand ||
                          "-"
                        }
                      </td>
                      {/* BACKEND BARCODE IMAGE */}
                      <td
                        className="barcode-column barcode-clickable"
                        onClick={() =>
                          handleBarcodeClick(
                            item
                          )
                        }
                        title="Click to print this barcode"
                      >

                        {barcodeImages[
                          item.id
                        ] ? (
                          <img
                            src={
                              barcodeImages[
                                item.id
                              ]
                            }
                            alt={`Barcode ${item.partNumber}`}
                            style={{
                              maxWidth:
                                "100%",
                              height:
                                "auto",
                              display:
                                "block",
                              margin:
                                "0 auto",
                            }}
                          />
                          ) : barcodeFailed[item.id] ? (
                          <span>Barcode unavailable</span>
                        ) : (
                          <span>Loading barcode...</span>
                        )}

                      </td>

                    </tr>
                  )
                )

              ) : (

                /* EMPTY */
                <tr>
                  <td
                    colSpan="5"
                    className="empty-table-message"
                  >
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
            Showing{" "}
            {firstEntry} to{" "}
            {lastEntry} of{" "}
            {totalItems}{" "}
            entries
          </div>
          <div className="pagination">

            {/* PREVIOUS */}
            <button
              type="button"
              className="pagination-button previous-button"
              disabled={
                currentPage ===
                1
              }
              onClick={() =>
                setCurrentPage(
                  (previousPage) =>
                    Math.max(
                      1,
                      previousPage -
                        1
                    )
                )
              }
            >
              Previous
            </button>

            {/* PAGE NUMBERS */}
            {getPageNumbers().map(
              (
                page,
                index
              ) => {

                if (
                  page ===
                  "..."
                ) {
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
                      currentPage ===
                      page
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setCurrentPage(
                        page
                      )
                    }
                  >
                    {page}
                  </button>
                );
              }
            )}

            {/* NEXT */}
            <button
              type="button"
              className="pagination-button next-button"
              disabled={
                currentPage ===
                totalPages
              }
              onClick={() =>
                setCurrentPage(
                  (previousPage) =>
                    Math.min(
                      totalPages,
                      previousPage +
                        1
                    )
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
