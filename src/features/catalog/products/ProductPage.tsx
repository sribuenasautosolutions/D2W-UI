import { useState } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Upload,
  Download,
  Plus,
  Boxes,
  Tag,
  LayoutGrid,
  Layers,
  GitCompareArrows,
  Wrench,
  X,
} from "lucide-react";

import BrandsSection from "./BrandsSection";
import CategoriesSection from "./CategoriesSection";
import MastersSection from "./MastersSection";
import ItemsSection from "./ItemsSection";
import FitmentsSection from "./FitmentsSection";
import CrossReferenceSection from "./CrossReferenceSection";

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
  const [itemsActions, setItemsActions] = useState({
    bulk: 0,
    add: 0,
    export: 0,
  });
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
    { id: "items", label: "Items", Icon: Boxes },
    { id: "brands", label: "Brands", Icon: Tag },
    { id: "categories", label: "Categories", Icon: LayoutGrid },
    { id: "masters", label: "Masters", Icon: Layers },
    {
      id: "crossReferences",
      label: "Cross References",
      Icon: GitCompareArrows,
    },
    { id: "fitments", label: "Fitments", Icon: Wrench },
  ];

  const activeTabName = tabs.find((t) => t.id === activeTab)?.label;

  return (
    <div className="w-full bg-white text-gray-800 m-0 text-sm leading-[1.45] antialiased">
      {/* NAVBAR (sticky) */}
      <header className="sticky top-0 z-30 flex flex-col md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 h-auto md:h-[60px] px-5 py-3 md:py-0 m-0 bg-white border-b border-gray-200">
        <nav
          className="inline-flex items-center gap-2 text-base font-bold text-slate-900 whitespace-nowrap flex-shrink-0"
          aria-label="Breadcrumb"
        >
          <Boxes size={16} className="text-blue-700 flex-shrink-0" />
          <span>Product Management</span>
          <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
          <span className="text-blue-700 font-bold">{activeTabName}</span>
        </nav>

        <div className="flex items-center gap-2.5 w-full max-w-[420px] h-10 px-3.5 bg-slate-100/90 hover:bg-slate-100 border border-slate-200/60 rounded-full transition-all duration-150 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/15 justify-self-center shadow-xs">
          <Search size={15} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder={`Search ${activeTabName?.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-0 h-full border-0 bg-transparent text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 !outline-none !shadow-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="inline-flex items-center gap-3 justify-self-end flex-shrink-0">
          <button
            type="button"
            className="relative inline-flex items-center justify-center w-[38px] h-[38px] bg-transparent border border-transparent rounded-full text-slate-600 cursor-pointer transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2.5 w-[7px] h-[7px] bg-red-500 border-[1.5px] border-white rounded-full" />
          </button>

          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-2 h-[38px] pl-1 pr-3 bg-transparent border border-transparent rounded-full cursor-pointer transition-colors duration-150 hover:bg-slate-100"
              onClick={() => setProfileOpen((v) => !v)}
              aria-expanded={profileOpen}
            >
              <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-900 to-blue-600 rounded-full text-white text-[11.5px] font-extrabold tracking-wide">
                {initials}
              </span>
              <span className="hidden md:inline text-[13px] font-semibold text-slate-900 whitespace-nowrap max-w-[180px] truncate">
                {displayName}
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-500 transition-transform duration-150 ${profileOpen ? "rotate-180" : ""}`}
              />
            </button>

            {profileOpen && (
              <div className="absolute top-[calc(100%+8px)] right-0 min-w-[180px] p-2 bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col gap-0.5 z-50">
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-transparent border-0 rounded-md text-gray-700 text-[13px] font-semibold text-left cursor-pointer transition-colors duration-150 hover:bg-slate-100"
                >
                  My profile
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-transparent border-0 rounded-md text-gray-700 text-[13px] font-semibold text-left cursor-pointer transition-colors duration-150 hover:bg-slate-100"
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-transparent border-0 rounded-md text-red-600 text-[13px] font-semibold text-left cursor-pointer transition-colors duration-150 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* TABS ROW (sticky) — tabs left, actions right */}
      <div className="sticky top-[60px] z-20 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 px-5 py-3 border-b border-gray-200">
        <div
          className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0"
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
                className={`inline-flex items-center gap-2 h-[34px] px-4 rounded-lg text-[13.5px] font-semibold tracking-tight whitespace-nowrap cursor-pointer transition-all duration-150 flex-shrink-0 ${
                  isActive
                    ? "bg-blue-700 text-white shadow-[0_4px_10px_rgba(30,64,175,0.25)] hover:bg-blue-800"
                    : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                }`}
                onClick={() => handleTabChange(tab.id)}
              >
                <Icon size={15} className="flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === "items" && (
          <div className="inline-flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
            <button
              className="inline-flex items-center justify-center gap-2 h-[38px] px-4 rounded-lg text-[13px] font-bold cursor-pointer whitespace-nowrap transition-all duration-150 bg-white text-slate-900 border border-gray-300 hover:bg-slate-50 hover:border-slate-400 active:translate-y-px"
              onClick={() => bumpItems("export")}
            >
              <Download size={15} /> <span>Export</span>
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 h-[38px] px-4 rounded-lg text-[13px] font-bold cursor-pointer whitespace-nowrap transition-all duration-150 bg-white text-slate-900 border border-gray-300 hover:bg-slate-50 hover:border-slate-400 active:translate-y-px"
              onClick={() => bumpItems("bulk")}
            >
              <Upload size={15} /> <span>Bulk Upload</span>
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 h-[38px] px-4 rounded-lg text-[13px] font-bold cursor-pointer whitespace-nowrap transition-all duration-150 bg-blue-700 text-white border border-blue-700 shadow-sm hover:bg-blue-800 hover:border-blue-800 active:translate-y-px"
              onClick={() => bumpItems("add")}
            >
              <Plus size={15} /> <span>Add Item</span>
            </button>
          </div>
        )}

        {activeTab === "brands" && (
          <div className="inline-flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
            <button
              className="inline-flex items-center justify-center gap-2 h-[38px] px-4 rounded-lg text-[13px] font-bold cursor-pointer whitespace-nowrap transition-all duration-150 bg-white text-slate-900 border border-gray-300 hover:bg-slate-50 hover:border-slate-400 active:translate-y-px"
              onClick={() => bumpBrands("bulk")}
            >
              <Upload size={15} /> <span>Bulk Upload</span>
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 h-[38px] px-4 rounded-lg text-[13px] font-bold cursor-pointer whitespace-nowrap transition-all duration-150 bg-blue-700 text-white border border-blue-700 shadow-sm hover:bg-blue-800 hover:border-blue-800 active:translate-y-px"
              onClick={() => bumpBrands("add")}
            >
              <Plus size={15} /> <span>Add Brand</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION */}
      <div className="w-full max-w-[1600px] px-5 py-4">
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
