import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import PhotoUploader from "../components/publish/PhotoUploader";
import EditListingForm from "../components/listings/EditListingForm";
import type { ListingDetail } from "../types/listing";

export default function ListingDetailPage() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [interestLoading, setInterestLoading] = useState(false);

  // Offre
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setEditing(false);
    setSaved(false);
    setLoading(true);
    setError(null);
    setListing(null);
    setSelectedImage(null);

    setConversationId(null);
    setOfferModalOpen(false);
    setOfferAmount("");
    setOfferError(null);

    if (!listingId) {
      setError("Annonce introuvable.");
      setLoading(false);
      return;
    }

    apiRequest<ListingDetail>(
      `/listings/${listingId}`,
      {
        signal: controller.signal,
      },
    )
      .then(result => {
        if (controller.signal.aborted) return;

        setListing(result);

        setSelectedImage(
          result.images.find(image => image.is_primary)?.id ?? null,
        );
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : "Impossible de charger l’annonce.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [listingId, attempt]);

  const images = [...(listing?.images ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  const photo =
    images.find(image => image.id === selectedImage) ?? images[0];

  const conditions: Record<string, string> = {
    NEW: "Neuf",
    USED: "Occasion",
    REFURBISHED: "Reconditionné",
  };

  /*
   * 1. Création/récupération de la conversation
   */
  async function handleInterest() {
    if (!listing) {
      return;
    }

    setInterestLoading(true);
    setError(null);
    setOfferError(null);

    try {
      const result = await apiRequest<{
        conversation_id: string;
        created: boolean;
      }>(
        `/listings/${listing.id}/interest`,
        {
          method: "POST",
          authenticated: true,
        },
      );

      setConversationId(result.conversation_id);

      /*
       * Si le vendeur accepte les offres,
       * on propose immédiatement un montant.
       */
      if (listing.allow_offers) {
        setOfferAmount("");
        setOfferModalOpen(true);
        return;
      }

      /*
       * Sinon, conversation normale.
       */
      navigate(`/messages/${result.conversation_id}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de contacter le vendeur.",
      );
    } finally {
      setInterestLoading(false);
    }
  }

  /*
   * 2. Envoi de l'offre
   */
  async function handleSubmitOffer() {
    if (!listing || !conversationId) {
      return;
    }

    const amount = Number(offerAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setOfferError(
        "Veuillez saisir un montant valide.",
      );
      return;
    }

    setOfferLoading(true);
    setOfferError(null);

    try {
      await apiRequest(
        `/conversations/${conversationId}/offers`,
        {
          method: "POST",
          authenticated: true,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
          }),
        },
      );

      setOfferModalOpen(false);

      navigate(
        `/messages/${conversationId}`,
      );
    } catch (cause) {
      setOfferError(
        cause instanceof Error
          ? cause.message
          : "Impossible d'envoyer l'offre.",
      );
    } finally {
      setOfferLoading(false);
    }
  }

  /*
   * 3. Continuer sans offre
   */
  function handleContinueWithoutOffer() {
    if (!conversationId) {
      return;
    }

    setOfferModalOpen(false);
    setOfferAmount("");
    setOfferError(null);

    navigate(
      `/messages/${conversationId}`,
    );
  }

  /*
   * 4. Fermer la fenêtre
   *
   * La conversation existe déjà.
   * L'utilisateur pourra toujours la retrouver.
   */
  function handleCloseOfferModal() {
    setOfferModalOpen(false);
    setOfferError(null);
  }

  const numericOfferAmount =
    Number(offerAmount);

  const offerPercentage =
    listing?.price &&
    Number(listing.price) > 0 &&
    Number.isFinite(numericOfferAmount) &&
    numericOfferAmount > 0
      ? Math.round(
          (numericOfferAmount /
            Number(listing.price)) *
            100,
        )
      : null;

  return (
    <div className="page listing-detail">
      <Link
        to="/"
        className="listing-detail__back"
      >
        ← Retour aux annonces
      </Link>

      {loading && (
        <p role="status">
          Chargement de l’annonce…
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="form-error"
        >
          <p>{error}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              setAttempt(value => value + 1)
            }
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && listing && (
        <div className="listing-detail__owner-actions">
          {authLoading ? (
            <p role="status">
              Vérification de la connexion…
            </p>
          ) : !user ? (
            <Link
              className="secondary-button"
              to={`/login?returnTo=${encodeURIComponent(
                `/listings/${listing.id}`,
              )}`}
            >
              Se connecter pour modifier son annonce
            </Link>
          ) : user.id === listing.seller_id ? (
            <button
              type="button"
              className="primary-button"
              disabled={editing}
              onClick={() => {
                setEditing(true);
                setSaved(false);

                requestAnimationFrame(() => {
                  document
                    .querySelector<HTMLFormElement>(
                      ".listing-edit",
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });

                  document
                    .querySelector<HTMLInputElement>(
                      ".listing-edit input",
                    )
                    ?.focus({
                      preventScroll: true,
                    });
                });
              }}
            >
              {editing
                ? "Modification en cours"
                : "Modifier l’annonce"}
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              disabled={interestLoading}
              onClick={() =>
                void handleInterest()
              }
            >
              {interestLoading
                ? "Ouverture..."
                : "Je suis intéressé"}
            </button>
          )}
        </div>
      )}

      {!loading && listing && (
        <article className="listing-detail__grid">
          <div>
            <div className="listing-detail__photo">
              {photo ? (
                <img
                  src={photo.image_url}
                  alt={listing.title}
                />
              ) : (
                <p>
                  Aucune photo disponible
                </p>
              )}
            </div>

            {images.length > 1 && (
              <div
                className="listing-detail__thumbnails"
                aria-label="Photos de l’annonce"
              >
                {images.map(
                  (image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      aria-label={`Voir la photo ${
                        index + 1
                      }`}
                      aria-pressed={
                        photo?.id === image.id
                      }
                      onClick={() =>
                        setSelectedImage(
                          image.id,
                        )
                      }
                    >
                      <img
                        src={
                          image.thumbnail_url ??
                          image.image_url
                        }
                        alt=""
                        loading="lazy"
                      />
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          <section className="listing-detail__information">
            <h1>{listing.title}</h1>

            {saved && (
              <p role="status">
                Les modifications ont été
                enregistrées.
              </p>
            )}

            {editing &&
              user?.id ===
                listing.seller_id && (
                <div>
                  <PhotoUploader
                    key={`photos-${listing.id}`}
                    listingId={listing.id}
                    initialImages={
                      listing.images
                    }
                    onChange={images => {
                      setListing(current =>
                        current
                          ? {
                              ...current,
                              images,
                            }
                          : current,
                      );

                      setSelectedImage(
                        images.find(
                          image =>
                            image.is_primary,
                        )?.id ?? null,
                      );
                    }}
                  />

                  <EditListingForm
                    key={listing.id}
                    listing={listing}
                    onCancel={() =>
                      setEditing(false)
                    }
                    onSaved={changes => {
                      setListing(current =>
                        current
                          ? {
                              ...current,
                              ...changes,
                            }
                          : current,
                      );

                      setEditing(false);
                      setSaved(true);
                    }}
                  />
                </div>
              )}

            <p className="listing-detail__price">
              {listing.price === null
                ? "Prix sur demande"
                : `${new Intl.NumberFormat(
                    "fr-BI",
                    {
                      maximumFractionDigits: 2,
                    },
                  ).format(
                    Number(listing.price),
                  )} ${listing.currency}`}
            </p>

            {listing.price_type ===
              "NEGOTIABLE" && (
              <p className="negotiable">
                Prix négociable
              </p>
            )}

            <dl className="listing-detail__facts">
              {listing.condition && (
                <div>
                  <dt>État</dt>
                  <dd>
                    {conditions[
                      listing.condition
                    ] ??
                      listing.condition}
                  </dd>
                </div>
              )}

              <div>
                <dt>Quantité</dt>
                <dd>{listing.quantity}</dd>
              </div>

              <div>
                <dt>Offres</dt>
                <dd>
                  {listing.allow_offers
                    ? "Acceptées"
                    : "Non acceptées"}
                </dd>
              </div>

              {listing.published_at && (
                <div>
                  <dt>Publication</dt>
                  <dd>
                    {new Date(
                      listing.published_at,
                    ).toLocaleDateString(
                      "fr-FR",
                    )}
                  </dd>
                </div>
              )}
            </dl>

            <h2>Description</h2>

            <p className="listing-detail__description">
              {listing.description ||
                "Aucune description renseignée."}
            </p>
          </section>
        </article>
      )}

      {/* ==========================
          MODAL FAIRE UNE OFFRE
         ========================== */}

      {offerModalOpen && listing && (
        <div
          className="offer-modal-backdrop"
          onMouseDown={event => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCloseOfferModal();
            }
          }}
        >
          <div
            className="offer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-modal-title"
          >
            <button
              type="button"
              className="offer-modal__close"
              onClick={
                handleCloseOfferModal
              }
              aria-label="Fermer"
            >
              ×
            </button>

            <h2 id="offer-modal-title">
              Faire une offre
            </h2>

            <p className="offer-modal__listing-title">
              {listing.title}
            </p>

            {listing.price !== null && (
              <div className="offer-modal__price">
                <span>
                  Prix demandé
                </span>

                <strong>
                  {new Intl.NumberFormat(
                    "fr-BI",
                  ).format(
                    Number(listing.price),
                  )}{" "}
                  {listing.currency}
                </strong>
              </div>
            )}

            <label
              htmlFor="offer-amount"
              className="offer-modal__label"
            >
              Votre offre
            </label>

            <div className="offer-modal__input">
              <input
                id="offer-amount"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                autoFocus
                value={offerAmount}
                onChange={event => {
                  setOfferAmount(
                    event.target.value,
                  );

                  setOfferError(null);
                }}
                placeholder="Ex. 850000"
              />

              <span>
                {listing.currency}
              </span>
            </div>

            {offerPercentage !== null && (
              <p className="offer-modal__percentage">
                Votre offre représente{" "}
                <strong>
                  {offerPercentage} %
                </strong>{" "}
                du prix demandé.
              </p>
            )}

            {offerError && (
              <p
                role="alert"
                className="form-error"
              >
                {offerError}
              </p>
            )}

            <button
              type="button"
              className="primary-button offer-modal__submit"
              disabled={
                offerLoading ||
                !offerAmount ||
                numericOfferAmount <= 0
              }
              onClick={() =>
                void handleSubmitOffer()
              }
            >
              {offerLoading
                ? "Envoi de l'offre..."
                : "Envoyer mon offre"}
            </button>

            <button
              type="button"
              className="secondary-button offer-modal__skip"
              disabled={offerLoading}
              onClick={
                handleContinueWithoutOffer
              }
            >
              Continuer sans offre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}