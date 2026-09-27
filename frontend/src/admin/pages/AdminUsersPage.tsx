import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminListResponse, AdminUser } from "../types";
import { downloadCsv } from "../utils/csv";
import "../styles/admin-tables.css";

const PAGE_SIZE = 25;

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<AdminListResponse<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(PAGE_SIZE),
    });

    if (query.trim()) {
      params.set("q", query.trim());
    }

    setLoading(true);
    setError("");

    apiRequest<AdminListResponse<AdminUser>>(`/admin/users?${params}`, {
      authenticated: true,
    })
      .then(result => {
        setData({
          ...result,
          items: result.items.filter(user => user.is_admin),
          total: result.items.filter(user => user.is_admin).length,
          has_more: result.has_more,
        });
      })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les administrateurs."))
      .finally(() => setLoading(false));
  }, [query, offset, attempt]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setAttempt(value => value + 1);
  }

  function exportCsv() {
    downloadCsv(
      "administrateurs.csv",
      (data?.items ?? []).map(user => ({
        id: user.id,
        phone: user.phone,
        email: user.email,
        country_code: user.country_code,
        status: user.status,
        phone_verified: user.phone_verified,
        created_at: user.created_at,
      })),
    );
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span>Accès administration</span>
          <h1>Administrateurs</h1>
          <p>Consultez les comptes ayant accès à l'administration et ouvrez leur fiche utilisateur.</p>
        </div>
      </div>

      <div className="admin-toolbar-row">
        <form className="admin-filters" onSubmit={submit}>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Téléphone ou email"
          />
          <button type="submit">Filtrer</button>
        </form>

        <button
          type="button"
          className="secondary-button"
          disabled={!data?.items.length}
          onClick={exportCsv}
        >
          Exporter CSV
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p role="status">Chargement...</p>}

      <div className="admin-table-shell">
        <div className="admin-table-scroll">
          <DataTable
            rows={data?.items ?? []}
            emptyLabel="Aucun administrateur trouvé."
            columns={[
              { key: "phone", label: "Téléphone", render: row => row.phone },
              { key: "email", label: "Email", render: row => row.email ?? "-" },
              { key: "country", label: "Pays", render: row => row.country_code },
              { key: "status", label: "Statut", render: row => <StatusBadge tone={row.status === "ACTIVE" ? "success" : "warning"}>{row.status}</StatusBadge> },
              { key: "verified", label: "Vérifié", render: row => row.phone_verified ? "Oui" : "Non" },
              { key: "actions", label: "Actions", render: row => <Link className="text-button" to={`/admin/users/${row.id}`}>Voir fiche</Link> },
            ]}
          />
        </div>
      </div>

      {data && (
        <div className="admin-pagination">
          <span>{data.items.length} administrateur(s) affiché(s)</span>
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Précédent</button>
          <button type="button" disabled={!data.has_more} onClick={() => setOffset(offset + PAGE_SIZE)}>Suivant</button>
        </div>
      )}
    </section>
  );
}
