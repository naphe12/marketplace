from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class WantedRequest(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "wanted_requests"

    buyer_id: Mapped[UUID] = mapped_column(ForeignKey("market.users.id"), nullable=False, index=True)
    category_id: Mapped[UUID | None] = mapped_column(ForeignKey("market.categories.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    budget_min: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    budget_max: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="BIF", nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), default="BI", nullable=False, index=True)
    administrative_area_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.administrative_areas.id"), nullable=True, index=True
    )
    radius_km: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    condition: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    attributes: Mapped[list["WantedRequestAttribute"]] = relationship(
        back_populates="wanted_request", cascade="all, delete-orphan"
    )
    matches: Mapped[list["WantedMatch"]] = relationship(
        back_populates="wanted_request", cascade="all, delete-orphan"
    )
    offers: Mapped[list["WantedOffer"]] = relationship(
        back_populates="wanted_request", cascade="all, delete-orphan"
    )


class WantedRequestAttribute(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "wanted_request_attributes"
    __table_args__ = (UniqueConstraint("wanted_request_id", "attribute_id", name="uq_wanted_request_attribute"),)

    wanted_request_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.wanted_requests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attribute_id: Mapped[UUID] = mapped_column(ForeignKey("market.category_attributes.id"), nullable=False, index=True)
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_integer: Mapped[int | None] = mapped_column(Integer, nullable=True)
    value_decimal: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    value_boolean: Mapped[bool | None] = mapped_column(nullable=True)
    value_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    wanted_request: Mapped[WantedRequest] = relationship(back_populates="attributes")


class WantedMatch(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "wanted_matches"

    wanted_request_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.wanted_requests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    listing_id: Mapped[UUID] = mapped_column(ForeignKey("market.listings.id", ondelete="CASCADE"), nullable=False, index=True)
    match_score: Mapped[int] = mapped_column(default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="SUGGESTED", nullable=False, index=True)

    wanted_request: Mapped[WantedRequest] = relationship(back_populates="matches")


class WantedOffer(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "wanted_offers"

    wanted_request_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.wanted_requests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    seller_id: Mapped[UUID] = mapped_column(ForeignKey("market.users.id"), nullable=False, index=True)
    listing_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.listings.id", ondelete="SET NULL"), nullable=True, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    wanted_request: Mapped[WantedRequest] = relationship(back_populates="offers")
