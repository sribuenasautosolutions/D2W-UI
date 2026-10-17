/**
 * Customer requirement block: requirement text, any new / changed requirements and
 * (optionally) follow-up additions, all inside one slate box.
 *
 * Props
 *  - requirement: string
 *  - changes:     [{ id, title, quantity, reason }]  new / changed requirements (optional)
 *  - actions:     node rendered top-right (e.g. "Add Requirement" buttons)
 *  - children:    follow-up addition panels, rendered below the text
 */
export default function CustomerRequirementTable({ requirement, changes = [], actions = null, children = null }) {
    return (
        <section className="crt">
            <div className="crt-head">
                <span className="crt-label">Customer requirement</span>
                {actions && <div className="crt-actions">{actions}</div>}
            </div>

            <div className="crt-text">{requirement}</div>

            {changes.length > 0 && (
                <div className="crt-changes">
                    <div className="crt-subhead">
                        New / changed requirements <span className="crt-count">{changes.length}</span>
                    </div>
                    <table className="crt-table">
                        <thead>
                            <tr>
                                <th>Requirement</th>
                                <th className="crt-col-qty">Qty</th>
                                <th>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {changes.map((change) => (
                                <tr key={change.id}>
                                    <td>{change.title || "—"}</td>
                                    <td className="crt-col-qty">{change.quantity ?? "—"}</td>
                                    <td>{change.reason || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {children}
        </section>
    );
}
