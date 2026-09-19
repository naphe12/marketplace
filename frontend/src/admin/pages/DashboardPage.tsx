import {
  CreditCard,
  FileCheck,
  Flag,
  ListChecks,
  Settings,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  apiRequest,
} from "../../api/client";

import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import type {
  AdminDashboard,
} from "../types";


type ActivityRow = {
  label: string;
  value: string;
  status: string;
};


export default function DashboardPage() {
  const [dashboard, setDashboard] =
    useState<AdminDashboard | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result =
          await apiRequest<AdminDashboard>(
            "/admin/dashboard",
            {
              authenticated: true,
            },
          );

        if (mounted) {
          setDashboard(result);
        }
      } catch (cause) {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger le dashboard.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);


  const rows: ActivityRow[] = [
    {
      label: "Utilisateurs",
      value: dashboard
        ? String(dashboard.users.new_today)
        : "-",
      status: "Tendance",
    },
    {
      label: "Annonces",
      value: dashboard
        ? String(dashboard.listings.total)
        : "-",
      status: "Tendance",
    },
    {
      label: "Ventes",
      value: dashboard
        ? String(dashboard.transactions.completed)
        : "-",
      status: "Tendance",
    },
    {
      label: "Paiements",
      value: dashboard
        ? `${formatNumber(
            dashboard.billing.paid_today,
          )} ${dashboard.billing.currency}`
        : "-",
      status: "Tendance",
    },
    {
      label: "Signalements",
      value: dashboard
        ? String(dashboard.moderation.reports_pending)
        : "-",
      status: "À traiter",
    },
    {
      label: "Signaux fraude",
      value: dashboard
        ? String(dashboard.moderation.fraud_signals_open)
        : "-",
      status: "Ouverts",
    },
    {
      label: "Vérifications",
      value: dashboard
        ? String(dashboard.moderation.verifications_pending)
        : "-",
      status: "En attente",
    },
  ];


  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span>Vue d'ensemble</span>
          <h1>Dashboard</h1>
          <p>
            Suivez utilisateurs, annonces, ventes,
            signalements, paiements et tendances.
          </p>
        </div>
      </div>

      <div className="admin-stats-grid">
        <StatCard
          label="Utilisateurs"
          value={
            dashboard
              ? formatNumber(dashboard.users.total)
              : "-"
          }
          detail="Comptes et activité"
          icon={Users}
        />

        <StatCard
          label="Annonces"
          value={
            dashboard
              ? formatNumber(dashboard.listings.active)
              : "-"
          }
          detail="Inventaire marketplace"
          icon={ListChecks}
        />

        <StatCard
          label="Ventes"
          value={
            dashboard
              ? formatNumber(dashboard.transactions.total)
              : "-"
          }
          detail="Transactions réalisées"
          icon={TrendingUp}
        />

        <StatCard
          label="Paiements"
          value={
            dashboard
              ? `${formatNumber(
                  dashboard.billing.paid_today,
                )} ${dashboard.billing.currency}`
              : "-"
          }
          detail="Commandes et règlements"
          icon={CreditCard}
        />

        <StatCard
          label="Signalements"
          value={
            dashboard
              ? dashboard.moderation.reports_pending
              : "-"
          }
          detail="Dossiers en attente"
          icon={Flag}
        />

        <StatCard
          label="Anti-fraude"
          value={
            dashboard
              ? dashboard.moderation.fraud_signals_open
              : "-"
          }
          detail="Signaux ouverts"
          icon={ShieldAlert}
        />

        <StatCard
          label="Vérifications"
          value={
            dashboard
              ? dashboard.moderation.verifications_pending
              : "-"
          }
          detail="Demandes à revoir"
          icon={FileCheck}
        />

        <StatCard
          label="Paramètres"
          value={
            dashboard ? "Configuré" : "-"
          }
          detail="Configuration marketplace"
          icon={Settings}
        />
      </div>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h2>Tendances à surveiller</h2>

          {loading && (
            <span>Chargement...</span>
          )}
        </div>

        {error && (
          <p className="form-error">
            {error}
          </p>
        )}

        <DataTable
          rows={rows}
          emptyLabel="Aucune activité."
          columns={[
            {
              key: "label",
              label: "File",
              render: row => row.label,
            },
            {
              key: "value",
              label: "Volume",
              render: row => row.value,
            },
            {
              key: "status",
              label: "Statut",
              render: row => (
                <StatusBadge tone="warning">
                  {row.status}
                </StatusBadge>
              ),
            },
          ]}
        />
      </section>
    </section>
  );
}


function formatNumber(value: string | number) {
  return new Intl.NumberFormat("fr-FR").format(
    Number(value),
  );
}
