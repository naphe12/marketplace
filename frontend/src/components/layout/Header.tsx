import {
  Bell,
  Heart,
  Search,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../auth/AuthContext";


export default function Header() {
  const navigate = useNavigate();

  const { user } = useAuth();

  return (
    <header className="app-header">
      <div className="mobile-brand">
        <Link to="/">
          MarketBI
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
          Que recherchez-vous ?
        </span>
      </button>

      <div className="header-actions">
        <Link
          to="/favorites"
          className="header-icon desktop-only"
          aria-label="Favoris"
        >
          <Heart size={21} />
        </Link>

        <Link
          to="/notifications"
          className="header-icon notification-icon"
          aria-label="Notifications"
        >
          <Bell size={21} />

          <span className="notification-dot" />
        </Link>

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

          <div>
            <strong>
              {user
                ? "Mon compte"
                : "Connexion"}
            </strong>

            <span>
              {user
                ? user.phone
                : "Se connecter"}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}