from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import (
    BillingOrder,
    BillingPayment,
)


class BillingRepository:

    @staticmethod
    async def get_order(
        db: AsyncSession,
        order_id: UUID,
    ) -> BillingOrder | None:

        result = await db.execute(
            select(BillingOrder)
            .where(BillingOrder.id == order_id)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_payment(
        db: AsyncSession,
        payment_id: UUID,
    ) -> BillingPayment | None:

        result = await db.execute(
            select(BillingPayment)
            .where(
                BillingPayment.id == payment_id
            )
        )

        return result.scalar_one_or_none()