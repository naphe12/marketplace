import { NavLink } from "react-router-dom";

import { navigationItems } from "./navigation";


export default function BottomNav() {
  const mobileItems =
    navigationItems.filter(
      item =>
        item.label !== "Favoris",
    );

  return (
    <nav className="mobile-bottom-nav">
      {mobileItems.map(
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
                "mobile-nav-item",
                isActive
                  ? "mobile-nav-item--active"
                  : "",
                primary
                  ? "mobile-nav-item--publish"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")
            }
          >
            <div className="mobile-nav-icon">
              <Icon size={21} />
            </div>

            <span>{label}</span>
          </NavLink>
        ),
      )}
    </nav>
  );
}