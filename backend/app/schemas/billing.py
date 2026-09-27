from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

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


class PaymentFailureRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class PaymentWebhookPayload(BaseModel):
    reference: str
    status: str
    provider_transaction_id: str | None = None
    failure_reason: str | None = None
    provider_response: dict | None = None


class BillingPaymentResponse(BaseModel):
    id: UUID

    billing_order_id: UUID

    amount: Decimal
    currency: str

    payment_method: str
    provider: str | None

    status: str
    external_reference: str | None = None
    provider_transaction_id: str | None = None

    paid_at: datetime | None
    failed_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


class PublicationOrderResponse(BaseModel):
    publication: PublicationResponse
    order: BillingOrderResponse
