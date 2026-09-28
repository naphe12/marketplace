import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { apiRequest } from "../../api/client";
import type { AdminSettings } from "../types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [freeDays, setFreeDays] = useState(30);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<AdminSettings>("/admin/settings", { authenticated: true })
      .then(result => {
        setSettings(result);
        setPaymentEnabled(result.listing_payment_enabled);
        setFreeDays(result.free_listing_duration_days);
      })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les paramètres."));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const result = await apiRequest<AdminSettings>("/admin/settings", {
        method: "PATCH",
        authenticated: true,
        body: JSON.stringify({
          listing_payment_enabled: paymentEnabled,
          free_listing_duration_days: freeDays,
        }),
      });

      setSettings(result);
      setPaymentEnabled(result.listing_payment_enabled);
      setFreeDays(result.free_listing_duration_days);
      setSuccess("Paramètres enregistrés.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d'enregistrer les paramètres.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span>Publication</span>
          <h1>Publication gratuite par défaut</h1>
          <p>Activez les packages payants seulement quand vous voulez obliger les vendeurs à choisir un package.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      {settings && (
        <form className="admin-panel admin-stack admin-settings-form" onSubmit={save}>
          <div className="admin-settings-toggle-row">
            <div>
              <strong>Packages payants</strong>
              <span>{paymentEnabled ? "Activés" : "Désactivés"}</span>
            </div>
            <button
              type="button"
              className={`admin-switch${paymentEnabled ? " admin-switch--on" : ""}`}
              aria-pressed={paymentEnabled}
              onClick={() => setPaymentEnabled(value => !value)}
            >
              <span>{paymentEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>

          <label className="admin-editor-grid admin-settings-days">
            <span>Nombre de jours gratuits</span>
            <input
              type="number"
              min="1"
              max="365"
              value={freeDays}
              onChange={event => setFreeDays(Number(event.target.value))}
            />
            <span>jours</span>
          </label>

          <button type="submit" className="primary-button inline-button" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      )}
    </section>
  );
}
