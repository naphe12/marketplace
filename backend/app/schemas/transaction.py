from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TransactionResponse(BaseModel):
    id: UUID

    listing_id: UUID
    offer_id: UUID | None

    buyer_id: UUID
    seller_id: UUID

    agreed_price: Decimal
    currency: str
    quantity: int

    status: str

    buyer_confirmed_at: datetime | None
    seller_confirmed_at: datetime | None
    completed_at: datetime | None
    cancelled_at: datetime | None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class TransactionCancelRequest(BaseModel):
    reason: str = Field(
        min_length=3,
        max_length=1000,
    )