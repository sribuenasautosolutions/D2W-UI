import { useEffect, useMemo, useState } from "react";
import {
  CirclePlus,
  Clock3,
  PackagePlus,
  Search,
  Send,
  Trash2,
  Warehouse,
} from "lucide-react";
import api from "../../../services/api";
import {
  createD2WStockRequest,
  getD2WStockRequests,
  getD2WSourceWarehouse,
  searchD2WRequestProducts,
} from "../../../services/d2wStockRequestService";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function statusLabel(status) {
  return String(status || "SUBMITTED").replaceAll("_", " ");
}

function dateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function emptyRequestRow() {
  return {
    key: `${Date.now()}-${Math.random()}`,
    productId: null,
    itemName: "",
    partNumber: "",
    brandName: "",
    currentStock: null,
    quantity: "1",
    requestedDescription: "",
  };
}

export default function D2WStockRequestSection() {
  const user = useMemo(getUser, []);
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(
    user.storeId ? String(user.storeId) : "",
  );
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [requests, setRequests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [warehouseRoute, setWarehouseRoute] = useState(null);

  useEffect(() => {
    let active = true;
    getD2WSourceWarehouse()
      .then((data) => active && setWarehouseRoute(data))
      .catch(
        () =>
          active &&
          setWarehouseRoute({
            configured: false,
            message: "Unable to verify D2W warehouse configuration",
          }),
      );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api
      .get("/stores", { params: { page: 0, size: 100, active: true } })
      .then((response) => {
        const content = Array.isArray(response.data?.content)
          ? response.data.content
          : [];
        setStores(content.filter((store) => store.storeType !== "WAREHOUSE"));
      })
      .catch(() =>
        setMessage({ type: "error", text: "Unable to load stores" }),
      );
  }, [isSuperAdmin]);

  useEffect(() => {
    setItems([]);
    setQuery("");
    setSuggestions([]);
    if (!storeId) {
      setRequests([]);
      return;
    }
    let active = true;
    setLoadingHistory(true);
    getD2WStockRequests(Number(storeId))
      .then((data) => active && setRequests(data))
      .catch(
        (error) =>
          active &&
          setMessage({
            type: "error",
            text:
              error.response?.data?.message || "Unable to load D2W requests",
          }),
      )
      .finally(() => active && setLoadingHistory(false));
    return () => {
      active = false;
    };
  }, [storeId]);

  useEffect(() => {
    if (!storeId || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchD2WRequestProducts(
          query.trim(),
          Number(storeId),
        );
        if (active) setSuggestions(data.slice(0, 10));
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, storeId]);

  const addProduct = (product) => {
    if (items.some((item) => item.productId === product.id)) {
      setMessage({
        type: "error",
        text: "This product is already in the request",
      });
      return;
    }
    setItems((current) => [
      ...current,
      {
        key: `catalogue-${product.id}-${Date.now()}-${Math.random()}`,
        productId: product.id,
        itemName: product.itemName,
        partNumber: product.partNumber,
        brandName: product.brandName,
        currentStock: product.quantity ?? 0,
        quantity: "1",
        requestedDescription: "",
      },
    ]);
    setQuery("");
    setSuggestions([]);
    setMessage(null);
  };

  const updateItem = (key, field, value) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              [field]: value,
              ...(["partNumber", "itemName", "brandName"].includes(field)
                ? { productId: null, currentStock: null }
                : {}),
            }
          : item,
      ),
    );
  };

  const submitRequest = async () => {
    if (!warehouseRoute?.configured) {
      return setMessage({
        type: "error",
        text: "No active D2W warehouse is configured",
      });
    }
    if (!storeId) return setMessage({ type: "error", text: "Select a store" });
    if (!items.length)
      return setMessage({ type: "error", text: "Add at least one product" });
    const incompleteIndex = items.findIndex(
      (item) =>
        !item.partNumber.trim() ||
        !item.itemName.trim() ||
        !item.brandName.trim(),
    );
    if (incompleteIndex >= 0) {
      return setMessage({
        type: "error",
        text: `Row ${incompleteIndex + 1}: part number, item name and brand are required`,
      });
    }
    if (
      items.some(
        (item) =>
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) <= 0,
      )
    ) {
      return setMessage({
        type: "error",
        text: "Every requested quantity must be a positive whole number",
      });
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const created = await createD2WStockRequest({
        storeId: Number(storeId),
        remarks: remarks.trim() || null,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          partNumber: item.partNumber.trim(),
          itemName: item.itemName.trim(),
          brandName: item.brandName.trim(),
          requestedDescription: item.requestedDescription.trim() || null,
        })),
      });
      setMessage({
        type: "success",
        text: `Request ${created.orderNumber} submitted to D2W warehouse`,
      });
      setItems([]);
      setRemarks("");
      setRequests(await getD2WStockRequests(Number(storeId)));
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message || "Unable to submit D2W stock request",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={S.page}>
      <style>{`
      .d2w-info-copy { display: grid; gap: 2px; }
      .d2w-info-copy span { font-size: 12px; color: #9A3412; }
      .d2w-product-search input { width: 100%; min-width: 0; border: 0; outline: 0; font: inherit; }
      .d2w-product-suggestion > span:first-child { display: grid; gap: 3px; }
      .d2w-product-suggestion small, .d2w-request-table td small { display: block; margin-top: 3px; color: #64748B; }
      .d2w-request-table th { padding: 10px 11px; border-bottom: 1px solid #CBD5E1; background: #F8FAFC; color: #64748B; text-align: left; font-size: 10px; text-transform: uppercase; white-space: nowrap; }
      .d2w-request-table td { padding: 10px 11px; border-bottom: 1px solid #F1F5F9; color: #334155; vertical-align: top; }
      .d2w-request-table tbody tr:hover { background: #F8FBFF; }
      .d2w-submit:disabled { opacity: .55; cursor: not-allowed !important; }
    `}</style>
      <div style={warehouseRoute?.configured ? S.infoBar : S.routeError}>
        <Warehouse size={20} />
        <div className="d2w-info-copy">
          <strong>
            {warehouseRoute?.configured
              ? `Source: ${warehouseRoute.warehouseName}`
              : "D2W warehouse is not configured"}
          </strong>
          <span>
            {warehouseRoute?.configured
              ? `${warehouseRoute.warehouseCode} � Enter part number, part name, brand and quantity.`
              : "Super Admin must create and activate a WAREHOUSE location in Store Management before requests can be submitted."}
          </span>
        </div>
      </div>

      <div style={S.requestPanel}>
        <div style={S.panelHeader}>
          <div>
            <h2 style={S.h2}>Create D2W Stock Request</h2>
            <p style={S.sub}>
              Enter known or new parts. D2W can map a new part during review.
            </p>
          </div>
          <div style={S.headerActions}>
            <button
              type="button"
              style={S.manualButton}
              disabled={!storeId || !warehouseRoute?.configured}
              onClick={() =>
                setItems((current) => [...current, emptyRequestRow()])
              }
            >
              <CirclePlus size={15} /> Add Manual Item
            </button>
            {isSuperAdmin ? (
              <select
                style={S.storeSelect}
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
              >
                <option value="">Select store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.storeName}
                  </option>
                ))}
              </select>
            ) : (
              <span style={S.storeBadge}>
                {user.storeName || "Assigned Store"}
              </span>
            )}
          </div>
        </div>

        <div style={S.searchArea}>
          <div className="d2w-product-search" style={S.searchBox}>
            <Search size={17} />
            <input
              value={query}
              disabled={!storeId || !warehouseRoute?.configured}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                !warehouseRoute?.configured
                  ? "Configure D2W warehouse first"
                  : storeId
                    ? "Optional: search existing catalogue product..."
                    : "Select a store first"
              }
            />
          </div>
          {query.trim().length >= 2 && (
            <div style={S.suggestions}>
              {searching && (
                <div style={S.suggestionMessage}>Searching products...</div>
              )}
              {!searching &&
                suggestions.map((product) => (
                  <button
                    className="d2w-product-suggestion"
                    type="button"
                    key={product.id}
                    style={S.suggestion}
                    onClick={() => addProduct(product)}
                  >
                    <span>
                      <strong>{product.itemName}</strong>
                      <small>
                        {product.partNumber} � {product.brandName || "No brand"}
                      </small>
                    </span>
                    <span style={S.stockText}>
                      Store stock: {product.quantity ?? 0}
                    </span>
                  </button>
                ))}
              {!searching && !suggestions.length && (
                <div style={S.suggestionMessage}>
                  No catalogue products found
                </div>
              )}
            </div>
          )}
        </div>

        <div style={S.tableWrap}>
          <table className="d2w-request-table" style={S.table}>
            <thead>
              <tr>
                <th>Part Number *</th>
                <th>Part Name *</th>
                <th>Brand *</th>
                <th>Store Stock</th>
                <th>Requested Qty *</th>
                <th>Remarks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key}>
                  <td>
                    <input
                      style={S.rowInput}
                      value={item.partNumber}
                      onChange={(event) =>
                        updateItem(
                          item.key,
                          "partNumber",
                          event.target.value.toUpperCase(),
                        )
                      }
                      placeholder="Part number"
                    />
                  </td>
                  <td>
                    <input
                      style={S.rowInput}
                      value={item.itemName}
                      onChange={(event) =>
                        updateItem(item.key, "itemName", event.target.value)
                      }
                      placeholder="Part name"
                    />
                  </td>
                  <td>
                    <input
                      style={S.rowInput}
                      value={item.brandName}
                      onChange={(event) =>
                        updateItem(item.key, "brandName", event.target.value)
                      }
                      placeholder="Brand"
                    />
                  </td>
                  <td>
                    {item.productId ? (
                      <span style={S.qtyBadge}>{item.currentStock ?? 0}</span>
                    ) : (
                      <span style={S.newBadge}>New / unmapped</span>
                    )}
                  </td>
                  <td>
                    <input
                      style={S.qtyInput}
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(item.key, "quantity", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      style={S.rowInput}
                      value={item.requestedDescription}
                      onChange={(event) =>
                        updateItem(
                          item.key,
                          "requestedDescription",
                          event.target.value,
                        )
                      }
                      placeholder="Optional"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      style={S.removeButton}
                      onClick={() =>
                        setItems((current) =>
                          current.filter((row) => row.key !== item.key),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={7} style={S.empty}>
                    <PackagePlus size={23} />
                    <span>
                      Click Add Manual Item or select an existing catalogue
                      product
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={S.submitBar}>
          <input
            style={S.remarksInput}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Overall request remarks (optional)"
          />
          <button
            className="d2w-submit"
            type="button"
            style={S.submitButton}
            disabled={
              submitting ||
              !warehouseRoute?.configured ||
              !storeId ||
              !items.length
            }
            onClick={submitRequest}
          >
            <Send size={16} />
            {submitting ? "Submitting..." : "Submit Request to D2W"}
          </button>
        </div>
        {message && (
          <div style={message.type === "error" ? S.error : S.success}>
            {message.text}
          </div>
        )}
      </div>

      <div style={S.historyPanel}>
        <div style={S.panelHeader}>
          <div>
            <h2 style={S.h2}>Request History</h2>
            <p style={S.sub}>
              Track submission, approval, payment, dispatch and receipt status.
            </p>
          </div>
          <Clock3 size={20} color="#64748B" />
        </div>
        <div style={S.tableWrap}>
          <table className="d2w-request-table" style={S.table}>
            <thead>
              <tr>
                {isSuperAdmin && <th>Store</th>}
                <th>Request</th>
                <th>Date</th>
                <th>Items</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  {isSuperAdmin && (
                    <td>
                      <strong>{request.storeName}</strong>
                    </td>
                  )}
                  <td>
                    <strong>{request.orderNumber}</strong>
                    <small>
                      From: {request.sourceWarehouseName || "Not assigned"}
                    </small>
                  </td>
                  <td>{dateTime(request.createdAt)}</td>
                  <td>
                    <details>
                      <summary style={S.detailsSummary}>
                        {request.items?.length || 0} item(s)
                      </summary>
                      <div style={S.itemList}>
                        {request.items?.map((item) => (
                          <span
                            key={
                              item.purchaseOrderItemId ||
                              `${item.partNumber}-${item.requestedQty}`
                            }
                          >
                            {item.itemName} � {item.brandName || "No brand"} �{" "}
                            {item.partNumber} � Requested {item.requestedQty}
                            {item.approvedQty > 0
                              ? ` � Approved ${item.approvedQty}`
                              : ""}
                          </span>
                        ))}
                      </div>
                    </details>
                  </td>
                  <td>
                    <span style={S.status}>{statusLabel(request.status)}</span>
                  </td>
                  <td>{request.remarks || "-"}</td>
                </tr>
              ))}
              {!loadingHistory && !requests.length && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} style={S.empty}>
                    No D2W stock requests found
                  </td>
                </tr>
              )}
              {loadingHistory && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} style={S.empty}>
                    Loading requests...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const S: Record<string, any> = {
  page: { display: "grid", gap: 14 },
  infoBar: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "11px 14px",
    borderRadius: 7,
    background: "#FFF7ED",
    color: "#9A3412",
  },
  routeError: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "11px 14px",
    borderRadius: 7,
    background: "#FEF2F2",
    color: "#B91C1C",
  },
  requestPanel: { display: "grid", gap: 12 },
  historyPanel: { display: "grid", gap: 10, marginTop: 4 },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  h2: { margin: 0, fontSize: 17, color: "#0F172A" },
  sub: { margin: "4px 0 0", color: "#64748B", fontSize: 12 },
  storeSelect: {
    height: 38,
    minWidth: 210,
    padding: "0 10px",
    border: "1px solid #CBD5E1",
    borderRadius: 5,
    background: "#FFF",
  },
  storeBadge: {
    padding: "9px 12px",
    borderRadius: 5,
    background: "#EFF6FF",
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: 800,
  },
  manualButton: {
    height: 38,
    padding: "0 11px",
    border: "1px solid #BFDBFE",
    borderRadius: 5,
    background: "#EFF6FF",
    color: "#1D4ED8",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 800,
    cursor: "pointer",
  },
  searchArea: { position: "relative", width: "min(680px, 100%)", zIndex: 5 },
  searchBox: {
    height: 40,
    padding: "0 11px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #CBD5E1",
    borderRadius: 6,
    background: "#FFF",
  },
  suggestions: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    maxHeight: 300,
    overflowY: "auto",
    padding: 5,
    border: "1px solid #CBD5E1",
    borderRadius: 6,
    background: "#FFF",
    boxShadow: "0 14px 30px rgba(15,23,42,.16)",
  },
  suggestion: {
    width: "100%",
    padding: "9px 10px",
    border: 0,
    borderBottom: "1px solid #F1F5F9",
    background: "#FFF",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    textAlign: "left",
    cursor: "pointer",
  },
  suggestionMessage: { padding: 12, color: "#64748B", fontSize: 12 },
  stockText: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #E2E8F0",
    borderRadius: 7,
    background: "#FFF",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  qtyBadge: {
    display: "inline-flex",
    minWidth: 30,
    justifyContent: "center",
    padding: "4px 7px",
    borderRadius: 12,
    background: "#F1F5F9",
    fontWeight: 800,
  },
  newBadge: {
    display: "inline-flex",
    padding: "4px 7px",
    borderRadius: 12,
    background: "#FFF7ED",
    color: "#C2410C",
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  qtyInput: {
    width: 82,
    height: 34,
    padding: "0 8px",
    border: "1px solid #CBD5E1",
    borderRadius: 4,
  },
  rowInput: {
    width: "100%",
    minWidth: 160,
    height: 34,
    padding: "0 8px",
    border: "1px solid #CBD5E1",
    borderRadius: 4,
    boxSizing: "border-box",
  },
  removeButton: {
    width: 32,
    height: 32,
    border: 0,
    borderRadius: 4,
    display: "grid",
    placeItems: "center",
    background: "#FEF2F2",
    color: "#DC2626",
    cursor: "pointer",
  },
  empty: { padding: 28, color: "#64748B", textAlign: "center" },
  submitBar: { display: "flex", justifyContent: "space-between", gap: 10 },
  remarksInput: {
    flex: 1,
    height: 40,
    padding: "0 11px",
    border: "1px solid #CBD5E1",
    borderRadius: 5,
  },
  submitButton: {
    height: 40,
    padding: "0 15px",
    border: 0,
    borderRadius: 5,
    background: "#2563EB",
    color: "#FFF",
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontWeight: 800,
    cursor: "pointer",
  },
  error: {
    padding: "10px 12px",
    borderRadius: 5,
    background: "#FEF2F2",
    color: "#B91C1C",
    fontSize: 12,
  },
  success: {
    padding: "10px 12px",
    borderRadius: 5,
    background: "#F0FDF4",
    color: "#15803D",
    fontSize: 12,
  },
  detailsSummary: { color: "#1D4ED8", cursor: "pointer", fontWeight: 700 },
  itemList: {
    display: "grid",
    gap: 4,
    minWidth: 230,
    marginTop: 7,
    color: "#475569",
  },
  status: {
    padding: "4px 8px",
    borderRadius: 12,
    background: "#EFF6FF",
    color: "#1D4ED8",
    fontSize: 10.5,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
};
