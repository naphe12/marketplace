from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column


def generate_transaction_number() -> str:
    return (
        f"TX-"
        f"{datetime.now(timezone.utc):%Y%m%d}-"
        f"{uuid4().hex[:10].upper()}"
    )


class Transaction(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "transactions"

    listing_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.listings.id"),
        nullable=False,
        index=True,
    )

    offer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.offers.id"),
        unique=True,
        nullable=True,
    )

    buyer_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
        index=True,
    )

    seller_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
        index=True,
    )

    agreed_price: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        default="BIF",
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        default=1,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="AGREED",
        nullable=False,
        index=True,
    )

    buyer_confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    seller_confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancellation_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    transaction_number: Mapped[str] = mapped_column(
    String(50),
    nullable=False,
    unique=True,
    index=True,
    default=generate_transaction_number,
)