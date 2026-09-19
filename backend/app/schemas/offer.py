from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OfferCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    currency: str = "BIF"
    message: str | None = Field(default=None, max_length=2000)


class CounterOfferCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    message: str | None = Field(default=None, max_length=2000)


class OfferResponse(BaseModel):
    id: UUID

    listing_id: UUID
    buyer_id: UUID
    seller_id: UUID
    created_by_user_id: UUID

    parent_offer_id: UUID | None

    amount: Decimal
    currency: str

    message: str | None
    status: str

    expires_at: datetime | None
    responded_at: datetime | None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )