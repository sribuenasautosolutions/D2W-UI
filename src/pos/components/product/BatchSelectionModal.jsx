import { useEffect, useState } from "react";
import { getProductBatches } from "../../../services/productService";

function BatchSelectionModal({

    open,

    product,

    onClose,

    onSelect

}) {

    const [batches, setBatches] = useState([]);

    const [selectedBatch, setSelectedBatch] = useState(null);

    // NEW: purely visual state for the "added" confirmation moment.
    // Does not touch any existing data flow.
    const [justAdded, setJustAdded] = useState(false);

    useEffect(() => {

        if (!open || !product) return;

        loadBatches();

    }, [open, product]);

    // Reset the confirmation state whenever the modal is reopened
    useEffect(() => {
        if (open) setJustAdded(false);
    }, [open]);

    const loadBatches = async () => {

        try {

            const data =
                await getProductBatches(
                    product.inventoryId
                );

            setBatches(data);

            if (data.length > 0) {

                setSelectedBatch(data[0]);

            }

        }

        catch (error) {

            console.error(error);

        }

    };

    if (!open) return null;

    // NEW: wraps the existing onSelect call with a brief visual confirmation.
    // The exact same onSelect(selectedBatch) call still fires — nothing about
    // what happens after Add is functionally different, just when the user
    // *sees* it happen.
    const handleAddClick = () => {
        if (!selectedBatch) return;
        setJustAdded(true);
        setTimeout(() => {
            onSelect(selectedBatch);
        }, 700);
    };

    const isLowStock = (qty) => qty > 0 && qty <= 5;
    const isOutOfStock = (qty) => qty <= 0;

    return (

        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.55)",
                backdropFilter: "blur(3px)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
                animation: "bsm-fade-in 0.15s ease-out"
            }}
        >

            <div
                style={{
                    background: "#ffffff",
                    width: "480px",
                    maxWidth: "92vw",
                    maxHeight: "86vh",
                    borderRadius: "16px",
                    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.35)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    animation: "bsm-pop-in 0.18s ease-out"
                }}
            >

                {/* ---------- Header ---------- */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 55%, #7c3aed 100%)",
                        padding: "22px 24px",
                        color: "#ffffff",
                        flexShrink: 0
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <div
                            style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "10px",
                                background: "rgba(255,255,255,0.18)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "17px",
                                flexShrink: 0
                            }}
                        >
                            📦
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", opacity: 0.85, textTransform: "uppercase" }}>
                                Select Batch
                            </div>
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: "16px",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                }}
                                title={product.itemName}
                            >
                                {product.itemName}
                            </h3>
                        </div>
                    </div>
                    <div style={{ fontSize: "12px", opacity: 0.85 }}>
                        Choose which batch to pull stock from
                    </div>
                </div>

                {/* ---------- Batch list ---------- */}
                <div
                    style={{
                        padding: "18px 20px",
                        overflowY: "auto",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        background: "#f8fafc"
                    }}
                >

                    {batches.length === 0 && (
                        <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: "13px" }}>
                            No batches available for this product
                        </div>
                    )}

                    {batches.map((batch) => {
                        const selected = selectedBatch?.batchId === batch.batchId;
                        const outOfStock = isOutOfStock(batch.availableQuantity);
                        const lowStock = isLowStock(batch.availableQuantity);

                        return (
                            <label
                                key={batch.batchId}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "14px",
                                    borderRadius: "12px",
                                    border: selected ? "2px solid #6366f1" : "2px solid #e2e8f0",
                                    background: selected ? "#eef2ff" : "#ffffff",
                                    cursor: outOfStock ? "not-allowed" : "pointer",
                                    opacity: outOfStock ? 0.55 : 1,
                                    boxShadow: selected ? "0 2px 10px rgba(99,102,241,0.18)" : "none",
                                    transition: "all 0.15s ease"
                                }}
                            >

                                <input

                                    type="radio"

                                    disabled={outOfStock}

                                    checked={selected}

                                    onChange={() =>
                                        setSelectedBatch(batch)
                                    }

                                    style={{
                                        width: "17px",
                                        height: "17px",
                                        accentColor: "#6366f1",
                                        flexShrink: 0
                                    }}

                                />

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#1e293b" }}>
                                            {batch.batchNumber}
                                        </span>

                                        {batch.recommended && (
                                            <span
                                                style={{
                                                    fontSize: "10px",
                                                    fontWeight: 700,
                                                    color: "#166534",
                                                    background: "#dcfce7",
                                                    padding: "2px 7px",
                                                    borderRadius: "999px",
                                                    letterSpacing: "0.02em"
                                                }}
                                            >
                                                FIFO PICK
                                            </span>
                                        )}

                                        {outOfStock ? (
                                            <span
                                                style={{
                                                    fontSize: "10px",
                                                    fontWeight: 700,
                                                    color: "#991b1b",
                                                    background: "#fee2e2",
                                                    padding: "2px 7px",
                                                    borderRadius: "999px"
                                                }}
                                            >
                                                OUT OF STOCK
                                            </span>
                                        ) : lowStock ? (
                                            <span
                                                style={{
                                                    fontSize: "10px",
                                                    fontWeight: 700,
                                                    color: "#92400e",
                                                    background: "#fef3c7",
                                                    padding: "2px 7px",
                                                    borderRadius: "999px"
                                                }}
                                            >
                                                LOW STOCK
                                            </span>
                                        ) : null}
                                    </div>

                                    <div style={{ fontSize: "12px", color: "#64748b", display: "flex", gap: "12px" }}>
                                        <span>MRP ₹{batch.mrp}</span>
                                        <span>•</span>
                                        <span>Qty {batch.availableQuantity}</span>
                                    </div>
                                </div>

                            </label>
                        );
                    })}

                </div>

                {/* ---------- Footer ---------- */}
                <div
                    style={{
                        padding: "16px 20px",
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "10px",
                        borderTop: "1px solid #e2e8f0",
                        background: "#ffffff",
                        flexShrink: 0
                    }}
                >

                    <button
                        onClick={onClose}
                        style={{
                            padding: "10px 18px",
                            borderRadius: "9px",
                            border: "1px solid #e2e8f0",
                            background: "#ffffff",
                            color: "#475569",
                            fontSize: "13.5px",
                            fontWeight: 600,
                            cursor: "pointer"
                        }}
                    >
                        Cancel
                    </button>

                    <button

                        onClick={handleAddClick}

                        disabled={!selectedBatch || isOutOfStock(selectedBatch?.availableQuantity ?? 0)}

                        style={{
                            padding: "10px 20px",
                            borderRadius: "9px",
                            border: "none",
                            background: (!selectedBatch || isOutOfStock(selectedBatch?.availableQuantity ?? 0))
                                ? "#c7d2fe"
                                : "linear-gradient(135deg, #4f46e5, #6366f1)",
                            color: "#ffffff",
                            fontSize: "13.5px",
                            fontWeight: 700,
                            cursor: (!selectedBatch || isOutOfStock(selectedBatch?.availableQuantity ?? 0)) ? "not-allowed" : "pointer",
                            boxShadow: (!selectedBatch || isOutOfStock(selectedBatch?.availableQuantity ?? 0)) ? "none" : "0 4px 12px rgba(79,70,229,0.35)"
                        }}

                    >
                        Add to Cart
                    </button>

                </div>

                {/* ---------- "Added" confirmation overlay ---------- */}
                {justAdded && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(255,255,255,0.97)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "12px",
                            animation: "bsm-fade-in 0.15s ease-out"
                        }}
                    >
                        <div
                            style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "50%",
                                background: "#dcfce7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                animation: "bsm-check-pop 0.35s ease-out"
                            }}
                        >
                            <span style={{ fontSize: "26px", color: "#16a34a" }}>✓</span>
                        </div>
                        <div style={{ fontSize: "14.5px", fontWeight: 700, color: "#1e293b" }}>
                            Added to cart
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {product.itemName} · Batch {selectedBatch?.batchNumber}
                        </div>
                    </div>
                )}

            </div>

            <style>{`
                @keyframes bsm-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes bsm-pop-in {
                    from { opacity: 0; transform: scale(0.96) translateY(6px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes bsm-check-pop {
                    0% { transform: scale(0.4); opacity: 0; }
                    60% { transform: scale(1.08); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>

        </div>

    );

}

export default BatchSelectionModal;
