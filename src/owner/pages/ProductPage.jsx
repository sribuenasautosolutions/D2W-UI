import { useState } from "react";
import {Search, ChevronDown, ChevronRight,Upload, Download, Plus,Boxes, Tag, LayoutGrid, Layers, GitCompareArrows, Wrench, SlidersHorizontal,
} from "lucide-react";

import BrandsSection from "../../owner/components/products/BrandsSection";
import CategoriesSection from "../../owner/components/products/CategoriesSection";
import MastersSection from "../../owner/components/products/MastersSection";
import ItemsSection from "../../owner/components/products/ItemsSection";
import FitmentsSection from "../../owner/components/products/FitmentsSection";
import CrossReferenceSection from "../../owner/components/products/CrossReferenceSection";
import ProductAttributesSection from "../../owner/components/products/ProductAttributesSection";

import "./ProductPage.css";

const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
};

/* Tailwind class strings shared by the page-level buttons */
const PM_BTN_SECONDARY =
    "inline-flex h-[34px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 text-[13px] font-semibold [font-family:inherit] transition-colors duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-soft";
const PM_BTN_PRIMARY =
    "inline-flex h-[34px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 text-[13px] font-semibold [font-family:inherit] transition-colors duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand border-brand bg-brand text-white hover:border-brand-hover hover:bg-brand-hover";

const PM_MENU_ITEM =
    "h-[34px] w-full cursor-pointer rounded-md border-0 bg-transparent px-3 text-left text-[13px] font-medium text-ink-soft [font-family:inherit] transition-colors hover:bg-line-soft";

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
       { id: "masters", label: "Subcategories", Icon: Layers },
        { id: "crossReferences", label: "Cross References", Icon: GitCompareArrows },
        { id: "fitments",        label: "Fitments",         Icon: Wrench },
        { id: "specifications", label: "Specifications", Icon: SlidersHorizontal },
    ];

    const activeTabName = tabs.find((t) => t.id === activeTab)?.label;

    return (
          <div className="w-full bg-surface pb-6 text-[14px] leading-[1.45] text-ink antialiased"> 
            {/* NAVBAR (sticky) */}
            <header className="sticky -top-6 z-30 -mt-6 flex h-16 items-center justify-between gap-4 bg-surface px-4 pt-6 min-[901px]:px-6">
                <nav
                    className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold whitespace-nowrap text-ink"
                    aria-label="Breadcrumb"
                >
                    <Boxes size={16} className="shrink-0 text-brand" />
                    <span className="max-[560px]:hidden">Product Management</span>
                    <ChevronRight size={16} className="shrink-0 text-ink-faint max-[560px]:hidden" />
                    <span className="font-semibold text-brand">{activeTabName}</span>
                </nav>

                <div className="flex min-w-0 items-center gap-2">
                    <div className="relative">
                        <button
                            type="button"
                            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-transparent bg-transparent pr-0 pl-1 transition-colors hover:bg-line-soft"
                            onClick={() => setProfileOpen((v) => !v)}
                            aria-expanded={profileOpen}
                        >
                            <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand text-[11px] font-bold tracking-wide text-white">
                                {initials}
                            </span>
                            <span className="max-w-[180px] truncate text-[13px] font-semibold text-ink max-[900px]:hidden">
                                {displayName}
                            </span>
                            <ChevronDown
                                size={14}
                                className={`text-ink-muted transition-transform duration-150${profileOpen ? " rotate-180" : ""}`}
                            />
                        </button>

                        {profileOpen && (
                            <div className="absolute top-[calc(100%+6px)] right-0 z-50 flex min-w-[180px] flex-col gap-0.5 rounded-[10px] border border-line bg-surface p-1 shadow-lg">
                                <button type="button" className={PM_MENU_ITEM}>My profile</button>
                                <button type="button" className={PM_MENU_ITEM}>Settings</button>
                                <button type="button" className={`${PM_MENU_ITEM} text-red-600! hover:bg-red-50`}>Sign out</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* TABS ROW (sticky): tabs left, actions right */}
            <div className="sticky  top-10 z-[29] flex min-h-10 flex-col bg-page px-4 min-[901px]:flex-row min-[901px]:items-center min-[901px]:justify-between min-[901px]:gap-3 min-[901px]:px-6 ">
                <div className="flex min-h-10 min-w-0 flex-none items-stretch gap-1 self-stretch overflow-x-auto shadow-[inset_0_-1px_0_#e2e8f0] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:!hidden [&::-webkit-scrollbar]:!h-0 [&::-webkit-scrollbar]:!w-0 min-[901px]:min-h-0 min-[901px]:flex-1 min-[901px]:shadow-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  role="tablist"
                >
                    {tabs.map((tab) => {
                        const Icon = tab.Icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                className={`inline-flex flex-none cursor-pointer items-center gap-1.5 border-0 border-b-2 bg-transparent px-2.5 min-[1400px]:px-3 text-[13px] min-[1400px]:text-[13.5px] whitespace-nowrap [font-family:inherit] transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
                                    isActive
                                        ? "border-brand font-semibold text-brand"
                                        : "border-transparent font-medium text-ink-muted hover:border-line-strong hover:text-ink"
                                }`}
                                onClick={() => handleTabChange(tab.id)}
                            >
                                <Icon size={15} className="shrink-0" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {activeTab === "items" && (
                    <div className="flex flex-none flex-wrap items-center gap-2 py-2 min-[901px]:py-[5px]">
                        <button className={PM_BTN_SECONDARY} onClick={() => bumpItems("export")}>
                            <Download size={15} /> <span>Export</span>
                        </button>
                        <button className={PM_BTN_SECONDARY} onClick={() => bumpItems("bulk")}>
                            <Upload size={15} /> <span>Bulk Upload</span>
                        </button>
                        <button className={PM_BTN_PRIMARY} onClick={() => bumpItems("add")}>
                            <Plus size={15} /> <span>Add Item</span>
                        </button>
                    </div>
                )}

                {activeTab === "brands" && (
                    <div className="flex flex-none flex-wrap items-center gap-2 py-2 min-[901px]:py-[5px]">
                        <button className={PM_BTN_SECONDARY} onClick={() => bumpBrands("bulk")}>
                            <Upload size={15} /> <span>Bulk Upload</span>
                        </button>
                        <button className={PM_BTN_PRIMARY} onClick={() => bumpBrands("add")}>
                            <Plus size={15} /> <span>Add Brand</span>
                        </button>
                    </div>
                )}
            </div>
             

            {/* SECTION (pm-section stays: the other tabs rely on its spacing) */}
               <div className="mx-4 mt-3 mb-5 min-[901px]:mx-6 min-[901px]:mt-4 min-[901px]:mb-6">
                {(activeTab === "items" || activeTab === "brands") && (
                <div className=" mt-10 mb-4 flex h-10 w-full max-w-[380px] items-center gap-2 rounded-lg border border-line bg-surface px-3 transition hover:border-line-strong focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15">
                    <Search size={15} className="shrink-0 text-ink-faint" />
                    <input
                        type="text"
                        className="h-full min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-ink  [font-family:inherit] placeholder:text-ink-faint outline-none!"
                        placeholder={`Search ${activeTabName.toLowerCase()}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            )}
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
                {activeTab === "specifications" && <ProductAttributesSection />}
            </div>
        </div>
    );
}

export default ProductPage;