import { useEffect, useState } from "react";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminVerification } from "../types";

const tabs = ["PENDING", "VERIFIED", "REJECTED"];

export default function VerificationsPage() {
  const [status, setStatus] = useState("PENDING");
  const [items, setItems] = useState<AdminVerification[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ items: AdminVerification[] }>(`/admin/verifications?status=${status}`, { authenticated: true })
      .then(data => setItems(data.items))
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les vérifications."));
  }, [status, attempt]);

  async function review(item: AdminVerification, decision: "VERIFIED" | "REJECTED") {
    await apiRequest(`/admin/verifications/${item.id}/review`, {
      method: "POST",
      authenticated: true,
      body: JSON.stringify(decision === "VERIFIED" ? { decision, note: "Document valide." } : { decision, reason: "Document illisible." }),
    });
    setAttempt(value => value + 1);
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>Identité / business</span><h1>Vérifications</h1><p>Traitez les dossiers sans automatiser la décision humaine.</p></div></div>
      <div className="admin-tabs">{tabs.map(tab => <button key={tab} type="button" className={tab === status ? "admin-tab admin-tab--active" : "admin-tab"} onClick={() => setStatus(tab)}>{tab}</button>)}</div>
      {error && <p className="form-error">{error}</p>}
      <DataTable rows={items} emptyLabel="Aucun dossier." columns={[
        { key: "user", label: "Utilisateur", render: row => row.user_id },
        { key: "type", label: "Type", render: row => row.verification_type },
        { key: "date", label: "Soumission", render: row => row.submitted_at ? new Date(row.submitted_at).toLocaleString("fr-FR") : "-" },
        { key: "status", label: "Statut", render: row => <StatusBadge tone={row.status === "VERIFIED" ? "success" : row.status === "REJECTED" ? "danger" : "warning"}>{row.status}</StatusBadge> },
        { key: "history", label: "Historique", render: row => row.rejection_reason ?? row.reviewed_at ?? "-" },
        { key: "actions", label: "Actions", render: row => <div className="admin-row-actions"><button type="button" onClick={() => review(row, "VERIFIED")}>APPROVE</button><button type="button" onClick={() => review(row, "REJECTED")}>REJECT</button></div> },
      ]} />
    </section>
  );
}
