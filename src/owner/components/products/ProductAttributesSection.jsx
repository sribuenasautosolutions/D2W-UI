import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, X } from "lucide-react";
import api from "../../../services/apiclient";

const EMPTY = { attributeName: "", attributeCode: "", inputType: "TEXT", unit: "", description: "", optionsText: "", active: true, requiredForCategory: false };

function ProductAttributesSection() {
    const [attributes, setAttributes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [categoryId, setCategoryId] = useState("");
    const [mappings, setMappings] = useState({});
    const [form, setForm] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [attributeResponse, categoryResponse] = await Promise.all([
                api.get("/product-attributes"), api.get("/categories"),
            ]);
            setAttributes(attributeResponse.data || []);
            const available = (categoryResponse.data || []).filter((item) => item.active !== false);
            setCategories(available);
            setCategoryId((current) => current || String(available[0]?.id || ""));
        } catch (e) {
            setError(e.response?.data?.message || "Could not load attributes and categories.");
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        let current = true;
        if (!categoryId) { setMappings({}); return () => { current = false; }; }
        setMappings({});
        setError("");
        api.get(`/product-attributes/category/${categoryId}`).then(({ data }) => {
            if (!current) return;
            const next = {};
            (data || []).forEach((item, index) => {
                next[item.id] = { mapped: true, required: item.required, displayOrder: item.displayOrder ?? index * 10,
                    searchable: item.searchable, filterable: item.filterable };
            });
            setMappings(next);
        }).catch((e) => current && setError(e.response?.data?.message || "Could not load category mappings."));
        return () => { current = false; };
    }, [categoryId]);

    const selectedCategory = useMemo(() => categories.find((item) => String(item.id) === categoryId), [categories, categoryId]);
    const changeField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const codeFromName = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100);

    const saveAttribute = async (event) => {
        event.preventDefault(); setSaving(true); setError(""); setNotice("");
        const payload = {
            attributeName: form.attributeName.trim(),
            attributeCode: editingId ? (attributes.find((item) => item.id === editingId)?.attributeCode || codeFromName(form.attributeName)) : codeFromName(form.attributeName),
            inputType: form.inputType, unit: form.inputType === "NUMBER" ? form.unit.trim() || null : null, description: null,
            options: form.inputType === "DROPDOWN" ? form.optionsText.split(",").map((value) => value.trim()).filter(Boolean) : null,
            active: form.active,
        };
        try {
            if (editingId) {
                await api.put(`/product-attributes/${editingId}`, payload);
            } else {
                const { data: created } = await api.post("/product-attributes", payload);
                if (categoryId) {
                    const categoryMappings = attributes.filter((item) => mappings[item.id]?.mapped).map((item) => ({
                        attributeId: item.id,
                        required: Boolean(mappings[item.id]?.required),
                        displayOrder: Number(mappings[item.id]?.displayOrder || 0),
                        searchable: Boolean(mappings[item.id]?.searchable),
                        filterable: Boolean(mappings[item.id]?.filterable),
                        active: true,
                    }));
                    categoryMappings.push({
                        attributeId: created.id,
                        required: Boolean(form.requiredForCategory),
                        displayOrder: categoryMappings.length * 10,
                        searchable: false,
                        filterable: false,
                        active: true,
                    });
                    const { data: configured } = await api.put(`/product-attributes/categories/${categoryId}/mappings`, categoryMappings);
                    const next = {};
                    (configured || []).forEach((item, index) => {
                        next[item.id] = { mapped: true, required: item.required, displayOrder: item.displayOrder ?? index * 10,
                            searchable: item.searchable, filterable: item.filterable };
                    });
                    setMappings(next);
                }
            }
            setForm(EMPTY); setEditingId(null); setNotice("Attribute saved."); await load();
        } catch (e) { setError(e.response?.data?.message || "Could not save attribute."); }
        finally { setSaving(false); }
    };

    const editAttribute = (item) => {
        setEditingId(item.id);
        setForm({ attributeName: item.attributeName, attributeCode: item.attributeCode, inputType: item.inputType,
            unit: item.unit || "", description: item.description || "", optionsText: (item.options || []).join(", "), active: item.active,
            requiredForCategory: Boolean(mappings[item.id]?.required) });
    };

    const toggleMapping = (id, key, value) => setMappings((current) => ({
        ...current, [id]: { mapped: false, required: false, displayOrder: 0, searchable: false, filterable: false, ...current[id], [key]: value },
    }));

    const saveMappings = async () => {
        setSaving(true); setError(""); setNotice("");
        const payload = attributes.filter((item) => mappings[item.id]?.mapped).map((item) => ({
            attributeId: item.id, required: Boolean(mappings[item.id].required),
            displayOrder: Number(mappings[item.id].displayOrder || 0),
            searchable: Boolean(mappings[item.id].searchable), filterable: Boolean(mappings[item.id].filterable), active: true,
        }));
        try {
            await api.put(`/product-attributes/categories/${categoryId}/mappings`, payload);
            setNotice("Category specifications saved.");
            const { data } = await api.get(`/product-attributes/category/${categoryId}`);
            const next = {};
            (data || []).forEach((item) => { next[item.id] = { mapped: true, required: item.required,
                displayOrder: item.displayOrder, searchable: item.searchable, filterable: item.filterable }; });
            setMappings(next);
        } catch (e) { setError(e.response?.data?.message || "Could not save category specifications."); }
        finally { setSaving(false); }
    };

    const setStatus = async (item) => {
        try {
            await api.patch(`/product-attributes/${item.id}/status`, null, { params: { active: !item.active } });
            await load();
        } catch (e) { setError(e.response?.data?.message || "Could not update attribute status."); }
    };

    if (loading) return <div className="items-empty"><Loader2 size={18} className="pc-spin" /> Loading specifications…</div>;

    return <div className="items-section items-spec-admin">
        <div className="items-table-card">
            <h2>Category specifications</h2>
            <p>Choose a category. New attributes are enabled for it automatically and remain optional unless marked required.</p>
            {!categories.length ? <p>No active categories are available. Add categories in the Categories tab first.</p> : <>
                <label className="items-spec-field"><span>Category</span>
                    <select className="items-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                        {categories.map((item) => <option value={item.id} key={item.id}>{item.categoryName}</option>)}
                    </select>
                </label>
                <div className="items-spec-admin-table-wrap"><table className="items-table">
                    <thead><tr><th>Use</th><th>Attribute</th><th>Required</th><th>Order</th><th>Actions</th></tr></thead>
                    <tbody>{attributes.map((item) => {
                        const mapping = mappings[item.id] || {};
                        return <tr key={item.id}>
                            <td><input type="checkbox" disabled={!item.active} checked={Boolean(mapping.mapped)} onChange={(e) => toggleMapping(item.id, "mapped", e.target.checked)} /></td>
                            <td>{item.attributeName} <small>{item.inputType}{item.unit ? ` · ${item.unit}` : ""}{!item.active ? " · inactive" : ""}</small></td>
                            <td><input type="checkbox" disabled={!mapping.mapped} checked={Boolean(mapping.required)} onChange={(e) => toggleMapping(item.id, "required", e.target.checked)} /></td>
                            <td><input className="items-input-sm" type="number" min="0" disabled={!mapping.mapped} value={mapping.displayOrder ?? 0} onChange={(e) => toggleMapping(item.id, "displayOrder", e.target.value)} /></td>
                            <td><button type="button" className="items-btn-ghost" onClick={() => editAttribute(item)}>Edit</button>
                                <button type="button" className="items-btn-ghost" onClick={() => setStatus(item)}>{item.active ? "Deactivate" : "Activate"}</button></td>
                        </tr>;
                    })}</tbody>
                </table></div>
                <button className="items-btn-primary" disabled={saving} onClick={saveMappings}><Save size={15} /> Save category fields</button>
            </>}
        </div>

        <div className="items-table-card">
            <h2>{editingId ? "Edit attribute" : `Create attribute${selectedCategory ? ` for ${selectedCategory.categoryName}` : ""}`}</h2>
            <form className="items-spec-definition-form" onSubmit={saveAttribute}>
                <label className="items-spec-field"><span>Name</span><input className="items-input" required maxLength="150" value={form.attributeName}
                    onChange={(e) => changeField("attributeName", e.target.value)} /></label>
                <label className="items-spec-field"><span>Input type</span><select className="items-input" value={form.inputType}
                    onChange={(e) => changeField("inputType", e.target.value)}>
                    <option value="TEXT">Text</option><option value="NUMBER">Number</option><option value="DROPDOWN">Dropdown</option><option value="BOOLEAN">Boolean</option>
                </select></label>
                {form.inputType === "NUMBER" && <label className="items-spec-field"><span>Unit (optional)</span><input className="items-input" maxLength="50" value={form.unit}
                    onChange={(e) => changeField("unit", e.target.value)} /></label>}
                {form.inputType === "DROPDOWN" && <label className="items-spec-field"><span>Options (comma separated)</span><input className="items-input" required value={form.optionsText}
                    onChange={(e) => changeField("optionsText", e.target.value)} /></label>}
                <div className="items-modal-actions">
                    {editingId && <button type="button" className="items-btn-ghost" onClick={() => { setEditingId(null); setForm(EMPTY); }}><X size={14} /> Cancel edit</button>}
                    <button className="items-btn-primary" disabled={saving}><Plus size={14} /> {editingId ? "Save changes" : "Add attribute"}</button>
                </div>
            </form>
        </div>
        {(notice || error) && <p role="status" className={error ? "items-error" : "items-success"}>{error || notice}</p>}
        {selectedCategory && <p>Specification template is mapped to {selectedCategory.categoryName} only. Definitions can be reused by other categories.</p>}
    </div>;
}

export default ProductAttributesSection;
