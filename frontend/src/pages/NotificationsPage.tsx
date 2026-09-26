import {
  Bell,
  CheckCheck,
  ChevronRight,
  MailOpen,
  RefreshCw,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  apiRequest,
} from "../api/client";

import {
  useAuth,
} from "../auth/AuthContext";


type NotificationItem = {
  id: string;
  notification_type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  channel: string;
  status: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};


function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}


function notificationLink(notification: NotificationItem) {
  const data = notification.data ?? {};

  if (typeof data.conversation_id === "string") {
    return `/messages/${data.conversation_id}`;
  }

  if (typeof data.listing_id === "string") {
    return `/listings/${data.listing_id}`;
  }

  if (typeof data.transaction_id === "string") {
    return "/messages";
  }

  return null;
}


export default function NotificationsPage() {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [items, setItems] =
    useState<NotificationItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [attempt, setAttempt] =
    useState(0);


  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    setLoading(true);
    setError("");

    apiRequest<NotificationItem[]>(
      "/notifications",
      {
        authenticated: true,
      },
    )
      .then(result => {
        if (mounted) {
          setItems(result);
        }
      })
      .catch(cause => {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger les notifications.",
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    user,
    attempt,
  ]);


  const unreadCount = useMemo(
    () => items.filter(item => !item.is_read).length,
    [items],
  );


  async function markRead(notification: NotificationItem) {
    if (notification.is_read) {
      return;
    }

    const updated = await apiRequest<NotificationItem>(
      `/notifications/${notification.id}/read`,
      {
        method: "POST",
        authenticated: true,
      },
    );

    setItems(current => current.map(item => (
      item.id === updated.id
        ? updated
        : item
    )));
  }


  async function markAllRead() {
    setBusy(true);
    setError("");

    try {
      await apiRequest(
        "/notifications/read-all",
        {
          method: "POST",
          authenticated: true,
        },
      );

      setItems(current => current.map(item => ({
        ...item,
        is_read: true,
      })));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de marquer les notifications comme lues.",
      );
    } finally {
      setBusy(false);
    }
  }


  if (authLoading || loading) {
    return (
      <div className="page notifications-page">
        <p role="status">Chargement des notifications...</p>
      </div>
    );
  }


  if (!user) {
    return (
      <div className="page notifications-page">
        <section className="notifications-empty">
          <Bell size={24} />
          <h1>Notifications</h1>
          <p>Connectez-vous pour consulter vos notifications.</p>
          <Link to="/login?returnTo=/notifications" className="primary-button">
            Se connecter
          </Link>
        </section>
      </div>
    );
  }


  return (
    <div className="page notifications-page">
      <div className="page-heading notifications-heading">
        <div>
          <h1>Notifications</h1>
          <p>
            {unreadCount} notification{unreadCount > 1 ? "s" : ""} non lue{unreadCount > 1 ? "s" : ""}
          </p>
        </div>

        <div className="notifications-actions">
          <button
            type="button"
            className="secondary-button inline-button"
            onClick={() => setAttempt(value => value + 1)}
          >
            <RefreshCw size={16} />
            Actualiser
          </button>

          <button
            type="button"
            className="primary-button inline-button"
            disabled={busy || unreadCount === 0}
            onClick={() => void markAllRead()}
          >
            <CheckCheck size={16} />
            Tout marquer lu
          </button>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <section className="notifications-empty">
          <MailOpen size={24} />
          <h2>Aucune notification</h2>
          <p>Les alertes liées à vos annonces apparaîtront ici.</p>
        </section>
      ) : (
        <section className="notifications-list">
          {items.map(notification => {
            const to = notificationLink(notification);
            const content = (
              <>
                <span className="notification-list-icon">
                  <Bell size={18} />
                </span>

                <div className="notification-list-content">
                  <div>
                    <strong>{notification.title}</strong>
                    {!notification.is_read && (
                      <span className="notification-unread-pill">Nouveau</span>
                    )}
                  </div>

                  {notification.message && (
                    <p>{notification.message}</p>
                  )}

                  <small>
                    {notification.notification_type} · {formatDate(notification.created_at)}
                  </small>
                </div>

                {to && <ChevronRight size={17} />}
              </>
            );

            const className = notification.is_read
              ? "notification-list-item"
              : "notification-list-item notification-list-item--unread";

            if (to) {
              return (
                <Link
                  key={notification.id}
                  to={to}
                  className={className}
                  onClick={() => void markRead(notification)}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={notification.id}
                type="button"
                className={className}
                onClick={() => void markRead(notification)}
              >
                {content}
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
