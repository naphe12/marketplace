from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SecurePaymentResponse(BaseModel):
    id: UUID
    transaction_id: UUID
    buyer_id: UUID
    seller_id: UUID
    amount: Decimal
    currency: str
    status: str
    provider: str | None
    external_reference: str | None
    paid_at: datetime | None
    released_at: datetime | None
    refunded_at: datetime | None
    disputed_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransactionDisputeCreate(BaseModel):
    reason: str = Field(min_length=3, max_length=80)
    description: str | None = Field(default=None, max_length=2000)


class TransactionDisputeResponse(BaseModel):
    id: UUID
    transaction_id: UUID
    secure_payment_id: UUID | None
    opened_by_user_id: UUID
    reason: str
    description: str | None
    status: str
    admin_resolution: str | None
    resolved_by_user_id: UUID | None
    resolved_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
