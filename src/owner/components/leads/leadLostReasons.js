// The fixed list of reasons for marking a lead Lost (decided with the owner).
export const LOST_REASONS = [
    { value: "PRICE_TOO_HIGH", label: "Price too high" },
    { value: "PART_NOT_AVAILABLE", label: "Part not available" },
    { value: "CUSTOMER_NOT_RESPONDING", label: "Customer not responding" },
    { value: "BOUGHT_ELSEWHERE", label: "Bought elsewhere" },
    { value: "FAKE_CUSTOMER", label: "Fake / not genuine customer" },
    { value: "OTHER", label: "Other" },
];

export const LOST_NOTE_MAX = 300;

/**
 * The text that is saved as the lead's lost reason.
 * Returns "" while the choice is not complete ("Other" needs a short note).
 */
export function buildLostReason(choice, note) {
    if (!choice) return "";
    if (choice === "OTHER") {
        const clean = (note || "").trim();
        return clean ? `Other: ${clean}`.slice(0, 500) : "";
    }
    return LOST_REASONS.find((r) => r.value === choice)?.label || "";
}
