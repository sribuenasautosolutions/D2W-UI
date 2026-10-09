import { useEffect, useState } from "react";

import { getApprovalReview } from "../../../services/localProductService";

function Review({
    selectedApproval,
    reviewData,
    setReviewData,
    onNext,
    hidden = false,
}) {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedApproval) {
            loadReview();
        } else {
            setReviewData(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedApproval]);

    const loadReview = async () => {
        const startTime = performance.now();
        try {
            setLoading(true);
            console.log("Review API started");

            const response = await getApprovalReview(
                selectedApproval.approvalRequestId
            );

            console.log(
                "Review API time:",
                (performance.now() - startTime).toFixed(2),
                "ms"
            );
            console.log("Approval Review :", response);

            setReviewData(response);

            requestAnimationFrame(() => {
                console.log(
                    "Review UI rendered/painted:",
                    (performance.now() - startTime).toFixed(2),
                    "ms"
                );
            });
        } catch (error) {
            console.error("Review API failed:", error);
        } finally {
            setLoading(false);
            console.log(
                "Review load finished:",
                (performance.now() - startTime).toFixed(2),
                "ms"
            );
        }
    };

    // =========================================================
    //  HEADLESS MODE — used by ProductApprovalPage
    //  Fetches data but renders nothing visible.
    // =========================================================
    if (hidden) {
        return null;
    }

    // =========================================================
    //  STANDALONE MODE — original behavior (not used anymore
    //  by the modal, but kept so nothing else breaks)
    // =========================================================

    if (!selectedApproval) {
        return (
            <div className="vc-card">
                <h2>Review Product</h2>
                <p>Select a pending product to review.</p>
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
            {/* ... your original UI stays here unchanged ... */}
            <h2>Review Product</h2>
            <hr />
            <h3>Local Product</h3>
            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: "20px",
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
                </tbody>
            </table>

            <hr />
            <h3>Existing Product</h3>
            {existing ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                        <tr>
                            <td><strong>Product Name</strong></td>
                            <td>{existing.itemName}</td>
                        </tr>
                        <tr>
                            <td><strong>Part Number</strong></td>
                            <td>{existing.partNumber}</td>
                        </tr>
                        <tr>
                            <td><strong>Brand</strong></td>
                            <td>{existing.brandName}</td>
                        </tr>
                        <tr>
                            <td><strong>Category</strong></td>
                            <td>{existing.categoryName}</td>
                        </tr>
                    </tbody>
                </table>
            ) : (
                <div
                    style={{
                        padding: "15px",
                        background: "#EEF6FF",
                        border: "1px solid #BFDBFE",
                        borderRadius: "8px",
                    }}
                >
                    No Matching Product Found.
                </div>
            )}

            {reviewData?.canCreate && (
                <div
                    className="vc-card-actions"
                    style={{ marginTop: "20px", textAlign: "right" }}
                >
                    <button onClick={() => onNext?.()}>Next</button>
                </div>
            )}
        </div>
    );
}

export default Review;