import {
  NavLink,
} from "react-router-dom";

import {
  adminNavigationItems,
} from "./adminNavigation";


export default function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <NavLink
        to="/admin"
        className="admin-brand"
      >
        <span>MB</span>

        <div>
          <strong>MarketBI</strong>
          <small>Administration</small>
        </div>
      </NavLink>

      <nav className="admin-nav">
        {adminNavigationItems.map(
          ({
            to,
            label,
            icon: Icon,
            end,
          }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  "admin-nav-item",
                  isActive
                    ? "admin-nav-item--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              <Icon size={18} />

              <span>{label}</span>
            </NavLink>
          ),
        )}
      </nav>
    </aside>
  );
}
