import { useEffect, useState, useRef } from "react";
import { approveLocalProduct } from "../../../services/localProductService";
import { getAllBrands } from "../../../services/brandService";
import { getAllCategories } from "../../../services/brandService";
import { getAllProductMasters } from "../../../services/brandService";
import apiclient from "../../../services/apiclient";
import ProductSpecificationsForm from "../products/ProductSpecificationsForm";

import "./styles/vehicle-management.css";
import "./styles/product-approval.css";

const emptyForm = {
    itemName: "",
    partNumber: "",
    hsnCode: "",
    brandName: "",
    categoryName: "",
    masterName: "",
};

function ProductSection({ reviewData, selectedApproval, onApproved,onToast}) {
    const [formData, setFormData] = useState(emptyForm);
    const [brands, setBrands] = useState([]);
    const [filteredBrands, setFilteredBrands] = useState([]);
    const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);

    const [categories, setCategories] = useState([]);
    const [filteredCategories, setFilteredCategories] = useState([]);
    const [showCategorySuggestions, setShowCategorySuggestions] =
        useState(false);

    const [masters, setMasters] = useState([]);
    const [filteredMasters, setFilteredMasters] = useState([]);
    const [showMasterSuggestions, setShowMasterSuggestions] = useState(false);
    const [specificationAttributes, setSpecificationAttributes] = useState([]);
    const [specificationValues, setSpecificationValues] = useState({});
    const [specificationsLoading, setSpecificationsLoading] = useState(false);

    const [errors, setErrors] = useState({});

    const brandRef = useRef(null);
    const categoryRef = useRef(null);
    const masterRef = useRef(null);

    /* Load brand/category/master lists once */
    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [brandData, categoryData, masterData] =
                    await Promise.all([
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

    const selectedCategory = categories.find((category) =>
        category.categoryName?.trim().toLowerCase() === formData.categoryName.trim().toLowerCase());
    useEffect(() => {
        let active = true;
        if (!selectedCategory?.id) {
            setSpecificationAttributes([]);
            setSpecificationsLoading(false);
            return () => { active = false; };
        }
        setSpecificationsLoading(true);
        apiclient.get(`/product-attributes/category/${selectedCategory.id}`)
            .then(({ data }) => active && setSpecificationAttributes(data || []))
            .catch((error) => {
                console.error("Failed to load approval category specifications", error);
                if (active) setSpecificationAttributes([]);
            })
            .finally(() => active && setSpecificationsLoading(false));
        return () => { active = false; };
    }, [selectedCategory?.id]);

    /* Sync form with reviewData */
    useEffect(() => {
    if (!reviewData?.localProduct) {
        setFormData(emptyForm);
        setSpecificationValues({});
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
    setSpecificationValues({});
}, [reviewData]);

    /* Click outside closes suggestions */
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                brandRef.current &&
                !brandRef.current.contains(event.target)
            ) {
                setShowBrandSuggestions(false);
            }
            if (
                categoryRef.current &&
                !categoryRef.current.contains(event.target)
            ) {
                setShowCategorySuggestions(false);
            }
            if (
                masterRef.current &&
                !masterRef.current.contains(event.target)
            ) {
                setShowMasterSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
    }, []);

    const handleChange = (e) => {
        if (e.target.name === "categoryName" && e.target.value !== formData.categoryName) setSpecificationValues({});
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

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
                b.brandName.toLowerCase().includes(value.toLowerCase())
            )
        );
        setShowBrandSuggestions(true);
    };

    const selectBrand = (brand) => {
        setFormData({ ...formData, brandName: brand.brandName });
        setShowBrandSuggestions(false);
    };

    const handleCategoryChange = (e) => {
        const value = e.target.value;
        if (value !== formData.categoryName) setSpecificationValues({});
        setFormData({ ...formData, categoryName: value });
        if (value.trim() === "") {
            setFilteredCategories([]);
            setShowCategorySuggestions(false);
            return;
        }
        setFilteredCategories(
            categories.filter((c) =>
                c.categoryName.toLowerCase().includes(value.toLowerCase())
            )
        );
        setShowCategorySuggestions(true);
    };

    const selectCategory = (category) => {
        if (formData.categoryName !== category.categoryName) setSpecificationValues({});
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
                m.masterName.toLowerCase().includes(value.toLowerCase())
            )
        );
        setShowMasterSuggestions(true);
    };

    const selectMaster = (master) => {
        setFormData({ ...formData, masterName: master.masterName });
        setShowMasterSuggestions(false);
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.itemName.trim())
            errors.itemName = "Item Name is required";
        if (!formData.partNumber.trim())
            errors.partNumber = "Part Number is required";
        if (!formData.brandName.trim())
            errors.brandName = "Brand is required";
        if (!formData.categoryName.trim())
            errors.categoryName = "Category is required";
        if (!formData.masterName.trim()) errors.masterName = "Subcategory is required";
        if (!formData.hsnCode.trim()) {
            errors.hsnCode = "HSN Code is required";
        } else if (!/^\d{4,8}$/.test(formData.hsnCode.trim())) {
            errors.hsnCode = "HSN Code must be 4 to 8 digits";
        }
        const missingSpecification = specificationAttributes.find((attribute) => {
            const value = specificationValues[attribute.id];
            return attribute.required && (attribute.inputType === "BOOLEAN"
                ? typeof value !== "boolean"
                : value === undefined || value === null || String(value).trim() === "");
        });
        if (missingSpecification) errors[`specification-${missingSpecification.id}`] = `${missingSpecification.attributeName} is required`;
        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

        const handleApprove = async () => {
    if (!validateForm()) {
        onToast?.("Please fix the highlighted fields.", "error");
        return;
    }
        if (!selectedApproval) {
            alert("Please select a product.");
            return;
        }

        const specifications = specificationAttributes
            .filter((attribute) => attribute.inputType === "BOOLEAN"
                || (specificationValues[attribute.id] !== undefined && specificationValues[attribute.id] !== null && String(specificationValues[attribute.id]).trim() !== ""))
            .map((attribute) => ({
                attributeId: attribute.id,
                value: attribute.inputType === "BOOLEAN" ? Boolean(specificationValues[attribute.id])
                    : attribute.inputType === "NUMBER" ? Number(specificationValues[attribute.id]) : String(specificationValues[attribute.id]),
            }));

        // Match ProductCreateDTO; include the mapped values for the selected category.
        const dto = {
            itemName: formData.itemName,
            partNumber: formData.partNumber,
            hsnCode: formData.hsnCode,
            brandName: formData.brandName,
            categoryName: formData.categoryName,
            masterName: formData.masterName,
            specifications,
        };

        console.log("Approve DTO :", dto);

        try {
            await approveLocalProduct(
                selectedApproval.approvalRequestId,
                dto
            );
            // alert("Product Approved Successfully.");
            onApproved?.();
        } catch (error) {
            console.error(error);
            alert("Approval Failed.");
        }
    };

    if (!reviewData) {
        return (
            <div className="vm-panel">
                <div className="vm-empty">
                    <div className="vm-empty-icon">🧾</div>
                    <div className="vm-empty-title">
                        Create Global Product
                    </div>
                    <div>Select a product first.</div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="vm-panel">
            <div className="vm-panel-section">
                <div className="vm-grid-2">
                    <div className="vm-field">
                        <label className="vm-label">
                            Part Name <span className="vm-req">*</span>
                        </label>
                        <input
                            name="itemName"
                            value={formData.itemName}
                            onChange={handleChange}
                            className={`vm-input${
                                errors.itemName ? " has-error" : ""
                            }`}
                        />
                        {errors.itemName && (
                            <span className="vm-field-error">
                                {errors.itemName}
                            </span>
                        )}
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Part Number <span className="vm-req">*</span>
                        </label>
                        <input
                            name="partNumber"
                            value={formData.partNumber}
                            onChange={handleChange}
                            className={`vm-input${
                                errors.partNumber ? " has-error" : ""
                            }`}
                        />
                        {errors.partNumber && (
                            <span className="vm-field-error">
                                {errors.partNumber}
                            </span>
                        )}
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Brand <span className="vm-req">*</span>
                        </label>
                        <div ref={brandRef} className="vm-suggest-wrap">
                            <input
                                name="brandName"
                                value={formData.brandName}
                                onChange={handleBrandChange}
                                onFocus={() => {
                                    setFilteredBrands(brands);
                                    setShowBrandSuggestions(true);
                                }}
                                autoComplete="off"
                                className={`vm-input${
                                    errors.brandName ? " has-error" : ""
                                }`}
                            />
                            {showBrandSuggestions &&
                                filteredBrands.length > 0 && (
                                    <div className="vm-suggest-list">
                                        {filteredBrands.map((brand) => (
                                            <div
                                                key={brand.id}
                                                className="vm-suggest-item"
                                                onClick={() =>
                                                    selectBrand(brand)
                                                }
                                            >
                                                {brand.brandName}
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>
                        {errors.brandName && (
                            <span className="vm-field-error">
                                {errors.brandName}
                            </span>
                        )}
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Category <span className="vm-req">*</span>
                        </label>
                        <div
                            ref={categoryRef}
                            className="vm-suggest-wrap"
                        >
                            <input
                                name="categoryName"
                                value={formData.categoryName}
                                onChange={handleCategoryChange}
                                onFocus={() => {
                                    setFilteredCategories(categories);
                                    setShowCategorySuggestions(true);
                                }}
                                autoComplete="off"
                                className={`vm-input${
                                    errors.categoryName
                                        ? " has-error"
                                        : ""
                                }`}
                            />
                            {showCategorySuggestions &&
                                filteredCategories.length > 0 && (
                                    <div className="vm-suggest-list">
                                        {filteredCategories.map((cat) => (
                                            <div
                                                key={cat.id}
                                                className="vm-suggest-item"
                                                onClick={() =>
                                                    selectCategory(cat)
                                                }
                                            >
                                                {cat.categoryName}
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>
                        {errors.categoryName && (
                            <span className="vm-field-error">
                                {errors.categoryName}
                            </span>
                        )}
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Subcategory <span className="vm-req">*</span>
                        </label>
                        <div ref={masterRef} className="vm-suggest-wrap">
                            <input
                                name="masterName"
                                value={formData.masterName}
                                onChange={handleMasterChange}
                                onFocus={() => {
                                    setFilteredMasters(masters);
                                    setShowMasterSuggestions(true);
                                }}
                                autoComplete="off"
                                className={`vm-input${
                                    errors.masterName
                                        ? " has-error"
                                        : ""
                                }`}
                            />
                            {showMasterSuggestions &&
                                filteredMasters.length > 0 && (
                                    <div className="vm-suggest-list">
                                        {filteredMasters.map((m) => (
                                            <div
                                                key={m.id}
                                                className="vm-suggest-item"
                                                onClick={() =>
                                                    selectMaster(m)
                                                }
                                            >
                                                {m.masterName}
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>
                        {errors.masterName && (
                            <span className="vm-field-error">
                                {errors.masterName}
                            </span>
                        )}
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            HSN Code <span className="vm-req">*</span>
                        </label>
                        <input
                            name="hsnCode"
                            value={formData.hsnCode}
                            onChange={handleChange}
                            className={`vm-input${errors.hsnCode ? " has-error" : ""}`}
                            inputMode="numeric"
                            maxLength={8}
                            placeholder="e.g. 8708"
                        />
                        {errors.hsnCode && (
                            <span className="vm-field-error">{errors.hsnCode}</span>
                        )}
                                    </div>
                                    </div>
            </div>

            <div className="vm-panel-section">
                <ProductSpecificationsForm attributes={specificationAttributes} values={specificationValues}
                    onChange={(attributeId, value) => setSpecificationValues((current) => ({ ...current, [attributeId]: value }))}
                    disabled={specificationsLoading} loading={specificationsLoading} />
                {Object.entries(errors).filter(([key]) => key.startsWith("specification-")).map(([key, message]) =>
                    <span key={key} className="vm-field-error">{message}</span>)}
            </div>

            <div className="vm-panel-footer">
                <button
                    className="vm-btn vm-btn-primary"
                    onClick={handleApprove}
                >
                    Approve Product
                </button>
            </div>
        </div>
    );
}

export default ProductSection;
