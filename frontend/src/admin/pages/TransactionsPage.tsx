import { useEffect, useState } from "react";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminTransaction } from "../types";

export default function TransactionsPage() {
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<AdminTransaction[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const suffix = status ? `?status=${status}` : "";
    apiRequest<{ items: AdminTransaction[] }>(`/admin/transactions${suffix}`, { authenticated: true })
      .then(data => setItems(data.items))
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les transactions."));
  }, [status]);

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>Lecture MVP</span><h1>Transactions</h1><p>Suivez les accords, confirmations acheteur/vendeur et annulations.</p></div></div>
      <form className="admin-filters"><select value={status} onChange={event => setStatus(event.target.value)}><option value="">Tous statuts</option><option value="AGREED">AGREED</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option></select></form>
      {error && <p className="form-error">{error}</p>}
      <DataTable rows={items} emptyLabel="Aucune transaction." columns={[
        { key: "id", label: "Transaction", render: row => row.id },
        { key: "listing", label: "Annonce", render: row => row.listing_id },
        { key: "buyer", label: "Acheteur", render: row => row.buyer_id },
        { key: "seller", label: "Vendeur", render: row => row.seller_id },
        { key: "price", label: "Prix", render: row => `${Number(row.agreed_price).toLocaleString("fr-FR")} ${row.currency}` },
        { key: "status", label: "Status", render: row => <StatusBadge tone={row.status === "COMPLETED" ? "success" : row.status === "CANCELLED" ? "danger" : "warning"}>{row.status}</StatusBadge> },
        { key: "confirmations", label: "Confirmations", render: row => `${row.buyer_confirmed_at ? "Buyer ok" : "Buyer -"} / ${row.seller_confirmed_at ? "Seller ok" : "Seller -"}` },
      ]} />
    </section>
  );
}
