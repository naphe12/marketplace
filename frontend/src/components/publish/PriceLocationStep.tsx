import { useI18n } from "../../i18n/I18nProvider";
import LocationPicker from "../location/LocationPicker";
import LocationSelector from "./LocationSelector";

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
  onMapLocationChange: (latitude: number, longitude: number) => void;
};

export default function PriceLocationStep({
  price, currency, priceType, allowOffers,
  provinceId, communeId, zoneId, localityId,
  latitude, longitude,
  onPriceChange, onCurrencyChange,
  onPriceTypeChange, onAllowOffersChange,
  onProvinceChange, onCommuneChange,
  onZoneChange, onLocalityChange,
  onLocationResolved, onMapLocationChange,
}: Props) {
  const { t } = useI18n();
  const hasLocation =
    latitude !== null && longitude !== null &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

  const defaultLatitude = hasLocation ? latitude : null;
  const defaultLongitude = hasLocation ? longitude : null;

  return (
    <section className="publish-panel">
      <div className="publish-panel__heading">
        <h1>{t("publish.priceLocationTitle")}</h1>
        <p>{t("publish.priceLocationText")}</p>
      </div>

      <div className="price-row">
        <label className="form-field">
          <span>{t("publish.price")}</span>
          <input type="number" min="0" value={price}
            onChange={event => onPriceChange(event.target.value)} />
        </label>
        <label className="form-field">
          <span>{t("publish.currency")}</span>
          <select value={currency} onChange={event => onCurrencyChange(event.target.value)}>
            <option value="BIF">BIF</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
      </div>

      <div className="form-field">
        <span>{t("publish.priceType")}</span>
        <div className="choice-row">
          <button type="button"
            className={priceType === "FIXED" ? "choice-chip choice-chip--selected" : "choice-chip"}
            onClick={() => onPriceTypeChange("FIXED")}>{t("publish.fixedPrice")}</button>
          <button type="button"
            className={priceType === "NEGOTIABLE" ? "choice-chip choice-chip--selected" : "choice-chip"}
            onClick={() => onPriceTypeChange("NEGOTIABLE")}>{t("publish.negotiable")}</button>
        </div>
      </div>

      <label className="form-checkbox">
        <input type="checkbox" checked={allowOffers}
          onChange={event => onAllowOffersChange(event.target.checked)} />
        <div>
          <strong>{t("publish.allowOffers")}</strong>
          <span>{t("publish.allowOffersText")}</span>
        </div>
      </label>

      <div className="form-section-title">{t("publish.location")}</div>
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

      {Boolean(communeId) && (
        <LocationPicker
          latitude={hasLocation ? latitude : null}
          longitude={hasLocation ? longitude : null}
          defaultLatitude={defaultLatitude}
          defaultLongitude={defaultLongitude}
          onChange={onMapLocationChange}
        />
      )}

      {!hasLocation && Boolean(communeId) && (
        <p className="approximate-location__note">
          {t("publish.noCoordinates")}
        </p>
      )}
    </section>
  );
}
