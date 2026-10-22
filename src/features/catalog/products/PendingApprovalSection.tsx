import { useEffect, useState } from "react";
import { getPendingApprovalRequests } from "../../../services/localProductService";

function PendingApprovalSection({
  selectedApproval,
  setSelectedApproval,
  refreshSignal,
  query = "",
}) {
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  const loadPendingProducts = async () => {
    try {
      setLoading(true);
      const response = await getPendingApprovalRequests();
      setPendingProducts(response);
    } catch (error) {
      console.error("Error loading pending products:", error);
    } finally {
      setLoading(false);
    }
  };

  /* Filter using the parent's navbar search */
  const filteredProducts = pendingProducts.filter((product) => {
    const q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return true;
    return (
      (product.productName || "").toLowerCase().includes(q) ||
      (product.partNumber || "").toLowerCase().includes(q) ||
      (product.brand || "").toLowerCase().includes(q)
    );
  });

  const statusBadgeClass = (status) => {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("approve")) return "bg-emerald-50 text-emerald-600";
    if (normalized.includes("reject")) return "bg-red-50 text-red-600";
    if (normalized.includes("pending")) return "bg-amber-50 text-amber-600";
    return "bg-gray-100 text-gray-500";
  };

  return (
    <div className="flex flex-col">
      {/* KPI — single card */}
      <div className="grid grid-cols-[minmax(240px,320px)] gap-3 mb-4">
        <div className="flex items-center gap-4 py-4 px-5 bg-blue-50/50 border border-blue-100 border-l-[3px] border-l-blue-600 rounded-xl shadow-sm">
          <span
            className="inline-flex items-center justify-center w-[42px] h-[42px] bg-blue-100 rounded-xl text-xl flex-shrink-0"
            aria-hidden="true"
          >
            📥
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11.5px] font-bold tracking-wider uppercase text-gray-500">
              Total Pending
            </span>
            <strong className="text-2xl font-extrabold text-gray-900 leading-tight tracking-tight tabular-nums">
              {pendingProducts.length}
            </strong>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-9 px-6 text-center text-gray-400 text-sm">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-[15px] font-bold text-gray-900 mb-1">
              Loading pending approvals…
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-9 px-6 text-center text-gray-400 text-sm">
            <div className="text-3xl mb-2">📥</div>
            <div className="text-[15px] font-bold text-gray-900 mb-1">
              No pending products found
            </div>
            <div>
              {pendingProducts.length === 0
                ? "New submissions will show up here for review."
                : "Try a different search term."}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse table-fixed">
                <colgroup>
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="text-left text-[11.5px] tracking-wider uppercase text-gray-900 px-5 py-3 font-bold border-b border-gray-100 bg-neutral-50 whitespace-nowrap">
                      Product
                    </th>
                    <th className="text-left text-[11.5px] tracking-wider uppercase text-gray-900 px-5 py-3 font-bold border-b border-gray-100 bg-neutral-50 whitespace-nowrap">
                      Part Number
                    </th>
                    <th className="text-left text-[11.5px] tracking-wider uppercase text-gray-900 px-5 py-3 font-bold border-b border-gray-100 bg-neutral-50 whitespace-nowrap">
                      Brand
                    </th>
                    <th className="text-left text-[11.5px] tracking-wider uppercase text-gray-900 px-5 py-3 font-bold border-b border-gray-100 bg-neutral-50 whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-left text-[11.5px] tracking-wider uppercase text-gray-900 px-5 py-3 font-bold border-b border-gray-100 bg-neutral-50 whitespace-nowrap">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const isSelected =
                      selectedApproval?.approvalRequestId ===
                      product.approvalRequestId;
                    return (
                      <tr
                        key={product.approvalRequestId}
                        className={`border-b border-gray-100 last:border-b-0 transition-colors ${
                          isSelected ? "bg-blue-50/60" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900 align-middle truncate">
                          {product.productName}
                        </td>
                        <td className="px-5 py-3 text-[13.5px] font-mono text-slate-600 align-middle truncate">
                          {product.partNumber}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700 align-middle truncate text-left">
                          {product.brand}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700 align-middle truncate text-left">
                          <span
                            className={`inline-flex items-center gap-1 py-0.5 px-3 rounded-full text-xs font-semibold ${statusBadgeClass(product.status)}`}
                          >
                            {product.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700 align-middle truncate text-center">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 h-[30px] px-4 bg-blue-600/10 border border-blue-600/30 rounded-md text-blue-600 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors duration-150 hover:bg-blue-600/20 hover:border-blue-600"
                            onClick={() => setSelectedApproval(product)}
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 text-[12.5px] text-gray-400 border-t border-gray-100">
              {filteredProducts.length} of {pendingProducts.length} products
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PendingApprovalSection;
