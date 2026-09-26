import { useEffect, useState } from "react";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminReport } from "../types";
import { downloadCsv } from "../utils/csv";
import "../styles/admin-tables.css";
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

  function exportCsv() {
    downloadCsv(
      `signalements-${status.toLowerCase()}.csv`,
      items.map(item => ({
        id: item.id,
        reporter_id: item.reporter_id,
        target_type: item.target_type,
        target_id: item.target_id,
        reason: item.reason,
        description: item.description,
        status: item.status,
        priority: item.priority,
        created_at: item.created_at,
      })),
    );
  }

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
      <div className="admin-toolbar-row">
        <div className="admin-tabs">{tabs.map(tab => <button key={tab} type="button" className={tab === status ? "admin-tab admin-tab--active" : "admin-tab"} onClick={() => setStatus(tab)}>{tab}</button>)}</div>
        <button type="button" className="secondary-button" disabled={items.length === 0} onClick={exportCsv}>Exporter CSV</button>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-table-shell">
        <div className="admin-table-scroll">
      <DataTable rows={items} emptyLabel="Aucun signalement." columns={[
        { key: "reason", label: "Signalement", render: row => row.reason },
        { key: "reporter", label: "Reporter", render: row => row.reporter_id },
        { key: "target", label: "Cible", render: row => `${row.target_type} ${row.target_id}` },
        { key: "proof", label: "Preuves", render: row => row.description ?? "-" },
        { key: "status", label: "Statut", render: row => <StatusBadge tone={row.status === "CONFIRMED" ? "danger" : row.status === "PENDING" ? "warning" : "neutral"}>{row.status}</StatusBadge> },
        { key: "actions", label: "Actions", render: row => <div className="admin-row-actions"><button type="button" onClick={() => review(row, "CONFIRMED")}>CONFIRMED</button><button type="button" onClick={() => review(row, "REJECTED")}>REJECTED</button><button type="button" onClick={() => review(row, "IGNORED")}>IGNORED</button></div> },
      ]} />
        </div>
      </div>
    </section>
  );
}
