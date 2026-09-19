from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class TransactionStatusHistory(UUIDMixin, Base):
    __tablename__ = "transaction_status_history"

    transaction_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "market.transactions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    changed_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=True,
    )

    note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


class Review(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "reviews"

    __table_args__ = (
        UniqueConstraint(
            "transaction_id",
            "reviewer_id",
            name="uq_review_transaction_reviewer",
        ),
    )

    transaction_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.transactions.id"),
        nullable=False,
        index=True,
    )

    reviewer_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
        index=True,
    )

    reviewed_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
        index=True,
    )

    rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="PUBLISHED",
        nullable=False,
    )


class TrustEvent(UUIDMixin, Base):
    __tablename__ = "trust_events"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "event_type",
            "source_type",
            "source_id",
            name="uq_trust_event_source",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
        index=True,
    )

    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    source_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    source_id: Mapped[UUID] = mapped_column(
        nullable=False,
    )

    impact: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False,
    )

    event_data: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class ReputationProfile(
    UUIDMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "reputation_profiles"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "market.users.id",
            ondelete="CASCADE",
        ),
        unique=True,
        nullable=False,
        index=True,
    )

    trust_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        default=0,
        nullable=False,
    )

    trust_level: Mapped[str] = mapped_column(
        String(30),
        default="NEW",
        nullable=False,
    )

    completed_transactions: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    completed_as_buyer: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    completed_as_seller: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    cancelled_transactions: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    review_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    average_rating: Mapped[Decimal | None] = mapped_column(
        Numeric(3, 2),
        nullable=True,
    )

    phone_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    identity_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    business_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )