import type {
  LucideIcon,
} from "lucide-react";


type Props = {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
  trend?: string;
};


export default function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
  trend,
}: Props) {
  return (
    <article className={`admin-stat-card admin-stat-card--${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>

      <div className="admin-stat-card__icon">
        <Icon size={21} />
      </div>

      {trend && (
        <em>{trend}</em>
      )}
    </article>
  );
}
