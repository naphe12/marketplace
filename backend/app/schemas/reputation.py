from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ReputationProfileResponse(BaseModel):
    user_id: UUID

    trust_score: Decimal
    trust_level: str

    completed_transactions: int
    completed_as_buyer: int
    completed_as_seller: int

    cancelled_transactions: int

    review_count: int
    average_rating: Decimal | None

    phone_verified: bool
    identity_verified: bool
    business_verified: bool

    model_config = ConfigDict(
        from_attributes=True
    )