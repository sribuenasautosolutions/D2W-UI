import { useEffect, useState } from "react";
import { Search, X, AlertCircle } from "lucide-react";
import api from "../../../services/api";
import { Button } from "@/components/ui/button";

const pageSize = 25;
const money = (value) =>
  value == null
    ? "—"
    : Number(value).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
      });

export default function VendorStockSearch({
  storeId,
  storeRequired,
  query,
  onQueryChange,
  onSelectVendor,
}) {
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState(null);
  const search = query.trim();
  const disabled = storeRequired && !storeId;
  const requestKey = JSON.stringify([storeId, search, page, retry]);

  useEffect(() => {
    if (!search || disabled) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/api/vendor-stock-uploads/search", {
          params: {
            ...(storeId ? { storeId: Number(storeId) } : {}),
            query: search,
            page,
            size: pageSize,
          },
          signal: controller.signal,
        });
        if (active) setResult({ key: requestKey, data });
      } catch (error) {
        if (active)
          setResult({
            key: requestKey,
            error:
              error.response?.data?.message ||
              "Unable to search vendor stock. Please try again.",
          });
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [storeId, search, page, disabled, requestKey]);

  const current = result?.key === requestKey ? result : null;
  const rows = current?.data?.content || [];
  const total = current?.data?.totalElements || 0;
  const pages = current?.data?.totalPages || 1;
  const changeQuery = (value) => {
    setPage(0);
    onQueryChange(value);
  };

  return (
    <section aria-label="Vendor stock search" className="grid gap-2.5">
      <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-card text-muted-foreground shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
        <Search size={17} aria-hidden="true" className="shrink-0" />
        <input
          aria-label="Search uploaded vendor stock"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
          value={query}
          disabled={disabled}
          maxLength={200}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder="Search vendor stock by part number or part name..."
        />
        {query && (
          <button
            type="button"
            aria-label="Clear stock search"
            onClick={() => changeQuery("")}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={16} />
          </button>
        )}
      </label>

      <small className="text-xs text-muted-foreground px-1">
        {disabled
          ? "Select a store to search uploaded stock."
          : "Search available stock across vendors in this store by part number or part name."}
      </small>

      {search && !disabled && (
        <div aria-live="polite" aria-busy={!current} className="grid gap-3">
          {current?.error ? (
            <div
              role="alert"
              className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center justify-between border border-destructive/20"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{current.error}</span>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setRetry((value) => value + 1)}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
                <table
                  className="w-full min-w-[680px] border-collapse text-left text-sm text-foreground"
                  aria-label="Matching vendor stock"
                >
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Part Number</th>
                      <th className="px-4 py-3">Part Name</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">MRP</th>
                      <th className="px-4 py-3">Brand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr
                        key={`${row.uploadId}-${row.vendorStockItemId}`}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">
                          <button
                            type="button"
                            onClick={() => onSelectVendor(row)}
                            className="font-semibold text-primary hover:underline text-left transition-colors"
                          >
                            {row.vendorName}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {row.partNumber}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.productName}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {Number(row.availableQuantity).toLocaleString(
                            "en-IN",
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {money(row.mrp)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.brand || "—"}
                        </td>
                      </tr>
                    ))}
                    {!current && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          Searching vendor stock...
                        </td>
                      </tr>
                    )}
                    {current && !rows.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          No currently available vendor stock matches this part.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {current && total > 0 && (
                <div className="flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
                  <span>
                    {total} matching stock item{total === 1 ? "" : "s"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((value) => value - 1)}
                    >
                      Previous
                    </Button>
                    <span className="font-medium text-foreground px-1">
                      Page {page + 1} of {pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page + 1 >= pages}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
