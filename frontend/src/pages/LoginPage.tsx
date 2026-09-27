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
  apiRequest,
} from "../api/client";

import {
  useAuth,
} from "../auth/AuthContext";

import {
  useI18n,
} from "../i18n/I18nProvider";


type AuthMode = "login" | "register" | "reset";


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

  const [resetCode, setResetCode] =
    useState("");

  const [resetRequested, setResetRequested] =
    useState(false);

  const [notice, setNotice] =
    useState<string | null>(null);

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
    setNotice(null);

    try {
      if (mode === "reset") {
        if (!resetRequested) {
          await apiRequest(
            "/auth/password-reset/request",
            {
              method: "POST",
              body: JSON.stringify({ phone }),
            },
          );
          setResetRequested(true);
          setNotice("Si le compte existe, un code vient d'être envoyé.");
        } else {
          await apiRequest(
            "/auth/password-reset/confirm",
            {
              method: "POST",
              body: JSON.stringify({
                phone,
                code: resetCode,
                new_password: password,
              }),
            },
          );
          setMode("login");
          setResetRequested(false);
          setResetCode("");
          setPassword("");
          setNotice("Mot de passe mis à jour. Vous pouvez vous connecter.");
        }
        return;
      }

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

        <h1>{mode === "register" ? t("auth.createAccount") : mode === "reset" ? "Mot de passe oublié" : t("auth.login")}</h1>

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

        {mode === "reset" && resetRequested && (
          <label>
            Code reçu
            <input
              value={resetCode}
              onChange={event => setResetCode(event.target.value)}
              required
            />
          </label>
        )}

        {(mode !== "reset" || resetRequested) && (
          <label>
            {mode === "reset" ? "Nouveau mot de passe" : t("auth.password")}

            <input
              type="password"
              value={password}
              onChange={event =>
                setPassword(
                  event.target.value,
                )
              }
              minLength={mode === "register" || mode === "reset" ? 8 : undefined}
              autoComplete={mode === "register" || mode === "reset" ? "new-password" : "current-password"}
              required
            />
          </label>
        )}

        {mode === "register" && (
          <p className="auth-hint">
            {t("auth.registerHint")}
          </p>
        )}

        {mode === "login" && (
          <button type="button" className="text-button" onClick={() => { setMode("reset"); setError(null); setNotice(null); }}>
            Mot de passe oublié ?
          </button>
        )}

        {mode === "reset" && (
          <button type="button" className="text-button" onClick={() => { setMode("login"); setResetRequested(false); setResetCode(""); }}>
            Retour à la connexion
          </button>
        )}

        {notice && (
          <p className="auth-hint">
            {notice}
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
              : mode === "reset"
                ? "Traitement..."
                : t("auth.signingIn")
            : mode === "register"
              ? t("auth.createMyAccount")
              : mode === "reset"
                ? resetRequested ? "Réinitialiser" : "Recevoir un code"
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
