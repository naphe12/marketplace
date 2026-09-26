from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.favorite import Favorite, FavoriteFolder
from app.models.listing import Listing


class FavoriteRepository:

    @staticmethod
    async def get(
        db: AsyncSession,
        user_id: UUID,
        listing_id: UUID,
    ) -> Favorite | None:

        result = await db.execute(
            select(Favorite)
            .where(
                Favorite.user_id == user_id,
                Favorite.listing_id
                == listing_id,
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_folder(
        db: AsyncSession,
        user_id: UUID,
        folder_id: UUID,
    ) -> FavoriteFolder | None:
        result = await db.execute(
            select(FavoriteFolder).where(
                FavoriteFolder.id == folder_id,
                FavoriteFolder.user_id == user_id,
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_folders(
        db: AsyncSession,
        user_id: UUID,
    ) -> list[FavoriteFolder]:
        result = await db.scalars(
            select(FavoriteFolder)
            .where(FavoriteFolder.user_id == user_id)
            .order_by(FavoriteFolder.name.asc())
        )

        return list(result.all())

    @staticmethod
    async def get_for_user(
        db: AsyncSession,
        user_id: UUID,
        folder_id: UUID | None = None,
    ) -> list[Listing]:

        query = (
            select(Listing)
            .join(
                Favorite,
                Favorite.listing_id
                == Listing.id,
            )
            .options(
                selectinload(
                    Listing.images
                )
            )
            .where(
                Favorite.user_id == user_id,
                Listing.deleted_at.is_(None),
            )
        )

        if folder_id is not None:
            query = query.where(Favorite.folder_id == folder_id)

        result = await db.execute(
            query.order_by(
                Favorite.created_at.desc()
            )
        )

        return list(
            result.scalars()
            .unique()
            .all()
        )

    @staticmethod
    async def get_detailed_for_user(
        db: AsyncSession,
        user_id: UUID,
    ):
        result = await db.execute(
            select(Favorite, Listing)
            .join(Listing, Favorite.listing_id == Listing.id)
            .options(selectinload(Listing.images))
            .where(
                Favorite.user_id == user_id,
                Listing.deleted_at.is_(None),
            )
            .order_by(Favorite.created_at.desc())
        )

        return list(result.all())
