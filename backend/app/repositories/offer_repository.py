from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.offer import Offer


class OfferRepository:

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        offer_id: UUID,
    ) -> Offer | None:

        result = await db.execute(
            select(Offer)
            .where(Offer.id == offer_id)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_for_user(
        db: AsyncSession,
        user_id: UUID,
    ) -> list[Offer]:

        result = await db.execute(
            select(Offer)
            .where(
                or_(
                    Offer.buyer_id == user_id,
                    Offer.seller_id == user_id,
                )
            )
            .order_by(Offer.created_at.desc())
        )

        return list(result.scalars().all())