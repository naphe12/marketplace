from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.favorite import Favorite, FavoriteFolder
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

    @staticmethod
    async def create_folder(
        db: AsyncSession,
        user_id: UUID,
        name: str,
    ) -> FavoriteFolder:
        folder = FavoriteFolder(
            user_id=user_id,
            name=name.strip(),
        )

        db.add(folder)

        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise HTTPException(
                status_code=400,
                detail="Un dossier porte déjà ce nom.",
            ) from exc

        await db.refresh(folder)

        return folder

    @staticmethod
    async def update_folder(
        db: AsyncSession,
        user_id: UUID,
        folder_id: UUID,
        name: str,
    ) -> FavoriteFolder:
        folder = await FavoriteRepository.get_folder(
            db,
            user_id,
            folder_id,
        )

        if not folder:
            raise HTTPException(status_code=404, detail="Dossier introuvable.")

        folder.name = name.strip()

        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise HTTPException(
                status_code=400,
                detail="Un dossier porte déjà ce nom.",
            ) from exc

        await db.refresh(folder)

        return folder

    @staticmethod
    async def delete_folder(
        db: AsyncSession,
        user_id: UUID,
        folder_id: UUID,
    ):
        folder = await FavoriteRepository.get_folder(
            db,
            user_id,
            folder_id,
        )

        if not folder:
            raise HTTPException(status_code=404, detail="Dossier introuvable.")

        await db.delete(folder)
        await db.commit()

        return {"success": True}

    @staticmethod
    async def move(
        db: AsyncSession,
        user_id: UUID,
        listing_id: UUID,
        folder_id: UUID | None,
    ):
        favorite = await FavoriteRepository.get(db, user_id, listing_id)

        if not favorite:
            raise HTTPException(status_code=404, detail="Favori introuvable.")

        if folder_id is not None:
            folder = await FavoriteRepository.get_folder(db, user_id, folder_id)

            if not folder:
                raise HTTPException(status_code=404, detail="Dossier introuvable.")

        favorite.folder_id = folder_id
        await db.commit()

        return {
            "favorite": True,
            "listing_id": listing_id,
            "folder_id": folder_id,
        }
