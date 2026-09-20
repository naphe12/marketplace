from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Conversation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "conversations"

    __table_args__ = (
        UniqueConstraint(
            "listing_id",
            "buyer_id",
            "seller_id",
            name="uq_conversation_listing_buyer_seller",
        ),
    )

    listing_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.listings.id"),
        nullable=False,
        index=True,
    )

    created_by_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
        index=True,
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

    status: Mapped[str] = mapped_column(
        String(20),
        default="ACTIVE",
        server_default="ACTIVE",
        nullable=False,
    )

    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    participants: Mapped[list["ConversationParticipant"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )

    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class ConversationParticipant(UUIDMixin, Base):
    __tablename__ = "conversation_participants"

    __table_args__ = (
        UniqueConstraint(
            "conversation_id",
            "user_id",
            name="uq_conversation_participant",
        ),
    )

    conversation_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "market.conversations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
        index=True,
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    last_read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    conversation: Mapped["Conversation"] = relationship(
        back_populates="participants",
    )


class Message(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "messages"

    conversation_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "market.conversations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    sender_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.users.id"),
        nullable=False,
        index=True,
    )

    message_type: Mapped[str] = mapped_column(
        String(20),
        default="TEXT",
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    conversation: Mapped["Conversation"] = relationship(
        back_populates="messages",
    )
