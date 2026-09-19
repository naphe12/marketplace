from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import BillingOrder
from app.models.publication import ListingPublication
from app.repositories.publication_repository import (
    PublicationRepository,
)
from app.repositories.settings_repository import (
    SettingsRepository,
)
from app.services.listing_service import ListingService


class PublicationService:

    @staticmethod
    async def create_paid_publication(
        db: AsyncSession,
        listing_id: UUID,
        seller_id: UUID,
        package_id: UUID,
    ):
        settings = await SettingsRepository.get(db)

        if not settings.listing_payment_enabled:
            raise HTTPException(
                status_code=400,
                detail=(
                    "La publication payante n'est "
                    "pas activée actuellement."
                ),
            )

        listing = await ListingService.get_owned(
            db,
            listing_id,
            seller_id,
        )

        if listing.status not in {
            "DRAFT",
            "EXPIRED",
            "PENDING_PAYMENT",
        }:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cette annonce ne peut pas "
                    "être publiée actuellement."
                ),
            )

        if len(listing.title.strip()) < 3:
            raise HTTPException(422, "Le titre doit contenir au moins 3 caractères avant publication.")

        package = await PublicationRepository.get_package(
            db,
            package_id,
        )

        if not package:
            raise HTTPException(
                status_code=404,
                detail="Formule de publication introuvable.",
            )

        publication = ListingPublication(
            listing_id=listing.id,
            advertiser_id=seller_id,
            package_id=package.id,

            # snapshot commercial
            duration_days=package.duration_days,
            price_paid=package.price,
            currency=package.currency,

            status="PENDING_PAYMENT",
        )

        db.add(publication)

        await db.flush()

        order_number = (
            f"PUB-"
            f"{datetime.now(timezone.utc):%Y%m%d}-"
            f"{uuid4().hex[:8].upper()}"
        )

        order = BillingOrder(
            order_number=order_number,

            user_id=seller_id,
            listing_id=listing.id,
            publication_id=publication.id,

            order_type="LISTING_PUBLICATION",

            subtotal=package.price,
            discount_amount=Decimal("0"),
            total_amount=package.price,

            currency=package.currency,
            status="PENDING_PAYMENT",
        )

        db.add(order)

        listing.status = "PENDING_PAYMENT"

        await db.commit()

        await db.refresh(publication)
        await db.refresh(order)

        return publication, order