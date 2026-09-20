from app.fraud.types import (
    FraudReason,
)


def calculate_risk_score(
    reasons: list[FraudReason],
) -> float:
    if not reasons:
        return 0.0

    high_signal_total = sum(
        reason.score
        for reason in reasons
        if reason.severity in {"HIGH", "CRITICAL"}
    )

    medium_signal_total = sum(
        reason.score
        for reason in reasons
        if reason.severity == "MEDIUM"
    )

    low_signal_total = sum(
        reason.score
        for reason in reasons
        if reason.severity == "LOW"
    )

    total = (
        high_signal_total
        + medium_signal_total
        + min(low_signal_total, 30)
    )

    return min(
        float(total),
        100.0,
    )


def risk_level(
    score: float,
) -> str:

    if score >= 85:
        return "CRITICAL"

    if score >= 65:
        return "HIGH"

    if score >= 35:
        return "MEDIUM"

    return "LOW"


def recommended_action(
    score: float,
) -> str:

    if score >= 85:
        return "ESCALATE"

    if score >= 65:
        return "REVIEW"

    if score >= 35:
        return "MONITOR"

    return "ALLOW"
