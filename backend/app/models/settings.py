from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class MarketplaceSettings(
    UUIDMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "marketplace_settings"

    setting_key: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        default="GLOBAL",
        nullable=False,
    )

    listing_payment_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    free_listing_duration_days: Mapped[int] = mapped_column(
        Integer,
        default=30,
        nullable=False,
    )

    updated_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=True,
    )