from dataclasses import dataclass, field
from typing import Any


@dataclass
class FraudReason:
    code: str
    score: float
    description: str
    category: str = "GENERAL"
    severity: str = "LOW"


@dataclass
class FraudAssessment:
    risk_score: float
    risk_level: str
    action: str

    reasons: list[FraudReason] = field(
        default_factory=list
    )

    features: dict[str, Any] = field(
        default_factory=dict
    )

    model_version: str = "rules-v1"
