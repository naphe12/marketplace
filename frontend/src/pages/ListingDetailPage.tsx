import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nProvider";
import PhotoUploader from "../components/publish/PhotoUploader";
import EditListingForm from "../components/listings/EditListingForm";
import type { ListingDetail } from "../types/listing";
import type { ReputationProfile, UserReview } from "../types/reputation";
import ApproximateLocationMap from "../components/location/ApproximateLocationMap";
import { BadgeCheck, CircleAlert, Share2, Sparkles } from "lucide-react";

// Ne présume pas que types/listing.ts comporte déjà ces champs :
// l'API publique doit effectivement les renvoyer (centres de localité).
type DealAssistant = {
  verdict: string;
  score: number;
  price_position: string;
  reference_price: string | null;
  evaluated_price: string | null;
  comparable_count: number;
  trust_level: string | null;
  fraud_risk: string;
  reasons: string[];
};

type ListingWithLocation = ListingDetail & {
  latitude?: number | string | null;
  longitude?: number | string | null;
};

function parseCoordinate(
  value: number | string | null | undefined,
  limit: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}


export default function ListingDetailPage() {
  const { t } = useI18n();
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [listing, setListing] = useState<ListingWithLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sellerReputation, setSellerReputation] = useState<ReputationProfile | null>(null);
  const [sellerReviews, setSellerReviews] = useState<UserReview[]>([]);
  const [dealAssistant, setDealAssistant] = useState<DealAssistant | null>(null);
  const [dealAssistantLoading, setDealAssistantLoading] = useState(false);
  const [dealAssistantError, setDealAssistantError] = useState<string | null>(null);

  const [interestLoading, setInterestLoading] = useState(false);

  // Offre
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetType, setReportTargetType] = useState<"LISTING" | "USER">("LISTING");
  const [reportReason, setReportReason] = useState("FRAUD");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    if (!listingId || typeof window === "undefined") return "";

    return `${window.location.origin}/listings/${listingId}`;
  }, [listingId]);

  useEffect(() => {
    const controller = new AbortController();

    setEditing(false);
    setSaved(false);
    setLoading(true);
    setError(null);
    setListing(null);
    setSellerReputation(null);
    setSellerReviews([]);
    setDealAssistant(null);
    setDealAssistantLoading(false);
    setDealAssistantError(null);
    setSelectedImage(null);

    setConversationId(null);
    setOfferModalOpen(false);
    setOfferAmount("");
    setOfferError(null);
    setReportOpen(false);
    setReportSuccess(false);
    setReportError(null);
    setShareStatus(null);

    if (!listingId) {
      setError("Annonce introuvable.");
      setLoading(false);
      return;
    }

    apiRequest<ListingWithLocation>(
      `/listings/${listingId}`,
      {
        signal: controller.signal,
      },
    )
      .then(result => {
        if (controller.signal.aborted) return;

        setListing(result);

        void apiRequest(
          `/listings/${result.id}/view`,
          {
            method: "POST",
            signal: controller.signal,
          },
        ).catch(() => undefined);

        void apiRequest<ReputationProfile>(
          `/reputation/users/${result.seller_id}`,
          {
            signal: controller.signal,
          },
        )
          .then(profile => {
            if (!controller.signal.aborted) {
              setSellerReputation(profile);
            }
          })
          .catch(() => undefined);

        void apiRequest<UserReview[]>(
          `/transactions/users/${result.seller_id}/reviews`,
          {
            signal: controller.signal,
          },
        )
          .then(reviews => {
            if (!controller.signal.aborted) {
              setSellerReviews(reviews.slice(0, 3));
            }
          })
          .catch(() => undefined);

        if (user && !authLoading) {
          setDealAssistantLoading(true);
          setDealAssistantError(null);

          void apiRequest<DealAssistant>(`/deal-assistant/listings/${result.id}`, {
            authenticated: true,
            signal: controller.signal,
          })
            .then(assessment => {
              if (!controller.signal.aborted) {
                setDealAssistant(assessment);
              }
            })
            .catch(() => {
              if (!controller.signal.aborted) {
                setDealAssistantError(t("listing.dealAssistant.unavailable"));
              }
            })
            .finally(() => {
              if (!controller.signal.aborted) {
                setDealAssistantLoading(false);
              }
            });
        }

        setSelectedImage(
          result.images.find(image => image.is_primary)?.id ?? null,
        );
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : t("listing.loadError"),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [listingId, attempt, user, authLoading, t]);

  const images = [...(listing?.images ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  const photo =
    images.find(image => image.id === selectedImage) ?? images[0];

  const publicLatitude = parseCoordinate(listing?.latitude, 90);
  const publicLongitude = parseCoordinate(listing?.longitude, 180);

  const conditions: Record<string, string> = {
    NEW: t("publish.conditionNew"),
    USED: t("publish.conditionUsed"),
    REFURBISHED: t("publish.conditionRefurbished"),
  };

  function dealAssistantVerdictLabel(verdict: string) {
    if (verdict === "GOOD_DEAL") return t("listing.dealAssistant.goodDeal");
    if (verdict === "FAIR") return t("listing.dealAssistant.fair");
    if (verdict === "SUSPICIOUS") return t("listing.dealAssistant.suspicious");
    return t("listing.dealAssistant.risky");
  }

  function translateDealAssistantReason(reason: string) {
    if (reason === "Prix très inférieur aux annonces similaires.") return t("listing.dealAssistant.reason.suspiciouslyLow");
    if (reason === "Prix inférieur au marché comparable.") return t("listing.dealAssistant.reason.goodPrice");
    if (reason === "Prix cohérent avec les annonces similaires.") return t("listing.dealAssistant.reason.fairPrice");
    if (reason === "Prix au-dessus du marché comparable.") return t("listing.dealAssistant.reason.expensive");
    if (reason === "Prix nettement supérieur aux annonces similaires.") return t("listing.dealAssistant.reason.veryExpensive");
    if (reason === "Peu d'annonces comparables disponibles pour ce marché.") return t("listing.dealAssistant.reason.fewComparables");
    if (reason === "Vendeur avec réputation solide.") return t("listing.dealAssistant.reason.solidReputation");
    if (reason === "Vendeur encore peu établi sur la plateforme.") return t("listing.dealAssistant.reason.lowReputation");
    if (reason === "Réputation vendeur non encore calculée.") return t("listing.dealAssistant.reason.noReputation");
    if (reason === "Les contrôles de sécurité recommandent une prudence renforcée.") return t("listing.dealAssistant.reason.highRisk");
    if (reason === "Les contrôles de sécurité recommandent quelques vérifications avant achat.") return t("listing.dealAssistant.reason.mediumRisk");
    return reason;
  }

  /*
   * 1. Création/récupération de la conversation
   */
  async function reloadDealAssistant() {
    if (!listing) {
      return;
    }

    setDealAssistantLoading(true);
    setDealAssistantError(null);

    try {
      const assessment = await apiRequest<DealAssistant>(
        `/deal-assistant/listings/${listing.id}`,
        { authenticated: true },
      );
      setDealAssistant(assessment);
    } catch {
      setDealAssistantError(t("listing.dealAssistant.unavailable"));
    } finally {
      setDealAssistantLoading(false);
    }
  }


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
          : t("listing.contactError"),
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
        t("listing.invalidOffer"),
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
          : t("listing.offerError"),
      );
    } finally {
      setOfferLoading(false);
    }
  }

  /*
   * 3. {t("listing.continueWithoutOffer")}
   */
  function handleContinueWithoutOffer() {
    if (!conversationId) {
      return;
    }

    setOfferModalOpen(false);
    setOfferAmount("");
    setOfferError(null);
    setReportOpen(false);
    setReportSuccess(false);
    setReportError(null);
    setShareStatus(null);

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


  async function submitReport() {
    if (!listing) {
      return;
    }

    setReportLoading(true);
    setReportError(null);

    try {
      await apiRequest(
        "/reports",
        {
          method: "POST",
          authenticated: true,
          body: JSON.stringify({
            target_type: reportTargetType,
            target_id: reportTargetType === "USER" ? listing.seller_id : listing.id,
            reason: reportReason,
            description: reportDescription.trim() || null,
          }),
        },
      );

      setReportSuccess(true);
      setReportDescription("");
    } catch (cause) {
      setReportError(
        cause instanceof Error
          ? cause.message
          : t("listing.reportError"),
      );
    } finally {
      setReportLoading(false);
    }
  }

  async function shareListing() {
    if (!listing || !shareUrl) return;

    const title = listing.title;
    const text = `${t("listing.shareText")} ${listing.title}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url: shareUrl,
        });
        setShareStatus(t("listing.shareReady"));
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareStatus(t("listing.shareCopied"));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setShareStatus(t("listing.shareError"));
    }
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
        ← {t("listing.back")}
      </Link>

      {loading && (
        <p role="status">
          {t("listing.loading")}
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
            {t("listing.retry")}
          </button>
        </div>
      )}

      {!loading && listing && (
        <div className="listing-detail__owner-actions">
          <button
            type="button"
            className="secondary-button listing-share-button"
            onClick={() => void shareListing()}
          >
            <Share2 size={17} />
            {t("listing.share")}
          </button>

          {shareStatus && (
            <p className="listing-share-status" role="status">
              {shareStatus}
            </p>
          )}

          {authLoading ? (
            <p role="status">
              {t("listing.authCheck")}
            </p>
          ) : !user ? (
            <Link
              className="secondary-button"
              to={`/login?returnTo=${encodeURIComponent(
                `/listings/${listing.id}`,
              )}`}
            >
              {t("listing.loginToEdit")}
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
                ? t("listing.editing")
                : t("listing.edit")}
            </button>
          ) : (
            <div className="listing-detail__buyer-actions">
              <button
                type="button"
                className="primary-button"
                disabled={interestLoading}
                onClick={() =>
                  void handleInterest()
                }
              >
                {interestLoading
                  ? t("listing.opening")
                  : t("listing.interested")}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setReportTargetType("LISTING");
                  setReportOpen(true);
                }}
              >
                {t("listing.reportListing")}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setReportTargetType("USER");
                  setReportOpen(true);
                }}
              >
                {t("listing.reportSeller")}
              </button>
            </div>
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
                  {t("listing.noPhoto")}
                </p>
              )}
            </div>

            {images.length > 1 && (
              <div
                className="listing-detail__thumbnails"
                aria-label={t("listing.photosAria")}
              >
                {images.map(
                  (image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      aria-label={`${t("listing.viewPhoto")} ${index + 1}`}
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
                {t("listing.saved")}
              </p>
            )}


            {sellerReputation && (
              <section className="seller-reputation-card" aria-label={t("listing.seller")}>
                <div>
                  <span>{t("listing.seller")}</span>
                  <strong>
                    {sellerReputation.average_rating
                      ? `${Number(sellerReputation.average_rating).toFixed(1)} / 5`
                      : t("listing.notRated")}
                  </strong>
                  <small>
                    {sellerReputation.review_count} {t("listing.reviews")} · {sellerReputation.completed_as_seller} {t("listing.salesDone")}
                  </small>
                </div>

                <div className="seller-trust-badges">
                  <span>{sellerReputation.trust_level}</span>
                  {sellerReputation.phone_verified && <span>{t("listing.phoneVerified")}</span>}
                  {sellerReputation.identity_verified && <span>{t("listing.identityVerified")}</span>}
                </div>

                {sellerReviews.length > 0 && (
                  <div className="seller-review-list">
                    {sellerReviews.map(review => (
                      <blockquote key={review.id}>
                        <strong>{review.rating}/5</strong>
                        <p>{review.comment ?? t("listing.emptyReview")}</p>
                      </blockquote>
                    ))}
                  </div>
                )}
              </section>
            )}

            {(dealAssistant || (user && !authLoading)) && (
              <section className={`deal-assistant-card ${dealAssistant ? `deal-assistant-card--${dealAssistant.verdict.toLowerCase()}` : ""}`}>
                <div className="deal-assistant-card__heading">
                  {dealAssistant?.verdict === "GOOD_DEAL" ? <BadgeCheck size={20} /> : dealAssistant?.verdict === "SUSPICIOUS" || dealAssistant?.verdict === "RISKY" ? <CircleAlert size={20} /> : <Sparkles size={20} />}
                  <div>
                    <span>{t("listing.dealAssistant.title")}</span>
                    <strong>{dealAssistant ? dealAssistantVerdictLabel(dealAssistant.verdict) : dealAssistantLoading ? t("listing.dealAssistant.loading") : t("listing.dealAssistant.available")}</strong>
                  </div>
                  {dealAssistant && <b>{dealAssistant.score}/100</b>}
                </div>
                {dealAssistant ? (
                  <>
                    <p>{t("listing.dealAssistant.referencePrice")} : {dealAssistant.reference_price ? `${dealAssistant.reference_price} ${listing.currency}` : t("listing.dealAssistant.noComparables")} · {dealAssistant.comparable_count} {dealAssistant.comparable_count > 1 ? t("listing.dealAssistant.comparables") : t("listing.dealAssistant.comparable")}</p>
                    {dealAssistant.reasons.length > 0 && (
                      <ul>
                        {dealAssistant.reasons.slice(0, 3).map(reason => <li key={reason}>{translateDealAssistantReason(reason)}</li>)}
                      </ul>
                    )}
                  </>
                ) : (
                  <>
                    <p>{dealAssistantError ?? t("listing.dealAssistant.prompt")}</p>
                    <button
                      type="button"
                      className="secondary-button inline-button"
                      disabled={dealAssistantLoading}
                      onClick={() => void reloadDealAssistant()}
                    >
                      <Sparkles size={16} />
                      {dealAssistantLoading ? t("listing.dealAssistant.analyzing") : t("listing.dealAssistant.analyze")}
                    </button>
                  </>
                )}
              </section>
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
                ? t("listing.priceOnRequest")
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
                {t("listing.negotiablePrice")}
              </p>
            )}

            <dl className="listing-detail__facts">
              {listing.condition && (
                <div>
                  <dt>{t("listing.condition")}</dt>
                  <dd>
                    {conditions[
                      listing.condition
                    ] ??
                      listing.condition}
                  </dd>
                </div>
              )}

              <div>
                <dt>{t("listing.quantity")}</dt>
                <dd>{listing.quantity}</dd>
              </div>

              <div>
                <dt>{t("listing.offers")}</dt>
                <dd>
                  {listing.allow_offers
                    ? t("listing.accepted")
                    : t("listing.notAccepted")}
                </dd>
              </div>

              {listing.published_at && (
                <div>
                  <dt>{t("listing.publication")}</dt>
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

            <h2>{t("listing.description")}</h2>

            <p className="listing-detail__description">
              {listing.description ||
                t("listing.noDescription")}
            </p>

            {publicLatitude !== null && publicLongitude !== null && (
              <section className="listing-detail__location" aria-label={t("listing.approxLocation")}>
                <h2>{t("listing.approxLocation")}</h2>
                <p>{t("listing.approxLocationText")}</p>
                <ApproximateLocationMap
                  latitude={publicLatitude}
                  longitude={publicLongitude}
                  radiusMeters={2500}
                />
              </section>
            )}
          </section>
        </article>
      )}


      {reportOpen && listing && (
        <div
          className="offer-modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setReportOpen(false);
            }
          }}
        >
          <div className="offer-modal report-modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
            <button
              type="button"
              className="offer-modal__close"
              onClick={() => setReportOpen(false)}
              aria-label={t("listing.close")}
            >
              ×
            </button>

            <h2 id="report-modal-title">{reportTargetType === "USER" ? t("listing.reportThisSeller") : t("listing.reportThisListing")}</h2>
            <p className="offer-modal__listing-title">{listing.title}</p>

            {reportSuccess ? (
              <div className="checkout-success">
                <strong>{t("listing.reportSent")}</strong>
                <span>{t("listing.reportThanks")}</span>
              </div>
            ) : (
              <form className="report-form" onSubmit={event => {
                event.preventDefault();
                void submitReport();
              }}>
                <label className="form-field">
                  <span>{t("listing.reportReason")}</span>
                  <select value={reportReason} onChange={event => setReportReason(event.target.value)}>
                    <option value="FRAUD">{t("listing.reportFraud")}</option>
                    <option value="PROHIBITED_ITEM">{t("listing.reportProhibited")}</option>
                    <option value="MISLEADING">{t("listing.reportMisleading")}</option>
                    <option value="DUPLICATE">{t("listing.reportDuplicate")}</option>
                    <option value="OTHER">{t("listing.reportOther")}</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>{t("listing.reportDetails")}</span>
                  <textarea
                    value={reportDescription}
                    onChange={event => setReportDescription(event.target.value)}
                    placeholder={t("listing.reportPlaceholder")}
                    maxLength={3000}
                  />
                </label>

                {reportError && <p className="form-error" role="alert">{reportError}</p>}

                <button type="submit" className="primary-button" disabled={reportLoading}>
                  {reportLoading ? t("listing.reportSending") : t("listing.reportSend")}
                </button>
              </form>
            )}
          </div>
        </div>
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
              aria-label={t("listing.close")}
            >
              ×
            </button>

            <h2 id="offer-modal-title">
              {t("listing.makeOffer")}
            </h2>

            <p className="offer-modal__listing-title">
              {listing.title}
            </p>

            {listing.price !== null && (
              <div className="offer-modal__price">
                <span>
                  {t("listing.askingPrice")}
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
              {t("listing.yourOffer")}
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
                placeholder={t("listing.offerPlaceholder")}
              />

              <span>
                {listing.currency}
              </span>
            </div>

            {offerPercentage !== null && (
              <p className="offer-modal__percentage">
                {t("listing.offerRepresents")}{" "}
                <strong>
                  {offerPercentage} %
                </strong>{" "}
                {t("listing.ofAskingPrice")}
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
                ? t("listing.offerSending")
                : t("listing.offerSend")}
            </button>

            <button
              type="button"
              className="secondary-button offer-modal__skip"
              disabled={offerLoading}
              onClick={
                handleContinueWithoutOffer
              }
            >
              {t("listing.continueWithoutOffer")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}