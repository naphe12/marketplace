from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.repositories.notification_repository import (
    NotificationRepository,
)


class NotificationService:

    @staticmethod
    async def create(
        db: AsyncSession,
        *,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        data: dict | None = None,
        commit: bool = True,
        deduplication_key: str | None = None,
    ) -> Notification:

        if deduplication_key is not None:
            statement = (
                insert(Notification)
                .values(
                    user_id=user_id,
                    notification_type=notification_type.upper(),
                    title=title,
                    message=message,                    
                    channel="IN_APP",
                    status="SENT",
                    sent_at=datetime.now(timezone.utc),
                    deduplication_key=deduplication_key,
                )
                .on_conflict_do_nothing(
                    index_elements=[Notification.deduplication_key],
                    index_where=Notification.deduplication_key.is_not(None),
                )
                .returning(Notification)
            )
            result = await db.execute(statement)
            notification = result.scalar_one_or_none()
            if notification is None:
                result = await db.execute(
                    select(Notification).where(
                        Notification.deduplication_key == deduplication_key
                    )
                )
                notification = result.scalar_one()
            if commit:
                await db.commit()
                await db.refresh(notification)
            else:
                await db.flush()
            return notification

        notification = Notification(
            user_id=user_id,

            notification_type=(
                notification_type.upper()
            ),

            title=title,
            message=message,           

            channel="IN_APP",

            status="SENT",

            sent_at=datetime.now(
                timezone.utc
            ),
        )

        db.add(notification)

        if commit:
            await db.commit()
            await db.refresh(notification)
        else:
            await db.flush()

        return notification

    @staticmethod
    async def mark_read(
        db: AsyncSession,
        notification_id: UUID,
        user_id: UUID,
    ) -> Notification:

        notification = (
            await NotificationRepository.get_by_id(
                db,
                notification_id,
            )
        )

        if not notification:
            raise HTTPException(
                status_code=404,
                detail="Notification introuvable.",
            )

        if notification.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Accès refusé.",
            )

        if not notification.is_read:
            notification.is_read = True

            notification.read_at = (
                datetime.now(timezone.utc)
            )

            await db.commit()
            await db.refresh(notification)

        return notification

    @staticmethod
    async def mark_all_read(
        db: AsyncSession,
        user_id: UUID,
    ):

        now = datetime.now(
            timezone.utc
        )

        await db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
            .values(
                
                read_at=datetime.now(timezone.utc),
            )
        )

        await db.commit()

        return {
            "success": True
        }