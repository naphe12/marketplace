from datetime import (
    datetime,
    timedelta,
    timezone,
)

from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.models.listing import Listing
from app.models.offer import Offer
from app.models.report import Report
from app.models.transaction import Transaction
from app.models.user import User


def utcnow() -> datetime:
    return datetime.now(
        timezone.utc
    )


async def extract_offer_features(
    db: AsyncSession,
    offer: Offer,
    user: User,
    listing: Listing,
) -> dict:
    now = utcnow()

    # -----------------------------
    # Ancienneté du compte
    # -----------------------------

    account_age_days = 0

    if user.created_at:
        account_age_days = max(
            (
                now - user.created_at
            ).days,
            0,
        )


    # -----------------------------
    # Nombre total d'offres
    # -----------------------------

    total_offers = (
        await db.scalar(
            select(
                func.count(
                    Offer.id
                )
            ).where(
                Offer.buyer_id
                == user.id
            )
        )
    ) or 0


    # -----------------------------
    # Offres durant la dernière heure
    # -----------------------------

    one_hour_ago = (
        now - timedelta(
            hours=1
        )
    )

    recent_offers = (
        await db.scalar(
            select(
                func.count(
                    Offer.id
                )
            ).where(
                Offer.buyer_id
                    == user.id,

                Offer.created_at
                    >= one_hour_ago,
            )
        )
    ) or 0


    # -----------------------------
    # Signalements confirmés
    # -----------------------------

    confirmed_reports = (
        await db.scalar(
            select(
                func.count(
                    Report.id
                )
            ).where(
                Report.target_type
                    == "USER",

                Report.target_id
                    == user.id,

                Report.status
                    == "CONFIRMED",
            )
        )
    ) or 0


    # -----------------------------
    # Transactions terminées
    # -----------------------------

    completed_transactions = (
        await db.scalar(
            select(
                func.count(
                    Transaction.id
                )
            ).where(
                Transaction.buyer_id
                    == user.id,

                Transaction.status
                    == "COMPLETED",
            )
        )
    ) or 0


    # -----------------------------
    # Montant de l'offre
    # -----------------------------

    offer_amount = float(
        offer.amount
    )


    # -----------------------------
    # Prix de l'annonce
    # -----------------------------

    listing_price = (
        float(
            listing.price
        )
        if listing.price
        is not None
        else None
    )


    # -----------------------------
    # Ratio offre / prix annonce
    # -----------------------------

    offer_ratio = None

    if (
        listing_price is not None
        and listing_price > 0
    ):
        offer_ratio = (
            offer_amount
            / listing_price
        )


    # -----------------------------
    # Features finales
    # -----------------------------

    return {
        "account_age_days":
            account_age_days,

        "total_offers":
            total_offers,

        "offers_last_hour":
            recent_offers,

        "confirmed_reports":
            confirmed_reports,

        "completed_transactions":
            completed_transactions,

        "offer_amount":
            offer_amount,

        "listing_price":
            listing_price,

        "offer_to_listing_ratio":
            offer_ratio,

        "phone_verified":
            bool(
                user.phone_verified
            ),

        "email_verified":
            bool(
                user.email_verified
            ),
    }