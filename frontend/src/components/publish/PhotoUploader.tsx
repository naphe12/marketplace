import { Camera, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { uploadListingImage } from "../../api/uploads";
import { apiRequest } from "../../api/client";
import type { ListingImage } from "../../types/listing";

type Props = {
  listingId: string;
  initialImages?: ListingImage[];
  onChange?: (images: ListingImage[]) => void;
};

export default function PhotoUploader({ listingId, initialImages = [], onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [photos, setPhotos] = useState(initialImages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(images: ListingImage[]) {
    setPhotos(images);
    onChange?.(images);
  }

  async function perform(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try { await action(); }
    catch (error) { setError(error instanceof Error ? error.message : "Impossible de modifier les photos."); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function add(files: File[]) {
    await perform(async () => {
      let current = photos;
      for (const file of files.slice(0, 8 - current.length)) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
          throw new Error("Utilisez une photo JPEG, PNG ou WebP de 8 MB maximum.");
        }
        const position = Math.max(-1, ...current.map(photo => photo.position)) + 1;
        const photo = await uploadListingImage(listingId, file, position, current.length === 0);
        current = [...current, photo];
        update(current);
      }
    });
  }

  async function remove(photo: ListingImage) {
    await perform(async () => {
      await apiRequest(`/listings/${listingId}/images/${photo.id}`, { method: "DELETE", authenticated: true });
      const remaining = photos.filter(item => item.id !== photo.id).sort((a, b) => a.position - b.position);
      update(photo.is_primary ? remaining.map((item, index) => ({ ...item, is_primary: index === 0 })) : remaining);
    });
  }

  async function makePrimary(photo: ListingImage) {
    await perform(async () => {
      await apiRequest(`/listings/${listingId}/images/${photo.id}`, {
        method: "PATCH", authenticated: true, body: JSON.stringify({ is_primary: true }),
      });
      update(photos.map(item => ({ ...item, is_primary: item.id === photo.id })));
    });
  }

  return (
    <section className="publish-panel" aria-label="Gérer les photos">
      <div className="publish-panel__heading">
        <h2>Photos de l’annonce</h2>
        <p>Ajoutez ou supprimez des photos et choisissez la photo principale. Les changements sont enregistrés immédiatement.</p>
      </div>
      <input ref={inputRef} hidden type="file" multiple accept="image/jpeg,image/png,image/webp"
        disabled={busy} onChange={event => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void add(files);
        }} />
      <button type="button" className="photo-add-button" disabled={busy || photos.length >= 8}
        onClick={() => inputRef.current?.click()}>
        <Camera size={25} /><span>Ajouter des photos — JPEG, PNG ou WebP · 8 MB max</span>
      </button>
      {busy && <p role="status">Enregistrement des photos…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="photo-grid">
        {[...photos].sort((a, b) => a.position - b.position).map((photo, index) => (
          <div key={photo.id}>
            <div className="photo-item">
              <img src={photo.thumbnail_url ?? photo.image_url} alt={`Photo ${index + 1}`} />
              {photo.is_primary && <span className="photo-primary"><Star size={12} /> Principale</span>}
              <button type="button" className="photo-delete" disabled={busy}
                aria-label={`Supprimer la photo ${index + 1}`} onClick={() => void remove(photo)}><Trash2 size={16} /></button>
            </div>
            {!photo.is_primary && <button type="button" className="secondary-button" disabled={busy}
              onClick={() => void makePrimary(photo)}>Définir comme principale</button>}
          </div>
        ))}
      </div>
      <div className="photo-counter">{photos.length} / 8 photos</div>
    </section>
  );
}
