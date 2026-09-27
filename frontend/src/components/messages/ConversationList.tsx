import {
  Link,
} from "react-router-dom";

import type {
  Conversation,
} from "./types";


type Props = {
  conversations: Conversation[];
  activeConversationId?: string;
  currentUserId?: string;
};


const statusLabels: Record<string, string> = {
  ACTIVE: "En cours",
  ARCHIVED: "Archivee",
  CLOSED: "Terminee",
  BLOCKED: "Bloquee",
};


function formatConversationDate(value: string | null) {
  if (!value) {
    return "Nouvelle";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recente";
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isYesterday) {
    return "Hier";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}


function getConversationRole(
  conversation: Conversation,
  currentUserId?: string,
) {
  if (!currentUserId) {
    return "Conversation";
  }

  if (conversation.seller_id === currentUserId) {
    return "Vente";
  }

  if (conversation.buyer_id === currentUserId) {
    return "Achat";
  }

  return "Conversation";
}


export default function ConversationList({
  conversations,
  activeConversationId,
  currentUserId,
}: Props) {
  if (conversations.length === 0) {
    return (
      <p className="conversation-list__empty">Aucune conversation.</p>
    );
  }

  return (
    <div className="conversation-list">
      {conversations.map(conversation => {
        const role = getConversationRole(conversation, currentUserId);
        const status = statusLabels[conversation.status] ?? conversation.status;
        const date = formatConversationDate(
          conversation.last_message_at ?? conversation.created_at,
        );
        const isActive = conversation.id === activeConversationId;

        return (
          <Link
            key={conversation.id}
            to={`/messages/${conversation.id}`}
            className={
              isActive
                ? "conversation-item conversation-item--active"
                : "conversation-item"
            }
          >
            <span
              className="conversation-item__avatar"
              aria-hidden="true"
            >
              {role.charAt(0)}
            </span>

            <span className="conversation-item__content">
              <span className="conversation-item__top">
                <strong className="conversation-item__title">
                  {role}
                </strong>

                <span className="conversation-item__time">
                  {date}
                </span>
              </span>

              <span className="conversation-item__listing">
                Annonce liee
              </span>

              <span className="conversation-item__preview">
                {status} · Ouvrir la discussion
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
