from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.favorite import Favorite
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
    async def get_for_user(
        db: AsyncSession,
        user_id: UUID,
    ) -> list[Listing]:

        result = await db.execute(
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
            .order_by(
                Favorite.created_at.desc()
            )
        )

        return list(
            result.scalars()
            .unique()
            .all()
        )