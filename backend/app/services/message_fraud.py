from app.fraud.features import text_quality_score
from app.fraud.policies import (
    calculate_risk_score,
    recommended_action,
    risk_level,
)
from app.fraud.types import FraudAssessment, FraudReason


def assess_message_content(content: str) -> FraudAssessment:
    quality = text_quality_score(content)
    reasons: list[FraudReason] = []

    if quality["has_external_contact_hint"]:
        reasons.append(
            FraudReason(
                code="EXTERNAL_CONTACT_HINT",
                score=18,
                description="Le message pousse vers un canal externe ou un lien.",
                category="CONTENT",
                severity="MEDIUM",
            )
        )

    if quality["has_urgency_hint"]:
        reasons.append(
            FraudReason(
                code="URGENCY_LANGUAGE",
                score=8,
                description="Le message contient un langage d'urgence.",
                category="CONTENT",
            )
        )

    if quality["digit_ratio"] >= 0.35 and quality["length"] >= 20:
        reasons.append(
            FraudReason(
                code="CONTACT_NUMBER_HEAVY_MESSAGE",
                score=12,
                description="Le message contient beaucoup de chiffres.",
                category="CONTENT",
            )
        )

    if quality["uppercase_ratio"] >= 0.75 and quality["length"] >= 20:
        reasons.append(
            FraudReason(
                code="AGGRESSIVE_TEXT_PATTERN",
                score=8,
                description="Message majoritairement en majuscules.",
                category="CONTENT",
            )
        )

    score = calculate_risk_score(reasons)
    return FraudAssessment(
        risk_score=score,
        risk_level=risk_level(score),
        action=recommended_action(score),
        reasons=reasons,
        features=quality,
        model_version="rules-v1-message",
    )
