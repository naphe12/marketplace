import {
  CheckCircle2,
  LogIn,
  Store,
  UserPlus,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  useAuth,
} from "../auth/AuthContext";


type AuthMode = "login" | "register";


export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    login,
    register,
  } = useAuth();

  const [mode, setMode] =
    useState<AuthMode>("login");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);


  function redirectAfterAuth() {
    const returnTo = searchParams.get("returnTo");
    const safeReturnTo =
      returnTo?.startsWith("/") &&
      !returnTo.startsWith("//")
        ? returnTo
        : "/";

    navigate(
      safeReturnTo,
      {
        replace: true,
      },
    );
  }


  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      if (mode === "register") {
        await register({
          phone,
          email: email.trim() || null,
          password,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        });
      } else {
        await login(
          phone,
          password,
        );
      }

      redirectAfterAuth();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "register"
            ? "Inscription impossible."
            : "Connexion impossible.",
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="auth-page auth-page--split">
      <form
        className="auth-card"
        onSubmit={submit}
      >
        <div className="auth-mode-switch" role="tablist" aria-label="Mode d'authentification">
          <button
            type="button"
            className={mode === "login" ? "auth-mode-switch__item auth-mode-switch__item--active" : "auth-mode-switch__item"}
            onClick={() => setMode("login")}
          >
            <LogIn size={16} />
            Connexion
          </button>

          <button
            type="button"
            className={mode === "register" ? "auth-mode-switch__item auth-mode-switch__item--active" : "auth-mode-switch__item"}
            onClick={() => setMode("register")}
          >
            <UserPlus size={16} />
            Inscription
          </button>
        </div>

        <h1>{mode === "register" ? "Créer un compte" : "Connexion"}</h1>

        {mode === "register" && (
          <div className="auth-grid-two">
            <label>
              Prénom
              <input
                value={firstName}
                onChange={event => setFirstName(event.target.value)}
                autoComplete="given-name"
              />
            </label>

            <label>
              Nom
              <input
                value={lastName}
                onChange={event => setLastName(event.target.value)}
                autoComplete="family-name"
              />
            </label>
          </div>
        )}

        <label>
          Téléphone

          <input
            type="tel"
            value={phone}
            onChange={event =>
              setPhone(
                event.target.value,
              )
            }
            placeholder="+257..."
            autoComplete="tel"
            required
          />
        </label>

        {mode === "register" && (
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="optionnel"
              autoComplete="email"
            />
          </label>
        )}

        <label>
          Mot de passe

          <input
            type="password"
            value={password}
            onChange={event =>
              setPassword(
                event.target.value,
              )
            }
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            required
          />
        </label>

        {mode === "register" && (
          <p className="auth-hint">
            Votre mot de passe doit contenir au moins 8 caractères.
            La vérification téléphone pourra être finalisée depuis votre compte
            dès que le flux SMS sera activé.
          </p>
        )}

        {mode === "login" && (
          <p className="auth-hint">
            Mot de passe oublié : le backend n'expose pas encore de récupération automatique.
          </p>
        )}

        {error && (
          <p className="form-error">
            {error}
          </p>
        )}

        <button
          className="primary-button inline-button"
          disabled={loading}
        >
          {mode === "register" ? <UserPlus size={17} /> : <LogIn size={17} />}
          {loading
            ? mode === "register"
              ? "Création..."
              : "Connexion..."
            : mode === "register"
              ? "Créer mon compte"
              : "Se connecter"}
        </button>
      </form>

      <aside className="auth-onboarding-card">
        <Store size={24} />
        <h2>Vendre sur MarketBI</h2>
        <p>
          Créez un compte, publiez une annonce, ajoutez vos photos,
          choisissez la localisation et suivez vos échanges depuis la messagerie.
        </p>

        <ul>
          <li><CheckCircle2 size={16} /> Brouillons sauvegardés automatiquement</li>
          <li><CheckCircle2 size={16} /> Offres et transactions suivies dans les messages</li>
          <li><CheckCircle2 size={16} /> Réputation construite après les ventes terminées</li>
        </ul>
      </aside>
    </div>
  );
}
