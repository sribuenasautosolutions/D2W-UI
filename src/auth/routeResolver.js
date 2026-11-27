/**
 * Resolves the default landing route for an authenticated user strictly from
 * their database-loaded permissions and store assignment (no role-name checks).
 */
export function resolveLandingRoute(permissions = [], user = null) {
    if (!Array.isArray(permissions) || permissions.length === 0) {
        return "/unauthorized";
    }

    const hasPrefix = (prefix) => permissions.some((p) => p.startsWith(prefix));
    const isGlobalPortalUser =
        user?.storeId == null || permissions.includes("STORES.UPDATE");

    if (isGlobalPortalUser) {
        if (permissions.includes("DASHBOARD.VIEW") || permissions.includes("STORES.UPDATE")) {
            return "/owner/dashboard";
        }
        if (hasPrefix("STORES.")) return "/owner/stores";
        if (hasPrefix("CATALOGUE.")) return "/owner/products";
        if (permissions.includes("LOCAL_PRODUCTS.APPROVE")) return "/owner/product-approval";
        if (hasPrefix("VEHICLES.")) return "/owner/vehicles";
        if (hasPrefix("INVENTORY.") || permissions.includes("BARCODES.PRINT")) return "/owner/inventory";
        if (hasPrefix("PURCHASE_ORDERS.") || hasPrefix("VENDORS.")) return "/owner/purchases";
        if (hasPrefix("SALES.") || hasPrefix("PROFORMA.")) return "/owner/sales";
        if (hasPrefix("LEADS.")) return "/owner/sales/leads";
        if (hasPrefix("REPORTS.")) return "/owner/reports";
        if (hasPrefix("EMPLOYEES.")) return "/owner/users";
        if (hasPrefix("ROLES.") || hasPrefix("PERMISSIONS.")) return "/owner/roles";
        return "/unauthorized";
    }

    // Store-scoped users: route POS-only users directly to /pos
    const hasBackOfficeAccess =
        permissions.includes("DASHBOARD.VIEW") ||
        hasPrefix("INVENTORY.") ||
        permissions.includes("BARCODES.PRINT") ||
        hasPrefix("PURCHASE_ORDERS.") ||
        hasPrefix("VENDORS.") ||
        hasPrefix("PROFORMA.") ||
        hasPrefix("LEADS.") ||
        hasPrefix("REPORTS.") ||
        hasPrefix("EMPLOYEES.") ||
        hasPrefix("ROLES.") ||
        hasPrefix("PERMISSIONS.") ||
        hasPrefix("CATALOGUE.");

    if (
        !hasBackOfficeAccess &&
        (permissions.includes("SALES.CREATE") ||
            permissions.includes("SALES.PAYMENT") ||
            permissions.includes("SALES.VIEW"))
    ) {
        return "/pos";
    }

    if (permissions.includes("DASHBOARD.VIEW")) return "/store/dashboard";
    if (hasPrefix("INVENTORY.") || permissions.includes("BARCODES.PRINT")) return "/store/inventory";
    if (hasPrefix("PURCHASE_ORDERS.") || hasPrefix("VENDORS.")) return "/store/purchases";
    if (hasPrefix("SALES.") || hasPrefix("PROFORMA.")) return "/store/sales";
    if (hasPrefix("LEADS.")) return "/store/sales/leads";
    if (hasPrefix("REPORTS.")) return "/store/reports";
    if (hasPrefix("EMPLOYEES.")) return "/store/users";
    if (hasPrefix("ROLES.") || hasPrefix("PERMISSIONS.")) return "/store/roles";
    if (hasPrefix("CATALOGUE.")) return "/store/products";

    return "/unauthorized";
}
