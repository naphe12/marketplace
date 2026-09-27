import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit3,
  Eye,
  Heart,
  Mail,
  MessageCircle,
  LogOut,
  PackagePlus,
  Plus,
  Save,
  ShieldCheck,
  UserRound,
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

import type {
  Listing,
} from "../types/listing";

import type {
  UserReview,
} from "../types/reputation";

import type {
  Conversation,
} from "../components/messages/types";

type ListingStats = {
  listing_id: string;
  views: number;
  favorites: number;
  conversations: number;
};


const statusLabels: Record<string, string> = {
  ACTIVE: "En ligne",
  DRAFT: "Brouillon",
  PENDING_PAYMENT: "Paiement requis",
  EXPIRED: "Expirée",
  SUSPENDED: "Suspendue",
};

const statusTones: Record<string, string> = {
  ACTIVE: "success",
  DRAFT: "neutral",
  PENDING_PAYMENT: "warning",
  EXPIRED: "danger",
  SUSPENDED: "danger",
};


function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(new Date(value));
}


function formatPrice(
  value: string | null,
  currency: string,
) {
  if (!value) {
    return "Prix non renseigné";
  }

  return `${Number(value).toLocaleString("fr-FR")} ${currency}`;
}


function getPrimaryImage(listing: Listing) {
  return (
    listing.images?.find(image => image.is_primary) ??
    listing.images?.[0] ??
    null
  );
}


