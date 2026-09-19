from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Category(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "categories"

    parent_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.categories.id"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    icon: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
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

    parent: Mapped["Category | None"] = relationship(
        remote_side="Category.id",
        back_populates="children",
    )

    children: Mapped[list["Category"]] = relationship(
        back_populates="parent",
    )

    attributes: Mapped[list["CategoryAttribute"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
    )


class CategoryAttribute(UUIDMixin, Base):
    __tablename__ = "category_attributes"

    category_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.categories.id"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    data_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    required: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    filterable: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    searchable: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    options: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    category: Mapped["Category"] = relationship(
        back_populates="attributes",
    )