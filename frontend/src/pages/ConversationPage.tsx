import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";

import {
  apiRequest,
} from "../api/client";
import MessageBubble from "../components/messages/MessageBubble";
import MessageComposer from "../components/messages/MessageComposer";
import type {
  Message,
} from "../components/messages/types";
import {
  useAuth,
} from "../auth/AuthContext";


export default function ConversationPage() {
  const {
    conversationId,
  } = useParams();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!conversationId || !user) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError("");

    apiRequest<Message[]>(
      `/conversations/${conversationId}/messages`,
      {
        authenticated: true,
      },
    )
      .then(items => {
        if (mounted) {
          setMessages(items);
        }
      })
      .catch(cause => {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger les messages.",
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    void apiRequest(
      `/conversations/${conversationId}/read`,
      {
        method: "POST",
        authenticated: true,
      },
    ).catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [conversationId, user]);

  async function sendMessage() {
    if (!conversationId) {
      return;
    }

    const body = text.trim();

    if (!body) {
      return;
    }

    setText("");
    setError("");

    try {
      const message = await apiRequest<Message>(
        `/conversations/${conversationId}/messages`,
        {
          method: "POST",
          authenticated: true,
          body: JSON.stringify({
            body,
          }),
        },
      );

      setMessages(current => [
        ...current,
        message,
      ]);
    } catch (cause) {
      setText(body);
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d'envoyer le message.",
      );
    }
  }

  if (authLoading || loading) {
    return (
      <div className="page">
        <p role="status">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <p>
          <Link to="/login">Connectez-vous</Link> pour accéder à vos messages.
        </p>
      </div>
    );
  }

  return (
    <div className="page messages-page">
      <Link to="/messages" className="back-link">
        Retour aux messages
      </Link>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <section className="messages-panel">
        <div className="message-stack">
          {messages.length === 0 ? (
            <div className="empty-state">
              Aucun message pour le moment.
            </div>
          ) : messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              mine={message.sender_id === user.id}
            />
          ))}
        </div>

        <MessageComposer
          text={text}
          onChange={setText}
          onSubmit={() => void sendMessage()}
        />
      </section>
    </div>
  );
}
