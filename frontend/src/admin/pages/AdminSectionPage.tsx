import type {
  LucideIcon,
} from "lucide-react";

import {
  ArrowRight,
} from "lucide-react";


type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  sees: string[];
  actions?: string[];
};


export default function AdminSectionPage({
  title,
  description,
  icon: Icon,
  sees,
  actions = [],
}: Props) {
  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span>Module admin</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        <div className="admin-page-icon">
          <Icon size={26} />
        </div>
      </div>

      <div className="admin-module-grid">
        <div className="admin-module-card">
          <h2>Ce que l'admin voit</h2>

          <div className="admin-action-list">
            {sees.map(item => (
              <div key={item}>
                <ArrowRight size={16} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-module-card">
          <h2>Actions principales</h2>

          <div className="admin-action-list">
            {actions.map(action => (
              <div key={action}>
                <ArrowRight size={16} />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
