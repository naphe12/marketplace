from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class SecurePayment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "secure_payments"
    __table_args__ = (
        UniqueConstraint("transaction_id", name="uq_secure_payment_transaction"),
    )

    transaction_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.transactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    buyer_id: Mapped[UUID] = mapped_column(ForeignKey("market.users.id"), nullable=False, index=True)
    seller_id: Mapped[UUID] = mapped_column(ForeignKey("market.users.id"), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING_PAYMENT", nullable=False, index=True)
    provider: Mapped[str | None] = mapped_column(String(40), nullable=True)
    external_reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    disputed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    transaction: Mapped["Transaction"] = relationship(back_populates="secure_payment")


class TransactionDispute(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "transaction_disputes"

    transaction_id: Mapped[UUID] = mapped_column(
        ForeignKey("market.transactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    secure_payment_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("market.secure_payments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    opened_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("market.users.id"), nullable=False)
    reason: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False, index=True)
    admin_resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("market.users.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
