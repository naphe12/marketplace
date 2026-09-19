import { useEffect, useState } from "react";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import type { AdminAuditLog } from "../types";

export default function AuditLogsPage() {
  const [items, setItems] = useState<AdminAuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ items: AdminAuditLog[] }>("/admin/audit", { authenticated: true })
      .then(data => setItems(data.items))
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger l'audit."));
  }, []);

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>Lecture seule</span><h1>Audit</h1><p>Journal non modifiable des actions sensibles effectuées dans l'administration.</p></div></div>
      {error && <p className="form-error">{error}</p>}
      <DataTable rows={items} emptyLabel="Aucune entrée d'audit." columns={[
        { key: "time", label: "Heure", render: row => new Date(row.created_at).toLocaleString("fr-FR") },
        { key: "actor", label: "Admin", render: row => row.actor_user_id },
        { key: "action", label: "Action", render: row => row.action },
        { key: "target", label: "Cible", render: row => `${row.target_type}${row.target_id ? ` ${row.target_id}` : ""}` },
        { key: "metadata", label: "Métadonnées", render: row => row.metadata_json ? JSON.stringify(row.metadata_json) : "-" },
      ]} />
    </section>
  );
}
