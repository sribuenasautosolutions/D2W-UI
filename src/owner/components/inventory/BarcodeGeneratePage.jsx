import React, { useEffect, useMemo, useState,} from "react";
import api from "../../../services/api";
import {getCurrentStockPage,printBarcodes,} from "../../../services/storeInventoryPanelService";
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

function BarcodeGeneratePage() {
  const user = useMemo(
    () => readUser(),
    []
  );

  const isSuperAdmin =
    user.role === "SUPER_ADMIN";

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
    user.storeId
      ? String(user.storeId)
      : ""
  );

  const [storesLoading, setStoresLoading] =
    useState(false);

  /*
   * ---------------------------------------------------------
   * INVENTORY
   * ---------------------------------------------------------
   */
  const [items, setItems] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * ---------------------------------------------------------
   * FILTERS
   * ---------------------------------------------------------
   */
  const [searchText, setSearchText] =
    useState("");

  const [selectedBrand, setSelectedBrand] =
    useState("");

  /*
   * ---------------------------------------------------------
   * PAGINATION
   * ---------------------------------------------------------
   */
  const [entriesPerPage, setEntriesPerPage] =
    useState(10);

  const [currentPage, setCurrentPage] =
    useState(1);

  /*
   * ---------------------------------------------------------
   * SELECTION
   * ---------------------------------------------------------
   */
  const [selectedIds, setSelectedIds] =
    useState([]);


  /*
   * ---------------------------------------------------------
   * BARCODE IMAGE PREVIEW
   * ---------------------------------------------------------
   *
   * Backend generates the actual barcode PNG.
   *
   * We only store the returned image URL here.
   */
  const [barcodeImages, setBarcodeImages] =
    useState({});

  /*
   * ---------------------------------------------------------
   * PRINTING
   * ---------------------------------------------------------
   */
  const [printing, setPrinting] =
    useState(false);

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

        const response =
          await api.get("/stores", {
            params: {
              page: 0,
              size: 100,
              active: true,
            },
          });

        const activeStores =
          Array.isArray(
            response?.data?.content
          )
            ? response.data.content
            : [];

        setStores(activeStores);
      } catch (requestError) {
        console.error(
          "Unable to load stores:",
          requestError
        );

        setError(
          requestError?.response?.data
            ?.message ||
            "Unable to load stores."
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

    const loadBarcodeItems =
      async () => {
        try {
          setLoading(true);
          setError("");
          setSelectedIds([]);
          setBarcodeImages({});

          const response =
            await getCurrentStockPage(
              storeId,
              {
                page: 0,
                size: 2147483647,
                onlyAvailable: false,
                sortBy: "id",
                direction: "ASC",
              }
            );

          const stockItems =
            Array.isArray(
              response?.content
            )
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
          const formattedItems =
            stockItems
              .filter(
                (item) =>
                  item?.inventoryId !=
                  null
              )
              .map((item) => {
                const partNumber =
                  String(
                    item.partNumber ||
                      ""
                  ).trim();

                return {
                  id: item.inventoryId,

                  inventoryId:
                    item.inventoryId,

                  partNumber,

                  partName:
                    item.itemName ||
                    item.productName ||
                    "",

                  brand:
                    item.brandName ||
                    item.brand ||
                    "",
                };
              })
              .filter(
                (item) =>
                  item.partNumber
              );

          setItems(
            formattedItems
          );
        } catch (requestError) {
          console.error(
            "Unable to load barcode inventory:",
            requestError
          );

          setItems([]);
          setBarcodeImages({});

          setError(
            requestError?.response
              ?.data?.message ||
              "Unable to load inventory products."
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
    return [
      ...new Set(
        items
          .map(
            (item) =>
              item.brand
          )
          .filter(Boolean)
      ),
    ];
  }, [items]);

  /*
   * ---------------------------------------------------------
   * FILTER INVENTORY
   * ---------------------------------------------------------
   */
  const filteredItems =
    useMemo(() => {
      const searchValue =
        searchText
          .trim()
          .toLowerCase();

      return items.filter(
        (item) => {
          const matchesBrand =
            selectedBrand === "" ||
            item.brand ===
              selectedBrand;

          const matchesSearch =
            searchValue === "" ||
            item.partNumber
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            item.partName
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            item.brand
              .toLowerCase()
              .includes(
                searchValue
              );

          return (
            matchesBrand &&
            matchesSearch
          );
        }
      );
    }, [
      items,
      searchText,
      selectedBrand,
    ]);

  /*
   * ---------------------------------------------------------
   * PAGINATION
   * ---------------------------------------------------------
   */
  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredItems.length /
          entriesPerPage
      )
    );

  const paginatedItems =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) *
        entriesPerPage;

      const endIndex =
        startIndex +
        entriesPerPage;

      return filteredItems.slice(
        startIndex,
        endIndex
      );
    }, [
      filteredItems,
      currentPage,
      entriesPerPage,
    ]);
    useEffect(() => {
  if (!storeId || paginatedItems.length === 0) {
    setBarcodeImages({});
    return;
  }

  let cancelled = false;
  const createdUrls = new Set();

  setBarcodeImages((currentImages) => {
    Object.values(currentImages).forEach((url) => {
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

      const imageUrl = window.URL.createObjectURL(
        response.data
      );

      createdUrls.add(imageUrl);

      setBarcodeImages((currentImages) => ({
        ...currentImages,
        [item.id]: imageUrl,
      }));
    } catch (requestError) {
      if (!cancelled) {
        console.error(
          `Unable to load barcode for ${item.partNumber}:`,
          requestError
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

    createdUrls.forEach((url) => {
      window.URL.revokeObjectURL(url);
    });

    createdUrls.clear();
  };
}, [paginatedItems, storeId]);

  const firstEntry =
    filteredItems.length === 0
      ? 0
      : (currentPage - 1) *
          entriesPerPage +
        1;

  const lastEntry =
    Math.min(
      currentPage *
        entriesPerPage,
      filteredItems.length
    );

  /*
   * ---------------------------------------------------------
   * SELECT ALL
   * ---------------------------------------------------------
   */
  const allVisibleSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every(
      (item) =>
        selectedIds.includes(
          item.id
        )
    );

  /*
   * ---------------------------------------------------------
   * RESET PAGE WHEN FILTER CHANGES
   * ---------------------------------------------------------
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchText,
    selectedBrand,
    entriesPerPage,
    storeId,
  ]);

  /*
   * ---------------------------------------------------------
   * STORE CHANGE
   * ---------------------------------------------------------
   */
  const handleStoreChange =
    (event) => {
      const newStoreId =
        event.target.value;

      setStoreId(
        newStoreId
      );

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
  const handleRowSelection =
    (itemId) => {
      setSelectedIds(
        (previousIds) => {
          if (
            previousIds.includes(
              itemId
            )
          ) {
            return previousIds.filter(
              (id) =>
                id !== itemId
            );
          }

          return [
            ...previousIds,
            itemId,
          ];
        }
      );
    };

  /*
   * ---------------------------------------------------------
   * SELECT / UNSELECT ALL VISIBLE
   * ---------------------------------------------------------
   */
  const handleSelectAll =
    () => {
      const visibleIds =
        paginatedItems.map(
          (item) => item.id
        );

      if (
        allVisibleSelected
      ) {
        setSelectedIds(
          (previousIds) =>
            previousIds.filter(
              (id) =>
                !visibleIds.includes(
                  id
                )
            )
        );
      } else {
        setSelectedIds(
          (previousIds) => [
            ...new Set([
              ...previousIds,
              ...visibleIds,
            ]),
          ]
        );
      }
    };

  /*
   * ---------------------------------------------------------
   * PRINT THROUGH BACKEND
   * ---------------------------------------------------------
   */
  const printInventoryItems =
    async (
      inventoryItems
    ) => {
      if (!storeId) {
        window.alert(
          "Please select a store first."
        );
        return;
      }

      if (
        !inventoryItems ||
        inventoryItems.length ===
          0
      ) {
        window.alert(
          "No items available to print."
        );
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
        const printItems =
          inventoryItems.map(
            (item) => ({
              inventoryId:
                item.inventoryId,

              /*
               * One barcode label per
               * selected inventory item.
               */
            printQuantity: 1,
            })
          );

        const pdfBlob =
          await printBarcodes(
            Number(storeId),
            printItems
          );

        const blob =
          pdfBlob instanceof Blob
            ? pdfBlob
            : new Blob(
                [pdfBlob],
                {
                  type:
                    "application/pdf",
                }
              );

        const pdfUrl =
          window.URL.createObjectURL(
            blob
          );

        /*
         * Open the PDF generated by
         * the Spring Boot backend.
         */
        window.open(
          pdfUrl,
          "_blank",
          "noopener,noreferrer"
        );

        /*
         * Release temporary URL.
         */
        setTimeout(() => {
          window.URL.revokeObjectURL(
            pdfUrl
          );
        }, 60000);
      } catch (requestError) {
        console.error(
          "Unable to print barcodes:",
          requestError
        );

        setError(
          requestError?.response
            ?.data?.message ||
            "Unable to generate barcode PDF."
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
  const handlePrintSelected =
    async () => {
      if (
        selectedIds.length ===
        0
      ) {
        window.alert(
          "Please select at least one item to print."
        );
        return;
      }

      const selectedItems =
        items.filter(
          (item) =>
            selectedIds.includes(
              item.id
            )
        );

      await printInventoryItems(
        selectedItems
      );
    };

  /*
   * ---------------------------------------------------------
   * PRINT BRAND
   * ---------------------------------------------------------
   */
  const handlePrintBrand =
    async () => {
      if (!selectedBrand) {
        window.alert(
          "Please select a brand first."
        );
        return;
      }

      const brandItems =
        items.filter(
          (item) =>
            item.brand ===
            selectedBrand
        );

      if (
        brandItems.length === 0
      ) {
        window.alert(
          "No items found for this brand."
        );
        return;
      }

      await printInventoryItems(
        brandItems
      );
    };

  /*
   * ---------------------------------------------------------
   * PRINT ONE BARCODE
   * ---------------------------------------------------------
   */
  const handleBarcodeClick =
    async (item) => {
      await printInventoryItems([
        item,
      ]);
    };

  /*
   * ---------------------------------------------------------
   * PAGE NUMBERS
   * ---------------------------------------------------------
   */
  const getPageNumbers =
    () => {
      const pages = [];

      if (
        totalPages <= 5
      ) {
        for (
          let page = 1;
          page <= totalPages;
          page += 1
        ) {
          pages.push(page);
        }

        return pages;
      }

      pages.push(1);

      if (
        currentPage > 3
      ) {
        pages.push("...");
      }

      const startPage =
        Math.max(
          2,
          currentPage - 1
        );

      const endPage =
        Math.min(
          totalPages - 1,
          currentPage + 1
        );

      for (
        let page = startPage;
        page <= endPage;
        page += 1
      ) {
        pages.push(page);
      }

      if (
        currentPage <
        totalPages - 2
      ) {
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
            setSelectedBrand(
              event.target.value
            )
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
          onClick={() =>
            setCurrentPage(1)
          }
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
              setEntriesPerPage(
                Number(
                  event.target.value
                )
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
            {
              filteredItems.length
            }
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
                        ) : (
                          <span>
                            Loading barcode...
                          </span>
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
            {
              filteredItems.length
            }{" "}
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
