import { FileText, Flag, ListChecks, ShieldAlert, Star, User, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { apiRequest } from "../../api/client";
import StatCard from "../components/StatCard";
import type { AdminUser360 } from "../types";

export default function UserDetailPage() {
  const { userId } = useParams();
  const [user, setUser] = useState<AdminUser360 | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    apiRequest<AdminUser360>(`/admin/users/${userId}`, { authenticated: true })
      .then(setUser)
      .catch(cause => setError(cause instanceof Error ? cause.message : "Utilisateur introuvable."));
  }, [userId]);

  if (error) return <section className="admin-page"><p className="form-error">{error}</p></section>;
  if (!user) return <section className="admin-page"><p>Chargement...</p></section>;

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>Vue 360°</span><h1>{user.phone}</h1><p>{user.email ?? "Aucun email"} · {user.status} · {user.account_type}</p></div></div>
      <div className="admin-stats-grid">
        <StatCard label="Annonces" value={user.listings_count} detail="Inventaire vendeur" icon={ListChecks} />
        <StatCard label="Transactions" value={user.transactions_count} detail="Buyer / seller" icon={Wallet} />
        <StatCard label="Avis" value={user.reviews_count} detail="Réputation" icon={Star} />
        <StatCard label="Signalements" value={user.reports_count} detail="Reporter ou cible" icon={Flag} />
        <StatCard label="Fraud signals" value={user.fraud_signals_count} detail="Signaux liés" icon={ShieldAlert} />
        <StatCard label="Sanctions" value={user.sanctions_count} detail="Actions moderation" icon={FileText} />
        <StatCard label="Audit" value={user.audit_count} detail="Actions admin" icon={User} />
      </div>
    </section>
  );
}
