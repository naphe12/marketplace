import {
  useEffect,
  useState,
} from "react";

import {
  apiRequest,
} from "../../api/client";

import type {
  AdminAuditLog,
} from "../types";


type Props = {
  targetType: "USER" | "LISTING";
  targetId: string;
};

export default function AdminEntityAuditPanel({
  targetType,
  targetId,
}: Props) {
  const [items, setItems] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({
      target_type: targetType,
      target_id: targetId,
    });

    setLoading(true);
    setError("");

    apiRequest<{ items: AdminAuditLog[] }>(
      `/admin/audit?${params}`,
      {
        authenticated: true,
      },
    )
      .then(data => setItems(data.items))
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger l'audit."))
      .finally(() => setLoading(false));
  }, [targetType, targetId]);

  return (
    <section className="admin-panel admin-entity-audit">
      <h2>Historique admin</h2>
      {error && <p className="form-error">{error}</p>}
      {loading && <p role="status">Chargement de l'historique...</p>}
      {!loading && items.length === 0 && <p>Aucune action enregistrée.</p>}
      <div className="admin-entity-audit-list">
        {items.map(item => (
          <article key={item.id} className="admin-note-card">
            <strong>{item.action}</strong>
            <small>{new Date(item.created_at).toLocaleString("fr-FR")} · {item.actor_user_id}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
