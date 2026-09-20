from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fraud.features import extract_offer_features
from app.fraud.policies import (
    calculate_risk_score,
    recommended_action,
    risk_level,
)
from app.fraud.rules import evaluate_offer_rules
from app.fraud.types import FraudAssessment, FraudReason
from app.models.moderation import FraudSignal
from app.models.offer import Offer
from app.models.user import User


def json_safe(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, dict):
        return {
            key: json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            json_safe(item)
            for item in value
        ]

    return value


def serialize_reason(reason: FraudReason) -> dict:
    return {
        "code": reason.code,
        "score": reason.score,
        "category": reason.category,
        "severity": reason.severity,
        "description": reason.description,
    }


class FraudEngine:
    async def assess_offer(
        self,
        db: AsyncSession,
        offer: Offer,
        user: User,
        listing,
    ) -> FraudAssessment:
        features = await extract_offer_features(
            db=db,
            offer=offer,
            user=user,
            listing=listing,
        )

        reasons = evaluate_offer_rules(features)
        score = calculate_risk_score(reasons)

        return FraudAssessment(
            risk_score=score,
            risk_level=risk_level(score),
            action=recommended_action(score),
            reasons=reasons,
            features=features,
            model_version="rules-v2-offer",
        )

    async def save_assessment(
        self,
        db: AsyncSession,
        assessment: FraudAssessment,
        *,
        user_id,
        listing_id=None,
        offer_id=None,
        signal_type: str = "OFFER_RISK",
    ) -> FraudSignal | None:
        if assessment.risk_score < 10:
            return None

        signal_type = signal_type.upper()
        existing = await db.scalar(
            select(FraudSignal).where(
                FraudSignal.signal_type == signal_type,
                FraudSignal.status == "OPEN",
                FraudSignal.user_id == user_id,
                FraudSignal.listing_id == listing_id,
            )
        )

        payload = {
            "action": assessment.action,
            "model_version": assessment.model_version,
            "source": "RULE_ENGINE",
            "offer_id": str(offer_id) if offer_id else None,
            "features": json_safe(assessment.features),
            "reasons": [
                serialize_reason(reason)
                for reason in assessment.reasons
            ],
        }

        if existing:
            existing.risk_score = Decimal(str(assessment.risk_score))
            existing.severity = assessment.risk_level
            existing.signal_data = payload
            return existing

        signal = FraudSignal(
            user_id=user_id,
            listing_id=listing_id,
            signal_type=signal_type,
            risk_score=Decimal(str(assessment.risk_score)),
            severity=assessment.risk_level,
            status="OPEN",
            signal_data=payload,
        )

        db.add(signal)
        return signal


fraud_engine = FraudEngine()
