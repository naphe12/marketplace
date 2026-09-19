import {
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../auth/AuthContext";


export default function LoginPage() {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);


  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await login(
        phone,
        password,
      );

      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Connexion impossible.",
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="auth-page">
      <form
        className="auth-card"
        onSubmit={submit}
      >
        <h1>Connexion</h1>

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
          />
        </label>

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
          />
        </label>

        {error && (
          <p className="form-error">
            {error}
          </p>
        )}

        <button
          className="primary-button"
          disabled={loading}
        >
          {loading
            ? "Connexion..."
            : "Se connecter"}
        </button>
      </form>
    </div>
  );
}