import { useEffect, useState } from "react";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminReview } from "../types";
import "../styles/admin-tables.css";
export default function ReviewsPage() {
  const [items, setItems] = useState<AdminReview[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ items: AdminReview[] }>("/admin/reviews", { authenticated: true })
      .then(data => setItems(data.items))
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les avis."));
  }, [attempt]);

  async function action(item: AdminReview, actionName: "hide" | "restore") {
    if (actionName === "hide" && !window.confirm("Masquer ce commentaire abusif ?")) {
      return;
    }
    await apiRequest(`/admin/reviews/${item.id}/${actionName}`, {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({ reason: "Modération du commentaire." }),
    });
    setAttempt(value => value + 1);
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>Réputation</span><h1>Avis</h1><p>La note reste intacte. Seul le commentaire abusif peut être masqué ou restauré.</p></div></div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-table-shell">
        <div className="admin-table-scroll">
      <DataTable rows={items} emptyLabel="Aucun avis." columns={[
        { key: "rating", label: "Note", render: row => `${row.rating}/5` },
        { key: "comment", label: "Commentaire", render: row => row.comment ?? "-" },
        { key: "transaction", label: "Transaction", render: row => row.transaction_id },
        { key: "users", label: "Auteur / cible", render: row => `${row.reviewer_id} → ${row.reviewed_user_id}` },
        { key: "status", label: "Statut", render: row => <StatusBadge tone={row.status === "PUBLISHED" ? "success" : "warning"}>{row.status}</StatusBadge> },
        { key: "actions", label: "Actions", render: row => <div className="admin-row-actions"><button type="button" onClick={() => action(row, "hide")}>Masquer</button><button type="button" onClick={() => action(row, "restore")}>Restaurer</button></div> },
      ]} />
    </div>
</div >
    </section>
  );
}
