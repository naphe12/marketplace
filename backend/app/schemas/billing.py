from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.publication import PublicationResponse


class BillingOrderResponse(BaseModel):
    id: UUID
    order_number: str

    listing_id: UUID | None
    publication_id: UUID | None

    subtotal: Decimal
    discount_amount: Decimal
    total_amount: Decimal

    currency: str
    status: str

    paid_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True
    )


class PaymentCreate(BaseModel):
    payment_method: str
    provider: str | None = None


class BillingPaymentResponse(BaseModel):
    id: UUID

    billing_order_id: UUID

    amount: Decimal
    currency: str

    payment_method: str
    provider: str | None

    status: str

    paid_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True
    )


class PublicationOrderResponse(BaseModel):
    publication: PublicationResponse
    order: BillingOrderResponse