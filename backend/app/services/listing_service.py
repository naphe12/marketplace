from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.listing import (
    Listing,
    ListingAttributeValue,
    ListingImage,
)
from app.repositories.category_repository import CategoryRepository
from app.repositories.listing_repository import ListingRepository
from app.schemas.listing import (
    ListingAttributeValueCreate,
    ListingCreate,
    ListingImageCreate,
    ListingUpdate,
)

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.models.publication import ListingPublication
from app.repositories.settings_repository import SettingsRepository


class ListingService:

    @staticmethod
    async def create(
        db: AsyncSession,
        seller_id: UUID,
        data: ListingCreate,
    ) -> Listing:

        category = await CategoryRepository.get_by_id(
            db,
            data.category_id,
        )

        if not category:
            raise HTTPException(
                status_code=404,
                detail="Catégorie introuvable.",
            )

        if not category.active:
            raise HTTPException(
                status_code=400,
                detail="Cette catégorie n'est pas active.",
            )

        listing = Listing(
            seller_id=seller_id,
            category_id=data.category_id,
            administrative_area_id=data.administrative_area_id,
            title=data.title,
            description=data.description,
            price=data.price,
            currency=data.currency.upper(),
            price_type=data.price_type.upper(),
            condition=(
                data.condition.upper()
                if data.condition
                else None
            ),
            quantity=data.quantity,
            allow_offers=data.allow_offers,
            latitude=data.latitude,
            longitude=data.longitude,
            status="DRAFT",
        )

        return await ListingRepository.create(
            db,
            listing,
        )

    @staticmethod
    async def get_owned(
        db: AsyncSession,
        listing_id: UUID,
        seller_id: UUID,
    ) -> Listing:

        listing = await ListingRepository.get_by_id(
            db,
            listing_id,
        )

        if not listing:
            raise HTTPException(
                status_code=404,
                detail="Annonce introuvable.",
            )

        if listing.seller_id != seller_id:
            raise HTTPException(
                status_code=403,
                detail="Vous n'êtes pas propriétaire de cette annonce.",
            )

        return listing

    @staticmethod
    async def update(
        db: AsyncSession,
        listing_id: UUID,
        seller_id: UUID,
        data: ListingUpdate,
    ) -> Listing:

        listing = await ListingService.get_owned(
            db,
            listing_id,
            seller_id,
        )

        if listing.status not in {
            "DRAFT",
            "EXPIRED",
            "REJECTED",
        }:
            raise HTTPException(
                status_code=400,
                detail="Cette annonce ne peut pas être modifiée actuellement.",
            )

        values = data.model_dump(
            exclude_unset=True
        )

        if "category_id" in values:
            category = await CategoryRepository.get_by_id(
                db,
                values["category_id"],
            )

            if not category:
                raise HTTPException(
                    status_code=404,
                    detail="Catégorie introuvable.",
                )

        if values.get("currency"):
            values["currency"] = values["currency"].upper()

        if values.get("price_type"):
            values["price_type"] = values["price_type"].upper()

        if values.get("condition"):
            values["condition"] = values["condition"].upper()

        for key, value in values.items():
            setattr(listing, key, value)

        await db.commit()
        await db.refresh(listing)

        return listing

    @staticmethod
    async def add_image(
        db: AsyncSession,
        listing_id: UUID,
        seller_id: UUID,
        data: ListingImageCreate,
    ) -> ListingImage:

        listing = await ListingService.get_owned(
            db,
            listing_id,
            seller_id,
        )

        if data.is_primary:
            for image in listing.images:
                image.is_primary = False

        image = ListingImage(
            listing_id=listing.id,
            image_url=data.image_url,
            thumbnail_url=data.thumbnail_url,
            position=data.position,
            is_primary=data.is_primary,
        )

        db.add(image)

        await db.commit()
        await db.refresh(image)

        return image

    @staticmethod
    async def add_attribute_value(
        db: AsyncSession,
        listing_id: UUID,
        seller_id: UUID,
        data: ListingAttributeValueCreate,
    ) -> ListingAttributeValue:

        listing = await ListingService.get_owned(
            db,
            listing_id,
            seller_id,
        )

        value = ListingAttributeValue(
            listing_id=listing.id,
            attribute_id=data.attribute_id,
            value_text=data.value_text,
            value_integer=data.value_integer,
            value_decimal=data.value_decimal,
            value_boolean=data.value_boolean,
            value_date=data.value_date,
        )

        db.add(value)

        await db.commit()
        await db.refresh(value)

        return value
    

    @staticmethod
    async def publish(    db: AsyncSession,    listing_id: UUID,    seller_id: UUID,):
        listing = await ListingService.get_owned(
            db,
            listing_id,
            seller_id,
        )

        settings = await SettingsRepository.get(db)

        # ============================================
        # MODE GRATUIT
        # ============================================

        if not settings.listing_payment_enabled:

            now = datetime.now(timezone.utc)

            ends_at = now + timedelta(
                days=settings.free_listing_duration_days
            )

            publication = ListingPublication(
                listing_id=listing.id,
                advertiser_id=seller_id,
                package_id=None,
                duration_days=(
                    settings.free_listing_duration_days
                ),
                price_paid=Decimal("0"),
                currency="BIF",
                starts_at=now,
                ends_at=ends_at,
                status="ACTIVE",
            )

            listing.status = "ACTIVE"
            listing.published_at = now
            listing.expires_at = ends_at

            db.add(publication)

            await db.commit()
            await db.refresh(listing)

            return {
                "payment_required": False,
                "listing_id": listing.id,
                "status": listing.status,
                "expires_at": listing.expires_at,
            }

        # ============================================
        # MODE PAYANT
        # ============================================

        listing.status = "PENDING_PAYMENT"

        await db.commit()

        return {
            "payment_required": True,
            "listing_id": listing.id,
            "status": "PENDING_PAYMENT",
        }