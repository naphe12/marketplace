import LocationSelector from "./LocationSelector";
import ApproximateLocationMap from "../location/ApproximateLocationMap";

type Props = {
  price: string;
  currency: string;
  priceType: string;
  allowOffers: boolean;
  provinceId: string;
  communeId: string;
  zoneId: string;
  localityId: string;
  latitude: number | null;
  longitude: number | null;
  onPriceChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onPriceTypeChange: (value: string) => void;
  onAllowOffersChange: (value: boolean) => void;
  onProvinceChange: (value: string) => void;
  onCommuneChange: (value: string) => void;
  onZoneChange: (value: string) => void;
  onLocalityChange: (value: string) => void;
  onLocationResolved: (location: {
    administrativeAreaId: string | null;
    latitude: number | null;
    longitude: number | null;
  }) => void;
};

export default function PriceLocationStep({
  price, currency, priceType, allowOffers,
  provinceId, communeId, zoneId, localityId,
  latitude, longitude,
  onPriceChange, onCurrencyChange,
  onPriceTypeChange, onAllowOffersChange,
  onProvinceChange, onCommuneChange,
  onZoneChange, onLocalityChange,
  onLocationResolved,
}: Props) {
  const hasLocation =
    latitude !== null && longitude !== null &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

  const radiusMeters = localityId ? 800 : zoneId ? 2500 : communeId ? 6000 : 12000;

  return (
    <section className="publish-panel">
      <div className="publish-panel__heading">
        <h1>Prix et localisation</h1>
        <p>Indiquez le prix et la zone approximative dans laquelle se trouve votre article.</p>
      </div>

      <div className="price-row">
        <label className="form-field">
          <span>Prix</span>
          <input type="number" min="0" value={price}
            onChange={event => onPriceChange(event.target.value)} />
        </label>
        <label className="form-field">
          <span>Devise</span>
          <select value={currency} onChange={event => onCurrencyChange(event.target.value)}>
            <option value="BIF">BIF</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
      </div>

      <div className="form-field">
        <span>Type de prix</span>
        <div className="choice-row">
          <button type="button"
            className={priceType === "FIXED" ? "choice-chip choice-chip--selected" : "choice-chip"}
            onClick={() => onPriceTypeChange("FIXED")}>Prix fixe</button>
          <button type="button"
            className={priceType === "NEGOTIABLE" ? "choice-chip choice-chip--selected" : "choice-chip"}
            onClick={() => onPriceTypeChange("NEGOTIABLE")}>Négociable</button>
        </div>
      </div>

      <label className="form-checkbox">
        <input type="checkbox" checked={allowOffers}
          onChange={event => onAllowOffersChange(event.target.checked)} />
        <div>
          <strong>Autoriser les offres</strong>
          <span>Les acheteurs pourront proposer un autre prix.</span>
        </div>
      </label>

      <div className="form-section-title">Localisation</div>
      <LocationSelector
        provinceId={provinceId}
        communeId={communeId}
        zoneId={zoneId}
        localityId={localityId}
        onProvinceChange={onProvinceChange}
        onCommuneChange={onCommuneChange}
        onZoneChange={onZoneChange}
        onLocalityChange={onLocalityChange}
        onLocationResolved={onLocationResolved}
      />

      {hasLocation && latitude !== null && longitude !== null && (
        <ApproximateLocationMap
          latitude={latitude}
          longitude={longitude}
          radiusMeters={radiusMeters}
        />
      )}

      {!hasLocation && Boolean(communeId) && (
        <p className="approximate-location__note">
          Aucune coordonnée n'est renseignée pour cette localité :
          la localisation administrative sera tout de même sauvegardée.
        </p>
      )}
    </section>
  );
}
