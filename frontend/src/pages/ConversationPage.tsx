import {
  useCallback,
  useEffect,
  useMemo,
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
import OfferCard from "../components/messages/OfferCard";
import TransactionCard from "../components/messages/TransactionCard";

import type {
  Message,
} from "../components/messages/types";

import type {
  ConversationOffer,
} from "../types/offer";

import type {
  MarketplaceTransaction,
} from "../types/transaction";

import {
  useAuth,
} from "../auth/AuthContext";


type TimelineItem =
  | {
    type: "MESSAGE";
    id: string;
    created_at: string;
    message: Message;
  }
  | {
    type: "OFFER";
    id: string;
    created_at: string;
    offer: ConversationOffer;
  }
  | {
    type: "TRANSACTION";
    id: string;
    created_at: string;
    transaction: MarketplaceTransaction;
  };


export default function ConversationPage() {
  const {
    conversationId,
  } = useParams();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [offers, setOffers] =
    useState<ConversationOffer[]>([]);

  const [transactions, setTransactions] =
    useState<MarketplaceTransaction[]>([]);

  const [text, setText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [lastSyncedAt, setLastSyncedAt] =
    useState<Date | null>(null);

  const [reportingMessageId, setReportingMessageId] =
    useState<string | null>(null);

  const [
    offerActionLoading,
    setOfferActionLoading,
  ] = useState<string | null>(null);

  const [
    transactionActionId,
    setTransactionActionId,
  ] = useState<string | null>(null);


  const loadConversation = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!conversationId || !user) {
        setLoading(false);
        return;
      }

      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const [
          loadedMessages,
          loadedOffersResult,
          loadedTransactionsResult,
        ] = await Promise.allSettled([
          apiRequest<Message[]>(
            `/conversations/${conversationId}/messages`,
            {
              authenticated: true,
            },
          ),

          apiRequest<ConversationOffer[]>(
            `/conversations/${conversationId}/offers`,
            {
              authenticated: true,
            },
          ),

          apiRequest<MarketplaceTransaction[]>(
            "/transactions/mine",
            {
              authenticated: true,
            },
          ),
        ]);

        if (loadedMessages.status === "rejected") {
          throw loadedMessages.reason;
        }

        setMessages(loadedMessages.value);

        setOffers(
          loadedOffersResult.status === "fulfilled"
            ? loadedOffersResult.value
            : [],
        );

        setTransactions(
          loadedTransactionsResult.status === "fulfilled"
            ? loadedTransactionsResult.value
            : [],
        );

        setLastSyncedAt(new Date());

        void apiRequest(
          `/conversations/${conversationId}/read`,
          {
            method: "POST",
            authenticated: true,
          },
        ).catch(() => undefined);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible de charger les messages.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      conversationId,
      user,
    ],
  );


  useEffect(() => {
    if (!conversationId || !user) {
      setLoading(false);
      return;
    }

    void loadConversation();

    const interval = window.setInterval(
      () => void loadConversation({ silent: true }),
      10000,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [
    conversationId,
    user,
    loadConversation,
  ]);


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
    setSending(true);

    try {
      const message =
        await apiRequest<Message>(
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
    } finally {
      setSending(false);
    }
  }



  async function reportMessage(message: Message) {
    const description = window.prompt("Pourquoi signalez-vous ce message ?");

    if (description === null) {
      return;
    }

    setReportingMessageId(message.id);
    setError("");

    try {
      await apiRequest(
        "/reports",
        {
          method: "POST",
          authenticated: true,
          body: JSON.stringify({
            target_type: "MESSAGE",
            target_id: message.id,
            reason: "MESSAGE_ABUSE",
            description: description.trim() || null,
          }),
        },
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de signaler ce message.",
      );
    } finally {
      setReportingMessageId(null);
    }
  }


  /*
   * Recharger les offres.
   */
  async function reloadOffers() {
    if (!conversationId) {
      return;
    }

    const loadedOffers =
      await apiRequest<ConversationOffer[]>(
        `/conversations/${conversationId}/offers`,
        {
          authenticated: true,
        },
      );

    setOffers(loadedOffers);
  }


  /*
   * Recharger les transactions.
   */
  async function reloadTransactions() {
    const loadedTransactions =
      await apiRequest<
        MarketplaceTransaction[]
      >(
        "/transactions/mine",
        {
          authenticated: true,
        },
      );

    setTransactions(
      loadedTransactions,
    );
  }


  /*
   * Accepter une offre.
   */
  async function handleAcceptOffer(
    offerId: string,
  ) {
    setOfferActionLoading(offerId);
    setError("");

    try {
      await apiRequest(
        `/offers/${offerId}/accept`,
        {
          method: "POST",
          authenticated: true,
        },
      );

      /*
       * L'acceptation modifie l'offre ET
       * crée une transaction.
       */
      await reloadOffers();
      await reloadTransactions();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d'accepter l'offre.",
      );
    } finally {
      setOfferActionLoading(null);
    }
  }


  /*
   * Refuser une offre.
   */
  async function handleRejectOffer(
    offerId: string,
  ) {
    setOfferActionLoading(offerId);
    setError("");

    try {
      await apiRequest(
        `/offers/${offerId}/reject`,
        {
          method: "POST",
          authenticated: true,
        },
      );

      await reloadOffers();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de refuser l'offre.",
      );
    } finally {
      setOfferActionLoading(null);
    }
  }


  /*
   * Confirmer la transaction.
   *
   * Le backend détermine automatiquement
   * si current_user est acheteur ou vendeur.
   */
  async function handleConfirmTransaction(
    transactionId: string,
  ) {
    setTransactionActionId(
      transactionId,
    );

    setError("");

    try {
      await apiRequest(
        `/transactions/${transactionId}/confirm`,
        {
          method: "POST",
          authenticated: true,
        },
      );

      await reloadTransactions();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de confirmer la transaction.",
      );
    } finally {
      setTransactionActionId(null);
    }
  }


  /*
   * Les transactions chargées concernent
   * potentiellement plusieurs conversations.
   *
   * On ne conserve ici que celles dont
   * offer_id appartient à cette conversation.
   */
  const conversationOfferIds = useMemo(
    () => new Set(
      offers.map(
        offer => offer.id,
      ),
    ),
    [offers],
  );


  const conversationTransactions = useMemo(
    () => transactions.filter(
      transaction =>
        transaction.offer_id !== null &&
        conversationOfferIds.has(
          transaction.offer_id,
        ),
    ),
    [
      transactions,
      conversationOfferIds,
    ],
  );


  /*
   * Messages + offres + transactions
   * dans une seule timeline.
   */
  const timeline: TimelineItem[] = [
    ...messages.map(
      (message): TimelineItem => ({
        type: "MESSAGE",
        id: message.id,
        created_at:
          message.created_at,
        message,
      }),
    ),

    ...offers.map(
      (offer): TimelineItem => ({
        type: "OFFER",
        id: offer.id,
        created_at:
          offer.created_at,
        offer,
      }),
    ),

    ...conversationTransactions.map(
      (
        transaction,
      ): TimelineItem => ({
        type: "TRANSACTION",
        id: transaction.id,
        created_at:
          transaction.created_at,
        transaction,
      }),
    ),
  ].sort(
    (a, b) =>
      new Date(
        a.created_at,
      ).getTime() -
      new Date(
        b.created_at,
      ).getTime(),
  );


  if (
    authLoading ||
    loading
  ) {
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

      <Link
        to="/messages"
        className="back-link"
      >
        Retour aux messages
      </Link>


      {error && (
        <p
          className="form-error"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="conversation-sync-bar">
        <span>
          {refreshing
            ? "Actualisation..."
            : lastSyncedAt
              ? `Dernière actualisation ${lastSyncedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
              : "Conversation chargée"}
        </span>

        <button
          type="button"
          className="text-button"
          disabled={refreshing}
          onClick={() => void loadConversation({ silent: true })}
        >
          Actualiser
        </button>
      </div>


      <section className="messages-panel">

        <div className="message-stack">

          {timeline.length === 0 ? (
            <div className="empty-state">
              Aucun message, offre ou transaction
              pour le moment.
            </div>
          ) : (
            timeline.map(item => {

              /*
               * OFFRE
               */
              if (
                item.type ===
                "OFFER"
              ) {
                return (
                  <OfferCard
                    key={`offer-${item.id}`}
                    offer={
                      item.offer
                    }
                    currentUserId={
                      user.id
                    }
                    loading={
                      offerActionLoading ===
                      item.offer.id
                    }
                    onAccept={() =>
                      void handleAcceptOffer(
                        item.offer.id,
                      )
                    }
                    onReject={() =>
                      void handleRejectOffer(
                        item.offer.id,
                      )
                    }
                  />
                );
              }


              /*
               * TRANSACTION
               */
              if (
                item.type ===
                "TRANSACTION"
              ) {
                return (
                  <TransactionCard
                    key={`transaction-${item.id}`}
                    transaction={
                      item.transaction
                    }
                    currentUserId={
                      user.id
                    }
                    loading={
                      transactionActionId ===
                      item.transaction.id
                    }
                    onConfirm={() =>
                      void handleConfirmTransaction(
                        item.transaction.id,
                      )
                    }
                  />
                );
              }


              /*
               * MESSAGE
               */
              return (
                <MessageBubble
                  key={`message-${item.id}`}
                  message={
                    item.message
                  }
                  mine={
                    item.message
                      .sender_id ===
                    user.id
                  }
                  onReport={reportingMessageId === item.message.id ? undefined : reportMessage}
                />
              );
            })
          )}

        </div>


        <MessageComposer
          text={text}
          sending={sending}
          onChange={setText}
          onSubmit={() =>
            void sendMessage()
          }
        />

      </section>
    </div>
  );
}