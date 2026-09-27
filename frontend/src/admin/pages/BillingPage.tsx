import { useEffect, useMemo, useState } from "react";

import { apiRequest, downloadApiFile } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminBillingPayment } from "../types";
import "../styles/admin-tables.css";

export default function BillingPage() {
  const [filters, setFilters] = useState({ status: "", user_id: "", listing_id: "", order_number: "", provider: "", payment_method: "", created_from: "", created_to: "" });
  const [items, setItems] = useState<AdminBillingPayment[]>([]);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    return params.toString();
  }, [filters]);

  useEffect(() => {
    apiRequest<{ items: AdminBillingPayment[] }>(`/admin/billing${query ? `?${query}` : ""}`, { authenticated: true })
      .then(data => setItems(data.items))
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les paiements."));
  }, [query]);

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  async function exportCsv() {
    await downloadApiFile(`/admin/billing?${query ? `${query}&` : ""}format=csv`, "billing_payments.csv");
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>Vendeur vers plateforme</span><h1>Billing / paiements</h1><p>Suivi des paiements de publication, séparé des paiements transactionnels futurs.</p></div><button type="button" className="secondary-button" onClick={() => void exportCsv()}>Export CSV</button></div>
      <form className="admin-filters">
        <select value={filters.status} onChange={event => setFilter("status", event.target.value)}><option value="">Tous statuts</option><option value="PENDING">PENDING</option><option value="PAID">PAID</option><option value="FAILED">FAILED</option><option value="CANCELLED">CANCELLED</option></select>
        <input placeholder="User ID" value={filters.user_id} onChange={event => setFilter("user_id", event.target.value)} />
        <input placeholder="Listing ID" value={filters.listing_id} onChange={event => setFilter("listing_id", event.target.value)} />
        <input placeholder="Order number" value={filters.order_number} onChange={event => setFilter("order_number", event.target.value)} />
        <input placeholder="Provider" value={filters.provider} onChange={event => setFilter("provider", event.target.value)} />
        <input placeholder="Method" value={filters.payment_method} onChange={event => setFilter("payment_method", event.target.value)} />
        <input type="datetime-local" value={filters.created_from} onChange={event => setFilter("created_from", event.target.value)} />
        <input type="datetime-local" value={filters.created_to} onChange={event => setFilter("created_to", event.target.value)} />
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-table-shell"><div className="admin-table-scroll">
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
      </div></div>
    </section>
  );
}
