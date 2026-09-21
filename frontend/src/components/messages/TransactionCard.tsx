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

    return (
        <div className="transaction-card">
            <div className="transaction-card__header">
                <div>
                    <strong>🧾 Transaction</strong>
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
        </div>
    );
}