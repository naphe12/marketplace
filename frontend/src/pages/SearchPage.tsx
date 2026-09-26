import {
  BellPlus,
  Filter,
  List,
  Map,
  RotateCcw,
  Search,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  apiRequest,
} from "../api/client";

import {
  useAuth,
} from "../auth/AuthContext";

import ListingCard from "../components/listings/ListingCard";
import SearchResultsMap from "../components/location/SearchResultsMap";

import type {
  Category,
} from "../types/category";

import type {
  ListingSearchResponse,
} from "../types/listing";

import type {
  AdministrativeArea,
} from "../types/location";

import type {
  SavedSearch,
} from "../types/savedSearch";


const PAGE_SIZE = 20;

const sortOptions = [
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
];

const conditions = [
  {
    value: "NEW",
    label: "Neuf",
  },
  {
    value: "USED",
    label: "Occasion",
  },
  {
    value: "REFURBISHED",
    label: "Reconditionné",
  },
];


function getParam(
  params: URLSearchParams,
  key: string,
) {
  return params.get(key) ?? "";
}


function compactParams(
  values: Record<string, string>,
) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== "",
    ),
  );
}


export default function SearchPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const query = getParam(params, "q");
  const requestedSort = getParam(params, "sort") || "newest";
  const sort = sortOptions.includes(requestedSort)
    ? requestedSort
    : "newest";

  const requestedOffset = Number(params.get("offset") ?? 0);
  const offset = Number.isSafeInteger(requestedOffset) && requestedOffset >= 0
    ? requestedOffset
    : 0;

  const categoryId = getParam(params, "category_id");
  const administrativeAreaId = getParam(params, "administrative_area_id");
  const priceMin = getParam(params, "price_min");
  const priceMax = getParam(params, "price_max");
  const condition = getParam(params, "condition");
  const priceType = getParam(params, "price_type");
  const allowOffers = getParam(params, "allow_offers");

  const [draft, setDraft] = useState({
    q: query,
    category_id: categoryId,
    administrative_area_id: administrativeAreaId,
    price_min: priceMin,
    price_max: priceMax,
    condition,
    price_type: priceType,
    allow_offers: allowOffers,
    sort,
  });

  const [results, setResults] =
    useState<ListingSearchResponse | null>(null);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [areas, setAreas] =
    useState<AdministrativeArea[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [filtersLoading, setFiltersLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [attempt, setAttempt] =
    useState(0);

  const [viewMode, setViewMode] =
    useState<"list" | "map">("list");

  const [savedSearches, setSavedSearches] =
    useState<SavedSearch[]>([]);

  const [savedSearchName, setSavedSearchName] =
    useState("");

  const [savingSearch, setSavingSearch] =
    useState(false);

  const [savedSearchError, setSavedSearchError] =
    useState("");


  useEffect(() => {
    setDraft({
      q: query,
      category_id: categoryId,
      administrative_area_id: administrativeAreaId,
      price_min: priceMin,
      price_max: priceMax,
      condition,
      price_type: priceType,
      allow_offers: allowOffers,
      sort,
    });
  }, [
    query,
    categoryId,
    administrativeAreaId,
    priceMin,
    priceMax,
    condition,
    priceType,
    allowOffers,
    sort,
  ]);


  useEffect(() => {
    let mounted = true;

    setFiltersLoading(true);

    Promise.all([
      apiRequest<Category[]>("/categories"),
      apiRequest<AdministrativeArea[]>("/administrative-areas"),
    ])
      .then(([loadedCategories, loadedAreas]) => {
        if (!mounted) {
          return;
        }

        setCategories(
          loadedCategories.filter(category => category.active),
        );

        setAreas(
          loadedAreas.filter(area => area.active),
        );
      })
      .finally(() => {
        if (mounted) {
          setFiltersLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);


  useEffect(() => {
    if (!user) {
      setSavedSearches([]);
      return;
    }

    apiRequest<SavedSearch[]>(
      "/saved-searches",
      {
        authenticated: true,
      },
    )
      .then(setSavedSearches)
      .catch(() => setSavedSearches([]));
  }, [user]);


  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");
    setResults(null);

    const search = new URLSearchParams(
      compactParams({
        q: query,
        category_id: categoryId,
        administrative_area_id: administrativeAreaId,
        price_min: priceMin,
        price_max: priceMax,
        condition,
        price_type: priceType,
        allow_offers: allowOffers,
        sort,
        offset: String(offset),
        limit: String(PAGE_SIZE),
      }),
    );

    apiRequest<ListingSearchResponse>(
      `/listings?${search}`,
      {
        signal: controller.signal,
      },
    )
      .then(data => {
        if (!controller.signal.aborted) {
          setResults(data);
        }
      })
      .catch(cause => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger les annonces.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    query,
    categoryId,
    administrativeAreaId,
    priceMin,
    priceMax,
    condition,
    priceType,
    allowOffers,
    sort,
    offset,
    attempt,
  ]);


  const locationOptions = useMemo(
    () => areas.map(area => ({
      ...area,
      label: [
        area.name,
        area.area_type,
      ].filter(Boolean).join(" · "),
    })),
    [areas],
  );


  function applyFilters(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setParams(
      compactParams({
        ...draft,
        q: draft.q.trim(),
        offset: "",
      }),
    );
  }


  function resetFilters() {
    setParams({});
  }


  const activeSearchParams = compactParams({
    q: query,
    category_id: categoryId,
    administrative_area_id: administrativeAreaId,
    price_min: priceMin,
    price_max: priceMax,
    condition,
    price_type: priceType,
    allow_offers: allowOffers,
    sort,
  });


  async function saveCurrentSearch() {
    if (!user) {
      setSavedSearchError("Connectez-vous pour sauvegarder cette recherche.");
      return;
    }

    const name = savedSearchName.trim() || query || "Recherche sauvegardée";

    setSavingSearch(true);
    setSavedSearchError("");

    try {
      const created = await apiRequest<SavedSearch>(
        "/saved-searches",
        {
          method: "POST",
          authenticated: true,
          body: JSON.stringify({
            name,
            query_params: activeSearchParams,
            alerts_enabled: true,
          }),
        },
      );

      setSavedSearches(current => [created, ...current]);
      setSavedSearchName("");
    } catch (cause) {
      setSavedSearchError(
        cause instanceof Error
          ? cause.message
          : "Impossible de sauvegarder cette recherche.",
      );
    } finally {
      setSavingSearch(false);
    }
  }


  async function deleteSavedSearch(savedSearch: SavedSearch) {
    await apiRequest(
      `/saved-searches/${savedSearch.id}`,
      {
        method: "DELETE",
        authenticated: true,
      },
    );

    setSavedSearches(current => current.filter(item => item.id !== savedSearch.id));
  }


  function applySavedSearch(savedSearch: SavedSearch) {
    setParams(compactParams(savedSearch.query_params));
  }


  function changePage(nextOffset: number) {
    setParams(
      compactParams({
        q: query,
        category_id: categoryId,
        administrative_area_id: administrativeAreaId,
        price_min: priceMin,
        price_max: priceMax,
        condition,
        price_type: priceType,
        allow_offers: allowOffers,
        sort,
        offset: String(nextOffset),
      }),
    );
  }


  return (
    <div className="page search-page">
      <div className="page-heading">
        <div>
          <h1>Rechercher une annonce</h1>
          <p>
            Filtrez les annonces disponibles par prix, catégorie,
            localisation et conditions de vente.
          </p>
        </div>
      </div>

      <form className="listing-search-form search-filter-panel" onSubmit={applyFilters}>
        <div className="listing-search-controls search-query-row">
          <label className="form-field search-query-field" htmlFor="listing-query">
            <span>Que recherchez-vous ?</span>
            <input
              id="listing-query"
              type="search"
              value={draft.q}
              onChange={event => setDraft(current => ({
                ...current,
                q: event.target.value,
              }))}
              placeholder="Téléphone, voiture, appartement..."
            />
          </label>

          <button type="submit" className="primary-button inline-button">
            <Search size={17} />
            Rechercher
          </button>
        </div>

        <div className="search-filter-grid">
          <label className="form-field">
            <span>Catégorie</span>
            <select
              value={draft.category_id}
              disabled={filtersLoading}
              onChange={event => setDraft(current => ({
                ...current,
                category_id: event.target.value,
              }))}
            >
              <option value="">Toutes les catégories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Localisation</span>
            <select
              value={draft.administrative_area_id}
              disabled={filtersLoading}
              onChange={event => setDraft(current => ({
                ...current,
                administrative_area_id: event.target.value,
              }))}
            >
              <option value="">Tout le Burundi</option>
              {locationOptions.map(area => (
                <option key={area.id} value={area.id}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Prix minimum</span>
            <input
              type="number"
              min="0"
              value={draft.price_min}
              onChange={event => setDraft(current => ({
                ...current,
                price_min: event.target.value,
              }))}
            />
          </label>

          <label className="form-field">
            <span>Prix maximum</span>
            <input
              type="number"
              min="0"
              value={draft.price_max}
              onChange={event => setDraft(current => ({
                ...current,
                price_max: event.target.value,
              }))}
            />
          </label>

          <label className="form-field">
            <span>État</span>
            <select
              value={draft.condition}
              onChange={event => setDraft(current => ({
                ...current,
                condition: event.target.value,
              }))}
            >
              <option value="">Tous les états</option>
              {conditions.map(item => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Type de prix</span>
            <select
              value={draft.price_type}
              onChange={event => setDraft(current => ({
                ...current,
                price_type: event.target.value,
              }))}
            >
              <option value="">Tous</option>
              <option value="FIXED">Prix fixe</option>
              <option value="NEGOTIABLE">Négociable</option>
            </select>
          </label>

          <label className="form-field">
            <span>Offres</span>
            <select
              value={draft.allow_offers}
              onChange={event => setDraft(current => ({
                ...current,
                allow_offers: event.target.value,
              }))}
            >
              <option value="">Indifférent</option>
              <option value="true">Offres acceptées</option>
              <option value="false">Sans offres</option>
            </select>
          </label>

          <label className="form-field">
            <span>Trier par</span>
            <select
              value={draft.sort}
              onChange={event => setDraft(current => ({
                ...current,
                sort: event.target.value,
              }))}
            >
              <option value="newest">Plus récentes</option>
              <option value="oldest">Plus anciennes</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>
          </label>
        </div>

        <div className="search-filter-actions">
          <button type="submit" className="primary-button inline-button">
            <Filter size={17} />
            Appliquer les filtres
          </button>

          <button
            type="button"
            className="secondary-button inline-button"
            onClick={resetFilters}
          >
            <RotateCcw size={16} />
            Réinitialiser
          </button>
        </div>
      </form>

      <section className="saved-search-panel">
        <div>
          <strong>Alertes de recherche</strong>
          <p>Enregistrez vos filtres pour les relancer rapidement.</p>
        </div>

        <div className="saved-search-create">
          <input
            value={savedSearchName}
            onChange={event => setSavedSearchName(event.target.value)}
            placeholder={query ? `Alerte ${query}` : "Nom de la recherche"}
          />
          <button
            type="button"
            className="primary-button inline-button"
            disabled={savingSearch}
            onClick={() => void saveCurrentSearch()}
          >
            <BellPlus size={16} />
            {savingSearch ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>

        {savedSearchError && <p className="form-error">{savedSearchError}</p>}

        {savedSearches.length > 0 && (
          <div className="saved-search-list">
            {savedSearches.map(savedSearch => (
              <div key={savedSearch.id} className="saved-search-item">
                <button type="button" onClick={() => applySavedSearch(savedSearch)}>
                  <strong>{savedSearch.name}</strong>
                  <span>{Object.keys(savedSearch.query_params).length} filtre(s)</span>
                </button>
                <button type="button" className="text-button" onClick={() => void deleteSavedSearch(savedSearch)}>
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {loading && (
        <p role="status">Chargement des annonces...</p>
      )}

      {error && (
        <div role="alert" className="seller-error">
          <p>{error}</p>
          <button type="button" onClick={() => setAttempt(value => value + 1)}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && results && (
        <>
          <div className="search-results-toolbar">
            <p role="status" className="search-result-count">
              {results.total} annonce{results.total > 1 ? "s" : ""} trouvée{results.total > 1 ? "s" : ""}
            </p>

            <div className="search-view-toggle" aria-label="Affichage des résultats">
              <button
                type="button"
                className={viewMode === "list" ? "search-view-toggle__item search-view-toggle__item--active" : "search-view-toggle__item"}
                onClick={() => setViewMode("list")}
              >
                <List size={16} />
                Liste
              </button>
              <button
                type="button"
                className={viewMode === "map" ? "search-view-toggle__item search-view-toggle__item--active" : "search-view-toggle__item"}
                onClick={() => setViewMode("map")}
              >
                <Map size={16} />
                Carte
              </button>
            </div>
          </div>

          {results.items.length === 0 && (
            <p>Aucune annonce ne correspond à votre recherche.</p>
          )}

          {viewMode === "map" ? (
            <SearchResultsMap listings={results.items} />
          ) : (
            <div className="listing-grid">
              {results.items.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {(offset > 0 || results.has_more) && (
            <nav className="listing-search-pagination" aria-label="Pagination des annonces">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => changePage(Math.max(0, offset - PAGE_SIZE))}
              >
                Précédent
              </button>

              <button
                type="button"
                disabled={!results.has_more}
                onClick={() => changePage(offset + PAGE_SIZE)}
              >
                Suivant
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
