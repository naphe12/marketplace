import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { apiRequest } from "../api/client";
import ListingCard from "../components/listings/ListingCard";
import type { ListingSearchResponse } from "../types/listing";

const PAGE_SIZE = 20;

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const requestedSort = params.get("sort") ?? "newest";
  const sort = ["newest", "oldest", "price_asc", "price_desc"].includes(requestedSort)
    ? requestedSort : "newest";
  const requestedOffset = Number(params.get("offset") ?? 0);
  const offset = Number.isSafeInteger(requestedOffset) && requestedOffset >= 0
    ? requestedOffset : 0;
  const [draft, setDraft] = useState(query);
  const [results, setResults] = useState<ListingSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { setDraft(query); }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setResults(null);
    const search = new URLSearchParams({
      q: query, sort, offset: String(offset), limit: String(PAGE_SIZE),
    });
    apiRequest<ListingSearchResponse>(`/listings?${search}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setResults(data); })
      .catch(cause => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Impossible de charger les annonces.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, sort, offset, attempt]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParams({ q: draft.trim(), sort });
    setAttempt(value => value + 1);
  }

  function changePage(nextOffset: number) {
    setParams({ q: query, sort, offset: String(nextOffset) });
  }

  return (
    <div className="page">
      <h1>Rechercher une annonce</h1>
      <form className="listing-search-form" onSubmit={search}>
        <label htmlFor="listing-query">Que recherchez-vous ?</label>
        <div className="listing-search-controls">
          <input id="listing-query" type="search" value={draft}
            onChange={event => setDraft(event.target.value)} placeholder="Téléphone, voiture, appartement…" />
          <button type="submit">Rechercher</button>
        </div>
        <label htmlFor="listing-sort">Trier par</label>
        <select id="listing-sort" value={sort}
          onChange={event => setParams({ q: query, sort: event.target.value })}>
          <option value="newest">Plus récentes</option>
          <option value="oldest">Plus anciennes</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
        </select>
      </form>
      {loading && <p role="status">Chargement des annonces…</p>}
      {error && <div role="alert"><p>{error}</p>
        <button type="button" onClick={() => setAttempt(value => value + 1)}>Réessayer</button>
      </div>}
      {!loading && results && <>
        <p role="status">{results.total} annonce{results.total > 1 ? "s" : ""} trouvée{results.total > 1 ? "s" : ""}</p>
        {results.items.length === 0 && <p>Aucune annonce ne correspond à votre recherche.</p>}
        <div className="listing-grid">
          {results.items.map(listing => <ListingCard key={listing.id} listing={listing} />)}
        </div>
        {(offset > 0 || results.has_more) && <nav className="listing-search-pagination" aria-label="Pagination des annonces">
          <button type="button" disabled={offset === 0}
            onClick={() => changePage(Math.max(0, offset - PAGE_SIZE))}>Précédent</button>
          <button type="button" disabled={!results.has_more}
            onClick={() => changePage(offset + PAGE_SIZE)}>Suivant</button>
        </nav>}
      </>}
    </div>
  );
}
