import { useEffect, useState } from "react";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminReport } from "../types";

const tabs = ["PENDING", "CONFIRMED", "REJECTED", "IGNORED"];

export default function ReportsPage() {
  const [status, setStatus] = useState("PENDING");
  const [items, setItems] = useState<AdminReport[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ items: AdminReport[] }>(`/admin/reports?status=${status}`, { authenticated: true })
      .then(data => setItems(data.items))
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les signalements."));
  }, [status, attempt]);

  async function review(item: AdminReport, decision: "CONFIRMED" | "REJECTED" | "IGNORED") {
    await apiRequest(`/admin/reports/${item.id}/review`, {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({ decision, note: "Décision administrateur." }),
    });
    setAttempt(value => value + 1);
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>Investigation</span><h1>Signalements</h1><p>Un signalement seul ne sanctionne personne. Il ouvre une enquête.</p></div></div>
      <div className="admin-tabs">{tabs.map(tab => <button key={tab} type="button" className={tab === status ? "admin-tab admin-tab--active" : "admin-tab"} onClick={() => setStatus(tab)}>{tab}</button>)}</div>
      {error && <p className="form-error">{error}</p>}
      <DataTable rows={items} emptyLabel="Aucun signalement." columns={[
        { key: "reason", label: "Signalement", render: row => row.reason },
        { key: "reporter", label: "Reporter", render: row => row.reporter_id },
        { key: "target", label: "Cible", render: row => `${row.target_type} ${row.target_id}` },
        { key: "proof", label: "Preuves", render: row => row.description ?? "-" },
        { key: "status", label: "Statut", render: row => <StatusBadge tone={row.status === "CONFIRMED" ? "danger" : row.status === "PENDING" ? "warning" : "neutral"}>{row.status}</StatusBadge> },
        { key: "actions", label: "Actions", render: row => <div className="admin-row-actions"><button type="button" onClick={() => review(row, "CONFIRMED")}>CONFIRMED</button><button type="button" onClick={() => review(row, "REJECTED")}>REJECTED</button><button type="button" onClick={() => review(row, "IGNORED")}>IGNORED</button></div> },
      ]} />
    </section>
  );
}
