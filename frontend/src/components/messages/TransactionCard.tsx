import {
    Star,
} from "lucide-react";

import {
    useState,
    type FormEvent,
} from "react";

import {
    apiRequest,
} from "../../api/client";

import type { MarketplaceTransaction } from "../../types/transaction";

type TransactionCardProps = {
    transaction: MarketplaceTransaction;
    currentUserId: string;
    loading?: boolean;
    onConfirm: () => void;
};

function formatMoney(
    value: string,
    currency: string,
) {
    const amount = Number(value);

    return new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 0,
    }).format(amount) + ` ${currency}`;
}

export default function TransactionCard({
    transaction,
    currentUserId,
    loading = false,
    onConfirm,
}: TransactionCardProps) {
    const [reviewRating, setReviewRating] =
        useState(5);

    const [reviewComment, setReviewComment] =
        useState("");

    const [reviewLoading, setReviewLoading] =
        useState(false);

    const [reviewSent, setReviewSent] =
        useState(false);

    const [reviewError, setReviewError] =
        useState("");

    const isBuyer =
        transaction.buyer_id === currentUserId;

    const isSeller =
        transaction.seller_id === currentUserId;

    const buyerConfirmed =
        transaction.buyer_confirmed_at !== null;

    const sellerConfirmed =
        transaction.seller_confirmed_at !== null;

    const completed =
        transaction.status === "COMPLETED";

    const cancelled =
        transaction.status === "CANCELLED";

    const currentUserConfirmed =
        isBuyer
            ? buyerConfirmed
            : sellerConfirmed;

    async function submitReview(event: FormEvent) {
        event.preventDefault();

        setReviewLoading(true);
        setReviewError("");

        try {
            await apiRequest(
                `/transactions/${transaction.id}/reviews`,
                {
                    method: "POST",
                    authenticated: true,
                    body: JSON.stringify({
                        rating: reviewRating,
                        comment: reviewComment.trim() || null,
                    }),
                },
            );

            setReviewSent(true);
            setReviewComment("");
        } catch (cause) {
            setReviewError(
                cause instanceof Error
                    ? cause.message
                    : "Impossible d'envoyer votre avis.",
            );
        } finally {
            setReviewLoading(false);
        }
    }

    return (
        <div className="transaction-card">
            <div className="transaction-card__header">
                <div>
                    <strong>Transaction</strong>
                    <div className="transaction-card__number">
                        {transaction.transaction_number}
                    </div>
                </div>

                <span
                    className={`transaction-card__status transaction-card__status--${transaction.status.toLowerCase()}`}
                >
                    {completed
                        ? "Terminée"
                        : cancelled
                            ? "Annulée"
                            : "En cours"}
                </span>
            </div>

            <div className="transaction-card__amount">
                {formatMoney(
                    transaction.agreed_price,
                    transaction.currency,
                )}
            </div>

            {!cancelled && (
                <div className="transaction-card__confirmations">
                    <div>
                        {buyerConfirmed ? "✓" : "○"} Acheteur
                    </div>

                    <div>
                        {sellerConfirmed ? "✓" : "○"} Vendeur
                    </div>
                </div>
            )}

            {completed && (
                <div className="transaction-card__success">
                    ✓ Transaction terminée
                </div>
            )}

            {!completed &&
                !cancelled &&
                currentUserConfirmed && (
                    <div className="transaction-card__waiting">
                        ✓ Votre confirmation a été enregistrée.
                        <br />
                        En attente de l'autre partie.
                    </div>
                )}

            {!completed &&
                !cancelled &&
                !currentUserConfirmed && (
                    <button
                        type="button"
                        className="transaction-card__confirm-button"
                        disabled={loading}
                        onClick={onConfirm}
                    >
                        {loading
                            ? "Confirmation..."
                            : isBuyer
                                ? "J'ai reçu l'article"
                                : isSeller
                                    ? "J'ai remis l'article"
                                    : "Confirmer"}
                    </button>
                )}

            {completed && !reviewSent && (
                <form className="transaction-review-form" onSubmit={submitReview}>
                    <strong>Laisser un avis</strong>

                    <div className="transaction-review-stars" aria-label="Note">
                        {[1, 2, 3, 4, 5].map(value => (
                            <button
                                key={value}
                                type="button"
                                className={value <= reviewRating ? "transaction-review-star transaction-review-star--active" : "transaction-review-star"}
                                onClick={() => setReviewRating(value)}
                                aria-label={`${value} sur 5`}
                            >
                                <Star size={18} fill={value <= reviewRating ? "currentColor" : "none"} />
                            </button>
                        ))}
                    </div>

                    <textarea
                        value={reviewComment}
                        onChange={event => setReviewComment(event.target.value)}
                        placeholder="Comment s'est passée la transaction ?"
                        maxLength={2000}
                    />

                    {reviewError && (
                        <p className="form-error" role="alert">
                            {reviewError}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="transaction-card__confirm-button"
                        disabled={reviewLoading}
                    >
                        {reviewLoading ? "Envoi..." : "Envoyer l'avis"}
                    </button>
                </form>
            )}

            {reviewSent && (
                <div className="transaction-card__success">
                    Merci, votre avis a été enregistré.
                </div>
            )}
        </div>
    );
}
