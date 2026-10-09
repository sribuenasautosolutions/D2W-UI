import { useState } from "react";
import {Search, Bell, ChevronDown, ChevronRight,Upload, Download, Plus,Boxes, Tag, LayoutGrid, Layers, GitCompareArrows, Wrench,
} from "lucide-react";

import BrandsSection from "../../owner/components/products/BrandsSection";
import CategoriesSection from "../../owner/components/products/CategoriesSection";
import MastersSection from "../../owner/components/products/MastersSection";
import ItemsSection from "../../owner/components/products/ItemsSection";
import FitmentsSection from "../../owner/components/products/FitmentsSection";
import CrossReferenceSection from "../../owner/components/products/CrossReferenceSection";

import "./ProductPage.css";

const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
};

function ProductPage() {
    const [activeTab, setActiveTab] = useState("items");
    const [searchQuery, setSearchQuery] = useState("");
    const [profileOpen, setProfileOpen] = useState(false);

    /* Per-tab action counters — reset on tab switch so a fresh tab
       never opens a modal inherited from the previous tab. */
    const [itemsActions, setItemsActions] = useState({ bulk: 0, add: 0, export: 0 });
    const [brandsActions, setBrandsActions] = useState({ bulk: 0, add: 0 });

    const bumpItems = (key) =>
        setItemsActions((p) => ({ ...p, [key]: p[key] + 1 }));
    const bumpBrands = (key) =>
        setBrandsActions((p) => ({ ...p, [key]: p[key] + 1 }));

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setItemsActions({ bulk: 0, add: 0, export: 0 });
        setBrandsActions({ bulk: 0, add: 0 });
        setSearchQuery("");
    };

    const user = readUser();
    const displayName = user?.name || "Super Admin";
    const initials =
        displayName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0].toUpperCase())
            .join("") || "SA";

    const tabs = [
        { id: "items",           label: "Items",            Icon: Boxes },
        { id: "brands",          label: "Brands",           Icon: Tag },
        { id: "categories",      label: "Categories",       Icon: LayoutGrid },
        { id: "masters",         label: "Masters",          Icon: Layers },
        { id: "crossReferences", label: "Cross References", Icon: GitCompareArrows },
        { id: "fitments",        label: "Fitments",         Icon: Wrench },
    ];

    const activeTabName = tabs.find((t) => t.id === activeTab)?.label;

    return (
        <div className="product-management-page">
            {/* NAVBAR (sticky) */}
            <header className="pm-navbar">
                <nav className="pm-breadcrumb" aria-label="Breadcrumb">
                    <Boxes size={16} className="pm-breadcrumb-icon" />
                    <span>Product Management</span>
                    <ChevronRight size={16} className="pm-breadcrumb-sep" />
                    <span className="pm-breadcrumb-active">{activeTabName}</span>
                </nav>

                <div className="pm-navbar-right">
                    <div className="pm-navbar-search">
                        <Search size={15} />
                        <input
                            type="text"
                            placeholder={`Search ${activeTabName.toLowerCase()}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <button type="button" className="pm-navbar-bell" aria-label="Notifications">
                        <Bell size={18} />
                        <span className="pm-navbar-bell-dot" />
                    </button>

                    <div className="pm-navbar-profile-wrap">
                        <button
                            type="button"
                            className="pm-navbar-profile"
                            onClick={() => setProfileOpen((v) => !v)}
                            aria-expanded={profileOpen}
                        >
                            <span className="pm-navbar-profile-initials">{initials}</span>
                            <span className="pm-navbar-profile-name">{displayName}</span>
                            <ChevronDown
                                size={14}
                                className={`pm-navbar-profile-chev${profileOpen ? " is-open" : ""}`}
                            />
                        </button>

                        {profileOpen && (
                            <div className="pm-navbar-dropdown">
                                <button type="button">My profile</button>
                                <button type="button">Settings</button>
                                <button type="button" className="is-danger">Sign out</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* TABS ROW (sticky) — tabs left, actions right */}
            <div className="pm-tabs-row">
                <div className="pm-tabs" role="tablist">
                    {tabs.map((tab) => {
                        const Icon = tab.Icon;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                className={`pm-tab${activeTab === tab.id ? " pm-tab-active" : ""}`}
                                onClick={() => handleTabChange(tab.id)}
                            >
                                <Icon size={15} className="pm-tab-icon" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {activeTab === "items" && (
                    <div className="pm-tabs-actions">
                        <button className="pm-btn pm-btn-secondary" onClick={() => bumpItems("export")}>
                            <Download size={15} /> <span>Export</span>
                        </button>
                        <button className="pm-btn pm-btn-secondary" onClick={() => bumpItems("bulk")}>
                            <Upload size={15} /> <span>Bulk Upload</span>
                        </button>
                        <button className="pm-btn pm-btn-primary" onClick={() => bumpItems("add")}>
                            <Plus size={15} /> <span>Add Item</span>
                        </button>
                    </div>
                )}

                {activeTab === "brands" && (
                    <div className="pm-tabs-actions">
                        <button className="pm-btn pm-btn-secondary" onClick={() => bumpBrands("bulk")}>
                            <Upload size={15} /> <span>Bulk Upload</span>
                        </button>
                        <button className="pm-btn pm-btn-primary" onClick={() => bumpBrands("add")}>
                            <Plus size={15} /> <span>Add Brand</span>
                        </button>
                    </div>
                )}
            </div>

            {/* SECTION */}
            <div className="pm-section">
                {activeTab === "items" && (
                    <ItemsSection
                        query={searchQuery}
                        requestBulkUpload={itemsActions.bulk}
                        requestAddItem={itemsActions.add}
                        requestExport={itemsActions.export}
                    />
                )}
                {activeTab === "brands" && (
                    <BrandsSection
                        query={searchQuery}
                        requestBulkUpload={brandsActions.bulk}
                        requestAddBrand={brandsActions.add}
                    />
                )}
                {activeTab === "categories" && <CategoriesSection />}
                {activeTab === "masters" && <MastersSection />}
                {activeTab === "crossReferences" && <CrossReferenceSection />}
                {activeTab === "fitments" && <FitmentsSection />}
            </div>
        </div>
    );
}

export default ProductPage;