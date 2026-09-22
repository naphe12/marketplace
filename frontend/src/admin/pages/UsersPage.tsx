import { useEffect, useState, type FormEvent } from "react";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminListResponse, AdminUser } from "../types";
import "../styles/admin-tables.css";
const PAGE_SIZE = 25;

export default function UsersPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [accountType, setAccountType] = useState("");
  const [verified, setVerified] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<AdminListResponse<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (accountType) params.set("account_type", accountType);
    if (verified) params.set("verified", verified);

    setLoading(true);
    setError("");
    apiRequest<AdminListResponse<AdminUser>>(`/admin/users?${params}`, { authenticated: true })
      .then(setData)
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les utilisateurs."))
      .finally(() => setLoading(false));
  }, [query, status, accountType, verified, offset, attempt]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setAttempt(value => value + 1);
  }

  async function action(user: AdminUser, actionName: "suspend" | "block" | "restore") {
    if (actionName !== "restore" && !window.confirm(`Confirmer l'action ${actionName} sur ${user.phone} ?`)) {
      return;
    }
    await apiRequest(`/admin/users/${user.id}/${actionName}`, {
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
          <span>Comptes</span>
          <h1>Utilisateurs</h1>
          <p>Recherchez par nom, téléphone ou email, puis modérez le statut du compte.</p>
        </div>
      </div>

      <form className="admin-filters" onSubmit={submit}>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom, téléphone, email" />
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">Tous statuts</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="BLOCKED">BLOCKED</option>
        </select>
        <select value={accountType} onChange={event => setAccountType(event.target.value)}>
          <option value="">Tous types</option>
          <option value="INDIVIDUAL">INDIVIDUAL</option>
          <option value="BUSINESS">BUSINESS</option>
        </select>
        <select value={verified} onChange={event => setVerified(event.target.value)}>
          <option value="">Téléphone vérifié</option>
          <option value="true">Oui</option>
          <option value="false">Non</option>
        </select>
        <button type="submit">Filtrer</button>
      </form>

      {error && <p className="form-error">{error}</p>}
      {loading && <p role="status">Chargement...</p>}
      <div className="admin-table-shell">
        <div className="admin-table-scroll">

      <DataTable
        rows={data?.items ?? []}
        emptyLabel="Aucun utilisateur."
        columns={[
          { key: "phone", label: "Téléphone", render: row => row.phone },
          { key: "email", label: "Email", render: row => row.email ?? "-" },
          { key: "type", label: "Type", render: row => row.account_type },
          { key: "status", label: "Statut", render: row => <StatusBadge tone={row.status === "ACTIVE" ? "success" : "warning"}>{row.status}</StatusBadge> },
          { key: "verified", label: "Vérifié", render: row => row.phone_verified ? "Oui" : "Non" },
          { key: "actions", label: "Actions", render: row => <div className="admin-row-actions"><button type="button" onClick={() => action(row, "suspend")}>Suspendre</button><button type="button" onClick={() => action(row, "block")}>Bloquer</button><button type="button" onClick={() => action(row, "restore")}>Restaurer</button></div> },
        ]}
      />
        </div>
      </div>

      {data && (
        <div className="admin-pagination">
          <span>{data.total} utilisateur(s)</span>
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Précédent</button>
          <button type="button" disabled={!data.has_more} onClick={() => setOffset(offset + PAGE_SIZE)}>Suivant</button>
        </div>
      )}
    </section>
  );
}
