import { useState, type FormEvent } from "react";
import { apiRequest } from "../../api/client";
import { useI18n } from "../../i18n/I18nProvider";
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
  const { t } = useI18n();
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
      setError(t("listingEdit.titleTooShort"));
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
      setError(error instanceof Error ? error.message : t("listingEdit.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="listing-edit" onSubmit={save} aria-label={t("listingEdit.aria")}>
      <h2>{t("listingEdit.title")}</h2>
      <fieldset disabled={saving} className="listing-edit__fields">
        <label className="form-field"><span>{t("publish.title")}</span>
          <input value={title} onChange={event => setTitle(event.target.value)} required minLength={3} maxLength={200} />
        </label>
        <label className="form-field"><span>{t("listingEdit.extraInfo")}</span>
          <textarea value={description} onChange={event => setDescription(event.target.value)} rows={8} />
        </label>
        <label className="form-field"><span>{t("publish.condition")}</span>
          <select value={condition} onChange={event => setCondition(event.target.value)}>
            <option value="">{t("listingEdit.notSpecified")}</option>
            <option value="NEW">{t("publish.conditionNew")}</option><option value="USED">{t("publish.conditionUsed")}</option>
            <option value="REFURBISHED">{t("publish.conditionRefurbished")}</option>
            {condition && !["NEW", "USED", "REFURBISHED"].includes(condition) && <option value={condition}>{condition}</option>}
          </select>
        </label>
        <label className="form-field"><span>{t("publish.price")} ({listing.currency})</span>
          <input type="number" min="0" step="0.01" value={price} onChange={event => setPrice(event.target.value)} />
          <small>{t("listingEdit.priceHint")}</small>
        </label>
        <label className="form-field"><span>{t("publish.priceType")}</span>
          <select value={priceType} onChange={event => setPriceType(event.target.value)}>
            <option value="FIXED">{t("publish.fixedPrice")}</option><option value="NEGOTIABLE">{t("publish.negotiable")}</option>
            {!["FIXED", "NEGOTIABLE"].includes(priceType) && <option value={priceType}>{priceType}</option>}
          </select>
        </label>
        <label className="form-field"><span>{t("listingEdit.quantity")}</span>
          <input type="number" min="1" step="1" required value={quantity} onChange={event => setQuantity(event.target.value)} />
        </label>
        <label className="form-checkbox">
          <input type="checkbox" checked={allowOffers} onChange={event => setAllowOffers(event.target.checked)} />
          <span>{t("publish.allowOffers")}</span>
        </label>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="publish-actions">
        <button type="button" className="secondary-button" disabled={saving} onClick={onCancel}>{t("listingEdit.cancel")}</button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? t("publish.saving") : t("listingEdit.save")}
        </button>
      </div>
    </form>
  );
}
