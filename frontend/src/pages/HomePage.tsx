import {
  ArrowRight,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";

import CategoryScroller from "../components/home/CategoryScroller";
import ListingCard from "../components/listings/ListingCard";
import HomeSkeleton from "../components/ui/HomeSkeleton";

import type { Category } from "../types/category";

import type {
  Listing,
  ListingSearchResponse,
} from "../types/listing";


export default function HomePage() {
  const navigate = useNavigate();

  const { user } = useAuth();

  const [query, setQuery] =
    useState("");

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [listings, setListings] =
    useState<Listing[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);


  useEffect(() => {
    async function loadHome() {
      setLoading(true);
      setError(null);

      try {
        const requests = [
          apiRequest<Category[]>(
            "/categories",
          ),

          apiRequest<ListingSearchResponse>(
            "/listings?limit=12&sort=newest",
          ),
        ] as const;


        const [
          categoriesResponse,
          listingsResponse,
        ] = await Promise.all(requests);


        let favorites =
          new Set<string>();


        if (user) {
          try {
            const favoriteListings =
              await apiRequest<Listing[]>(
                "/favorites",
                {
                  authenticated: true,
                },
              );

            favorites = new Set(
              favoriteListings.map(
                item => item.id,
              ),
            );
          } catch {
            // Les favoris ne doivent pas
            // empêcher l'accueil de charger.
          }
        }


        setCategories(
          categoriesResponse,
        );


        setListings(
          listingsResponse.items.map(
            listing => ({
              ...listing,

              is_favorite:
                favorites.has(
                  listing.id,
                ),
            }),
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger l'accueil.",
        );
      } finally {
        setLoading(false);
      }
    }


    loadHome();
  }, [user]);


  function submitSearch(
    event: FormEvent,
  ) {
    event.preventDefault();

    const cleaned =
      query.trim();

    if (!cleaned) {
      navigate("/search");
      return;
    }

    navigate(
      `/search?q=${encodeURIComponent(
        cleaned,
      )}`,
    );
  }


  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__content">
          <div className="hero-eyebrow">
            <ShieldCheck size={17} />

            <span>
              Achetez et vendez
              avec plus de confiance
            </span>
          </div>

          <h1>
            Trouvez ce que vous cherchez,
            près de chez vous.
          </h1>

          <p>
            Découvrez des milliers
            d'annonces et échangez
            directement avec les vendeurs.
          </p>


          <form
            className="hero-search"
            onSubmit={submitSearch}
          >
            <Search size={21} />

            <input
              value={query}
              onChange={event =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Téléphone, voiture, maison..."
              aria-label="Rechercher une annonce"
            />

            <button type="submit">
              Rechercher
            </button>
          </form>
        </div>
      </section>


      {loading ? (
        <HomeSkeleton />
      ) : error ? (
        <section className="home-error">
          <h2>
            Impossible de charger
            les annonces
          </h2>

          <p>{error}</p>
        </section>
      ) : (
        <>
          <section className="home-section">
            <div className="home-section__heading">
              <div>
                <span className="section-kicker">
                  Explorer
                </span>

                <h2>
                  Catégories
                </h2>
              </div>

              <button
                type="button"
                className="section-link"
                onClick={() =>
                  navigate("/search")
                }
              >
                Tout voir

                <ArrowRight size={16} />
              </button>
            </div>

            <CategoryScroller
              categories={categories}
            />
          </section>


          <section className="trust-banner">
            <div className="trust-banner__icon">
              <ShieldCheck size={25} />
            </div>

            <div>
              <strong>
                Des profils plus fiables
              </strong>

              <p>
                Vérification,
                transactions et avis
                contribuent à construire
                la confiance.
              </p>
            </div>
          </section>


          <section className="home-section">
            <div className="home-section__heading">
              <div>
                <span className="section-kicker">
                  <Sparkles size={14} />
                  Nouveautés
                </span>

                <h2>
                  Annonces récentes
                </h2>
              </div>

              <button
                type="button"
                className="section-link"
                onClick={() =>
                  navigate(
                    "/search?sort=newest",
                  )
                }
              >
                Voir tout

                <ArrowRight size={16} />
              </button>
            </div>


            {listings.length === 0 ? (
              <div className="empty-state">
                <h3>
                  Pas encore d'annonces
                </h3>

                <p>
                  Soyez parmi les premiers
                  à publier une annonce.
                </p>

                <button
                  type="button"
                  className="primary-button inline-button"
                  onClick={() =>
                    navigate("/publish")
                  }
                >
                  Publier une annonce
                </button>
              </div>
            ) : (
              <div className="listing-grid">
                {listings.map(
                  listing => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                    />
                  ),
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}