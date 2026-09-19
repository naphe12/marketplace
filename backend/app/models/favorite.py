from uuid import UUID

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Favorite(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "favorites"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "listing_id",
            name="uq_favorite_user_listing",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "market.users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    listing_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "market.listings.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )