import { useEffect, useState } from "react";

import {
    getApprovalReview
} from "../../../services/localProductService";

function Review({

    selectedApproval,
    reviewData,
    setReviewData,
    onNext

}) {

    const [loading, setLoading] = useState(false);

    useEffect(() => {

        if (selectedApproval) {

            loadReview();

        } else {

            setReviewData(null);

        }

    }, [selectedApproval]);

    const loadReview = async () => {

        try {

            setLoading(true);

            const response =
                await getApprovalReview(
                    selectedApproval.approvalRequestId
                );

            console.log("Approval Review :", response);

            setReviewData(response);

        }
        catch (error) {

            console.error(error);

        }
        finally {

            setLoading(false);

        }

    };

    if (!selectedApproval) {

        return (

            <div className="vc-card">

                <h2>Review Product</h2>

                <p>

                    Select a pending product to review.

                </p>

            </div>

        );

    }

    if (loading) {

        return (

            <div className="vc-card">

                <h2>Review Product</h2>

                <p>Loading...</p>

            </div>

        );

    }

    const local = reviewData?.localProduct;

    const existing = reviewData?.existingProduct;

    return (

        <div className="vc-card">

            <h2>

                Review Product

            </h2>

            <hr />

            <h3>

                Local Product

            </h3>

            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: "20px"
                }}
            >

                <tbody>

                    <tr>

                        <td><strong>Product Name</strong></td>

                        <td>{local?.productName || "-"}</td>

                    </tr>

                    <tr>

                        <td><strong>Part Number</strong></td>

                        <td>{local?.partNumber || "-"}</td>

                    </tr>

                    <tr>

                        <td><strong>Brand</strong></td>

                        <td>{local?.brand || "-"}</td>

                    </tr>

                    <tr>

                        <td><strong>Category</strong></td>

                        <td>{local?.category || "-"}</td>

                    </tr>

                    <tr>

                        <td><strong>Master</strong></td>

                        <td>{local?.master || "-"}</td>

                    </tr>

                    <tr>

                        <td><strong>OEM Number</strong></td>

                        <td>{local?.oemNumber || "-"}</td>

                    </tr>

                    <tr>

                        <td><strong>Description</strong></td>

                        <td>{local?.description || "-"}</td>

                    </tr>

                </tbody>

            </table>

            <hr />

            <h3>

                Existing Product

            </h3>

            {

                existing ?

                    (

                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse"
                            }}
                        >

                            <tbody>

                                <tr>

                                    <td>

                                        <strong>

                                            Product Name

                                        </strong>

                                    </td>

                                    <td>

                                        {existing.itemName}

                                    </td>

                                </tr>

                                <tr>

                                    <td>

                                        <strong>

                                            Part Number

                                        </strong>

                                    </td>

                                    <td>

                                        {existing.partNumber}

                                    </td>

                                </tr>

                                <tr>

                                    <td>

                                        <strong>

                                            Brand

                                        </strong>

                                    </td>

                                    <td>

                                        {existing.brandName}

                                    </td>

                                </tr>

                                <tr>

                                    <td>

                                        <strong>

                                            Category

                                        </strong>

                                    </td>

                                    <td>

                                        {existing.categoryName}

                                    </td>

                                </tr>

                            </tbody>

                        </table>

                    )

                    :

                    (

                        <div
                            style={{
                                padding: "15px",
                                background: "#EEF6FF",
                                border: "1px solid #BFDBFE",
                                borderRadius: "8px"
                            }}
                        >

                            No Matching Product Found.

                        </div>

                    )

            }

            <hr />

            <h3>

                Decision

            </h3>

            {

                reviewData?.canCreate &&

                (

                    <div
                        style={{
                            padding: "12px",
                            background: "#DCFCE7",
                            border: "1px solid #22C55E",
                            borderRadius: "8px",
                            marginBottom: "10px"
                        }}
                    >

                        ✅ Ready to Create New Global Product

                    </div>

                )

            }

            {

                reviewData?.canMerge &&

                (

                    <div
                        style={{
                            padding: "12px",
                            background: "#FEF3C7",
                            border: "1px solid #F59E0B",
                            borderRadius: "8px"
                        }}
                    >

                        🔄 Existing Product Found. Ready to Merge.

                    </div>

                )

            }

            {

                reviewData?.canCreate &&

                (

                    <div
                        className="vc-card-actions"
                        style={{
                            marginTop: "20px",
                            textAlign: "right"
                        }}
                    >

                        <button
                            onClick={() => onNext?.()}
                        >

                            Next

                        </button>

                    </div>

                )

            }

        </div>

    );

}

export default Review;