from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    JSON,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class BillingOrder(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "billing_orders"

    order_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
        index=True,
    )

    listing_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.listings.id"),
        nullable=True,
    )

    publication_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.listing_publications.id"),
        nullable=True,
    )

    order_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )

    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        default=0,
        nullable=False,
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        default="BIF",
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING_PAYMENT",
        nullable=False,
        index=True,
    )

    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )


class BillingPayment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "billing_payments"

    billing_order_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.billing_orders.id"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        default="BIF",
        nullable=False,
    )

    payment_method: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    provider: Mapped[str | None] = mapped_column(
        String(50),
    )

    external_reference: Mapped[str | None] = mapped_column(
        String(255),
        index=True,
    )

    provider_transaction_id: Mapped[str | None] = mapped_column(
        String(255),
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=False,
    )

    provider_response: Mapped[dict | None] = mapped_column(
        JSON,
    )

    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    failed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )