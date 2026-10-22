export default function CustomerChangesTable({
  items,
  drafts,
  onChange,
  disabled,
}) {
  const update = (id, field, value) =>
    onChange(id, { ...(drafts[id] || {}), [field]: value });
  return (
    <div className="lead-procurement-table-scroll">
      <table className="lead-follow-up-table">
        <thead>
          <tr>
            {[
              "Select",
              "Part Number",
              "Part Name",
              "Current Qty",
              "Requested Qty",
              "Change Type",
              "Requested Requirement",
              "Reason (required)",
            ].map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const draft = drafts[item.id] || {};
            return (
              <tr key={item.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Change ${item.partNumber}`}
                    checked={Boolean(draft.selected)}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(item.id, {
                        requestedQuantity: String(item.requestedQuantity || ""),
                        changeType: "QUANTITY_CHANGE",
                        requestedRequirement: "",
                        reason: "",
                        ...draft,
                        selected: event.target.checked,
                      })
                    }
                  />
                </td>
                <td>{item.partNumber}</td>
                <td>{item.productName || item.requirement}</td>
                <td>{item.requestedQuantity}</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    aria-label={`Requested quantity for ${item.partNumber}`}
                    value={draft.requestedQuantity || ""}
                    disabled={disabled || !draft.selected}
                    onChange={(event) =>
                      update(item.id, "requestedQuantity", event.target.value)
                    }
                  />
                </td>
                <td>
                  <select
                    aria-label={`Change type for ${item.partNumber}`}
                    value={draft.changeType || "QUANTITY_CHANGE"}
                    disabled={disabled || !draft.selected}
                    onChange={(event) =>
                      update(item.id, "changeType", event.target.value)
                    }
                  >
                    {["QUANTITY_CHANGE", "REQUIREMENT_CHANGE", "OTHER"].map(
                      (type) => (
                        <option key={type} value={type}>
                          {type.replaceAll("_", " ")}
                        </option>
                      ),
                    )}
                  </select>
                </td>
                <td>
                  <textarea
                    rows={2}
                    aria-label={`Requested requirement for ${item.partNumber}`}
                    value={draft.requestedRequirement || ""}
                    disabled={disabled || !draft.selected}
                    onChange={(event) =>
                      update(
                        item.id,
                        "requestedRequirement",
                        event.target.value,
                      )
                    }
                  />
                </td>
                <td>
                  <textarea
                    rows={2}
                    placeholder="Why is procurement needed?"
                    aria-label={`Reason for ${item.partNumber}`}
                    value={draft.reason || ""}
                    disabled={disabled || !draft.selected}
                    onChange={(event) =>
                      update(item.id, "reason", event.target.value)
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
