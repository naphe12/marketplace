import {
  ShieldCheck,
} from "lucide-react";

import {
  NavLink,
} from "react-router-dom";

import {
  navigationItems,
} from "./navigation";

import {
  useAuth,
} from "../../auth/AuthContext";


export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          M
        </div>

        <div className="sidebar-brand-text">
          <strong>MarketBI</strong>
          <span>Marketplace</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navigationItems.map(
          ({
            to,
            label,
            icon: Icon,
            primary,
          }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "sidebar-item",
                  isActive
                    ? "sidebar-item--active"
                    : "",
                  primary
                    ? "sidebar-item--publish"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              <Icon size={21} />

              <span>{label}</span>
            </NavLink>
          ),
        )}
      </nav>

      {user?.is_admin && (
        <NavLink
          to="/admin"
          className="sidebar-item"
        >
          <ShieldCheck size={21} />
          <span>Administration</span>
        </NavLink>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-avatar">
          {user?.phone
            ?.replace("+257", "")
            .slice(0, 2) ?? "?"}
        </div>

        <div className="sidebar-user">
          <strong>
            {user
              ? "Mon compte"
              : "Visiteur"}
          </strong>

          {user && (
            <span>
              {user.phone}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}