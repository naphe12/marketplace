from app.schemas.listing import ListingImageUpdate
from app.core.config import settings
from app.services.storage_service import StorageService
from uuid import UUID, uuid4

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

        if not listing or listing.deleted_at is not None:
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
            "ACTIVE",
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

        required_fields = {
            "category_id", "title", "currency", "price_type", "quantity", "allow_offers",
        }
        if any(key in required_fields and value is None for key, value in values.items()):
            raise HTTPException(422, "Un champ obligatoire ne peut pas être nul.")
        if "title" in values:
            values["title"] = values["title"].strip()
            if listing.status != "DRAFT" and len(values["title"]) < 3:
                raise HTTPException(422, "Le titre doit contenir au moins 3 caractères.")

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

        ListingService.ensure_images_editable(listing)

        image_id = uuid4()
        image_url = data.image_url
        if data.storage_key:
            prefix = f"listings/{listing.id}/"
            if (
                not data.storage_key.startswith(prefix)
                or len(data.storage_key) <= len(prefix)
                or ".." in data.storage_key.split("/")
                or "\\" in data.storage_key
            ):
                raise HTTPException(400, "Chemin de stockage invalide pour cette annonce.")
            if data.image_url or data.thumbnail_url:
                raise HTTPException(400, "Utilisez storage_key seul pour une image du bucket.")
            await StorageService.check_image(data.storage_key)
            image_url = f"{settings.PUBLIC_API_URL.rstrip('/')}/api/v1/images/{image_id}"
        elif not image_url or not image_url.startswith(("https://", "http://")):
            raise HTTPException(400, "Fournissez storage_key ou une URL HTTP valide.")

        if data.is_primary:
            for image in listing.images:
                image.is_primary = False

        image = ListingImage(
            id=image_id,
            storage_key=data.storage_key,
            listing_id=listing.id,
            image_url=image_url,
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

        value = next(
            (item for item in listing.attribute_values if item.attribute_id == data.attribute_id),
            None,
        )
        if value is None:
            value = ListingAttributeValue(listing_id=listing.id, attribute_id=data.attribute_id)
            db.add(value)
        for key, field_value in data.model_dump(exclude={"attribute_id"}).items():
            setattr(value, key, field_value)

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

        if len(listing.title.strip()) < 3:
            raise HTTPException(422, "Le titre doit contenir au moins 3 caractères avant publication.")

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
    @staticmethod
    def ensure_images_editable(listing: Listing):
        if listing.status not in {"DRAFT", "ACTIVE", "EXPIRED", "REJECTED"}:
            raise HTTPException(400, "Les photos de cette annonce ne peuvent pas être modifiées actuellement.")

    @staticmethod
    async def update_image(
        db: AsyncSession, listing_id: UUID, image_id: UUID,
        seller_id: UUID, data: ListingImageUpdate,
    ) -> ListingImage:
        listing = await ListingService.get_owned(db, listing_id, seller_id)
        ListingService.ensure_images_editable(listing)
        image = next((item for item in listing.images if item.id == image_id), None)
        if image is None:
            raise HTTPException(404, "Photo introuvable dans cette annonce.")
        values = data.model_dump(exclude_unset=True)
        if any(value is None for value in values.values()):
            raise HTTPException(422, "La position et le statut principal ne peuvent pas être nuls.")
        if values.get("is_primary"):
            for item in listing.images:
                item.is_primary = False
        for key, value in values.items():
            setattr(image, key, value)
        await db.commit()
        await db.refresh(image)
        return image

    @staticmethod
    async def delete_image(
        db: AsyncSession, listing_id: UUID, image_id: UUID, seller_id: UUID,
    ):
        listing = await ListingService.get_owned(db, listing_id, seller_id)
        ListingService.ensure_images_editable(listing)
        image = next((item for item in listing.images if item.id == image_id), None)
        if image is None:
            raise HTTPException(404, "Photo introuvable dans cette annonce.")
        remaining = [item for item in listing.images if item.id != image_id]
        if image.is_primary and remaining:
            for item in remaining:
                item.is_primary = False
            min(remaining, key=lambda item: item.position).is_primary = True
        await db.delete(image)
        await db.commit()
