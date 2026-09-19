import LocationSelector from "./LocationSelector";

type Props = {
  price: string;
  currency: string;
  priceType: string;
  allowOffers: boolean;
  provinceId: string;
  communeId: string;

  onPriceChange: (
    value: string,
  ) => void;

  onCurrencyChange: (
    value: string,
  ) => void;

  onPriceTypeChange: (
    value: string,
  ) => void;

  onAllowOffersChange: (
    value: boolean,
  ) => void;
  onProvinceChange: (value: string) => void;
  onCommuneChange: (value: string) => void;
};


export default function PriceLocationStep({
  price,
  currency,
  priceType,
  allowOffers,
  provinceId,
  communeId,

  onPriceChange,
  onCurrencyChange,
  onPriceTypeChange,
  onAllowOffersChange,
  onProvinceChange,
  onCommuneChange,
}: Props) {
  return (
    <section className="publish-panel">
      <div className="publish-panel__heading">
        <h1>
          Prix et disponibilité
        </h1>

        <p>
          Indiquez clairement vos conditions
          pour éviter les malentendus.
        </p>
      </div>


      <div className="price-row">
        <label className="form-field">
          <span>Prix</span>

          <input
            type="number"
            min="0"
            value={price}
            onChange={event =>
              onPriceChange(
                event.target.value,
              )
            }
          />
        </label>

        <label className="form-field currency-field">
          <span>Devise</span>

          <select
            value={currency}
            onChange={event =>
              onCurrencyChange(
                event.target.value,
              )
            }
          >
            <option value="BIF">
              BIF
            </option>

            <option value="USD">
              USD
            </option>

            <option value="EUR">
              EUR
            </option>
          </select>
        </label>
      </div>


      <div className="form-field">
        <span>Type de prix</span>

        <div className="choice-row">
          <button
            type="button"
            className={
              priceType === "FIXED"
                ? "choice-chip choice-chip--selected"
                : "choice-chip"
            }
            onClick={() =>
              onPriceTypeChange(
                "FIXED",
              )
            }
          >
            Prix fixe
          </button>

          <button
            type="button"
            className={
              priceType === "NEGOTIABLE"
                ? "choice-chip choice-chip--selected"
                : "choice-chip"
            }
            onClick={() =>
              onPriceTypeChange(
                "NEGOTIABLE",
              )
            }
          >
            Négociable
          </button>
        </div>
      </div>


      <label className="form-checkbox">
        <input
          type="checkbox"
          checked={allowOffers}
          onChange={event =>
            onAllowOffersChange(
              event.target.checked,
            )
          }
        />

        <div>
          <strong>
            Autoriser les offres
          </strong>

          <span>
            Les acheteurs pourront proposer
            un autre prix.
          </span>
        </div>
      </label>


      <div className="form-section-title">
        Localisation
      </div>

      <LocationSelector
        provinceId={provinceId}
        communeId={communeId}
        onProvinceChange={onProvinceChange}
        onCommuneChange={onCommuneChange}
      />
    </section>
  );
}