import { useEffect, useState, type FormEvent } from "react";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminListResponse, AdminListing } from "../types";
import "../styles/admin-tables.css";
const PAGE_SIZE = 25;
const statuses = ["ACTIVE", "DRAFT", "PENDING_PAYMENT", "RESERVED", "SOLD", "EXPIRED", "SUSPENDED", "REMOVED", "REJECTED"];

export default function ListingsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<AdminListResponse<AdminListing> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);

    setLoading(true);
    setError("");
    apiRequest<AdminListResponse<AdminListing>>(`/admin/listings?${params}`, { authenticated: true })
      .then(setData)
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les annonces."))
      .finally(() => setLoading(false));
  }, [query, status, offset, attempt]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setAttempt(value => value + 1);
  }

  async function action(listing: AdminListing, actionName: "suspend" | "restore" | "remove") {
    if (actionName !== "restore" && !window.confirm(`Confirmer l'action ${actionName} sur cette annonce ?`)) {
      return;
    }
    await apiRequest(`/admin/listings/${listing.id}/${actionName}`, {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({ reason: "Action depuis l'administration" }),
    });
    setAttempt(value => value + 1);
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span>Inventaire</span>
          <h1>Annonces</h1>
          <p>Recherchez par titre, vendeur, catégorie ou localisation et intervenez sans suppression définitive.</p>
        </div>
      </div>

      <form className="admin-filters" onSubmit={submit}>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Titre, vendeur, catégorie, localisation" />
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">Tous statuts</option>
          {statuses.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type="submit">Filtrer</button>
      </form>

      {error && <p className="form-error">{error}</p>}
      {loading && <p role="status">Chargement...</p>}
      <div className="admin-table-shell">
        <div className="admin-table-scroll">

      <DataTable
        rows={data?.items ?? []}
        emptyLabel="Aucune annonce."
        columns={[
          { key: "title", label: "Titre", render: row => row.title || "Sans titre" },
          { key: "seller", label: "Vendeur", render: row => row.seller_id },
          { key: "price", label: "Prix", render: row => row.price ? `${formatNumber(row.price)} ${row.currency}` : "-" },
          { key: "status", label: "Statut", render: row => <StatusBadge tone={row.status === "ACTIVE" ? "success" : "warning"}>{row.status}</StatusBadge> },
          { key: "expires", label: "Expiration", render: row => row.expires_at ? new Date(row.expires_at).toLocaleDateString("fr-FR") : "-" },
          { key: "actions", label: "Actions", render: row => <div className="admin-row-actions"><button type="button" onClick={() => action(row, "suspend")}>Suspendre</button><button type="button" onClick={() => action(row, "restore")}>Restaurer</button><button type="button" onClick={() => action(row, "remove")}>Retirer</button></div> },
        ]}
      />
        </div>
      </div>

      {data && (
        <div className="admin-pagination">
          <span>{data.total} annonce(s)</span>
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Précédent</button>
          <button type="button" disabled={!data.has_more} onClick={() => setOffset(offset + PAGE_SIZE)}>Suivant</button>
        </div>
      )}
    </section>
  );
}

function formatNumber(value: string | number) {
  return new Intl.NumberFormat("fr-FR").format(Number(value));
}
