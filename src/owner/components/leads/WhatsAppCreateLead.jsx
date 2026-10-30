import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { createLeadFromChat, getLeadDraft } from "../../../services/whatsappChatService";
import { getSalespersons } from "../../../services/salespersonService";

const errorText = (err, fallback) =>
    err?.response?.data?.message || err?.response?.data?.error || fallback;

/**
 * "Create Lead" form opened from a WhatsApp chat.
 * Mobile, name, source and store come from the chat; the requirement starts as the customer's
 * recent messages and can be edited freely before saving.
 */
export default function WhatsAppCreateLead({ conversationId, onClose, onCreated }) {
    const [draft, setDraft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const [mobile, setMobile] = useState("");
    const [name, setName] = useState("");
    const [requirement, setRequirement] = useState("");
    const [salespersonId, setSalespersonId] = useState("");
    const [salespersons, setSalespersons] = useState([]);

    useEffect(() => {
        let active = true;
        getLeadDraft(conversationId)
            .then(async (data) => {
                if (!active) return;
                setDraft(data);
                setMobile(data.mobileNumber || "");
                setName(data.customerName || "");
                setRequirement(data.requirementDraft || "");
                // Salesperson is optional. If the list cannot load, the form still works.
                try {
                    const list = await getSalespersons(Number(data.storeId));
                    if (active && Array.isArray(list)) {
                        setSalespersons(list.filter((s) => s.active !== false));
                    }
                } catch {
                    /* optional field */
                }
            })
            .catch((err) => active && setError(errorText(err, "Could not open the form.")))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [conversationId]);

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === "Escape" && !saving) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, saving]);

    const mobileKnown = Boolean(draft?.mobileNumber);
    const nameLocked = Boolean(draft?.existingCustomer);
    const hasOpenLead = Boolean(draft?.openLeadId);

    const handleCreate = async () => {
        setError("");
        if (!requirement.trim()) return setError("Customer requirement is required.");
        if (!mobileKnown && !/^\d{10}$/.test(mobile)) return setError("Enter a valid 10-digit mobile number.");
        if (!nameLocked && !name.trim()) return setError("Customer name is required.");

        setSaving(true);
        try {
            const created = await createLeadFromChat(conversationId, {
                mobileNumber: mobileKnown ? null : mobile,
                customerName: name.trim(),
                customerRequirement: requirement.trim(),
                salespersonId: salespersonId ? Number(salespersonId) : null,
            });
            onCreated(created);
        } catch (err) {
            setError(errorText(err, "Lead was not created."));
            setSaving(false);
        }
    };

    return (
        <div className="wc-modal-backdrop">
            <div className="wc-modal" role="dialog" aria-modal="true" aria-label="Create lead">
                <div className="wc-modal-head">
                    <strong>Create lead</strong>
                    <button type="button" className="wc-icon-btn" onClick={onClose} disabled={saving} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className="wc-center"><Loader2 className="wc-spin" size={20} /></div>
                ) : (
                    <div className="wc-modal-body">
                        {hasOpenLead && (
                            <div className="wc-error" role="alert">
                                This customer already has an open lead ({draft.openLeadNumber}). Add the new request to
                                that lead instead of creating another one.
                            </div>
                        )}

                        <label className="wc-field">
                            <span>Customer mobile</span>
                            {mobileKnown ? (
                                <input value={mobile} readOnly disabled />
                            ) : (
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                    placeholder="WhatsApp hides this number. Type 10 digits"
                                    disabled={saving}
                                />
                            )}
                        </label>

                        <label className="wc-field">
                            <span>
                                Customer name
                                {nameLocked && (
                                    <em className="wc-tag"><CheckCircle2 size={12} /> existing POS customer</em>
                                )}
                            </span>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                readOnly={nameLocked}
                                disabled={nameLocked || saving}
                                maxLength={150}
                                placeholder="Customer name"
                            />
                        </label>

                        <div className="wc-field-row">
                            <label className="wc-field">
                                <span>Lead source</span>
                                <input value="WhatsApp" readOnly disabled />
                            </label>
                            <label className="wc-field">
                                <span>Salesperson (optional)</span>
                                <select value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)} disabled={saving}>
                                    <option value="">None</option>
                                    {salespersons.map((s) => (
                                        <option key={s.id ?? s.salespersonId} value={s.id ?? s.salespersonId}>
                                            {s.salespersonName || s.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <label className="wc-field">
                            <span>Customer requirement (vehicle and parts)</span>
                            <textarea
                                rows={7}
                                value={requirement}
                                onChange={(e) => setRequirement(e.target.value)}
                                maxLength={4000}
                                disabled={saving}
                                placeholder="Vehicle model, year or VIN, and the parts the customer needs"
                            />
                            <small className="wc-hint">
                                Filled from the customer's recent messages. Edit it freely. Photos and voice notes show as
                                a note like [Photo]; please check them in the chat.
                            </small>
                        </label>

                        {error && <div className="wc-error" role="alert">{error}</div>}
                    </div>
                )}

                <div className="wc-modal-foot">
                    <button type="button" className="wc-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                    <button
                        type="button"
                        className="wc-btn-primary"
                        onClick={handleCreate}
                        disabled={loading || saving || hasOpenLead || !draft}
                    >
                        {saving ? "Creating…" : "Create lead"}
                    </button>
                </div>
            </div>
        </div>
    );
}
