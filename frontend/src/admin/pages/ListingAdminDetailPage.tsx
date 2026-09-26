import { Camera, Flag, ShieldAlert, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest } from "../../api/client";
import AdminEntityAuditPanel from "../components/AdminEntityAuditPanel";
import AdminNotesPanel from "../components/AdminNotesPanel";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

type AdminListingDetail = {
  id: string;
  seller_id: string;
  category_id: string;
  administrative_area_id: string | null;
  title: string;
  description: string | null;
  price: string | null;
  currency: string;
  status: string;
  latitude: string | null;
  longitude: string | null;
  published_at: string | null;
  expires_at: string | null;
  images: { id: string; image_url: string; thumbnail_url: string | null; is_primary: boolean }[];
  reports_count: number;
  fraud_signals_count: number;
  moderation_actions_count: number;
};

export default function ListingAdminDetailPage() {
  const { listingId } = useParams();
  const [listing, setListing] = useState<AdminListingDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!listingId) return;
    apiRequest<AdminListingDetail>(`/admin/listings/${listingId}`, { authenticated: true })
      .then(setListing)
      .catch(cause => setError(cause instanceof Error ? cause.message : "Annonce introuvable."));
  }, [listingId]);

  async function removeImage(imageId: string) {
    if (!listing || !window.confirm("Retirer cette photo abusive de l'annonce ?")) {
      return;
    }
    await apiRequest(`/admin/listings/${listing.id}/images/${imageId}`, {
      method: "DELETE",
      authenticated: true,
      body: JSON.stringify({
        reason: "Photo abusive retirée par l'administration",
      }),
    });
    setListing({
      ...listing,
      images: listing.images.filter(image => image.id !== imageId),
    });
  }

  if (error) return <section className="admin-page"><p className="form-error">{error}</p></section>;
  if (!listing) return <section className="admin-page"><p>Chargement...</p></section>;

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span>Vue 360° annonce</span>
          <h1>{listing.title || "Annonce sans titre"}</h1>
          <p>{listing.price ? `${Number(listing.price).toLocaleString("fr-FR")} ${listing.currency}` : "Prix non renseigné"} · <StatusBadge tone={listing.status === "ACTIVE" ? "success" : "warning"}>{listing.status}</StatusBadge></p>
        </div>
      </div>
      <div className="admin-stats-grid">
        <StatCard label="Photos" value={listing.images.length} detail="URLs présignées backend" icon={Camera} />
        <StatCard label="Signalements" value={listing.reports_count} detail="Reports liés" icon={Flag} />
        <StatCard label="Fraud signals" value={listing.fraud_signals_count} detail="Risque" icon={ShieldAlert} />
        <StatCard label="Vendeur" value="Profil" detail={listing.seller_id} icon={User} />
      </div>
      <div className="admin-split">
        <section className="admin-panel admin-stack">
          <h2>Photos</h2>
          <div className="admin-photo-grid">
            {listing.images.map(image => (
              <div key={image.id} className="admin-photo-tile">
                <img src={image.thumbnail_url ?? image.image_url} alt="" />
                <button type="button" onClick={() => removeImage(image.id)}>Retirer</button>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-panel admin-stack">
          <h2>Détails</h2>
          <p>{listing.description ?? "Aucune description."}</p>
          <p>Catégorie: {listing.category_id}</p>
          <p>Localisation: {listing.administrative_area_id ?? "-"}</p>
          <p>Publication: {listing.published_at ? new Date(listing.published_at).toLocaleString("fr-FR") : "-"}</p>
          <p>Expiration: {listing.expires_at ? new Date(listing.expires_at).toLocaleString("fr-FR") : "-"}</p>
          {listing.latitude && listing.longitude && <a className="text-button" href={`https://www.openstreetmap.org/?mlat=${listing.latitude}&mlon=${listing.longitude}#map=14/${listing.latitude}/${listing.longitude}`} target="_blank" rel="noreferrer">Afficher sur carte</a>}
          <Link className="text-button" to={`/admin/users/${listing.seller_id}`}>Voir vendeur</Link>
        </section>
      </div>
      <AdminNotesPanel targetType="LISTING" targetId={listing.id} />
      <AdminEntityAuditPanel targetType="LISTING" targetId={listing.id} />
    </section>
  );
}
