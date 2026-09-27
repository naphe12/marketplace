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

import {
  useI18n,
} from "../i18n/I18nProvider";


type AuthMode = "login" | "register";


export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    login,
    register,
  } = useAuth();

  const { t } = useI18n();

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
            ? t("auth.registerError")
            : t("auth.loginError"),
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
        <div className="auth-mode-switch" role="tablist" aria-label={`${t("auth.login")} / ${t("auth.register")}`}>
          <button
            type="button"
            className={mode === "login" ? "auth-mode-switch__item auth-mode-switch__item--active" : "auth-mode-switch__item"}
            onClick={() => setMode("login")}
          >
            <LogIn size={16} />
            {t("auth.login")}
          </button>

          <button
            type="button"
            className={mode === "register" ? "auth-mode-switch__item auth-mode-switch__item--active" : "auth-mode-switch__item"}
            onClick={() => setMode("register")}
          >
            <UserPlus size={16} />
            {t("auth.register")}
          </button>
        </div>

        <h1>{mode === "register" ? t("auth.createAccount") : t("auth.login")}</h1>

        {mode === "register" && (
          <div className="auth-grid-two">
            <label>
              {t("auth.firstName")}
              <input
                value={firstName}
                onChange={event => setFirstName(event.target.value)}
                autoComplete="given-name"
              />
            </label>

            <label>
              {t("auth.lastName")}
              <input
                value={lastName}
                onChange={event => setLastName(event.target.value)}
                autoComplete="family-name"
              />
            </label>
          </div>
        )}

        <label>
          {t("auth.phone")}

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
            {t("auth.email")}
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder={t("auth.optional")}
              autoComplete="email"
            />
          </label>
        )}

        <label>
          {t("auth.password")}

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
            {t("auth.registerHint")}
          </p>
        )}

        {mode === "login" && (
          <p className="auth-hint">
            {t("auth.forgotHint")}
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
              ? t("auth.creating")
              : t("auth.signingIn")
            : mode === "register"
              ? t("auth.createMyAccount")
              : t("auth.signIn")}
        </button>
      </form>

      <aside className="auth-onboarding-card">
        <Store size={24} />
        <h2>{t("auth.sellerTitle")}</h2>
        <p>
          {t("auth.sellerText")}
        </p>

        <ul>
          <li><CheckCircle2 size={16} /> {t("auth.bulletDrafts")}</li>
          <li><CheckCircle2 size={16} /> {t("auth.bulletOffers")}</li>
          <li><CheckCircle2 size={16} /> {t("auth.bulletReputation")}</li>
        </ul>
      </aside>
    </div>
  );
}
