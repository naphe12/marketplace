import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  apiRequest,
} from "../api/client";

import ConversationList from "../components/messages/ConversationList";

import type {
  Conversation,
} from "../components/messages/types";

import {
  useAuth,
} from "../auth/AuthContext";


export default function MessagesPage() {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let mounted = true;

    setLoading(true);
    setError("");

    apiRequest<Conversation[]>(
      "/conversations",
      {
        authenticated: true,
      },
    )
      .then(items => {
        if (!mounted) {
          return;
        }

        setConversations(items);
      })
      .catch(cause => {
        if (!mounted) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible de charger les conversations.",
        );
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="page">
        <p role="status">
          Chargement...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <p>
          <Link to="/login">
            Connectez-vous
          </Link>{" "}
          pour accéder à vos messages.
        </p>
      </div>
    );
  }

  return (
    <div className="page messages-page">
      <div className="page-heading">
        <div>
          <h1>Messages</h1>

          <p>
            Conversations liées aux annonces.
          </p>
        </div>
      </div>

      {error && (
        <p
          className="form-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {conversations.length === 0 ? (
        <div className="messages-empty">
          <p>
            Vous n'avez encore aucune conversation.
          </p>

          <Link
            to="/"
            className="secondary-button"
          >
            Voir les annonces
          </Link>
        </div>
      ) : (
        <aside className="messages-list">
          <ConversationList
            conversations={conversations}
          />
        </aside>
      )}
    </div>
  );
}