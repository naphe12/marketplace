from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.models.trust import Review


class TransactionRepository:

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        transaction_id: UUID,
    ) -> Transaction | None:

        result = await db.execute(
            select(Transaction)
            .where(Transaction.id == transaction_id)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_for_user(        db: AsyncSession,        user_id: UUID,    ) -> list[Transaction]:
        result = await db.execute(
            select(Transaction)
            .where(
                or_(
                    Transaction.buyer_id == user_id,
                    Transaction.seller_id == user_id,
                )
            )
            .order_by(
                Transaction.created_at.desc()
            )
        )

        return list(result.scalars().all())

    @staticmethod
    async def get_review_by_reviewer(
        db: AsyncSession,
        transaction_id: UUID,
        reviewer_id: UUID,
    ) -> Review | None:

        result = await db.execute(
            select(Review)
            .where(
                Review.transaction_id == transaction_id,
                Review.reviewer_id == reviewer_id,
            )
        )

        return result.scalar_one_or_none()