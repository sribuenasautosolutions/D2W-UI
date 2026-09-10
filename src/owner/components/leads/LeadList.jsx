import React, { useEffect, useState } from "react";
import { Plus, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getLeads } from "../../../services/leadService";

function LeadList() {
    const navigate = useNavigate();

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(0);
    const [size] = useState(10);

    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const loadLeads = async () => {
        setLoading(true);

        try {
            const response = await getLeads(
                page,
                size,
                "createdAt",
                "DESC"
            );

            setLeads(response.content || []);
            setTotalPages(response.totalPages || 0);
            setTotalElements(response.totalElements || 0);
        } catch (error) {
            console.error("Unable to load leads:", error);

            alert(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Unable to load leads."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeads();
    }, [page]);

    const handlePrevious = () => {
        if (page > 0) {
            setPage(page - 1);
        }
    };

    const handleNext = () => {
        if (page < totalPages - 1) {
            setPage(page + 1);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "NEW":
                return {
                    background: "#EFF6FF",
                    color: "#1D4ED8",
                };

            case "READY_FOR_PROFORMA":
                return {
                    background: "#ECFDF5",
                    color: "#047857",
                };

            default:
                return {
                    background: "#F1F5F9",
                    color: "#475569",
                };
        }
    };

    return (
        <section
            style={{
                padding: "24px",
                background: "#F8FAFC",
                minHeight: "100%",
            }}
        >
            {/* HEADER */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "24px",
                }}
            >
                <div>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: "24px",
                            fontWeight: 700,
                            color: "#0F172A",
                        }}
                    >
                        Leads
                    </h1>

                    <p
                        style={{
                            margin: "6px 0 0",
                            color: "#64748B",
                            fontSize: "14px",
                        }}
                    >
                        Manage customer requirements and product identification
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        navigate("/owner/sales/leads/new")
                    }
                    style={primaryButtonStyle}
                >
                    <Plus size={16} />
                    Create Lead
                </button>
            </div>

            {/* SUMMARY */}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(3, minmax(0, 1fr))",
                    gap: "16px",
                    marginBottom: "20px",
                }}
            >
                <SummaryCard
                    title="Total Leads"
                    value={totalElements}
                />

                <SummaryCard
                    title="Current Page"
                    value={totalPages === 0 ? 0 : page + 1}
                />

                <SummaryCard
                    title="Total Pages"
                    value={totalPages}
                />
            </div>

            {/* TABLE */}

            <div
                style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    overflow: "hidden",
                }}
            >
                {loading ? (
                    <div
                        style={{
                            padding: "40px",
                            textAlign: "center",
                            color: "#64748B",
                        }}
                    >
                        Loading leads...
                    </div>
                ) : leads.length === 0 ? (
                    <div
                        style={{
                            padding: "40px",
                            textAlign: "center",
                            color: "#64748B",
                        }}
                    >
                        No leads found.
                    </div>
                ) : (
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                        }}
                    >
                        <thead>
                            <tr>
                                <th style={headerStyle}>
                                    Lead Number
                                </th>

                                <th style={headerStyle}>
                                    Customer
                                </th>

                                <th style={headerStyle}>
                                    Requirement
                                </th>

                                <th style={headerStyle}>
                                    Status
                                </th>

                                <th style={headerStyle}>
                                    Created
                                </th>

                                <th
                                    style={{
                                        ...headerStyle,
                                        textAlign: "center",
                                    }}
                                >
                                    Action
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {leads.map((lead) => {
                                const statusStyle =
                                    getStatusStyle(lead.status);

                                return (
                                    <tr key={lead.id}>
                                        <td style={cellStyle}>
                                            <strong>
                                                {lead.leadNumber || "-"}
                                            </strong>
                                        </td>

                                        <td style={cellStyle}>
                                            {lead.customerName || "-"}
                                        </td>

                                        <td style={cellStyle}>
                                            <div
                                                style={{
                                                    maxWidth: "300px",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                                title={
                                                    lead.customerRequirement ||
                                                    ""
                                                }
                                            >
                                                {lead.customerRequirement ||
                                                    "-"}
                                            </div>
                                        </td>

                                        <td style={cellStyle}>
                                            <span
                                                style={{
                                                    ...statusStyle,
                                                    padding:
                                                        "5px 10px",
                                                    borderRadius: "999px",
                                                    fontSize: "12px",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {lead.status || "-"}
                                            </span>
                                        </td>

                                        <td style={cellStyle}>
                                            {lead.createdAt
                                                ? new Date(
                                                      lead.createdAt
                                                  ).toLocaleString()
                                                : "-"}
                                        </td>

                                        <td
                                            style={{
                                                ...cellStyle,
                                                textAlign: "center",
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    navigate(
                                                        `/owner/sales/leads/${lead.id}`
                                                    )
                                                }
                                                style={viewButtonStyle}
                                            >
                                                <Eye size={15} />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* PAGINATION */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "15px",
                    marginTop: "20px",
                }}
            >
                <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={page === 0 || loading}
                    style={paginationButtonStyle}
                >
                    Previous
                </button>

                <span
                    style={{
                        fontSize: "14px",
                        color: "#475569",
                    }}
                >
                    Page {totalPages === 0 ? 0 : page + 1} of{" "}
                    {totalPages}
                </span>

                <button
                    type="button"
                    onClick={handleNext}
                    disabled={
                        page >= totalPages - 1 ||
                        loading ||
                        totalPages === 0
                    }
                    style={paginationButtonStyle}
                >
                    Next
                </button>
            </div>
        </section>
    );
}

function SummaryCard({ title, value }) {
    return (
        <div
            style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "18px",
            }}
        >
            <div
                style={{
                    fontSize: "12px",
                    color: "#64748B",
                    marginBottom: "8px",
                }}
            >
                {title}
            </div>

            <div
                style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#0F172A",
                }}
            >
                {value}
            </div>
        </div>
    );
}

const headerStyle = {
    textAlign: "left",
    padding: "14px",
    borderBottom: "1px solid #E2E8F0",
    fontWeight: "600",
    fontSize: "13px",
    color: "#475569",
    background: "#F8FAFC",
};

const cellStyle = {
    padding: "14px",
    borderBottom: "1px solid #F1F5F9",
    fontSize: "14px",
    color: "#334155",
};

const primaryButtonStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    border: "none",
    borderRadius: "7px",
    background: "#2563EB",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
};

const viewButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 12px",
    border: "1px solid #CBD5E1",
    borderRadius: "6px",
    background: "#FFFFFF",
    color: "#334155",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
};

const paginationButtonStyle = {
    padding: "8px 14px",
    border: "1px solid #CBD5E1",
    borderRadius: "6px",
    background: "#FFFFFF",
    cursor: "pointer",
};

export default LeadList;