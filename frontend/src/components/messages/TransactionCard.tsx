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
    onDeliveryChanged?: () => void;
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
    onDeliveryChanged,
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

    const [deliveryOpen, setDeliveryOpen] =
        useState(false);

    const [pickupAddress, setPickupAddress] =
        useState("");

    const [dropoffAddress, setDropoffAddress] =
        useState("");

    const [carrierName, setCarrierName] =
        useState("");

    const [deliveryFee, setDeliveryFee] =
        useState("0");

    const [deliveryLoading, setDeliveryLoading] =
        useState(false);

    const [deliveryError, setDeliveryError] =
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


    async function createDelivery(event: FormEvent) {
        event.preventDefault();
        setDeliveryLoading(true);
        setDeliveryError("");

        try {
            await apiRequest(
                `/transactions/${transaction.id}/delivery`,
                {
                    method: "POST",
                    authenticated: true,
                    body: JSON.stringify({
                        pickup_address: pickupAddress.trim(),
                        dropoff_address: dropoffAddress.trim(),
                        carrier_name: carrierName.trim() || null,
                        fee_amount: deliveryFee || "0",
                        currency: transaction.currency,
                    }),
                },
            );
            setDeliveryOpen(false);
            onDeliveryChanged?.();
        } catch (cause) {
            setDeliveryError(
                cause instanceof Error
                    ? cause.message
                    : "Impossible de créer la livraison.",
            );
        } finally {
            setDeliveryLoading(false);
        }
    }

    async function deliveryAction(action: "accept" | "pickup" | "deliver" | "cancel" | "dispute") {
        setDeliveryLoading(true);
        setDeliveryError("");

        const body = action === "pickup"
            ? JSON.stringify({ tracking_reference: window.prompt("Référence de suivi ?") || null })
            : action === "deliver"
                ? JSON.stringify({ proof_url: window.prompt("Lien de preuve de livraison ?") || null })
                : action === "dispute"
                    ? JSON.stringify({ reason: window.prompt("Pourquoi contestez-vous cette livraison ?") || "Litige livraison" })
                    : undefined;

        try {
            await apiRequest(
                `/transactions/${transaction.id}/delivery/${action}`,
                {
                    method: "POST",
                    authenticated: true,
                    body,
                },
            );
            onDeliveryChanged?.();
        } catch (cause) {
            setDeliveryError(
                cause instanceof Error
                    ? cause.message
                    : "Action livraison impossible.",
            );
        } finally {
            setDeliveryLoading(false);
        }
    }

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


            <section className="transaction-delivery">
                <div className="transaction-card__header">
                    <strong>Livraison</strong>
                    {transaction.delivery && (
                        <span className={`transaction-card__status transaction-card__status--${transaction.delivery.status.toLowerCase()}`}>
                            {transaction.delivery.status}
                        </span>
                    )}
                </div>

                {!transaction.delivery && !cancelled && (
                    <>
                        <button
                            type="button"
                            className="secondary-button inline-button"
                            onClick={() => setDeliveryOpen(value => !value)}
                        >
                            {deliveryOpen ? "Fermer" : "Demander une livraison"}
                        </button>

                        {deliveryOpen && (
                            <form className="transaction-review-form" onSubmit={createDelivery}>
                                <input
                                    value={pickupAddress}
                                    onChange={event => setPickupAddress(event.target.value)}
                                    placeholder="Adresse de prise en charge"
                                    required
                                />
                                <input
                                    value={dropoffAddress}
                                    onChange={event => setDropoffAddress(event.target.value)}
                                    placeholder="Adresse de livraison"
                                    required
                                />
                                <input
                                    value={carrierName}
                                    onChange={event => setCarrierName(event.target.value)}
                                    placeholder="Transporteur ou contact"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    value={deliveryFee}
                                    onChange={event => setDeliveryFee(event.target.value)}
                                    placeholder="Frais"
                                />
                                <button type="submit" className="transaction-card__confirm-button" disabled={deliveryLoading}>
                                    {deliveryLoading ? "Création..." : "Créer la livraison"}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {transaction.delivery && (
                    <div className="transaction-delivery__details">
                        <p><strong>Départ</strong> {transaction.delivery.pickup_address}</p>
                        <p><strong>Arrivée</strong> {transaction.delivery.dropoff_address}</p>
                        <p><strong>Frais</strong> {formatMoney(transaction.delivery.fee_amount, transaction.delivery.currency)}</p>
                        {transaction.delivery.carrier_name && <p><strong>Transporteur</strong> {transaction.delivery.carrier_name}</p>}
                        {transaction.delivery.tracking_reference && <p><strong>Suivi</strong> {transaction.delivery.tracking_reference}</p>}
                        {transaction.delivery.proof_url && <p><strong>Preuve</strong> {transaction.delivery.proof_url}</p>}
                        {transaction.delivery.dispute_reason && <p><strong>Litige</strong> {transaction.delivery.dispute_reason}</p>}

                        <div className="meetup-response-actions">
                            {isSeller && transaction.delivery.status === "REQUESTED" && (
                                <button type="button" className="secondary-button inline-button" disabled={deliveryLoading} onClick={() => void deliveryAction("accept")}>Accepter</button>
                            )}
                            {isSeller && ["REQUESTED", "ACCEPTED"].includes(transaction.delivery.status) && (
                                <button type="button" className="secondary-button inline-button" disabled={deliveryLoading} onClick={() => void deliveryAction("pickup")}>En cours</button>
                            )}
                            {isBuyer && ["IN_TRANSIT", "ACCEPTED"].includes(transaction.delivery.status) && (
                                <button type="button" className="primary-button inline-button" disabled={deliveryLoading} onClick={() => void deliveryAction("deliver")}>Reçu</button>
                            )}
                            {! ["DELIVERED", "CANCELLED"].includes(transaction.delivery.status) && (
                                <button type="button" className="secondary-button inline-button" disabled={deliveryLoading} onClick={() => void deliveryAction("dispute")}>Litige</button>
                            )}
                            {! ["DELIVERED", "CANCELLED"].includes(transaction.delivery.status) && (
                                <button type="button" className="secondary-button inline-button" disabled={deliveryLoading} onClick={() => void deliveryAction("cancel")}>Annuler</button>
                            )}
                        </div>
                    </div>
                )}

                {deliveryError && <p className="form-error" role="alert">{deliveryError}</p>}
            </section>

            {completed && !reviewSent && (
                <form className="transaction-review-form" onSubmit={submitReview}>
                    <strong>Laisser un avis</strong>

                    <div className="transaction-review-stars" aria-label="Note">
                        {[1, 2, 3, 4, 5].map(value => (
                            <button
                                key={value}
                                type="button"
                                className={`transaction-review-star transaction-review-star--rating-${reviewRating} ${value <= reviewRating ? "transaction-review-star--active" : ""}`}
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
