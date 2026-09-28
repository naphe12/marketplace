from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class PricingEstimateRequest(BaseModel):
    category_id: UUID
    country_code: str = Field(default="BI", min_length=2, max_length=2)
    administrative_area_id: UUID | None = None
    condition: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    currency: str = Field(default="BIF", min_length=3, max_length=3)


class PricingEstimateResponse(BaseModel):
    verdict: str
    confidence: str
    suggested_price: Decimal | None
    low_price: Decimal | None
    high_price: Decimal | None
    median_price: Decimal | None
    comparable_count: int
    currency: str
    message: str
    reasons: list[str]
