import { useState, type FormEvent } from "react";
import { apiRequest } from "../../api/client";
import type { ListingDetail } from "../../types/listing";

type EditableListing = Pick<ListingDetail,
  "title" | "description" | "condition" | "price" | "currency" |
  "price_type" | "quantity" | "allow_offers" | "updated_at"
>;

type Props = {
  listing: ListingDetail;
  onSaved: (changes: EditableListing) => void;
  onCancel: () => void;
};

export default function EditListingForm({ listing, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description ?? "");
  const [condition, setCondition] = useState(listing.condition ?? "");
  const [price, setPrice] = useState(listing.price ?? "");
  const [priceType, setPriceType] = useState(listing.price_type);
  const [quantity, setQuantity] = useState(String(listing.quantity));
  const [allowOffers, setAllowOffers] = useState(listing.allow_offers);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    if (title.trim().length < 3) {
      setError("Le titre doit contenir au moins 3 caractères.");
      return;
    }
    setSaving(true);
    try {
      const changes = await apiRequest<EditableListing>(`/listings/${listing.id}`, {
        method: "PATCH",
        authenticated: true,
        body: JSON.stringify({
          title: title.trim(), description, condition: condition || null,
          price: price === "" ? null : price,
          price_type: priceType, quantity: Number(quantity), allow_offers: allowOffers,
        }),
      });
      onSaved(changes);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Impossible d’enregistrer les modifications.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="listing-edit" onSubmit={save} aria-label="Modifier l’annonce">
      <h2>Compléter ou modifier l’annonce</h2>
      <fieldset disabled={saving} className="listing-edit__fields">
        <label className="form-field"><span>Titre</span>
          <input value={title} onChange={event => setTitle(event.target.value)} required minLength={3} maxLength={200} />
        </label>
        <label className="form-field"><span>Description et informations complémentaires</span>
          <textarea value={description} onChange={event => setDescription(event.target.value)} rows={8} />
        </label>
        <label className="form-field"><span>État</span>
          <select value={condition} onChange={event => setCondition(event.target.value)}>
            <option value="">Non précisé</option>
            <option value="NEW">Neuf</option><option value="USED">Occasion</option>
            <option value="REFURBISHED">Reconditionné</option>
            {condition && !["NEW", "USED", "REFURBISHED"].includes(condition) && <option value={condition}>{condition}</option>}
          </select>
        </label>
        <label className="form-field"><span>Prix ({listing.currency})</span>
          <input type="number" min="0" step="0.01" value={price} onChange={event => setPrice(event.target.value)} />
          <small>Laissez vide pour un prix sur demande.</small>
        </label>
        <label className="form-field"><span>Type de prix</span>
          <select value={priceType} onChange={event => setPriceType(event.target.value)}>
            <option value="FIXED">Prix fixe</option><option value="NEGOTIABLE">Négociable</option>
            {!["FIXED", "NEGOTIABLE"].includes(priceType) && <option value={priceType}>{priceType}</option>}
          </select>
        </label>
        <label className="form-field"><span>Quantité disponible</span>
          <input type="number" min="1" step="1" required value={quantity} onChange={event => setQuantity(event.target.value)} />
        </label>
        <label className="form-checkbox">
          <input type="checkbox" checked={allowOffers} onChange={event => setAllowOffers(event.target.checked)} />
          <span>Autoriser les offres</span>
        </label>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="publish-actions">
        <button type="button" className="secondary-button" disabled={saving} onClick={onCancel}>Annuler</button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </div>
    </form>
  );
}
