from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class ListingPackage(
    UUIDMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "listing_packages"

    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    duration_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    price: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        default="BIF",
        nullable=False,
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )


class ListingPublication(
    UUIDMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "listing_publications"

    listing_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.listings.id"),
        nullable=False,
        index=True,
    )

    advertiser_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
    )

    # NULL lorsque publication gratuite
    package_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.listing_packages.id"),
        nullable=True,
    )

    duration_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    price_paid: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        default=0,
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        default="BIF",
        nullable=False,
    )

    starts_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING_PAYMENT",
        nullable=False,
    )