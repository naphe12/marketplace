import type { FormEvent } from "react";
import { RefreshCw, SearchCheck, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ListingCard from "../components/listings/ListingCard";
import { useCountry } from "../market/CountryContext";
import type { Category } from "../types/category";
import type { Listing } from "../types/listing";

type WantedRequest = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  budget_min: string | null;
  budget_max: string | null;
  currency: string;
  country_code: string;
  condition: string | null;
  status: string;
  created_at: string;
};

type WantedMatch = {
  id: string;
  match_score: number;
  status: string;
  listing: Listing | null;
};

type WantedOffer = {
  id: string;
  seller_id: string;
  listing_id: string | null;
  amount: string;
  currency: string;
  message: string | null;
  status: string;
  created_at: string;
  listing: Listing | null;
};

type WantedDetail = WantedRequest & {
  matches: WantedMatch[];
  offers: WantedOffer[];
};

type SellerOpportunity = {
  request: WantedRequest;
  seller_listings: Listing[];
  best_score: number;
};

const conditions = [
  ["", "Tous états"],
  ["NEW", "Neuf"],
  ["USED", "Occasion"],
  ["REFURBISHED", "Reconditionné"],
];

export default function WantedPage() {
  const { user } = useAuth();
  const { countries, countryCode } = useCountry();
  const [categories, setCategories] = useState<Category[]>([]);
  const [requests, setRequests] = useState<WantedRequest[]>([]);
  const [opportunities, setOpportunities] = useState<SellerOpportunity[]>([]);
  const [selected, setSelected] = useState<WantedDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offerSavingId, setOfferSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [offerDrafts, setOfferDrafts] = useState<Record<string, { listing_id: string; amount: string; currency: string; message: string }>>({});
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    category_id: "",
    budget_min: "",
    budget_max: "",
    currency: countries.find(country => country.code === countryCode)?.currency ?? "BIF",
    country_code: countryCode,
    condition: "",
  });

  useEffect(() => {
    setDraft(value => ({
      ...value,
      country_code: countryCode,
      currency: countries.find(country => country.code === countryCode)?.currency ?? value.currency,
    }));
  }, [countries, countryCode]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [loadedCategories, loadedRequests, loadedOpportunities] = await Promise.all([
        apiRequest<Category[]>("/categories"),
        user ? apiRequest<WantedRequest[]>("/wanted-requests", { authenticated: true }) : Promise.resolve([]),
        user ? apiRequest<SellerOpportunity[]>("/wanted-requests/seller/opportunities", { authenticated: true }) : Promise.resolve([]),
      ]);

      if (!mounted) return;
      setCategories(loadedCategories.filter(category => category.active));
      setRequests(loadedRequests);
      setOpportunities(loadedOpportunities);
      setOfferDrafts(Object.fromEntries(loadedOpportunities.map(item => [
        item.request.id,
        {
          listing_id: item.seller_listings[0]?.id ?? "",
          amount: item.seller_listings[0]?.price ?? item.request.budget_max ?? "",
          currency: item.seller_listings[0]?.currency ?? item.request.currency,
          message: "",
        },
      ])));
      if (loadedRequests[0]) {
        const detail = await apiRequest<WantedDetail>(`/wanted-requests/${loadedRequests[0].id}`, { authenticated: true });
        if (mounted) setSelected(detail);
      }
    }

    load()
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les demandes."))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const selectedCountry = useMemo(
    () => countries.find(country => country.code === draft.country_code),
    [countries, draft.country_code],
  );

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const result = await apiRequest<WantedDetail>("/wanted-requests", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify({
          title: draft.title,
          description: draft.description || null,
          category_id: draft.category_id || null,
          budget_min: draft.budget_min || null,
          budget_max: draft.budget_max || null,
          currency: draft.currency,
          country_code: draft.country_code,
          condition: draft.condition || null,
        }),
      });

      setSelected(result);
      setRequests(items => [result, ...items.filter(item => item.id !== result.id)]);
      setDraft(value => ({ ...value, title: "", description: "", budget_min: "", budget_max: "" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de créer la demande.");
    } finally {
      setSaving(false);
    }
  }

  async function openRequest(requestId: string) {
    const detail = await apiRequest<WantedDetail>(`/wanted-requests/${requestId}`, { authenticated: true });
    setSelected(detail);
  }

  async function refreshMatches() {
    if (!selected) return;
    const detail = await apiRequest<WantedDetail>(`/wanted-requests/${selected.id}/refresh`, {
      method: "POST",
      authenticated: true,
    });
    setSelected(detail);
  }

  async function sendSellerOffer(requestId: string) {
    const draftForRequest = offerDrafts[requestId];
    if (!draftForRequest?.amount) return;
    setOfferSavingId(requestId);
    setError("");

    try {
      await apiRequest<WantedOffer>(`/wanted-requests/${requestId}/offers`, {
        method: "POST",
        authenticated: true,
        body: JSON.stringify({
          listing_id: draftForRequest.listing_id || null,
          amount: draftForRequest.amount,
          currency: draftForRequest.currency,
          message: draftForRequest.message || null,
        }),
      });
      setOpportunities(items => items.filter(item => item.request.id !== requestId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d'envoyer la proposition.");
    } finally {
      setOfferSavingId(null);
    }
  }

  async function updateOffer(offerId: string, status: "ACCEPTED" | "REJECTED") {
    if (!selected) return;
    const detail = await apiRequest<WantedDetail>(`/wanted-requests/${selected.id}/offers/${offerId}`, {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify({ status }),
    });
    setSelected(detail);
    setRequests(items => items.map(item => item.id === detail.id ? detail : item));
  }

  if (!user) {
    return (
      <div className="page wanted-page">
        <section className="wanted-empty-auth">
          <SearchCheck size={34} />
          <h1>Je cherche quelque chose</h1>
          <p>Connectez-vous pour publier une demande et recevoir des annonces pertinentes.</p>
          <Link to="/login?returnTo=/wanted" className="primary-button">Se connecter</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page wanted-page">
      <div className="page-heading">
        <div>
          <span>Reverse marketplace</span>
          <h1>Je cherche quelque chose</h1>
          <p>Décrivez votre besoin, comparez les annonces existantes, puis laissez les vendeurs vous répondre.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="wanted-layout">
        <form className="wanted-form" onSubmit={createRequest}>
          <label>
            <span>Ce que vous cherchez</span>
            <input required minLength={3} maxLength={200} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="iPhone 15 Pro 256 Go" />
          </label>

          <label>
            <span>Détails</span>
            <textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="Bon état, livraison possible, accessoires inclus..." />
          </label>

          <div className="wanted-form-grid">
            <label><span>Catégorie</span><select value={draft.category_id} onChange={event => setDraft({ ...draft, category_id: event.target.value })}><option value="">Toutes catégories</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label><span>Pays</span><select value={draft.country_code} onChange={event => setDraft({ ...draft, country_code: event.target.value, currency: countries.find(country => country.code === event.target.value)?.currency ?? draft.currency })}>{countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
            <label><span>Budget min</span><input type="number" min="0" value={draft.budget_min} onChange={event => setDraft({ ...draft, budget_min: event.target.value })} /></label>
            <label><span>Budget max</span><input type="number" min="0" value={draft.budget_max} onChange={event => setDraft({ ...draft, budget_max: event.target.value })} /></label>
            <label><span>Devise</span><input value={draft.currency || selectedCountry?.currency || "BIF"} onChange={event => setDraft({ ...draft, currency: event.target.value.toUpperCase().slice(0, 3) })} /></label>
            <label><span>État</span><select value={draft.condition} onChange={event => setDraft({ ...draft, condition: event.target.value })}>{conditions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>

          <button type="submit" className="primary-button" disabled={saving}>{saving ? "Recherche..." : "Créer la demande"}</button>
        </form>

        <aside className="wanted-requests-panel">
          <h2>Mes demandes</h2>
          {loading && <p>Chargement...</p>}
          {!loading && requests.length === 0 && <p>Aucune demande pour le moment.</p>}
          {requests.map(request => (
            <button key={request.id} type="button" className={selected?.id === request.id ? "wanted-request-item wanted-request-item--active" : "wanted-request-item"} onClick={() => void openRequest(request.id)}>
              <strong>{request.title}</strong>
              <span>{request.status} · {new Date(request.created_at).toLocaleDateString("fr-FR")}</span>
            </button>
          ))}
        </aside>
      </div>

      {opportunities.length > 0 && (
        <section className="wanted-seller-section">
          <div className="wanted-matches-heading">
            <div>
              <span>Vendeur</span>
              <h2>Demandes pertinentes pour vos annonces</h2>
            </div>
          </div>
          <div className="wanted-opportunity-grid">
            {opportunities.map(item => {
              const form = offerDrafts[item.request.id] ?? { listing_id: item.seller_listings[0]?.id ?? "", amount: "", currency: item.request.currency, message: "" };
              return (
                <article key={item.request.id} className="wanted-opportunity-card">
                  <div className="wanted-match-score">Score {item.best_score}%</div>
                  <h3>{item.request.title}</h3>
                  <p>{item.request.description || "Demande sans détail."}</p>
                  <small>Budget: {item.request.budget_min || "-"} - {item.request.budget_max || "-"} {item.request.currency}</small>
                  <label><span>Annonce proposée</span><select value={form.listing_id} onChange={event => setOfferDrafts(values => ({ ...values, [item.request.id]: { ...form, listing_id: event.target.value, amount: item.seller_listings.find(listing => listing.id === event.target.value)?.price ?? form.amount, currency: item.seller_listings.find(listing => listing.id === event.target.value)?.currency ?? form.currency } }))}>{item.seller_listings.map(listing => <option key={listing.id} value={listing.id}>{listing.title}</option>)}</select></label>
                  <div className="wanted-offer-row">
                    <input type="number" min="0" value={form.amount} onChange={event => setOfferDrafts(values => ({ ...values, [item.request.id]: { ...form, amount: event.target.value } }))} />
                    <input value={form.currency} maxLength={3} onChange={event => setOfferDrafts(values => ({ ...values, [item.request.id]: { ...form, currency: event.target.value.toUpperCase() } }))} />
                  </div>
                  <textarea value={form.message} onChange={event => setOfferDrafts(values => ({ ...values, [item.request.id]: { ...form, message: event.target.value } }))} placeholder="Message au demandeur" />
                  <button type="button" className="primary-button inline-button" disabled={offerSavingId === item.request.id} onClick={() => void sendSellerOffer(item.request.id)}><Send size={16} />{offerSavingId === item.request.id ? "Envoi..." : "Répondre"}</button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {selected && (
        <section className="wanted-matches-section">
          <div className="wanted-matches-heading">
            <div>
              <span>{selected.matches.length} correspondance{selected.matches.length > 1 ? "s" : ""}</span>
              <h2>{selected.title}</h2>
            </div>
            <button type="button" className="secondary-button inline-button" onClick={() => void refreshMatches()}><RefreshCw size={16} />Actualiser</button>
          </div>

          {selected.offers.length > 0 && (
            <div className="wanted-offers-list">
              {selected.offers.map(offer => (
                <article key={offer.id} className="wanted-offer-card">
                  <strong>{offer.amount} {offer.currency}</strong>
                  <span>{offer.status}</span>
                  <p>{offer.message || "Proposition sans message."}</p>
                  {offer.listing && <Link to={`/listings/${offer.listing.id}`}>{offer.listing.title}</Link>}
                  {offer.status === "PENDING" && (
                    <div className="wanted-offer-actions">
                      <button type="button" className="primary-button inline-button" onClick={() => void updateOffer(offer.id, "ACCEPTED")}>Accepter</button>
                      <button type="button" className="secondary-button inline-button" onClick={() => void updateOffer(offer.id, "REJECTED")}>Refuser</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {selected.matches.length === 0 ? (
            <div className="empty-state">Aucune annonce active ne correspond encore. La demande reste ouverte.</div>
          ) : (
            <div className="wanted-match-grid">
              {selected.matches.map(match => match.listing && (
                <article key={match.id} className="wanted-match-card">
                  <div className="wanted-match-score">Score {match.match_score}%</div>
                  <ListingCard listing={match.listing} />
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
