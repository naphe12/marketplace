import { useEffect, useMemo, useState } from "react";

import { apiRequest, downloadApiFile } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminTransaction } from "../types";
import "../styles/admin-tables.css";

export default function TransactionsPage() {
  const [filters, setFilters] = useState({ status: "", buyer_id: "", seller_id: "", listing_id: "", created_from: "", created_to: "" });
  const [items, setItems] = useState<AdminTransaction[]>([]);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    return params.toString();
  }, [filters]);

  useEffect(() => {
    apiRequest<{ items: AdminTransaction[] }>(`/admin/transactions${query ? `?${query}` : ""}`, { authenticated: true })
      .then(data => setItems(data.items))
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les transactions."));
  }, [query]);

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  async function exportCsv() {
    await downloadApiFile(`/admin/transactions?${query ? `${query}&` : ""}format=csv`, "transactions.csv");
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>Lecture MVP</span><h1>Transactions</h1><p>Suivez les accords, confirmations acheteur/vendeur et annulations.</p></div><button type="button" className="secondary-button" onClick={() => void exportCsv()}>Export CSV</button></div>
      <form className="admin-filters">
        <select value={filters.status} onChange={event => setFilter("status", event.target.value)}><option value="">Tous statuts</option><option value="ACCEPTED">ACCEPTED</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option></select>
        <input placeholder="Acheteur ID" value={filters.buyer_id} onChange={event => setFilter("buyer_id", event.target.value)} />
        <input placeholder="Vendeur ID" value={filters.seller_id} onChange={event => setFilter("seller_id", event.target.value)} />
        <input placeholder="Annonce ID" value={filters.listing_id} onChange={event => setFilter("listing_id", event.target.value)} />
        <input type="datetime-local" value={filters.created_from} onChange={event => setFilter("created_from", event.target.value)} />
        <input type="datetime-local" value={filters.created_to} onChange={event => setFilter("created_to", event.target.value)} />
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-table-shell"><div className="admin-table-scroll">
        <DataTable rows={items} emptyLabel="Aucune transaction." columns={[
          { key: "id", label: "Transaction", render: row => row.id },
          { key: "listing", label: "Annonce", render: row => row.listing_id },
          { key: "buyer", label: "Acheteur", render: row => row.buyer_id },
          { key: "seller", label: "Vendeur", render: row => row.seller_id },
          { key: "price", label: "Prix", render: row => `${Number(row.agreed_price).toLocaleString("fr-FR")} ${row.currency}` },
          { key: "status", label: "Status", render: row => <StatusBadge tone={row.status === "COMPLETED" ? "success" : row.status === "CANCELLED" ? "danger" : "warning"}>{row.status}</StatusBadge> },
          { key: "confirmations", label: "Confirmations", render: row => `${row.buyer_confirmed_at ? "Buyer ok" : "Buyer -"} / ${row.seller_confirmed_at ? "Seller ok" : "Seller -"}` },
        ]} />
      </div></div>
    </section>
  );
}
