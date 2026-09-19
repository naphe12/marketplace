from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.notification_repository import (
    NotificationRepository,
)
from app.schemas.notification import (
    NotificationResponse,
    NotificationUnreadCount,
)
from app.services.notification_service import (
    NotificationService,
)


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get(
    "",
    response_model=list[NotificationResponse],
)
async def my_notifications(
    offset: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await (
        NotificationRepository
        .get_for_user(
            db,
            current_user.id,
            offset,
            limit,
        )
    )


@router.get(
    "/unread-count",
    response_model=NotificationUnreadCount,
)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    count = (
        await NotificationRepository
        .unread_count(
            db,
            current_user.id,
        )
    )

    return {
        "unread": count
    }


@router.post(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
async def mark_notification_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await NotificationService.mark_read(
        db,
        notification_id,
        current_user.id,
    )


@router.post(
    "/read-all",
)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await (
        NotificationService
        .mark_all_read(
            db,
            current_user.id,
        )
    )