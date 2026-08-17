import { CarFront, CircleCheck, Clock3, Layers3, Search, Tags } from "lucide-react";

const ICONS = {
    green: Search,
    amber: Tags,
    purple: Layers3,
    gray: Clock3,
};

// Purely presentational — renders whatever numbers the calling section
// already computed from its own existing state. No data fetching here.
function VehicleStatCard({ label, value, icon, tone = "blue" }) {
    const DefaultIcon = label.toLowerCase().includes("active")
        ? CircleCheck
        : ICONS[tone] || CarFront;
    const renderedIcon = typeof icon === "object" ? icon : <DefaultIcon size={20} />;

    return (
        <div className="vm-stat-card">
            <span className={`vm-stat-card-icon ${tone}`}>{renderedIcon}</span>
            <div className="vm-stat-card-content">
                <span className="vm-stat-card-label">{label}</span>
                <div className="vm-stat-card-value">{value}</div>
            </div>
        </div>
    );
}

export default VehicleStatCard;
