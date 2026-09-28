import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useI18n } from "../../i18n/I18nProvider";
import LocationPicker from "../location/LocationPicker";
import LocationSelector from "./LocationSelector";

type PricingEstimate = {
  verdict: string;
  confidence: string;
  suggested_price: string | null;
  low_price: string | null;
  high_price: string | null;
  median_price: string | null;
  comparable_count: number;
  currency: string;
  message: string;
  reasons: string[];
};

type Props = {
  categoryId: string | null;
  countryCode: string;
  condition: string;
  administrativeAreaId: string | null;
  price: string;
  currency: string;
  marketCurrency: string;
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
  categoryId, countryCode, condition, administrativeAreaId,
  price, currency, marketCurrency, priceType, allowOffers,
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
  const [pricingEstimate, setPricingEstimate] = useState<PricingEstimate | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState("");

  useEffect(() => {
    if (!categoryId || !price || Number(price) <= 0) {
      setPricingEstimate(null);
      setPricingError("");
      setPricingLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setPricingLoading(true);
      setPricingError("");

      void apiRequest<PricingEstimate>("/pricing/estimate", {
        method: "POST",
        authenticated: true,
        signal: controller.signal,
        body: JSON.stringify({
          category_id: categoryId,
          country_code: countryCode,
          administrative_area_id: administrativeAreaId,
          condition,
          price,
          currency,
        }),
      })
        .then(result => {
          if (!controller.signal.aborted) {
            setPricingEstimate(result);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setPricingEstimate(null);
            setPricingError(t("publish.pricingUnavailable"));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setPricingLoading(false);
          }
        });
    }, 450);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [administrativeAreaId, categoryId, condition, countryCode, currency, price, t]);

  function pricingVerdictLabel(verdict: string) {
    if (verdict === "TOO_LOW") return t("publish.pricingTooLow");
    if (verdict === "FAST_SALE") return t("publish.pricingFastSale");
    if (verdict === "FAIR") return t("publish.pricingFair");
    if (verdict === "HIGH") return t("publish.pricingHigh");
    if (verdict === "TOO_HIGH") return t("publish.pricingTooHigh");
    return t("publish.pricingUnknown");
  }

  function pricingMessage(verdict: string) {
    if (verdict === "TOO_LOW") return t("publish.pricingMessageTooLow");
    if (verdict === "FAST_SALE") return t("publish.pricingMessageFastSale");
    if (verdict === "FAIR") return t("publish.pricingMessageFair");
    if (verdict === "HIGH") return t("publish.pricingMessageHigh");
    if (verdict === "TOO_HIGH") return t("publish.pricingMessageTooHigh");
    if (verdict === "NO_PRICE") return t("publish.pricingMessageNoPrice");
    return t("publish.pricingMessageUnknown");
  }

  function pricingClassName(verdict: string | undefined) {
    if (verdict === "FAST_SALE" || verdict === "FAIR") return "pricing-insight pricing-insight--good";
    if (verdict === "HIGH") return "pricing-insight pricing-insight--warning";
    if (verdict === "TOO_LOW" || verdict === "TOO_HIGH") return "pricing-insight pricing-insight--danger";
    return "pricing-insight";
  }

  function formatPrice(value: string | null | undefined, valueCurrency: string) {
    if (!value) return "-";
    return `${Number(value).toLocaleString("fr-FR")} ${valueCurrency}`;
  }

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
            <option value={marketCurrency}>{marketCurrency}</option>
          </select>
        </label>
      </div>

      {(pricingEstimate || pricingLoading || pricingError) && (
        <aside className={pricingClassName(pricingEstimate?.verdict)}>
          <div className="pricing-insight__heading">
            <span>{t("publish.pricingTitle")}</span>
            <strong>
              {pricingLoading
                ? t("publish.pricingLoading")
                : pricingEstimate
                  ? pricingVerdictLabel(pricingEstimate.verdict)
                  : t("publish.pricingUnavailable")}
            </strong>
          </div>

          {pricingEstimate && (
            <>
              <p>{pricingMessage(pricingEstimate.verdict)}</p>
              <p className="pricing-insight__note">{t("publish.pricingSuggestionOnly")}</p>
              <dl>
                <div>
                  <dt>{t("publish.pricingSuggested")}</dt>
                  <dd>{formatPrice(pricingEstimate.suggested_price, pricingEstimate.currency)}</dd>
                </div>
                <div>
                  <dt>{t("publish.pricingRange")}</dt>
                  <dd>{formatPrice(pricingEstimate.low_price, pricingEstimate.currency)} - {formatPrice(pricingEstimate.high_price, pricingEstimate.currency)}</dd>
                </div>
                <div>
                  <dt>{t("publish.pricingComparables")}</dt>
                  <dd>{pricingEstimate.comparable_count}</dd>
                </div>
              </dl>
            </>
          )}

          {pricingError && <p>{pricingError}</p>}
        </aside>
      )}

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
