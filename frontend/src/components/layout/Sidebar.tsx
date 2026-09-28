import {
  CircleDollarSign,
  Sparkles,
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

import {
  useI18n,
} from "../../i18n/I18nProvider";


export default function Sidebar() {
  const { user } = useAuth();

  const { t } = useI18n();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          M
        </div>

        <div className="sidebar-brand-text">
          <strong>Markatos</strong>
          <span>{t("sidebar.marketplace")}</span>
        </div>
      </div>

      <div className="sidebar-insight">
        <Sparkles size={18} />

        <div>
          <strong>{t("sidebar.localMarketplace")}</strong>
          <span>{t("sidebar.localMarketplaceText")}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navigationItems.map(
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

              <span>{t(labelKey)}</span>
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
          <span>{t("nav.admin")}</span>
        </NavLink>
      )}

      <div className="sidebar-promo">
        <CircleDollarSign size={20} />
        <div>
          <strong>{t("sidebar.quickPublish")}</strong>
          <span>{t("sidebar.quickPublishText")}</span>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">
          {user?.phone
            ?.replace("+257", "")
            .slice(0, 2) ?? "?"}
        </div>

        <div className="sidebar-user">
          <strong>
            {user
              ? t("header.myAccount")
              : t("sidebar.visitor")}
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
