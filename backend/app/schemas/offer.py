from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OfferCreate(BaseModel):
    amount: Decimal = Field(gt=0)


class OfferResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    listing_id: UUID
    buyer_id: UUID
    seller_id: UUID
    amount: Decimal
    currency: str
    status: str
    responded_at: datetime | None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


class OfferActionResponse(BaseModel):
    status: str
    listing_status: str | None = None
    transaction_id: UUID | None = None
