from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.moderation import (
    FraudSignal,
    Report,
    UserBlock,
)


class ModerationRepository:

    @staticmethod
    async def get_report(
        db: AsyncSession,
        report_id: UUID,
    ) -> Report | None:

        result = await db.execute(
            select(Report)
            .where(Report.id == report_id)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_pending_reports(
        db: AsyncSession,
    ) -> list[Report]:

        result = await db.execute(
            select(Report)
            .where(Report.status == "PENDING")
            .order_by(
                Report.created_at.asc()
            )
        )

        return list(result.scalars().all())

    @staticmethod
    async def get_open_signals(
        db: AsyncSession,
    ) -> list[FraudSignal]:

        result = await db.execute(
            select(FraudSignal)
            .where(
                FraudSignal.status == "OPEN"
            )
            .order_by(
                FraudSignal.risk_score.desc()
            )
        )

        return list(result.scalars().all())

    @staticmethod
    async def is_blocked(
        db: AsyncSession,
        blocker_id: UUID,
        blocked_id: UUID,
    ) -> bool:

        result = await db.execute(
            select(UserBlock.id)
            .where(
                UserBlock.blocker_user_id
                == blocker_id,

                UserBlock.blocked_user_id
                == blocked_id,

                UserBlock.active.is_(True),
            )
        )

        return (
            result.scalar_one_or_none()
            is not None
        )