export default function ProfilePage() {
  const {
    user,
    logout,
    refreshUser,
  } = useAuth();

  const [listings, setListings] =
    useState<Listing[]>([]);

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [reviews, setReviews] =
    useState<UserReview[]>([]);

  const [listingStats, setListingStats] =
    useState<Record<string, ListingStats>>({});

  const [loadingListings, setLoadingListings] =
    useState(false);

  const [error, setError] =
    useState("");

  const [attempt, setAttempt] =
    useState(0);

  const [profileForm, setProfileForm] =
    useState({
      first_name: "",
      last_name: "",
      display_name: "",
      email: "",
      avatar_url: "",
      bio: "",
    });

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [profileMessage, setProfileMessage] =
    useState("");

  const [phoneCode, setPhoneCode] =
    useState("");

  const [phoneVerificationMessage, setPhoneVerificationMessage] =
    useState("");

  const [phoneVerificationLoading, setPhoneVerificationLoading] =
    useState(false);


  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileForm({
      first_name: user.profile?.first_name ?? "",
      last_name: user.profile?.last_name ?? "",
      display_name: user.profile?.display_name ?? "",
      email: user.email ?? "",
      avatar_url: user.profile?.avatar_url ?? "",
      bio: user.profile?.bio ?? "",
    });
  }, [user]);


  useEffect(() => {
    if (!user) {
      setListings([]);
      setConversations([]);
      setReviews([]);
      setListingStats({});
      return;
    }

    let mounted = true;

    setLoadingListings(true);
    setError("");

    Promise.all([
      apiRequest<Listing[]>(
        "/listings/mine",
        {
          authenticated: true,
        },
      ),
      apiRequest<Conversation[]>(
        "/conversations",
        {
          authenticated: true,
        },
      ),
      apiRequest<ListingStats[]>(
        "/listings/mine/stats",
        {
          authenticated: true,
        },
      ),
      apiRequest<UserReview[]>(
        `/transactions/users/${user.id}/reviews`,
        {
          authenticated: true,
        },
      ),
    ])
      .then(([loadedListings, loadedConversations, loadedStats, loadedReviews]) => {
        if (mounted) {
          setListings(loadedListings);
          setConversations(loadedConversations);
          setListingStats(Object.fromEntries(loadedStats.map(item => [item.listing_id, item])));
          setReviews(loadedReviews);
        }
      })
      .catch(cause => {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger votre espace vendeur.",
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingListings(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    user,
    attempt,
  ]);


  async function requestPhoneVerification() {
    setPhoneVerificationLoading(true);
    setPhoneVerificationMessage("");

    try {
      await apiRequest(
        "/verifications/phone/request",
        {
          method: "POST",
          authenticated: true,
        },
      );

      setPhoneVerificationMessage("Code envoyé par SMS.");
    } catch (cause) {
      setPhoneVerificationMessage(
        cause instanceof Error
          ? cause.message
          : "Impossible d'envoyer le code.",
      );
    } finally {
      setPhoneVerificationLoading(false);
    }
  }


  async function confirmPhoneVerification() {
    if (!phoneCode.trim()) {
      return;
    }

    setPhoneVerificationLoading(true);
    setPhoneVerificationMessage("");

    try {
      await apiRequest(
        "/verifications/phone/confirm",
        {
          method: "POST",
          authenticated: true,
          body: JSON.stringify({
            code: phoneCode.trim(),
          }),
        },
      );

      setPhoneCode("");
      await refreshUser();
      setPhoneVerificationMessage("Téléphone vérifié.");
    } catch (cause) {
      setPhoneVerificationMessage(
        cause instanceof Error
          ? cause.message
          : "Code invalide.",
      );
    } finally {
      setPhoneVerificationLoading(false);
    }
  }


  const stats = useMemo(() => {
    const active = listings.filter(
      listing => listing.status === "ACTIVE",
    ).length;

    const drafts = listings.filter(
      listing => listing.status === "DRAFT",
    ).length;

    const pendingPayment = listings.filter(
      listing => listing.status === "PENDING_PAYMENT",
    ).length;

    const expired = listings.filter(
      listing => listing.status === "EXPIRED",
    ).length;

    const views = Object.values(listingStats).reduce((sum, item) => sum + item.views, 0);
    const favorites = Object.values(listingStats).reduce((sum, item) => sum + item.favorites, 0);

    return {
      active,
      drafts,
      pendingPayment,
      expired,
      conversations: conversations.length,
      views,
      favorites,
      total: listings.length,
    };
  }, [listings, conversations, listingStats]);


  const sortedListings = useMemo(
    () => [...listings].sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    ),
    [listings],
  );


  async function saveProfile() {
    if (!user || savingProfile) {
      return;
    }

    setSavingProfile(true);
    setProfileMessage("");

    try {
      await apiRequest(
        "/auth/me",
        {
          method: "PATCH",
          authenticated: true,
          body: JSON.stringify({
            email: profileForm.email.trim() || null,
            first_name: profileForm.first_name.trim() || null,
            last_name: profileForm.last_name.trim() || null,
            display_name: profileForm.display_name.trim() || null,
            avatar_url: profileForm.avatar_url.trim() || null,
            bio: profileForm.bio.trim() || null,
          }),
        },
      );

      await refreshUser();
      setProfileMessage("Profil mis à jour.");
    } catch (cause) {
      setProfileMessage(
        cause instanceof Error
          ? cause.message
          : "Impossible de mettre à jour le profil.",
      );
    } finally {
      setSavingProfile(false);
    }
  }


  if (!user) {
    return (
      <div className="page profile-page">
        <section className="profile-empty-auth">
          <h1>Profil</h1>

          <p>
            Connectez-vous pour gérer vos annonces,
            reprendre vos brouillons et suivre vos ventes.
          </p>

          <Link
            to="/login?returnTo=/profile"
            className="primary-button"
          >
            Se connecter
          </Link>
        </section>
      </div>
    );
  }


  const displayName =
    user.profile?.display_name ||
    [
      user.profile?.first_name,
      user.profile?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Mon espace";

  const avatarLabel =
    displayName
      .split(" ")
      .map(part => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user.phone.slice(-2);

  const identityStatus =
    user.identity_verification_status;


  return (
    <div className="page profile-page">
      <section className="seller-dashboard-hero">
        <div className="seller-dashboard-identity">
          <div className="seller-dashboard-avatar">
            {user.profile?.avatar_url ? (
              <img src={user.profile.avatar_url} alt="" />
            ) : (
              avatarLabel
            )}
          </div>

          <div>
            <span>Compte vendeur</span>

            <h1>{displayName}</h1>

            <p>{user.profile?.bio || user.phone}</p>
          </div>
        </div>

        <div className="seller-dashboard-actions">
          <Link
            to="/publish"
            className="primary-button inline-button"
          >
            <Plus size={17} />
            Nouvelle annonce
          </Link>

          <button
            type="button"
            className="secondary-button inline-button"
            onClick={logout}
          >
            <LogOut size={17} />
            Se déconnecter
          </button>
        </div>
      </section>

      <section className="profile-editor-card">
        <div className="seller-section-heading">
          <div>
            <span>Profil public</span>
            <h2>Identité vendeur</h2>
          </div>

          <button
            type="button"
            className="primary-button inline-button"
            disabled={savingProfile}
            onClick={() => void saveProfile()}
          >
            <Save size={16} />
            {savingProfile ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>

        <div className="profile-form-grid">
          <label className="form-field">
            Prénom
            <input
              value={profileForm.first_name}
              onChange={event => setProfileForm(current => ({ ...current, first_name: event.target.value }))}
            />
          </label>

          <label className="form-field">
            Nom
            <input
              value={profileForm.last_name}
              onChange={event => setProfileForm(current => ({ ...current, last_name: event.target.value }))}
            />
          </label>

          <label className="form-field">
            Nom affiché
            <input
              value={profileForm.display_name}
              onChange={event => setProfileForm(current => ({ ...current, display_name: event.target.value }))}
            />
          </label>

          <label className="form-field">
            Email
            <input
              type="email"
              value={profileForm.email}
              onChange={event => setProfileForm(current => ({ ...current, email: event.target.value }))}
            />
          </label>

          <label className="form-field profile-form-grid__wide">
            URL avatar
            <input
              value={profileForm.avatar_url}
              onChange={event => setProfileForm(current => ({ ...current, avatar_url: event.target.value }))}
            />
          </label>

          <label className="form-field profile-form-grid__wide">
            Bio
            <textarea
              rows={3}
              value={profileForm.bio}
              onChange={event => setProfileForm(current => ({ ...current, bio: event.target.value }))}
            />
          </label>
        </div>

        {profileMessage && (
          <p className="seller-muted">
            {profileMessage}
          </p>
        )}
      </section>

      <section className="profile-verification-grid">
        <article className="profile-verification-card profile-verification-card--stacked">
          <div>
            <ShieldCheck size={21} />

            <div>
              <strong>Téléphone</strong>
              <span>{user.phone}</span>
            </div>
          </div>

          <span className={user.phone_verified ? "profile-verification-badge profile-verification-badge--ok" : "profile-verification-badge"}>
            {user.phone_verified ? "Vérifié" : "À vérifier"}
          </span>

          {!user.phone_verified && (
            <div className="phone-verification-actions">
              <button
                type="button"
                className="secondary-button inline-button"
                disabled={phoneVerificationLoading}
                onClick={() => void requestPhoneVerification()}
              >
                Recevoir un code
              </button>

              <input
                value={phoneCode}
                onChange={event => setPhoneCode(event.target.value)}
                placeholder="Code SMS"
              />

              <button
                type="button"
                className="primary-button inline-button"
                disabled={phoneVerificationLoading || !phoneCode.trim()}
                onClick={() => void confirmPhoneVerification()}
              >
                Vérifier
              </button>

              {phoneVerificationMessage && (
                <small>{phoneVerificationMessage}</small>
              )}
            </div>
          )}
        </article>

        <article className="profile-verification-card">
          <div>
            <Mail size={21} />

            <div>
              <strong>Email</strong>
              <span>{user.email || "Non renseigné"}</span>
            </div>
          </div>

          <span className={user.email_verified ? "profile-verification-badge profile-verification-badge--ok" : "profile-verification-badge"}>
            {user.email_verified ? "Vérifié" : "À compléter"}
          </span>
        </article>

        <article className="profile-verification-card">
          <div>
            <UserRound size={21} />

            <div>
              <strong>Identité</strong>
              <span>KYC vendeur</span>
            </div>
          </div>

          <span className={identityStatus === "VERIFIED" ? "profile-verification-badge profile-verification-badge--ok" : "profile-verification-badge"}>
            {identityStatus === "VERIFIED"
              ? "Validée"
              : identityStatus === "PENDING"
                ? "En attente"
                : identityStatus === "REJECTED"
                  ? "Refusée"
                  : "Non démarrée"}
          </span>
        </article>
      </section>

      <section className="seller-stats-grid" aria-label="Résumé vendeur">
        <article className="seller-stat-card">
          <CheckCircle2 size={19} />
          <span>En ligne</span>
          <strong>{stats.active}</strong>
        </article>

        <article className="seller-stat-card">
          <Edit3 size={19} />
          <span>Brouillons</span>
          <strong>{stats.drafts}</strong>
        </article>

        <article className="seller-stat-card seller-stat-card--warning">
          <CreditCard size={19} />
          <span>Paiement</span>
          <strong>{stats.pendingPayment}</strong>
        </article>

        <article className="seller-stat-card seller-stat-card--danger">
          <Clock3 size={19} />
          <span>Expirées</span>
          <strong>{stats.expired}</strong>
        </article>

        <article className="seller-stat-card">
          <MessageCircle size={19} />
          <span>Messages</span>
          <strong>{stats.conversations}</strong>
        </article>

        <article className="seller-stat-card">
          <Heart size={19} />
          <span>Favoris</span>
          <strong>{stats.favorites}</strong>
        </article>

        <article className="seller-stat-card">
          <Eye size={19} />
          <span>Vues</span>
          <strong>{stats.views}</strong>
        </article>
      </section>


      <section className="seller-listings-panel">
        <div className="seller-section-heading">
          <div>
            <span>{reviews.length} avis reçu{reviews.length > 1 ? "s" : ""}</span>
            <h2>Réputation</h2>
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="seller-muted">
            Vos avis reçus après transaction apparaîtront ici.
          </p>
        ) : (
          <div className="seller-review-history">
            {reviews.slice(0, 8).map(review => (
              <article key={review.id} className="seller-review-history__item">
                <strong>{review.rating}/5</strong>
                <p>{review.comment || "Avis sans commentaire."}</p>
                <small>{new Date(review.created_at).toLocaleDateString("fr-FR")}</small>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="seller-listings-panel">
        <div className="seller-section-heading">
          <div>
            <span>{stats.total} annonce{stats.total > 1 ? "s" : ""}</span>
            <h2>Mes annonces</h2>
          </div>

          <button
            type="button"
            className="text-button"
            disabled={loadingListings}
            onClick={() => setAttempt(value => value + 1)}
          >
            Actualiser
          </button>
        </div>

        {error && (
          <div className="seller-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loadingListings && (
          <p role="status" className="seller-muted">
            Chargement de vos annonces...
          </p>
        )}

        {!loadingListings && sortedListings.length === 0 && (
          <div className="seller-empty-state">
            <PackagePlus size={24} />
            <h3>Aucune annonce pour le moment</h3>
            <p>
              Créez votre première annonce et retrouvez-la ici
              dès le brouillon.
            </p>
            <Link to="/publish" className="primary-button inline-button">
              <Plus size={17} />
              Créer une annonce
            </Link>
          </div>
        )}

        <div className="seller-listings-list">
          {sortedListings.map(listing => {
            const image = getPrimaryImage(listing);
            const tone = statusTones[listing.status] ?? "neutral";

            return (
              <article key={listing.id} className="seller-listing-row">
                <div className="seller-listing-thumb">
                  {image ? (
                    <img
                      src={image.thumbnail_url ?? image.image_url}
                      alt={listing.title}
                      loading="lazy"
                    />
                  ) : (
                    <span>Photo</span>
                  )}
                </div>

                <div className="seller-listing-main">
                  <div className="seller-listing-title-row">
                    <h3>{listing.title || "Annonce sans titre"}</h3>
                    <span className={`seller-status seller-status--${tone}`}>
                      {statusLabels[listing.status] ?? listing.status}
                    </span>
                  </div>

                  <div className="seller-listing-meta">
                    <span>{formatPrice(listing.price, listing.currency)}</span>
                    <span>Créée le {formatDate(listing.created_at)}</span>
                    <span>{listingStats[listing.id]?.views ?? 0} vue(s)</span>
                    <span>{listingStats[listing.id]?.favorites ?? 0} favori(s)</span>
                    <span>{listingStats[listing.id]?.conversations ?? 0} message(s)</span>
                    {listing.expires_at && (
                      <span>Expire le {formatDate(listing.expires_at)}</span>
                    )}
                  </div>
                </div>

                <div className="seller-listing-actions">
                  {listing.status === "DRAFT" ? (
                    <Link to={`/publish/${listing.id}`} className="secondary-button inline-button">
                      <Edit3 size={16} />
                      Reprendre
                    </Link>
                  ) : listing.status === "PENDING_PAYMENT" ? (
                    <Link to={`/listings/${listing.id}/packages`} className="primary-button inline-button">
                      <CreditCard size={16} />
                      Payer
                    </Link>
                  ) : listing.status === "ACTIVE" || listing.status === "EXPIRED" ? (
                    <>
                      <Link to={`/listings/${listing.id}`} className="secondary-button inline-button">
                        Voir
                      </Link>
                      <Link to={`/listings/${listing.id}/packages`} className="primary-button inline-button">
                        <CreditCard size={16} />
                        {listing.status === "EXPIRED" ? "Renouveler" : "Booster"}
                      </Link>
                    </>
                  ) : (
                    <Link to={`/listings/${listing.id}`} className="secondary-button inline-button">
                      Voir
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
