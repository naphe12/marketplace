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
import OfferCard from "../components/messages/OfferCard";

import type {
  Message,
} from "../components/messages/types";

import type {
  ConversationOffer,
} from "../types/offer";

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

  const [text, setText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    offerActionLoading,
    setOfferActionLoading,
  ] = useState<string | null>(null);


  useEffect(() => {
    if (!conversationId || !user) {
      setLoading(false);
      return;
    }

    let mounted = true;

    setLoading(true);
    setError("");

    /*
     * Charger la conversation.
     *
     * Les messages sont prioritaires.
     * Une erreur sur les offres ne doit pas
     * empêcher l'affichage des messages.
     */
    async function loadConversation() {
      try {
        /*
         * 1. Charger les messages.
         */
        const loadedMessages =
          await apiRequest<Message[]>(
            `/conversations/${conversationId}/messages`,
            {
              authenticated: true,
            },
          );

        if (!mounted) {
          return;
        }

        setMessages(loadedMessages);

        /*
         * 2. Charger les offres séparément.
         */
        try {
          const loadedOffers =
            await apiRequest<ConversationOffer[]>(
              `/conversations/${conversationId}/offers`,
              {
                authenticated: true,
              },
            );

          if (mounted) {
            setOffers(loadedOffers);
          }
        } catch (offerError) {
          /*
           * On ne bloque pas la messagerie
           * si l'API des offres échoue.
           */
          console.error(
            "Impossible de charger les offres :",
            offerError,
          );

          if (mounted) {
            setOffers([]);
          }
        }
      } catch (cause) {
        /*
         * Ici, le chargement des messages
         * lui-même a échoué.
         */
        if (!mounted) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible de charger les messages.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadConversation();

    /*
     * Marquer la conversation comme lue.
     */
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
  }, [
    conversationId,
    user,
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
    }
  }


  /*
   * Recharger uniquement les offres.
   *
   * Utilisé après acceptation/refus.
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

      await reloadOffers();
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
   * Messages + offres dans une seule timeline.
   */
  const timeline: TimelineItem[] = [
    ...messages.map(
      (message): TimelineItem => ({
        type: "MESSAGE",
        id: message.id,
        created_at: message.created_at,
        message,
      }),
    ),

    ...offers.map(
      (offer): TimelineItem => ({
        type: "OFFER",
        id: offer.id,
        created_at: offer.created_at,
        offer,
      }),
    ),
  ].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime(),
  );


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


      <section className="messages-panel">

        <div className="message-stack">

          {timeline.length === 0 ? (
            <div className="empty-state">
              Aucun message ou offre pour le moment.
            </div>
          ) : (
            timeline.map(item => {

              /*
               * OFFRE
               */
              if (item.type === "OFFER") {
                return (
                  <OfferCard
                    key={`offer-${item.id}`}
                    offer={item.offer}
                    currentUserId={user.id}
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
               * MESSAGE
               */
              return (
                <MessageBubble
                  key={`message-${item.id}`}
                  message={item.message}
                  mine={
                    item.message.sender_id ===
                    user.id
                  }
                />
              );
            })
          )}

        </div>


        <MessageComposer
          text={text}
          onChange={setText}
          onSubmit={() =>
            void sendMessage()
          }
        />

      </section>
    </div>
  );
}