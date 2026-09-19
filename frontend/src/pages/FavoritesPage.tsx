import {
  Heart,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ListingCard from "../components/listings/ListingCard";

import type {
  Listing,
} from "../types/listing";


export default function FavoritesPage() {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [favorites, setFavorites] =
    useState<Listing[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [attempt, setAttempt] =
    useState(0);


  useEffect(() => {
    if (authLoading || !user) {
      setFavorites([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller =
      new AbortController();

    setLoading(true);
    setError("");

    apiRequest<Listing[]>(
      "/favorites",
      {
        authenticated: true,
        signal: controller.signal,
      },
    )
      .then(items => {
        if (!controller.signal.aborted) {
          setFavorites(
            items.map(listing => ({
              ...listing,
              is_favorite: true,
            })),
          );
        }
      })
      .catch(cause => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger vos favoris.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [authLoading, user, attempt]);


  if (authLoading) {
    return (
      <div className="page">
        <p role="status">
          Chargement de votre compte...
        </p>
      </div>
    );
  }


  if (!user) {
    return (
      <div className="page empty-state">
        <Heart size={34} />

        <h1>Favoris</h1>

        <p>
          Connectez-vous pour retrouver les annonces
          que vous avez mises de côté.
        </p>

        <Link
          className="text-button"
          to="/login"
        >
          Se connecter
        </Link>
      </div>
    );
  }


  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Mes favoris</h1>

          <p>
            {favorites.length}
            {" "}
            annonce
            {favorites.length > 1 ? "s" : ""}
            {" "}
            enregistrée
            {favorites.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {loading && (
        <p role="status">
          Chargement de vos favoris...
        </p>
      )}

      {error && (
        <div
          className="inline-error"
          role="alert"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              setAttempt(value => value + 1)
            }
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && favorites.length === 0 && (
        <section className="empty-state">
          <Heart size={34} />

          <h2>Aucun favori pour le moment</h2>

          <p>
            Explorez les annonces et touchez le coeur
            pour les retrouver ici.
          </p>

          <Link
            className="text-button"
            to="/search"
          >
            Parcourir les annonces
          </Link>
        </section>
      )}

      {!loading && !error && favorites.length > 0 && (
        <div className="listing-grid">
          {favorites.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
            />
          ))}
        </div>
      )}
    </div>
  );
}
