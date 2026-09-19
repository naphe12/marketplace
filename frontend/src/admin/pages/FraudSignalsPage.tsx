import { useEffect, useState } from "react";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminFraudSignal } from "../types";

export default function FraudSignalsPage() {
  const [items, setItems] = useState<AdminFraudSignal[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ items: AdminFraudSignal[] }>("/admin/fraud-signals?status=OPEN", { authenticated: true })
      .then(data => setItems(data.items))
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les signaux."));
  }, [attempt]);

  async function action(item: AdminFraudSignal, actionName: "reviewed" | "dismiss" | "escalate") {
    await apiRequest(`/admin/fraud-signals/${item.id}/${actionName}`, {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({ note: "Revue administrateur." }),
    });
    setAttempt(value => value + 1);
  }

  async function suspendTarget(item: AdminFraudSignal) {
    if (!window.confirm("Confirmer la suspension de la cible liée à ce signal ?")) {
      return;
    }
    const path = item.listing_id
      ? `/admin/listings/${item.listing_id}/suspend`
      : item.user_id
        ? `/admin/users/${item.user_id}/suspend`
        : null;
    if (!path) return;
    await apiRequest(path, {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({ reason: `Signal anti-fraude ${item.signal_type}` }),
    });
    setAttempt(value => value + 1);
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>Risque</span><h1>Anti-fraude</h1><p>Un score élevé aide à prioriser, il ne prouve pas automatiquement une fraude.</p></div></div>
      {error && <p className="form-error">{error}</p>}
      <DataTable rows={items} emptyLabel="Aucun signal ouvert." columns={[
        { key: "type", label: "Signal", render: row => row.signal_type },
        { key: "severity", label: "Sévérité", render: row => <StatusBadge tone={row.severity === "CRITICAL" || row.severity === "HIGH" ? "danger" : row.severity === "MEDIUM" ? "warning" : "neutral"}>{row.severity}</StatusBadge> },
        { key: "score", label: "Score", render: row => row.risk_score },
        { key: "target", label: "Cible", render: row => row.listing_id ?? row.user_id ?? "-" },
        { key: "status", label: "Statut", render: row => row.status },
        { key: "actions", label: "Actions", render: row => <div className="admin-row-actions"><button type="button" onClick={() => action(row, "reviewed")}>Mark reviewed</button><button type="button" onClick={() => action(row, "dismiss")}>Dismiss</button><button type="button" onClick={() => action(row, "escalate")}>Escalate</button><button type="button" onClick={() => suspendTarget(row)}>Suspend target</button></div> },
      ]} />
    </section>
  );
}
