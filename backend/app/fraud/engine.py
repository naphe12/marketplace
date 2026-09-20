from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.fraud.features import (
    extract_offer_features,
)

from app.fraud.policies import (
    calculate_risk_score,
    recommended_action,
    risk_level,
)

from app.fraud.rules import (
    evaluate_offer_rules,
)

from app.fraud.types import (
    FraudAssessment,
)

from app.models.offer import Offer
from app.models.user import User

from app.models.fraud_signal import (
    FraudSignal,
)


class FraudEngine:

    async def assess_offer(
        self,
        db: AsyncSession,
        offer: Offer,
        user: User,
        listing,
    ) -> FraudAssessment:

        features = (
            await extract_offer_features(
                db=db,
                offer=offer,
                user=user,
                listing=listing,
            )
        )

        reasons = (
            evaluate_offer_rules(
                features
            )
        )

        score = (
            calculate_risk_score(
                reasons
            )
        )

        return FraudAssessment(
            risk_score=score,

            risk_level=
                risk_level(score),

            action=
                recommended_action(
                    score
                ),

            reasons=reasons,

            features=features,

            model_version=
                "rules-v1",
        )

    async def save_assessment(
        self,
        db: AsyncSession,
        assessment: FraudAssessment,
        *,
        user_id,
        listing_id=None,
        offer_id=None,
    ) -> FraudSignal | None:

        if assessment.risk_score <= 0:
            return None

        signal = FraudSignal(
            user_id=user_id,
            listing_id=listing_id,

            signal_type=
                "OFFER_RISK",

            severity=
                assessment.risk_level,

            status="OPEN",

            risk_score=
                assessment.risk_score,

            risk_level=
                assessment.risk_level,

            source="RULE",

            action=
                assessment.action,

            model_version=
                assessment.model_version,

            features=
                assessment.features,

            reasons=[
                {
                    "code":
                        reason.code,

                    "score":
                        reason.score,

                    "description":
                        reason.description,
                }
                for reason
                in assessment.reasons
            ],
        )

        db.add(signal)

        return signal


fraud_engine = FraudEngine()