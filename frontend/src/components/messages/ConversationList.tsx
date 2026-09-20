import {
  Link,
} from "react-router-dom";

import type {
  Conversation,
} from "./types";


type Props = {
  conversations: Conversation[];
  activeConversationId?: string;
};


export default function ConversationList({
  conversations,
  activeConversationId,
}: Props) {
  if (conversations.length === 0) {
    return (
      <p>Aucune conversation.</p>
    );
  }

  return (
    <>
      {conversations.map(conversation => (
        <Link
          key={conversation.id}
          to={`/messages/${conversation.id}`}
          className={
            conversation.id === activeConversationId
              ? "message-thread message-thread--active"
              : "message-thread"
          }
        >
          <strong>
            Annonce #{conversation.listing_id.slice(0, 8)}
          </strong>
          <span>{conversation.status}</span>
        </Link>
      ))}
    </>
  );
}
