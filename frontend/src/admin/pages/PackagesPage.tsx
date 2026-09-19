import { useEffect, useState, type FormEvent } from "react";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminListingPackage } from "../types";

const emptyPackage = { code: "", name: "", duration_days: 30, price: "", currency: "BIF", active: true, sort_order: 0 };

export default function PackagesPage() {
  const [items, setItems] = useState<AdminListingPackage[]>([]);
  const [draft, setDraft] = useState(emptyPackage);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<AdminListingPackage[]>("/admin/listing-packages", { authenticated: true })
      .then(setItems)
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les packages."));
  }, [attempt]);

  async function create(event: FormEvent) {
    event.preventDefault();
    await apiRequest("/admin/listing-packages", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({ ...draft, price: Number(draft.price) }),
    });
    setDraft(emptyPackage);
    setAttempt(value => value + 1);
  }

  async function update(item: AdminListingPackage, changes: Partial<AdminListingPackage>) {
    await apiRequest(`/admin/listing-packages/${item.id}`, {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify(changes),
    });
    setAttempt(value => value + 1);
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>Tarifs publication</span><h1>Packages</h1><p>Désactivez un ancien package plutôt que de le supprimer.</p></div></div>
      {error && <p className="form-error">{error}</p>}
      <form className="admin-filters" onSubmit={create}>
        <input placeholder="Code" value={draft.code} onChange={event => setDraft({ ...draft, code: event.target.value })} />
        <input placeholder="Nom" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />
        <input type="number" placeholder="Durée" value={draft.duration_days} onChange={event => setDraft({ ...draft, duration_days: Number(event.target.value) })} />
        <input type="number" placeholder="Prix" value={draft.price} onChange={event => setDraft({ ...draft, price: event.target.value })} />
        <button type="submit">Créer</button>
      </form>
      <DataTable rows={items} emptyLabel="Aucun package." columns={[
        { key: "name", label: "Package", render: row => row.name },
        { key: "duration", label: "Durée", render: row => `${row.duration_days} jours` },
        { key: "price", label: "Prix", render: row => `${Number(row.price).toLocaleString("fr-FR")} ${row.currency}` },
        { key: "status", label: "Statut", render: row => <StatusBadge tone={row.active ? "success" : "neutral"}>{row.active ? "actif" : "inactif"}</StatusBadge> },
        { key: "actions", label: "Actions", render: row => <div className="admin-row-actions"><button type="button" onClick={() => update(row, { active: !row.active })}>{row.active ? "Désactiver" : "Activer"}</button><button type="button" onClick={() => update(row, { price: prompt("Nouveau prix", row.price) ?? row.price })}>Modifier prix</button></div> },
      ]} />
    </section>
  );
}
