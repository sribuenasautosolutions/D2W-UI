import { useState } from "react";

import BrandsSection
from "../../owner/components/products/BrandsSection";

import CategoriesSection
from "../../owner/components/products/CategoriesSection";

import MastersSection
from "../../owner/components/products/MastersSection";

import ItemsSection
from "../../owner/components/products/ItemsSection";

import FitmentsSection
from "../../owner/components/products/FitmentsSection";
import CrossReferenceSection
from "../components/products/CrossReferenceSection";
function ProductPage() {

    const [activeTab,
        setActiveTab] =
            useState("brands");

    return (

        <div>

            <h1
                style={{
                    marginBottom: "20px"
                }}
            >
                Product Management
            </h1>

            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "20px",
                    marginBottom: "20px",
                    flexWrap: "wrap"
                }}
            >

                <button
                    onClick={() =>
                        setActiveTab("brands")
                    }
                    style={{
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        background:
                            activeTab === "brands"
                                ? "#2563eb"
                                : "#f3f4f6",
                        color:
                            activeTab === "brands"
                                ? "white"
                                : "#111827"
                    }}
                >
                    Brands
                </button>

                <button
                    onClick={() =>
                        setActiveTab("categories")
                    }
                    style={{
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        background:
                            activeTab === "categories"
                                ? "#2563eb"
                                : "#f3f4f6",
                        color:
                            activeTab === "categories"
                                ? "white"
                                : "#111827"
                    }}
                >
                    Categories
                </button>

                <button
                    onClick={() =>
                        setActiveTab("masters")
                    }
                    style={{
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        background:
                            activeTab === "masters"
                                ? "#2563eb"
                                : "#f3f4f6",
                        color:
                            activeTab === "masters"
                                ? "white"
                                : "#111827"
                    }}
                >
                    Masters
                </button>

                <button
                    onClick={() =>
                        setActiveTab("items")
                    }
                    style={{
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        background:
                            activeTab === "items"
                                ? "#2563eb"
                                : "#f3f4f6",
                        color:
                            activeTab === "items"
                                ? "white"
                                : "#111827"
                    }}
                >
                    Items
                </button>
<button
    onClick={() =>
        setActiveTab(
            "crossReferences"
        )
    }
>
    Cross References
</button>
                <button
                    onClick={() =>
                        setActiveTab("fitments")
                    }
                    style={{
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        background:
                            activeTab === "fitments"
                                ? "#2563eb"
                                : "#f3f4f6",
                        color:
                            activeTab === "fitments"
                                ? "white"
                                : "#111827"
                    }}
                >
                    Fitments
                </button>

            </div>

            <div
                style={{
                    background: "white",
                    padding: "20px",
                    borderRadius: "10px",
                    boxShadow:
                        "0 2px 8px rgba(0,0,0,0.08)"
                }}
            >

                {
                    activeTab === "brands" &&
                    <BrandsSection />
                }

                {
                    activeTab === "categories" &&
                    <CategoriesSection />
                }

                {
                    activeTab === "masters" &&
                    <MastersSection />
                }

                {
                    activeTab === "items" &&
                    <ItemsSection />
                }
                {
                       activeTab ===
                      "crossReferences"
                          &&
                        <CrossReferenceSection />
                }
                {
                    activeTab === "fitments" &&
                    <FitmentsSection />
                }

            </div>

        </div>
    );
}

export default ProductPage;