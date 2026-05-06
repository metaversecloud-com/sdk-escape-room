interface StatusPillProps {
  label: string;
  detail: string;
  color: string;
}

export const StatusPill = ({ label, detail, color }: StatusPillProps) => (
  <div
    className="er-status-pill"
    style={{
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: `${color}30`,
      boxShadow: `0 0 14px ${color}20`,
    }}
  >
    <p className="p2 er-status-pill__label" style={{ color }}>
      {label}
    </p>
    <p className="p2 er-status-pill__detail">{detail}</p>
  </div>
);

export default StatusPill;
