import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit3,
  Eye,
  Heart,
  MessageCircle,
  LogOut,
  PackagePlus,
  Plus,
  ShieldCheck,
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
  } = useAuth();

  const [listings, setListings] =
    useState<Listing[]>([]);

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [listingStats, setListingStats] =
    useState<Record<string, ListingStats>>({});

  const [loadingListings, setLoadingListings] =
    useState(false);

  const [error, setError] =
    useState("");

  const [attempt, setAttempt] =
    useState(0);


  useEffect(() => {
    if (!user) {
      setListings([]);
      setConversations([]);
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
    ])
      .then(([loadedListings, loadedConversations, loadedStats]) => {
        if (mounted) {
          setListings(loadedListings);
          setConversations(loadedConversations);
          setListingStats(Object.fromEntries(loadedStats.map(item => [item.listing_id, item])));
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


  return (
    <div className="page profile-page">
      <section className="seller-dashboard-hero">
        <div className="seller-dashboard-identity">
          <div className="seller-dashboard-avatar">
            {user.phone.slice(-2)}
          </div>

          <div>
            <span>Compte vendeur</span>

            <h1>Mon espace</h1>

            <p>{user.phone}</p>
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

      <section className="profile-verification-card">
        <div>
          <ShieldCheck size={21} />

          <div>
            <strong>Vérification du compte</strong>
            <span>
              {user.phone_verified
                ? "Votre numéro est vérifié."
                : "Vérifiez votre numéro pour renforcer la confiance."}
            </span>
          </div>
        </div>

        <span
          className={
            user.phone_verified
              ? "profile-verification-badge profile-verification-badge--ok"
              : "profile-verification-badge"
          }
        >
          {user.phone_verified
            ? "Vérifié"
            : "À compléter"}
        </span>
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
