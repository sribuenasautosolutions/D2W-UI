import { useEffect, useState, useRef } from "react";
import { approveLocalProduct } from "../../../services/localProductService";
import { getAllBrands } from "../../../services/brandService";
import { getAllCategories } from "../../../services/brandService";
import { getAllProductMasters } from "../../../services/brandService";

import "./styles/vehicle-management.css";
import "./styles/product-approval.css";

const emptyForm = {
    itemName: "",
    description: "",
    partNumber: "",
    oemNumber: "",
    ean: "",
    hsnCode: "",
    brandName: "",
    categoryName: "",
    masterName: ""
};

function ProductSection({ reviewData, selectedApproval, onApproved }) {
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
    const [errors, setErrors] = useState({});
    const brandRef = useRef(null);
    const categoryRef = useRef(null);
    const masterRef = useRef(null);

    // Load brand/category/master lists once on mount
    useEffect(() => {
        const loadMasterData = async () => {

            try {

                const [
                    brandData,
                    categoryData,
                    masterData
                ] = await Promise.all([
                    getAllBrands(),
                    getAllCategories(),
                    getAllProductMasters()
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

    // Sync form data whenever reviewData changes
    useEffect(() => {
        if (!reviewData?.localProduct) {
            setFormData(emptyForm);
            return;
        }

        const product = reviewData.localProduct;

        setFormData({
            itemName: product.productName || "",
            description: product.description || "",
            partNumber: product.partNumber || "",
            oemNumber: product.oemNumber || "",
            ean: product.ean || "",
            hsnCode: product.hsnCode || "",
            brandName: product.brand || "",
            categoryName: product.category || "",
            masterName: product.master || ""
        });
    }, [reviewData]);

    // Close all suggestion dropdowns when clicking outside
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

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {

            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );

        };

    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleBrandChange = (e) => {
        const value = e.target.value;

        setFormData({
            ...formData,
            brandName: value
        });

        if (value.trim() === "") {
            setFilteredBrands([]);
            setShowBrandSuggestions(false);
            return;
        }

        const filtered = brands.filter((brand) =>
            brand.brandName.toLowerCase().includes(value.toLowerCase())
        );

        setFilteredBrands(filtered);
        setShowBrandSuggestions(true);
    };

    const selectBrand = (brand) => {
        setFormData({
            ...formData,
            brandName: brand.brandName
        });

        setShowBrandSuggestions(false);
    };

    const handleCategoryChange = (e) => {

        const value = e.target.value;

        setFormData({

            ...formData,

            categoryName: value

        });

        if (value.trim() === "") {

            setFilteredCategories([]);
            setShowCategorySuggestions(false);
            return;

        }

        const filtered = categories.filter(

            category =>
                category.categoryName
                    .toLowerCase()
                    .includes(value.toLowerCase())

        );

        setFilteredCategories(filtered);

        setShowCategorySuggestions(true);

    };

    const selectCategory = (category) => {

        setFormData({

            ...formData,

            categoryName: category.categoryName

        });

        setShowCategorySuggestions(false);

    };

    const handleMasterChange = (e) => {

        const value = e.target.value;

        setFormData({

            ...formData,

            masterName: value

        });

        if (value.trim() === "") {

            setFilteredMasters([]);
            setShowMasterSuggestions(false);
            return;

        }

        const filtered = masters.filter(

            master =>
                master.masterName
                    .toLowerCase()
                    .includes(value.toLowerCase())

        );

        setFilteredMasters(filtered);

        setShowMasterSuggestions(true);

    };

    const selectMaster = (master) => {

        setFormData({

            ...formData,

            masterName: master.masterName

        });

        setShowMasterSuggestions(false);

    };

    const validateForm = () => {

        const validationErrors = {};

        if (!formData.itemName.trim()) {
            validationErrors.itemName = "Item Name is required";
        }

        if (!formData.partNumber.trim()) {
            validationErrors.partNumber = "Part Number is required";
        }

        if (!formData.brandName.trim()) {
            validationErrors.brandName = "Brand is required";
        }

        if (!formData.categoryName.trim()) {
            validationErrors.categoryName = "Category is required";
        }

        if (!formData.masterName.trim()) {
            validationErrors.masterName = "Master is required";
        }

        setErrors(validationErrors);

        return Object.keys(validationErrors).length === 0;

    };

    const handleApprove = async () => {

        if (!validateForm()) {

            return;

        }

        try {

            if (!selectedApproval) {
                alert("Please select a product.");
                return;
            }

            const dto = {
                itemName: formData.itemName,
                description: formData.description,
                partNumber: formData.partNumber,
                oemNumber: formData.oemNumber,
                ean: formData.ean,
                hsnCode: formData.hsnCode,
                brandName: formData.brandName,
                categoryName: formData.categoryName,
                masterName: formData.masterName
            };

            console.log("Approve DTO :", dto);

            await approveLocalProduct(selectedApproval.approvalRequestId, dto);

            alert("Product Approved Successfully.");

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
                    <div className="vm-empty-title">Create Global Product</div>
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
                            Item Name <span className="vm-req">*</span>
                        </label>
                        <input
                            name="itemName"
                            value={formData.itemName}
                            onChange={handleChange}
                            className={`vm-input${errors.itemName ? " has-error" : ""}`}
                        />
                        {errors.itemName && (
                            <span className="vm-field-error">{errors.itemName}</span>
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
                            className={`vm-input${errors.partNumber ? " has-error" : ""}`}
                        />
                        {errors.partNumber && (
                            <span className="vm-field-error">{errors.partNumber}</span>
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
                                className={`vm-input${errors.brandName ? " has-error" : ""}`}
                            />

                            {showBrandSuggestions && filteredBrands.length > 0 && (
                                <div className="vm-suggest-list">
                                    {filteredBrands.map((brand) => (
                                        <div
                                            key={brand.id}
                                            className="vm-suggest-item"
                                            onClick={() => selectBrand(brand)}
                                        >
                                            {brand.brandName}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {errors.brandName && (
                            <span className="vm-field-error">{errors.brandName}</span>
                        )}
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Category <span className="vm-req">*</span>
                        </label>
                        <div ref={categoryRef} className="vm-suggest-wrap">
                            <input
                                name="categoryName"
                                value={formData.categoryName}
                                onChange={handleCategoryChange}
                                onFocus={() => {
                                    setFilteredCategories(categories);
                                    setShowCategorySuggestions(true);
                                }}
                                autoComplete="off"
                                className={`vm-input${errors.categoryName ? " has-error" : ""}`}
                            />

                            {showCategorySuggestions && filteredCategories.length > 0 && (
                                <div className="vm-suggest-list">
                                    {filteredCategories.map((category) => (
                                        <div
                                            key={category.id}
                                            className="vm-suggest-item"
                                            onClick={() => selectCategory(category)}
                                        >
                                            {category.categoryName}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {errors.categoryName && (
                            <span className="vm-field-error">{errors.categoryName}</span>
                        )}
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">
                            Master <span className="vm-req">*</span>
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
                                className={`vm-input${errors.masterName ? " has-error" : ""}`}
                            />

                            {showMasterSuggestions && filteredMasters.length > 0 && (
                                <div className="vm-suggest-list">
                                    {filteredMasters.map((master) => (
                                        <div
                                            key={master.id}
                                            className="vm-suggest-item"
                                            onClick={() => selectMaster(master)}
                                        >
                                            {master.masterName}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {errors.masterName && (
                            <span className="vm-field-error">{errors.masterName}</span>
                        )}
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">OEM Number</label>
                        <input
                            name="oemNumber"
                            value={formData.oemNumber}
                            onChange={handleChange}
                            className="vm-input"
                        />
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">HSN Code</label>
                        <input
                            name="hsnCode"
                            value={formData.hsnCode}
                            onChange={handleChange}
                            className="vm-input"
                        />
                    </div>

                    <div className="vm-field">
                        <label className="vm-label">EAN</label>
                        <input
                            name="ean"
                            value={formData.ean}
                            onChange={handleChange}
                            className="vm-input"
                        />
                    </div>

                    <div className="vm-field vm-span-2">
                        <label className="vm-label">Description</label>
                        <textarea
                            rows={4}
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="vm-input"
                            style={{ resize: "vertical", fontFamily: "inherit" }}
                        />
                    </div>

                </div>

            </div>

            <div className="vm-panel-footer">
                <button className="vm-btn vm-btn-primary" onClick={handleApprove}>
                    Approve Product
                </button>
            </div>

        </div>
    );
}

export default ProductSection;
