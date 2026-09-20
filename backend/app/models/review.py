from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)

from sqlalchemy.dialects.postgresql import UUID as PGUUID

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.db.base import Base
from app.models.mixins import (
    TimestampMixin,
    UUIDMixin,
)


class Review(
    UUIDMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "reviews"

    transaction_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "market.transactions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    reviewer_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "market.users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    reviewed_user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "market.users.id",
            ondelete="CASCADE",
        ),
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

    __table_args__ = (
        UniqueConstraint(
            "transaction_id",
            "reviewer_id",
            name="uq_review_transaction_reviewer",
        ),

        CheckConstraint(
            "rating >= 1 AND rating <= 5",
            name="reviews_rating_check",
        ),
    )