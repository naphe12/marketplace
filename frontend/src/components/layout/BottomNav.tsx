import { NavLink } from "react-router-dom";

import { useI18n } from "../../i18n/I18nProvider";

import { navigationItems } from "./navigation";


export default function BottomNav() {
  const { t } = useI18n();

  const mobileItems =
    navigationItems.filter(
      item =>
        item.labelKey !== "nav.favorites",
    );

  return (
    <nav className="mobile-bottom-nav">
      {mobileItems.map(
        ({
          to,
          labelKey,
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

            <span>{t(labelKey)}</span>
          </NavLink>
        ),
      )}
    </nav>
  );
}