import {
  AlertTriangle,
  CreditCard,
  FileCheck,
  Flag,
  ListChecks,
  Settings,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

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

  const moderationTotal = dashboard
    ? dashboard.moderation.reports_pending +
      dashboard.moderation.fraud_signals_open +
      dashboard.moderation.verifications_pending
    : 0;


  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span>Vue d'ensemble opérationnelle</span>
          <h1>Dashboard</h1>
          <p>
            Pilotez utilisateurs, annonces, vérifications,
            signalements, anti-fraude et paiements depuis une
            seule vue.
          </p>
        </div>

        <div className="admin-dashboard-health">
          <Sparkles size={18} />
          <div>
            <strong>
              {loading
                ? "Synchronisation..."
                : error
                  ? "Attention requise"
                  : "Système actif"}
            </strong>
            <span>
              {error || `${moderationTotal} dossier(s) à suivre`}
            </span>
          </div>
        </div>
      </div>

      {moderationTotal > 0 && (
        <section className="admin-command-strip">
          <div>
            <AlertTriangle size={20} />
            <div>
              <strong>Priorité modération</strong>
              <span>
                {moderationTotal} élément(s) attendent une décision
                admin.
              </span>
            </div>
          </div>

          <Link to="/admin/reports">
            Traiter les signalements
          </Link>
        </section>
      )}

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
          trend={
            dashboard
              ? `+${dashboard.users.new_today} aujourd'hui`
              : undefined
          }
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
          tone="success"
          trend={
            dashboard
              ? `${formatNumber(dashboard.listings.total)} total`
              : undefined
          }
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
          trend={
            dashboard
              ? `${formatNumber(dashboard.transactions.completed)} complétées`
              : undefined
          }
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
          tone="success"
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
          tone="warning"
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
          tone="danger"
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
          tone="warning"
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

      <section className="admin-panel admin-dashboard-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Tendances à surveiller</h2>
            <p>
              Volumes principaux pour prioriser la journée.
            </p>
          </div>

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
