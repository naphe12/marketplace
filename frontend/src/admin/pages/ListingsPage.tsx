import { useEffect, useState, type FormEvent } from "react";

import { apiRequest } from "../../api/client";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { AdminListResponse, AdminListing } from "../types";
import { downloadCsv } from "../utils/csv";
import "../styles/admin-tables.css";
const PAGE_SIZE = 25;
const statuses = ["ACTIVE", "DRAFT", "PENDING_PAYMENT", "RESERVED", "SOLD", "EXPIRED", "SUSPENDED", "REMOVED", "REJECTED"];
const conditions = ["NEW", "USED", "REFURBISHED"];
const priceTypes = ["FIXED", "NEGOTIABLE", "ON_REQUEST"];
const sorts = [
  ["updated_desc", "Mise à jour récente"],
  ["updated_asc", "Mise à jour ancienne"],
  ["created_desc", "Création récente"],
  ["created_asc", "Création ancienne"],
  ["published_desc", "Publication récente"],
  ["expires_asc", "Expiration proche"],
  ["price_desc", "Prix décroissant"],
  ["price_asc", "Prix croissant"],
] as const;

export default function ListingsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [condition, setCondition] = useState("");
  const [priceType, setPriceType] = useState("");
  const [allowOffers, setAllowOffers] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [publishedFrom, setPublishedFrom] = useState("");
  const [publishedTo, setPublishedTo] = useState("");
  const [expiresFrom, setExpiresFrom] = useState("");
  const [expiresTo, setExpiresTo] = useState("");
  const [sort, setSort] = useState("updated_desc");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<AdminListResponse<AdminListing> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (sellerId.trim()) params.set("seller_id", sellerId.trim());
    if (categoryId.trim()) params.set("category_id", categoryId.trim());
    if (areaId.trim()) params.set("administrative_area_id", areaId.trim());
    if (condition) params.set("condition", condition);
    if (priceType) params.set("price_type", priceType);
    if (allowOffers) params.set("allow_offers", allowOffers);
    if (priceMin) params.set("price_min", priceMin);
    if (priceMax) params.set("price_max", priceMax);
    if (publishedFrom) params.set("published_from", new Date(publishedFrom).toISOString());
    if (publishedTo) params.set("published_to", new Date(`${publishedTo}T23:59:59`).toISOString());
    if (expiresFrom) params.set("expires_from", new Date(expiresFrom).toISOString());
    if (expiresTo) params.set("expires_to", new Date(`${expiresTo}T23:59:59`).toISOString());
    if (sort) params.set("sort", sort);

    setLoading(true);
    setError("");
    apiRequest<AdminListResponse<AdminListing>>(`/admin/listings?${params}`, { authenticated: true })
      .then(setData)
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les annonces."))
      .finally(() => setLoading(false));
  }, [query, status, sellerId, categoryId, areaId, condition, priceType, allowOffers, priceMin, priceMax, publishedFrom, publishedTo, expiresFrom, expiresTo, sort, offset, attempt]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setAttempt(value => value + 1);
  }

  function resetFilters() {
    setQuery("");
    setStatus("");
    setSellerId("");
    setCategoryId("");
    setAreaId("");
    setCondition("");
    setPriceType("");
    setAllowOffers("");
    setPriceMin("");
    setPriceMax("");
    setPublishedFrom("");
    setPublishedTo("");
    setExpiresFrom("");
    setExpiresTo("");
    setSort("updated_desc");
    setOffset(0);
    setAttempt(value => value + 1);
  }

  function exportCsv() {
    downloadCsv(
      "annonces-admin.csv",
      (data?.items ?? []).map(listing => ({
        id: listing.id,
        title: listing.title,
        seller_id: listing.seller_id,
        price: listing.price,
        currency: listing.currency,
        status: listing.status,
        condition: listing.condition,
        price_type: listing.price_type,
        allow_offers: listing.allow_offers,
        published_at: listing.published_at,
        expires_at: listing.expires_at,
        created_at: listing.created_at,
        updated_at: listing.updated_at,
      })),
    );
  }

  async function action(listing: AdminListing, actionName: "suspend" | "restore" | "remove") {
    if (actionName !== "restore" && !window.confirm(`Confirmer l'action ${actionName} sur cette annonce ?`)) {
      return;
    }
    await apiRequest(`/admin/listings/${listing.id}/${actionName}`, {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({ reason: "Action depuis l'administration" }),
    });
    setAttempt(value => value + 1);
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span>Inventaire</span>
          <h1>Annonces</h1>
          <p>Recherchez par titre, vendeur, catégorie ou localisation et intervenez sans suppression définitive.</p>
        </div>
      </div>

      <div className="admin-toolbar-row">
        <form className="admin-filters admin-filters--advanced" onSubmit={submit}>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Titre, description ou ID" />
          <select value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">Tous statuts</option>
            {statuses.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <input value={sellerId} onChange={event => setSellerId(event.target.value)} placeholder="ID vendeur" />
          <input value={categoryId} onChange={event => setCategoryId(event.target.value)} placeholder="ID catégorie" />
          <input value={areaId} onChange={event => setAreaId(event.target.value)} placeholder="ID localisation" />
          <select value={condition} onChange={event => setCondition(event.target.value)}>
            <option value="">Tous états</option>
            {conditions.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={priceType} onChange={event => setPriceType(event.target.value)}>
            <option value="">Tous types de prix</option>
            {priceTypes.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={allowOffers} onChange={event => setAllowOffers(event.target.value)}>
            <option value="">Offres: toutes</option>
            <option value="true">Offres acceptées</option>
            <option value="false">Offres refusées</option>
          </select>
          <input type="number" min="0" value={priceMin} onChange={event => setPriceMin(event.target.value)} placeholder="Prix min" />
          <input type="number" min="0" value={priceMax} onChange={event => setPriceMax(event.target.value)} placeholder="Prix max" />
          <label>
            Publié après
            <input type="date" value={publishedFrom} onChange={event => setPublishedFrom(event.target.value)} />
          </label>
          <label>
            Publié avant
            <input type="date" value={publishedTo} onChange={event => setPublishedTo(event.target.value)} />
          </label>
          <label>
            Expire après
            <input type="date" value={expiresFrom} onChange={event => setExpiresFrom(event.target.value)} />
          </label>
          <label>
            Expire avant
            <input type="date" value={expiresTo} onChange={event => setExpiresTo(event.target.value)} />
          </label>
          <select value={sort} onChange={event => setSort(event.target.value)}>
            {sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="submit">Filtrer</button>
          <button type="button" className="secondary-button" onClick={resetFilters}>Réinitialiser</button>
        </form>
        <button type="button" className="secondary-button" disabled={!data?.items.length} onClick={exportCsv}>Exporter CSV</button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p role="status">Chargement...</p>}
      <div className="admin-table-shell">
        <div className="admin-table-scroll">

      <DataTable
        rows={data?.items ?? []}
        emptyLabel="Aucune annonce."
        columns={[
          { key: "title", label: "Titre", render: row => row.title || "Sans titre" },
          { key: "seller", label: "Vendeur", render: row => row.seller_id },
          { key: "price", label: "Prix", render: row => row.price ? `${formatNumber(row.price)} ${row.currency}` : "-" },
          { key: "status", label: "Statut", render: row => <StatusBadge tone={row.status === "ACTIVE" ? "success" : "warning"}>{row.status}</StatusBadge> },
          { key: "expires", label: "Expiration", render: row => row.expires_at ? new Date(row.expires_at).toLocaleDateString("fr-FR") : "-" },
          { key: "actions", label: "Actions", render: row => <div className="admin-row-actions"><button type="button" onClick={() => action(row, "suspend")}>Suspendre</button><button type="button" onClick={() => action(row, "restore")}>Restaurer</button><button type="button" onClick={() => action(row, "remove")}>Retirer</button></div> },
        ]}
      />
        </div>
      </div>

      {data && (
        <div className="admin-pagination">
          <span>{data.total} annonce(s)</span>
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Précédent</button>
          <button type="button" disabled={!data.has_more} onClick={() => setOffset(offset + PAGE_SIZE)}>Suivant</button>
        </div>
      )}
    </section>
  );
}

function formatNumber(value: string | number) {
  return new Intl.NumberFormat("fr-FR").format(Number(value));
}
