from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AdministrativeArea(Base):
    __tablename__ = "administrative_areas"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    parent_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "market.administrative_areas.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    area_type: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    code: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    latitude: Mapped[Decimal | None] = mapped_column(
        Numeric,
        nullable=True,
    )

    longitude: Mapped[Decimal | None] = mapped_column(
        Numeric,
        nullable=True,
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
    )