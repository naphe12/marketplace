from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Listing(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "listings"

    seller_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
        index=True,
    )

    category_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.categories.id"),
        nullable=False,
        index=True,
    )

    administrative_area_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.administrative_areas.id"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    price: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 2),
        nullable=True,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        default="BIF",
        nullable=False,
    )

    price_type: Mapped[str] = mapped_column(
        String(20),
        default="FIXED",
        nullable=False,
    )

    condition: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="DRAFT",
        nullable=False,
        index=True,
    )

    allow_offers: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    latitude: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 7),
        nullable=True,
    )

    longitude: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 7),
        nullable=True,
    )

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    images: Mapped[list["ListingImage"]] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
        order_by="ListingImage.position",
    )

    attribute_values: Mapped[list["ListingAttributeValue"]] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
    )


class ListingImage(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "listing_images"

    listing_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "market.listings.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    object_key: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        unique=True,
    )

    thumbnail_object_key: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    position: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )

    is_primary: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )

    mime_type: Mapped[str | None] = mapped_column(
        String(100),
    )

    file_size: Mapped[int | None] = mapped_column()

    image_hash: Mapped[str | None] = mapped_column(
        String(128),
    )

    perceptual_hash: Mapped[str | None] = mapped_column(
        String(128),
    )


class ListingAttributeValue(UUIDMixin, Base):
    __tablename__ = "listing_attribute_values"

    __table_args__ = (
        UniqueConstraint(
            "listing_id",
            "attribute_id",
            name="uq_listing_attribute_value",
        ),
    )

    listing_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "market.listings.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    attribute_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.category_attributes.id"),
        nullable=False,
    )

    value_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    value_integer: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    value_decimal: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 4),
        nullable=True,
    )

    value_boolean: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True,
    )

    value_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    listing: Mapped["Listing"] = relationship(
        back_populates="attribute_values",
    )