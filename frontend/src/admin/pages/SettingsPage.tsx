import { useEffect, useState } from "react";

import { apiRequest } from "../../api/client";
import type { AdminSettings } from "../types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<AdminSettings>("/admin/settings", { authenticated: true })
      .then(setSettings)
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les paramètres."));
  }, []);

  async function update(changes: Partial<AdminSettings>) {
    const result = await apiRequest<AdminSettings>("/admin/settings", {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify(changes),
    });
    setSettings(result);
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span>Publication</span>
          <h1>Publication gratuite / payante</h1>
          <p>Ces paramètres sont appliqués immédiatement par le backend au moment de publier.</p>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      {settings && (
        <div className="admin-panel admin-stack">
          <label className="admin-toggle-row">
            <span>Publication payante</span>
            <input type="checkbox" checked={settings.listing_payment_enabled} onChange={event => update({ listing_payment_enabled: event.target.checked })} />
          </label>
          <label className="admin-editor-grid">
            <span>Durée gratuite</span>
            <input type="number" min="1" max="365" value={settings.free_listing_duration_days} onChange={event => update({ free_listing_duration_days: Number(event.target.value) })} />
            <span>jours</span>
          </label>
        </div>
      )}
    </section>
  );
}
