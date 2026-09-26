from uuid import UUID

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class ListingView(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "listing_views"

    listing_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    source: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
