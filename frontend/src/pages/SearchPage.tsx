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

import {
  useI18n,
} from "../i18n/I18nProvider";
import { useCountry } from "../market/CountryContext";
import { getLightPageSize, useConstrainedNetwork } from "../offline/network";

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


const NORMAL_PAGE_SIZE = 20;
const LIGHT_PAGE_SIZE = 8;

const sortOptions = [
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
];

const conditions = [
  "NEW",
  "USED",
  "REFURBISHED",
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
  const { t } = useI18n();
  const { countries, countryCode: activeCountryCode, setCountryCode } = useCountry();
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

  const countryCode = getParam(params, "country_code") || activeCountryCode;
  const categoryId = getParam(params, "category_id");
  const administrativeAreaId = getParam(params, "administrative_area_id");
  const priceMin = getParam(params, "price_min");
  const priceMax = getParam(params, "price_max");
  const condition = getParam(params, "condition");
  const priceType = getParam(params, "price_type");
  const allowOffers = getParam(params, "allow_offers");
  const latitude = getParam(params, "latitude");
  const longitude = getParam(params, "longitude");
  const radiusKm = getParam(params, "radius_km");

  const [draft, setDraft] = useState({
    q: query,
    country_code: countryCode,
    category_id: categoryId,
    administrative_area_id: administrativeAreaId,
    price_min: priceMin,
    price_max: priceMax,
    condition,
    price_type: priceType,
    allow_offers: allowOffers,
    latitude,
    longitude,
    radius_km: radiusKm,
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

  const liteMode = useConstrainedNetwork();
  const pageSize = getLightPageSize(NORMAL_PAGE_SIZE, LIGHT_PAGE_SIZE, liteMode);

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
      country_code: countryCode,
      category_id: categoryId,
      administrative_area_id: administrativeAreaId,
      price_min: priceMin,
      price_max: priceMax,
      condition,
      price_type: priceType,
      allow_offers: allowOffers,
      latitude,
      longitude,
      radius_km: radiusKm,
      sort,
    });
  }, [
    query,
    countryCode,
    categoryId,
    administrativeAreaId,
    priceMin,
    priceMax,
    condition,
    priceType,
    allowOffers,
    latitude,
    longitude,
    radiusKm,
    sort,
  ]);


  const selectedDraftCountryCode = draft.country_code || countryCode;

  useEffect(() => {
    let mounted = true;

    setFiltersLoading(true);

    Promise.all([
      apiRequest<Category[]>("/categories"),
      apiRequest<AdministrativeArea[]>(`/administrative-areas?country_code=${selectedDraftCountryCode}`),
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
  }, [countryCode, selectedDraftCountryCode]);


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
        latitude,
        longitude,
        radius_km: radiusKm,
        sort,
        offset: String(offset),
        limit: String(pageSize),
      }),
    );

    apiRequest<ListingSearchResponse>(
      `/listings?${search}`,
      {
        signal: controller.signal,
        cacheKey: `search:${search.toString()}`,
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
              : t("search.loadError"),
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
    countryCode,
    categoryId,
    administrativeAreaId,
    priceMin,
    priceMax,
    condition,
    priceType,
    allowOffers,
    latitude,
    longitude,
    radiusKm,
    sort,
    offset,
    attempt,
    pageSize,
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
    country_code: countryCode,
    category_id: categoryId,
    administrative_area_id: administrativeAreaId,
    price_min: priceMin,
    price_max: priceMax,
    condition,
    price_type: priceType,
    allow_offers: allowOffers,
    latitude,
    longitude,
    radius_km: radiusKm,
    sort,
  });


  async function saveCurrentSearch() {
    if (!user) {
      setSavedSearchError(t("search.savedLogin"));
      return;
    }

    const name = savedSearchName.trim() || query || t("search.savedDefault");

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
          : t("search.savedError"),
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


  function getConditionLabel(value: string) {
    if (value === "NEW") {
      return t("search.conditionNew");
    }

    if (value === "USED") {
      return t("search.conditionUsed");
    }

    return t("search.conditionRefurbished");
  }


  function changePage(nextOffset: number) {
    const nextParams = compactParams({
        q: query,
        category_id: categoryId,
        administrative_area_id: administrativeAreaId,
        price_min: priceMin,
        price_max: priceMax,
        condition,
        price_type: priceType,
        allow_offers: allowOffers,
        latitude,
        longitude,
        radius_km: radiusKm,
        sort,
        offset: String(nextOffset),
      });

    setParams(nextParams);
  }


  return (
    <div className="page search-page">
      <div className="page-heading">
        <div>
          <h1>{t("search.title")}</h1>
          <p>{t("search.subtitle")}</p>
        </div>
      </div>

      <form className="listing-search-form search-filter-panel" onSubmit={applyFilters}>
        <div className="listing-search-controls search-query-row">
          <label className="form-field search-query-field" htmlFor="listing-query">
            <span>{t("search.what")}</span>
            <input
              id="listing-query"
              type="search"
              value={draft.q}
              onChange={event => setDraft(current => ({
                ...current,
                q: event.target.value,
              }))}
              placeholder={t("search.placeholder")}
            />
          </label>

          <button type="submit" className="primary-button inline-button">
            <Search size={17} />
            {t("search.apply")}
          </button>
        </div>

        <div className="search-filter-grid">
          <label className="form-field">
            <span>Pays</span>
            <select
              value={draft.country_code}
              disabled={filtersLoading}
              onChange={event => {
                setCountryCode(event.target.value);
                setDraft(current => ({
                  ...current,
                  country_code: event.target.value,
                  administrative_area_id: "",
                }));
              }}
            >
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>{t("search.category")}</span>
            <select
              value={draft.category_id}
              disabled={filtersLoading}
              onChange={event => setDraft(current => ({
                ...current,
                category_id: event.target.value,
              }))}
            >
              <option value="">{t("search.allCategories")}</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>{t("search.location")}</span>
            <select
              value={draft.administrative_area_id}
              disabled={filtersLoading}
              onChange={event => setDraft(current => ({
                ...current,
                administrative_area_id: event.target.value,
              }))}
            >
              <option value="">Toutes les zones</option>
              {locationOptions.map(area => (
                <option key={area.id} value={area.id}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>{t("search.priceMin")}</span>
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
            <span>{t("search.priceMax")}</span>
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
            <span>{t("search.condition")}</span>
            <select
              value={draft.condition}
              onChange={event => setDraft(current => ({
                ...current,
                condition: event.target.value,
              }))}
            >
              <option value="">{t("search.allConditions")}</option>
              {conditions.map(item => (
                <option key={item} value={item}>
                  {getConditionLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>{t("search.priceType")}</span>
            <select
              value={draft.price_type}
              onChange={event => setDraft(current => ({
                ...current,
                price_type: event.target.value,
              }))}
            >
              <option value="">{t("search.all")}</option>
              <option value="FIXED">{t("search.fixedPrice")}</option>
              <option value="NEGOTIABLE">{t("search.negotiable")}</option>
            </select>
          </label>

          <label className="form-field">
            <span>{t("search.offers")}</span>
            <select
              value={draft.allow_offers}
              onChange={event => setDraft(current => ({
                ...current,
                allow_offers: event.target.value,
              }))}
            >
              <option value="">{t("search.offersAny")}</option>
              <option value="true">{t("search.offersAccepted")}</option>
              <option value="false">{t("search.noOffers")}</option>
            </select>
          </label>

          <label className="form-field">
            <span>Latitude</span>
            <input
              type="number"
              step="0.000001"
              min="-90"
              max="90"
              value={draft.latitude}
              onChange={event => setDraft(current => ({
                ...current,
                latitude: event.target.value,
              }))}
            />
          </label>

          <label className="form-field">
            <span>Longitude</span>
            <input
              type="number"
              step="0.000001"
              min="-180"
              max="180"
              value={draft.longitude}
              onChange={event => setDraft(current => ({
                ...current,
                longitude: event.target.value,
              }))}
            />
          </label>

          <label className="form-field">
            <span>Rayon</span>
            <select
              value={draft.radius_km}
              onChange={event => setDraft(current => ({
                ...current,
                radius_km: event.target.value,
              }))}
            >
              <option value="">Sans rayon</option>
              <option value="2">2 km</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="25">25 km</option>
              <option value="50">50 km</option>
              <option value="100">100 km</option>
            </select>
          </label>

          <label className="form-field">
            <span>{t("search.sortBy")}</span>
            <select
              value={draft.sort}
              onChange={event => setDraft(current => ({
                ...current,
                sort: event.target.value,
              }))}
            >
              <option value="newest">{t("search.newest")}</option>
              <option value="oldest">{t("search.oldest")}</option>
              <option value="price_asc">{t("search.priceAsc")}</option>
              <option value="price_desc">{t("search.priceDesc")}</option>
            </select>
          </label>
        </div>

        <div className="search-filter-actions">
          <button type="submit" className="primary-button inline-button">
            <Filter size={17} />
            {t("search.apply")}
          </button>

          <button
            type="button"
            className="secondary-button inline-button"
            onClick={resetFilters}
          >
            <RotateCcw size={16} />
            {t("search.reset")}
          </button>
        </div>
      </form>

      <section className="saved-search-panel">
        <div>
          <strong>{t("search.savedTitle")}</strong>
          <p>{t("search.savedText")}</p>
        </div>

        <div className="saved-search-create">
          <input
            value={savedSearchName}
            onChange={event => setSavedSearchName(event.target.value)}
            placeholder={query ? `${t("search.alertPrefix")} ${query}` : t("search.savedName")}
          />
          <button
            type="button"
            className="primary-button inline-button"
            disabled={savingSearch}
            onClick={() => void saveCurrentSearch()}
          >
            <BellPlus size={16} />
            {savingSearch ? t("search.saving") : t("search.save")}
          </button>
        </div>

        {savedSearchError && <p className="form-error">{savedSearchError}</p>}

        {savedSearches.length > 0 && (
          <div className="saved-search-list">
            {savedSearches.map(savedSearch => (
              <div key={savedSearch.id} className="saved-search-item">
                <button type="button" onClick={() => applySavedSearch(savedSearch)}>
                  <strong>{savedSearch.name}</strong>
                  <span>{Object.keys(savedSearch.query_params).length} {t("search.filtersCount")}</span>
                </button>
                <button type="button" className="text-button" onClick={() => void deleteSavedSearch(savedSearch)}>
                  {t("search.delete")}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {loading && (
        <p role="status">{t("search.loading")}</p>
      )}

      {error && (
        <div role="alert" className="seller-error">
          <p>{error}</p>
          <button type="button" onClick={() => setAttempt(value => value + 1)}>
            {t("search.retry")}
          </button>
        </div>
      )}

      {!loading && results && (
        <>
          <div className="search-results-toolbar">
            <p role="status" className="search-result-count">
              {results.total} {t("search.resultsSuffix")}
            </p>

            <div className="search-view-toggle" aria-label={t("search.viewLabel")}>
              <button
                type="button"
                className={viewMode === "list" ? "search-view-toggle__item search-view-toggle__item--active" : "search-view-toggle__item"}
                onClick={() => setViewMode("list")}
              >
                <List size={16} />
                {t("search.list")}
              </button>
              <button
                type="button"
                className={viewMode === "map" ? "search-view-toggle__item search-view-toggle__item--active" : "search-view-toggle__item"}
                disabled={liteMode}
                onClick={() => setViewMode("map")}
              >
                <Map size={16} />
                {t("search.map")}
              </button>
            </div>
          </div>

          {results.items.length === 0 && (
            <p>{t("search.empty")}</p>
          )}

          {viewMode === "map" && !liteMode ? (
            <SearchResultsMap listings={results.items} />
          ) : (
            <div className="listing-grid">
              {results.items.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {(offset > 0 || results.has_more) && (
            <nav className="listing-search-pagination" aria-label={t("search.pagination")}>
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => changePage(Math.max(0, offset - pageSize))}
              >
                {t("search.previous")}
              </button>

              <button
                type="button"
                disabled={!results.has_more}
                onClick={() => changePage(offset + pageSize)}
              >
                {t("search.next")}
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
