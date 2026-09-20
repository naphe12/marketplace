from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Report(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "reports"

    reporter_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
        index=True,
    )

    target_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    target_id: Mapped[UUID] = mapped_column(
        nullable=False,
        index=True,
    )

    reason: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=False,
        index=True,
    )

    priority: Mapped[str] = mapped_column(
        String(20),
        default="NORMAL",
        nullable=False,
    )

    reviewed_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=True,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    resolution_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )


class FraudSignal(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "fraud_signals"

    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=True,
        index=True,
    )

    listing_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.listings.id"),
        nullable=True,
        index=True,
    )

    signal_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    risk_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        default=0,
        nullable=False,
    )

    severity: Mapped[str] = mapped_column(
        String(20),
        default="LOW",
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="OPEN",
        nullable=False,
        index=True,
    )

    signal_data: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    reviewed_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=True,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class ModerationAction(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "moderation_actions"

    admin_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
        index=True,
    )

    target_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    target_id: Mapped[UUID] = mapped_column(
        nullable=False,
        index=True,
    )

    report_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.reports.id"),
        nullable=True,
    )

    fraud_signal_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.fraud_signals.id"),
        nullable=True,
    )

    action_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    previous_status: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    new_status: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )


class UserBlock(TimestampMixin, Base):
    __tablename__ = "user_blocks"

    blocker_user_id: Mapped[UUID] = mapped_column(
        "blocker_id",
        ForeignKey(
            "market.users.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
        nullable=False,
    )

    blocked_user_id: Mapped[UUID] = mapped_column(
        "blocked_id",
        ForeignKey(
            "market.users.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
        nullable=False,
    )

    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )