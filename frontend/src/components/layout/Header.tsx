import {
  Bell,
  ChevronRight,
  Heart,
  Plus,
  Search,
  SignalLow,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  apiRequest,
} from "../../api/client";

import {
  useAuth,
} from "../../auth/AuthContext";

import LanguageSwitcher from "../../i18n/LanguageSwitcher";
import { useLiteMode } from "../../offline/useLiteMode";
import { useCountry } from "../../market/CountryContext";
import {
  useI18n,
} from "../../i18n/I18nProvider";


export default function Header() {
  const navigate = useNavigate();

  const { user } = useAuth();

  const { t } = useI18n();
  const { countries, countryCode, setCountryCode } = useCountry();
  const liteMode = useLiteMode();

  const [unreadNotifications, setUnreadNotifications] =
    useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    let mounted = true;

    async function loadUnreadCount() {
      try {
        const result = await apiRequest<{ unread: number }>(
          "/notifications/unread-count",
          {
            authenticated: true,
          },
        );

        if (mounted) {
          setUnreadNotifications(result.unread);
        }
      } catch {
        if (mounted) {
          setUnreadNotifications(0);
        }
      }
    }

    void loadUnreadCount();

    const interval = window.setInterval(
      loadUnreadCount,
      30000,
    );

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [user]);

  return (
    <header className="app-header">
      <div className="mobile-brand">
        <Link to="/">
          <span className="brand-mark">M</span>
          <span>Markatos</span>
        </Link>
      </div>

      <button
        className="desktop-search"
        type="button"
        onClick={() =>
          navigate("/search")
        }
      >
        <Search size={19} />

        <span>
          {t("header.searchPlaceholder")}
        </span>
      </button>

      <div className="header-actions">
        <Link
          to="/publish"
          className="header-publish desktop-only"
        >
          <Plus size={18} />
          <span>{t("nav.publish")}</span>
        </Link>

        <Link
          to="/favorites"
          className="header-icon desktop-only"
          aria-label={t("header.favorites")}
        >
          <Heart size={21} />
        </Link>

        <Link
          to="/notifications"
          className="header-icon notification-icon"
          aria-label={t("header.notifications")}
        >
          <Bell size={21} />

          {unreadNotifications > 0 && (
            <span className="notification-dot">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>

        <label className="country-switcher" aria-label="Pays du marche">
          <select
            value={countryCode}
            onChange={event => setCountryCode(event.target.value)}
          >
            {countries.map(country => (
              <option key={country.code} value={country.code}>
                {country.code}
              </option>
            ))}
          </select>
        </label>

        <span
          className={liteMode ? "header-icon header-icon--active" : "header-icon"}
          aria-label={liteMode ? "Mode Lite automatique actif" : "Réseau normal"}
          title={liteMode ? "Mode Lite automatique actif" : "Réseau normal"}
          role="status"
        >
          <SignalLow size={21} />
        </span>

        <LanguageSwitcher />

        <Link
          to={
            user
              ? "/profile"
              : "/login"
          }
          className="desktop-profile"
        >
          <div className="profile-avatar">
            {user
              ? user.phone
                .replace("+257", "")
                .slice(0, 2)
              : "?"}
          </div>

          <div className="desktop-profile__meta">
            <strong>
              {user
                ? t("header.myAccount")
                : t("header.login")}
            </strong>

            <span>
              {user
                ? user.phone
                : t("header.signIn")}
            </span>
          </div>

          <ChevronRight size={16} />
        </Link>
      </div>
    </header>
  );
}
