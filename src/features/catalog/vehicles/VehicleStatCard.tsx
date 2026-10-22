import {
  Boxes,
  CheckCircle2,
  MinusCircle,
  Sparkles,
  CarFront,
  Tags,
  Layers3,
} from "lucide-react";

// Semantic tone → icon mapping.
// - blue  : neutral count
// - green : active / positive
// - gray  : inactive / neutral-muted
// - amber : informational / attention
// - purple: grouping / tag
const TONE_ICONS = {
  blue: Boxes,
  green: CheckCircle2,
  gray: MinusCircle,
  amber: Sparkles,
  purple: Layers3,
};

function VehicleStatCard({ label, value, icon = null, tone = "blue" }: any) {
  const Icon = icon || TONE_ICONS[tone] || CarFront;

  return (
    <div className="vm-stat-card">
      <span className={`vm-stat-card-icon ${tone}`}>
        <Icon size={18} strokeWidth={2.25} />
      </span>
      <div className="vm-stat-card-content">
        <span className="vm-stat-card-label">{label}</span>
        <div className="vm-stat-card-value">{value}</div>
      </div>
    </div>
  );
}

export default VehicleStatCard;
