from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.models.trust import (
    ReputationProfile,
    
)

from app.models.review import Review


class ReputationRepository:

    @staticmethod
    async def get_profile(
        db: AsyncSession,
        user_id: UUID,
    ) -> ReputationProfile | None:

        result = await db.execute(
            select(ReputationProfile)
            .where(
                ReputationProfile.user_id == user_id
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def count_completed(
        db: AsyncSession,
        user_id: UUID,
    ) -> int:

        result = await db.execute(
            select(func.count(Transaction.id))
            .where(
                Transaction.status == "COMPLETED",
                or_(
                    Transaction.buyer_id == user_id,
                    Transaction.seller_id == user_id,
                ),
            )
        )

        return result.scalar_one()

    @staticmethod
    async def count_completed_as_buyer(
        db: AsyncSession,
        user_id: UUID,
    ) -> int:

        result = await db.execute(
            select(func.count(Transaction.id))
            .where(
                Transaction.status == "COMPLETED",
                Transaction.buyer_id == user_id,
            )
        )

        return result.scalar_one()

    @staticmethod
    async def count_completed_as_seller(
        db: AsyncSession,
        user_id: UUID,
    ) -> int:

        result = await db.execute(
            select(func.count(Transaction.id))
            .where(
                Transaction.status == "COMPLETED",
                Transaction.seller_id == user_id,
            )
        )

        return result.scalar_one()

    @staticmethod
    async def count_cancelled(
        db: AsyncSession,
        user_id: UUID,
    ) -> int:

        result = await db.execute(
            select(func.count(Transaction.id))
            .where(
                Transaction.status == "CANCELLED",
                or_(
                    Transaction.buyer_id == user_id,
                    Transaction.seller_id == user_id,
                ),
            )
        )

        return result.scalar_one()

    @staticmethod
    async def review_stats(
        db: AsyncSession,
        user_id: UUID,
    ) -> tuple[int, float | None]:

        result = await db.execute(
            select(
                func.count(Review.id),
                func.avg(Review.rating),
            )
            .where(
                Review.reviewed_user_id == user_id,
                Review.status == "PUBLISHED",
            )
        )

        count, average = result.one()

        return (
            int(count or 0),
            float(average)
            if average is not None
            else None,
        )