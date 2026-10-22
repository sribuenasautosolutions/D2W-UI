import { Eye } from "lucide-react";

const formatMoney = (value) => {
  return `₹ ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatPaymentMethod = (value) => {
  if (!value) return "-";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export default function SalesInvoiceTable({
  sales,
  isSuperAdmin,
  selectedStoreId,
  onViewInvoice,
}) {
  const showStoreColumn = isSuperAdmin && !selectedStoreId;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr>
            {showStoreColumn && (
              <th className="px-4 py-3 text-left text-[11px] font-bold tracking-wider uppercase text-black whitespace-nowrap border-b border-gray-300 bg-slate-100/80">
                Store
              </th>
            )}

            <th className="px-4 py-3 text-left text-[11px] font-bold tracking-wider uppercase text-black whitespace-nowrap border-b border-gray-300 bg-slate-100/80">
              Invoice
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold tracking-wider uppercase text-black whitespace-nowrap border-b border-gray-300 bg-slate-100/80">
              Customer
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold tracking-wider uppercase text-black whitespace-nowrap border-b border-gray-300 bg-slate-100/80">
              Phone
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold tracking-wider uppercase text-black whitespace-nowrap border-b border-gray-300 bg-slate-100/80">
              Items
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold tracking-wider uppercase text-black whitespace-nowrap border-b border-gray-300 bg-slate-100/80">
              Payment
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-bold tracking-wider uppercase text-black whitespace-nowrap border-b border-gray-300 bg-slate-100/80">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold tracking-wider uppercase text-black whitespace-nowrap border-b border-gray-300 bg-slate-100/80">
              Date
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-bold tracking-wider uppercase text-black whitespace-nowrap border-b border-gray-300 bg-slate-100/80">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {sales.map((sale) => (
            <tr
              key={sale.orderId}
              className="hover:bg-blue-50/40 transition-colors duration-150"
            >
              {showStoreColumn && (
                <td className="px-4 py-4 text-[13px] font-medium text-black align-middle border-b border-gray-100">
                  <div className="flex flex-col gap-0.5">
                    <strong className="text-[13px] font-bold text-black">
                      {sale.storeName || "-"}
                    </strong>
                    <small className="text-[11.5px] font-medium text-slate-500">
                      {sale.storeCode || "-"}
                    </small>
                  </div>
                </td>
              )}

              <td className="px-4 py-4 text-[13px] font-medium text-black align-middle border-b border-gray-100">
                <div className="flex flex-col gap-0.5">
                  <strong className="text-[13px] font-bold text-black">
                    INV-{String(sale.orderId).padStart(6, "0")}
                  </strong>
                  <small className="text-[11.5px] font-medium text-slate-500">
                    Order #{sale.orderId}
                  </small>
                </div>
              </td>

              <td className="px-4 py-4 text-[13px] font-medium text-black align-middle border-b border-gray-100">
                {sale.customerName || "-"}
              </td>

              <td className="px-4 py-4 text-[13px] font-medium text-black align-middle border-b border-gray-100">
                {sale.phone || "-"}
              </td>

              <td className="px-4 py-4 text-[13px] font-medium text-black align-middle border-b border-gray-100">
                {sale.totalItems ?? 0}
              </td>

              <td className="px-4 py-4 text-[13px] font-medium text-black align-middle border-b border-gray-100">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold tracking-wide whitespace-nowrap">
                  {formatPaymentMethod(sale.paymentMethod)}
                </span>
              </td>

              <td className="px-4 py-4 text-[13px] font-medium text-black align-middle border-b border-gray-100 text-right">
                <strong className="text-[13px] font-bold text-black">
                  {formatMoney(sale.totalAmount)}
                </strong>
              </td>

              <td className="px-4 py-4 text-[13px] font-medium text-black align-middle border-b border-gray-100">
                {formatDate(sale.orderDate)}
              </td>

              <td className="px-4 py-4 text-[13px] font-medium text-black align-middle border-b border-gray-100 text-right">
                <button
                  type="button"
                  className="w-[34px] h-[34px] inline-flex items-center justify-center border border-gray-300 rounded-lg bg-white text-slate-900 cursor-pointer transition-all duration-150 hover:bg-blue-700 hover:border-blue-700 hover:text-white hover:shadow-md"
                  title="View invoice"
                  onClick={() => onViewInvoice(sale.orderId)}
                >
                  <Eye size={16} />
                </button>
              </td>
            </tr>
          ))}

          {sales.length === 0 && (
            <tr>
              <td
                colSpan={showStoreColumn ? 9 : 8}
                className="p-10 text-center text-[13.5px] font-medium text-slate-400"
              >
                No sales invoices found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
