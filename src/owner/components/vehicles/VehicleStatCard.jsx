// Purely presentational — renders whatever numbers the calling section
// already computed from its own existing state. No data fetching here.
function VehicleStatCard({ label, value, icon = "📊", tone = "blue" }) {
    return (
        <div className="vm-stat-card">
            <div className="vm-stat-card-top">
                <span className="vm-stat-card-label">{label}</span>
                <span className={`vm-stat-card-icon ${tone}`}>{icon}</span>
            </div>
            <div className="vm-stat-card-value">{value}</div>
        </div>
    );
}

export default VehicleStatCard;
