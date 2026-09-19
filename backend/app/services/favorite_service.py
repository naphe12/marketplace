from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.favorite import Favorite
from app.repositories.favorite_repository import (
    FavoriteRepository,
)
from app.repositories.listing_repository import (
    ListingRepository,
)


class FavoriteService:

    @staticmethod
    async def add(
        db: AsyncSession,
        user_id: UUID,
        listing_id: UUID,
    ):

        listing = await ListingRepository.get_by_id(
            db,
            listing_id,
        )

        if not listing:
            raise HTTPException(
                status_code=404,
                detail="Annonce introuvable.",
            )

        if listing.status != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cette annonce n'est "
                    "pas disponible."
                ),
            )

        existing = await FavoriteRepository.get(
            db,
            user_id,
            listing_id,
        )

        if existing:
            return {
                "favorite": True,
                "listing_id": listing_id,
            }

        favorite = Favorite(
            user_id=user_id,
            listing_id=listing_id,
        )

        db.add(favorite)

        await db.commit()

        return {
            "favorite": True,
            "listing_id": listing_id,
        }

    @staticmethod
    async def remove(
        db: AsyncSession,
        user_id: UUID,
        listing_id: UUID,
    ):

        favorite = await FavoriteRepository.get(
            db,
            user_id,
            listing_id,
        )

        if favorite:

            await db.delete(favorite)

            await db.commit()

        return {
            "favorite": False,
            "listing_id": listing_id,
        }