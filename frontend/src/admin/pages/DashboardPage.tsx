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


  /*
   * Compteurs modération.
   */
  const reportsPending =
    dashboard?.moderation.reports_pending ?? 0;

  const fraudSignalsOpen =
    dashboard?.moderation.fraud_signals_open ?? 0;

  const verificationsPending =
    dashboard?.moderation.verifications_pending ?? 0;


  const moderationTotal =
    reportsPending +
    fraudSignalsOpen +
    verificationsPending;


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
        ? String(reportsPending)
        : "-",
      status:
        reportsPending > 0
          ? "À traiter"
          : "RAS",
    },
    {
      label: "Signaux fraude",
      value: dashboard
        ? String(fraudSignalsOpen)
        : "-",
      status:
        fraudSignalsOpen > 0
          ? "Ouverts"
          : "RAS",
    },
    {
      label: "Vérifications",
      value: dashboard
        ? String(verificationsPending)
        : "-",
      status:
        verificationsPending > 0
          ? "En attente"
          : "RAS",
    },
  ];


  return (
    <section className="admin-page">

      {/* =====================================================
          EN-TÊTE
         ===================================================== */}

      <div className="admin-page-heading">
        <div>
          <span>
            Vue d'ensemble opérationnelle
          </span>

          <h1>
            Dashboard
          </h1>

          <p>
            Pilotez utilisateurs, annonces,
            vérifications, signalements,
            anti-fraude et paiements depuis
            une seule vue.
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
              {error ||
                `${moderationTotal} dossier(s) à suivre`}
            </span>
          </div>
        </div>
      </div>


      {/* =====================================================
          PRIORITÉS
         ===================================================== */}

      {moderationTotal > 0 && (
        <section className="admin-command-strip">

          <div className="admin-command-strip__summary">
            <AlertTriangle size={20} />

            <div>
              <strong>
                Priorités opérationnelles
              </strong>

              <span>
                {moderationTotal} dossier(s)
                nécessitent votre attention.
              </span>


              <div className="admin-command-strip__counts">

                <span>
                  <Flag size={14} />
                  {reportsPending} signalement(s)
                </span>

                <span>
                  <ShieldAlert size={14} />
                  {fraudSignalsOpen} alerte(s) fraude
                </span>

                <span>
                  <FileCheck size={14} />
                  {verificationsPending} vérification(s)
                </span>

              </div>
            </div>
          </div>


          <div className="admin-command-strip__actions">

            {reportsPending > 0 && (
              <Link
                to="/admin/reports"
                className="admin-command-action"
              >
                <Flag size={17} />
                Signalements
                <strong>
                  {reportsPending}
                </strong>
              </Link>
            )}


            {fraudSignalsOpen > 0 && (
              <Link
                to="/admin/fraud"
                className="admin-command-action admin-command-action--danger"
              >
                <ShieldAlert size={17} />
                Anti-fraude
                <strong>
                  {fraudSignalsOpen}
                </strong>
              </Link>
            )}

          </div>
        </section>
      )}


      {/* =====================================================
          CARTES
         ===================================================== */}

      <div className="admin-stats-grid">

        <StatCard
          label="Utilisateurs"
          value={
            dashboard
              ? formatNumber(
                dashboard.users.total,
              )
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
              ? formatNumber(
                dashboard.listings.active,
              )
              : "-"
          }
          detail="Inventaire marketplace"
          icon={ListChecks}
          tone="success"
          trend={
            dashboard
              ? `${formatNumber(
                dashboard.listings.total,
              )} total`
              : undefined
          }
        />


        <StatCard
          label="Ventes"
          value={
            dashboard
              ? formatNumber(
                dashboard.transactions.total,
              )
              : "-"
          }
          detail="Transactions réalisées"
          icon={TrendingUp}
          trend={
            dashboard
              ? `${formatNumber(
                dashboard.transactions.completed,
              )} complétées`
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
              ? reportsPending
              : "-"
          }
          detail="Signalements utilisateurs en attente"
          icon={Flag}
          tone="warning"
        />


        <StatCard
          label="Anti-fraude"
          value={
            dashboard
              ? fraudSignalsOpen
              : "-"
          }
          detail="Signaux automatiques ouverts"
          icon={ShieldAlert}
          tone="danger"
        />


        <StatCard
          label="Vérifications"
          value={
            dashboard
              ? verificationsPending
              : "-"
          }
          detail="Demandes à revoir"
          icon={FileCheck}
          tone="warning"
        />


        <StatCard
          label="Paramètres"
          value={
            dashboard
              ? "Configuré"
              : "-"
          }
          detail="Configuration marketplace"
          icon={Settings}
        />

      </div>


      {/* =====================================================
          TENDANCES
         ===================================================== */}

      <section className="admin-panel admin-dashboard-panel">

        <div className="admin-panel-heading">

          <div>
            <h2>
              Tendances à surveiller
            </h2>

            <p>
              Volumes principaux pour
              prioriser la journée.
            </p>
          </div>


          {loading && (
            <span>
              Chargement...
            </span>
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
              render: row =>
                row.label,
            },
            {
              key: "value",
              label: "Volume",
              render: row =>
                row.value,
            },
            {
              key: "status",
              label: "Statut",
              render: row => (
                <StatusBadge
                  tone={
                    row.status === "RAS"
                      ? "success"
                      : "warning"
                  }
                >
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


function formatNumber(
  value: string | number,
) {
  return new Intl.NumberFormat(
    "fr-FR",
  ).format(
    Number(value),
  );
}