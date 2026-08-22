function NewSalePage() {
    return (
        <div
            style={{
                minHeight: "calc(100vh - 44px)",
                display: "grid",
                placeItems: "center",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "900px",
                    padding: "32px",
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    textAlign: "center",
                }}
            >
                <h1 style={{ margin: 0, color: "#0F172A", fontSize: "22px" }}>
                    New Sale
                </h1>
                <p style={{ margin: "8px 0 0", color: "#64748B", fontSize: "13px" }}>
                    The new table-based sales billing screen will be built here step by step.
                </p>
            </div>
        </div>
    );
}

export default NewSalePage;
