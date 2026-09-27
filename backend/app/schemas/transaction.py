from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DeliveryResponse(BaseModel):
    id: UUID
    transaction_id: UUID
    requested_by_user_id: UUID
    carrier_name: str | None
    pickup_address: str
    dropoff_address: str
    fee_amount: Decimal
    currency: str
    status: str
    tracking_reference: str | None
    proof_url: str | None
    dispute_reason: str | None
    accepted_at: datetime | None
    picked_up_at: datetime | None
    delivered_at: datetime | None
    cancelled_at: datetime | None
    disputed_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeliveryCreateRequest(BaseModel):
    pickup_address: str = Field(min_length=5, max_length=1000)
    dropoff_address: str = Field(min_length=5, max_length=1000)
    carrier_name: str | None = Field(default=None, max_length=120)
    fee_amount: Decimal = Field(default=0, ge=0)
    currency: str = Field(default="BIF", min_length=3, max_length=3)


class DeliveryTrackingRequest(BaseModel):
    tracking_reference: str | None = Field(default=None, max_length=120)
    proof_url: str | None = Field(default=None, max_length=1000)


class DeliveryDisputeRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)


class TransactionResponse(BaseModel):
    id: UUID
    transaction_number: str

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
    delivery: DeliveryResponse | None = None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class TransactionCancelRequest(BaseModel):
    reason: str = Field(
        min_length=3,
        max_length=1000,
    )