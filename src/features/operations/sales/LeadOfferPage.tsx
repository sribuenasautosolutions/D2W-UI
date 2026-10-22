import { ProductUnitLabel } from "../../../components/ProductUnitFields";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  getLeadWorkflow,
  recordLeadDecision,
  prepareLeadSale,
  approveLeadSale,
  convertLeadSale,
} from "../../../services/proformaService";
import { AvailabilityBadge } from "./leads/LeadItemsTable";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const messageOf = (error) =>
  error?.response?.data?.message ||
  (error?.message === "INVALID_QUANTITY"
    ? "Enter a whole sale quantity within the remaining quantity and select matching inventory."
    : "") ||
  "Unable to complete this operation. Please try again.";

export default function LeadOfferPage() {
  const { id } = useParams();
  const location = useLocation();
  const base = location.pathname.startsWith("/owner/")
    ? "/owner/sales"
    : "/store/sales";
  const [state, setState] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState([]),
    [quantities, setQuantities] = useState({}),
    [prepared, setPrepared] = useState(null),
    [approved, setApproved] = useState(false);
  const key = useRef(null);

  const refresh = async () => {
    const next = await getLeadWorkflow(id);
    setState(next);
    setSelected(
      next.fulfillments.find((sale) => !sale.approvedAt)?.selection ||
        next.offer.items.map((item) => item.id),
    );
    if (next.preparedSale) setPrepared(next.preparedSale);
  };

  useEffect(() => {
    refresh().catch((error) => setError(messageOf(error)));
  }, [id]);

  const run = async (callback) => {
    setBusy(true);
    setError("");
    try {
      await callback();
    } catch (error) {
      setError(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const decision = (type) =>
    run(async () => {
      const next = await recordLeadDecision(id, {
        decision: type,
        acceptedItemIds: type === "ACCEPT" ? selected : [],
      });
      setState(next);
    });

  const prepare = () =>
    run(async () => {
      const payload = {
        leadWorkflowId: id,
        items: Object.entries(quantities)
          .filter(([, quantity]) => Number(quantity) > 0)
          .map(([itemId, quantity]) => {
            const line = state.offer.items.find((item) => item.id === itemId);
            return {
              leadOfferItemId: itemId,
              inventoryId: line?.matchedInventoryId,
              batchId: line?.matchedBatchId,
              saleQuantity: Number(quantity),
            };
          }),
      };
      if (!payload.items.length) throw new Error("INVALID_QUANTITY");
      const next = await prepareLeadSale(id, payload);
      setPrepared(next);
      setApproved(false);
    });

  if (!state)
    return (
      <section className="p-6 bg-white min-h-screen">
        <p
          role={error ? "alert" : "status"}
          className="text-sm text-slate-600 mb-4"
        >
          {error || "Loading Lead offer."}
        </p>
        <Link
          to={`${base}/leads`}
          className="text-blue-600 font-semibold hover:underline"
        >
          Back to Leads
        </Link>
      </section>
    );

  const { offer, fulfillments, open } = state;
  const accepted = offer.decisionStatus === "ACCEPTED";

  return (
    <section className="p-6 bg-white min-h-screen max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-gray-200">
        <div>
          <Link
            to={`${base}/leads/${offer.sourceLeadId}`}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← Lead and Procurement
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {offer.proformaNumber}
          </h1>
          <p className="text-sm text-gray-500">
            {offer.customerName} • {offer.storeName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`${base}/proforma/${id}`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Print / save Proforma PDF
          </Link>
          <button
            disabled={busy}
            onClick={() => run(refresh)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Refresh stock and sales
          </button>
        </div>
      </header>

      {error && (
        <p
          className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-sm font-medium text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-left text-sm border border-gray-200 rounded-lg">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase text-gray-600">
              <th className="p-3">Customer selection</th>
              <th className="p-3">Part / product</th>
              <th className="p-3">Availability</th>
              <th className="p-3">Expected date</th>
              <th className="p-3">Offered qty</th>
              <th className="p-3">Quoted price</th>
              <th className="p-3">Accepted qty</th>
              <th className="p-3">Sold qty</th>
              <th className="p-3">Remaining qty</th>
            </tr>
          </thead>
          <tbody>
            {offer.items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="p-3">
                  {open && !accepted ? (
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={(event) =>
                        setSelected((previous) =>
                          event.target.checked
                            ? [...previous, item.id]
                            : previous.filter((id) => id !== item.id),
                        )
                      }
                    />
                  ) : item.customerAccepted ? (
                    "Accepted"
                  ) : (
                    "Not accepted"
                  )}
                </td>
                <td className="p-3 font-semibold">
                  {item.partNumber}{" "}
                  <small className="block text-xs font-normal text-gray-500">
                    {item.productName}
                  </small>
                  <ProductUnitLabel product={item} />
                </td>
                <td className="p-3">
                  <AvailabilityBadge value={item.availabilityStatus} />
                </td>
                <td className="p-3">{item.estimatedAvailabilityDate || "—"}</td>
                <td className="p-3">{item.offeredQuantity}</td>
                <td className="p-3 font-semibold">
                  {money(item.quotedSellingPrice)}
                </td>
                <td className="p-3">{item.acceptedQuantity ?? "—"}</td>
                <td className="p-3">{item.soldQuantity}</td>
                <td className="p-3 font-bold">{item.remainingQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 mb-6">
        {open && !accepted && (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            disabled={busy || !selected.length}
            onClick={() => decision("ACCEPT")}
          >
            Record customer acceptance
          </button>
        )}
        {open && (
          <button
            className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
            disabled={busy}
            onClick={() => decision("REJECT")}
          >
            Customer declined offer
          </button>
        )}
      </div>

      {accepted && open && (
        <>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Sell available stock against this offer
          </h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-left text-sm border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase text-gray-600">
                  <th className="p-3">Part / product</th>
                  <th className="p-3">Remaining qty</th>
                  <th className="p-3">Store inventory</th>
                  <th className="p-3">Current stock</th>
                  <th className="p-3">Sell now qty</th>
                </tr>
              </thead>
              <tbody>
                {offer.items
                  .filter(
                    (item) =>
                      item.customerAccepted && item.remainingQuantity > 0,
                  )
                  .map((item) => {
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="p-3 font-semibold">
                          {item.partNumber}{" "}
                          <small className="block text-xs font-normal text-gray-500">
                            {item.productName}
                          </small>
                        </td>
                        <td>{item.remainingQuantity}</td>
                        <td className="p-3">
                          {item.matchedInventoryId
                            ? `${item.matchedBatchNumber || "Batch"} • ${money(item.currentBatchSellingPrice)}`
                            : "No matching store stock"}
                        </td>
                        <td className="p-3">
                          {item.currentAvailableStock ?? "0"}
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            max={Math.min(
                              item.remainingQuantity,
                              item.currentAvailableStock || 0,
                            )}
                            value={quantities[item.id] ?? ""}
                            onChange={(event) =>
                              setQuantities({
                                ...quantities,
                                [item.id]: event.target.value,
                              })
                            }
                            disabled={
                              busy ||
                              !item.matchedInventoryId ||
                              !item.currentAvailableStock
                            }
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 mb-6"
            disabled={busy}
            onClick={prepare}
          >
            Review current sale prices
          </button>
        </>
      )}

      {prepared && (
        <div className="p-5 border border-gray-200 rounded-xl bg-gray-50 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Sale price review #{prepared.id}
          </h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-left text-sm border border-gray-200 rounded-lg bg-white">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase text-gray-600">
                  <th className="p-3">Part / product</th>
                  <th className="p-3">Batch</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">MRP</th>
                  <th className="p-3">Current selling price</th>
                  <th className="p-3">GST</th>
                  <th className="p-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {prepared.pricing.items.map((line, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="p-3 font-semibold">
                      {line.partNumber}
                      <small className="block text-xs font-normal text-gray-500">
                        {line.productName}
                      </small>
                    </td>
                    <td className="p-3">{line.batchNumber || line.batchId}</td>
                    <td className="p-3">
                      {line.quantity} {line.stockUnit || "PCS"}
                    </td>
                    <td className="p-3">{money(line.mrp)}</td>
                    <td className="p-3">{money(line.sellingPrice)}</td>
                    <td className="p-3">{money(line.gstAmount)}</td>
                    <td className="p-3 font-bold">{money(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-bold text-gray-900 mb-4">
            Total payable now: {money(prepared.pricing.netPayable)}
          </p>
          {prepared.orderId ? (
            <Link
              to={`${base}/invoice/${prepared.orderId}`}
              className="text-blue-600 font-bold hover:underline"
            >
              Open invoice #{prepared.orderId}
            </Link>
          ) : (
            open && (
              <div className="flex items-center gap-4">
                {!prepared.approvedAt ? (
                  <>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={approved}
                        disabled={busy}
                        onChange={(event) => setApproved(event.target.checked)}
                      />{" "}
                      Customer approved these displayed prices
                    </label>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                      disabled={busy || !approved}
                      onClick={() =>
                        run(async () => {
                          setPrepared(await approveLeadSale(id, prepared.id));
                          await refresh();
                        })
                      }
                    >
                      Record price approval
                    </button>
                  </>
                ) : (
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const orderId = await convertLeadSale(id, prepared.id);
                        setPrepared((previous) => ({ ...previous, orderId }));
                        setQuantities({});
                        key.current = null;
                        await refresh();
                      })
                    }
                  >
                    Create sale and invoice
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}

      <h2 className="text-lg font-bold text-gray-900 mb-3">
        Sale history and saved price reviews
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border border-gray-200 rounded-lg">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase text-gray-600">
              <th className="p-3">Review</th>
              <th className="p-3">Created</th>
              <th className="p-3">Total</th>
              <th className="p-3">Customer price approval</th>
              <th className="p-3">Sale / invoice</th>
            </tr>
          </thead>
          <tbody>
            {fulfillments.map((sale) => (
              <tr
                key={sale.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="p-3 font-semibold">#{sale.id}</td>
                <td className="p-3">
                  {new Date(sale.createdAt).toLocaleString()}
                </td>
                <td className="p-3 font-bold">
                  {money(sale.pricing.netPayable)}
                </td>
                <td className="p-3">
                  {sale.approvedAt ? "Recorded" : "Pending"}
                </td>
                <td className="p-3">
                  {sale.orderId ? (
                    <Link
                      to={`${base}/invoice/${sale.orderId}`}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      Open invoice #{sale.orderId}
                    </Link>
                  ) : open ? (
                    <button
                      className="text-blue-600 font-semibold hover:underline"
                      disabled={busy}
                      onClick={() => {
                        setPrepared(sale);
                        setApproved(false);
                      }}
                    >
                      Open price review
                    </button>
                  ) : (
                    "No sale"
                  )}
                </td>
              </tr>
            ))}
            {!fulfillments.length && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  No sales or price reviews yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
