from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationRepository:

    @staticmethod
    async def get_for_user(
        db: AsyncSession,
        user_id: UUID,
        offset: int = 0,
        limit: int = 50,
    ) -> list[Notification]:

        result = await db.execute(
            select(Notification)
            .where(
                Notification.user_id == user_id
            )
            .order_by(
                Notification.created_at.desc()
            )
            .offset(offset)
            .limit(limit)
        )

        return list(
            result.scalars().all()
        )

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        notification_id: UUID,
    ) -> Notification | None:

        result = await db.execute(
            select(Notification)
            .where(
                Notification.id
                == notification_id
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def unread_count(
        db: AsyncSession,
        user_id: UUID,
    ) -> int:

        result = await db.execute(
            select(
                func.count(Notification.id)
            )
            .where(
                Notification.user_id
                == user_id,

                Notification.is_read
                .is_(False),
            )
        )

        return int(
            result.scalar_one() or 0
        )