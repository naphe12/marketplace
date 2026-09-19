import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import PhotoUploader from "../components/publish/PhotoUploader";
import EditListingForm from "../components/listings/EditListingForm";
import type { ListingDetail } from "../types/listing";

export default function ListingDetailPage() {
  const { listingId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setEditing(false);
    setSaved(false);
    setLoading(true);
    setError(null);
    setListing(null);
    setSelectedImage(null);

    if (!listingId) {
      setError("Annonce introuvable.");
      setLoading(false);
      return;
    }

    apiRequest<ListingDetail>(`/listings/${listingId}`, { signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return;
        setListing(result);
        setSelectedImage(result.images.find(image => image.is_primary)?.id ?? null);
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : "Impossible de charger l’annonce.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [listingId, attempt]);

  const images = [...(listing?.images ?? [])].sort((a, b) => a.position - b.position);
  const photo = images.find(image => image.id === selectedImage) ?? images[0];
  const conditions: Record<string, string> = {
    NEW: "Neuf", USED: "Occasion", REFURBISHED: "Reconditionné",
  };

  return (
    <div className="page listing-detail">
      <Link to="/" className="listing-detail__back">← Retour aux annonces</Link>
      {loading && <p role="status">Chargement de l’annonce…</p>}
      {error && (
        <div role="alert" className="form-error">
          <p>{error}</p>
          <button type="button" className="secondary-button" onClick={() => setAttempt(value => value + 1)}>
            Réessayer
          </button>
        </div>
      )}
      {!loading && listing && (
        <div className="listing-detail__owner-actions">
          {authLoading ? <p role="status">Vérification de la connexion…</p> : !user ? (
            <Link className="secondary-button" to={`/login?returnTo=${encodeURIComponent(`/listings/${listing.id}`)}`}>
              Se connecter pour modifier son annonce
            </Link>
          ) : user.id === listing.seller_id ? (
            <button type="button" className="primary-button" disabled={editing}
              onClick={() => {
                setEditing(true);
                setSaved(false);
                requestAnimationFrame(() => {
                  document.querySelector<HTMLFormElement>(".listing-edit")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  document.querySelector<HTMLInputElement>(".listing-edit input")?.focus({ preventScroll: true });
                });
              }}>
              {editing ? "Modification en cours" : "Modifier l’annonce"}
            </button>
          ) : <p>Seul le compte ayant publié cette annonce peut la modifier.</p>}
        </div>
      )}
      {!loading && listing && (
        <article className="listing-detail__grid">
          <div>
            <div className="listing-detail__photo">
              {photo ? <img src={photo.image_url} alt={listing.title} /> : <p>Aucune photo disponible</p>}
            </div>
            {images.length > 1 && (
              <div className="listing-detail__thumbnails" aria-label="Photos de l’annonce">
                {images.map((image, index) => (
                  <button key={image.id} type="button" aria-label={`Voir la photo ${index + 1}`}
                    aria-pressed={photo?.id === image.id} onClick={() => setSelectedImage(image.id)}>
                    <img src={image.thumbnail_url ?? image.image_url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <section className="listing-detail__information">
            <h1>{listing.title}</h1>
            {saved && <p role="status">Les modifications ont été enregistrées.</p>}
            {editing && user?.id === listing.seller_id && (
              <div>
              <PhotoUploader key={`photos-${listing.id}`} listingId={listing.id} initialImages={listing.images}
                onChange={images => {
                  setListing(current => current ? { ...current, images } : current);
                  setSelectedImage(images.find(image => image.is_primary)?.id ?? null);
                }} />
              <EditListingForm key={listing.id} listing={listing}
                onCancel={() => setEditing(false)}
                onSaved={changes => {
                  setListing(current => current ? { ...current, ...changes } : current);
                  setEditing(false);
                  setSaved(true);
                }} />
              </div>
            )}
            <p className="listing-detail__price">
              {listing.price === null ? "Prix sur demande" : `${new Intl.NumberFormat("fr-BI", {
                maximumFractionDigits: 2,
              }).format(Number(listing.price))} ${listing.currency}`}
            </p>
            {listing.price_type === "NEGOTIABLE" && <p className="negotiable">Prix négociable</p>}
            <dl className="listing-detail__facts">
              {listing.condition && <div><dt>État</dt><dd>{conditions[listing.condition] ?? listing.condition}</dd></div>}
              <div><dt>Quantité</dt><dd>{listing.quantity}</dd></div>
              <div><dt>Offres</dt><dd>{listing.allow_offers ? "Acceptées" : "Non acceptées"}</dd></div>
              {listing.published_at && <div><dt>Publication</dt><dd>{new Date(listing.published_at).toLocaleDateString("fr-FR")}</dd></div>}
            </dl>
            <h2>Description</h2>
            <p className="listing-detail__description">{listing.description || "Aucune description renseignée."}</p>
          </section>
        </article>
      )}
    </div>
  );
}
