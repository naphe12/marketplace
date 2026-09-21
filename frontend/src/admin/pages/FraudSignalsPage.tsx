import {
  useEffect,
  useState,
} from "react";

import {
  apiRequest,
} from "../../api/client";

import DataTable
  from "../components/DataTable";

import StatusBadge
  from "../components/StatusBadge";

import type {
  AdminFraudSignal,
} from "../types";

import './admin.css'
type FraudLabel =
  | "CONFIRMED_FRAUD"
  | "FALSE_POSITIVE"
  | "LEGIT"
  | "UNCERTAIN";


export default function FraudSignalsPage() {
  const [
    items,
    setItems,
  ] = useState<
    AdminFraudSignal[]
  >([]);

  const [
    attempt,
    setAttempt,
  ] = useState(0);

  const [
    error,
    setError,
  ] = useState("");

  const [
    busyId,
    setBusyId,
  ] =
    useState<string | null>(
      null,
    );


  useEffect(() => {
    setError("");

    apiRequest<{
      items:
        AdminFraudSignal[];
    }>(
      "/admin/fraud-signals?status=OPEN",
      {
        authenticated:
          true,
      },
    )
      .then(data =>
        setItems(
          data.items,
        )
      )
      .catch(cause =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible de charger les signaux.",
        )
      );
  }, [attempt]);


  async function refresh() {
    setAttempt(
      value =>
        value + 1,
    );
  }


  async function reviewSignal(
    item: AdminFraudSignal,
    label: FraudLabel,
  ) {
    try {
      setBusyId(
        item.id,
      );

      setError("");

      await apiRequest(
        `/admin/fraud-signals/${item.id}/review`,
        {
          method:
            "POST",

          authenticated:
            true,

          body:
            JSON.stringify({
              label,

              note:
                "Revue administrateur.",
            }),
        },
      );

      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d'enregistrer la décision.",
      );
    } finally {
      setBusyId(
        null,
      );
    }
  }


  async function action(
    item: AdminFraudSignal,
    actionName:
      | "reviewed"
      | "dismiss"
      | "escalate",
  ) {
    try {
      setBusyId(
        item.id,
      );

      setError("");

      await apiRequest(
        `/admin/fraud-signals/${item.id}/${actionName}`,
        {
          method:
            "POST",

          authenticated:
            true,

          body:
            JSON.stringify({
              note:
                "Revue administrateur.",
            }),
        },
      );

      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d'effectuer cette action.",
      );
    } finally {
      setBusyId(
        null,
      );
    }
  }


  async function suspendTarget(
    item: AdminFraudSignal,
  ) {
    if (
      !window.confirm(
        "Confirmer la suspension de la cible liée à ce signal ?",
      )
    ) {
      return;
    }

    const path =
      item.listing_id
        ? `/admin/listings/${item.listing_id}/suspend`
        : item.user_id
          ? `/admin/users/${item.user_id}/suspend`
          : null;

    if (!path) {
      return;
    }

    try {
      setBusyId(
        item.id,
      );

      setError("");

      await apiRequest(
        path,
        {
          method:
            "POST",

          authenticated:
            true,

          body:
            JSON.stringify({
              reason:
                `Signal anti-fraude ${item.signal_type}`,
            }),
        },
      );

      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de suspendre la cible.",
      );
    } finally {
      setBusyId(
        null,
      );
    }
  }


  return (
    <section className="admin-page">

      <div className="admin-page-heading">
        <div>
          <span>
            Risque
          </span>

          <h1>
            Anti-fraude
          </h1>

          <p>
            Un score élevé aide à
            prioriser, il ne prouve
            pas automatiquement une
            fraude.
          </p>
        </div>
      </div>


      {error && (
        <p className="form-error">
          {error}
        </p>
      )}


      <DataTable
        rows={items}

        emptyLabel={
          "Aucun signal ouvert."
        }

        columns={[
          {
            key:
              "type",

            label:
              "Signal",

            render:
              row =>
                row.signal_type,
          },

          {
            key:
              "severity",

            label:
              "Sévérité",

            render:
              row => (
                <StatusBadge
                  tone={
                    row.severity ===
                      "CRITICAL" ||
                    row.severity ===
                      "HIGH"
                      ? "danger"
                      : row.severity ===
                          "MEDIUM"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {
                    row.severity
                  }
                </StatusBadge>
              ),
          },

          {
            key:
              "score",

            label:
              "Score",

            render:
              row =>
                row.risk_score !==
                null
                  ? `${row.risk_score}/100`
                  : "-",
          },

          {
            key:
              "model",

            label:
              "Moteur",

            render:
              row => (
                <div>
                  <div>
                    {
                      row.source ??
                      "-"
                    }
                  </div>

                  <small>
                    {
                      row.model_version ??
                      "-"
                    }
                  </small>
                </div>
              ),
          },

          {
            key:
              "target",

            label:
              "Cible",

            render:
              row =>
                row.listing_id ??
                row.user_id ??
                "-",
          },

          {
            key:
              "recommendation",

            label:
              "Recommandation",

            render:
              row =>
                row.action ??
                "-",
          },

          {
            key:
              "decision",

            label:
              "Décision",

            render:
              row =>
                row.admin_label ??
                "-",
          },

          {
            key:
              "status",

            label:
              "Statut",

            render:
              row =>
                row.status,
          },

          {
            key:
              "actions",

            label:
              "Actions",

            render:
              row => (
                <div className="admin-row-actions">

                  <button
                    type="button"

                    disabled={
                      busyId ===
                      row.id
                    }

                    onClick={() =>
                      reviewSignal(
                        row,
                        "CONFIRMED_FRAUD",
                      )
                    }
                  >
                    Fraude
                  </button>


                  <button
                    type="button"

                    disabled={
                      busyId ===
                      row.id
                    }

                    onClick={() =>
                      reviewSignal(
                        row,
                        "FALSE_POSITIVE",
                      )
                    }
                  >
                    Faux positif
                  </button>


                  <button
                    type="button"

                    disabled={
                      busyId ===
                      row.id
                    }

                    onClick={() =>
                      reviewSignal(
                        row,
                        "LEGIT",
                      )
                    }
                  >
                    Légitime
                  </button>


                  <button
                    type="button"

                    disabled={
                      busyId ===
                      row.id
                    }

                    onClick={() =>
                      reviewSignal(
                        row,
                        "UNCERTAIN",
                      )
                    }
                  >
                    Incertain
                  </button>


                  <button
                    type="button"

                    disabled={
                      busyId ===
                      row.id
                    }

                    onClick={() =>
                      action(
                        row,
                        "escalate",
                      )
                    }
                  >
                    Escalate
                  </button>


                  <button
                    type="button"

                    disabled={
                      busyId ===
                      row.id
                    }

                    onClick={() =>
                      suspendTarget(
                        row,
                      )
                    }
                  >
                    Suspend target
                  </button>

                </div>
              ),
          },
        ]}
      />

    </section>
  );
}