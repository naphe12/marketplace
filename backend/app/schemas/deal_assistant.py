from decimal import Decimal

from pydantic import BaseModel


class DealAssistantResponse(BaseModel):
    verdict: str
    score: int
    price_position: str
    reference_price: Decimal | None
    evaluated_price: Decimal | None
    comparable_count: int
    trust_level: str | None
    fraud_risk: str
    reasons: list[str]
