import type {
    ConversationOffer,
} from "../../types/offer";


type OfferCardProps = {
    offer: ConversationOffer;
    currentUserId: string;

    loading?: boolean;

    onAccept: () => void;
    onReject: () => void;
};


export default function OfferCard({
    offer,
    currentUserId,
    loading = false,
    onAccept,
    onReject,
}: OfferCardProps) {

    const isBuyer =
        offer.buyer_id === currentUserId;

    const isSeller =
        offer.seller_id === currentUserId;


    const amount =
        new Intl.NumberFormat(
            "fr-BI",
            {
                maximumFractionDigits: 2,
            },
        ).format(
            Number(offer.amount),
        );


    const statusLabels: Record<
        string,
        string
    > = {
        PENDING: "En attente",
        ACCEPTED: "Acceptée",
        REJECTED: "Refusée",
        CANCELLED: "Annulée",
    };


    return (
        <div
            className={
                isBuyer
                    ? "conversation-offer conversation-offer--mine"
                    : "conversation-offer"
            }
        >

            <div className="conversation-offer__header">

                <strong>
                    💰 Offre
                </strong>

                <span
                    className={
                        `conversation-offer__status ` +
                        `conversation-offer__status--${offer.status.toLowerCase()}`
                    }
                >
                    {statusLabels[offer.status] ??
                        offer.status}
                </span>

            </div>


            <div className="conversation-offer__amount">
                {amount} {offer.currency}
            </div>


            {offer.status === "PENDING" &&
                isBuyer && (
                    <p className="conversation-offer__hint">
                        En attente de la réponse du vendeur.
                    </p>
                )}


            {offer.status === "PENDING" &&
                isSeller && (
                    <div className="conversation-offer__actions">

                        <button
                            type="button"
                            className="primary-button"
                            disabled={loading}
                            onClick={onAccept}
                        >
                            {loading
                                ? "Traitement..."
                                : "Accepter"}
                        </button>

                        <button
                            type="button"
                            className="secondary-button"
                            disabled={loading}
                            onClick={onReject}
                        >
                            Refuser
                        </button>

                    </div>
                )}


            {offer.status === "ACCEPTED" && (
                <p className="conversation-offer__result">
                    ✓ Offre acceptée
                </p>
            )}


            {offer.status === "REJECTED" && (
                <p className="conversation-offer__result">
                    Offre refusée
                </p>
            )}


            {offer.status === "CANCELLED" && (
                <p className="conversation-offer__result">
                    Offre annulée
                </p>
            )}

        </div>
    );
}