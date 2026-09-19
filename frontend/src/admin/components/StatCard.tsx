import type {
  LucideIcon,
} from "lucide-react";


type Props = {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
};


export default function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: Props) {
  return (
    <article className="admin-stat-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>

      <div className="admin-stat-card__icon">
        <Icon size={21} />
      </div>
    </article>
  );
}
