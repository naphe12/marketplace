import { useEffect, useMemo, useState } from "react";

import { apiRequest, downloadApiFile } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminReview } from "../types";
import "../styles/admin-tables.css";

export default function ReviewsPage() {
  const [filters, setFilters] = useState({ status: "", reviewer_id: "", reviewed_user_id: "", transaction_id: "", rating_min: "", rating_max: "" });
  const [items, setItems] = useState<AdminReview[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    return params.toString();
  }, [filters]);

  useEffect(() => {
    apiRequest<{ items: AdminReview[] }>(`/admin/reviews${query ? `?${query}` : ""}`, { authenticated: true })
      .then(data => setItems(data.items))
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les avis."));
  }, [query, attempt]);

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  async function exportCsv() {
    await downloadApiFile(`/admin/reviews?${query ? `${query}&` : ""}format=csv`, "reviews.csv");
  }

  async function action(item: AdminReview, actionName: "hide" | "restore") {
    if (actionName === "hide" && !window.confirm("Masquer ce commentaire abusif ?")) return;
    await apiRequest(`/admin/reviews/${item.id}/${actionName}`, { method: "POST", authenticated: true, body: JSON.stringify({ reason: "Modération du commentaire." }) });
    setAttempt(value => value + 1);
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>Réputation</span><h1>Avis</h1><p>La note reste intacte. Seul le commentaire abusif peut être masqué ou restauré.</p></div><button type="button" className="secondary-button" onClick={() => void exportCsv()}>Export CSV</button></div>
      <form className="admin-filters">
        <select value={filters.status} onChange={event => setFilter("status", event.target.value)}><option value="">Tous statuts</option><option value="PUBLISHED">PUBLISHED</option><option value="HIDDEN">HIDDEN</option></select>
        <input placeholder="Auteur ID" value={filters.reviewer_id} onChange={event => setFilter("reviewer_id", event.target.value)} />
        <input placeholder="Cible ID" value={filters.reviewed_user_id} onChange={event => setFilter("reviewed_user_id", event.target.value)} />
        <input placeholder="Transaction ID" value={filters.transaction_id} onChange={event => setFilter("transaction_id", event.target.value)} />
        <input type="number" min="1" max="5" placeholder="Note min" value={filters.rating_min} onChange={event => setFilter("rating_min", event.target.value)} />
        <input type="number" min="1" max="5" placeholder="Note max" value={filters.rating_max} onChange={event => setFilter("rating_max", event.target.value)} />
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-table-shell"><div className="admin-table-scroll">
        <DataTable rows={items} emptyLabel="Aucun avis." columns={[
          { key: "rating", label: "Note", render: row => `${row.rating}/5` },
          { key: "comment", label: "Commentaire", render: row => row.comment ?? "-" },
          { key: "transaction", label: "Transaction", render: row => row.transaction_id },
          { key: "users", label: "Auteur / cible", render: row => `${row.reviewer_id} → ${row.reviewed_user_id}` },
          { key: "status", label: "Statut", render: row => <StatusBadge tone={row.status === "PUBLISHED" ? "success" : "warning"}>{row.status}</StatusBadge> },
          { key: "actions", label: "Actions", render: row => <div className="admin-row-actions"><button type="button" onClick={() => action(row, "hide")}>Masquer</button><button type="button" onClick={() => action(row, "restore")}>Restaurer</button></div> },
        ]} />
      </div></div>
    </section>
  );
}
