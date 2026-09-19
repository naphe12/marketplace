import { useEffect, useState } from "react";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminBillingPayment } from "../types";

export default function BillingPage() {
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<AdminBillingPayment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const suffix = status ? `?status=${status}` : "";
    apiRequest<{ items: AdminBillingPayment[] }>(`/admin/billing${suffix}`, { authenticated: true })
      .then(data => setItems(data.items))
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les paiements."));
  }, [status]);

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>Vendeur vers plateforme</span><h1>Billing / paiements</h1><p>Suivi des paiements de publication, séparé des paiements transactionnels futurs.</p></div></div>
      <form className="admin-filters"><select value={status} onChange={event => setStatus(event.target.value)}><option value="">Tous statuts</option><option value="PENDING">PENDING</option><option value="PAID">PAID</option><option value="FAILED">FAILED</option><option value="CANCELLED">CANCELLED</option></select></form>
      {error && <p className="form-error">{error}</p>}
      <DataTable rows={items} emptyLabel="Aucun paiement." columns={[
        { key: "order", label: "Order", render: row => row.order_number },
        { key: "user", label: "User", render: row => row.user_id },
        { key: "listing", label: "Listing", render: row => row.listing_id ?? "-" },
        { key: "amount", label: "Amount", render: row => `${Number(row.amount).toLocaleString("fr-FR")} ${row.currency}` },
        { key: "method", label: "Method", render: row => row.payment_method },
        { key: "provider", label: "Provider", render: row => row.provider ?? "-" },
        { key: "ref", label: "External ref", render: row => row.external_reference ?? "-" },
        { key: "status", label: "Status", render: row => <StatusBadge tone={row.status === "PAID" ? "success" : row.status === "FAILED" ? "danger" : "warning"}>{row.status}</StatusBadge> },
        { key: "paid", label: "Paid at", render: row => row.paid_at ? new Date(row.paid_at).toLocaleString("fr-FR") : "-" },
      ]} />
    </section>
  );
}
