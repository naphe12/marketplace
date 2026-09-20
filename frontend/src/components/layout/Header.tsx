import {
  Bell,
  ChevronRight,
  Heart,
  Plus,
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
          <span className="brand-mark">M</span>
          <span>MarketBI</span>
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
          Rechercher un produit, une ville, une marque...
        </span>
      </button>

      <div className="header-actions">
        <Link
          to="/publish"
          className="header-publish desktop-only"
        >
          <Plus size={18} />
          <span>Publier</span>
        </Link>

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

          <div className="desktop-profile__meta">
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

          <ChevronRight size={16} />
        </Link>
      </div>
    </header>
  );
}
