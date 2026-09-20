from datetime import (
    datetime,
    timedelta,
    timezone,
)
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.listing import Listing
from app.models.publication import ListingPublication
from app.repositories.settings_repository import SettingsRepository


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def publish_listing(
    db: AsyncSession,
    listing: Listing,
) -> dict:
    if listing.status not in {
        "DRAFT",
        "EXPIRED",
        "PENDING_PAYMENT",
    }:
        raise HTTPException(
            status_code=400,
            detail="Cette annonce ne peut pas être publiée.",
        )

    if not listing.title.strip():
        raise HTTPException(
            status_code=400,
            detail="Le titre est obligatoire.",
        )

    if listing.price is None:
        raise HTTPException(
            status_code=400,
            detail="Le prix est obligatoire.",
        )

    if not listing.administrative_area_id:
        raise HTTPException(
            status_code=400,
            detail="La localisation est obligatoire.",
        )

    settings = await SettingsRepository.get(db)

    if not settings.listing_payment_enabled:
        now = utcnow()
        expires_at = now + timedelta(
            days=settings.free_listing_duration_days,
        )

        listing.status = "ACTIVE"

        if not listing.published_at:
            listing.published_at = now

        listing.expires_at = expires_at

        publication = ListingPublication(
            listing_id=listing.id,
            advertiser_id=listing.seller_id,
            package_id=None,
            duration_days=settings.free_listing_duration_days,
            price_paid=Decimal("0"),
            currency=listing.currency,
            starts_at=now,
            ends_at=expires_at,
            status="ACTIVE",
        )

        db.add(publication)
        await db.commit()
        await db.refresh(listing)

        return {
            "payment_required": False,
            "listing_id": listing.id,
            "status": listing.status,
            "expires_at": listing.expires_at,
        }

    listing.status = "PENDING_PAYMENT"
    await db.commit()
    await db.refresh(listing)

    return {
        "payment_required": True,
        "listing_id": listing.id,
        "status": listing.status,
        "expires_at": None,
    }
