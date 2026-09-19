from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: UUID

    notification_type: str

    title: str
    message: str

    data: dict | None

    channel: str
    status: str

    is_read: bool
    read_at: datetime | None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class NotificationUnreadCount(BaseModel):
    unread: int