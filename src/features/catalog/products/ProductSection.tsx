import { useEffect, useState, useRef } from "react";
import { approveLocalProduct } from "../../../services/localProductService";
import { getAllBrands } from "../../../services/brandService";
import { getAllCategories } from "../../../services/brandService";
import { getAllProductMasters } from "../../../services/brandService";

const emptyForm = {
  itemName: "",
  partNumber: "",
  hsnCode: "",
  brandName: "",
  categoryName: "",
  masterName: "",
};

function ProductSection({
  reviewData,
  selectedApproval,
  onApproved,
  onToast,
}: any) {
  const [formData, setFormData] = useState(emptyForm);
  const [brands, setBrands] = useState([]);
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);

  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  const [masters, setMasters] = useState([]);
  const [filteredMasters, setFilteredMasters] = useState([]);
  const [showMasterSuggestions, setShowMasterSuggestions] = useState(false);

  const [errors, setErrors] = useState<Record<string, any>>({});

  const brandRef = useRef(null);
  const categoryRef = useRef(null);
  const masterRef = useRef(null);

  /* Load brand/category/master lists once */
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [brandData, categoryData, masterData] = await Promise.all([
          getAllBrands(),
          getAllCategories(),
          getAllProductMasters(),
        ]);
        setBrands(brandData);
        setCategories(categoryData);
        setMasters(masterData);
      } catch (error) {
        console.error(error);
      }
    };
    loadMasterData();
  }, []);

  /* Sync form with reviewData */
  useEffect(() => {
    if (!reviewData?.localProduct) {
      setFormData(emptyForm);
      return;
    }

    const product = reviewData.localProduct;
    console.log("[PS sync] Full product object:", product);
    console.log("[PS sync] Field checks:", {
      productName: product.productName,
      partNumber: product.partNumber,
      brand: product.brand,
      category: product.category,
      master: product.master,
      hsnCode: product.hsnCode,
    });

    setFormData({
      itemName: product.productName || "",
      partNumber: product.partNumber || "",
      hsnCode: product.hsnCode || "",
      brandName: product.brand || "",
      categoryName: product.category || "",
      masterName: product.master || "",
    });
  }, [reviewData]);

  /* Click outside closes suggestions */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (brandRef.current && !brandRef.current.contains(event.target)) {
        setShowBrandSuggestions(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowCategorySuggestions(false);
      }
      if (masterRef.current && !masterRef.current.contains(event.target)) {
        setShowMasterSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleBrandChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, brandName: value });
    if (value.trim() === "") {
      setFilteredBrands([]);
      setShowBrandSuggestions(false);
      return;
    }
    setFilteredBrands(
      brands.filter((b) =>
        b.brandName.toLowerCase().includes(value.toLowerCase()),
      ),
    );
    setShowBrandSuggestions(true);
  };

  const selectBrand = (brand) => {
    setFormData({ ...formData, brandName: brand.brandName });
    setShowBrandSuggestions(false);
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, categoryName: value });
    if (value.trim() === "") {
      setFilteredCategories([]);
      setShowCategorySuggestions(false);
      return;
    }
    setFilteredCategories(
      categories.filter((c) =>
        c.categoryName.toLowerCase().includes(value.toLowerCase()),
      ),
    );
    setShowCategorySuggestions(true);
  };

  const selectCategory = (category) => {
    setFormData({ ...formData, categoryName: category.categoryName });
    setShowCategorySuggestions(false);
  };

  const handleMasterChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, masterName: value });
    if (value.trim() === "") {
      setFilteredMasters([]);
      setShowMasterSuggestions(false);
      return;
    }
    setFilteredMasters(
      masters.filter((m) =>
        m.masterName.toLowerCase().includes(value.toLowerCase()),
      ),
    );
    setShowMasterSuggestions(true);
  };

  const selectMaster = (master) => {
    setFormData({ ...formData, masterName: master.masterName });
    setShowMasterSuggestions(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.itemName.trim()) errors.itemName = "Item Name is required";
    if (!formData.partNumber.trim())
      errors.partNumber = "Part Number is required";
    if (!formData.brandName.trim()) errors.brandName = "Brand is required";
    if (!formData.categoryName.trim())
      errors.categoryName = "Category is required";
    if (!formData.hsnCode.trim()) {
      errors.hsnCode = "HSN Code is required";
    } else if (!/^\d{4,8}$/.test(formData.hsnCode.trim())) {
      errors.hsnCode = "HSN Code must be 4 to 8 digits";
    }
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleApprove = async () => {
    if (!validateForm()) {
      const firstMessage =
        Object.values(errors)[0] || "Please fix the highlighted fields.";
      onToast?.(firstMessage, "error");
      return;
    }
    if (!selectedApproval) {
      alert("Please select a product.");
      return;
    }

    const dto = {
      itemName: formData.itemName,
      partNumber: formData.partNumber,
      hsnCode: formData.hsnCode,
      brandName: formData.brandName,
      categoryName: formData.categoryName,
      masterName: formData.masterName,
    };

    console.log("Approve DTO :", dto);

    try {
      await approveLocalProduct(selectedApproval.approvalRequestId, dto);
      onApproved?.();
    } catch (error) {
      console.error(error);
      alert("Approval Failed.");
    }
  };

  const inputBaseClass = (hasErr) =>
    `w-full h-9 px-3 border rounded-md text-[13px] text-gray-900 outline-none transition-all duration-150 ${
      hasErr
        ? "border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-2 focus:ring-red-100"
        : "border-gray-300 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
    }`;

  if (!reviewData) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-8 text-center text-slate-400 text-sm">
          <div className="text-3xl mb-2 opacity-70">🧾</div>
          <div className="text-[14.5px] font-bold text-slate-600 mb-1">
            Create Global Product
          </div>
          <div>Select a product first.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              className={inputBaseClass(!!errors.itemName)}
            />
            {errors.itemName && (
              <span className="text-[11.5px] font-semibold text-red-600">
                {errors.itemName}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">
              Part Number <span className="text-red-500">*</span>
            </label>
            <input
              name="partNumber"
              value={formData.partNumber}
              onChange={handleChange}
              className={inputBaseClass(!!errors.partNumber)}
            />
            {errors.partNumber && (
              <span className="text-[11.5px] font-semibold text-red-600">
                {errors.partNumber}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">
              Brand <span className="text-red-500">*</span>
            </label>
            <div ref={brandRef} className="relative w-full">
              <input
                name="brandName"
                value={formData.brandName}
                onChange={handleBrandChange}
                onFocus={() => {
                  setFilteredBrands(brands);
                  setShowBrandSuggestions(true);
                }}
                autoComplete="off"
                className={inputBaseClass(!!errors.brandName)}
              />
              {showBrandSuggestions && filteredBrands.length > 0 && (
                <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg max-h-44 overflow-y-auto z-50">
                  {filteredBrands.map((brand) => (
                    <div
                      key={brand.id}
                      className="px-3 py-2 text-[12.5px] text-gray-800 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => selectBrand(brand)}
                    >
                      {brand.brandName}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.brandName && (
              <span className="text-[11.5px] font-semibold text-red-600">
                {errors.brandName}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">
              Category <span className="text-red-500">*</span>
            </label>
            <div ref={categoryRef} className="relative w-full">
              <input
                name="categoryName"
                value={formData.categoryName}
                onChange={handleCategoryChange}
                onFocus={() => {
                  setFilteredCategories(categories);
                  setShowCategorySuggestions(true);
                }}
                autoComplete="off"
                className={inputBaseClass(!!errors.categoryName)}
              />
              {showCategorySuggestions && filteredCategories.length > 0 && (
                <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg max-h-44 overflow-y-auto z-50">
                  {filteredCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="px-3 py-2 text-[12.5px] text-gray-800 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => selectCategory(cat)}
                    >
                      {cat.categoryName}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.categoryName && (
              <span className="text-[11.5px] font-semibold text-red-600">
                {errors.categoryName}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">
              Master <span className="text-red-500">*</span>
            </label>
            <div ref={masterRef} className="relative w-full">
              <input
                name="masterName"
                value={formData.masterName}
                onChange={handleMasterChange}
                onFocus={() => {
                  setFilteredMasters(masters);
                  setShowMasterSuggestions(true);
                }}
                autoComplete="off"
                className={inputBaseClass(!!errors.masterName)}
              />
              {showMasterSuggestions && filteredMasters.length > 0 && (
                <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg max-h-44 overflow-y-auto z-50">
                  {filteredMasters.map((m) => (
                    <div
                      key={m.id}
                      className="px-3 py-2 text-[12.5px] text-gray-800 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => selectMaster(m)}
                    >
                      {m.masterName}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.masterName && (
              <span className="text-[11.5px] font-semibold text-red-600">
                {errors.masterName}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">
              HSN Code <span className="text-red-500">*</span>
            </label>
            <input
              name="hsnCode"
              value={formData.hsnCode}
              onChange={handleChange}
              className={inputBaseClass(!!errors.hsnCode)}
              inputMode="numeric"
              maxLength={8}
              placeholder="e.g. 8708"
            />
            {errors.hsnCode && (
              <span className="text-[11.5px] font-semibold text-red-600">
                {errors.hsnCode}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
        <button
          className="w-full h-[38px] inline-flex items-center justify-center px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          onClick={handleApprove}
        >
          Approve Product
        </button>
      </div>
    </div>
  );
}

export default ProductSection;
