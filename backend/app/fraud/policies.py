from app.fraud.types import (
    FraudReason,
)


def calculate_risk_score(
    reasons: list[FraudReason],
) -> float:

    total = sum(
        reason.score
        for reason in reasons
    )

    return min(
        float(total),
        100.0,
    )


def risk_level(
    score: float,
) -> str:

    if score >= 90:
        return "CRITICAL"

    if score >= 70:
        return "HIGH"

    if score >= 40:
        return "MEDIUM"

    return "LOW"


def recommended_action(
    score: float,
) -> str:

    if score >= 90:
        return "BLOCK"

    if score >= 60:
        return "REVIEW"

    if score >= 30:
        return "MONITOR"

    return "ALLOW"