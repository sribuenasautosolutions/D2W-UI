function ProductSpecificationsForm({ attributes = [], values = {}, onChange, disabled = false, loading = false }) {
    if (loading || !attributes.length) return null;

    return (
        <section className="product-units-section" aria-label="Technical specifications">
            <h3>Technical Specifications</h3>
            <div className="items-spec-grid">
                {attributes.map((attribute) => {
                    const value = values[attribute.id] ?? "";
                    const label = `${attribute.attributeName}${attribute.unit ? ` (${attribute.unit})` : ""}${attribute.required ? " *" : ""}`;
                    if (attribute.inputType === "BOOLEAN") {
                        return <div className="items-spec-checkbox" key={attribute.id}>
                            <label><input type="checkbox" checked={value === true || value === "true"} disabled={disabled}
                                onChange={(event) => onChange(attribute.id, event.target.checked)} /> <span>{label}</span></label>
                            {value !== "" && value !== null && value !== undefined && <button type="button" className="items-btn-ghost" disabled={disabled}
                                onClick={() => onChange(attribute.id, null)}>Clear</button>}
                        </div>;
                    }
                    if (attribute.inputType === "DROPDOWN") {
                        return <label className="items-spec-field" key={attribute.id}>
                            <span>{label}</span>
                            <select className="items-input" value={value} disabled={disabled} required={attribute.required}
                                onChange={(event) => onChange(attribute.id, event.target.value)}>
                                <option value="">Select…</option>
                                {(attribute.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </label>;
                    }
                    return <label className="items-spec-field" key={attribute.id}>
                        <span>{label}</span>
                        <input className="items-input" type={attribute.inputType === "NUMBER" ? "number" : "text"}
                            step={attribute.inputType === "NUMBER" ? "any" : undefined}
                            value={value} disabled={disabled} required={attribute.required}
                            onChange={(event) => onChange(attribute.id, event.target.value)} />
                    </label>;
                })}
            </div>
        </section>
    );
}

export default ProductSpecificationsForm;
