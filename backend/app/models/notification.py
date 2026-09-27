from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    JSON,
    Index,
    text,
    String,
    Text,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Notification(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "notifications"

    __table_args__ = (
        Index(
            "uq_notifications_deduplication_key",
            "deduplication_key",
            unique=True,
            postgresql_where=text("deduplication_key IS NOT NULL"),
        ),
    )

    deduplication_key: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "market.users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # Python: notification_type
    # PostgreSQL: type
    notification_type: Mapped[str] = mapped_column(
        "type",
        String(50),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

     # Python: message
    # PostgreSQL: body
    message: Mapped[str | None] = mapped_column(
        "body",
        Text,
        nullable=True,
    )

    data: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    channel: Mapped[str] = mapped_column(
        String(20),
        default="IN_APP",
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="CREATED",
        nullable=False,
        index=True,
    )

    

    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    @hybrid_property
    def is_read(self) -> bool:
        return self.read_at is not None

    @is_read.expression
    def is_read(cls):
        return cls.read_at.is_not(None)

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )