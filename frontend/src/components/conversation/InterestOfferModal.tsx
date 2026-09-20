import { useEffect, useState } from "react";

type InterestOfferModalProps = {
  open: boolean;
  listingTitle: string;
  listingPrice: number | null;
  currency?: string;
  loading?: boolean;
  onSubmit: (amount: number) => Promise<void>;
  onContinueWithoutOffer: () => void;
  onClose: () => void;
};

export default function InterestOfferModal({
  open,
  listingTitle,
  listingPrice,
  currency = "BIF",
  loading = false,
  onSubmit,
  onContinueWithoutOffer,
  onClose,
}: InterestOfferModalProps) {
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (open) {
      setAmount("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const parsedAmount = Number(amount);

  const valid =
    amount.trim() !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0;

  const submit = async () => {
    if (!valid) {
      return;
    }

    await onSubmit(parsedAmount);
  };

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("fr-FR").format(value);

  return (
    <div className="offer-modal-backdrop">
      <div
        className="offer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-modal-title"
      >
        <button
          type="button"
          className="offer-modal-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>

        <h2 id="offer-modal-title">
          Je suis intéressé
        </h2>

        <p className="offer-modal-listing">
          {listingTitle}
        </p>

        {listingPrice != null && (
          <div className="offer-modal-price">
            <span>Prix demandé</span>

            <strong>
              {formatMoney(listingPrice)} {currency}
            </strong>
          </div>
        )}

        <label
          className="offer-modal-label"
          htmlFor="offer-amount"
        >
          Votre offre
        </label>

        <div className="offer-input-wrapper">
          <input
            id="offer-amount"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            placeholder="Ex. 850000"
            autoFocus
          />

          <span>{currency}</span>
        </div>

        {listingPrice != null && valid && (
          <p className="offer-modal-hint">
            Votre offre représente{" "}
            {Math.round(
              (parsedAmount / listingPrice) * 100
            )}
            % du prix demandé.
          </p>
        )}

        <button
          type="button"
          className="offer-submit-button"
          disabled={!valid || loading}
          onClick={submit}
        >
          {loading
            ? "Envoi..."
            : "Envoyer mon offre"}
        </button>

        <button
          type="button"
          className="offer-skip-button"
          disabled={loading}
          onClick={onContinueWithoutOffer}
        >
          Continuer sans faire d'offre
        </button>
      </div>
    </div>
  );
}